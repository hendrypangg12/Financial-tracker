import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { encodeFields, decodeFields } from '../src/firebase-admin.js';
import { applyPaidInvoice, markInvoiceExpired } from '../src/entitlements.js';
import { handleCreateInvoice, handleVerifyPayment, handleXenditWebhook } from '../src/payment.js';

const privateKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
const response = (value, status = 200) => new Response(JSON.stringify(value), { status });
const base = 'projects/test/databases/(default)/documents/';
const body = (data, headers = {}) => new Request('https://test/api/create-invoice', { method: 'POST', headers, body: JSON.stringify(data) });
function backend(t) {
  const docs = new Map(), kv = new Map(); let version = 0;
  const put = (path, data) => docs.set(path, { name: base + path, fields: encodeFields(data), updateTime: String(++version) });
  const read = path => docs.has(path) ? decodeFields(docs.get(path).fields) : null;
  const env = { FIREBASE_WEB_API_KEY: 'public', FIREBASE_PROJECT_ID: 'test', XENDIT_SECRET_KEY: 'secret', XENDIT_WEBHOOK_TOKEN: 'callback',
    FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ project_id: 'test', client_email: 'service@test.iam.gserviceaccount.com', private_key: privateKey }),
    BOT_DATA: { get: async key => kv.get(key) || null, put: async (key, value) => kv.set(key, value) } };
  let providerCalls = 0, commitCalls = 0, failCommits = false;
  const old = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('oauth2.googleapis.com')) return response({ access_token: 'server-token', expires_in: 3600 });
    if (String(url).includes('accounts:lookup')) return response({ users: [{ localId: 'u', email: 'u@test' }] });
    if (String(url).includes('api.xendit.co')) { providerCalls++; return response({ ...event, invoice_url: 'https://checkout.test/inv' }); }
    assert.match(String(url), /^https:\/\/firestore.googleapis.com\/v1\//);
    const path = decodeURIComponent(String(url).split('/documents')[1] || '');
    if (path === ':commit') {
      commitCalls++;
      const { writes } = JSON.parse(options.body);
      if (failCommits) return response({ error: { status: 'UNAVAILABLE' } }, 503);
      // Check ALL preconditions before applying ANY write, like Firestore commit.
      for (const write of writes) {
        const p = (write.update?.name || write.delete).slice(base.length), current = docs.get(p), condition = write.currentDocument;
        if (condition?.exists === false && current || condition?.updateTime && current?.updateTime !== condition.updateTime) return response({ error: { status: 'FAILED_PRECONDITION' } }, 409);
      }
      for (const write of writes) {
        const p = (write.update?.name || write.delete).slice(base.length);
        if (write.delete) docs.delete(p);
        else put(p, write.updateMask ? { ...read(p), ...decodeFields(write.update.fields) } : decodeFields(write.update.fields));
      }
      return response({});
    }
    const doc = docs.get(path.slice(1));
    return doc ? response(doc) : response({ error: { status: 'NOT_FOUND' } }, 404);
  };
  t.after(() => { globalThis.fetch = old; });
  put('users/u/meta/profile', { plan: 'pending', expiresAt: '2000-01-01', displayName: 'Name' });
  put('payments/beruang_u_1', { uid: 'u', email: 'u@test', invoiceId: 'inv', externalId: 'beruang_u_1', paket: 'monthly', amount: 50000, status: 'pending' });
  return { env, put, read, docs, kv, providerCalls: () => providerCalls, commitCalls: () => commitCalls, fail: () => { failCommits = true; } };
}
const event = { id: 'inv', external_id: 'beruang_u_1', amount: 50000, currency: 'IDR', status: 'PAID' };

test('concurrent duplicate paid callbacks extend exactly once', async t => {
  const b = backend(t);
  const results = await Promise.all([applyPaidInvoice(b.env, event.external_id, event), applyPaidInvoice(b.env, event.external_id, event)]);
  assert.equal(results[0].expiresAt, results[1].expiresAt);
  assert.equal(b.read('users/u/meta/profile').displayName, 'Name');
  assert.equal([...b.docs.keys()].filter(k => k.includes('verifiedPaymentReceipts')).length, 1);
});
test('two concurrent different invoices accumulate both paid periods', async t => {
  const b = backend(t), start = '2090-01-01T00:00:00.000Z';
  b.put('users/u/meta/profile', { plan: 'monthly', expiresAt: start });
  b.put('payments/beruang_u_2', { ...b.read('payments/beruang_u_1'), externalId: 'beruang_u_2', invoiceId: 'inv2' });
  await Promise.all([applyPaidInvoice(b.env, event.external_id, event), applyPaidInvoice(b.env, 'beruang_u_2', { ...event, external_id: 'beruang_u_2', id: 'inv2' })]);
  assert.equal(Date.parse(b.read('users/u/meta/profile').expiresAt) - Date.parse(start), 60 * 86400000);
});
test('legacy client-created receipt cannot grant or skip trusted activation', async t => {
  const b = backend(t);
  b.put('users/u/paymentReceipts/beruang_u_1', { plan: 'lifetime' });
  await applyPaidInvoice(b.env, event.external_id, event);
  assert.equal(b.read('users/u/meta/profile').plan, 'monthly');
});
test('lifetime remains lifetime and late expiry cannot undo paid status', async t => {
  const b = backend(t);
  b.put('users/u/meta/profile', { plan: 'lifetime', expiresAt: '2099-12-31' });
  await Promise.all([applyPaidInvoice(b.env, event.external_id, event), markInvoiceExpired(b.env, event.external_id, { ...event, status: 'EXPIRED' })]);
  assert.equal(b.read('users/u/meta/profile').plan, 'lifetime');
  assert.equal(b.read('payments/beruang_u_1').status, 'paid');
});
test('no partial entitlement/receipt is created on failed commit', async t => {
  const b = backend(t); b.fail();
  await assert.rejects(applyPaidInvoice(b.env, event.external_id, event));
  assert.equal(b.read('users/u/meta/profile').plan, 'pending');
  assert.equal(b.read('users/u/verifiedPaymentReceipts/beruang_u_1'), null);
});
test('deleted account and mismatched invoice never receive entitlement', async t => {
  const b = backend(t);
  for (const invalid of [{ ...event, amount: 1 }, { ...event, currency: 'USD' }, { ...event, id: 'other' }]) await assert.rejects(applyPaidInvoice(b.env, event.external_id, invalid), e => e.status === 400);
  b.put('accountDeletions/u', { status: 'pending' });
  await assert.rejects(applyPaidInvoice(b.env, event.external_id, event), e => e.status === 409);
  assert.equal(b.commitCalls(), 0);
});
test('missing service credential prevents invoice provider call', async t => {
  const b = backend(t); delete b.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const res = await handleCreateInvoice(body({ product: 'beruang', paket: 'monthly', amount: 50000, externalId: 'beruang_u_new', successUrl: 'https://berstock.id/app.html', failureUrl: 'https://berstock.id/app.html' }, { Authorization: 'Bearer token' }), b.env);
  assert.equal(res.status, 503); assert.equal(b.providerCalls(), 0);
});
test('verify-payment refuses other UID and returns true only after server commit', async t => {
  const b = backend(t), request = new Request('https://test/api/verify-payment?ref=beruang_u_1', { headers: { Authorization: 'Bearer token' } });
  b.put('payments/beruang_u_1', { ...b.read('payments/beruang_u_1'), uid: 'other' });
  assert.equal((await handleVerifyPayment(request, b.env)).status, 403);
  assert.equal(b.providerCalls(), 0);
  b.put('payments/beruang_u_1', { ...b.read('payments/beruang_u_1'), uid: 'u' });
  const result = await (await handleVerifyPayment(request, b.env)).json();
  assert.equal(result.entitlementApplied, true); assert.equal(result.status, 'paid');
  assert.equal(result.expiresAt, b.read('users/u/meta/profile').expiresAt);
});
test('valid webhook with unconfigured entitlement backend returns retryable failure', async t => {
  const b = backend(t); delete b.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  assert.equal((await handleXenditWebhook(body(event, { 'x-callback-token': 'callback' }), b.env)).status, 503);
});

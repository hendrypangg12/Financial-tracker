import test from 'node:test';
import assert from 'node:assert/strict';
import { requireUser, hasProAccess } from '../src/auth.js';
import { handleAdvise } from '../src/advise.js';
import { handleCreateInvoice, handleVerifyPayment, handleXenditWebhook } from '../src/payment.js';

const json = x => new Response(JSON.stringify(x), { headers: { 'Content-Type': 'application/json' } });
const request = (body, headers = {}, path = '/api/advise') => new Request('https://worker.test' + path, { method: 'POST', headers, body: JSON.stringify(body) });
const authorization = { Authorization: 'Bearer valid' };
function environment() {
  const data = new Map();
  return { FIREBASE_WEB_API_KEY: 'public-key', FIREBASE_PROJECT_ID: 'test', XENDIT_WEBHOOK_TOKEN: 'secret',
    BOT_DATA: { get: async k => data.get(k) ?? null, put: async (k, v) => data.set(k, v) }, data };
}
function mockFetch(t, fn) { const old = globalThis.fetch; globalThis.fetch = fn; t.after(() => { globalThis.fetch = old; }); }

test('missing token is rejected before any provider call', async t => {
  mockFetch(t, () => { throw Error('must not call'); });
  await assert.rejects(requireUser(request({ email: 'spoofed' }), environment()), e => e.status === 401);
});
test('invalid Firebase token is rejected', async t => {
  mockFetch(t, async () => new Response('{}', { status: 400 }));
  await assert.rejects(requireUser(request({}, authorization), environment()), e => e.status === 401);
});
test('verified UID ignores submitted identity', async t => {
  mockFetch(t, async () => json({ users: [{ localId: 'real-user', email: 'real@example.test' }] }));
  const user = await requireUser(request({ uid: 'attacker' }, authorization), environment());
  assert.equal(user.uid, 'real-user');
});
test('expired subscription is not Pro; legacy lifetime remains valid', async t => {
  let plan = 'monthly';
  mockFetch(t, async () => json({ fields: { plan: { stringValue: plan }, expiresAt: { stringValue: '2000-01-01' } } }));
  assert.equal(await hasProAccess({ uid: 'u', token: 't' }, environment()), false);
  plan = 'lifetime'; assert.equal(await hasProAccess({ uid: 'u', token: 't' }, environment()), true);
});
test('AI rejects anonymous and non-Pro advisor requests', async t => {
  assert.equal((await handleAdvise(request({ email: 'fake', question: 'hi' }), environment())).status, 401);
  mockFetch(t, async url => String(url).includes('accounts:lookup') ? json({ users: [{ localId: 'u' }] }) : json({ fields: { plan: { stringValue: 'pending' } } }));
  assert.equal((await handleAdvise(request({ question: 'hi' }, authorization), environment())).status, 403);
});
test('free trial cannot use AI advisor or Goal planner, even while active', async t => {
  const future = new Date(Date.now() + 86400000).toISOString();
  mockFetch(t, async url => String(url).includes('accounts:lookup') ? json({ users: [{ localId: 'u' }] }) : json({ fields: { plan: { stringValue: 'free_trial' }, expiresAt: { stringValue: future } } }));
  for (const body of [{ question: 'hi' }, { question: 'goal', context: { source: 'goal-planner' } }]) {
    const res = await handleAdvise(request(body, authorization), environment());
    assert.equal(res.status, 403);
    assert.match((await res.json()).reply, /uji coba gratis belum termasuk AI/i);
  }
});
test('Goal prompt above 500 chars reaches server quota check; quota is tied to UID', async t => {
  const env = environment();
  env.data.set('goal_free:u:' + new Date().toISOString().slice(0, 7), '1');
  mockFetch(t, async url => String(url).includes('accounts:lookup') ? json({ users: [{ localId: 'u' }] }) : json({ fields: {} }));
  const result = await handleAdvise(request({ email: 'changed', question: 'x'.repeat(1200), context: { source: 'goal-planner' } }, authorization), env);
  assert.equal(result.status, 429);
});
test('oversized or non-string AI input is rejected', async t => {
  mockFetch(t, async () => json({ users: [{ localId: 'u' }] }));
  for (const question of [23, null, 'x'.repeat(2501)]) assert.equal((await handleAdvise(request({ question }, authorization), environment())).status, 400);
});
test('webhook fails closed without configured secret and rejects wrong secret', async () => {
  const env = environment();
  assert.equal((await handleXenditWebhook(request({}), { ...env, XENDIT_WEBHOOK_TOKEN: '' })).status, 503);
  assert.equal((await handleXenditWebhook(request({}, { 'x-callback-token': 'wrong' }), env)).status, 401);
});
test('invoice creation rejects external redirect URLs', async t => {
  mockFetch(t, async () => json({ users: [{ localId: 'u', email: 'u@example.test' }] }));
  const result = await handleCreateInvoice(request({ product: 'beruang', paket: 'trial', amount: 10000, externalId: 'beruang_u_trial_123', successUrl: 'https://evil.test', failureUrl: 'https://berstock.id/app.html' }, authorization), environment());
  assert.equal(result.status, 400);
});

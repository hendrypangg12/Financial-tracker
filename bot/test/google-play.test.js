import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createHash, createSign } from 'node:crypto';
import { encodeFields, decodeFields } from '../src/firebase-admin.js';
import { applyPlaySubscriptionEntitlement, handleGooglePlayVerify } from '../src/google-play.js';
import { handleGooglePlayRtdn, _test as rtdnTest } from '../src/google-play-rtdn.js';

const json = (value, status = 200) => new Response(JSON.stringify(value), { status });
const base = 'projects/play-test/databases/(default)/documents/';
const privateKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
function backend(t) {
  const docs = new Map(); let version = 0;
  const put = (path, data) => docs.set(path, { name: base + path, fields: encodeFields(data), updateTime: String(++version) });
  const read = path => docs.has(path) ? decodeFields(docs.get(path).fields) : null;
  const env = { FIREBASE_WEB_API_KEY: 'web-key', FIREBASE_PROJECT_ID: 'play-test',
    FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ project_id: 'play-test', client_email: 'firebase@test.iam.gserviceaccount.com', private_key: privateKey }),
    GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: JSON.stringify({ project_id: 'play-test', client_email: `play-${Date.now()}-${Math.random()}@test.iam.gserviceaccount.com`, private_key: privateKey }) };
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('oauth2.googleapis.com')) return json({ access_token: 'server-token', expires_in: 3600 });
    if (String(url).includes('accounts:lookup')) return json({ users: [{ localId: 'u', email: 'u@test' }] });
    if (String(url).includes('androidpublisher.googleapis.com')) return json({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED', externalAccountIdentifiers: { obfuscatedExternalAccountId: createHash('sha256').update('u').digest('hex') }, lineItems: [{ productId: 'beruang_monthly_subscription', offerDetails: { basePlanId: 'monthly-30d' }, expiryTime: new Date(Date.now() + 30 * 86400000).toISOString(), autoRenewingPlan: { autoRenewEnabled: true } }] });
    assert.match(String(url), /^https:\/\/firestore.googleapis.com\/v1\//);
    const path = decodeURIComponent(String(url).split('/documents')[1] || '');
    if (path === ':commit') {
      const { writes } = JSON.parse(options.body);
      for (const write of writes) {
        const p = (write.update?.name || write.delete).slice(base.length), current = docs.get(p), condition = write.currentDocument;
        if (condition?.exists === false && current || condition?.updateTime && current?.updateTime !== condition.updateTime) return json({ error: { status: 'FAILED_PRECONDITION' } }, 409);
      }
      for (const write of writes) {
        const p = (write.update?.name || write.delete).slice(base.length);
        if (write.delete) docs.delete(p);
        else put(p, write.updateMask ? { ...read(p), ...decodeFields(write.update.fields) } : decodeFields(write.update.fields));
      }
      return json({});
    }
    const doc = docs.get(path.slice(1)); return doc ? json(doc) : json({ error: { status: 'NOT_FOUND' } }, 404);
  };
  t.after(() => { globalThis.fetch = oldFetch; });
  put('users/u/meta/profile', { plan: 'free_trial', expiresAt: new Date(Date.now() + 2 * 86400000).toISOString() });
  return { env, put, read, docs };
}

test('subscription renewal updates the same receipt to the authoritative Play expiry', async t => {
  const b = backend(t), token = 'subscription-purchase-token-1234567890';
  const purchase = { latestOrderId: 'GPA.renewal', subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE' };
  const line = { expiryTime: new Date(Date.now() + 45 * 86400000).toISOString(), autoRenewingPlan: { autoRenewEnabled: true } };
  const first = await applyPlaySubscriptionEntitlement(b.env, 'u', 'beruang_monthly_subscription', token, purchase, line);
  const renewedLine = { expiryTime: new Date(Date.now() + 75 * 86400000).toISOString(), autoRenewingPlan: { autoRenewEnabled: false } };
  const renewed = await applyPlaySubscriptionEntitlement(b.env, 'u', 'beruang_monthly_subscription', token, { ...purchase, subscriptionState: 'SUBSCRIPTION_STATE_CANCELED' }, renewedLine);
  assert.equal(first.receiptId, renewed.receiptId);
  assert.equal(b.read('users/u/meta/profile').expiresAt, renewedLine.expiryTime);
  const receipt = [...b.docs.keys()].find(path => path.includes('verifiedPaymentReceipts'));
  assert.equal(b.read(receipt).autoRenewEnabled, false);
  assert.equal(b.read(receipt).providerExpiry, renewedLine.expiryTime);
});

test('Play subscription verify rejects a non-active expired entitlement before writing', async t => {
  const b = backend(t);
  const old = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('oauth2.googleapis.com')) return json({ access_token: 'server-token', expires_in: 3600 });
    if (String(url).includes('accounts:lookup')) return json({ users: [{ localId: 'u' }] });
    if (String(url).includes('androidpublisher.googleapis.com')) return json({ subscriptionState: 'SUBSCRIPTION_STATE_EXPIRED', externalAccountIdentifiers: { obfuscatedExternalAccountId: 'account-hash' }, lineItems: [{ productId: 'beruang_monthly_subscription', offerDetails: { basePlanId: 'monthly-30d' }, expiryTime: '2020-01-01T00:00:00Z' }] });
    return old(url, options);
  };
  const request = new Request('https://worker.test/api/google-play/verify', { method: 'POST', headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: 'beruang_monthly_subscription', purchaseToken: 'subscription-purchase-token-1234567890' }) });
  const result = await handleGooglePlayVerify(request, b.env);
  assert.equal(result.status, 402);
  assert.equal([...b.docs.keys()].some(path => path.includes('verifiedPaymentReceipts')), false);
});

test('Play subscription verification checks the account, stores its expiry, and acknowledges it', async t => {
  const b = backend(t); let acknowledged = false;
  const old = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('oauth2.googleapis.com')) return json({ access_token: 'server-token', expires_in: 3600 });
    if (String(url).includes('accounts:lookup')) return json({ users: [{ localId: 'u' }] });
    if (String(url).includes('androidpublisher.googleapis.com') && String(url).endsWith(':acknowledge')) { acknowledged = true; return json({}); }
    if (String(url).includes('androidpublisher.googleapis.com')) return json({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', acknowledgementState: 'ACKNOWLEDGEMENT_STATE_PENDING', latestOrderId: 'GPA.new', externalAccountIdentifiers: { obfuscatedExternalAccountId: createHash('sha256').update('u').digest('hex') }, lineItems: [{ productId: 'beruang_monthly_subscription', offerDetails: { basePlanId: 'monthly-30d' }, expiryTime: new Date(Date.now() + 30 * 86400000).toISOString(), autoRenewingPlan: { autoRenewEnabled: true } }] });
    return old(url, options);
  };
  const request = new Request('https://worker.test/api/google-play/verify', { method: 'POST', headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: 'beruang_monthly_subscription', purchaseToken: 'subscription-purchase-token-1234567890' }) });
  const result = await handleGooglePlayVerify(request, b.env), value = await result.json();
  assert.equal(result.status, 200); assert.equal(value.entitlementApplied, true); assert.equal(value.autoRenewing, true); assert.equal(acknowledged, true);
  assert.equal(b.read('users/u/meta/profile').plan, 'monthly');
  assert.equal([...b.docs.keys()].some(path => path.includes('verifiedPaymentReceipts/googleplay_sub_')), true);
});

const b64url = value => Buffer.from(value).toString('base64url');
function signedPush(privateKey, claims, kid) {
  const first = b64url(JSON.stringify({ alg: 'RS256', kid })), second = b64url(JSON.stringify(claims));
  const signer = createSign('RSA-SHA256'); signer.update(first + '.' + second); signer.end();
  return first + '.' + second + '.' + signer.sign(privateKey, 'base64url');
}

test('RTDN rejects a push with the wrong OIDC audience before reading purchase data', async t => {
  const b = backend(t), old = globalThis.fetch;
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 }), kid = `wrong-aud-${Date.now()}`;
  const token = signedPush(pair.privateKey, { iss: 'https://accounts.google.com', aud: 'wrong', email: 'push@test', email_verified: true, exp: Date.now()/1000+300, iat: Date.now()/1000 }, kid);
  const request = new Request('https://worker.test/api/google-play/rtdn', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: '{}' });
  const response = await handleGooglePlayRtdn(request, { ...b.env, GOOGLE_PLAY_RTDN_AUDIENCE: 'expected', GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL: 'push@test' });
  assert.equal(response.status, 401);
  assert.equal(b.docs.size, 1);
  globalThis.fetch = old;
});

test('RTDN verifies Google OIDC and refreshes the server-authoritative subscription entitlement', async t => {
  const b = backend(t), old = globalThis.fetch, tokenValue = 'rtdn-purchase-token-1234567890', uid = 'u';
  const tokenHash = createHash('sha256').update(tokenValue).digest('hex'), receiptId = `googleplay_sub_${tokenHash}`;
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 }), kid = `valid-rtdn-${Date.now()}`;
  const publicJwk = pair.publicKey.export({ format: 'jwk' }); publicJwk.kid = kid; publicJwk.alg = 'RS256'; publicJwk.use = 'sig';
  rtdnTest.jwksCache.keys = null; rtdnTest.jwksCache.expiresAt = 0;
  const expiryTime = new Date(Date.now() + 60 * 86400000).toISOString();
  b.put(`googlePlaySubscriptions/${tokenHash}`, { uid, productId: 'beruang_monthly_subscription', receiptId });
  b.put('users/u/meta/profile', { plan: 'monthly', expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), activatedBy: 'google-play-subscription', lastPaymentRef: receiptId });
  b.put(`users/u/verifiedPaymentReceipts/${receiptId}`, { provider: 'google-play', billingType: 'subscription', productId: 'beruang_monthly_subscription', paket: 'monthly', providerExpiry: new Date(Date.now() + 30 * 86400000).toISOString() });
  const token = signedPush(pair.privateKey, { iss: 'https://accounts.google.com', aud: 'expected', email: 'push@test', email_verified: true, exp: Date.now()/1000+300, iat: Date.now()/1000 }, kid);
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('oauth2/v3/certs')) return json({ keys: [publicJwk] });
    if (String(url).includes('oauth2.googleapis.com')) return json({ access_token: 'server-token', expires_in: 3600 });
    if (String(url).includes('androidpublisher.googleapis.com')) return json({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', latestOrderId: 'GPA.rtdn', externalAccountIdentifiers: { obfuscatedExternalAccountId: createHash('sha256').update(uid).digest('hex') }, lineItems: [{ productId: 'beruang_monthly_subscription', offerDetails: { basePlanId: 'monthly-30d' }, expiryTime, autoRenewingPlan: { autoRenewEnabled: true } }] });
    return old(url, options);
  };
  const pubsubData = b64url(JSON.stringify({ packageName: 'id.berstock.beruang', subscriptionNotification: { purchaseToken: tokenValue, notificationType: 2 } }));
  const request = new Request('https://worker.test/api/google-play/rtdn', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: { data: pubsubData } }) });
  const response = await handleGooglePlayRtdn(request, { ...b.env, GOOGLE_PLAY_RTDN_AUDIENCE: 'expected', GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL: 'push@test' });
  const result = await response.json();
  assert.equal(response.status, 200); assert.equal(result.status, 'SUBSCRIPTION_STATE_ACTIVE');
  assert.equal(b.read('users/u/meta/profile').expiresAt, expiryTime);
  assert.equal(b.read(`users/u/verifiedPaymentReceipts/${receiptId}`).providerExpiry, expiryTime);
});

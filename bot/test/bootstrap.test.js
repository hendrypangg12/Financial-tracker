import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { handleAccountBootstrap } from '../src/bootstrap.js';
import { decodeFields, encodeFields } from '../src/firebase-admin.js';

const root = 'projects/bootstrap-test/databases/(default)/documents/';
const profilePath = 'users/new-user/meta/profile';
const privateKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });
const request = (body = {}, authorized = true) => new Request('https://worker.test/api/account/bootstrap', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: 'Bearer verified-token' } : {}) },
  body: JSON.stringify(body),
});

function backend(t, { contention = false, concurrentProfile = null, unavailable = false } = {}) {
  const docs = new Map();
  let commits = 0, calls = 0;
  const put = (path, data) => docs.set(path, { name: root + path, fields: encodeFields(data), updateTime: 'saved-version' });
  const read = path => docs.has(path) ? decodeFields(docs.get(path).fields) : null;
  const env = { FIREBASE_WEB_API_KEY: 'public-key', FIREBASE_PROJECT_ID: 'bootstrap-test',
    FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ project_id: 'bootstrap-test', client_email: 'server@test.iam.gserviceaccount.com', private_key: privateKey }) };
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    calls++;
    if (String(url).includes('accounts:lookup')) return json({ users: [{ localId: 'new-user', email: 'new@example.test' }] });
    if (String(url).includes('oauth2.googleapis.com')) return json({ access_token: 'server-token', expires_in: 3600 });
    assert.match(String(url), /^https:\/\/firestore.googleapis.com\/v1\//, 'signup must not call billing or AI providers');
    if (unavailable) return json({ error: { status: 'UNAVAILABLE' } }, 503);
    const path = decodeURIComponent(String(url).split('/documents')[1] || '');
    if (path === ':commit') {
      commits++;
      if (contention) return json({ error: { status: 'ABORTED' } }, 409);
      if (concurrentProfile && commits === 1) {
        put(profilePath, concurrentProfile);
        return json({ error: { status: 'FAILED_PRECONDITION' } }, 409);
      }
      const { writes } = JSON.parse(options.body);
      for (const write of writes) {
        assert.deepEqual(write.currentDocument, { exists: false }, 'bootstrap may only create, never overwrite, a profile');
        const key = write.update.name.slice(root.length);
        if (docs.has(key)) return json({ error: { status: 'FAILED_PRECONDITION' } }, 409);
      }
      for (const write of writes) put(write.update.name.slice(root.length), decodeFields(write.update.fields));
      return json({});
    }
    return docs.has(path.slice(1)) ? json(docs.get(path.slice(1))) : json({ error: { status: 'NOT_FOUND' } }, 404);
  };
  t.after(() => { globalThis.fetch = previousFetch; });
  return { env, put, read, get commits() { return commits; }, get calls() { return calls; } };
}

test('new signup receives one server-authorized 48-hour app trial without any checkout', async t => {
  const b = backend(t), before = Date.now();
  const response = await handleAccountBootstrap(request({ uid: 'someone-else', plan: 'lifetime', expiresAt: '2099-01-01', displayName: 'New user' }), b.env);
  const payload = await response.json(), profile = b.read(profilePath);
  assert.equal(response.status, 200);
  assert.equal(payload.created, true);
  assert.equal(profile.email, 'new@example.test');
  assert.equal(profile.plan, 'free_trial');
  assert.equal(profile.activatedBy, 'account-bootstrap');
  assert.ok(Date.parse(profile.createdAt) >= before && Date.parse(profile.createdAt) <= Date.now());
  assert.equal(Date.parse(profile.expiresAt) - Date.parse(profile.createdAt), 48 * 60 * 60 * 1000);
  assert.equal(profile.activatedAt, profile.createdAt);
  assert.equal(b.read('users/someone-else/meta/profile'), null);
  assert.equal(b.commits, 1);
});

test('signing in again or on another device never restarts the app trial', async t => {
  const b = backend(t);
  assert.equal((await handleAccountBootstrap(request(), b.env)).status, 200);
  const first = b.read(profilePath);
  const response = await handleAccountBootstrap(request({ expiresAt: '2099-01-01' }), b.env);
  assert.deepEqual(await response.json(), { ok: true, created: false });
  assert.deepEqual(b.read(profilePath), first);
  assert.equal(b.commits, 1);
});

test('expired trials, expired paid plans, and pending accounts are never silently renewed', async t => {
  const b = backend(t);
  for (const plan of ['free_trial', 'monthly', 'annual', 'pending']) {
    const existing = { plan, createdAt: '2020-01-01T00:00:00Z', expiresAt: '2020-01-03T00:00:00Z' };
    b.put(profilePath, existing);
    assert.equal((await handleAccountBootstrap(request(), b.env)).status, 200);
    assert.deepEqual(b.read(profilePath), existing);
  }
  assert.equal(b.commits, 0);
});

test('concurrent paid activation wins over a retrying signup trial', async t => {
  const paid = { plan: 'annual', expiresAt: '2099-01-01T00:00:00.000Z', activatedBy: 'google-play-subscription' };
  const b = backend(t, { concurrentProfile: paid });
  const response = await handleAccountBootstrap(request(), b.env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, created: false });
  assert.deepEqual(b.read(profilePath), paid);
  assert.equal(b.commits, 1);
});

test('exhausted signup contention returns a retryable failure instead of false success', async t => {
  const b = backend(t, { contention: true });
  const response = await handleAccountBootstrap(request(), b.env);
  assert.equal(response.status, 503);
  assert.equal(b.read(profilePath), null);
  assert.equal(b.commits, 3);
});

test('unavailable account storage cannot create a local or paid substitute for the trial', async t => {
  const b = backend(t, { unavailable: true });
  assert.equal((await handleAccountBootstrap(request(), b.env)).status, 503);
  assert.equal(b.read(profilePath), null);
  assert.equal(b.commits, 0);
});

test('deleted account tombstones prevent signup from resurrecting a fresh trial', async t => {
  const b = backend(t);
  b.put('accountDeletions/new-user', { status: 'completed' });
  assert.equal((await handleAccountBootstrap(request(), b.env)).status, 409);
  assert.equal(b.read(profilePath), null);
  assert.equal(b.commits, 0);
});

test('anonymous signup cannot create an entitlement or contact a provider', async t => {
  const b = backend(t);
  assert.equal((await handleAccountBootstrap(request({}, false), b.env)).status, 401);
  assert.equal(b.calls, 0);
  assert.equal(b.commits, 0);
});

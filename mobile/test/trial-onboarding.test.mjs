import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../../js/auth.js', import.meta.url), 'utf8');
const user = { uid: 'new-user', email: 'new@example.test', getIdToken: async () => 'verified-token', getIdTokenResult: async () => ({ claims: {} }) };
const trial = Object.freeze({ plan: 'free_trial', expiresAt: new Date(Date.now() + 2 * 86400000).toISOString() });
const snapshot = profile => ({ exists: !!profile, data: () => profile });
function client(get, fetch = async () => { throw new Error('unexpected API call'); }) {
  let listener;
  const ref = { get };
  const context = vm.createContext({ console: { warn() {} }, fetch,
    fbDb: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ref }) }) }) },
    fbAuth: { onAuthStateChanged: callback => { listener = callback; return () => {}; } },
  });
  vm.runInContext(source, context);
  return { context, ensure: () => context.ensureUserProfile(user), notify: value => listener(value) };
}

test('new account waits for its server-created trial and never writes entitlement from the browser', async () => {
  let reads = 0, bootstraps = 0;
  const c = client(async options => {
    assert.equal(options.source, 'server');
    return snapshot(reads++ ? trial : null);
  }, async (url, options) => {
    bootstraps++;
    assert.match(url, /\/api\/account\/bootstrap$/);
    assert.equal(options.headers.Authorization, 'Bearer verified-token');
    assert.equal('plan' in JSON.parse(options.body), false);
    return { ok: true };
  });
  assert.equal(await c.ensure(), trial);
  assert.equal(c.context.isPro(trial), true);
  assert.equal(bootstraps, 1);
  assert.equal(reads, 2);
});

test('existing expired profile remains expired without another signup trial request', async () => {
  const expired = Object.freeze({ plan: 'free_trial', expiresAt: '2020-01-01T00:00:00.000Z' });
  const c = client(async () => snapshot(expired));
  assert.equal(await c.ensure(), expired);
  assert.equal(c.context.isPro(expired), false);
});

test('bootstrap failure is explicit and never mistaken for an expired plan', async () => {
  const c = client(async () => snapshot(null), async () => ({ ok: false }));
  await assert.rejects(c.ensure, error => error.code === 'account/profile-unavailable');
});

test('bootstrap success without a saved profile remains a loading error, not a checkout decision', async () => {
  const c = client(async () => snapshot(null), async () => ({ ok: true }));
  await assert.rejects(c.ensure, error => error.code === 'account/profile-unavailable');
});

test('offline users keep an existing active cached subscription or trial', async () => {
  for (const profile of [trial, { plan: 'monthly', expiresAt: '2099-01-01T00:00:00.000Z' }, { plan: 'lifetime' }]) {
    const c = client(async options => {
      if (options.source === 'server') throw new Error('offline');
      assert.equal(options.source, 'cache');
      return snapshot(profile);
    });
    assert.equal(await c.ensure(), profile);
  }
});

test('missing or expired offline cache cannot fabricate a trial or demand a payment', async () => {
  for (const profile of [null, { plan: 'free_trial', expiresAt: '2020-01-01T00:00:00Z' }]) {
    const c = client(async options => {
      if (options.source === 'server') throw new Error('offline');
      return snapshot(profile);
    });
    await assert.rejects(c.ensure, error => error.code === 'account/profile-unavailable');
  }
});

test('auth callback receives profile-load status so the app can offer retry instead of payment', async () => {
  const c = client(async () => { throw new Error('offline'); });
  let result;
  c.context.onAuthStateChanged((...args) => { result = args; });
  await c.notify(user);
  assert.equal(result[0], user);
  assert.equal(result[1], null);
  assert.equal(result[2].profileError.code, 'account/profile-unavailable');
  assert.equal(vm.runInContext('authReady', c.context), true);
});

test('auth callback exposes a ready trial only after the saved profile is available', async () => {
  const c = client(async () => snapshot(trial));
  let result;
  c.context.onAuthStateChanged((...args) => { result = args; });
  await c.notify(user);
  assert.equal(result[1], trial);
  assert.equal(result[2].profileError, null);
});

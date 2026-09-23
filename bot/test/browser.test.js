import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = p => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

test('browser cannot grant itself a subscription using an arbitrary payment reference', async () => {
  let writes = 0;
  const ctx = vm.createContext({ fbDb: { runTransaction() { writes++; } } });
  vm.runInContext(read('js/auth.js'), ctx);
  await assert.rejects(vm.runInContext("activateSubscription('u','monthly',{paymentRef:'invented'})", ctx), /server pembayaran/);
  assert.equal(writes, 0);
});

test('first login on a second device cannot overwrite a profile created or upgraded concurrently', async () => {
  const paid = { plan: 'annual', expiresAt: '2028-01-01T00:00:00Z' };
  const ref = { get: async () => ({ exists: false }) };
  let writes = 0;
  const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ref }) }) }),
    runTransaction: fn => fn({ get: async () => ({ exists: true, data: () => paid }), set: () => writes++ }) };
  const ctx = vm.createContext({ fbDb: db }); vm.runInContext(read('js/auth.js'), ctx);
  const profile = await vm.runInContext("ensureUserProfile({uid:'u',email:'u@example.test'})",ctx);
  assert.equal(profile.plan, 'annual');
  assert.equal(writes, 0);
});

test('an email allowlist alone does not enable administrator actions', () => {
  const ctx = vm.createContext({ currentUser: { email: 'owner@example.test' }, currentClaims: {}, ADMIN_EMAILS: ['owner@example.test'] });
  vm.runInContext(read('js/admin.js'),ctx);
  assert.equal(vm.runInContext('isAdmin()',ctx),false);
  ctx.currentClaims.admin = true;
  assert.equal(vm.runInContext('isAdmin()',ctx),true);
});
test('switching accounts cannot migrate another account local transactions', () => {
  const cache = new Map();
  const ctx = vm.createContext({ STORAGE_KEY: 'state', DEFAULT_CATEGORIES: {}, console,
    localStorage: { getItem: k => cache.get(k), setItem: (k,v) => cache.set(k,v) } });
  vm.runInContext(read('js/storage.js'), ctx);
  vm.runInContext("selectUserStorage('alice'); state.transactions.push({id:'alice-only'}); saveState(); selectUserStorage('bob'); loadState()", ctx);
  assert.equal(vm.runInContext('state.transactions.length', ctx), 0);
  vm.runInContext("selectUserStorage('alice'); loadState()", ctx);
  assert.equal(vm.runInContext('state.transactions[0].id', ctx), 'alice-only');
});
test('service worker caches exactly the changed script URLs used by the app', () => {
  const app = read('app.html'), sw = read('sw.js');
  for (const name of ['storage','sync','auth','app','goal','ai-advisor']) {
    const url = app.match(new RegExp('js/' + name + '\\.js\\?v=\\d+'))[0];
    assert.ok(sw.includes(url), url);
  }
});

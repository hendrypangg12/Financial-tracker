import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = p => fs.readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

test('replaying a payment reference does not extend the subscription twice', async () => {
  const docs = new Map([['users/u/meta/profile', { plan: 'pending', expiresAt: '2000-01-01' }]]);
  const ref = path => ({ path, collection: name => ref(path + '/' + name), doc: name => ref(path + '/' + name) });
  const db = { collection: name => ref(name), runTransaction: async fn => {
    const updates = [];
    const value = await fn({ get: async r => ({ exists: docs.has(r.path), data: () => docs.get(r.path) }),
      set: (r, v, options) => updates.push([r.path, options?.merge ? { ...docs.get(r.path), ...v } : v]) });
    for (const [path, value] of updates) docs.set(path, value);
    return value;
  } };
  const ctx = vm.createContext({ fbDb: db }); vm.runInContext(read('js/auth.js'), ctx);
  const first = await vm.runInContext("activateSubscription('u','monthly',{paymentRef:'first'})", ctx);
  const again = await vm.runInContext("activateSubscription('u','monthly',{paymentRef:'first'})", ctx);
  assert.equal(first.expiresAt, again.expiresAt);
  const renewal = await vm.runInContext("activateSubscription('u','monthly',{paymentRef:'second'})", ctx);
  const replay = await vm.runInContext("activateSubscription('u','monthly',{paymentRef:'first'})", ctx);
  assert.equal(replay.expiresAt, renewal.expiresAt);
  assert.equal(Date.parse(renewal.expiresAt) - Date.parse(first.expiresAt), 30 * 86400000);
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

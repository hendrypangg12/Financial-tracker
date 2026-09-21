import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../../js/sync.js', import.meta.url), 'utf8');
const copy = x => JSON.parse(JSON.stringify(x));
function harness(remote, local = remote || {}) {
  let server = copy(remote), writes = 0, offline = false, listener;
  const cache = new Map(), status = {};
  const snap = () => ({ exists: server !== null, data: () => copy(server), metadata: {} });
  const ref = { get: async () => { if (offline) throw Error('offline'); return snap(); }, onSnapshot: (opts, fn) => { listener = fn; return () => {}; } };
  const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ref }) }) }), runTransaction: async fn => {
    if (offline) throw Error('offline');
    let next; await fn({ get: async () => snap(), set: (r, data) => { next = copy(data); } });
    if (next) { server = next; writes++; }
  } };
  const context = vm.createContext({ state: copy(local), currentUser: { uid: 'u' }, fbDb: db, STORAGE_KEY: 'state', storageKey: () => 'state',
    localStorage: { getItem: k => cache.get(k) ?? null, setItem: (k, v) => cache.set(k, v), removeItem: k => cache.delete(k) },
    document: { getElementById: () => status, addEventListener() {} }, window: { addEventListener() {} },
    console: { warn() {} }, setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {} });
  vm.runInContext(source, context);
  return { context, cache, status, run: code => vm.runInContext(code, context), server: () => server, writes: () => writes,
    offline: x => { offline = x; }, remote: x => { server = copy(x); }, notify: () => listener(snap()) };
}
test('cloud load replaces stale local data and persists it before UI init', async () => {
  const h = harness({ transactions: [{ id: 'new' }] }, { transactions: [{ id: 'old' }] });
  assert.equal(await h.run('loadFromCloud()'), true);
  assert.equal(h.context.state.transactions[0].id, 'new');
  assert.equal(JSON.parse(h.cache.get('state')).transactions[0].id, 'new');
  assert.ok(h.cache.get('beruang-sync-legacy-backup:u'));
});
test('failed first cloud load cannot upload empty local data', async () => {
  const h = harness({ transactions: [{ id: 'important' }] }, {}); h.offline(true);
  assert.equal(await h.run('loadFromCloud()'), false); h.offline(false);
  assert.equal(await h.run('pushToCloudImmediate()'), false);
  assert.equal(h.writes(), 0);
});
test('new account uploads its local state after confirmed server absence', async () => {
  const h = harness(null, { transactions: [{ id: 'local' }] });
  assert.equal(await h.run('loadFromCloud()'), true);
  assert.equal(h.server().transactions[0].id, 'local');
});
test('concurrent device update is never overwritten; local backup survives', async () => {
  const h = harness({ transactions: [{ id: 'base' }] }); await h.run('loadFromCloud()');
  h.context.state.transactions.push({ id: 'local' }); h.remote({ transactions: [{ id: 'base' }, { id: 'other-device' }] });
  assert.equal(await h.run('pushToCloudImmediate()'), false);
  assert.equal(h.server().transactions[1].id, 'other-device');
  assert.equal(h.context.state.transactions[1].id, 'local');
  assert.ok(h.cache.get('beruang-sync-conflict:u'));
});
test('listener does not erase unsynced edits', async () => {
  const h = harness({ transactions: [] }); await h.run('loadFromCloud()'); h.run('startCloudListener()');
  h.context.state.transactions.push({ id: 'unsynced' }); h.remote({ transactions: [{ id: 'remote' }] }); h.notify();
  assert.equal(h.context.state.transactions[0].id, 'unsynced');
});
test('offline edits survive reload if cloud baseline is unchanged', async () => {
  const h = harness({ transactions: [] }); await h.run('loadFromCloud()');
  h.context.state.transactions.push({ id: 'offline-edit' });
  assert.equal(await h.run('loadFromCloud()'), true);
  assert.equal(h.server().transactions[0].id, 'offline-edit');
});
test('clean device accepts remote updates', async () => {
  const h = harness({ transactions: [{ id: 'server' }] }); await h.run('loadFromCloud()');
  h.run('startCloudListener()'); h.remote({ transactions: [{ id: 'updated' }] }); h.notify();
  assert.equal(h.context.state.transactions[0].id, 'updated');
});

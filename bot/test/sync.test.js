import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../../js/sync.js', import.meta.url), 'utf8');
const copy = x => JSON.parse(JSON.stringify(x));
function harness(remote, local = remote || {}) {
  let server = copy(remote), writes = 0, offline = false, listener, beforeCommit;
  const cache = new Map(), status = {};
  const snap = () => ({ exists: server !== null, data: () => copy(server), metadata: {} });
  const ref = { get: async () => { if (offline) throw Error('offline'); return snap(); }, onSnapshot: (opts, fn) => { listener = fn; return () => {}; } };
  const db = { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ref }) }) }), runTransaction: async fn => {
    if (offline) throw Error('offline');
    let next; await fn({ get: async () => snap(), set: (r, data) => { next = copy(data); } });
    if (beforeCommit) await beforeCommit();
    if (next) { server = next; writes++; }
  } };
  const context = vm.createContext({ state: copy(local), currentUser: { uid: 'u' }, fbDb: db, STORAGE_KEY: 'state', storageKey: () => 'state',
    localStorage: { getItem: k => cache.get(k) ?? null, setItem: (k, v) => cache.set(k, v), removeItem: k => cache.delete(k) },
    document: { getElementById: () => status, addEventListener() {} }, window: { addEventListener() {} },
    console: { warn() {} }, setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {} });
  vm.runInContext(source, context);
  return { context, cache, status, run: code => vm.runInContext(code, context), server: () => server, writes: () => writes,
    offline: x => { offline = x; }, remote: x => { server = copy(x); }, notify: () => listener(snap()), beforeCommit: fn => { beforeCommit = fn; } };
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
test('independent transactions from two devices both survive and converge', async () => {
  const h = harness({ transactions: [{ id: 'base' }] }); await h.run('loadFromCloud()');
  h.context.state.transactions.push({ id: 'local' }); h.remote({ transactions: [{ id: 'base' }, { id: 'other-device' }] });
  assert.equal(await h.run('pushToCloudImmediate()'), true);
  assert.deepEqual(h.server().transactions.map(t => t.id), ['base', 'other-device', 'local']);
  assert.equal(JSON.stringify(h.context.state.transactions), JSON.stringify(h.server().transactions));
});
test('listener does not erase unsynced edits', async () => {
  const h = harness({ transactions: [] }); await h.run('loadFromCloud()'); h.run('startCloudListener()');
  h.context.state.transactions.push({ id: 'unsynced' }); h.remote({ transactions: [{ id: 'remote' }] }); h.notify();
  assert.equal(h.context.state.transactions.some(t => t.id === 'unsynced'), true);
  assert.equal(h.context.state.transactions.some(t => t.id === 'remote'), true);
  assert.equal(await h.run('pushToCloudImmediate()'), true);
  assert.deepEqual(h.server().transactions.map(t => t.id), ['remote', 'unsynced']);
});

test('different edits of the same transaction stop sync and preserve both versions', async () => {
  const h = harness({ transactions: [{ id: 'a', jumlah: 100 }] }); await h.run('loadFromCloud()');
  h.context.state.transactions[0].jumlah = 150;
  h.remote({ transactions: [{ id: 'a', jumlah: 200 }] });
  assert.equal(await h.run('pushToCloudImmediate()'), false);
  assert.equal(h.server().transactions[0].jumlah, 200);
  assert.equal(h.context.state.transactions[0].jumlah, 150);
  assert.equal(JSON.parse(h.cache.get('beruang-sync-conflict:u')).transactions[0].jumlah, 150);
});

test('deletion is not resurrected by independent changes on another device', async () => {
  const h = harness({ transactions: [{ id: 'a' }, { id: 'b', jumlah: 10 }] }); await h.run('loadFromCloud()');
  h.context.state.transactions = [{ id: 'b', jumlah: 10 }];
  h.remote({ transactions: [{ id: 'a' }, { id: 'b', jumlah: 20 }] });
  assert.equal(await h.run('pushToCloudImmediate()'), true);
  assert.deepEqual(h.server().transactions, [{ id: 'b', jumlah: 20 }]);
});

test('delete versus edit of the same transaction requires recovery', async () => {
  const h = harness({ transactions: [{ id: 'a', jumlah: 10 }] }); await h.run('loadFromCloud()');
  h.context.state.transactions = [];
  h.remote({ transactions: [{ id: 'a', jumlah: 20 }] });
  assert.equal(await h.run('pushToCloudImmediate()'), false);
  assert.equal(h.server().transactions.length, 1);
  assert.equal(h.context.state.transactions.length, 0);
});

test('offline edits merge on reload with independent remote edits', async () => {
  const h = harness({ transactions: [] }); await h.run('loadFromCloud()');
  h.context.state.transactions.push({ id: 'offline' });
  h.remote({ transactions: [{ id: 'online' }] });
  assert.equal(await h.run('loadFromCloud()'), true);
  assert.deepEqual(h.server().transactions.map(t => t.id), ['online', 'offline']);
});

test('edits made during upload survive the transaction result', async () => {
  const h = harness({ transactions: [] }); await h.run('loadFromCloud()');
  h.context.state.transactions.push({ id: 'first' });
  h.beforeCommit(() => { h.context.state.transactions.push({ id: 'during-upload' }); });
  assert.equal(await h.run('pushToCloudImmediate()'), true);
  assert.equal(h.server().transactions.length, 1);
  assert.equal(h.context.state.transactions.length, 2);
  h.beforeCommit(null);
  assert.equal(await h.run('pushToCloudImmediate()'), true);
  assert.deepEqual(h.server().transactions.map(t => t.id), ['first', 'during-upload']);
});

test('duplicate or missing record IDs never cause an ambiguous automatic merge', async () => {
  const h = harness({ transactions: [{ id: 'a' }] }); await h.run('loadFromCloud()');
  h.context.state.transactions.push({ id: 'a', jumlah: 1 });
  h.remote({ transactions: [{ id: 'a' }, { id: 'b' }] });
  assert.equal(await h.run('pushToCloudImmediate()'), false);
  assert.deepEqual(h.server().transactions.map(t => t.id), ['a', 'b']);
});

test('a notification queued during upload cannot replay an older snapshot', async () => {
  const h = harness({ transactions: [] }); await h.run('loadFromCloud()'); h.run('startCloudListener()');
  h.context.state.transactions.push({ id: 'new' });
  h.beforeCommit(() => h.notify());
  assert.equal(await h.run('pushToCloudImmediate()'), true);
  await Promise.resolve();
  assert.equal(h.context.state.transactions[0].id, 'new');
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

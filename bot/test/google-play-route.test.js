import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

test('Worker routes RTDN POST to the authenticated handler instead of 404', async t => {
  const old = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Unauthenticated push must not contact any provider'); };
  t.after(() => { globalThis.fetch = old; });
  const response = await worker.fetch(new Request('https://worker.test/api/google-play/rtdn', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  }), {}, {});
  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /tidak terautentikasi/);
});

test('Worker rejects GET for RTDN with the handler method response', async () => {
  const response = await worker.fetch(new Request('https://worker.test/api/google-play/rtdn'), {}, {});
  assert.equal(response.status, 405);
  assert.equal((await response.json()).error, 'Method not allowed');
});

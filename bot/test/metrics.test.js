import test from 'node:test';
import assert from 'node:assert/strict';
import { handleMetric, handleMetricsReport, wibDay } from '../src/metrics.js';

const env = {
  FIREBASE_WEB_API_KEY: 'k', FIREBASE_PROJECT_ID: 'test',
  FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ project_id: 'test', client_email: 'x@test', private_key: '-----BEGIN PRIVATE KEY-----\nQUJD\n-----END PRIVATE KEY-----' }),
};

function setup(t, { admin = false } = {}) {
  const docs = new Map();
  const commits = [];
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('identitytoolkit')) {
      return new Response(JSON.stringify({ users: [{ localId: 'uid-1', email: 'a@test', customAttributes: admin ? '{"admin":true}' : undefined }] }));
    }
    if (u.includes('oauth2.googleapis.com')) return new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }));
    if (u.endsWith(':commit')) {
      const { writes } = JSON.parse(init.body);
      commits.push(writes);
      const marker = writes[0].update.name;
      if (docs.has(marker)) return new Response(JSON.stringify({ error: { status: 'FAILED_PRECONDITION' } }), { status: 400 });
      docs.set(marker, true);
      const day = writes[1].transform.document;
      const row = docs.get(day) || {};
      for (const f of writes[1].transform.fieldTransforms) row[f.fieldPath] = (row[f.fieldPath] || 0) + 1;
      docs.set(day, row);
      return new Response('{}');
    }
    if (u.includes('/documents/metrics/')) {
      const key = [...docs.keys()].find(k => u.endsWith(encodeURIComponent(k.split('/').pop())) || u.endsWith(k.split('/').pop()));
      if (!key) return new Response('{}', { status: 404 });
      const fields = Object.fromEntries(Object.entries(docs.get(key)).map(([k, v]) => [k, { integerValue: String(v) }]));
      return new Response(JSON.stringify({ name: key, fields }));
    }
    throw new Error('unexpected fetch ' + u);
  };
  const oldSubtle = globalThis.crypto.subtle;
  Object.defineProperty(globalThis.crypto, 'subtle', { value: { importKey: async () => ({}), sign: async () => new Uint8Array(4), digest: oldSubtle.digest.bind(oldSubtle) }, configurable: true });
  t.after(() => { globalThis.fetch = oldFetch; Object.defineProperty(globalThis.crypto, 'subtle', { value: oldSubtle, configurable: true }); });
  return { docs, commits };
}

const post = (body, auth = true) => new Request('https://w.test/api/metric', { method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer tok' } : {}) }, body: JSON.stringify(body) });

test('metric counts each user once per event, split by source, and needs login', async (t) => {
  const { docs } = setup(t);
  assert.equal((await handleMetric(post({ event: 'first_tx', source: 'android' }), env)).status, 200);
  const again = await (await handleMetric(post({ event: 'first_tx', source: 'android' }), env)).json();
  assert.equal(again.counted, false);
  const day = [...docs.entries()].find(([k]) => k.includes('metrics/day-'))[1];
  assert.equal(day.first_tx, 1);
  assert.equal(day.first_tx__android, 1);
  assert.equal((await handleMetric(post({ event: 'hack' }), env)).status, 400);
  assert.equal((await handleMetric(post({ event: 'signup' }, false), env)).status, 401);
});

test('metrics report is admin-only and sums per event', async (t) => {
  setup(t);
  assert.equal((await handleMetricsReport(new Request('https://w.test/api/metrics', { headers: { Authorization: 'Bearer tok' } }), env)).status, 403);
});

test('metrics report returns totals for admin', async (t) => {
  setup(t, { admin: true });
  await handleMetric(post({ event: 'signup', source: 'web' }), env);
  const res = await handleMetricsReport(new Request('https://w.test/api/metrics?days=7', { headers: { Authorization: 'Bearer tok' } }), env);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.totals.signup, 1);
  assert.equal(data.bySource.web.signup, 1);
  assert.equal(data.daily.length, 7);
  assert.equal(data.daily[0].date, wibDay());
});

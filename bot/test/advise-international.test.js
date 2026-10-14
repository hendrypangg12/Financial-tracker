import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdvisorSystemPrompt, buildUserMessage, formatAdvisorMoney, handleAdvise, normalizeAdvisorPreferences } from '../src/advise.js';

const json = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const request = (context, question = 'Where can I save more?') => new Request('https://worker.test/api/advise', {
  method: 'POST', headers: { Authorization: 'Bearer verified', 'Accept-Language': context?.language || 'id' },
  body: JSON.stringify({ email: 'spoofed@example.test', question, context }),
});
function environment() {
  const data = new Map();
  return { FIREBASE_WEB_API_KEY: 'test-key', FIREBASE_PROJECT_ID: 'test-project', ANTHROPIC_API_KEY: 'mock-key', data,
    BOT_DATA: { get: async key => data.get(key) ?? null, put: async (key, value) => data.set(key, value) } };
}
function mockFetch(t, plan = 'lifetime', provider) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('accounts:lookup')) return json({ users: [{ localId: 'verified-user' }] });
    if (String(url).includes('firestore.googleapis.com')) return json({ fields: {
      plan: { stringValue: plan }, expiresAt: { stringValue: new Date(Date.now() + 86400000).toISOString() },
    } });
    if (String(url).includes('api.anthropic.com')) {
      if (!provider) throw Error('Unexpected provider request');
      return provider(options);
    }
    throw Error('Unexpected network target: ' + String(url));
  };
  t.after(() => { globalThis.fetch = original; });
}

test('old clients retain Indonesian IDR defaults; invalid locale and unsupported currency fail closed', () => {
  assert.deepEqual(normalizeAdvisorPreferences(null), { language: 'id', currency: 'IDR', locale: 'id-ID' });
  for (const context of [{ language: 'fr' }, { currency: 'ZZZ' }, { currency: 'usd' }, { language: 'en', locale: 'id-ID' }]) {
    assert.throws(() => normalizeAdvisorPreferences(context));
  }
  assert.equal(normalizeAdvisorPreferences({ language: 'en', currency: 'MYR' }).currency, 'MYR');
});

test('provider context preserves fractional currency amounts and never silently converts to Rupiah', () => {
  const cases = [['USD', '12.50'], ['JPY', '13'], ['KWD', '12.500']];
  for (const [currency, expected] of cases) {
    const preferences = normalizeAdvisorPreferences({ language: 'en', currency });
    const result = formatAdvisorMoney(12.5, preferences);
    assert.ok(result.includes(currency));
    assert.ok(result.includes(expected));
    assert.doesNotMatch(result, /Rp/);
  }
  assert.equal(formatAdvisorMoney(1500000, normalizeAdvisorPreferences(null)), 'Rp 1.500.000');
});

test('English prompts use actual records, including history, assets, debt and decimal transaction amounts', () => {
  const context = { language: 'en', locale: 'en-US', currency: 'USD', monthName: 'October 2026',
    totalPemasukan: 1000.25, totalPengeluaran: 12.5, sisaSaldo: 987.75, totalTransaksi: 1,
    assetTotal: 50.5, assetBreakdown: [{ nama: 'Savings', jenis: 'cash', jumlah: 50.5 }], piutangTotal: 1.25, hutangTotal: 2.5,
    categoryBreakdown: [{ name: 'Food', total: 12.5, pct: 100 }],
    recentTransactions: [{ tanggal: '2026-10-01', desc: 'Lunch', jenis: 'pengeluaran', jumlah: 12.5, kategori: 'Food' }],
    monthlyHistory: [{ bulan: 'Sep 2026', pemasukan: 1000.25, pengeluaran: 12.5, sisa: 987.75 }, { bulan: 'Oct 2026', pemasukan: 1000.25, pengeluaran: 12.5, sisa: 987.75 }],
  };
  const message = buildUserMessage('How am I doing?', context);
  assert.match(message, /Total income/);
  assert.match(message, /Monthly history/);
  assert.match(message, /Outstanding debt/);
  assert.match(message, /USD\s+12\.50/);
  assert.doesNotMatch(message, /Rp|Total Pemasukan/);
  const system = buildAdvisorSystemPrompt(normalizeAdvisorPreferences(context));
  assert.match(system, /Respond in English/);
  assert.match(system, /do not remember previous conversations/);
  assert.match(system, /never apply an exchange rate/);
  assert.doesNotMatch(system, /Rp 1/);
});

test('goal-only context does not fabricate zero income or expense records', () => {
  const message = buildUserMessage('Target: USD 500.00', { source: 'goal-planner', language: 'en', currency: 'USD' });
  assert.match(message, /Target: USD 500\.00/);
  assert.doesNotMatch(message, /Total income|Net income/);
});

test('English free trial and daily limit remain enforced without any provider call or local-price offer', async t => {
  mockFetch(t, 'free_trial');
  for (const context of [{ language: 'en', currency: 'USD' }, { source: 'goal-planner', language: 'en', currency: 'JPY' }]) {
    const result = await handleAdvise(request(context), environment());
    assert.equal(result.status, 403);
    const response = await result.json();
    assert.match(response.reply, /free trial does not include AI/i);
    assert.doesNotMatch(response.reply, /Rp|10rb/);
  }
});

test('daily limit and free goal quota stay keyed by authenticated UID rather than submitted email', async t => {
  mockFetch(t);
  const env = environment();
  env.data.set('advise_rate:verified-user:' + new Date().toISOString().slice(0, 10), '30');
  const result = await handleAdvise(request({ language: 'en', currency: 'USD' }), env);
  assert.equal(result.status, 429);
  assert.match((await result.json()).reply, /30 AI questions/);
});

test('paid request forwards English currency context to the shared model and consumes only the verified UID quota', async t => {
  let submitted;
  mockFetch(t, 'lifetime', options => {
    submitted = JSON.parse(options.body);
    return json({ id: 'mock-message', type: 'message', role: 'assistant', model: 'claude-sonnet-5',
      content: [{ type: 'text', text: 'Your recorded lunch cost USD 12.50.' }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } });
  });
  const env = environment();
  const result = await handleAdvise(request({ language: 'en', currency: 'USD', totalPengeluaran: 12.5 }), env);
  assert.equal(result.status, 200);
  assert.equal(submitted.model, 'claude-sonnet-5');
  assert.match(submitted.system[0].text, /Selected wallet currency: USD/);
  assert.match(submitted.messages[0].content, /USD\s+12\.50/);
  assert.equal(submitted.messages.length, 1);
  assert.equal(env.data.get('advise_rate:verified-user:' + new Date().toISOString().slice(0, 10)), '1');
  assert.ok([...env.data.keys()].every(key => !key.includes('spoofed')));
});

test('invalid new metadata is rejected before plan lookup or provider invocation', async t => {
  mockFetch(t);
  const result = await handleAdvise(request({ language: 'en', currency: 'ZZZ' }), environment());
  assert.equal(result.status, 400);
  assert.match((await result.json()).error, /not supported/);
});

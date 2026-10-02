import test from 'node:test';
import assert from 'node:assert/strict';
import { weekRanges, computeWeeklySummary, buildReportMessage, sendWeeklyReportFor } from '../src/weekly-report.js';

// Minggu 27 Sep 2026 20:00 WIB = 13:00 UTC
const NOW = Date.UTC(2026, 8, 27, 13, 0, 0);

test('week ranges are Monday–Sunday in WIB', () => {
  const r = weekRanges(NOW);
  assert.equal(r.thisWeek.from, '2026-09-21');
  assert.equal(r.thisWeek.to, '2026-09-27');
  assert.equal(r.lastWeek.from, '2026-09-14');
  assert.equal(r.lastWeek.to, '2026-09-20');
  assert.equal(r.monthStart, '2026-09-01');
  assert.equal(r.weekKey, '2026-09-21');
});

const tx = [
  { tanggal: '2026-09-22', jenis: 'pengeluaran', jumlah: 25000, kategori: 'Konsumsi Makan', deskripsi: 'bakso' },
  { tanggal: '2026-09-24', jenis: 'pengeluaran', jumlah: 420000, kategori: 'Konsumsi Makan', deskripsi: 'kopi kekinian' },
  { tanggal: '2026-09-25', jenis: 'pengeluaran', jumlah: 50000, kategori: 'Transportasi', deskripsi: 'bensin' },
  { tanggal: '2026-09-21', jenis: 'pemasukan', jumlah: 8000000, kategori: 'Gaji & Pendapatan Utama', deskripsi: 'gaji' },
  { tanggal: '2026-09-16', jenis: 'pengeluaran', jumlah: 300000, kategori: 'Konsumsi Makan', deskripsi: 'makan' },
  { tanggal: '2026-09-18', jenis: 'pengeluaran', jumlah: 100000, kategori: 'Transportasi', deskripsi: 'grab' },
  { tanggal: '2026-09-03', jenis: 'pengeluaran', jumlah: 150000, kategori: 'Hiburan', deskripsi: 'nonton' },
];

test('weekly summary computes totals, deltas, top categories, month-to-date', () => {
  const s = computeWeeklySummary(tx, 2000000, NOW);
  assert.equal(s.expenseThis, 495000);
  assert.equal(s.incomeThis, 8000000);
  assert.equal(s.expenseLast, 400000);
  assert.equal(s.pctVsLastWeek, 24);
  assert.equal(s.topCategories[0].name, 'Konsumsi Makan');
  assert.equal(s.topCategories[0].total, 445000);
  assert.equal(s.topCategories[0].lastWeek, 300000);
  assert.equal(s.biggest[0].jumlah, 420000);
  assert.equal(s.mtdExpense, 495000 + 400000 + 150000);
  assert.equal(s.txCount, 4);
  assert.equal(s.activeDays, 4);
  assert.equal(s.inactiveTwoWeeks, false);
});

test('report message contains numbers, target line, insight, and escapes HTML', () => {
  const s = computeWeeklySummary(tx, 2000000, NOW);
  const msg = buildReportMessage(s, 'Bos, kopi <kekinian> Rp 420.000 penyebab utama.', 'Budi Santoso');
  assert.match(msg, /Halo Budi!/);
  assert.match(msg, /Keluar: <b>Rp 495\.000<\/b> \(▲ 24% vs minggu lalu\)/);
  assert.match(msg, /Konsumsi Makan: Rp 445\.000 ▲/);
  assert.match(msg, /sisa Rp 955\.000/);
  assert.match(msg, /💡 Bos, kopi &lt;kekinian&gt;/);
  assert.match(msg, /\/laporan off/);
});

test('report without transactions nudges instead of showing zeros', () => {
  const s = computeWeeklySummary([], 0, NOW);
  assert.equal(s.inactiveTwoWeeks, true);
  assert.match(buildReportMessage(s, null, ''), /Belum ada catatan minggu ini/);
});

test('sendWeeklyReportFor: opt-in only; paid user gets report even when AI fails; dedupe; free trial refused', async (t) => {
  const store = new Map();
  const env = {
    BOT_DATA: { get: async (k) => store.get(k) ?? null, put: async (k, v) => store.set(k, v), delete: async (k) => store.delete(k) },
    FIREBASE_PROJECT_ID: 'test', FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ project_id: 'test', client_email: 'x@test', private_key: '-----BEGIN PRIVATE KEY-----\nQUJD\n-----END PRIVATE KEY-----' }),
    ANTHROPIC_API_KEY: 'sk-test',
  };
  let plan = 'monthly';
  const oldFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('oauth2.googleapis.com')) return new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }));
    if (u.includes('/meta/profile')) return new Response(JSON.stringify({ name: 'p', fields: { plan: { stringValue: plan }, expiresAt: { stringValue: '2099-01-01' } } }));
    if (u.includes('/data/main')) return new Response(JSON.stringify({ name: 'd', fields: { userName: { stringValue: 'Budi' }, target: { integerValue: '2000000' },
      transactions: { arrayValue: { values: tx.map((x) => ({ mapValue: { fields: { tanggal: { stringValue: x.tanggal }, jenis: { stringValue: x.jenis }, jumlah: { integerValue: String(x.jumlah) }, kategori: { stringValue: x.kategori }, deskripsi: { stringValue: x.deskripsi } } } })) } } } }));
    if (u.includes('api.anthropic.com')) return new Response(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'credit balance too low' } }), { status: 400 });
    if (u.includes('api.telegram.org')) { sent.push(JSON.parse(init.body)); return new Response('{"ok":true}'); }
    throw new Error('unexpected fetch ' + u);
  };
  t.after(() => { globalThis.fetch = oldFetch; });
  // adminToken butuh crypto.subtle importKey dengan private key valid → mock via serviceAccount? Lebih sederhana: mock adminToken lewat env override tidak ada,
  // jadi kita stub crypto.subtle untuk tes ini.
  const oldSubtle = globalThis.crypto.subtle;
  Object.defineProperty(globalThis.crypto, 'subtle', { value: { importKey: async () => ({}), sign: async () => new Uint8Array(4), digest: oldSubtle.digest.bind(oldSubtle) }, configurable: true });
  t.after(() => Object.defineProperty(globalThis.crypto, 'subtle', { value: oldSubtle, configurable: true }));

  const link = { email: 'budi@example.test', uid: 'uid-budi' };
  assert.equal(await sendWeeklyReportFor(env, 'tg-token', '123', link, { nowMs: NOW }), 'skipped:not-opted-in'); // default: TIDAK auto
  store.set('btg_weekly_on:uid-budi', '1');
  const r1 = await sendWeeklyReportFor(env, 'tg-token', '123', link, { nowMs: NOW });
  assert.equal(r1, 'sent');
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /Laporan Beruang/);
  assert.match(sent[0].text, /Rp 495\.000/);
  assert.doesNotMatch(sent[0].text, /💡/); // AI gagal → tanpa paragraf insight, laporan tetap terkirim
  assert.equal(await sendWeeklyReportFor(env, 'tg-token', '123', link, { nowMs: NOW }), 'skipped:already-sent');

  plan = 'free_trial'; store.set('btg_weekly_on:uid-trial', '1');
  const r3 = await sendWeeklyReportFor(env, 'tg-token', '124', { email: 'trial@example.test', uid: 'uid-trial' }, { nowMs: NOW });
  assert.equal(r3, 'skipped:not-paid');
  store.delete('btg_weekly_on:uid-budi'); plan = 'monthly';
  assert.equal(await sendWeeklyReportFor(env, 'tg-token', '123', link, { force: true, nowMs: NOW }), 'skipped:not-opted-in');
});

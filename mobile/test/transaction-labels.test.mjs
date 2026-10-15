import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const sources = await Promise.all(['preferences', 'data', 'utils', 'storage', 'pages', 'i18n'].map(name =>
  readFile(new URL(`../../js/${name}.js`, import.meta.url), 'utf8')));

function sandbox(language = 'en') {
  const elements = Object.fromEntries(['trx-search', 'trx-filter-jenis', 'trx-filter-month', 'trx-filter-year', 'trx-body', 'trx-empty']
    .map(id => [id, { value: '', innerHTML: '', hidden: false }]));
  const context = vm.createContext({
    console, Date, Intl,
    navigator: { language: 'en-US' },
    localStorage: { getItem: () => null, setItem: () => {} },
    document: { body: null, documentElement: {}, getElementById: id => elements[id], querySelectorAll: () => [] },
  });
  context.window = context;
  vm.runInContext(`${sources.join('\n')}\nstate.preferences.language = ${JSON.stringify(language)};
    globalThis.api = { state, renderTransaksi, renderKatList, applyAppLanguage };`, context);
  const transactions = [
    { id: 'wants', tanggal: '2026-10-15', jenis: 'pengeluaran', jumlah: 25000, deskripsi: 'bakso', kategori: 'Konsumsi Makan', subKategori: 'Makan keluarga di luar', alokasi: 'Keinginan' },
    { id: 'needs', tanggal: '2026-10-14', jenis: 'pengeluaran', jumlah: 20000, deskripsi: 'listrik', kategori: 'Hunian', subKategori: 'Listrik & air', alokasi: 'Kebutuhan' },
    { id: 'investments', tanggal: '2026-10-13', jenis: 'pengeluaran', jumlah: 100000, deskripsi: 'saham', kategori: 'Tabungan & Investasi', subKategori: 'Investasi emas', alokasi: 'Investasi' },
    { id: 'income', tanggal: '2026-10-12', jenis: 'pemasukan', jumlah: 5000000, deskripsi: 'Gaji & bonus', kategori: 'Gaji & Pendapatan Utama', subKategori: 'Gaji bulanan', alokasi: '' },
    { id: 'custom', tanggal: '2026-10-11', jenis: 'pengeluaran', jumlah: 50000, deskripsi: 'Pemasukan <custom>', kategori: 'Keinginan', subKategori: 'Makanan', alokasi: 'Custom <allocation>' },
  ];
  context.api.state.transactions = transactions.map(record => Object.freeze(record));
  context.api.state.categories.pengeluaran.Keinginan = { custom: true, subs: ['Makanan'], alokasi: 'Keinginan' };
  return { api: context.api, elements };
}

test('English transaction rows translate canonical types and allocations without translating user data', () => {
  const { api, elements } = sandbox();
  const original = JSON.stringify(api.state.transactions);
  api.renderTransaksi();
  api.applyAppLanguage();
  const html = elements['trx-body'].innerHTML;
  assert.match(html, /class="pill pill-out">Expense<\/span>/);
  assert.match(html, /class="pill pill-in">Income<\/span>/);
  for (const label of ['Needs', 'Wants', 'Investments']) assert.match(html, new RegExp(`class="pill pill-alok">${label}</span>`));
  assert.doesNotMatch(html, /class="pill (?:pill-out|pill-in)">(?:pengeluaran|pemasukan)</);
  assert.doesNotMatch(html, /class="pill pill-alok">(?:Kebutuhan|Keinginan|Investasi)</);
  assert.match(html, /Dining out/);
  assert.match(html, /<td data-label="Kategori">Keinginan<\/td>/, 'A custom category keeps its authored name');
  assert.match(html, /<td data-label="Sub Kategori">Makanan<\/td>/, 'Custom subcategories are not translated');
  assert.match(html, /Pemasukan &lt;custom&gt;/, 'Descriptions remain authored text and are escaped');
  assert.match(html, /Custom &lt;allocation&gt;/, 'Unknown legacy allocation text is preserved safely');
  assert.equal(JSON.stringify(api.state.transactions), original, 'Rendering never rewrites stored identifiers or descriptions');
});

test('language switches and canonical type filtering re-render the same stored records correctly', () => {
  const { api, elements } = sandbox();
  const original = JSON.stringify(api.state.transactions);
  api.renderTransaksi();
  api.state.preferences.language = 'id';
  api.renderTransaksi();
  api.applyAppLanguage();
  assert.match(elements['trx-body'].innerHTML, /class="pill pill-out">pengeluaran<\/span>/);
  assert.match(elements['trx-body'].innerHTML, /class="pill pill-alok">Keinginan<\/span>/);

  api.state.preferences.language = 'en';
  elements['trx-filter-jenis'].value = 'pemasukan';
  api.renderTransaksi(); // Filters call this renderer directly, without an applyAppLanguage pass.
  assert.match(elements['trx-body'].innerHTML, /class="pill pill-in">Income<\/span>/);
  assert.doesNotMatch(elements['trx-body'].innerHTML, /class="pill pill-out"/);
  elements['trx-filter-jenis'].value = 'pengeluaran';
  api.renderTransaksi();
  assert.match(elements['trx-body'].innerHTML, /class="pill pill-out">Expense<\/span>/);
  assert.match(elements['trx-body'].innerHTML, /class="pill pill-alok">Wants<\/span>/);
  assert.equal(JSON.stringify(api.state.transactions), original);
});

test('category allocation badges use the current display language while custom category names remain intact', () => {
  const { api } = sandbox();
  const original = JSON.stringify(api.state.categories);
  const english = api.renderKatList('pengeluaran');
  for (const label of ['Needs', 'Wants', 'Investments']) assert.match(english, new RegExp(`class="pill pill-alok">${label}</span>`));
  assert.match(english, /<h4>Keinginan<\/h4>/);
  api.state.preferences.language = 'id';
  assert.match(api.renderKatList('pengeluaran'), /class="pill pill-alok">Keinginan<\/span>/);
  assert.equal(JSON.stringify(api.state.categories), original);
});

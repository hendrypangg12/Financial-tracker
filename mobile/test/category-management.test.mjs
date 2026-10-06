import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const dataSource = await readFile(new URL('../../js/data.js', import.meta.url), 'utf8');
const storageSource = await readFile(new URL('../../js/storage.js', import.meta.url), 'utf8');

function categorySandbox() {
  const context = vm.createContext({
    localStorage: { getItem: () => null, setItem: () => {} },
    console,
  });
  vm.runInContext(`${dataSource}\n${storageSource}\nglobalThis.categoryApi = { state, createCustomCategory, renameCustomCategory };`, context);
  return context.categoryApi;
}

test('creates a custom category with a safe default subcategory and expense allocation', () => {
  const { state, createCustomCategory } = categorySandbox();
  const result = createCustomCategory('pengeluaran', '  Perawatan   Hewan  ', 'Kebutuhan');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { ok: true, name: 'Perawatan Hewan' });
  assert.deepEqual(JSON.parse(JSON.stringify(state.categories.pengeluaran['Perawatan Hewan'])), {
    alokasi: 'Kebutuhan', subs: ['Umum'], custom: true,
  });
});

test('rejects empty, duplicate, too-long, and unsafe category names', () => {
  const { createCustomCategory } = categorySandbox();
  assert.equal(createCustomCategory('pengeluaran', '  ').ok, false);
  assert.equal(createCustomCategory('pengeluaran', 'hunian').ok, false);
  assert.equal(createCustomCategory('pengeluaran', 'x'.repeat(41)).ok, false);
  assert.equal(createCustomCategory('pengeluaran', '__proto__').ok, false);
});

test('renaming a custom category preserves its subcategories and updates history and recurring bills', () => {
  const { state, createCustomCategory, renameCustomCategory } = categorySandbox();
  createCustomCategory('pengeluaran', 'Perawatan Rumah', 'Kebutuhan');
  state.categories.pengeluaran['Perawatan Rumah'].subs.push('Obat nyamuk');
  state.transactions.push(
    { jenis: 'pengeluaran', kategori: 'Perawatan Rumah', subKategori: 'Obat nyamuk' },
    { jenis: 'pemasukan', kategori: 'Perawatan Rumah', subKategori: 'Umum' },
  );
  state.recurring.push({ kategori: 'Perawatan Rumah', subKategori: 'Umum' });

  const result = renameCustomCategory('pengeluaran', 'Perawatan Rumah', 'Kebutuhan Rumah');

  assert.deepEqual(JSON.parse(JSON.stringify(result)), { ok: true, oldName: 'Perawatan Rumah', name: 'Kebutuhan Rumah' });
  assert.equal(state.categories.pengeluaran['Perawatan Rumah'], undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(state.categories.pengeluaran['Kebutuhan Rumah'].subs)), ['Umum', 'Obat nyamuk']);
  assert.equal(state.transactions[0].kategori, 'Kebutuhan Rumah');
  assert.equal(state.transactions[1].kategori, 'Perawatan Rumah');
  assert.equal(state.recurring[0].kategori, 'Kebutuhan Rumah');
});

test('does not allow renaming built-in categories or into an existing category name', () => {
  const { renameCustomCategory, createCustomCategory } = categorySandbox();
  assert.equal(renameCustomCategory('pengeluaran', 'Hunian', 'Rumah').ok, false);
  createCustomCategory('pengeluaran', 'Kebutuhan Rumah', 'Kebutuhan');
  assert.equal(renameCustomCategory('pengeluaran', 'Kebutuhan Rumah', 'Hunian').ok, false);
});

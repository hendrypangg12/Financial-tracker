import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const sources = await Promise.all([
  readFile(new URL('../../js/data.js', import.meta.url), 'utf8'),
  readFile(new URL('../../js/utils.js', import.meta.url), 'utf8'),
  readFile(new URL('../../js/storage.js', import.meta.url), 'utf8'),
  readFile(new URL('../../js/parser.js', import.meta.url), 'utf8'),
]);

function parserSandbox() {
  const context = vm.createContext({
    localStorage: { getItem: () => null, setItem: () => {} },
    console,
    Date,
    Intl,
  });
  vm.runInContext(`${sources.join('\n')}\nglobalThis.parserApi = { state, parseChat };`, context);
  return context.parserApi;
}

test('Baygon is suggested as household care instead of food', () => {
  const { parseChat } = parserSandbox();
  const result = parseChat('beli baigon 50rb');
  assert.equal(result.jenis, 'pengeluaran');
  assert.equal(result.kategori, 'Hunian');
  assert.equal(result.subKategori, 'Perawatan rumah');
  assert.equal(result.jumlah, 50000);
});

test('an explicitly named custom category overrides the automatic suggestion', () => {
  const { state, parseChat } = parserSandbox();
  state.categories.pengeluaran['Obat + Perawatan Rumah'] = {
    alokasi: 'Kebutuhan', subs: ['Umum'], custom: true,
  };

  const result = parseChat('beli baigon 50rb Obat + Perawatan Rumah');
  assert.equal(result.kategori, 'Obat + Perawatan Rumah');
  assert.equal(result.subKategori, 'Umum');
  assert.equal(result.alokasi, 'Kebutuhan');
});

test('an unknown expense is not silently classified as food', () => {
  const { parseChat } = parserSandbox();
  const result = parseChat('beli alat quilting 30rb');
  assert.match(result.error, /belum disimpan/i);
  assert.match(result.error, /kategori/i);
});

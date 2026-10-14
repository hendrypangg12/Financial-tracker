import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const sources = await Promise.all(['preferences', 'data', 'utils', 'storage', 'parser'].map(name =>
  readFile(new URL(`../../js/${name}.js`, import.meta.url), 'utf8')));

function sandbox(language = 'id', currency = 'IDR') {
  const context = vm.createContext({
    localStorage: { getItem: () => null, setItem: () => {} },
    navigator: { language: language === 'en' ? 'en-US' : 'id-ID' },
    console, Date, Intl,
  });
  vm.runInContext(`${sources.join('\n')}\nstate.preferences = ${JSON.stringify({ language, currency })};
    globalThis.api = { state, parseAmount, parseAmountDetails, parseMoneyInput, formatMoneyInput,
      formatRupiah, formatShort, roundMoney, parseChat, parseStruk, parseISO, toISODate, todayISO, detectDateFromChat };`, context);
  return context.api;
}

test('legacy Rupiah units, grouping, formatting, and stored category keys remain stable', () => {
  const api = sandbox();
  for (const [text, amount] of [['gaji 5jt', 5000000], ['kopi 25.000', 25000], ['kopi 25,000', 25000], ['gaji 1,5jt', 1500000], ['gaji 1m', 1000000000]]) {
    assert.equal(api.parseAmount(text), amount, text);
  }
  assert.equal(api.formatRupiah(25000), 'Rp 25.000');
  assert.equal(api.formatRupiah(-25000), '-Rp 25.000');
  const result = api.parseChat('kopi 25rb');
  assert.equal(result.jenis, 'pengeluaran');
  assert.equal(result.kategori, 'Konsumsi Makan');
  assert.equal(result.subKategori, 'Minuman/jajan');
  assert.equal(api.parseAmount('kopi 12.50'), null, 'Rupiah decimals must not become 1250');
});

test('English salary and coffee support cents while preserving internal transaction types', () => {
  const api = sandbox('en', 'USD');
  const salary = api.parseChat('salary USD 2,500.75 yesterday');
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  assert.equal(salary.jumlah, 2500.75);
  assert.equal(salary.jenis, 'pemasukan');
  assert.equal(salary.kategori, 'Gaji & Pendapatan Utama');
  assert.equal(salary.tanggal, api.toISODate(yesterday));
  const coffee = api.parseChat('coffee $12.50 today');
  assert.equal(coffee.jumlah, 12.5);
  assert.equal(coffee.jenis, 'pengeluaran');
  assert.equal(coffee.subKategori, 'Minuman/jajan');
  assert.equal(api.parseAmount('salary 1.5m'), 1500000);
  assert.match(api.formatRupiah(12.5), /USD\s*12\.50/);
  assert.match(api.formatShort(0.99), /USD\s*0\.99/, 'Compact formatting must preserve small cents');
});

test('decimal and grouping formats are validated rather than stripped', () => {
  const api = sandbox('en', 'SGD');
  for (const [input, expected] of [['12.50', 12.5], ['12,50', 12.5], ['1,234.50', 1234.5], ['1.234,50', 1234.5], ['1 234.50', 1234.5], ["1'234.50", 1234.5], ['2.5k', 2500]]) {
    assert.equal(api.parseMoneyInput(input), expected, input);
  }
  for (const input of ['1.2.3', '1,23,4', '12.3456', '1.2,3', '12 50', '-12.50', '12.50 extra']) {
    assert.equal(api.parseMoneyInput(input), null, input);
  }
  assert.equal(api.formatMoneyInput('12.'), '12.', 'Typing a decimal separator must not erase it');
  assert.equal(api.parseMoneyInput(api.formatMoneyInput('1234.50')), 1234.5);
});

test('zero and three-decimal currencies enforce their own precision', () => {
  const jpy = sandbox('en', 'JPY');
  assert.equal(jpy.parseMoneyInput('1234'), 1234);
  assert.equal(jpy.parseMoneyInput('12.50'), null);
  assert.match(jpy.formatRupiah(1234), /JPY\s*1,234$/);
  const kwd = sandbox('en', 'KWD');
  assert.equal(kwd.parseMoneyInput('1.234'), 1.234);
  assert.equal(kwd.parseMoneyInput('1.2345'), null);
  assert.equal(kwd.parseMoneyInput(1.234), 1.234);
  assert.equal(kwd.roundMoney(0.1 + 0.2), 0.3);
  assert.match(kwd.formatRupiah(1.234), /KWD\s*1\.234$/);
  assert.equal(sandbox('id', 'KWD').parseMoneyInput(1.234), 1.234, 'Number values are not reinterpreted as locale strings');
});

test('ambiguous amounts, quantities, invalid precision, and foreign currency are never saved', () => {
  const usd = sandbox('en', 'USD');
  assert.match(usd.parseChat('coffee 12.50 and lunch 20').error, /one amount/i);
  assert.match(usd.parseChat('coffee EUR 12.50').error, /different currency/i);
  assert.match(usd.parseChat('coffee Rp 25000').error, /different currency/i);
  assert.match(usd.parseChat('coffee €12.50').error, /different currency/i);
  assert.match(usd.parseChat('coffee -12.50').error, /invalid/i);
  assert.equal(usd.parseMoneyInput('9007199254740991'), null, 'Amounts must fit safe minor-unit arithmetic');
  assert.equal(usd.parseAmount('2 coffee'), null);
  assert.equal(usd.parseAmount('2 coffee $12.50'), 12.5);
  assert.equal(usd.parseAmount('$ 2 coffee'), 2, 'A currency marker distinguishes amount from quantity');
  assert.equal(usd.parseAmount('$2 coffee'), 2);
  assert.equal(sandbox().parseAmount('2 kopi'), null);
  assert.equal(sandbox().parseAmount('kopi 25rb tanggal 13'), 25000);
  assert.match(sandbox('en', 'EUR').parseChat('coffee $12.50').error, /different currency/i);
});

test('small decimal receipts retain prices and prefer total over subtotal without treating cents as ratings', () => {
  const api = sandbox('en', 'USD');
  const receipt = api.parseStruk('Cafe\n2026-10-13 09:30\n2 Coffee 6.00\nCake 1.50\nSubtotal 7.50\nTax 0.75\nTOTAL USD 8.25', '2026-10-13');
  assert.equal(receipt.jumlah, 8.25);
  assert.equal(receipt.items.length, 2);
  assert.equal(receipt.items[1].amt, 1.5);
  assert.equal(receipt.tanggal, '2026-10-13');
  const sum = api.parseStruk('Cafe\nCoffee 0.10\nTea 0.20');
  assert.equal(sum.jumlah, 0.3);
  assert.equal(sandbox().parseStruk('Toko\nBeras 25000\nTotal Rp 25000').jumlah, 25000);
  assert.match(api.parseStruk('Cafe\nTotal EUR 8.25').error, /currency/i);
  assert.match(api.parseStruk('Cafe\nTotal 8.25\nTotal 10.25').error, /conflicting/i);
  assert.match(api.parseStruk('Cafe\nTotal 8.25', '2026-02-30').error, /date/i);
});

test('date-only inputs remain local and invalid dates do not roll into another month', () => {
  const api = sandbox('en', 'USD');
  const date = api.parseISO('2026-10-13');
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 9);
  assert.equal(date.getDate(), 13);
  assert.equal(date.getHours(), 0);
  assert.equal(api.toISODate(date), '2026-10-13');
  assert.equal(Number.isNaN(api.parseISO('2026-02-30').getTime()), true);
  assert.equal(api.parseChat('coffee 12.50 on 2026-10-13').tanggal, '2026-10-13');
  assert.equal(api.parseChat('coffee 12.50 on 13 October 2026').tanggal, '2026-10-13');
  assert.equal(api.parseChat('coffee 12.50 on October 13, 2026').tanggal, '2026-10-13');
  assert.match(api.parseChat('coffee 12.50 on 2026-02-30').error, /invalid date/i);
  assert.equal(api.parseChat('coffee 12.50 on 10/13/2026').tanggal, '2026-10-13');
  assert.equal(sandbox('id').parseChat('kopi 25rb tanggal 13/10/2026').tanggal, '2026-10-13');
});

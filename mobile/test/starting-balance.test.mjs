import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const storageSource = await readFile(new URL('../../js/storage.js', import.meta.url), 'utf8');
const dashboardSource = await readFile(new URL('../../js/dashboard.js', import.meta.url), 'utf8');
const onboardingSource = await readFile(new URL('../../js/onboarding.js', import.meta.url), 'utf8');

function createAppContext() {
  let saves = 0;
  const context = vm.createContext({
    STORAGE_KEY: 'beruang',
    DEFAULT_CATEGORIES: {},
    localStorage: { getItem: () => null, setItem: () => { saves++; }, removeItem: () => {} },
    parseISO: value => {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    },
    todayISO: () => '2026-09-28',
    console,
    Date,
    Intl,
    window: {},
  });
  vm.runInContext(storageSource, context);
  vm.runInContext(dashboardSource, context);
  vm.runInContext(onboardingSource, context);
  return { context, saveCount: () => saves };
}

test('new account must choose an opening balance, including an explicit zero', () => {
  const { context } = createAppContext();
  let opened = 0;
  context.showOnboarding = () => { opened++; };

  assert.equal(context.maybeShowOnboarding(), true);
  assert.equal(opened, 1);
  vm.runInContext("state.startingBalance = { amount: 0, date: '2026-09-28', completed: true }", context);
  assert.equal(context.maybeShowOnboarding(), false);
  assert.equal(opened, 1);
});

test('old opening-balance rows migrate once without asking existing users to repeat setup', () => {
  const { context, saveCount } = createAppContext();
  vm.runInContext(`state.transactions = [
    { id: 'history-before-setup', jenis: 'pengeluaran', jumlah: 9000, kategori: 'Makan', tanggal: '2026-08-25' },
    { id: 'old-balance-1', jenis: 'pemasukan', jumlah: 1200000, kategori: 'Saldo Awal', tanggal: '2026-09-02' },
    { id: 'expense-1', jenis: 'pengeluaran', jumlah: 30000, kategori: 'Makan', tanggal: '2026-09-03' },
    { id: 'old-balance-2', jenis: 'pemasukan', jumlah: 800000, kategori: 'Saldo Awal', tanggal: '2026-09-02' }
  ]`, context);

  assert.equal(context.migrateLegacyStartingBalance(), true);
  assert.equal(context.hasStartingBalanceSetup(), true);
  assert.equal(vm.runInContext('state.startingBalance.amount', context), 2000000);
  assert.equal(vm.runInContext('state.startingBalance.date', context), '2026-08-25');
  assert.equal(context.balanceThrough(8, 2026), 1961000);
  assert.equal(saveCount(), 1);
  assert.equal(context.migrateLegacyStartingBalance(), false);
  assert.equal(saveCount(), 1);
});

test('existing account without an opening-balance row keeps every historical monthly balance', () => {
  const { context } = createAppContext();
  vm.runInContext(`state.transactions = [
    { id: 'income', jenis: 'pemasukan', jumlah: 3000000, kategori: 'Gaji', tanggal: '2026-07-10' },
    { id: 'expense', jenis: 'pengeluaran', jumlah: 100000, kategori: 'Makan', tanggal: '2026-08-14' },
    { id: 'later-income', jenis: 'pemasukan', jumlah: 500000, kategori: 'Bonus', tanggal: '2026-09-10' }
  ]`, context);
  const months = [6, 7, 8];
  const balancesBefore = months.map(month => context.balanceThrough(month, 2026));
  let opened = 0;
  context.showOnboarding = () => { opened++; };

  assert.equal(context.maybeShowOnboarding(), false);
  assert.equal(opened, 0);
  assert.equal(vm.runInContext('state.startingBalance.amount', context), 0);
  assert.equal(vm.runInContext('state.startingBalance.date', context), '2026-07-10');
  assert.deepEqual(months.map(month => context.balanceThrough(month, 2026)), balancesBefore);
});

test('importing a legacy backup replaces an unrelated starting balance', async () => {
  const { context } = createAppContext();
  context.FileReader = class {
    readAsText(file) { this.result = file.contents; this.onload(); }
  };
  vm.runInContext("state.startingBalance = { amount: 9000000, date: '2026-09-28', completed: true }", context);
  const backup = { transactions: [
    { id: 'old-income', jenis: 'pemasukan', jumlah: 500000, kategori: 'Gaji', tanggal: '2026-07-10' },
    { id: 'old-expense', jenis: 'pengeluaran', jumlah: 100000, kategori: 'Makan', tanggal: '2026-08-10' },
  ] };

  await context.importData({ contents: JSON.stringify(backup) });
  assert.equal(vm.runInContext('state.startingBalance.amount', context), 0);
  assert.equal(vm.runInContext('state.startingBalance.date', context), '2026-07-10');
  assert.equal(context.balanceThrough(8, 2026), 400000);
});

test('opening funds affect balance but do not count as income in cashflow summaries', () => {
  const { context } = createAppContext();
  vm.runInContext(`
    state.startingBalance = { amount: 100000, date: '2026-09-10', completed: true };
    state.transactions = [
      { id: 'legacy', jenis: 'pemasukan', jumlah: 50000, kategori: 'Saldo Awal', tanggal: '2026-09-10' },
      { id: 'before', jenis: 'pengeluaran', jumlah: 5000, kategori: 'Makan', tanggal: '2026-09-09' },
      { id: 'spent', jenis: 'pengeluaran', jumlah: 10000, kategori: 'Makan', tanggal: '2026-09-12' },
      { id: 'earned', jenis: 'pemasukan', jumlah: 30000, kategori: 'Gaji', tanggal: '2026-09-15' }
    ];
  `, context);

  assert.equal(context.balanceThrough(8, 2026), 120000);
  assert.equal(context.balanceThrough(7, 2026), 0);
  assert.equal(context.getCashflowTransactionsFor(8, 2026).length, 3);
});

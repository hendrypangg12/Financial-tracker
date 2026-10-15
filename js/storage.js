function getFinancialState(walletId) {
  return typeof getWalletLedger === 'function' ? getWalletLedger(walletId) : state;
}
// Store each account separately; retain the old unscoped cache for manual recovery.
let activeStorageKey = STORAGE_KEY;
function storageKey() { return activeStorageKey; }
function selectUserStorage(uid) {
  activeStorageKey = STORAGE_KEY + ':' + uid;
  for (const key of ['transactions', 'hutangs', 'assets', 'recurring', 'goals']) state[key] = [];
  state.userName = ''; state.target = 0; state.startingBalance = null; state.wallets = []; state.walletData = {};
  state.preferences = { language: typeof getDeviceLanguage === 'function' ? getDeviceLanguage() : 'id', currency: 'IDR', currencyLocked: false };
  state.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
}
// Storage & state
const state = {
  wallets: [], walletData: {},
  transactions: [],
  hutangs: [], // hutang & piutang personal
  assets: [],  // aset/dana awal (rekening, investasi) — info kekayaan, TIDAK masuk cashflow
  recurring: [], // tagihan rutin bulanan (kost, cicilan, langganan) — buat reminder
  goals: [], // 🎯 AI Goal Planner — target nabung dengan AI plan (v1.0.2)
  userName: '', // nama panggilan user (dari onboarding) — buat sapaan
  startingBalance: null, // { amount, date, completed } — baseline kas, bukan pemasukan
  preferences: { language: typeof getDeviceLanguage === 'function' ? getDeviceLanguage() : 'id', currency: 'IDR', currencyLocked: false },
  categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
  target: 0,
  selectedMonth: new Date().getMonth(),
  selectedYear: new Date().getFullYear(),
  rekapPeriod: 'harian',
};

function loadState() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return;
    const data = JSON.parse(raw);
    // Validate before applying any amounts; an unknown currency must not become IDR.
    state.preferences = typeof normalizePreferences === 'function' ? normalizePreferences(data.preferences) : (data.preferences || { language: 'id', currency: 'IDR', currencyLocked: false });
    if (typeof validateWalletState === 'function') Object.assign(state, validateWalletState(data));
    if (data.transactions) state.transactions = data.transactions;
    if (data.hutangs) state.hutangs = data.hutangs;
    if (Array.isArray(data.assets)) state.assets = data.assets;
    if (Array.isArray(data.recurring)) state.recurring = data.recurring;
    if (Array.isArray(data.goals)) state.goals = data.goals;
    if (typeof data.userName === 'string') state.userName = data.userName;
    if (data.startingBalance && typeof data.startingBalance === 'object') state.startingBalance = data.startingBalance;
    if (data.categories) state.categories = data.categories;
    if (data.target != null) state.target = data.target;
    if (typeof lockWalletCurrencies === 'function') lockWalletCurrencies();
  } catch (e) {
    console.warn('Gagal memuat data:', e);
  }
}

function saveState() {
  try {
    if (typeof lockWalletCurrencies === 'function') lockWalletCurrencies();
    localStorage.setItem(storageKey(), JSON.stringify({
      wallets: state.wallets, walletData: state.walletData,
      transactions: state.transactions,
      hutangs: state.hutangs,
      assets: state.assets,
      recurring: state.recurring,
      goals: state.goals,
      userName: state.userName,
      startingBalance: state.startingBalance,
      preferences: state.preferences,
      categories: state.categories,
      target: state.target,
    }));
    // Sync ke cloud (debounced) kalau user login
    if (typeof pushToCloud === 'function') pushToCloud();
    // Push recurring bills ke bot (untuk notif H-3/H-0 Telegram)
    if (typeof schedulePushBillsToBot === 'function') schedulePushBillsToBot();
  } catch (e) {
    console.warn('Gagal menyimpan:', e);
  }
}

function addTransaction(t, walletId) {
  const ledger = getFinancialState(walletId);
  if (typeof validWalletAmount === 'function') {
    const currency = walletId ? getWallets().find(w => w.id === walletId)?.currency : getAccountCurrency();
    if (!currency || !validWalletAmount(t.jumlah, currency) || t.jumlah <= 0) throw new Error('Invalid transaction amount');
  }
  t.id = t.id || uid();
  ledger.transactions.push(t);
  saveState();
  if (typeof trackTxMilestones === 'function') trackTxMilestones();
}

function updateTransaction(id, patch) {
  const i = getFinancialState().transactions.findIndex(t => t.id === id);
  if (i >= 0) {
    if (patch.jumlah !== undefined && typeof validWalletAmount === 'function' && (!validWalletAmount(patch.jumlah, getAccountCurrency()) || patch.jumlah <= 0)) throw new Error('Invalid transaction amount');
    getFinancialState().transactions[i] = { ...getFinancialState().transactions[i], ...patch };
    saveState();
  }
}

function deleteTransaction(id) {
  const row = getFinancialState().transactions.find(t => t.id === id);
  getFinancialState().transactions = getFinancialState().transactions.filter(t => t.id !== id);
  // A transfer has two halves; deleting one side removes the other so balances stay consistent.
  if (row?.transferId && typeof getWallets === 'function') {
    for (const wallet of getWallets()) {
      const ledger = getWalletLedger(wallet.id);
      ledger.transactions = ledger.transactions.filter(t => t.transferId !== row.transferId);
    }
  }
  saveState();
}

function findCategoryForSub(sub, jenis) {
  const cats = state.categories[jenis] || {};
  for (const [name, info] of Object.entries(cats)) {
    if (info.subs && info.subs.includes(sub)) {
      return { kategori: name, alokasi: info.alokasi || '' };
    }
  }
  return { kategori: '', alokasi: '' };
}

function allSubs(jenis) {
  const cats = state.categories[jenis] || {};
  const result = [];
  for (const [cat, info] of Object.entries(cats)) {
    (info.subs || []).forEach(s => result.push({ sub: s, kategori: cat, alokasi: info.alokasi || '' }));
  }
  return result;
}

function normalizeCategoryName(value) {
  const name = String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
  if (!name) return { error: 'Nama kategori belum diisi.' };
  if (name.length > 40) return { error: 'Nama kategori maksimal 40 karakter.' };
  if (name in Object.prototype || name === '__proto__') return { error: 'Nama kategori itu tidak dapat digunakan.' };
  return { name };
}

function createCustomCategory(jenis, rawName, alokasi = '') {
  if (!['pengeluaran', 'pemasukan'].includes(jenis)) return { ok: false, error: 'Jenis transaksi tidak valid.' };
  const normalized = normalizeCategoryName(rawName);
  if (normalized.error) return { ok: false, error: normalized.error };
  const name = normalized.name;
  const categories = state.categories[jenis] || (state.categories[jenis] = {});
  const duplicate = Object.keys(categories).some(existing => existing.toLocaleLowerCase('id-ID') === name.toLocaleLowerCase('id-ID'));
  if (duplicate) return { ok: false, error: 'Kategori dengan nama itu sudah ada.' };
  const allowedAllocations = ['Kebutuhan', 'Keinginan', 'Investasi'];
  categories[name] = {
    ...(jenis === 'pengeluaran' ? { alokasi: allowedAllocations.includes(alokasi) ? alokasi : 'Kebutuhan' } : {}),
    subs: ['Umum'],
    custom: true,
  };
  return { ok: true, name };
}

function renameCustomCategory(jenis, oldName, rawName) {
  if (!['pengeluaran', 'pemasukan'].includes(jenis)) return { ok: false, error: 'Jenis transaksi tidak valid.' };
  const categories = state.categories[jenis] || {};
  const info = Object.prototype.hasOwnProperty.call(categories, oldName) ? categories[oldName] : null;
  if (!info || info.custom !== true) return { ok: false, error: 'Hanya kategori buatan sendiri yang dapat diubah namanya.' };
  const normalized = normalizeCategoryName(rawName);
  if (normalized.error) return { ok: false, error: normalized.error };
  const newName = normalized.name;
  const duplicate = Object.keys(categories).some(existing => existing !== oldName && existing.toLocaleLowerCase('id-ID') === newName.toLocaleLowerCase('id-ID'));
  if (duplicate) return { ok: false, error: 'Kategori dengan nama itu sudah ada.' };
  if (newName === oldName) return { ok: false, error: 'Nama kategori tidak berubah.' };

  const updatedInfo = { ...info, subs: [...(info.subs || [])] };
  delete categories[oldName];
  categories[newName] = updatedInfo;
  (state.transactions || []).forEach(transaction => {
    if (transaction.jenis === jenis && transaction.kategori === oldName) transaction.kategori = newName;
  });
  if (jenis === 'pengeluaran') {
    (state.recurring || []).forEach(item => {
      if (item.kategori === oldName) item.kategori = newName;
    });
  }
  for (const ledger of Object.values(state.walletData || {})) {
    for (const transaction of ledger.transactions || []) if (transaction.jenis === jenis && transaction.kategori === oldName) transaction.kategori = newName;
    if (jenis === 'pengeluaran') for (const item of ledger.recurring || []) if (item.kategori === oldName) item.kategori = newName;
  }
  return { ok: true, oldName, name: newName };
}

function getTransactionsFor(month, year) {
  return getFinancialState().transactions.filter(t => {
    const d = parseISO(t.tanggal);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

function isOpeningBalanceTransaction(transaction) {
  return !!transaction && (transaction.isOpeningBalance === true
    || transaction.kategori === 'Saldo Awal' || transaction.subKategori === 'Saldo Awal');
}

// "Pindah dana" moves money between wallets: it changes balances but is not income or expense.
function isTransferTransaction(transaction) {
  return !!transaction && (!!transaction.transferId || transaction.kategori === 'Pindah Dana');
}
function isCashflowTransaction(transaction) {
  return !isOpeningBalanceTransaction(transaction) && !isTransferTransaction(transaction);
}
function getCashflowTransactionsFor(month, year) {
  return getTransactionsFor(month, year).filter(isCashflowTransaction);
}

function exportData() {
  const data = {
    exportedAt: new Date().toISOString(),
    wallets: state.wallets, walletData: state.walletData,
    transactions: state.transactions,
    hutangs: state.hutangs,
    assets: state.assets,
    recurring: state.recurring,
    goals: state.goals,
    userName: state.userName,
    startingBalance: state.startingBalance,
    preferences: state.preferences,
    categories: state.categories,
    target: state.target,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financial-tracker-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        const incoming = typeof normalizePreferences === 'function' ? normalizePreferences(data.preferences) : { language: 'id', currency: 'IDR' };
        if (incoming.currency !== 'IDR') throw new Error('A legacy non-IDR backup must be migrated into its own wallet, not relabelled as Rupiah.');
        const wallets = typeof validateWalletState === 'function' ? validateWalletState(data) : { wallets: [], walletData: {} };
        Object.assign(state, wallets);
        state.preferences = { ...incoming, language: state.preferences?.language || incoming.language };
        if (Array.isArray(data.transactions)) state.transactions = data.transactions;
        if (Array.isArray(data.hutangs)) state.hutangs = data.hutangs;
        if (Array.isArray(data.assets)) state.assets = data.assets;
        if (Array.isArray(data.recurring)) state.recurring = data.recurring;
        state.goals = Array.isArray(data.goals) ? data.goals : [];
        if (typeof data.userName === 'string') state.userName = data.userName;
        // A legacy backup has no baseline. Do not retain the previous account's
        // baseline when its transactions are replaced by imported history.
        state.startingBalance = data.startingBalance && typeof data.startingBalance === 'object'
          ? data.startingBalance : null;
        if (typeof selectWallet === 'function') selectWallet('legacy');
        if (typeof migrateLegacyStartingBalance === 'function') migrateLegacyStartingBalance();
        if (data.categories) state.categories = data.categories;
        if (data.target != null) state.target = data.target;
        saveState();
        resolve();
      } catch (e) { reject(e); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function resetAll() {
  // Clearing records is not permission to relabel an account's historical currency.
  const preferences = state.preferences;
  state.wallets = []; state.walletData = {}; state.goals = [];
  state.transactions = [];
  state.hutangs = [];
  state.assets = [];
  state.recurring = [];
  state.userName = '';
  state.startingBalance = null;
  state.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  state.target = 0;
  state.preferences = preferences;
  saveState();
}

// ============================================================
// ASET / DANA AWAL (rekening, investasi) — info kekayaan, di luar cashflow bulanan
// shape: { id, jenis: 'rekening'|'investasi'|'lainnya', nama, jumlah }
// ============================================================
function addAsset(a) {
  a.id = a.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  getFinancialState().assets.push(a);
  saveState();
}
function deleteAsset(id) {
  getFinancialState().assets = getFinancialState().assets.filter(x => x.id !== id);
  saveState();
}
function assetsTotal() {
  return (getFinancialState().assets || []).reduce((s, a) => s + (Number(a.jumlah) || 0), 0);
}

// ============================================================
// TAGIHAN RUTIN (recurring) — kost, cicilan, langganan tiap bulan
// shape: { id, nama, jumlah, hariTagih (1-28), kategori, subKategori, alokasi }
// transaksi yg dicatat dari sini di-tag: recurringId + recurringMonth ('YYYY-MM')
// ============================================================
function addRecurring(r) {
  r.id = r.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  getFinancialState().recurring.push(r);
  saveState();
}
function deleteRecurring(id) {
  getFinancialState().recurring = getFinancialState().recurring.filter(x => x.id !== id);
  saveState();
}
function recurringPostedThisMonth(id, ym) {
  const m = ym || new Date().toISOString().slice(0, 7);
  return getFinancialState().transactions.some(t => t.recurringId === id && t.recurringMonth === m);
}

// ============================================================
// HUTANG & PIUTANG CRUD
// jenis: 'piutang' = orang pinjam ke saya (mereka utang ke saya)
//        'hutang'  = saya pinjam ke orang (saya utang ke mereka)
// ============================================================

function addHutang(h) {
  h.id = h.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  h.tanggalCatat = h.tanggalCatat || todayISO();
  h.lunas = h.lunas || false;
  getFinancialState().hutangs.push(h);
  saveState();
}

function updateHutang(id, patch) {
  const i = getFinancialState().hutangs.findIndex(x => x.id === id);
  if (i >= 0) {
    getFinancialState().hutangs[i] = { ...getFinancialState().hutangs[i], ...patch };
    saveState();
  }
}

function deleteHutang(id) {
  getFinancialState().hutangs = getFinancialState().hutangs.filter(x => x.id !== id);
  saveState();
}

function markHutangLunas(id) {
  updateHutang(id, { lunas: true, tanggalLunas: todayISO() });
}

function markHutangBelumLunas(id) {
  const h = getFinancialState().hutangs.find(x => x.id === id);
  if (h) {
    h.lunas = false;
    delete h.tanggalLunas;
    saveState();
  }
}

function isHutangOverdue(h) {
  if (h.lunas) return false;
  if (!h.jatuhTempo) return false;
  const due = new Date(h.jatuhTempo + 'T23:59:59');
  return Date.now() > due.getTime();
}

function hutangDaysToDue(h) {
  if (!h.jatuhTempo) return null;
  const due = new Date(h.jatuhTempo + 'T23:59:59');
  return Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

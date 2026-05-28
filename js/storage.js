// Storage & state
const state = {
  transactions: [],
  hutangs: [], // hutang & piutang personal
  assets: [],  // aset/dana awal (rekening, investasi) — info kekayaan, TIDAK masuk cashflow
  recurring: [], // tagihan rutin bulanan (kost, cicilan, langganan) — buat reminder
  userName: '', // nama panggilan user (dari onboarding) — buat sapaan
  categories: JSON.parse(JSON.stringify(DEFAULT_CATEGORIES)),
  target: 0,
  selectedMonth: new Date().getMonth(),
  selectedYear: new Date().getFullYear(),
  rekapPeriod: 'harian',
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.transactions) state.transactions = data.transactions;
    if (data.hutangs) state.hutangs = data.hutangs;
    if (Array.isArray(data.assets)) state.assets = data.assets;
    if (Array.isArray(data.recurring)) state.recurring = data.recurring;
    if (typeof data.userName === 'string') state.userName = data.userName;
    if (data.categories) state.categories = data.categories;
    if (data.target != null) state.target = data.target;
  } catch (e) {
    console.warn('Gagal memuat data:', e);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      transactions: state.transactions,
      hutangs: state.hutangs,
      assets: state.assets,
      recurring: state.recurring,
      userName: state.userName,
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

function addTransaction(t) {
  t.id = t.id || uid();
  state.transactions.push(t);
  saveState();
}

function updateTransaction(id, patch) {
  const i = state.transactions.findIndex(t => t.id === id);
  if (i >= 0) {
    state.transactions[i] = { ...state.transactions[i], ...patch };
    saveState();
  }
}

function deleteTransaction(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
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

function getTransactionsFor(month, year) {
  return state.transactions.filter(t => {
    const d = parseISO(t.tanggal);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

function exportData() {
  const data = {
    exportedAt: new Date().toISOString(),
    transactions: state.transactions,
    hutangs: state.hutangs,
    assets: state.assets,
    recurring: state.recurring,
    userName: state.userName,
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
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.transactions)) state.transactions = data.transactions;
        if (Array.isArray(data.hutangs)) state.hutangs = data.hutangs;
        if (Array.isArray(data.assets)) state.assets = data.assets;
        if (Array.isArray(data.recurring)) state.recurring = data.recurring;
        if (typeof data.userName === 'string') state.userName = data.userName;
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
  state.transactions = [];
  state.hutangs = [];
  state.assets = [];
  state.recurring = [];
  state.userName = '';
  state.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  state.target = 0;
  saveState();
}

// ============================================================
// ASET / DANA AWAL (rekening, investasi) — info kekayaan, di luar cashflow bulanan
// shape: { id, jenis: 'rekening'|'investasi'|'lainnya', nama, jumlah }
// ============================================================
function addAsset(a) {
  a.id = a.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  state.assets.push(a);
  saveState();
}
function deleteAsset(id) {
  state.assets = state.assets.filter(x => x.id !== id);
  saveState();
}
function assetsTotal() {
  return (state.assets || []).reduce((s, a) => s + (Number(a.jumlah) || 0), 0);
}

// ============================================================
// TAGIHAN RUTIN (recurring) — kost, cicilan, langganan tiap bulan
// shape: { id, nama, jumlah, hariTagih (1-28), kategori, subKategori, alokasi }
// transaksi yg dicatat dari sini di-tag: recurringId + recurringMonth ('YYYY-MM')
// ============================================================
function addRecurring(r) {
  r.id = r.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  state.recurring.push(r);
  saveState();
}
function deleteRecurring(id) {
  state.recurring = state.recurring.filter(x => x.id !== id);
  saveState();
}
function recurringPostedThisMonth(id, ym) {
  const m = ym || new Date().toISOString().slice(0, 7);
  return state.transactions.some(t => t.recurringId === id && t.recurringMonth === m);
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
  state.hutangs.push(h);
  saveState();
}

function updateHutang(id, patch) {
  const i = state.hutangs.findIndex(x => x.id === id);
  if (i >= 0) {
    state.hutangs[i] = { ...state.hutangs[i], ...patch };
    saveState();
  }
}

function deleteHutang(id) {
  state.hutangs = state.hutangs.filter(x => x.id !== id);
  saveState();
}

function markHutangLunas(id) {
  updateHutang(id, { lunas: true, tanggalLunas: todayISO() });
}

function markHutangBelumLunas(id) {
  const h = state.hutangs.find(x => x.id === id);
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

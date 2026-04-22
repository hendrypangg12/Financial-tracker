// Storage & state
const state = {
  transactions: [],
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
      categories: state.categories,
      target: state.target,
    }));
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
  state.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  state.target = 0;
  saveState();
}

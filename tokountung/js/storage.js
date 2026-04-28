// State & localStorage
const state = {
  products: [],     // [{id, sku, nama, kategori, satuan, hargaModal, hargaJual, stok, minStok}]
  sales: [],        // [{id, tanggal, nomor, items, subtotal, diskon, total, bayar, kembalian, metode, pelanggan, profit, notes}]
  restocks: [],     // [{id, tanggal, supplier, items, total, notes}]
  kategori: [...DEFAULT_KATEGORI],
  settings: { ...DEFAULT_SETTINGS },
  cart: [],         // sementara, tidak disimpan
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First time: seed sample data
      seedSampleData();
      return;
    }
    const data = JSON.parse(raw);
    if (Array.isArray(data.products)) state.products = data.products;
    if (Array.isArray(data.sales)) state.sales = data.sales;
    if (Array.isArray(data.restocks)) state.restocks = data.restocks;
    if (Array.isArray(data.kategori)) state.kategori = data.kategori;
    if (data.settings) state.settings = { ...DEFAULT_SETTINGS, ...data.settings };
  } catch (e) { console.warn('Load failed:', e); }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      products: state.products,
      sales: state.sales,
      restocks: state.restocks,
      kategori: state.kategori,
      settings: state.settings,
    }));
    // Trigger Firestore push (debounced)
    if (typeof schedulePushToFirestore === 'function') {
      schedulePushToFirestore();
    }
  } catch (e) { console.warn('Save failed:', e); }
}

function seedSampleData() {
  state.products = SAMPLE_PRODUCTS.map(p => ({ ...p, id: uid('prod') }));
  state.sales = [];
  state.restocks = [];
  state.kategori = [...DEFAULT_KATEGORI];
  state.settings = { ...DEFAULT_SETTINGS };
  saveState();
}

// CRUD Products
function addProduct(p) {
  p.id = p.id || uid('prod');
  state.products.push(p);
  saveState();
}
function updateProduct(id, patch) {
  const i = state.products.findIndex(p => p.id === id);
  if (i >= 0) { state.products[i] = { ...state.products[i], ...patch }; saveState(); }
}
function deleteProduct(id) {
  state.products = state.products.filter(p => p.id !== id);
  saveState();
}
function getProduct(id) { return state.products.find(p => p.id === id); }

// CRUD Sales
function addSale(sale) {
  sale.id = sale.id || uid('sale');
  state.sales.push(sale);
  // Reduce stock
  for (const it of sale.items) {
    const p = getProduct(it.productId);
    if (p) p.stok = Math.max(0, p.stok - it.qty);
  }
  saveState();
}
function deleteSale(id) {
  const sale = state.sales.find(s => s.id === id);
  if (!sale) return;
  // Restore stock
  for (const it of sale.items) {
    const p = getProduct(it.productId);
    if (p) p.stok += it.qty;
  }
  state.sales = state.sales.filter(s => s.id !== id);
  saveState();
}

// CRUD Restock
function addRestock(restock) {
  restock.id = restock.id || uid('restock');
  state.restocks.push(restock);
  // Add stock + update HPP (weighted average)
  for (const it of restock.items) {
    const p = getProduct(it.productId);
    if (p) {
      const totalNilaiLama = p.stok * p.hargaModal;
      const totalNilaiBaru = it.qty * it.hargaModal;
      const totalQty = p.stok + it.qty;
      p.hargaModal = totalQty > 0 ? Math.round((totalNilaiLama + totalNilaiBaru) / totalQty) : it.hargaModal;
      p.stok = totalQty;
    }
  }
  saveState();
}
function deleteRestock(id) {
  const r = state.restocks.find(x => x.id === id);
  if (!r) return;
  for (const it of r.items) {
    const p = getProduct(it.productId);
    if (p) p.stok = Math.max(0, p.stok - it.qty);
  }
  state.restocks = state.restocks.filter(x => x.id !== id);
  saveState();
}

// Kategori
function addKategori(nama) {
  if (!state.kategori.includes(nama)) {
    state.kategori.push(nama);
    saveState();
  }
}
function deleteKategori(nama) {
  state.kategori = state.kategori.filter(k => k !== nama);
  saveState();
}

// Export/Import
function exportData() {
  const blob = new Blob([JSON.stringify({
    exportedAt: new Date().toISOString(),
    ...state, cart: undefined,
  }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tokountung-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.products)) state.products = data.products;
        if (Array.isArray(data.sales)) state.sales = data.sales;
        if (Array.isArray(data.restocks)) state.restocks = data.restocks;
        if (Array.isArray(data.kategori)) state.kategori = data.kategori;
        if (data.settings) state.settings = { ...DEFAULT_SETTINGS, ...data.settings };
        saveState();
        resolve();
      } catch (e) { reject(e); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

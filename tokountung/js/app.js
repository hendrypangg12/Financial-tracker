// Init & navigation
function init() {
  loadState();
  setupTabs();
  setupProductForm();
  setupCheckoutForm();
  setupRestockForm();
  setupSettingsForms();
  if (typeof setupCloudSyncForm === 'function') setupCloudSyncForm();

  // Event handlers global
  document.getElementById('btn-add-product').onclick = () => openProductModal(null);
  document.getElementById('stok-search').addEventListener('input', renderStok);
  document.getElementById('stok-filter-kat').addEventListener('change', renderStok);

  document.getElementById('pos-search').addEventListener('input', renderPOSProducts);
  document.getElementById('cart-diskon').addEventListener('input', renderCart);
  document.getElementById('btn-clear-cart').onclick = () => {
    if (state.cart.length && !confirm('Kosongkan keranjang?')) return;
    clearCart();
  };
  document.getElementById('btn-checkout').onclick = openCheckoutModal;

  document.getElementById('laporan-periode').addEventListener('change', renderLaporan);

  document.getElementById('btn-export').onclick = exportData;
  document.getElementById('btn-import').onclick = () => document.getElementById('file-import').click();
  document.getElementById('file-import').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { await importData(f); renderAll(); showToast('Data berhasil diimpor', 'success'); }
    catch (err) { showToast('Gagal impor: ' + (err.message || 'file invalid'), 'error'); }
    e.target.value = '';
  };

  renderAll();
}

function setupTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      // Re-render tab when switched (data may have changed)
      const t = btn.dataset.tab;
      if (t === 'dashboard') renderDashboard();
      if (t === 'stok') renderStok();
      if (t === 'jual') { renderPOSProducts(); renderCart(); }
      if (t === 'restock') renderRestock();
      if (t === 'laporan') renderLaporan();
      if (t === 'pengaturan') renderPengaturan();
    };
  });
}

function setupSettingsForms() {
  // Form Toko
  const formToko = document.getElementById('form-toko');
  formToko.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(formToko);
    state.settings = {
      ...state.settings,
      namaToko: fd.get('namaToko'),
      alamat: fd.get('alamat'),
      telepon: fd.get('telepon'),
      footerStruk: fd.get('footerStruk'),
    };
    saveState();
    showToast('Info toko disimpan', 'success');
  };
  // Form BEP
  const formBep = document.getElementById('form-bep');
  formBep.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(formBep);
    state.settings = {
      ...state.settings,
      biayaTetap: +fd.get('biayaTetap') || 0,
      targetUntung: +fd.get('targetUntung') || 0,
    };
    saveState();
    renderDashboard();
    showToast('Target & BEP disimpan', 'success');
  };
  // Form Kategori
  document.getElementById('form-add-kat').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const nama = (fd.get('nama') || '').trim();
    if (!nama) return;
    addKategori(nama);
    e.target.reset();
    renderPengaturan();
    showToast('Kategori ditambahkan', 'success');
  };
}

function renderPengaturan() {
  // Pre-fill form Toko
  const ft = document.getElementById('form-toko');
  ft.querySelector('[name="namaToko"]').value = state.settings.namaToko || '';
  ft.querySelector('[name="alamat"]').value = state.settings.alamat || '';
  ft.querySelector('[name="telepon"]').value = state.settings.telepon || '';
  ft.querySelector('[name="footerStruk"]').value = state.settings.footerStruk || '';
  // Pre-fill form BEP
  const fb = document.getElementById('form-bep');
  fb.querySelector('[name="biayaTetap"]').value = state.settings.biayaTetap || 0;
  fb.querySelector('[name="targetUntung"]').value = state.settings.targetUntung || 0;
  // Render kategori list
  const kl = document.getElementById('kategori-list');
  kl.innerHTML = state.kategori.map(k => `
    <span class="kat-pill">${escapeHtml(k)} <button data-del-kat="${escapeHtml(k)}" title="Hapus">×</button></span>
  `).join('');
  kl.querySelectorAll('[data-del-kat]').forEach(b => b.onclick = () => {
    if (confirm(`Hapus kategori "${b.dataset.delKat}"?`)) {
      deleteKategori(b.dataset.delKat);
      renderPengaturan();
    }
  });
}

function renderAll() {
  renderDashboard();
  renderStok();
  renderPOSProducts();
  renderCart();
  renderRestock();
  renderLaporan();
  renderPengaturan();
}

document.addEventListener('DOMContentLoaded', init);

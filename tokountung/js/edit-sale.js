// Module: Edit Sale / Invoice — koreksi data setelah transaksi tersimpan

let editingSaleSnapshot = null; // copy items lama untuk hitung delta stok

function openEditSale(saleId) {
  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) { showToast('Invoice tidak ditemukan', 'error'); return; }

  editingSaleSnapshot = JSON.parse(JSON.stringify(sale.items || []));

  const form = document.getElementById('form-edit-sale');
  form.reset();
  form.querySelector('[name="id"]').value = sale.id;
  form.querySelector('[name="nomor"]').value = sale.nomor || '';
  form.querySelector('[name="tanggal"]').value = sale.tanggal || todayISO();
  form.querySelector('[name="pelanggan"]').value = sale.pelanggan || '';
  form.querySelector('[name="pelangganAlamat"]').value = sale.pelangganAlamat || '';
  form.querySelector('[name="pelangganTelepon"]').value = sale.pelangganTelepon || '';
  form.querySelector('[name="metode"]').value = sale.metode || 'tunai';
  form.querySelector('[name="jatuhTempo"]').value = sale.jatuhTempo || '';
  form.querySelector('[name="diskon"]').value = sale.diskon || 0;

  // Toggle jatuh tempo
  toggleEditTempo(form.querySelector('[name="metode"]').value === 'tempo');

  // Render items editable
  renderEditItems(sale.items || []);
  recomputeEditTotal();

  // Refresh datalist
  if (typeof refreshCustomerDatalist === 'function') {
    refreshCustomerDatalist('edit-pelanggan-list');
  }

  openModal('modal-edit-sale');
}

function toggleEditTempo(isTempo) {
  const lbl = document.getElementById('edit-label-jatuh-tempo');
  if (lbl) lbl.hidden = !isTempo;
  if (isTempo) {
    const inp = lbl?.querySelector('input');
    if (inp && !inp.value) {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      inp.value = d.toISOString().slice(0, 10);
    }
  }
}

function renderEditItems(items) {
  const container = document.getElementById('edit-items-list');
  if (!container) return;
  container.innerHTML = items.map((it, i) => `
    <div class="edit-item-row" data-i="${i}">
      <div class="ei-nama">
        <b>${escapeHtml(it.nama)}</b>
        <div class="cell-meta">${escapeHtml(it.satuan || 'pcs')}</div>
      </div>
      <label class="ei-field">
        <span>Qty</span>
        <input type="number" min="0" step="1" name="qty" value="${it.qty}" data-i="${i}" />
      </label>
      <label class="ei-field">
        <span>Harga Jual</span>
        <input type="number" min="0" step="any" name="hargaJual" value="${it.hargaJual}" data-i="${i}" />
      </label>
      <div class="ei-subtotal" data-sub-i="${i}">${formatRupiah(it.qty * it.hargaJual)}</div>
      <button type="button" class="btn btn-small btn-danger" data-rm-i="${i}" title="Hapus item">×</button>
    </div>
  `).join('');

  // Bind change
  container.querySelectorAll('input').forEach(inp => {
    inp.oninput = () => {
      const i = +inp.dataset.i;
      const row = container.querySelector(`[data-i="${i}"]`);
      const qty = +row.querySelector('[name="qty"]').value || 0;
      const harga = +row.querySelector('[name="hargaJual"]').value || 0;
      const subEl = container.querySelector(`[data-sub-i="${i}"]`);
      if (subEl) subEl.textContent = formatRupiah(qty * harga);
      recomputeEditTotal();
    };
  });
  container.querySelectorAll('[data-rm-i]').forEach(btn => btn.onclick = () => {
    if (!confirm('Hapus item ini dari invoice?')) return;
    btn.closest('.edit-item-row').remove();
    recomputeEditTotal();
  });
}

function readEditItems() {
  const container = document.getElementById('edit-items-list');
  if (!container) return [];
  const original = editingSaleSnapshot || [];
  const rows = container.querySelectorAll('.edit-item-row');
  const items = [];
  rows.forEach(row => {
    const i = +row.dataset.i;
    const orig = original[i];
    if (!orig) return;
    const qty = +row.querySelector('[name="qty"]').value || 0;
    const harga = +row.querySelector('[name="hargaJual"]').value || 0;
    if (qty <= 0) return; // skip 0-qty (treat as removed)
    items.push({
      productId: orig.productId,
      nama: orig.nama,
      qty,
      hargaJual: harga,
      hargaModal: orig.hargaModal,
      satuan: orig.satuan,
    });
  });
  return items;
}

function recomputeEditTotal() {
  const items = readEditItems();
  const subtotal = items.reduce((s, it) => s + (it.qty * it.hargaJual), 0);
  const diskon = +document.querySelector('#form-edit-sale [name="diskon"]').value || 0;
  const total = Math.max(0, subtotal - diskon);
  document.getElementById('edit-subtotal').textContent = formatRupiah(subtotal);
  document.getElementById('edit-total').textContent = formatRupiah(total);
}

function adjustStockForEdit(oldItems, newItems) {
  // Hitung delta per productId: oldQty - newQty (positif = balikkan ke stok)
  const map = new Map();
  for (const it of (oldItems || [])) {
    map.set(it.productId, (map.get(it.productId) || 0) + it.qty);
  }
  for (const it of (newItems || [])) {
    map.set(it.productId, (map.get(it.productId) || 0) - it.qty);
  }
  for (const [pid, delta] of map.entries()) {
    if (delta === 0) continue;
    const p = getProduct(pid);
    if (p) p.stok = Math.max(0, p.stok + delta);
  }
}

function setupEditSaleForm() {
  const form = document.getElementById('form-edit-sale');
  if (!form) return;

  const metodeSel = form.querySelector('[name="metode"]');
  if (metodeSel) metodeSel.onchange = () => toggleEditTempo(metodeSel.value === 'tempo');

  const diskonInp = form.querySelector('[name="diskon"]');
  if (diskonInp) diskonInp.oninput = recomputeEditTotal;

  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const id = fd.get('id');
    const sale = state.sales.find(s => s.id === id);
    if (!sale) { showToast('Invoice tidak ditemukan', 'error'); return; }

    const newItems = readEditItems();
    if (!newItems.length) { showToast('Item tidak boleh kosong', 'error'); return; }

    const isTempo = fd.get('metode') === 'tempo';
    if (isTempo && !fd.get('jatuhTempo')) { showToast('Pilih tanggal jatuh tempo dulu!', 'error'); return; }

    const subtotal = newItems.reduce((s, it) => s + it.qty * it.hargaJual, 0);
    const diskon = +fd.get('diskon') || 0;
    const total = Math.max(0, subtotal - diskon);
    const profit = newItems.reduce((s, it) => s + (it.hargaJual - (it.hargaModal || 0)) * it.qty, 0) - diskon;

    // Adjust stock berdasarkan delta items lama vs baru
    adjustStockForEdit(editingSaleSnapshot, newItems);

    // Update sale
    sale.tanggal = fd.get('tanggal') || sale.tanggal;
    sale.nomor = fd.get('nomor') || sale.nomor;
    sale.pelanggan = (fd.get('pelanggan') || '').trim() || 'Anonim';
    sale.pelangganAlamat = (fd.get('pelangganAlamat') || '').trim();
    sale.pelangganTelepon = (fd.get('pelangganTelepon') || '').trim();
    sale.metode = fd.get('metode');
    sale.jatuhTempo = isTempo ? fd.get('jatuhTempo') : '';
    sale.items = newItems;
    sale.subtotal = subtotal;
    sale.diskon = diskon;
    sale.total = total;
    sale.profit = profit;

    // Adjust pembayaran
    if (isTempo && !sale.lunas) {
      sale.bayar = 0;
      sale.kembalian = 0;
    } else {
      sale.bayar = total;
      sale.kembalian = 0;
    }

    saveState();
    editingSaleSnapshot = null;
    showToast(`✓ Invoice ${sale.nomor} diperbarui`, 'success');
    closeModal('modal-edit-sale');
    renderAll();
  };

  const btnDel = document.getElementById('btn-delete-sale');
  if (btnDel) btnDel.onclick = () => {
    const fd = new FormData(form);
    const id = fd.get('id');
    const sale = state.sales.find(s => s.id === id);
    if (!sale) return;
    if (!confirm(`⚠️ HAPUS invoice ${sale.nomor}?\n\nStok akan dikembalikan. Aksi ini tidak bisa di-undo.`)) return;
    deleteSale(id);
    showToast(`🗑️ Invoice ${sale.nomor} dihapus`, 'info');
    closeModal('modal-edit-sale');
    renderAll();
  };
}

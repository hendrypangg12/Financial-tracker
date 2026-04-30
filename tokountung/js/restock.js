// Module: PO Supplier (replace lama "Restock")
// Fitur: input PO, items dari stok atau item baru (auto-create produk),
//        metode bayar tunai/transfer/tempo, jatuh tempo, status hutang.

function isPOOverdue(po) {
  if (po.lunas) return false;
  if (po.metode !== 'tempo') return false;
  if (!po.jatuhTempo) return false;
  const due = new Date(po.jatuhTempo + 'T23:59:59');
  return Date.now() > due.getTime();
}

function poDaysToDue(po) {
  if (!po.jatuhTempo) return null;
  const due = new Date(po.jatuhTempo + 'T23:59:59');
  return Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function renderRestock() {
  const list = [...(state.restocks || [])].sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

  // Summary
  const belum = list.filter(r => r.metode === 'tempo' && !r.lunas);
  const overdue = belum.filter(r => isPOOverdue(r));
  const totalNilaiPO = list.reduce((s, r) => s + (r.total || 0), 0);
  const totalHutang = belum.reduce((s, r) => s + (r.total || 0), 0);
  const totalOverdue = overdue.reduce((s, r) => s + (r.total || 0), 0);

  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('po-total-count', list.length);
  setText('po-total-value', formatRupiah(totalNilaiPO));
  setText('po-hutang-value', formatRupiah(totalHutang));
  setText('po-hutang-count', `${belum.length} PO belum lunas`);
  setText('po-overdue-value', formatRupiah(totalOverdue));
  setText('po-overdue-count', `${overdue.length} PO overdue`);

  const tbody = document.getElementById('restock-body');
  const empty = document.getElementById('restock-empty');
  if (!list.length) {
    tbody.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  tbody.innerHTML = list.map(r => {
    const isTempo = r.metode === 'tempo';
    let statusBadge;
    if (!isTempo || r.lunas) {
      statusBadge = `<span class="badge badge-success">✓ Lunas</span>`;
    } else if (isPOOverdue(r)) {
      const days = poDaysToDue(r);
      statusBadge = `<span class="badge badge-danger">⚠️ Lewat ${Math.abs(days)} hari</span>`;
    } else {
      const days = poDaysToDue(r);
      const txt = days !== null && days <= 3 ? `⏱️ ${days} hari lagi` : `⏱️ Tempo`;
      statusBadge = `<span class="badge badge-warn">${txt}</span>`;
    }

    return `
      <tr ${isPOOverdue(r) ? 'class="row-overdue"' : ''}>
        <td><b>${escapeHtml(r.nomorPO || '-')}</b></td>
        <td>${formatTanggal(r.tanggal)}</td>
        <td>${escapeHtml(r.supplier || '-')}</td>
        <td>${(r.items || []).length} item${(r.items || []).length > 1 ? 's' : ''}</td>
        <td class="num"><b>${formatRupiah(r.total || 0)}</b></td>
        <td>${statusBadge}</td>
        <td>${isTempo && r.jatuhTempo ? formatTanggal(r.jatuhTempo) : '-'}</td>
        <td>
          <div class="row-actions">
            ${isTempo && !r.lunas
              ? `<button class="btn btn-small btn-success" data-act="paid" data-id="${r.id}">✓ Lunas</button>`
              : (r.lunas ? `<button class="btn btn-small btn-ghost" data-act="unpaid" data-id="${r.id}">↩️</button>` : '')}
            <button class="btn btn-small btn-danger" data-act="del" data-id="${r.id}">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-act]').forEach(btn => btn.onclick = () => {
    const id = btn.dataset.id;
    const po = state.restocks.find(r => r.id === id);
    if (!po) return;
    const act = btn.dataset.act;
    if (act === 'paid') {
      if (!confirm(`Tandai PO ${po.nomorPO || po.supplier} (${formatRupiah(po.total)}) sebagai LUNAS?`)) return;
      po.lunas = true;
      po.tanggalLunas = todayISO();
      saveState();
      renderRestock();
      renderDashboard();
      showToast('✓ PO ditandai lunas', 'success');
    } else if (act === 'unpaid') {
      po.lunas = false;
      delete po.tanggalLunas;
      saveState();
      renderRestock();
      showToast('↩️ Status dikembalikan', 'info');
    } else if (act === 'del') {
      if (!confirm('Hapus PO ini?\n\n⚠️ Stok akan dikurangi sesuai jumlah PO. Tidak bisa di-undo.')) return;
      deleteRestock(id);
      renderRestock();
      renderStok();
      renderDashboard();
      showToast('🗑️ PO dihapus', 'info');
    }
  });
}

function refreshSupplierDatalist() {
  const dl = document.getElementById('po-supplier-list');
  if (!dl) return;
  const suppliers = new Set();
  for (const r of (state.restocks || [])) {
    if (r.supplier) suppliers.add(r.supplier);
  }
  dl.innerHTML = [...suppliers].sort().map(s => `<option value="${escapeHtml(s)}"></option>`).join('');
}

function openRestockModal() {
  const form = document.getElementById('form-restock');
  form.reset();
  form.querySelector('[name="id"]').value = '';
  form.querySelector('[name="tanggal"]').value = todayISO();
  form.querySelector('[name="metode"]').value = 'tunai';
  document.getElementById('restock-items').innerHTML = '';
  addRestockItemRow();
  updateRestockTotal();
  togglePOTempo(false);
  refreshSupplierDatalist();
  openModal('modal-restock');
}

function togglePOTempo(isTempo) {
  const lbl = document.getElementById('po-label-jatuh-tempo');
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

// Item dari stok existing
function addRestockItemRow() {
  const container = document.getElementById('restock-items');
  const row = document.createElement('div');
  row.className = 'po-item-row po-item-existing';
  row.innerHTML = `
    <div class="poi-type"><span class="poi-tag poi-tag-existing">📦 STOK</span></div>
    <label class="poi-field poi-field-product">
      <span>Pilih Barang</span>
      <select class="r-product" required>
        <option value="">— Pilih —</option>
        ${state.products.map(p => `<option value="${p.id}">${escapeHtml(p.nama)} (sisa: ${p.stok} ${escapeHtml(p.satuan || 'pcs')})</option>`).join('')}
      </select>
    </label>
    <label class="poi-field">
      <span>Qty</span>
      <input type="number" class="r-qty" min="1" required placeholder="0" />
    </label>
    <label class="poi-field">
      <span>H. Modal / unit</span>
      <input type="number" class="r-modal" min="0" required placeholder="0" />
    </label>
    <div class="poi-subtotal">
      <span>Subtotal</span>
      <b class="r-subtotal">Rp 0</b>
    </div>
    <button type="button" class="btn btn-small btn-danger r-rm" title="Hapus baris">×</button>
  `;
  container.appendChild(row);
  row.querySelector('.r-product').addEventListener('change', (e) => {
    const p = getProduct(e.target.value);
    if (p) row.querySelector('.r-modal').value = p.hargaModal;
    updateRestockTotal();
  });
  row.querySelector('.r-qty').addEventListener('input', updateRestockTotal);
  row.querySelector('.r-modal').addEventListener('input', updateRestockTotal);
  row.querySelector('.r-rm').onclick = () => { row.remove(); updateRestockTotal(); };
  return row;
}

// Item BARU — auto-create produk baru
function addNewProductRow() {
  const container = document.getElementById('restock-items');
  const row = document.createElement('div');
  row.className = 'po-item-row po-item-new';
  row.innerHTML = `
    <div class="poi-type"><span class="poi-tag poi-tag-new">✨ BARU</span></div>
    <div class="poi-new-grid">
      <label class="poi-field"><span>Nama Produk</span><input class="np-nama" required placeholder="Contoh: Indomie Goreng" /></label>
      <label class="poi-field"><span>SKU</span><input class="np-sku" placeholder="Optional" /></label>
      <label class="poi-field">
        <span>Kategori</span>
        <select class="np-kategori">
          <option value="">— Pilih —</option>
          ${(state.kategori || []).map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('')}
        </select>
      </label>
      <label class="poi-field"><span>Satuan</span><input class="np-satuan" placeholder="pcs / dus / karton" value="pcs" required /></label>
      <label class="poi-field"><span>Qty Beli</span><input type="number" class="r-qty np-qty" min="1" required placeholder="0" /></label>
      <label class="poi-field"><span>H. Modal / unit</span><input type="number" class="r-modal np-modal" min="0" required placeholder="0" /></label>
      <label class="poi-field"><span>H. Jual / unit</span><input type="number" class="np-jual" min="0" required placeholder="0" /></label>
      <label class="poi-field"><span>Min Stok</span><input type="number" class="np-min" min="0" placeholder="5" value="5" /></label>
    </div>
    <div class="poi-subtotal">
      <span>Subtotal</span>
      <b class="r-subtotal">Rp 0</b>
    </div>
    <button type="button" class="btn btn-small btn-danger r-rm" title="Hapus baris">×</button>
  `;
  container.appendChild(row);
  row.querySelector('.np-qty').addEventListener('input', updateRestockTotal);
  row.querySelector('.np-modal').addEventListener('input', updateRestockTotal);
  row.querySelector('.r-rm').onclick = () => { row.remove(); updateRestockTotal(); };
  return row;
}

function updateRestockTotal() {
  let total = 0;
  document.querySelectorAll('.po-item-row').forEach(row => {
    const qty = +row.querySelector('.r-qty').value || 0;
    const modal = +row.querySelector('.r-modal').value || 0;
    const sub = qty * modal;
    total += sub;
    const subEl = row.querySelector('.r-subtotal');
    if (subEl) subEl.textContent = formatRupiah(sub);
  });
  const totalEl = document.getElementById('restock-total');
  if (totalEl) totalEl.textContent = formatRupiah(total);
}

function setupRestockForm() {
  document.getElementById('btn-add-restock').onclick = openRestockModal;
  document.getElementById('btn-add-restock-item').onclick = () => { addRestockItemRow(); updateRestockTotal(); };
  const btnNew = document.getElementById('btn-add-new-product-row');
  if (btnNew) btnNew.onclick = () => { addNewProductRow(); updateRestockTotal(); };

  const metode = document.getElementById('po-metode');
  if (metode) metode.onchange = () => togglePOTempo(metode.value === 'tempo');

  const form = document.getElementById('form-restock');
  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const items = [];

    // Process existing-product rows
    document.querySelectorAll('.po-item-existing').forEach(row => {
      const productId = row.querySelector('.r-product').value;
      const qty = +row.querySelector('.r-qty').value;
      const hargaModal = +row.querySelector('.r-modal').value;
      if (productId && qty > 0) items.push({ productId, qty, hargaModal });
    });

    // Process new-product rows — create product first
    let newProductsCreated = 0;
    document.querySelectorAll('.po-item-new').forEach(row => {
      const nama = (row.querySelector('.np-nama').value || '').trim();
      const qty = +row.querySelector('.np-qty').value || 0;
      const hargaModal = +row.querySelector('.np-modal').value || 0;
      const hargaJual = +row.querySelector('.np-jual').value || 0;
      if (!nama || qty <= 0) return;
      // Create new product (stok=0, akan ditambah lewat addRestock)
      const newProduct = {
        sku: (row.querySelector('.np-sku').value || '').trim(),
        nama,
        kategori: row.querySelector('.np-kategori').value || '',
        satuan: (row.querySelector('.np-satuan').value || 'pcs').trim(),
        hargaModal,
        hargaJual,
        stok: 0,
        minStok: +row.querySelector('.np-min').value || 5,
      };
      addProduct(newProduct); // assigns id, saves state
      const created = state.products[state.products.length - 1];
      items.push({ productId: created.id, qty, hargaModal });
      newProductsCreated++;
    });

    if (!items.length) { showToast('Tambah minimal 1 item', 'error'); return; }

    const metode = fd.get('metode') || 'tunai';
    const isTempo = metode === 'tempo';
    if (isTempo && !fd.get('jatuhTempo')) {
      showToast('Pilih tanggal jatuh tempo dulu!', 'error');
      return;
    }

    const total = items.reduce((s, it) => s + it.qty * it.hargaModal, 0);
    const po = {
      tanggal: fd.get('tanggal'),
      nomorPO: (fd.get('nomorPO') || '').trim(),
      supplier: (fd.get('supplier') || '').trim(),
      notes: fd.get('notes') || '',
      items,
      total,
      metode,
      jatuhTempo: isTempo ? fd.get('jatuhTempo') : '',
      lunas: !isTempo, // tunai/transfer = otomatis lunas
      tanggalLunas: !isTempo ? todayISO() : null,
    };
    addRestock(po); // existing function — adds stock + weighted-avg HPP

    const msg = newProductsCreated > 0
      ? `✅ PO tersimpan (${formatRupiah(total)}) — ${newProductsCreated} produk baru dibuat`
      : `✅ PO tersimpan (${formatRupiah(total)})`;
    showToast(msg, 'success');
    closeModal('modal-restock');
    renderRestock();
    renderStok();
    renderDashboard();
  };
}

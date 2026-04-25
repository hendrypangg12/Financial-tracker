// Module: Restock / Stock In
function renderRestock() {
  const list = [...state.restocks].sort((a,b) => b.tanggal.localeCompare(a.tanggal));
  const tbody = document.getElementById('restock-body');
  const empty = document.getElementById('restock-empty');
  if (!list.length) { tbody.innerHTML = ''; empty.hidden = false; return; }
  empty.hidden = true;
  tbody.innerHTML = list.map(r => `
    <tr>
      <td>${formatTanggal(r.tanggal)}</td>
      <td>${escapeHtml(r.supplier || '-')}</td>
      <td>${r.items.length} item${r.items.length>1?'s':''}</td>
      <td class="num"><b>${formatRupiah(r.total)}</b></td>
      <td>${escapeHtml((r.notes || '').slice(0, 30))}</td>
      <td><button class="btn btn-small btn-danger" data-del="${r.id}">🗑️</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    if (confirm('Hapus catatan restock ini? Stok akan dikurangi sesuai.')) {
      deleteRestock(b.dataset.del);
      renderRestock();
      renderStok();
      renderDashboard();
      showToast('Restock dihapus');
    }
  });
}

function openRestockModal() {
  const form = document.getElementById('form-restock');
  form.reset();
  form.querySelector('[name="tanggal"]').value = todayISO();
  document.getElementById('restock-items').innerHTML = '';
  addRestockItemRow();
  updateRestockTotal();
  openModal('modal-restock');
}

function addRestockItemRow() {
  const container = document.getElementById('restock-items');
  const row = document.createElement('div');
  row.className = 'restock-item-row';
  row.innerHTML = `
    <select class="r-product" required>
      <option value="">— Pilih Barang —</option>
      ${state.products.map(p => `<option value="${p.id}">${escapeHtml(p.nama)} (stok: ${p.stok})</option>`).join('')}
    </select>
    <input type="number" class="r-qty" placeholder="Qty" min="1" required />
    <input type="number" class="r-modal" placeholder="H. Modal" min="0" required />
    <button type="button" class="btn btn-small btn-danger r-rm">×</button>
  `;
  container.appendChild(row);
  row.querySelector('.r-product').addEventListener('change', (e) => {
    const p = getProduct(e.target.value);
    if (p) row.querySelector('.r-modal').value = p.hargaModal;
  });
  row.querySelector('.r-qty').addEventListener('input', updateRestockTotal);
  row.querySelector('.r-modal').addEventListener('input', updateRestockTotal);
  row.querySelector('.r-rm').onclick = () => { row.remove(); updateRestockTotal(); };
}

function updateRestockTotal() {
  let total = 0;
  document.querySelectorAll('.restock-item-row').forEach(row => {
    const qty = +row.querySelector('.r-qty').value || 0;
    const modal = +row.querySelector('.r-modal').value || 0;
    total += qty * modal;
  });
  document.getElementById('restock-total').textContent = formatRupiah(total);
}

function setupRestockForm() {
  document.getElementById('btn-add-restock').onclick = openRestockModal;
  document.getElementById('btn-add-restock-item').onclick = addRestockItemRow;
  const form = document.getElementById('form-restock');
  form.onsubmit = (e) => {
    e.preventDefault();
    const items = [];
    document.querySelectorAll('.restock-item-row').forEach(row => {
      const productId = row.querySelector('.r-product').value;
      const qty = +row.querySelector('.r-qty').value;
      const hargaModal = +row.querySelector('.r-modal').value;
      if (productId && qty > 0) items.push({ productId, qty, hargaModal });
    });
    if (!items.length) { showToast('Tambah minimal 1 item', 'error'); return; }
    const fd = new FormData(form);
    const restock = {
      tanggal: fd.get('tanggal'),
      supplier: fd.get('supplier') || '',
      notes: fd.get('notes') || '',
      items,
      total: items.reduce((s, it) => s + it.qty * it.hargaModal, 0),
    };
    addRestock(restock);
    showToast(`✅ Restock tersimpan (${formatRupiah(restock.total)})`, 'success');
    closeModal('modal-restock');
    renderRestock();
    renderStok();
    renderDashboard();
  };
}

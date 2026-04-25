// Module: Stok / Products
function renderStok() {
  const search = (document.getElementById('stok-search')?.value || '').toLowerCase();
  const filterKat = document.getElementById('stok-filter-kat')?.value || '';
  let list = [...state.products];
  if (filterKat) list = list.filter(p => p.kategori === filterKat);
  if (search) list = list.filter(p =>
    (p.nama || '').toLowerCase().includes(search) ||
    (p.sku || '').toLowerCase().includes(search) ||
    (p.kategori || '').toLowerCase().includes(search)
  );
  list.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));

  const tbody = document.getElementById('stok-body');
  const empty = document.getElementById('stok-empty');
  if (!list.length) {
    tbody.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  tbody.innerHTML = list.map(p => {
    const margin = calcMargin(p.hargaModal, p.hargaJual);
    const lowStock = p.stok <= (p.minStok || 5);
    const thumb = p.fotoUrl
      ? `<img class="product-thumb" src="${p.fotoUrl}" alt="" />`
      : `<div class="product-thumb product-thumb-empty">📦</div>`;
    return `
      <tr>
        <td>${thumb}</td>
        <td><code>${escapeHtml(p.sku)}</code></td>
        <td><b>${escapeHtml(p.nama)}</b></td>
        <td><span class="kat-pill">${escapeHtml(p.kategori || '-')}</span></td>
        <td class="num"><b style="color:${lowStock ? '#f59e0b' : 'inherit'}">${p.stok}</b> ${escapeHtml(p.satuan || 'pcs')}${lowStock ? ' ⚠️' : ''}</td>
        <td class="num">${formatRupiah(p.hargaModal)}</td>
        <td class="num"><b>${formatRupiah(p.hargaJual)}</b></td>
        <td class="num"><b style="color:#10b981">${margin.toFixed(0)}%</b></td>
        <td>
          <button class="btn btn-small" data-edit="${p.id}">✏️</button>
          <button class="btn btn-small btn-danger" data-del="${p.id}">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  // Bind buttons
  tbody.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openProductModal(b.dataset.edit));
  tbody.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    if (confirm('Yakin hapus barang ini?')) {
      deleteProduct(b.dataset.del);
      renderStok();
      showToast('Barang dihapus');
    }
  });

  // Update kategori filter options
  const filterEl = document.getElementById('stok-filter-kat');
  if (filterEl) {
    const cur = filterEl.value;
    filterEl.innerHTML = '<option value="">Semua kategori</option>' +
      state.kategori.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
    filterEl.value = cur;
  }
}

function openProductModal(id) {
  const form = document.getElementById('form-product');
  const title = document.getElementById('modal-product-title');
  // Fill kategori dropdown
  const katSel = form.querySelector('[name="kategori"]');
  katSel.innerHTML = state.kategori.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');

  form.reset();
  setFotoPreview('');
  if (id) {
    const p = getProduct(id);
    if (!p) return;
    title.textContent = 'Edit Barang';
    form.querySelector('[name="id"]').value = p.id;
    form.querySelector('[name="sku"]').value = p.sku;
    form.querySelector('[name="nama"]').value = p.nama;
    form.querySelector('[name="kategori"]').value = p.kategori || '';
    form.querySelector('[name="satuan"]').value = p.satuan || 'pcs';
    form.querySelector('[name="hargaModal"]').value = p.hargaModal;
    form.querySelector('[name="hargaJual"]').value = p.hargaJual;
    form.querySelector('[name="stok"]').value = p.stok;
    form.querySelector('[name="minStok"]').value = p.minStok || 5;
    setFotoPreview(p.fotoUrl || '');
  } else {
    title.textContent = 'Tambah Barang';
    form.querySelector('[name="id"]').value = '';
    form.querySelector('[name="satuan"]').value = 'pcs';
    form.querySelector('[name="stok"]').value = 0;
    form.querySelector('[name="minStok"]').value = 5;
  }
  updateMarginPreview();
  openModal('modal-product');
}

function setFotoPreview(dataUrl) {
  const form = document.getElementById('form-product');
  const img = document.getElementById('foto-preview');
  const placeholder = document.getElementById('foto-placeholder');
  const removeBtn = document.getElementById('btn-foto-remove');
  form.querySelector('[name="fotoUrl"]').value = dataUrl || '';
  if (dataUrl) {
    img.src = dataUrl;
    img.hidden = false;
    placeholder.hidden = true;
    removeBtn.hidden = false;
  } else {
    img.src = '';
    img.hidden = true;
    placeholder.hidden = false;
    removeBtn.hidden = true;
  }
}

function handleFileUpload(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('File bukan gambar'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 300;
        let w = img.width, h = img.height;
        if (w > h) {
          if (w > max) { h = h * max / w; w = max; }
        } else {
          if (h > max) { w = w * max / h; h = max; }
        }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Gambar gagal dibaca'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('File gagal dibaca'));
    reader.readAsDataURL(file);
  });
}

function updateMarginPreview() {
  const form = document.getElementById('form-product');
  const hm = +form.querySelector('[name="hargaModal"]').value || 0;
  const hj = +form.querySelector('[name="hargaJual"]').value || 0;
  const preview = document.getElementById('margin-preview');
  if (hm > 0 && hj > 0) {
    const margin = calcMargin(hm, hj);
    const markup = calcMarkup(hm, hj);
    const profit = hj - hm;
    preview.hidden = false;
    preview.innerHTML = `
      💰 Margin: <b>${margin.toFixed(1)}%</b> ·
      📈 Markup: <b>${markup.toFixed(1)}%</b> ·
      💵 Profit/unit: <b>${formatRupiah(profit)}</b>
    `;
  } else {
    preview.hidden = true;
  }
}

function setupProductForm() {
  const form = document.getElementById('form-product');
  form.querySelector('[name="hargaModal"]').addEventListener('input', updateMarginPreview);
  form.querySelector('[name="hargaJual"]').addEventListener('input', updateMarginPreview);

  // Foto upload
  const fotoInput = document.getElementById('foto-input');
  fotoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      showToast('Foto terlalu besar (max 8MB)', 'error');
      e.target.value = '';
      return;
    }
    try {
      const dataUrl = await handleFileUpload(file);
      setFotoPreview(dataUrl);
      showToast('Foto siap disimpan', 'success');
    } catch (err) {
      showToast('Gagal proses foto: ' + err.message, 'error');
    }
    e.target.value = '';
  });
  document.getElementById('btn-foto-remove').onclick = () => setFotoPreview('');

  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    data.hargaModal = +data.hargaModal;
    data.hargaJual = +data.hargaJual;
    data.stok = +data.stok;
    data.minStok = +data.minStok;
    if (data.id) {
      updateProduct(data.id, data);
      showToast('Barang diperbarui', 'success');
    } else {
      delete data.id;
      addProduct(data);
      showToast('Barang ditambahkan', 'success');
    }
    closeModal('modal-product');
    renderStok();
    renderPOSProducts();
    renderDashboard();
  };
}

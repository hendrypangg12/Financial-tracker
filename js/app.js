// Bootstrap & event handlers
function init() {
  loadState();
  fillMonthYearSelectors();
  fillSubCategoriSelects();
  fillTrxFilters();
  attachEvents();
  renderAll();

  // Default tanggal struk & form = hari ini
  const sd = document.getElementById('struk-date');
  if (sd) sd.value = todayISO();
  const ft = document.querySelector('#form-transaksi input[name="tanggal"]');
  if (ft) ft.value = todayISO();
}

function renderAll() {
  renderDashboard();
  renderTransaksi();
  renderRekap();
  renderKategori();
}

function fillMonthYearSelectors() {
  const monthSel = document.getElementById('dash-month');
  const yearSel = document.getElementById('dash-year');
  monthSel.innerHTML = MONTHS.map((m, i) => `<option value="${i}">${m}</option>`).join('');
  const thisYear = new Date().getFullYear();
  const years = [];
  for (let y = thisYear - 5; y <= thisYear + 1; y++) years.push(y);
  yearSel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
  monthSel.value = state.selectedMonth;
  yearSel.value = state.selectedYear;
}

function fillTrxFilters() {
  const m = document.getElementById('trx-filter-month');
  const y = document.getElementById('trx-filter-year');
  m.innerHTML = `<option value="all">Semua bulan</option>` + MONTHS.map((mm, i) => `<option value="${i}">${mm}</option>`).join('');
  const thisYear = new Date().getFullYear();
  const years = [];
  for (let yy = thisYear - 5; yy <= thisYear + 1; yy++) years.push(yy);
  y.innerHTML = `<option value="all">Semua tahun</option>` + years.map(yy => `<option value="${yy}">${yy}</option>`).join('');
  m.value = state.selectedMonth;
  y.value = state.selectedYear;
}

function attachEvents() {
  // Tabs
  document.querySelectorAll('.tab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      // re-render the tab in case data changed
      if (btn.dataset.tab === 'dashboard') renderDashboard();
      if (btn.dataset.tab === 'transaksi') renderTransaksi();
      if (btn.dataset.tab === 'rekap') renderRekap();
      if (btn.dataset.tab === 'kategori') renderKategori();
    };
  });

  // Dashboard filter
  document.getElementById('dash-month').onchange = e => { state.selectedMonth = +e.target.value; renderDashboard(); renderRekap(); };
  document.getElementById('dash-year').onchange = e => { state.selectedYear = +e.target.value; renderDashboard(); renderRekap(); };

  // Target
  document.getElementById('btn-save-target').onclick = () => {
    const v = +document.getElementById('input-target').value || 0;
    state.target = v; saveState(); renderDashboard();
    showToast('Target disimpan', 'success');
  };

  // Form tambah
  const form = document.getElementById('form-transaksi');
  form.querySelector('[name="jenis"]').onchange = () => fillSubCategoriSelects();
  form.querySelector('[name="subKategori"]').onchange = () => syncKategoriFromSub('#form-transaksi');
  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const t = Object.fromEntries(fd.entries());
    t.jumlah = +t.jumlah;
    if (!t.jumlah || t.jumlah <= 0) { showToast('Jumlah harus > 0', 'error'); return; }
    const info = findCategoryForSub(t.subKategori, t.jenis);
    t.kategori = info.kategori;
    if (!t.alokasi && info.alokasi) t.alokasi = info.alokasi;
    addTransaction(t);
    showToast('Transaksi ditambahkan', 'success');
    form.reset();
    form.querySelector('[name="tanggal"]').value = todayISO();
    fillSubCategoriSelects();
    renderAll();
  };

  // Chat
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatBox = document.getElementById('chat-box');
  chatForm.onsubmit = (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    appendChat('user', text);
    chatInput.value = '';
    const res = parseChat(text);
    if (!res || res.error) {
      appendChat('bot', `❌ ${res && res.error ? res.error : 'Gagal memproses.'}`);
      return;
    }
    addTransaction(res);
    appendChat('bot', `✅ Dicatat: <b>${res.jenis}</b> ${formatRupiah(res.jumlah)}<br>${escapeHtml(res.deskripsi)} · ${escapeHtml(res.subKategori)} (${escapeHtml(res.kategori)})${res.alokasi ? ' · ' + escapeHtml(res.alokasi) : ''} · ${formatTanggal(res.tanggal)}`);
    renderAll();
  };
  function appendChat(role, html) {
    const msg = document.createElement('div');
    msg.className = 'chat-msg ' + role;
    msg.innerHTML = html;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // OCR foto struk (pakai Tesseract.js, lazy-load dari CDN)
  const photoPreview = document.getElementById('struk-photo-preview');
  const ocrProgress = document.getElementById('struk-ocr-progress');
  const cameraInput = document.getElementById('struk-photo-camera');
  const galleryInput = document.getElementById('struk-photo-gallery');
  async function handlePhotoOCR(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    photoPreview.src = URL.createObjectURL(file);
    photoPreview.style.display = 'block';
    setOcrStatus('loading', 'Memuat mesin OCR (sekali saja, ~3 MB)…', 5);
    try {
      const Tesseract = await loadTesseract();
      setOcrStatus('loading', 'Memuat data bahasa Indonesia…', 15);
      const { data } = await Tesseract.recognize(file, 'ind+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrStatus('loading', `Membaca teks dari gambar… ${Math.round(m.progress * 100)}%`, 20 + m.progress * 78);
          } else if (m.status) {
            setOcrStatus('loading', `${m.status}…`, 15);
          }
        },
      });
      const text = (data && data.text) ? data.text.trim() : '';
      if (!text) {
        setOcrStatus('err', 'Tidak berhasil membaca teks. Coba foto yang lebih terang / lurus.', 100);
        return;
      }
      document.getElementById('struk-text').value = text;
      setOcrStatus('ok', '✅ Teks terbaca! Cek / edit lalu klik "Parse Struk".', 100);
    } catch (err) {
      setOcrStatus('err', '❌ Gagal OCR: ' + (err && err.message ? err.message : 'coba lagi'), 100);
    } finally {
      // Reset supaya user bisa pilih file yang sama lagi
      e.target.value = '';
    }
  }
  if (cameraInput) cameraInput.addEventListener('change', handlePhotoOCR);
  if (galleryInput) galleryInput.addEventListener('change', handlePhotoOCR);

  function setOcrStatus(type, msg, pct) {
    ocrProgress.hidden = false;
    ocrProgress.className = 'ocr-progress' + (type === 'ok' ? ' ok' : type === 'err' ? ' err' : '');
    ocrProgress.innerHTML = msg + (type === 'loading' ? `<span class="ocr-bar"><span style="width:${pct}%"></span></span>` : '');
    if (type === 'ok' || type === 'err') {
      setTimeout(() => { ocrProgress.hidden = true; }, type === 'ok' ? 5000 : 8000);
    }
  }

  // Struk
  const strukBtn = document.getElementById('btn-parse-struk');
  const strukPreview = document.getElementById('struk-preview');
  strukBtn.onclick = () => {
    const text = document.getElementById('struk-text').value;
    const date = document.getElementById('struk-date').value || todayISO();
    const res = parseStruk(text, date);
    if (res.error) { renderManualFallback(text, date, res.error); return; }
    strukPreview.innerHTML = `
      <div style="margin-bottom:8px"><b>${escapeHtml(res.deskripsi)}</b> · ${formatTanggal(res.tanggal)}</div>
      <table>
        <thead><tr><th>Item</th><th style="text-align:right">Jumlah</th></tr></thead>
        <tbody>${(res.items || []).map(i => `<tr><td>${escapeHtml(i.name)}</td><td style="text-align:right">${formatRupiah(i.amt)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td><b>TOTAL</b></td><td style="text-align:right"><b>${formatRupiah(res.jumlah)}</b></td></tr></tfoot>
      </table>
      <div style="margin-top:8px">Kategori: <b>${escapeHtml(res.subKategori)}</b> (${escapeHtml(res.kategori)}) · ${escapeHtml(res.alokasi || '-')}</div>
      <button class="btn btn-primary" style="margin-top:8px" id="btn-confirm-struk">Simpan Transaksi</button>
    `;
    document.getElementById('btn-confirm-struk').onclick = () => {
      const { items, ...toSave } = res;
      addTransaction(toSave);
      showToast('Struk disimpan', 'success');
      strukPreview.innerHTML = '';
      document.getElementById('struk-text').value = '';
      renderAll();
    };
  };

  // Fallback manual saat OCR meleset / tidak temukan total
  function renderManualFallback(text, date, errMsg) {
    // Tebak nama merchant dari baris pertama yang masuk akal
    const firstLine = String(text || '').split(/\r?\n/).find(l => l.trim().length > 2) || '';
    // Tebak kategori dari keyword di teks OCR
    let sub = null;
    for (const rule of KEYWORD_MAP) {
      if (rule.jenis === 'pengeluaran' && rule.re.test(text)) { sub = rule.sub; break; }
    }
    if (!sub) sub = 'Belanja bulanan supermarket';
    const { kategori, alokasi } = findCategoryForSub(sub, 'pengeluaran');

    strukPreview.innerHTML = `
      <div style="color:#b45309;background:#fef3c7;border:1px solid #fde68a;padding:10px;border-radius:10px;margin-bottom:10px">
        ⚠️ ${escapeHtml(errMsg)}<br>
        <small>Lihat preview foto di atas lalu isi total manual di bawah ini.</small>
      </div>
      <div class="form" style="display:grid;gap:8px">
        <label>Total (Rp)
          <input type="number" id="manual-total" min="0" step="500" placeholder="contoh: 286300" autofocus />
        </label>
        <label>Deskripsi
          <input type="text" id="manual-desc" value="${escapeHtml(firstLine.slice(0, 80))}" placeholder="nama toko / order" />
        </label>
        <label>Sub Kategori
          <select id="manual-sub"></select>
        </label>
        <button class="btn btn-primary" id="btn-save-manual">Simpan Transaksi</button>
      </div>
    `;
    // Isi dropdown sub-kategori pengeluaran
    const manualSub = document.getElementById('manual-sub');
    const subs = allSubs('pengeluaran').map(x => x.sub);
    manualSub.innerHTML = subs.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
    manualSub.value = sub;

    document.getElementById('btn-save-manual').onclick = () => {
      const amt = +document.getElementById('manual-total').value;
      const desc = document.getElementById('manual-desc').value.trim() || 'Struk belanja';
      const chosenSub = manualSub.value;
      if (!amt || amt <= 0) { showToast('Masukkan total yang valid', 'error'); return; }
      const info = findCategoryForSub(chosenSub, 'pengeluaran');
      addTransaction({
        tanggal: date,
        jenis: 'pengeluaran',
        jumlah: amt,
        deskripsi: desc.slice(0, 80),
        subKategori: chosenSub,
        kategori: info.kategori,
        alokasi: info.alokasi,
      });
      showToast('Transaksi disimpan', 'success');
      strukPreview.innerHTML = '';
      document.getElementById('struk-text').value = '';
      const preview = document.getElementById('struk-photo-preview');
      if (preview) { preview.style.display = 'none'; preview.removeAttribute('src'); }
      renderAll();
    };
  }

  // Transaksi filters
  ['trx-search','trx-filter-jenis','trx-filter-month','trx-filter-year'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderTransaksi);
    document.getElementById(id).addEventListener('change', renderTransaksi);
  });

  // Edit/Delete transaksi
  document.getElementById('trx-body').addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (edit) openEditModal(edit.dataset.edit);
    if (del) {
      if (confirm('Hapus transaksi ini?')) {
        deleteTransaction(del.dataset.del);
        renderAll();
        showToast('Transaksi dihapus');
      }
    }
  });

  // Edit modal
  const editModal = document.getElementById('modal-edit');
  const editForm = document.getElementById('form-edit');
  editForm.querySelector('[name="jenis"]').onchange = () => fillSubCategoriSelects();
  editForm.querySelector('[name="subKategori"]').onchange = () => syncKategoriFromSub('#form-edit');
  // Tutup modal (3 cara: tombol Batal, tombol ×, klik backdrop, Escape)
  document.getElementById('btn-cancel-edit').onclick = hideEditModal;
  const closeBtn = document.getElementById('btn-close-edit');
  if (closeBtn) closeBtn.onclick = hideEditModal;
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) hideEditModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && editModal.style.display !== 'none') hideEditModal();
  });
  editForm.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(editForm);
    const t = Object.fromEntries(fd.entries());
    t.jumlah = +t.jumlah;
    updateTransaction(t.id, t);
    hideEditModal();
    renderAll();
    showToast('Transaksi diperbarui', 'success');
  };

  // Rekap segmented
  document.querySelectorAll('.seg').forEach(b => b.onclick = () => {
    document.querySelectorAll('.seg').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    state.rekapPeriod = b.dataset.period;
    renderRekap();
  });

  // Kategori forms
  document.getElementById('form-add-sub-out').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const cat = fd.get('kategori'), sub = fd.get('sub').trim(), alok = fd.get('alokasi');
    if (!cat || !sub) return;
    const info = state.categories.pengeluaran[cat];
    if (!info.subs.includes(sub)) info.subs.push(sub);
    if (alok) info.alokasi = alok;
    saveState(); renderKategori(); fillSubCategoriSelects();
    e.target.reset();
    showToast('Sub kategori ditambahkan', 'success');
  };
  document.getElementById('form-add-sub-in').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const cat = fd.get('kategori'), sub = fd.get('sub').trim();
    if (!cat || !sub) return;
    const info = state.categories.pemasukan[cat];
    if (!info.subs.includes(sub)) info.subs.push(sub);
    saveState(); renderKategori(); fillSubCategoriSelects();
    e.target.reset();
    showToast('Sub kategori ditambahkan', 'success');
  };

  // Export/Import/Reset
  document.getElementById('btn-export').onclick = exportData;
  document.getElementById('btn-import').onclick = () => document.getElementById('file-import').click();
  document.getElementById('file-import').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      await importData(f);
      renderAll();
      fillSubCategoriSelects();
      showToast('Data berhasil diimpor', 'success');
    } catch (err) {
      showToast('Gagal impor: file tidak valid', 'error');
    }
    e.target.value = '';
  };
  document.getElementById('btn-reset').onclick = () => {
    if (confirm('Yakin hapus SEMUA data? Tindakan ini tidak bisa dibatalkan.')) {
      resetAll();
      fillSubCategoriSelects();
      renderAll();
      showToast('Semua data dihapus');
    }
  };
}

function openEditModal(id) {
  const t = state.transactions.find(x => x.id === id);
  if (!t) return;
  const form = document.getElementById('form-edit');
  form.querySelector('[name="id"]').value = t.id;
  form.querySelector('[name="tanggal"]').value = t.tanggal;
  form.querySelector('[name="jenis"]').value = t.jenis;
  form.querySelector('[name="jumlah"]').value = t.jumlah;
  form.querySelector('[name="deskripsi"]').value = t.deskripsi || '';
  fillSubCategoriSelects();
  form.querySelector('[name="subKategori"]').value = t.subKategori || '';
  syncKategoriFromSub('#form-edit');
  form.querySelector('[name="alokasi"]').value = t.alokasi || '';
  showEditModal();
}

// Tutup/buka modal pakai inline style (anti-cache, tidak bergantung CSS)
function hideEditModal() {
  const m = document.getElementById('modal-edit');
  m.hidden = true;
  m.style.display = 'none';
}
function showEditModal() {
  const m = document.getElementById('modal-edit');
  m.hidden = false;
  m.style.display = 'grid';
}

// Lazy-load Tesseract.js dari CDN saat pertama kali dipakai
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-tesseract]');
    if (existing) { existing.addEventListener('load', () => resolve(window.Tesseract)); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.defer = true;
    s.dataset.tesseract = '1';
    s.onload = () => resolve(window.Tesseract);
    s.onerror = () => reject(new Error('Gagal memuat Tesseract dari CDN. Cek koneksi internet.'));
    document.body.appendChild(s);
  });
}

document.addEventListener('DOMContentLoaded', init);

// Halaman: Transaksi, Rekap, Kategori
function renderTransaksi() {
  const q = (document.getElementById('trx-search').value || '').toLowerCase();
  const jenis = document.getElementById('trx-filter-jenis').value;
  const mSel = document.getElementById('trx-filter-month').value;
  const ySel = document.getElementById('trx-filter-year').value;

  let list = [...state.transactions].sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  if (jenis) list = list.filter(t => t.jenis === jenis);
  if (mSel !== '' && mSel !== 'all') list = list.filter(t => parseISO(t.tanggal).getMonth() === +mSel);
  if (ySel !== '' && ySel !== 'all') list = list.filter(t => parseISO(t.tanggal).getFullYear() === +ySel);
  if (q) list = list.filter(t =>
    (t.deskripsi || '').toLowerCase().includes(q) ||
    (t.subKategori || '').toLowerCase().includes(q) ||
    (t.kategori || '').toLowerCase().includes(q)
  );

  const tbody = document.getElementById('trx-body');
  const empty = document.getElementById('trx-empty');
  if (!list.length) {
    tbody.innerHTML = '';
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  tbody.innerHTML = list.map(t => `
    <tr>
      <td>${formatTanggal(t.tanggal)}</td>
      <td>${escapeHtml(t.deskripsi || '-')}</td>
      <td><span class="pill ${t.jenis === 'pemasukan' ? 'pill-in' : 'pill-out'}">${t.jenis}</span></td>
      <td class="num"><b style="color:${t.jenis === 'pemasukan' ? '#16a34a' : '#dc2626'}">${formatRupiah(t.jumlah)}</b></td>
      <td>${escapeHtml(t.subKategori || '-')}</td>
      <td>${escapeHtml(t.kategori || '-')}</td>
      <td>${t.alokasi ? `<span class="pill pill-alok">${t.alokasi}</span>` : '-'}</td>
      <td class="row-actions">
        <button class="icon-btn" data-edit="${t.id}" title="Edit">✏️</button>
        <button class="icon-btn danger" data-del="${t.id}" title="Hapus">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function renderRekap() {
  const period = state.rekapPeriod;
  const title = document.getElementById('rekap-title');
  title.textContent = `Rekap ${period.charAt(0).toUpperCase() + period.slice(1)}`;

  const m = state.selectedMonth, y = state.selectedYear;
  let rows = [];
  if (period === 'harian') {
    const trx = getTransactionsFor(m, y);
    const days = daysInMonth(m, y);
    for (let i = 1; i <= days; i++) {
      const list = trx.filter(t => parseISO(t.tanggal).getDate() === i);
      rows.push(makeRekapRow(`${i} ${MONTHS_SHORT[m]} ${y}`, list));
    }
  } else if (period === 'mingguan') {
    const trx = getTransactionsFor(m, y);
    const weeks = {};
    for (const t of trx) {
      const w = weekOfMonth(parseISO(t.tanggal));
      (weeks[w] = weeks[w] || []).push(t);
    }
    for (const w of Object.keys(weeks).sort((a,b)=>+a-+b)) {
      rows.push(makeRekapRow(`Minggu ${w} — ${MONTHS[m]} ${y}`, weeks[w]));
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const { m: mm, y: yy } = addMonths(state.selectedMonth, state.selectedYear, -i);
      const trx = getTransactionsFor(mm, yy);
      rows.push(makeRekapRow(`${MONTHS[mm]} ${yy}`, trx));
    }
  }

  const tbody = document.getElementById('rekap-body');
  tbody.innerHTML = rows.length
    ? rows.map(r => `<tr>
        <td>${r.label}</td>
        <td class="num" style="color:#16a34a">${formatRupiah(r.inc)}</td>
        <td class="num" style="color:#dc2626">${formatRupiah(r.exp)}</td>
        <td class="num"><b>${formatRupiah(r.bal)}</b></td>
        <td class="num">${r.count}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px">Belum ada data</td></tr>';

  destroyChart('rekap');
  charts.rekap = new Chart(document.getElementById('chart-rekap'), {
    type: period === 'bulanan' ? 'bar' : 'line',
    data: {
      labels: rows.map(r => r.label),
      datasets: [
        { label: 'Pemasukan', data: rows.map(r => r.inc), backgroundColor: '#16a34a', borderColor: '#16a34a', tension: .35 },
        { label: 'Pengeluaran', data: rows.map(r => r.exp), backgroundColor: '#dc2626', borderColor: '#dc2626', tension: .35 },
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: v => formatShort(v) } } } }
  });
}

function makeRekapRow(label, list) {
  const inc = list.filter(t => t.jenis === 'pemasukan').reduce((s, t) => s + +t.jumlah, 0);
  const exp = list.filter(t => t.jenis === 'pengeluaran').reduce((s, t) => s + +t.jumlah, 0);
  return { label, inc, exp, bal: inc - exp, count: list.length };
}

function renderKategori() {
  const boxOut = document.getElementById('kategori-pengeluaran');
  const boxIn = document.getElementById('kategori-pemasukan');
  boxOut.innerHTML = renderKatList('pengeluaran');
  boxIn.innerHTML = renderKatList('pemasukan');

  fillSelect(document.querySelector('#form-add-sub-out select[name="kategori"]'),
    Object.keys(state.categories.pengeluaran), 'Kategori…');
  fillSelect(document.querySelector('#form-add-sub-in select[name="kategori"]'),
    Object.keys(state.categories.pemasukan), 'Kategori…');

  boxOut.querySelectorAll('button[data-del-sub]').forEach(btn => btn.onclick = () => deleteSub('pengeluaran', btn.dataset.cat, btn.dataset.sub));
  boxIn.querySelectorAll('button[data-del-sub]').forEach(btn => btn.onclick = () => deleteSub('pemasukan', btn.dataset.cat, btn.dataset.sub));
}

function renderKatList(jenis) {
  const cats = state.categories[jenis];
  return `<div class="kat-list">` + Object.entries(cats).map(([name, info]) => `
    <div class="kat-group">
      <h4>${escapeHtml(name)} ${info.alokasi ? `<span class="pill pill-alok">${info.alokasi}</span>` : ''}</h4>
      <ul>
        ${(info.subs || []).map(s => `<li>${escapeHtml(s)} <button data-del-sub data-cat="${escapeHtml(name)}" data-sub="${escapeHtml(s)}" title="Hapus">×</button></li>`).join('')}
      </ul>
    </div>
  `).join('') + `</div>`;
}

function deleteSub(jenis, cat, sub) {
  const info = state.categories[jenis][cat];
  if (!info) return;
  info.subs = info.subs.filter(s => s !== sub);
  saveState();
  renderKategori();
  fillSubCategoriSelects();
  showToast('Sub kategori dihapus');
}

function fillSelect(sel, items, placeholder) {
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = (placeholder ? `<option value="">${placeholder}</option>` : '') +
    items.map(i => `<option value="${escapeHtml(i)}">${escapeHtml(i)}</option>`).join('');
  if (items.includes(cur)) sel.value = cur;
}

function fillSubCategoriSelects() {
  const jenisEl = document.querySelector('#form-transaksi select[name="jenis"]');
  const subEl = document.querySelector('#form-transaksi select[name="subKategori"]');
  const jenis = jenisEl ? jenisEl.value : 'pengeluaran';
  const subs = allSubs(jenis).map(x => x.sub);
  fillSelect(subEl, subs);
  syncKategoriFromSub('#form-transaksi');

  const editJenis = document.querySelector('#form-edit select[name="jenis"]');
  if (editJenis) {
    const editSub = document.querySelector('#form-edit select[name="subKategori"]');
    const subs2 = allSubs(editJenis.value).map(x => x.sub);
    fillSelect(editSub, subs2);
    syncKategoriFromSub('#form-edit');
  }
}

function syncKategoriFromSub(formSel) {
  const form = document.querySelector(formSel);
  if (!form) return;
  const jenis = form.querySelector('[name="jenis"]').value;
  const sub = form.querySelector('[name="subKategori"]').value;
  const info = findCategoryForSub(sub, jenis);
  form.querySelector('[name="kategori"]').value = info.kategori;
  const alok = form.querySelector('[name="alokasi"]');
  if (alok && info.alokasi) alok.value = info.alokasi;
}

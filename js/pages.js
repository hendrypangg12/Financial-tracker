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
  // Kelompokkan per tanggal: header tanggal + total harian, lalu baris ringkas.
  const today = todayISO();
  const yest = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return toISODate(d); })();
  const groups = [];
  for (const t of list) {
    const last = groups[groups.length - 1];
    if (last && last.tanggal === t.tanggal) last.items.push(t);
    else groups.push({ tanggal: t.tanggal, items: [t] });
  }
  const row = (t) => `
    <tr class="trx-row">
      <td data-label="Tanggal">${formatTanggal(t.tanggal)}</td>
      <td data-label="Deskripsi" class="trx-desc">${escapeHtml(t.deskripsi || '-')}</td>
      <td data-label="Jenis"><span class="pill ${t.jenis === 'pemasukan' ? 'pill-in' : 'pill-out'}">${t.jenis}</span></td>
      <td class="num trx-amount" data-label="Jumlah"><b class="${t.jenis === 'pemasukan' ? 'money-income' : 'money-expense money-negative'}">${t.jenis === 'pemasukan' ? '+' : ''}${formatRupiah(t.jumlah)}</b></td>
      <td data-label="Sub Kategori">${escapeHtml(t.subKategori || '-')}</td>
      <td data-label="Kategori">${escapeHtml(t.kategori || '-')}</td>
      <td data-label="Alokasi">${t.alokasi ? `<span class="pill pill-alok">${t.alokasi}</span>` : '-'}</td>
      <td class="row-actions" data-label="Aksi">
        <button class="icon-btn" data-edit="${t.id}" title="Edit" aria-label="Edit">✏️</button>
        <button class="icon-btn danger" data-del="${t.id}" title="Hapus" aria-label="Hapus">🗑️</button>
      </td>
    </tr>`;
  tbody.innerHTML = groups.map(g => {
    const net = g.items.reduce((sum, t) => sum + (t.jenis === 'pemasukan' ? 1 : -1) * (+t.jumlah || 0), 0);
    const label = g.tanggal === today ? 'Hari ini' : g.tanggal === yest ? 'Kemarin' : formatTanggal(g.tanggal);
    const netHtml = `<span class="${net >= 0 ? 'money-income' : 'money-expense'}">${net >= 0 ? '+' : '\u2212'}${formatRupiah(Math.abs(net))}</span>`;
    return `<tr class="trx-date-row"><td colspan="8"><span>${label}</span>${netHtml}</td></tr>` + g.items.map(row).join('');
  }).join('');
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
    const trx = getCashflowTransactionsFor(m, y);
    const days = daysInMonth(m, y);
    for (let i = 1; i <= days; i++) {
      const list = trx.filter(t => parseISO(t.tanggal).getDate() === i);
      if (list.length) rows.push(makeRekapRow(`${i} ${MONTHS_SHORT[m]}`, list));
    }
  } else if (period === 'mingguan') {
    const trx = getCashflowTransactionsFor(m, y);
    const weeks = {};
    for (const t of trx) {
      const w = weekOfMonth(parseISO(t.tanggal));
      (weeks[w] = weeks[w] || []).push(t);
    }
    for (const w of Object.keys(weeks).sort((a,b)=>+a-+b)) {
      rows.push(makeRekapRow(`Minggu ${w}`, weeks[w]));
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const { m: mm, y: yy } = addMonths(state.selectedMonth, state.selectedYear, -i);
      const trx = getCashflowTransactionsFor(mm, yy);
      // Lewati bulan kosong di awal (sebelum mulai mencatat) supaya daftar tidak penuh Rp 0.
      if (!trx.length && !rows.length) continue;
      rows.push(makeRekapRow(`${MONTHS_SHORT[mm]} ${yy}`, trx));
    }
  }

  const tbody = document.getElementById('rekap-body');
  tbody.innerHTML = rows.length
    ? rows.map(r => `<tr class="rekap-row">
        <td class="rekap-label">${r.label}</td>
        <td class="num money-income" data-label="Masuk">${formatRupiah(r.inc)}</td>
        <td class="num money-expense money-negative" data-label="Keluar">${formatRupiah(r.exp)}</td>
        <td class="num rekap-bal" data-label="Sisa"><b class="${r.bal >= 0 ? 'money-income' : 'money-expense'}">${r.bal < 0 ? '\u2212' : ''}${formatRupiah(Math.abs(r.bal))}</b></td>
        <td class="num rekap-count" data-label="Transaksi">${r.count}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px">Belum ada transaksi di periode ini</td></tr>';

  destroyChart('rekap');
  charts.rekap = new Chart(document.getElementById('chart-rekap'), {
    type: period === 'bulanan' ? 'bar' : 'line',
    data: {
      labels: rows.map(r => r.label),
      datasets: [
        { label: 'Pemasukan', data: rows.map(r => r.inc), backgroundColor: '#5a8a3a', borderColor: '#5a8a3a', tension: .35 },
        { label: 'Pengeluaran', data: rows.map(r => r.exp), backgroundColor: '#c0392b', borderColor: '#c0392b', tension: .35 },
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
  const katEl = document.querySelector('#form-transaksi select[name="kategori"]');
  if (katEl) {
    // Form tambah: pilih Kategori dulu, lalu Sub Kategori di dalamnya.
    fillSelect(katEl, Object.keys(state.categories[jenis] || {}));
    fillFormSubsForKategori();
  } else {
    fillSelect(subEl, allSubs(jenis).map(x => x.sub));
    syncKategoriFromSub('#form-transaksi');
  }

  const editJenis = document.querySelector('#form-edit select[name="jenis"]');
  if (editJenis) {
    const editSub = document.querySelector('#form-edit select[name="subKategori"]');
    const subs2 = allSubs(editJenis.value).map(x => x.sub);
    fillSelect(editSub, subs2);
    syncKategoriFromSub('#form-edit');
  }
}

function fillFormSubsForKategori() {
  const form = document.getElementById('form-transaksi');
  if (!form) return;
  const jenis = form.querySelector('[name="jenis"]').value;
  const kat = form.querySelector('[name="kategori"]').value;
  const info = (state.categories[jenis] || {})[kat] || {};
  fillSelect(form.querySelector('[name="subKategori"]'), info.subs || []);
  const alok = form.querySelector('[name="alokasi"]');
  if (alok && info.alokasi) alok.value = info.alokasi;
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

// Tab Rencana: tampilkan angka ringkas langsung di kartu (bukan kartu kosong).
function renderPlanHub() {
  const hutEl = document.getElementById('plan-stat-hutang');
  const goalEl = document.getElementById('plan-stat-goal');
  if (hutEl) {
    const active = (state.hutangs || []).filter(h => !h.lunas);
    const piutang = active.filter(h => h.jenis === 'piutang').reduce((s, h) => s + (Number(h.nominal) || 0), 0);
    const hutang = active.filter(h => h.jenis === 'hutang').reduce((s, h) => s + (Number(h.nominal) || 0), 0);
    const today = todayISO();
    const overdue = active.filter(h => h.jatuhTempo && h.jatuhTempo < today).length;
    hutEl.innerHTML = active.length
      ? `<span class="money-expense">Hutang ${formatRupiah(hutang)}</span><span class="money-income">Piutang ${formatRupiah(piutang)}</span>${overdue ? `<span class="plan-hub-warn">${overdue} lewat jatuh tempo</span>` : ''}`
      : '<span class="plan-hub-muted">Belum ada catatan</span>';
  }
  if (goalEl) {
    const goals = (state.goals || []).filter(g => g.status !== 'completed');
    if (!goals.length) {
      goalEl.innerHTML = '<span class="plan-hub-muted">Belum ada target</span>';
    } else {
      const g = goals[0];
      const pct = g.targetAmount > 0 ? Math.min(100, Math.round((Number(g.currentSaving) || 0) / g.targetAmount * 100)) : 0;
      goalEl.innerHTML = `<span class="plan-hub-goal"><span>${escapeHtml(g.nama || 'Target')} · ${pct}%</span><span class="plan-hub-bar"><i style="width:${pct}%"></i></span></span>${goals.length > 1 ? `<span class="plan-hub-muted">+${goals.length - 1} target lain</span>` : ''}`;
    }
  }
}

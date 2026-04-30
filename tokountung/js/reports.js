// Module: Reports / Dashboard / BEP
let trendChart = null;

function renderDashboard() {
  document.getElementById('today-label').textContent = formatTanggalLong(todayISO());

  const today = todayISO();
  const todaySales = state.sales.filter(s => s.tanggal === today);
  const revenue = todaySales.reduce((s, sale) => s + sale.total, 0);
  const profit = todaySales.reduce((s, sale) => s + sale.profit, 0);
  const margin = revenue > 0 ? (profit / revenue * 100) : 0;

  document.getElementById('kpi-revenue').textContent = formatRupiah(revenue);
  document.getElementById('kpi-revenue-delta').textContent = `${todaySales.length} transaksi`;
  document.getElementById('kpi-profit').textContent = formatRupiah(profit);
  document.getElementById('kpi-profit-delta').textContent = `Margin ${margin.toFixed(1)}%`;

  // Breakdown cash vs tempo (untuk hari ini)
  const cashSales = todaySales.filter(s => s.metode !== 'tempo' || s.lunas === true);
  const tempoSales = todaySales.filter(s => s.metode === 'tempo' && !s.lunas);
  const cashTotal = cashSales.reduce((s, x) => s + (x.total || 0), 0);
  const tempoTotal = tempoSales.reduce((s, x) => s + (x.total || 0), 0);
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('kpi-cash-today', formatRupiah(cashTotal));
  setText('kpi-cash-today-meta', `${cashSales.length} transaksi · sudah masuk kas`);
  setText('kpi-tempo-today', formatRupiah(tempoTotal));
  setText('kpi-tempo-today-meta', `${tempoSales.length} invoice · piutang baru`);

  const stockValue = state.products.reduce((s, p) => s + p.stok * p.hargaModal, 0);
  document.getElementById('kpi-stock').textContent = formatRupiah(stockValue);
  document.getElementById('kpi-stock-delta').textContent = `${state.products.length} item`;

  const lowStock = state.products.filter(p => p.stok <= (p.minStok || 5));
  document.getElementById('kpi-alert').textContent = lowStock.length;

  // Trend 7 hari
  renderTrend7Days();

  // Top seller hari ini
  renderTopSellerToday(todaySales);

  // Low stock list
  renderLowStock(lowStock);

  // BEP
  renderBEP();
}

function renderTrend7Days() {
  const labels = [];
  const dataRev = [];
  const dataProfit = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = toISODate(d);
    labels.push(`${d.getDate()}/${d.getMonth()+1}`);
    const ds = state.sales.filter(s => s.tanggal === iso);
    dataRev.push(ds.reduce((s, x) => s + x.total, 0));
    dataProfit.push(ds.reduce((s, x) => s + x.profit, 0));
  }
  if (trendChart) trendChart.destroy();
  const ctx = document.getElementById('chart-trend');
  if (!ctx) return;
  trendChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Penjualan', data: dataRev, backgroundColor: '#10b981' },
        { label: 'Profit', data: dataProfit, backgroundColor: '#f59e0b' },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { ticks: { callback: v => formatShort(v) } } }
    }
  });
}

function renderTopSellerToday(todaySales) {
  const ol = document.getElementById('top-seller');
  const counts = {};
  for (const s of todaySales) {
    for (const it of s.items) {
      if (!counts[it.productId]) counts[it.productId] = { nama: it.nama, qty: 0, revenue: 0 };
      counts[it.productId].qty += it.qty;
      counts[it.productId].revenue += it.qty * it.hargaJual;
    }
  }
  const top = Object.values(counts).sort((a,b) => b.qty - a.qty).slice(0, 5);
  if (!top.length) { ol.innerHTML = '<li class="empty">Belum ada penjualan hari ini</li>'; return; }
  ol.innerHTML = top.map(t => `<li><span>${escapeHtml(t.nama)}</span><b>${t.qty}× · ${formatRupiah(t.revenue)}</b></li>`).join('');
}

function renderLowStock(list) {
  const ul = document.getElementById('low-stock-list');
  if (!list.length) { ul.innerHTML = '<li class="empty">Semua stok aman ✅</li>'; return; }
  ul.innerHTML = list.slice(0, 10).map(p => `
    <li>⚠️ <b>${escapeHtml(p.nama)}</b> — sisa ${p.stok} ${escapeHtml(p.satuan)} (min: ${p.minStok || 5})</li>
  `).join('');
}

function renderBEP() {
  const biaya = +state.settings.biayaTetap || 0;
  if (biaya <= 0) {
    document.getElementById('bep-status').innerHTML = '⚠️ Atur biaya tetap di tab Pengaturan untuk hitung BEP';
    document.getElementById('bep-target').textContent = '-';
    document.getElementById('bep-achieved').textContent = '-';
    document.getElementById('bep-remaining').textContent = '-';
    document.getElementById('bep-fill').style.width = '0%';
    return;
  }
  const now = new Date();
  const start = startOfMonth(now);
  const monthSales = state.sales.filter(s => parseISO(s.tanggal) >= start);
  const monthProfit = monthSales.reduce((s, sale) => s + sale.profit, 0);
  document.getElementById('bep-target').textContent = formatRupiah(biaya);
  document.getElementById('bep-achieved').textContent = formatRupiah(monthProfit);
  const remain = biaya - monthProfit;
  document.getElementById('bep-remaining').textContent = remain > 0 ? formatRupiah(remain) : '✅ BEP TERCAPAI';
  const pct = Math.min(100, (monthProfit / biaya) * 100);
  document.getElementById('bep-fill').style.width = pct + '%';
  document.getElementById('bep-status').textContent =
    pct >= 100 ? `🎉 Sudah BEP! Profit kotor: ${formatRupiah(monthProfit - biaya)} untuk Anda` :
    `${pct.toFixed(0)}% menuju BEP bulan ini`;
}

// === LAPORAN — filter UI helpers ===
function populateYearOptions() {
  const sel = document.getElementById('laporan-year');
  if (!sel) return;
  const currentYear = new Date().getFullYear();
  const yearsFromSales = new Set();
  for (const s of (state.sales || [])) {
    if (s.tanggal) yearsFromSales.add(parseInt(s.tanggal.slice(0, 4), 10));
  }
  yearsFromSales.add(currentYear);
  const years = [...yearsFromSales].sort((a, b) => b - a);
  sel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
}

function updateLaporanFilterUI() {
  const periode = document.getElementById('laporan-periode').value;
  const dateInp = document.getElementById('laporan-date');
  const monthInp = document.getElementById('laporan-month');
  const yearSel = document.getElementById('laporan-year');
  const rangeWrap = document.getElementById('laporan-range');

  if (dateInp) dateInp.hidden = periode !== 'custom-date';
  if (monthInp) monthInp.hidden = periode !== 'custom-month';
  if (yearSel) yearSel.hidden = periode !== 'custom-year';
  if (rangeWrap) rangeWrap.hidden = periode !== 'custom-range';

  // Set default values
  const today = new Date();
  if (periode === 'custom-date' && dateInp && !dateInp.value) {
    dateInp.value = toISODate(today);
  }
  if (periode === 'custom-month' && monthInp && !monthInp.value) {
    monthInp.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }
  if (periode === 'custom-year' && yearSel) {
    populateYearOptions();
    if (!yearSel.value) yearSel.value = today.getFullYear();
  }
  if (periode === 'custom-range') {
    const from = document.getElementById('laporan-range-from');
    const to = document.getElementById('laporan-range-to');
    if (from && !from.value) {
      const d = new Date(); d.setDate(d.getDate() - 7);
      from.value = toISODate(d);
    }
    if (to && !to.value) to.value = toISODate(today);
  }
}

// === LAPORAN ===
function getLaporanRange() {
  const periode = document.getElementById('laporan-periode').value;
  const now = new Date();
  const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  let start, end, label;

  if (periode === 'hari') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = endOfDay(now);
    label = `📅 ${formatTanggalLong(toISODate(start))}`;
  } else if (periode === 'minggu') {
    start = startOfWeek(now);
    end = endOfDay(now);
    label = `📅 Minggu ini (${formatTanggal(toISODate(start))} - ${formatTanggal(toISODate(now))})`;
  } else if (periode === 'tahun') {
    start = startOfYear(now);
    end = endOfDay(now);
    label = `🗓️ Tahun ${now.getFullYear()}`;
  } else if (periode === 'custom-date') {
    const v = document.getElementById('laporan-date').value;
    if (!v) return null;
    const d = parseISO(v);
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    end = endOfDay(start);
    label = `📅 ${formatTanggalLong(v)}`;
  } else if (periode === 'custom-month') {
    const v = document.getElementById('laporan-month').value;
    if (!v) return null;
    const [y, m] = v.split('-').map(Number);
    start = new Date(y, m - 1, 1);
    end = endOfDay(new Date(y, m, 0));
    const bulanNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    label = `📆 ${bulanNames[m-1]} ${y}`;
  } else if (periode === 'custom-year') {
    const v = +document.getElementById('laporan-year').value;
    if (!v) return null;
    start = new Date(v, 0, 1);
    end = endOfDay(new Date(v, 11, 31));
    label = `🗓️ Tahun ${v}`;
  } else if (periode === 'custom-range') {
    const from = document.getElementById('laporan-range-from').value;
    const to = document.getElementById('laporan-range-to').value;
    if (!from || !to) return null;
    start = parseISO(from);
    end = endOfDay(parseISO(to));
    if (end < start) return null;
    label = `↔️ ${formatTanggal(from)} s/d ${formatTanggal(to)}`;
  } else {
    start = startOfMonth(now);
    end = endOfDay(now);
    const bulanNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    label = `📆 ${bulanNames[now.getMonth()]} ${now.getFullYear()}`;
  }
  return { start, end, label, periode };
}

function renderLaporan() {
  const range = getLaporanRange();
  const labelEl = document.getElementById('laporan-period-label');
  if (!range) {
    if (labelEl) labelEl.textContent = '⚠️ Pilih periode dulu';
    return;
  }
  if (labelEl) labelEl.textContent = range.label;
  const { start, end } = range;

  const periodSales = state.sales.filter(s => {
    const d = parseISO(s.tanggal);
    return d >= start && d <= end;
  });
  const revenue = periodSales.reduce((s, x) => s + x.total, 0);
  const hpp = periodSales.reduce((s, x) => s + x.items.reduce((a,it) => a + it.hargaModal * it.qty, 0), 0);
  const profit = periodSales.reduce((s, x) => s + x.profit, 0);
  const margin = revenue > 0 ? (profit / revenue * 100) : 0;

  document.getElementById('lap-revenue').textContent = formatRupiah(revenue);
  document.getElementById('lap-hpp').textContent = formatRupiah(hpp);
  document.getElementById('lap-profit').textContent = formatRupiah(profit);
  document.getElementById('lap-margin').textContent = margin.toFixed(1) + '%';

  // Best seller
  const counts = {};
  for (const s of periodSales) {
    for (const it of s.items) {
      if (!counts[it.productId]) counts[it.productId] = { nama: it.nama, qty: 0, revenue: 0 };
      counts[it.productId].qty += it.qty;
      counts[it.productId].revenue += it.qty * it.hargaJual;
    }
  }
  const top = Object.values(counts).sort((a,b) => b.qty - a.qty).slice(0, 10);
  const ol = document.getElementById('lap-best-seller');
  ol.innerHTML = top.length
    ? top.map(t => `<li><span>${escapeHtml(t.nama)}</span><b>${t.qty}× · ${formatRupiah(t.revenue)}</b></li>`).join('')
    : '<li class="empty">Belum ada penjualan</li>';

  // Slow moving (>30 hari tidak laku)
  const sold30 = new Set();
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  for (const s of state.sales) {
    if (parseISO(s.tanggal) >= cutoff) {
      for (const it of s.items) sold30.add(it.productId);
    }
  }
  const slow = state.products.filter(p => !sold30.has(p.id) && p.stok > 0).slice(0, 10);
  const ul = document.getElementById('lap-slow-moving');
  ul.innerHTML = slow.length
    ? slow.map(p => `<li>🐢 <b>${escapeHtml(p.nama)}</b> — stok: ${p.stok}, modal terikat: ${formatRupiah(p.stok * p.hargaModal)}</li>`).join('')
    : '<li class="empty">Semua produk laku ≤ 30 hari ✅</li>';

  // Sales history
  const sb = document.getElementById('lap-sales-body');
  const sortedSales = [...periodSales].sort((a,b) => b.tanggal.localeCompare(a.tanggal));
  sb.innerHTML = sortedSales.length
    ? sortedSales.map(s => `
      <tr>
        <td>${formatTanggal(s.tanggal)} ${s.waktu || ''}</td>
        <td><code>${escapeHtml(s.nomor)}</code></td>
        <td>${s.items.length} item</td>
        <td class="num"><b>${formatRupiah(s.total)}</b></td>
        <td class="num"><b style="color:#10b981">${formatRupiah(s.profit)}</b></td>
        <td><button class="btn btn-small" data-show-receipt="${s.id}">🧾</button></td>
      </tr>
    `).join('')
    : '<tr><td colspan="6" class="empty">Belum ada transaksi pada periode ini</td></tr>';
  sb.querySelectorAll('[data-show-receipt]').forEach(b => b.onclick = () => {
    const sale = state.sales.find(x => x.id === b.dataset.showReceipt);
    if (sale) showReceipt(sale);
  });
}

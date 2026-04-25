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

// === LAPORAN ===
function renderLaporan() {
  const periode = document.getElementById('laporan-periode').value;
  const now = new Date();
  let start;
  if (periode === 'hari') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (periode === 'minggu') start = startOfWeek(now);
  else if (periode === 'tahun') start = startOfYear(now);
  else start = startOfMonth(now);

  const periodSales = state.sales.filter(s => parseISO(s.tanggal) >= start);
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

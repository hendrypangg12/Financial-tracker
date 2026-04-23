// Dashboard renderer
const charts = {};

function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); charts[key] = null; }
}

function renderDashboard() {
  const m = state.selectedMonth, y = state.selectedYear;
  const trx = getTransactionsFor(m, y);
  const prev = addMonths(m, y, -1);
  const trxPrev = getTransactionsFor(prev.m, prev.y);

  document.getElementById('dash-month-label').textContent = `${MONTHS[m]} ${y}`;

  const income = sumBy(trx, 'pemasukan');
  const expense = sumBy(trx, 'pengeluaran');
  const balance = income - expense;
  const incomePrev = sumBy(trxPrev, 'pemasukan');
  const expensePrev = sumBy(trxPrev, 'pengeluaran');
  const balancePrev = incomePrev - expensePrev;

  setKPI('kpi-income', formatRupiah(income), pctDelta(income, incomePrev), 'income');
  setKPI('kpi-expense', formatRupiah(expense), pctDelta(expense, expensePrev), 'expense');
  setKPI('kpi-balance', formatRupiah(balance), pctDelta(balance, balancePrev), 'income');
  setKPI('kpi-count', String(trx.length), pctDelta(trx.length, trxPrev.length), 'income');

  renderDailyChart(trx, m, y);
  renderMiniReports(trx, trxPrev, income, expense, balance);
  renderTopList('top-expense', trx.filter(t => t.jenis === 'pengeluaran'));
  renderTopList('top-income', trx.filter(t => t.jenis === 'pemasukan'));
  renderCategoryPie('chart-expense-cat', 'legend-expense-cat', trx.filter(t => t.jenis === 'pengeluaran'));
  renderCategoryPie('chart-income-cat', 'legend-income-cat', trx.filter(t => t.jenis === 'pemasukan'));
  renderCompare('compare-expense', trx.filter(t => t.jenis === 'pengeluaran'), trxPrev.filter(t => t.jenis === 'pengeluaran'));
  renderCompare('compare-income', trx.filter(t => t.jenis === 'pemasukan'), trxPrev.filter(t => t.jenis === 'pemasukan'));
  renderAlokasi(trx);
  renderBudgetRings(trx);
  renderSixMonth(m, y);
}

function sumBy(trx, jenis) {
  return trx.filter(t => t.jenis === jenis).reduce((s, t) => s + (+t.jumlah || 0), 0);
}

function setKPI(id, text, pct, goodDir) {
  document.getElementById(id).textContent = text;
  const delta = document.getElementById(id + '-delta');
  if (!delta) return;
  const up = pct >= 0;
  const arrow = up ? '▲' : '▼';
  delta.textContent = `${arrow} ${Math.abs(pct).toFixed(0)}% vs Bulan Lalu`;
  delta.className = 'card-delta ' + (up === (goodDir === 'income') ? 'up' : 'down');
}

function renderDailyChart(trx, m, y) {
  const days = daysInMonth(m, y);
  const expense = new Array(days).fill(0);
  const income = new Array(days).fill(0);
  for (const t of trx) {
    const d = parseISO(t.tanggal).getDate() - 1;
    if (t.jenis === 'pengeluaran') expense[d] += +t.jumlah;
    else income[d] += +t.jumlah;
  }
  const labels = Array.from({ length: days }, (_, i) => i + 1);
  destroyChart('daily');
  charts.daily = new Chart(document.getElementById('chart-daily'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Pengeluaran', data: expense, borderColor: '#c0392b', backgroundColor: 'rgba(192,57,43,.1)', fill: true, tension: .35, pointRadius: 2 },
        { label: 'Pemasukan', data: income, borderColor: '#5a8a3a', backgroundColor: 'rgba(90,138,58,.1)', fill: true, tension: .35, pointRadius: 2 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { ticks: { callback: v => formatShort(v) } } }
    }
  });
}

function renderMiniReports(trx, trxPrev, income, expense, balance) {
  const ul = document.getElementById('mini-reports');
  const items = [];
  const expensePrev = sumBy(trxPrev, 'pengeluaran');
  const balancePrev = sumBy(trxPrev, 'pemasukan') - expensePrev;

  if (balance >= 0) items.push({ type: 'good', text: `✅ Saldo bulan ini surplus ${formatRupiah(balance)}.` });
  else items.push({ type: 'bad', text: `⚠️ Saldo bulan ini defisit ${formatRupiah(balance)}.` });

  if (balancePrev) {
    const delta = balance - balancePrev;
    if (delta >= 0) items.push({ type: 'good', text: `📈 Saldo naik ${formatRupiah(delta)} dari bulan lalu.` });
    else items.push({ type: 'bad', text: `📉 Saldo turun ${formatRupiah(-delta)} dari bulan lalu.` });
  }

  if (state.target && expense > state.target) {
    items.push({ type: 'bad', text: `🎯 Pengeluaran melewati target ${formatRupiah(state.target)}.` });
  } else if (state.target) {
    items.push({ type: 'info', text: `🎯 Sisa budget: ${formatRupiah(state.target - expense)}.` });
  }

  const topExp = Object.entries(groupBy(trx.filter(t => t.jenis === 'pengeluaran'), 'subKategori'))
    .map(([k, v]) => [k, v.reduce((s, t) => s + +t.jumlah, 0)])
    .sort((a, b) => b[1] - a[1])[0];
  if (topExp) items.push({ type: 'info', text: `🛒 Pengeluaran terbesar: ${topExp[0]} — ${formatRupiah(topExp[1])}.` });

  items.push({ type: 'info', text: `📊 Total transaksi: ${trx.length} (pemasukan ${trx.filter(t=>t.jenis==='pemasukan').length}, pengeluaran ${trx.filter(t=>t.jenis==='pengeluaran').length}).` });

  ul.innerHTML = items.map(i => `<li class="${i.type}">${i.text}</li>`).join('');
}

function groupBy(arr, key) {
  return arr.reduce((acc, x) => { (acc[x[key] || 'Lainnya'] = acc[x[key] || 'Lainnya'] || []).push(x); return acc; }, {});
}

function renderTopList(elId, trx) {
  const groups = groupBy(trx, 'subKategori');
  const rows = Object.entries(groups)
    .map(([k, v]) => [k, v.reduce((s, t) => s + +t.jumlah, 0)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const ol = document.getElementById(elId);
  ol.innerHTML = rows.length
    ? rows.map(([k, v]) => `<li><span class="rank-name">${k}</span><span class="rank-val">${formatRupiah(v)}</span></li>`).join('')
    : '<li style="list-style:none;color:#94a3b8">Belum ada data</li>';
}

function renderCategoryPie(canvasId, legendId, trx) {
  const groups = groupBy(trx, 'kategori');
  const entries = Object.entries(groups)
    .map(([k, v]) => [k || 'Lainnya', v.reduce((s, t) => s + +t.jumlah, 0)])
    .sort((a, b) => b[1] - a[1]);
  const labels = entries.map(e => e[0]);
  const data = entries.map(e => e[1]);
  const colors = labels.map((_, i) => PIE_COLORS[i % PIE_COLORS.length]);
  const total = data.reduce((a, b) => a + b, 0);

  // Update total di tengah donut kalau ada elemen-nya
  const pieTotalId = canvasId === 'chart-expense-cat' ? 'pie-total-expense' : 'pie-total-income';
  const pieTotalEl = document.getElementById(pieTotalId);
  if (pieTotalEl) pieTotalEl.textContent = formatShort(total);

  destroyChart(canvasId);
  if (!data.length) {
    document.getElementById(legendId).innerHTML = '<li style="color:#94a3b8">Belum ada data</li>';
    if (pieTotalEl) pieTotalEl.textContent = 'Rp 0';
    const ctx = document.getElementById(canvasId);
    ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    return;
  }
  charts[canvasId] = new Chart(document.getElementById(canvasId), {
    type: 'doughnut',
    plugins: window.ChartDataLabels ? [window.ChartDataLabels] : [],
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 3,
        borderColor: '#fff',
        borderRadius: 6,
        hoverOffset: 12,
        hoverBorderWidth: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      animation: { animateRotate: true, animateScale: true, duration: 900, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(30, 24, 18, .95)',
          titleColor: '#fff', bodyColor: '#fff',
          padding: 10, cornerRadius: 8,
          displayColors: true, boxPadding: 4,
          callbacks: {
            label: (ctx) => {
              const pct = total ? (ctx.parsed / total * 100).toFixed(1) : 0;
              return ` ${formatRupiah(ctx.parsed)}  (${pct}%)`;
            },
            title: (ctx) => ctx[0].label,
          }
        },
        datalabels: {
          color: '#fff',
          font: { weight: 800, size: 12, family: 'Inter, sans-serif' },
          textStrokeColor: 'rgba(0,0,0,.25)',
          textStrokeWidth: 2,
          formatter: (value) => {
            if (!total) return '';
            const pct = value / total * 100;
            return pct >= 7 ? pct.toFixed(0) + '%' : '';
          }
        }
      },
      cutout: '65%',
    }
  });
  document.getElementById(legendId).innerHTML = labels.map((l, i) => {
    const pct = total ? (data[i] / total * 100).toFixed(1) : 0;
    return `<li>
      <span class="sw" style="background:${colors[i]}"></span>
      <span class="cat-name">${l}</span>
      <span class="cat-pct">${pct}%</span>
    </li>`;
  }).join('');
}

function renderCompare(elId, trx, trxPrev) {
  const nowGroups = groupBy(trx, 'subKategori');
  const prevGroups = groupBy(trxPrev, 'subKategori');
  const keys = new Set([...Object.keys(nowGroups), ...Object.keys(prevGroups)]);
  const rows = [...keys].map(k => {
    const n = (nowGroups[k] || []).reduce((s, t) => s + +t.jumlah, 0);
    const p = (prevGroups[k] || []).reduce((s, t) => s + +t.jumlah, 0);
    return { k, n, p, d: n - p };
  }).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 8);
  const ul = document.getElementById(elId);
  ul.innerHTML = rows.length
    ? rows.map(r => `<li><span>${r.k}</span><span>${formatShort(r.n)}</span><span class="arr ${r.d >= 0 ? 'up' : 'down'}">${r.d >= 0 ? '▲' : '▼'}</span><span>${formatShort(Math.abs(r.d))}</span></li>`).join('')
    : '<li style="color:#94a3b8">Belum ada data</li>';
}

function renderAlokasi(trx) {
  const buckets = { Kebutuhan: [], Keinginan: [], Investasi: [] };
  const totals = { Kebutuhan: 0, Keinginan: 0, Investasi: 0 };
  for (const t of trx.filter(x => x.jenis === 'pengeluaran')) {
    const a = t.alokasi || findCategoryForSub(t.subKategori, 'pengeluaran').alokasi;
    if (buckets[a]) { buckets[a].push(t); totals[a] += +t.jumlah; }
  }
  fillAlokasi('list-kebutuhan', buckets.Kebutuhan);
  fillAlokasi('list-keinginan', buckets.Keinginan);
  fillAlokasi('list-investasi', buckets.Investasi);
  document.getElementById('total-kebutuhan').textContent = formatRupiah(totals.Kebutuhan);
  document.getElementById('total-keinginan').textContent = formatRupiah(totals.Keinginan);
  document.getElementById('total-investasi').textContent = formatRupiah(totals.Investasi);
}

function fillAlokasi(id, items) {
  const groups = groupBy(items, 'subKategori');
  const rows = Object.entries(groups).map(([k, v]) => [k, v.reduce((s, t) => s + +t.jumlah, 0)])
    .sort((a, b) => b[1] - a[1]);
  const ol = document.getElementById(id);
  ol.innerHTML = rows.length
    ? rows.map(([k, v]) => `<li><span>${k}</span><b>${formatShort(v)}</b></li>`).join('')
    : '<li style="list-style:none;color:#94a3b8">—</li>';
}

function renderBudgetRings(trx) {
  const totals = { Kebutuhan: 0, Keinginan: 0, Investasi: 0 };
  for (const t of trx.filter(x => x.jenis === 'pengeluaran')) {
    const a = t.alokasi || findCategoryForSub(t.subKategori, 'pengeluaran').alokasi;
    if (totals[a] != null) totals[a] += +t.jumlah;
  }
  const target = state.target || 0;
  document.getElementById('target-bulan').textContent = formatRupiah(target);
  document.getElementById('input-target').value = target || '';

  drawRing('ring-keb', totals.Kebutuhan, target * 0.5, '#c17c3e', 'pct-keb');
  drawRing('ring-kei', totals.Keinginan, target * 0.3, '#c0392b', 'pct-kei');
  drawRing('ring-inv', totals.Investasi, target * 0.2, '#5a8a3a', 'pct-inv');
}

function drawRing(id, used, budget, color, pctId) {
  destroyChart(id);
  const pct = budget ? Math.min(used / budget * 100, 200) : 0;
  const filled = Math.min(pct, 100);
  const remain = Math.max(100 - filled, 0);
  charts[id] = new Chart(document.getElementById(id), {
    type: 'doughnut',
    data: { datasets: [{ data: [filled, remain], backgroundColor: [color, '#e5e9f2'], borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: true, aspectRatio: 1, plugins: { legend: { display: false }, tooltip: { enabled: false } }, cutout: '72%' }
  });
  document.getElementById(pctId).textContent = (budget ? pct : 0).toFixed(0) + '%';
}

function renderSixMonth(m, y) {
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const { m: mm, y: yy } = addMonths(m, y, -i);
    const trx = getTransactionsFor(mm, yy);
    const inc = sumBy(trx, 'pemasukan');
    const exp = sumBy(trx, 'pengeluaran');
    rows.push({ label: `${MONTHS_SHORT[mm]} ${yy}`, inc, exp, bal: inc - exp, count: trx.length });
  }
  const tbody = document.getElementById('six-month-body');
  tbody.innerHTML = rows.map(r => `<tr>
    <td>${r.label}</td>
    <td>${formatRupiah(r.inc)}</td>
    <td>${formatRupiah(r.exp)}</td>
    <td>${formatRupiah(r.bal)}</td>
    <td>${r.count}</td>
  </tr>`).join('');
  const avg = (k) => rows.reduce((s, r) => s + r[k], 0) / rows.length;
  document.getElementById('six-month-foot').innerHTML = `<tr>
    <td>RATA-RATA</td>
    <td>${formatRupiah(avg('inc'))}</td>
    <td>${formatRupiah(avg('exp'))}</td>
    <td>${formatRupiah(avg('bal'))}</td>
    <td>${avg('count').toFixed(0)}</td>
  </tr>`;

  destroyChart('sixmonth');
  const labels = rows.map(r => r.label).reverse();
  charts.sixmonth = new Chart(document.getElementById('chart-sixmonth'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Pemasukan', data: rows.map(r => r.inc).reverse(), backgroundColor: '#5a8a3a' },
        { label: 'Pengeluaran', data: rows.map(r => r.exp).reverse(), backgroundColor: '#c0392b' },
        { label: 'Sisa Saldo', data: rows.map(r => r.bal).reverse(), backgroundColor: '#2563eb' },
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: v => formatShort(v) } } } }
  });
}

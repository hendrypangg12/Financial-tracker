// Dashboard renderer
const charts = {};

function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); charts[key] = null; }
}

// Sapaan nama user (dari onboarding "Setup Dana Awal")
function renderGreeting() {
  const el = document.getElementById('dash-greeting');
  if (!el) return;
  const nama = (state.userName || '').trim();
  if (!nama) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `Halo, <b>${escapeHtmlDash(nama)}</b> 👋`;
}

function renderSubscriptionSummary() {
  const el = document.getElementById('subscription-summary');
  if (!el) return;
  if (typeof currentUser === 'undefined' || !currentUser) { el.hidden = true; el.innerHTML = ''; return; }

  const profile = typeof currentProfile !== 'undefined' ? currentProfile : null;
  const planNames = {
    free_trial: 'Uji Coba Gratis', trial: 'Akses 7 Hari', starter: 'Akses 7 Hari',
    monthly: 'Pro Bulanan', annual: 'Pro Tahunan', lifetime: 'Lifetime', pro: 'Pro',
  };
  const active = profile && typeof isPro === 'function' && isPro(profile);
  const planName = profile ? (planNames[profile.plan] || 'Belum berlangganan') : 'Status belum termuat';
  let detail = 'Periksa paket dan pilih cara pembayaran.';
  if (!profile) detail = 'Status paket belum dapat dibaca. Muat ulang untuk memeriksa akun.';
  else if (active && profile.expiresAt) {
    const date = new Date(profile.expiresAt);
    const end = Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    const days = typeof daysRemaining === 'function' ? daysRemaining(profile) : null;
    detail = `Aktif${end ? ` sampai ${end}` : ''}${days != null ? ` · ${days} hari tersisa` : ''}.`;
  } else if (active) detail = 'Paket aktif tanpa tanggal berakhir.';
  else if (profile.expiresAt) detail = 'Masa aktif paket sudah berakhir. Pilih paket untuk lanjut.';
  else detail = 'Belum ada paket aktif. Pilih paket untuk membuka fitur Pro.';

  el.hidden = false;
  el.innerHTML = `<div class="subscription-summary-copy"><span class="subscription-summary-label">PAKET AKUN</span><strong>${planName}${active ? ' · Aktif' : ''}</strong><small>${detail}</small></div><button type="button" class="subscription-summary-action" id="subscription-summary-action">Paket &amp; pembayaran <span aria-hidden="true">→</span></button>`;
  el.querySelector('#subscription-summary-action').onclick = () => showScreen('paywall');
}

function renderStartingBalancePrompt() {
  const el = document.getElementById('starting-balance-reminder');
  if (!el) return;
  const complete = state.startingBalance?.completed === true;
  el.hidden = complete;
  if (complete) return;
  el.innerHTML = `<div><b>Langkah pertama: setup dana awal</b><span>Masukkan saldo rekening, e-wallet, dan tunai agar ringkasanmu akurat. Kamu belum bisa mencatat transaksi sebelum memilih saldo atau Rp0.</span></div><button type="button" id="starting-balance-reminder-action">Setup sekarang →</button>`;
  el.querySelector('#starting-balance-reminder-action').onclick = () => window.openOnboardingManual?.();
}

// Panduan 3 langkah untuk user baru (menggantikan banner selamat datang).
function guideUid() {
  return (typeof currentUser !== 'undefined' && currentUser?.uid) || 'local';
}
function renderStartGuide() {
  const el = document.getElementById('start-guide');
  if (!el) return;
  const uid = guideUid();
  let dismissed = false, aiSeen = false;
  try {
    dismissed = localStorage.getItem('beruang-guide-dismissed:' + uid) === '1';
    aiSeen = localStorage.getItem('beruang-guide-ai:' + uid) === '1';
  } catch (_) {}
  const realTx = (state.transactions || []).filter(t => t.kategori !== 'Saldo Awal').length;
  const aiPaid = typeof hasAIAccess === 'function' && typeof currentProfile !== 'undefined' && hasAIAccess(currentProfile);
  const steps = [
    { id: 'tx', done: realTx > 0, title: 'Catat transaksi pertama', desc: 'Cukup ketik, misalnya "bakso 25rb"' },
    { id: 'ai', done: aiSeen, title: aiPaid ? 'Tanya AI Akuntan' : 'Kenalan dengan AI Akuntan',
      desc: aiPaid ? 'Coba: "Bulan ini aku boros di mana?"' : 'Asisten keuangan pribadi, di paket berbayar' },
    { id: 'tg', done: typeof tgIsLinked === 'function' && tgIsLinked(), title: 'Sambungkan Telegram',
      desc: 'Catat lewat chat + pengingat tagihan' },
  ];
  const doneCount = steps.filter(s => s.done).length;
  if (doneCount === steps.length && typeof trackOnce === 'function') trackOnce('guide_done');
  // User lama (sudah banyak catatan) tidak perlu panduan.
  if (dismissed || doneCount === steps.length || realTx >= 30) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `
    <div class="start-guide-head">
      <div><b>Mulai di sini</b><span>${doneCount} dari ${steps.length} selesai</span></div>
      <button type="button" class="start-guide-close" aria-label="Tutup panduan">×</button>
    </div>
    <div class="start-guide-bar"><i style="width:${Math.round(doneCount / steps.length * 100)}%"></i></div>
    <ol class="start-guide-steps">
      ${steps.map((s, i) => `
        <li class="${s.done ? 'is-done' : ''}">
          <button type="button" data-guide-step="${s.id}" ${s.done ? 'disabled' : ''}>
            <span class="start-guide-num">${s.done ? '✓' : i + 1}</span>
            <span class="start-guide-text"><b>${s.title}</b><small>${s.desc}</small></span>
            ${s.done ? '' : '<span class="start-guide-go" aria-hidden="true">→</span>'}
          </button>
        </li>`).join('')}
    </ol>`;
  el.querySelector('.start-guide-close').onclick = () => {
    try { localStorage.setItem('beruang-guide-dismissed:' + uid, '1'); } catch (_) {}
    renderDashboard();
  };
  el.querySelectorAll('[data-guide-step]').forEach(btn => {
    btn.onclick = () => {
      const step = btn.dataset.guideStep;
      if (step === 'tx') {
        if (typeof window.switchBeruangTab === 'function') window.switchBeruangTab('tambah');
        setTimeout(() => document.getElementById('chat-input')?.focus(), 350);
      } else if (step === 'ai') {
        const fab = document.getElementById('ai-fab');
        if (fab) fab.click();
        setTimeout(renderStartGuide, 300);
      } else if (step === 'tg' && typeof openTelegramLink === 'function') {
        openTelegramLink();
      }
    };
  });
}

// Kartu Aset / Kekayaan (info terpisah, gak ngaruh ke Sisa Saldo cashflow)
function renderAssets() {
  const el = document.getElementById('dash-assets');
  if (!el) return;
  const assets = state.assets || [];
  if (!assets.length) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  const total = (typeof assetsTotal === 'function') ? assetsTotal() : assets.reduce((s, a) => s + (Number(a.jumlah) || 0), 0);
  const icon = (j) => j === 'investasi' ? '📈' : (j === 'rekening' ? '💳' : '💼');
  const rows = assets.map(a => `
    <li style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid #f0e9d8;">
      <span style="font-size:17px;">${icon(a.jenis)}</span>
      <span style="flex:1;min-width:0;color:#4a3328;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtmlDash(a.nama || a.jenis || 'Aset')}</span>
      <span style="font-weight:700;color:#4a3328;">${formatRupiah(Number(a.jumlah) || 0)}</span>
      <button data-id="${a.id}" title="Hapus" style="flex:0 0 auto;border:none;background:#f7ede0;color:#b91c1c;width:28px;height:28px;border-radius:7px;cursor:pointer;font-size:16px;">×</button>
    </li>`).join('');
  el.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <h3>💎 Aset / Kekayaan</h3>
        <span style="font-size:11px;color:#8a7766;">di luar cashflow bulanan</span>
      </div>
      <div style="font-size:24px;font-weight:900;color:#8b5a2b;margin:2px 0 4px;">${formatRupiah(total)}</div>
      <ul style="list-style:none;padding:0;margin:6px 0 0;">${rows}</ul>
    </div>`;
  el.querySelectorAll('button[data-id]').forEach(btn => {
    btn.onclick = () => {
      if (typeof deleteAsset === 'function') deleteAsset(btn.dataset.id);
      renderAssets();
    };
  });
}

function escapeHtmlDash(s) {
  const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML;
}

// Ringkasan Hutang & Piutang di dashboard (biar gak perlu pindah tab)
function renderHutangSummary() {
  const el = document.getElementById('dash-hutang');
  if (!el) return;
  const all = state.hutangs || [];
  const piutang = all.filter(h => h.jenis === 'piutang' && !h.lunas).reduce((s, h) => s + (Number(h.nominal) || 0), 0);
  const hutang = all.filter(h => h.jenis === 'hutang' && !h.lunas).reduce((s, h) => s + (Number(h.nominal) || 0), 0);
  if (piutang === 0 && hutang === 0) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  const net = piutang - hutang;
  const netColor = net >= 0 ? 'var(--income)' : 'var(--expense)';
  const netStr = (net < 0 ? '-' : '') + formatRupiah(Math.abs(net)).replace(/^Rp\s*/, 'Rp ');
  el.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <h3>💸 Hutang &amp; Piutang</h3>
        <span class="dash-hutang-link" style="font-size:12px;color:#b08a3c;font-weight:600;cursor:pointer;">Lihat detail →</span>
      </div>
      <div style="display:flex;gap:10px;margin-top:4px;">
        <div style="flex:1;background:#fff;border:1px solid var(--line);border-radius:12px;padding:11px 13px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:.3px;color:var(--ink-soft);text-transform:uppercase;">🟢 Piutang</div>
          <div style="font-size:16px;font-weight:800;color:var(--income);margin-top:3px;">${formatRupiah(piutang)}</div>
          <div style="font-size:10px;color:var(--ink-soft);">orang utang ke kamu</div>
        </div>
        <div style="flex:1;background:#fff;border:1px solid var(--line);border-radius:12px;padding:11px 13px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:.3px;color:var(--ink-soft);text-transform:uppercase;">🔴 Hutang</div>
          <div style="font-size:16px;font-weight:800;color:var(--expense);margin-top:3px;">${formatRupiah(hutang)}</div>
          <div style="font-size:10px;color:var(--ink-soft);">kamu utang ke orang</div>
        </div>
      </div>
      <div style="margin-top:10px;font-size:13px;color:var(--ink-soft);">Posisi bersih: <b style="color:${netColor};">${netStr}</b></div>
    </div>`;
  const link = el.querySelector('.dash-hutang-link');
  if (link) link.onclick = () => {
    if (typeof window.switchBeruangTab === 'function') window.switchBeruangTab('hutang');
  };
}

function renderDashboard() {
  const m = state.selectedMonth, y = state.selectedYear;
  const trx = getCashflowTransactionsFor(m, y);
  const prev = addMonths(m, y, -1);
  const trxPrev = getCashflowTransactionsFor(prev.m, prev.y);

  const hasTransactions = Array.isArray(state.transactions) && state.transactions.some(t => !isOpeningBalanceTransaction(t));
  const emptyState = document.getElementById('dashboard-empty-state');
  const overview = document.getElementById('dashboard-overview');
  const moreAction = document.getElementById('dashboard-more-action');
  const dashboardPanel = document.getElementById('tab-dashboard');
  if (emptyState) emptyState.hidden = hasTransactions;
  if (overview) overview.hidden = !hasTransactions;
  if (moreAction) moreAction.hidden = !hasTransactions;
  if (dashboardPanel) dashboardPanel.classList.toggle('is-empty', !hasTransactions);
  if (!hasTransactions) {
    document.querySelectorAll('.dashboard-advanced').forEach(section => { section.hidden = true; });
    const detailsButton = document.getElementById('btn-dashboard-details');
    if (detailsButton) {
      detailsButton.textContent = 'Lihat analisis lengkap';
      detailsButton.setAttribute('aria-expanded', 'false');
    }
  }

  document.getElementById('dash-month-label').textContent = `${MONTHS[m]} ${y}`;
  renderSubscriptionSummary();
  renderStartingBalancePrompt();
  renderGreeting();
  renderStartGuide();
  if (emptyState && !document.getElementById('start-guide')?.hidden) emptyState.hidden = true;
  renderAssets();
  renderHutangSummary();
  if (typeof renderAnomalyBanner === 'function') renderAnomalyBanner();
  if (typeof renderReminder === 'function') renderReminder();
  // AI tetap tersedia melalui tombol asisten; ringkasan keuangan menjadi fokus dashboard.
  if (typeof renderTgBillPromo === 'function') renderTgBillPromo();

  const income = sumBy(trx, 'pemasukan');
  const expense = sumBy(trx, 'pengeluaran');
  const monthlyNet = income - expense;
  const balance = balanceThrough(m, y);
  const incomePrev = sumBy(trxPrev, 'pemasukan');
  const expensePrev = sumBy(trxPrev, 'pengeluaran');

  setKPIAnimated('kpi-income', income, formatRupiah, pctDelta(income, incomePrev), 'income');
  setKPIAnimated('kpi-expense', expense, (v) => `\u2212${formatRupiah(v)}`, pctDelta(expense, expensePrev), 'expense');
  setKPIAnimated('kpi-balance', balance, formatRupiah, null, 'income');
  // Saldo akumulatif tidak cocok dibanding % dengan bulan lalu; tampilkan selisih bulan ini.
  const balanceDelta = document.getElementById('kpi-balance-delta');
  if (balanceDelta) {
    const sign = monthlyNet >= 0 ? '+' : '\u2212';
    balanceDelta.textContent = `${sign}${formatRupiah(Math.abs(monthlyNet))} bulan ini`;
    balanceDelta.className = 'card-delta ' + (monthlyNet >= 0 ? 'up' : 'down');
  }
  setKPIAnimated('kpi-count', trx.length, (v) => String(Math.round(v)), pctDelta(trx.length, trxPrev.length), 'income');
  const balanceEl = document.getElementById('kpi-balance');
  if (balanceEl) balanceEl.style.color = balance >= 0 ? '#75d89a' : '#ff8278';

  renderDailyChart(trx, m, y);
  renderMiniReports(trx, trxPrev, income, expense, monthlyNet);
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

// Saldo adalah posisi kas berjalan, bukan hanya surplus/defisit bulan terpilih.
// Semua transaksi sampai akhir bulan dipakai supaya saldo bulan lalu terbawa.
function balanceThrough(month, year) {
  const cutoff = new Date(year, month + 1, 1).getTime();
  const setup = state.startingBalance?.completed === true ? state.startingBalance : null;
  const startDate = setup?.date ? parseISO(setup.date).getTime() : null;
  const initial = setup && startDate != null && !Number.isNaN(startDate) && startDate < cutoff
    ? Math.max(0, Number(setup.amount) || 0) : 0;
  return (state.transactions || []).reduce((total, transaction) => {
    if (isOpeningBalanceTransaction(transaction)) return total;
    const date = parseISO(transaction.tanggal);
    if (!(date instanceof Date) || Number.isNaN(date.getTime()) || date.getTime() >= cutoff) return total;
    if (startDate != null && date.getTime() < startDate) return total;
    const amount = Number(transaction.jumlah) || 0;
    return total + (transaction.jenis === 'pemasukan' ? amount : transaction.jenis === 'pengeluaran' ? -amount : 0);
  }, initial);
}

function setKPI(id, text, pct, goodDir) {
  document.getElementById(id).textContent = text;
  const delta = document.getElementById(id + '-delta');
  if (!delta || pct == null) return;
  const up = pct >= 0;
  const arrow = up ? '▲' : '▼';
  delta.textContent = `${arrow} ${Math.abs(pct).toFixed(0)}% vs Bulan Lalu`;
  delta.className = 'card-delta ' + (up === (goodDir === 'income') ? 'up' : 'down');
}

// Animated KPI dengan count-up (premium native feel)
function setKPIAnimated(id, target, formatFn, pct, goodDir) {
  const el = document.getElementById(id);
  if (!el) return;
  if (typeof animateNumber === 'function') {
    animateNumber(el, target, formatFn);
  } else {
    el.textContent = formatFn(target);
  }
  const delta = document.getElementById(id + '-delta');
  if (!delta || pct == null) return;
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
  if (topExp) items.push({ type: 'info', text: `🛒 Pengeluaran terbesar: ${topExp[0]} — −${formatRupiah(topExp[1])}.` });

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
  const expenseList = elId === 'top-expense';
  ol.innerHTML = rows.length
    ? rows.map(([k, v]) => `<li><span class="rank-name">${k}</span><span class="rank-val ${expenseList ? 'money-expense' : 'money-income'}">${expenseList ? '−' : ''}${formatRupiah(v)}</span></li>`).join('')
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
  if (pieTotalEl) {
    pieTotalEl.textContent = `${canvasId === 'chart-expense-cat' ? '−' : ''}${formatShort(total)}`;
    pieTotalEl.classList.toggle('money-expense', canvasId === 'chart-expense-cat');
    pieTotalEl.classList.toggle('money-income', canvasId !== 'chart-expense-cat');
  }

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
              return ` ${canvasId === 'chart-expense-cat' ? '−' : ''}${formatRupiah(ctx.parsed)}  (${pct}%)`;
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
  const expenseList = elId === 'compare-expense';
  ul.innerHTML = rows.length
    ? rows.map(r => `<li><span>${r.k}</span><span class="${expenseList ? 'money-expense' : 'money-income'}">${expenseList ? '−' : ''}${formatShort(r.n)}</span><span class="arr ${r.d >= 0 ? 'up' : 'down'}">${r.d >= 0 ? '▲' : '▼'}</span><span>${formatShort(Math.abs(r.d))}</span></li>`).join('')
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
  document.getElementById('total-kebutuhan').innerHTML = `<span class="money-expense">−${formatRupiah(totals.Kebutuhan)}</span>`;
  document.getElementById('total-keinginan').innerHTML = `<span class="money-expense">−${formatRupiah(totals.Keinginan)}</span>`;
  document.getElementById('total-investasi').innerHTML = `<span class="money-expense">−${formatRupiah(totals.Investasi)}</span>`;
}

function fillAlokasi(id, items) {
  const groups = groupBy(items, 'subKategori');
  const rows = Object.entries(groups).map(([k, v]) => [k, v.reduce((s, t) => s + +t.jumlah, 0)])
    .sort((a, b) => b[1] - a[1]);
  const ol = document.getElementById(id);
  ol.innerHTML = rows.length
    ? rows.map(([k, v]) => `<li><span>${k}</span><b class="money-expense">−${formatShort(v)}</b></li>`).join('')
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
  document.getElementById('input-target').value = (typeof fmtThousands === 'function') ? fmtThousands(target) : (target || '');

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
  const selectedIndex = y * 12 + m;
  const transactionIndexes = (state.transactions || [])
    .filter(t => !isOpeningBalanceTransaction(t))
    .map(t => parseISO(t.tanggal))
    .filter(d => d instanceof Date && !Number.isNaN(d.getTime()))
    .map(d => d.getFullYear() * 12 + d.getMonth())
    .filter(index => index <= selectedIndex);
  if (state.startingBalance?.completed && state.startingBalance.date) {
    const start = parseISO(state.startingBalance.date);
    if (!Number.isNaN(start.getTime())) transactionIndexes.push(start.getFullYear() * 12 + start.getMonth());
  }
  const firstIndex = transactionIndexes.length ? Math.min(...transactionIndexes) : selectedIndex;
  const monthCount = selectedIndex - firstIndex + 1;
  for (let i = 0; i < monthCount; i++) {
    const { m: mm, y: yy } = addMonths(m, y, -i);
    const trx = getCashflowTransactionsFor(mm, yy);
    const inc = sumBy(trx, 'pemasukan');
    const exp = sumBy(trx, 'pengeluaran');
    rows.push({ label: `${MONTHS_SHORT[mm]} ${yy}`, inc, exp, bal: balanceThrough(mm, yy), count: trx.length });
  }
  const tbody = document.getElementById('six-month-body');
  tbody.innerHTML = rows.map(r => `<tr>
    <td>${r.label}</td>
    <td class="money-income">${formatRupiah(r.inc)}</td>
    <td class="money-expense">−${formatRupiah(r.exp)}</td>
    <td class="${r.bal >= 0 ? 'money-income' : 'money-expense'}">${formatRupiah(r.bal)}</td>
    <td>${r.count}</td>
  </tr>`).join('');
  const avg = (k) => rows.reduce((s, r) => s + r[k], 0) / rows.length;
  document.getElementById('six-month-foot').innerHTML = `<tr>
    <td>RATA-RATA</td>
    <td class="money-income">${formatRupiah(avg('inc'))}</td>
    <td class="money-expense">−${formatRupiah(avg('exp'))}</td>
    <td class="${avg('bal') >= 0 ? 'money-income' : 'money-expense'}">${formatRupiah(avg('bal'))}</td>
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

// ============================================================
// AI ANOMALY ALERT — deteksi pola spending abnormal
// ============================================================
// Logika:
//   - Bandingkan spending per kategori 7 hari terakhir vs rata-rata 4 minggu sebelumnya
//   - Skip kategori dengan avg < Rp 50rb (noise)
//   - Alert kalau naik >50% (medium) atau >100% (high severity)
//   - Alert kalau turun drastis >80% AND avg > Rp 200rb (mungkin lupa catat)
//   - Max 3 anomalies ditampilkan (sorted by severity)
//   - Dismiss per kategori per minggu (localStorage)

const ANOMALY_DISMISS_KEY = 'anomaly-dismissed';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_AVG_THRESHOLD = 50000;        // Skip kategori avg < 50rb
const MIN_AVG_DROP_THRESHOLD = 200000;  // Drop alert hanya untuk kategori avg > 200rb
const INCREASE_THRESHOLD = 1.5;         // Naik >50%
const HIGH_INCREASE_THRESHOLD = 2.0;    // Naik >100% = high severity
const DROP_THRESHOLD = 0.2;             // Turun ke <20% = anomaly drop

function getCurrentWeekId() {
  const now = new Date();
  const year = now.getFullYear();
  // ISO week number
  const onejan = new Date(year, 0, 1);
  const week = Math.ceil((((now - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return `${year}-W${week}`;
}

function getDismissedAnomalies() {
  try {
    const raw = localStorage.getItem(ANOMALY_DISMISS_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    const currentWeek = getCurrentWeekId();
    // Clear stale weeks (only keep current week)
    if (data.week !== currentWeek) return { week: currentWeek, categories: [] };
    return data;
  } catch { return { week: getCurrentWeekId(), categories: [] }; }
}

function dismissAnomaly(category) {
  const data = getDismissedAnomalies();
  if (!data.categories.includes(category)) {
    data.categories.push(category);
    try { localStorage.setItem(ANOMALY_DISMISS_KEY, JSON.stringify(data)); } catch {}
  }
}

function isDismissed(category) {
  return getDismissedAnomalies().categories.includes(category);
}

function detectSpendingAnomalies() {
  if (!state || !Array.isArray(state.transactions) || state.transactions.length < 10) return [];

  const now = new Date();
  const thisWeekStart = now.getTime() - ONE_WEEK_MS;
  const fourWeeksAgoStart = now.getTime() - 5 * ONE_WEEK_MS;

  // Group by kategori
  const byCat = {};
  for (const tx of state.transactions) {
    if (tx.jenis !== 'pengeluaran') continue;
    const cat = (tx.kategori || 'Lainnya').trim();
    const txTime = new Date(tx.tanggal).getTime();
    if (isNaN(txTime)) continue;
    const amount = Number(tx.jumlah) || 0;
    if (amount <= 0) continue;

    if (!byCat[cat]) byCat[cat] = { thisWeek: 0, prev4Weeks: [0, 0, 0, 0] };

    if (txTime >= thisWeekStart && txTime <= now.getTime()) {
      byCat[cat].thisWeek += amount;
    } else if (txTime >= fourWeeksAgoStart && txTime < thisWeekStart) {
      const weeksAgo = Math.floor((thisWeekStart - txTime) / ONE_WEEK_MS);
      if (weeksAgo >= 0 && weeksAgo < 4) {
        byCat[cat].prev4Weeks[weeksAgo] += amount;
      }
    }
  }

  const anomalies = [];
  for (const [cat, data] of Object.entries(byCat)) {
    const sumPrev = data.prev4Weeks.reduce((a, b) => a + b, 0);
    const avgPrev = sumPrev / 4;

    if (avgPrev < MIN_AVG_THRESHOLD) continue;
    if (isDismissed(cat)) continue;

    const ratio = data.thisWeek / avgPrev;
    const percentChange = (ratio - 1) * 100;

    if (ratio >= HIGH_INCREASE_THRESHOLD) {
      anomalies.push({ category: cat, thisWeek: data.thisWeek, avgWeek: avgPrev, percentChange, severity: 'high', type: 'increase' });
    } else if (ratio >= INCREASE_THRESHOLD) {
      anomalies.push({ category: cat, thisWeek: data.thisWeek, avgWeek: avgPrev, percentChange, severity: 'medium', type: 'increase' });
    } else if (ratio < DROP_THRESHOLD && avgPrev >= MIN_AVG_DROP_THRESHOLD) {
      anomalies.push({ category: cat, thisWeek: data.thisWeek, avgWeek: avgPrev, percentChange, severity: 'low', type: 'decrease' });
    }
  }

  // Sort: high > medium > low, lalu by magnitude
  const sevOrder = { high: 3, medium: 2, low: 1 };
  anomalies.sort((a, b) => sevOrder[b.severity] - sevOrder[a.severity] || Math.abs(b.percentChange) - Math.abs(a.percentChange));

  return anomalies.slice(0, 3); // Max 3 banners
}

function getCategoryEmoji(cat) {
  const c = cat.toLowerCase();
  if (c.includes('makan') || c.includes('food') || c.includes('jajan')) return '🍜';
  if (c.includes('transport') || c.includes('bensin') || c.includes('grab') || c.includes('gojek')) return '🚗';
  if (c.includes('belanja') || c.includes('shop')) return '🛍️';
  if (c.includes('hiburan') || c.includes('entertainment') || c.includes('netflix')) return '🎬';
  if (c.includes('kesehatan') || c.includes('obat') || c.includes('dokter')) return '🏥';
  if (c.includes('tagihan') || c.includes('listrik') || c.includes('air')) return '💡';
  if (c.includes('kopi') || c.includes('cafe')) return '☕';
  if (c.includes('pulsa') || c.includes('internet') || c.includes('paket data')) return '📱';
  return '💸';
}

function formatAnomalyMessage(a) {
  const emoji = getCategoryEmoji(a.category);
  const thisWeekFmt = formatRupiah(a.thisWeek);
  const avgWeekFmt = formatRupiah(a.avgWeek);
  const pct = Math.round(Math.abs(a.percentChange));

  if (a.type === 'increase') {
    if (a.severity === 'high') {
      return {
        title: `${emoji} ${a.category} naik ${pct}% minggu ini`,
        body: `Lu spending <b>${thisWeekFmt}</b> di kategori ini — naik drastis dari rata-rata mingguan <b>${avgWeekFmt}</b>. Ada acara khusus? Atau lupa double-record?`,
      };
    }
    return {
      title: `${emoji} ${a.category} naik ${pct}%`,
      body: `Minggu ini <b>${thisWeekFmt}</b> vs rata-rata <b>${avgWeekFmt}</b>. Worth dicek bos — mungkin ada pola baru yang bisa dipangkas.`,
    };
  }
  return {
    title: `${emoji} ${a.category} sepi banget minggu ini`,
    body: `Cuma <b>${thisWeekFmt}</b> minggu ini — turun dari rata-rata <b>${avgWeekFmt}</b>. Memang lagi hemat, atau lupa catat?`,
  };
}

function renderAnomalyBanner() {
  const container = document.getElementById('anomaly-banner');
  if (!container) return;

  const anomalies = detectSpendingAnomalies();
  if (anomalies.length === 0) { container.innerHTML = ''; return; }

  const html = anomalies.map(a => {
    const { title, body } = formatAnomalyMessage(a);
    const sevClass = `anomaly-${a.severity}`;
    return `
      <div class="anomaly-card ${sevClass}" data-cat="${escapeHtml(a.category)}">
        <div class="anomaly-icon">🧠</div>
        <div class="anomaly-content">
          <div class="anomaly-title">${title}</div>
          <div class="anomaly-body">${body}</div>
        </div>
        <button class="anomaly-dismiss" data-cat="${escapeHtml(a.category)}" aria-label="Tutup">×</button>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="anomaly-wrap">
      <div class="anomaly-header">
        <span class="anomaly-label">🧠 Insight AI · ${anomalies.length} pola perlu dicek</span>
      </div>
      ${html}
    </div>
  `;

  // Wire dismiss buttons
  container.querySelectorAll('.anomaly-dismiss').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      dismissAnomaly(cat);
      btn.closest('.anomaly-card').style.transition = 'opacity .25s, max-height .25s';
      btn.closest('.anomaly-card').style.opacity = '0';
      btn.closest('.anomaly-card').style.maxHeight = '0';
      setTimeout(() => renderAnomalyBanner(), 280);
    });
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

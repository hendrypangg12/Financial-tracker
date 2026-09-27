// Corong penjualan: kirim hitungan ANONIM ke server BerUang (bukan Google Analytics).
// Server hanya menambah angka per hari; tiap user dihitung sekali per langkah.
// Hanya user yang daftar SETELAH fitur ini aktif yang dihitung, supaya angka
// corong tidak tercampur user lama.
const METRICS_ENDPOINT = 'https://berstock-bot.hendrypangg12.workers.dev/api/metric';
const METRICS_COHORT_START = Date.parse('2026-09-27T00:00:00Z');
const metricsInFlight = new Set();

function metricsSource() {
  return window.Capacitor?.isNativePlatform?.() ? 'android' : 'web';
}

function metricsUserCreatedAt() {
  if (typeof currentUser === 'undefined' || !currentUser) return 0;
  return Date.parse(currentUser.metadata?.creationTime || '') || 0;
}

function metricsEligible() {
  return metricsUserCreatedAt() >= METRICS_COHORT_START;
}

function trackOnce(event) {
  try {
    if (!metricsEligible() || typeof authenticatedHeaders !== 'function') return;
    const key = 'beruang-m:' + currentUser.uid + ':' + event;
    if (localStorage.getItem(key) === '1' || metricsInFlight.has(key)) return;
    metricsInFlight.add(key);
    authenticatedHeaders()
      .then(headers => fetch(METRICS_ENDPOINT, { method: 'POST', headers, body: JSON.stringify({ event, source: metricsSource() }) }))
      .then(res => { if (res.ok) { try { localStorage.setItem(key, '1'); } catch (_) {} } })
      .catch(() => {})
      .finally(() => metricsInFlight.delete(key));
  } catch (_) {}
}

// Transaksi "asli" (bukan saldo awal dari Setup Dana Awal).
function metricsRealTxCount() {
  return (state.transactions || []).filter(t => t.kategori !== 'Saldo Awal').length;
}

function trackTxMilestones() {
  const n = metricsRealTxCount();
  if (n >= 1) trackOnce('first_tx');
  if (n >= 5) trackOnce('tx5');
}

// Dipanggil setiap app dibuka dengan profil terbaca.
function trackSessionMilestones(profile) {
  if (!metricsEligible()) return;
  const created = metricsUserCreatedAt();
  trackOnce('signup');
  const createdDay = typeof toISODate === 'function' ? toISODate(new Date(created)) : '';
  if (createdDay && typeof todayISO === 'function' && todayISO() > createdDay) trackOnce('returned');
  const paid = profile && profile.plan && profile.plan !== 'free_trial' && profile.plan !== 'pending'
    && typeof isPro === 'function' && isPro(profile);
  if (paid) trackOnce('paid');
  trackTxMilestones();
}

window.trackOnce = trackOnce;
window.trackTxMilestones = trackTxMilestones;
window.trackSessionMilestones = trackSessionMilestones;

// Presence real-time: daftarin "saya lagi buka app" ke Firebase Realtime DB.
// Dipakai buat live counter di kantor virtual (pt-beruang-pang-office.html).
// Defensif total: kalau RTDB belum aktif / offline → diem aja, app jalan normal.
(function () {
  if (typeof firebase === 'undefined' || !firebase.database) return;

  let db;
  try { db = firebase.database(); } catch (e) { return; }

  // app name: di-set via window.PRESENCE_APP sebelum script ini (default 'beruang')
  const appName = (typeof window !== 'undefined' && window.PRESENCE_APP) ? String(window.PRESENCE_APP) : 'beruang';
  const id = 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  let ref = null, registered = false;

  function stamp() {
    return { t: firebase.database.ServerValue.TIMESTAMP, app: appName };
  }
  function register() {
    if (registered) return;
    try {
      ref = db.ref('presence/' + id);
      ref.onDisconnect().remove();        // auto-hapus pas tab close / koneksi putus
      ref.set(stamp());
      registered = true;
    } catch (e) { /* abaikan */ }
  }
  function unregister() {
    if (!registered) return;
    try { ref.onDisconnect().cancel(); ref.remove(); } catch (e) {}
    registered = false;
  }
  function heartbeat() {
    if (!registered) return;
    try { ref.set(stamp()); } catch (e) {}
  }

  try {
    if (document.visibilityState === 'visible') register();
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') register(); else unregister();
    });
    window.addEventListener('pagehide', unregister);
    setInterval(heartbeat, 30000); // refresh biar gak ke-anggap stale kalau onDisconnect telat
  } catch (e) { /* abaikan */ }
})();

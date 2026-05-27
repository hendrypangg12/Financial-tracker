// Service worker BerBisnis — offline + auto-update versi terbaru.
// Scope: /tokountung/. KONSERVATIF: cuma intercept same-origin + CDN statis.
// Semua call cross-origin (Firebase runtime, worker cloud-sync /api/sync, dll) di-BYPASS
// total → gak ganggu sync. Non-GET juga bypass (POST sync, sendBeacon).
const CACHE_VERSION = 'berbisnis-v1';
const CORE = [
  './',
  './app.html',
  './styles.css?v=24',
  './assets/logo-berbisnis.png?v=3',
  './js/firebase-config.js?v=4',
  '../js/presence.js?v=2',
  './js/auth.js?v=7',
  './js/admin.js?v=2',
  './js/firestore-sync.js?v=1',
  './js/data.js?v=1',
  './js/utils.js?v=2',
  './js/storage.js?v=4',
  './js/products.js?v=5',
  './js/sales.js?v=7',
  './js/restock.js?v=5',
  './js/reports.js?v=5',
  './js/receipt.js?v=4',
  './js/piutang.js?v=2',
  './js/customers.js?v=2',
  './js/edit-sale.js?v=2',
  './js/onboarding.js?v=1',
  './js/cloud-sync.js?v=4',
  './js/app.js?v=21',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    // cache satu-satu (bukan addAll yang atomic) biar 1 file gagal gak batalin semua
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.all(CORE.map((u) => cache.add(u).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // POST sync / beacon → biarin browser
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const cacheableCDN = /^(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com)$/.test(url.host);
  // Bypass semua selain same-origin & CDN statis (Firebase runtime, RTDB, worker, dll)
  if (!sameOrigin && !cacheableCDN) return;

  // NETWORK-FIRST untuk HTML → update CSS/JS langsung ke-pickup tanpa uninstall
  const isHTML = req.destination === 'document' || /\.html(\?|$)/.test(url.pathname);
  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && sameOrigin) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || new Response('Offline', { status: 503 })))
    );
    return;
  }

  // CACHE-FIRST untuk asset (CSS/JS/img) — pakai cache buster ?v= di URL
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res.ok && (sameOrigin || cacheableCDN)) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});

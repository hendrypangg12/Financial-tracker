// Service worker untuk BerUang — cache first strategy agar aplikasi bisa jalan offline
const CACHE_VERSION = 'ruvy-v68';
const CORE = [
  './',
  './index.html',
  './app.html',
  './landing.html',
  './styles.css?v=68',
  './manifest.json',
  './ruvy.css?v=68',
  './assets/icons/ruvy-mark.svg',
  './js/preferences.js?v=68',
  './js/i18n.js?v=68',
  './js/wallets.js?v=68',
  './js/ruvy.js?v=68',
  './assets/icons/ruvy-192.png',
  './assets/icons/ruvy-512.png',
  './js/data.js?v=68',
  './js/utils.js?v=68',
  './js/firebase-config.js?v=68',
  './js/presence.js?v=68',
  './js/storage.js?v=68',
  './js/parser.js?v=68',
  './js/sync.js?v=68',
  './js/auth.js?v=68',
  './js/admin.js?v=68',
  './js/dashboard.js?v=68',
  './js/anomaly.js?v=68',
  './js/pages.js?v=68',
  './js/reports.js?v=68',
  './js/app.js?v=68',
  './js/metrics.js?v=68',
  './js/goal.js?v=68',
  './js/hutang.js?v=68',
  './js/ai-advisor.js?v=68',
  './js/recurring.js?v=68',
  './js/telegram-link.js?v=68',
  './js/onboarding.js?v=68',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE).catch(() => {}))
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
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/firebaseio|firebasedatabase|googleapis|firebase\.com|workers\.dev/.test(url.host)) return;

  // NETWORK-FIRST untuk HTML (app.html, index.html, landing.html)
  // Biar update CSS/JS langsung ke-pickup tester tanpa harus uninstall.
  // Fallback ke cache kalau offline.
  const isHTML = req.destination === 'document' || /\.html(\?|$)/.test(url.pathname);
  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && url.origin === self.location.origin) {
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
          const isSameOrigin = url.origin === self.location.origin;
          const isCDN = /(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com|gstatic\.com)/.test(url.host);
          if ((isSameOrigin || isCDN) && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});

// Service worker untuk BerUang — cache first strategy agar aplikasi bisa jalan offline
const CACHE_VERSION = 'beruang-v39';
const CORE = [
  './',
  './index.html',
  './app.html',
  './landing.html',
  './styles.css?v=41',
  './manifest.json',
  './assets/logo-berbisnis.png?v=3',
  './assets/logo-beruang.png',
  './assets/mascot-beruang.png',
  './js/data.js?v=20',
  './js/utils.js?v=21',
  './js/firebase-config.js?v=22',
  './js/presence.js?v=2',
  './js/storage.js?v=23',
  './js/parser.js?v=20',
  './js/sync.js?v=24',
  './js/auth.js?v=22',
  './js/admin.js?v=20',
  './js/dashboard.js?v=26',
  './js/pages.js?v=21',
  './js/app.js?v=38',
  './js/hutang.js?v=2',
  './js/ai-advisor.js?v=8',
  './js/recurring.js?v=1',
  './js/telegram-link.js?v=4',
  './js/onboarding.js?v=6',
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

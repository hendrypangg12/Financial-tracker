// Service worker untuk BerUang — cache first strategy agar aplikasi bisa jalan offline
const CACHE_VERSION = 'beruang-v7';
const CORE = [
  './',
  './index.html',
  './app.html',
  './landing.html',
  './styles.css?v=19',
  './manifest.json',
  './assets/logo-beruang.png',
  './assets/mascot-beruang.png',
  './js/data.js?v=19',
  './js/utils.js?v=19',
  './js/firebase-config.js?v=19',
  './js/storage.js?v=19',
  './js/parser.js?v=19',
  './js/sync.js?v=19',
  './js/auth.js?v=19',
  './js/admin.js?v=19',
  './js/dashboard.js?v=19',
  './js/pages.js?v=19',
  './js/app.js?v=19',
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
  if (/firebaseio|googleapis|firebase\.com/.test(url.host)) return;
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

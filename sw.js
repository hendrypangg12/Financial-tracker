// Service worker untuk BerUang — cache first strategy agar aplikasi bisa jalan offline
const CACHE_VERSION = 'beruang-v2';
const CORE = [
  './',
  './index.html',
  './styles.css?v=14',
  './manifest.json',
  './assets/logo-beruang.png',
  './assets/mascot-beruang.png',
  './js/data.js?v=14',
  './js/utils.js?v=14',
  './js/storage.js?v=14',
  './js/parser.js?v=14',
  './js/dashboard.js?v=14',
  './js/pages.js?v=14',
  './js/app.js?v=14',
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
  // Hanya cache GET request untuk file lokal (bukan API/cross-origin)
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // Cache file-file lokal dan library CDN
          const url = new URL(req.url);
          const isSameOrigin = url.origin === self.location.origin;
          const isCDN = /(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)/.test(url.host);
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

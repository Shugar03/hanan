/* Hanan · service worker (generado en el build). Precachea la app y los fixtures para modo avión. */
const VERSION = 'hanan-__VERSION__';
const PRECACHE = __PRECACHE__;
const TILES = 'hanan-tiles';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== TILES && k !== 'hanan-runtime').map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Las APIs (Open-Meteo, CelesTrak, Worker) las maneja la app con su propio caché y fallback.
  if (/open-meteo|celestrak|\/api\//.test(url.href)) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html', { ignoreSearch: true }).then((r) => r || caches.match('./'))));
    return;
  }
  const isTile = url.hostname === 'server.arcgisonline.com';
  const isFont = /fonts\.(googleapis|gstatic)\.com/.test(url.hostname);
  if (url.origin === location.origin || isTile || isFont) {
    e.respondWith(caches.match(req, { ignoreSearch: url.origin === location.origin }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(isTile ? TILES : 'hanan-runtime').then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => hit || Response.error())));
  }
});

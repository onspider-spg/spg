// Version 1.0 | 13 MAR 2026 | Siam Palette Group
const CACHE = 'spg-home-v1';
const ASSETS = [
  '/spg/',
  '/spg/css/styles_home.css',
  '/spg/js/api_home.js',
  '/spg/js/app_home.js',
  '/spg/js/screens_home.js',
  '/spg/js/screens2_home.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k !== CACHE).map(k => caches.delete(k))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // API calls — always network
  if (url.pathname.includes('/api') || url.search.includes('action=')) return;
  // Font CDN — cache first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    })));
    return;
  }
  // Local assets — network first, fallback cache
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request)));
  }
});

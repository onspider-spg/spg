// Version 1.1 | 17 MAR 2026 | Siam Palette Group
// v1.1: Add missing assets, bypass HTTP cache, remove unused Font CDN logic
const CACHE = 'spg-home-v2';
const ASSETS = [
  '/spg/',
  '/spg/css/styles_home.css',
  '/spg/js/api_home.js',
  '/spg/js/app_home.js',
  '/spg/js/screens_home.js',
  '/spg/js/screens2_home.js',
  '/spg/js/admin_home.js',
  '/spg/js/master_home.js',
  '/spg/js/screens3_home.js'
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
  // Local assets — network first (bypass HTTP cache), fallback SW cache
  if (url.origin === location.origin) {
    e.respondWith(fetch(e.request.url, { cache: 'no-cache' }).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request)));
  }
});

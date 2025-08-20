const SHELL_CACHE = 'ps-shell-v1';
const JSON_CACHE = 'ps-json-v1';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/theme.css',
  '/js/main.js',
  '/js/consent.js',
  '/js/pwa.js',
  '/favicon.ico',
  '/manifest.webmanifest',
  '/images/icons/icon-192-maskable.png',
  '/images/icons/icon-256-maskable.png',
  '/images/icons/icon-384-maskable.png',
  '/images/icons/icon-512-maskable.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => ![SHELL_CACHE, JSON_CACHE].includes(k)).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.destination === 'video' || req.destination === 'audio' ||
      url.hostname.includes('youtube.com') || url.hostname.includes('ytimg.com') || url.hostname.includes('googlevideo.com')) {
    return;
  }

  if (req.destination === 'style' || req.destination === 'script' || req.destination === 'font') {
    event.respondWith(cacheFirst(req, SHELL_CACHE));
    return;
  }

  if (url.pathname.endsWith('.json') && url.pathname !== '/config.json') {
    event.respondWith(networkFirst(req, JSON_CACHE));
    return;
  }
});

function cacheFirst(req, cacheName) {
  return caches.open(cacheName).then(cache =>
    cache.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200) {
          cache.put(req, res.clone());
        }
        return res;
      });
    })
  );
}

function networkFirst(req, cacheName) {
  return Promise.race([
    fetch(req).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(cacheName).then(cache => cache.put(req, copy));
        return res;
      }
      throw new Error('Bad response');
    }),
    new Promise((_, reject) => setTimeout(reject, 3000))
  ]).catch(() => {
    return caches.open(cacheName).then(cache => cache.match(req)).then(res => {
      if (res) {
        self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({ type: 'json-fallback', url: req.url }));
        });
      }
      return res;
    });
  });
}

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

/* Minimal Service Worker: explicit tiny precache, no runtime routing */
const CACHE_VERSION = 'v1.0.0'; // bump to invalidate
const CACHE_NAME = `pakstream-${CACHE_VERSION}`;

// EXPLICIT file list only; keep this tiny and only first-party assets
const PRECACHE_URLS = [
  '/',                     // or '/index.html' if your host requires
  '/css/theme.css',
  '/css/style.css',
  '/css/z-layers.css',
  '/js/main.js',
  '/js/youtube.js',
  '/js/radio.js',
  '/js/diagnostics.js',
  '/js/ad-config.js',
  '/js/ad-slot.js'
  // DO NOT add JSON/data/media endpoints here
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  // Activate immediately on first install
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k.startsWith('pakstream-') && k !== CACHE_NAME)
            .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ONLY serve from precache for those exact URLs; no runtime caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Same-origin only
  if (url.origin !== location.origin) return;

  // Only respond for explicit precache URLs
  if (!PRECACHE_URLS.includes(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      return cached || fetch(event.request);
    })
  );
});

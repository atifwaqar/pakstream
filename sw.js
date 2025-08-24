/* PakStream PWA Service Worker */
const CACHE_NAME = "pakstream-shell-v1";
const PRECACHE_URLS = [
  "/",
  "/css/ads.css",
  "/css/media-hub.css",
  "/css/style.css",
  "/css/theme-01-neo-mint.css",
  "/css/theme-02-miami-sunset.css",
  "/css/theme-03-aurora.css",
  "/css/theme-04-sakura.css",
  "/css/theme-05-midnight-indigo.css",
  "/css/theme-06-ocean-breeze.css",
  "/css/theme-07-forest-bathing.css",
  "/css/theme-08-sandstone.css",
  "/css/theme-09-minimal-gray.css",
  "/css/theme-10-warm-minimal.css",
  "/css/theme-11-lavender-dream.css",
  "/css/theme-12-citrus-punch.css",
  "/css/theme-13-electric-blueberry.css",
  "/css/theme-14-rose-gold.css",
  "/css/theme-15-copper-teal.css",
  "/css/theme-16-arctic-ice.css",
  "/css/theme-17-noir-luxe.css",
  "/css/theme-18-vaporwave.css",
  "/images/icons/icon-192-maskable.png",
  "/images/icons/icon-512-maskable.png",
  "/index.html",
  "/404.html",
  "/js/404.js",
  "/manifest.webmanifest",
  "/offline.html"
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).catch(() => { /* ignore */ })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()));
    await self.clients.claim();
  })());
});

function isMedia(url) {
  return /(\.mp3|\.aac|\.m3u8|\.mp4|\.webm|\.ogg|\.flac|\.wav)(\?|$)/i.test(url.pathname);
}

function isStaticAsset(url) {
  return /(\.css|\.js|\.png|\.jpg|\.jpeg|\.svg|\.webp|\.ico|\.woff2?|\.ttf)(\?|$)/i.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return; // never touch non-GET
  if (url.origin !== location.origin) return; // never cache cross-origin (e.g., YouTube, radio CDNs)

  // Avoid caching explicit media
  if (isMedia(url) || ['audio','video'].includes(req.destination)) {
    return; // let it hit the network
  }

  // App-shell navigation: network-first, offline fallback
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        if (fresh.status === 404) {
          const notFound = await cache.match('/404.html');
          return notFound || fresh;
        }
        // Optionally update cache
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE_NAME);
        const offline = await cache.match('/offline.html');
        return offline || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
    return;
  }

  // Static assets: stale-while-revalidate
  if (isStaticAsset(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then((res) => {
        cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })());
    return;
  }
});

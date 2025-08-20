const CACHE_NAME = 'pakstream-image-cache-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.destination === 'image') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(req).then(resp => {
          if (resp) return resp;
          return fetch(req).then(networkResp => {
            if (networkResp && networkResp.status === 200) {
              cache.put(req, networkResp.clone());
            }
            return networkResp;
          });
        })
      )
    );
  }
});

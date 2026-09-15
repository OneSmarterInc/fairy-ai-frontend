const CACHE_NAME = 'fairy-ai-v3';
const IMAGE_ASSETS = [
  '/assets/fairy.png',
  '/assets/dora.png',
  '/assets/dora1.png',
  '/assets/dora2.png',
  '/assets/dora3.png',
  '/assets/dora4.png',
  '/assets/jian.png',
  '/assets/nobi.png',
  '/assets/nobi1.png',
  '/assets/siju.png'
];

self.addEventListener('install', (event) => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(IMAGE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  // Claim all clients immediately so the new SW controls pages right away
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;
  // Don't cache API requests
  if (event.request.url.includes('/api/')) return;

  const url = new URL(event.request.url);
  const isImage = IMAGE_ASSETS.some((asset) => url.pathname === asset);

  if (isImage) {
    // Cache-first for static image assets (they rarely change)
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
  } else {
    // Network-first for everything else (HTML, JS, CSS) so deploys are picked up instantly
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
    );
  }
});

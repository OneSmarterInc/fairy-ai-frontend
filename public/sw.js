const CACHE_NAME = 'fairy-ai-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
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
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;
  // Don't cache API requests
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      
      return fetch(event.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // Cache successful responses for subsequent loads
          if (response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      }).catch(() => {
        // Fallback for offline if not in cache (e.g., return index.html for navigation)
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

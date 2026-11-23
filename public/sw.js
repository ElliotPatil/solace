const CACHE_NAME = 'solace-shell-v7';
const SHELL = ['/', '/manifest.json', '/icons/solace.svg', '/icons/solace.png', '/icons/solace-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Always ask the network for HTML so new deployments are not trapped
  // behind a previously cached app shell. Keep the cached shell as offline fallback.
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Vite assets are content-hashed, so cache-first is safe for these immutable URLs.
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok && (request.destination === 'script' || request.destination === 'style' || request.destination === 'image' || request.url.includes('/assets/'))) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }))
  );
});

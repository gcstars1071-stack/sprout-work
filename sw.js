const CACHE_NAME = 'sprout-work-v3';
const ASSETS = ['./', './index.html', './app', './pricing.html', './docs.html', './manifest.json', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// tapping a notification focuses an existing app window, or opens one
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes('/app') && 'focus' in c) return c.focus();
      }
      if (list.length && 'focus' in list[0]) return list[0].focus();
      if (self.clients.openWindow) return self.clients.openWindow('./app');
    })
  );
});

// network-first: always try to get the latest file, fall back to cache when offline
// only same-origin GET requests are cacheable — skip Supabase/auth POST calls and cross-origin requests
self.addEventListener('fetch', (event) => {
  const isCacheable = event.request.method === 'GET' && new URL(event.request.url).origin === self.location.origin;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (isCacheable) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      })
      .catch(() => (isCacheable ? caches.match(event.request) : Promise.reject()))
  );
});

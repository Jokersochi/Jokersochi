/* Drop-in SW template with versioned cache and safer fetch */
const CACHE_NAME = 'app-v1.0.0';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  // add more critical assets here
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
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

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Static assets: cache-first
  if (PRECACHE.some((p) => url.pathname === p || url.pathname.startsWith(p))) {
    event.respondWith(caches.match(req).then((r) => r || fetch(req)));
    return;
  }
  // Default: network-first with fallback
  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req))
  );
});

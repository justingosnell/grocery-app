/*
  Basic service worker with cache-first app shell for localhost PWA.
  - Caches core assets on install
  - Cleans up old caches on activate
  - Runtime strategy: network-first for API calls, cache-first for static assets
*/

const SW_VERSION = 'v1.1.0';
const CACHE_NAME = `grocery-app-${SW_VERSION}`;
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/script.js',
  '/secondary_final.css',
  '/style.css',
  '/style_updated.css',
  '/secondary.css',
  '/logo.png',
  '/list-logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/') || url.pathname === '/health';
}

self.addEventListener('fetch', (event) => {
  const reqUrl = new URL(event.request.url);

  // Only handle same-origin for simplicity
  if (reqUrl.origin !== self.location.origin) return;

  if (isApiRequest(reqUrl)) {
    // Network-first for API
    event.respondWith(
      fetch(event.request).then((res) => {
        // Optionally: clone and cache successful GETs
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // For navigation requests, serve the app shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => cached || fetch(event.request))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      }).catch(() => {
        // Optional: return a fallback for images/fonts
        return caches.match('/index.html');
      });
    })
  );
});
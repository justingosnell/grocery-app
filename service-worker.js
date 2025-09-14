const CACHE_NAME = 'grocery-list-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/script.js',
    '/styles.css', // Assuming I'll change this later
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

self.addEventListener('install', event => {
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                
                // No cache match, fetch from network
                return fetch(event.request).then(
                    function(response) {
                        // Check if we received a valid response
                        if(!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and can only be read once. We need to clone it to send
                        // a copy to the browser and a copy to the cache.
                        const responseToCache = response.clone();
                        
                        // Check if the request is a GET and not a chrome extension
                        if (event.request.method === 'GET' && !event.request.url.includes('chrome-extension')) {
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }

                        return response;
                    }
                );
            })
            .catch(() => {
                // This is a common error handler for when the network is unavailable.
                // You could serve an offline page here if you wanted.
                console.log('Fetch failed, serving cached content.');
                // Example: return caches.match('/offline.html');
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
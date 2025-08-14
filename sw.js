// sw.js
const CACHE_NAME = 'grocery-list-cache-v1';

// List all the assets you want to cache for offline use
const urlsToCache = [
  '/',
  '/index.html',
  '/script.js',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install event: Caches all the necessary assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event: Serves cached assets first, then falls back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return from cache if found
        if (response) {
          return response;
        }

        // Clone the request because it's a stream and can only be consumed once
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response because it's a stream
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

// Sync event: This is triggered when the user comes back online.
// It handles "offline-save-list" events.
self.addEventListener('sync', event => {
  if (event.tag === 'offline-save-list') {
    console.log('Sync event fired! Attempting to save offline lists.');
    event.waitUntil(
      new Promise(resolve => {
        // Retrieve the offline lists from local storage
        const offlineSavedLists = JSON.parse(localStorage.getItem('offlineSavedLists')) || {};

        // In a real-world app, you would send this data to a server.
        // For this local app, we'll simulate the save by merging it with the main savedLists data.
        const savedLists = JSON.parse(localStorage.getItem('savedLists')) || {};
        
        // Merge the offline and online lists
        Object.assign(savedLists, offlineSavedLists);
        localStorage.setItem('savedLists', JSON.stringify(savedLists));
        
        // Clear the temporary offline storage
        localStorage.removeItem('offlineSavedLists');
        
        console.log('Offline lists have been saved and merged.');
        resolve();
      })
    );
  }
});

// Activate event: Clears old caches to save storage space
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});
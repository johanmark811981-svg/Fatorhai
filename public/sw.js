const CACHE_NAME = 'fawateery-v3';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-icon.svg',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap'
];

// Install event: cache static assets safely
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force active immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Pre-caching static assets for iOS PWA');
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (assetUrl) => {
          try {
            const response = await fetch(assetUrl, { cache: 'no-cache' });
            if (response && response.status === 200) {
              await cache.put(assetUrl, response);
            }
          } catch (err) {
            console.warn('[SW] Could not precache item:', assetUrl, err);
          }
        })
      );
    })
  );
});

// Activate event: clean up older caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim(); // Take control of all open pages immediately
});

// Fetch event: Network-first with immediate cache backup for offline functionality
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip non-http(s) schemes
  if (!url.protocol.startsWith('http')) return;

  // Skip backend API sync calls
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        // Try network fetch
        const networkResponse = await fetch(event.request);

        // If response is good, store a copy in cache
        if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
          cache.put(event.request, networkResponse.clone()).catch(() => {});
          
          // Also cache under pathname for relative route matching
          if (url.origin === self.location.origin) {
            cache.put(url.pathname, networkResponse.clone()).catch(() => {});
          }
        }
        return networkResponse;
      } catch (error) {
        // Network failed (Device is OFFLINE)
        console.log('[SW] Network offline, retrieving from cache:', event.request.url);

        // 1. Try matching exact request URL
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) return cachedResponse;

        // 2. Try matching pathname
        const pathnameResponse = await cache.match(url.pathname);
        if (pathnameResponse) return pathnameResponse;

        // 3. For page navigation / HTML loads, return index.html or root
        if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
          const indexPage = (await cache.match('/index.html')) || 
                            (await cache.match('/')) || 
                            (await cache.match(self.location.origin));
          if (indexPage) return indexPage;
        }

        // Fallback for missing offline assets
        return new Response('أنت في وضع الأوفلاين الآن. البيانات محفوظة محلياً.', {
          status: 200,
          headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
        });
      }
    })()
  );
});


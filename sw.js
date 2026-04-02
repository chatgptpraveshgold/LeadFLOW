// ============================================================
// Pravesh Gold CRM — Service Worker (sw.js)
// Provides offline support, caching, and PWA functionality
// ============================================================

const CACHE_NAME = 'leadflow-v1';
const RUNTIME_CACHE = 'leadflow-runtime-v1';

// Core assets to pre-cache on install
const PRE_CACHE_URLS = [
  '/',
  'index.html',
  'manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Google Fonts (cached at runtime on first visit)
];

// ---- Install: Pre-cache core assets ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRE_CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ---- Activate: Remove stale caches ----
self.addEventListener('activate', event => {
  const VALID_CACHES = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.map(key => {
          if (!VALID_CACHES.includes(key)) {
            console.log('[SW] Deleting stale cache:', key);
            return caches.delete(key);
          }
        })
      ))
      .then(() => self.clients.claim())
  );
});

// ---- Fetch: Cache-first for static, network-first for API ----
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Firebase and external API requests (always network)
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis') || url.hostname.includes('gstatic')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache a copy of the Google Fonts / Firebase SDK for offline use
          if (response.ok) {
            const resClone = response.clone();
            caches.open(RUNTIME_CACHE).then(cache => cache.put(event.request, resClone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first strategy for core app assets
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const resClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
          }
          return response;
        });
      })
      .catch(() => caches.match('index.html'))
  );
});

// ---- Background Sync (stub for future Google Sheets sync) ----
self.addEventListener('sync', event => {
  if (event.tag === 'sync-leads') {
    event.waitUntil(syncLeadsToSheet());
  }
});

async function syncLeadsToSheet() {
  console.log('[SW] Background sync triggered for leads.');
  // Future: Read from IndexedDB, POST to Google Apps Script URL
}

// ---- Push Notifications (stub for future follow-up reminders) ----
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : { title: 'Pravesh CRM', body: 'You have a new update.' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'LeadFlow CRM', {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [100, 50, 100],
      tag: 'crm-notification'
    })
  );
});

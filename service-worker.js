/**
 * Service Worker for 100% Offline PWA functionality with Resilient Cache Query Normalization
 * ClassQuant Hub v1.6.0
 */

const CACHE_NAME = 'classquant-hub-v25';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './version.json',
  './css/styles.css',
  './css/kitty-theme.css',
  './css/sanrio-characters.css',
  './js/store.js',
  './js/timetable.js',
  './js/statistics.js',
  './js/charts.js',
  './js/tagManager.js',
  './js/matrix.js',
  './js/rosterManager.js',
  './js/retroLogView.js',
  './js/eventsLog.js',
  './js/studentDossier.js',
  './js/timetableEditor.js',
  './js/aiImportExport.js',
  './js/onboardingTour.js',
  './js/onboardingWizard.js',
  './js/userGuide.js',
  './js/app.js',
  './assets/images/twin_stars.png',
  './使用指南_圖文說明書.html'
];

// Install: Cache all core assets and skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch((err) => {
      console.error('[SW] Precaching failed during install:', err);
    })
  );
});

// Activate: Delete outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting stale cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Routing:
// 1. App Shell & Code Assets (.html, .json, .js, .css, navigation requests):
//    Network-First with instant offline Cache fallback ({ ignoreSearch: true })
//    Prevents stale-code rollback flashes when new versions are deployed.
// 2. Static Media & External CDNs (images, fonts, vendor scripts):
//    Cache-First with network fallback ({ ignoreSearch: true })
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Identify first-party application code and entry documents
  const isAppCode = isSameOrigin && (
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.json') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('/') ||
    url.pathname === '' ||
    event.request.mode === 'navigate'
  );

  if (isAppCode) {
    // Strategy 1: Network-First (with query normalization on fallback)
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline Fallback: match with ignoreSearch: true to handle ?v=1.6.0 queries
          return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // If navigation request fails to match specific path, fallback to cached index.html
            if (event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
              return caches.match('./index.html', { ignoreSearch: true });
            }
            return null;
          });
        })
    );
  } else {
    // Strategy 2: Cache-First for static media / external CDNs
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch((err) => {
          console.warn('[SW] Fetch failed for asset:', event.request.url, err);
          return null;
        });
      })
    );
  }
});

// Handle explicit SKIP_WAITING message
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || (event.data && event.data.type === 'SKIP_WAITING')) {
    self.skipWaiting();
  }
});

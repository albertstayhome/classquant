/**
 * Service Worker for 100% Offline PWA functionality with Network-First Live OTA Updates (ClassQuant Hub v8)
 */

const CACHE_NAME = 'classquant-hub-v102';
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
  './js/sortable.min.js',
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

// Install: Cache core assets and immediately activate
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate: Delete all old caches and claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Strategy: Network-First for HTML/JSON (Instant OTA), Stale-While-Revalidate for CSS/JS
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isHtmlOrJson = url.pathname.endsWith('.html') || url.pathname.endsWith('.json') || url.pathname.endsWith('/');

  if (isHtmlOrJson) {
    // Network-First: Always fetch latest from server when online
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request, { ignoreSearch: true }).then(res => res || caches.match('./index.html')))
    );
  } else {
    // Stale-While-Revalidate: Return cache immediately with ignoreSearch, fetch fresh copy in background
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        }).catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

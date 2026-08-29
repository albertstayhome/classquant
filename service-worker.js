/**
 * Service Worker for 100% Offline PWA functionality (ClassQuant Hub v3)
 */

const CACHE_NAME = 'classquant-hub-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
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
  './js/eventsLog.js',
  './js/studentDossier.js',
  './js/timetableEditor.js',
  './js/aiImportExport.js',
  './js/nasSync.js',
  './js/userGuide.js',
  './js/app.js',
  './assets/images/twin_stars.png',
  './使用指南_圖文說明書.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

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

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cache dynamic external scripts (like CDN chart.js, tailwind, lucide)
        if (event.request.url.startsWith('http') && networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline fallback
        return caches.match('./index.html');
      });
    })
  );
});

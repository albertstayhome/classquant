/**
 * Service Worker for 100% Offline PWA functionality with Safe OTA Updates (ClassQuant Hub v9)
 * - Never intercepts cross-origin requests (CDNs, Google Apps Script, Google Forms)
 * - Fast 3.2s network timeout on Network-First requests so mobile/school Wi-Fi never stalls startup
 * - Completes core asset pre-caching before skipWaiting() to eliminate mixed-version cache crashes
 */

const CACHE_NAME = 'classquant-hub-v145';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './version.json',
  './css/styles.css',
  './css/kitty-theme.css',
  './css/sanrio-characters.css',
  './css/oaa-theme.css',
  './assets/cote/cote_logo_s3.png',
  './assets/cote/cote_wp_1.jpg',
  './assets/cote/cote_cover.jpg',
  './assets/cote/ayanokoji_oaa.jpg',
  './assets/cote/ic-1-1.jpg',
  './assets/cote/ic-1-2.jpg',
  './assets/cote/ic-1-3.jpg',
  './assets/cote/ic-1-4.jpg',
  './assets/cote/ic-1-5.jpg',
  './assets/cote/ic-1-6.jpg',
  './assets/cote/ic-2-1.jpg',
  './assets/cote/ic-2-2.jpg',
  './assets/cote/ic-2-3.jpg',
  './assets/cote/ic-2-4.jpg',
  './assets/cote/ic-2-5.jpg',
  './assets/cote/official/amasawa.webp',
  './assets/cote/official/amasawa_full.webp',
  './assets/cote/official/asahina.webp',
  './assets/cote/official/asahina_full.webp',
  './assets/cote/official/ayanokoji.webp',
  './assets/cote/official/ayanokoji_full.webp',
  './assets/cote/official/chabashira.webp',
  './assets/cote/official/chabashira_full.webp',
  './assets/cote/official/hasebe.webp',
  './assets/cote/official/hasebe_full.webp',
  './assets/cote/official/hirata.webp',
  './assets/cote/official/hirata_full.webp',
  './assets/cote/official/horikita.webp',
  './assets/cote/official/horikita_full.webp',
  './assets/cote/official/hosen.webp',
  './assets/cote/official/hosen_full.webp',
  './assets/cote/official/hoshinomiya.webp',
  './assets/cote/official/hoshinomiya_full.webp',
  './assets/cote/official/ibuki.webp',
  './assets/cote/official/ibuki_full.webp',
  './assets/cote/official/ichinose.webp',
  './assets/cote/official/ichinose_full.webp',
  './assets/cote/official/ike.webp',
  './assets/cote/official/ike_full.webp',
  './assets/cote/official/ishizaki.webp',
  './assets/cote/official/ishizaki_full.webp',
  './assets/cote/official/kanzaki.webp',
  './assets/cote/official/kanzaki_full.webp',
  './assets/cote/official/karuizawa.webp',
  './assets/cote/official/karuizawa_full.webp',
  './assets/cote/official/katsuragi.webp',
  './assets/cote/official/katsuragi_full.webp',
  './assets/cote/official/kiriyama.webp',
  './assets/cote/official/kiriyama_full.webp',
  './assets/cote/official/koenji.webp',
  './assets/cote/official/koenji_full.webp',
  './assets/cote/official/kushida.webp',
  './assets/cote/official/kushida_full.webp',
  './assets/cote/official/matsushita.webp',
  './assets/cote/official/matsushita_full.webp',
  './assets/cote/official/miyake.webp',
  './assets/cote/official/miyake_full.webp',
  './assets/cote/official/nagumo.webp',
  './assets/cote/official/nagumo_full.webp',
  './assets/cote/official/nanase.webp',
  './assets/cote/official/nanase_full.webp',
  './assets/cote/official/ryuen.webp',
  './assets/cote/official/ryuen_full.webp',
  './assets/cote/official/sakayanagi.webp',
  './assets/cote/official/sakayanagi_full.webp',
  './assets/cote/official/sakura.webp',
  './assets/cote/official/sakura_full.webp',
  './assets/cote/official/sato.webp',
  './assets/cote/official/sato_full.webp',
  './assets/cote/official/shiina.webp',
  './assets/cote/official/shiina_full.webp',
  './assets/cote/official/shinohara.webp',
  './assets/cote/official/shinohara_full.webp',
  './assets/cote/official/sudo.webp',
  './assets/cote/official/sudo_full.webp',
  './assets/cote/official/tsubaki.webp',
  './assets/cote/official/tsubaki_full.webp',
  './assets/cote/official/tsukishiro.webp',
  './assets/cote/official/tsukishiro_full.webp',
  './assets/cote/official/utomiya.webp',
  './assets/cote/official/utomiya_full.webp',
  './assets/cote/official/yagami.webp',
  './assets/cote/official/yagami_full.webp',
  './assets/cote/official/yukimura.webp',
  './assets/cote/official/yukimura_full.webp',
  './js/store.js',
  './js/xlsxExport.js',
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
  './js/feedbackBoard.js',
  './js/onboardingTour.js',
  './js/onboardingWizard.js',
  './js/userGuide.js',
  './js/app.js',
  './data/cloud_config.json',
  './data/feedback.json',
  './assets/images/twin_stars.png',
  './assets/images/hello_kitty.png',
  './assets/images/kuromi.png',
  './assets/images/cinnamoroll.png',
  './assets/images/my_melody.png',
  './assets/icons/pwa-icon-192.png',
  './assets/icons/pwa-icon-512.png',
  './assets/icons/pwa-icon-maskable-512.png',
  './assets/icons/apple-touch-icon-180.png',
  './assets/icons/apple-splash-portrait.png',
  './使用指南_圖文說明書.html'
];

const NETWORK_TIMEOUT_MS = 3200;

function fetchWithTimeout(request, options = {}, timeoutMs = NETWORK_TIMEOUT_MS) {
  if (typeof AbortController === 'undefined') {
    return fetch(request, options);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(request, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

// Install: Cache core assets cleanly BEFORE activating so caches are never half-empty mid-boot
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(
        ASSETS_TO_CACHE.map((assetUrl) => cache.add(assetUrl).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

// Activate: Delete all old caches and claim clients
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
    }).then(() => self.clients.claim()).then(() => {
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_NAME }));
      });
    })
  );
});

// Fetch Strategy: Same-origin only; Network-First with fast timeout for HTML/JSON/versioned, SWR for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  let url;
  try {
    url = new URL(event.request.url);
  } catch (e) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  const isHtmlOrJson = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('.json') || url.pathname.endsWith('/');
  const hasVersionParam = url.searchParams.has('v');

  if (isHtmlOrJson || hasVersionParam) {
    event.respondWith(
      fetchWithTimeout(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((exactRes) => {
          if (exactRes) return exactRes;
          return caches.match(event.request, { ignoreSearch: true }).then((looseRes) => {
            if (looseRes) return looseRes;
            if (isHtmlOrJson) {
              return caches.match('./index.html', { ignoreSearch: true })
                .then((idx) => idx || new Response('Offline', { status: 503, statusText: 'Offline' }));
            }
            return new Response('', { status: 503, statusText: 'Offline' });
          });
        }))
    );
  } else {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
        const fetchPromise = fetchWithTimeout(event.request, {}, 5000).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        }).catch(() => cachedResponse || new Response('', { status: 503, statusText: 'Offline' }));

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

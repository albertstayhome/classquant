# Technical Blueprint & Handoff Report: Service Worker Cache Query Normalization & Version Synchronization

**Author**: Explorer M4-1 (Service Worker Cache Query Normalization Specialist)  
**Milestone Target**: Milestone 4 (PWA Service Worker & Cache Sync)  
**Target Files**: `service-worker.js`, `index.html`, `version.json`, `js/app.js`, `android/app/build.gradle`  
**Date**: 2026-08-30  

---

## 1. Observation

A direct code-level audit of the ClassQuant Hub repository revealed four critical architectural vulnerabilities in the Service Worker and cache synchronization subsystem:

### 1.1 Cache Miss on Versioned Query Parameters
- **Source**: `service-worker.js:6-32` vs `index.html:246-261` vs `service-worker.js:80`
- **Observed Code**:
  - `service-worker.js:6-32` precaches unversioned canonical URLs during `install`:
    ```javascript
    const ASSETS_TO_CACHE = [
      './',
      './index.html',
      './manifest.json',
      './version.json',
      './css/styles.css',
      './js/store.js',
      './js/app.js',
      ...
    ];
    ```
  - `index.html:246-261` loads scripts with explicit cache-busting version query parameters:
    ```html
    <script src="./js/store.js?v=1.6.0"></script>
    <script src="./js/app.js?v=1.6.0"></script>
    ```
  - `service-worker.js:80` attempts cache matching without options:
    ```javascript
    caches.match(event.request).then((cachedResponse) => { ... })
    ```
  - `service-worker.js:75` (HTML/JSON offline fallback) also attempts cache matching without options:
    ```javascript
    .catch(() => caches.match(event.request).then(res => res || caches.match('./index.html')))
    ```
- **Finding**: By W3C Cache API specification, `caches.match(request)` performs an exact URL string match including search parameters by default (`ignoreSearch: false`). A request for `./js/app.js?v=1.6.0` fails to match the precached key `https://[origin]/js/app.js`. In an offline environment where `fetch()` throws `NetworkError`, `cachedResponse` evaluates to `undefined`, causing all application scripts to fail to load (fatal white screen).

---

### 1.2 Stale-While-Revalidate Version Desynchronization (Rollback Flash)
- **Source**: `service-worker.js:59-93`
- **Observed Code**:
  ```javascript
  // Line 62-64:
  const isHtmlOrJson = url.pathname.endsWith('.html') || url.pathname.endsWith('.json') || url.pathname.endsWith('/');

  if (isHtmlOrJson) {
    // Network-First for HTML
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        ...
    );
  } else {
    // Stale-While-Revalidate for CSS/JS
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
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
  ```
- **Finding**: When an update is deployed, an online client receives the **new `index.html`** via Network-First. However, when `index.html` requests the linked JavaScript files (`app.js`, `onboardingTour.js`, etc.), the Service Worker immediately serves the **old cached JavaScript** from the previous version while initiating a background fetch for the new version.
- **Impact**: The browser executes new DOM structure against outdated JavaScript methods, creating a runtime version split-brain (e.g., `TypeError` when calling new tour methods or missing DOM handlers), which only resolves on the *subsequent* full reload.

---

### 1.3 Inverted Version Check & Cache-Eviction Reload Loop
- **Source**: `js/app.js:15`, `version.json:2`, `js/app.js:161-175`, `js/app.js:223-237`
- **Observed Code**:
  - `js/app.js:15`: `this.appVersion = '1.6.0';`
  - `version.json:2`: `"version": "1.5.2"`
  - `js/app.js:166`:
    ```javascript
    if (info.version && info.version !== this.appVersion && lastSeen !== info.version) {
      this.showReleaseNotesModal(info, false);
    }
    ```
  - `js/app.js:228-236`:
    ```javascript
    if (this.appVersion !== version || !document.getElementById('onboarding-guide-btn')) {
      if ('caches' in window) {
        const keys = await caches.keys();
        for (let k of keys) await caches.delete(k);
      }
      setTimeout(() => location.reload(true), 300);
    }
    ```
- **Finding**: Because `version.json` has `1.5.2` while `app.js` has `1.6.0`, the update check sees `'1.5.2' !== '1.6.0'` and prompts the user with "🌟 發現新版本 ClassQuant Hub v1.5.2" (a false downgrade notice). Clicking the button deletes all offline caches and triggers `location.reload(true)`, potentially causing a destructive eviction loop.

---

### 1.4 Divergent Version Constants Matrix
- **Observed Spread**:
  1. `js/app.js:15` -> `1.6.0`
  2. `version.json:2` -> `1.5.2`
  3. `index.html:64` -> `v1.6.0`
  4. `index.html:223` -> `v1.3.0`
  5. `service-worker.js:5` -> `classquant-hub-v19`
  6. `android/app/build.gradle:13-14` -> `versionCode 120`, `versionName "1.2.0"`
  7. `js/app.js:297` -> `v1.5.2 (最新實戰導覽版本)`

---

## 2. Logic Chain

```
[Observation 1.1: Precached './js/app.js' vs Requested './js/app.js?v=1.6.0']
                          │
                          ▼
[Cache API Default: ignoreSearch === false -> Query mismatch -> undefined on offline]
                          │
                          ▼
[SOLUTION 1: Add { ignoreSearch: true } to all caches.match() / cache.match() calls]
                          │
                          ▼
[Result: Any query parameter (?v=1.6.0, ?t=123) successfully resolves to precached asset]
```

```
[Observation 1.2: Network-First HTML + Stale-While-Revalidate JS]
                          │
                          ▼
[Online update fetch -> HTML updates immediately, JS served from stale cache]
                          │
                          ▼
[Result: New HTML structure runs old JS logic -> Version rollback flash / runtime crashes]
                          │
                          ▼
[SOLUTION 2: Network-First for ALL first-party application code (.html, .json, .js, .css)]
  ├── Online: Fetch synchronized bundle from network -> put to cache -> serve fresh
  └── Offline: Network fetch fails -> catch block serves precached code via ignoreSearch: true
[SOLUTION 3: Cache-First reserved strictly for third-party CDNs and static images]
```

```
[Observation 1.3: app.js checks info.version !== this.appVersion without semver comparison]
                          │
                          ▼
[Older remote version (1.5.2 vs 1.6.0) triggers false upgrade modal & wipes cache storage]
                          │
                          ▼
[SOLUTION 4: Implement isNewerVersion(remote, current) helper + unify all versions to v1.6.0]
```

---

## 3. Caveats

1. **Third-Party CDN Opaque Responses**:
   - Requests to external CDNs (`cdn.tailwindcss.com`, `cdn.jsdelivr.net`, `unpkg.com`, Google Fonts) return `opaque` responses (`status: 0`, `type: 'opaque'`).
   - When caching external CDN assets in the Cache-First branch, the SW must check `if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque'))` before calling `cache.put()`.
2. **Non-HTTP Request Filtering**:
   - Browser extensions (e.g. `chrome-extension://`) and internal schemes trigger the SW `fetch` event. The SW must immediately ignore any request that does not begin with `http` to prevent runtime errors: `if (!event.request.url.startsWith('http')) return;`.
3. **Cache Storage Quota & Browser Eviction**:
   - The precache manifest is lightweight (~2MB total including assets), well below mobile browser eviction thresholds.
4. **Android WebView Native Support**:
   - `androidx.webkit:webkit:1.10.0` inside `android/app/build.gradle` fully supports Service Worker and Cache Storage with `ignoreSearch: true`.

---

## 4. Conclusion & Technical Implementation Blueprint

### 4.1 File 1: `service-worker.js` (Complete Replacement Blueprint)

```javascript
/**
 * Service Worker for 100% Offline PWA functionality with Resilient Cache Query Normalization
 * ClassQuant Hub v1.6.0
 */

const CACHE_NAME = 'classquant-hub-v1.6.0';
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
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

---

### 4.2 File 2: `version.json` (Unified Release Config)

```json
{
  "version": "1.6.0",
  "buildNumber": 2026083004,
  "releaseDate": "2026-08-30",
  "appName": "ClassQuant Hub",
  "releaseNotes": [
    "1. 【實戰級動態教學】全面升級 12 大沉浸式操作關卡（點選座位、課堂加分動效、自訂標籤、Excel 批次貼上、名冊細項改名調座號、事後補記勾選評語提交、四象限戰情解讀）！",
    "2. 【手機導航水平自動置中】徹底修復手機螢幕狹窄時導航欄按鈕在畫面外導致指針指歪的座標跑位問題！",
    "3. 【極速 60fps 雙幀精準渲染】完美同步滾動後精確座標，零延遲零卡頓",
    "4. 【PWA 離線快取強固】修復版本參數查詢標準化與離線加載防呆機制，杜絕版本回滾與循環重載"
  ],
  "minAppVersion": "1.0.0",
  "otaUpdateEnabled": true
}
```

---

### 4.3 File 3: `index.html` (Version Tags & SW Lifecycle Registration)

1. **Footer Version Text Alignment** (`index.html:223`):
   - Replace `<span class="font-black text-pink-600">ClassQuant Hub v1.3.0</span>`
   - With `<span class="font-black text-pink-600">ClassQuant Hub v1.6.0</span>`

2. **Stylesheet Version Tags** (`index.html:32-34`):
   ```html
   <link rel="stylesheet" href="./css/styles.css?v=1.6.0">
   <link rel="stylesheet" href="./css/kitty-theme.css?v=1.6.0">
   <link rel="stylesheet" href="./css/sanrio-characters.css?v=1.6.0">
   ```

3. **Enhanced Service Worker Registration Hook** (`index.html:264-272`):
   ```html
   <script>
     if ('serviceWorker' in navigator) {
       window.addEventListener('load', () => {
         navigator.serviceWorker.register('./service-worker.js')
           .then(reg => {
             console.log('ClassQuant Hub Service Worker Registered!', reg.scope);
             reg.addEventListener('updatefound', () => {
               const newWorker = reg.installing;
               if (newWorker) {
                 newWorker.addEventListener('statechange', () => {
                   if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                     console.log('[PWA] New version ready in background.');
                     if (window.appState && typeof window.appState.showToast === 'function') {
                       window.appState.showToast('🌟 發現新版本已下載，重新載入即可套用！', 'info');
                     }
                   }
                 });
               }
             });
           })
           .catch(err => console.error('Service Worker registration failed:', err));
       });
     }
   </script>
   ```

---

### 4.4 File 4: `js/app.js` (Semver Update Check & Safe Cache Clearing)

1. **Version Constant** (`js/app.js:15`):
   `this.appVersion = '1.6.0';`

2. **Changelog Entry** (`js/app.js:297`):
   Update label to `v1.6.0 (最新實戰導覽版本)`.

3. **Update Check & Semver Comparison Logic** (`js/app.js:155-175`):
   ```javascript
   async checkForUpdates(silent = true) {
     if (!navigator.onLine) {
       if (!silent) this.showToast('目前處於離線狀態，無法檢查更新', 'info');
       return;
     }

     try {
       const res = await fetch(`./version.json?t=${Date.now()}`);
       if (res.ok) {
         const info = await res.json();
         const lastSeen = localStorage.getItem('classquant_last_seen_version');
         // Only prompt if remote version is strictly newer than current app version
         if (info.version && this.isNewerVersion(info.version, this.appVersion) && lastSeen !== info.version) {
           this.showReleaseNotesModal(info, false);
         } else if (!silent) {
           this.showToast(`✅ 目前已是最新版本 (v${this.appVersion})`, 'success');
         }
       }
     } catch (e) {
       if (!silent) this.showToast('無法取得更新資訊，請檢查網路連線', 'warning');
     }
   }

   isNewerVersion(remote, current) {
     if (!remote || !current) return false;
     if (remote === current) return false;
     const parseParts = (v) => v.split('.').map(n => parseInt(n, 10) || 0);
     const r = parseParts(remote);
     const c = parseParts(current);
     for (let i = 0; i < Math.max(r.length, c.length); i++) {
       const rVal = r[i] || 0;
       const cVal = c[i] || 0;
       if (rVal > cVal) return true;
       if (rVal < cVal) return false;
     }
     return false;
   }
   ```

4. **Safe Dismiss Logic** (`js/app.js:223-237`):
   ```javascript
   async dismissReleaseNotes(version) {
     localStorage.setItem('classquant_last_seen_version', version);
     this.closeModal();
     this.showToast(`已套用 v${version} 最新功能！🎀`, 'success');
     if (this.isNewerVersion(version, this.appVersion) || !document.getElementById('onboarding-guide-btn')) {
       if ('caches' in window) {
         const keys = await caches.keys();
         for (let k of keys) {
           await caches.delete(k);
         }
       }
       setTimeout(() => location.reload(true), 300);
     }
   }
   ```

---

### 4.5 File 5: `android/app/build.gradle` (Native Wrapper Version Sync)

```groovy
defaultConfig {
    applicationId "com.classquant.hub"
    minSdk 24
    targetSdk 34
    versionCode 160
    versionName "1.6.0"

    testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
}
```

---

## 5. Verification Method

To verify these changes independently after implementation:

### 5.1 Automated / Scripted Verification Commands
1. **Local Server Launch**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\serve.ps1
   ```
2. **Version Synchronization Integrity Scan**:
   Verify that all version strings are `1.6.0`:
   ```powershell
   Select-String -Path "version.json", "index.html", "service-worker.js", "js/app.js", "android/app/build.gradle" -Pattern "(1\.6\.0|160|classquant-hub-v1\.6\.0)"
   ```

### 5.2 Browser DevTools Cache & Offline Verification Procedure
1. Open Chrome DevTools (`F12`) -> **Application** -> **Service Workers**.
2. Register and install the new Service Worker. Verify `classquant-hub-v1.6.0` appears under **Cache Storage**.
3. Under **Cache Storage** -> `classquant-hub-v1.6.0`, inspect keys: confirm bare paths like `./js/app.js` are present.
4. Toggle **Offline** mode in DevTools Network tab.
5. Hard reload (`Ctrl+F5`) with network disabled.
   - Verify network requests for `./js/app.js?v=1.6.0`, `./js/onboardingTour.js?v=1.6.0`, and all scripts resolve with HTTP 200 (from ServiceWorker).
   - Verify `window.appState.appVersion === '1.6.0'` in console.
   - Verify complete absence of white screen or missing script errors.
6. Test Version Update Simulation:
   - In console: `appState.checkForUpdates(false)` -> confirms `"✅ 目前已是最新版本 (v1.6.0)"` toast without false update popups.
   - Simulate older remote version: `appState.isNewerVersion('1.5.2', '1.6.0')` returns `false`.
   - Simulate newer remote version: `appState.isNewerVersion('1.7.0', '1.6.0')` returns `true`.

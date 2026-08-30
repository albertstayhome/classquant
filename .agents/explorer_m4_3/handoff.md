# Handoff Report: Version Check Loop Elimination & Service Worker Update Lifecycle (Milestone 4)

**Agent**: Explorer M4-3 (Version Check Loop Elimination & Lifecycle Specialist)  
**Target Project**: ClassQuant Hub (`d:\class_point_app_dev`)  
**Scope**: Requirement R4 — Resilient PWA Service Worker & Version Cache Synchronization (Version Check Loop Elimination & SW Update Prompt Architecture)  
**Date**: 2026-08-30  

---

## 1. Observation

Direct code examination of `js/app.js`, `version.json`, `index.html`, `service-worker.js`, and `android/app/build.gradle` reveals several interlocking lifecycle defects:

### 1.1 Version Inversion & Destructive Downgrade Reload Loop
- **File**: `js/app.js`, lines 15, 126–175, 177–221, 223–237
- **Current Runtime Version**: `this.appVersion = '1.6.0';` (line 15)
- **Current Static `version.json`**: `"version": "1.5.2"` (line 2)
- **Problematic Code in `checkReleaseNotesOnLaunch()` (`js/app.js:126-153`)**:
  ```javascript
  async checkReleaseNotesOnLaunch() {
    const lastSeen = localStorage.getItem('classquant_last_seen_version');
    if (lastSeen === this.appVersion) {
      return;
    }

    try {
      const res = await fetch(`./version.json?t=${Date.now()}`);
      if (res.ok) {
        const info = await res.json();
        this.showReleaseNotesModal(info, true);
        return;
      }
    } catch (e) {}
    ...
  }
  ```
- **Problematic Code in `checkForUpdates()` (`js/app.js:155-175`)**:
  ```javascript
  async checkForUpdates(silent = true) {
    ...
    const res = await fetch(`./version.json?t=${Date.now()}`);
    if (res.ok) {
      const info = await res.json();
      const lastSeen = localStorage.getItem('classquant_last_seen_version');
      if (info.version && info.version !== this.appVersion && lastSeen !== info.version) {
        this.showReleaseNotesModal(info, false);
      } else if (!silent) {
        this.showToast(`✅ 目前已是最新版本 (v${this.appVersion})`, 'success');
      }
    }
  }
  ```
- **Problematic Code in `showReleaseNotesModal()` (`js/app.js:177-180`)**:
  ```javascript
  showReleaseNotesModal(info, isNewVersionNotice = false) {
    // Overwrites last_seen with info.version (e.g. '1.5.2') instead of current running appVersion ('1.6.0')
    localStorage.setItem('classquant_last_seen_version', info.version || this.appVersion);
    ...
  }
  ```
- **Problematic Code in `dismissReleaseNotes()` (`js/app.js:223-237`)**:
  ```javascript
  async dismissReleaseNotes(version) {
    localStorage.setItem('classquant_last_seen_version', version);
    this.closeModal();
    this.showToast(`已套用 v${version} 最新功能！🎀`, 'success');
    // If the currently loaded DOM does not have the latest elements, clear cache and hard reload
    if (this.appVersion !== version || !document.getElementById('onboarding-guide-btn')) {
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

### 1.2 Disconnected Service Worker Update Lifecycle
- **File**: `index.html`, lines 263–272
  ```javascript
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => console.log('ClassQuant Hub Service Worker Registered!', reg.scope))
        .catch(err => console.error('Service Worker registration failed:', err));
    });
  }
  ```
  The registration ignores `reg.onupdatefound`, `reg.waiting`, and `navigator.serviceWorker.oncontrollerchange`. Users running an active PWA instance receive zero UI prompts or indications when a new Service Worker build is installed and waiting in the background.

### 1.3 Offline Cache Miss on Versioned Query Parameters
- **File**: `service-worker.js`, lines 80–91
  ```javascript
  caches.match(event.request).then((cachedResponse) => { ... })
  ```
  Precached asset entries in `ASSETS_TO_CACHE` are registered as bare URLs (`'./js/app.js'`), whereas `index.html` loads `<script src="./js/app.js?v=1.6.0">`. Without `{ ignoreSearch: true }` in `caches.match`, cold-boot offline requests fail with cache misses.

### 1.4 Version String Discrepancies Across the Repository
| Location | Current String | Required Unified Target |
|---|---|---|
| `js/app.js:15` | `this.appVersion = '1.6.0'` | `1.6.0` |
| `version.json:2` | `"version": "1.5.2"` | `1.6.0` |
| `version.json:3` | `"buildNumber": 2026083003` | `2026083004` |
| `index.html:64` | `<span id="header-version-badge"><span>v1.6.0</span>` | `v1.6.0` |
| `index.html:223` | `<span class="font-black text-pink-600">ClassQuant Hub v1.3.0</span>` | `ClassQuant Hub v1.6.0` |
| `index.html:246-261` | `<script src="./js/*.js?v=1.6.0">` | `?v=1.6.0` |
| `index.html:32-34` | `<link rel="stylesheet" href="./css/*.css">` | `?v=1.6.0` |
| `service-worker.js:5` | `const CACHE_NAME = 'classquant-hub-v19';` | `classquant-hub-v1.6.0` |
| `android/app/build.gradle:13-14` | `versionCode 120`, `versionName "1.2.0"` | `versionCode 160`, `versionName "1.6.0"` |

---

## 2. Logic Chain

1. **Failure Trigger**: On app startup, `AppState.init()` schedules `checkReleaseNotesOnLaunch()` at `t = 1000ms`.
2. **Strict Inequality Flaw**: Both `checkReleaseNotesOnLaunch()` and `checkForUpdates()` evaluate `info.version !== this.appVersion` instead of performing semantic version comparison (`semverCompare`).
3. **Downgrade Misinterpretation**: Because `version.json` has `1.5.2` while `app.js` is `1.6.0`, the condition `'1.5.2' !== '1.6.0'` evaluates to `true`. The app misinterprets the older `v1.5.2` as a "New Release" update.
4. **State Poisoning**: `showReleaseNotesModal` executes `localStorage.setItem('classquant_last_seen_version', '1.5.2')`.
5. **Indiscriminate Cache Eviction**: When the user clicks "✨ 開始體驗最新功能！", `dismissReleaseNotes('1.5.2')` checks `this.appVersion !== version` (`'1.6.0' !== '1.5.2'`), iterates all keys in `window.caches`, calls `caches.delete(k)` on every cache store, and invokes `location.reload(true)`.
6. **Infinite Reload Loop**:
   - On page reload, `this.appVersion` initializes as `1.6.0`.
   - `lastSeen` in `localStorage` is now `1.5.2`.
   - `checkReleaseNotesOnLaunch()` checks `lastSeen === this.appVersion` (`'1.5.2' === '1.6.0'` -> `false`).
   - It fetches `version.json` (`1.5.2`), displays the modal again, wipes caches again, and reloads indefinitely.
7. **Service Worker Decoupling**: If an actual newer version is deployed, the Service Worker downloads assets in the background, but the client application has no update listener to show a polite toast/banner and cleanly reload via `skipWaiting`.

---

## 3. Caveats

1. **Existing User Storage Integrity**: Upgrading the version check logic must never touch or wipe user class data stored under `classquant_app_store_v1.4.0` or `classquant_timetables_v1.4.0`.
2. **Android WebView Environment**: In Android WebView wrappers where `window.caches` or `navigator.serviceWorker` may be disabled or restricted by security policies, version checking and offline fallbacks must degrade gracefully without throwing uncaught exceptions.
3. **HTTP Cache Header Independence**: Even if static hosting servers cache `version.json`, fetching with `?t=${Date.now()}` ensures the latest OTA metadata is retrieved when online.

---

## 4. Conclusion & Technical Implementation Blueprint

To completely eliminate false downgrade wiping loops and establish a rock-solid Service Worker lifecycle, the implementation must execute the following exact changes:

### 4.1 Specification for `js/app.js`

#### A. Add Semantic Version Comparison Method `compareVersions(v1, v2)`
Add this helper method to `AppState` in `js/app.js`:
```javascript
  /**
   * Compares two semantic version strings (e.g. "1.6.0" vs "1.5.2").
   * Supports optional leading 'v' (e.g. "v1.6.0").
   * @param {string} v1
   * @param {string} v2
   * @returns {number} 1 if v1 > v2, -1 if v1 < v2, 0 if v1 === v2
   */
  compareVersions(v1, v2) {
    if (!v1 || !v2) return 0;
    const parse = (v) => String(v).replace(/^[vV]/, '').trim().split('.').map(n => parseInt(n, 10) || 0);
    const p1 = parse(v1);
    const p2 = parse(v2);
    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
      const a = p1[i] || 0;
      const b = p2[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  }
```

#### B. Refactor `checkReleaseNotesOnLaunch()`
Replace lines 126–153 in `js/app.js` with:
```javascript
  // --- OTA Live Push Update Engine & Proactive Release Notes (Strictly Once per Version) ---
  async checkReleaseNotesOnLaunch() {
    const lastSeen = localStorage.getItem('classquant_last_seen_version');
    
    // If the user has already seen this version (or a newer version), do not prompt again!
    if (lastSeen && this.compareVersions(lastSeen, this.appVersion) >= 0) {
      return;
    }

    try {
      const res = await fetch(`./version.json?t=${Date.now()}`);
      if (res.ok) {
        const info = await res.json();
        // If remote version is strictly newer than current running app, prompt update
        if (info.version && this.compareVersions(info.version, this.appVersion) > 0) {
          this.showReleaseNotesModal(info, false);
          return;
        }
        // If remote version matches current running app, show release notes
        if (info.version && this.compareVersions(info.version, this.appVersion) === 0) {
          this.showReleaseNotesModal(info, true);
          return;
        }
        // If remote version is older (server lagging or stale), fall back to built-in current notes
      }
    } catch (e) {
      // Offline or network error -> proceed to built-in fallback
    }

    // Built-in fallback release notes for current running appVersion (v1.6.0)
    this.showReleaseNotesModal({
      version: this.appVersion,
      releaseDate: '2026-08-30',
      releaseNotes: [
        "1. 【實戰級動態教學】全面升級 12 大沉浸式操作關卡（點選座位、課堂加分、自訂標籤、Excel 批次貼上、名冊細項改名、事後補記、四象限戰情解讀）！",
        "2. 【手機導航水平自動置中】徹底修復手機狹窄螢幕時導航欄後方按鈕在畫面外導致指針指歪的座標跑位問題！",
        "3. 【極速 60fps 雙幀精準渲染】完美同步滾動後精確座標，零延遲零卡頓！",
        "4. 【PWA 離線快取同步升級】全面修正版本檢查防禦邏輯，消除版本倒退快取清空循環，支援離線查詢規格化！"
      ]
    }, true);
  }
```

#### C. Refactor `checkForUpdates(silent = true)`
Replace lines 155–175 in `js/app.js` with:
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
        const isNewer = info.version && this.compareVersions(info.version, this.appVersion) > 0;
        
        if (isNewer) {
          if (!silent || lastSeen !== info.version) {
            this.showReleaseNotesModal(info, false);
          }
        } else if (!silent) {
          this.showToast(`✅ 目前已是最新版本 (v${this.appVersion})`, 'success');
        }
      } else {
        if (!silent) this.showToast('無法取得更新資訊，請稍後再試', 'warning');
      }
    } catch (e) {
      if (!silent) this.showToast('無法取得更新資訊，請檢查網路連線', 'warning');
    }
  }
```

#### D. Refactor `showReleaseNotesModal()` and `dismissReleaseNotes()`
Replace lines 177–237 in `js/app.js` with:
```javascript
  showReleaseNotesModal(info, isNewVersionNotice = false) {
    // Record current seen version to prevent repeat popups on launch
    const modalVersion = info.version || this.appVersion;
    localStorage.setItem('classquant_last_seen_version', modalVersion);

    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="p-6 text-center animate-fade-in-up">
        <div class="flex justify-center mb-3">
          <div class="sanrio-twinstars-badge !w-16 !h-16"></div>
        </div>
        <h3 class="text-xl sm:text-2xl font-black mb-1 flex items-center justify-center gap-2 text-pink-600">
          ${isNewVersionNotice ? '🎉 歡迎使用' : '🌟 發現新版本'} ClassQuant Hub v${modalVersion}
          <span class="kitty-bow"></span>
        </h3>
        <p class="text-xs text-slate-500 mb-4 font-bold">發布日期：${info.releaseDate || '2026-08-30'}</p>

        <div class="text-left p-4 rounded-2xl bg-pink-50 border border-pink-200 text-xs text-slate-800 space-y-2 mb-5 font-bold">
          <div class="text-pink-900 font-black flex items-center gap-1">
            <i data-lucide="sparkles" class="w-3.5 h-3.5 text-pink-600"></i>
            【本次更新重點】：
          </div>
          ${(info.releaseNotes || []).map(note => `
            <div class="flex items-start gap-1.5 leading-relaxed">
              <span class="text-pink-500 font-black">•</span>
              <span>${note}</span>
            </div>
          `).join('')}
        </div>

        <div class="flex items-center justify-center gap-3">
          <button onclick="appState.dismissReleaseNotes('${modalVersion}')" 
            class="w-full py-3 rounded-2xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 shadow-lg shadow-pink-500/25 transition text-sm flex items-center justify-center gap-1.5 active:scale-95">
            <span class="kitty-bow !w-3.5 !h-3.5"></span>
            <span>${isNewVersionNotice ? '✨ 開始體驗！' : '🔄 立即套用更新'}</span>
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  async dismissReleaseNotes(version) {
    const targetVersion = version || this.appVersion;
    localStorage.setItem('classquant_last_seen_version', targetVersion);
    this.closeModal();

    // If dismissing an update for a strictly newer version, trigger Service Worker update & reload
    if (this.compareVersions(targetVersion, this.appVersion) > 0) {
      this.showToast(`正在更新至 v${targetVersion}...🎀`, 'info');
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update();
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        } catch (e) {}
      }
      setTimeout(() => location.reload(), 400);
    } else {
      this.showToast(`已就緒 v${this.appVersion} 功能！🎀`, 'success');
    }
  }
```

#### E. Add `showSWUpdateBanner()` UI Helper to `AppState`
Add this method to `AppState` in `js/app.js`:
```javascript
  showSWUpdateBanner(reg) {
    const existing = document.getElementById('pwa-update-banner');
    if (existing) return;
    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 text-white border border-pink-400 shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs font-bold animate-fade-in-up';
    banner.innerHTML = `
      <span>🎉 發現新版本 ClassQuant Hub！</span>
      <button id="pwa-reload-btn" class="px-3 py-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl text-white font-black hover:brightness-110 active:scale-95 transition">立即更新</button>
      <button id="pwa-dismiss-btn" class="px-2 py-1 text-slate-400 hover:text-white transition">稍後</button>
    `;
    document.body.appendChild(banner);
    document.getElementById('pwa-reload-btn').addEventListener('click', () => {
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        window.location.reload();
      }
    });
    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
      banner.remove();
    });
  }
```

---

### 4.2 Specification for `index.html` Service Worker Registration & UI

Replace lines 263–272 in `index.html` with:
```html
  <!-- Register Service Worker for 100% Offline PWA functionality & Update Detection -->
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });

        navigator.serviceWorker.register('./service-worker.js')
          .then(reg => {
            console.log('[PWA] Service Worker registered with scope:', reg.scope);

            // If a worker is already waiting to activate
            if (reg.waiting) {
              promptSWUpdate(reg);
              return;
            }

            // Listen for new service worker installation
            reg.addEventListener('updatefound', () => {
              const newWorker = reg.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    promptSWUpdate(reg);
                  }
                });
              }
            });
          })
          .catch(err => console.error('[PWA] Service Worker registration failed:', err));
      });
    }

    function promptSWUpdate(reg) {
      if (window.appState && typeof window.appState.showSWUpdateBanner === 'function') {
        window.appState.showSWUpdateBanner(reg);
      } else {
        const existing = document.getElementById('pwa-update-banner');
        if (existing) return;
        const banner = document.createElement('div');
        banner.id = 'pwa-update-banner';
        banner.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 text-white border border-pink-400 shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs font-bold animate-fade-in-up';
        banner.innerHTML = `
          <span>🎉 發現新版本 ClassQuant Hub！</span>
          <button id="pwa-reload-btn" class="px-3 py-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl text-white font-black hover:brightness-110 active:scale-95 transition">立即更新</button>
          <button id="pwa-dismiss-btn" class="px-2 py-1 text-slate-400 hover:text-white transition">稍後</button>
        `;
        document.body.appendChild(banner);
        document.getElementById('pwa-reload-btn').addEventListener('click', () => {
          if (reg && reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          } else {
            window.location.reload();
          }
        });
        document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
          banner.remove();
        });
      }
    }
  </script>
```

---

### 4.3 Specification for `service-worker.js`

1. **Update `CACHE_NAME`**:
   `const CACHE_NAME = 'classquant-hub-v1.6.0';`
2. **Enable `{ ignoreSearch: true }` in `caches.match`**:
   - In HTML/JSON offline fallback (line 75):
     `caches.match(event.request, { ignoreSearch: true }).then(res => res || caches.match('./index.html', { ignoreSearch: true }))`
   - In static assets matching (line 80):
     `caches.match(event.request, { ignoreSearch: true })`
3. **Robust Message Listener**:
   ```javascript
   self.addEventListener('message', (event) => {
     if (event.data === 'SKIP_WAITING' || (event.data && event.data.type === 'SKIP_WAITING')) {
       self.skipWaiting();
     }
   });
   ```

---

### 4.4 Repository Version Synchronization Matrix (Target: v1.6.0)

| File | Target Modification |
|---|---|
| `js/app.js` | `this.appVersion = '1.6.0';` |
| `version.json` | `"version": "1.6.0"`, `"buildNumber": 2026083004`, `"releaseDate": "2026-08-30"` |
| `index.html` | Header badge `v1.6.0`, Footer `ClassQuant Hub v1.6.0`, script tags `?v=1.6.0`, CSS tags `?v=1.6.0` |
| `service-worker.js` | `const CACHE_NAME = 'classquant-hub-v1.6.0';` |
| `android/app/build.gradle` | `versionCode 160`, `versionName "1.6.0"` |

---

## 5. Verification Method

To independently verify the version check loop elimination and Service Worker lifecycle:

### 5.1 Test Cases & Steps

1. **Test Case 1: Fresh Cold Boot (No Local Storage)**
   - Clear `localStorage.clear()` in browser console.
   - Load `http://localhost:8080/index.html`.
   - **Expectation**: Launch modal appears with title *"🎉 歡迎使用 ClassQuant Hub v1.6.0"*. Clicking "✨ 開始體驗！" closes modal, sets `classquant_last_seen_version = '1.6.0'`, and does **NOT** trigger cache purge or page reload.

2. **Test Case 2: Subsequent Reload (Seen Version)**
   - Reload page (`location.reload()`).
   - **Expectation**: Launch release notes modal does **NOT** pop up. Console exhibits zero errors.

3. **Test Case 3: Lagging/Stale Remote `version.json` (e.g. Server has 1.5.2, Client has 1.6.0)**
   - Mock `version.json` returning `{"version": "1.5.2"}`.
   - Run `appState.checkForUpdates(false)` and `appState.checkReleaseNotesOnLaunch()`.
   - **Expectation**: `compareVersions("1.5.2", "1.6.0")` returns `-1`. The app recognizes remote is older, skips update modal, displays *"✅ 目前已是最新版本 (v1.6.0)"*, and never purges caches or triggers reload loops.

4. **Test Case 4: Legitimate Remote Update (e.g. Server has 1.7.0)**
   - Mock `version.json` returning `{"version": "1.7.0"}`.
   - Run `appState.checkForUpdates(false)`.
   - **Expectation**: Modal appears with title *"🌟 發現新版本 ClassQuant Hub v1.7.0"*.

5. **Test Case 5: Offline Query Parameter Resolution**
   - Toggle Chrome DevTools Network to "Offline".
   - Refresh page requesting `index.html` and `./js/app.js?v=1.6.0`.
   - **Expectation**: Service Worker `{ ignoreSearch: true }` intercepts the request, serves cached `./js/app.js`, and application boots cleanly with zero missing script errors.

6. **Test Case 6: Service Worker Background Update Prompt**
   - Increment `CACHE_NAME` in `service-worker.js`.
   - Reload page once.
   - **Expectation**: `pwa-update-banner` appears at top center with *"🎉 發現新版本 ClassQuant Hub！"*. Clicking *"立即更新"* posts `SKIP_WAITING` and page reloads automatically via `controllerchange`.

### 5.2 Invalidation Conditions
- Any occurrence of `caches.delete` executing during `dismissReleaseNotes()` when version is unchanged or downgraded.
- Any recursive reload loops where `checkReleaseNotesOnLaunch` continuously fires on consecutive boots.
- Uncaught exceptions in `compareVersions` when version strings contain letters or malformed segments.

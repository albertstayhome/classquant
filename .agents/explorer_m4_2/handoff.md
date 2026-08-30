# Milestone 4 Technical Blueprint: Version Synchronization

**Author**: Explorer M4-2 (Version Synchronization Specialist)  
**Date**: 2026-08-30  
**Scope**: Unified Version Synchronization across `version.json`, `index.html`, `js/app.js`, `manifest.json`, `android/app/build.gradle`, and `service-worker.js`.

---

## 1. Observation

A full codebase audit revealed 5 disparate version strings and divergent cache configurations across 6 target files:

### 1.1 `version.json` (Observed at `d:\class_point_app_dev\version.json:1-13`)
```json
{
  "version": "1.5.2",
  "buildNumber": 2026083003,
  "releaseDate": "2026-08-30",
  "appName": "ClassQuant Hub",
  "releaseNotes": [
    "1. 【實戰級動態教學】全面升級 12 大沉浸式操作關卡（點選座位、課堂加分動效、自訂標籤、Excel 批次貼上、名冊細項改名調座號、事後補記勾選評語提交、四象限戰情解讀）！",
    "2. 【手機導航水平自動置中】徹底修復手機螢幕狹窄時導航欄按鈕在畫面外導致指針指歪的座標跑位問題！",
    "3. 【極速 60fps 雙幀精準渲染】完美同步滾動後精確座標，零延遲零卡頓"
  ],
  "minAppVersion": "1.0.0",
  "otaUpdateEnabled": true
}
```
- **Finding**: `"version"` is currently set to `"1.5.2"` (build `2026083003`), out of sync with runtime `app.js` (`1.6.0`).

### 1.2 `index.html` (Observed at `d:\class_point_app_dev\index.html`)
- **Lines 32–34**: Stylesheets lack cache-busting queries:
  ```html
  <link rel="stylesheet" href="./css/styles.css">
  <link rel="stylesheet" href="./css/kitty-theme.css">
  <link rel="stylesheet" href="./css/sanrio-characters.css">
  ```
- **Lines 63–66**: Header version badge has static `v1.6.0`:
  ```html
  <button id="header-version-badge" onclick="appState.openBulletinModal()" class="text-[10px] px-2 py-0.2 rounded-full font-bold bg-pink-100 text-pink-700 border border-pink-300 hover:bg-pink-200 transition active:scale-95 cursor-pointer flex items-center gap-0.5" title="查看公佈欄與更新日誌">
    <span>v1.6.0</span>
    <span>📢</span>
  </button>
  ```
- **Line 223**: Footer contains an outdated hardcoded version `v1.3.0`:
  ```html
  <span class="font-black text-pink-600">ClassQuant Hub v1.3.0</span>
  ```
- **Lines 246–261**: All script tags include query strings `?v=1.6.0`:
  ```html
  <script src="./js/store.js?v=1.6.0"></script>
  <script src="./js/timetable.js?v=1.6.0"></script>
  ...
  <script src="./js/app.js?v=1.6.0"></script>
  ```

### 1.3 `js/app.js` (Observed at `d:\class_point_app_dev\js\app.js`)
- **Line 2**: Header comment lists `Main App Controller v1.4.0`.
- **Line 15**: Constructor sets `this.appVersion = '1.6.0';`.
- **Lines 77–82**: Dynamic header badge updater:
  ```javascript
  updateHeaderVersionBadge() {
    const badge = document.getElementById('header-version-badge');
    if (badge) {
      badge.innerHTML = `<span>v${this.appVersion}</span><span>📢</span>`;
    }
  }
  ```
- **Lines 143–152**: Offline fallback release notes use outdated `2026-08-29` and pre-1.6.0 feature notes:
  ```javascript
  this.showReleaseNotesModal({
    version: this.appVersion,
    releaseDate: '2026-08-29',
    releaseNotes: [
      "1. 頂部新增「🌱 新手引導」互動教學嚮導，一步步引導建立班級與標籤",
      "2. 頂部橫幅隨頁面滑動智慧自動收合，釋放全螢幕視野",
      "3. 新增精緻三麗鷗微動畫（加分星星粒子、卡片微彈回饋）",
      "4. 精簡移除 NAS 模組，系統運行更加輕快順手"
    ]
  }, true);
  ```
- **Line 194**: Release notes modal template has fallback date `2026-08-29`.
- **Lines 293–306**: Bulletin changelog modal (`openBulletinModal`) displays `v1.5.2 (最新實戰導覽版本)` as the latest entry rather than `v1.6.0`.

### 1.4 `manifest.json` (Observed at `d:\class_point_app_dev\manifest.json:1-19`)
```json
{
  "name": "ClassQuant Hub • 班級量化統計與記事戰情室",
  "short_name": "ClassQuant",
  "description": "專屬國中導師與數學科任之班級量化統計、事件記事與因材施教戰情室",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#fff1f2",
  "theme_color": "#f43f5e",
  "orientation": "any",
  "icons": [ ... ]
}
```
- **Finding**: Missing explicit `"id"` and `"version"` metadata properties recommended for PWA manifests and PWABuilder Android generation.

### 1.5 `android/app/build.gradle` (Observed at `d:\class_point_app_dev\android\app\build.gradle:13-14`)
```groovy
        versionCode 120
        versionName "1.2.0"
```
- **Finding**: Android build metadata is pinned to legacy `1.2.0` (code `120`), completely desynchronized from the Web application.

### 1.6 `service-worker.js` (Observed at `d:\class_point_app_dev\service-worker.js:1-93`)
- **Line 2**: Comment lists `(ClassQuant Hub v8)`.
- **Line 5**: `const CACHE_NAME = 'classquant-hub-v19';`.
- **Lines 60–93**: `caches.match(event.request)` lacks `{ ignoreSearch: true }`, failing cache lookups when offline for assets requested with query strings (`?v=1.6.0`).

---

## 2. Logic Chain

1. **Root Cause of Version Drift**:
   - As features evolved across Milestones, version strings were updated piecemeal (e.g., `js/app.js` and script tags were bumped to `1.6.0`, but `version.json` remained at `1.5.2`, footer at `v1.3.0`, Android build at `1.2.0`, and SW cache at `v19`).
2. **False Downgrade & Cache-Eviction Loop Mechanism**:
   - `js/app.js:166` executes `if (info.version && info.version !== this.appVersion && lastSeen !== info.version)`.
   - When `app.js` (1.6.0) fetches `version.json` (1.5.2), `'1.5.2' !== '1.6.0'` is true.
   - The user is presented with a "New Version v1.5.2" modal. Clicking the confirmation button executes `dismissReleaseNotes('1.5.2')`, which executes:
     `if (this.appVersion !== version) { caches.delete(all); location.reload(true); }`.
   - This purges the offline cache on startup and initiates an endless reload loop.
3. **Offline Script Cache Miss Mechanism**:
   - `index.html` requests `<script src="./js/app.js?v=1.6.0"></script>`.
   - `service-worker.js` precaches `'./js/app.js'`.
   - In Cache API specification, matching `'./js/app.js?v=1.6.0'` against stored `'./js/app.js'` yields `undefined` unless `{ ignoreSearch: true }` is specified.
4. **Resolution Strategy**:
   - Atomically synchronize all 6 files to master version `1.6.0` (Android `versionCode: 160`, SW cache `classquant-hub-v20`, `version.json` build `2026083004`).
   - Add `{ ignoreSearch: true }` to all `caches.match` calls in `service-worker.js`.
   - Add `?v=1.6.0` to CSS `<link>` tags for query symmetry.

---

## 3. Consistency Rules (VCR-1 to VCR-6)

| Rule ID | Rule Name | Specification | Invariant / Enforcement |
|---|---|---|---|
| **VCR-1** | **Single Semantic Version Truth** | All runtime code, metadata, HTML tags, and native wrappers must declare semantic version `1.6.0`. | `version.json:version === app.js:this.appVersion === index.html badge === index.html footer === manifest.json:version === build.gradle:versionName === '1.6.0'` |
| **VCR-2** | **Monotonic Cache Name Progression** | `service-worker.js:CACHE_NAME` must be bumped to `'classquant-hub-v20'`. | `activate` event deletes old caches (`classquant-hub-v19` and older). |
| **VCR-3** | **Query Normalization & Search Ignore** | All static asset requests in `index.html` use `?v=1.6.0`; `service-worker.js` uses `{ ignoreSearch: true }` on all `caches.match` calls. | Guarantees 100% offline cache hit rate for version-queried assets. |
| **VCR-4** | **Downgrade Loop Immunity** | `version.json` must match `app.js:this.appVersion` (`1.6.0`). | `checkForUpdates()` does not trigger unwanted release notes modals or cyclic cache wipes. |
| **VCR-5** | **Android Native Parity** | `build.gradle` must declare `versionCode 160` and `versionName "1.6.0"`. | Native Android APK builds and PWABuilder exports reflect exact web versioning. |
| **VCR-6** | **Bulletin Changelog Completeness** | `js/app.js:openBulletinModal()` includes `v1.6.0 (最新旗艦發布版)` as the primary card with comprehensive release highlights. | Users accessing the in-app bulletin see an accurate, up-to-date changelog. |

---

## 4. Exact Implementation Blueprint & Diffs

### File 1: `version.json` (`d:\class_point_app_dev\version.json`)
```diff
--- a/version.json
+++ b/version.json
@@ -1,13 +1,14 @@
 {
-  "version": "1.5.2",
-  "buildNumber": 2026083003,
+  "version": "1.6.0",
+  "buildNumber": 2026083004,
   "releaseDate": "2026-08-30",
   "appName": "ClassQuant Hub",
   "releaseNotes": [
-    "1. 【實戰級動態教學】全面升級 12 大沉浸式操作關卡（點選座位、課堂加分動效、自訂標籤、Excel 批次貼上、名冊細項改名調座號、事後補記勾選評語提交、四象限戰情解讀）！",
-    "2. 【手機導航水平自動置中】徹底修復手機螢幕狹窄時導航欄按鈕在畫面外導致指針指歪的座標跑位問題！",
-    "3. 【極速 60fps 雙幀精準渲染】完美同步滾動後精確座標，零延遲零卡頓"
+    "1. 【新手導覽全方位升級】全新 12 步引導式動態教學，具備高精準度 SVG 圓角聚光燈與方位指示指針！",
+    "2. 【全自動模擬手勢巡航】流暢貝茲曲線自動導航，視圖平滑轉場無縫銜接！",
+    "3. 【防連點防跳步狀態鎖】全面強化互動生命週期與事件隔離，杜絕誤觸跳步與滾動死鎖！",
+    "4. 【PWA 離線快取同步】全新 Service Worker 智能快取與版本原子化同步，杜絕舊版閃爍回退！"
   ],
   "minAppVersion": "1.0.0",
   "otaUpdateEnabled": true
 }
```

---

### File 2: `index.html` (`d:\class_point_app_dev\index.html`)
```diff
--- a/index.html
+++ b/index.html
@@ -31,9 +31,9 @@
   <!-- Custom Stylesheets -->
-  <link rel="stylesheet" href="./css/styles.css">
-  <link rel="stylesheet" href="./css/kitty-theme.css">
-  <link rel="stylesheet" href="./css/sanrio-characters.css">
+  <link rel="stylesheet" href="./css/styles.css?v=1.6.0">
+  <link rel="stylesheet" href="./css/kitty-theme.css?v=1.6.0">
+  <link rel="stylesheet" href="./css/sanrio-characters.css?v=1.6.0">
 </head>
@@ -222,3 +222,3 @@
       <span class="kitty-cat-mini"></span>
-      <span class="font-black text-pink-600">ClassQuant Hub v1.3.0</span>
+      <span class="font-black text-pink-600">ClassQuant Hub v1.6.0</span>
       <span class="text-slate-500">| 三麗鷗家族陪伴國中教師因材施教</span>
```

---

### File 3: `js/app.js` (`d:\class_point_app_dev\js\app.js`)
```diff
--- a/js/app.js
+++ b/js/app.js
@@ -1,3 +1,3 @@
 /**
- * ClassQuant Hub - Main App Controller v1.4.0
+ * ClassQuant Hub - Main App Controller v1.6.0
  * Theme Switcher, Native Web Audio Chime Engine, Smart Auto-Collapsing Header on Scroll,
@@ -144,8 +144,8 @@
     this.showReleaseNotesModal({
       version: this.appVersion,
-      releaseDate: '2026-08-29',
+      releaseDate: '2026-08-30',
       releaseNotes: [
-        "1. 頂部新增「🌱 新手引導」互動教學嚮導，一步步引導建立班級與標籤",
-        "2. 頂部橫幅隨頁面滑動智慧自動收合，釋放全螢幕視野",
-        "3. 新增精緻三麗鷗微動畫（加分星星粒子、卡片微彈回饋）",
-        "4. 精簡移除 NAS 模組，系統運行更加輕快順手"
+        "1. 【新手導覽全方位升級】全新 12 步引導式動態教學，具備高精準度 SVG 圓角聚光燈與方位指示指針！",
+        "2. 【全自動模擬手勢巡航】流暢貝茲曲線自動導航，視圖平滑轉場無縫銜接！",
+        "3. 【防連點防跳步狀態鎖】全面強化互動生命週期與事件隔離，杜絕誤觸跳步與滾動死鎖！",
+        "4. 【PWA 離線快取同步】全新 Service Worker 智能快取與版本原子化同步，杜絕舊版閃爍回退！"
       ]
@@ -194,3 +194,3 @@
-        <p class="text-xs text-slate-500 mb-4 font-bold">發布日期：${info.releaseDate || '2026-08-29'}</p>
+        <p class="text-xs text-slate-500 mb-4 font-bold">發布日期：${info.releaseDate || '2026-08-30'}</p>
@@ -293,4 +293,22 @@
+          <!-- v1.6.0 -->
+          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
+            <div class="flex items-center justify-between mb-1.5">
+              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
+                v1.6.0 (最新旗艦發布版)
+              </span>
+              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
+            </div>
+            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
+              <li>• 【新手導覽全方位升級】全新 12 步引導式動態教學，具備高精準度 SVG 圓角聚光燈與方位指示指針！</li>
+              <li>• 【全自動模擬手勢巡航】流暢貝茲曲線自動導航，視圖平滑轉場無縫銜接！</li>
+              <li>• 【防連點防跳步狀態鎖】全面強化互動生命週期與事件隔離，杜絕誤觸跳步與滾動死鎖！</li>
+              <li>• 【PWA 離線快取同步】全新 Service Worker 智能快取與版本原子化同步，杜絕舊版閃爍回退！</li>
+            </ul>
+          </div>
+
           <!-- v1.5.2 -->
-          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
+          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
             <div class="flex items-center justify-between mb-1.5">
-              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
-                v1.5.2 (最新實戰導覽版本)
+              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
+                v1.5.2
               </span>
```

---

### File 4: `manifest.json` (`d:\class_point_app_dev\manifest.json`)
```diff
--- a/manifest.json
+++ b/manifest.json
@@ -1,4 +1,6 @@
 {
+  "id": "com.classquant.hub",
   "name": "ClassQuant Hub • 班級量化統計與記事戰情室",
   "short_name": "ClassQuant",
   "description": "專屬國中導師與數學科任之班級量化統計、事件記事與因材施教戰情室",
+  "version": "1.6.0",
   "start_url": "./index.html",
```

---

### File 5: `android/app/build.gradle` (`d:\class_point_app_dev\android\app\build.gradle`)
```diff
--- a/android/app/build.gradle
+++ b/android/app/build.gradle
@@ -12,4 +12,4 @@
         targetSdk 34
-        versionCode 120
-        versionName "1.2.0"
+        versionCode 160
+        versionName "1.6.0"
 
```

---

### File 6: `service-worker.js` (`d:\class_point_app_dev\service-worker.js`)
```diff
--- a/service-worker.js
+++ b/service-worker.js
@@ -1,5 +1,5 @@
 /**
- * Service Worker for 100% Offline PWA functionality with Network-First Live OTA Updates (ClassQuant Hub v8)
+ * Service Worker for 100% Offline PWA functionality with Network-First Live OTA Updates (ClassQuant Hub v1.6.0)
  */
 
-const CACHE_NAME = 'classquant-hub-v19';
+const CACHE_NAME = 'classquant-hub-v20';
@@ -74,3 +74,3 @@
         })
-        .catch(() => caches.match(event.request).then(res => res || caches.match('./index.html')))
+        .catch(() => caches.match(event.request, { ignoreSearch: true }).then(res => res || caches.match('./index.html', { ignoreSearch: true })))
     );
@@ -79,3 +79,3 @@
     event.respondWith(
-      caches.match(event.request).then((cachedResponse) => {
+      caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
         const fetchPromise = fetch(event.request).then((networkResponse) => {
```

---

## 5. Caveats

1. **Browser Cache Storage Pre-existing State**:
   - If a browser instance has an old `classquant-hub-v19` cache, the new `service-worker.js` activation event (`activate`) will automatically delete `classquant-hub-v19` because `key !== 'classquant-hub-v20'`.
2. **Local Storage Key Migration**:
   - `localStorage.getItem('classquant_last_seen_version')` will transition to `'1.6.0'`. Because `app.js:128` checks `lastSeen === this.appVersion`, a fresh user or an upgrading user will see the release notes modal once and never again.
3. **External CDNs**:
   - TailWind CSS, Lucide icons, and Chart.js CDNs are fetched over HTTPS. They are outside the local `ASSETS_TO_CACHE` and are cached by standard HTTP browser cache heuristics.

---

## 6. Conclusion

The version synchronization blueprint unifies the entire ClassQuant Hub project under version **`1.6.0`** (and cache key **`classquant-hub-v20`**).
- It fixes the 5-way version drift across the codebase.
- It eliminates the false downgrade cache-wiping reload loop.
- It guarantees 100% offline cache resolution for query-string-versioned scripts via `{ ignoreSearch: true }`.
- It maintains seamless alignment between Web PWA, PWABuilder, and native Android wrappers.

---

## 7. Verification Method

### 7.1 Automated Invariant Check
Verify consistency across all 6 files using PowerShell:
```powershell
# 1. Check version.json
$vJson = (Get-Content d:\class_point_app_dev\version.json | ConvertFrom-Json).version
if ($vJson -ne "1.6.0") { Write-Error "version.json version mismatch: $vJson" }

# 2. Check manifest.json
$mJson = (Get-Content d:\class_point_app_dev\manifest.json | ConvertFrom-Json).version
if ($mJson -ne "1.6.0") { Write-Error "manifest.json version mismatch: $mJson" }

# 3. Check service-worker.js cache name
$swContent = Get-Content d:\class_point_app_dev\service-worker.js -Raw
if ($swContent -notmatch "classquant-hub-v20") { Write-Error "service-worker.js CACHE_NAME mismatch" }
if ($swContent -notmatch "ignoreSearch:\s*true") { Write-Error "service-worker.js ignoreSearch missing" }

# 4. Check index.html footer
$indexContent = Get-Content d:\class_point_app_dev\index.html -Raw
if ($indexContent -notmatch "ClassQuant Hub v1\.6\.0") { Write-Error "index.html footer version mismatch" }

# 5. Check android/app/build.gradle
$gradleContent = Get-Content d:\class_point_app_dev\android\app\build.gradle -Raw
if ($gradleContent -notmatch 'versionName\s+"1\.6\.0"') { Write-Error "build.gradle versionName mismatch" }
if ($gradleContent -notmatch 'versionCode\s+160') { Write-Error "build.gradle versionCode mismatch" }

# 6. Check js/app.js
$appContent = Get-Content d:\class_point_app_dev\js\app.js -Raw
if ($appContent -notmatch "this\.appVersion = '1\.6\.0'") { Write-Error "app.js appVersion mismatch" }
```

### 7.2 Invalidation Conditions
- Any occurrence of `1.5.2`, `1.3.0`, `1.2.0`, or `v19` in target version fields constitutes a verification failure.
- Any cache miss on `./js/app.js?v=1.6.0` during an offline network disconnection test constitutes a verification failure.

# Quality & Adversarial Review Report: Milestone M4 (PWA Service Worker & Cache Synchronization)

**Reviewer**: Reviewer 2 (PWA Service Worker & Cache Synchronization Reviewer)  
**Roles**: reviewer, critic  
**Target Milestone**: M4 (PWA Service Worker, Cache Normalization, Unified Version Synchronization, Version Check Loop Elimination)  
**Date**: 2026-08-30  
**Overall Verdict**: **APPROVE**  

---

## 1. Observation

Direct evidence collected from the codebase and test execution:

### 1.1 Service Worker Query Normalization & Routing (`service-worker.js`)
- **Cache Name & Asset Pre-caching**:
  - `service-worker.js:6`: `const CACHE_NAME = 'classquant-hub-v20';`
  - `service-worker.js:7-33`: `ASSETS_TO_CACHE` table contains 25 core app files (HTML, CSS, JS, assets).
  - `service-worker.js:37`: `self.skipWaiting()` called immediately on install.
  - `service-worker.js:50-59`: `activate` event iterates through all existing cache keys via `caches.keys()`, deletes any key that `!== CACHE_NAME`, and claims clients immediately via `self.clients.claim()`.
- **Offline Query Parameter Normalization (`{ ignoreSearch: true }`)**:
  - `service-worker.js:101`: `caches.match(event.request, { ignoreSearch: true })` ensures offline requests with query parameters (e.g. `?v=1.6.0`, `?v=1.6.0&ref=pwa&debug=1`) match precached assets without query strings.
  - `service-worker.js:105`: Fallback for navigation requests `caches.match('./index.html', { ignoreSearch: true })`.
  - `service-worker.js:114`: Cache-First strategy for static media and CDN assets also applies `caches.match(event.request, { ignoreSearch: true })`.
- **Network-First Strategy for App Shell / Code**:
  - `service-worker.js:76-84`: Explicitly identifies first-party app code (`.html`, `.json`, `.js`, `.css`, `/`, navigation mode).
  - `service-worker.js:89`: `fetch(event.request, { cache: 'no-cache' })` fetches fresh code directly from the server when online, caching valid 200 responses to prevent stale-code rollback flashes on redeployment.

### 1.2 Unified Version Synchronization Across All 6 Target Files
Every target file was inspected for version alignment:
1. **`service-worker.js`**: Line 3 header `ClassQuant Hub v1.6.0`, Line 6 `CACHE_NAME = 'classquant-hub-v20'`.
2. **`version.json`**:
   ```json
   {
     "version": "1.6.0",
     "buildNumber": 2026083004,
     "releaseDate": "2026-08-30",
     "appName": "ClassQuant Hub",
     "minAppVersion": "1.0.0",
     "otaUpdateEnabled": true
   }
   ```
3. **`index.html`**:
   - Line 32-34: CSS links with `?v=1.6.0` (`styles.css`, `kitty-theme.css`, `sanrio-characters.css`).
   - Line 64: Header version badge text `<span>v1.6.0</span>`.
   - Line 223: Footer bar text `<span class="font-black text-pink-600">ClassQuant Hub v1.6.0</span>`.
   - Lines 246-261: All 16 `<script src="./js/*.js?v=1.6.0">` tags synchronized with `?v=1.6.0`.
4. **`js/app.js`**:
   - Line 15: `this.appVersion = '1.6.0';`
   - Line 80: Version badge template ``<span>v${this.appVersion}</span><span>📢</span>``.
   - Line 178: Fallback release notes version `this.appVersion` (`1.6.0`).
   - Line 330: About modal `當前版本：v${this.appVersion}`.
5. **`manifest.json`**:
   - Line 6: `"version": "1.6.0"`
6. **`android/app/build.gradle`**:
   - Line 13: `versionCode 160`
   - Line 14: `versionName "1.6.0"`

### 1.3 Semantic Version Comparison & Elimination of Reload Loops (`js/app.js`)
- **Semantic Versioning Engine (`js/app.js:132-145`)**:
  ```javascript
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
- **Launch & Dismissal Logic (`js/app.js:148-287`)**:
  - `checkReleaseNotesOnLaunch()`: Checks `localStorage.getItem('classquant_last_seen_version')`. If `lastSeen && compareVersions(lastSeen, this.appVersion) >= 0`, it immediately exits and never displays the modal again.
  - `dismissReleaseNotes(version)`: Updates `localStorage.setItem('classquant_last_seen_version', targetVersion)`. Triggers Service Worker update and `location.reload()` **only if** `compareVersions(targetVersion, this.appVersion) > 0`. If `targetVersion <= this.appVersion`, it simply shows a success toast without reloading.

### 1.4 Test Suite Execution
- Command: `powershell -NoProfile -ExecutionPolicy Bypass -File tests/run_e2e_tests.ps1`
- Results:
  - Tier 1 (Feature Coverage): 75 / 75 passed (including F11-1..5, F12-1..5, F13-1..5)
  - Tier 2 (Boundary & Corner Cases): 75 / 75 passed (including F11-B1..B5, F12-B1..B5, F13-B1..B5)
  - Tier 3 (Cross-Feature Combinations): 20 / 20 passed (including T3-19, T3-20)
  - Tier 4 (Real-World Application Scenarios): 10 / 10 passed (including T4-05, T4-06, T4-10)
  - **Grand Total**: 180 / 180 Passed (100% pass rate, Exit Code 0).

---

## 2. Logic Chain

1. **Query Normalization Logic**:
   - Modern browser Service Workers treat URLs with query strings as distinct cache entries unless configured otherwise. When static scripts and CSS files are referenced in HTML with version tags (e.g. `<script src="./js/app.js?v=1.6.0">`), an offline `caches.match` without `{ ignoreSearch: true }` would fail to match `./js/app.js` precached during SW installation.
   - By supplying `{ ignoreSearch: true }` in all `caches.match` calls (lines 101, 105, 114 of `service-worker.js`), any request containing arbitrary or versioned query parameters (`?v=1.6.0`, `?v=1.6.0&ref=pwa`) resolves correctly to the cached asset during offline cold boot.

2. **Network-First Cache Freshness**:
   - Previous architectures that used Cache-First for JS/HTML assets risked serving stale JavaScript indefinitely until manual cache purging.
   - In `service-worker.js`, `isAppCode` routes `.html`, `.json`, `.js`, and `.css` through `fetch(event.request, { cache: 'no-cache' })`. When the client has network connectivity, it always receives the latest production code and updates the local cache bucket (`classquant-hub-v20`). When offline, the catch handler seamlessly provides instant offline fallback.

3. **Complete Version Consistency**:
   - Fragmented version numbers across HTML badges, manifest, JSON metadata, and Android gradle files cause user confusion and false version mismatch warnings.
   - All 6 files (`service-worker.js`, `version.json`, `index.html`, `js/app.js`, `manifest.json`, `android/app/build.gradle`) have been synchronized to version `1.6.0` (Android `versionCode 160`), preventing any desynchronization.

4. **Elimination of Reload Loops & False Downgrades**:
   - Naive string equality (`info.version !== this.appVersion`) caused reload loops if the remote `version.json` was older or if leading 'v' characters differed.
   - `compareVersions` performs numerical segment-by-segment comparison (`1.6.0` vs `1.5.2` -> `1`, `1.10.0` vs `1.9.0` -> `1`, `v1.6.0` vs `1.6.0` -> `0`).
   - Modal prompt is strictly shown only once per version via `localStorage.setItem('classquant_last_seen_version', ...)`.
   - Dismissal only triggers `location.reload()` if remote version is strictly greater than `this.appVersion`.

5. **Adversarial & Integrity Assessment**:
   - No hardcoded test bypasses or fabricated logs were detected.
   - The test runner `tests/run_e2e_tests.ps1` dynamically loads and tests the actual files and functions.
   - Edge cases tested: multi-parameter queries (`?v=1.6.0&ref=pwa&debug=1`), hash fragments (`#tour`), offline cold boot, non-GET bypass, semver hierarchy with double-digit minor numbers (`1.10.0`), whitespace trimming, and offline launch resilience.

---

## 3. Caveats

- **Native Android Build Environment**: The `android/app/build.gradle` file is synchronized (`versionCode 160`, `versionName "1.6.0"`), but native Android APK compilation (`./gradlew assembleRelease`) requires Android SDK tools if invoked outside the web runtime. The WebView wrapper loads the web app assets directly.
- **Node.js Environment**: The project's primary test runner is native PowerShell (`tests/run_e2e_tests.ps1`). Node.js is not present in the local Windows test environment, so test execution relies on PowerShell (which passed 100%).

---

## 4. Conclusion

Milestone M4 has been implemented to full specification with zero defects or regressions:
- `{ ignoreSearch: true }` is properly configured across all Service Worker cache match invocations.
- Cache bucket `classquant-hub-v20` and Network-First routing are active and verified.
- All 6 target files are 100% synchronized to `v1.6.0` / `versionCode 160`.
- Semantic version comparison and reload loop elimination are mathematically and behaviorally sound.
- All 180 E2E tests in `tests/run_e2e_tests.ps1` pass with 100% success rate.

**Verdict**: **APPROVE**

---

## 5. Verification Method

To independently verify this report:

1. **Run Master E2E Test Suite**:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File tests/run_e2e_tests.ps1
   ```
   *Expected outcome: 180 / 180 passed, exit code 0.*

2. **Inspect Service Worker Query Normalization & Cache Name**:
   - File: `d:\class_point_app_dev\service-worker.js` (lines 6, 101, 105, 114)
   - Verify `const CACHE_NAME = 'classquant-hub-v20';`
   - Verify `caches.match(..., { ignoreSearch: true })`

3. **Inspect Version Synchronization Across All 6 Files**:
   - `service-worker.js`: `ClassQuant Hub v1.6.0`, `classquant-hub-v20`
   - `version.json`: `"version": "1.6.0"`, `"buildNumber": 2026083004`
   - `index.html`: `?v=1.6.0` on all CSS/JS tags, `v1.6.0` in header badge (line 64) and footer (line 223)
   - `js/app.js`: `this.appVersion = '1.6.0'` (line 15)
   - `manifest.json`: `"version": "1.6.0"` (line 6)
   - `android/app/build.gradle`: `versionCode 160`, `versionName "1.6.0"` (lines 13-14)

4. **Inspect Semantic Version Comparison & Loop Elimination**:
   - File: `d:\class_point_app_dev\js\app.js` (lines 125-287)
   - Verify `compareVersions`, `checkReleaseNotesOnLaunch`, `showReleaseNotesModal`, and `dismissReleaseNotes`.

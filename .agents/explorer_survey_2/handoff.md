# Handoff Report: Event Lifecycle & PWA Cache Architecture Survey

**Agent**: Explorer Survey 2 (Event Lifecycle & PWA Cache Specialist)  
**Working Directory**: `d:\class_point_app_dev\.agents\explorer_survey_2`  
**Target Project**: ClassQuant Hub (`d:\class_point_app_dev`)  
**Mission**: Investigate R3 (Anti-Jump & Anti-Lock Interaction Defense) and R4 (PWA Service Worker & Version Cache Synchronization)  
**Date**: 2026-08-30  

---

## 1. Observation

Direct code observations with exact file paths, line numbers, and verbatim code snippets:

### R3 Observations (Event Lifecycle & Interaction Gating):
1. **Unprotected `nextStep()` Re-entrancy**:
   - File: `d:\class_point_app_dev\js\onboardingTour.js`, lines 522–532
   ```javascript
   nextStep() {
     if (this.currentStep < this.steps.length - 1) {
       this.currentStep++;
       this.renderStep();
       if (window.appState?.playPop) window.appState.playPop();
     } else {
       this.endTour();
       if (window.appState?.playChime) window.appState.playChime();
       window.appState.showToast('🎉 恭喜完成實戰教學！', 'success');
     }
   }
   ```
   No lock (`isTransitioning`) or debounce flag exists. Each rapid click increments `this.currentStep` synchronously while asynchronous `renderStep()` is still awaiting DOM elements and transitions.

2. **Non-Target Touch Leakage in Manual Steps**:
   - File: `d:\class_point_app_dev\js\onboardingTour.js`, lines 236–250
   ```javascript
   this.clickBlocker = (e) => {
     if (!this.isActive) return;
     if (e.target.closest('#tour-popover')) return;
     
     if (this.isAutoPlaying) {
       e.preventDefault();
       e.stopPropagation();
     } else {
        const step = this.steps[this.currentStep];
        if (step && (step.action === 'info' || step.action === 'auto-click')) {
           e.preventDefault();
           e.stopPropagation();
        }
     }
   };
   ```
   For `step.action === 'manual-click'` or `'manual-change'`, `clickBlocker` performs no prevention or stopping of propagation for clicks outside the spotlight target.

3. **Auto-Pilot Ghost Cursor Async Continuation without Cancellation Check**:
   - File: `d:\class_point_app_dev\js\onboardingTour.js`, lines 388–430
   ```javascript
   async playGhostCursor() {
     if (this.isAutoPlaying || !this.currentTargetEl) return;
     this.isAutoPlaying = true;
     ...
     await new Promise(r => setTimeout(r, 850));
     ...
     this.currentTargetEl.click();
     await new Promise(r => setTimeout(r, 400));
     ghost.style.opacity = '0';
     this.nextStep();
   }
   ```
   If user triggers skip or closes the tour during the 850ms or 400ms delay, `playGhostCursor` proceeds to click `currentTargetEl` and calls `this.nextStep()`, advancing the tour unexpectedly.

4. **Select Element 'change' Event Trap**:
   - File: `d:\class_point_app_dev\js\onboardingTour.js`, lines 21–27 & lines 504–519
   Step 1 uses `action: 'manual-change'`. If the user opens `#global-class-select` and selects the already-active option, native DOM does not dispatch a `change` event, leaving the tour in a waiting state without error feedback.

5. **Modal Open / Close Collision**:
   - File: `d:\class_point_app_dev\js\onboardingTour.js`, lines 63–78 & lines 315–317; `d:\class_point_app_dev\js\rosterManager.js`, line 58
   Step 6 triggers `rosterManager.openBatchPasteModal('801')`. 200ms later Step 7 begins, and `renderStep()` calls `window.appState.closeModal()`, closing the modal immediately.

6. **Uncaught Error Scroll-Lock Trap**:
   - File: `d:\class_point_app_dev\js\onboardingTour.js`, lines 225–235
   `start()` sets `.tour-strict-locked` on `html` and `body` and adds capturing `touchmove` and `wheel` listeners that call `e.preventDefault()`. If an exception occurs in `renderStep()`, `endTour()` is never reached and the webpage remains permanently unscrollable.

---

### R4 Observations (Service Worker & Cache Synchronization):
1. **Version Variable Divergence**:
   - `d:\class_point_app_dev\js\app.js:15`: `this.appVersion = '1.6.0';`
   - `d:\class_point_app_dev\version.json:2`: `"version": "1.5.2"`
   - `d:\class_point_app_dev\index.html:64`: `<button id="header-version-badge">...<span>v1.6.0</span>...`
   - `d:\class_point_app_dev\index.html:223`: `<span class="font-black text-pink-600">ClassQuant Hub v1.3.0</span>`
   - `d:\class_point_app_dev\index.html:246-261`: `<script src="./js/*.js?v=1.6.0">`
   - `d:\class_point_app_dev\service-worker.js:5`: `const CACHE_NAME = 'classquant-hub-v19';`
   - `d:\class_point_app_dev\android\app\build.gradle:13-14`: `versionCode 120`, `versionName "1.2.0"`

2. **Query String Mismatch in Service Worker Caching**:
   - File: `d:\class_point_app_dev\service-worker.js`, lines 6–32
   `ASSETS_TO_CACHE` contains `'./js/app.js'`, `'./js/store.js'`, etc. (bare URLs without `?v=...`).
   - File: `d:\class_point_app_dev\index.html`, lines 246–261
   Scripts are requested as `<script src="./js/app.js?v=1.6.0">`.
   - File: `d:\class_point_app_dev\service-worker.js`, line 80
   `caches.match(event.request)` is called without `{ ignoreSearch: true }`.

3. **Stale-While-Revalidate Race on Script Resources**:
   - File: `d:\class_point_app_dev\service-worker.js`, lines 78–92
   Non-HTML/JSON requests use Stale-While-Revalidate: `cachedResponse || fetchPromise`. When updated code is deployed, the old cached JS is executed on the newly fetched HTML, delaying update application until a subsequent page reload.

4. **False Update Alert & Cache Purging Reload Loop**:
   - File: `d:\class_point_app_dev\js\app.js`, lines 166–170 & lines 228–235
   `app.js` (1.6.0) checks `version.json` (1.5.2). `info.version !== this.appVersion` evaluates to true (`'1.5.2' !== '1.6.0'`), showing an update prompt for `v1.5.2`. Clicking update calls `caches.delete(k)` on all caches and hard-reloads the page.

---

## 2. Logic Chain

1. **Step-Skipping Logic**:
   - Observation: `nextStep()` has no debouncing or transition mutex lock (Observation R3.1).
   - Reasoning: `renderStep()` has asynchronous polling and transition delays.
   - Inference: Rapid consecutive clicks on "下一步" or "跳過此步" trigger multiple `nextStep()` invocations synchronously, advancing `this.currentStep` multiple times and racing concurrent `renderStep()` DOM modifications, causing step skipping.

2. **Interaction Desynchronization Logic**:
   - Observation: `clickBlocker` allows all clicks to pass during `manual-click` and `manual-change` steps (Observation R3.2).
   - Reasoning: Users can tap non-target elements outside the spotlight cutout.
   - Inference: Tapping other UI elements triggers unintended state changes (e.g. switching tabs or selecting other students), causing subsequent tour steps to fail to locate their target elements.

3. **Ghost Cursor Timer Leak Logic**:
   - Observation: `playGhostCursor()` has async timeouts without session or activity cancellation checks (Observation R3.3).
   - Reasoning: User can click skip or close while the timeout is pending.
   - Inference: The expired timer still triggers `this.currentTargetEl.click()` and `this.nextStep()`, skipping steps or resurrecting the tour unexpectedly.

4. **Offline Blank Screen Logic**:
   - Observation: Pre-cached URLs in SW lack query parameters, while `index.html` loads scripts with `?v=1.6.0` (Observation R4.2).
   - Reasoning: `caches.match` requires exact URL match unless `{ ignoreSearch: true }` is enabled.
   - Inference: On an offline initial boot, `caches.match` misses, network fetch fails, and scripts do not load.

5. **Stale Code Flash & Rollback Logic**:
   - Observation: SW serves JS via Stale-While-Revalidate (Observation R4.3) and `version.json` (1.5.2) mismatches `app.js` (1.6.0) (Observation R4.4).
   - Reasoning: HTML is loaded fresh via Network-First, but JS is served from old cache. Meanwhile, `app.js` perceives `version.json` as a different version and triggers a cache purge and reload.
   - Inference: Users experience UI glitches, mismatched logic, and recurring modal popups prompting downgrades.

---

## 3. Caveats

1. **Scope Boundaries**:
   - Investigation focused on event handling in `onboardingTour.js` and PWA caching in `service-worker.js`, `app.js`, and `index.html`. Individual business logic inside `statistics.js`, `charts.js`, and `aiImportExport.js` was reviewed for event impact but not altered.
2. **Device Hardware Variations**:
   - Touch event timing and click synthesis (e.g. 300ms touch delay vs pointer events) vary slightly across iOS WebKit vs Chromium on Android, making coordinate-based bounding-box gating the most reliable cross-platform defense.
3. **External CDN Resources**:
   - Tailwind CSS and Lucide icons are loaded from external CDNs. In an offline PWA environment, these rely on runtime browser cache or Service Worker caching after initial online load.

---

## 4. Conclusion

1. **R3 (Anti-Jump & Anti-Lock Interaction Defense)**:
   - The tour engine requires an explicit transition mutex (`isTransitioning`), generation counter (`stepSessionId`) to cancel background timers, coordinate-based touch gating to block non-target taps during manual steps, multi-event handling for `<select>` dropdowns, and a global try/finally error boundary around viewport locks.
2. **R4 (PWA Service Worker & Version Cache Synchronization)**:
   - All version variables across `version.json`, `app.js`, `index.html` (badge, footer, script tags), `service-worker.js` (`CACHE_NAME`), and `build.gradle` must be unified (to `1.6.0` or `1.6.1`).
   - `service-worker.js` must enable `{ ignoreSearch: true }` in `caches.match()` and switch application scripts/styles to Network-First (with cache fallback) to eradicate stale-code flashes and offline launch failures.

---

## 5. Verification Method

### How to Independently Verify:

1. **Inspect Version Inconsistencies**:
   - Run grep across files:
     ```powershell
     rg -n "version|appVersion|CACHE_NAME|versionName" index.html js/app.js version.json service-worker.js android/app/build.gradle
     ```
   - Verify line numbers and disparate values (1.6.0, 1.5.2, 1.3.0, 1.2.0, v19).

2. **Verify Offline Script Cache Miss**:
   - In browser DevTools -> Application -> Service Workers:
   - Check `classquant-hub-v19` Cache Storage. Notice entries are stored as `./js/app.js` without query strings.
   - Request `fetch('./js/app.js?v=1.6.0')` with offline mode enabled in Network tab; observe 404/failure unless `{ ignoreSearch: true }` is used.

3. **Verify Step Skipping on Rapid Clicks**:
   - In DevTools console on `index.html`:
     ```javascript
     onboardingTour.start(0);
     onboardingTour.nextStep();
     onboardingTour.nextStep();
     ```
   - Observe `currentStep` jumping from 0 to 2 immediately before Step 1 finishes rendering.

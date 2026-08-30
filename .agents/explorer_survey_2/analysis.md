# Comprehensive Investigation Analysis: Event Lifecycle & PWA Cache Architecture

**Author**: Explorer Survey 2 (Event Lifecycle & PWA Cache Specialist)  
**Target Project**: ClassQuant Hub (`d:\class_point_app_dev`)  
**Scope**: Requirements R3 (Anti-Jump & Anti-Lock Interaction Defense) & Requirements R4 (PWA Service Worker & Version Cache Synchronization)  
**Date**: 2026-08-30  

---

## 1. Executive Summary

ClassQuant Hub is an offline-capable PWA designed for junior high school homeroom teachers and math subject teachers. A thorough inspection of the project's codebase revealed critical vulnerabilities in two interconnected layers:
1. **Interactive Event Lifecycle & State Transition Engine (`js/onboardingTour.js`)**: Lacks interaction debouncing, mutex/transition locks, event isolation outside the spotlight target, and proper cleanup for asynchronous auto-pilot timers. This causes step-skipping races, double-tap ghost executions, modal collisions, and potential permanent viewport scroll locks.
2. **PWA Service Worker, Cache Storage & Versioning Architecture (`service-worker.js`, `index.html`, `version.json`, `js/app.js`, `build.gradle`)**: Contains severe version desynchronization (5 divergent version tags: v1.6.0, v1.5.2, v1.3.0, v1.2.0, cache v19), a query string mismatch causing cache misses for scripts on initial offline launches, a Stale-While-Revalidate race condition producing stale-code flashes, and an automatic cache-clearing downgrade loop in `app.js`.

---

## 2. Deep Dive: R3 — Hardened Anti-Jump & Anti-Lock Interaction Defense

### 2.1 Component Architecture & Workflow Map

The interactive onboarding system is governed by `OnboardingTour` in `js/onboardingTour.js`.
```
[User Tap / Auto-Pilot Trigger]
        │
        ▼
[Capture-Phase Click/Touch Blockers] (js/onboardingTour.js:236-253)
        │
        ├── Is Popover? ── Yes ──> Allow event to pass
        ├── Is AutoPlaying? ── Yes ──> Block event (preventDefault + stopPropagation)
        └── Step is info/auto-click? ── Yes ──> Block event
                                     └── No (manual-click/change) ──> ALLOW EVENT (Leaking non-target touches!)
        │
        ▼
[Target Element Event Listener] (js/onboardingTour.js:503-520)
        │ (fires once, triggers setTimeout 200ms)
        ▼
[nextStep() Call] (js/onboardingTour.js:522-532)
        │ (NO transition lock / mutex gate!)
        ▼
[Async renderStep()] (js/onboardingTour.js:299-386)
        │
        ├── 1. Reset ghost cursor / pointer UI
        ├── 2. closeModal() if not a modal step
        ├── 3. switchTab(step.tab)
        ├── 4. waitForElement(primarySelector, fallbackSelector, timeout=3000ms)
        ├── 5. nav.scrollTo() & targetEl.scrollIntoView()
        ├── 6. setupEnforcement(targetEl, step)
        └── 7. highlightElement(targetEl, step) -> SVG path & pointer placement
```

---

### 2.2 Critical Vulnerabilities & Failure Modes in Event Handling

#### Vulnerability 1: Absence of Mutex / Transition Gating (`nextStep()` Re-entrancy Race)
- **Location**: `js/onboardingTour.js`, lines 522–532 (`nextStep()`) and lines 299–386 (`renderStep()`)
- **Mechanism**: `nextStep()` is a synchronous method that increments `this.currentStep++` and immediately invokes `this.renderStep()` (an async method containing multiple `await` delays: `waitForElement` polling up to 3000ms, scrolling delay of 400ms).
- **Failure Scenario**:
  - If a user rapidly taps "下一步 ➔" or "跳過此步 ➔" (e.g., 2 taps in 100ms), `this.currentStep` increments twice before the first `renderStep()` completes.
  - Two parallel `renderStep()` invocations run simultaneously. They race to mutate DOM classes, attach conflicting event listeners via `setupEnforcement`, and switch tabs asynchronously.
  - **Result**: Immediate step skipping (e.g. jumping from Step 2 directly to Step 4) or erratic state synchronization where Step 4 UI is active but Step 3 listeners remain attached.

#### Vulnerability 2: Target & Non-Target Touch Leakage in Manual Steps
- **Location**: `js/onboardingTour.js`, lines 236–253 (`this.clickBlocker`)
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
- **Mechanism**: In `manual-click` or `manual-change` steps (Steps 1, 2, 3, 6, 9), `clickBlocker` intentionally does not block events.
- **Failure Scenario**:
  - If the user taps anywhere outside the spotlight hole (e.g. other seat cards `#seat-card-5`, header theme buttons `#theme-toggle-btn`, or navigation tabs), the touch is allowed to pass to the underlying application.
  - Tapping another student card selects multiple students; tapping a nav tab switches views away from the spotlight target.
  - When the tour attempts to transition to the next step, the required target element is no longer visible, causing `waitForElement` to time out (3000ms stall) and fallback to `document.body`.

#### Vulnerability 3: Auto-Pilot Ghost Cursor Timer Leaks & Zombie Invocations
- **Location**: `js/onboardingTour.js`, lines 388–430 (`playGhostCursor()`)
- **Mechanism**:
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
- **Failure Scenario**:
  1. The user taps "讓系統代為操作 🪄" in Step 5 (`step-goto-roster`), triggering `playGhostCursor()`.
  2. While the 850ms timer is ticking, the user clicks "跳過此步 ➔" (`nextStep()`) or "✕ 結束" (`endTour()`).
  3. `nextStep()` moves `this.currentStep` to Step 6 (`step-roster-paste`).
  4. The background `playGhostCursor()` promise resolves after 850ms, clicks `this.currentTargetEl` (which was the roster tab from Step 5), waits 400ms, and calls `this.nextStep()` AGAIN.
  5. **Result**: Step 6 is instantly skipped without user input! If `endTour()` was clicked, the ghost cursor unexpectedly resurrects the tour or clicks DOM elements post-tour.

#### Vulnerability 4: Dropdown 'change' Event Trap in Step 1 (Deadlock)
- **Location**: `js/onboardingTour.js`, lines 21–27 (Step 1) and lines 503–520 (`setupEnforcement`)
- **Mechanism**:
  - Step 1 targets `#global-class-select` with `action: "manual-change"`.
  - `setupEnforcement` attaches a `'change'` event listener to `#global-class-select`.
- **Failure Scenario**:
  - A user clicks the `<select>` dropdown to view classes, but re-selects the currently active class (e.g. 801).
  - The browser's native `<select>` element does **NOT** dispatch a `'change'` event when the value is unchanged.
  - The tour remains permanently waiting for a `'change'` event. The user believes clicking the dropdown is broken, leading to a perceived deadlock unless they discover "跳過此步 ➔".

#### Vulnerability 5: Modal Collision between Step 6 (`#roster-paste-btn`) & Step 7 (`#roster-details`)
- **Location**: `js/onboardingTour.js`, lines 63–78 & lines 315–317; `js/rosterManager.js`, line 58
- **Mechanism**:
  - In Step 6, the user clicks `#roster-paste-btn`. This invokes `rosterManager.openBatchPasteModal('801')`, opening `#global-modal`.
  - The step listener triggers `setTimeout(() => this.nextStep(), 200)`.
  - In Step 7 (`renderStep()`), lines 315–317 execute:
    ```javascript
    if (window.appState && (!step.targetSelector || !step.targetSelector.includes('global-modal'))) {
      window.appState.closeModal();
    }
    ```
- **Failure Scenario**:
  - The modal pops open on screen, and 200ms later `renderStep()` abruptly closes `#global-modal` via `closeModal()`.
  - **Result**: Violent visual flash/flicker and disorientation as the modal appears and vanishes in a fraction of a second.

#### Vulnerability 6: Permanent Viewport Scroll-Lock Deadlock on Uncaught Error
- **Location**: `js/onboardingTour.js`, lines 225–235 (`start()`) & lines 546–559 (`endTour()`)
- **Mechanism**:
  - `start()` locks scrolling globally:
    ```javascript
    document.documentElement.classList.add('tour-strict-locked');
    document.body.classList.add('tour-strict-locked');
    document.addEventListener('touchmove', this.scrollBlocker, { passive: false, capture: true });
    document.addEventListener('wheel', this.scrollBlocker, { passive: false, capture: true });
    ```
- **Failure Scenario**:
  - If an uncaught JavaScript exception occurs in any step (e.g. missing DOM node, malformed selector, unhandled promise rejection in `renderStep`), execution halts before `endTour()` can clean up.
  - `touchmove`, `wheel`, and CSS `overflow: hidden !important` remain permanently active on `document.body` and `html`.
  - **Result**: The entire application is rendered completely unscrollable and unresponsive to touches, requiring a full browser tab termination.

---

## 3. Deep Dive: R4 — Resilient PWA Service Worker & Version Cache Synchronization

### 3.1 Codebase Version String Matrix

The following table documents all version references currently scattered across the project:

| Location | Identifier / Code Snippet | Current Value | Role / Impact |
|---|---|---|---|
| `js/app.js:15` | `this.appVersion = '1.6.0';` | `1.6.0` | Runtime App State Master Version |
| `version.json:2` | `"version": "1.5.2"` | `1.5.2` | Cloud OTA Version Endpoint |
| `index.html:64` | `<span id="header-version-badge"><span>v1.6.0</span>...` | `v1.6.0` | Initial Static Header Badge |
| `index.html:223` | `<span class="font-black text-pink-600">ClassQuant Hub v1.3.0</span>` | `v1.3.0` | Static Footer Version (Outdated) |
| `index.html:246-261` | `<script src="./js/*.js?v=1.6.0">` | `?v=1.6.0` | Script Cache-Busting Tags |
| `index.html:32-34` | `<link rel="stylesheet" href="./css/*.css">` | *None* | Stylesheets lack version query |
| `service-worker.js:5` | `const CACHE_NAME = 'classquant-hub-v19';` | `classquant-hub-v19` | Cache Storage Key |
| `js/app.js:297` | `v1.5.2 (最新實戰導覽版本)` | `1.5.2` | Changelog Modal Entry |
| `android/app/build.gradle:13-14` | `versionCode 120`, `versionName "1.2.0"` | `1.2.0` | Android Native Wrapper Build |

---

### 3.2 Service Worker Caching Logic & Lifecycle Analysis

```
                       [Browser Request]
                               │
                               ▼
                    [service-worker.js fetch]
                               │
            Is URL .html, .json, or ending in '/'?
                      /                 \
                    Yes                  No (CSS, JS, PNG, etc.)
                    /                     \
             [Network-First]       [Stale-While-Revalidate]
            /               \                  │
       Online             Offline              ├── 1. Return caches.match(req) immediately
         │                   │                 └── 2. Background fetch(req) -> cache.put()
    Fetch server        Match cache
    & update cache      or fallback
```

---

### 3.3 Critical Caching Flaws & Downgrade Loops

#### Flaw 1: Query String Cache Miss on Initial Offline Launch
- **Location**: `service-worker.js:6-32` (`ASSETS_TO_CACHE`) vs `index.html:246-261`
- **Mechanism**:
  - `service-worker.js` pre-caches bare asset paths during `install`:
    `'./js/store.js'`, `'./js/app.js'`, `'./js/matrix.js'`, etc.
  - `index.html` requests versioned URLs:
    `<script src="./js/store.js?v=1.6.0"></script>`, `<script src="./js/app.js?v=1.6.0"></script>`.
  - In the Cache API, `caches.match(event.request)` matches exact URLs including query strings by default. Because `{ ignoreSearch: true }` is omitted in `service-worker.js:80`, `caches.match('./js/app.js?v=1.6.0')` returns `undefined` on an offline cold boot.
- **Consequence**:
  - On first offline launch without previous online execution of every script, the Cache lookup fails, `fetch()` throws offline NetworkError, and `cachedResponse || fetchPromise` resolves to `null`.
  - All application scripts fail to load, resulting in a blank screen.

#### Flaw 2: The Stale-While-Revalidate "Stale-Code Flash & Mismatch"
- **Location**: `service-worker.js`, lines 78–92
- **Mechanism**:
  - When a user visits an updated app deployment, `index.html` is fetched fresh via Network-First.
  - However, when `index.html` requests the linked JS/CSS files, the Service Worker's Stale-While-Revalidate strategy **immediately serves the OLD cached JS/CSS** while asynchronously fetching the new scripts in the background.
- **Consequence**:
  - The browser executes the new HTML structure against the **old JavaScript logic**.
  - If the new HTML relies on new functions or IDs (e.g. tour selectors, updated modals), uncaught `TypeError: undefined is not a function` errors trigger during boot.
  - The new scripts only take effect on the *subsequent* page reload, creating a "stale rollback flash" on the initial visit.

#### Flaw 3: Version Inversion & Recursive Cache-Purge Reload Loop
- **Location**: `js/app.js:15`, `version.json:2`, and `js/app.js:161-175, 223-237`
- **Mechanism**:
  - `app.js` defines `this.appVersion = '1.6.0'`.
  - `version.json` contains `"version": "1.5.2"`.
  - On launch or network recovery, `app.js` runs `checkForUpdates()` and fetches `./version.json?t=...`.
  - Line 166 checks:
    ```javascript
    if (info.version && info.version !== this.appVersion && lastSeen !== info.version) {
      this.showReleaseNotesModal(info, false);
    }
    ```
  - Since `'1.5.2' !== '1.6.0'`, the app treats `v1.5.2` as an update and displays: **"🌟 發現新版本 ClassQuant Hub v1.5.2"**!
  - When the user taps "✨ 開始體驗最新功能！", `dismissReleaseNotes('1.5.2')` executes:
    ```javascript
    if (this.appVersion !== version || !document.getElementById('onboarding-guide-btn')) {
      if ('caches' in window) {
        const keys = await caches.keys();
        for (let k of keys) await caches.delete(k);
      }
      setTimeout(() => location.reload(true), 300);
    }
    ```
  - **Consequence**: All cached offline assets are wiped out, the browser hard reloads, loads `app.js` (1.6.0), and the entire cycle can repeat.

#### Flaw 4: Missing Service Worker Lifecycle Hooks
- **Location**: `index.html:264-272`
- **Mechanism**:
  - The Service Worker registration code only logs registration success to console.
  - It does not listen to `reg.onupdatefound`, `installingWorker.onstatechange`, or `navigator.serviceWorker.oncontrollerchange`.
  - When a new Service Worker is activated (`skipWaiting` + `clients.claim`), the active page receives no notification or prompt to reload cleanly, leading to split-brain states where the running client operates on stale memory while network requests route through the new worker.

---

## 4. Architectural Recommendations for Implementation

### 4.1 Anti-Jump & Anti-Lock Interaction Defense (R3)

1. **State Machine & Mutex Lock (`isTransitioning`)**:
   - Introduce a strict lock flag `this.isTransitioning` in `OnboardingTour`.
   - Prevent any calls to `nextStep()`, `prevStep()`, or `renderStep()` while `isTransitioning === true`.
   - Implement an abort controller / generation counter `this.tourSessionId` or `this.stepGeneration` to cancel pending `setTimeout`, `requestAnimationFrame`, or auto-pilot promises if a step advances or ends early.

2. **Universal Event Interception & Spotlight Target Gating**:
   - In `clickBlocker`, dynamically calculate if the click/touch coordinates fall strictly inside the current target's bounding client rect.
   - If the touch is inside `#tour-popover` or inside the target bounding rect, permit it.
   - If the touch is outside the spotlight hole, immediately `e.preventDefault()` and `e.stopPropagation()`. Provide a gentle visual pulse on the spotlight to guide the user.

3. **Safe Auto-Pilot Lifecycle Cancellation**:
   - In `playGhostCursor()`, check `if (!this.isActive || currentSession !== this.tourSessionId) return;` after every `await` interval.
   - Disable popover skip/next buttons while `isAutoPlaying === true`, or cleanly abort the auto-pilot sequence before moving forward.

4. **Dropdown `<select>` Interaction Guard**:
   - For Step 1 (`#global-class-select`), listen to both `'change'` and `'click'` / `'blur'`. If the user opens the dropdown and re-selects the same value, detect the interaction and allow progression after a brief delay.

5. **Modal Step Coordination**:
   - In Step 6 (`#roster-paste-btn`), ensure `renderStep()` recognizes modal steps and does not aggressively call `closeModal()` on transition to Step 7.

6. **Global Error Boundary for Viewport Locks**:
   - Wrap `start()`, `renderStep()`, and `playGhostCursor()` in `try...catch` blocks. If an unrecoverable error occurs, gracefully invoke `endTour()` to remove `.tour-strict-locked` and touch blockers, preventing app freeze.

### 4.2 Resilient PWA Service Worker & Version Synchronization (R4)

1. **Single Source of Version Truth**:
   - Unify all version variables to `1.6.0` (or `1.6.1` for the overhaul release).
   - Sync `version.json`, `app.js` (`this.appVersion`), `index.html` badge & footer, `index.html` script tags (`?v=1.6.1`), `service-worker.js` (`CACHE_NAME = 'classquant-hub-v1.6.1'`), and `build.gradle` (`versionName "1.6.1"`, `versionCode 161`).

2. **Cache Matching with `{ ignoreSearch: true }`**:
   - In `service-worker.js`, update `caches.match(event.request, { ignoreSearch: true })` so versioned URLs (`./js/app.js?v=1.6.1`) correctly resolve to pre-cached assets during offline launches.

3. **Atomic Network-First for Application Scripts**:
   - For internal JS and CSS files (`./js/*.js`, `./css/*.css`), switch the fetch strategy from Stale-While-Revalidate to **Network-First (with immediate cache fallback)**.
   - This guarantees that online users always receive synchronized HTML, CSS, and JS builds simultaneously without stale-code mismatch flashes.

4. **Robust Service Worker Update Lifecycle & Prompt**:
   - In `index.html`, attach `reg.onupdatefound` listeners.
   - When a new Service Worker is ready, display a non-intrusive toast or banner: *"🎉 發現全新版本，點擊立即更新"* with a clean reload handler.

---

## 5. Artifact Index & References

- `js/onboardingTour.js`: Lines 1–577 (Tour engine, event listeners, auto-pilot cursor, spotlight mask)
- `service-worker.js`: Lines 1–100 (Service Worker cache name, asset manifest, install/activate/fetch handlers)
- `version.json`: Lines 1–13 (Remote version configuration and release notes)
- `js/app.js`: Lines 1–300, 700–765 (App state, version checking, update modals, tab routing)
- `index.html`: Lines 1–100, 220–275 (Header badges, script tags, Service Worker bootstrap)
- `android/app/build.gradle`: Lines 1–37 (Android version codes)
- `css/styles.css`: Lines 1–244 (Animations, spotlight CSS, responsive utilities)

# Project: ClassQuant Hub — Interactive Onboarding Tour Engine & PWA Caching Layer

## Architecture
ClassQuant Hub is a client-side PWA and native Android WebView hybrid application with zero third-party build dependencies (vanilla ES6+, HTML5, CSS3, SVG).
- **Tour Engine (`js/onboardingTour.js`)**: Interactive 12-step guided onboarding system with SVG spotlight cutouts, directional arrow pointers, simulated ghost cursor auto-pilot, and viewport tracking.
- **Application Shell (`index.html`, `js/app.js`)**: Navigation bar, tab switcher (`matrix`, `roster`, `retro`, `dashboard`), version badge, and data storage synchronization.
- **PWA Service Worker & Cache Layer (`service-worker.js`, `version.json`, `manifest.json`)**: Pre-caching asset table, Cache API routing (Network-First & Stale-While-Revalidate with search normalization), and version synchronization.
- **Testing & Local Infrastructure (`serve.ps1`, custom automated E2E test harness)**: Local HTTP server, browser-driven validation, and test suite.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Pixel-Perfect SVG Spotlight Cutout | Dynamic rounded-corner SVG mask calculation (`getSpotlightSvgPath`) with smooth transitions, no clipping or black screen flashes across viewports and scroll reflows | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Resilient Directional Arrow Guidance | Viewport-clamped pointer placement (top/bottom/left/right) with 60fps tracking without CSS lag or DOM thrashing | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Animated Spotlight Glow & Pulse | Multi-layer neon glowing outline stroke (`#f43f5e`) and pulsating halo around target elements during focus | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Vector Ghost Cursor Auto-Pilot | Calibrated vector SVG cursor with index-finger hotspot (14px, 2.5px), easeInOutCubic bezier flight, click compression, and ripple | M2 | ORIGINAL_REQUEST §R2 |
| 5 | Coherent View & Tab Navigation | Coordinated tab bar scrolling (`navEl.scrollTo`), smooth element resolution, and spotlight tracking during auto-pilot tab switches | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Strict Auto-Pilot Lifecycle Cancellation | Cancellation tokens (`currentSessionId`) and safeDelay to instantly kill all pending timers, synthetic clicks, and animations on tour skip/close | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Anti-Jump Transition Mutex | Strict step transition lock (`isTransitioning`) combined with 250ms timestamp debounce preventing rapid double taps/clicks from skipping steps | M3 | ORIGINAL_REQUEST §R3 |
| 8 | Spotlight Touch Gating | Block touches and clicks outside the active target geometry in capture phase during manual interaction steps | M3 | ORIGINAL_REQUEST §R3 |
| 9 | Select Dropdown Trap Defense | Dedicated multi-event resolution for Step 1 (`#global-class-select`) supporting change, input, blur, and click | M3 | ORIGINAL_REQUEST §R3 |
| 10 | Fail-Safe Error Recovery & Teardown | Global teardown method resetting all locks, scroll blockers, and overlay state on error or exit | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Cache Query Parameter Normalization | Enable `ignoreSearch: true` in Service Worker `caches.match` to serve versioned queries (`?v=1.7.9`) offline | M4 | ORIGINAL_REQUEST §R4 |
| 12 | Unified Version Synchronization | Unify runtime `appVersion`, `version.json`, `index.html` badge/footer/scripts, `service-worker.js` cache name, and Android `build.gradle` to v1.7.9 | M4 | ORIGINAL_REQUEST §R4 |
| 13 | Version Check Loop Elimination | Eliminate false downgrade cache-wiping loops in `app.js` launch checks using semver `compareVersions` | M4 | ORIGINAL_REQUEST §R4 |
| 14 | Opaque-Box E2E Test Suite | 4-Tier requirement-driven E2E test suite (180 tests) covering all 12 steps, spotlight geometry, auto-pilot, anti-jump, and PWA caching | E2E Track | ORIGINAL_REQUEST Criteria |
| 15 | Adversarial Coverage Hardening | White-box stress testing, edge cases, rapid burst tapping, and offline cache resilience verification (11,000 Monte Carlo iterations) | M5 | ORIGINAL_REQUEST Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | SVG Spotlight & Arrow Guidance Engine | Overhaul SVG spotlight geometry, rounded mask cutout, viewport boundary clamping, arrow orientation, and 60fps tracking | none | DONE |
| M2 | Ghost Cursor Auto-Pilot & Navigation | Vector SVG cursor, smooth bezier kinematics, click feedback, tab scroll coordination, and timer cancellation | M1 | DONE |
| M3 | Anti-Jump & Interaction Defense | Transition mutex, touch gating outside spotlight, select trap fix, fail-safe teardown | M1, M2 | DONE |
| M4 | PWA Service Worker & Cache Sync | SW cache query normalization, unified version strings (v1.7.9), version check loop fix, cache update lifecycle | none | DONE |
| M5 | 100% E2E Test Pass & Hardening | Dual-track integration: Pass 100% Tiers 1-4 E2E tests + Tier 5 Adversarial Coverage Hardening | M1, M2, M3, M4, E2E Track | DONE |
| E2E | E2E Testing Track | Independent opaque-box test runner and test cases (Tiers 1-4) publishing TEST_READY.md | none | DONE |

## Interface Contracts
### `OnboardingTour` Core API (`js/onboardingTour.js` ↔ `js/app.js` / DOM)
- `window.OnboardingTour`: Class constructor instantiated as `window.onboardingTour = new OnboardingTour()`.
- `onboardingTour.start(stepIndex = 0)`: Launches or resumes tour at `stepIndex`. Initializes SVG overlay, attaches resize/scroll listeners, locks background interaction outside spotlight.
- `onboardingTour.nextStep()`: Advances to next step if `!this.isTransitioning`. Cleans up active step listeners, increments index, renders step.
- `onboardingTour.prevStep()`: Returns to previous step safely.
- `onboardingTour.endTour()` / `onboardingTour.destroy()`: Cancels all timers, removes overlay and popover elements, restores `body` / document scroll properties, and saves `localStorage.setItem('classquant_onboarding_completed', 'true')`.
- `onboardingTour.updateSpotlight(targetEl)`: Computes client bounding rect `(x, y, width, height)`, calculates rounded-corner SVG mask path, updates popover position, and clamps arrow pointer within viewport boundaries.
- `onboardingTour.flyGhostTo(target, session)`: Smooth bezier kinematics for ghost cursor auto-pilot.
- `onboardingTour.playGhostCursor(target)`: Backwards-compatible alias resolving to `flyGhostTo(target, this.currentSessionId)`.

### PWA Service Worker & Version Contract (`service-worker.js` ↔ `version.json` ↔ `js/app.js`)
- Cache Identifier: `const CACHE_NAME = 'classquant-hub-v37';`.
- Cache Matching: `caches.match(event.request, { ignoreSearch: true })` for pre-cached static assets.
- `version.json`: `{"version": "1.7.9", "buildNumber": 2026083019, "minAppVersion": "1.0.0", "releaseDate": "2026-08-30", "appName": "ClassQuant Hub", "otaUpdateEnabled": true}`.
- `app.js`: `this.appVersion = '1.7.9'`. Version check parses `version.json` via `compareVersions` and updates gracefully without cyclic cache eviction.

## Code Layout
- `js/onboardingTour.js`: Owned by M1, M2, M3.
- `css/custom.css`: Owned by M1 (spotlight, arrow, ghost cursor styles).
- `service-worker.js`: Owned by M4.
- `version.json`: Owned by M4.
- `index.html`: Owned by M4 (version badge & footer text alignment).
- `js/app.js`: Owned by M4 (version verification logic).
- `android/app/build.gradle`: Owned by M4.
- `tests/` / `e2e/`: Owned exclusively by E2E Testing Track and Challenger.

# ClassQuant Hub — Test Infrastructure & Philosophy (`TEST_INFRA.md`)

## 1. Testing Philosophy & Principles

ClassQuant Hub's automated testing infrastructure is built on strict **opaque-box, requirement-driven verification** principles:

1. **Requirement-Driven & Opaque-Box**:
   - Tests validate functional contracts, observable DOM state changes, geometry calculations, event propagation, and storage updates strictly from the specification (`ORIGINAL_REQUEST.md`, `PROJECT.md`, `spec_inventory.md`).
   - Implementation source files are treated as black boxes; tests interact only through standard DOM APIs, browser lifecycle hooks, and public interface methods (`window.OnboardingTour`, `window.appState`, `service-worker.js`, `manifest.json`, `version.json`).

2. **Zero External Runtime Dependencies**:
   - The test infrastructure requires no third-party package managers (npm, pip, yarn) or external binaries.
   - Built with dual-engine execution support:
     - **PowerShell Test Engine (`tests/run_e2e_tests.ps1`)**: Native execution on Windows with zero setup.
     - **Node.js Test Engine (`tests/run_tests.js`)**: Portable vanilla ES6+ script executable in standard Node.js environments.

3. **Deterministic & Isolated Execution**:
   - Each test case sets up its own clean DOM state, mock timers, storage registers, and teardown cleanup.
   - Tests do not rely on execution ordering and never leak event listeners, modified DOM nodes, or storage entries.

4. **Adversarial & Boundary Verification**:
   - In addition to standard happy paths, the suite tests extreme screen dimensions, rapid burst clicking (anti-jump mutex verification), dirty input strings, offline network state transitions, and corrupted local state recovery.

---

## 2. Test Architecture & Directory Structure

```
d:\class_point_app_dev\
├── TEST_INFRA.md                 # Architecture, methodology, feature inventory & tier goals
├── TEST_READY.md                 # Test suite readiness, execution instructions, & matrix
├── tests/
│   ├── run_e2e_tests.ps1         # Unified PowerShell test runner (zero external dependencies)
│   ├── run_tests.js              # Unified Node.js test runner
│   ├── test_engine.ps1           # PowerShell test harness & assertion library
│   ├── test_engine.js            # JavaScript test harness & DOM simulation engine
│   ├── tier1_features.ps1        # Tier 1 Feature Coverage (75 tests across 15 features)
│   ├── tier1_features.js         # Tier 1 JS implementation
│   ├── tier2_boundaries.ps1      # Tier 2 Boundary & Corner Cases (75 tests across 15 features)
│   ├── tier2_boundaries.js       # Tier 2 JS implementation
│   ├── tier3_combinations.ps1    # Tier 3 Cross-Feature Combinations (20 tests)
│   ├── tier3_combinations.js     # Tier 3 JS implementation
│   ├── tier4_realworld.ps1       # Tier 4 Real-World Application Scenarios (10 tests)
│   └── tier4_realworld.js        # Tier 4 JS implementation
```

---

## 3. Feature Inventory & Coverage Mapping

| # | Feature Code | Feature Name | Primary Target & Scope | Milestone |
|---|--------------|--------------|------------------------|-----------|
| 1 | `F01-SPOTLIGHT` | Pixel-Perfect SVG Spotlight Cutout | SVG evenodd path calculation, padding, viewport bounding, clamping | M1 |
| 2 | `F02-ARROW` | Resilient Directional Arrow Guidance | Viewport-clamped pointer placement (top/bottom/left/right), 60fps tracking | M1 |
| 3 | `F03-GLOW` | Animated Spotlight Glow & Pulse | Bounding ring pulse, high contrast visibility, step action badges | M1 |
| 4 | `F04-GHOST` | Vector Ghost Cursor Auto-Pilot | Vector SVG cursor, bezier curve translation, click press feedback, ripple | M2 |
| 5 | `F05-NAV` | Coherent View & Tab Navigation | Horizontal navbar auto-scroll, smooth element centering, tab state sync | M2 |
| 6 | `F06-CANCEL` | Strict Auto-Pilot Lifecycle Cancellation | Instant timer, rAF, synthetic click, and audio cancellation on skip/abort | M2 |
| 7 | `F07-MUTEX` | Anti-Jump Transition Mutex | Mutex locking during step transitions to block erratic double-clicks | M3 |
| 8 | `F08-GATING` | Spotlight Touch Gating | Event capture phase filtering, scroll blocking, outside click rejection | M3 |
| 9 | `F09-SELECT` | Select Dropdown Trap Defense | Step 1 `#global-class-select` change event, blur, debounce, and teardown | M3 |
| 10 | `F10-TEARDOWN`| Fail-Safe Error Recovery & Teardown | Global cleanup, missing element timeout fallback, localStorage tour flag | M3 |
| 11 | `F11-CACHE` | Cache Query Parameter Normalization | Service worker query parameter matching (`ignoreSearch: true`), offline cache | M4 |
| 12 | `F12-VERSION`| Unified Version Synchronization | Unify `version.json`, `appVersion`, badges, footer, script tags to v1.6.0 | M4 |
| 13 | `F13-LOOP` | Version Check Loop Elimination | Single-prompt release notes modal, `last_seen_version` storage check | M4 |
| 14 | `F14-HARNESS`| Opaque-Box E2E Test Suite | Autonomous zero-dependency execution, exit code 0 on pass | E2E |
| 15 | `F15-STRESS` | Adversarial Coverage Hardening | Rapid burst tapping, orientation reflow, extreme scroll, dirty text parsing | M5 |

---

## 4. Four-Tier Coverage Strategy

### Tier 1: Feature Coverage (75 Test Cases)
- **Goal**: Verify core happy paths and primary functional contracts for all 15 inventoried features (5 test cases per feature).
- **Scope**:
  - F01: SVG path calculation, 6px padding, bounding clamping, evenodd fill rule, coordinate string format.
  - F02: Top-half placement below target, bottom-half placement above target, horizontal centering, hint text derivation, info step suppression.
  - F03: Pulse animation classes, border glow styles, action container badge, theme contrast, dynamic highlight.
  - F04: Ghost cursor positioning, bezier trajectory, click dispatch, ripple animation, pop audio hook.
  - F05: Nav bar `scrollTo` calculation, `scrollIntoView` invocation, active tab class update, tab switcher coordination, unhide view panel.
  - F06: Skip step cancellation, end tour instant abort, tracking frame cancellation, ghost cursor opacity reset, audio silence on exit.
  - F07: Transition lock mutex flag, double click suppression, rapid nextStep throttling, auto-play click suppression, lock release after settle.
  - F08: Popover touch passthrough, background touch prevention, wheel event blocking, info step outside click rejection, touchmove capture.
  - F09: Select change event binding, trusted event verification, debounce advance delay, listener cleanup, re-selection stability.
  - F10: Missing element timeout fallback, document.body fallback recovery, teardown class removal, listener detachment, localStorage completion flag.
  - F11: SW cache matching with query string, `ignoreSearch` option support, static asset cache matching, network failure offline fallback, clone response caching.
  - F12: `version.json` structure, `app.js` `appVersion`, `index.html` badge string, script tag version parameters, footer badge consistency.
  - F13: `last_seen_version` storage update, single prompt enforcement, offline check resilience, silent update check, OTA reload safety.
  - F14: Test runner execution, zero external dependency assertion, exit code 0 validation, structured reporter format, tier result aggregation.
  - F15: Rapid burst clicking stress, corrupted storage state recovery, dirty roster batch paste parsing, extreme viewport resize reflow, audio suspended context resumption.

### Tier 2: Boundary & Corner Cases (75 Test Cases)
- **Goal**: Verify system behavior under extreme conditions, viewport limits, missing elements, and unexpected inputs (5 test cases per feature).
- **Scope**:
  - Edge-of-screen targets (top=0, left=0, bottom=vh, right=vw), zero-size elements.
  - Horizontal pointer clamping on narrow viewports (<360px), elements at exact vertical midpoint.
  - Extreme scroll offsets (`scrollY = 5000px`, negative scrolls), header collapse inhibition.
  - Dirty text pasting with leading numbers, commas, Chinese punctuation, empty lines.
  - Rapid double-clicks (50 clicks in 10ms), simultaneous skip and action clicks.
  - Corrupted localStorage JSON, disabled storage, network timeouts, HTTP 500 responses.

### Tier 3: Cross-Feature Combinations (20 Test Cases)
- **Goal**: Verify state synchronization and interaction contracts when multiple features operate concurrently.
- **Scope**:
  - Complete 12-step sequential step transition chain (Steps 1→2→...→12).
  - Tour auto-pilot + tab switching + spotlight tracking coordination.
  - Tour launching while modal dialogs are open (auto-closing background modals).
  - Tour active state suppressing global header auto-collapse during scroll.
  - Audio synthesizer integration during step transitions (pop/chime triggers with mute toggle).
  - PWA offline caching + Tour localStorage state persistence.
  - Live OTA update + Cache purge + Service Worker unregistration.
  - Roster batch paste + Classroom seat matrix data update + Tour highlight.
  - Theme switching (Sanrio Kitty/TwinStars) + Spotlight SVG overlay contrast.
  - Timetable engine active class change + Tour step highlight refresh.

### Tier 4: Real-World Application Scenarios (10 Test Cases)
- **Goal**: Emulate end-to-end user journeys and multi-step teacher workflows.
- **Scope**:
  - **Scenario 1**: 12-Step Master Walkthrough End-to-End Simulation.
  - **Scenario 2**: First-Time User Experience & Mid-Tour Abort/Teardown.
  - **Scenario 3**: Classroom Point Logging & Retro Recall Lifecycle.
  - **Scenario 4**: Excel Roster Batch Import & Student Dossier Navigation.
  - **Scenario 5**: PWA Cold Boot Offline Workflow.
  - **Scenario 6**: Live OTA Update Notification & Bulletin Release Notes Flow.
  - **Scenario 7**: Theme Switching & Web Audio Synthesizer Toggle Session.
  - **Scenario 8**: Mobile Small-Screen Orientation Change Reflow.
  - **Scenario 9**: Multi-Class Switch & Timetable Perception Workflow.
  - **Scenario 10**: Manual Cache Flush & Hard Reload Lifecycle.

---

## 5. Execution Instructions & Validation Criteria

- **PowerShell Runner**:
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File tests/run_e2e_tests.ps1
  ```
- **Node.js Runner**:
  ```bash
  node tests/run_tests.js
  ```
- **Validation Criteria**:
  - Total test count >= 180 test cases across 4 tiers.
  - 100% test pass rate (0 failures, 0 regressions).
  - Zero external dependencies required.
  - Process exits with code `0`.

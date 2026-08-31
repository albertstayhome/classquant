# ClassQuant Hub — Test Infrastructure & Philosophy (`TEST_INFRA.md`)

## 1. Testing Philosophy & Principles

ClassQuant Hub's automated end-to-end testing infrastructure is built upon strict **opaque-box, requirement-driven verification** principles:

1. **Requirement-Driven & Opaque-Box Verification**:
   - Tests validate functional contracts, observable DOM state changes, score calculations, event propagation, touch handling, and storage updates strictly derived from the specifications (`ORIGINAL_REQUEST.md`, `PROJECT.md`).
   - Implementation source files are treated as opaque boxes; tests interact only through standard DOM APIs, browser lifecycle hooks, and public interface methods (`window.matrixView`, `window.appState`, `window.onboardingTour`, `window.rosterManager`, `window.timetableEditorView`, `window.retroLogView`, `service-worker.js`, `manifest.json`, `version.json`).

2. **Zero External Runtime Dependencies**:
   - The test infrastructure requires no third-party package managers (npm, pip, yarn) or external binary dependencies.
   - Built with dual-engine execution support:
     - **PowerShell Test Engine (`tests/run_e2e_tests.ps1`)**: Native execution on Windows with zero setup.
     - **Node.js Test Engine (`tests/run_tests.js`)**: Portable vanilla ES6+ script executable in standard Node.js environments.

3. **Deterministic & Isolated Execution**:
   - Each test case sets up its own clean state, mock timers, storage registers, and teardown cleanup.
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
│   ├── tier3_combinations.ps1    # Tier 3 Cross-Feature Combinations (22 tests)
│   ├── tier3_combinations.js     # Tier 3 JS implementation
│   ├── tier4_realworld.ps1       # Tier 4 Real-World Application Scenarios (10 tests)
│   └── tier4_realworld.js        # Tier 4 JS implementation
```

---

## 3. Feature Inventory & Coverage Mapping

| # | Feature Code | Feature Name | Primary Target & Scope | Milestone | Source |
|---|--------------|--------------|------------------------|-----------|--------|
| 1 | `F01-TOUCH-TOGGLE` | Instant Seat Card Touch Toggle | Immediate toggle of student seat card selection with `touch-action: manipulation`, no 300ms delay, no touch drift cancellation | M1 | ORIGINAL_REQUEST R1 |
| 2 | `F02-TAG-AWARD` | Quick Score Tag Award & Auto-Clear | Quick tags award points to selected students and automatically clear selection with `try...finally` resilience | M1 | ORIGINAL_REQUEST R1 |
| 3 | `F03-SCORE-SPAN` | Score Span Index Correction | Fix `applyTagToSelected` targeting correct character points span (`scoreSpans[1]` / `scoreSpans[2]`) instead of academic score span | M1 | Survey Finding |
| 4 | `F04-BUBBLE-ANIM` | Non-Destructive Score Floating Bubbles | Smooth +3/-1 floating animations with `pointer-events: none` and 800ms auto-removal without DOM destruction or state reset | M1 | ORIGINAL_REQUEST R1 |
| 5 | `F05-OPT-SELECTION` | Optimized Seat Selection Updates | Target selective class toggles rather than full-grid DOM re-renders in matrix and retroLogView | M1 | Survey Finding |
| 6 | `F06-TAB-SWITCH` | Top Tab Bar Multi-View Switching | Zero-exception tab switching across all 9 views with zero layout shift and touch event readiness | M2 | ORIGINAL_REQUEST R2 |
| 7 | `F07-TIMETABLE-GRID`| Timetable Weekly Grid & Cell Editing | Interactive weekly schedule grid with cell editing, class binding, and persistence across mobile/PWA | M2 | ORIGINAL_REQUEST R2 |
| 8 | `F08-ROSTER-CRUD` | Roster Search & Batch Import | Dynamic student name/number search filtering and reliable batch CSV/text import | M2 | ORIGINAL_REQUEST R2 |
| 9 | `F09-RETRO-STATS` | Post-Class Logging & Analytics | Seamless historical retro-logging and statistics dashboard data visualization | M2 | ORIGINAL_REQUEST R2 |
| 10 | `F10-TOUR-LAUNCH` | Spotlight Walkthrough Launch | Tapping "🎓 教學" instantly initializes and launches the spotlight tour engine | M3 | ORIGINAL_REQUEST R3 |
| 11 | `F11-TOUR-PROGRESS`| 12-Step Walkthrough Progression | All 12 steps advance smoothly via direct element interaction or "下一步 ➔" button with anti-jump mutex | M3 | ORIGINAL_REQUEST R3 |
| 12 | `F12-TOUR-TEARDOWN`| Tour Engine Clean Teardown | Tour completion or exit removes SVG masks, tooltips, event listeners, and restores 100% normal page interactivity | M3 | ORIGINAL_REQUEST R3 |
| 13 | `F13-E2E-HARNESS` | Comprehensive E2E Test Suite | Automated execution of multi-tier test cases covering all features and boundaries | M4 | ORIGINAL_REQUEST Acceptance Criteria |
| 14 | `F14-ADVERSARIAL-AUDIT` | Adversarial Hardening & Audit | Tier 5 adversarial stress testing and forensic integrity verification | M4 | Orchestrator Protocol |
| 15 | `F15-PWA-SERVICE-WORKER` | PWA Lifecycle & Offline Asset Caching | Service worker caching, query parameter normalization, offline resilience, and cache lifecycle | M4 | Project Architecture |

---

## 4. Four-Tier Coverage Strategy

### Tier 1: Feature Coverage (75 Test Cases)
- **Goal**: Verify core happy paths and primary functional contracts for all 15 inventoried features (5 test cases per feature).
- **Scope**:
  - `F01`: Instant seat selection, single tap toggle, select all (1..30), clear selection, `touch-action: manipulation` CSS.
  - `F02`: Point delta award to selected seats, store event logging, `try...finally` auto-clear, empty selection warning, audio sound dispatch (chime/warning).
  - `F03`: Character score breakdown calculation, character point span index targeting, positive green styling (`text-emerald-700`), negative rose styling (`text-rose-700`), zero slate styling (`text-slate-500`).
  - `F04`: Floating point bubble spawn, `kitty-stamp-effect`, non-blocking `pointer-events: none`, 800ms auto-cleanup timer, card DOM preservation.
  - `F05`: Selective DOM class toggling, `#selected-count` innerText synchronization, `#clear-sel-btn` hidden/inline-block toggling, multi-seat toggle stability.
  - `F06`: 9 navigation tab routing, unhide active container & hide inactive containers, active tab `.tab-active` CSS, horizontal auto-scroll centering, module render method invocation.
  - `F07`: 5x8 weekly schedule grid, `detectActiveSlot` weekday/time detection, off-hours fallback, cell editing updates, localStorage serialization (`classquant_timetable`).
  - `F08`: Dynamic search filtering by name/seat, batch paste parser leading number cleaning, empty line filtering, student CRUD update, localStorage serialization (`classquant_classes`).
  - `F09`: Retro log historical session setup, Odd/Even/All quick seat selectors, retroactive timestamp logging, dashboard character points breakdown, immutable event audit trail.
  - `F10`: Tour launch activation, SVG backdrop with 75% dark fill (`rgba(0,0,0,0.75)`), SVG mask path geometry, glowing neon pulse border, popover tooltip injection.
  - `F11`: 12 structured walkthrough steps in sequence, Step 1 class select binding & debounce, dual advance (direct click or next button), anti-jump transition mutex (250ms), 4-way pointer orientation.
  - `F12`: Tour end instant state reset, `#cq-tour-overlay` and ghost cursor removal, `tour-strict-locked` body class removal, rAF handle cancellation, `classquant_tour_completed` localStorage flag.
  - `F13`: Test engine assertion primitives (`Assert-True`, `Assert-False`, `Assert-Equal`), zero-dependency runner execution, metric recording, exception catching without process crash, exit code 0 validation.
  - `F14`: 100-click burst storm resistance, dirty Unicode/Chinese roster parsing, muted audio context safety, SW query normalization (`ignoreSearch: true`), version synchronization validation.
  - `F15`: Service Worker script asset caching, versioned static query parameter matching, Network-First vs Stale-While-Revalidate routing, obsolete cache bucket purge.

### Tier 2: Boundary & Corner Cases (75 Test Cases)
- **Goal**: Verify system behavior under extreme conditions, viewport limits, missing elements, and unexpected inputs (5 test cases per feature).
- **Scope**:
  - Rapid double-taps (50ms), full roster idempotent selectAll, empty selection clear, 50-student class roster, multi-touch concurrent toggles.
  - Applying tag with 0 seats selected, large point deltas (+50, -20), whole-class point award (30 seats), negative penalty sound, zero delta attendance tag.
  - Zero-event student profile score rendering, extreme positive (+999) and negative (-999) scores, net cumulative score calculation, null profile fallback.
  - Non-existent card element bubble safety, 50 rapid concurrent floating bubbles, negative bubble color formatting, 800ms timer precision, card ID preservation.
  - Empty roster selectAll, 49/50 student selection state, synchronous count badge updates, button visibility boundary (0 vs 1), set uniqueness.
  - Repeated tab switch idempotency, invalid tab ID graceful fallback, rapid 10-tab switching thrash, negative scroll clamping, all 9 view containers account.
  - Weekend/late-night slot detection fallback, lunch break slot detection, corrupted timetable JSON recovery, Friday Period 8 boundary key (`5_8`).
  - 500-row batch paste stress, Chinese punctuation delimiters, empty/whitespace batch paste, regex special character search queries, duplicate name collision resolution.
  - Odd/even split on 31 students (16 odd, 15 even), 1,000-event aggregation net score, historical date integrity, zero-event analytics profile, JSON representation export.
  - Screen corner (0,0) and edge bounding, zero-dimension element (0x0) NaN safety, ultrawide (2560x1440) and tiny mobile (320x480) viewports.
  - Exact vertical midpoint (`vh / 2`) pointer flip, extreme left/right pointer clamping, step 11 bound clamping, info step pointer suppression.
  - Mid-tour step 5 abort, consecutive `endTour()` idempotency, scroll/touch listener detachment, storage quota exceeded handling, invalid DOM selector recovery.
  - Arbitrary working directory execution, regex pattern assertion, nested hashtable/array equality, summary percentage formatting, non-zero exit code on failure.
  - Multi-query parameter matching (`?v=1.6.0&ref=pwa&debug=1`), hash fragment matching (`#tour`), network fetch failure cache fallback, portrait/landscape orientation reflow, suspended AudioContext resumption.
  - Multiple query parameter static caching, HTTP 500 network error cache protection, non-GET request bypass, hash fragment matching, manual cache flush hard reload.

### Tier 3: Cross-Feature Combinations (22 Test Cases)
- **Goal**: Verify state synchronization and interaction contracts when multiple features operate concurrently across modules.
- **Scope**:
  - Complete 12-step sequential step transition chain (Steps 1→2→...→12).
  - Matrix Seat Toggle + Quick Tag Award + Floating Bubble Float + Auto Clear.
  - Matrix Point Event + Score Span Character Points In-Place Update.
  - Matrix View + Tab Switch to Roster + Dynamic Student Search.
  - Roster Manager Batch Paste + Class State Persist + Matrix Grid Refresh.
  - Tab Switch to Retro View + Odd Seat Selection + Retro Period Point Allocation.
  - Retro Point Logging + Tab Switch to Dashboard + Chart Recalculation.
  - Timetable Active Slot Detection + Period Binding + Matrix Point Event Stamping.
  - Tour Launching while Modal Open (Auto-closes modal on tour start).
  - Tour Step 5 Auto-Pilot Tab Switch + Nav Centering + Spotlight Re-Highlight.
  - Tour Completion + LocalStorage Flag + Teardown Cleanup + Return to Matrix.
  - PWA Offline Network State + SW Cache Matching + Tour State Persistence.

### Tier 4: Real-World Application Scenarios (10 Test Cases)
- **Goal**: Emulate end-to-end user journeys and multi-step teacher workflows.
- **Scope**:
  - **Scenario 1**: Complete 12-Step Master Walkthrough Simulation.
  - **Scenario 2**: First-Time User Experience & Mid-Tour Abort/Teardown Flow.
  - **Scenario 3**: Classroom Point Logging & Retro Recall Lifecycle.
  - **Scenario 4**: Excel Roster Batch Import & Student Dossier Navigation.
  - **Scenario 5**: PWA Cold Boot Offline Application Workflow.
  - **Scenario 6**: Live OTA Update Notification & Bulletin Release Notes Flow.
  - **Scenario 7**: Theme Switching & Web Audio Synthesizer Toggle Session.
  - **Scenario 8**: Mobile Small-Screen Orientation Change Reflow Simulation.
  - **Scenario 9**: Multi-Class Switch & Timetable Perception Workflow.
  - **Scenario 10**: Manual Cache Flush & Hard Reload Lifecycle.

---

## 5. Execution Instructions & Validation Criteria

- **PowerShell Runner (Primary Windows Execution)**:
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File tests/run_e2e_tests.ps1
  ```
- **Node.js Runner (Cross-Platform Execution)**:
  ```bash
  node tests/run_tests.js
  ```
- **Validation Criteria**:
  - Total test count: **182 test cases across 4 tiers**.
  - **100% test pass rate (182 / 182 Passed, 0 Failed)**.
  - Zero external dependencies required.
  - Process exits with code `0`.
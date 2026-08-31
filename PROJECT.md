# Project: ClassQuant Hub

## Architecture
ClassQuant Hub is a high-performance, mobile-first classroom gamification and student management system built with vanilla JavaScript (ES modules/classes), HTML5, and CSS3, supporting PWA and mobile browsers.

Key Subsystems:
- **Matrix & Seat Grid (`js/matrix.js`, `index.html`)**: Student seat cards, selection state management, quick score tagging, score bubble animations (+3 / -1), responsive classroom layout.
- **Navigation & View Routing (`js/app.js`, `index.html`)**: Multi-tab switcher for 9 core modules (課堂點記板, 班級名單, 課堂事後補記, 統計戰情室, 課表排程, 學生記事檢索, 檔案 & 晤談, AI 成績匯入, 圖文說明書).
- **Timetable Scheduler (`js/timetable.js`, `js/timetableEditor.js`)**: Interactive weekly schedule grid, cell editing, class-period binding, local storage persistence.
- **Roster & Student Manager (`js/roster.js`, `js/rosterManager.js`)**: Student CRUD, seat assignment, instant search filtering, batch import/export.
- **Post-Class Retro Logging (`js/retroLogView.js`) & Analytics (`js/statistics.js`, `js/charts.js`)**: Historical point adjustments, attendance tracking, statistical charts, export.
- **Interactive Tour Engine (`js/tour.js`, `js/onboardingTour.js`)**: 12-step spotlight walkthrough, SVG cutout mask, interactive trigger observers, touch gating, anti-jump mutex, clean teardown.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Instant Seat Card Touch Toggle | Immediate toggle of student seat card selection with `touch-action: manipulation`, no 300ms delay, no touch drift cancellation | M1 | ORIGINAL_REQUEST R1 |
| 2 | Quick Score Tag Award & Auto-Clear | Quick tags award points to selected students and automatically clear selection with `try...finally` resilience | M1 | ORIGINAL_REQUEST R1 |
| 3 | Score Span Index Correction | Fix `applyTagToSelected` targeting correct character points span (`scoreSpans[2]`) instead of academic score span (`scoreSpans[1]`) | M1 | Survey Finding |
| 4 | Non-Destructive Score Floating Bubbles | Smooth +3/-1 floating animations with `pointer-events: none` and 800ms auto-removal without DOM destruction or state reset | M1 | ORIGINAL_REQUEST R1 |
| 5 | Optimized Seat Selection Updates | Target selective class toggles rather than full-grid DOM re-renders in matrix and retroLogView | M1 | Survey Finding |
| 6 | Top Tab Bar Multi-View Switching | Zero-exception tab switching across all 9 views with zero layout shift and touch event readiness | M2 | ORIGINAL_REQUEST R2 |
| 7 | Timetable Weekly Grid & Cell Editing | Interactive weekly schedule grid with cell editing, class binding, and persistence across mobile/PWA | M2 | ORIGINAL_REQUEST R2 |
| 8 | Roster Search & Batch Import | Dynamic student name/number search filtering and reliable batch CSV/text import | M2 | ORIGINAL_REQUEST R2 |
| 9 | Post-Class Logging & Analytics | Seamless historical retro-logging and statistics dashboard data visualization | M2 | ORIGINAL_REQUEST R2 |
| 10 | Spotlight Walkthrough Launch | Tapping "🎓 教學" instantly initializes and launches the spotlight tour engine | M3 | ORIGINAL_REQUEST R3 |
| 11 | 12-Step Walkthrough Progression | All 12 steps advance smoothly via direct element interaction or "下一步 ➔" button with anti-jump mutex | M3 | ORIGINAL_REQUEST R3 |
| 12 | Tour Engine Clean Teardown | Tour completion or exit removes SVG masks, tooltips, event listeners, and restores 100% normal page interactivity | M3 | ORIGINAL_REQUEST R3 |
| 13 | Comprehensive E2E Test Suite | Automated execution of 182 multi-tier test cases covering all features and boundaries | M4 | ORIGINAL_REQUEST Acceptance Criteria |
| 14 | Adversarial Hardening & Audit | Tier 5 adversarial stress testing and forensic integrity verification | M4 | Orchestrator Protocol |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Native Touch & Selection Restoration | Seat selection, quick scoring, score span index fix, bubble animation, touch-action CSS | None | DONE |
| M2 | Mobile Tab Navigation & Feature Readiness | Tab switching, Timetable scheduling, Roster search/import, Post-class retro-logging, Stats | M1 | DONE |
| M3 | Interactive Onboarding Tour Engine | Spotlight tour, 12-step progression, touch gating, teardown restoration | M1 | DONE |
| M4 | Final E2E Test Suite & Adversarial Hardening | 100% E2E test execution, Tier 5 stress testing, Forensic Integrity Audit | M1, M2, M3 | DONE |

## Interface Contracts
### Matrix ↔ Scoring Engine
- `toggleSeat(seatNo, event)`: Toggles seat selection in `state.selectedSeats` and updates `#seat-card-${seatNo}` CSS class `.selected`.
- `applyTagToSelected(tagId, tagValue)`: Awards point delta to all `state.selectedSeats`, updates character score display (`scoreSpans[2]`), spawns floating bubble animation on `#seat-card-${seatNo}`, and calls `clearSelection()`.
- `clearSelection()`: Deselects all active seat cards, resets `state.selectedSeats = []`, and updates seat card UI state.

### Navigation ↔ View Subsystems
- `switchTab(tabId)`: Hides inactive tab views, shows target tab view (`#view-${tabId}`), updates `.nav-tab.active` styling, triggers module-specific render functions (`renderTimetable()`, `renderRoster()`, `renderRetroLog()`, `renderStats()`).

### Tour Engine ↔ Application DOM
- `startTour()`: Creates `#cq-tour-overlay`, injects SVG spotlight mask and floating tooltip, scrolls target element into viewport, binds event listeners.
- `nextStep()`: Transitions spotlight to step `(currentStep + 1)`, updates instructions and actions, prevents rapid click races.
- `endTour()`: Removes `#cq-tour-overlay`, unbinds mutation/resize observers and touch event listeners, restores document scroll and focus.

## Code Layout
- `index.html`: Main SPA application layout, top navigation bar, modals, SVG containers.
- `css/styles.css` / `css/style.css`: Global styles, layout, mobile viewport CSS, touch-action rules, animation keyframes.
- `js/app.js`: Main entry point, state initialization, tab routing, event dispatching.
- `js/matrix.js`: Seat grid matrix, student seat cards, quick scoring, floating point bubbles.
- `js/timetable.js`, `js/timetableEditor.js`: Weekly timetable grid, cell click editing, period management.
- `js/roster.js`, `js/rosterManager.js`: Student roster management, search filter, batch importer.
- `js/retroLogView.js`: Post-class historical log adjustments, seat selection for retro points.
- `js/statistics.js`, `js/charts.js`: Class analytics, point distribution charts, historical logs.
- `js/tour.js`, `js/onboardingTour.js`: 12-step interactive onboarding tour engine, spotlight shaders, step progression.
- `tests/`: Automated test suites and PowerShell/Node test runners.

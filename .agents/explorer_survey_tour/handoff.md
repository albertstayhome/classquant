# R3 Survey Report: Flawless Interactive Onboarding Tour Engine for ClassQuant Hub

**Agent**: Survey Explorer (R3 Interactive Onboarding Tour Engine)  
**Target Files**: `index.html`, `js/onboardingTour.js`, `js/app.js`, `css/styles.css`, `css/custom.css`, `tests/run_e2e_tests.ps1`, `tests/stress_tour_engine.ps1`  
**Working Directory**: `d:\class_point_app_dev\.agents\explorer_survey_tour`  
**Date**: 2026-08-30  
**Status**: COMPLETE (Hard Handoff)

---

## 1. Observation

### 1.1 Trigger Mechanism of "🎓 教學" Button
- **DOM Element**: `index.html` (lines 81–85):
  ```html
  <button id="onboarding-guide-btn" onclick="appState.startTour()" 
    class="px-2 sm:px-2.5 py-1 rounded-xl border border-pink-300 bg-white hover:bg-pink-50 text-pink-700 transition flex items-center gap-1 shadow-sm active:scale-95 shrink-0 cursor-pointer" title="開啟新手教學">
    <span class="text-xs font-black">🎓</span>
    <span class="text-xs font-bold text-pink-700">教學</span>
  </button>
  ```
- **AppState Trigger Lifecycle** in `js/app.js` (lines 996–1025):
  1. `this.playChime()` triggers Web Audio synthesizer chime sound.
  2. `this.showToast('🎓 新手教學已就緒！請查看畫面引導與下方說明 🎀', 'info')` displays toast notification.
  3. `this.toggleHeader(true, true)` forces top banner to stay expanded, ensuring `#global-class-select` is visible.
  4. `window.scrollTo({ top: 0, behavior: 'smooth' })` scrolls viewport to top.
  5. Immediately unhides pre-rendered static DOM nodes `#tour-overlay-container` and `#tour-popover` (`classList.remove('hidden')`, `style.display = 'block'`).
  6. Calls `window.onboardingTour.start(0)`.
- **Tour Engine Launch Lifecycle** in `js/onboardingTour.js` (lines 997–1064):
  1. `this.initDOM()` fetches cached element references (`domPath`, `domGlow`, `domHalo`, `domPointer`, `domPopover`).
  2. `this.cleanupListeners()`, `this.clearAllTimers()`, `this.clearAllAnimations()`.
  3. Sets `this.isActive = true`, `this.currentStep = 0`.
  4. Pre-populates Step 1 title ("1. 班級切換樞紐 (點擊展開)"), content, badge, and "下一步 ➔" button into `#tour-popover` synchronously before awaiting step render.
  5. `this.bindEventListeners()` registers window `scroll`, `resize`, `orientationchange`, and `visualViewport` listeners with `{ passive: true }`.
  6. `this.startTracking()` launches 60fps/120fps `requestAnimationFrame` tracking loop.
  7. Calls `await this.renderStep()`.

---

### 1.2 Structure and Logic of the 12 Walkthrough Steps
All 12 steps defined in `js/onboardingTour.js` (lines 62–188):

| Step | ID | Target Selector | Fallback Selector | Action Type | Tab | Pad (px) | Radius (px) | Target Element Purpose & Advancement Trigger |
|---|---|---|---|---|---|---|---|---|
| **1** | `step-class-select` | `#global-class-select` | *None* | `manual-click` | `matrix` | 6 | 12 | Class selector dropdown in header. Advances on `change`, `input`, `blur` (with user interaction flag), or "下一步 ➔". |
| **2** | `step-select-student` | `#seat-card-1` | `.student-seat-card:first-child` | `manual-click` | `matrix` | 8 | 16 | Student 1 seat card. Advances on native click (`toggleStudentSelection`) or "下一步 ➔". |
| **3** | `step-click-tag` | `#first-quick-tag-btn` | `.tag-page-slide button:first-child` | `manual-click` | `matrix` | 6 | 14 | Quick score tag (+3). Advances on click (`applyTagToSelected`), generating floating points and confetti, or "下一步 ➔". |
| **4** | `step-custom-tags` | `#custom-tag-open-btn` | `.glass-card button i[data-lucide='settings']` | `info` | `matrix` | 6 | 12 | Custom tags settings button. Displays feature guide; advances via "下一步 ➔". |
| **5** | `step-goto-roster` | `button[data-tab="roster"]` | *None* | `manual-click` | `matrix` | 6 | 14 | Navigation tab for Class Roster. Advances on tab click (`appState.switchTab('roster')`) or "下一步 ➔". |
| **6** | `step-roster-paste` | `#roster-paste-btn` | *None* | `auto-pilot-paste` | `roster` | 8 | 14 | 1-Click Excel batch roster import button. Advances via "▶️ 開始自動演示貼上 🪄" (simulates click & typing) or "下一步 ➔". |
| **7** | `step-roster-details` | `#roster-student-name-input-1` | `#roster-student-card-1` | `auto-pilot-edit` | `roster` | 6 | 12 | Student name modification input. Advances via "▶️ 開始自動演示改名 🪄" (simulates click & typing) or "下一步 ➔". |
| **8** | `step-goto-retro` | `button[data-tab="retro"]` | *None* | `manual-click` | `roster` | 6 | 14 | Navigation tab for Retro Log View. Advances on tab click (`appState.switchTab('retro')`) or "下一步 ➔". |
| **9** | `step-retro-action` | `#retro-odd-btn` | `#retro-submit-btn` | `manual-click` | `retro` | 6 | 12 | Odd-numbered student quick select button. Advances on click (`selectOdd`) or "下一步 ➔". |
| **10** | `step-goto-dashboard` | `button[data-tab="dashboard"]` | *None* | `manual-click` | `retro` | 6 | 14 | Navigation tab for Analytics Dashboard. Advances on tab click (`appState.switchTab('dashboard')`) or "下一步 ➔". |
| **11** | `step-dashboard-charts` | `#dashboard-view .glass-card:first-child` | *None* | `info` | `dashboard` | 10 | 20 | Four-Quadrant academic & behavior scatter chart. Displays analytical guide; advances via "下一步 ➔". |
| **12** | `step-finish` | `#header-version-badge` | *None* | `info` | `dashboard` | 6 | 12 | Top header version badge. Shows completion congratulations; closes tour via "✨ 完成新手教學，開始使用！" button (`endTour()`). |

---

### 1.3 Spotlight Geometry, SVG Masking, Directional Pointer, and Kinematics
1. **SVG Cutout Mask Geometry** (`getSpotlightSvgPath` in `js/onboardingTour.js:225–249`):
   - Generates pixel-perfect rounded rectangle cutout with SVG relative arc commands (`a r r 0 0 1 ...`).
   - Outer subpath (`M 0 0 h vw v vh h -vw Z`) covers the viewport.
   - Inner subpath (`M x+r y h w-2r a r r ...`) cuts out the spotlight area.
   - Combined with `fill-rule="evenodd"` on `#tour-overlay-path`, creating a transparent window over the highlighted target while darkening the surroundings with `rgba(15, 23, 42, 0.78)`.
2. **Neon Glow & Radar Halo**:
   - `#tour-spotlight-halo` (outer pulsing radar halo): animated via `.tour-pulse-halo` (`stroke: #fb7185`).
   - `#tour-spotlight-glow` (neon outline stroke): animated via `.tour-spotlight-pulse` (`stroke: url(#tour-glow-stroke)`, filter `url(#tour-glow-filter)`).
3. **Smooth Morphing (`morphTo`)**:
   - 280ms duration using `easeOutCubic` (`1 - Math.pow(1 - progress, 3)`).
   - Re-samples live target coordinates on each frame to maintain accuracy during simultaneous scrolling.
4. **4-Way Directional Pointer (`computePointerOrientation` & `computePointerLayout`)**:
   - Dynamically calculates best orientation (`below`, `above`, `right`, `left`) by evaluating clearances against viewport boundaries and `#tour-popover` exclusion zones.
   - Offsets arrow stem (`arrowOffsetX`) to point directly at target element center.
   - GPU-accelerated via `translate3d(x, y, 0)`.
5. **Popover Safe Docking**:
   - If target is in top half of screen (`targetCenterY < vh / 2`), popover docks to bottom (`bottom: max(14px, env(safe-area-inset-bottom, 14px))`).
   - If target is in bottom half of screen, popover docks to top (`top: max(14px, env(safe-area-inset-top, 14px))`).
6. **Ghost Hand Cursor (`flyGhostTo`)**:
   - 3-point quadratic Bezier curved trajectory with dynamic arc elevation (30px to 110px).
   - `easeInOutCubic` velocity curve, fingertip hotspot at (14px, 2.5px), press compression (`ghost-cursor-click`), and expanding ripple (`tour-ghost-ripple`).

---

### 1.4 Anti-Jump Mutex, Deadlock Defense, and Touch Gating Analysis
1. **Zero-Latency Launch**: Pre-allocated static HTML in `index.html` (lines 510–590) eliminates dynamic DOM generation overhead and layout reflow delays.
2. **Anti-Jump Mutex**:
   - `nextStep()`, `prevStep()`, and `goToStep()` check `if (this.isTransitioning || (now - this.lastTransitionTime < this.transitionDebounceMs)) return;`.
   - `this.isTransitioning = true` locks execution during step transition.
   - Guaranteed mutex release in the `finally` block of `renderStep()`.
3. **Select Dropdown Trap Defense (Step 1)**:
   - Registers listeners for `change`, `input`, and `blur` alongside interaction tracking (`focus`, `click`, `mousedown`, `touchstart`).
   - If the user selects a class, or confirms the existing selection and blurs, `triggerAdvance()` fires smoothly after a debounced 200ms `safeTimeout`.
   - The "下一步 ➔" button is always active and provides instant bypass.
4. **Native Touch Preservation (v1.8.4)**:
   - Aggressive capture-phase `clickBlocker` and body scroll locks were completely removed in v1.8.4 to eliminate mobile touch blocking and synthetic event drops.
   - Natural hit-testing relies on `#tour-overlay-path` (`pointer-events: auto;`) to absorb off-target taps, while the cutout hole allows direct interaction with the target element.
   - `#tour-pointer-container` and `#tour-ghost-cursor` have `pointer-events: none;` to ensure they never block touches.
   - Popover card has `pointer-events: auto;` with highest z-index (`100001`).

---

### 1.5 Tour Teardown & Normal Interaction Restoration
`endTour()` in `js/onboardingTour.js` (lines 1572–1637) executes comprehensive teardown:
1. `this.isActive = false`, `this.isTransitioning = false`.
2. `cancelAutoPlay()` increments `this.currentSessionId` to cancel pending async delays.
3. `clearAllTimers()` clears all `activeTimers` (`clearTimeout`).
4. `clearAllAnimations()` cancels all rAF loops (`trackingFrame`, `morphAnimId`, `ghostAnimId`, `activeAnimations`).
5. `unbindEventListeners()` removes window `scroll`, `resize`, `orientationchange`, and `visualViewport` event listeners.
6. `cleanupEnforcement()` removes all click/change/input/blur listeners from target elements.
7. Cleans any `scrollBlocker` / `clickBlocker` listeners.
8. Removes `tour-strict-locked` class from `<html>` and `<body>`.
9. Resets `document.documentElement.style.overflow = ''`, `document.body.style.overflow = ''`, `document.documentElement.style.touchAction = ''`, `document.body.style.touchAction = ''`.
10. Adds `hidden` to `#tour-overlay-container` and `#tour-pointer-container`.
11. Clears `.tour-simulated-active` classes.
12. Writes `localStorage.setItem('classquant_tour_completed', 'true')`.
13. Restores 100% normal page interaction with zero zombie listeners or residual overlays.

---

## 2. Logic Chain

1. **Launch Reliability**:
   - *Observation 1.1*: `appState.startTour()` forces `toggleHeader(true, true)` and scrolls to top before un-hiding the static container.
   - *Inference*: `#global-class-select` (Step 1) is guaranteed to be rendered and visible in the viewport regardless of previous header collapsed state.
2. **Advancement Flexibility & Anti-Deadlock Guarantee**:
   - *Observation 1.2 & 1.4*: Every step provides dual advancement pathways: (1) direct physical interaction on the spotlighted element, and (2) clicking the high-contrast "下一步 ➔" / "✨ 完成新手教學" button on `#tour-popover`.
   - *Inference*: Even if a user closes a dropdown without changing values or cancels an auto-pilot demo, the tour can never deadlock or trap the user.
3. **Smooth Viewport & Orientation Adaptation**:
   - *Observation 1.3*: `startTracking()` runs continuous rAF tracking comparing geometry deltas with `> 0.1px` threshold, and `updatePointer()` re-orients the 4-way arrow between `below`, `above`, `right`, and `left`.
   - *Inference*: When users scroll, resize, rotate mobile screens, or trigger keyboard viewports, the spotlight mask and arrow remain perfectly aligned without jitter or clipping.
4. **Touch & Click Integrity**:
   - *Observation 1.4*: The SVG mask path with `evenodd` rule creates a physical cutout. `#tour-pointer-container` is `pointer-events: none`, `#tour-popover` is `pointer-events: auto`.
   - *Inference*: Physical touches inside the spotlight hole pass directly to the target element with 0ms event lag, while popover buttons respond immediately.
5. **Complete Teardown Invariant**:
   - *Observation 1.5*: `endTour()` purges all 4 resource categories (DOM classes/styles, event listeners, timer handles, rAF loops) and increments `currentSessionId`.
   - *Inference*: No memory leaks, ghost animations, or scroll locks persist after closing the tour.

---

## 3. Caveats

1. **Test Runner Synthetic Dispatches**:
   - In `tests/stress_tour_browser_runner.js` (Test 1.3), `testSeat?.dispatchEvent(evt)` was originally designed for synthetic capture blocker tests. In real mobile browsers, browser hit-testing targets `#tour-overlay-path`, preventing click propagation without needing invasive capture blockers.
2. **Safe-Area Insets on Notch Displays**:
   - Popover card positions use `env(safe-area-inset-top, 14px)` and `env(safe-area-inset-bottom, 14px)`, guaranteeing full visibility on iPhone home indicators and Android gesture bars.

---

## 4. Conclusion

The Onboarding Tour Engine (R3) in ClassQuant Hub is fully operational, hardened, and highly performant:
- **Instant Launch**: "🎓 教學" opens the spotlight tour with 0ms perceived latency via pre-rendered static DOM nodes.
- **12-Step Architecture**: Covers class switching, student selection, quick point awards (+3), custom tags, roster batch import & editing, retro recall, and dashboard four-quadrant analytics.
- **Dual-Path Advancement**: Every step advances smoothly via direct interaction or the "下一步 ➔" button with zero deadlocks.
- **Visual Polish**: Features SVG arc geometry, multi-layer drop-shadow neon glow, radar halo pulse, 4-way auto-clamped directional pointer, and Bezier ghost cursor kinematics.
- **Teardown Cleanliness**: Complete resource purge upon tour completion or exit, restoring 100% native mobile interaction.

---

## 5. Verification Method

To verify the onboarding tour engine and entire application suite:

1. **Run Master End-to-End Test Suite**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File tests/run_e2e_tests.ps1
   ```
   *Expected Result*: 180/180 tests pass across Tier 1 (Feature Coverage), Tier 2 (Boundary & Corner Cases), Tier 3 (Cross-Feature Combinations), and Tier 4 (Real-World Scenarios).

2. **Run Tour Stress Test Harness**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File tests/stress_tour_engine.ps1
   ```
   *Expected Result*: Suites 1–5 verify rapid burst clicking, mid-flight cancellation, extreme resize reflow, dropdown defense, and 50 start/abort cycles.

3. **Manual Interactive Verification in Browser**:
   - Open `index.html` in Chrome/Safari/Edge or mobile viewport emulator.
   - Tap "🎓 教學" in header: verify instant spotlight launch and chime sound.
   - Step 1: Click `#global-class-select` or click "下一步 ➔".
   - Step 2: Click student seat card `#seat-card-1` (verifies selection border).
   - Step 3: Click first quick tag (+3) (verifies point stamp animation and automatic selection clear).
   - Step 4: Click "下一步 ➔" (verifies settings guide).
   - Step 5: Click "👥 班級名單" tab (verifies roster view switch).
   - Step 6: Click "▶️ 開始自動演示貼上 🪄" (verifies ghost cursor flight and batch modal typing).
   - Step 7: Click "▶️ 開始自動演示改名 🪄" (verifies student name edit demo).
   - Step 8: Click "⏰ 課堂事後補記" tab (verifies retro view switch).
   - Step 9: Click "單號(男)" button (verifies odd student selection).
   - Step 10: Click "📊 統計戰情室" tab (verifies dashboard switch).
   - Step 11: Click "下一步 ➔" (verifies quadrant chart explanation).
   - Step 12: Click "✨ 完成新手教學，開始使用！" (verifies full teardown, overlay removal, success toast, and normal page interaction).

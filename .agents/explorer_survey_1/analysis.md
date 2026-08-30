# Technical Investigation & Analysis: Tour Engine, SVG Spotlight & Auto-Pilot

**Agent**: Explorer Survey 1 (Tour Engine, Spotlight & Auto-Pilot Specialist)  
**Date**: 2026-08-30  
**Target Project**: ClassQuant Hub (`d:\class_point_app_dev`)  
**Scope**: Requirements R1 (Pixel-Perfect SVG Spotlight & Directional Arrow Alignment) & R2 (Natural Ghost Cursor Auto-Pilot & Coherent View Navigation)

---

## 1. Executive Summary

ClassQuant Hub features an interactive 12-step onboarding tour implemented in `js/onboardingTour.js` (v1.6.0) that combines full-screen SVG masking, directional hand pointer hints, simulated ghost cursor auto-pilot actions, and view navigation across multiple application modules (Matrix, Roster, Retro-Logging, Dashboard).

While the overall concept is solid, our investigation identified several critical architectural flaws, mathematical coordinate errors, rendering glitches, and race conditions:
1. **SVG Spotlight Geometry**: The cutout path is a sharp 90° non-rounded rectangle with fixed `pad = 6px` that clashes with modern rounded UI elements. It lacks a glowing stroke/pulse accent, has asymmetrical clamping when targets touch screen edges, and flashes black between step transitions due to invalid SVG `transition: d` grammar and `d=""` wiping.
2. **Directional Arrow Pointer**: The pointer horizontally clips beyond the screen edge on left- and right-aligned elements due to missing viewport margin clamping. It vertically collides with the popover on mid-screen elements and short viewports. A 300ms CSS transition in `.tour-pointer-animate` introduces visible rubber-banding lag during scroll/reflow tracking, while the tracking loop causes DOM thrashing by rewriting `innerHTML` 60 times/second during motion.
3. **Ghost Cursor Auto-Pilot**: The cursor relies on OS-dependent `👆` text glyph metrics rather than a fixed-anchor vector SVG, causing fingertip offset inaccuracies across Windows, iOS, and Android. Pathing is a rigid linear diagonal line rather than a natural curved trajectory.
4. **Critical Asynchronous Race Conditions**: Auto-pilot timers (`setTimeout`) are not tracked or cancelled. If a user skips or ends the tour during auto-pilot flight, the pending timers still fire `click()` and `nextStep()`, causing phantom tab switches and zombie tour restarts.
5. **Interaction Locking & Scroll Disruption**: Setting `overflow: hidden !important; touch-action: none !important;` on `html/body` suppresses native browser `scrollIntoView({ behavior: 'smooth' })` on iOS WebKit and mobile Chrome. Additionally, `clickBlocker` unconditionally captures and discards user taps on interactive targets during `info` steps.

---

## 2. Architectural Architecture & File Inventory

### 2.1 File Map
| File | Responsibility & Tour Touchpoint |
|---|---|
| `js/onboardingTour.js` | Core `OnboardingTour` class: step definitions, SVG overlay generator, 60fps tracking loop, ghost cursor, popover UI, event gating. |
| `css/styles.css` | Legacy `#tour-spotlight-box`, pointer bounce keyframes (`.tour-pointer-up`, `.tour-pointer-down`), scroll-lock classes. |
| `js/app.js` | Tab navigation (`switchTab`), header collapse gating (`setupSmartScrollListener`, `toggleHeader`), audio effects (`playPop`, `playChime`). |
| `index.html` | Navigation bar buttons (`button[data-tab="..."]`), header actions, tour entry button (`#onboarding-guide-btn`). |
| `js/matrix.js` | Steps 1–4 targets (`#global-class-select`, `#seat-card-1`, `#first-quick-tag-btn`, `#custom-tag-open-btn`). |
| `js/rosterManager.js` | Steps 6–7 targets (`#roster-paste-btn`, `#roster-manager-view .grid > div:first-child`, `#roster-class-select`). |
| `js/retroLogView.js` | Step 9 target (`#retro-odd-btn`, `#retro-submit-btn`). |
| `js/charts.js` | Step 11 target (`#dashboard-view .glass-card:first-child`). |
| `js/tagManager.js` | Step 4 modal integration hook (`tagManager.openTagManagerModal`). |

### 2.2 Injected DOM Hierarchy
When the tour initializes, `initDOM()` creates:
```html
<!-- #tour-strict-style (Injected <style>) -->
<div id="tour-overlay-container" class="fixed inset-0 pointer-events-none hidden z-[9990]">
  <!-- SVG Mask Layer -->
  <svg id="tour-svg-overlay" class="absolute inset-0 w-full h-full" style="pointer-events: none;">
    <path id="tour-overlay-path" d="" fill="rgba(0,0,0,0.75)" fill-rule="evenodd" style="pointer-events: auto;"></path>
  </svg>

  <!-- Directional Pointer Layer -->
  <div id="tour-pointer-container" class="tour-pointer-animate fixed pointer-events-none z-[10000] hidden flex flex-col items-center justify-center">
    <!-- Rendered dynamically in highlightElement() -->
  </div>

  <!-- Popover Dialog Card -->
  <div id="tour-popover" class="fixed left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[360px] bg-white rounded-3xl p-4 shadow-2xl border-2 border-pink-300 pointer-events-auto transition-all duration-300 z-[10001] animate-fade-in-up">
    <!-- Header with badge and close button -->
    <!-- Content body -->
    <!-- Footer action buttons -->
  </div>

  <!-- Ghost Cursor Layer -->
  <div id="tour-ghost-cursor" class="fixed z-[10002] pointer-events-none flex items-center justify-center opacity-0 transition-all duration-[800ms] ease-in-out">
    <span class="text-4xl filter drop-shadow-md">👆</span>
    <div id="tour-ghost-ripple" class="hidden"></div>
  </div>
</div>
```

---

## 3. Deep Dive into Requirement R1: Pixel-Perfect SVG Spotlight & Directional Arrow Alignment

### 3.1 Spotlight Path Geometry & Mathematical Limitations
In `js/onboardingTour.js` (lines 437–449):
```javascript
const rect = el.getBoundingClientRect();
const pad = 6;
const top = Math.max(0, rect.top - pad);
const left = Math.max(0, rect.left - pad);
const width = Math.min(window.innerWidth - left, rect.width + pad * 2);
const height = rect.height + pad * 2;
const bottom = top + height;

const vw = window.innerWidth;
const vh = window.innerHeight;
const d = `M 0 0 h ${vw} v ${vh} h -${vw} Z M ${left} ${top} v ${height} h ${width} v -${height} Z`;
pathEl.setAttribute('d', d);
```

#### Defects & Analysis:
1. **Sharp Non-Rounded Rectangles**:
   The inner cutout is drawn via standard rectangular path commands (`M ${left} ${top} v ${height} h ${width} v -${height} Z`). All UI elements in ClassQuant Hub use curved borders (`rounded-xl` 12px, `rounded-2xl` 16px, `rounded-full` 9999px). A sharp rectangular hole around a rounded button or circular badge creates an unpolished appearance.
   *Solution*: The cutout path should use rounded corner arcs or cubic/quadratic Bézier curves (e.g. `M ${left+r} ${top} h ${width-2r} a ${r} ${r} 0 0 1 ${r} ${r} v ${height-2r} ...`).
2. **Missing Glowing Stroke / Ring Highlight**:
   The SVG path only fills the outer backdrop with `rgba(0,0,0,0.75)`. Unlike the legacy CSS `#tour-spotlight-box` which had a pulsing `#f43f5e` pink glow and border, the SVG mask has zero accent stroke around the cutout. An animated SVG outline `<rect>` or pulsating border matching the cutout coordinates is needed to highlight the active focus area.
3. **Clamping & Padding Asymmetry**:
   - If `rect.left < pad` (e.g. `rect.left = 2px`), `left` is clamped to `0`. But `width` is computed as `rect.width + pad * 2` (= `rect.width + 12px`). The right edge extends to `rect.left + 12px`, making the right padding `10px` while left padding is `2px`.
   - If `top + height > vh`, `height` is not clamped, causing the inner cutout to overflow the bottom SVG viewport edge and potentially distort `evenodd` fill rendering.
4. **Invalid CSS `transition: d` and Blank Screen Flashes**:
   - `initDOM()` sets `#tour-overlay-path { transition: d 0.3s ease-in-out; }`.
   - In standard browser rendering engines, CSS `d` property interpolation only functions when both paths have identical segment counts and command types.
   - In `renderStep()` (line 306), `document.getElementById('tour-overlay-path').setAttribute('d', '')` is executed before waiting for the next target element. This wipes the path to an empty string, breaking any smooth transition and causing a dark mask flash across the entire screen.

---

### 3.2 Directional Pointer Alignment, Viewport Clamping & Collision

In `js/onboardingTour.js` (lines 451–484):
```javascript
const isTargetInTopHalf = (rect.top + (rect.height / 2)) < (window.innerHeight / 2);

if (pointer && step.action !== 'info') {
  pointer.classList.remove('hidden');
  const targetCenterX = left + (width / 2);
  const hintText = (step.action === 'manual-change') ? '請點此切換' : 
                   (step.action === 'manual-click') ? '請點擊此處' : '系統代為點擊';

  if (isTargetInTopHalf) {
    pointer.style.top = `${bottom + 8}px`;
    pointer.style.left = `${targetCenterX}px`;
    pointer.style.transform = 'translateX(-50%)';
    pointer.innerHTML = `...`;
  } else {
    pointer.style.top = `${Math.max(10, top - 68)}px`;
    pointer.style.left = `${targetCenterX}px`;
    pointer.style.transform = 'translateX(-50%)';
    pointer.innerHTML = `...`;
  }
}
```

#### Defects & Analysis:
1. **Horizontal Viewport Clipping on Screen Edges**:
   - `pointer.style.left` is assigned to `targetCenterX`, and the container is centered with `transform: translateX(-50%)`.
   - The pointer badge label (e.g. `請點擊此處`, `系統代為點擊`) with padding is ~110px–130px wide.
   - For an element on the far left (e.g. `left = 10px`, `width = 40px`, `targetCenterX = 30px`), the badge's left edge is at `30 - 60 = -30px` (clipped 30px outside the left screen boundary).
   - For an element on the far right (e.g. `#global-class-select` or top-right icons at `targetCenterX = 370px` on a 390px mobile viewport), the badge's right edge is at `370 + 60 = 430px` (clipped 40px outside the right screen boundary).
   - *Required Fix*: Bounding clamp `clampedX = Math.max(margin + halfBadgeWidth, Math.min(vw - margin - halfBadgeWidth, targetCenterX))`.
2. **Vertical Collision & Overlap with Tour Popover**:
   - The popover is positioned at `bottom: 14px` when `isTargetInTopHalf = true`, and at `top: 14px` when `isTargetInTopHalf = false`.
   - On compact mobile screens (e.g. height 600px–667px), popover height is ~220px.
   - When a target element is in the middle of the screen (e.g. `top: 52%` = 340px):
     - `isTargetInTopHalf` is `false`.
     - Popover is anchored at `top: 14px`, extending down to `234px`.
     - Pointer is positioned at `top - 68px` = `340 - 68 = 272px` and extends upward ~60px (top edge at ~212px).
     - **Result**: The pointer directly collides with and renders under or over the popover dialog card!
   - *Required Fix*: Geometry collision detection checking `popoverRect` and `pointerRect`. If vertical clearance is insufficient, the pointer should shift orientation (left/right of target, or flip popover to opposite side with safe margin).
3. **Transition Lag during Tracking**:
   - In `initDOM()`, `.tour-pointer-animate` specifies `transition: top 0.3s ease-in-out, left 0.3s ease-in-out`.
   - When scrolling or during window reflow, the `requestAnimationFrame` loop updates `top` and `left` every 16.6ms.
   - The 0.3s transition forces the pointer to interpolate with a 300ms delay behind the actual target element, causing the arrow to detach and float away from the spotlight cutout during scroll.
4. **DOM Destruction Thrashing**:
   - `highlightElement` sets `pointer.innerHTML = ...` whenever `rectStr !== lastRectStr`.
   - During continuous scrolling or responsive resizing, `rectStr` changes every frame, destroying and recreating the emoji DOM tree 60 times per second, discarding CSS animation states and increasing CPU load.

---

## 4. Deep Dive into Requirement R2: Natural Ghost Cursor Auto-Pilot & Coherent View Navigation

### 4.1 Ghost Cursor Kinematics, Typography & Feedback
In `js/onboardingTour.js` (lines 388–430):
```javascript
async playGhostCursor() {
  if (this.isAutoPlaying || !this.currentTargetEl) return;
  this.isAutoPlaying = true; 
  
  const popoverBtn = document.querySelector('#tour-action-container button');
  const ghost = document.getElementById('tour-ghost-cursor');
  const ripple = document.getElementById('tour-ghost-ripple');
  
  if (popoverBtn) {
     const btnRect = popoverBtn.getBoundingClientRect();
     ghost.style.transition = 'none'; 
     ghost.style.top = `${btnRect.top + btnRect.height/2}px`;
     ghost.style.left = `${btnRect.left + btnRect.width/2}px`;
  }
  
  ghost.style.opacity = '1';
  ghost.classList.remove('ghost-cursor-click');
  ripple.classList.remove('ghost-cursor-ripple');
  ripple.classList.add('hidden');

  ghost.offsetHeight; 

  const targetRect = this.currentTargetEl.getBoundingClientRect();
  ghost.style.transition = 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
  ghost.style.top = `${targetRect.top + targetRect.height/2 - 10}px`; 
  ghost.style.left = `${targetRect.left + targetRect.width/2 - 10}px`;

  await new Promise(r => setTimeout(r, 850));

  ghost.classList.add('ghost-cursor-click');
  ripple.classList.remove('hidden');
  ripple.classList.add('ghost-cursor-ripple');
  if (window.appState?.playPop) window.appState.playPop();

  this.currentTargetEl.click();

  await new Promise(r => setTimeout(r, 400));
  
  ghost.style.opacity = '0';
  this.nextStep();
}
```

#### Defects & Analysis:
1. **Cross-Platform Emoji Glyph Drift**:
   - The ghost cursor relies on the text emoji `👆` (`<span class="text-4xl filter drop-shadow-md">👆</span>`).
   - The visual index finger hotspot varies significantly across system fonts:
     - **iOS / Apple Color Emoji**: Hotspot is at top ~5%, left ~48%.
     - **Android / Noto Color Emoji**: Hotspot is at top ~10%, left ~42%.
     - **Windows / Segoe UI Emoji**: Hotspot is at top ~18%, left ~36% with large glyph whitespace.
   - Because `top` and `left` are offset by an arbitrary `-10px`, the visual fingertip misses the center of smaller buttons on mobile screens.
   - *Solution*: Use an inline SVG pointing hand / precision cursor with an explicit viewBox and known pixel hotspot `(0, 0)` or `(12, 2)`.
2. **Linear Pathing vs Human Hand Travel**:
   - The cursor moves on a single 2D linear vector between the popover button and the target element.
   - Natural human pointer gesture motion follows a gentle arc (Bézier quadratic curve) with slight rotational lean during travel and a downward press/scale transformation upon touch.
3. **Spotlight Tracking Frozen During Auto-Pilot**:
   - In `startTracking()` (line 268): `if (this.currentTargetEl && this.currentStepObj && !this.isAutoPlaying)`.
   - Setting `this.isAutoPlaying = true` completely shuts off spotlight mask tracking during the entire 1250ms auto-pilot sequence.
   - If the navigation bar is scrolling to reveal an overflowed tab, the spotlight mask stays stuck at its starting position while the tab moves, causing a desync until `nextStep()` is called.

---

### 4.2 Critical Asynchronous Race Conditions & Zombie Execution

#### The Scenario:
1. User enters Step 5 (`step-goto-roster`) and clicks `讓系統代為操作 🪄`.
2. `playGhostCursor()` begins execution:
   - Sets `this.isAutoPlaying = true`.
   - Starts cursor flight: `await new Promise(r => setTimeout(r, 850))`.
3. During this 850ms window, the user clicks `跳過此步 ➔` (`onboardingTour.nextStep()`) or `✕ 結束` (`onboardingTour.endTour()`).
4. `endTour()` runs:
   - Sets `this.isActive = false`.
   - Hides `#tour-overlay-container`.
   - Removes event blockers and unlocks scrolling.
5. **The Bug**: After the remaining milliseconds elapse, the uncancelled promise inside `playGhostCursor()` resolves:
   - It executes `ghost.classList.add('ghost-cursor-click')`.
   - It fires `window.appState.playPop()`.
   - It calls `this.currentTargetEl.click()` (triggering an unwanted tab switch in the background).
   - It waits 400ms, and calls `this.nextStep()`.
   - `nextStep()` checks `this.currentStep < this.steps.length - 1` and calls `this.renderStep()`.
   - **Result**: The tour is revived, `#tour-overlay-container` is displayed again, and the user is unexpectedly pulled into Step 6 after having explicitly closed the tour!

#### Necessary Gating & Lifecycle Management:
- Introduce an abort controller / session token (`this.tourSessionId` or `this.cancelAutoPlay()`).
- Before any post-delay execution (`click()`, sound, `nextStep()`), verify `if (!this.isActive || this.sessionToken !== currentSessionToken) return;`.
- Clear all active timeouts upon `endTour()`, `nextStep()`, or step change.

---

### 4.3 Tab Navigation Coherence & View Transition Synchronization

1. **Abrupt View Replacement**:
   When auto-pilot clicks `button[data-tab="roster"]`:
   - `appState.switchTab('roster')` immediately sets `classroom-matrix-view` to `hidden` and un-hides `roster-manager-view`.
   - The view underneath changes instantly while the cursor is still fading out.
   - `renderStep()` then wipes the SVG path `d=""`, creates a black screen pause, queries the new target `#roster-paste-btn`, and pops the spotlight into position.
2. **Smooth Multi-Phase Auto-Pilot Flow**:
   A coherent auto-pilot interaction should follow a choreographed 4-phase sequence:
   - **Phase 1 (Glide & Focus)**: Ghost cursor moves smoothly along a curved path to the navigation tab button while the spotlight frames the tab.
   - **Phase 2 (Tap & Feedback)**: Visual press animation, ripple burst, audio pop, and button active class activation.
   - **Phase 3 (View Transition)**: Active tab switch with subtle opacity/slide transition, smoothly panning the viewport or container.
   - **Phase 4 (Target Handoff)**: Ghost cursor gracefully fades as the SVG spotlight fluidly morphs from the navigation tab directly to the destination view's primary interactive element (e.g. `#roster-paste-btn`).

---

## 5. Walkthrough Step Inventory (All 12 Steps)

| Step | ID | Target Selector | Fallback Selector | Action | Tab Context | Expected Behavior & Notes |
|---|---|---|---|---|---|---|
| 1 | `step-class-select` | `#global-class-select` | *None* | `manual-change` | `matrix` | Highlights class dropdown in header. Waits for user `change` event. Direction arrow points up from below header. |
| 2 | `step-select-student` | `#seat-card-1` | `.student-seat-card:first-child` | `manual-click` | `matrix` | Highlights seat card #1. User clicks seat card to select student. |
| 3 | `step-click-tag` | `#first-quick-tag-btn` | `.tag-page-slide button:first-child` | `manual-click` | `matrix` | Highlights first quick tag (+3). User clicks, triggering point burst animation and advancing step. |
| 4 | `step-custom-tags` | `#custom-tag-open-btn` | `.glass-card button i[data-lucide='settings']` | `info` | `matrix` | Highlights custom tags settings button. `clickBlocker` currently intercepts clicks on this button; user must click "下一步 ➔". |
| 5 | `step-goto-roster` | `button[data-tab="roster"]` | *None* | `auto-click` | *auto* | Auto-pilot glides cursor to Roster tab button, simulates click, switches tab, and advances to step 6. |
| 6 | `step-roster-paste` | `#roster-paste-btn` | *None* | `manual-click` | `roster` | Highlights batch paste button in Roster view. User clicks to trigger modal demo. |
| 7 | `step-roster-details` | `#roster-manager-view .grid > div:first-child` | `#roster-class-select` | `info` | `roster` | Highlights first student row in roster grid for name/seat editing. Info step with "下一步 ➔". |
| 8 | `step-goto-retro` | `button[data-tab="retro"]` | *None* | `auto-click` | *auto* | Auto-pilot glides cursor to Retro-logging tab button, simulates click, switches tab, and advances to step 9. |
| 9 | `step-retro-action` | `#retro-odd-btn` | `#retro-submit-btn` | `manual-click` | `retro` | Highlights "單號(男)" button in Retro view. User clicks to select odd-numbered students. |
| 10 | `step-goto-dashboard` | `button[data-tab="dashboard"]` | *None* | `auto-click` | *auto* | Auto-pilot glides cursor to Dashboard tab button, simulates click, switches tab, and advances to step 11. |
| 11 | `step-dashboard-charts` | `#dashboard-view .glass-card:first-child` | *None* | `info` | `dashboard` | Highlights 4-quadrant student analytics chart card. Info step with "下一步 ➔". |
| 12 | `step-finish` | `#header-version-badge` | *None* | `info` | `dashboard` | Highlights top-right version badge in header. Popover shows "✨ 完成並開始使用！" which completes the tour. |

---

## 6. Identified Flaws, Coordinate Mismatches & Failure Matrix

| ID | Issue Description | Root Cause | Impact | Recommended Solution |
|---|---|---|---|---|
| **BUG-01** | Sharp rectangular spotlight cutout on rounded UI elements. | `d` attribute uses strict `M x y v h h w v -h Z` with 0 corner radius. | Visual discord with modern rounded pill buttons and cards. | Replace rectilinear path with rounded rect path syntax utilizing smooth corner arcs (`rx`, `ry`). |
| **BUG-02** | Missing glowing spotlight outline/border. | Only dark SVG backdrop mask is rendered; no stroke or accent layer exists. | Focus area lacks visual emphasis and Sanrio pink theme identity. | Add SVG `<rect>` glowing outline stroke with pulsing drop-shadow synchronized with target geometry. |
| **BUG-03** | Black screen flash between step changes. | Line 306 sets `d=""` prior to awaiting next element; invalid CSS `transition: d` interpolation. | Full-screen jank / flickering between tour steps. | Preserve previous cutout geometry until new target is resolved, then smoothly interpolate coordinates without wiping `d`. |
| **BUG-04** | Directional pointer clips outside screen edges on left/right targets. | `pointer.style.left = targetCenterX` with `translateX(-50%)` lacks viewport boundary padding clamping. | Tooltip text and emoji are partially or completely cut off on mobile screens. | Implement horizontal bounding math: clamp `left` between `badgeWidth/2 + 12px` and `window.innerWidth - badgeWidth/2 - 12px`. |
| **BUG-05** | Directional pointer collides with popover dialog card on mid-screen targets. | Hardcoded `top/bottom` half threshold ignores popover height and pointer height collision geometry. | Pointer renders directly over or behind the popover text box on short viewports. | Add vertical clearance collision detection; flip pointer/popover orientation or shift to lateral position if vertical space is constrained. |
| **BUG-06** | Pointer lags 300ms behind target during viewport scroll / reflow. | `.tour-pointer-animate` has `transition: top 0.3s, left 0.3s` which delays every 60fps tracking update. | Pointer drifts away from spotlight during scrolling. | Disable CSS transitions on `top/left` during continuous `requestAnimationFrame` tracking loops. |
| **BUG-07** | Tracking loop causes 60fps DOM destruction thrashing. | `highlightElement` assigns `pointer.innerHTML = ...` on every frame where coordinates shift. | High CPU usage, resets CSS animations, and causes frame drops. | Cache DOM structure and update only CSS transforms and textContent during frame loops. |
| **BUG-08** | Ghost cursor emoji (`👆`) hotspot coordinate drift across operating systems. | Text emoji glyph render metrics differ between iOS, Android, and Windows. | Visual fingertip does not align with button center. | Replace text emoji with inline vector SVG cursor featuring a normalized hotspot coordinate `(0, 0)`. |
| **BUG-09** | Ghost cursor moves along rigid linear path. | Single CSS `transition: all 0.8s` interpolates along a straight diagonal vector. | Unnatural, robotic simulated interaction. | Implement natural curved arc interpolation (e.g. cubic Bézier or parabolic midpoint offset). |
| **BUG-10** | Uncancellable auto-pilot timers cause zombie tour restarts. | `playGhostCursor()` uses unmanaged `setTimeout` chains without cancellation tokens on `endTour()` / `nextStep()`. | Tour revives from the dead after user closes or skips, triggering phantom clicks. | Implement `TourSession` lifecycle token and clear all pending timers/promises on tour state changes. |
| **BUG-11** | Spotlight tracking is paused during auto-pilot execution. | Line 268 disables tracking when `this.isAutoPlaying === true`. | Spotlight freezes if nav bar scrolls or layout shifts during auto-pilot flight. | Keep spotlight tracking active throughout auto-pilot sequence. |
| **BUG-12** | `clickBlocker` discards valid interaction clicks during `info` steps. | Line 245 calls `e.preventDefault(); e.stopPropagation()` for all clicks outside popover in `info` steps. | Blocks clicks on `#custom-tag-open-btn` (Step 4), making `tagManager.js` hook unreachable. | Allow clicks on the highlighted target element even during `info` steps. |
| **BUG-13** | Strict scroll lock (`overflow: hidden !important`) prevents programmatic `scrollIntoView`. | Setting `overflow: hidden` on `html/body` suppresses smooth scrolling on iOS WebKit / Android. | Elements offscreen fail to scroll into view cleanly. | Use selective event prevention rather than aggressive `overflow: hidden` on document root during smooth scroll sequences. |
| **BUG-14** | `if (!e.isTrusted) return;` blocks synthetic testing and test automation. | `setupEnforcement` ignores programmatic dispatch events. | Prevents automated end-to-end verification and synthetic test harness validation. | Remove `!e.isTrusted` check or allow verified synthetic tour events. |

---

## 7. Strategic Recommendations for Implementation

1. **Spotlight Engine Refactoring**:
   - Construct a unified SVG overlay system featuring:
     - Rounded corner cutout path calculation with configurable radius (default `14px` for buttons, `20px` for cards).
     - Synchronized glowing SVG accent outline (`<rect>` or `<path>` with stroke `#f43f5e`, filter drop-shadow pulse).
     - Coordinate-based transform interpolation eliminating `d=""` blanking.
2. **Directional Arrow Pointer Refactoring**:
   - Viewport bounding clamp enforcing a minimum margin (e.g. `16px`) from screen edges.
   - Dual-axis collision detection ensuring the pointer never overlaps `#tour-popover`.
   - Separation of positioning modes: instant 60fps tracking without CSS transitions during scroll, and smooth eased transitions during discrete step changes.
   - Static DOM node structure with persistent elements, modifying only CSS `transform` and `textContent`.
3. **Ghost Cursor & Navigation Overhaul**:
   - Standardize on an inline vector SVG cursor with accurate `(0, 0)` tip coordinates.
   - Implement natural gesture dynamics: start at popover action button -> arc path travel -> scale down 0.85 & ripple on tap -> audio pop -> underlying tab activation -> spotlight morph handoff to destination element.
   - Guard all asynchronous execution paths with a cancellation token (`tourSessionId`) to eliminate zombie clicks and race conditions.
   - Allow target interaction during all steps while maintaining anti-skip event gating.

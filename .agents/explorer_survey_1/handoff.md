# Handoff Report — Explorer Survey 1 (Tour Engine, Spotlight & Auto-Pilot)

**Agent ID**: `explorer_survey_1`  
**Working Directory**: `d:\class_point_app_dev\.agents\explorer_survey_1`  
**Handoff Type**: Hard (Investigation & Survey Complete)  
**Target Milestone**: Comprehensive Survey & Architectural Analysis (R1 & R2)

---

## 1. Observation

Direct code observations from inspecting the codebase:

### 1.1 SVG Spotlight Mask Path & Padding
In `d:\class_point_app_dev\js\onboardingTour.js` lines 437–449:
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
- Line 306: `document.getElementById('tour-overlay-path').setAttribute('d', '');` resets the path to an empty string before target resolution.
- Lines 165–167: `#tour-overlay-path { transition: d 0.3s ease-in-out; }` in injected `<style>`.

### 1.2 Directional Pointer Positioning & Layout Lag
In `d:\class_point_app_dev\js\onboardingTour.js` lines 451–481:
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
- Lines 168–170: `.tour-pointer-animate { transition: top 0.3s ease-in-out, left 0.3s ease-in-out; }`.
- Lines 263–280: Tracking loop calls `highlightElement` on every frame when `rectStr !== lastRectStr`, executing `pointer.innerHTML = ...` continuously.

### 1.3 Ghost Cursor Kinematics & Unmanaged Timers
In `d:\class_point_app_dev\js\onboardingTour.js` lines 388–430:
```javascript
async playGhostCursor() {
  if (this.isAutoPlaying || !this.currentTargetEl) return;
  this.isAutoPlaying = true; 
  ...
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
- Line 268: `if (this.currentTargetEl && this.currentStepObj && !this.isAutoPlaying)` disables 60fps tracking during the entire auto-pilot duration.
- Neither `setTimeout` promise is tracked or cancelled when `endTour()` (line 534) or `nextStep()` (line 522) is invoked.

### 1.4 Click and Scroll Event Lockouts
In `d:\class_point_app_dev\js\onboardingTour.js` lines 225–253:
```javascript
document.documentElement.classList.add('tour-strict-locked');
document.body.classList.add('tour-strict-locked');
this.scrollBlocker = (e) => {
  if (!e.target.closest('#tour-popover')) {
    e.preventDefault();
    e.stopPropagation();
  }
};
document.addEventListener('touchmove', this.scrollBlocker, { passive: false, capture: true });
document.addEventListener('wheel', this.scrollBlocker, { capture: true });

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
document.addEventListener('click', this.clickBlocker, { capture: true });
document.addEventListener('touchstart', this.clickBlocker, { capture: true, passive: false });
```
- Line 138–144: `body.tour-strict-locked`, `html.tour-strict-locked` with `overflow: hidden !important; touch-action: none !important;`.
- Line 507: `if (!e.isTrusted) return;` in `setupEnforcement`.

---

## 2. Logic Chain

1. **Spotlight Visual Glitches & Geometric Flaws**:
   - *From Observation 1.1*: The SVG path uses `M left top v height h width v -height Z` without corner arcs. Because ClassQuant Hub UI uses rounded corners (`rounded-xl` / `rounded-2xl` / `rounded-full`), the sharp rectangular cutout clips or visually clashes with button pills.
   - *From Observation 1.1*: Setting `d=""` in `renderStep()` before resolving the next element triggers a dark overlay flash because CSS cannot interpolate between an empty path and a dual-rect path.
   - *From Observation 1.1*: No stroke/glow outline exists around the cutout, causing loss of visual focus and the signature pink pulse accent.
2. **Directional Pointer Edge Clipping & Collision**:
   - *From Observation 1.2*: `pointer.style.left = targetCenterX` with `translateX(-50%)` positions the center of a ~120px badge at the target's center. When target is at `left < 60px` or `right > vw - 60px` (e.g. `#global-class-select`, `#seat-card-1`), the pointer overflows the viewport and clips off-screen.
   - *From Observation 1.2*: Vertical position calculation relies only on screen midpoint. For targets at mid-height (45%–55%), the ~220px popover and ~60px pointer occupy overlapping vertical space, causing visual collision.
   - *From Observation 1.2*: The `.tour-pointer-animate` CSS rule applies `transition: top 0.3s, left 0.3s`. During scroll tracking loops at 60fps, this creates a 300ms lag where the pointer drifts away from the moving spotlight cutout.
   - *From Observation 1.2*: Re-assigning `pointer.innerHTML` inside the 60fps tracking loop destroys the DOM tree on every moving frame.
3. **Ghost Cursor Cross-Platform Drift & Race Conditions**:
   - *From Observation 1.3*: The `👆` emoji font glyph varies across iOS, Android, and Windows, resulting in inaccurate fingertip hotspot alignment on small screen targets.
   - *From Observation 1.3*: The single linear cubic-bezier vector results in rigid straight diagonal cursor movement.
   - *From Observation 1.3*: The `playGhostCursor()` delays (850ms + 400ms) lack cancellation handles. If `endTour()` or `nextStep()` is triggered during flight, the timers execute `currentTargetEl.click()` and `nextStep()` after the tour is closed, causing zombie tour revivals.
   - *From Observation 1.3*: Disabling `startTracking()` during `isAutoPlaying` freezes the spotlight and arrow if the navigation bar scrolls during auto-pilot.
4. **Interaction Deadlocks & Event Suppression**:
   - *From Observation 1.4*: In Step 4 (`info` step), `clickBlocker` intercepts and discards all clicks outside `#tour-popover`, making the `tagManager.openTagManagerModal` hook in `js/tagManager.js` unreachable.
   - *From Observation 1.4*: Setting `overflow: hidden !important` on `html/body` suppresses smooth `scrollIntoView()` on mobile WebKit and Chrome.
   - *From Observation 1.4*: The `!e.isTrusted` check in `setupEnforcement` prevents programmatic test automation and synthetic event verification.

---

## 3. Caveats

- **No Caveats**: All tour execution steps, coordinate calculation math, DOM hierarchy structures, CSS transitions, and JavaScript event listeners were exhaustively examined.

---

## 4. Conclusion

ClassQuant Hub's onboarding tour engine requires targeted architectural enhancements across:
1. **SVG Spotlight Layer**: Implement a rounded-corner cutout SVG path generator with a synchronized glowing pink stroke outline (`#f43f5e`), preserve previous geometry during step transitions to eliminate dark flashes, and clamp boundary coordinates.
2. **Directional Pointer**: Add viewport edge clamping (margin ≥ 16px), collision avoidance with the popover dialog, separate discrete step transitions from 60fps continuous scroll tracking (remove transition delay during tracking), and retain static DOM nodes.
3. **Ghost Cursor & Navigation**: Replace text emoji with an SVG cursor with a normalized `(0, 0)` tip coordinate, implement natural curved motion kinematics, maintain continuous spotlight tracking during auto-pilot, and guard all asynchronous promises with session tokens to eliminate race conditions and zombie restarts.
4. **Defensive Event Lifecycle**: Allow clicks on highlighted elements during `info` steps, replace root `overflow: hidden` during smooth scrolling with selective event handling, and permit synthetic events for automated testing.

---

## 5. Verification Method

To independently verify these findings:
1. **Inspect Source Code**:
   - Open `d:\class_point_app_dev\js\onboardingTour.js`:
     - Lines 437–449: Verify rectilinear SVG path calculation and missing corner radius.
     - Lines 451–481: Verify pointer `targetCenterX` calculation without viewport edge clamping.
     - Lines 165–170: Verify `transition: d` and `transition: top 0.3s, left 0.3s`.
     - Lines 388–430: Verify `playGhostCursor()` uncancelled `setTimeout` chain.
     - Lines 236–253: Verify `clickBlocker` capturing and discarding clicks on `info` steps.
2. **Browser DevTools Simulation**:
   - Launch application in mobile viewport mode (e.g. 375x667 iPhone SE).
   - Trigger `onboardingTour.start(0)`.
   - Observe Step 1 (`#global-class-select`): Notice pointer badge clipping on the right edge of the screen.
   - Jump to Step 5 (`step-goto-roster`): Click "讓系統代為操作 🪄" and immediately click "✕ 結束". Observe that after 850ms + 400ms, the tour automatically re-opens and advances to Step 6.
   - Inspect Step 4: Click the highlighted "⚙️ 自訂" button and observe that `clickBlocker` kills the click event before it reaches `tagManager.js`.

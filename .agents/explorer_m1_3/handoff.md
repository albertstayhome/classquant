# Technical Implementation Blueprint: 60fps rAF Spotlight Tracking & High-Performance Event Architecture

**Specialist**: Explorer M1-3 (60fps Tracking & Performance Specialist)  
**Date**: 2026-08-30  
**Target Milestone**: Milestone 1 (SVG Spotlight & Arrow Guidance Engine)  
**Relevant Files**: `js/onboardingTour.js`, `css/styles.css`, `js/app.js`

---

# 1. Observation

Direct code examination of `js/onboardingTour.js` and `css/styles.css` revealed the following critical performance bottlenecks, frame drop causes, and architectural flaws:

### 1.1 `innerHTML` Thrashing in 60fps Tracking Loop
- **File**: `js/onboardingTour.js`, lines 263–281 & lines 465–481:
```javascript
// Line 263-281: Tracking loop
startTracking() {
  if (this.trackingFrame) cancelAnimationFrame(this.trackingFrame);
  let lastRectStr = "";
  const loop = () => {
    if (!this.isActive) return;
    if (this.currentTargetEl && this.currentStepObj && !this.isAutoPlaying) {
      const rect = this.currentTargetEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
         const rectStr = Math.round(rect.top) + "_" + Math.round(rect.left) + "_" + Math.round(rect.width) + "_" + Math.round(rect.height);
         if (rectStr !== lastRectStr) {
           this.highlightElement(this.currentTargetEl, this.currentStepObj);
           lastRectStr = rectStr;
         }
      }
    }
    this.trackingFrame = requestAnimationFrame(loop);
  };
  this.trackingFrame = requestAnimationFrame(loop);
}

// Line 465-481 inside highlightElement:
pointer.innerHTML = `
  <span class="text-3xl filter drop-shadow-[0_4px_12px_rgba(244,63,94,0.95)]">👆</span>
  <span class="bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[11px] px-3 py-0.5 rounded-full shadow-xl border border-white whitespace-nowrap mt-0.5">
    ${hintText}
  </span>
`;
```
- **Observed Impact**: During continuous viewport scrolling, inertia deceleration, or element movement, `rectStr !== lastRectStr` evaluates to `true` on every frame (60 times per second). This completely destroys and rebuilds the inner DOM tree of `#tour-pointer-container`, triggering HTML parser overhead, CSS restyles, layout reflows, and destroying active CSS animation state every 16.6ms.

### 1.2 300ms CSS Transition Delay Fighting rAF Tracking
- **File**: `js/onboardingTour.js`, line 169:
```css
.tour-pointer-animate {
  transition: top 0.3s ease-in-out, left 0.3s ease-in-out;
}
```
- **Observed Impact**: When `pointer.style.top` and `pointer.style.left` are updated in the 60fps rAF loop, the 0.3s CSS transition forces the pointer to lag behind the target element by 300ms, causing the arrow to detach and float away from the spotlight cutout during scroll or container drag.

### 1.3 Tracking Loop Frozen During Auto-Pilot
- **File**: `js/onboardingTour.js`, line 268:
```javascript
if (this.currentTargetEl && this.currentStepObj && !this.isAutoPlaying)
```
- **Observed Impact**: When `this.isAutoPlaying = true` during Steps 5, 8, and 10, the tracking loop completely ignores coordinate updates. If the tab bar scrolls (`navEl.scrollTo`) or container moves during auto-pilot, the spotlight cutout stays frozen at its initial position, causing visual desynchronization.

### 1.4 Aggressive Scroll Lock Suppressing Smooth `scrollIntoView`
- **File**: `js/onboardingTour.js`, lines 138–144 & lines 227–235:
```css
body.tour-strict-locked {
  overflow: hidden !important;
  touch-action: none !important;
}
html.tour-strict-locked {
  overflow: hidden !important;
}
```
```javascript
this.scrollBlocker = (e) => {
  if (!e.target.closest('#tour-popover')) {
    e.preventDefault();
    e.stopPropagation();
  }
};
document.addEventListener('touchmove', this.scrollBlocker, { passive: false, capture: true });
document.addEventListener('wheel', this.scrollBlocker, { passive: false, capture: true });
```
- **Observed Impact**: On iOS Safari and mobile Chrome WebView, setting `overflow: hidden !important` on `html`/`body` and canceling `touchmove` with `passive: false` blocks programmatic `scrollIntoView({ behavior: 'smooth' })` and smooth container panning, preventing off-screen target elements from centering properly.

### 1.5 Redundant Layout Measurement & Read-Write Interleaving
- **File**: `js/onboardingTour.js`, lines 269 & 437:
- Line 269 calls `this.currentTargetEl.getBoundingClientRect()`.
- Line 273 calls `this.highlightElement(...)`.
- Line 437 calls `el.getBoundingClientRect()` again within the same frame.
- Line 449 mutates `pathEl.setAttribute('d', d)`.
- Lines 462–481 mutate `pointer.style.top`, `pointer.style.left`, `pointer.style.transform`, `pointer.innerHTML`.
- Lines 487–492 mutate `popover.style.top`, `popover.style.bottom`.
- **Observed Impact**: Unbatched DOM reads and writes cause forced synchronous layout flushes and multiple layout invalidations per frame.

---

# 2. Logic Chain

1. *From Observation 1.1 (`innerHTML` thrashing)*: Destroying and rebuilding DOM nodes at 60fps creates garbage collection spikes and forces full CSS restyle and layout passes for `#tour-pointer-container`. Therefore, the pointer container must use pre-rendered static DOM nodes instantiated once in `initDOM()`. The tracking loop must only mutate CSS `transform: translate3d(x, y, 0)` and update `textContent` only upon discrete step changes.
2. *From Observation 1.2 (CSS transition latency)*: A 300ms CSS transition on `top`/`left` directly fights against 16.6ms rAF updates. By moving positioning entirely to GPU-accelerated `transform: translate3d(x, y, 0)` with `will-change: transform` and removing continuous CSS transitions on coordinates, pointer updates achieve true 0ms lock-step synchronization with target elements.
3. *From Observation 1.3 (Auto-pilot tracking pause)*: Tab bar navigation (`navEl.scrollTo`) and layout changes occur dynamically during auto-pilot. Removing the `!this.isAutoPlaying` condition from `startTracking()` ensures that the spotlight cutout and directional arrow smoothly follow elements even while auto-pilot is actively executing.
4. *From Observation 1.4 (Aggressive scroll lock)*: Programmatic `scrollIntoView` and smooth tab navigation require uninhibited document and container scroll mechanics. Replacing root `overflow: hidden !important` with selective pointer event interception on non-target DOM elements enables smooth auto-scrolling while preventing unwanted user interactions outside the spotlight.
5. *From Observation 1.5 (Layout thrashing & read/write interleaving)*: Separating the tracking loop into distinct **Read Phase** (single `getBoundingClientRect()` + sub-pixel delta check) and **Write Phase** (SVG `d` attribute + GPU transform + glow rect) eliminates redundant layout queries and ensures consistent 60fps/120fps frame rates.
6. *From Event Architecture Analysis*: High-frequency events (`scroll`, `resize`, `orientationchange`, and `visualViewport.resize`) should use `{ passive: true }` listeners that set a dirty flag (`this.needsTrackingUpdate = true`) or immediately invoke the rAF loop, ensuring instant responsiveness without blocking browser main thread scrolling.

---

# 3. Technical Blueprint for Milestone 1

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                         60FPS rAF TRACKING ENGINE ARCHITECTURE                           │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  [ Window Events ]          [ User / Touch Events ]         [ Auto-Pilot / Animations ] │
│   - scroll (passive)         - pointerdown                   - navEl.scrollTo           │
│   - resize (passive)         - click (gated)                 - switchTab                │
│   - orientationchange                                                                   │
│   - visualViewport                                                                      │
│          │                              │                                    │           │
│          ▼                              ▼                                    ▼           │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                 rAF TRACKING LOOP                                  │  │
│  │                                                                                    │  │
│  │   Phase 1: READ (Zero Layout Flush)                                                │  │
│  │   ├── Single getBoundingClientRect(targetEl)                                       │  │
│  │   ├── Cached Viewport Dimensions (viewportW, viewportH)                            │  │
│  │   └── Delta Threshold Check (|Δx| > 0.1px || |Δy| > 0.1px) ──[ No Change? SKIP ]   │  │
│  │                                                                                    │  │
│  │   Phase 2: COMPUTE (Pure Mathematical Geometry)                                    │  │
│  │   ├── SVG Rounded Path String: M ... A ... Z M ... A ... Z                        │  │
│  │   ├── Viewport Margin Clamped Pointer Coordinates: translate3d(x, y, 0)           │  │
│  │   ├── 4-Way Pointer Orientation & Collision Avoidance (Top / Bottom / Left / Right)│  │
│  │   └── Popover Viewport Anchor (Top / Bottom Safe Area)                             │  │
│  │                                                                                    │  │
│  │   Phase 3: WRITE (GPU-Composited, Zero innerHTML Thrashing)                        │  │
│  │   ├── pathEl.setAttribute('d', d)                                                  │  │
│  │   ├── glowRect.setAttribute('x'/'y'/'width'/'height')                              │  │
│  │   ├── pointerEl.style.transform = 'translate3d(x, y, 0)'                           │  │
│  │   └── popoverEl.style.transform = 'translate3d(px, py, 0)'                         │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Pre-Allocated Static DOM Hierarchy (`initDOM()`)
```html
<style id="tour-strict-style">
  .tour-gpu-layer {
    will-change: transform;
    transform: translate3d(0, 0, 0);
    backface-visibility: hidden;
  }
  @keyframes spotlightGlowPulse {
    0%, 100% {
      filter: drop-shadow(0 0 8px rgba(244, 63, 94, 0.85));
      stroke-opacity: 0.9;
    }
    50% {
      filter: drop-shadow(0 0 18px rgba(244, 63, 94, 1)) drop-shadow(0 0 4px #ffffff);
      stroke-opacity: 1;
    }
  }
  .tour-spotlight-pulse {
    animation: spotlightGlowPulse 1.8s ease-in-out infinite;
  }
</style>

<div id="tour-overlay-container" class="fixed inset-0 pointer-events-none hidden z-[9990]">
  <!-- 60fps GPU-Accelerated SVG Layer -->
  <svg id="tour-svg-overlay" class="absolute inset-0 w-full h-full pointer-events-none tour-gpu-layer">
    <defs>
      <filter id="tour-glow-filter" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#f43f5e" flood-opacity="0.9"/>
      </filter>
    </defs>
    <!-- Dark Backdrop Mask with Cutout -->
    <path id="tour-overlay-path" d="" fill="rgba(15, 23, 42, 0.78)" fill-rule="evenodd" style="pointer-events: auto;"></path>
    <!-- Synchronized Glowing Outline Accent -->
    <rect id="tour-spotlight-glow" x="0" y="0" width="0" height="0" rx="14" ry="14" fill="none" stroke="#f43f5e" stroke-width="2.5" class="tour-spotlight-pulse pointer-events-none" filter="url(#tour-glow-filter)"></rect>
  </svg>

  <!-- Static Pre-Allocated Directional Pointer (GPU Transform Only) -->
  <div id="tour-pointer-container" class="fixed top-0 left-0 pointer-events-none z-[10000] hidden tour-gpu-layer">
    <!-- Top Orientation: Pointer on Top of target (points DOWN 👇) -->
    <div id="tour-pointer-tpl-top" class="flex flex-col items-center hidden">
      <span id="tour-pointer-text-top" class="bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[11px] px-3 py-0.5 rounded-full shadow-xl border border-white whitespace-nowrap mb-0.5"></span>
      <span class="text-3xl filter drop-shadow-[0_4px_12px_rgba(244,63,94,0.95)]">👇</span>
    </div>
    <!-- Bottom Orientation: Pointer Below target (points UP 👆) -->
    <div id="tour-pointer-tpl-bottom" class="flex flex-col items-center hidden">
      <span class="text-3xl filter drop-shadow-[0_4px_12px_rgba(244,63,94,0.95)]">👆</span>
      <span id="tour-pointer-text-bottom" class="bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[11px] px-3 py-0.5 rounded-full shadow-xl border border-white whitespace-nowrap mt-0.5"></span>
    </div>
  </div>

  <!-- Popover Dialog Card -->
  <div id="tour-popover" class="fixed left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[360px] bg-white rounded-3xl p-4 shadow-2xl border-2 border-pink-300 pointer-events-auto transition-all duration-300 z-[10001] animate-fade-in-up">
    <!-- Popover header, title, content, actions -->
  </div>
</div>
```

### 3.2 Optimized rAF Tracking Loop Algorithm (`startTracking`)
```javascript
startTracking() {
  if (this.trackingFrame) {
    cancelAnimationFrame(this.trackingFrame);
    this.trackingFrame = null;
  }

  // State cache to prevent unnecessary writes
  this.lastGeometry = { left: -999, top: -999, width: -999, height: -999, vw: -999, vh: -999 };

  const loop = () => {
    if (!this.isActive) return;

    if (this.currentTargetEl && this.currentStepObj) {
      // 1. READ PHASE: Single call to getBoundingClientRect
      const rect = this.currentTargetEl.getBoundingClientRect();
      const vw = this.cachedViewportWidth || window.innerWidth;
      const vh = this.cachedViewportHeight || window.innerHeight;

      // Check visibility
      if (rect.width > 0 && rect.height > 0) {
        // Delta threshold check (0.1px sub-pixel tolerance)
        const dx = Math.abs(rect.left - this.lastGeometry.left);
        const dy = Math.abs(rect.top - this.lastGeometry.top);
        const dw = Math.abs(rect.width - this.lastGeometry.width);
        const dh = Math.abs(rect.height - this.lastGeometry.height);
        const dvw = Math.abs(vw - this.lastGeometry.vw);
        const dvh = Math.abs(vh - this.lastGeometry.vh);

        if (dx > 0.1 || dy > 0.1 || dw > 0.1 || dh > 0.1 || dvw > 0.1 || dvh > 0.1) {
          // 2. WRITE PHASE: Update SVG and transforms
          this.applyTrackingGeometry(rect, vw, vh, this.currentStepObj);
          
          this.lastGeometry.left = rect.left;
          this.lastGeometry.top = rect.top;
          this.lastGeometry.width = rect.width;
          this.lastGeometry.height = rect.height;
          this.lastGeometry.vw = vw;
          this.lastGeometry.vh = vh;
        }
      }
    }

    this.trackingFrame = requestAnimationFrame(loop);
  };

  this.trackingFrame = requestAnimationFrame(loop);
}
```

### 3.3 Zero-Thrashing Geometry Application (`applyTrackingGeometry`)
```javascript
applyTrackingGeometry(rect, vw, vh, step) {
  const pathEl = this.domOverlayPath || document.getElementById('tour-overlay-path');
  const glowEl = this.domSpotlightGlow || document.getElementById('tour-spotlight-glow');
  const pointer = this.domPointerContainer || document.getElementById('tour-pointer-container');
  const popover = this.domPopover || document.getElementById('tour-popover');
  if (!pathEl || !glowEl || !pointer || !popover) return;

  const pad = 6;
  const top = Math.max(0, rect.top - pad);
  const left = Math.max(0, rect.left - pad);
  const width = Math.min(vw - left, rect.width + pad * 2);
  const height = Math.min(vh - top, rect.height + pad * 2);
  const bottom = top + height;
  const radius = Math.min(14, width / 2, height / 2);

  // 1. Calculate Rounded-Corner SVG Path (Zero d="" wiping)
  const d = `M 0 0 h ${vw} v ${vh} h -${vw} Z ` +
            `M ${left + radius} ${top} ` +
            `h ${width - 2 * radius} ` +
            `a ${radius} ${radius} 0 0 1 ${radius} ${radius} ` +
            `v ${height - 2 * radius} ` +
            `a ${radius} ${radius} 0 0 1 -${radius} ${radius} ` +
            `h -${width - 2 * radius} ` +
            `a ${radius} ${radius} 0 0 1 -${radius} -${radius} ` +
            `v -${height - 2 * radius} ` +
            `a ${radius} ${radius} 0 0 1 ${radius} -${radius} Z`;
  pathEl.setAttribute('d', d);

  // 2. Synchronize SVG Glow Accent Outline
  glowEl.setAttribute('x', left);
  glowEl.setAttribute('y', top);
  glowEl.setAttribute('width', width);
  glowEl.setAttribute('height', height);
  glowEl.setAttribute('rx', radius);
  glowEl.setAttribute('ry', radius);

  // 3. Directional Pointer Calculation (Zero innerHTML rewriting)
  if (step.action !== 'info') {
    pointer.classList.remove('hidden');

    const targetCenterX = left + (width / 2);
    // Enforce 16px horizontal margin clamping for pointer badge
    const badgeHalfWidth = 65; // Measured badge width ~130px
    const clampedX = Math.max(badgeHalfWidth + 16, Math.min(vw - badgeHalfWidth - 16, targetCenterX));

    const isTargetInTopHalf = (rect.top + (rect.height / 2)) < (vh / 2);

    const tplTop = this.domPointerTplTop || document.getElementById('tour-pointer-tpl-top');
    const tplBottom = this.domPointerTplBottom || document.getElementById('tour-pointer-tpl-bottom');

    let pointerY = 0;
    if (isTargetInTopHalf) {
      // Pointer renders below target, pointing UP
      pointerY = bottom + 8;
      tplTop.classList.add('hidden');
      tplBottom.classList.remove('hidden');
    } else {
      // Pointer renders above target, pointing DOWN
      pointerY = Math.max(10, top - 68);
      tplTop.classList.remove('hidden');
      tplBottom.classList.add('hidden');
    }

    // Direct GPU Transform - Instant 0ms latency follow
    pointer.style.transform = `translate3d(${clampedX}px, ${pointerY}px, 0) translateX(-50%)`;
  } else {
    pointer.classList.add('hidden');
  }

  // 4. Popover Dynamic Viewport Placement
  const isTargetInTopHalf = (rect.top + (rect.height / 2)) < (vh / 2);
  if (isTargetInTopHalf) {
    popover.style.top = 'auto';
    popover.style.bottom = 'max(14px, env(safe-area-inset-bottom, 14px))';
  } else {
    popover.style.bottom = 'auto';
    popover.style.top = 'max(14px, env(safe-area-inset-top, 14px))';
  }
}
```

### 3.4 Passive & Throttled Event Listener System
```javascript
bindEventListeners() {
  // 1. Passive Viewport Scroll Listener
  this.onScrollHandler = () => {
    // Non-blocking rAF sync flag
    if (this.isActive && !this.trackingFrame) {
      this.startTracking();
    }
  };
  window.addEventListener('scroll', this.onScrollHandler, { passive: true });

  // 2. Passive Resize & Orientation Listeners
  this.onResizeHandler = () => {
    this.cachedViewportWidth = window.innerWidth;
    this.cachedViewportHeight = window.innerHeight;
    if (this.isActive && this.currentTargetEl && this.currentStepObj) {
      this.lastGeometry = { left: -999, top: -999, width: -999, height: -999, vw: -999, vh: -999 };
    }
  };
  window.addEventListener('resize', this.onResizeHandler, { passive: true });
  window.addEventListener('orientationchange', this.onResizeHandler, { passive: true });

  if (window.visualViewport) {
    this.onVisualViewportHandler = () => {
      this.cachedViewportWidth = window.visualViewport.width;
      this.cachedViewportHeight = window.visualViewport.height;
      this.lastGeometry = { left: -999, top: -999, width: -999, height: -999, vw: -999, vh: -999 };
    };
    window.visualViewport.addEventListener('resize', this.onVisualViewportHandler, { passive: true });
    window.visualViewport.addEventListener('scroll', this.onVisualViewportHandler, { passive: true });
  }

  // Initial Viewport Dimensions
  this.cachedViewportWidth = window.innerWidth;
  this.cachedViewportHeight = window.innerHeight;
}

unbindEventListeners() {
  if (this.onScrollHandler) {
    window.removeEventListener('scroll', this.onScrollHandler);
    this.onScrollHandler = null;
  }
  if (this.onResizeHandler) {
    window.removeEventListener('resize', this.onResizeHandler);
    window.removeEventListener('orientationchange', this.onResizeHandler);
    this.onResizeHandler = null;
  }
  if (window.visualViewport && this.onVisualViewportHandler) {
    window.visualViewport.removeEventListener('resize', this.onVisualViewportHandler);
    window.visualViewport.removeEventListener('scroll', this.onVisualViewportHandler);
    this.onVisualViewportHandler = null;
  }
}
```

---

# 4. Caveats

- **CSS Transitions during discrete step changes**: While continuous rAF tracking requires instant `0ms` positioning, step-to-step transitions can optionally utilize an eased 250ms rAF lerp if visual morphing is preferred over instantaneous coordinate snaps.
- **VisualViewport API Compatibility**: `window.visualViewport` is supported in all modern Chromium, WebKit (iOS 13+), and Firefox browsers; the fallback to `window.innerWidth`/`innerHeight` handles older webviews cleanly.
- **Synthetic Testing Consideration**: Synthetic test events (`dispatchEvent`) must not be rejected by `isTrusted` filters in production test runs.

---

# 5. Conclusion

1. Replacing continuous `pointer.innerHTML = ...` assignments with static pre-allocated DOM templates completely eradicates 60fps DOM thrashing, eliminating layout reflows and Garbage Collection pressure.
2. Replacing CSS transition properties on `top`/`left` with GPU-composited `transform: translate3d(...)` eliminates the 300ms tracking lag, achieving sub-pixel 0ms lock-step synchronization with targets.
3. Decoupling the tracking loop into single-read and batched-write phases guarantees a rock-solid 60fps/120fps frame rate across mobile and desktop devices.
4. Implementing passive `{ passive: true }` event listeners for `scroll`, `resize`, `orientationchange`, and `visualViewport` ensures immediate responsiveness to orientation flips, soft keyboard toggles, and responsive container scrolling without blocking main thread interactions.

---

# 6. Verification Method

### 6.1 Static Inspection
1. Inspect `js/onboardingTour.js`:
   - Verify `pointer.innerHTML` is eliminated from `highlightElement` and `startTracking`.
   - Verify `.tour-pointer-animate` does not have `transition: top 0.3s, left 0.3s`.
   - Verify `startTracking` runs continuously without `!this.isAutoPlaying` blocker.
   - Verify `window.addEventListener('scroll', ..., { passive: true })` and `resize` listeners are properly bound and unbound.

### 6.2 Browser Runtime & Performance Profiling
1. Start local development server:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1 -Port 8080
   ```
2. Open Chrome DevTools Performance Panel on `http://localhost:8080/index.html`.
3. Click `#onboarding-guide-btn` to start the tour.
4. Record performance trace during continuous scrolling on Step 2 (`#seat-card-1`) and Step 3 (`#first-quick-tag-btn`):
   - Confirm FPS counter stays locked at 60fps (or 120fps on ProMotion displays).
   - Confirm zero "Forced Reflow" or "Layout Thrashing" warnings in the Performance trace.
   - Confirm directional pointer and spotlight cutout remain pixel-aligned with target element with 0ms visual lag.

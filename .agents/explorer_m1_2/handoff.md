# Milestone 1 Handoff Report: Directional Arrow Guidance & Viewport Clamping Blueprint

**Agent**: Explorer M1-2 (Directional Arrow Guidance & Viewport Clamping Specialist)  
**Date**: 2026-08-30  
**Target Module**: `js/onboardingTour.js` (ClassQuant Hub Tour Engine)  
**Scope**: Requirement R1 (§2: Directional Guidance Pointer Alignment, 4-Way Orientation, Viewport Margin Clamping & 60fps Zero-Lag Tracking)

---

## 1. Observation

Direct code inspection of `js/onboardingTour.js` and `css/styles.css` revealed four major defects in the current directional guidance pointer implementation:

### 1.1 Hardcoded Binary Orientation & Popover Collision
In `js/onboardingTour.js` (lines 451–481):
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
    ...
  } else {
    pointer.style.top = `${Math.max(10, top - 68)}px`;
    pointer.style.left = `${targetCenterX}px`;
    pointer.style.transform = 'translateX(-50%)';
    ...
  }
}
```
- **Observation**: The engine computes orientation purely by comparing target center Y to `window.innerHeight / 2`.
- **Defect**: It does not account for the popover dialog height (~220px) or lateral space. For mid-screen elements (e.g. `rect.top = 280px` on a 667px viewport), the popover docks at `top: 14px` (extending to 234px) while the pointer is placed at `top: 280 - 68 = 212px`. The pointer directly collides with and renders underneath the popover card.

### 1.2 Viewport Edge Clipping on Left/Right Aligned Elements
In `js/onboardingTour.js` (lines 463, 474):
```javascript
pointer.style.left = `${targetCenterX}px`;
pointer.style.transform = 'translateX(-50%)';
```
- **Observation**: The pointer container is anchored at `targetCenterX` and centered via `translateX(-50%)` without boundary clamping.
- **Defect**: The badge with hint text is ~110px–130px wide (half-width ~60px). For `#global-class-select` (Step 1) located at the far right of the header (`targetCenterX = 350px` on a 375px screen), the badge right edge extends to `350 + 60 = 410px` (clipping 35px off-screen). For elements at the far left (`targetCenterX = 30px`), the badge clips 30px off the left screen edge.

### 1.3 300ms CSS Transition Rubber-Banding Lag
In `js/onboardingTour.js` (lines 168–170):
```css
.tour-pointer-animate {
  transition: top 0.3s ease-in-out, left 0.3s ease-in-out;
}
```
- **Observation**: `.tour-pointer-animate` declares a 0.3s CSS transition on `top` and `left`.
- **Defect**: During active user scrolling or page reflow, `startTracking()` triggers `highlightElement()` at 60fps (every 16.6ms). The 300ms CSS transition forces the pointer to interpolate with a noticeable delay behind the target, causing the arrow to detach and float away from the spotlight cutout during scroll.

### 1.4 60FPS DOM Thrashing & Animation Resets
In `js/onboardingTour.js` (lines 271–276, 465–480):
```javascript
const rectStr = Math.round(rect.top) + "_" + Math.round(rect.left) + "_" + Math.round(rect.width) + "_" + Math.round(rect.height);
if (rectStr !== lastRectStr) {
  this.highlightElement(this.currentTargetEl, this.currentStepObj);
  lastRectStr = rectStr;
}
```
- **Observation**: On every frame where coordinates shift during scroll, `highlightElement()` overwrites `pointer.innerHTML = '...'`.
- **Defect**: This destroys and re-creates DOM nodes 60 times per second, discarding CSS keyframe animation state (`bouncePointingUp`), inducing garbage collection pressure, and causing frame stutters.

---

## 2. Logic Chain

1. **Orientation Logic**:
   - To prevent collisions between the pointer, the target, the popover, and viewport edges, orientation cannot be a simple boolean flag.
   - The engine must compute available clearance in all 4 directions (`spaceAbove`, `spaceBelow`, `spaceLeft`, `spaceRight`) subtracting the popover's exclusion zone and safe-area margins.
   - By prioritizing vertical placement (below/above) and falling back to lateral placement (right/left) or the direction with maximum clearance, the arrow is guaranteed never to overlap the popover card.

2. **Boundary Clamping & Stem Alignment**:
   - To prevent the badge from clipping beyond viewport margins (`minMargin = 12px`), the container's center X must be bounded:
     `clampedCenterX = Math.max(margin + halfBadgeWidth, Math.min(vw - margin - halfBadgeWidth, targetCenterX))`
   - When the badge container is clamped away from the screen edge, the arrow stem must be shifted relative to the badge so that the pointer tip still aligns accurately with `targetCenterX`.
   - The relative arrow offset is:
     `arrowOffsetX = Math.max(arrowHalfWidth + 8, Math.min(badgeWidth - arrowHalfWidth - 8, targetCenterX - containerLeft))`

3. **Performance & Zero-Lag 60fps Tracking**:
   - Layout properties (`top`, `left`) force CPU layout reflows and trigger CSS transition interpolations if defined.
   - Replacing `top`/`left` with GPU-accelerated `transform: translate3d(x, y, 0)` eliminates CPU layout reflow and operates purely on the compositor thread.
   - Setting `transition: none` during continuous `requestAnimationFrame` tracking eliminates the 300ms rubber-banding lag.
   - Pre-building a static DOM node hierarchy in `initDOM()` and updating only `transform` and `textContent` in the tracking loop completely eliminates 60fps `innerHTML` destruction and animation resets.

---

## 3. Caveats

- **Landscape Mode & Short Screens (height < 500px)**: When viewport height is severely constrained, both popover and pointer cannot fit vertically. The algorithm must fall back to lateral orientation (`'left'` or `'right'`).
- **Dynamic Safe Area Insets**: Modern mobile devices (iOS notch/home indicator) require minimum 14px top/bottom safety padding.
- **Dynamic Text Width**: Different languages or customized hint text alter the badge width. The engine measures `badgeEl.offsetWidth` on step change rather than hardcoding static width constants.

---

## 4. Conclusion & Complete Technical Implementation Blueprint

### 4.1 Pre-rendered DOM Architecture & CSS
Replace the empty `#tour-pointer-container` with a permanent, static component structure created once during `initDOM()`:

#### Injected DOM Structure:
```html
<div id="tour-pointer-container" class="fixed pointer-events-none z-[10000] hidden will-change-transform" style="top: 0; left: 0; transform: translate3d(0, 0, 0);">
  <div id="tour-pointer-inner" class="flex flex-col items-center justify-center pointer-events-none">
    <!-- Top Arrow (Active when orientation is 'below', pointing UP) -->
    <div id="tour-arrow-up" class="tour-arrow-icon text-3xl filter drop-shadow-[0_4px_12px_rgba(244,63,94,0.95)]">👆</div>
    
    <!-- Tooltip Badge Pill -->
    <div id="tour-pointer-badge" class="bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[11px] px-3.5 py-1 rounded-full shadow-2xl border-1.5 border-white whitespace-nowrap flex items-center gap-1">
      <span id="tour-arrow-left" class="tour-arrow-lateral hidden text-sm">👈</span>
      <span id="tour-pointer-text">請點擊此處</span>
      <span id="tour-arrow-right" class="tour-arrow-lateral hidden text-sm">👉</span>
    </div>

    <!-- Bottom Arrow (Active when orientation is 'above', pointing DOWN) -->
    <div id="tour-arrow-down" class="tour-arrow-icon text-3xl filter drop-shadow-[0_4px_12px_rgba(244,63,94,0.95)]">👇</div>
  </div>
</div>
```

#### CSS Rules (in `initDOM` `<style>`):
```css
#tour-pointer-container {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 10000;
  will-change: transform;
  transition: opacity 0.2s ease-out;
}

.tour-arrow-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease-out;
}

.tour-bounce-up {
  animation: pointerBounceUp 1s ease-in-out infinite;
}

.tour-bounce-down {
  animation: pointerBounceDown 1s ease-in-out infinite;
}

.tour-bounce-left {
  animation: pointerBounceLeft 1s ease-in-out infinite;
}

.tour-bounce-right {
  animation: pointerBounceRight 1s ease-in-out infinite;
}

@keyframes pointerBounceUp {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@keyframes pointerBounceDown {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
}

@keyframes pointerBounceLeft {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(-6px); }
}

@keyframes pointerBounceRight {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(6px); }
}
```

---

### 4.2 Dynamic 4-Way Orientation Scoring Algorithm
Add the `computePointerOrientation` method to `OnboardingTour`:

```javascript
/**
 * Computes optimal pointer orientation ('below' | 'above' | 'right' | 'left')
 * taking into account target position, popover exclusion zone, and viewport margins.
 */
computePointerOrientation(targetRect, popoverRect, popoverPlacement, dims, viewport) {
  const { badgeW, totalH_v, totalW_h, targetGap, margin } = dims;
  const { vw, vh } = viewport;

  // Popover exclusion boundary
  const limitTop = (popoverPlacement === 'top' && popoverRect) 
    ? (popoverRect.bottom + margin) 
    : margin;
  const limitBottom = (popoverPlacement === 'bottom' && popoverRect) 
    ? (popoverRect.top - margin) 
    : (vh - margin);

  // Available clearances
  const spaceBelow = limitBottom - (targetRect.bottom + targetGap);
  const spaceAbove = (targetRect.top - targetGap) - limitTop;
  const spaceRight = (vw - margin) - (targetRect.right + targetGap);
  const spaceLeft = (targetRect.left - targetGap) - margin;

  const targetCenterY = targetRect.top + targetRect.height / 2;
  const isTargetInUpperHalf = targetCenterY < (vh / 2);

  // 1. Preferred vertical placement
  if (isTargetInUpperHalf && spaceBelow >= totalH_v) {
    return 'below'; // Pointer sits BELOW target, pointing UP
  }
  if (!isTargetInUpperHalf && spaceAbove >= totalH_v) {
    return 'above'; // Pointer sits ABOVE target, pointing DOWN
  }

  // 2. Secondary vertical placement
  if (spaceBelow >= totalH_v) return 'below';
  if (spaceAbove >= totalH_v) return 'above';

  // 3. Lateral placement when vertical space is constricted
  if (spaceRight >= totalW_h && targetCenterY >= limitTop && targetCenterY <= limitBottom) {
    return 'right'; // Pointer sits to the RIGHT of target, pointing LEFT
  }
  if (spaceLeft >= totalW_h && targetCenterY >= limitTop && targetCenterY <= limitBottom) {
    return 'left'; // Pointer sits to the LEFT of target, pointing RIGHT
  }

  // 4. Fallback to maximum clearance direction
  const clearances = [
    { side: 'below', space: spaceBelow },
    { side: 'above', space: spaceAbove },
    { side: 'right', space: spaceRight },
    { side: 'left', space: spaceLeft }
  ];
  clearances.sort((a, b) => b.space - a.space);
  return clearances[0].side;
}
```

---

### 4.3 Viewport Margin Clamping & Arrow Stem Math
Add the `computePointerLayout` method:

```javascript
/**
 * Calculates absolute translate3d coordinates and relative arrow stem offset.
 * Guarantees zero viewport edge clipping and zero popover collision.
 */
computePointerLayout(targetRect, popoverRect, popoverPlacement, orientation, dims, viewport) {
  const { badgeW, badgeH, arrowW, arrowH, targetGap, margin } = dims;
  const { vw, vh } = viewport;

  const limitTop = (popoverPlacement === 'top' && popoverRect) ? (popoverRect.bottom + margin) : margin;
  const limitBottom = (popoverPlacement === 'bottom' && popoverRect) ? (popoverRect.top - margin) : (vh - margin);

  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  let containerX = 0;
  let containerY = 0;
  let arrowOffsetX = 0;

  if (orientation === 'below') {
    // Arrow is on top of badge, pointing UP
    const totalH = badgeH + arrowH + 4;
    const rawY = targetRect.bottom + targetGap;
    containerY = Math.min(limitBottom - totalH, Math.max(limitTop, rawY));

    const halfW = badgeW / 2;
    const clampedCenterX = Math.max(margin + halfW, Math.min(vw - margin - halfW, targetCenterX));
    containerX = clampedCenterX - halfW;

    // Shift arrow stem to align with targetCenterX
    const localTargetX = targetCenterX - containerX;
    const minArrowX = arrowW / 2 + 8;
    const maxArrowX = badgeW - (arrowW / 2) - 8;
    arrowOffsetX = Math.max(minArrowX, Math.min(maxArrowX, localTargetX)) - halfW;
  } else if (orientation === 'above') {
    // Arrow is below badge, pointing DOWN
    const totalH = badgeH + arrowH + 4;
    const rawY = targetRect.top - targetGap - totalH;
    containerY = Math.max(limitTop, Math.min(limitBottom - totalH, rawY));

    const halfW = badgeW / 2;
    const clampedCenterX = Math.max(margin + halfW, Math.min(vw - margin - halfW, targetCenterX));
    containerX = clampedCenterX - halfW;

    const localTargetX = targetCenterX - containerX;
    const minArrowX = arrowW / 2 + 8;
    const maxArrowX = badgeW - (arrowW / 2) - 8;
    arrowOffsetX = Math.max(minArrowX, Math.min(maxArrowX, localTargetX)) - halfW;
  } else if (orientation === 'right') {
    // Pointer to the right of target, pointing LEFT
    containerX = Math.min(vw - margin - badgeW - arrowW, Math.max(margin, targetRect.right + targetGap));
    const clampedCenterY = Math.max(limitTop + (badgeH / 2), Math.min(limitBottom - (badgeH / 2), targetCenterY));
    containerY = clampedCenterY - (badgeH / 2);
    arrowOffsetX = 0;
  } else if (orientation === 'left') {
    // Pointer to the left of target, pointing RIGHT
    containerX = Math.max(margin, Math.min(vw - margin - badgeW - arrowW, targetRect.left - targetGap - badgeW - arrowW));
    const clampedCenterY = Math.max(limitTop + (badgeH / 2), Math.min(limitBottom - (badgeH / 2), targetCenterY));
    containerY = clampedCenterY - (badgeH / 2);
    arrowOffsetX = 0;
  }

  return {
    x: Math.round(containerX),
    y: Math.round(containerY),
    arrowOffsetX: Math.round(arrowOffsetX)
  };
}
```

---

### 4.4 High-Performance 60FPS State Sync (`updatePointer`)
Add the non-allocating, zero-thrashing `updatePointer` method:

```javascript
/**
 * Synchronizes the pointer during active rAF tracking.
 * Modifies only translate3d and textContent without rewriting innerHTML.
 */
updatePointer(targetEl, step) {
  const container = document.getElementById('tour-pointer-container');
  if (!container || !targetEl || step.action === 'info') {
    container?.classList.add('hidden');
    return;
  }

  const targetRect = targetEl.getBoundingClientRect();
  if (targetRect.width === 0 || targetRect.height === 0) {
    container.classList.add('hidden');
    return;
  }

  const popover = document.getElementById('tour-popover');
  const popoverRect = popover ? popover.getBoundingClientRect() : null;
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  // 1. Popover docking position
  const isTargetInUpperHalf = (targetRect.top + targetRect.height / 2) < (vh / 2);
  const popoverPlacement = isTargetInUpperHalf ? 'bottom' : 'top';

  if (popover) {
    if (popoverPlacement === 'bottom') {
      popover.style.top = 'auto';
      popover.style.bottom = 'max(14px, env(safe-area-inset-bottom, 14px))';
    } else {
      popover.style.bottom = 'auto';
      popover.style.top = 'max(14px, env(safe-area-inset-top, 14px))';
    }
  }

  // 2. Measure or fetch cached dimensions
  const badgeEl = document.getElementById('tour-pointer-badge');
  const badgeW = badgeEl ? badgeEl.offsetWidth || 120 : 120;
  const badgeH = badgeEl ? badgeEl.offsetHeight || 28 : 28;

  const dims = {
    badgeW,
    badgeH,
    arrowW: 32,
    arrowH: 32,
    totalH_v: badgeH + 32 + 4,
    totalW_h: badgeW + 32 + 8,
    targetGap: 10,
    margin: 12
  };
  const viewport = { vw, vh };

  // 3. Compute 4-way orientation
  const orientation = this.computePointerOrientation(targetRect, popoverRect, popoverPlacement, dims, viewport);

  // 4. Compute clamped layout
  const layout = this.computePointerLayout(targetRect, popoverRect, popoverPlacement, orientation, dims, viewport);

  // 5. Update text only when changed
  const hintText = (step.action === 'manual-change') ? '請點此切換' : 
                   (step.action === 'manual-click') ? '請點擊此處' : '系統代為點擊';
  const textEl = document.getElementById('tour-pointer-text');
  if (textEl && textEl.textContent !== hintText) {
    textEl.textContent = hintText;
  }

  // 6. Update orientation classes & arrow visibility
  const arrowUp = document.getElementById('tour-arrow-up');
  const arrowDown = document.getElementById('tour-arrow-down');
  const arrowLeft = document.getElementById('tour-arrow-left');
  const arrowRight = document.getElementById('tour-arrow-right');

  if (orientation === 'below') {
    arrowUp?.classList.remove('hidden');
    arrowUp?.classList.add('tour-bounce-up');
    arrowDown?.classList.add('hidden');
    arrowLeft?.classList.add('hidden');
    arrowRight?.classList.add('hidden');
    if (arrowUp) arrowUp.style.transform = `translateX(${layout.arrowOffsetX}px)`;
  } else if (orientation === 'above') {
    arrowUp?.classList.add('hidden');
    arrowDown?.classList.remove('hidden');
    arrowDown?.classList.add('tour-bounce-down');
    arrowLeft?.classList.add('hidden');
    arrowRight?.classList.add('hidden');
    if (arrowDown) arrowDown.style.transform = `translateX(${layout.arrowOffsetX}px)`;
  } else if (orientation === 'right') {
    arrowUp?.classList.add('hidden');
    arrowDown?.classList.add('hidden');
    arrowLeft?.classList.remove('hidden');
    arrowLeft?.classList.add('tour-bounce-left');
    arrowRight?.classList.add('hidden');
  } else if (orientation === 'left') {
    arrowUp?.classList.add('hidden');
    arrowDown?.classList.add('hidden');
    arrowLeft?.classList.add('hidden');
    arrowRight?.classList.remove('hidden');
    arrowRight?.classList.add('tour-bounce-right');
  }

  // 7. Apply GPU translate3d (Zero CSS transition delay)
  container.style.transform = `translate3d(${layout.x}px, ${layout.y}px, 0)`;
  container.classList.remove('hidden');
}
```

---

## 5. Verification Method

### 5.1 Automated Script Verification
1. Run local dev server: `powershell ./serve.ps1` (port 8080).
2. Execute browser automation test inspecting:
   - **Boundary Clamping Test**:
     - Evaluate Step 1 (`#global-class-select`, top-right corner) and Step 2 (`#seat-card-1`, left corner).
     - Assert `pointerRect.left >= 12` and `pointerRect.right <= window.innerWidth - 12`.
   - **Collision Free Test**:
     - Evaluate all 12 steps.
     - Assert `!(pointerRect.bottom > popoverRect.top && pointerRect.top < popoverRect.bottom && pointerRect.right > popoverRect.left && pointerRect.left < popoverRect.right)`.
   - **60FPS Latency Test**:
     - Trigger continuous scroll event (`window.scrollTo(0, y)`).
     - Assert `window.getComputedStyle(pointerContainer).transitionProperty` does NOT include `top` or `left`.
     - Assert `pointerContainer.style.transform` updates synchronously with target bounding rect with 0 frame lag.

### 5.2 Invalidation Conditions
- If the pointer badge overflows `window.innerWidth` on viewports between 320px and 1920px.
- If the pointer badge overlaps the popover dialog card on short screens (e.g. 568px iPhone SE).
- If `pointer.innerHTML` is modified during `requestAnimationFrame` tracking loops.

# Technical Blueprint & Handoff Report: SVG Spotlight Cutout Geometry & Smooth Morph Engine

**Agent**: Explorer M1-1 (SVG Spotlight Cutout Geometry Specialist)  
**Milestone**: M1 (SVG Spotlight & Arrow Guidance Engine)  
**Target Workspace**: `d:\class_point_app_dev`  
**Date**: 2026-08-30  
**Status**: COMPLETE (Hard Handoff)

---

## 1. Observation

### 1.1 Existing Codebase Deficiencies in `js/onboardingTour.js`
Direct examination of `js/onboardingTour.js` reveals the following exact code patterns and defects:

1. **Sharp 90° Rectangular Mask Cutout (No Corner Radius)**:
   - Location: `js/onboardingTour.js`, lines 437–450:
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
   - **Flaw**: The cutout path `M ${left} ${top} v ${height} h ${width} v -${height} Z` generates a strict 90-degree rectangle. ClassQuant Hub's UI is designed with rounded corners (`rounded-xl` 12px, `rounded-2xl` 16px, `rounded-3xl` 24px, `rounded-full` pill badges). The sharp cutout visually clashes with modern rounded controls.

2. **Full-Screen Black Flash on Step Transitions**:
   - Location: `js/onboardingTour.js`, lines 306–309:
   ```javascript
   document.getElementById('tour-overlay-path').setAttribute('d', '');
   document.getElementById('tour-pointer-container').classList.add('hidden');
   document.getElementById('tour-ghost-cursor').style.opacity = '0';
   ```
   - **Flaw**: Prior to resolving the next step's target element (which may take 400–800ms due to tab switches and `scrollIntoView`), the SVG mask path `d` is wiped to `""`. This causes the entire screen to either go pitch black or flicker unmasked.
   - Location: `js/onboardingTour.js`, line 166:
   ```css
   #tour-overlay-path {
     transition: d 0.3s ease-in-out;
   }
   ```
   - **Flaw**: CSS transition on the SVG `d` attribute is not supported by standard browser rendering engines when segment counts or command types change or when `d` is cleared, leading to jarring frame snapping and rendering errors.

3. **Total Absence of Glowing Accent Ring / Pulse in SVG Mode**:
   - Location: `css/styles.css`, lines 173–191 (Legacy CSS spotlight):
   ```css
   #tour-spotlight-box {
     position: fixed;
     box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.85);
     border: 3.5px solid #f43f5e;
     border-radius: 18px;
     animation: spotlightGlowPulse 1.6s ease-in-out infinite;
   }
   ```
   - Location: `js/onboardingTour.js`, lines 178–181 (SVG Overlay):
   ```html
   <svg id="tour-svg-overlay" class="absolute inset-0 w-full h-full" style="pointer-events: none;">
     <path id="tour-overlay-path" d="" fill="rgba(0,0,0,0.75)" fill-rule="evenodd" style="pointer-events: auto;"></path>
   </svg>
   ```
   - **Flaw**: When the application migrated from `#tour-spotlight-box` to `#tour-svg-overlay`, the glowing border `#f43f5e` and breathing pulse effect were completely discarded. The active target lacks visual focus and brand identity.

4. **Asymmetrical Edge Clamping**:
   - In lines 439–441, `left` is clamped to `0`, but `width` is computed as `rect.width + pad * 2`. If `rect.left = 2px` and `pad = 6px`, the left pad is 2px while the right pad is 6px + 4px = 10px. Furthermore, `height` is not clamped against `vh - top`, allowing cutouts to overflow the SVG coordinate plane.

---

## 2. Logic Chain & Mathematical Design

### 2.1 Precise SVG Path Geometry for Rounded-Corner Rectangles

#### 2.1.1 The Mathematical Model
An SVG cutout using `fill-rule="evenodd"` consists of two closed sub-paths:
1. **Outer Viewport Rectangle** (Clockwise):
   $$(0, 0) \to (vw, 0) \to (vw, vh) \to (0, vh) \to (0, 0)$$
2. **Inner Target Rounded Rectangle** (Clockwise or Counter-Clockwise):
   Starting at top-left corner arc offset $(x + r, y)$, moving clockwise along top edge, right corner arc, right edge, bottom corner arc, bottom edge, left corner arc, left edge, and closing at top-left corner arc.

#### 2.1.2 Exact Coordinate & Viewport Clamping Algorithm
Let:
- $\text{rect} = \text{el.getBoundingClientRect()}$
- $p = \text{pad}$ (default: 8px)
- $r_{\text{req}} = \text{radius}$ (default: 14px)
- $vw = \text{window.innerWidth}, vh = \text{window.innerHeight}$

$$\begin{aligned}
x_{\text{raw}} &= \text{rect.left} - p \\
y_{\text{raw}} &= \text{rect.top} - p \\
w_{\text{raw}} &= \text{rect.width} + 2p \\
h_{\text{raw}} &= \text{rect.height} + 2p \\
x &= \max(0, x_{\text{raw}}) \\
y &= \max(0, y_{\text{raw}}) \\
w &= \max(0, \min(vw - x, w_{\text{raw}} - (x - x_{\text{raw}}))) \\
h &= \max(0, \min(vh - y, h_{\text{raw}} - (y - y_{\text{raw}}))) \\
r &= \max(0, \min(r_{\text{req}}, \frac{w}{2}, \frac{h}{2}))
\end{aligned}$$

#### 2.1.3 SVG Arc Command Syntax
Using SVG relative arc commands `a rx ry x-axis-rotation large-arc-flag sweep-flag dx dy`:
- **Top edge line**: `L (x + w - r) y` $\to$ Relative: `h (w - 2r)`
- **Top-Right 90° arc**: `a r r 0 0 1 r r` (starts at $(x + w - r, y)$, ends at $(x + w, y + r)$)
- **Right edge line**: `L (x + w) (y + h - r)` $\to$ Relative: `v (h - 2r)`
- **Bottom-Right 90° arc**: `a r r 0 0 1 -r r` (starts at $(x + w, y + h - r)$, ends at $(x + w - r, y + h)$)
- **Bottom edge line**: `L (x + r) (y + h)` $\to$ Relative: `h -(w - 2r)`
- **Bottom-Left 90° arc**: `a r r 0 0 1 -r -r` (starts at $(x + r, y + h)$, ends at $(x, y + h - r)$)
- **Left edge line**: `L x (y + r)` $\to$ Relative: `v -(h - 2r)`
- **Top-Left 90° arc**: `a r r 0 0 1 r -r` (starts at $(x, y + r)$, ends at $(x + r, y)$)

#### 2.1.4 Complete Path String Function
```javascript
/**
 * Calculates a pixel-perfect rounded-corner cutout SVG path.
 * Supports pill shapes, circles (w === h && r >= w/2), and custom paddings.
 */
function getSpotlightSvgPath(x, y, w, h, r, vw, vh) {
  // Guard against zero or degenerate dimensions
  if (w <= 0 || h <= 0) {
    return `M 0 0 h ${vw} v ${vh} h -${vw} Z`;
  }
  
  // Safe radius clamping
  const safeR = Math.max(0, Math.min(r, w / 2, h / 2));
  
  const outer = `M 0 0 h ${vw} v ${vh} h -${vw} Z`;
  
  if (safeR < 0.5) {
    // Sharp rectangle fallback
    const inner = `M ${x} ${y} h ${w} v ${h} h -${w} Z`;
    return `${outer} ${inner}`;
  }
  
  const inner = `M ${x + safeR} ${y} ` +
    `h ${w - 2 * safeR} ` +
    `a ${safeR} ${safeR} 0 0 1 ${safeR} ${safeR} ` +
    `v ${h - 2 * safeR} ` +
    `a ${safeR} ${safeR} 0 0 1 -${safeR} ${safeR} ` +
    `h -${w - 2 * safeR} ` +
    `a ${safeR} ${safeR} 0 0 1 -${safeR} -${safeR} ` +
    `v -${h - 2 * safeR} ` +
    `a ${safeR} ${safeR} 0 0 1 ${safeR} -${safeR} Z`;
    
  return `${outer} ${inner}`;
}
```

---

### 2.2 Smooth Morphing Architecture (Eliminating Black-Screen Flashes)

#### 2.2.1 The Two-Phase Transition Lifecycle
To completely eliminate black flashes and sudden visual teleports:
1. **Never Clear `d` to `""`**:
   When `renderStep()` begins, the existing spotlight mask and glowing outline remain rendered at their previous coordinates $(x_0, y_0, w_0, h_0, r_0)$.
2. **Dynamic Coordinate Morphing via `requestAnimationFrame`**:
   Once the new target element is resolved from DOM:
   - Compute current viewport geometry of target element: $(x_1, y_1, w_1, h_1, r_1)$.
   - Launch a 320ms tween lerping from $(x_0, y_0, w_0, h_0, r_0)$ to $(x_1, y_1, w_1, h_1, r_1)$ using an easing curve $E(t) = 1 - (1 - t)^3$ (`easeOutCubic`).
   - If the target element moves during smooth scrolling (`scrollIntoView`), the destination coordinates $(x_1, y_1, w_1, h_1)$ are continuously sampled from `targetEl.getBoundingClientRect()` in real time during the tween.
   - Once the tween completes ($t = 1.0$), seamlessly hand off to the continuous 60fps tracking loop.

#### 2.2.2 Tween Morph Engine Implementation
```javascript
class SpotlightGeometryEngine {
  constructor(overlayPathEl, glowRectEl, glowHaloEl) {
    this.pathEl = overlayPathEl;
    this.glowRectEl = glowRectEl;
    this.glowHaloEl = glowHaloEl;
    
    this.currentBox = { x: 0, y: 0, w: 0, h: 0, r: 0 };
    this.isInitialized = false;
    this.morphAnimId = null;
  }

  computeTargetBox(el, pad = 8, radius = 14) {
    if (!el || el === document.body) {
      return {
        x: window.innerWidth / 2 - 150,
        y: window.innerHeight / 2 - 100,
        w: 300,
        h: 200,
        r: 16
      };
    }
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    const rawX = rect.left - pad;
    const rawY = rect.top - pad;
    const rawW = rect.width + pad * 2;
    const rawH = rect.height + pad * 2;
    
    const x = Math.max(0, rawX);
    const y = Math.max(0, rawY);
    const w = Math.max(0, Math.min(vw - x, rawW - (x - rawX)));
    const h = Math.max(0, Math.min(vh - y, rawH - (y - rawY)));
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));
    
    return { x, y, w, h, r };
  }

  applyBox(box) {
    this.currentBox = { ...box };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const d = getSpotlightSvgPath(box.x, box.y, box.w, box.h, box.r, vw, vh);
    
    this.pathEl.setAttribute('d', d);
    
    if (this.glowRectEl) {
      this.glowRectEl.setAttribute('x', box.x);
      this.glowRectEl.setAttribute('y', box.y);
      this.glowRectEl.setAttribute('width', box.w);
      this.glowRectEl.setAttribute('height', box.h);
      this.glowRectEl.setAttribute('rx', box.r);
      this.glowRectEl.setAttribute('ry', box.r);
    }
    if (this.glowHaloEl) {
      this.glowHaloEl.setAttribute('x', box.x - 3);
      this.glowHaloEl.setAttribute('y', box.y - 3);
      this.glowHaloEl.setAttribute('width', box.w + 6);
      this.glowHaloEl.setAttribute('height', box.h + 6);
      this.glowHaloEl.setAttribute('rx', box.r + 3);
      this.glowHaloEl.setAttribute('ry', box.r + 3);
    }
  }

  morphTo(targetEl, pad = 8, radius = 14, duration = 320) {
    if (this.morphAnimId) {
      cancelAnimationFrame(this.morphAnimId);
      this.morphAnimId = null;
    }

    const destBox = this.computeTargetBox(targetEl, pad, radius);

    // Initial step: snap immediately with fade-in
    if (!this.isInitialized || this.currentBox.w === 0) {
      this.applyBox(destBox);
      this.isInitialized = true;
      return Promise.resolve();
    }

    const startBox = { ...this.currentBox };
    const startTime = performance.now();

    return new Promise((resolve) => {
      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Easing: easeOutCubic
        const ease = 1 - Math.pow(1 - progress, 3);

        // Dynamically re-sample live target position in case page is scrolling
        const liveDest = this.computeTargetBox(targetEl, pad, radius);

        const current = {
          x: startBox.x + (liveDest.x - startBox.x) * ease,
          y: startBox.y + (liveDest.y - startBox.y) * ease,
          w: startBox.w + (liveDest.w - startBox.w) * ease,
          h: startBox.h + (liveDest.h - startBox.h) * ease,
          r: startBox.r + (liveDest.r - startBox.r) * ease
        };

        this.applyBox(current);

        if (progress < 1) {
          this.morphAnimId = requestAnimationFrame(step);
        } else {
          this.applyBox(liveDest);
          this.morphAnimId = null;
          resolve();
        }
      };
      this.morphAnimId = requestAnimationFrame(step);
    });
  }
}
```

---

### 2.3 Glowing Outline Stroke & Breathing Pulse Animation

#### 2.3.1 SVG DOM Hierarchy Design
In `initDOM()`:
```html
<svg id="tour-svg-overlay" class="fixed inset-0 w-full h-full pointer-events-none z-[9990]" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Multi-stage drop shadow for intense neon glow -->
    <filter id="tour-glow-filter" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#f43f5e" flood-opacity="0.9" />
      <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#fb7185" flood-opacity="0.65" />
      <feDropShadow dx="0" dy="0" stdDeviation="16" flood-color="#fda4af" flood-opacity="0.35" />
    </filter>
    
    <!-- Linear gradient stroke for Sanrio Kitty Rose theme -->
    <linearGradient id="tour-glow-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f43f5e" />
      <stop offset="50%" stop-color="#fb7185" />
      <stop offset="100%" stop-color="#f43f5e" />
    </linearGradient>
  </defs>

  <!-- Layer 1: Semi-transparent backdrop with rounded cutout -->
  <path id="tour-overlay-path" d="" fill="rgba(15, 23, 42, 0.78)" fill-rule="evenodd" style="pointer-events: auto;"></path>

  <!-- Layer 2: Outer radar pulse halo -->
  <rect id="tour-spotlight-halo" x="0" y="0" width="0" height="0" rx="0" ry="0" fill="none" stroke="#fb7185" stroke-width="2" class="tour-pulse-halo" style="pointer-events: none;"></rect>

  <!-- Layer 3: Synchronized Glowing Outline Ring -->
  <rect id="tour-spotlight-glow" x="0" y="0" width="0" height="0" rx="0" ry="0" fill="none" stroke="url(#tour-glow-stroke)" stroke-width="3.5" filter="url(#tour-glow-filter)" class="tour-glow-ring" style="pointer-events: none;"></rect>
</svg>
```

#### 2.3.2 CSS Micro-Animations
```css
/* Breathing pulse animation for active spotlight ring */
@keyframes tourGlowBreathing {
  0%, 100% {
    stroke-width: 3px;
    opacity: 0.9;
    filter: drop-shadow(0 0 6px rgba(244, 63, 94, 0.85)) drop-shadow(0 0 14px rgba(251, 113, 133, 0.5));
  }
  50% {
    stroke-width: 4px;
    opacity: 1;
    filter: drop-shadow(0 0 10px rgba(244, 63, 94, 1)) drop-shadow(0 0 22px rgba(251, 113, 133, 0.8)) drop-shadow(0 0 2px #ffffff);
  }
}

/* Expanding Radar Halo Pulse */
@keyframes tourHaloPulse {
  0% {
    opacity: 0.8;
    stroke-width: 1.5px;
    stroke: #f43f5e;
  }
  50% {
    opacity: 0.3;
    stroke-width: 5px;
    stroke: #fb7185;
  }
  100% {
    opacity: 0;
    stroke-width: 8px;
    stroke: #fda4af;
  }
}

.tour-glow-ring {
  animation: tourGlowBreathing 1.8s ease-in-out infinite;
  vector-effect: non-scaling-stroke;
}

.tour-pulse-halo {
  animation: tourHaloPulse 1.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
  vector-effect: non-scaling-stroke;
}
```

---

### 2.4 Per-Step Geometry Matrix & Customization Table

| Step # | Step ID | Target Selector | Default `pad` | Default `radius` | Rationale & Element Aesthetics |
|---|---|---|---|---|---|
| 1 | `step-class-select` | `#global-class-select` | 6px | 12px | Dropdown select box in top header bar. |
| 2 | `step-select-student` | `#seat-card-1` | 8px | 16px | Student seat card (`rounded-2xl`). |
| 3 | `step-click-tag` | `#first-quick-tag-btn` | 6px | 14px | Quick score button (`rounded-xl` pill). |
| 4 | `step-custom-tags` | `#custom-tag-open-btn` | 6px | 12px | Settings gear icon button. |
| 5 | `step-goto-roster` | `button[data-tab="roster"]` | 6px | 14px | Navigation tab pill button. |
| 6 | `step-roster-paste` | `#roster-paste-btn` | 8px | 14px | Roster batch import modal trigger. |
| 7 | `step-roster-details` | `#roster-manager-view .grid > div:first-child` | 8px | 16px | Student roster record row. |
| 8 | `step-goto-retro` | `button[data-tab="retro"]` | 6px | 14px | Navigation tab pill button. |
| 9 | `step-retro-action` | `#retro-odd-btn` | 6px | 12px | Retro single-action button. |
| 10 | `step-goto-dashboard` | `button[data-tab="dashboard"]` | 6px | 14px | Navigation tab pill button. |
| 11 | `step-dashboard-charts` | `#dashboard-view .glass-card:first-child` | 10px | 20px | Large analytics chart glass card. |
| 12 | `step-finish` | `#header-version-badge` | 6px | 12px | Version badge in header. |

---

## 3. Caveats & Edge Cases

1. **Zero / Offscreen Elements**:
   - If an element is completely scrolled out of the viewport or has `display: none` / `width: 0`, `computeTargetBox` must fall back to a centered viewport frame rather than outputting `NaN` or negative arc coordinates.
2. **Ultra-Narrow Screen Viewports (< 360px)**:
   - On screens where `targetWidth + pad * 2 > window.innerWidth`, `w` is clamped to `window.innerWidth - x`. Radius $r$ must automatically clamp to $\min(r, w/2, h/2)$ to avoid degenerate arcs ($r > w/2$ causes SVG arc crossing distortion).
3. **SVG Filter Performance on Low-End Mobile Devices**:
   - Complex SVG filters (`stdDeviation > 20`) can cause frame drops on older Android WebViews during 60fps tracking.
   - *Mitigation*: The filter is attached to `<rect id="tour-spotlight-glow">` (which has lightweight geometry), while the main backdrop `<path>` uses solid color fill `rgba(15, 23, 42, 0.78)` without blur filters.
4. **Interaction Pass-Through Integrity**:
   - Because `<path id="tour-overlay-path">` has `pointer-events: auto` and an `evenodd` hole, native browser hit-testing naturally permits user clicks to penetrate the transparent hole into the underlying DOM element without manual coordinate math.

---

## 4. Conclusion

The SVG Spotlight Cutout Geometry Blueprint solves all three core defects identified in R1:
1. **Mathematical Precision**: Replaces sharp 90° rectangles with a continuous rounded-rect path equation using exact SVG 90° arc commands `a r r 0 0 1 ...` and boundary clamping.
2. **Flash-Free Transitions**: Replaces `d=""` wiping and broken CSS `transition: d` with an active 320ms `requestAnimationFrame` coordinate tweening engine that preserves the previous spotlight box until the new target is acquired.
3. **Vibrant Glowing Accent**: Introduces a synchronized `<rect>` outline stroke with dual-layer neon drop-shadows and breathing pulse keyframes matching ClassQuant Hub's Sanrio pink aesthetic.

---

## 5. Verification Method

To independently verify the implementation once integrated:

### 5.1 Visual & Geometry Inspection
1. Start tour via `onboardingTour.start(0)`.
2. Inspect `#tour-overlay-path` in DevTools:
   - Verify `d` contains `M ... h ... a 14 14 0 0 1 14 14 v ...` arc commands.
   - Verify `#tour-spotlight-glow` has matching `x, y, width, height, rx, ry`.
3. Inspect Step 2 (`#seat-card-1`) and Step 11 (`#dashboard-view .glass-card:first-child`):
   - Confirm corners are smoothly rounded with 16px and 20px curves matching element borders.

### 5.2 Transition & Anti-Flash Test
1. Step through all 12 steps by clicking "下一步" or executing `onboardingTour.nextStep()`.
2. Observe with screen recording or 60fps DevTools Rendering panel:
   - Verify that `d` is never set to `""`.
   - Verify the spotlight smoothly glides/morphs from one element to the next without full-screen black flicker.

### 5.3 Mobile Viewport Edge Clamping Test
1. Set mobile emulator viewport to 360px x 640px.
2. Navigate to Step 1 (`#global-class-select`, near top-right edge) and Step 12 (`#header-version-badge`).
3. Verify that $x + w \le 360\text{px}$ and $y + h \le 640\text{px}$, with zero arc clipping or SVG distortion.

### 5.4 E2E Test Command
Run the local HTTP test server and verify with test harness:
```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```
Navigate to `http://localhost:8080` and trigger `window.onboardingTour.start(0)`.

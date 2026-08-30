# Challenger 2 Handoff Report: Spotlight Geometry & Caching Resilience

- **Agent**: Challenger 2 (Spotlight Geometry & Caching Challenger)
- **Role**: critic, specialist
- **Date**: 2026-08-30
- **Verdict**: **`APPROVE`**

---

## 1. Observation

Direct empirical observations from codebase inspection, primary test execution, and custom adversarial stress harnesses:

1. **E2E Test Suite Execution**:
   Command: `powershell -NoProfile -ExecutionPolicy Bypass -File tests/run_e2e_tests.ps1`
   - Total Tests Executed: **180**
   - Tier 1 (Feature Coverage): **75 / 75 Passed**
   - Tier 2 (Boundary & Corner Cases): **75 / 75 Passed**
   - Tier 3 (Cross-Feature Combinations): **20 / 20 Passed**
   - Tier 4 (Real-World Scenarios): **10 / 10 Passed**
   - Grand Total: **180 / 180 Passed (100%)**, Exit Code: `0`.

2. **SVG Spotlight Geometry Implementation (`js/onboardingTour.js:472-538`)**:
   - `getSpotlightSvgPath(x, y, w, h, r, vw, vh)` computes relative arc commands `a ${safeR} ${safeR} 0 0 1 ...` with `safeR = Math.max(0, Math.min(r, w/2, h/2))`.
   - When target elements are non-visible or degenerate (`w <= 0 || h <= 0`), it immediately returns full dark backdrop `M 0 0 h ${vw} v ${vh} h -${vw} Z`, completely preventing inverted arcs or negative coordinates.
   - `computeTargetBox(el, step)` calculates `x = Math.max(0, rawX)` and `w = Math.max(0, Math.min(vw - x, rawW - (x - rawX)))`, ensuring that target bounding boxes are strictly clamped within the viewport `[0, vw] x [0, vh]`.

3. **Directional Arrow Guidance & Pointer Clamping (`js/onboardingTour.js:636-755`)**:
   - `computePointerOrientation(...)` analyzes 4 potential directions (`below`, `above`, `right`, `left`) prioritizing vertical positioning and falling back to lateral positions or maximum available clearance when vertical space is constricted.
   - `computePointerLayout(...)` clamps `containerX` to `[margin, vw - margin - badgeW]` and `containerY` to `[limitTop, limitBottom - totalH]`, where `limitTop` / `limitBottom` enforce popover card exclusion zones.
   - Relative arrow stem offset `arrowOffsetX` is dynamically constrained to `[minArrowX - halfW, maxArrowX - halfW]`, ensuring the arrow remains visually centered over the target while staying within the badge boundaries.

4. **Service Worker Offline Cache & Query Normalization (`service-worker.js:6-33, 69-133`)**:
   - Manifest `ASSETS_TO_CACHE` explicitly lists 25 assets. File verification confirmed that all 25 referenced files exist physically on disk.
   - Both Strategy 1 (Network-First app code) and Strategy 2 (Cache-First static media) incorporate `caches.match(event.request, { ignoreSearch: true })`.
   - Navigation fallback at `service-worker.js:105` catches un-cached HTML navigation routes offline and serves cached `index.html`.

5. **Empirical Stress Test Harness (`tests/challenger2_stress.ps1`) Execution**:
   Command: `powershell -NoProfile -ExecutionPolicy Bypass -File tests/challenger2_stress.ps1`
   - **Suite 1 (Spotlight Geometry)**:
     - 13 Viewport dimensions tested (320x480, 375x667, 390x844, 412x915, 844x390, 480x320, 768x1024, 1024x768, 800x600, 1920x1080, 2560x1440, 3840x2160, 5120x1440).
     - Extreme boundary coordinates tested: (0,0), bottom-right overflow, negative offscreen, scrollY = -10,000px, null body fallback.
     - **5,000 Monte Carlo randomized geometry iterations**: 0 NaNs, 0 invalid path strings, 100% clamping compliance.
   - **Suite 2 (Pointer Clamping)**:
     - 6 extreme target positions tested: top-left (0,0), top-right, bottom-left, bottom-right, center, full-width spanning element.
     - **5,000 Monte Carlo randomized pointer iterations**: 0 viewport boundary overflows, 0 popover collisions, 100% boundary compliance.
   - **Suite 3 (Service Worker Offline Cache Resilience)**:
     - 25/25 disk assets verified.
     - 175 deterministic query parameter variations tested across all cached assets (`?v=1.6.0`, `?t=99999`, `?param=test&query=班級`, empty query, hash fragments).
     - Navigation route fallback verified.
     - **1,000 Monte Carlo randomized query stress iterations**: **100% Cache Hit Rate (0 misses)**.
   - Total Invariant Assertions: **66 / 66 Passed (100%)**, Exit Code: `0`.

---

## 2. Logic Chain

1. **Zero Clipping & Zero NaN Coordinates**:
   - *Observation*: In `Compute-TargetBox`, `w` is bounded by `Math.min(vw - x, rawW - (x - rawX))` and `h` is bounded by `Math.min(vh - y, rawH - (y - rawY))`. `Get-SpotlightSvgPath` checks `if (w <= 0 || h <= 0)` and computes `safeR = Math.max(0, Math.min(r, w/2, h/2))`.
   - *Logic*: Because `w` and `h` can never be negative, and `safeR` can never exceed half of the minimum dimension, all inner arc offsets `w - 2*safeR` and `h - 2*safeR` are strictly non-negative (`>= 0`).
   - *Deduction*: SVG path generation is mathematically immune to `NaN`, division-by-zero, inverted arcs, or clipping across any viewport dimension from 320x480 mobile screens to 5120x1440 ultrawide monitors.

2. **Pointer Clamping & Viewport Immunity**:
   - *Observation*: In `Compute-PointerLayout`, `containerX` is clamped via `Math.min(vw - margin - halfW, targetCenterX) - halfW`, ensuring `containerX + badgeW <= vw - margin`. Vertical placement `containerY` is clamped between `limitTop` and `limitBottom - totalH`.
   - *Logic*: When targets are positioned at the extreme screen edges (e.g., top-left (0,0) or bottom-right (vw, vh)), `orientation` automatically pivots to the direction with maximum clearance, and the badge container coordinates are held within `[12px, vw - 12px]`.
   - *Deduction*: Directional arrows and badges will never be clipped offscreen or obscured by fixed top/bottom popover dialogs.

3. **100% Offline PWA Cache Hit Rate**:
   - *Observation*: `service-worker.js` enforces `{ ignoreSearch: true }` in `caches.match` for both first-party application code (Network-First offline fallback) and static media (Cache-First).
   - *Logic*: When a PWA client requests versioned static assets (e.g. `index.html?v=1.6.0`, `js/onboardingTour.js?t=123456`, or `css/kitty-theme.css?debug=true`) in offline mode where `fetch()` throws network error, the Cache API strips query parameters and retrieves the corresponding pre-cached asset from `classquant-hub-v20`.
   - *Deduction*: The caching layer achieves a 100% hit rate for all precached assets under arbitrary query parameter variations.

---

## 3. Caveats

- **External CDN Assets**: While all 25 first-party application assets are pre-cached and operate 100% offline, external third-party CDN scripts (such as Tailwind CSS CDN or Lucide Icons CDN if loaded dynamically from external hosts without caching) require active internet connectivity on initial visit unless intercepted by cache-first routing.
- **Assumptions Made**: Assumed standard ECMAScript 6+ / Service Worker Cache API compliant browser environment (Chrome 80+, Safari 14+, Firefox 78+, Edge 80+).
- No other caveats.

---

## 4. Conclusion

**Verdict: `APPROVE`**

ClassQuant Hub's SVG spotlight geometry, directional arrow guidance clamping, and PWA Service Worker caching layer meet all architectural, mathematical, and resiliency requirements. The implementation exhibits zero NaN artifacts, zero clipping across extreme viewports (320x480 through 5120x1440), robust 4-way pointer clamping at screen boundaries, and a 100% offline cache hit rate under diverse query variations.

---

## 5. Verification Method

To independently verify these findings:

1. **Run Master E2E Test Suite (Tiers 1-4, 180 tests)**:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File tests/run_e2e_tests.ps1
   ```
   *Expected Result*: 180 / 180 passed, exit code `0`.

2. **Run Challenger 2 Empirical Stress Test Suite (66 assertion suites, 11,000+ Monte Carlo iterations)**:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File tests/challenger2_stress.ps1
   ```
   *Expected Result*: 66 / 66 passed (0 failures, 100% pass rate), exit code `0`.

3. **Key Source Files Inspected**:
   - `js/onboardingTour.js`: Lines 470–760 (Spotlight geometry & pointer layout calculations).
   - `service-worker.js`: Lines 6–33 (Asset table) & 69–133 (Offline query normalization).

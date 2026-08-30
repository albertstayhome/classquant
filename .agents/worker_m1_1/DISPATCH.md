## 2026-08-30T03:16:35Z
You are Worker M1 (SVG Spotlight & Guidance Arrow Engine Implementer).
Your working directory is: d:\class_point_app_dev\.agents\worker_m1_1
Original request is at: d:\class_point_app_dev\.agents\ORIGINAL_REQUEST.md
Project blueprint is at: d:\class_point_app_dev\PROJECT.md

INPUT BLUEPRINTS:
- SVG Spotlight Geometry & Glow: d:\class_point_app_dev\.agents\explorer_m1_1\handoff.md
- Directional Guidance Arrow & Viewport Clamping: d:\class_point_app_dev\.agents\explorer_m1_2\handoff.md
- 60fps rAF Tracking & Performance: d:\class_point_app_dev\.agents\explorer_m1_3\handoff.md

EXCLUSIVE FILE WRITE OWNERSHIP:
- js/onboardingTour.js (spotlight SVG geometry, pointer arrow calculation, 60fps rAF tracking loop)
- css/custom.css (spotlight glow/pulse, pointer styling, transition optimization)

OBJECTIVE:
Implement Milestone 1 features with rock-solid quality:
1. Replace rectilinear cutout with rounded-corner rectangle SVG path (`getSpotlightSvgPath(x, y, w, h, r, vw, vh)`) with corner arcs (`a rx ry 0 0 1 ...`), dynamic padding (6-10px), and viewport clamping.
2. Implement flash-free transition tweening between spotlight states.
3. Add glowing outline stroke and pulse halo (`#f43f5e`).
4. Implement dynamic 4-way arrow orientation (`computePointerOrientation`) with viewport margin clamping (`computePointerLayout`) so arrow/tooltip never clip off-screen.
5. Migrate pointer positioning to GPU-accelerated `translate3d(x, y, 0)`, eliminating 300ms CSS transition lag.
6. Eliminate `innerHTML` destruction at 60fps by pre-allocating static DOM nodes in `initDOM()` and updating only transforms/text in rAF loop.
7. Run the test suite: `powershell -NoProfile -ExecutionPolicy Bypass -File tests/run_e2e_tests.ps1` to verify all tests pass.

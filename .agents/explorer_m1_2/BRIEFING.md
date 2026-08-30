# BRIEFING — 2026-08-30T03:12:15Z

## Mission
Design exact technical blueprint for Milestone 1 Directional Guidance Arrow (orientation calculation, viewport clamping, collision avoidance, 60fps tracking without CSS lag).

## 🔒 My Identity
- Archetype: explorer
- Roles: directional-arrow-guidance, viewport-clamping, 60fps-tracking
- Working directory: d:\class_point_app_dev\.agents\explorer_m1_2
- Original parent: 18b14e24-a85d-40d6-bb97-59e18fc5c456
- Milestone: M1

## 🔒 Key Constraints
- Read-only investigation — do NOT implement in source code files
- Design dynamic 4-way arrow orientation calculation (top, bottom, left, right)
- Math-precise viewport margin clamping for arrow & tooltip badge
- Popover collision avoidance math
- Eliminate CSS transition lag during 60fps rAF tracking
- Write findings to handoff.md and report to parent

## Current Parent
- Conversation ID: 18b14e24-a85d-40d6-bb97-59e18fc5c456
- Updated: 2026-08-30T03:12:15Z

## Investigation State
- **Explored paths**: `js/onboardingTour.js`, `css/styles.css`, `PROJECT.md`, `explorer_survey_1/analysis.md`
- **Key findings**:
  1. Solved horizontal clipping via `Math.max(margin + halfBadgeWidth, Math.min(vw - margin - halfBadgeWidth, targetCenterX))` + relative arrow stem offset `arrowOffsetX`.
  2. Solved popover collision via 4-way dynamic orientation scoring (`computePointerOrientation`) evaluating `spaceBelow`, `spaceAbove`, `spaceRight`, `spaceLeft`.
  3. Eliminated 300ms CSS lag and frame jank by swapping `top`/`left` transitions for GPU-accelerated `translate3d(x, y, 0)` with persistent DOM node structure.
- **Unexplored areas**: None for M1-2 scope.

## Key Decisions Made
- Use static pre-rendered DOM hierarchy for pointer badge and 4 directional arrows created once in `initDOM()`.
- Use GPU-accelerated `transform: translate3d(x, y, 0)` with `transition: none` during 60fps rAF tracking.
- Dynamic arrow stem offset calculation aligns the pointer tip with target center even when badge is clamped by screen edges.

## Artifact Index
- d:\class_point_app_dev\.agents\explorer_m1_2\handoff.md — Complete 5-component handoff report & copy-paste ready blueprint
- d:\class_point_app_dev\.agents\explorer_m1_2\progress.md — Progress log
- d:\class_point_app_dev\.agents\explorer_m1_2\DISPATCH.md — Dispatch log

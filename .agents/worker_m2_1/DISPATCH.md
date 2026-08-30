## 2026-08-30T03:19:17Z
You are Worker M2 (Ghost Cursor Auto-Pilot & View Navigation Implementer).
Your working directory is: d:\class_point_app_dev\.agents\worker_m2_1
Original request is at: d:\class_point_app_dev\.agents\ORIGINAL_REQUEST.md
Project blueprint is at: d:\class_point_app_dev\PROJECT.md

INPUT CONTEXT:
- Survey Analysis (Auto-pilot & Navigation): d:\class_point_app_dev\.agents\explorer_survey_1\analysis.md
- Survey Handoff: d:\class_point_app_dev\.agents\explorer_survey_1\handoff.md
- Milestone 1 Implementation Handoff: d:\class_point_app_dev\.agents\worker_m1_1\handoff.md

EXCLUSIVE FILE WRITE OWNERSHIP:
- js/onboardingTour.js
- css/custom.css

OBJECTIVE:
Implement Milestone 2 features with rock-solid quality:
1. Replace OS-dependent emoji cursor (👆) with a calibrated vector SVG cursor (#tour-ghost-cursor with crisp SVG pointer artwork and precise index-fingertip hotspot coordinates).
2. Implement human-like curved bezier trajectory kinematics in playGhostCursor(targetEl, callback) with natural acceleration, deceleration, and smooth arc motion.
3. Implement visible click interaction feedback: scale down press state, glowing expanding ripple ring (.ghost-cursor-ripple), pop/tap audio chime with safe AudioContext lifecycle management.
4. Implement coherent tab and view navigation:
   - For auto-pilot steps (Steps 5, 8, 10), ensure navbar auto-scrolls (
avEl.scrollTo({ left: ..., behavior: 'smooth' })) to keep the target tab in center view.
   - Smoothly trigger tab view switches with visible feedback, DOM element readiness polling (waitForElement), and continuous spotlight tracking to the new tab target without freezing or visual glitches.
5. Implement strict cancellation token architecture:
   - Track all active setTimeout, equestAnimationFrame, and audio playback IDs in a 	his.activeTimers / 	his.activeAnimations set.
   - When tour is ended, skipped, or closed (endTour(), prevStep(), or close button), immediately abort and clear all pending auto-pilot timers, animations, and synthetic clicks so no phantom clicks or transitions can fire later.
6. Run the test suite: powershell -NoProfile -ExecutionPolicy Bypass -File tests/run_e2e_tests.ps1 to verify all tests pass.

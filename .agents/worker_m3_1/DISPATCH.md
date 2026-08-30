## 2026-08-30T03:23:06Z

You are Worker M3 (Anti-Jump & Anti-Lock Interaction Defense Implementer).
Your working directory is: d:\class_point_app_dev\.agents\worker_m3_1
Original request is at: d:\class_point_app_dev\.agents\ORIGINAL_REQUEST.md
Project blueprint is at: d:\class_point_app_dev\PROJECT.md

INPUT CONTEXT:
- Survey Analysis (Event Lifecycle & Defense): d:\class_point_app_dev\.agents\explorer_survey_2\analysis.md
- Survey Handoff: d:\class_point_app_dev\.agents\explorer_survey_2\handoff.md
- Milestone 2 Implementation Handoff: d:\class_point_app_dev\.agents\worker_m2_1\handoff.md

EXCLUSIVE FILE WRITE OWNERSHIP:
- js/onboardingTour.js
- css/custom.css

OBJECTIVE:
Implement Milestone 3 features with rock-solid quality:
1. Implement Anti-Jump Transition Mutex:
   - Enforce `this.isTransitioning = true` synchronously at the entry of `nextStep()`, `prevStep()`, and `goToStep()`.
   - Reject any incoming step trigger while `this.isTransitioning` is true.
   - Release the mutex only after the step DOM element is resolved, animations settle, and event listeners are fully attached.
   - Enforce a 250ms timestamp debounce on rapid user clicks.
2. Implement Strict Spotlight Boundary Touch Gating:
   - In event blockers (`clickBlocker`, `pointerBlocker`), during `manual-click` and `manual-change` steps, check if the click/touch event coordinates or target element fall inside the active spotlight bounding box or the `#tour-popover`.
   - If the interaction is outside the spotlight cutout and popover, strictly `preventDefault()` and `stopPropagation()`. This completely eliminates accidental taps on background UI (e.g., clicking other student seat cards or background tabs).
3. Implement Select Dropdown Trap Defense:
   - On Step 1 (`#global-class-select`), attach listeners for `change`, `blur`, and `input` so if the user opens the dropdown and confirms the existing class selection (which does not trigger `change`), the tour detects the user interaction and advances cleanly without locking or trapping.
4. Implement Fail-Safe Error Recovery & Centralized Teardown:
   - Ensure `endTour()` / `destroy()` unconditionally removes `#tour-overlay`, `#tour-popover`, `#tour-ghost-cursor`, resets `document.body.style.overflow` and `document.documentElement.style.overflow`, removes capture-phase window event listeners, and cancels all active timers/animations.
   - Wrap `renderStep()` in `try...catch` so any unexpected DOM error gracefully recovers instead of freezing the UI.
5. Run the test suite: `powershell -NoProfile -ExecutionPolicy Bypass -File tests/run_e2e_tests.ps1` to verify all tests pass.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your handoff report to: d:\class_point_app_dev\.agents\worker_m3_1\handoff.md.
When finished, send a message back to the orchestrator with your summary and handoff report path.

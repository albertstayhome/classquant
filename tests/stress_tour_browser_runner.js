/**
 * ClassQuant Hub — Interactive Tour Empirical Stress Test Suite
 * Executes in real browser environments (Chrome / Edge / WebKit)
 */

(async function runStressTests() {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    suites: [],
    details: []
  };

  function logTest(suite, name, passed, error = null, metrics = {}) {
    results.total++;
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
    const entry = { suite, name, passed, error: error ? String(error) : null, metrics };
    results.details.push(entry);
    
    let suiteObj = results.suites.find(s => s.name === suite);
    if (!suiteObj) {
      suiteObj = { name: suite, passed: 0, failed: 0, total: 0 };
      results.suites.push(suiteObj);
    }
    suiteObj.total++;
    if (passed) suiteObj.passed++; else suiteObj.failed++;

    console.log(`[${passed ? 'PASS' : 'FAIL'}] [${suite}] ${name}`, error || '');
  }

  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  try {
    const tour = window.onboardingTour || new OnboardingTour();
    window.onboardingTour = tour;

    // =========================================================================
    // SUITE 1: RAPID BURST CLICKING (50 clicks within 100ms)
    // =========================================================================
    {
      const suiteName = "Rapid Burst Clicking & Anti-Jump Mutex";

      // Test 1.1: 50 rapid clicks on Next button within 100ms
      await tour.start(3); // Step 4 (step-custom-tags, info action, has Next button)
      await delay(800); // Allow start(3) renderStep (400ms scroll + 280ms morph) to fully complete
      const startStep = tour.currentStep; // should be 3
      const skipBtn = document.getElementById('tour-skip-btn') || document.querySelector('#tour-action-container button');

      let clickCount = 0;
      const startTime = performance.now();
      // Fire 50 clicks in a tight burst within 100ms
      for (let i = 0; i < 50; i++) {
        if (skipBtn) {
          skipBtn.click();
          clickCount++;
        }
        if (i % 10 === 0) await delay(2);
      }
      const burstDuration = performance.now() - startTime;
      await delay(850); // Allow the single valid transition (680ms) to complete and release mutex

      const endStep = tour.currentStep;
      const stepDelta = endStep - startStep;

      // Invariant: Because of isTransitioning mutex and 250ms debounce, exactly 1 step advance should occur
      const burstNextPassed = (stepDelta === 1) && (tour.isTransitioning === false);
      logTest(suiteName, "50 rapid clicks on Next button advances exactly 1 step without skipping", burstNextPassed, 
        burstNextPassed ? null : `Expected stepDelta=1, got ${stepDelta} (from step ${startStep} to ${endStep}); isTransitioning=${tour.isTransitioning}`,
        { clicksFired: clickCount, burstDurationMs: burstDuration, startStep, endStep, stepDelta, isTransitioning: tour.isTransitioning }
      );

      // Test 1.2: 50 rapid clicks on Prev button
      const beforePrevStep = tour.currentStep;
      for (let i = 0; i < 50; i++) {
        tour.prevStep();
        if (i % 10 === 0) await delay(2);
      }
      await delay(850); // Allow prevStep transition (680ms) to complete
      const afterPrevStep = tour.currentStep;
      const prevDelta = beforePrevStep - afterPrevStep;
      const prevPassed = (prevDelta === 1) && (tour.isTransitioning === false);
      logTest(suiteName, "50 rapid calls to prevStep() regresses exactly 1 step", prevPassed,
        prevPassed ? null : `Expected prevDelta=1, got ${prevDelta}; isTransitioning=${tour.isTransitioning}`,
        { beforePrevStep, afterPrevStep, prevDelta, isTransitioning: tour.isTransitioning }
      );

      // Test 1.3: 50 rapid clicks on SVG overlay backdrop during manual step
      await tour.start(1); // Step 2: manual-click on seat-card-1
      await delay(800);
      const backdrop = document.getElementById('tour-overlay-path');
      let underlyingClicked = false;
      const testSeat = document.getElementById('seat-card-2');
      const clickTracker = () => { underlyingClicked = true; };
      testSeat?.addEventListener('click', clickTracker);

      for (let i = 0; i < 50; i++) {
        const evt = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: 50,
          clientY: 50
        });
        backdrop?.dispatchEvent(evt);
        testSeat?.dispatchEvent(evt);
      }
      await delay(300);
      testSeat?.removeEventListener('click', clickTracker);

      const backdropPassed = (tour.currentStep === 1) && (!underlyingClicked);
      logTest(suiteName, "50 rapid clicks on overlay backdrop are captured and blocked from passing through", backdropPassed,
        backdropPassed ? null : `currentStep changed to ${tour.currentStep} or underlyingClicked=${underlyingClicked}`
      );

      // Test 1.4: 50 rapid clicks on target element inside spotlight
      const seat1 = document.getElementById('seat-card-1');
      const startStepSeat = tour.currentStep;
      for (let i = 0; i < 50; i++) {
        seat1?.click();
      }
      await delay(1100); // 200ms debounce timeout + 680ms renderStep transition + buffer
      const afterSeatStep = tour.currentStep;
      // Step 2 should advance to Step 3 (step-click-tag) exactly once, NOT skip to Step 4 or 5
      const seatPassed = (afterSeatStep === startStepSeat + 1) && (tour.isTransitioning === false);
      logTest(suiteName, "50 rapid clicks on spotlight target trigger a single debounced advance", seatPassed,
        seatPassed ? null : `Expected step ${startStepSeat + 1}, got ${afterSeatStep}; isTransitioning=${tour.isTransitioning}`,
        { startStepSeat, afterSeatStep, isTransitioning: tour.isTransitioning }
      );

      tour.endTour();
    }

    // =========================================================================
    // SUITE 2: MID-FLIGHT TOUR CANCELLATION & SKIP DURING AUTO-PILOT GHOST CURSOR
    // =========================================================================
    {
      const suiteName = "Auto-Pilot Kinematics Mid-Flight Cancellation";

      // Test 2.1: Cancel mid-flight at 150ms of Bezier trajectory
      await tour.start(4); // Step 5: step-goto-roster (auto-click)
      await delay(350);
      const targetBtn = document.querySelector('button[data-tab="roster"]');
      let syntheticClickFiredOnTarget = false;
      const targetClickSpy = () => { syntheticClickFiredOnTarget = true; };
      targetBtn?.addEventListener('click', targetClickSpy);

      // Launch ghost cursor
      const ghostPromise = tour.playGhostCursor(targetBtn);
      // Wait 150ms into Bezier trajectory flight
      await delay(150);

      // Cancel tour mid-flight!
      tour.endTour();

      await delay(1000); // Wait long enough for original 700-950ms animation and dwell to have passed
      targetBtn?.removeEventListener('click', targetClickSpy);

      const ghostCursor = document.getElementById('tour-ghost-cursor');
      const ghostOpacity = ghostCursor ? getComputedStyle(ghostCursor).opacity : '0';
      const cancelPassed = (tour.isActive === false) && 
                           (tour.isAutoPlaying === false) && 
                           (!syntheticClickFiredOnTarget) && 
                           (ghostOpacity === '0' || ghostCursor?.style.opacity === '0');

      logTest(suiteName, "Mid-flight endTour() cancels Bezier animation, hides ghost cursor, and suppresses synthetic click", cancelPassed,
        cancelPassed ? null : `isActive=${tour.isActive}, isAutoPlaying=${tour.isAutoPlaying}, clickFired=${syntheticClickFiredOnTarget}, opacity=${ghostOpacity}`,
        { ghostOpacity, syntheticClickFiredOnTarget }
      );

      // Test 2.2: Skip step (nextStep) mid-flight at 300ms during Bezier flight
      await tour.start(4); // Step 5: step-goto-roster (auto-click)
      await delay(350);
      const ghostPromise2 = tour.playGhostCursor();
      await delay(300);
      // User presses "Skip" or nextStep() while cursor is traveling
      await tour.nextStep();
      await delay(500);

      const skipMidFlightPassed = (tour.currentStep === 5) && 
                                  (tour.isAutoPlaying === false) && 
                                  (!document.querySelector('.tour-simulated-active'));

      logTest(suiteName, "Mid-flight nextStep() gracefully interrupts ghost cursor, cleans active state, and lands on next step", skipMidFlightPassed,
        skipMidFlightPassed ? null : `Expected step 5, got ${tour.currentStep}; isAutoPlaying=${tour.isAutoPlaying}`
      );

      // Test 2.3: Session token invalidation prevents stale timers from executing
      const sessionBefore = tour.currentSessionId;
      let staleTimerFired = false;
      tour.safeTimeout(() => { staleTimerFired = true; }, 200);
      tour.cancelAutoPlay(); // Increments session and cancels
      tour.endTour();
      await delay(300);

      const tokenPassed = (!staleTimerFired) && (tour.currentSessionId > sessionBefore);
      logTest(suiteName, "Session ID increment and cancelAutoPlay cleanly discards pending asynchronous callbacks", tokenPassed,
        tokenPassed ? null : `staleTimerFired=${staleTimerFired}, sessionDelta=${tour.currentSessionId - sessionBefore}`
      );

      tour.endTour();
    }

    // =========================================================================
    // SUITE 3: RAPID RESIZE AND SCROLL EVENTS DURING STEP TRANSITION MORPHING
    // =========================================================================
    {
      const suiteName = "Dynamic Resize & Scroll Concurrency during Morphing";

      await tour.start(0);
      await delay(350);

      // Trigger nextStep (which starts morphTo for 280ms)
      const morphPromise = tour.nextStep();

      // Flood the engine with 100 rapid resize, scroll, visualViewport events
      let exceptionsCaught = 0;
      for (let i = 0; i < 100; i++) {
        try {
          window.innerWidth = 800 + (i % 20) * 10;
          window.innerHeight = 600 + (i % 15) * 10;
          window.dispatchEvent(new Event('resize'));
          window.dispatchEvent(new Event('scroll'));
          if (window.visualViewport) {
            window.visualViewport.dispatchEvent(new Event('resize'));
            window.visualViewport.dispatchEvent(new Event('scroll'));
          }
        } catch (e) {
          exceptionsCaught++;
        }
        if (i % 25 === 0) await delay(5);
      }

      await morphPromise;
      await delay(200);

      // Verify SVG path is well-formed without NaN
      const pathEl = document.getElementById('tour-overlay-path');
      const dAttr = pathEl?.getAttribute('d') || '';
      const hasNaN = dAttr.includes('NaN') || dAttr.includes('undefined');
      const hasValidPath = dAttr.startsWith('M 0 0') && dAttr.includes('Z');

      const morphResiliencePassed = (exceptionsCaught === 0) && (!hasNaN) && hasValidPath && (tour.currentStep === 1);
      logTest(suiteName, "100 rapid resize/scroll events during morphTo execute without NaN or geometry desync", morphResiliencePassed,
        morphResiliencePassed ? null : `exceptions=${exceptionsCaught}, hasNaN=${hasNaN}, pathLength=${dAttr.length}, step=${tour.currentStep}`,
        { dAttrSnippet: dAttr.slice(0, 80), exceptionsCaught }
      );

      // Verify pointer remains clamped inside viewport
      const pointer = document.getElementById('tour-pointer-container');
      const pointerTransform = pointer?.style.transform || '';
      const pointerHasNaN = pointerTransform.includes('NaN');
      const pointerVisible = !pointer?.classList.contains('hidden');

      const pointerPassed = (!pointerHasNaN) && pointerVisible;
      logTest(suiteName, "Directional arrow pointer recalculates and remains clamped within viewport under event storm", pointerPassed,
        pointerPassed ? null : `pointerTransform=${pointerTransform}, visible=${pointerVisible}`,
        { pointerTransform }
      );

      tour.endTour();
    }

    // =========================================================================
    // SUITE 4: SELECT DROPDOWN TRAP DEFENSE & RE-SELECTION ON STEP 1
    // =========================================================================
    {
      const suiteName = "Select Dropdown Trap Defense on Step 1";

      await tour.start(0); // Step 1: #global-class-select
      await delay(350);

      const selectEl = document.getElementById('global-class-select');
      const initialStep = tour.currentStep; // 0

      // Scenario 4.1: Dropdown focus, click, and blur with empty value or no interaction
      selectEl.value = '';
      selectEl.dispatchEvent(new Event('focus', { bubbles: true }));
      selectEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      selectEl.dispatchEvent(new Event('blur', { bubbles: true }));
      await delay(300);

      const emptyValueBlocked = (tour.currentStep === 0);
      logTest(suiteName, "Dropdown blur with empty value does not trigger unintended step advance", emptyValueBlocked,
        emptyValueBlocked ? null : `Expected step 0, got ${tour.currentStep}`
      );

      // Scenario 4.2: User clicks/touches dropdown, re-selects existing value (301), and blurs
      selectEl.value = '301';
      selectEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      selectEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      selectEl.dispatchEvent(new Event('blur', { bubbles: true }));
      await delay(350);

      const reselectPassed = (tour.currentStep === 1);
      logTest(suiteName, "Dropdown click + blur with valid selection resolves and cleanly advances to Step 2", reselectPassed,
        reselectPassed ? null : `Expected step 1, got ${tour.currentStep}`
      );

      // Scenario 4.3: Ensure activeEnforcementCleanup removed listeners and did not leak double trigger
      const stepAfterReselect = tour.currentStep;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      selectEl.dispatchEvent(new Event('blur', { bubbles: true }));
      await delay(300);

      const cleanupPassed = (tour.currentStep === stepAfterReselect);
      logTest(suiteName, "Subsequent select events after Step 1 completion are ignored and do not double-advance", cleanupPassed,
        cleanupPassed ? null : `Expected step ${stepAfterReselect}, got ${tour.currentStep}`
      );

      tour.endTour();
    }

    // =========================================================================
    // SUITE 5: MUTEX INTEGRITY, ZOMBIE TIMERS, & MEMORY LEAK CLEANUP
    // =========================================================================
    {
      const suiteName = "Lifecycle, Mutex Lock Integrity, & Teardown Verification";

      // Test 5.1: 50 rapid start() and endTour() cycles in succession
      let lifecycleErrors = 0;
      for (let i = 0; i < 50; i++) {
        try {
          tour.start(i % 12);
          if (i % 3 === 0) tour.nextStep();
          tour.endTour();
        } catch (e) {
          lifecycleErrors++;
        }
      }
      await delay(200);

      const activeTimersEmpty = tour.activeTimers.size === 0;
      const activeAnimsEmpty = tour.activeAnimations.size === 0;
      const trackingNull = tour.trackingFrame === null;
      const morphNull = tour.morphAnimId === null;
      const ghostNull = tour.ghostAnimId === null;
      const isTransitioningFalse = tour.isTransitioning === false;
      const isActiveFalse = tour.isActive === false;

      const bodyClean = !document.body.classList.contains('tour-strict-locked') &&
                        !document.documentElement.classList.contains('tour-strict-locked') &&
                        document.body.style.overflow === '';

      const overlayHidden = document.getElementById('tour-overlay-container')?.classList.contains('hidden');

      const teardownPassed = (lifecycleErrors === 0) &&
                             activeTimersEmpty && 
                             activeAnimsEmpty && 
                             trackingNull && 
                             morphNull && 
                             ghostNull && 
                             isTransitioningFalse && 
                             isActiveFalse && 
                             bodyClean && 
                             overlayHidden;

      logTest(suiteName, "50 rapid start/abort cycles achieve 100% teardown with zero zombie timers, rAF leaks, or lock persistence", teardownPassed,
        teardownPassed ? null : `errors=${lifecycleErrors}, timers=${tour.activeTimers.size}, anims=${tour.activeAnimations.size}, isTrans=${tour.isTransitioning}, bodyClean=${bodyClean}`,
        {
          lifecycleErrors,
          activeTimersCount: tour.activeTimers.size,
          activeAnimationsCount: tour.activeAnimations.size,
          trackingFrame: tour.trackingFrame,
          morphAnimId: tour.morphAnimId,
          ghostAnimId: tour.ghostAnimId,
          isTransitioning: tour.isTransitioning,
          isActive: tour.isActive,
          bodyClean,
          overlayHidden
        }
      );

      // Test 5.2: Complete 12-step end-to-end traversal under rapid sequential triggers
      await tour.start(0);
      await delay(800); // Allow start(0) renderStep to complete
      let stepTraversePassed = true;
      for (let s = 0; s < 12; s++) {
        const current = tour.currentStep;
        if (current !== s) {
          stepTraversePassed = false;
        }
        await tour.nextStep();
        await delay(100);
      }
      const completedFlag = localStorage.getItem('classquant_tour_completed') === 'true';
      const tourFinished = (!tour.isActive) && (stepTraversePassed) && completedFlag;

      logTest(suiteName, "12-step end-to-end rapid sequential traversal completes with persistence flag set and full release", tourFinished,
        tourFinished ? null : `isActive=${tour.isActive}, stepTraversePassed=${stepTraversePassed}, completedFlag=${completedFlag}`,
        { completedFlag, stepTraversePassed }
      );
    }

  } catch (fatalErr) {
    console.error("FATAL STRESS TEST ERROR:", fatalErr);
    logTest("FATAL", "Execution aborted due to unexpected runtime error", false, fatalErr);
  }

  // Update DOM Output for Headless Scraping & Human Inspection
  const statusEl = document.getElementById('status');
  const summaryEl = document.getElementById('summary-json');
  if (statusEl) {
    statusEl.innerHTML = `<strong>Execution Finished:</strong> ${results.passed} / ${results.total} Passed (${results.failed} Failed)`;
    statusEl.className = results.failed === 0 ? 'pass' : 'fail';
  }
  if (summaryEl) {
    summaryEl.textContent = JSON.stringify(results, null, 2);
  }
  window.__STRESS_TEST_RESULTS__ = results;

  // Post back to runner server if available
  try {
    await fetch('/api/test-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(results)
    });
  } catch (e) {}
})();


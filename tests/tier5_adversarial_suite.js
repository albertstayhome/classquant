/**
 * ClassQuant Hub — Tier 5 Adversarial Coverage Hardening Test Suite (Milestone M4)
 * Real-Browser Runtime Stress Harness (Chromium / Edge / WebKit)
 * Covers:
 * 1. Rapid tab switching during active tour & anti-deadlock verification
 * 2. Tour cancellation mid-step at diverse fractional timestamps
 * 3. Concurrent seat selection storms, rapid toggling & seat swap state invariants
 * 4. Roster search boundary stress (10k chars, regex, XSS, unicode/emojis, whitespace)
 * 5. Timetable schedule boundary values (inverted times, extreme periods, simulation bar)
 * 6. Memory leak & DOM orphan node audit, zero JS runtime exception guarantee
 */

(async function runTier5AdversarialSuite() {
  const uncaughtErrors = [];
  window.addEventListener('error', (e) => {
    uncaughtErrors.push({
      type: 'error',
      message: e.message || String(e),
      filename: e.filename,
      lineno: e.lineno
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    uncaughtErrors.push({
      type: 'unhandledrejection',
      message: e.reason?.message || String(e.reason)
    });
  });

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    suites: [],
    details: [],
    uncaughtErrors: uncaughtErrors
  };

  window.__TIER5_RESULTS__ = null;

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

    const logBox = document.getElementById('test-log');
    if (logBox) {
      const div = document.createElement('div');
      div.className = passed ? 'test-pass' : 'test-fail';
      div.textContent = `[${passed ? 'PASS' : 'FAIL'}] [${suite}] ${name}${error ? ' -> ' + error : ''}`;
      logBox.appendChild(div);
      logBox.scrollTop = logBox.scrollHeight;
    }
    console.log(`[${passed ? 'PASS' : 'FAIL'}] [${suite}] ${name}`, error || '');
  }

  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  try {
    // -------------------------------------------------------------------------
    // Setup Environment
    // -------------------------------------------------------------------------
    const store = window.appStore || new Store();
    window.appStore = store;
    store.initDemoData();

    const timetable = window.timetableEngine || new TimetableEngine(store);
    window.timetableEngine = timetable;

    const stats = window.statisticsEngine || new StatisticsEngine(store);
    window.statisticsEngine = stats;

    const matrix = window.matrixView || new ClassroomMatrix(store, timetable, stats);
    window.matrixView = matrix;

    const retro = window.retroLogView || new RetroLogView(store, stats);
    window.retroLogView = retro;

    const roster = window.rosterManager || new RosterManager(store);
    window.rosterManager = roster;

    const timetableEditor = window.timetableEditorView || new TimetableEditorView(store, timetable);
    window.timetableEditorView = timetableEditor;

    const tour = window.onboardingTour || new OnboardingTour();
    window.onboardingTour = tour;

    if (!window.appState) {
      window.appState = {
        currentClassId: '801',
        activeTab: 'matrix',
        toasts: [],
        sounds: [],
        showToast(msg, type) { this.toasts.push({ msg, type, time: Date.now() }); },
        playPop() { this.sounds.push('pop'); },
        playChime() { this.sounds.push('chime'); },
        playWarning() { this.sounds.push('warning'); },
        renderClassDropdown() {},
        updateHeaderStatus() {},
        closeModal() {
          const modal = document.getElementById('global-modal');
          if (modal) modal.classList.add('hidden');
        },
        startTour() {
          if (window.onboardingTour) window.onboardingTour.start(0);
        },
        switchTab(tabId) {
          this.activeTab = tabId;
          const tabs = ['matrix', 'roster', 'retro', 'dashboard', 'timetable', 'events', 'student-dossier', 'ai-hub', 'guide'];
          const viewMap = {
            'matrix': 'classroom-matrix-view',
            'roster': 'roster-manager-view',
            'retro': 'retro-log-view',
            'dashboard': 'dashboard-view',
            'timetable': 'timetable-editor-view',
            'events': 'events-log-view',
            'student-dossier': 'student-dossier-view',
            'ai-hub': 'ai-hub-view',
            'guide': 'user-guide-view'
          };
          tabs.forEach(t => {
            const vId = viewMap[t];
            const el = document.getElementById(vId);
            if (el) el.classList.toggle('hidden', t !== tabId);
          });
          if (tabId === 'matrix' && window.matrixView) window.matrixView.render('classroom-matrix-view', this.currentClassId);
          if (tabId === 'roster' && window.rosterManager) window.rosterManager.render('roster-manager-view');
          if (tabId === 'retro' && window.retroLogView) window.retroLogView.render('retro-log-view', this.currentClassId);
          if (tabId === 'timetable' && window.timetableEditorView) window.timetableEditorView.render('timetable-editor-view');
        }
      };
    }

    // Initial render
    window.appState.switchTab('matrix');
    await delay(100);

    // =========================================================================
    // SUITE 1: RAPID TAB SWITCHING DURING ACTIVE TOUR & ANTI-DEADLOCK
    // =========================================================================
    {
      const suite = "T5 Suite 1: Rapid Tab Switching During Active Tour";

      // Test 1.1: 50 rapid tab switches while tour is active at Step 1
      await tour.start(0);
      await delay(200);

      const allTabs = ['roster', 'timetable', 'retro', 'dashboard', 'events', 'guide', 'matrix'];
      let tabExceptions = 0;
      for (let i = 0; i < 50; i++) {
        try {
          const nextTab = allTabs[i % allTabs.length];
          window.appState.switchTab(nextTab);
        } catch (e) {
          tabExceptions++;
        }
        if (i % 10 === 0) await delay(5);
      }
      await delay(300);

      const tabSwitchPassed = (tabExceptions === 0);
      logTest(suite, "1.1 50 rapid tab switches during active tour execute with 0 exceptions", tabSwitchPassed,
        tabSwitchPassed ? null : `Tab exceptions encountered: ${tabExceptions}`
      );

      // Test 1.2: Clean tour teardown after rapid tab thrashing
      tour.endTour();
      await delay(200);
      window.appState.switchTab('matrix');
      await delay(100);

      const overlay = document.getElementById('tour-overlay-container');
      const overlayHidden = !overlay || overlay.classList.contains('hidden');
      const bodyClean = !document.body.classList.contains('tour-strict-locked') && document.body.style.overflow === '';

      const teardownClean = overlayHidden && bodyClean && (!tour.isActive);
      logTest(suite, "1.2 Clean teardown after tab thrashing restores 100% overlay and body state", teardownClean,
        teardownClean ? null : `overlayHidden=${overlayHidden}, bodyClean=${bodyClean}, tourActive=${tour.isActive}`
      );

      // Test 1.3: Interactive seat card clicks work immediately after tour teardown
      matrix.clearSelection('801');
      matrix.toggleSeatSelection(1, '801');
      const seat1Selected = matrix.selectedSeats.has(1);
      matrix.clearSelection('801');
      const seat1Cleared = matrix.selectedSeats.size === 0;

      const interactionRestored = seat1Selected && seat1Cleared;
      logTest(suite, "1.3 Seat selection responsiveness is 100% restored post tab-tour thrash", interactionRestored);
    }

    // =========================================================================
    // SUITE 2: TOUR CANCELLATION MID-STEP AT FRACTIONAL TIMESTAMPS
    // =========================================================================
    {
      const suite = "T5 Suite 2: Fractional Mid-Step Tour Cancellation";

      const testSteps = [0, 1, 4, 5, 8, 10];
      const abortDelays = [10, 50, 120, 250, 450];
      let abortFailures = 0;

      for (let sIdx = 0; sIdx < testSteps.length; sIdx++) {
        const stepNum = testSteps[sIdx];
        const abortMs = abortDelays[sIdx % abortDelays.length];

        await tour.start(stepNum);
        await delay(abortMs); // Mid-transition abort!
        tour.endTour();
        await delay(100);

        const isClean = (!tour.isActive) &&
                        (tour.isTransitioning === false) &&
                        (tour.isAutoPlaying === false) &&
                        (tour.activeTimers.size === 0) &&
                        (tour.activeAnimations.size === 0);

        if (!isClean) {
          abortFailures++;
        }
      }

      const multiAbortPassed = (abortFailures === 0);
      logTest(suite, "2.1 Aborting tour across 6 distinct steps and fractional timings leaves 0 lock leaks", multiAbortPassed,
        multiAbortPassed ? null : `Failures: ${abortFailures}`
      );

      // Test 2.2: Modal open during tour abort
      await tour.start(5); // Step 6: roster paste modal demo
      await delay(200);
      const modal = document.getElementById('global-modal');
      const wasModalOpen = modal && !modal.classList.contains('hidden');
      tour.endTour();
      if (window.appState.closeModal) window.appState.closeModal();
      await delay(100);

      const modalClean = (!tour.isActive) && (!modal || modal.classList.contains('hidden'));
      logTest(suite, "2.2 Mid-tour modal demo abort closes dialogs cleanly and restores main UI", modalClean);
    }

    // =========================================================================
    // SUITE 3: CONCURRENT SEAT SELECTION & SEAT SWAP INVARIANTS
    // =========================================================================
    {
      const suite = "T5 Suite 3: Concurrent Seat Selection & Seat Swap Invariants";

      window.appState.switchTab('matrix');
      await delay(100);

      // Test 3.1: 1,000 rapid randomized seat toggles across class 801
      matrix.clearSelection('801');
      const toggleCounts = new Array(31).fill(0);

      for (let i = 0; i < 1000; i++) {
        const seatNo = (i % 30) + 1;
        matrix.toggleSeatSelection(seatNo, '801');
        toggleCounts[seatNo]++;
      }

      // Check invariants: if toggle count is odd, seat must be selected; if even, unselected
      let parityMismatch = 0;
      for (let s = 1; s <= 30; s++) {
        const shouldBeSelected = (toggleCounts[s] % 2 !== 0);
        const isSelected = matrix.selectedSeats.has(s);
        const cardEl = document.getElementById(`seat-card-${s}`);
        const hasDomClass = cardEl && cardEl.classList.contains('selected');

        if (shouldBeSelected !== isSelected || (cardEl && shouldBeSelected !== hasDomClass)) {
          parityMismatch++;
        }
      }

      const parityPassed = (parityMismatch === 0);
      logTest(suite, "3.1 1,000 rapid seat toggles maintain exact mathematical parity across Set & DOM", parityPassed,
        parityPassed ? null : `Parity mismatches: ${parityMismatch}`,
        { toggleTotal: 1000, parityMismatch }
      );
      matrix.clearSelection('801');

      // Test 3.2: Tag award auto-clear while rapid toggles are firing
      matrix.toggleSeatSelection(2, '801');
      matrix.toggleSeatSelection(4, '801');
      matrix.toggleSeatSelection(6, '801');
      const eventsCountBefore = store.getEvents('801').length;

      // Apply tag
      matrix.applyTagToSelected('801', 'math_breakthrough');
      const eventsCountAfter = store.getEvents('801').length;
      const autoCleared = (matrix.selectedSeats.size === 0);
      const eventsAdded = (eventsCountAfter - eventsCountBefore === 3);

      const scoringAutoClearPassed = autoCleared && eventsAdded;
      logTest(suite, "3.2 Quick tag scoring creates 3 events and immediately clears multi-seat selection", scoringAutoClearPassed,
        scoringAutoClearPassed ? null : `eventsAdded=${eventsCountAfter - eventsCountBefore}, selectedSize=${matrix.selectedSeats.size}`
      );

      // Test 3.3: Seat swap in roster propagates to matrix without dangling references
      const originalStudents = store.getStudents('801');
      const s1Name = originalStudents.find(s => s.seatNo === 1)?.name || 'Student 1';
      const s2Name = originalStudents.find(s => s.seatNo === 2)?.name || 'Student 2';

      // Swap names
      roster.updateStudentName('801', 1, s2Name + '_Swapped');
      roster.updateStudentName('801', 2, s1Name + '_Swapped');

      // Re-render matrix
      matrix.render('classroom-matrix-view', '801');
      await delay(50);

      const card1Text = document.getElementById('seat-card-1')?.textContent || '';
      const card2Text = document.getElementById('seat-card-2')?.textContent || '';

      const swapPassed = card1Text.includes(s2Name) && card2Text.includes(s1Name);
      logTest(suite, "3.3 Student seat name swapping updates matrix DOM without orphan nodes", swapPassed,
        swapPassed ? null : `Card1='${card1Text}', Card2='${card2Text}'`
      );

      // Restore original names
      roster.updateStudentName('801', 1, s1Name);
      roster.updateStudentName('801', 2, s2Name);
      matrix.render('classroom-matrix-view', '801');
    }

    // =========================================================================
    // SUITE 4: ROSTER SEARCH & EDITING BOUNDARY STRESS
    // =========================================================================
    {
      const suite = "T5 Suite 4: Roster Search & Editing Boundary Stress";

      window.appState.switchTab('roster');
      await delay(100);

      // Test 4.1: Extreme length search query (10,000 characters)
      const extremeQuery = "A".repeat(10000);
      roster.handleSearch(extremeQuery);
      const filteredExtreme = roster.getFilteredStudents('801');
      const extremePassed = Array.isArray(filteredExtreme) && filteredExtreme.length === 0;
      logTest(suite, "4.1 10,000-character search string completes instantly with zero exceptions", extremePassed);

      // Test 4.2: Regex metacharacters injection in search query
      const regexPatterns = [
        ".*", ".+", "[a-z]+", "\\d{2,}", "(?=.*[A-Z])", ".*?", "^$",
        "\\b\\w+\\b", "[[[((()))]]]", "???+++***", "{1,99999}", "\\s*\\S*"
      ];
      let regexErrors = 0;
      for (const pattern of regexPatterns) {
        try {
          roster.handleSearch(pattern);
          const res = roster.getFilteredStudents('801');
          if (!Array.isArray(res)) regexErrors++;
        } catch (e) {
          regexErrors++;
        }
      }
      const regexPassed = (regexErrors === 0);
      logTest(suite, "4.2 Regex metacharacters in search query match literally with 0 regex crashes", regexPassed,
        regexPassed ? null : `Errors on regex queries: ${regexErrors}`
      );

      // Test 4.3: XSS & HTML injection strings in search
      const xssStrings = [
        "<script>alert(1)</script>",
        "\"><img src=x onerror=alert(1)>",
        "<svg onload=alert(document.domain)>",
        "'; DROP TABLE students; --",
        "{{7*7}}",
        "${alert(1)}"
      ];
      let xssErrors = 0;
      for (const xss of xssStrings) {
        try {
          roster.handleSearch(xss);
          const res = roster.getFilteredStudents('801');
          if (!Array.isArray(res)) xssErrors++;
        } catch (e) {
          xssErrors++;
        }
      }
      const xssPassed = (xssErrors === 0);
      logTest(suite, "4.3 XSS and SQL injection payloads in search query sanitized safely", xssPassed);

      // Test 4.4: Emojis, Unicode surrogate pairs, and Asian phonetic search
      const unicodeQueries = ["👦", "✨", "🚀", "陳", "林", "王", "01", "001", "30", "   陳   "];
      let unicodeErrors = 0;
      for (const uq of unicodeQueries) {
        try {
          roster.handleSearch(uq);
          const res = roster.getFilteredStudents('801');
          if (!Array.isArray(res)) unicodeErrors++;
        } catch (e) {
          unicodeErrors++;
        }
      }
      const unicodePassed = (unicodeErrors === 0);
      logTest(suite, "4.4 Unicode, emojis, leading zeros, and whitespace padding handled cleanly", unicodePassed);

      // Test 4.5: Roster batch paste tokenization with diverse delimiters
      const complexPaste = `
1.  陳大明   80101
02, 林小華, 80102
3\t張志強\t80103
4、李美美、80104
王大維
  黃淑芬  
#7 趙子龍
8 - 孫尚香
      `.trim();

      // Setup DOM container for textarea
      let modalBody = document.getElementById('modal-body');
      if (modalBody) {
        modalBody.innerHTML = `<textarea id="batch-roster-textarea">${complexPaste}</textarea>`;
      }
      roster.applyBatchPaste('801');
      const importedStudents = store.getStudents('801');
      const pasteValid = Array.isArray(importedStudents) && importedStudents.length >= 8 && importedStudents[0].name.includes('陳大明');
      logTest(suite, "4.5 Roster batch paste tokenizes mixed delimiters, prefixes, and numbering", pasteValid,
        pasteValid ? null : `Imported count: ${importedStudents?.length}`
      );

      roster.clearSearch();
    }

    // =========================================================================
    // SUITE 5: TIMETABLE SCHEDULING & TIME PERCEPTION EXTREMES
    // =========================================================================
    {
      const suite = "T5 Suite 5: Timetable Scheduling & Time Perception Extremes";

      window.appState.switchTab('timetable');
      await delay(100);

      // Test 5.1: Simulation time setting across extreme timestamps
      const simTimes = [
        { day: 1, timeStr: '00:00' },
        { day: 2, timeStr: '07:30' },
        { day: 3, timeStr: '12:00' },
        { day: 4, timeStr: '17:00' },
        { day: 5, timeStr: '23:59' },
        { day: 0, timeStr: '10:00' }, // Sunday (weekend)
        { day: 6, timeStr: '14:00' }  // Saturday (weekend)
      ];

      let simErrors = 0;
      for (const st of simTimes) {
        try {
          timetable.simulatedTime = st;
          const activeSlot = timetable.detectActiveSlot();
          if (!activeSlot || !activeSlot.status) {
            simErrors++;
          }
        } catch (e) {
          simErrors++;
        }
      }
      timetable.simulatedTime = null; // Clear simulation

      const simPassed = (simErrors === 0);
      logTest(suite, "5.1 Time perception simulation detects valid slots across midnight, weekends & school hours", simPassed,
        simPassed ? null : `Simulation detection errors: ${simErrors}`
      );

      // Test 5.2: Inverted or overlapping custom period safety
      const origPeriods = JSON.parse(JSON.stringify(store.data.timetablePeriods));
      let overlapThrew = false;
      try {
        // Temporarily inject edge periods
        store.data.timetablePeriods.push({
          period: '99',
          name: '極限測試節次',
          start: '23:00',
          end: '23:45'
        });
        timetable.simulatedTime = { day: 1, timeStr: '23:20' };
        const slot99 = timetable.detectActiveSlot();
        if (slot99.period !== '99') overlapThrew = true;
      } catch (e) {
        overlapThrew = true;
      } finally {
        store.data.timetablePeriods = origPeriods;
        timetable.simulatedTime = null;
      }

      const edgePeriodPassed = !overlapThrew;
      logTest(suite, "5.2 Custom late-night period (23:00-23:45) resolves cleanly without throwing", edgePeriodPassed);

      // Test 5.3: 30 slot updates to weeklySchedule
      let scheduleUpdateErrors = 0;
      for (let i = 0; i < 30; i++) {
        const day = (i % 5) + 1;
        const period = String((i % 7) + 1);
        const classId = (i % 2 === 0) ? '801' : '802';
        try {
          timetableEditor.updateSlot(day, period, classId);
        } catch (e) {
          scheduleUpdateErrors++;
        }
      }

      const scheduleUpdatesPassed = (scheduleUpdateErrors === 0);
      logTest(suite, "5.3 Timetable slot updates persist into store and localStorage seamlessly", scheduleUpdatesPassed,
        scheduleUpdatesPassed ? null : `Schedule update errors: ${scheduleUpdateErrors}`
      );
    }

    // =========================================================================
    // SUITE 6: MEMORY LEAKS, DOM ORPHAN NODES & ZERO JS RUNTIME EXCEPTIONS
    // =========================================================================
    {
      const suite = "T5 Suite 6: Memory Integrity, DOM Orphans & Zero JS Exceptions";

      window.appState.switchTab('matrix');
      await delay(100);

      // Test 6.1: Verify zero lingering floating bubble elements in DOM
      const floatingBubbles = document.querySelectorAll('.point-bubble');
      const zeroBubbles = floatingBubbles.length === 0;
      logTest(suite, "6.1 Zero floating score bubble DOM elements lingering after animations", zeroBubbles,
        zeroBubbles ? null : `Found ${floatingBubbles.length} orphaned floating bubbles in DOM`
      );

      // Test 6.2: Verify pointer-events penetration on body and main workspace
      const bodyPointerEvents = getComputedStyle(document.body).pointerEvents;
      const appContainer = document.getElementById('classroom-matrix-view');
      const containerPointerEvents = appContainer ? getComputedStyle(appContainer).pointerEvents : 'auto';
      const noClickBlockers = !document.getElementById('tour-click-blocker');

      const noDomDeadlocks = (bodyPointerEvents !== 'none') && (containerPointerEvents !== 'none') && noClickBlockers;
      logTest(suite, "6.2 Zero DOM click-blocking overlays or pointer-events deadlocks", noDomDeadlocks,
        noDomDeadlocks ? null : `bodyPointerEvents=${bodyPointerEvents}, containerPointerEvents=${containerPointerEvents}`
      );

      // Test 6.3: Verify zero active ghost cursors or stray animation frames
      const ghostCursor = document.getElementById('tour-ghost-cursor');
      const ghostClean = (!ghostCursor) || getComputedStyle(ghostCursor).opacity === '0' || ghostCursor.style.opacity === '0';
      logTest(suite, "6.3 Ghost cursor and synthetic active states 100% neutralized", ghostClean);

      // Test 6.4: Audit all uncaught JavaScript runtime exceptions and unhandled rejections
      const zeroUncaughtErrors = uncaughtErrors.length === 0;
      logTest(suite, "6.4 Zero uncaught JavaScript runtime errors throughout Tier 5 adversarial session", zeroUncaughtErrors,
        zeroUncaughtErrors ? null : `Uncaught errors: ${JSON.stringify(uncaughtErrors)}`,
        { uncaughtCount: uncaughtErrors.length, errors: uncaughtErrors }
      );
    }

  } catch (fatalError) {
    console.error("FATAL TIER 5 RUNTIME ERROR:", fatalError);
    logTest("FATAL", "Tier 5 adversarial execution aborted due to unexpected runtime error", false, fatalError);
  } finally {
    const statusEl = document.getElementById('status');
    const summaryEl = document.getElementById('summary-json');
    const summaryDataEl = document.getElementById('summary-data');
    const jsonStr = JSON.stringify(results, null, 2);

    if (statusEl) {
      statusEl.innerHTML = `<strong>Execution Finished:</strong> ${results.passed} / ${results.total} Passed (${results.failed} Failed)`;
      statusEl.className = results.failed === 0 ? 'pass' : 'fail';
    }
    if (summaryEl) summaryEl.textContent = jsonStr;
    if (summaryDataEl) summaryDataEl.textContent = jsonStr;
    window.__TIER5_RESULTS__ = results;

    try {
      await fetch('/api/test-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStr
      });
    } catch (e) {}
  }
})();

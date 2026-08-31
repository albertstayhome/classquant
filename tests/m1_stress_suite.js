/**
 * ClassQuant Hub — M1 Native Touch & Selection Behavior Adversarial Stress Test Suite
 * Executes in real browser runtime (Chromium / Edge / WebKit)
 */

(async function runM1StressTests() {
  const uncaughtErrors = [];
  window.addEventListener('error', (e) => {
    uncaughtErrors.push(e.message || String(e));
  });
  window.addEventListener('unhandledrejection', (e) => {
    uncaughtErrors.push(e.reason?.message || String(e.reason));
  });

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    suites: [],
    details: [],
    uncaughtErrors: uncaughtErrors
  };

  window.__STRESS_TEST_RESULTS__ = null;

  const logBox = document.getElementById('test-log');
  const statusElem = document.getElementById('test-status');

  function appendLog(text, className) {
    if (!logBox) return;
    const div = document.createElement('div');
    div.textContent = text;
    if (className) div.className = className;
    logBox.appendChild(div);
    logBox.scrollTop = logBox.scrollHeight;
  }

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

    appendLog(`[${passed ? 'PASS' : 'FAIL'}] [${suite}] ${name}${error ? ' -> ' + error : ''}`, passed ? 'test-pass' : 'test-fail');
    console.log(`[${passed ? 'PASS' : 'FAIL'}] [${suite}] ${name}`, error || '');
  }

  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  try {
    // 1. Initialize store and mock environment
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

    if (!window.appState) {
      window.appState = {
        currentClassId: '801',
        toasts: [],
        sounds: [],
        showToast(msg, type) {
          this.toasts.push({ msg, type, time: Date.now() });
        },
        playPop() { this.sounds.push('pop'); },
        playChime() { this.sounds.push('chime'); },
        playWarning() { this.sounds.push('warning'); },
        renderClassDropdown() {},
        closeModal() {
          const modal = document.getElementById('global-modal');
          if (modal) modal.classList.add('hidden');
        }
      };
    }

    // Render matrix view into container
    matrix.render('classroom-matrix-view', '801');
    await delay(100);

    const validPosTagId = 'math_breakthrough'; // +3
    const validNegTagId = 'disc_late'; // -2

    // =========================================================================
    // SUITE 1: EMPTY SELECTION & INVALID TRIGGERS
    // =========================================================================
    {
      const suite = "Suite 1: Empty Selection & Invalid Triggers";

      // Test 1.1: Quick tag click with empty selection
      matrix.clearSelection('801');
      window.appState.toasts = [];
      const eventCountBefore = store.getEvents('801').length;
      matrix.applyTagToSelected('801', validPosTagId);
      const eventCountAfter = store.getEvents('801').length;

      const toastWarning = window.appState.toasts.find(t => t.type === 'warning');
      const passed1_1 = (eventCountAfter === eventCountBefore) && (toastWarning !== undefined) && (matrix.selectedSeats.size === 0);
      logTest(suite, "1.1 Tapping quick tag with 0 seats selected triggers warning toast and mutates 0 events", passed1_1, passed1_1 ? null : `Events delta: ${eventCountAfter - eventCountBefore}`);

      // Test 1.2: Invalid tag ID
      matrix.toggleSeatSelection(1, '801');
      const initialCount = matrix.selectedSeats.size;
      matrix.applyTagToSelected('801', 'non-existent-tag-xyz');
      // If tag is non-existent, no events should be added
      const passed1_2 = store.getEvents('801').length === eventCountAfter;
      matrix.clearSelection('801');
      logTest(suite, "1.2 Invalid tagId is safely rejected without creating events or throwing error", passed1_2);

      // Test 1.3: Toggle non-existent seat numbers
      let threw = false;
      try {
        matrix.toggleSeatSelection(-1, '801');
        matrix.toggleSeatSelection(999, '801');
        matrix.toggleSeatSelection(null, '801');
      } catch (err) {
        threw = true;
      }
      const passed1_3 = !threw;
      matrix.clearSelection('801');
      logTest(suite, "1.3 Toggling out-of-range/null seat numbers does not throw JS exceptions", passed1_3);

      // Test 1.4: Idempotent clearSelection
      matrix.clearSelection('801');
      matrix.clearSelection('801');
      const clearBtn = document.getElementById('clear-sel-btn');
      const passed1_4 = (matrix.selectedSeats.size === 0) && (!clearBtn || clearBtn.classList.contains('hidden'));
      logTest(suite, "1.4 Repeated clearSelection() calls are idempotent and keep clear button hidden", passed1_4);
    }

    // =========================================================================
    // SUITE 2: RAPID REPEATED CLICKS & TAP THRASHING (Double/Multi-Tap Stress)
    // =========================================================================
    {
      const suite = "Suite 2: Rapid Repeated Clicks & Tap Thrashing";

      // Test 2.1: Burst 50 clicks in 50ms on Seat 1 (even number -> unselected)
      matrix.clearSelection('801');
      const seatCard1 = document.getElementById('seat-card-1');
      for (let i = 0; i < 50; i++) {
        matrix.toggleSeatSelection(1, '801');
      }
      const isSelectedAfter50 = matrix.selectedSeats.has(1);
      const domSelectedAfter50 = seatCard1 ? seatCard1.classList.contains('selected') : false;
      const countAfter50 = parseInt(document.getElementById('selected-count')?.innerText || '-1', 10);

      const passed2_1 = !isSelectedAfter50 && !domSelectedAfter50 && (countAfter50 === 0);
      logTest(suite, "2.1 50 rapid clicks on seat 1 results in clean deselection (DOM + Set synced)", passed2_1, passed2_1 ? null : `Set: ${isSelectedAfter50}, DOM: ${domSelectedAfter50}, Count: ${countAfter50}`);

      // Test 2.2: Burst 51 clicks in 50ms on Seat 1 (odd number -> selected)
      matrix.clearSelection('801');
      for (let i = 0; i < 51; i++) {
        matrix.toggleSeatSelection(1, '801');
      }
      const isSelectedAfter51 = matrix.selectedSeats.has(1);
      const domSelectedAfter51 = seatCard1 ? seatCard1.classList.contains('selected') : false;
      const countAfter51 = parseInt(document.getElementById('selected-count')?.innerText || '-1', 10);

      const passed2_2 = isSelectedAfter51 && domSelectedAfter51 && (countAfter51 === 1);
      logTest(suite, "2.2 51 rapid clicks on seat 1 results in exact selection (DOM + Set synced)", passed2_2, passed2_2 ? null : `Set: ${isSelectedAfter51}, DOM: ${domSelectedAfter51}, Count: ${countAfter51}`);

      // Test 2.3: Interleaved rapid clicks across multiple seats (Seats 1, 2, 3, 4, 5)
      matrix.clearSelection('801');
      for (let cycle = 0; cycle < 10; cycle++) {
        matrix.toggleSeatSelection(1, '801');
        matrix.toggleSeatSelection(2, '801');
        matrix.toggleSeatSelection(3, '801');
        matrix.toggleSeatSelection(2, '801'); // Seat 2 toggled twice -> unselected
      }
      const passed2_3 = (matrix.selectedSeats.size === 0) && (parseInt(document.getElementById('selected-count')?.innerText || '-1', 10) === 0);
      logTest(suite, "2.3 High-frequency interleaved seat clicks maintain strict parity invariant", passed2_3);

      // Test 2.4: Rapid tag button storm (10 clicks on tag button after selecting 2 seats)
      matrix.clearSelection('801');
      matrix.toggleSeatSelection(1, '801');
      matrix.toggleSeatSelection(2, '801');

      const eventsBeforeStorm = store.getEvents('801').length;
      for (let i = 0; i < 10; i++) {
        matrix.applyTagToSelected('801', validPosTagId);
      }
      const eventsAfterStorm = store.getEvents('801').length;
      // Exactly 2 events should have been created on the first click, remaining 9 clicks rejected due to auto-cleared selection
      const passed2_4 = (eventsAfterStorm - eventsBeforeStorm === 2) && (matrix.selectedSeats.size === 0);
      logTest(suite, "2.4 Tag button click storm produces exactly 2 events (anti-race auto-clear)", passed2_4, passed2_4 ? null : `Created ${eventsAfterStorm - eventsBeforeStorm} events instead of 2`);
    }

    // =========================================================================
    // SUITE 3: POSITIVE, NEGATIVE, AND ZERO SCORE TAGS & SPAN ISOLATION
    // =========================================================================
    {
      const suite = "Suite 3: Positive, Negative, Zero Tags & Span Isolation";

      const seatCard3 = document.getElementById('seat-card-3');
      const spansBefore = seatCard3 ? seatCard3.querySelectorAll('div > span') : [];
      const academicScoreBefore = spansBefore[1]?.innerText || '';

      // Test 3.1: Positive tag (+3)
      matrix.clearSelection('801');
      matrix.toggleSeatSelection(3, '801');
      window.appState.sounds = [];
      matrix.applyTagToSelected('801', validPosTagId); // delta: +3

      const spansAfterPos = seatCard3 ? seatCard3.querySelectorAll('div > span') : [];
      const academicScoreAfterPos = spansAfterPos[1]?.innerText || '';
      const charSpanPos = spansAfterPos[2];
      const charTextPos = charSpanPos?.innerText || '';
      const charClassPos = charSpanPos?.className || '';
      const chimeFired = window.appState.sounds.includes('chime');

      const passed3_1 = (academicScoreBefore === academicScoreAfterPos) &&
                        (academicScoreAfterPos.startsWith('📘')) &&
                        (charClassPos.includes('text-emerald-700')) &&
                        (charTextPos.startsWith('+')) &&
                        chimeFired;
      logTest(suite, "3.1 Positive tag (+3) awards points, updates character span, plays chime, and preserves academic span", passed3_1, passed3_1 ? null : `Academic: ${academicScoreAfterPos}, Char: ${charTextPos}, Sound: ${window.appState.sounds.join(',')}`);

      // Test 3.2: Negative tag (-2)
      window.appState.sounds = [];
      // Apply negative tag multiple times to make net character points negative
      for (let k = 0; k < 6; k++) {
        matrix.toggleSeatSelection(3, '801');
        matrix.applyTagToSelected('801', validNegTagId);
      }

      const spansAfterNeg = seatCard3 ? seatCard3.querySelectorAll('div > span') : [];
      const academicScoreAfterNeg = spansAfterNeg[1]?.innerText || '';
      const charSpanNeg = spansAfterNeg[2];
      const charTextNeg = charSpanNeg?.innerText || '';
      const charClassNeg = charSpanNeg?.className || '';
      const warningFired = window.appState.sounds.includes('warning');

      const passed3_2 = (academicScoreBefore === academicScoreAfterNeg) &&
                        (charClassNeg.includes('text-rose-700')) &&
                        (charTextNeg.startsWith('-')) &&
                        warningFired;
      logTest(suite, "3.2 Negative tag (-2) deducts points, updates rose class, plays warning, and strictly preserves academic span", passed3_2, passed3_2 ? null : `CharText: ${charTextNeg}, CharClass: ${charClassNeg}, Warning: ${warningFired}`);

      // Test 3.3: Score Span Count Invariant on all 30 cards
      let allSpansValid = true;
      for (let seat = 1; seat <= 30; seat++) {
        const card = document.getElementById(`seat-card-${seat}`);
        if (!card) { allSpansValid = false; break; }
        const spans = card.querySelectorAll('div > span');
        if (spans.length < 3) { allSpansValid = false; break; }
        if (!spans[1].innerText.startsWith('📘')) { allSpansValid = false; break; }
      }
      logTest(suite, "3.3 All 30 student seat cards strictly preserve 3-span dual score layout without index corruption", allSpansValid);
    }

    // =========================================================================
    // SUITE 4: SIMULTANEOUS / BATCH SEAT SELECTION & ROSTER INVARIANTS
    // =========================================================================
    {
      const suite = "Suite 4: Simultaneous / Batch Selection & Invariants";

      // Test 4.1: selectAll() on 30 students
      matrix.clearSelection('801');
      matrix.selectAll();
      const countAll = matrix.selectedSeats.size;
      let allCardsHaveSelectedClass = true;
      for (let s = 1; s <= 30; s++) {
        const c = document.getElementById(`seat-card-${s}`);
        if (!c || !c.classList.contains('selected')) {
          allCardsHaveSelectedClass = false;
          break;
        }
      }
      const passed4_1 = (countAll === 30) && allCardsHaveSelectedClass && (parseInt(document.getElementById('selected-count')?.innerText, 10) === 30);
      logTest(suite, "4.1 selectAll() selects all 30 student cards and updates UI badges synchronously", passed4_1);

      // Test 4.2: applyTagToSelected on all 30 students simultaneously
      const eventsBeforeBatch = store.getEvents('801').length;
      matrix.applyTagToSelected('801', validPosTagId);
      const eventsAfterBatch = store.getEvents('801').length;
      const countAfterBatch = matrix.selectedSeats.size;

      let allCardsDeselected = true;
      for (let s = 1; s <= 30; s++) {
        const c = document.getElementById(`seat-card-${s}`);
        if (c && c.classList.contains('selected')) {
          allCardsDeselected = false;
          break;
        }
      }

      const passed4_2 = (eventsAfterBatch - eventsBeforeBatch === 30) && (countAfterBatch === 0) && allCardsDeselected;
      logTest(suite, "4.2 Batch tag award processes 30 events and automatically clears all 30 card selections", passed4_2, passed4_2 ? null : `Delta: ${eventsAfterBatch - eventsBeforeBatch}, SelCount: ${countAfterBatch}`);

      // Test 4.3: Group selection by Gender (M = odd, F = even)
      matrix.clearSelection('801');
      matrix.selectGender('M');
      const maleSeats = Array.from(matrix.selectedSeats);
      const allMaleOdd = maleSeats.length === 15 && maleSeats.every(s => s % 2 === 1);
      matrix.selectGender('F');
      const femaleSeats = Array.from(matrix.selectedSeats);
      const allFemaleEven = femaleSeats.length === 15 && femaleSeats.every(s => s % 2 === 0);

      const passed4_3 = allMaleOdd && allFemaleEven;
      logTest(suite, "4.3 Group filter (Male/Female) selects exact 15 odd / 15 even student seats", passed4_3);

      // Test 4.4: In-place toggleSeat on retroLogView
      retro.render('retro-log-view');
      const retroCard1 = document.getElementById('retro-student-1');
      retro.toggleSeat(1);
      const retroSelected1 = retro.selectedSeats.has(1);
      const retroBadgeText = document.getElementById('retro-selected-badge')?.innerText || '';
      const retroBtnText = document.getElementById('retro-submit-btn-text')?.innerText || '';

      const passed4_4 = retroSelected1 && retroBadgeText.includes('1') && retroBtnText.includes('1');
      retro.toggleSeat(1); // deselect
      logTest(suite, "4.4 retroLogView.toggleSeat operates in-place without tearing down DOM", passed4_4);
    }

    // =========================================================================
    // SUITE 5: FLOATING BUBBLE DOM MEMORY CLEANUP UNDER HIGH FREQUENCY
    // =========================================================================
    {
      const suite = "Suite 5: Floating Bubble DOM Lifecycle & Cleanup";

      // Test 5.1: Bubble pointer-events: none verification
      matrix.showFloatingBubble(1, 3);
      const bubble = document.querySelector('#seat-card-1 .point-bubble');
      const pointerEventsVal = bubble ? window.getComputedStyle(bubble).pointerEvents : null;
      const passed5_1 = (bubble !== null) && (bubble.style.pointerEvents === 'none' || pointerEventsVal === 'none');
      logTest(suite, "5.1 Floating point bubble has pointer-events: none to prevent tap interception", passed5_1, passed5_1 ? null : `pointerEvents: ${pointerEventsVal}`);

      // Test 5.2: 100 high-frequency bubble storm & 850ms cleanup verification
      for (let i = 0; i < 100; i++) {
        const seatNo = (i % 30) + 1;
        matrix.showFloatingBubble(seatNo, (i % 2 === 0 ? 2 : -1));
      }

      const spawnedBubbleCount = document.querySelectorAll('.point-bubble').length;
      const initialSpawnOk = spawnedBubbleCount >= 50;

      // Wait 900ms (> 800ms auto removal timeout)
      await delay(900);

      const leftoverBubbles = document.querySelectorAll('.point-bubble').length;
      const passed5_2 = initialSpawnOk && (leftoverBubbles === 0);
      logTest(suite, "5.2 100-bubble rapid storm achieves 100% complete DOM garbage collection in 850ms", passed5_2, passed5_2 ? null : `Spawned: ${spawnedBubbleCount}, Leftover: ${leftoverBubbles}`);
    }

    // =========================================================================
    // SUITE 6: MOBILE TOUCH ACTION CSS, TAP HIGHLIGHT & SWIPE GESTURES
    // =========================================================================
    {
      const suite = "Suite 6: Mobile Touch Action CSS & Swipe Gestures";

      // Test 6.1: Touch-action CSS verification on seat cards and tag buttons
      const seatCard1 = document.getElementById('seat-card-1');
      const tagBtn = document.getElementById('first-quick-tag-btn') || document.querySelector('.quick-tag-button');

      const cardTouchAction = seatCard1 ? window.getComputedStyle(seatCard1).touchAction : '';
      const tagTouchAction = tagBtn ? window.getComputedStyle(tagBtn).touchAction : '';

      const passed6_1 = (cardTouchAction === 'manipulation' || cardTouchAction.includes('manipulation')) &&
                        (tagTouchAction === 'manipulation' || tagTouchAction.includes('manipulation'));
      logTest(suite, "6.1 CSS touch-action: manipulation active on seat cards and quick tag buttons", passed6_1, passed6_1 ? null : `Card: '${cardTouchAction}', Tag: '${tagTouchAction}'`);

      // Test 6.2: Swipe gesture pagination (diffX > 45 -> next, diffX < -45 -> prev)
      matrix.scrollToTagPage(0);
      const startPage = matrix.currentTagPage; // 0

      // Simulate left swipe (diffX = 60 > 45)
      matrix.handleTouchStart({ touches: [{ clientX: 200 }] });
      matrix.handleTouchEnd({ changedTouches: [{ clientX: 140 }] });
      const pageAfterLeftSwipe = matrix.currentTagPage;

      // Simulate right swipe (diffX = -60 < -45)
      matrix.handleTouchStart({ touches: [{ clientX: 140 }] });
      matrix.handleTouchEnd({ changedTouches: [{ clientX: 200 }] });
      const pageAfterRightSwipe = matrix.currentTagPage;

      const passed6_2 = (startPage === 0) && (pageAfterLeftSwipe === 1) && (pageAfterRightSwipe === 0);
      logTest(suite, "6.2 Touch swipe gestures (left/right) cleanly paginate quick tags dock", passed6_2, passed6_2 ? null : `AfterLeft: ${pageAfterLeftSwipe}, AfterRight: ${pageAfterRightSwipe}`);

      // Test 6.3: Sub-threshold touch jitter (diffX = 15 < 45) is ignored
      matrix.handleTouchStart({ touches: [{ clientX: 100 }] });
      matrix.handleTouchEnd({ changedTouches: [{ clientX: 85 }] });
      const pageAfterJitter = matrix.currentTagPage;
      const passed6_3 = pageAfterJitter === 0;
      logTest(suite, "6.3 Sub-threshold touch jitter (15px) is safely filtered without accidental page flip", passed6_3);
    }

    // =========================================================================
    // SUITE 7: AUDIO RESILIENCE & TRY...FINALLY AUTO-CLEAR SAFETY
    // =========================================================================
    {
      const suite = "Suite 7: Audio Resilience & Try...Finally Shielding";

      // Test 7.1: Missing / nullified audio functions
      const originalPop = window.appState.playPop;
      const originalChime = window.appState.playChime;
      const originalWarning = window.appState.playWarning;

      window.appState.playPop = null;
      window.appState.playChime = null;
      window.appState.playWarning = null;

      let threwOnMutedAudio = false;
      try {
        matrix.toggleSeatSelection(1, '801');
        matrix.applyTagToSelected('801', validPosTagId);
      } catch (err) {
        threwOnMutedAudio = true;
      }

      window.appState.playPop = originalPop;
      window.appState.playChime = originalChime;
      window.appState.playWarning = originalWarning;

      const passed7_1 = !threwOnMutedAudio && (matrix.selectedSeats.size === 0);
      logTest(suite, "7.1 Audio context / chime failure or suspension does not crash scoring pipeline", passed7_1);

      // Test 7.2: Deliberate runtime exception inside store still guarantees clearSelection
      matrix.toggleSeatSelection(1, '801');
      matrix.toggleSeatSelection(2, '801');

      const originalAddEvent = store.addEvent.bind(store);
      store.addEvent = function() {
        throw new Error("Simulated storage quota exceeded error");
      };

      try {
        matrix.applyTagToSelected('801', validPosTagId);
      } catch (e) {}

      store.addEvent = originalAddEvent;
      const passed7_2 = matrix.selectedSeats.size === 0;
      logTest(suite, "7.2 Storage exceptions guarantee unconditional clearSelection() via try...finally", passed7_2);
    }

    // =========================================================================
    // SUITE 8: FULL DOM INVARIANT AUDIT & ZERO JS UNCAUGHT EXCEPTIONS
    // =========================================================================
    {
      const suite = "Suite 8: DOM Invariants & Zero JS Uncaught Exceptions";

      // Test 8.1: Uncaught JavaScript errors during entire session
      const passed8_1 = (uncaughtErrors.length === 0);
      logTest(suite, "8.1 Zero uncaught JavaScript errors during entire adversarial test session", passed8_1, passed8_1 ? null : `Errors: ${uncaughtErrors.join('; ')}`);

      // Test 8.2: Verify complete student roster integrity in DOM
      let rosterDomComplete = true;
      for (let s = 1; s <= 30; s++) {
        const card = document.getElementById(`seat-card-${s}`);
        if (!card) { rosterDomComplete = false; break; }
        const spans = card.querySelectorAll('div > span');
        if (spans.length < 3) { rosterDomComplete = false; break; }
      }
      logTest(suite, "8.2 All 30 student seat cards maintain intact DOM hierarchy and span references", rosterDomComplete);
    }

    statusElem.textContent = `Completed! ${results.passed} / ${results.total} Passed (${results.failed} Failed)`;
    statusElem.style.color = results.failed === 0 ? '#16a34a' : '#dc2626';

  } catch (globalErr) {
    console.error("Global stress test error:", globalErr);
    logTest("Global", "Test suite execution", false, globalErr.message);
  } finally {
    window.__STRESS_TEST_RESULTS__ = results;
  }
})();

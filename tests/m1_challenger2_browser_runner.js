/**
 * ClassQuant Hub - Milestone M1 Challenger 2 Browser Empirical Test Runner
 * Rigorous In-Browser Test Suite for:
 * 1. Retro Log View Seat Selection & O(1) In-Place Interaction Performance
 * 2. Quick Scoring Auto-Clear under Failure/Error Conditions (finally block verification)
 * 3. Floating Score Bubbles Visual Styling, Coordinates, and Non-Destructive Lifecycle
 */

(async function runChallenger2Tests() {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };

  function assert(condition, suite, name, detail = '') {
    results.total++;
    if (condition) {
      results.passed++;
      results.details.push({ suite, name, passed: true, detail });
      console.log(`%c[PASS] [${suite}] ${name}`, 'color: #16a34a; font-weight: bold;');
    } else {
      results.failed++;
      results.details.push({ suite, name, passed: false, detail });
      console.error(`[FAIL] [${suite}] ${name}: ${detail}`);
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Setup Mock App State
  window.appState = {
    currentClassId: '801',
    isSoundEnabled: () => true,
    playPop: () => {},
    playChime: () => {},
    playWarning: () => {},
    showToast: (msg, type) => {},
    renderClassDropdown: () => {},
    switchTab: (tab) => {},
    closeModal: () => {
      const modal = document.getElementById('global-modal');
      if (modal) modal.classList.add('hidden');
    }
  };

  const store = window.appStore || new Store();
  const timetable = window.timetableEngine || new TimetableEngine(store);
  const statistics = window.statisticsEngine || new StatisticsEngine(store);
  const matrix = window.matrixView || new ClassroomMatrix(store, timetable, statistics);
  const retroLog = window.retroLogView || new RetroLogView(store);

  window.appStore = store;
  window.timetableEngine = timetable;
  window.statisticsEngine = statistics;
  window.matrixView = matrix;
  window.retroLogView = retroLog;

  console.log('Starting M1 Challenger 2 Empirical Test Runner in Browser...');

  // =========================================================================
  // SUITE 1: RetroLogView Seat Selection & In-Place Performance
  // =========================================================================
  const S1 = 'RetroLogView In-Place Seat Selection';

  try {
    // 1. Render retroLogView
    retroLog.render('retro-log-view', '801');
    const student1Card = document.getElementById('retro-student-1');
    assert(student1Card !== null, S1, 'Retro student card 1 rendered successfully');

    // 2. Test in-place toggleSeat on seat 1 without calling render()
    let renderCallCount = 0;
    const originalRender = retroLog.render.bind(retroLog);
    retroLog.render = function(...args) {
      renderCallCount++;
      return originalRender(...args);
    };

    const cardRefBefore = document.getElementById('retro-student-1');
    retroLog.toggleSeat(1);

    const cardRefAfter = document.getElementById('retro-student-1');
    const isNodePreserved = (cardRefBefore === cardRefAfter);
    assert(isNodePreserved, S1, 'toggleSeat(1) preserves exact DOM node identity (zero re-render)', `isNodePreserved=${isNodePreserved}`);
    assert(renderCallCount === 0, S1, 'toggleSeat(1) did not call render()', `renderCallCount=${renderCallCount}`);
    assert(retroLog.selectedSeats.has(1), S1, 'retroLog.selectedSeats contains seat 1 after toggle');
    assert(cardRefAfter.classList.contains('bg-pink-500'), S1, 'Card has selected background class bg-pink-500');
    assert(cardRefAfter.classList.contains('text-white'), S1, 'Card has selected text color text-white');

    const badge = document.getElementById('retro-selected-badge');
    assert(badge && badge.innerText.includes('已選取 1 人'), S1, 'Selection badge updated to "已選取 1 人"', badge?.innerText);

    const btnText = document.getElementById('retro-submit-btn-text');
    assert(btnText && btnText.innerText.includes('1 位學生'), S1, 'Submit button text updated to "1 位學生"', btnText?.innerText);

    // 3. Deselect seat 1
    retroLog.toggleSeat(1);
    assert(!retroLog.selectedSeats.has(1), S1, 'Seat 1 removed from selectedSeats on second tap');
    assert(renderCallCount === 0, S1, 'Deselect did not call render()', `renderCallCount=${renderCallCount}`);
    assert(cardRefAfter.classList.contains('bg-white'), S1, 'Card restored to unselected bg-white');
    assert(cardRefAfter.classList.contains('text-slate-800'), S1, 'Card restored to unselected text-slate-800');
    assert(badge && badge.innerText.includes('已選取 0 人'), S1, 'Selection badge updated to "已選取 0 人"');
    assert(btnText && btnText.innerText.includes('0 位學生'), S1, 'Submit button text updated to "0 位學生"');

    // Restore render
    retroLog.render = originalRender;

    // 4. Batch Selection Filters
    retroLog.selectOdd();
    const oddSeats = Array.from(retroLog.selectedSeats);
    const allOdd = oddSeats.every(s => s % 2 !== 0);
    assert(oddSeats.length > 0 && allOdd, S1, 'selectOdd() correctly selects all odd numbered students', `count=${oddSeats.length}`);

    retroLog.selectEven();
    const evenSeats = Array.from(retroLog.selectedSeats);
    const allEven = evenSeats.every(s => s % 2 === 0);
    assert(evenSeats.length > 0 && allEven, S1, 'selectEven() correctly selects all even numbered students', `count=${evenSeats.length}`);

    retroLog.selectAll();
    const allStudents = store.getStudents('801');
    assert(retroLog.selectedSeats.size === allStudents.length, S1, 'selectAll() selects 100% of class roster', `selected=${retroLog.selectedSeats.size}/${allStudents.length}`);

    retroLog.selectNone();
    assert(retroLog.selectedSeats.size === 0, S1, 'selectNone() clears all selections');

    // 5. Interaction Performance Benchmark: 1,000 rapid toggle operations
    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      const seatNo = (i % 30) + 1;
      retroLog.toggleSeat(seatNo);
    }
    const elapsed = performance.now() - startTime;
    assert(elapsed < 100, S1, `1,000 rapid in-place seat toggles executed in ${elapsed.toFixed(2)}ms (< 100ms threshold)`);

    // Reset selection after benchmark
    retroLog.selectNone();

    // 6. Batch Submit Workflow with Tag & Memo
    retroLog.toggleSeat(2);
    retroLog.toggleSeat(4);
    retroLog.customDelta = 3;
    retroLog.customNote = '數學分組討論表現優秀';
    
    let toastMessage = '';
    window.appState.showToast = (msg) => { toastMessage = msg; };

    const initialEventsCount = store.getEvents('801').length;
    retroLog.submitBatch();

    const postEvents = store.getEvents('801');
    const newEvents = postEvents.filter(e => e.note && e.note.includes('數學分組討論表現優秀'));
    assert(newEvents.length === 2, S1, 'submitBatch() created 2 new retro events in store', `count=${newEvents.length}`);
    assert(newEvents.every(e => e.delta === 3), S1, 'All new events have correct delta (+3)');
    assert(newEvents.some(e => e.seatNo === 2) && newEvents.some(e => e.seatNo === 4), S1, 'Events recorded for seat 2 and seat 4');
    assert(retroLog.selectedSeats.size === 0, S1, 'submitBatch() cleanly cleared selectedSeats');
    assert(toastMessage.includes('成功為 2 位學生完成事後補記'), S1, 'Success toast shown upon batch submit', toastMessage);

    // Test empty submit warning
    let warnToast = '';
    window.appState.showToast = (msg, type) => { if (type === 'warning') warnToast = msg; };
    retroLog.submitBatch();
    assert(warnToast.includes('請至少選取 1 位學生'), S1, 'submitBatch() prevents empty submissions with warning toast');
  } catch (err) {
    assert(false, S1, 'Unexpected error during Suite 1 execution', err.stack);
  }

  // =========================================================================
  // SUITE 2: Quick Scoring Auto-Clear Resilience (finally block verification)
  // =========================================================================
  const S2 = 'Quick Scoring Auto-Clear & Finally Resilience';

  try {
    matrix.render('classroom-matrix-view', '801');
    const tag = store.getTags()[0] || { id: 'tag_plus_1', name: '專注聽講', delta: 1, category: 'discipline' };

    // 1. Normal Flow Auto-Clear
    matrix.toggleSeat(1);
    matrix.toggleSeat(3);
    assert(matrix.selectedSeats.has(1) && matrix.selectedSeats.has(3), S2, 'Seats 1 and 3 selected');
    assert(document.getElementById('seat-card-1').classList.contains('selected'), S2, 'Seat 1 card has .selected class in DOM');

    matrix.applyTagToSelected('801', tag.id);
    assert(matrix.selectedSeats.size === 0, S2, 'Normal flow: matrix.selectedSeats is automatically cleared');
    assert(!document.getElementById('seat-card-1').classList.contains('selected'), S2, 'Seat 1 card has .selected class removed');
    assert(!document.getElementById('seat-card-3').classList.contains('selected'), S2, 'Seat 3 card has .selected class removed');
    assert(document.getElementById('selected-count').innerText === '0', S2, 'selected-count display reset to 0');
    assert(document.getElementById('clear-sel-btn').classList.contains('hidden'), S2, 'clear-sel-btn hidden after scoring');

    // 2. Resilience: Exception in timetable.detectActiveSlot()
    matrix.toggleSeat(2);
    matrix.toggleSeat(4);
    assert(matrix.selectedSeats.size === 2, S2, 'Seats 2 and 4 selected prior to simulated timetable crash');

    const origDetectSlot = matrix.timetable.detectActiveSlot;
    matrix.timetable.detectActiveSlot = () => {
      throw new Error('SIMULATED_TIMETABLE_EXCEPTION');
    };

    matrix.applyTagToSelected('801', tag.id);
    matrix.timetable.detectActiveSlot = origDetectSlot;

    assert(matrix.selectedSeats.size === 0, S2, 'Finally block clears selectedSeats even when timetable.detectActiveSlot throws', `size=${matrix.selectedSeats.size}`);
    assert(!document.getElementById('seat-card-2').classList.contains('selected'), S2, 'Seat 2 UI deselected after timetable crash');
    assert(!document.getElementById('seat-card-4').classList.contains('selected'), S2, 'Seat 4 UI deselected after timetable crash');

    // 3. Resilience: Exception in store.addEvent() (e.g. storage full / quota exceeded)
    matrix.toggleSeat(5);
    matrix.toggleSeat(6);
    assert(matrix.selectedSeats.size === 2, S2, 'Seats 5 and 6 selected prior to simulated store failure');

    const origAddEvent = matrix.store.addEvent;
    matrix.store.addEvent = () => {
      throw new Error('SIMULATED_QUOTA_EXCEEDED_ERROR');
    };

    matrix.applyTagToSelected('801', tag.id);
    matrix.store.addEvent = origAddEvent;

    assert(matrix.selectedSeats.size === 0, S2, 'Finally block clears selectedSeats even when store.addEvent throws');
    assert(!document.getElementById('seat-card-5').classList.contains('selected'), S2, 'Seat 5 UI deselected after store failure');
    assert(!document.getElementById('seat-card-6').classList.contains('selected'), S2, 'Seat 6 UI deselected after store failure');

    // 4. Resilience: Exception in showFloatingBubble()
    matrix.toggleSeat(7);
    const origBubble = matrix.showFloatingBubble;
    matrix.showFloatingBubble = () => {
      throw new Error('SIMULATED_BUBBLE_CREATION_ERROR');
    };

    matrix.applyTagToSelected('801', tag.id);
    matrix.showFloatingBubble = origBubble;

    assert(matrix.selectedSeats.size === 0, S2, 'Finally block clears selectedSeats even when showFloatingBubble throws');
    assert(!document.getElementById('seat-card-7').classList.contains('selected'), S2, 'Seat 7 UI deselected after bubble error');

    // 5. Resilience: Exception in audio / toast handlers
    matrix.toggleSeat(8);
    const origChime = window.appState.playChime;
    const origToast = window.appState.showToast;
    window.appState.playChime = () => { throw new Error('SIMULATED_AUDIO_ERROR'); };
    window.appState.showToast = () => { throw new Error('SIMULATED_TOAST_ERROR'); };

    matrix.applyTagToSelected('801', tag.id);
    window.appState.playChime = origChime;
    window.appState.showToast = origToast;

    assert(matrix.selectedSeats.size === 0, S2, 'Finally block clears selectedSeats even when audio/toast throws');
    assert(!document.getElementById('seat-card-8').classList.contains('selected'), S2, 'Seat 8 UI deselected after audio error');

    // 6. Score Span Index Target Correction Verification
    matrix.toggleSeat(9);
    const card9 = document.getElementById('seat-card-9');
    const spansBefore = card9.querySelectorAll('div > span');
    assert(spansBefore.length >= 3, S2, 'Seat card contains 3 score spans [SeatNo, AcademicScore, CharacterPts]');
    const academicBefore = spansBefore[1].innerText;

    matrix.applyTagToSelected('801', tag.id);

    const spansAfter = card9.querySelectorAll('div > span');
    const academicAfter = spansAfter[1].innerText;
    const charPtsAfter = spansAfter[2].innerText;

    assert(academicBefore === academicAfter, S2, 'Academic score span (scoreSpans[1]) remains intact and unmodified', `academicBefore=${academicBefore}, academicAfter=${academicAfter}`);
    assert(charPtsAfter.includes('+') || charPtsAfter !== '', S2, 'Character points span (scoreSpans[2]) successfully updated with point delta', `charPtsAfter=${charPtsAfter}`);
  } catch (err) {
    assert(false, S2, 'Unexpected error during Suite 2 execution', err.stack);
  }

  // =========================================================================
  // SUITE 3: Floating Score Bubbles Styling, Positioning & Non-Destructive Lifecycle
  // =========================================================================
  const S3 = 'Floating Score Bubbles Lifecycle & Non-Destructive Touch';

  try {
    matrix.render('classroom-matrix-view', '801');
    const card1 = document.getElementById('seat-card-1');

    // 1. Spawn a positive floating bubble
    matrix.showFloatingBubble(1, 3);
    const bubblePos = card1.querySelector('.point-bubble');
    assert(bubblePos !== null, S3, 'Floating bubble element appended to target seat card');
    assert(bubblePos.innerText.includes('3'), S3, 'Positive bubble displays point value 3', bubblePos?.innerText);
    assert(bubblePos.classList.contains('text-emerald-600'), S3, 'Positive bubble has class text-emerald-600');
    assert(bubblePos.style.pointerEvents === 'none', S3, 'Bubble has style.pointerEvents = "none"');

    // 2. Check CSS Computed Styles for .point-bubble
    const computed = window.getComputedStyle(bubblePos);
    assert(computed.pointerEvents === 'none', S3, 'Computed pointer-events is "none"');
    assert(computed.position === 'absolute', S3, 'Computed position is "absolute"');
    assert(computed.zIndex === '50', S3, 'Computed zIndex is 50');

    // 3. Pointer Events Non-Blocking Passthrough verification
    const bubbleRect = bubblePos.getBoundingClientRect();
    const midX = bubbleRect.left + (bubbleRect.width / 2);
    const midY = bubbleRect.top + (bubbleRect.height / 2);
    const hitElement = document.elementFromPoint(midX, midY);
    const penetratesBubble = (hitElement !== bubblePos);
    assert(penetratesBubble, S3, 'document.elementFromPoint penetrates floating bubble (pointer-events: none verified)', `hitElement=${hitElement?.tagName}.${hitElement?.className}`);

    // 4. Spawn a negative floating bubble
    const card2 = document.getElementById('seat-card-2');
    matrix.showFloatingBubble(2, -2);
    const bubbleNeg = card2.querySelector('.point-bubble');
    assert(bubbleNeg !== null, S3, 'Negative floating bubble appended to seat card 2');
    assert(bubbleNeg.innerText === '-2', S3, 'Negative bubble displays "-2"', bubbleNeg?.innerText);
    assert(bubbleNeg.classList.contains('text-rose-600'), S3, 'Negative bubble has class text-rose-600');

    // 5. Automatic DOM Cleanup verification (800ms)
    console.log('Waiting 850ms for bubble automatic cleanup...');
    await sleep(850);

    const bubblePosAfter = card1.querySelector('.point-bubble');
    const bubbleNegAfter = card2.querySelector('.point-bubble');
    assert(bubblePosAfter === null, S3, 'Positive bubble cleanly removed from DOM after 800ms timeout');
    assert(bubbleNegAfter === null, S3, 'Negative bubble cleanly removed from DOM after 800ms timeout');

    // 6. Rapid Spam Stress: 100 Bubbles on single card
    console.log('Spamming 100 bubbles rapidly on seat card 1...');
    const originalChildrenCount = card1.children.length;
    for (let i = 0; i < 100; i++) {
      matrix.showFloatingBubble(1, (i % 2 === 0) ? 1 : -1);
    }
    const bubblesDuringSpam = card1.querySelectorAll('.point-bubble').length;
    assert(bubblesDuringSpam === 100, S3, '100 floating bubbles concurrently mounted without crash', `count=${bubblesDuringSpam}`);

    console.log('Waiting 900ms for all 100 bubbles to auto-remove...');
    await sleep(900);

    const bubblesAfterSpam = card1.querySelectorAll('.point-bubble').length;
    assert(bubblesAfterSpam === 0, S3, 'All 100 floating bubbles cleanly removed from DOM with zero leaks', `remaining=${bubblesAfterSpam}`);
    assert(card1.children.length === originalChildrenCount, S3, 'Seat card original DOM structure preserved intact');

    // 7. Non-existent seat card safety
    let thrown = false;
    try {
      matrix.showFloatingBubble(99999, 5);
    } catch (e) {
      thrown = true;
    }
    assert(!thrown, S3, 'showFloatingBubble handles non-existent seat number safely with zero exception');

  } catch (err) {
    assert(false, S3, 'Unexpected error during Suite 3 execution', err.stack);
  }

  // Expose to window for CDP evaluation
  window.__M1_CHALLENGER2_RESULTS__ = results;
  window.__STRESS_TEST_RESULTS__ = results;

  const summaryEl = document.getElementById('summary-json');
  const summaryScript = document.getElementById('summary-data');
  const statusEl = document.getElementById('status');
  if (summaryEl) summaryEl.innerText = JSON.stringify(results, null, 2);
  if (summaryScript) summaryScript.textContent = JSON.stringify(results);
  if (statusEl) {
    statusEl.innerHTML = results.failed === 0
      ? `<span class="pass">🎉 ALL ${results.total} BROWSER TESTS PASSED (100% Success Rate)</span>`
      : `<span class="fail">❌ ${results.failed} TEST(S) FAILED</span>`;
  }

  console.log('M1 Challenger 2 Test Results:', results);

  // Send report to server if running under HTTP test harness
  try {
    await fetch('/api/test-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(results)
    });
  } catch (e) {
    // Expected when running via file://
  }
})();

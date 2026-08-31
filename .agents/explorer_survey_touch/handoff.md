# Survey & Investigation Report: R1 Native Touch & Selection Behavior Restoration

**Working Directory**: d:\class_point_app_dev\.agents\explorer_survey_touch\  
**Target Milestone / Requirement**: R1 (Native Touch & Selection Behavior Restoration for ClassQuant Hub)  
**Date**: 2026-08-30  
**Investigator**: Survey Explorer (explorer_survey_touch)

---

## 1. Observation

Direct observations from codebase inspection of js/matrix.js, js/retroLogView.js, js/app.js, js/tagManager.js, css/styles.css, css/kitty-theme.css, css/custom.css, and index.html:

### A. Student Seat Cards: Rendering, DOM Structure & Event Handlers
- **File & Lines**: js/matrix.js:178-225
- **Container Structure**:
  `html
  <div class="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-6 lg:grid-cols-6 gap-1.5 sm:gap-2.5 mb-4" id="seat-grid-container">
  `
- **Card Element Structure**:
  `html
  <div id="seat-card-"
       class="student-seat-card p-1.5 sm:p-2 rounded-2xl border-2 bg-white border-pink-200 cursor-pointer select-none relative transition-all shadow-sm hover:border-pink-300 "
       onclick="matrixView.toggleSeatSelection(, '')">
    
    <!-- Seat Header: Seat No + Mascot -->
    <div class="flex items-center justify-between mb-0.5">
      <span class="w-5 h-5 rounded-lg bg-pink-100 border border-pink-300 font-black text-[11px] sm:text-xs text-pink-900 flex items-center justify-center shadow-inner">
        
      </span>
      <div class=" !w-5 !h-5 sm:!w-7 sm:!h-7 shrink-0" title=""></div>
    </div>

    <!-- Student Name -->
    <div class="text-xs sm:text-sm font-black truncate text-slate-900 text-center my-0.5 leading-tight">
      
    </div>

    <!-- Unified Dual Score Summary -->
    <div class="flex items-center justify-between text-[9px] sm:text-[11px] font-black pt-0.5 border-t border-pink-100 leading-none">
      <span class="text-blue-700" title="學業均分">??</span>
      <span class="" title="品格常規點數">
        
      </span>
    </div>
  </div>
  `
- **Card Event Attachment**:
  - Attached strictly via inline HTML onclick="matrixView.toggleSeatSelection(, '')".
  - No direct pointerdown, 	ouchstart, or 	ouchend handlers exist on individual cards.
- **CSS Touch & Interaction Rules**:
  - css/styles.css:129-140:
    `css
    .student-seat-card {
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }
    .student-seat-card:active {
      transform: scale(0.95);
    }
    .student-seat-card.selected {
      animation: popIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 0 0 3px #f43f5e, 0 4px 12px rgba(244, 63, 94, 0.25) !important;
    }
    `
  - css/kitty-theme.css:110-126:
    `css
    html[data-theme="kitty"] .student-seat-card {
      background: #ffffff;
      border: 2px solid #ffccd5;
      border-radius: 1.15rem;
      box-shadow: 0 4px 12px rgba(255, 117, 143, 0.08);
    }
    html[data-theme="kitty"] .student-seat-card:hover {
      border-color: #ff4d6d;
      box-shadow: 0 8px 20px rgba(255, 77, 109, 0.18);
    }
    html[data-theme="kitty"] .student-seat-card.selected {
      border-color: #ff2a55 !important;
      box-shadow: 0 0 0 3px rgba(255, 42, 85, 0.35);
      background: #fff0f3 !important;
    }
    `
  - **Deficiency Observed**: Missing 	ouch-action: manipulation; and -webkit-tap-highlight-color: transparent; in .student-seat-card and #seat-grid-container.

---

### B. Selection Management State & Single-Seat Toggle
- **File & Lines**: js/matrix.js:16, 393-445
- **State Definition**:
  	his.selectedSeats = new Set();
- **Toggle Method**:
  `javascript
  toggleSeatSelection(seatNo, classId) {
    if (this.selectedSeats.has(seatNo)) {
      this.selectedSeats.delete(seatNo);
    } else {
      this.selectedSeats.add(seatNo);
      if (window.appState?.playPop) window.appState.playPop();
      if (navigator.vibrate) {
        try { navigator.vibrate(15); } catch(e) {}
      }
    }
    this.updateSelectionUI(classId);
  }
  `
- **UI Update Method (updateSelectionUI)**:
  `javascript
  updateSelectionUI(classId) {
    const students = this.store.getStudents(classId);
    students.forEach(s => {
      const card = document.getElementById(seat-card-);
      if (card) {
        if (this.selectedSeats.has(s.seatNo)) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      }
    });

    const countElem = document.getElementById('selected-count');
    if (countElem) countElem.innerText = this.selectedSeats.size;

    const clearBtn = document.getElementById('clear-sel-btn');
    if (clearBtn) {
      if (this.selectedSeats.size > 0) {
        clearBtn.classList.remove('hidden');
        clearBtn.classList.add('inline-block');
      } else {
        clearBtn.classList.add('hidden');
        clearBtn.classList.remove('inline-block');
      }
    }
  }
  `
- **Deficiency Observed**: updateSelectionUI runs a full loop executing getElementById lookups across all 40+ students on every single seat click, adding unnecessary main-thread overhead. Single-seat toggles can be performed in O(1) by directly mutating #seat-card-.

---

### C. Quick Score Tag Scoring Pipeline & Auto-Clearing
- **File & Lines**: js/matrix.js:447-505
- **Code Flow**:
  `javascript
  applyTagToSelected(classId, tagId) {
    if (this.selectedSeats.size === 0) {
      window.appState.showToast('請先點選學生座號（點一下即可）', 'warning');
      return;
    }

    const tag = this.store.getTags().find(t => t.id === tagId);
    if (!tag) return;

    const activeSlot = this.timetable.detectActiveSlot();
    const period = activeSlot.period !== null ? activeSlot.period : 1;

    let appliedCount = 0;
    const seatsToProcess = Array.from(this.selectedSeats);

    seatsToProcess.forEach(seatNo => {
      this.store.addEvent({
        classId,
        seatNo,
        period,
        tagId: tag.id,
        tagName: tag.name,
        category: tag.category,
        delta: tag.delta,
        severity: tag.severity,
        note: 課堂記點：
      });

      this.showFloatingBubble(seatNo, tag.delta);
      appliedCount++;

      // In-place score update on card
      const card = document.getElementById(seat-card-);
      if (card) {
        const profile = this.stats.getStudentProfile(classId, seatNo);
        if (profile) {
          const charPts = profile.pointsBreakdown.discipline + profile.pointsBreakdown.conflict + profile.pointsBreakdown.social;
          const scoreSpans = card.querySelectorAll('div > span');
          if (scoreSpans.length >= 2) {
            const ptsSpan = scoreSpans[1]; // <--- BUG! scoreSpans[1] is academic score span (??), NOT character score span!
            ptsSpan.className = charPts > 0 ? 'text-emerald-700' : charPts < 0 ? 'text-rose-700' : 'text-slate-500';
            ptsSpan.innerText = ${charPts > 0 ? '+' : ''};
          }
        }
      }
    });

    if (tag.delta > 0 && window.appState?.playChime) {
      window.appState.playChime();
    } else if (tag.delta < 0 && window.appState?.playWarning) {
      window.appState.playWarning();
    }

    window.appState.showToast(? 已為  位同學記錄「 ()」, 'success');
    
    // Auto-clear selection immediately (restoring familiar behavior)
    this.clearSelection();
  }
  `
- **CRITICAL BUG IDENTIFIED (In-place Score Mutation)**:
  - Inside #seat-card-, there are 3 span elements:
    1. scoreSpans[0]: <span class="w-5 h-5 ..."></span> (Seat Number)
    2. scoreSpans[1]: <span class="text-blue-700" title="學業均分">??</span> (Academic Score)
    3. scoreSpans[2]: <span class="..." title="品格常規點數"></span> (Character Score)
  - pplyTagToSelected modified scoreSpans[1], which inadvertently overwrites the **academic score** with character points while leaving scoreSpans[2] unchanged!
- **Auto-Clearing Mechanism**:
  - clearSelection() at line 414:
    `javascript
    clearSelection() {
      this.selectedSeats.clear();
      this.updateSelectionUI(window.appState.currentClassId);
    }
    `
  - It references window.appState.currentClassId instead of allowing a parameterized classId fallback. If window.appState is null/undefined or out of sync, clearSelection() fails to update the correct UI state.

---

### D. Floating Score Bubble Animation & Lifecycle
- **File & Lines**: js/matrix.js:507-519, css/styles.css:152-170
- **Method**:
  `javascript
  showFloatingBubble(seatNo, delta) {
    const card = document.getElementById(seat-card-);
    if (!card) return;

    const bubble = document.createElement('div');
    bubble.className = point-bubble  kitty-stamp-effect;
    bubble.innerText = ${delta > 0 ? '? +' : ''};
    card.appendChild(bubble);

    setTimeout(() => {
      bubble.remove();
    }, 800);
  }
  `
- **CSS Animation**:
  `css
  @keyframes burstParticle {
    0% { opacity: 0; transform: translate(-50%, -20%) scale(0.5); }
    35% { opacity: 1; transform: translate(-50%, -60%) scale(1.35); filter: drop-shadow(0 4px 8px rgba(244, 63, 94, 0.4)); }
    70% { opacity: 0.9; transform: translate(-50%, -85%) scale(1.1); }
    100% { opacity: 0; transform: translate(-50%, -120%) scale(0.9); }
  }

  .point-bubble {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.5rem;
    font-weight: 900;
    pointer-events: none;
    z-index: 50;
    animation: burstParticle 0.85s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  }
  `
- **Bubble Analysis**:
  - pointer-events: none; is properly set so the floating element does not intercept or disrupt subsequent user clicks or touches.
  - The bubble is attached inside #seat-card- (which has position: relative).
  - Auto-cleanup timer (800ms) cleanly removes the element.
  - For negative point deductions (e.g. -1), innerText is simply -1 without a stamp icon (e.g. ?? -1 / ? -1), missing an expressive visual distinction.
  - In saveConflictEvent (matrix.js:880, 887) and quickAwardPicker (matrix.js:770), 	his.render('classroom-matrix-view', classId) was invoked immediately after adding the bubble, instantly destroying the DOM card and truncating the floating animation.

---

### E. Post-Class Retro Log View (etroLogView.js) Full DOM Re-render Issue
- **File & Lines**: js/retroLogView.js:292-300
- **Method**:
  `javascript
  toggleSeat(seatNo) {
    if (this.selectedSeats.has(seatNo)) {
      this.selectedSeats.delete(seatNo);
    } else {
      this.selectedSeats.add(seatNo);
    }
    if (window.appState?.playPop) window.appState.playPop();
    this.render('retro-log-view');
  }
  `
- **Deficiency Observed**: Every seat card click in RetroLogView calls 	his.render('retro-log-view'), completely demolishing and rebuilding the entire DOM tree, causing scroll jump inside the scrollable student grid (max-h-[360px] overflow-y-auto) and significant mobile rendering latency.

---

## 2. Logic Chain

1. **Touch Delay & Dead Clicks on Mobile**:
   - Mobile browsers detect potential double-tap gestures by withholding click events for up to 300ms unless 	ouch-action: manipulation; is explicitly declared.
   - Minor finger drift during a tap gesture on mobile viewports can be misinterpreted as a scroll gesture, dropping the synthetic click entirely if 	ouch-action is unset.
   - Adding 	ouch-action: manipulation; and -webkit-tap-highlight-color: transparent; guarantees immediate native tap dispatch with 0ms gesture wait time.

2. **Single-Seat Selection Latency (O(N) vs O(1))**:
   - Currently, 	oggleSeatSelection invokes updateSelectionUI, which performs 40+ document.getElementById DOM lookups and class manipulations.
   - Mutating #seat-card- directly in O(1) via card.classList.toggle('selected', isSelected) eliminates unnecessary DOM tree traversals, reducing JavaScript execution time to under 1ms per tap.

3. **In-Place Score Corruption via QuerySelector Indexing**:
   - pplyTagToSelected assumes scoreSpans[1] is the character points span, but #seat-card- contains [seatNumberSpan, academicScoreSpan, characterPointsSpan].
   - Modifying scoreSpans[1] corrupts the academic score display (??70) on the student card.
   - Adding explicit identifiers (id="character-score-" / id="academic-score-") ensures deterministic, zero-error DOM updates.

4. **Auto-Clear Selection Lifecycle Resilience**:
   - pplyTagToSelected invokes 	his.clearSelection(), which relies on window.appState.currentClassId.
   - Passing classId explicitly with fallback ensures that selection state is always cleared across all execution contexts.
   - Wrapping scoring logic in 	ry...finally guarantees selection clearing even in edge cases.

5. **Floating Score Bubble Lifecycle Protection**:
   - .point-bubble has pointer-events: none, meaning it does not interfere with touch events.
   - When scoring from inline quick tags (pplyTagToSelected), in-place score mutation allows the bubble to animate smoothly for 800ms without full DOM rebuilds.
   - Enhancing negative stamps with ? or ?? provides immediate visual parity with positive ? stamps.

6. **Retro Log View In-Place Mutation**:
   - Replacing 	his.render('retro-log-view') in etroLogView.toggleSeat(seatNo) with localized class toggling on #retro-student- preserves grid scroll position and eliminates touch lag during post-class logging.

---

## 3. Caveats

- **Web Audio Context Autoplay Policy**: On iOS Safari and Chrome Android, AudioContext starts in a suspended state until the first user interaction. ppState.getAudioContext() resumes the audio context safely on click; audio failure never blocks UI state updates due to comprehensive 	ry...catch blocks.
- **Navigator Haptic Feedback**: 
avigator.vibrate is only supported on Android devices over secure contexts (HTTPS/localhost). Wrapped in 	ry...catch, it fails silently on iOS without degrading performance.
- **Class Switch Consistency**: Full matrix re-rendering (matrixView.render()) must still be preserved for class dropdown changes, roster imports, and timetable automatic perception. In-place mutation applies strictly to selection toggling and quick tag scoring.

---

## 4. Conclusion

All interaction pipelines for R1 have been surveyed with exact code locations, DOM hierarchies, and event flows. The root causes of touch latency, dead clicks, in-place score corruption, and selection clearing edge cases are fully mapped.

### Summary of Key Implementation Proposals:
1. **CSS Touch Hardening (css/styles.css, css/kitty-theme.css)**:
   - Add 	ouch-action: manipulation; -webkit-tap-highlight-color: transparent; to .student-seat-card, #seat-grid-container, and .quick-tag-button.
2. **O(1) Direct Seat Selection Mutation (js/matrix.js)**:
   - In 	oggleSeatSelection(seatNo, classId): directly mutate #seat-card- .selected class and update #selected-count and #clear-sel-btn in O(1).
3. **Fix Score Element Indexing (js/matrix.js)**:
   - Assign dedicated IDs id="character-score-" and id="academic-score-" to score spans.
   - In pplyTagToSelected: update #character-score- directly.
4. **Resilient Auto-Clear (js/matrix.js)**:
   - Ensure clearSelection(classId) takes classId with fallback to window.appState?.currentClassId || '801'.
   - Wrap pplyTagToSelected in 	ry...finally ensuring 	his.clearSelection(classId) always runs.
5. **Floating Bubble Stamp Polish (js/matrix.js)**:
   - Support ? + for positive and ?  for negative point animations.
6. **Retro Log Localized Toggling (js/retroLogView.js)**:
   - Replace full 	his.render() on 	oggleSeat with localized element class toggling to preserve scroll and eliminate mobile jank.

---

## 5. Verification Method

To independently verify these findings and subsequent implementations:

1. **Automated E2E Test Suite**:
   Run the master test harness via PowerShell:
   `powershell
   powershell -ExecutionPolicy Bypass -File tests/run_e2e_tests.ps1
   `
   Verify 100% test pass rate across all 4 Tiers (180 tests).

2. **Direct DOM & Pipeline Inspection**:
   - Inspect js/matrix.js lines 178–225, 393–445, 447–505, and 507–519.
   - Inspect css/styles.css lines 129–170.
   - Inspect js/retroLogView.js lines 292–300.

3. **Touch & Selection Verification**:
   - Tap student seat card -> #seat-card-1 receives .selected class instantly, counter updates to 1.
   - Tap quick tag button -> event added to store, character score span updates in-place, floating bubble appears, selection auto-clears to  .
   - Touch/swipe on 4-tag carousel -> moves smoothly across pages without disrupting student grid state.

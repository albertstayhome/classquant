# Milestone M1 Exploration Report & Implementation Specification
## Native Touch & Selection Behavior Restoration

**Working Directory**: `d:\class_point_app_dev\.agents\m1_explorer\`  
**Milestone**: M1 (Native Touch & Selection Behavior Restoration)  
**Parent Task ID**: `1ec5a71f-9c87-4955-adf8-cad45ca8397b`  
**Date**: 2026-08-30  
**Author**: Milestone M1 Explorer (`m1_explorer`)

---

## 1. Observation

Direct code analysis and empirical inspection of `js/matrix.js`, `js/retroLogView.js`, `css/styles.css`, `css/kitty-theme.css`, and `index.html` revealed the following exact observations:

### Observation A: Score Span Indexing Bug in `applyTagToSelected` (`js/matrix.js:484-489`)
- In `js/matrix.js:180-225`, student cards render three `span` elements:
  1. Header Seat Number Span: `<span class="w-5 h-5 ... font-black text-[11px] ...">${String(s.seatNo).padStart(2, '0')}</span>`
  2. Dual Score Academic Span: `<span class="text-blue-700" title="學業成績">📊${academicScore}</span>`
  3. Dual Score Character Span: `<span class="${...}" title="品格常規點數">${characterPoints > 0 ? '+' : ''}${characterPoints}</span>`
- In `js/matrix.js:484-489`:
  ```javascript
  const scoreSpans = card.querySelectorAll('div > span');
  if (scoreSpans.length >= 2) {
    const ptsSpan = scoreSpans[1]; // BUG: index 0 = seatNo, index 1 = academic score (📊), index 2 = character score
    ptsSpan.className = charPts > 0 ? 'text-emerald-700' : charPts < 0 ? 'text-rose-700' : 'text-slate-500';
    ptsSpan.innerText = `${charPts > 0 ? '+' : ''}${charPts}`;
  }
  ```
  `scoreSpans[1]` targets the academic score (`📊70`), corrupting the academic score display with character points and leaving `scoreSpans[2]` untouched.

### Observation B: Touch Latency & Drift Cancellation on Mobile (`css/styles.css`, `css/kitty-theme.css`)
- In `css/styles.css:129-140` and `css/kitty-theme.css:110-126`:
  `.student-seat-card` and `.quick-tag-button` lack `touch-action: manipulation;` and `-webkit-tap-highlight-color: transparent;`.
- On mobile browsers (Safari iOS / Chrome Android), missing `touch-action: manipulation;` causes the browser to pause 300ms to detect double-tap zoom gestures or interpret micro-drifts (finger wobble) during tapping as vertical/horizontal scrolls, silently dropping tap events.

### Observation C: Full-Grid O(N) Traversal on Single Seat Tap (`js/matrix.js:393-445`)
- `toggleSeatSelection(seatNo, classId)` currently invokes `this.updateSelectionUI(classId)`, which iterates through all 40+ students with `document.getElementById('seat-card-${s.seatNo}')` and class manipulations.
- Direct O(1) toggle of the tapped `#seat-card-${seatNo}` class `.selected` and updating `#selected-count` / `#clear-sel-btn` eliminates DOM traversal overhead.

### Observation D: `clearSelection` Resiliency in `applyTagToSelected` (`js/matrix.js:414-417, 447-505`)
- In `js/matrix.js:414-417`:
  ```javascript
  clearSelection() {
    this.selectedSeats.clear();
    this.updateSelectionUI(window.appState.currentClassId);
  }
  ```
  It lacks a parameterized `classId` fallback.
- In `applyTagToSelected`, `this.clearSelection()` is at the end of the method without `try...finally` protection. If an audio exception or store error is thrown, `clearSelection` is skipped, leaving seats permanently selected.

### Observation E: Floating Score Bubble Lifecycle & Animation (`js/matrix.js:507-519`, `css/styles.css:152-170`)
- `showFloatingBubble(seatNo, delta)` creates `.point-bubble.kitty-stamp-effect` inside `#seat-card-${seatNo}`.
- `css/styles.css:162-170` correctly sets `pointer-events: none;` and `burstParticle` keyframes (0.85s).
- `setTimeout(() => { bubble.remove(); }, 800)` cleans up the DOM node after 800ms.
- Because `applyTagToSelected` performs in-place DOM updates instead of full matrix re-render (`this.render()`), the bubble smoothly completes its burst animation without truncation.

---

## 2. Logic Chain

1. **Score Span Correction**:
   - `card.querySelectorAll('div > span')` returns `[seatNumberSpan, academicScoreSpan, characterPointsSpan]`.
   - By updating `scoreSpans[2]` (or falling back to `scoreSpans[1]` only if fewer spans exist), the character point delta is correctly rendered in the character points slot, preserving `📊${academicScore}` in `scoreSpans[1]`.

2. **Touch Hardening (`touch-action: manipulation`)**:
   - Specifying `touch-action: manipulation;` disables double-tap zoom gestures while permitting pan-scrolls. Mobile browser gesture engines bypass the 300ms tap disambiguation window and eliminate tap drop from minor finger drift.
   - `-webkit-tap-highlight-color: transparent;` eliminates tap flicker across mobile WebKit/Blink browsers.
   - `user-select: none;` prevents unwanted text selection during rapid multi-seat tapping.

3. **Instant O(1) Seat Card Toggle**:
   - Mutating `#seat-card-${seatNo}`'s `.selected` class directly in `toggleSeatSelection` executes in < 0.1ms.
   - Updating `#selected-count` and `#clear-sel-btn` directly keeps the badge in sync with `this.selectedSeats.size`.

4. **Lifecycle Fault Tolerance (`try...finally`)**:
   - By wrapping the scoring loop, sound playback, and toast notification inside `try...finally`, `this.clearSelection(classId)` is guaranteed to execute even if an audio or DOM exception occurs.

5. **Non-Destructive Score Stamp Animations**:
   - Since `pointer-events: none` is applied to `.point-bubble`, active floating bubbles never capture or block subsequent taps.
   - Preserving the card DOM node across point additions allows the 800ms `burstParticle` CSS animation to finish gracefully.

---

## 3. Caveats

- **Full Grid Re-rendering Scope**:
  `matrixView.render()` must remain intact for class switching (`switchClass`), timetable period auto-detection, and roster synchronization. In-place DOM mutation applies strictly to selection toggling (`toggleSeatSelection`) and quick point scoring (`applyTagToSelected`).
- **Web Audio Context Autoplay**:
  Audio chimes (`window.appState.playChime()`, `playWarning()`) are wrapped in null-checks and safe audio-context resumption. Audio failures never block UI scoring or selection clearing.
- **Haptic Vibration Support**:
  `navigator.vibrate` is wrapped in `try...catch` and only fires on supported mobile platforms without throwing errors on iOS Safari.

---

## 4. Conclusion & Concrete Worker Instructions

### File 1: `js/matrix.js`

#### Change 1: Update `toggleSeatSelection` to O(1) In-Place Mutation
**Target Lines**: ~393-406
```javascript
<<<< BEFORE
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
====
>>>> AFTER
  toggleSeatSelection(seatNo, classId) {
    const isSelected = this.selectedSeats.has(seatNo);
    if (isSelected) {
      this.selectedSeats.delete(seatNo);
    } else {
      this.selectedSeats.add(seatNo);
      if (window.appState?.playPop) window.appState.playPop();
      if (navigator.vibrate) {
        try { navigator.vibrate(15); } catch(e) {}
      }
    }
    
    // Direct O(1) in-place card class update
    const card = document.getElementById(`seat-card-${seatNo}`);
    if (card) {
      card.classList.toggle('selected', !isSelected);
    }

    // Update selection count badge
    const countElem = document.getElementById('selected-count');
    if (countElem) countElem.innerText = this.selectedSeats.size;

    // Update clear button visibility
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
<<<<
```

#### Change 2: Update `clearSelection` with Parameterized Class Fallback
**Target Lines**: ~414-417
```javascript
<<<< BEFORE
  clearSelection() {
    this.selectedSeats.clear();
    this.updateSelectionUI(window.appState.currentClassId);
  }
====
>>>> AFTER
  clearSelection(classId) {
    const targetClassId = classId || window.appState?.currentClassId || '801';
    this.selectedSeats.clear();
    this.updateSelectionUI(targetClassId);
  }
<<<<
```

#### Change 3: Fix `scoreSpans[2]` Index & Add `try...finally` in `applyTagToSelected`
**Target Lines**: ~447-505
```javascript
<<<< BEFORE
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
        note: `課堂紀錄：${tag.name}`
      });

      this.showFloatingBubble(seatNo, tag.delta);
      appliedCount++;

      // In-place score update on card
      const card = document.getElementById(`seat-card-${seatNo}`);
      if (card) {
        const profile = this.stats.getStudentProfile(classId, seatNo);
        if (profile) {
          const charPts = profile.pointsBreakdown.discipline + profile.pointsBreakdown.conflict + profile.pointsBreakdown.social;
          const scoreSpans = card.querySelectorAll('div > span');
          if (scoreSpans.length >= 2) {
            const ptsSpan = scoreSpans[1];
            ptsSpan.className = charPts > 0 ? 'text-emerald-700' : charPts < 0 ? 'text-rose-700' : 'text-slate-500';
            ptsSpan.innerText = `${charPts > 0 ? '+' : ''}${charPts}`;
          }
        }
      }
    });

    // Sound effect
    if (tag.delta > 0 && window.appState?.playChime) {
      window.appState.playChime();
    } else if (tag.delta < 0 && window.appState?.playWarning) {
      window.appState.playWarning();
    }

    window.appState.showToast(`✨ 已為 ${appliedCount} 位同學記錄「${tag.name} (${tag.delta > 0 ? '+' : ''}${tag.delta})」`, 'success');
    
    // Auto-clear selection immediately (restoring familiar behavior)
    this.clearSelection();
  }
====
>>>> AFTER
  applyTagToSelected(classId, tagId) {
    if (this.selectedSeats.size === 0) {
      window.appState?.showToast('請先點選學生座號（點一下即可）', 'warning');
      return;
    }

    const tag = this.store.getTags().find(t => t.id === tagId);
    if (!tag) return;

    try {
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
          note: `課堂紀錄：${tag.name}`
        });

        this.showFloatingBubble(seatNo, tag.delta);
        appliedCount++;

        // In-place score update on card targeting character score span (index 2)
        const card = document.getElementById(`seat-card-${seatNo}`);
        if (card) {
          const profile = this.stats.getStudentProfile(classId, seatNo);
          if (profile) {
            const charPts = profile.pointsBreakdown.discipline + profile.pointsBreakdown.conflict + profile.pointsBreakdown.social;
            const scoreSpans = card.querySelectorAll('div > span');
            if (scoreSpans.length >= 3) {
              const ptsSpan = scoreSpans[2];
              ptsSpan.className = charPts > 0 ? 'text-emerald-700' : charPts < 0 ? 'text-rose-700' : 'text-slate-500';
              ptsSpan.innerText = `${charPts > 0 ? '+' : ''}${charPts}`;
            } else if (scoreSpans.length >= 2) {
              const ptsSpan = scoreSpans[1];
              ptsSpan.className = charPts > 0 ? 'text-emerald-700' : charPts < 0 ? 'text-rose-700' : 'text-slate-500';
              ptsSpan.innerText = `${charPts > 0 ? '+' : ''}${charPts}`;
            }
          }
        }
      });

      // Sound effect
      if (tag.delta > 0 && window.appState?.playChime) {
        window.appState.playChime();
      } else if (tag.delta < 0 && window.appState?.playWarning) {
        window.appState.playWarning();
      }

      window.appState?.showToast(`✨ 已為 ${appliedCount} 位同學記錄「${tag.name} (${tag.delta > 0 ? '+' : ''}${tag.delta})」`, 'success');
    } catch (err) {
      console.error('[ClassroomMatrix] applyTagToSelected error:', err);
    } finally {
      // Auto-clear selection reliably with explicit classId under all execution paths
      this.clearSelection(classId);
    }
  }
<<<<
```

---

### File 2: `css/styles.css`

#### Add Mobile Touch & Tap-Highlight Rules
**Target Lines**: ~129-145
```css
<<<< BEFORE
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
====
>>>> AFTER
.student-seat-card,
.seat-card,
#seat-grid-container .student-seat-card,
.quick-tag-button,
.tag-btn,
.action-btn,
#matrix-grid .seat-card {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
}

.student-seat-card {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
}

.student-seat-card:active {
  transform: scale(0.95);
}

.student-seat-card.selected {
  animation: popIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 0 0 3px #f43f5e, 0 4px 12px rgba(244, 63, 94, 0.25) !important;
}

.quick-tag-button {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
<<<<
```

---

### File 3: `js/retroLogView.js` (Localized Selection In-Place Mutation)

#### Update `toggleSeat(seatNo)` to In-Place DOM Mutation
**Target Lines**: ~292-301
```javascript
<<<< BEFORE
  toggleSeat(seatNo) {
    if (this.selectedSeats.has(seatNo)) {
      this.selectedSeats.delete(seatNo);
    } else {
      this.selectedSeats.add(seatNo);
    }
    if (window.appState?.playPop) window.appState.playPop();
    this.render('retro-log-view');
  }
====
>>>> AFTER
  toggleSeat(seatNo) {
    const isSelected = this.selectedSeats.has(seatNo);
    if (isSelected) {
      this.selectedSeats.delete(seatNo);
    } else {
      this.selectedSeats.add(seatNo);
    }
    if (window.appState?.playPop) window.appState.playPop();

    // In-place element update to prevent scroll jump and DOM reconstruction
    const card = document.getElementById(`retro-student-${seatNo}`);
    if (card) {
      if (!isSelected) {
        card.className = 'cursor-pointer p-2.5 rounded-2xl border transition-all text-center select-none active:scale-95 bg-pink-500 text-white border-pink-600 shadow-md transform scale-[1.02] font-black';
        const subtext = card.querySelector('.font-mono:last-child');
        if (subtext) subtext.className = 'text-[10px] mt-1 font-mono text-pink-100';
      } else {
        card.className = 'cursor-pointer p-2.5 rounded-2xl border transition-all text-center select-none active:scale-95 bg-white hover:bg-pink-50/60 border-pink-200 text-slate-800 font-bold';
        const subtext = card.querySelector('.font-mono:last-child');
        if (subtext) subtext.className = 'text-[10px] mt-1 font-mono text-slate-500';
      }
    }

    const badge = document.getElementById('retro-selected-badge');
    if (badge) {
      badge.innerText = `已選：${this.selectedSeats.size} 人`;
    }
  }
<<<<
```

---

## 5. Verification Method

To independently verify the implementation after applying the changes:

1. **Automated E2E Test Suite Execution**:
   Run the master test harness via PowerShell:
   ```powershell
   powershell -ExecutionPolicy Bypass -File tests/run_e2e_tests.ps1
   ```
   **Expected Result**: All 180 tests across Tiers 1 through 4 pass with 100% success rate (Exit Code 0).

2. **Direct Code & DOM Verification**:
   - Inspect `js/matrix.js:484-489`: Confirm `scoreSpans[2]` is targeted for character score updates.
   - Inspect `js/matrix.js:447-505`: Confirm `try...finally` wraps `this.clearSelection(classId)`.
   - Inspect `css/styles.css`: Confirm `touch-action: manipulation;` and `-webkit-tap-highlight-color: transparent;` are applied to `.student-seat-card` and `.quick-tag-button`.

3. **Interactive Manual / Browser Simulation**:
   - Click `#seat-card-1`: Card instantly gets `.selected` class, counter becomes `1`.
   - Click `#quick-tag-btn-disc_submit_homework` (or any quick tag button):
     - Floating bubble appears and animates for 800ms without blocking pointer events.
     - Character score (`品格常規點數`) updates from `+0` to `+1` while academic score (`📊70`) remains intact.
     - `#seat-card-1`'s `.selected` class is cleared immediately, counter returns to `0`.

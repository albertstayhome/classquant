/**
 * Classroom Live Matrix View
 * High-speed Mobile Classroom Grid with Strict Unified Color Rules:
 * - 4-Tag Spacious Layout per page (2x2 grid, large readable font, zero truncation)
 * - Directly placed below the seat grid (in-flow layout for zero screen clutter)
 * - Independent tag usage frequency per class (Homeroom vs Math subject classes separated)
 * - Integrated Post-Class Retro-Logging & Recall Assistant (⏰ 課堂事後快速補記助手)
 * - Web Audio API cute audio chimes & feedback
 */

class ClassroomMatrix {
  constructor(store, timetable, stats) {
    this.store = store;
    this.timetable = timetable;
    this.stats = stats;
    this.selectedSeats = new Set();
    this.currentTagPage = 0;
    this.touchStartX = 0;
    this.showQuickSelectBar = false;
    this.activeDeskDrawer = null; // 'seat' | 'select' | null
    this.armedTagId = null; // Tag Stamp Mode: tap tag first, then tap student seats directly
    this.scoringMode = 'live'; // 'live' | 'retro'
    this.undoStack = []; // Recent batch actions for 1-tap mistake recovery

    // Official COTE Character Avatars for OAA Mode (Official non-Q bust assets)
    this.coteAvatars = [
      './assets/cote/official/ayanokoji.webp',
      './assets/cote/official/sakayanagi.webp',
      './assets/cote/official/koenji.webp',
      './assets/cote/official/nagumo.webp',
      './assets/cote/official/ryuen.webp',
      './assets/cote/official/ichinose.webp',
      './assets/cote/official/horikita.webp',
      './assets/cote/official/amasawa.webp',
      './assets/cote/official/yagami.webp',
      './assets/cote/official/karuizawa.webp',
      './assets/cote/official/hirata.webp',
      './assets/cote/official/sudo.webp',
      './assets/cote/official/katsuragi.webp',
      './assets/cote/official/shiina.webp',
      './assets/cote/official/kanzaki.webp',
      './assets/cote/official/hosen.webp',
      './assets/cote/official/nanase.webp',
      './assets/cote/official/tsubaki.webp',
      './assets/cote/official/utomiya.webp',
      './assets/cote/official/ibuki.webp',
      './assets/cote/official/kushida.webp',
      './assets/cote/official/yukimura.webp',
      './assets/cote/official/matsushita.webp',
      './assets/cote/official/hasebe.webp',
      './assets/cote/official/miyake.webp',
      './assets/cote/official/sato.webp',
      './assets/cote/official/sakura.webp',
      './assets/cote/official/asahina.webp',
      './assets/cote/official/ishizaki.webp',
      './assets/cote/official/ike.webp',
      './assets/cote/official/shinohara.webp',
      './assets/cote/official/kiriyama.webp',
      './assets/cote/official/chabashira.webp',
      './assets/cote/official/hoshinomiya.webp',
      './assets/cote/official/tsukishiro.webp'
    ];

    // iOS-Style Long-Press Drag & Drop State
    this.isJiggleMode = false;
    this.isDragging = false;
    this.draggedSeatNo = null;
    this.dragGhost = null;
    this.dragStartCoords = { x: 0, y: 0 };
    this.currentHoverSeatNo = null;
    this.longPressTimer = null;
    this.justFinishedDrag = false;
    this.mobileGridDensity = (typeof localStorage !== 'undefined' && localStorage.getItem('classquant_mobile_grid')) || 'comfort';
  }

  toggleMobileGridDensity(classId) {
    this.mobileGridDensity = this.mobileGridDensity === 'exact' ? 'comfort' : 'exact';
    try { localStorage.setItem('classquant_mobile_grid', this.mobileGridDensity); } catch (e) {}
    const label = this.mobileGridDensity === 'exact' ? '原班橫排欄數（對應講台視角）' : '手機舒適大卡片（最多 4 欄更好點）';
    window.appState?.showToast(`📱 已切換為：${label}`, 'info');
    this.render('classroom-matrix-view', classId);
  }

  setClassCols(classId, cols) {
    const clamped = Math.min(8, Math.max(3, parseInt(cols, 10) || 5));
    if (this.store.setSeatingCols) {
      this.store.setSeatingCols(classId, clamped);
    } else {
      const layout = this.store.getSeatingLayout(classId);
      layout.cols = clamped;
      this.store.saveSeatingLayout(classId, layout);
    }
    this.mobileGridDensity = 'exact';
    try { localStorage.setItem('classquant_mobile_grid', 'exact'); } catch (e) {}
    if (window.appState?.playPop) window.appState.playPop();
    window.appState?.showToast(`📐 已將本班座位設為【${clamped} 排（直行）】配置`, 'success');
    this.render('classroom-matrix-view', classId);
  }

  toggleDeskDrawer(drawerName) {
    const next = this.activeDeskDrawer === drawerName ? null : drawerName;
    this.activeDeskDrawer = next;
    this.showQuickSelectBar = (next === 'select');
    const seatDrawer = document.getElementById('matrix-seating-drawer');
    const selectDrawer = document.getElementById('matrix-quick-select-drawer');
    if (seatDrawer) seatDrawer.classList.toggle('hidden', next !== 'seat' && !this.isJiggleMode);
    if (selectDrawer) selectDrawer.classList.toggle('hidden', next !== 'select');
    const seatBtn = document.getElementById('desk-drawer-seat-btn');
    const selectBtn = document.getElementById('desk-drawer-select-btn');
    if (seatBtn) seatBtn.setAttribute('aria-expanded', next === 'seat' ? 'true' : 'false');
    if (selectBtn) selectBtn.setAttribute('aria-expanded', next === 'select' ? 'true' : 'false');
  }

  clearArmedTag(classId = window.appState?.currentClassId) {
    this.armedTagId = null;
    this.render('classroom-matrix-view', classId);
  }

  scrollToTagDock() {
    const dock = document.getElementById('tag-dock-panel');
    if (dock) {
      dock.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  setScoringMode(mode, classId = null) {
    this.scoringMode = mode === 'retro' ? 'retro' : 'live';
    this.render('classroom-matrix-view', classId || window.appState?.currentClassId || '801');
  }

  toggleQuickSelectBar() {
    this.toggleDeskDrawer('select');
  }

  toggleJiggleMode(classId) {
    this.isJiggleMode = !this.isJiggleMode;
    this.selectedSeats.clear();
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
    if (this.isJiggleMode) {
      if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
      window.appState.showToast('📱 已進入 iOS 拖曳排位模式：長按卡片並拖移至目標座位即可直接對調！', 'info');
    } else {
      window.appState.showToast('✅ 座位表已鎖定並儲存，恢復課堂點記模式', 'success');
    }
    this.render('classroom-matrix-view', classId);
    window.scrollTo({ top: currentScrollY, behavior: 'instant' });
  }

  exitJiggleMode(classId) {
    this.isJiggleMode = false;
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
    window.appState.showToast('✅ 已儲存座位表配置', 'success');
    this.render('classroom-matrix-view', classId);
    window.scrollTo({ top: currentScrollY, behavior: 'instant' });
  }

  // --- iOS Long-Press & Spring Displacement Drag Handlers (1:1 Zero-Latency Hardware Engine) ---
  handleSeatTouchStart(e, seatNo, classId) {
    if (e.touches && e.touches.length > 1) return;
    const touch = e.touches ? e.touches[0] : e;
    this.dragStartCoords = { x: touch.clientX, y: touch.clientY };

    clearTimeout(this.longPressTimer);

    const cleanupGuards = () => {
      clearTimeout(this.longPressTimer);
      window.removeEventListener('touchmove', cancelMoveListener);
      window.removeEventListener('mousemove', cancelMoveListener);
      window.removeEventListener('scroll', cancelScrollListener, true);
      window.removeEventListener('touchend', cancelEndListener);
      window.removeEventListener('touchcancel', cancelEndListener);
      window.removeEventListener('mouseup', cancelEndListener);
    };

    // Natural scroll guard: cancel long-press drag immediately on slight finger drift or page scroll
    const cancelMoveListener = (moveEvt) => {
      const moveTouch = moveEvt.touches ? moveEvt.touches[0] : moveEvt;
      const dx = Math.abs(moveTouch.clientX - this.dragStartCoords.x);
      const dy = Math.abs(moveTouch.clientY - this.dragStartCoords.y);
      if (dx > 4 || dy > 4) {
        cleanupGuards();
      }
    };
    const cancelScrollListener = () => {
      cleanupGuards();
    };
    const cancelEndListener = () => {
      cleanupGuards();
    };

    window.addEventListener('touchmove', cancelMoveListener, { passive: true });
    window.addEventListener('mousemove', cancelMoveListener, { passive: true });
    window.addEventListener('scroll', cancelScrollListener, { passive: true, capture: true });
    window.addEventListener('touchend', cancelEndListener, { once: true });
    window.addEventListener('touchcancel', cancelEndListener, { once: true });
    window.addEventListener('mouseup', cancelEndListener, { once: true });

    // 420ms deliberate long press to activate 1:1 hardware seat rearrangement without trapping quick vertical scrolls
    this.longPressTimer = setTimeout(() => {
      cleanupGuards();
      this.startIOSDrag(touch, seatNo, classId);
    }, 420);
  }

  startIOSDrag(touch, seatNo, classId) {
    this.isDragging = true;
    this.draggedSeatNo = seatNo;
    this.dragClassId = classId;
    this.isJiggleMode = true;
    this.startTouchX = touch.clientX;
    this.startTouchY = touch.clientY;
    this.lastTouchX = touch.clientX;
    this.startWindowScrollY = window.scrollY;

    if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    if (window.appState?.playPop) window.appState.playPop();

    const originalCard = document.getElementById(`seat-card-${seatNo}`);
    if (!originalCard) return;

    const rect = originalCard.getBoundingClientRect();
    this.dragCardRect = rect;

    // 1. Clone clean floating ghost
    const ghost = originalCard.cloneNode(true);
    ghost.id = 'ios-drag-floating-ghost';
    ghost.classList.remove('is-dragging', 'seating-drop-slot');
    ghost.classList.add('ios-ghost-card');
    ghost.style.position = 'fixed';
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.transform = 'translate3d(0, 0, 0) scale(1.08)';
    ghost.style.transformOrigin = 'center center';
    ghost.style.transition = 'none';
    ghost.style.zIndex = '999999';
    ghost.style.pointerEvents = 'none';
    document.body.appendChild(ghost);
    this.dragGhost = ghost;

    // 2. Turn original card on the board into the landing slot silhouette
    originalCard.classList.add('is-dragging', 'seating-drop-slot');

    // 3. Snapshot layout & slots
    const layout = this.store.getSeatingLayout(classId);
    const seatOrder = [...layout.seatOrder];
    this.seatOrderSnapshot = seatOrder;
    this.draggedIndex = seatOrder.indexOf(Number(seatNo));
    this.targetIndex = this.draggedIndex;
    this.currentHoverSeatNo = seatNo;

    // Snapshot exact positions of each slot on screen
    this.slotSnapshots = seatOrder.map((sNo, idx) => {
      const card = document.getElementById(`seat-card-${sNo}`);
      if (!card) return null;
      const r = card.getBoundingClientRect();
      return {
        index: idx,
        seatNo: sNo,
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
        centerX: r.left + r.width / 2,
        centerY: r.top + r.height / 2
      };
    }).filter(Boolean);

    // Lock touch action & selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    // 4. Bind window listeners for 1:1 hardware touch tracking
    this.boundSeatMove = (e) => this.handleSeatDirectMove(e, classId);
    this.boundSeatEnd = (e) => this.handleSeatDirectEnd(e, classId);
    window.addEventListener('touchmove', this.boundSeatMove, { passive: false });
    window.addEventListener('touchend', this.boundSeatEnd);
    window.addEventListener('mousemove', this.boundSeatMove);
    window.addEventListener('mouseup', this.boundSeatEnd);

    const doneBanner = document.getElementById('ios-jiggle-done-bar');
    if (doneBanner) doneBanner.classList.remove('hidden');
  }

  handleSeatDirectMove(e, classId) {
    if (!this.isDragging) return;
    if (e.cancelable) e.preventDefault();

    const touch = e.touches ? e.touches[0] : e;
    this._pendingDragMove = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      classId
    };

    if (typeof requestAnimationFrame === 'undefined') {
      this._processSeatDirectMoveFrame();
      return;
    }

    if (!this._dragRafId) {
      this._dragRafId = requestAnimationFrame(() => {
        this._dragRafId = null;
        this._processSeatDirectMoveFrame();
      });
    }
  }

  _processSeatDirectMoveFrame() {
    if (!this.isDragging || !this._pendingDragMove) return;
    const { clientX, clientY, classId } = this._pendingDragMove;
    const currentScrollY = window.scrollY;
    const deltaScroll = currentScrollY - this.startWindowScrollY;

    // 1. GPU-composited 1:1 finger lock for ghost
    const dx = clientX - this.startTouchX;
    const dy = clientY - this.startTouchY;
    const vx = clientX - (this.lastTouchX || clientX);
    this.lastTouchX = clientX;
    const tilt = Math.max(-6, Math.min(6, vx * 0.35));

    if (this.dragGhost) {
      this.dragGhost.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.08) rotate(${tilt}deg)`;
    }

    // 2. Edge auto-scrolling
    const viewportHeight = window.innerHeight;
    const edgeZone = 75;
    if (clientY < edgeZone) {
      const speed = Math.max(4, Math.round((edgeZone - clientY) / 4));
      window.scrollBy(0, -speed);
    } else if (clientY > viewportHeight - edgeZone) {
      const speed = Math.max(4, Math.round((clientY - (viewportHeight - edgeZone)) / 4));
      window.scrollBy(0, speed);
    }

    // 3. Find closest slot based on center distance
    if (this.slotSnapshots && this.slotSnapshots.length > 0) {
      let closestSlot = null;
      let minDistSq = Infinity;

      for (let slot of this.slotSnapshots) {
        const centerY = slot.centerY - deltaScroll;
        const centerX = slot.centerX;
        const distSq = Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2);
        if (distSq < minDistSq) {
          minDistSq = distSq;
          closestSlot = slot;
        }
      }

      if (closestSlot && closestSlot.index !== this.targetIndex) {
        const slotRadius = Math.min(closestSlot.width, closestSlot.height) / 2 + 10;
        if (minDistSq < slotRadius * slotRadius * 2.2) {
          this.targetIndex = closestSlot.index;
          this.currentHoverSeatNo = this.seatOrderSnapshot[this.targetIndex];
          this.updateSeatDisplacement(this.draggedIndex, this.targetIndex, classId);
          if (navigator.vibrate) navigator.vibrate(15);
        }
      }
    }
  }

  updateSeatDisplacement(fromIdx, toIdx, classId) {
    if (!this.slotSnapshots || this.slotSnapshots.length === 0) return;

    const seatOrder = this.seatOrderSnapshot;
    const projected = [...seatOrder];
    const [moved] = projected.splice(fromIdx, 1);
    projected.splice(toIdx, 0, moved);

    seatOrder.forEach(seatNo => {
      const card = document.getElementById(`seat-card-${seatNo}`);
      if (!card) return;

      const origIdx = seatOrder.indexOf(seatNo);
      const newIdx = projected.indexOf(seatNo);

      if (seatNo === this.draggedSeatNo) {
        // Dragged source card slot dynamically moves to target slot
        const origSlot = this.slotSnapshots[fromIdx];
        const targetSlot = this.slotSnapshots[toIdx];
        if (origSlot && targetSlot) {
          const dx = targetSlot.left - origSlot.left;
          const dy = targetSlot.top - origSlot.top;
          card.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(0.96)`;
          card.style.transition = 'transform 0.22s cubic-bezier(0.2, 0, 0, 1)';
          card.classList.add('seating-drop-slot');
        }
      } else {
        const origSlot = this.slotSnapshots[origIdx];
        const targetSlot = this.slotSnapshots[newIdx];

        if (newIdx !== origIdx && origSlot && targetSlot) {
          const dx = targetSlot.left - origSlot.left;
          const dy = targetSlot.top - origSlot.top;
          card.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(0.96)`;
          card.style.transition = 'transform 0.22s cubic-bezier(0.2, 0, 0, 1)';
        } else {
          card.style.transform = '';
          card.style.transition = 'transform 0.22s cubic-bezier(0.2, 0, 0, 1)';
        }
      }
    });
  }

  handleSeatDirectEnd(e, classId) {
    clearTimeout(this.longPressTimer);

    if (this.isDragging) {
      this.justFinishedDrag = true;
      setTimeout(() => { this.justFinishedDrag = false; }, 320);

      const fromIdx = this.draggedIndex;
      const toIdx = this.targetIndex;

      if (toIdx !== null && toIdx !== fromIdx && fromIdx >= 0 && toIdx >= 0) {
        const sourceSeat = this.draggedSeatNo;
        const targetSeat = this.seatOrderSnapshot[toIdx];
        this.store.reorderStudentSeats(classId, sourceSeat, targetSeat);
        if (window.appState?.playChime) window.appState.playChime();
        if (navigator.vibrate) navigator.vibrate([30, 20, 30]);

        const students = this.store.getStudents(classId);
        const studentA = students.find(s => s.seatNo === sourceSeat);
        const studentB = students.find(s => s.seatNo === targetSeat);
        window.appState.showToast(`✨ 成功將 ${sourceSeat} 號【${studentA ? studentA.name : ''}】移至 ${studentB ? studentB.name : ''} 前方！`, 'success');
      }

      this.stopIOSDrag(classId);
    }
  }

  stopIOSDrag(classId) {
    this.isDragging = false;
    this.currentHoverSeatNo = null;
    this._pendingDragMove = null;
    this.lastTouchX = null;
    if (this._dragRafId) {
      cancelAnimationFrame(this._dragRafId);
      this._dragRafId = null;
    }

    // Remove window listeners cleanly
    if (this.boundSeatMove) {
      window.removeEventListener('touchmove', this.boundSeatMove);
      window.removeEventListener('mousemove', this.boundSeatMove);
      this.boundSeatMove = null;
    }
    if (this.boundSeatEnd) {
      window.removeEventListener('touchend', this.boundSeatEnd);
      window.removeEventListener('mouseup', this.boundSeatEnd);
      this.boundSeatEnd = null;
    }

    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';

    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }

    // Save exact scroll position
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
    const currentScrollX = window.pageXOffset || document.documentElement.scrollLeft || window.scrollX || 0;

    this.render('classroom-matrix-view', classId);

    // Restore exact scroll position so screen never jumps to top
    window.scrollTo({
      top: currentScrollY,
      left: currentScrollX,
      behavior: 'instant'
    });
  }

  applyAutoArrange(classId, pattern) {
    const layout = this.store.getSeatingLayout(classId);
    this.store.autoArrangeSeating(classId, pattern, layout.cols || 5);
    if (window.appState?.playChime) window.appState.playChime();
    const patternNames = { normal: '常規直排', snake_s: 'S型蛇行', col_first: '由左至右直排', random: '隨機抽籤' };
    window.appState.showToast(`已套用【${patternNames[pattern] || pattern}】座位排法！`, 'success');
    this.render('classroom-matrix-view', classId);
  }

  toggleTagSortMode(classId) {
    const currentMode = this.store.getTagSortMode(classId);
    const newMode = currentMode === 'custom' ? 'frequency' : 'custom';
    this.store.setTagSortMode(newMode, classId);
    window.appState.showToast(`標籤排序已切換為：「${newMode === 'custom' ? '📌 依自訂清單順序' : '📊 依班級使用頻率'}」`, 'info');
    this.render('classroom-matrix-view', classId);
  }

  selectGender(gender) {
    const currentClassId = window.appState.currentClassId;
    const students = this.store.getStudents(currentClassId);
    this.selectedSeats.clear();
    const total = students.length;
    students.forEach(s => {
      const studentGender = s.gender || (s.seatNo <= Math.ceil(total / 2) ? 'M' : 'F');
      if (studentGender === gender) {
        this.selectedSeats.add(s.seatNo);
      }
    });
    if (window.appState?.playPop) window.appState.playPop();
    this.updateSelectionUI(currentClassId);
  }

  selectParitySeats(isOdd) {
    const currentClassId = window.appState.currentClassId;
    const students = this.store.getStudents(currentClassId);
    this.selectedSeats.clear();
    students.forEach(s => {
      if ((Number(s.seatNo) % 2 === 1) === Boolean(isOdd)) {
        this.selectedSeats.add(s.seatNo);
      }
    });
    if (window.appState?.playPop) window.appState.playPop();
    this.updateSelectionUI(currentClassId);
  }

  selectRow(rowIdx) {
    const currentClassId = window.appState.currentClassId;
    const layout = this.store.getSeatingLayout(currentClassId);
    const cols = layout.cols || 5;
    const seatOrder = layout.seatOrder || [];

    this.selectedSeats.clear();
    // rowIdx is 1-based
    const startIdx = (rowIdx - 1) * cols;
    const endIdx = startIdx + cols;
    for (let i = startIdx; i < endIdx && i < seatOrder.length; i++) {
      if (seatOrder[i]) {
        this.selectedSeats.add(seatOrder[i]);
      }
    }

    if (window.appState?.playPop) window.appState.playPop();
    this.updateSelectionUI(currentClassId);
  }

  render(containerId, currentClassId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!currentClassId) {
      currentClassId = window.appState?.currentClassId || this.currentClassId || Object.keys(this.store.getClasses())[0] || '801';
    }
    this.currentClassId = currentClassId;

    let cls = this.store.getClass(currentClassId);
    const hasClearedAll = Boolean(this.store.data?.hasClearedAll || localStorage.getItem('classquant_user_cleared') === 'true');
    if (!cls) {
      const classKeys = Object.keys(this.store.getClasses());
      if (classKeys.length > 0) {
        currentClassId = classKeys[0];
        this.currentClassId = currentClassId;
        cls = this.store.getClass(currentClassId);
      } else if (!hasClearedAll) {
        // Self-heal only on first-run empty storage (not after explicit user clearAll)
        this.store.initDemoData();
        const freshKeys = Object.keys(this.store.getClasses());
        if (freshKeys.length > 0) {
          currentClassId = freshKeys[0];
          this.currentClassId = currentClassId;
          cls = this.store.getClass(currentClassId);
        }
      }
      if (cls && window.appState) {
        window.appState.currentClassId = currentClassId;
        window.appState.renderClassDropdown();
      }
    }
    if (!cls) {
      const isOAAEmpty = window.appStore && window.appStore.getTheme() === 'oaa';
      container.innerHTML = `
        <div class="p-10 sm:p-12 text-center glass-card rounded-3xl border ${isOAAEmpty ? 'bg-[#240e1b] border-amber-500/40 text-white' : 'bg-white border-pink-200 text-slate-600'}">
          ${isOAAEmpty ? '<div class="text-4xl mb-3">🏛️</div>' : '<div class="sanrio-sticker-twinstars mb-3"></div>'}
          <div class="text-base sm:text-lg font-black ${isOAAEmpty ? 'text-amber-300' : 'text-slate-800'}">目前尚無班級資料（已清空為新學年模式）</div>
          <p class="text-xs ${isOAAEmpty ? 'text-amber-100/80' : 'text-slate-500'} mt-1.5 font-medium">您可以前往「👥 班級名單」新增自己的班級與名單，或重新載入示範資料體驗</p>
          <div class="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button onclick="appState.switchTab('roster')" class="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl font-black text-xs sm:text-sm shadow-md cursor-pointer transition">
              ➕ 前往建立我的班級
            </button>
            <button onclick="appStore.resetToDemo(); appState.renderClassDropdown(); matrixView.render('${containerId}')" class="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl font-bold text-xs shadow-sm cursor-pointer transition">
              ✨ 載入示範班級
            </button>
          </div>
        </div>
      `;
      return;
    }

    const students = this.store.getStudents(currentClassId);
    const studentMap = {};
    students.forEach(s => { studentMap[s.seatNo] = s; });

    const layout = this.store.getSeatingLayout(currentClassId);
    const cols = layout.cols || (students.length > 30 ? 6 : 5);
    const mobileCols = this.mobileGridDensity === 'exact' ? cols : Math.min(cols, 4);
    const seatOrder = layout.seatOrder || students.map(s => s.seatNo);
    const overview = this.stats.getClassOverview(currentClassId);
    
    // Tag Sorting (Pass currentClassId for Homeroom vs Subject isolation)
    const sortMode = this.store.getTagSortMode(currentClassId);
    const sortedTags = this.store.getTagsSorted(currentClassId);
    const isHomeroom = cls.type === 'homeroom';
    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';
    const classRanks = this.store.getClassStudentRanks ? this.store.getClassStudentRanks(currentClassId) : {};
    const termLabel = this.store.getDefaultTermLabel ? this.store.getDefaultTermLabel(currentClassId) : '第 1 次段考';

    // Chunk tags into pages of 4 (2 cols x 2 rows, large comfortable readable cards)
    const pageSize = 4;
    const tagPages = [];
    for (let i = 0; i < sortedTags.length; i += pageSize) {
      tagPages.push(sortedTags.slice(i, i + pageSize));
    }
    if (tagPages.length === 0) tagPages.push([]);

    this.maxTagPages = tagPages.length;
    if (this.currentTagPage >= this.maxTagPages) this.currentTagPage = 0;

    // Inline Mode Switcher Strip (⚡ 即時座位點記 ⇋ ⏰ 事後批次補記)
    const modeSwitchBarHtml = `
      <div class="mb-2.5 p-1.5 sm:p-2 rounded-2xl border shadow-sm flex flex-wrap items-center justify-between gap-2 ${isOAA ? 'bg-[#1a0712] border-amber-500/30 text-amber-100' : 'glass-card border-pink-200 bg-white/95'}">
        <div class="inline-flex items-center gap-1 p-1 rounded-xl ${isOAA ? 'bg-black/35 border border-amber-500/20' : 'bg-pink-50/90 border border-pink-200/70'}">
          <button type="button" onclick="matrixView.setScoringMode('live', '${currentClassId}')" class="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition flex items-center gap-1.5 cursor-pointer ${this.scoringMode === 'live' ? (isOAA ? 'bg-gradient-to-r from-rose-800 via-rose-700 to-amber-700 text-white border border-amber-400/70 shadow-sm' : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm') : (isOAA ? 'text-amber-200/75 hover:bg-rose-950/60 hover:text-amber-100' : 'text-slate-600 hover:bg-white/70')}">
            <span>⚡</span><span>即時點記</span>
          </button>
          <button id="retro-log-top-btn" type="button" onclick="matrixView.setScoringMode('retro', '${currentClassId}')" class="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-black transition flex items-center gap-1.5 cursor-pointer ${this.scoringMode === 'retro' ? (isOAA ? 'bg-gradient-to-r from-amber-700 to-rose-700 text-white border border-amber-400/70 shadow-sm' : 'bg-amber-500 text-white shadow-sm') : (isOAA ? 'text-amber-200/75 hover:bg-rose-950/60 hover:text-amber-100' : 'text-slate-600 hover:bg-white/70')}">
            <span>⏰</span><span>事後補記</span>
          </button>
        </div>
        <button type="button" onclick="appState.switchTab('grades')" class="px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${isOAA ? 'bg-[#280d1c] text-amber-200 border border-amber-500/35 hover:bg-[#3a152b] hover:border-amber-400/70' : 'bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100'}" title="前往計算與結算平時成績">
          <span>📅 ${termLabel}計算中</span>
          <span class="opacity-60">•</span>
          <span class="underline">查看平時成績 →</span>
        </button>
      </div>
    `;

    if (this.scoringMode === 'retro') {
      container.innerHTML = `
        ${modeSwitchBarHtml}
        <div id="matrix-retro-host"></div>
      `;
      if (window.retroLogView) {
        window.retroLogView.currentClassId = currentClassId;
        window.retroLogView.render('matrix-retro-host', currentClassId);
      }
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Dynamic Header Metadata (COTE vs Sanrio)
    const studentCountDisplay = cls.studentCount ?? students.length;
    const qualifiedClassName = this.store.getClassQualifiedName ? this.store.getClassQualifiedName(currentClassId) : cls.name;
    const classNameDisplay = isOAA ? `高度育成 ${qualifiedClassName}` : qualifiedClassName;
    const latestUndo = this.getLatestUndoForClass(currentClassId);
    const undoBannerHtml = latestUndo ? `
      <div id="matrix-undo-banner" class="mb-2.5 px-3 py-2 rounded-2xl border flex items-center justify-between gap-2 text-xs shadow-sm ${isOAA ? 'bg-[#2a0f1d] border-amber-400/70 text-amber-100' : 'bg-amber-50 border-amber-300 text-amber-950'}">
        <div class="min-w-0 truncate font-bold">
          <span>↩️ 剛才記錄：</span>
          <strong class="${latestUndo.delta >= 0 ? (isOAA ? 'text-emerald-300' : 'text-emerald-700') : (isOAA ? 'text-rose-300' : 'text-rose-700')}">${latestUndo.tagName} (${latestUndo.delta > 0 ? '+' : ''}${latestUndo.delta})</strong>
          <span class="opacity-80">• 共 ${latestUndo.seats.length} 人 (${latestUndo.seats.slice(0, 4).map(n => `${n}號`).join('、')}${latestUndo.seats.length > 4 ? '…' : ''})</span>
        </div>
        <button type="button" id="matrix-undo-btn" onclick="matrixView.undoLastAction('${currentClassId}')" class="shrink-0 min-h-[32px] px-3 py-1 rounded-xl font-black text-xs transition active:scale-95 cursor-pointer ${isOAA ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-white border border-amber-400 text-amber-900 hover:bg-amber-100 shadow-sm'}">
          ↩️ 復原誤按
        </button>
      </div>
    ` : '';
    const classBadgeHtml = isOAA
      ? `<span class="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-black bg-rose-900 text-amber-200 border border-amber-500/60 shadow-sm">${isHomeroom ? '高度育成 • 導師班' : '高度育成 • 科任班'} (${studentCountDisplay}名)</span>`
      : `<span class="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-black ${isHomeroom ? 'bg-pink-100 text-pink-700 border border-pink-300' : 'bg-blue-100 text-blue-800 border border-blue-300'}">${isHomeroom ? '🎀 導師本班' : '📘 科任班'} (${studentCountDisplay}人)</span>`;

    const statsOverviewHtml = isOAA
      ? `平時均分: <strong class="text-amber-300 font-black font-mono">${overview.classAvgScore}</strong> • 淨點均數: <strong class="${overview.classAvgEngagement >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-black font-mono">${overview.classAvgEngagement > 0 ? '+' : ''}${overview.classAvgEngagement}</strong>`
      : `平時均分: <strong class="text-blue-700">${overview.classAvgScore}</strong> • 淨點均數: <strong class="${overview.classAvgEngagement >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${overview.classAvgEngagement > 0 ? '+' : ''}${overview.classAvgEngagement}</strong>`;

    container.innerHTML = `
      ${modeSwitchBarHtml}
      ${undoBannerHtml}
      <!-- Clean Class Header + Daily Quick Tools (With Subtle Corner Illustration) -->
      <div class="relative overflow-hidden p-2.5 sm:p-3.5 rounded-2xl ${isOAA ? 'bg-[#220d18] border border-amber-500/35' : 'bg-white border border-pink-200'} shadow-sm mb-2.5">
        <img src="${isOAA ? './assets/cote/official/horikita_full.webp' : './assets/images/hello_kitty.png'}" alt="" class="pointer-events-none select-none absolute right-1 bottom-0 h-16 sm:h-20 w-auto object-contain ${isOAA ? 'opacity-20' : 'opacity-15'}">
        <!-- Row 1: Class Identity + Daily High-Frequency Views -->
        <div class="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b ${isOAA ? 'border-amber-500/20' : 'border-pink-100'}">
          <div class="flex items-start sm:items-center gap-2 min-w-0 flex-1">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <h2 class="text-base sm:text-xl font-black ${isOAA ? 'text-white' : (isHomeroom ? 'text-pink-600' : 'text-blue-600')} tracking-wide">${classNameDisplay}</h2>
                ${classBadgeHtml}
              </div>
              <div class="text-[10px] sm:text-xs ${isOAA ? 'text-slate-200' : 'text-slate-600'} font-bold mt-0.5">
                ${statsOverviewHtml}
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-1.5 shrink-0">
            <button type="button" onclick="appState.switchTab('students')" class="min-h-[32px] px-2.5 py-1 text-[11px] sm:text-xs font-black whitespace-nowrap ${isOAA ? 'bg-[#1a0812] border border-amber-500/35 text-amber-200 hover:bg-[#2b0e1e]' : 'bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100'} rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer" title="查看學生個人平時表現">
              <span>👤</span><span>學生表現</span>
            </button>
            <button type="button" onclick="appState.switchTab('grades')" class="min-h-[32px] px-2.5 py-1 text-[11px] sm:text-xs font-black whitespace-nowrap ${isOAA ? 'bg-amber-950/75 border border-amber-400/50 text-amber-200 hover:bg-amber-900/75' : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'} rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer" title="查看全班平時成績與結算 Excel">
              <span>📊</span><span>平時成績</span>
            </button>
          </div>
        </div>

        <!-- Row 2: Daily Quick Selection & Classroom Scoring Tools -->
        <div class="relative z-10 flex flex-wrap items-center gap-1.5 pt-2.5">
          <div id="selection-status-badge" class="min-h-[34px] text-xs px-2.5 py-1 rounded-xl whitespace-nowrap ${isOAA ? 'bg-[#290e1b] border border-amber-500/55 text-amber-200' : 'bg-pink-50 border border-pink-300 text-slate-800'} font-bold flex items-center gap-1">
            <span>已選: <strong id="selected-count" class="${isOAA ? 'text-amber-300 font-mono' : 'text-pink-600'} font-black text-sm">${this.selectedSeats.size}</strong></span>
            <button id="clear-sel-btn" onclick="matrixView.clearSelection()" class="${this.selectedSeats.size > 0 ? 'inline-block' : 'hidden'} text-rose-400 underline font-bold text-xs ml-0.5 cursor-pointer whitespace-nowrap">清空</button>
          </div>

          <button id="desk-drawer-select-btn" type="button" aria-expanded="${(this.activeDeskDrawer === 'select' || this.showQuickSelectBar) ? 'true' : 'false'}" onclick="matrixView.toggleQuickSelectBar()" class="min-h-[34px] px-2.5 py-1 text-xs font-bold whitespace-nowrap ${(this.activeDeskDrawer === 'select' || this.showQuickSelectBar) ? (isOAA ? 'bg-rose-800/70 border border-amber-400 text-white' : 'bg-pink-200 text-pink-900 border border-pink-400') : (isOAA ? 'bg-[#2b0f1d] border border-amber-500/45 text-amber-200 hover:bg-[#3d1529]' : 'bg-pink-50 text-pink-800 border border-pink-300 hover:bg-pink-100')} rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer" title="依橫排、性別或單雙號快速選學生">
            <span>👥 選排/男女 ▾</span>
          </button>

          <button onclick="matrixView.selectAll()" class="min-h-[34px] px-2.5 py-1 text-xs font-bold whitespace-nowrap ${isOAA ? 'bg-[#1a0812] border border-slate-600 text-slate-200 hover:bg-[#280d1c]' : 'bg-white border border-pink-300 hover:bg-pink-50 text-slate-800'} rounded-xl shadow-xs cursor-pointer">
            全選
          </button>

          <button onclick="matrixView.openRandomPickerModal('${currentClassId}')" class="min-h-[34px] px-2.5 py-1 text-xs font-black whitespace-nowrap ${isOAA ? 'bg-rose-700 hover:bg-rose-600 border border-rose-500' : 'bg-pink-500 hover:bg-pink-600'} text-white rounded-xl shadow-xs cursor-pointer">
            🎲 抽籤
          </button>

          <button onclick="matrixView.openConflictModal('${currentClassId}')" class="min-h-[34px] px-2.5 py-1 text-xs font-black whitespace-nowrap ${isOAA ? 'bg-red-700 hover:bg-red-600 border border-red-500' : 'bg-rose-600 hover:bg-rose-700'} text-white rounded-xl shadow-xs cursor-pointer">
            🚨 事件
          </button>

          <button type="button" onclick="window.tagManager.openTagManagerModal()" class="min-h-[34px] px-2.5 py-1 text-xs font-bold whitespace-nowrap ${isOAA ? 'bg-[#1a0812] border border-amber-500/35 text-amber-300 hover:bg-[#2b0e1e]' : 'bg-slate-50 border border-slate-300 text-slate-700 hover:bg-slate-100'} rounded-xl shadow-xs cursor-pointer" title="新增或調整加減分快速標籤">
            🏷️ 標籤設定
          </button>
        </div>
      </div>

      <!-- Quick Group / Row / Gender / Parity Select Drawer -->
      <div id="matrix-quick-select-drawer" class="${(this.activeDeskDrawer === 'select' || this.showQuickSelectBar) ? '' : 'hidden'} p-2.5 rounded-2xl ${isOAA ? 'bg-[#240e1b] border border-amber-500/40 text-slate-200' : 'bg-pink-50 border border-pink-200 text-slate-800'} mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs shadow-sm animate-fade-in-up">
        <div class="flex flex-wrap items-center gap-1">
          <span class="font-bold ${isOAA ? 'text-amber-300' : 'text-pink-900'} text-[11px]">橫排選取：</span>
          ${Array.from({ length: Math.max(5, Math.ceil(seatOrder.length / cols)) }, (_, idx) => {
            const rowNum = idx + 1;
            return `<button onclick="matrixView.selectRow(${rowNum})" class="px-2 py-1 rounded-lg ${isOAA ? 'bg-[#180711] border border-amber-700 text-amber-200 hover:bg-[#2c0e1e]' : 'bg-white border border-pink-200 text-slate-800 hover:bg-pink-100'} font-bold cursor-pointer">第${rowNum}排</button>`;
          }).join('')}
        </div>
        <div class="flex flex-wrap items-center gap-1">
          <span class="font-bold ${isOAA ? 'text-amber-300' : 'text-pink-900'} text-[11px]">性別/座號：</span>
          <button onclick="matrixView.selectGender('M')" class="px-2 py-1 rounded-lg ${isOAA ? 'bg-[#101b38] text-blue-200 border border-blue-500' : 'bg-blue-50 text-blue-800 border border-blue-200'} font-bold cursor-pointer">全體男生</button>
          <button onclick="matrixView.selectGender('F')" class="px-2 py-1 rounded-lg ${isOAA ? 'bg-[#3b0d21] text-pink-200 border border-pink-500' : 'bg-pink-100 text-pink-800 border border-pink-200'} font-bold cursor-pointer">全體女生</button>
          <button onclick="matrixView.selectParitySeats(true)" class="px-2 py-1 rounded-lg ${isOAA ? 'bg-[#180711] text-sky-200 border border-sky-500/50' : 'bg-white text-slate-700 border border-pink-200'} font-bold cursor-pointer">單號</button>
          <button onclick="matrixView.selectParitySeats(false)" class="px-2 py-1 rounded-lg ${isOAA ? 'bg-[#180711] text-slate-200 border border-slate-500/50' : 'bg-white text-slate-700 border border-pink-200'} font-bold cursor-pointer">雙號</button>
        </div>
      </div>

      ${(() => {
        if (!this.armedTagId) return '';
        const armedTag = sortedTags.find(t => t.id === this.armedTagId);
        if (!armedTag) return '';
        return `
          <div id="matrix-stamp-banner" class="mb-2.5 px-3 py-2 rounded-2xl border-2 flex flex-wrap items-center justify-between gap-2 text-xs shadow-md animate-fade-in-up ${isOAA ? 'bg-gradient-to-r from-[#2c0e1e] to-[#1a0812] border-amber-400 text-amber-100' : 'bg-gradient-to-r from-pink-50 to-amber-50 border-pink-400 text-slate-900'}">
            <div class="font-bold flex items-center gap-1.5 min-w-0">
              <span class="text-sm shrink-0">🎯</span>
              <span class="truncate">印章連點中：<strong class="${armedTag.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}">${armedTag.name} (${armedTag.delta > 0 ? '+' : ''}${armedTag.delta})</strong> — 直接點學生座位即可記點</span>
            </div>
            <button type="button" onclick="matrixView.clearArmedTag('${currentClassId}')" class="min-h-[30px] px-3 py-1 rounded-xl font-black text-xs cursor-pointer shrink-0 ${isOAA ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-pink-600 text-white hover:bg-pink-700'}">
              ✅ 完成收起印章
            </button>
          </div>
        `;
      })()}

      <!-- Blackboard / Podium Classroom Visual Anchor -->
      ${isOAA ? `
        <div id="classroom-chalkboard-bar" onclick="window.appState?.handleChalkboardTap()" class="classroom-podium-bar py-2 rounded-2xl flex items-center justify-between text-xs font-bold mb-2.5 px-3.5 sm:px-5 select-none cursor-pointer">
          <span class="flex items-center gap-1 opacity-85 text-[10px] sm:text-[11px] text-amber-200/80 font-bold tracking-wide">
            <span class="w-1.5 h-1.5 rotate-45 bg-amber-400/70 inline-block"></span>
            靠窗側
          </span>
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rotate-45 bg-amber-400 inline-block"></span>
            <span class="text-amber-200 font-black text-xs sm:text-sm tracking-[0.16em] uppercase">ANHS 講台・黑板</span>
            <span class="w-1.5 h-1.5 rotate-45 bg-amber-400 inline-block"></span>
          </div>
          <span class="flex items-center gap-1 opacity-85 text-[10px] sm:text-[11px] text-amber-200/80 font-bold tracking-wide">
            靠門側
            <span class="w-1.5 h-1.5 rotate-45 bg-amber-400/70 inline-block"></span>
          </span>
        </div>
      ` : `
        <div id="classroom-chalkboard-bar" onclick="window.appState?.handleChalkboardTap()" class="py-2 rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 text-white border border-emerald-950 shadow-sm flex items-center justify-between text-xs font-black mb-2.5 px-3.5 sm:px-5 select-none cursor-pointer ring-1 ring-inset ring-emerald-400/20">
          <span class="opacity-85 text-[10px] sm:text-[11px] text-emerald-100/90 font-bold">
            靠窗側
          </span>
          <div class="flex items-center gap-2">
            <span class="kitty-bow !w-3.5 !h-3.5"></span>
            <span class="tracking-[0.16em] text-emerald-50 font-black text-xs sm:text-sm">講台・黑板</span>
            <span class="kitty-bow !w-3.5 !h-3.5"></span>
          </div>
          <span class="opacity-85 text-[10px] sm:text-[11px] text-emerald-100/90 font-bold">
            靠門側
          </span>
        </div>
      `}

      <!-- Responsive Student Grid in Actual Seating Order -->
      <div class="seat-grid-responsive ${mobileCols >= 6 ? 'seat-grid-cols-6' : mobileCols === 5 ? 'seat-grid-cols-5' : ''} ${mobileCols >= 5 ? 'gap-1 sm:gap-2' : 'gap-2 sm:gap-2.5'} mb-4 ${this.isJiggleMode ? 'ios-jiggle-active' : ''}" id="seat-grid-container" style="--seat-cols-mobile: ${mobileCols}; --seat-cols-sm: ${cols};">
        ${seatOrder.map(seatNo => {
          const s = studentMap[seatNo];
          if (!s) return '';

          const rankInfo = classRanks[s.seatNo] || { overallRank: 1, genderRank: 1, gender: s.gender || 'M', regularScore: 80, netDelta: 0, tier: 'B' };
          const tier = rankInfo.tier || 'B';
          const isSelected = this.selectedSeats.has(s.seatNo);
          const regularScore = Number(rankInfo.regularScore ?? 80);
          const netPts = Number(rankInfo.netDelta ?? 0);
          const cleanName = window.cqCleanStudentName ? window.cqCleanStudentName(s.name, s.seatNo) : String(s.name || '').trim();

          // Clean, minimal seat number & tier letter (Zero anime clutter on individual student cards)
          const seatNoBadgeHtml = isOAA
            ? `<span class="font-mono font-bold text-[10px] sm:text-[11px] leading-none text-amber-300/75 pointer-events-none">${String(s.seatNo).padStart(2, '0')}</span>`
            : `<span class="font-mono font-bold text-[10px] sm:text-[11px] leading-none text-rose-500/80 pointer-events-none">${String(s.seatNo).padStart(2, '0')}</span>`;

          const tierPillCls = isOAA
            ? (tier === 'S' ? 'text-amber-300 border-amber-400/50 bg-amber-950/60' : tier === 'A' ? 'text-cyan-300 border-cyan-400/50 bg-cyan-950/60' : tier === 'B' ? 'text-emerald-300 border-emerald-500/40 bg-emerald-950/50' : 'text-slate-400 border-white/10 bg-black/30')
            : (tier === 'S' ? 'text-amber-800 border-amber-300 bg-amber-50' : tier === 'A' ? 'text-sky-800 border-sky-300 bg-sky-50' : tier === 'B' ? 'text-emerald-800 border-emerald-200 bg-emerald-50' : 'text-slate-600 border-slate-200 bg-slate-50');

          const rankBadgeHtml = `<span class="px-1 py-0.2 rounded text-[9px] sm:text-[10px] font-mono font-black border leading-none pointer-events-none ${tierPillCls}">${tier}</span>`;

          const studentNameHtml = isOAA
            ? `<div class="seat-student-name text-[13px] sm:text-sm font-black truncate text-white text-center my-1 leading-snug tracking-wide pointer-events-none">${cleanName}</div>`
            : `<div class="seat-student-name text-[13px] sm:text-sm font-black truncate text-slate-900 text-center my-1 leading-snug pointer-events-none">${cleanName}</div>`;

          const displayRegular = Math.round(regularScore);
          const dualScoreHtml = isOAA
            ? `
              <div class="flex items-center justify-between pt-1 sm:pt-1.5 border-t border-amber-500/20 leading-none pointer-events-none whitespace-nowrap min-w-0 gap-0.5 sm:gap-1">
                <span class="inline-flex items-baseline font-mono leading-none shrink-0" title="本期平時成績：${regularScore}分">
                  <strong class="${mobileCols >= 6 ? 'text-[11px] sm:text-sm' : 'text-[13px] sm:text-sm'} font-black text-amber-200 tabular-nums">${displayRegular}</strong>
                  <span class="${mobileCols >= 6 ? 'hidden sm:inline' : 'inline'} text-[9px] text-amber-300/60 font-bold ml-0.5">分</span>
                  ${mobileCols >= 6 ? '<span class="sr-only">分</span>' : ''}
                </span>
                <span class="px-1 sm:px-1.5 py-0.5 rounded-md ${mobileCols >= 6 ? 'text-[9px] sm:text-[11px]' : 'text-[10px] sm:text-[11px]'} font-mono font-black tabular-nums shrink-0 ${netPts > 0 ? 'bg-emerald-950/85 text-emerald-300 border border-emerald-500/45' : netPts < 0 ? 'bg-rose-950/85 text-rose-300 border border-rose-500/45' : 'bg-black/35 text-slate-400 border border-white/10'}" title="本期淨點：${netPts}點">
                  ${netPts > 0 ? '+' : ''}${netPts}
                </span>
              </div>
            `
            : `
              <div class="flex items-center justify-between pt-1 sm:pt-1.5 border-t border-pink-100/90 leading-none pointer-events-none whitespace-nowrap min-w-0 gap-0.5 sm:gap-1">
                <span class="inline-flex items-baseline font-mono leading-none shrink-0" title="本期平時成績：${regularScore}分">
                  <strong class="${mobileCols >= 6 ? 'text-[11px] sm:text-sm' : 'text-[13px] sm:text-sm'} font-black text-slate-800 tabular-nums">${displayRegular}</strong>
                  <span class="${mobileCols >= 6 ? 'hidden sm:inline' : 'inline'} text-[9px] text-slate-400 font-bold ml-0.5">分</span>
                  ${mobileCols >= 6 ? '<span class="sr-only">分</span>' : ''}
                </span>
                <span class="px-1 sm:px-1.5 py-0.5 rounded-md ${mobileCols >= 6 ? 'text-[9px] sm:text-[11px]' : 'text-[10px] sm:text-[11px]'} font-mono font-black tabular-nums shrink-0 ${netPts > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : netPts < 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}" title="本期淨點：${netPts}點">
                  ${netPts > 0 ? '+' : ''}${netPts}
                </span>
              </div>
            `;

          return `
            <div id="seat-card-${s.seatNo}"
                 data-seat-no="${s.seatNo}"
                 data-tier="${tier}"
                 class="student-seat-card overflow-hidden ${mobileCols >= 5 ? 'p-1.5 pt-2 sm:p-2.5 sm:pt-2.5 min-h-[68px] sm:min-h-[82px]' : 'p-2 pt-2 sm:p-2.5 sm:pt-2.5 min-h-[74px] sm:min-h-[82px]'} rounded-2xl border ${isOAA ? 'bg-[#240e1b] border-amber-500/30' : 'bg-white border-pink-200/80'} cursor-pointer select-none relative transition-transform duration-150 shadow-sm ${isSelected ? 'selected' : ''} min-w-0 flex flex-col justify-between"
                 ontouchstart="matrixView.handleSeatTouchStart(event, ${s.seatNo}, '${currentClassId}')"
                 onmousedown="matrixView.handleSeatTouchStart(event, ${s.seatNo}, '${currentClassId}')"
                 onclick="if (!matrixView.justFinishedDrag) matrixView.toggleSeatSelection(${s.seatNo}, '${currentClassId}')">
              
              <!-- Seat Header: Quiet Index + Clean Tier Letter -->
              <div class="flex items-center justify-between mb-0.5 min-w-0 gap-0.5">
                ${seatNoBadgeHtml}
                ${rankBadgeHtml}
              </div>

              <!-- Student Name (Hero Focal Point) -->
              <div class="min-w-0 my-0.5">
                ${studentNameHtml}
              </div>

              <!-- Unified Score & Net Points Strip -->
              ${dualScoreHtml}
            </div>
          `;
        }).join('')}
      </div>

      <!-- IN-FLOW SPACIOUS 4-TAG PAGED DOCK -->
      <div id="tag-dock-panel" class="glass-card rounded-3xl p-3 sm:p-4 ${isOAA ? 'border-2 border-amber-500/50 bg-[#250f1c]/95 text-white' : 'border-2 border-pink-300 bg-white/95'} shadow-md mb-6">
        <!-- Dock Header -->
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-2.5 px-1">
          <div class="flex items-center gap-1.5 min-w-0 flex-wrap">
            ${isOAA ? '<span class="text-sm shrink-0">⚜️</span>' : '<span class="kitty-bow !w-3.5 !h-3.5 shrink-0"></span>'}
            <span class="font-black whitespace-nowrap shrink-0 ${isOAA ? 'text-amber-200' : 'text-slate-900'} text-xs sm:text-sm">${isOAA ? '高度育成 • 課堂考評標籤' : '課堂快速標籤'}</span>
            <button onclick="matrixView.toggleTagSortMode('${currentClassId}')" class="text-[11px] sm:text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0 transition-colors ${sortMode === 'custom' ? (isOAA ? 'bg-amber-950 text-amber-200 border border-amber-500/60' : 'bg-pink-100 text-pink-700 border border-pink-300') : (isOAA ? 'bg-rose-950 text-rose-200 border border-rose-500/60' : 'bg-blue-100 text-blue-700 border border-blue-300')}" title="點擊切換排序方式">
              ${sortMode === 'custom' ? '📌 自訂順序' : '📊 使用頻率'}
            </button>
          </div>

          <div class="flex items-center gap-1.5 shrink-0 ml-auto">
            <!-- Prev Page Button -->
            <button onclick="matrixView.prevTagPage()" class="w-7 h-7 rounded-xl ${isOAA ? 'bg-[#1c0a13] hover:bg-rose-900 text-amber-300 border border-amber-500/50' : 'bg-pink-100 hover:bg-pink-200 text-pink-700'} font-black flex items-center justify-center text-xs transition-transform active:scale-90 shadow-sm cursor-pointer shrink-0" title="上一頁">
              <i data-lucide="chevron-left" class="w-4 h-4"></i>
            </button>
            
            <span class="text-xs font-mono font-bold whitespace-nowrap shrink-0 px-0.5 ${isOAA ? 'text-amber-300' : 'text-slate-600'}">
              ${this.currentTagPage + 1} / ${this.maxTagPages}
            </span>

            <!-- Next Page Button -->
            <button onclick="matrixView.nextTagPage()" class="w-7 h-7 rounded-xl ${isOAA ? 'bg-[#1c0a13] hover:bg-rose-900 text-amber-300 border border-amber-500/50' : 'bg-pink-100 hover:bg-pink-200 text-pink-700'} font-black flex items-center justify-center text-xs transition-transform active:scale-90 shadow-sm cursor-pointer shrink-0" title="下一頁">
              <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>

            <!-- Custom Tag Modal Button -->
            <button id="custom-tag-open-btn" onclick="window.tagManager.openTagManagerModal()" class="${isOAA ? 'text-amber-400 hover:text-amber-300' : 'text-pink-600 hover:text-pink-700'} font-black hover:underline flex items-center gap-0.5 text-xs ml-1 cursor-pointer whitespace-nowrap shrink-0" title="管理自訂標籤">
              <i data-lucide="settings" class="w-3.5 h-3.5"></i> 自訂
            </button>
          </div>
        </div>

        <!-- 4-Tag Carousel Slide (2 cols x 2 rows, Large Font, Zero Truncation) -->
        <div class="tag-pager-container no-scrollbar" id="tag-pager-scroll-box"
             ontouchstart="matrixView.handleTouchStart(event)"
             ontouchend="matrixView.handleTouchEnd(event)"
             onscroll="matrixView.handleTagPagerScroll(this)">
          ${tagPages.map((pageTags, pageIdx) => `
            <div class="tag-page-slide">
              <div class="grid grid-cols-2 gap-2 sm:gap-2.5">
                ${pageTags.map((tag, tagIdx) => {
                  const isPos = tag.delta > 0;
                  const isZero = tag.delta === 0;
                  
                  const btnClass = isPos ? 'color-rule-pos' : isZero ? 'color-rule-zero' : 'color-rule-neg';
                  const badgeClass = isPos ? 'color-rule-pos-badge' : isZero ? 'color-rule-zero-badge' : 'color-rule-neg-badge';
                  const stripeCls = isPos ? 'bg-emerald-400' : isZero ? 'bg-amber-400' : 'bg-rose-400';
                  const btnId = (pageIdx === 0 && tagIdx === 0) ? 'first-quick-tag-btn' : `quick-tag-btn-${tag.id}`;

                  return `
                    <button id="${btnId}" onclick="matrixView.applyTagToSelected('${currentClassId}', '${tag.id}')"
                      class="quick-tag-button overflow-hidden relative p-2.5 pl-3.5 sm:p-3 sm:pl-4 rounded-2xl border-2 text-left transition shadow-sm active:scale-95 flex items-center justify-between gap-1.5 min-h-[56px] sm:min-h-[64px] ${btnClass}">
                      <span class="absolute left-1.5 inset-y-2.5 w-1 rounded-full ${stripeCls} opacity-85 pointer-events-none" aria-hidden="true"></span>
                      <div class="flex flex-col min-w-0 flex-1 overflow-hidden">
                        <span class="text-xs sm:text-base font-black truncate ${isOAA ? 'text-white drop-shadow' : 'text-slate-900'} leading-tight">${tag.name}</span>
                        <span class="text-[11px] sm:text-xs ${isOAA ? 'text-slate-200' : 'text-slate-500'} font-bold mt-0.5 truncate">${tag.category === 'academic' ? '數學學業' : tag.category === 'discipline' ? '生活常規' : tag.category === 'conflict' ? '同儕衝突' : '日常記事'}</span>
                      </div>
                      <span class="text-xs sm:text-sm font-black font-mono tabular-nums px-2 sm:px-3 py-0.5 sm:py-1 rounded-xl border whitespace-nowrap shrink-0 ${badgeClass}">
                        ${tag.delta > 0 ? '+' : ''}${tag.delta}
                      </span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Bottom Swipe Indicator & Clickable Dots -->
        ${tagPages.length > 1 ? `
          <div class="mt-2.5 flex flex-col items-center gap-1.5">
            <div id="tag-page-dots" class="flex items-center justify-center gap-1.5">
              ${tagPages.map((_, i) => `
                <button type="button" onclick="matrixView.scrollToTagPage(${i})" aria-label="第 ${i + 1} 頁"
                  class="${i === this.currentTagPage ? 'w-5 h-2.5 rounded-full bg-pink-600' : 'w-2.5 h-2.5 rounded-full bg-pink-200'} transition-[width,background-color] duration-200 cursor-pointer"></button>
              `).join('')}
            </div>
            <div class="text-center text-[11px] text-slate-400 font-bold">
              <span>第 ${this.currentTagPage + 1} / ${tagPages.length} 頁（左右滑動 或 點按圓點翻頁）</span>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Low-Frequency Seating & Roster Setup Section (Placed at the Very Bottom) -->
      <div class="mb-6">
        <button id="desk-drawer-seat-btn" type="button" aria-expanded="${(this.activeDeskDrawer === 'seat' || this.isJiggleMode) ? 'true' : 'false'}" onclick="matrixView.toggleDeskDrawer('seat')" class="w-full min-h-[40px] px-3.5 py-2 text-xs font-bold ${(this.activeDeskDrawer === 'seat' || this.isJiggleMode) ? (isOAA ? 'bg-amber-600/30 border border-amber-400 text-amber-200' : 'bg-amber-100 border border-amber-400 text-amber-950') : (isOAA ? 'bg-[#1c0913]/90 border border-amber-500/30 text-amber-200/85 hover:bg-[#2b0e1e]' : 'bg-white/90 text-slate-600 border border-pink-200 hover:bg-pink-50')} rounded-2xl transition flex items-center justify-between gap-2 cursor-pointer">
          <span class="flex items-center gap-1.5">
            <span>🪑</span>
            <span>座位排數與換位設定（目前 ${cols} 排・自由換位・批次貼名單）</span>
          </span>
          <span class="text-[11px] opacity-80">${(this.activeDeskDrawer === 'seat' || this.isJiggleMode) ? '收起 ▴' : '展開 ▾'}</span>
        </button>

        <div id="matrix-seating-drawer" class="${(this.activeDeskDrawer === 'seat' || this.isJiggleMode) ? '' : 'hidden'} mt-2 p-3 rounded-2xl ${isOAA ? 'bg-[#240e1b] border border-amber-500/45 text-amber-100' : 'bg-amber-50/80 border border-amber-200 text-slate-800'} space-y-2.5 text-xs shadow-sm animate-fade-in-up">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="font-black ${isOAA ? 'text-amber-300' : 'text-amber-900'}">📐 班級橫排數：</span>
              ${[4, 5, 6, 7].map(cNum => `
                <button type="button" onclick="matrixView.setClassCols('${currentClassId}', ${cNum})"
                  class="min-h-[30px] px-2.5 py-1 rounded-lg font-black transition cursor-pointer ${cols === cNum
                    ? (isOAA ? 'bg-amber-500 text-black border border-amber-300 shadow-sm' : 'bg-pink-600 text-white border border-pink-700 shadow-sm')
                    : (isOAA ? 'bg-[#15060e] text-amber-200 border border-amber-500/35 hover:bg-[#2c0e1e]' : 'bg-white text-slate-700 border border-amber-300 hover:bg-amber-100')}">
                  ${cNum}排
                </button>
              `).join('')}
            </div>

            ${cols > 4 ? `
              <button type="button" onclick="matrixView.toggleMobileGridDensity('${currentClassId}')" class="sm:hidden min-h-[30px] px-2.5 py-1 text-xs font-black whitespace-nowrap ${isOAA ? 'bg-[#15060e] border border-amber-500/50 text-amber-200' : 'bg-white border border-pink-300 text-pink-700'} rounded-lg shadow-xs transition active:scale-95 flex items-center gap-1 cursor-pointer">
                <span>${this.mobileGridDensity === 'exact' ? `目前：原班${cols}排（點改4欄大卡）` : `目前：舒適4欄（點看原班${cols}排）`}</span>
              </button>
            ` : ''}
          </div>

          <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t ${isOAA ? 'border-amber-500/20' : 'border-amber-200/80'}">
            <span class="font-black ${isOAA ? 'text-amber-300' : 'text-amber-900'}">🪑 排座位：</span>
            <button type="button" onclick="matrixView.toggleJiggleMode('${currentClassId}')" class="min-h-[30px] px-2.5 py-1 rounded-lg font-black transition cursor-pointer ${this.isJiggleMode ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm' : (isOAA ? 'bg-amber-700/40 text-amber-200 border border-amber-500/50' : 'bg-white text-amber-900 border border-amber-300')}">
              ${this.isJiggleMode ? '✅ 完成排位' : '✋ 拖曳自由換位'}
            </button>
            <button type="button" onclick="matrixView.applyAutoArrange('${currentClassId}', 'normal')" class="min-h-[30px] px-2.5 py-1 rounded-lg font-bold ${isOAA ? 'bg-[#15060e] border border-amber-500/35 text-amber-200' : 'bg-white border border-amber-300 text-amber-900'} cursor-pointer">📐 常規</button>
            <button type="button" onclick="matrixView.applyAutoArrange('${currentClassId}', 'snake_s')" class="min-h-[30px] px-2.5 py-1 rounded-lg font-bold ${isOAA ? 'bg-[#15060e] border border-amber-500/35 text-amber-200' : 'bg-white border border-amber-300 text-amber-900'} cursor-pointer">🔄 S型</button>
            <button type="button" onclick="matrixView.applyAutoArrange('${currentClassId}', 'col_first')" class="min-h-[30px] px-2.5 py-1 rounded-lg font-bold ${isOAA ? 'bg-[#15060e] border border-amber-500/35 text-amber-200' : 'bg-white border border-amber-300 text-amber-900'} cursor-pointer">📊 左至右</button>
            <button type="button" onclick="matrixView.applyAutoArrange('${currentClassId}', 'random')" class="min-h-[30px] px-2.5 py-1 rounded-lg font-bold ${isOAA ? 'bg-[#15060e] border border-amber-500/35 text-amber-200' : 'bg-white border border-amber-300 text-amber-900'} cursor-pointer">🎲 隨機換位</button>
          </div>

          <div class="flex flex-wrap items-center gap-1.5 pt-2 border-t ${isOAA ? 'border-amber-500/20' : 'border-amber-200/80'}">
            <span class="font-black ${isOAA ? 'text-amber-300' : 'text-amber-900'}">📂 班級與名單：</span>
            <button type="button" onclick="rosterManager.openBatchPasteModal('${currentClassId}')" class="min-h-[30px] px-2.5 py-1 rounded-lg font-black ${isOAA ? 'bg-[#15060e] border border-amber-500/40 text-amber-200 hover:bg-[#2c0e1e]' : 'bg-white border border-pink-300 text-pink-700 hover:bg-pink-50'} cursor-pointer">📋 批次貼上名單</button>
            <button type="button" onclick="rosterManager.openNewClassModal()" class="min-h-[30px] px-2.5 py-1 rounded-lg font-bold ${isOAA ? 'bg-[#15060e] border border-amber-500/35 text-amber-200 hover:bg-[#2c0e1e]' : 'bg-white border border-amber-300 text-slate-700 hover:bg-amber-100'} cursor-pointer">➕ 新增班級</button>
            <button type="button" onclick="appState.switchTab('roster')" class="min-h-[30px] px-2.5 py-1 rounded-lg font-bold ${isOAA ? 'bg-[#15060e] border border-amber-500/35 text-amber-200 hover:bg-[#2c0e1e]' : 'bg-white border border-amber-300 text-slate-700 hover:bg-amber-100'} cursor-pointer">⚙️ 名單微調</button>
          </div>
        </div>
      </div>

      <!-- Sticky Thumb-Zone Quick Selection Action Bar (Auto-appears when 1+ students selected in Live mode) -->
      <div id="floating-selection-action-bar"
           class="fixed left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-2xl z-30 rounded-2xl p-2.5 shadow-[0_-8px_28px_rgba(244,63,94,0.20)] border-2 transition-[transform,opacity] duration-200 will-change-transform ${isOAA ? 'bg-[#1e0914] border-amber-400/90 text-white' : 'bg-white border-pink-400 text-slate-900'} ${(this.selectedSeats.size > 0 && !this.isJiggleMode) ? '' : 'translate-y-24 opacity-0 pointer-events-none'}">
        <div class="flex items-center justify-between gap-2 mb-2 px-0.5">
          <span id="floating-sel-summary" class="text-xs font-black truncate ${isOAA ? 'text-amber-300' : 'text-pink-700'}">
            🎯 已選 ${this.selectedSeats.size} 人
          </span>
          <div class="flex flex-wrap items-center gap-1.5 shrink-0">
            <button type="button" id="floating-student-history-btn" onclick="matrixView.openSelectedStudentHistory('${currentClassId}')" class="${this.selectedSeats.size === 1 ? '' : 'hidden'} min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer ${isOAA ? 'bg-cyan-950/75 text-cyan-200 border border-cyan-400/60 hover:bg-cyan-900' : 'bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100'}" title="查看該生紀錄並修改誤按">
              📋 紀錄/改錯
            </button>
            <button type="button" id="floating-quick-adjust-btn" onclick="matrixView.openQuickAdjustModal('${currentClassId}')" class="min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer ${isOAA ? 'bg-amber-900/60 text-amber-200 border border-amber-400/60' : 'bg-amber-50 text-amber-900 border border-amber-300'}">
              ✏️ 改分/備註
            </button>
            <button type="button" onclick="matrixView.scrollToTagDock()" class="min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer ${isOAA ? 'bg-[#2c0e1e] text-amber-200 border border-amber-500/40' : 'bg-pink-50 text-pink-700 border border-pink-200'}">
              全部標籤 ▾
            </button>
            <button type="button" onclick="matrixView.clearSelection()" class="min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer ${isOAA ? 'bg-rose-950 text-rose-200 border border-rose-500/50' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
              ✕ 清空
            </button>
          </div>
        </div>
        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          ${sortedTags.slice(0, 6).map(tag => {
            const isPos = tag.delta > 0;
            const isZero = tag.delta === 0;
            const chipCls = isPos ? 'color-rule-pos' : isZero ? 'color-rule-zero' : 'color-rule-neg';
            return `
              <button type="button" onclick="matrixView.applyTagToSelected('${currentClassId}', '${tag.id}')"
                class="floating-tag-btn shrink-0 min-h-[40px] px-3 py-1.5 rounded-xl border-2 text-xs font-black flex items-center gap-1.5 active:scale-95 transition cursor-pointer ${chipCls}">
                <span class="whitespace-nowrap">${tag.name}</span>
                <span class="font-mono font-black">${tag.delta > 0 ? '+' : ''}${tag.delta}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  handleTouchStart(e) {
    if (e.touches && e.touches.length > 0) {
      this.touchStartX = e.touches[0].clientX;
    }
  }

  handleTouchEnd(e) {
    if (e.changedTouches && e.changedTouches.length > 0) {
      const touchEndX = e.changedTouches[0].clientX;
      const diffX = this.touchStartX - touchEndX;

      // Swipe Left (Next Page strictly by 1)
      if (diffX > 45) {
        this.nextTagPage();
      }
      // Swipe Right (Prev Page strictly by 1)
      else if (diffX < -45) {
        this.prevTagPage();
      }
    }
  }

  prevTagPage() {
    if (this.currentTagPage > 0) {
      this.scrollToTagPage(this.currentTagPage - 1);
    }
  }

  nextTagPage() {
    if (this.currentTagPage < (this.maxTagPages || 1) - 1) {
      this.scrollToTagPage(this.currentTagPage + 1);
    }
  }

  scrollToTagPage(pageIdx) {
    this.currentTagPage = pageIdx;
    const box = document.getElementById('tag-pager-scroll-box');
    if (box) {
      box.scrollTo({
        left: box.clientWidth * pageIdx,
        behavior: 'smooth'
      });
    }
    this.updateTagDots(pageIdx);
  }

  handleTagPagerScroll(el) {
    if (this._tagScrollRaf) return;
    this._tagScrollRaf = requestAnimationFrame(() => {
      this._tagScrollRaf = null;
      const width = el.clientWidth;
      if (width > 0) {
        const page = Math.round(el.scrollLeft / width);
        if (page !== this.currentTagPage) {
          this.currentTagPage = page;
          this.updateTagDots(page);
        }
      }
    });
  }

  updateTagDots(activeIdx) {
    const dotsContainer = document.getElementById('tag-page-dots');
    if (!dotsContainer) return;
    const dots = dotsContainer.querySelectorAll('button');
    dots.forEach((dot, idx) => {
      if (idx === activeIdx) {
        dot.className = 'w-5 h-2.5 rounded-full bg-pink-600 transition-[width,background-color] duration-200';
      } else {
        dot.className = 'w-2.5 h-2.5 rounded-full bg-pink-200 transition-[width,background-color] duration-200';
      }
    });
  }

  toggleSeatSelection(seatNo, classId = window.appState?.currentClassId) {
    if (this.armedTagId && !this.isJiggleMode) {
      this.selectedSeats = new Set([seatNo]);
      this.applyTagToSelected(classId, this.armedTagId, true);
      return;
    }
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

  openSelectedStudentHistory(classId = window.appState?.currentClassId) {
    if (this.selectedSeats.size !== 1) {
      window.appState?.showToast('請先點選單一位學生即可檢視該生近期紀錄與改錯', 'info');
      return;
    }
    const [seatNo] = Array.from(this.selectedSeats);
    this.openStudentQuickHistoryModal(classId, seatNo);
  }

  openStudentQuickHistoryModal(classId, seatNo) {
    const student = this.store.getStudent(classId, seatNo);
    if (!student) return;
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const cleanName = window.cqCleanStudentName ? window.cqCleanStudentName(student.name, student.seatNo) : student.name;
    const rankInfo = this.store.getClassStudentRanks ? (this.store.getClassStudentRanks(classId)[seatNo] || {}) : {};
    const regularScore = Number(rankInfo.regularScore ?? 80);
    const netDelta = Number(rankInfo.netDelta ?? 0);
    const tier = rankInfo.tier || 'B';
    const events = (this.store.getEvents(classId) || [])
      .filter(e => Number(e.seatNo) === Number(seatNo))
      .sort((a, b) => `${b.date || ''} ${b.time || ''}`.localeCompare(`${a.date || ''} ${a.time || ''}`))
      .slice(0, 15);
    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';

    modalContent.innerHTML = `
      <div class="p-4 sm:p-6 max-h-[85vh] overflow-y-auto ${isOAA ? 'bg-[#1f0a16] text-white' : 'bg-white text-slate-900'}">
        <div class="flex items-start justify-between gap-2 pb-3 mb-4 border-b ${isOAA ? 'border-amber-500/35' : 'border-pink-200'}">
          <div class="min-w-0 flex-1">
            <h3 class="text-base sm:text-lg font-black ${isOAA ? 'text-amber-300' : 'text-slate-900'} flex flex-wrap items-center gap-2">
              <span>${String(seatNo).padStart(2, '0')} 號 ${cleanName}</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-mono ${isOAA ? 'bg-amber-950 text-amber-200 border border-amber-500/50' : 'bg-pink-100 text-pink-800'}">${regularScore} 分 (${tier}級)</span>
              <span class="text-xs font-mono font-bold ${netDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}">淨點 ${netDelta > 0 ? '+' : ''}${netDelta}</span>
            </h3>
            <p class="text-xs ${isOAA ? 'text-amber-200/75' : 'text-slate-500'} mt-1">不必離開點記板即可直接改分、刪除誤按或打開完整評估卡</p>
          </div>
          <button type="button" onclick="appState.closeModal()" class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-black cursor-pointer ${isOAA ? 'bg-rose-950 text-amber-300' : 'bg-slate-100 text-slate-600'}">✕</button>
        </div>

        <div class="flex flex-wrap items-center gap-2 mb-4">
          <button type="button" onclick="matrixView.openQuickAdjustModal('${classId}')" class="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${isOAA ? 'bg-gradient-to-r from-amber-600 to-rose-700 text-white border border-amber-400/70' : 'bg-pink-600 text-white hover:bg-pink-700'}">
            ✏️ 立即加減分
          </button>
          <button type="button" onclick="appState.closeModal(); if (window.dashboardCharts) dashboardCharts.jumpToStudentDossier('${classId}', ${seatNo}); else appState.switchStudentsSubTab('student-dossier', ${seatNo});" class="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${isOAA ? 'bg-[#170610] text-amber-200 border border-amber-500/45 hover:bg-[#2a0e1e]' : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'}">
            👤 完整能力評估卡
          </button>
        </div>

        <div class="space-y-2">
          ${events.length === 0 ? `
            <div class="p-6 text-center rounded-2xl border border-dashed text-xs font-bold ${isOAA ? 'border-amber-500/30 text-amber-200/70' : 'border-pink-200 text-slate-500'}">
              本期尚無記點明細，可直接點上方「✏️ 立即加減分」或關閉後點下方標籤記點
            </div>
          ` : events.map(evt => `
            <div class="p-2.5 sm:p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${isOAA ? 'bg-[#16060f] border-amber-500/25' : 'bg-pink-50/50 border-pink-100'}">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="font-mono font-black px-1.5 py-0.5 rounded ${Number(evt.delta) > 0 ? 'color-rule-pos-badge' : Number(evt.delta) < 0 ? 'color-rule-neg-badge' : 'color-rule-zero-badge'}">${evt.delta > 0 ? '+' : ''}${evt.delta}</span>
                  <strong class="font-black ${isOAA ? 'text-white' : 'text-slate-900'}">${evt.tagName || '自訂記點'}</strong>
                  <span class="text-[11px] opacity-65 font-mono">${evt.date || ''} ${evt.period ? `(${window.cqFormatPeriodLabel ? window.cqFormatPeriodLabel(evt.period) : evt.period})` : ''}</span>
                </div>
                ${evt.note ? `<div class="text-[11px] ${isOAA ? 'text-amber-100/75' : 'text-slate-600'} mt-1 truncate">${evt.note}</div>` : ''}
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button type="button" onclick="window.appState.openEditEventModal('${evt.id}', () => { matrixView.render('classroom-matrix-view', '${classId}'); matrixView.openStudentQuickHistoryModal('${classId}', ${seatNo}); })" class="px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${isOAA ? 'border-amber-500/40 text-amber-200 hover:bg-rose-950' : 'border-pink-200 bg-white text-pink-700 hover:bg-pink-50'}">
                  ✏️ 修改
                </button>
                <button type="button" onclick="matrixView.deleteEventInQuickModal('${evt.id}', '${classId}', ${seatNo})" class="px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${isOAA ? 'border-rose-500/40 text-rose-300 hover:bg-rose-950' : 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50'}">
                  🗑️ 撤銷
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
  }

  deleteEventInQuickModal(eventId, classId, seatNo) {
    if (!eventId || !this.store.deleteEvent) return;
    if (this.store.deleteEvent(eventId)) {
      window.appState?.showToast('已撤銷該筆點記並即時更新分數', 'success');
      this.render('classroom-matrix-view', classId);
      this.openStudentQuickHistoryModal(classId, seatNo);
    }
  }

  selectAll() {
    const currentClassId = window.appState.currentClassId;
    const students = this.store.getStudents(currentClassId);
    students.forEach(s => this.selectedSeats.add(s.seatNo));
    if (window.appState?.playPop) window.appState.playPop();
    this.updateSelectionUI(currentClassId);
  }

  clearSelection() {
    this.selectedSeats.clear();
    this.updateSelectionUI(window.appState.currentClassId);
  }

  updateSelectionUI(classId) {
    const students = this.store.getStudents(classId);
    students.forEach(s => {
      const card = document.getElementById(`seat-card-${s.seatNo}`);
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

    const histBtn = document.getElementById('floating-student-history-btn');
    if (histBtn) {
      if (this.selectedSeats.size === 1) {
        histBtn.classList.remove('hidden');
      } else {
        histBtn.classList.add('hidden');
      }
    }

    const floatingBar = document.getElementById('floating-selection-action-bar');
    if (floatingBar) {
      if (this.selectedSeats.size > 0 && !this.isJiggleMode) {
        floatingBar.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
      } else {
        floatingBar.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
      }
    }

    const summaryEl = document.getElementById('floating-sel-summary');
    if (summaryEl) {
      const picked = students
        .filter(s => this.selectedSeats.has(s.seatNo))
        .slice(0, 3)
        .map(s => `${String(s.seatNo).padStart(2, '0')} ${s.name}`);
      const suffix = this.selectedSeats.size > 3 ? ` 等 ${this.selectedSeats.size} 人` : '';
      summaryEl.innerText = picked.length > 0
        ? `🎯 已選 ${this.selectedSeats.size} 人（${picked.join('、')}${suffix}）`
        : '🎯 已選 0 人';
    }
  }

  applyTagToSelected(classId, tagId, keepStamp = false) {
    const tag = this.store.getTags(classId).find(t => t.id === tagId);
    if (!tag) return;

    if (this.selectedSeats.size === 0) {
      this.armedTagId = (this.armedTagId === tagId) ? null : tagId;
      if (window.appState?.playPop) window.appState.playPop();
      if (this.armedTagId) {
        window.appState?.showToast(`🎯 已拿起【${tag.name} (${tag.delta > 0 ? '+' : ''}${tag.delta})】印章！請直接點學生座位加扣分`, 'info');
      } else {
        window.appState?.showToast('已收起印章模式', 'info');
      }
      this.render('classroom-matrix-view', classId);
      return;
    }

    const activeSlot = this.timetable.detectActiveSlot();
    const period = activeSlot.period !== null ? activeSlot.period : 1;

    const seatsToProcess = Array.from(this.selectedSeats);
    const milestoneSeats = new Set();
    const beforeRanks = (tag.delta > 0 && this.store.getClassStudentRanks) ? this.store.getClassStudentRanks(classId) : {};

    try {
      let appliedCount = 0;
      const createdEventIds = [];

      seatsToProcess.forEach(seatNo => {
        const created = this.store.addEvent({
          classId,
          seatNo,
          period,
          tagId: tag.id,
          tagName: tag.name,
          category: tag.category,
          delta: tag.delta,
          severity: tag.severity,
          note: `課堂記點：${tag.name}`
        });
        if (created && created.id) {
          createdEventIds.push(created.id);
        }

        appliedCount++;
      });

      if (createdEventIds.length > 0) {
        this.pushUndoEntry({
          classId,
          eventIds: createdEventIds,
          tagName: tag.name,
          delta: tag.delta,
          seats: [...seatsToProcess]
        });
      }

      if (tag.delta > 0 && this.store.getClassStudentRanks) {
        const afterRanks = this.store.getClassStudentRanks(classId);
        seatsToProcess.forEach(seatNo => {
          const prev = Number(beforeRanks[seatNo]?.regularScore ?? 80);
          const next = Number(afterRanks[seatNo]?.regularScore ?? 80);
          if (prev < 100 && next >= 100) {
            milestoneSeats.add(seatNo);
          }
        });
      }

      // Sound effect
      if (tag.delta > 0 && window.appState?.playChime) {
        window.appState.playChime();
      } else if (tag.delta < 0 && window.appState?.playWarning) {
        window.appState.playWarning();
      }

      const milestoneNote = milestoneSeats.size > 0 ? ' 🏆 滿分里程碑達成！' : '';
      const stampHint = keepStamp ? '（印章連點中，可繼續點其他學生）' : '（誤按可點上方復原）';
      window.appState.showToast(`⚡ 已為 ${appliedCount} 位同學記錄「${tag.name} (${tag.delta > 0 ? '+' : ''}${tag.delta})」${milestoneNote}${stampHint}`, 'success');
    } catch (err) {
      console.error('[ClassroomMatrix] applyTagToSelected error:', err);
    } finally {
      this.clearSelection(classId);
      this.render('classroom-matrix-view', classId);
      seatsToProcess.forEach(seatNo => this.showFloatingBubble(seatNo, tag.delta, milestoneSeats.has(seatNo)));
      if (tag.delta > 0) this.triggerCornerAnimePeek();
    }
  }

  triggerCornerAnimePeek() {
    try {
      const prev = document.getElementById('cq-corner-anime-peek');
      if (prev) prev.remove();
      const isOAA = (this.store?.getTheme?.() || 'kitty') === 'oaa';
      const oaaPics = [
        './assets/cote/official/ichinose_full.webp',
        './assets/cote/official/horikita_full.webp',
        './assets/cote/official/ayanokoji_full.webp',
        './assets/cote/official/sakayanagi_full.webp'
      ];
      const kittyPics = [
        './assets/images/hello_kitty.png',
        './assets/images/cinnamoroll.png',
        './assets/images/my_melody.png'
      ];
      const list = isOAA ? oaaPics : kittyPics;
      this._peekIdx = ((this._peekIdx || 0) + 1) % list.length;
      const el = document.createElement('img');
      el.id = 'cq-corner-anime-peek';
      el.src = list[this._peekIdx];
      el.alt = '';
      el.className = 'fixed right-3 bottom-20 md:bottom-14 h-20 sm:h-24 w-auto object-contain pointer-events-none select-none z-30 opacity-85 animate-fade-in-up drop-shadow-lg';
      document.body.appendChild(el);
      setTimeout(() => {
        el.remove();
      }, 1250);
    } catch (e) {}
  }

  showFloatingBubble(seatNo, delta, isMilestone = false) {
    const card = document.getElementById(`seat-card-${seatNo}`);
    if (!card) return;

    const bubble = document.createElement('div');
    bubble.className = `point-bubble ${delta > 0 ? (isMilestone ? 'text-amber-500' : 'text-emerald-600') : 'text-rose-600'} kitty-stamp-effect`;
    bubble.innerText = isMilestone ? `💯 +${delta}!` : `${delta > 0 ? '✨ +' : ''}${delta}`;
    card.appendChild(bubble);

    setTimeout(() => {
      bubble.remove();
    }, 800);
  }

  // --- Post-Class Retro-Logging & Recall Assistant (⏰ 課堂事後快速補記助手) ---
  openRetroLogModal(classId) {
    if (window.onboardingTour && window.onboardingTour.isActive) {
      window.onboardingTour.nextStep();
      return;
    }
    const students = this.store.getStudents(classId);
    const allTags = this.store.getTagsSortedByClassFrequency(classId);
    const curatedTags = window.cqGetCuratedTags ? window.cqGetCuratedTags(this.store, classId, 6) : allTags.slice(0, 6);
    const defaultDelta = curatedTags[0] ? Number(curatedTags[0].delta || 0) : 1;
    const defaultPeriod = window.cqGetDefaultRetroPeriod ? window.cqGetDefaultRetroPeriod() : '1';
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const today = window.getLocalDateStr();
    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';

    modalContent.innerHTML = `
      <div class="p-5 sm:p-6 max-h-[85vh] overflow-y-auto ${isOAA ? 'bg-[#1e0a15] text-white' : ''}">
        <div class="flex items-center space-x-3 mb-4">
          ${isOAA ? '<span class="text-2xl p-2 rounded-2xl bg-black/40 border border-amber-500/50">⏰</span>' : '<div class="sanrio-twinstars-badge !w-11 !h-11"></div>'}
          <div>
            <h3 class="text-lg sm:text-xl font-black ${isOAA ? 'text-amber-300' : 'text-slate-900'} flex items-center gap-1.5">
              ⏰ 事後快速補記
              ${isOAA ? '' : '<span class="kitty-bow"></span>'}
            </h3>
            <p class="text-xs ${isOAA ? 'text-amber-100/80' : 'text-slate-600'}">選時間 ➔ 勾學生 ➔ 選常用理由或直接調分補記</p>
          </div>
        </div>

        <form onsubmit="matrixView.saveRetroLog(event, '${classId}')" class="space-y-4">
          <!-- When (Date & Period) -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">發生日期</label>
              <input type="date" id="retro-date" value="${today}" required class="w-full border ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white' : 'border-pink-300 bg-white text-slate-900'} rounded-xl px-3 py-2 text-xs font-bold">
            </div>
            <div>
              <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">課堂節次</label>
              <select id="retro-period" class="w-full border ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white' : 'border-pink-300 bg-white text-slate-900'} rounded-xl px-3 py-2 text-xs font-bold">
                ${window.cqBuildPeriodOptionsHtml ? window.cqBuildPeriodOptionsHtml(defaultPeriod) : '<option value="1">第 1 節</option>'}
              </select>
            </div>
          </div>

          <!-- Who (Searchable multiselect students) -->
          <div>
            <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label class="text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'}">選擇學生 (可多選)</label>
              <div class="flex items-center gap-1.5">
                <input type="text" placeholder="快搜座號/姓名..." oninput="document.querySelectorAll('#retro-modal-seats label').forEach(el => { const h = el.getAttribute('data-search') || ''; const q = this.value.trim().toLowerCase(); el.style.display = (!q || h.includes(q)) ? '' : 'none'; })"
                  class="w-28 rounded-lg px-2 py-1 text-[11px] font-bold border ${isOAA ? 'border-amber-500/40 bg-[#12050c] text-white placeholder-slate-400' : 'border-pink-200 bg-white text-slate-800'} focus:outline-none">
                <button type="button" onclick="document.querySelectorAll('#retro-modal-seats label').forEach(l => { if (l.style.display !== 'none') l.querySelector('input').checked = true; })" class="px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${isOAA ? 'bg-amber-600/30 text-amber-200' : 'bg-pink-100 text-pink-800'}">全選</button>
                <button type="button" onclick="document.querySelectorAll('input[name=retro_seats]').forEach(i => i.checked = false)" class="px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${isOAA ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}">清空</button>
              </div>
            </div>
            <div id="retro-modal-seats" class="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2.5 rounded-2xl border ${isOAA ? 'border-amber-500/40 bg-[#12050c]' : 'border-pink-200 bg-pink-50/50'}">
              ${students.map(s => `
                <label data-search="${(`${s.seatNo} ${String(s.seatNo).padStart(2, '0')} ${s.name}`).toLowerCase()}" class="flex items-center space-x-1.5 text-xs cursor-pointer p-2 rounded-xl border min-h-[38px] ${isOAA ? 'border-amber-500/25 bg-[#1b0812] hover:bg-rose-950/80' : 'border-pink-100 bg-white hover:bg-pink-100'} transition">
                  <input type="checkbox" name="retro_seats" value="${s.seatNo}" class="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 shrink-0">
                  <span class="font-black truncate ${isOAA ? 'text-white' : 'text-slate-900'}">${String(s.seatNo).padStart(2, '0')} ${s.name}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- What (Curated Tag + Direct Score Adjustment) -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="sm:col-span-2">
              <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">常用理由（或自訂）</label>
              <select id="retro-tag" onchange="const opt = this.options[this.selectedIndex]; const d = opt.getAttribute('data-delta'); if (d !== null && d !== '') document.getElementById('retro-modal-delta').value = d;" class="w-full border ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white' : 'border-pink-300 bg-white text-slate-900'} rounded-xl px-3 py-2 text-xs font-bold">
                ${curatedTags.map(t => `
                  <option value="${t.id}" data-name="${t.name}" data-delta="${t.delta}" data-category="${t.category}" data-severity="${t.severity}">
                    ${t.name} (${t.delta > 0 ? '+' : ''}${t.delta} 分)
                  </option>
                `).join('')}
                <option value="__custom__" data-name="自訂事後補記" data-delta="" data-category="social" data-severity="info">✏️ 自訂理由（以下方備註為主）</option>
                ${allTags.filter(t => !curatedTags.some(c => c.id === t.id)).map(t => `
                  <option value="${t.id}" data-name="${t.name}" data-delta="${t.delta}" data-category="${t.category}" data-severity="${t.severity}">
                    [更多] ${t.name} (${t.delta > 0 ? '+' : ''}${t.delta} 分)
                  </option>
                `).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">加減分值</label>
              <input type="number" id="retro-modal-delta" value="${defaultDelta}" class="w-full border ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white' : 'border-pink-300 bg-white text-slate-900'} rounded-xl px-3 py-2 text-xs font-mono font-black text-center">
            </div>
          </div>

          <!-- Detail Note -->
          <div>
            <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">詳細事證或自訂理由 (選填)</label>
            <input type="text" id="retro-note" placeholder="如：第2節解出三角幾何難題 / 作業補齊..." class="w-full border ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white' : 'border-pink-300 bg-white text-slate-900'} rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-pink-500">
          </div>

          <div class="flex items-center justify-end space-x-3 pt-2">
            <button type="button" onclick="window.appState.closeModal()" class="px-4 py-2 text-xs font-bold ${isOAA ? 'text-slate-300 hover:text-white' : 'text-slate-600'}">取消</button>
            <button type="submit" class="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="check" class="w-4 h-4"></i> 快速批次補記
            </button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  saveRetroLog(e, classId) {
    e.preventDefault();
    const checkboxes = document.querySelectorAll('input[name="retro_seats"]:checked');
    const seats = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));

    if (seats.length === 0) {
      window.appState.showToast('請至少勾選一位學生', 'warning');
      return;
    }

    const date = document.getElementById('retro-date').value;
    const period = document.getElementById('retro-period').value;
    const note = document.getElementById('retro-note').value.trim();
    const tagSelect = document.getElementById('retro-tag');
    const selectedOpt = tagSelect.options[tagSelect.selectedIndex];
    const deltaInput = document.getElementById('retro-modal-delta');

    let tagName = selectedOpt.getAttribute('data-name') || '自訂事後補記';
    const rawDelta = deltaInput ? parseInt(deltaInput.value, 10) : parseInt(selectedOpt.getAttribute('data-delta'), 10);
    const delta = Number.isFinite(rawDelta) ? rawDelta : 0;
    const category = selectedOpt.getAttribute('data-category') || (delta >= 0 ? 'social' : 'discipline');
    const severity = delta > 0 ? 'positive' : delta < 0 ? 'warning' : 'neutral';

    if (tagSelect.value === '__custom__' && note) {
      tagName = note.length > 14 ? note.slice(0, 14) + '…' : note;
    }

    seats.forEach(seatNo => {
      this.store.addEvent({
        classId,
        seatNo,
        date,
        period,
        tagId: tagSelect.value === '__custom__' ? 'custom_retro' : tagSelect.value,
        tagName,
        category,
        delta,
        severity,
        note: note ? `[事後補記] ${note}` : `[事後補記] ${tagName}`
      });
    });

    if (delta > 0 && window.appState?.playChime) {
      window.appState.playChime();
    } else if (delta < 0 && window.appState?.playWarning) {
      window.appState.playWarning();
    }

    const periodLabel = window.cqFormatPeriodLabel ? window.cqFormatPeriodLabel(period) : `第 ${period} 節`;
    window.appState.showToast(`🎉 已成功補記 ${seats.length} 位同學在 ${date} ${periodLabel}之記錄 (${delta > 0 ? '+' : ''}${delta}分)！`, 'success');
    window.appState.closeModal();
    this.render('classroom-matrix-view', classId);
    if (window.eventsLogView && document.getElementById('events-log-view')) {
      window.eventsLogView.render('events-log-view');
    }
    if (window.retroLogView && document.getElementById('matrix-retro-host')) {
      window.retroLogView.render('matrix-retro-host', classId);
    }
  }

  openRandomPickerModal(classId) {
    const students = this.store.getStudents(classId);
    if (!students || students.length === 0) return;

    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';

    modalContent.innerHTML = `
      <div class="text-center p-6 ${isOAA ? 'bg-[#1e0a15] text-white' : ''}">
        <div class="flex justify-center mb-3">
          ${isOAA ? '<span class="text-4xl p-3 rounded-2xl bg-black/40 border border-amber-500/50">🏛️</span>' : '<div class="sanrio-twinstars-badge !w-16 !h-16"></div>'}
        </div>
        <h3 class="text-xl sm:text-2xl font-black mb-1 flex items-center justify-center gap-2 ${isOAA ? 'text-amber-300' : 'text-pink-600'}">
          ${isOAA ? 'S-SYSTEM 隨機指派抽取' : '三麗鷗幸運抽籤點名'}
          ${isOAA ? '' : '<span class="kitty-bow"></span>'}
        </h3>
        <p class="text-xs ${isOAA ? 'text-amber-100/80' : 'text-slate-600'} mb-5 font-medium">隨機抽取一位同學上台解題或口頭回答</p>

        <!-- Big Display Card -->
        <div id="picker-result-box" class="glass-card rounded-2xl p-5 border-2 border-dashed ${isOAA ? 'border-amber-500/50 bg-[#12050c]' : 'border-pink-300 bg-pink-50/50'} mb-5 flex flex-col items-center justify-center min-h-[140px]">
          <span class="${isOAA ? 'text-amber-200/70' : 'text-slate-500'} text-sm font-bold">點擊下方開始抽取</span>
        </div>

        <div class="flex items-center justify-center gap-3">
          <button id="btn-start-pick" onclick="matrixView.runPickerAnimation('${classId}')" 
            class="px-6 py-2.5 rounded-2xl font-black text-white ${isOAA ? 'bg-gradient-to-r from-amber-600 to-rose-700 hover:from-amber-500 hover:to-rose-600 border border-amber-400' : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700'} shadow-lg shadow-pink-500/25 transition flex items-center gap-2 text-sm">
            <i data-lucide="play" class="w-4 h-4"></i> 開始抽籤
          </button>
          <button onclick="window.appState.closeModal()" class="px-5 py-2.5 rounded-2xl font-bold border ${isOAA ? 'border-amber-500/50 text-amber-200 hover:bg-rose-950' : 'border-pink-300 text-slate-700 hover:bg-pink-50'} transition text-sm">
            關閉
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  runPickerAnimation(classId) {
    const students = this.store.getStudents(classId);
    const box = document.getElementById('picker-result-box');
    const startBtn = document.getElementById('btn-start-pick');
    if (!box || !startBtn) return;

    startBtn.disabled = true;
    startBtn.classList.add('opacity-50', 'cursor-not-allowed');

    let count = 0;
    const maxSteps = 18;
    const interval = setInterval(() => {
      const randIdx = Math.floor(Math.random() * students.length);
      const tempStudent = students[randIdx];
      const isOAARun = window.appStore && window.appStore.getTheme() === 'oaa';
      box.innerHTML = `
        <div class="text-3xl font-black ${isOAARun ? 'text-amber-300' : 'text-pink-600'} animate-pulse">${String(tempStudent.seatNo).padStart(2, '0')} 號</div>
        <div class="text-lg font-black mt-1 ${isOAARun ? 'text-white' : 'text-slate-800'}">${tempStudent.name}</div>
      `;
      count++;

      if (count >= maxSteps) {
        clearInterval(interval);
        startBtn.disabled = false;
        startBtn.classList.remove('opacity-50', 'cursor-not-allowed');

        const chosenStudent = students[Math.floor(Math.random() * students.length)];
        box.innerHTML = `
          <div class="text-4xl font-black ${isOAARun ? 'text-amber-300' : 'text-pink-600'} drop-shadow-sm">🌟 ${String(chosenStudent.seatNo).padStart(2, '0')} 號</div>
          <div class="text-xl font-black mt-1 ${isOAARun ? 'text-white' : 'text-slate-900'}">${chosenStudent.name}</div>
          
          <div class="flex items-center gap-2 mt-4">
            <button onclick="matrixView.quickAwardPicker('${classId}', ${chosenStudent.seatNo}, 1, '抽籤解題優異')" class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black hover:bg-emerald-100 transition shadow-sm">
              +1 解題優異
            </button>
            <button onclick="matrixView.quickAwardPicker('${classId}', ${chosenStudent.seatNo}, -1, '抽籤分心未答')" class="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-300 text-xs font-black hover:bg-rose-100 transition shadow-sm">
              -1 分心/未答
            </button>
          </div>
        `;
      }
    }, 60);
  }

  quickAwardPicker(classId, seatNo, delta, note) {
    const activeSlot = this.timetable.detectActiveSlot();
    const period = activeSlot.period !== null ? activeSlot.period : 1;

    this.store.addEvent({
      classId,
      seatNo,
      period,
      tagId: delta > 0 ? 'quick_plus' : 'quick_minus',
      tagName: delta > 0 ? '抽籤加點' : '抽籤扣點',
      category: 'discipline',
      delta,
      severity: delta > 0 ? 'positive' : 'warning',
      note
    });

    if (delta > 0 && window.appState?.playChime) {
      window.appState.playChime();
    } else if (delta < 0 && window.appState?.playWarning) {
      window.appState.playWarning();
    }

    window.appState.showToast(`已為 ${seatNo} 號記錄：${note} (${delta > 0 ? '+' : ''}${delta})`, 'success');
    window.appState.closeModal();
    this.render('classroom-matrix-view', classId);
  }

  openConflictModal(classId) {
    const students = this.store.getStudents(classId);
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';

    modalContent.innerHTML = `
      <div class="p-6 max-h-[85vh] overflow-y-auto ${isOAA ? 'bg-[#1e0a15] text-white' : ''}">
        <div class="flex items-center space-x-3 mb-4">
          ${isOAA ? '<span class="text-3xl p-2 rounded-2xl bg-black/40 border border-amber-500/50">⚠️</span>' : '<div class="sanrio-kuromi-badge !w-12 !h-12"></div>'}
          <div>
            <h3 class="text-xl font-black ${isOAA ? 'text-amber-300' : 'text-slate-900'}">重大常規 / 同儕衝突事件記錄</h3>
            <p class="text-xs ${isOAA ? 'text-amber-100/80' : 'text-slate-600'}">客觀記錄違紀或推擠衝突，作為日後家長晤談與輔導之具體事證</p>
          </div>
        </div>

        <form id="conflict-form" onsubmit="matrixView.saveConflictEvent(event, '${classId}')" class="space-y-4">
          <div>
            <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">涉事學生 (可複選)</label>
            <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-44 overflow-y-auto p-2.5 rounded-2xl border ${isOAA ? 'border-amber-500/40 bg-[#12050c]' : 'border-pink-200 bg-pink-50/50'}">
              ${students.map(s => `
                <label class="flex items-center space-x-1.5 text-xs cursor-pointer p-2 rounded-xl border min-h-[38px] ${isOAA ? 'border-amber-500/25 bg-[#1b0812]' : 'border-pink-100 bg-white'}">
                  <input type="checkbox" name="involved_seats" value="${s.seatNo}" class="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 shrink-0">
                  <span class="font-bold truncate ${isOAA ? 'text-white' : 'text-slate-800'}">${String(s.seatNo).padStart(2, '0')} ${s.name}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">事件類型</label>
              <select id="conflict-type" class="w-full border ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white' : 'border-pink-200 bg-white text-slate-900'} rounded-xl px-3 py-2 text-xs focus:outline-none">
                <option value="soc_phys_fight">肢體衝突 / 推擠打架 (-5分)</option>
                <option value="soc_verbal_fight">同儕重大言語口角 (-3分)</option>
                <option value="soc_property_damage">毀損公物 / 破壞私物 (-5分)</option>
                <option value="disc_severe_insubordination">重大頂撞師長 (-4分)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">發生節次</label>
              <select id="conflict-period" class="w-full border ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white' : 'border-pink-200 bg-white text-slate-900'} rounded-xl px-3 py-2 text-xs focus:outline-none">
                <option value="0">早自習</option>
                <option value="1">第 1 節</option>
                <option value="2">第 2 節</option>
                <option value="3">第 3 節</option>
                <option value="4">第 4 節</option>
                <option value="lunch" selected>午休時間</option>
                <option value="5">第 5 節</option>
                <option value="6">第 6 節</option>
                <option value="7">第 7 節</option>
                <option value="8">第 8 節 / 放學</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">事證詳細記錄</label>
            <textarea id="conflict-notes" rows="3" required placeholder="例：午休因借球起口角推擠，雙方帶至辦公室冷靜..." class="w-full border ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white' : 'border-pink-200 bg-white text-slate-900'} rounded-xl p-3 text-xs focus:outline-none"></textarea>
          </div>

          <div class="flex items-center justify-end space-x-3 pt-2">
            <button type="button" onclick="window.appState.closeModal()" class="px-4 py-2 text-xs font-bold ${isOAA ? 'text-slate-300 hover:text-white' : 'text-slate-600'}">取消</button>
            <button type="submit" class="px-5 py-2 text-xs font-black text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-xl shadow-md">確實記錄並扣點</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  saveConflictEvent(e, classId) {
    e.preventDefault();
    const checkboxes = document.querySelectorAll('input[name="involved_seats"]:checked');
    const seats = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));

    if (seats.length === 0) {
      window.appState.showToast('請至少勾選一位學生', 'warning');
      return;
    }

    const type = document.getElementById('conflict-type').value;
    const period = document.getElementById('conflict-period').value;
    const notes = document.getElementById('conflict-notes').value.trim();

    const tag = this.store.getTags(classId).find(t => t.id === type) || {
      id: type,
      name: '重大衝突違紀',
      category: 'conflict',
      delta: -5,
      severity: 'critical'
    };

    seats.forEach(seatNo => {
      this.store.addEvent({
        classId,
        seatNo,
        period,
        tagId: tag.id,
        tagName: tag.name,
        category: 'conflict',
        delta: tag.delta,
        severity: 'critical',
        note: `[重大事件] ${notes} (涉案座號: ${seats.join(', ')})`
      });
    });

    if (window.appState?.playWarning) window.appState.playWarning();

    window.appState.showToast(`已確實記錄座號 ${seats.join(', ')} 重大事件`, 'success');
    window.appState.closeModal();
    this.render('classroom-matrix-view', classId);
    seats.forEach(seatNo => this.showFloatingBubble(seatNo, tag.delta));
  }

  pushUndoEntry(entry) {
    if (!entry || !Array.isArray(entry.eventIds) || entry.eventIds.length === 0) return;
    if (!Array.isArray(this.undoStack)) this.undoStack = [];
    this.undoStack.unshift({
      id: 'undo_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      createdAt: Date.now(),
      ...entry
    });
    if (this.undoStack.length > 12) this.undoStack.length = 12;
  }

  getLatestUndoForClass(classId) {
    if (!Array.isArray(this.undoStack)) return null;
    return this.undoStack.find(u => u.classId === classId && Array.isArray(u.eventIds) && u.eventIds.length > 0) || null;
  }

  undoLastAction(classId = null) {
    const targetClass = classId || window.appState?.currentClassId;
    if (!Array.isArray(this.undoStack) || this.undoStack.length === 0) {
      window.appState?.showToast('目前沒有可復原的近期點記動作', 'info');
      return false;
    }
    const idx = targetClass
      ? this.undoStack.findIndex(u => u.classId === targetClass)
      : 0;
    if (idx === -1) {
      window.appState?.showToast('本班目前沒有近期可復原的點記', 'info');
      return false;
    }

    const entry = this.undoStack.splice(idx, 1)[0];
    const removedCount = this.store.deleteEventsBatch
      ? this.store.deleteEventsBatch(entry.eventIds)
      : entry.eventIds.filter(id => { this.store.deleteEvent(id); return true; }).length;

    if (window.appState?.playPop) window.appState.playPop();
    window.appState?.showToast(
      `↩️ 已復原誤按：「${entry.tagName} (${entry.delta > 0 ? '+' : ''}${entry.delta})」共 ${removedCount} 筆點記已撤回`,
      'info'
    );
    this.render('classroom-matrix-view', entry.classId);
    return removedCount > 0;
  }

  openQuickAdjustModal(classId) {
    if (this.selectedSeats.size === 0) {
      window.appState?.showToast('請先點選要修改或補加減分的學生座號', 'warning');
      return;
    }
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const seats = Array.from(this.selectedSeats).sort((a, b) => a - b);
    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';
    const presets = [-5, -3, -2, -1, 1, 2, 3, 5];

    modalContent.innerHTML = `
      <div class="p-5 sm:p-6 ${isOAA ? 'bg-[#1f0a16] text-white' : 'bg-white text-slate-900'}">
        <div class="flex items-center justify-between gap-2 pb-3 mb-4 border-b ${isOAA ? 'border-amber-500/40' : 'border-pink-200'}">
          <div>
            <h3 class="text-lg font-black ${isOAA ? 'text-amber-300' : 'text-slate-900'}">✏️ 自訂調分 / 誤按補扣修正</h3>
            <p class="text-xs ${isOAA ? 'text-amber-200/75' : 'text-slate-500'} mt-0.5">
              對象：已選 ${seats.length} 位同學（${seats.slice(0, 6).map(n => `${n}號`).join('、')}${seats.length > 6 ? '…' : ''}）
            </p>
          </div>
          <button type="button" onclick="appState.closeModal()" class="w-8 h-8 rounded-full flex items-center justify-center font-black cursor-pointer ${isOAA ? 'bg-rose-950 text-amber-300' : 'bg-slate-100 text-slate-600'}">✕</button>
        </div>

        <form onsubmit="matrixView.saveQuickAdjust(event, '${classId}')" class="space-y-4 text-xs sm:text-sm">
          <div>
            <label class="block font-black mb-2 ${isOAA ? 'text-amber-200' : 'text-slate-800'}">快速選擇增減點數：</label>
            <div class="grid grid-cols-4 gap-2 mb-2.5">
              ${presets.map(p => `
                <button type="button" onclick="matrixView.setQuickAdjustDelta(${p})" class="min-h-[38px] rounded-xl font-black text-xs cursor-pointer border transition active:scale-95 ${p < 0 ? (isOAA ? 'bg-rose-950/70 border-rose-500/50 text-rose-300 hover:bg-rose-900' : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100') : (isOAA ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100')}">
                  ${p > 0 ? '+' : ''}${p} 點
                </button>
              `).join('')}
            </div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-xs shrink-0">自訂數值：</span>
              <input id="quick-adjust-delta" type="number" step="1" required value="-1" class="w-full px-3 py-2 rounded-xl border font-mono font-black text-sm focus:outline-none ${isOAA ? 'bg-[#12050c] border-amber-500/60 text-amber-300' : 'bg-pink-50/40 border-pink-300 text-slate-900'}">
            </div>
          </div>

          <div>
            <label class="block font-black mb-1 ${isOAA ? 'text-amber-200' : 'text-slate-800'}">事由 / 標籤名稱：</label>
            <input id="quick-adjust-tagname" type="text" required value="加扣分修正" placeholder="例如：誤按修正、訂正補分" class="w-full px-3 py-2 rounded-xl border font-bold text-sm focus:outline-none ${isOAA ? 'bg-[#12050c] border-amber-500/50 text-white' : 'bg-white border-pink-300 text-slate-900'}">
          </div>

          <div>
            <label class="block font-black mb-1 ${isOAA ? 'text-amber-200' : 'text-slate-800'}">詳細備註（選填）：</label>
            <input id="quick-adjust-note" type="text" placeholder="例如：剛才誤觸加分，手動調整回來" class="w-full px-3 py-2 rounded-xl border font-medium text-sm focus:outline-none ${isOAA ? 'bg-[#12050c] border-amber-500/50 text-white' : 'bg-white border-pink-300 text-slate-900'}">
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button type="button" onclick="appState.closeModal()" class="px-4 py-2 rounded-xl font-bold text-xs cursor-pointer ${isOAA ? 'bg-[#2a0e1d] text-amber-200 border border-amber-500/40' : 'bg-slate-100 text-slate-700'}">取消</button>
            <button type="submit" class="px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm text-white cursor-pointer shadow-md ${isOAA ? 'bg-gradient-to-r from-amber-600 to-rose-700 border border-amber-400' : 'bg-gradient-to-r from-pink-500 to-rose-600'}">
              ✅ 確認套用調分
            </button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
  }

  setQuickAdjustDelta(val) {
    const el = document.getElementById('quick-adjust-delta');
    if (el) el.value = String(val);
    if (window.appState?.playPop) window.appState.playPop();
  }

  saveQuickAdjust(e, classId) {
    e.preventDefault();
    const delta = Number(document.getElementById('quick-adjust-delta')?.value);
    const tagName = (document.getElementById('quick-adjust-tagname')?.value || '').trim() || '加扣分修正';
    const note = (document.getElementById('quick-adjust-note')?.value || '').trim();
    if (!Number.isFinite(delta) || delta === 0) {
      window.appState?.showToast('請輸入非 0 的有效增減點數！', 'warning');
      return;
    }

    const activeSlot = this.timetable.detectActiveSlot();
    const period = activeSlot.period !== null ? activeSlot.period : 1;
    const seatsToProcess = Array.from(this.selectedSeats);
    const createdEventIds = [];

    seatsToProcess.forEach(seatNo => {
      const created = this.store.addEvent({
        classId,
        seatNo,
        period,
        tagId: 'custom_adjust',
        tagName,
        category: 'discipline',
        delta,
        severity: delta > 0 ? 'positive' : 'warning',
        note: note || `手動調分：${tagName}`
      });
      if (created && created.id) createdEventIds.push(created.id);
    });

    if (createdEventIds.length > 0) {
      this.pushUndoEntry({
        classId,
        eventIds: createdEventIds,
        tagName,
        delta,
        seats: [...seatsToProcess]
      });
    }

    if (delta > 0 && window.appState?.playChime) window.appState.playChime();
    else if (delta < 0 && window.appState?.playWarning) window.appState.playWarning();

    window.appState?.showToast(`✅ 已為 ${seatsToProcess.length} 位同學套用「${tagName} (${delta > 0 ? '+' : ''}${delta})」`, 'success');
    window.appState?.closeModal();
    this.clearSelection(classId);
    this.render('classroom-matrix-view', classId);
    seatsToProcess.forEach(seatNo => this.showFloatingBubble(seatNo, delta));
  }

  getCoteCharName(index) {
    if (window.appState?.getCoteCharacterByRank) {
      return window.appState.getCoteCharacterByRank(index + 1)?.name || '綾小路 清隆';
    }
    return '綾小路 清隆';
  }
}

// Global Classroom Matrix Instance
window.matrixView = new ClassroomMatrix(window.appStore, window.timetableEngine, window.statisticsEngine);

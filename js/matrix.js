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
  }

  toggleQuickSelectBar() {
    this.showQuickSelectBar = !this.showQuickSelectBar;
    const bar = document.getElementById('matrix-quick-select-drawer');
    if (bar) {
      if (this.showQuickSelectBar) bar.classList.remove('hidden');
      else bar.classList.add('hidden');
    }
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

    // Natural scroll guard: cancel drag if finger moves >6px before 300ms
    const cancelMoveListener = (moveEvt) => {
      const moveTouch = moveEvt.touches ? moveEvt.touches[0] : moveEvt;
      const dx = Math.abs(moveTouch.clientX - this.dragStartCoords.x);
      const dy = Math.abs(moveTouch.clientY - this.dragStartCoords.y);
      if (dx > 6 || dy > 6) {
        clearTimeout(this.longPressTimer);
        window.removeEventListener('touchmove', cancelMoveListener);
        window.removeEventListener('mousemove', cancelMoveListener);
      }
    };
    window.addEventListener('touchmove', cancelMoveListener, { passive: true });
    window.addEventListener('mousemove', cancelMoveListener, { passive: true });

    const cancelEndListener = () => {
      clearTimeout(this.longPressTimer);
      window.removeEventListener('touchmove', cancelMoveListener);
      window.removeEventListener('mousemove', cancelMoveListener);
      window.removeEventListener('touchend', cancelEndListener);
      window.removeEventListener('mouseup', cancelEndListener);
    };
    window.addEventListener('touchend', cancelEndListener, { once: true });
    window.addEventListener('mouseup', cancelEndListener, { once: true });

    // 300ms long press to activate 1:1 hardware seat rearrangement
    this.longPressTimer = setTimeout(() => {
      window.removeEventListener('touchmove', cancelMoveListener);
      window.removeEventListener('mousemove', cancelMoveListener);
      this.startIOSDrag(touch, seatNo, classId);
    }, 300);
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
    const currentScrollY = window.scrollY;
    const deltaScroll = currentScrollY - this.startWindowScrollY;

    // 1. 1:1 hardware direct tracking for ghost
    const dx = touch.clientX - this.startTouchX;
    const dy = touch.clientY - this.startTouchY;
    const vx = touch.clientX - (this.lastTouchX || touch.clientX);
    this.lastTouchX = touch.clientX;
    const tilt = Math.max(-6, Math.min(6, vx * 0.35));

    if (this.dragGhost) {
      this.dragGhost.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.08) rotate(${tilt}deg)`;
    }

    // 2. Edge auto-scrolling
    const viewportHeight = window.innerHeight;
    const edgeZone = 75;
    if (touch.clientY < edgeZone) {
      const speed = Math.max(4, Math.round((edgeZone - touch.clientY) / 4));
      window.scrollBy(0, -speed);
    } else if (touch.clientY > viewportHeight - edgeZone) {
      const speed = Math.max(4, Math.round((touch.clientY - (viewportHeight - edgeZone)) / 4));
      window.scrollBy(0, speed);
    }

    // 3. Find closest slot based on center distance
    if (this.slotSnapshots && this.slotSnapshots.length > 0) {
      let closestSlot = null;
      let minDistSq = Infinity;

      for (let slot of this.slotSnapshots) {
        const centerY = slot.centerY - deltaScroll;
        const centerX = slot.centerX;
        const distSq = Math.pow(touch.clientX - centerX, 2) + Math.pow(touch.clientY - centerY, 2);
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
    const currentMode = this.store.getTagSortMode();
    const newMode = currentMode === 'custom' ? 'frequency' : 'custom';
    this.store.setTagSortMode(newMode);
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
    if (!cls) {
      const classKeys = Object.keys(this.store.getClasses());
      if (classKeys.length > 0) {
        currentClassId = classKeys[0];
        this.currentClassId = currentClassId;
        cls = this.store.getClass(currentClassId);
      } else {
        // Self-heal: initialize demo data so user is never stuck on an unrecoverable blank screen
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
        window.appState.populateClassDropdown();
      }
    }
    if (!cls) {
      container.innerHTML = `
        <div class="p-12 text-center text-slate-500 glass-card rounded-3xl">
          <div class="sanrio-sticker-twinstars mb-3"></div>
          <div class="text-base font-bold text-slate-700">尚未選擇班級或查無班級資料</div>
          <button onclick="appStore.initDemoData(); matrixView.render('${containerId}')" class="mt-4 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-bold shadow-sm cursor-pointer transition">
            ✨ 自動建立並載入示範班級
          </button>
        </div>
      `;
      return;
    }

    const students = this.store.getStudents(currentClassId);
    const studentMap = {};
    students.forEach(s => { studentMap[s.seatNo] = s; });

    const layout = this.store.getSeatingLayout(currentClassId);
    const cols = layout.cols || (students.length > 30 ? 6 : 5);
    const seatOrder = layout.seatOrder || students.map(s => s.seatNo);
    const overview = this.stats.getClassOverview(currentClassId);
    
    // Tag Sorting
    const sortMode = this.store.getTagSortMode();
    const sortedTags = this.store.getTagsSorted(currentClassId);
    const isHomeroom = cls.type === 'homeroom';
    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';
    const classRanks = (isOAA && this.store.getClassStudentRanks) ? this.store.getClassStudentRanks(currentClassId) : {};

    // Chunk tags into pages of 4 (2 cols x 2 rows, large comfortable readable cards)
    const pageSize = 4;
    const tagPages = [];
    for (let i = 0; i < sortedTags.length; i += pageSize) {
      tagPages.push(sortedTags.slice(i, i + pageSize));
    }
    if (tagPages.length === 0) tagPages.push([]);

    this.maxTagPages = tagPages.length;
    if (this.currentTagPage >= this.maxTagPages) this.currentTagPage = 0;

    // Dynamic Header Metadata (COTE vs Sanrio)
    const classNameDisplay = isOAA ? `高度育成 ${cls.name}` : cls.name;
    const classBadgeHtml = isOAA
      ? `<span class="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-black bg-rose-900 text-amber-200 border border-amber-500/60 shadow-sm">${isHomeroom ? '高度育成 • 導師班' : '高度育成 • 數學班'} (${cls.studentCount}名)</span>`
      : `<span class="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-black ${isHomeroom ? 'bg-pink-100 text-pink-700 border border-pink-300' : 'bg-blue-100 text-blue-800 border border-blue-300'}">${isHomeroom ? '🎀 導師本班' : '📘 數學科任'} (${cls.studentCount}人)</span>`;

    const statsOverviewHtml = isOAA
      ? `學業均分: <strong class="text-amber-300 font-black font-mono">${overview.classAvgScore}</strong> • 常規點數: <strong class="${overview.classAvgEngagement >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-black font-mono">${overview.classAvgEngagement > 0 ? '+' : ''}${overview.classAvgEngagement}</strong>`
      : `學業均分: <strong class="text-blue-700">${overview.classAvgScore}</strong> • 常規: <strong class="${overview.classAvgEngagement >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${overview.classAvgEngagement > 0 ? '+' : ''}${overview.classAvgEngagement}</strong>`;

    container.innerHTML = `
      <!-- Top Slim Header -->
      <div class="p-2.5 sm:p-3.5 rounded-2xl ${isOAA ? 'bg-[#220d18] border border-amber-500/40' : 'bg-white border border-pink-200'} shadow-sm flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <!-- Class Meta Badge -->
        <div class="flex items-center space-x-2">
          ${isOAA ? '<span class="text-xl">🏛️</span>' : '<div class="kitty-cat-mini"></div>'}
          <div>
            <div class="flex items-center gap-1.5">
              <h2 class="text-base sm:text-xl font-black ${isOAA ? 'text-white' : (isHomeroom ? 'text-pink-600' : 'text-blue-600')} tracking-wide">${classNameDisplay}</h2>
              ${classBadgeHtml}
            </div>
            <div class="text-[10px] sm:text-xs ${isOAA ? 'text-slate-200' : 'text-slate-600'} font-bold">
              ${statsOverviewHtml}
            </div>
          </div>
        </div>

        <!-- Quick Top Action Buttons -->
        <div class="flex flex-wrap items-center space-x-1.5">
          <!-- Selection Count Badge -->
          <div id="selection-status-badge" class="text-xs px-2.5 py-1 rounded-xl ${isOAA ? 'bg-[#290e1b] border border-amber-500/60 text-amber-200' : 'bg-pink-50 border border-pink-300 text-slate-800'} font-bold flex items-center gap-1">
            <span>已選: <strong id="selected-count" class="${isOAA ? 'text-amber-300 font-mono' : 'text-pink-600'} font-black text-sm">${this.selectedSeats.size}</strong></span>
            <button id="clear-sel-btn" onclick="matrixView.clearSelection()" class="${this.selectedSeats.size > 0 ? 'inline-block' : 'hidden'} text-rose-400 underline font-bold text-xs ml-0.5">清空</button>
          </div>

          <!-- iOS Jiggle / Reorder Toggle Button -->
          <button onclick="matrixView.toggleJiggleMode('${currentClassId}')" class="px-3 py-1 text-xs font-black ${this.isJiggleMode ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md ring-2 ring-emerald-300 active:scale-95' : (isOAA ? 'bg-amber-700/30 border border-amber-500/70 text-amber-200 hover:bg-amber-700/50' : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100')} rounded-xl shadow-sm transition flex items-center gap-1">
            ${this.isJiggleMode ? '<span>✅ 完成排位</span>' : '<i data-lucide="move" class="w-3.5 h-3.5"></i> <span>🪑 拖曳排位</span>'}
          </button>

          <button onclick="matrixView.toggleQuickSelectBar()" class="px-2.5 py-1 text-xs font-bold ${isOAA ? 'bg-[#2b0f1d] border border-amber-500/50 text-amber-200 hover:bg-[#3d1529]' : 'bg-pink-50 text-pink-800 border border-pink-300 hover:bg-pink-100'} rounded-xl shadow-sm transition flex items-center gap-1">
            <i data-lucide="layers" class="w-3.5 h-3.5"></i> 分組/排
          </button>

          <button onclick="matrixView.selectAll()" class="px-2.5 py-1 text-xs font-bold ${isOAA ? 'bg-[#1a0812] border border-slate-600 text-slate-200 hover:bg-[#280d1c]' : 'bg-white border border-pink-300 hover:bg-pink-50 text-slate-800'} rounded-xl shadow-sm">
            全選
          </button>
          
          <button id="retro-log-top-btn" onclick="matrixView.openRetroLogModal('${currentClassId}')" class="px-2.5 py-1 text-xs font-black ${isOAA ? 'bg-amber-600 hover:bg-amber-500 border border-amber-400' : 'bg-amber-500 hover:bg-amber-600'} text-white rounded-xl shadow-sm flex items-center gap-1" title="上課無法即時操作，課後回憶補記">
            <i data-lucide="clock" class="w-3.5 h-3.5"></i> 事後補記
          </button>

          <button onclick="matrixView.openRandomPickerModal('${currentClassId}')" class="px-2.5 py-1 text-xs font-black ${isOAA ? 'bg-rose-700 hover:bg-rose-600 border border-rose-500' : 'bg-pink-500'} text-white rounded-xl shadow-sm">
            抽籤
          </button>

          <button onclick="matrixView.openConflictModal('${currentClassId}')" class="px-2.5 py-1 text-xs font-black ${isOAA ? 'bg-red-700 hover:bg-red-600 border border-red-500' : 'bg-rose-600'} text-white rounded-xl shadow-sm">
            事件
          </button>
        </div>
      </div>

      <!-- iOS Jiggle Helper Drawer -->
      ${this.isJiggleMode ? `
        <div id="ios-jiggle-done-bar" class="p-3 rounded-2xl ${isOAA ? 'bg-[#29101e] border-2 border-amber-500/60' : 'bg-amber-50 border-2 border-amber-300'} shadow-md mb-3 animate-fade-in-up">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center space-x-2">
              <span class="text-2xl animate-bounce">📱</span>
              <div>
                <strong class="${isOAA ? 'text-amber-300' : 'text-amber-900'} font-black text-xs sm:text-sm">【iOS 桌面級拖曳排位模式】</strong>
                <p class="text-[11px] ${isOAA ? 'text-amber-200' : 'text-amber-800'} font-bold">
                  💡 按住任一位學生卡片即可隨意拖動，移至目標座位放開即自動對調！
                </p>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-1.5">
              <button onclick="matrixView.applyAutoArrange('${currentClassId}', 'normal')" class="px-2.5 py-1 text-xs font-black ${isOAA ? 'bg-[#1b0812] border border-amber-600 text-amber-200' : 'bg-white border border-amber-300 text-amber-900'} rounded-xl shadow-sm">
                📐 常規直排
              </button>
              <button onclick="matrixView.applyAutoArrange('${currentClassId}', 'snake_s')" class="px-2.5 py-1 text-xs font-black ${isOAA ? 'bg-[#1b0812] border border-amber-600 text-amber-200' : 'bg-white border border-amber-300 text-amber-900'} rounded-xl shadow-sm">
                🔄 S型蛇行
              </button>
              <button onclick="matrixView.applyAutoArrange('${currentClassId}', 'col_first')" class="px-2.5 py-1 text-xs font-black ${isOAA ? 'bg-[#1b0812] border border-amber-600 text-amber-200' : 'bg-white border border-amber-300 text-amber-900'} rounded-xl shadow-sm">
                📊 左至右排
              </button>
              <button onclick="matrixView.applyAutoArrange('${currentClassId}', 'random')" class="px-2.5 py-1 text-xs font-black ${isOAA ? 'bg-[#1b0812] border border-amber-600 text-amber-200' : 'bg-white border border-amber-300 text-amber-900'} rounded-xl shadow-sm">
                🎲 隨機換位
              </button>
              <button onclick="matrixView.exitJiggleMode('${currentClassId}')" class="px-4 py-1.5 text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-md hover:brightness-110 active:scale-95 transition flex items-center gap-1">
                <span>✅ 完成</span>
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Quick Group / Row / Gender Select Drawer -->
      <div id="matrix-quick-select-drawer" class="${this.showQuickSelectBar ? '' : 'hidden'} p-2 rounded-2xl ${isOAA ? 'bg-[#240e1b] border border-amber-500/40 text-slate-200' : 'bg-pink-50 border border-pink-200 text-slate-800'} mb-2.5 flex flex-wrap items-center justify-between gap-1.5 text-xs">
        <div class="flex items-center space-x-1">
          <span class="font-bold ${isOAA ? 'text-amber-300' : 'text-pink-900'} text-[11px]">橫排選取：</span>
          <button onclick="matrixView.selectRow(1)" class="px-2 py-0.5 rounded-lg ${isOAA ? 'bg-[#180711] border border-amber-700 text-amber-200' : 'bg-white border border-pink-200 text-slate-800'} font-bold">第1排</button>
          <button onclick="matrixView.selectRow(2)" class="px-2 py-0.5 rounded-lg ${isOAA ? 'bg-[#180711] border border-amber-700 text-amber-200' : 'bg-white border border-pink-200 text-slate-800'} font-bold">第2排</button>
          <button onclick="matrixView.selectRow(3)" class="px-2 py-0.5 rounded-lg ${isOAA ? 'bg-[#180711] border border-amber-700 text-amber-200' : 'bg-white border border-pink-200 text-slate-800'} font-bold">第3排</button>
          <button onclick="matrixView.selectRow(4)" class="px-2 py-0.5 rounded-lg ${isOAA ? 'bg-[#180711] border border-amber-700 text-amber-200' : 'bg-white border border-pink-200 text-slate-800'} font-bold">第4排</button>
          <button onclick="matrixView.selectRow(5)" class="px-2 py-0.5 rounded-lg ${isOAA ? 'bg-[#180711] border border-amber-700 text-amber-200' : 'bg-white border border-pink-200 text-slate-800'} font-bold">第5排</button>
        </div>
        <div class="flex items-center space-x-1">
          <span class="font-bold ${isOAA ? 'text-amber-300' : 'text-pink-900'} text-[11px]">性別：</span>
          <button onclick="matrixView.selectGender('M')" class="px-2 py-0.5 rounded-lg ${isOAA ? 'bg-[#101b38] text-blue-200 border border-blue-500' : 'bg-blue-50 text-blue-800 border border-blue-200'} font-bold">全體男生</button>
          <button onclick="matrixView.selectGender('F')" class="px-2 py-0.5 rounded-lg ${isOAA ? 'bg-[#3b0d21] text-pink-200 border border-pink-500' : 'bg-pink-100 text-pink-800 border border-pink-200'} font-bold">全體女生</button>
        </div>
      </div>

      <!-- Blackboard / Podium Classroom Visual Anchor -->
      ${isOAA ? `
        <div class="classroom-podium-bar p-2 rounded-2xl flex items-center justify-between text-xs font-bold mb-2.5 px-4 select-none">
          <span class="flex items-center gap-1.5 opacity-90 text-[11px] text-amber-200 font-bold">
            🪟 靠窗側
          </span>
          <div class="flex items-center gap-2">
            <span class="text-amber-300 font-black sm:text-sm tracking-wider">【 🏫 講台 / 黑板 】</span>
          </div>
          <span class="flex items-center gap-1.5 opacity-90 text-[11px] text-amber-200 font-bold">
            靠門側 🚪
          </span>
        </div>
      ` : `
        <div class="p-2 rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-800 text-white border-2 border-emerald-900 shadow-md flex items-center justify-between text-xs font-black mb-2.5 px-3.5 select-none">
          <span class="flex items-center gap-1.5 opacity-90 text-[11px] text-emerald-100 font-bold">
            🪟 靠窗側
          </span>
          <div class="flex items-center gap-2">
            <span class="kitty-bow !w-3.5 !h-3.5"></span>
            <span class="tracking-widest text-emerald-100 font-black sm:text-sm">【 🏫 講台 / 黑板 】</span>
            <span class="kitty-bow !w-3.5 !h-3.5"></span>
          </div>
          <span class="flex items-center gap-1.5 opacity-90 text-[11px] text-emerald-100 font-bold">
            靠門側 🚪
          </span>
        </div>
      `}

      <!-- Zero-Scroll Responsive Student Grid in Actual Seating Order -->
      <div class="grid grid-cols-${cols} sm:grid-cols-${cols} md:grid-cols-${cols} lg:grid-cols-${cols} gap-1.5 sm:gap-2.5 mb-4 ${this.isJiggleMode ? 'ios-jiggle-active' : ''}" id="seat-grid-container">
        ${seatOrder.map(seatNo => {
          const s = studentMap[seatNo];
          if (!s) return '';

          const profile = this.stats.getStudentProfile(currentClassId, s.seatNo);
          const isSelected = this.selectedSeats.has(s.seatNo);
          const characterPoints = profile ? profile.pointsBreakdown.discipline + profile.pointsBreakdown.conflict + profile.pointsBreakdown.social : 0;
          const academicScore = profile ? profile.scoreMean : 70;

          // Rank / Mascot logic
          let rankBadgeHtml = '';
          if (isOAA) {
            let rank = 'B';
            if (academicScore >= 90) rank = 'S';
            else if (academicScore >= 80) rank = 'A';
            else if (academicScore >= 70) rank = 'B';
            else if (academicScore >= 60) rank = 'C';
            else rank = 'D';

            const rankInfo = classRanks[s.seatNo] || { overallRank: 1, genderRank: 1, gender: s.gender || 'M' };
            const studentGender = s.gender || rankInfo.gender || 'M';
            const genderRank = rankInfo.genderRank || 1;
            const overallRank = rankInfo.overallRank || 1;

            const coteChar = window.appState?.getCoteCharacterByGenderAndRank 
              ? window.appState.getCoteCharacterByGenderAndRank(studentGender, genderRank)
              : (window.appState?.getCoteCharacterByRank ? window.appState.getCoteCharacterByRank(overallRank) : null);
            const coteAvatar = coteChar?.avatar || (studentGender === 'F' ? './assets/cote/official/sakayanagi.webp' : './assets/cote/official/ayanokoji.webp');
            const charName = coteChar?.name || (studentGender === 'F' ? '坂柳 有栖' : '綾小路 清隆');

            rankBadgeHtml = `
              <div class="relative shrink-0 pointer-events-none" title="總排名 第${overallRank}名 (${studentGender === 'F' ? '女' : '男'}生第${genderRank}名) // 對應角色：${charName} // 評級: ${rank}">
                <img src="${coteAvatar}" class="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-amber-400 shadow-sm object-cover" alt="${charName}">
                <span class="oaa-rank-badge oaa-rank-${rank} absolute -bottom-1 -right-1 !w-3.5 !h-3.5 sm:!w-4 sm:!h-4 text-[9px] sm:text-[10px] flex items-center justify-center font-black rounded-full border border-black/60">${rank}</span>
              </div>
            `;
          } else {
            let mascotClass = 'sanrio-kitty-badge';
            let mascotTitle = 'Hello Kitty (穩健良好)';
            if ((academicScore >= 80 && characterPoints >= 0) || (profile && profile.scoreSlope >= 1.5)) {
              mascotClass = 'sanrio-twinstars-badge';
              mascotTitle = '小雙星 (優良拔尖)';
            } else if (characterPoints < 0 || academicScore < 60) {
              mascotClass = 'sanrio-kuromi-badge';
              mascotTitle = '酷洛米 (需關懷)';
            }
            rankBadgeHtml = `<div class="${mascotClass} !w-5 !h-5 sm:!w-6 sm:!h-6 shrink-0" title="${mascotTitle}"></div>`;
          }

          const seatNoBadgeHtml = isOAA
            ? `<span class="w-5 h-5 rounded-lg bg-[#2d0f19] text-amber-300 border border-amber-500/70 font-mono font-black text-[11px] sm:text-xs flex items-center justify-center shadow-sm pointer-events-none">${String(s.seatNo).padStart(2, '0')}</span>`
            : `<span class="w-5 h-5 rounded-lg bg-pink-100 text-pink-900 border border-pink-300 font-black text-[11px] sm:text-xs flex items-center justify-center shadow-inner pointer-events-none">${String(s.seatNo).padStart(2, '0')}</span>`;

          const studentNameHtml = isOAA
            ? `<div class="text-xs sm:text-sm font-black truncate text-white text-center my-0.5 leading-tight tracking-wide pointer-events-none drop-shadow-md">${s.name}</div>`
            : `<div class="text-xs sm:text-sm font-black truncate text-slate-900 text-center my-0.5 leading-tight pointer-events-none">${s.name}</div>`;

          const displayAcademic = Math.round(academicScore);
          const dualScoreHtml = isOAA
            ? `
              <div class="flex items-center justify-between text-[10px] sm:text-xs font-black pt-1 border-t border-amber-500/30 leading-none pointer-events-none whitespace-nowrap min-w-0 gap-0.5">
                <span class="text-amber-300 font-mono font-black shrink-0" title="學業均分：${academicScore}分">📘${displayAcademic}</span>
                <span class="px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-black shrink-0 ${characterPoints > 0 ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' : characterPoints < 0 ? 'bg-rose-950/80 text-rose-400 border border-rose-500/40' : 'bg-black/30 text-slate-400'}" title="品格常規點數：${characterPoints}點">
                  ${characterPoints > 0 ? '+' : ''}${characterPoints}
                </span>
              </div>
            `
            : `
              <div class="flex items-center justify-between text-[10px] sm:text-xs font-black pt-1 border-t border-pink-100 leading-none pointer-events-none whitespace-nowrap min-w-0 gap-0.5">
                <span class="text-blue-700 shrink-0" title="學業均分：${academicScore}分">📘${displayAcademic}</span>
                <span class="px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-black shrink-0 ${characterPoints > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : characterPoints < 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}" title="品格常規點數：${characterPoints}點">
                  ${characterPoints > 0 ? '+' : ''}${characterPoints}
                </span>
              </div>
            `;

          return `
            <div id="seat-card-${s.seatNo}"
                 data-seat-no="${s.seatNo}"
                 class="student-seat-card p-1.5 sm:p-2 rounded-2xl border-2 ${isOAA ? 'bg-[#240e1b] border-amber-500/40' : 'bg-white border-pink-200'} cursor-pointer select-none relative transition-all shadow-sm ${isSelected ? 'selected' : ''} min-w-0 flex flex-col justify-between"
                 ontouchstart="matrixView.handleSeatTouchStart(event, ${s.seatNo}, '${currentClassId}')"
                 onmousedown="matrixView.handleSeatTouchStart(event, ${s.seatNo}, '${currentClassId}')"
                 onclick="if (!matrixView.justFinishedDrag) matrixView.toggleSeatSelection(${s.seatNo}, '${currentClassId}')">
              
              <!-- Seat Header: Seat No + Mascot / COTE Rank -->
              <div class="flex items-center justify-between mb-1 min-w-0 gap-1">
                ${seatNoBadgeHtml}
                ${rankBadgeHtml}
              </div>

              <!-- Student Name -->
              <div class="min-w-0 my-0.5">
                ${studentNameHtml}
              </div>

              <!-- Unified Dual Score Summary -->
              ${dualScoreHtml}
            </div>
          `;
        }).join('')}
      </div>

      <!-- IN-FLOW SPACIOUS 4-TAG PAGED DOCK -->
      <div class="glass-card rounded-3xl p-3 sm:p-4 ${isOAA ? 'border-2 border-amber-500/50 bg-[#250f1c]/95 text-white' : 'border-2 border-pink-300 bg-white/95'} shadow-md mb-6">
        <!-- Dock Header -->
        <div class="flex items-center justify-between text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-2 px-1">
          <div class="flex items-center gap-1.5">
            ${isOAA ? '<span class="text-sm">⚜️</span>' : '<span class="kitty-bow !w-3.5 !h-3.5"></span>'}
            <span class="font-black ${isOAA ? 'text-amber-200' : 'text-slate-900'} text-xs sm:text-sm">${isOAA ? '高度育成 • 課堂考評標籤' : '課堂快速標籤'}</span>
            <button onclick="matrixView.toggleTagSortMode('${currentClassId}')" class="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold transition ${sortMode === 'custom' ? (isOAA ? 'bg-amber-950 text-amber-200 border border-amber-500/60' : 'bg-pink-100 text-pink-700 border border-pink-300') : (isOAA ? 'bg-rose-950 text-rose-200 border border-rose-500/60' : 'bg-blue-100 text-blue-700 border border-blue-300')}" title="點擊切換排序方式">
              ${sortMode === 'custom' ? '📌 依自訂順序' : '📊 依使用頻率'}
            </button>
          </div>

          <div class="flex items-center space-x-2">
            <!-- Prev Page Button -->
            <button onclick="matrixView.prevTagPage()" class="w-7 h-7 rounded-xl ${isOAA ? 'bg-[#1c0a13] hover:bg-rose-900 text-amber-300 border border-amber-500/50' : 'bg-pink-100 hover:bg-pink-200 text-pink-700'} font-black flex items-center justify-center text-xs transition active:scale-90 shadow-sm cursor-pointer" title="上一頁">
              <i data-lucide="chevron-left" class="w-4 h-4"></i>
            </button>
            
            <span class="text-xs font-mono font-bold ${isOAA ? 'text-amber-300' : 'text-slate-600'}">
              ${this.currentTagPage + 1} / ${this.maxTagPages}
            </span>

            <!-- Next Page Button -->
            <button onclick="matrixView.nextTagPage()" class="w-7 h-7 rounded-xl ${isOAA ? 'bg-[#1c0a13] hover:bg-rose-900 text-amber-300 border border-amber-500/50' : 'bg-pink-100 hover:bg-pink-200 text-pink-700'} font-black flex items-center justify-center text-xs transition active:scale-90 shadow-sm cursor-pointer" title="下一頁">
              <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>

            <!-- Custom Tag Modal Button -->
            <button id="custom-tag-open-btn" onclick="window.tagManager.openTagManagerModal()" class="${isOAA ? 'text-amber-400 hover:text-amber-300' : 'text-pink-600 hover:text-pink-700'} font-black hover:underline flex items-center gap-0.5 text-xs ml-1 cursor-pointer" title="管理自訂標籤">
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
              <div class="grid grid-cols-2 gap-2.5">
                ${pageTags.map((tag, tagIdx) => {
                  const isPos = tag.delta > 0;
                  const isZero = tag.delta === 0;
                  
                  const btnClass = isPos ? 'color-rule-pos' : isZero ? 'color-rule-zero' : 'color-rule-neg';
                  const badgeClass = isPos ? 'color-rule-pos-badge' : isZero ? 'color-rule-zero-badge' : 'color-rule-neg-badge';
                  const btnId = (pageIdx === 0 && tagIdx === 0) ? 'first-quick-tag-btn' : `quick-tag-btn-${tag.id}`;

                  return `
                    <button id="${btnId}" onclick="matrixView.applyTagToSelected('${currentClassId}', '${tag.id}')"
                      class="quick-tag-button p-3 rounded-2xl border-2 text-left transition shadow-sm active:scale-95 flex items-center justify-between min-h-[58px] sm:min-h-[64px] ${btnClass}">
                      <div class="flex flex-col pr-1 overflow-hidden">
                        <span class="text-xs sm:text-base font-black truncate ${isOAA ? 'text-white drop-shadow' : 'text-slate-900'} leading-tight">${tag.name}</span>
                        <span class="text-xs ${isOAA ? 'text-slate-200' : 'text-slate-500'} font-bold mt-0.5 truncate">${tag.category === 'academic' ? '數學學業' : tag.category === 'discipline' ? '生活常規' : tag.category === 'conflict' ? '同儕衝突' : '日常記事'}</span>
                      </div>
                      <span class="text-xs sm:text-sm font-black px-3 py-1 rounded-xl border shrink-0 ${badgeClass}">
                        ${tag.delta > 0 ? '+' : ''}${tag.delta}
                      </span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Bottom Swipe Indicator Hint -->
        ${tagPages.length > 1 ? `
          <div class="text-center text-xs text-slate-400 mt-2 font-bold flex items-center justify-center gap-1">
            <span>第 ${this.currentTagPage + 1} / ${tagPages.length} 頁（向左滑 或 點按 ◀ ▶ 翻頁）</span>
          </div>
        ` : ''}
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
    const width = el.clientWidth;
    if (width > 0) {
      const page = Math.round(el.scrollLeft / width);
      if (page !== this.currentTagPage) {
        this.currentTagPage = page;
        this.updateTagDots(page);
      }
    }
  }

  updateTagDots(activeIdx) {
    const dotsContainer = document.getElementById('tag-page-dots');
    if (!dotsContainer) return;
    const dots = dotsContainer.querySelectorAll('button');
    dots.forEach((dot, idx) => {
      if (idx === activeIdx) {
        dot.className = 'w-5 h-2.5 rounded-full bg-pink-600 transition-all';
      } else {
        dot.className = 'w-2.5 h-2.5 rounded-full bg-pink-200 transition-all';
      }
    });
  }

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
  }

  applyTagToSelected(classId, tagId) {
    if (this.selectedSeats.size === 0) {
      window.appState.showToast('請先點選學生座號（點一下即可）', 'warning');
      return;
    }

    const tag = this.store.getTags(classId).find(t => t.id === tagId);
    if (!tag) return;

    const activeSlot = this.timetable.detectActiveSlot();
    const period = activeSlot.period !== null ? activeSlot.period : 1;

    let appliedCount = 0;
    this.selectedSeats.forEach(seatNo => {
      this.store.addEvent({
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

      this.showFloatingBubble(seatNo, tag.delta);
      appliedCount++;
    });

    // Sound effect
    if (tag.delta > 0 && window.appState?.playChime) {
      window.appState.playChime();
    } else if (tag.delta < 0 && window.appState?.playWarning) {
      window.appState.playWarning();
    }

    window.appState.showToast(`⚡ 已為 ${appliedCount} 位同學記錄「${tag.name} (${tag.delta > 0 ? '+' : ''}${tag.delta})」`, 'success');
    this.clearSelection();
    this.render('classroom-matrix-view', classId);
  }

  showFloatingBubble(seatNo, delta) {
    const card = document.getElementById(`seat-card-${seatNo}`);
    if (!card) return;

    const bubble = document.createElement('div');
    bubble.className = `point-bubble ${delta > 0 ? 'text-emerald-600' : 'text-rose-600'} kitty-stamp-effect`;
    bubble.innerText = `${delta > 0 ? '✨ +' : ''}${delta}`;
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
    const tags = this.store.getTagsSortedByClassFrequency(classId);
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const today = new Date().toISOString().split('T')[0];

    modalContent.innerHTML = `
      <div class="p-5 sm:p-6 max-h-[85vh] overflow-y-auto">
        <div class="flex items-center space-x-3 mb-4">
          <div class="sanrio-twinstars-badge !w-12 !h-12"></div>
          <div>
            <h3 class="text-xl font-black text-slate-900 flex items-center gap-1.5">
              ⏰ 課堂事後快速補記助手
              <span class="kitty-bow"></span>
            </h3>
            <p class="text-xs text-slate-600">上課當下無法分心操作？放學或下課後，在此一次快速回憶補登學生事件與點數！</p>
          </div>
        </div>

        <form onsubmit="matrixView.saveRetroLog(event, '${classId}')" class="space-y-4">
          <!-- When (Date & Period) -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">發生日期</label>
              <input type="date" id="retro-date" value="${today}" required class="w-full border border-pink-300 rounded-xl px-3 py-2 text-xs font-bold bg-white">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">課堂節次</label>
              <select id="retro-period" class="w-full border border-pink-300 rounded-xl px-3 py-2 text-xs font-bold bg-white">
                <option value="0">早自習 / 晨讀</option>
                <option value="1">第 1 節</option>
                <option value="2" selected>第 2 節</option>
                <option value="3">第 3 節</option>
                <option value="4">第 4 節</option>
                <option value="lunch">午休時間</option>
                <option value="5">第 5 節</option>
                <option value="6">第 6 節</option>
                <option value="7">第 7 節</option>
                <option value="8">第 8 節 / 放學</option>
              </select>
            </div>
          </div>

          <!-- Who (Select multiple students) -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-slate-700">選擇學生 (可多選)</label>
              <span class="text-[11px] text-pink-600 font-bold">點選學生頭像或姓名</span>
            </div>
            <div class="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto p-2.5 rounded-2xl border border-pink-200 bg-pink-50/50">
              ${students.map(s => `
                <label class="flex items-center space-x-1.5 text-xs cursor-pointer p-1 rounded-lg hover:bg-pink-100 transition">
                  <input type="checkbox" name="retro_seats" value="${s.seatNo}" class="rounded text-pink-600 focus:ring-pink-500">
                  <span class="font-black text-slate-900">${String(s.seatNo).padStart(2, '0')} ${s.name}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- What (Tag Selection) -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">選擇行為標籤</label>
            <select id="retro-tag" class="w-full border border-pink-300 rounded-xl px-3 py-2 text-xs font-bold bg-white">
              ${tags.map(t => `
                <option value="${t.id}" data-name="${t.name}" data-delta="${t.delta}" data-category="${t.category}" data-severity="${t.severity}">
                  ${t.name} (${t.delta > 0 ? '+' : ''}${t.delta} 分)
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Detail Note -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">詳細事證或回憶備忘 (選填)</label>
            <input type="text" id="retro-note" placeholder="如：第2節解出三角幾何難題 / 吵鬧制止後配合良好..." class="w-full border border-pink-300 rounded-xl px-3 py-2 text-xs font-medium bg-white focus:outline-none focus:border-pink-500">
          </div>

          <div class="flex items-center justify-end space-x-3 pt-2">
            <button type="button" onclick="window.appState.closeModal()" class="px-4 py-2 text-xs font-bold text-slate-600">取消</button>
            <button type="submit" class="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-xl shadow-md flex items-center gap-1.5">
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
    
    const tagName = selectedOpt.getAttribute('data-name');
    const delta = parseInt(selectedOpt.getAttribute('data-delta'), 10) || 0;
    const category = selectedOpt.getAttribute('data-category') || 'discipline';
    const severity = selectedOpt.getAttribute('data-severity') || 'info';

    seats.forEach(seatNo => {
      this.store.addEvent({
        classId,
        seatNo,
        date,
        period,
        tagId: tagSelect.value,
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

    window.appState.showToast(`🎉 已成功補記 ${seats.length} 位同學在 ${date} 第 ${period} 節之記錄！`, 'success');
    window.appState.closeModal();
    this.render('classroom-matrix-view', classId);
  }

  openRandomPickerModal(classId) {
    const students = this.store.getStudents(classId);
    if (!students || students.length === 0) return;

    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="text-center p-6">
        <div class="flex justify-center mb-3">
          <div class="sanrio-twinstars-badge !w-16 !h-16"></div>
        </div>
        <h3 class="text-xl sm:text-2xl font-black mb-1 flex items-center justify-center gap-2 text-pink-600">
          三麗鷗幸運抽籤點名
          <span class="kitty-bow"></span>
        </h3>
        <p class="text-xs text-slate-600 mb-5 font-medium">隨機抽取一位同學上台解題或口頭回答</p>

        <!-- Big Display Card -->
        <div id="picker-result-box" class="glass-card rounded-2xl p-5 border-2 border-dashed border-pink-300 mb-5 flex flex-col items-center justify-center min-h-[140px] bg-pink-50/50">
          <span class="text-slate-500 text-sm font-bold">點擊下方開始抽取</span>
        </div>

        <div class="flex items-center justify-center gap-3">
          <button id="btn-start-pick" onclick="matrixView.runPickerAnimation('${classId}')" 
            class="px-6 py-2.5 rounded-2xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 shadow-lg shadow-pink-500/25 transition flex items-center gap-2 text-sm">
            <i data-lucide="play" class="w-4 h-4"></i> 開始抽籤
          </button>
          <button onclick="window.appState.closeModal()" class="px-5 py-2.5 rounded-2xl font-bold border border-pink-300 text-slate-700 hover:bg-pink-50 transition text-sm">
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
      box.innerHTML = `
        <div class="text-3xl font-black text-pink-600 animate-pulse">${String(tempStudent.seatNo).padStart(2, '0')} 號</div>
        <div class="text-lg font-black mt-1 text-slate-800">${tempStudent.name}</div>
      `;
      count++;

      if (count >= maxSteps) {
        clearInterval(interval);
        startBtn.disabled = false;
        startBtn.classList.remove('opacity-50', 'cursor-not-allowed');

        const chosenStudent = students[Math.floor(Math.random() * students.length)];
        box.innerHTML = `
          <div class="text-4xl font-black text-pink-600 drop-shadow-sm">🌟 ${String(chosenStudent.seatNo).padStart(2, '0')} 號</div>
          <div class="text-xl font-black mt-1 text-slate-900">${chosenStudent.name}</div>
          
          <div class="flex items-center gap-2 mt-4">
            <button onclick="matrixView.quickAwardPicker('${classId}', ${chosenStudent.seatNo}, 2, '抽籤解題優異')" class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-black hover:bg-emerald-100 transition shadow-sm">
              +2 解題優異
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

    modalContent.innerHTML = `
      <div class="p-6 max-h-[85vh] overflow-y-auto">
        <div class="flex items-center space-x-3 mb-4">
          <div class="sanrio-kuromi-badge !w-12 !h-12"></div>
          <div>
            <h3 class="text-xl font-black text-slate-900">重大常規 / 同儕衝突事件記錄</h3>
            <p class="text-xs text-slate-600">客觀記錄違紀或推擠衝突，作為日後家長晤談與輔導之具體事證</p>
          </div>
        </div>

        <form id="conflict-form" onsubmit="matrixView.saveConflictEvent(event, '${classId}')" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">涉事學生 (可複選)</label>
            <div class="grid grid-cols-5 gap-2 max-h-36 overflow-y-auto p-2.5 rounded-2xl border border-pink-200 bg-pink-50/50">
              ${students.map(s => `
                <label class="flex items-center space-x-1 text-xs cursor-pointer">
                  <input type="checkbox" name="involved_seats" value="${s.seatNo}" class="rounded text-rose-600 focus:ring-rose-500">
                  <span class="font-bold text-slate-800">${String(s.seatNo).padStart(2, '0')} ${s.name.slice(0, 2)}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">事件類型</label>
              <select id="conflict-type" class="w-full border border-pink-200 rounded-xl px-3 py-2 text-xs focus:outline-none bg-white">
                <option value="soc_phys_fight">肢體衝突 / 推擠打架 (-5分)</option>
                <option value="soc_verbal_fight">同儕重大言語口角 (-3分)</option>
                <option value="soc_property_damage">毀損公物 / 破壞私物 (-5分)</option>
                <option value="disc_severe_insubordination">重大頂撞師長 (-4分)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">發生節次</label>
              <select id="conflict-period" class="w-full border border-pink-200 rounded-xl px-3 py-2 text-xs focus:outline-none bg-white">
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
            <label class="block text-xs font-bold text-slate-700 mb-1">事證詳細記錄</label>
            <textarea id="conflict-notes" rows="3" required placeholder="例：午休因借球起口角推擠，雙方帶至辦公室冷靜..." class="w-full border border-pink-200 rounded-xl p-3 text-xs focus:outline-none bg-white"></textarea>
          </div>

          <div class="flex items-center justify-end space-x-3 pt-2">
            <button type="button" onclick="window.appState.closeModal()" class="px-4 py-2 text-xs font-bold text-slate-600">取消</button>
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
      this.showFloatingBubble(seatNo, tag.delta);
    });

    if (window.appState?.playWarning) window.appState.playWarning();

    window.appState.showToast(`已確實記錄座號 ${seats.join(', ')} 重大事件`, 'success');
    window.appState.closeModal();
    this.render('classroom-matrix-view', classId);
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

/**
 * Tag Management Module
 * Allows teacher to add custom tags, edit point values, delete unwanted tags, and restore defaults.
 * 1:1 Direct Finger-Locked Drag Engine (0ms Latency, 120Hz Real-Time Tracking, Fluid Bubble Parting).
 */

class TagManager {
  constructor(store) {
    this.store = store;
    this.currentClassId = null;
    this.isDragging = false;
    this.draggedTagId = null;
    this.draggedIndex = null;
    this.targetIndex = null;
    this.startTouchY = 0;
    this.startTouchX = 0;
    this.cardSnapshots = [];
    this.stepHeight = 56;
    this.ghostEl = null;
    this.longPressTimer = null;
    this.lastModalScrollTop = 0;
    this.scrollEl = null;
  }

  openTagManagerModal() {
    this.currentClassId = window.appState?.currentClassId || '801';
    this.lastModalScrollTop = 0;
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    this.renderModalContent(modalContent);
    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  renderModalContent(container) {
    this.currentClassId = window.appState?.currentClassId || '801';
    const scrollEl = document.getElementById('tag-manager-modal-scroll');
    const savedScrollTop = scrollEl ? scrollEl.scrollTop : (this.lastModalScrollTop || 0);

    const tags = this.store.getTags(this.currentClassId);
    const cls = this.store.getClass(this.currentClassId);
    const className = cls ? cls.name : `${this.currentClassId} 班`;
    const isHomeroom = cls ? cls.type === 'homeroom' : this.currentClassId === '801';
    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';

    container.innerHTML = `
      <div class="flex flex-col max-h-[85vh] ${isOAA ? 'bg-[#1e0a15] text-white border-amber-500/50' : 'bg-white border-pink-300'} rounded-3xl overflow-hidden shadow-2xl border-2">
        <!-- Sticky Fixed Header at top with permanently visible X -->
        <div class="px-4 py-3 sm:px-5 sm:py-3.5 ${isOAA ? 'bg-[#2a0f1e] border-amber-500/40' : 'bg-gradient-to-r from-pink-50 via-white to-pink-50 border-pink-200'} border-b flex items-center justify-between gap-2 flex-shrink-0 z-30">
          <div class="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
            ${isOAA ? '<span class="text-xl sm:text-2xl p-1.5 rounded-xl bg-black/40 border border-amber-500/50 shrink-0">🏛️</span>' : '<div class="sanrio-kitty-badge !w-8 !h-8 sm:!w-9 sm:!h-9 shrink-0"></div>'}
            <div class="min-w-0 flex-1">
              <h3 class="text-sm sm:text-lg font-black ${isOAA ? 'text-amber-300' : 'text-slate-900'} flex flex-wrap items-center gap-1.5 leading-snug">
                <span>${isHomeroom ? '【導師班】快速標籤管理' : '【任教班/數學班】快速標籤管理'}</span>
                ${isOAA ? '' : '<span class="kitty-bow !w-3.5 !h-3.5 shrink-0"></span>'}
              </h3>
              <p class="text-[11px] ${isOAA ? 'text-amber-100/80' : 'text-pink-700'} font-bold leading-snug">
                ${isHomeroom ? '【導師班專屬】標籤庫 • 長按拖曳氣泡擠開排序' : `【${className} 等全體任教班共用】標籤庫 • 長按拖曳排序`}
              </p>
            </div>
          </div>
          <!-- Permanently pinned close X button that never scrolls away -->
          <button onclick="window.appState.closeModal()" class="w-8 h-8 rounded-full shrink-0 ${isOAA ? 'bg-rose-950 hover:bg-rose-900 text-amber-300 border-amber-500/40' : 'bg-white hover:bg-pink-100 text-pink-700 border-pink-200'} font-black text-base flex items-center justify-center transition active:scale-95 shadow border cursor-pointer" title="關閉標籤管理">
            ✕
          </button>
        </div>

        <!-- Scrollable Single Body -->
        <div id="tag-manager-modal-scroll" class="p-3.5 sm:p-5 overflow-y-auto flex-1 space-y-3.5 sm:space-y-4">
          <!-- Add New Tag Form Accordion -->
          <div class="glass-card rounded-2xl p-3.5 sm:p-4 border ${isOAA ? 'border-amber-500/40 bg-[#14060d]' : 'border-pink-300 bg-pink-50/50'}">
            <h4 class="text-xs font-black ${isOAA ? 'text-amber-300' : 'text-pink-800'} mb-3 flex items-center gap-1.5">
              <i data-lucide="plus-circle" class="w-4 h-4"></i> 為【${isHomeroom ? '導師班' : '任教班/數學班'}】新增自訂表現標籤
            </h4>
            <form onsubmit="tagManager.handleCreateTag(event)" class="space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">標籤名稱</label>
                  <input type="text" id="new-tag-name" required placeholder="例：作業字跡特優" class="w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none ${isOAA ? 'bg-[#0c0308] border-amber-500/50 text-white' : 'bg-white border-pink-300 text-slate-900 focus:border-pink-500'}">
                </div>
                <div>
                  <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">積分變動 (+/- 分)</label>
                  <input type="number" id="new-tag-delta" required value="2" min="-20" max="20" class="w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none ${isOAA ? 'bg-[#0c0308] border-amber-500/50 text-white' : 'bg-white border-pink-300 text-slate-900 focus:border-pink-500'}">
                </div>
                <div>
                  <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">所屬類別</label>
                  <select id="new-tag-category" class="w-full border rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none ${isOAA ? 'bg-[#0c0308] border-amber-500/50 text-white' : 'bg-white border-pink-300 text-slate-900 focus:border-pink-500'}">
                    <option value="academic">數學學業 (解題/作業)</option>
                    <option value="discipline" selected>生活常規 (遲到/紀律)</option>
                    <option value="conflict">同儕人際/衝突</option>
                    <option value="social">熱心助人/責任感</option>
                  </select>
                </div>
              </div>

              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
                <span class="text-[10px] ${isOAA ? 'text-amber-200/70' : 'text-slate-500'}">分值設為 0 可作為純日常記事標籤</span>
                <button type="submit" class="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-1 whitespace-nowrap shrink-0 cursor-pointer">
                  <i data-lucide="plus" class="w-3.5 h-3.5 shrink-0"></i> 新增此標籤
                </button>
              </div>
            </form>
          </div>

          <!-- Current Tags List -->
          <div>
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div class="min-w-0">
                <h4 class="text-xs font-black ${isOAA ? 'text-amber-200' : 'text-slate-700'} uppercase tracking-wider">【${isHomeroom ? '導師班' : '任教班/數學班'}】現有標籤 (${tags.length} 個)</h4>
                <span class="text-[10px] ${isOAA ? 'text-amber-300' : 'text-pink-600'} font-bold">💡 排在前 4 個的標籤，會優先顯示在點記板第 1 頁</span>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <select onchange="tagManager.handleSortModeChange(this.value)" class="text-xs font-black px-2.5 py-1.5 rounded-xl border ${isOAA ? 'border-amber-500/50 bg-[#14060d] text-amber-200' : 'border-pink-300 bg-pink-50 text-pink-900'} focus:outline-none">
                  <option value="custom" ${this.store.getTagSortMode(this.currentClassId) === 'custom' ? 'selected' : ''}>📌 依此清單自訂順序</option>
                  <option value="frequency" ${this.store.getTagSortMode(this.currentClassId) === 'frequency' ? 'selected' : ''}>📊 依班級使用頻率</option>
                </select>
                ${!isHomeroom ? `
                  <button onclick="tagManager.copyHomeroomTags()" class="text-xs text-slate-400 hover:text-pink-600 hover:underline font-bold transition flex items-center gap-0.5 whitespace-nowrap" title="將導師班標籤複製一份覆蓋至任教班">
                    📥 複製導師班標籤
                  </button>
                ` : ''}
                <button onclick="tagManager.restoreDefaults()" class="text-xs text-slate-400 hover:text-pink-600 hover:underline font-bold transition whitespace-nowrap">
                  恢復預設
                </button>
              </div>
            </div>

            <div class="space-y-2.5" id="tag-manager-drag-list">
              ${tags.map((tag, idx) => {
                const isPos = tag.delta > 0;
                const isZero = tag.delta === 0;
                const badgeClass = isPos ? 'color-rule-pos-badge' : isZero ? 'color-rule-zero-badge' : 'color-rule-neg-badge';
                const isTop4 = idx < 4;

                return `
                  <div id="tag-item-${tag.id}"
                       data-tag-id="${tag.id}"
                       class="tag-sort-card flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border ${isOAA ? (isTop4 ? 'bg-[#2a0f1e] border-amber-400/70' : 'bg-[#160610] border-amber-500/25') : (isTop4 ? 'bg-white border-pink-300 shadow-sm ring-1 ring-pink-200' : 'bg-white border-pink-100')} hover:border-pink-300 text-xs select-none cursor-grab active:cursor-grabbing"
                       ontouchstart="tagManager.handleCardPointerDown(event, '${tag.id}')"
                       onmousedown="tagManager.handleCardPointerDown(event, '${tag.id}')">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1 pointer-events-none">
                      <!-- Order Badge & Up/Down Buttons -->
                      <div class="flex items-center gap-1 shrink-0 pointer-events-auto">
                        <span class="w-6 h-6 rounded-lg ${isTop4 ? 'bg-pink-500 text-white' : (isOAA ? 'bg-rose-950 text-amber-200' : 'bg-slate-100 text-slate-700')} font-black text-[10px] flex items-center justify-center shadow-inner shrink-0" title="${isTop4 ? '第 1 頁優先顯示' : `第 ${Math.floor(idx / 4) + 1} 頁`}">
                          #${idx + 1}
                        </span>
                        <div class="flex flex-col space-y-0.5">
                          <button type="button" onclick="tagManager.moveTagUp('${tag.id}')" ${idx === 0 ? 'disabled class="min-w-[30px] min-h-[26px] px-1.5 py-0.5 text-xs flex items-center justify-center opacity-20 cursor-not-allowed"' : `class="min-w-[30px] min-h-[26px] hover:bg-pink-100 rounded-md px-1.5 py-0.5 flex items-center justify-center ${isOAA ? 'text-amber-200 hover:text-slate-900' : 'text-slate-700'} font-black text-xs active:scale-90 cursor-pointer"`} title="往上移一格">
                            ▲
                          </button>
                          <button type="button" onclick="tagManager.moveTagDown('${tag.id}')" ${idx === tags.length - 1 ? 'disabled class="min-w-[30px] min-h-[26px] px-1.5 py-0.5 text-xs flex items-center justify-center opacity-20 cursor-not-allowed"' : `class="min-w-[30px] min-h-[26px] hover:bg-pink-100 rounded-md px-1.5 py-0.5 flex items-center justify-center ${isOAA ? 'text-amber-200 hover:text-slate-900' : 'text-slate-700'} font-black text-xs active:scale-90 cursor-pointer"`} title="往下移一格">
                            ▼
                          </button>
                        </div>
                      </div>

                      <span class="font-black px-2 py-0.5 rounded-lg text-xs border whitespace-nowrap shrink-0 ${badgeClass}">
                        ${tag.delta > 0 ? '+' : ''}${tag.delta} 分
                      </span>
                      <div class="min-w-0 flex-1">
                        <div class="flex flex-wrap items-center gap-1.5">
                          <strong class="${isOAA ? 'text-white' : 'text-slate-900'} font-black text-sm break-words">${tag.name}</strong>
                          ${isTop4 ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300 whitespace-nowrap shrink-0">⭐ 第1頁</span>' : ''}
                        </div>
                        <span class="text-[10px] ${isOAA ? 'text-amber-200/70' : 'text-slate-500'}">(${tag.category === 'academic' ? '學業' : tag.category === 'conflict' ? '衝突' : tag.category === 'social' ? '熱心' : '常規'})</span>
                      </div>
                    </div>

                    <div class="flex items-center justify-end gap-2 pt-1.5 sm:pt-0 border-t sm:border-t-0 ${isOAA ? 'border-amber-500/20' : 'border-pink-100'} shrink-0 pointer-events-auto">
                      <button onclick="tagManager.editTagDelta('${tag.id}')" class="px-2.5 py-1 rounded-lg ${isOAA ? 'text-amber-200 border-amber-500/40 hover:bg-rose-950' : 'text-slate-600 hover:bg-slate-100 border-slate-200'} text-[11px] font-bold border transition whitespace-nowrap shrink-0 min-h-[32px] cursor-pointer">
                        改分值
                      </button>
                      <button onclick="tagManager.deleteTag('${tag.id}')" class="min-w-[32px] min-h-[32px] flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0 cursor-pointer" title="刪除此標籤">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Bottom Big Finish Button -->
          <button onclick="window.appState.closeModal()" class="w-full py-3 rounded-2xl ${isOAA ? 'bg-gradient-to-r from-amber-600 to-rose-700 hover:from-amber-500 hover:to-rose-600 border border-amber-400' : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700'} text-white font-black text-xs shadow-lg shadow-pink-500/25 transition active:scale-95 flex items-center justify-center gap-1.5 mt-5 mb-2 cursor-pointer">
            ${isOAA ? '' : '<span class="kitty-bow !w-3.5 !h-3.5"></span>'}
            <span>完成並返回點記板</span>
          </button>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Restore scroll position so modal never jumps
    const newScrollEl = document.getElementById('tag-manager-modal-scroll');
    if (newScrollEl && savedScrollTop) {
      newScrollEl.scrollTop = savedScrollTop;
    }
  }

  // --- 1:1 Direct Finger-Locked Engine Handlers ---
  handleCardPointerDown(e, tagId) {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;

    const touch = e.touches ? e.touches[0] : e;
    this.startTouchX = touch.clientX;
    this.startTouchY = touch.clientY;

    clearTimeout(this.longPressTimer);

    // Cancel drag immediately if user is scrolling (> 6px movement)
    const cancelIfMoved = (moveEvent) => {
      const t = moveEvent.touches ? moveEvent.touches[0] : moveEvent;
      const dx = Math.abs(t.clientX - this.startTouchX);
      const dy = Math.abs(t.clientY - this.startTouchY);
      if (dx > 6 || dy > 6) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
        cleanupPreDrag();
      }
    };

    const cancelOnRelease = () => {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
      cleanupPreDrag();
    };

    const cleanupPreDrag = () => {
      window.removeEventListener('touchmove', cancelIfMoved);
      window.removeEventListener('mousemove', cancelIfMoved);
      window.removeEventListener('touchend', cancelOnRelease);
      window.removeEventListener('mouseup', cancelOnRelease);
      window.removeEventListener('touchcancel', cancelOnRelease);
    };

    window.addEventListener('touchmove', cancelIfMoved, { passive: true });
    window.addEventListener('mousemove', cancelIfMoved, { passive: true });
    window.addEventListener('touchend', cancelOnRelease, { passive: true });
    window.addEventListener('mouseup', cancelOnRelease, { passive: true });
    window.addEventListener('touchcancel', cancelOnRelease, { passive: true });

    // Activate drag ONLY if finger stays still for 300ms
    this.longPressTimer = setTimeout(() => {
      cleanupPreDrag();
      this.startDirectDrag(touch, tagId);
    }, 300);
  }

  startDirectDrag(touch, tagId) {
    this.isDragging = true;
    this.draggedTagId = tagId;
    this.scrollEl = document.getElementById('tag-manager-modal-scroll');
    this.startScrollTop = this.scrollEl ? this.scrollEl.scrollTop : 0;

    if (navigator.vibrate) navigator.vibrate([35, 25, 35]);
    if (window.appState?.playPop) window.appState.playPop();

    const listEl = document.getElementById('tag-manager-drag-list');
    const cards = Array.from(listEl.querySelectorAll('.tag-sort-card'));

    // Snapshot static visual centers relative to scroll container top
    this.cardSnapshots = cards.map((card, index) => {
      const rect = card.getBoundingClientRect();
      return {
        id: card.getAttribute('data-tag-id'),
        index,
        top: rect.top,
        bottom: rect.bottom,
        centerY: rect.top + rect.height / 2,
        height: rect.height
      };
    });

    this.draggedIndex = this.cardSnapshots.findIndex(s => s.id === tagId);
    this.targetIndex = this.draggedIndex;

    const sampleCard = cards[0];
    const sampleHeight = sampleCard ? sampleCard.getBoundingClientRect().height : 52;
    this.stepHeight = sampleHeight + 8; // Card height + Tailwind space-y-2 gap

    const originalCard = document.getElementById(`tag-item-${tagId}`);
    if (originalCard) {
      const rect = originalCard.getBoundingClientRect();
      this.initialCardRect = rect;

      // Clone clean ghost
      const ghost = originalCard.cloneNode(true);
      ghost.id = 'ios-drag-floating-ghost';
      ghost.classList.remove('is-dragging-card');
      ghost.classList.add('ios-ghost-card');
      ghost.style.position = 'fixed';
      ghost.style.left = `${rect.left}px`;
      ghost.style.top = `${rect.top}px`;
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      ghost.style.transform = 'translate3d(0, 0, 0) scale(1.05)';
      ghost.style.transition = 'none';
      document.body.appendChild(ghost);
      this.ghostEl = ghost;

      // Mark original card as dragging placeholder slot
      originalCard.classList.add('is-dragging-card');
    }

    // Prevent default touch scrolling during drag
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    if (this.scrollEl) this.scrollEl.style.touchAction = 'none';

    // Bind 1:1 window listeners for pure 0ms latency tracking
    this.boundMove = (e) => this.handleDirectDragMove(e);
    this.boundEnd = (e) => this.handleDirectDragEnd(e);
    window.addEventListener('touchmove', this.boundMove, { passive: false });
    window.addEventListener('touchend', this.boundEnd);
    window.addEventListener('mousemove', this.boundMove);
    window.addEventListener('mouseup', this.boundEnd);
  }

  handleDirectDragMove(e) {
    const touch = e.touches ? e.touches[0] : e;

    if (this.isDragging) {
      if (e.cancelable) e.preventDefault();

      // 1. ABSOLUTE 1:1 FINGER POSITION (0ms lag, 100% physically glued to finger velocity)
      const dy = touch.clientY - this.startTouchY;
      const dx = (touch.clientX - this.startTouchX) * 0.15; // Subtle organic sway
      if (this.ghostEl) {
        this.ghostEl.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.05)`;
      }

      // 2. Auto-scroll with scroll delta synchronization
      const currentScrollTop = this.scrollEl ? this.scrollEl.scrollTop : 0;
      const deltaScroll = currentScrollTop - this.startScrollTop;

      if (this.scrollEl) {
        const modalRect = this.scrollEl.getBoundingClientRect();
        let scrollSpeed = 0;
        if (touch.clientY < modalRect.top + 70) {
          scrollSpeed = -Math.min(14, Math.max(3, (modalRect.top + 70 - touch.clientY) * 0.35));
        } else if (touch.clientY > modalRect.bottom - 70) {
          scrollSpeed = Math.min(14, Math.max(3, (touch.clientY - (modalRect.bottom - 70)) * 0.35));
        }
        if (scrollSpeed !== 0) {
          this.scrollEl.scrollTop += scrollSpeed;
        }
      }

      // 3. Human Intuition Centerline & Gap Midpoint Detection with Scroll Delta Compensation
      const ghostCenterY = this.initialCardRect.top + dy + (this.initialCardRect.height / 2);
      const n = this.cardSnapshots.length;
      let newTargetIdx = n - 1;

      for (let i = 0; i < n - 1; i++) {
        // Adjust snapshot centers for real-time container scroll
        const center_i = this.cardSnapshots[i].centerY - deltaScroll;
        const center_next = this.cardSnapshots[i + 1].centerY - deltaScroll;
        const boundaryY = (center_i + center_next) / 2;

        // Directional hysteresis deadzone: requires crossing past the gap/centerline before flipping slot
        const hysteresis = (this.targetIndex !== null && this.targetIndex > i) ? -6 : 6;
        if (ghostCenterY < boundaryY + hysteresis) {
          newTargetIdx = i;
          break;
        }
      }

      newTargetIdx = Math.max(0, Math.min(n - 1, newTargetIdx));

      if (newTargetIdx !== this.targetIndex) {
        this.targetIndex = newTargetIdx;
        this.updateListDisplacement(this.draggedIndex, newTargetIdx);
        if (navigator.vibrate) navigator.vibrate(15);
      }
    } else if (this.startTouchX && this.startTouchY) {
      const dx = Math.abs(touch.clientX - this.startTouchX);
      const dy = Math.abs(touch.clientY - this.startTouchY);
      if (dx > 6 || dy > 6) {
        clearTimeout(this.longPressTimer);
      }
    }
  }

  updateListDisplacement(fromIdx, toIdx) {
    const tags = this.store.getTags(this.currentClassId);
    const step = this.stepHeight;

    tags.forEach((tag, idx) => {
      const card = document.getElementById(`tag-item-${tag.id}`);
      if (!card) return;

      if (idx === fromIdx) {
        // Placeholder slot glides instantly to new gap position
        const offset = (toIdx - fromIdx) * step;
        card.style.transform = `translate3d(0, ${offset}px, 0)`;
      } else {
        let offset = 0;
        if (fromIdx < toIdx && idx > fromIdx && idx <= toIdx) {
          // Sliding upward like an air bubble being pushed up
          offset = -step;
        } else if (fromIdx > toIdx && idx >= toIdx && idx < fromIdx) {
          // Sliding downward like an air bubble being squeezed down
          offset = step;
        }
        card.style.transform = offset !== 0 ? `translate3d(0, ${offset}px, 0)` : '';
      }
    });
  }

  copyHomeroomTags() {
    if (confirm('確定要將【導師班】的所有自訂標籤與排序，完整複製並覆蓋至【任教班/數學班】嗎？\n（此操作將會取代任教班目前的標籤清單與自訂順序）')) {
      this.store.copyHomeroomTagsToSubject();
      if (window.appState?.playChime) window.appState.playChime();
      if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
      window.appState.showToast('✨ 已成功將【導師班】標籤庫複製覆蓋至【任教班】！', 'success');
      this.refreshModalPreservingScroll();
    }
  }

  handleDirectDragEnd(e) {
    clearTimeout(this.longPressTimer);

    if (this.isDragging) {
      const fromIdx = this.draggedIndex;
      const toIdx = this.targetIndex;

      if (toIdx !== null && toIdx !== fromIdx && fromIdx >= 0 && toIdx >= 0) {
        this.store.reorderTagsByIndex(fromIdx, toIdx, this.currentClassId);
        if (window.appState?.playChime) window.appState.playChime();
        if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
        window.appState.showToast('✨ 標籤已像水漾氣泡般平滑塞入！', 'success');
      }

      this.stopDirectDrag();
    }
  }

  stopDirectDrag() {
    this.isDragging = false;

    // Remove window listeners
    if (this.boundMove) {
      window.removeEventListener('touchmove', this.boundMove);
      window.removeEventListener('mousemove', this.boundMove);
      this.boundMove = null;
    }
    if (this.boundEnd) {
      window.removeEventListener('touchend', this.boundEnd);
      window.removeEventListener('mouseup', this.boundEnd);
      this.boundEnd = null;
    }

    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    if (this.scrollEl) this.scrollEl.style.touchAction = '';

    if (this.ghostEl) {
      this.ghostEl.remove();
      this.ghostEl = null;
    }

    const tags = this.store.getTags(this.currentClassId);
    tags.forEach(tag => {
      const card = document.getElementById(`tag-item-${tag.id}`);
      if (card) {
        card.style.transform = '';
        card.classList.remove('is-dragging-card');
      }
    });

    const scrollEl = document.getElementById('tag-manager-modal-scroll');
    this.lastModalScrollTop = scrollEl ? scrollEl.scrollTop : 0;
    const modalContent = document.getElementById('global-modal-content');
    if (modalContent) this.renderModalContent(modalContent);
    if (window.matrixView) window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
  }

  handleSortModeChange(mode) {
    this.currentClassId = window.appState?.currentClassId || '801';
    this.store.setTagSortMode(mode, this.currentClassId);
    window.appState.showToast(`標籤排序已切換為：「${mode === 'custom' ? '📌 依自訂清單順序' : '📊 依班級使用頻率'}」`, 'info');
    if (window.matrixView) window.matrixView.render('classroom-matrix-view', this.currentClassId);
  }

  moveTagUp(tagId) {
    this.currentClassId = window.appState?.currentClassId || '801';
    const scrollEl = document.getElementById('tag-manager-modal-scroll');
    this.lastModalScrollTop = scrollEl ? scrollEl.scrollTop : 0;
    const success = this.store.moveTag(tagId, 'up', this.currentClassId);
    if (success) {
      if (window.appState?.playPop) window.appState.playPop();
      const modalContent = document.getElementById('global-modal-content');
      if (modalContent) this.renderModalContent(modalContent);
      if (window.matrixView) window.matrixView.render('classroom-matrix-view', this.currentClassId);
    }
  }

  moveTagDown(tagId) {
    this.currentClassId = window.appState?.currentClassId || '801';
    const scrollEl = document.getElementById('tag-manager-modal-scroll');
    this.lastModalScrollTop = scrollEl ? scrollEl.scrollTop : 0;
    const success = this.store.moveTag(tagId, 'down', this.currentClassId);
    if (success) {
      if (window.appState?.playPop) window.appState.playPop();
      const modalContent = document.getElementById('global-modal-content');
      if (modalContent) this.renderModalContent(modalContent);
      if (window.matrixView) window.matrixView.render('classroom-matrix-view', this.currentClassId);
    }
  }

  handleCreateTag(e) {
    e.preventDefault();
    this.currentClassId = window.appState?.currentClassId || '801';
    const name = document.getElementById('new-tag-name').value.trim();
    const delta = parseInt(document.getElementById('new-tag-delta').value, 10) || 0;
    const category = document.getElementById('new-tag-category').value;

    const newTag = {
      id: `custom_tag_${Date.now()}`,
      name,
      delta,
      category,
      severity: delta > 0 ? 'positive' : delta < 0 ? 'warning' : 'info'
    };

    this.store.addTag(newTag, this.currentClassId);
    window.appState.showToast(`已成功新增標籤：「${name} (${delta > 0 ? '+' : ''}${delta})」`, 'success');
    this.refreshModalPreservingScroll();
  }

  editTagDelta(tagId) {
    this.currentClassId = window.appState?.currentClassId || '801';
    const tag = this.store.getTags(this.currentClassId).find(t => t.id === tagId);
    if (!tag) return;

    const newDeltaStr = prompt(`請輸入「${tag.name}」的新分值 (+/-整數)：`, tag.delta);
    if (newDeltaStr !== null) {
      const newDelta = parseInt(newDeltaStr, 10);
      if (!isNaN(newDelta)) {
        tag.delta = newDelta;
        tag.severity = newDelta > 0 ? 'positive' : newDelta < 0 ? 'warning' : 'info';
        this.store.updateTag(tag.id, tag, this.currentClassId);
        window.appState.showToast(`已將「${tag.name}」分值更新為 ${newDelta > 0 ? '+' : ''}${newDelta}`, 'success');
        this.refreshModalPreservingScroll();
      }
    }
  }

  deleteTag(tagId) {
    this.currentClassId = window.appState?.currentClassId || '801';
    const tag = this.store.getTags(this.currentClassId).find(t => t.id === tagId);
    if (!tag) return;

    if (confirm(`確定要刪除「${tag.name}」標籤嗎？`)) {
      this.store.deleteTag(tagId, this.currentClassId);
      window.appState.showToast(`已刪除「${tag.name}」標籤`, 'info');
      this.refreshModalPreservingScroll();
    }
  }

  restoreDefaults() {
    this.currentClassId = window.appState?.currentClassId || '801';
    if (confirm('確定要恢復為官方預設標籤清單嗎？（自訂標籤將被重設）')) {
      this.store.resetTagsToDefault(this.currentClassId);
      window.appState.showToast('已成功恢復官方預設標籤！', 'success');
      this.refreshModalPreservingScroll();
    }
  }

  refreshModalPreservingScroll() {
    const scrollEl = document.getElementById('tag-manager-modal-scroll');
    if (scrollEl) {
      this.lastModalScrollTop = scrollEl.scrollTop;
    }
    const modalContent = document.getElementById('global-modal-content');
    if (modalContent) {
      this.renderModalContent(modalContent);
    } else {
      this.openTagManagerModal();
    }
    if (window.matrixView) window.matrixView.render('classroom-matrix-view', this.currentClassId);
  }
}

// Global Tag Manager Instance
window.tagManager = new TagManager(window.appStore);


/**
 * Tag Management Module
 * Allows teacher to add custom tags, edit point values, delete unwanted tags, and restore defaults.
 * Supports 100% per-class independent tags & ordering, sticky header with permanent close X, and liquid bubble spring FLIP animation.
 */

class TagManager {
  constructor(store) {
    this.store = store;
    this.currentClassId = null;
    this.isDraggingTag = false;
    this.draggedTagId = null;
    this.draggedIndex = null;
    this.currentHoverIndex = null;
    this.cardSnapshots = [];
    this.tagDragGhost = null;
    this.longPressTimer = null;
    this.dragStartCoords = null;
    this.lastModalScrollTop = 0;
    this.stepHeight = 60;
    this.lastTouchX = null;
    this.boundGlobalMove = null;
    this.boundGlobalEnd = null;
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

    container.innerHTML = `
      <div class="flex flex-col max-h-[85vh] bg-white rounded-3xl overflow-hidden shadow-2xl border-2 border-pink-300">
        <!-- Sticky Fixed Header at top with permanently visible X -->
        <div class="px-5 py-3.5 bg-gradient-to-r from-pink-50 via-white to-pink-50 border-b border-pink-200 flex items-center justify-between flex-shrink-0 z-30">
          <div class="flex items-center space-x-2.5">
            <div class="sanrio-kitty-badge !w-9 !h-9"></div>
            <div>
              <h3 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
                【${className}】快速標籤管理
                <span class="kitty-bow !w-3 !h-3"></span>
              </h3>
              <p class="text-[11px] text-pink-700 font-bold">班級專屬自訂順序 • 長按拖曳氣泡擠開排序</p>
            </div>
          </div>
          <!-- Permanently pinned close X button that never scrolls away -->
          <button onclick="window.appState.closeModal()" class="w-8 h-8 rounded-full bg-white hover:bg-pink-100 text-pink-700 font-black text-base flex items-center justify-center transition active:scale-95 shadow border border-pink-200 cursor-pointer" title="關閉標籤管理">
            ✕
          </button>
        </div>

        <!-- Scrollable Single Body -->
        <div id="tag-manager-modal-scroll" class="p-5 overflow-y-auto flex-1 space-y-4">
          <!-- Add New Tag Form Accordion -->
          <div class="glass-card rounded-2xl p-4 border border-pink-300 bg-pink-50/50">
            <h4 class="text-xs font-black text-pink-800 mb-3 flex items-center gap-1.5">
              <i data-lucide="plus-circle" class="w-4 h-4"></i> 為【${className}】新增自訂表現標籤
            </h4>
            <form onsubmit="tagManager.handleCreateTag(event)" class="space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">標籤名稱</label>
                  <input type="text" id="new-tag-name" required placeholder="例：作業字跡特優" class="w-full bg-white border border-pink-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-pink-500">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">積分變動 (+/- 分)</label>
                  <input type="number" id="new-tag-delta" required value="2" min="-20" max="20" class="w-full bg-white border border-pink-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-pink-500">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-700 mb-1">所屬類別</label>
                  <select id="new-tag-category" class="w-full bg-white border border-pink-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-pink-500">
                    <option value="academic">數學學業 (解題/作業)</option>
                    <option value="discipline" selected>生活常規 (遲到/紀律)</option>
                    <option value="conflict">同儕人際/衝突</option>
                    <option value="social">熱心助人/責任感</option>
                  </select>
                </div>
              </div>

              <div class="flex items-center justify-between pt-1">
                <span class="text-[10px] text-slate-500">分值設為 0 可作為純日常記事標籤</span>
                <button type="submit" class="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-1">
                  <i data-lucide="plus" class="w-3.5 h-3.5"></i> 新增此標籤
                </button>
              </div>
            </form>
          </div>

          <!-- Current Tags List -->
          <div>
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h4 class="text-xs font-black text-slate-700 uppercase tracking-wider">【${className}】現有標籤 (${tags.length} 個)</h4>
                <span class="text-[10px] text-pink-600 font-bold">💡 排在前 4 個的標籤，會優先顯示在【${className}】點記板第 1 頁</span>
              </div>
              <div class="flex items-center space-x-2">
                <select onchange="tagManager.handleSortModeChange(this.value)" class="text-xs font-black px-2.5 py-1 rounded-xl border border-pink-300 bg-pink-50 text-pink-900 focus:outline-none">
                  <option value="custom" ${this.store.getTagSortMode(this.currentClassId) === 'custom' ? 'selected' : ''}>📌 依此清單自訂順序</option>
                  <option value="frequency" ${this.store.getTagSortMode(this.currentClassId) === 'frequency' ? 'selected' : ''}>📊 依本班使用頻率</option>
                </select>
                <button onclick="tagManager.restoreDefaults()" class="text-xs text-slate-500 hover:text-pink-600 hover:underline font-bold transition">
                  恢復預設
                </button>
              </div>
            </div>

            <div class="space-y-2 pr-1" id="tag-manager-drag-list">
              ${tags.map((tag, idx) => {
                const isPos = tag.delta > 0;
                const isZero = tag.delta === 0;
                const badgeClass = isPos ? 'color-rule-pos-badge' : isZero ? 'color-rule-zero-badge' : 'color-rule-neg-badge';
                const isTop4 = idx < 4;

                return `
                  <div id="tag-item-${tag.id}"
                       data-tag-id="${tag.id}"
                       class="tag-sort-card flex items-center justify-between p-2.5 rounded-xl bg-white border ${isTop4 ? 'border-pink-300 shadow-sm ring-1 ring-pink-200' : 'border-pink-100'} hover:border-pink-300 text-xs select-none cursor-grab active:cursor-grabbing"
                       ontouchstart="tagManager.handleTagTouchStart(event, '${tag.id}')"
                       onmousedown="tagManager.handleTagTouchStart(event, '${tag.id}')">
                    <div class="flex items-center space-x-2.5 pointer-events-none">
                      <!-- Order Badge & Up/Down Arrows -->
                      <div class="flex items-center space-x-1 pointer-events-auto">
                        <span class="w-6 h-6 rounded-lg ${isTop4 ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-700'} font-black text-[10px] flex items-center justify-center shadow-inner" title="${isTop4 ? '第 1 頁優先顯示' : `第 ${Math.floor(idx / 4) + 1} 頁`}">
                          #${idx + 1}
                        </span>
                        <div class="flex flex-col space-y-0.5">
                          <button type="button" onclick="tagManager.moveTagUp('${tag.id}')" ${idx === 0 ? 'disabled class="opacity-20 cursor-not-allowed"' : 'class="hover:bg-pink-100 rounded px-1 text-slate-700 font-black text-[9px] active:scale-90"'} title="往上移一格">
                            ▲
                          </button>
                          <button type="button" onclick="tagManager.moveTagDown('${tag.id}')" ${idx === tags.length - 1 ? 'disabled class="opacity-20 cursor-not-allowed"' : 'class="hover:bg-pink-100 rounded px-1 text-slate-700 font-black text-[9px] active:scale-90"'} title="往下移一格">
                            ▼
                          </button>
                        </div>
                      </div>

                      <span class="font-black px-2.5 py-0.5 rounded-lg text-xs border ${badgeClass}">
                        ${tag.delta > 0 ? '+' : ''}${tag.delta} 分
                      </span>
                      <div>
                        <div class="flex items-center gap-1">
                          <strong class="text-slate-900 font-black text-sm">${tag.name}</strong>
                          ${isTop4 ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold border border-amber-300">⭐ 第1頁</span>' : ''}
                        </div>
                        <span class="text-[10px] text-slate-500">(${tag.category === 'academic' ? '學業' : tag.category === 'conflict' ? '衝突' : tag.category === 'social' ? '熱心' : '常規'})</span>
                      </div>
                    </div>

                    <div class="flex items-center space-x-1.5 pointer-events-auto">
                      <button onclick="tagManager.editTagDelta('${tag.id}')" class="px-2 py-1 rounded-lg text-slate-600 hover:bg-slate-100 text-[11px] font-bold border transition">
                        改分值
                      </button>
                      <button onclick="tagManager.deleteTag('${tag.id}')" class="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition" title="刪除此標籤">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Bottom Big Finish Button -->
          <button onclick="window.appState.closeModal()" class="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-black text-xs shadow-lg shadow-pink-500/25 transition active:scale-95 flex items-center justify-center gap-1.5 mt-5 mb-2 cursor-pointer">
            <span class="kitty-bow !w-3.5 !h-3.5"></span>
            <span>完成並返回【${className}】點記板</span>
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

  // --- Tag Drag Handlers with 100% Reliable Hit Testing & Spring Parting Animation ---
  handleTagTouchStart(e, tagId) {
    const touch = e.touches ? e.touches[0] : e;
    this.dragStartCoords = { x: touch.clientX, y: touch.clientY };

    clearTimeout(this.longPressTimer);
    this.longPressTimer = setTimeout(() => {
      this.startTagDrag(touch, tagId);
    }, 240);
  }

  startTagDrag(touch, tagId) {
    this.isDraggingTag = true;
    this.draggedTagId = tagId;
    this.tagDragStartTouch = { x: touch.clientX, y: touch.clientY };
    this.lastTouchX = touch.clientX;

    if (navigator.vibrate) navigator.vibrate([35, 25, 35]);
    if (window.appState?.playPop) window.appState.playPop();

    const listEl = document.getElementById('tag-manager-drag-list');
    const cards = Array.from(listEl.querySelectorAll('.tag-sort-card'));

    // 1. Snapshot static layout bounding boxes BEFORE any animation transforms!
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
    this.currentHoverIndex = this.draggedIndex;

    const sampleHeight = this.cardSnapshots[0]?.height || 52;
    this.stepHeight = sampleHeight + 8; // 8px Tailwind space-y-2 gap

    const originalCard = document.getElementById(`tag-item-${tagId}`);
    if (originalCard) {
      const rect = originalCard.getBoundingClientRect();
      this.tagCardRect = rect;

      // 2. Clone clean ghost FIRST
      const ghost = originalCard.cloneNode(true);
      ghost.id = 'ios-drag-floating-ghost';
      ghost.classList.remove('is-dragging', 'seating-drop-slot');
      ghost.classList.add('ios-ghost-card');
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      ghost.style.left = `${rect.left}px`;
      ghost.style.top = `${rect.top}px`;
      ghost.style.transform = 'translate3d(0, 0, 0) scale(1.06)';
      ghost.style.transformOrigin = 'center center';
      document.body.appendChild(ghost);
      this.tagDragGhost = ghost;

      // 3. Mark original card on ground as drop slot
      originalCard.classList.add('is-dragging', 'seating-drop-slot');
    }

    if (listEl) listEl.classList.add('ios-jiggle-active');

    // Bind global window events so touch is NEVER lost even during rapid dragging
    this.boundGlobalMove = (e) => this.handleTagTouchMove(e);
    this.boundGlobalEnd = (e) => this.handleTagTouchEnd(e);
    window.addEventListener('touchmove', this.boundGlobalMove, { passive: false });
    window.addEventListener('touchend', this.boundGlobalEnd);
    window.addEventListener('mousemove', this.boundGlobalMove);
    window.addEventListener('mouseup', this.boundGlobalEnd);
  }

  handleTagTouchMove(e) {
    const touch = e.touches ? e.touches[0] : e;

    if (this.isDraggingTag) {
      if (e.preventDefault) e.preventDefault();

      // Dynamic tilt based on velocity like a fluid bubble
      const vx = touch.clientX - (this.lastTouchX || touch.clientX);
      this.lastTouchX = touch.clientX;
      const tilt = Math.max(-6, Math.min(6, vx * 0.4));

      // 1. Move floating ghost directly with finger
      if (this.tagDragGhost && this.tagDragStartTouch && this.tagCardRect) {
        const dx = touch.clientX - this.tagDragStartTouch.x;
        const dy = touch.clientY - this.tagDragStartTouch.y;
        this.tagDragGhost.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.06) rotate(${tilt}deg)`;
      }

      // 2. Pure mathematical hit detection based on touch.clientY
      let targetIndex = this.cardSnapshots.length - 1;
      for (let i = 0; i < this.cardSnapshots.length; i++) {
        if (touch.clientY < this.cardSnapshots[i].centerY) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex !== this.currentHoverIndex) {
        this.currentHoverIndex = targetIndex;
        this.applyListDisplacement(this.draggedIndex, targetIndex);
        if (navigator.vibrate) navigator.vibrate(15);
      }
    } else if (this.dragStartCoords) {
      const dx = Math.abs(touch.clientX - this.dragStartCoords.x);
      const dy = Math.abs(touch.clientY - this.dragStartCoords.y);
      if (dx > 8 || dy > 8) {
        clearTimeout(this.longPressTimer);
      }
    }
  }

  applyListDisplacement(fromIdx, toIdx) {
    const tags = this.store.getTags(this.currentClassId);
    const step = this.stepHeight;

    tags.forEach((tag, idx) => {
      const card = document.getElementById(`tag-item-${tag.id}`);
      if (!card) return;

      if (idx === fromIdx) {
        // Dragged source slot glides with liquid spring to target gap position
        const offset = (toIdx - fromIdx) * step;
        card.style.transform = `translate3d(0, ${offset}px, 0) scale(0.95)`;
      } else {
        // Liquid bubble parting (向上下滑溜擠開動效)
        let offset = 0;
        if (fromIdx < toIdx && idx > fromIdx && idx <= toIdx) {
          // Dragging downwards: items between fromIdx and toIdx glide UP by 1 slot
          offset = -step;
        } else if (fromIdx > toIdx && idx >= toIdx && idx < fromIdx) {
          // Dragging upwards: items between toIdx and fromIdx glide DOWN by 1 slot
          offset = step;
        }

        if (offset !== 0) {
          card.style.transform = `translate3d(0, ${offset}px, 0) scale(0.99)`;
          card.classList.add('bubble-displaced');
        } else {
          card.style.transform = '';
          card.classList.remove('bubble-displaced');
        }
      }
    });
  }

  clearTagHoverTarget() {
    const tags = this.store.getTags(this.currentClassId);
    tags.forEach(tag => {
      const card = document.getElementById(`tag-item-${tag.id}`);
      if (card) {
        card.style.transform = '';
        card.classList.remove('bubble-displaced');
      }
    });
    this.currentHoverIndex = null;
  }

  handleTagTouchEnd(e) {
    clearTimeout(this.longPressTimer);

    if (this.isDraggingTag) {
      const fromIdx = this.draggedIndex;
      const toIdx = this.currentHoverIndex;

      if (toIdx !== null && toIdx !== fromIdx && fromIdx >= 0 && toIdx >= 0) {
        this.store.reorderTagsByIndex(fromIdx, toIdx, this.currentClassId);
        if (window.appState?.playChime) window.appState.playChime();
        if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
        window.appState.showToast('✨ 標籤已像水漾氣泡般平滑塞入！', 'success');
      }

      this.stopTagDrag();
    }
  }

  stopTagDrag() {
    this.isDraggingTag = false;

    // Clean up global listeners
    if (this.boundGlobalMove) {
      window.removeEventListener('touchmove', this.boundGlobalMove);
      window.removeEventListener('mousemove', this.boundGlobalMove);
      this.boundGlobalMove = null;
    }
    if (this.boundGlobalEnd) {
      window.removeEventListener('touchend', this.boundGlobalEnd);
      window.removeEventListener('mouseup', this.boundGlobalEnd);
      this.boundGlobalEnd = null;
    }

    this.clearTagHoverTarget();
    if (this.tagDragGhost) {
      this.tagDragGhost.remove();
      this.tagDragGhost = null;
    }
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
    this.openTagManagerModal();
    if (window.matrixView) window.matrixView.render('classroom-matrix-view', this.currentClassId);
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
        this.store.updateTag(tag.id, tag, this.currentClassId);
        window.appState.showToast(`已將「${tag.name}」分值更新為 ${newDelta > 0 ? '+' : ''}${newDelta}`, 'success');
        this.openTagManagerModal();
        if (window.matrixView) window.matrixView.render('classroom-matrix-view', this.currentClassId);
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
      this.openTagManagerModal();
      if (window.matrixView) window.matrixView.render('classroom-matrix-view', this.currentClassId);
    }
  }

  restoreDefaults() {
    this.currentClassId = window.appState?.currentClassId || '801';
    if (confirm('確定要恢復為官方預設標籤清單嗎？（自訂標籤將被重設）')) {
      this.store.resetTagsToDefault(this.currentClassId);
      window.appState.showToast('已成功恢復官方預設標籤！', 'success');
      this.openTagManagerModal();
      if (window.matrixView) window.matrixView.render('classroom-matrix-view', this.currentClassId);
    }
  }
}

// Global Tag Manager Instance
window.tagManager = new TagManager(window.appStore);


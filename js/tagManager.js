/**
 * Tag Management Module
 * Allows teacher to add custom tags, edit point values, delete unwanted tags, and restore defaults.
 * Follows strict 3-tier unified color rules (Green = +, Red = -, Slate = 0).
 */

class TagManager {
  constructor(store) {
    this.store = store;
  }

  openTagManagerModal() {
    if (window.onboardingTour && window.onboardingTour.isActive) {
      window.onboardingTour.nextStep();
      return;
    }
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    this.renderModalContent(modalContent);
    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  renderModalContent(container) {
    const tags = this.store.getTags();

    container.innerHTML = `
      <div class="p-6 max-h-[85vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-pink-200">
          <div class="flex items-center space-x-2.5">
            <div class="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 border border-pink-300 flex items-center justify-center">
              <i data-lucide="tag" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="text-lg font-black text-slate-900 flex items-center gap-2">
                記點標籤管理中心
                <span class="kitty-bow"></span>
              </h3>
              <p class="text-xs text-slate-600">自訂常用加減分標籤、調整分值，或刪除用不到的預設標籤</p>
            </div>
          </div>
          <button onclick="window.appState.closeModal()" class="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Add New Tag Form Accordion -->
        <div class="glass-card rounded-2xl p-4 mb-5 border border-pink-300 bg-pink-50/50">
          <h4 class="text-xs font-black text-pink-800 mb-3 flex items-center gap-1.5">
            <i data-lucide="plus-circle" class="w-4 h-4"></i> 新增自訂行為/表現標籤
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
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-xs font-black text-slate-700 uppercase tracking-wider">現有標籤清單 (${tags.length} 個)</h4>
            <button onclick="tagManager.restoreDefaults()" class="text-xs text-pink-600 hover:underline font-bold transition">
              恢復官方預設標籤
            </button>
          </div>

          <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
            ${tags.map(tag => {
              const isPos = tag.delta > 0;
              const isZero = tag.delta === 0;
              const badgeClass = isPos ? 'color-rule-pos-badge' : isZero ? 'color-rule-zero-badge' : 'color-rule-neg-badge';

              return `
                <div class="flex items-center justify-between p-2.5 rounded-xl bg-white border border-pink-100 hover:border-pink-300 transition text-xs shadow-sm">
                  <div class="flex items-center space-x-3">
                    <span class="font-black px-2.5 py-0.5 rounded-lg text-xs border ${badgeClass}">
                      ${tag.delta > 0 ? '+' : ''}${tag.delta} 分
                    </span>
                    <div>
                      <strong class="text-slate-900 font-black text-sm">${tag.name}</strong>
                      <span class="text-[10px] text-slate-500 ml-2">(${tag.category === 'academic' ? '學業' : tag.category === 'conflict' ? '衝突' : tag.category === 'social' ? '熱心' : '常規'})</span>
                    </div>
                  </div>

                  <div class="flex items-center space-x-2">
                    <button onclick="tagManager.editTagDelta('${tag.id}')" class="px-2 py-1 rounded-lg text-slate-600 hover:bg-slate-100 text-[11px] font-bold border transition">
                      修改分值
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
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  handleCreateTag(e) {
    e.preventDefault();
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

    this.store.addTag(newTag);
    window.appState.showToast(`已成功新增標籤：「${name} (${delta > 0 ? '+' : ''}${delta})」`, 'success');
    this.openTagManagerModal();
    if (window.matrixView) window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
  }

  editTagDelta(tagId) {
    const tag = this.store.getTags().find(t => t.id === tagId);
    if (!tag) return;

    const newDeltaStr = prompt(`請輸入「${tag.name}」的新分值 (+/-整數)：`, tag.delta);
    if (newDeltaStr !== null) {
      const newDelta = parseInt(newDeltaStr, 10);
      if (!isNaN(newDelta)) {
        tag.delta = newDelta;
        this.store.updateTag(tag);
        window.appState.showToast(`已將「${tag.name}」分值更新為 ${newDelta > 0 ? '+' : ''}${newDelta}`, 'success');
        this.openTagManagerModal();
        if (window.matrixView) window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
      }
    }
  }

  deleteTag(tagId) {
    const tag = this.store.getTags().find(t => t.id === tagId);
    if (!tag) return;

    if (confirm(`確定要刪除「${tag.name}」標籤嗎？`)) {
      this.store.deleteTag(tagId);
      window.appState.showToast(`已刪除「${tag.name}」標籤`, 'info');
      this.openTagManagerModal();
      if (window.matrixView) window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
    }
  }

  restoreDefaults() {
    if (confirm('確定要恢復為官方預設標籤清單嗎？（自訂標籤將被重設）')) {
      const fullData = this.store.data;
      fullData.tags = [
        { id: 'disc_distracted', name: '課堂分心/聊私事', category: 'discipline', delta: -1, severity: 'warning' },
        { id: 'acad_solve_board', name: '主動上台解題', category: 'academic', delta: 2, severity: 'positive' },
        { id: 'acad_hw_perfect', name: '作業全對/書寫工整', category: 'academic', delta: 2, severity: 'positive' },
        { id: 'acad_hw_missing', name: '作業缺交/遲交', category: 'academic', delta: -2, severity: 'warning' },
        { id: 'acad_active_answer', name: '認真提問/回答', category: 'academic', delta: 1, severity: 'positive' },
        { id: 'disc_sleeping', name: '課堂瞌睡/發呆', category: 'discipline', delta: -1, severity: 'warning' },
        { id: 'soc_help_peer', name: '熱心輔導同儕', category: 'social', delta: 1, severity: 'positive' },
        { id: 'disc_rude_teacher', name: '頂撞師長/不服管教', category: 'discipline', delta: -3, severity: 'critical' }
      ];
      this.store.save(fullData);
      window.appState.showToast('已成功恢復官方預設標籤！', 'success');
      this.openTagManagerModal();
      if (window.matrixView) window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
    }
  }
}

// Global Tag Manager Instance
window.tagManager = new TagManager(window.appStore);

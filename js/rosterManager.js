/**
 * Class & Student Roster Manager (班級與學生名單管理中心)
 * Extremely intuitive: 1-click batch paste student rosters from Excel/Word,
 * add/rename classes, edit seat numbers, and manage homeroom/subject settings.
 */

class RosterManager {
  constructor(store) {
    this.store = store;
    this.currentClassId = '801';
  }

  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (window.appState?.currentClassId) {
      this.currentClassId = window.appState.currentClassId;
    }
    const classes = this.store.getClasses();
    const currentClass = this.store.getClass(this.currentClassId) || Object.values(classes)[0];
    if (currentClass) this.currentClassId = currentClass.id;
    const students = this.store.getStudents(this.currentClassId);
    const maleCount = students.filter(s => (s.gender || (s.seatNo <= Math.ceil(students.length / 2) ? 'M' : 'F')) === 'M').length;
    const femaleCount = students.length - maleCount;
    let defaultSplit = Math.ceil(students.length / 2);
    for (let i = students.length - 1; i >= 0; i--) {
      const g = students[i].gender || (students[i].seatNo <= Math.ceil(students.length / 2) ? 'M' : 'F');
      if (g === 'M') {
        defaultSplit = students[i].seatNo;
        break;
      }
    }

    const classEvents = (this.store.getEvents ? this.store.getEvents(this.currentClassId) : []) || [];
    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';

    container.innerHTML = `
      <div class="glass-card rounded-3xl p-5 sm:p-6 mb-6 border shadow-sm ${
        isOAA 
          ? 'bg-gradient-to-br from-[#240e1b] via-[#2f1122] to-[#1a0813] border-amber-500/40 text-white' 
          : 'border-pink-200 bg-gradient-to-r from-pink-50/70 via-white to-sky-50/70'
      }">
        <!-- Header -->
        <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div class="flex items-center space-x-3">
            ${isOAA ? '<span class="text-3xl p-2 rounded-2xl bg-black/40 border border-amber-500/50 shadow-inner">🏛️</span>' : '<div class="sanrio-twinstars-badge !w-12 !h-12"></div>'}
            <div>
              <h2 class="text-xl sm:text-2xl font-black ${isOAA ? 'text-white' : 'text-slate-900'} flex items-center gap-2">
                <span>${isOAA ? '👥 高度育成 • 生徒名簿與班級編成中心' : '👥 班級與學生名單管理中心'}</span>
                ${isOAA ? '<span class="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-rose-950 text-amber-300 border border-amber-500/50">S-SYSTEM</span>' : '<span class="kitty-bow"></span>'}
              </h2>
              <p class="text-xs sm:text-sm ${isOAA ? 'text-amber-200/80' : 'text-slate-600'} font-medium">
                ${isOAA ? '高度育成高等學校 生徒性別登錄、座號編成與日常行為紀錄協定' : '支援「1秒批次貼上全班名單」、自由新增/編輯班級、直接日常行為記點'}
              </p>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <button onclick="appState.switchTab('matrix')" class="px-3.5 py-2 rounded-2xl ${isOAA ? 'bg-[#1e0a15] border border-amber-500/40 hover:bg-[#2d0f20] text-amber-200' : 'bg-white border border-pink-300 hover:bg-pink-50 text-pink-700'} text-xs sm:text-sm font-black shadow-sm transition flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="layout-grid" class="w-4 h-4 ${isOAA ? 'text-amber-400' : 'text-pink-500'}"></i> ${isOAA ? '🏫 前往 OAA 實力點記板' : '🏫 前往課堂點記板'}
            </button>
          </div>
        </div>

        <!-- Class Quick Tabs / Switcher -->
        <div class="mb-6 flex flex-wrap items-center gap-2">
          ${Object.values(classes).map(c => `
            <button onclick="rosterManager.switchClass('${c.id}')" class="px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 border ${
              c.id === this.currentClassId 
                ? (isOAA ? 'bg-gradient-to-r from-amber-600 to-rose-700 text-white border-amber-400 shadow-md ring-2 ring-amber-500/50' : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white border-pink-400 shadow-md ring-2 ring-pink-300/50')
                : (isOAA ? 'bg-[#1f0b16] border-amber-500/30 text-amber-100 hover:bg-[#2d1020]' : 'bg-white/80 border-pink-200 text-slate-700 hover:bg-pink-50')
            }">
              <span>${c.name}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded-full ${c.id === this.currentClassId ? 'bg-black/20 text-white' : 'bg-pink-100 text-pink-700'}">${c.studentCount || (c.students ? c.students.length : 0)}人</span>
            </button>
          `).join('')}

          <button onclick="rosterManager.openNewClassModal()" class="px-3.5 py-2 rounded-2xl ${isOAA ? 'border-amber-500/40 text-amber-300 hover:bg-amber-950/30' : 'border-dashed border-pink-300 text-pink-700 hover:bg-pink-50'} border text-xs sm:text-sm font-black transition flex items-center gap-1 cursor-pointer">
            <i data-lucide="plus" class="w-4 h-4"></i> 新增班級
          </button>
        </div>

        <!-- Class Settings Bar -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div class="${isOAA ? 'bg-[#1b0a14] border-amber-500/35' : 'bg-white border-pink-200'} rounded-2xl p-4 border shadow-sm">
            <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-600'} mb-1.5">當前班級名稱：</label>
            <div class="flex items-center space-x-2">
              <input type="text" id="roster-class-name-input" value="${currentClass ? currentClass.name : ''}" 
                class="border ${isOAA ? 'border-amber-500/40 bg-[#12050c] text-white focus:border-amber-400' : 'border-pink-200 bg-white text-slate-900 focus:border-pink-500'} rounded-xl px-3 py-1.5 text-sm font-black flex-1 focus:outline-none">
              <button onclick="rosterManager.saveClassName('${this.currentClassId}')" class="px-3 py-1.5 rounded-xl ${isOAA ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-pink-500 hover:bg-pink-600 text-white'} text-xs font-black transition cursor-pointer">
                儲存
              </button>
            </div>
          </div>

          <div class="${isOAA ? 'bg-[#1b0a14] border-amber-500/35' : 'bg-white border-pink-200'} rounded-2xl p-4 border shadow-sm flex items-center justify-between gap-2">
            <div>
              <div class="text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-600'} mb-1">班級型態：</div>
              <div class="text-sm font-black ${isOAA ? 'text-white' : 'text-slate-900'}">${currentClass && currentClass.type === 'homeroom' ? '🏫 導師班 (高頻日常紀錄)' : currentClass ? '📚 任教專科班' : '尚未建立班級'}</div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              ${currentClass ? `
                <button onclick="rosterManager.openEditClassModal('${this.currentClassId}')" class="px-2.5 py-1.5 rounded-xl ${isOAA ? 'bg-[#280e1e] border-amber-500/40 text-amber-300 hover:bg-[#38142b]' : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200'} text-xs font-black transition cursor-pointer">
                  變更型態
                </button>
                <button onclick="rosterManager.deleteClass('${this.currentClassId}')" class="px-2.5 py-1.5 rounded-xl ${isOAA ? 'bg-rose-950/80 border-rose-500/40 text-rose-300 hover:bg-rose-900' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'} text-xs font-black transition cursor-pointer" title="刪除此班級">
                  🗑️ 刪除
                </button>
              ` : ''}
            </div>
          </div>

          <div class="${isOAA ? 'bg-[#1b0a14] border-amber-500/35' : 'bg-white border-pink-200'} rounded-2xl p-4 border shadow-sm flex items-center justify-between">
            <div>
              <div class="text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-600'} mb-1">男女生性別統計：</div>
              <div class="text-sm font-black flex items-center space-x-2">
                <span class="text-blue-500">👦 男 ${maleCount}</span>
                <span class="text-pink-500">👧 女 ${femaleCount}</span>
                <span class="text-xs ${isOAA ? 'text-amber-300/70' : 'text-slate-600'} font-normal">(共 ${students.length} 人)</span>
              </div>
            </div>
            <button id="roster-paste-btn" onclick="rosterManager.openBatchPasteModal('${this.currentClassId}')" class="px-3.5 py-2 rounded-xl ${isOAA ? 'bg-gradient-to-r from-amber-600 to-rose-700 text-white border border-amber-400 hover:from-amber-500 hover:to-rose-600' : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 shadow-md'} text-xs font-black transition flex items-center gap-1 cursor-pointer">
              <i data-lucide="clipboard-paste" class="w-3.5 h-3.5"></i> 批次貼上名冊
            </button>
          </div>
        </div>

        <!-- Gender Boundary & Quick Tools -->
        <div class="${isOAA ? 'bg-[#180812] border-amber-500/30' : 'bg-white/80 border-pink-200'} rounded-2xl p-4 mb-6 border flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center space-x-2 flex-wrap gap-y-2">
            <span class="font-black ${isOAA ? 'text-amber-200' : 'text-slate-700'}">⚡ 智慧男女劃分：</span>
            <span class="${isOAA ? 'text-slate-400' : 'text-slate-600'}">1 ~ </span>
            <input type="number" id="roster-gender-split-input" min="0" max="${students.length}" value="${defaultSplit}" 
              class="w-14 text-center border ${isOAA ? 'border-amber-500/40 bg-[#12050c] text-white' : 'border-pink-200 bg-white text-slate-800'} rounded-lg py-1 text-xs font-bold font-mono">
            <span class="${isOAA ? 'text-slate-400' : 'text-slate-600'}">號為男生，其餘為女生</span>
            <button onclick="rosterManager.applyGenderSplit('${this.currentClassId}')" 
              class="px-3 py-1.5 rounded-xl ${isOAA ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-pink-500 hover:bg-pink-600 text-white'} font-black transition cursor-pointer">
              一鍵套用
            </button>
          </div>

          <div class="flex items-center space-x-2">
            <button onclick="rosterManager.resetHalfGender('${this.currentClassId}')" 
              class="px-3 py-1.5 rounded-xl ${isOAA ? 'bg-[#280e1e] border-amber-500/40 text-amber-200 hover:bg-[#38142b]' : 'bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200'} text-xs font-bold transition cursor-pointer" title="前半段為男、後半段為女">
              前後半男女
            </button>
            <button onclick="rosterManager.applyAllGender('${this.currentClassId}', 'M')" 
              class="px-3 py-1.5 rounded-xl ${isOAA ? 'bg-blue-950/90 hover:bg-blue-900 text-cyan-300 border border-cyan-500/60' : 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300'} text-xs font-black transition cursor-pointer" title="全班全設為男生">
              全男
            </button>
            <button onclick="rosterManager.applyAllGender('${this.currentClassId}', 'F')" 
              class="px-3 py-1.5 rounded-xl ${isOAA ? 'bg-rose-950/90 hover:bg-rose-900 text-pink-300 border border-pink-500/60' : 'bg-pink-100 hover:bg-pink-200 text-pink-800 border border-pink-300'} text-xs font-black transition cursor-pointer" title="全班全設為女生">
              全女
            </button>
          </div>
        </div>

        <!-- Student Roster Grid -->
        <div class="${isOAA ? 'bg-[#1b0a14] border-amber-500/35' : 'bg-white border-pink-200'} rounded-2xl p-5 border shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-black ${isOAA ? 'text-white' : 'text-slate-800'} flex items-center gap-2">
              <span>${currentClass ? currentClass.name : ''} 學生名冊清單</span>
              <span class="text-xs px-2.5 py-0.5 rounded-full font-bold ${isOAA ? 'bg-rose-950 text-amber-300 border border-amber-500/40' : 'bg-pink-100 text-pink-700'}">共 ${students.length} 位學生</span>
            </h3>
            <button onclick="rosterManager.addNewStudentRow('${this.currentClassId}')" class="min-h-[36px] px-3 py-1.5 rounded-xl ${isOAA ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-900' : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'} text-xs font-black transition flex items-center gap-1 cursor-pointer">
              <i data-lucide="user-plus" class="w-3.5 h-3.5"></i> 新增一位學生
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:max-h-[580px] md:overflow-y-auto pr-1">
            ${students.map(s => {
              const gender = s.gender || (s.seatNo <= Math.ceil(students.length / 2) ? 'M' : 'F');
              const studentEvents = classEvents.filter(e => e.seatNo === s.seatNo);
              const pts = studentEvents.reduce((sum, e) => sum + (Number(e.delta) || 0), 0);
              return `
              <div class="p-2.5 sm:p-3 rounded-2xl border ${
                isOAA 
                  ? 'border-amber-500/30 bg-[#240e1b] hover:bg-[#301224] text-white' 
                  : 'border-pink-100 bg-pink-50/40 hover:bg-pink-50 text-slate-900'
              } flex items-center justify-between transition shadow-sm gap-1.5">
                <div class="flex items-center space-x-1.5 min-w-0 flex-1">
                  <span class="w-7 h-7 rounded-xl ${
                    isOAA 
                      ? 'bg-[#12050d] text-amber-300 border border-amber-500/50' 
                      : 'bg-pink-200 text-pink-800'
                  } font-black text-xs flex items-center justify-center shadow-inner shrink-0 font-mono">
                    ${String(s.seatNo).padStart(2, '0')}
                  </span>
                  <input type="text" value="${s.name}" 
                    onchange="rosterManager.updateStudentName('${this.currentClassId}', ${s.seatNo}, this.value)"
                    class="border ${
                      isOAA 
                        ? 'border-amber-500/40 bg-[#14060e] text-white focus:border-amber-400' 
                        : 'border-pink-200 bg-white text-slate-900 focus:border-pink-500'
                    } rounded-lg px-2 py-1 text-xs sm:text-sm font-black focus:outline-none flex-1 min-w-[68px]">
                  <span class="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-md font-mono font-black shrink-0 ${
                    pts > 0 
                      ? (isOAA ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-emerald-100 text-emerald-800')
                      : pts < 0 
                      ? (isOAA ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'bg-rose-100 text-rose-800')
                      : (isOAA ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-100 text-slate-500')
                  }" title="累計平時加扣分">
                    ${pts > 0 ? '+' + pts : pts}分
                  </span>
                </div>
                
                <div class="flex items-center space-x-1 shrink-0">
                  <button type="button" onclick="rosterManager.openQuickRecordModal('${this.currentClassId}', ${s.seatNo})" 
                    class="min-h-[36px] px-2 py-1 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-0.5 border ${
                      isOAA
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                        : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    }" title="直接為此學生進行日常行為紀錄與加扣分">
                    <span>⚡ 記點</span>
                  </button>
                  <button type="button" onclick="rosterManager.toggleGender('${this.currentClassId}', ${s.seatNo})" class="min-h-[36px] px-2 py-1 rounded-lg text-xs font-black transition cursor-pointer border ${
                    isOAA
                      ? (gender === 'F' ? 'bg-rose-950 text-pink-300 border-pink-500/60 hover:bg-rose-900' : 'bg-blue-950 text-cyan-300 border-cyan-500/60 hover:bg-blue-900')
                      : (gender === 'F' ? 'bg-pink-100 text-pink-700 border-pink-300 hover:bg-pink-200' : 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200')
                  }" title="點擊切換性別 (男 / 女)">
                    ${gender === 'F' ? '👧' : '👦'}
                  </button>
                  <button onclick="rosterManager.deleteStudent('${this.currentClassId}', ${s.seatNo})" class="min-h-[36px] min-w-[32px] p-1.5 flex items-center justify-center ${isOAA ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/50' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'} rounded-lg transition cursor-pointer" title="刪除此學生">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
            `;}).join('')}
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  switchClass(classId) {
    this.currentClassId = classId;
    if (window.appState && window.appState.currentClassId !== classId) {
      window.appState.handleManualClassChange(classId);
    } else {
      this.render('roster-manager-view');
    }
  }

  // --- 1-Click Batch Paste Modal ---
  openBatchPasteModal(classId) {
    const cls = this.store.getClass(classId);
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';

    modalContent.innerHTML = `
      <div class="p-6 ${isOAA ? 'bg-[#1e0a15] text-white' : ''}">
        <div class="flex items-center space-x-3 mb-4">
          ${isOAA ? '<span class="text-3xl p-2 rounded-2xl bg-black/40 border border-amber-500/50 shadow-inner">📋</span>' : '<div class="sanrio-twinstars-badge !w-12 !h-12"></div>'}
          <div>
            <h3 class="text-xl font-black ${isOAA ? 'text-white' : 'text-slate-900'} flex items-center gap-2">
              <span>📋 1秒批次貼上學生名單</span>
              ${isOAA ? '<span class="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-rose-950 text-amber-300 border border-amber-500/50">S-SYSTEM</span>' : '<span class="kitty-bow"></span>'}
            </h3>
            <p class="text-xs ${isOAA ? 'text-amber-200/80' : 'text-slate-600'} font-medium">為【${cls ? cls.name : classId}】快速導入名單，系統會自動按順序分配座號</p>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1.5">
            請直接貼上學生姓名（支援一行一個名字、以空格隔開、或帶有座號如「1. 王小明」）：
          </label>
          <textarea id="batch-roster-textarea" rows="10" placeholder="例如直接複製 Excel、Word 或通訊錄：\n王小明\n李小華\n陳美麗\n張建國\n..." class="w-full border-2 ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white focus:border-amber-400' : 'border-pink-200 bg-white text-slate-900 focus:border-pink-500'} rounded-2xl p-3 text-sm font-bold focus:outline-none font-mono"></textarea>
        </div>

        <div class="p-3 rounded-xl ${isOAA ? 'bg-[#15050e] border border-amber-500/30 text-amber-200' : 'bg-pink-50 border border-pink-200 text-pink-900'} text-xs mb-4">
          💡 <strong>貼心提示</strong>：若直接貼上 <code>1. 王小明 2. 李小美</code>，系統會自動辨識並去掉數字前綴，純粹提取姓名！
        </div>

        <div class="flex items-center justify-end space-x-3">
          <button type="button" onclick="window.appState.closeModal()" class="px-4 py-2 text-xs font-bold ${isOAA ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition cursor-pointer">
            取消
          </button>
          <button type="button" onclick="rosterManager.applyBatchPaste('${classId}')" class="px-5 py-2.5 rounded-xl ${isOAA ? 'bg-gradient-to-r from-amber-600 to-rose-700 hover:from-amber-500 hover:to-rose-600 border border-amber-400' : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700'} text-white font-black text-xs sm:text-sm shadow-md transition flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="check" class="w-4 h-4"></i> 一鍵覆蓋並儲存名冊
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  applyBatchPaste(classId) {
    const textarea = document.getElementById('batch-roster-textarea');
    if (!textarea) return;

    const rawText = textarea.value.trim();
    if (!rawText) {
      window.appState.showToast('請先貼上學生名單文字', 'warning');
      return;
    }

    // Parse lines or space/comma/numbered separated names cleanly
    const rawTokens = rawText.split(/[\r\n,，、\t]+/);
    const expandedTokens = [];
    rawTokens.forEach(chunk => {
      const seg = chunk.trim();
      if (!seg) return;
      if (/\d/.test(seg)) {
        // Split inline numbered sequences e.g. "1. 王小明 2. 李小美" without splitting "02 林子涵" or "3 號 黃柏翔"
        seg.split(/(?<=\S)\s+(?=\d+)/).forEach(part => {
          if (part.trim()) expandedTokens.push(part.trim());
        });
      } else if (/\s/.test(seg)) {
        // Plain space-separated names without numbers e.g. "王小明 李小美 陳大華"
        seg.split(/\s+/).forEach(part => {
          if (part.trim()) expandedTokens.push(part.trim());
        });
      } else {
        expandedTokens.push(seg);
      }
    });

    const parsedNames = [];
    expandedTokens.forEach(token => {
      const cleanName = token.replace(/^\d+\s*(?:號|[.\-、])?\s*/, '').trim();
      if (cleanName) {
        parsedNames.push(cleanName);
      }
    });

    if (parsedNames.length === 0) {
      window.appState.showToast('無法解析出學生姓名，請檢查文字格式', 'warning');
      return;
    }

    // Build student objects with first-half Male, second-half Female default
    const totalCount = parsedNames.length;
    const halfCount = Math.ceil(totalCount / 2);
    const newStudents = parsedNames.map((name, idx) => ({
      seatNo: idx + 1,
      name: name,
      gender: (idx + 1) <= halfCount ? 'M' : 'F'
    }));

    // Create snapshot before overwriting roster
    this.store.createSnapshot(`批次匯入 ${classId} 班名單前`);

    // Update in store
    const fullData = this.store.data;
    fullData.students[classId] = newStudents;
    if (fullData.classes[classId]) {
      fullData.classes[classId].studentCount = newStudents.length;
    }
    this.store.save(fullData);
    localStorage.removeItem('classquant_user_cleared');
    delete fullData.hasClearedAll;

    // Sync with global appState & timetable engine so home page immediately reflects this class
    this.currentClassId = classId;
    if (window.appState) {
      window.appState.currentClassId = classId;
      if (window.timetableEngine) window.timetableEngine.setManualOverride(classId);
      window.appState.renderClassDropdown();
      window.appState.updateHeaderStatus();
    }

    window.appState.showToast(`🎉 成功為 ${classId} 班匯入 ${newStudents.length} 位學生名單！已同步至主頁點記板`, 'success');
    window.appState.closeModal();
    this.render('roster-manager-view');
    if (window.matrixView) window.matrixView.render('classroom-matrix-view', classId);
  }

  toggleGender(classId, seatNo) {
    const newGender = this.store.toggleStudentGender(classId, seatNo);
    window.appState.showToast(`已將 ${seatNo} 號性別切換為【${newGender === 'F' ? '👧 女生' : '👦 男生'}】`, 'info');
    this.render('roster-manager-view');
    if (window.matrixView) {
      window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
    }
  }

  applyGenderSplit(classId) {
    const input = document.getElementById('roster-gender-split-input');
    const val = input ? parseInt(input.value, 10) : 0;
    if (isNaN(val) || val < 0) {
      window.appState.showToast('請輸入有效的座號界線數字', 'warning');
      return;
    }
    this.store.setGenderSplitBoundary(classId, val);
    window.appState.showToast(`已劃分：1 ~ ${val} 號為【👦 男生】，${val + 1} 號以後為【👧 女生】！`, 'success');
    this.render('roster-manager-view');
    if (window.matrixView) {
      window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
    }
  }

  resetHalfGender(classId) {
    const students = this.store.getStudents(classId);
    const half = Math.ceil(students.length / 2);
    this.store.setGenderSplitBoundary(classId, half);
    window.appState.showToast(`已重設為各半：1 ~ ${half} 號為男生，其餘為女生`, 'info');
    this.render('roster-manager-view');
    if (window.matrixView) {
      window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
    }
  }

  applyAllGender(classId, gender) {
    this.store.setAllStudentsGender(classId, gender);
    window.appState.showToast(`已將全班學生性別設定為【${gender === 'F' ? '👧 女生' : '👦 男生'}】`, 'success');
    this.render('roster-manager-view');
    if (window.matrixView) {
      window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
    }
  }

  updateStudentName(classId, seatNo, newName) {
    const cleanName = newName.trim();
    if (!cleanName) return;

    const fullData = this.store.data;
    const student = (fullData.students[classId] || []).find(s => s.seatNo === seatNo);
    if (student) {
      student.name = cleanName;
      this.store.save(fullData);
      window.appState.showToast(`已更新 ${seatNo} 號姓名為：${cleanName}`, 'info');
      if (window.matrixView) window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
    }
  }

  addNewStudentRow(classId) {
    const fullData = this.store.data;
    if (!fullData.students[classId]) fullData.students[classId] = [];
    const list = fullData.students[classId];
    const newSeatNo = list.length > 0 ? Math.max(...list.map(s => s.seatNo)) + 1 : 1;

    list.push({
      seatNo: newSeatNo,
      name: `新學生${newSeatNo}`,
      gender: 'M'
    });
    if (fullData.classes[classId]) {
      fullData.classes[classId].studentCount = list.length;
    }
    this.store.save(fullData);
    this.render('roster-manager-view');
    if (window.matrixView) window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
  }

  deleteStudent(classId, seatNo) {
    if (confirm(`確定要刪除 ${seatNo} 號學生嗎？`)) {
      const fullData = this.store.data;
      if (fullData.students[classId]) {
        fullData.students[classId] = fullData.students[classId].filter(s => s.seatNo !== seatNo);
        if (fullData.classes[classId]) {
          fullData.classes[classId].studentCount = fullData.students[classId].length;
        }
        this.store.save(fullData);
        window.appState.showToast(`已刪除座號 ${seatNo} 號`, 'info');
        this.render('roster-manager-view');
        if (window.matrixView) window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
      }
    }
  }

  // --- Class Creation & Modification ---
  openNewClassModal() {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';

    modalContent.innerHTML = `
      <div class="p-6 ${isOAA ? 'bg-[#1e0a15] text-white' : ''}">
        <h3 class="text-xl font-black ${isOAA ? 'text-white' : 'text-slate-900'} mb-4 flex items-center gap-2">
          <span>➕ 新增授課班級</span>
          ${isOAA ? '<span class="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-rose-950 text-amber-300 border border-amber-500/50">S-SYSTEM</span>' : '<span class="kitty-bow"></span>'}
        </h3>

        <form onsubmit="rosterManager.saveNewClass(event)" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">班級代碼 (如 804)</label>
              <input type="text" id="new-class-id" required placeholder="804" class="w-full border ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white focus:border-amber-400' : 'border-pink-300 bg-white text-slate-900'} rounded-xl px-3 py-2 text-sm font-bold">
            </div>
            <div>
              <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">班級全名 (如 八年四班)</label>
              <input type="text" id="new-class-name" required placeholder="八年四班" class="w-full border ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white focus:border-amber-400' : 'border-pink-300 bg-white text-slate-900'} rounded-xl px-3 py-2 text-sm font-bold">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">班級性質</label>
            <select id="new-class-type" class="w-full border ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white focus:border-amber-400' : 'border-pink-300 bg-white text-slate-900'} rounded-xl px-3 py-2 text-sm font-bold">
              <option value="subject">數學科任班</option>
              <option value="homeroom">導師班 (本班)</option>
            </select>
          </div>

          <div class="flex items-center justify-end space-x-3 pt-3">
            <button type="button" onclick="window.appState.closeModal()" class="px-4 py-2 text-xs font-bold ${isOAA ? 'text-slate-400 hover:text-white' : 'text-slate-600'} transition cursor-pointer">取消</button>
            <button type="submit" class="px-5 py-2.5 rounded-xl ${isOAA ? 'bg-gradient-to-r from-amber-600 to-rose-700 hover:from-amber-500 hover:to-rose-600 border border-amber-400' : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700'} text-white font-black text-xs shadow-md transition cursor-pointer">建立班級</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  saveNewClass(e) {
    e.preventDefault();
    const id = document.getElementById('new-class-id').value.trim();
    const name = document.getElementById('new-class-name').value.trim();
    const type = document.getElementById('new-class-type').value;

    const fullData = this.store.data;
    if (fullData.classes[id]) {
      window.appState.showToast(`班級代碼 ${id} 已存在！`, 'warning');
      return;
    }

    fullData.classes[id] = { id, name, type, studentCount: 0 };
    fullData.students[id] = [];
    localStorage.removeItem('classquant_user_cleared');
    delete fullData.hasClearedAll;
    this.store.save(fullData);

    this.currentClassId = id;
    if (window.appState) {
      window.appState.currentClassId = id;
      if (window.timetableEngine) window.timetableEngine.setManualOverride(id);
      window.appState.renderClassDropdown();
      window.appState.updateHeaderStatus();
    }

    window.appState.showToast(`已成功建立 ${name}！已同步設為當前班級，請接著匯入學生名單`, 'success');
    window.appState.closeModal();
    this.render('roster-manager-view');
    if (window.matrixView) window.matrixView.render('classroom-matrix-view', id);
  }

  openEditClassModal(classId) {
    const cls = this.store.getClass(classId);
    if (!cls) return;

    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';

    modalContent.innerHTML = `
      <div class="p-6 ${isOAA ? 'bg-[#1e0a15] text-white' : ''}">
        <h3 class="text-xl font-black ${isOAA ? 'text-white' : 'text-slate-900'} mb-4 flex items-center justify-between">
          <span>修改班級名稱與性質 (${classId} 班)</span>
          ${isOAA ? '<span class="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-rose-950 text-amber-300 border border-amber-500/50">S-SYSTEM</span>' : ''}
        </h3>
        <form onsubmit="rosterManager.saveEditClass(event, '${classId}')" class="space-y-4">
          <div>
            <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">班級名稱</label>
            <input type="text" id="edit-class-name" value="${cls.name}" required class="w-full border ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white focus:border-amber-400' : 'border-pink-300 bg-white text-slate-900'} rounded-xl px-3 py-2 text-sm font-bold">
          </div>
          <div>
            <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">班級性質</label>
            <select id="edit-class-type" class="w-full border ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white focus:border-amber-400' : 'border-pink-300 bg-white text-slate-900'} rounded-xl px-3 py-2 text-sm font-bold">
              <option value="subject" ${cls.type === 'subject' ? 'selected' : ''}>數學科任班</option>
              <option value="homeroom" ${cls.type === 'homeroom' ? 'selected' : ''}>導師班 (本班)</option>
            </select>
          </div>
          <div class="flex items-center justify-end space-x-3 pt-3">
            <button type="button" onclick="window.appState.closeModal()" class="px-4 py-2 text-xs font-bold ${isOAA ? 'text-slate-400 hover:text-white' : 'text-slate-600'} transition cursor-pointer">取消</button>
            <button type="submit" class="px-5 py-2 rounded-xl ${isOAA ? 'bg-gradient-to-r from-amber-600 to-rose-700 hover:from-amber-500 hover:to-rose-600 border border-amber-400' : 'bg-pink-600 hover:bg-pink-700'} text-white font-black text-xs transition cursor-pointer">儲存修改</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
  }

  saveClassName(classId) {
    const input = document.getElementById('roster-class-name-input');
    const newName = input ? input.value.trim() : '';
    if (!newName) {
      window.appState.showToast('請輸入班級名稱', 'warning');
      return;
    }
    const fullData = this.store.data;
    if (fullData.classes[classId]) {
      fullData.classes[classId].name = newName;
      this.store.save(fullData);
      window.appState.showToast(`已更新班級名稱為：${newName}`, 'success');
      window.appState.renderClassDropdown();
      this.render('roster-manager-view');
      if (window.matrixView) window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
    }
  }

  saveEditClass(e, classId) {
    e.preventDefault();
    const name = document.getElementById('edit-class-name').value.trim();
    const type = document.getElementById('edit-class-type').value;

    const fullData = this.store.data;
    if (fullData.classes[classId]) {
      fullData.classes[classId].name = name;
      fullData.classes[classId].type = type;
      this.store.save(fullData);
      window.appState.showToast('已更新班級設定', 'success');
      window.appState.closeModal();
      window.appState.renderClassDropdown();
      this.render('roster-manager-view');
      if (window.matrixView) window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
    }
  }

  deleteClass(classId) {
    const classes = Object.values(this.store.getClasses());
    if (classes.length <= 1) {
      window.appState.showToast('系統至少需保留一個班級，無法刪除', 'warning');
      return;
    }

    if (confirm(`⚠️ 確定要刪除 ${classId} 班及其所有學生名單、歷史段考歸檔與記點記錄嗎？\n（系統會先自動建立本機快照以防誤刪）`)) {
      this.store.deleteClassData(classId);

      const remainClasses = Object.values(this.store.getClasses());
      this.currentClassId = remainClasses[0].id;
      window.appState.currentClassId = this.currentClassId;
      window.appState.showToast(`已完整刪除 ${classId} 班及其關聯資料`, 'info');
      window.appState.renderClassDropdown();
      window.appState.updateHeaderStatus();
      this.render('roster-manager-view');
      if (window.matrixView) window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
    }
  }

  openQuickRecordModal(classId, seatNo) {
    const student = this.store.getStudent(classId, seatNo);
    const cls = this.store.getClass(classId);
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent || !student) return;

    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';
    const classEvents = (this.store.getEvents ? this.store.getEvents(classId) : []) || [];
    const studentEvents = classEvents.filter(e => e.seatNo === seatNo);
    const currentPts = studentEvents.reduce((sum, e) => sum + (Number(e.delta) || 0), 0);
    const tags = this.store.getTags(classId) || [];
    const today = window.getLocalDateStr();

    const defaultTag = tags[0] || { id: 'homeroom_service', name: '熱心服務', category: 'discipline', delta: 1 };
    this.quickRecordState = {
      tagId: defaultTag.id,
      tagName: defaultTag.name,
      category: defaultTag.category || 'discipline',
      delta: defaultTag.delta !== undefined ? defaultTag.delta : 1
    };

    modalContent.innerHTML = `
      <div class="p-6 ${isOAA ? 'bg-[#1e0a15] text-white' : ''}">
        <div class="flex items-center space-x-3 mb-4">
          <span class="w-12 h-12 rounded-2xl ${
            isOAA ? 'bg-black/50 border border-amber-500/50 text-amber-300' : 'bg-pink-100 border border-pink-300 text-pink-700'
          } font-mono font-black text-xl flex items-center justify-center shadow-inner shrink-0">
            ${String(seatNo).padStart(2, '0')}
          </span>
          <div>
            <h3 class="text-xl font-black ${isOAA ? 'text-white' : 'text-slate-900'} flex items-center gap-2">
              <span>⚡ 日常行為快速紀錄</span>
              <span class="text-xs px-2.5 py-0.5 rounded-full font-bold ${
                currentPts > 0 
                  ? (isOAA ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' : 'bg-emerald-100 text-emerald-800')
                  : currentPts < 0
                  ? (isOAA ? 'bg-rose-950 text-rose-300 border border-rose-500/50' : 'bg-rose-100 text-rose-800')
                  : (isOAA ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700')
              }">目前累計: ${currentPts > 0 ? '+' + currentPts : currentPts} 分</span>
            </h3>
            <p class="text-xs ${isOAA ? 'text-amber-200/80' : 'text-slate-600'} font-medium">
              對象：【${cls ? cls.name : classId}】${seatNo} 號 <strong>${student.name}</strong>
            </p>
          </div>
        </div>

        <!-- Preset Fast Tags -->
        <div class="mb-4">
          <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-2">
            常用日常行為項目（點選快速帶入）：
          </label>
          <div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl border ${isOAA ? 'border-amber-500/30 bg-[#12050c]' : 'border-pink-100 bg-pink-50/50'}">
            ${tags.slice(0, 16).map(t => `
              <button type="button" id="quick-tag-chip-${t.id}" onclick="rosterManager.selectQuickRecordTag('${t.id}', '${t.name.replace(/'/g, "\\'")}', '${t.category}', ${t.delta})" 
                class="quick-tag-chip px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  t.id === this.quickRecordState.tagId
                    ? (isOAA ? 'ring-2 ring-amber-400 bg-amber-500/30 text-amber-200 border-amber-400 font-black' : 'ring-2 ring-pink-500 bg-pink-200 text-pink-900 border-pink-400 font-black')
                    : (t.delta > 0 
                        ? (isOAA ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100')
                        : (isOAA ? 'bg-rose-950/60 text-rose-300 border-rose-500/40 hover:bg-rose-900/60' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'))
                }">
                ${t.name} (${t.delta > 0 ? '+' + t.delta : t.delta})
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Custom Item & Delta Adjuster -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">
              行為/事蹟名稱：
            </label>
            <input type="text" id="quick-record-tag-name" value="${this.quickRecordState.tagName}" 
              class="w-full border-2 ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white focus:border-amber-400' : 'border-pink-200 bg-white text-slate-900 focus:border-pink-500'} rounded-xl px-3 py-2 text-sm font-bold focus:outline-none">
          </div>

          <div>
            <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">
              加扣分值 (Delta)：
            </label>
            <div class="flex items-center space-x-1">
              <button type="button" onclick="rosterManager.setQuickRecordDelta(-2)" class="px-2 py-1 rounded-lg text-xs font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 cursor-pointer">-2</button>
              <button type="button" onclick="rosterManager.setQuickRecordDelta(-1)" class="px-2 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer">-1</button>
              <input type="number" id="quick-record-delta" value="${this.quickRecordState.delta}" 
                class="w-16 text-center border-2 ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white' : 'border-pink-200 bg-white text-slate-900'} rounded-xl py-1 text-sm font-mono font-black focus:outline-none">
              <button type="button" onclick="rosterManager.setQuickRecordDelta(1)" class="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer">+1</button>
              <button type="button" onclick="rosterManager.setQuickRecordDelta(2)" class="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 cursor-pointer">+2</button>
            </div>
          </div>
        </div>

        <!-- Note & Date -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div class="sm:col-span-2">
            <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">
              詳細記事說明（選填）：
            </label>
            <input type="text" id="quick-record-note" placeholder="例如：午休主動整理餐桶、打掃認真負責..." 
              class="w-full border-2 ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white focus:border-amber-400' : 'border-pink-200 bg-white text-slate-900 focus:border-pink-500'} rounded-xl px-3 py-2 text-xs font-medium focus:outline-none">
          </div>
          <div>
            <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">
              紀錄日期：
            </label>
            <input type="date" id="quick-record-date" value="${today}" 
              class="w-full border-2 ${isOAA ? 'border-amber-500/50 bg-[#12050c] text-white focus:border-amber-400' : 'border-pink-200 bg-white text-slate-900 focus:border-pink-500'} rounded-xl px-2 py-2 text-xs font-mono font-bold focus:outline-none">
          </div>
        </div>

        <div class="flex items-center justify-end space-x-3">
          <button type="button" onclick="window.appState.closeModal()" class="px-4 py-2 text-xs font-bold ${isOAA ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition cursor-pointer">
            取消
          </button>
          <button type="button" onclick="rosterManager.saveQuickRecord('${classId}', ${seatNo})" class="px-5 py-2.5 rounded-xl ${isOAA ? 'bg-gradient-to-r from-amber-600 to-rose-700 hover:from-amber-500 hover:to-rose-600 border border-amber-400' : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700'} text-white font-black text-xs sm:text-sm shadow-md transition flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="check" class="w-4 h-4"></i> 儲存日常紀錄
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  selectQuickRecordTag(tagId, tagName, category, delta) {
    this.quickRecordState = { tagId, tagName, category, delta };
    const tagInput = document.getElementById('quick-record-tag-name');
    const deltaInput = document.getElementById('quick-record-delta');
    if (tagInput) tagInput.value = tagName;
    if (deltaInput) deltaInput.value = delta;

    document.querySelectorAll('.quick-tag-chip').forEach(el => {
      el.classList.remove('ring-2', 'ring-pink-500', 'ring-amber-400', 'font-black');
    });
    const chip = document.getElementById(`quick-tag-chip-${tagId}`);
    if (chip) {
      const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';
      chip.classList.add('ring-2', isOAA ? 'ring-amber-400' : 'ring-pink-500', 'font-black');
    }
  }

  setQuickRecordDelta(delta) {
    const deltaInput = document.getElementById('quick-record-delta');
    if (deltaInput) {
      deltaInput.value = delta;
      if (this.quickRecordState) this.quickRecordState.delta = delta;
    }
  }

  saveQuickRecord(classId, seatNo) {
    const student = this.store.getStudent(classId, seatNo);
    const tagInput = document.getElementById('quick-record-tag-name');
    const deltaInput = document.getElementById('quick-record-delta');
    const noteInput = document.getElementById('quick-record-note');
    const dateInput = document.getElementById('quick-record-date');

    const tagName = tagInput ? tagInput.value.trim() : '日常行為紀錄';
    const delta = deltaInput ? parseInt(deltaInput.value, 10) || 0 : 0;
    const note = noteInput ? noteInput.value.trim() : '';
    const date = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
    const category = (this.quickRecordState && this.quickRecordState.category) || 'discipline';

    this.store.addEvent({
      classId,
      seatNo,
      period: 0,
      tagId: (this.quickRecordState && this.quickRecordState.tagId) || 'homeroom_daily',
      tagName: tagName || '日常行為紀錄',
      category,
      delta,
      severity: delta > 0 ? 'positive' : delta < 0 ? 'warning' : 'neutral',
      note: note ? `[日常行為紀錄] ${note}` : `[日常行為紀錄] ${tagName}`,
      date
    });

    if (delta > 0 && window.appState?.playChime) {
      window.appState.playChime();
    } else if (delta < 0 && window.appState?.playWarning) {
      window.appState.playWarning();
    }

    window.appState.showToast(`⚡ 已為 ${seatNo} 號 ${student ? student.name : ''} 登記「${tagName} (${delta > 0 ? '+' : ''}${delta})」！`, 'success');
    window.appState.closeModal();
    this.render('roster-manager-view');
    if (window.matrixView) {
      window.matrixView.render('classroom-matrix-view', classId);
    }
  }
}

// Global Roster Manager Instance
window.rosterManager = new RosterManager(window.appStore);

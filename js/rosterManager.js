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

    const classes = this.store.getClasses();
    const currentClass = this.store.getClass(this.currentClassId) || Object.values(classes)[0];
    if (currentClass) this.currentClassId = currentClass.id;
    const students = this.store.getStudents(this.currentClassId);

    container.innerHTML = `
      <div class="glass-card rounded-3xl p-5 sm:p-6 mb-6 border border-pink-200 shadow-sm bg-gradient-to-r from-pink-50/70 via-white to-sky-50/70">
        <!-- Header -->
        <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div class="flex items-center space-x-3">
            <div class="sanrio-twinstars-badge !w-12 !h-12"></div>
            <div>
              <h2 class="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                👥 班級與學生名單管理中心
                <span class="kitty-bow"></span>
              </h2>
              <p class="text-xs sm:text-sm text-slate-600 font-medium">支援「1秒批次貼上全班名單」、自由新增/編輯班級、調整座號與姓名</p>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <button onclick="rosterManager.openNewClassModal()" class="px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs sm:text-sm font-black shadow-md transition flex items-center gap-1.5">
              <i data-lucide="plus" class="w-4 h-4"></i> ➕ 新增班級
            </button>
          </div>
        </div>

        <!-- Class Selector & Quick Actions -->
        <div class="p-4 rounded-2xl bg-white border border-pink-200 shadow-sm flex flex-wrap items-center justify-between gap-3 mb-6">
          <div class="flex items-center space-x-3">
            <label class="text-xs sm:text-sm font-bold text-slate-700">當前編輯班級：</label>
            <select id="roster-class-select" onchange="rosterManager.switchClass(this.value)" class="border-2 border-pink-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-black focus:outline-none bg-pink-50 text-pink-900">
              ${Object.values(classes).map(c => `
                <option value="${c.id}" ${this.currentClassId === c.id ? 'selected' : ''}>
                  ${c.name} (${c.type === 'homeroom' ? '導師班' : '數學科任'} • ${c.studentCount}人)
                </option>
              `).join('')}
            </select>
          </div>

          <div class="flex items-center space-x-2">
            <button onclick="rosterManager.openBatchPasteModal('${this.currentClassId}')" class="px-3.5 py-1.5 rounded-xl bg-pink-100 text-pink-800 border border-pink-300 text-xs sm:text-sm font-black hover:bg-pink-200 transition flex items-center gap-1.5 shadow-sm">
              <i data-lucide="clipboard-paste" class="w-4 h-4 text-pink-600"></i> 📋 1秒批次貼上名單
            </button>
            <button onclick="rosterManager.openEditClassModal('${this.currentClassId}')" class="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-200 transition flex items-center gap-1">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> 修改班名/屬性
            </button>
            <button onclick="rosterManager.deleteClass('${this.currentClassId}')" class="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition flex items-center gap-1">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> 刪除班級
            </button>
          </div>
        </div>

        <!-- Student Roster Grid -->
        <div class="bg-white rounded-2xl p-5 border border-pink-200 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-black text-slate-800 flex items-center gap-2">
              <span>${currentClass ? currentClass.name : ''} 學生名冊清單</span>
              <span class="text-xs px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 font-bold">共 ${students.length} 位學生</span>
            </h3>
            <button onclick="rosterManager.addNewStudentRow('${this.currentClassId}')" class="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-black hover:bg-emerald-100 transition flex items-center gap-1">
              <i data-lucide="user-plus" class="w-3.5 h-3.5"></i> 新增一位學生
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[550px] overflow-y-auto pr-1">
            ${students.map(s => `
              <div class="p-3 rounded-2xl border border-pink-100 bg-pink-50/40 flex items-center justify-between hover:bg-pink-50 transition">
                <div class="flex items-center space-x-2.5">
                  <span class="w-8 h-8 rounded-xl bg-pink-200 text-pink-800 font-black text-xs sm:text-sm flex items-center justify-center shadow-inner">
                    ${String(s.seatNo).padStart(2, '0')}
                  </span>
                  <input type="text" value="${s.name}" 
                    onchange="rosterManager.updateStudentName('${this.currentClassId}', ${s.seatNo}, this.value)"
                    class="border border-pink-200 rounded-lg px-2 py-1 text-sm font-black text-slate-900 focus:outline-none focus:border-pink-500 w-28 bg-white">
                </div>
                
                <div class="flex items-center space-x-1">
                  <button onclick="rosterManager.deleteStudent('${this.currentClassId}', ${s.seatNo})" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition" title="刪除此學生">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  switchClass(classId) {
    this.currentClassId = classId;
    this.render('roster-manager-view');
  }

  // --- 1-Click Batch Paste Modal ---
  openBatchPasteModal(classId) {
    const cls = this.store.getClass(classId);
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="p-6">
        <div class="flex items-center space-x-3 mb-4">
          <div class="sanrio-twinstars-badge !w-12 !h-12"></div>
          <div>
            <h3 class="text-xl font-black text-slate-900 flex items-center gap-2">
              📋 1秒批次貼上學生名單
              <span class="kitty-bow"></span>
            </h3>
            <p class="text-xs text-slate-600 font-medium">為【${cls ? cls.name : classId}】快速導入名單，系統會自動按順序分配座號</p>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-xs font-bold text-slate-700 mb-1.5">
            請直接貼上學生姓名（支援一行一個名字、以空格隔開、或帶有座號如「1. 王小明」）：
          </label>
          <textarea id="batch-roster-textarea" rows="10" placeholder="例如直接複製 Excel、Word 或通訊錄：\n王小明\n李小華\n陳美麗\n張建國\n..." class="w-full border-2 border-pink-200 rounded-2xl p-3 text-sm font-bold focus:outline-none focus:border-pink-500 bg-white font-mono"></textarea>
        </div>

        <div class="p-3 rounded-xl bg-pink-50 border border-pink-200 text-xs text-pink-900 mb-4">
          💡 <strong>貼心提示</strong>：若直接貼上 <code>1. 王小明 2. 李小美</code>，系統會自動辨識並去掉數字前綴，純粹提取姓名！
        </div>

        <div class="flex items-center justify-end space-x-3">
          <button type="button" onclick="window.appState.closeModal()" class="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition">
            取消
          </button>
          <button type="button" onclick="rosterManager.applyBatchPaste('${classId}')" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-black text-xs sm:text-sm shadow-md transition flex items-center gap-1.5">
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

    // Parse lines or space/comma separated names
    const rawTokens = rawText.split(/[\r\n,，、\t]+/);
    const parsedNames = [];

    rawTokens.forEach(token => {
      const trimmed = token.trim();
      if (trimmed) {
        // Remove leading seat numbers like "1.", "01 ", "1、"
        const cleanName = trimmed.replace(/^[\d\s.\-、]+/, '').trim();
        if (cleanName) {
          parsedNames.push(cleanName);
        }
      }
    });

    if (parsedNames.length === 0) {
      window.appState.showToast('無法解析出學生姓名，請檢查文字格式', 'warning');
      return;
    }

    // Build student objects
    const newStudents = parsedNames.map((name, idx) => ({
      seatNo: idx + 1,
      name: name,
      gender: 'M'
    }));

    // Update in store
    const fullData = this.store.data;
    fullData.students[classId] = newStudents;
    if (fullData.classes[classId]) {
      fullData.classes[classId].studentCount = newStudents.length;
    }
    this.store.save(fullData);

    window.appState.showToast(`🎉 成功為 ${classId} 班匯入 ${newStudents.length} 位學生名單！`, 'success');
    window.appState.closeModal();
    this.render('roster-manager-view');
    if (window.matrixView) window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
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

    modalContent.innerHTML = `
      <div class="p-6">
        <h3 class="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
          ➕ 新增授課班級
          <span class="kitty-bow"></span>
        </h3>

        <form onsubmit="rosterManager.saveNewClass(event)" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">班級代碼 (如 804)</label>
              <input type="text" id="new-class-id" required placeholder="804" class="w-full border border-pink-300 rounded-xl px-3 py-2 text-sm font-bold bg-white">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">班級全名 (如 八年四班)</label>
              <input type="text" id="new-class-name" required placeholder="八年四班" class="w-full border border-pink-300 rounded-xl px-3 py-2 text-sm font-bold bg-white">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">班級性質</label>
            <select id="new-class-type" class="w-full border border-pink-300 rounded-xl px-3 py-2 text-sm font-bold bg-white">
              <option value="subject">數學科任班</option>
              <option value="homeroom">導師班 (本班)</option>
            </select>
          </div>

          <div class="flex items-center justify-end space-x-3 pt-3">
            <button type="button" onclick="window.appState.closeModal()" class="px-4 py-2 text-xs font-bold text-slate-600">取消</button>
            <button type="submit" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-black text-xs shadow-md">建立班級</button>
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
    this.store.save(fullData);

    this.currentClassId = id;
    window.appState.showToast(`已成功建立 ${name}！請接著匯入學生名單`, 'success');
    window.appState.closeModal();
    window.appState.renderClassDropdown();
    this.render('roster-manager-view');
  }

  openEditClassModal(classId) {
    const cls = this.store.getClass(classId);
    if (!cls) return;

    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="p-6">
        <h3 class="text-xl font-black text-slate-900 mb-4">修改班級名稱與性質 (${classId} 班)</h3>
        <form onsubmit="rosterManager.saveEditClass(event, '${classId}')" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">班級名稱</label>
            <input type="text" id="edit-class-name" value="${cls.name}" required class="w-full border border-pink-300 rounded-xl px-3 py-2 text-sm font-bold bg-white">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">班級性質</label>
            <select id="edit-class-type" class="w-full border border-pink-300 rounded-xl px-3 py-2 text-sm font-bold bg-white">
              <option value="subject" ${cls.type === 'subject' ? 'selected' : ''}>數學科任班</option>
              <option value="homeroom" ${cls.type === 'homeroom' ? 'selected' : ''}>導師班 (本班)</option>
            </select>
          </div>
          <div class="flex items-center justify-end space-x-3 pt-3">
            <button type="button" onclick="window.appState.closeModal()" class="px-4 py-2 text-xs font-bold text-slate-600">取消</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-black text-xs">儲存修改</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
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

    if (confirm(`⚠️ 確定要刪除 ${classId} 班及其所有學生名單與記點記錄嗎？`)) {
      const fullData = this.store.data;
      delete fullData.classes[classId];
      delete fullData.students[classId];
      this.store.save(fullData);

      const remainClasses = Object.values(fullData.classes);
      this.currentClassId = remainClasses[0].id;
      window.appState.currentClassId = this.currentClassId;
      window.appState.showToast(`已刪除 ${classId} 班`, 'info');
      window.appState.renderClassDropdown();
      this.render('roster-manager-view');
      if (window.matrixView) window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
    }
  }
}

// Global Roster Manager Instance
window.rosterManager = new RosterManager(window.appStore);

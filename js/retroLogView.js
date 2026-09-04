/**
 * Dedicated Post-Class Retro-Logging & Recall Center (⏰ 課堂事後快速補記專區)
 * Standalone primary module allowing teachers to batch record classroom events,
 * adjust points, apply smart parent comments, and view recent retro history.
 */

class RetroLogView {
  constructor(store) {
    this.store = store;
    this.currentClassId = '801';
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.selectedPeriod = 1;
    this.selectedSeats = new Set();
    this.selectedTagId = null;
    this.customDelta = 1;
    this.customNote = '';
  }

  render(containerId, classId = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (classId) {
      this.currentClassId = classId;
    } else if (window.appState?.currentClassId) {
      this.currentClassId = window.appState.currentClassId;
    }
    const classes = this.store.getClasses();
    const currentClass = this.store.getClass(this.currentClassId) || Object.values(classes)[0];
    if (currentClass) this.currentClassId = currentClass.id;

    const students = this.store.getStudents(this.currentClassId);
    const tags = this.store.getTagsSortedByClassFrequency(this.currentClassId);
    if (!this.selectedTagId && tags.length > 0) {
      this.selectedTagId = tags[0].id;
      this.customDelta = tags[0].delta;
    }

    const selectedTag = tags.find(t => t.id === this.selectedTagId) || tags[0] || { name: '課堂記點', delta: 1, category: 'discipline' };

    // Get recent retro events for this class
    const allEvents = this.store.getEvents(this.currentClassId);
    const retroEvents = allEvents.filter(e => e.note && e.note.includes('[事後補記]')).slice(0, 15);

    container.innerHTML = `
      <div class="space-y-6 animate-fade-in-up">
        
        <!-- Header Banner -->
        <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 shadow-sm bg-gradient-to-r from-amber-50/80 via-white to-pink-50/80">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center space-x-3">
              <div class="sanrio-twinstars-badge !w-12 !h-12"></div>
              <div>
                <h2 class="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                  ⏰ 課堂事後快速補記專區
                  <span class="kitty-bow"></span>
                </h2>
                <p class="text-xs sm:text-sm text-slate-600 font-medium">
                  上課不方便掏手機？下課回辦公室 1 秒批次勾選學生補記，自動生成親師聯絡簿評語！
                </p>
              </div>
            </div>

            <!-- Class & Time Controls -->
            <div class="flex flex-wrap items-center gap-2">
              <div class="flex items-center space-x-1 border border-amber-300 rounded-xl px-2.5 py-1.5 bg-white shadow-sm">
                <span class="text-xs font-bold text-slate-600">班級：</span>
                <select id="retro-class-select" onchange="retroLogView.switchClass(this.value)" class="text-xs font-black bg-transparent focus:outline-none text-pink-900 cursor-pointer">
                  ${Object.values(classes).map(c => `
                    <option value="${c.id}" ${this.currentClassId === c.id ? 'selected' : ''}>
                      ${c.name} (${c.type === 'homeroom' ? '導師班' : '科任班'})
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="flex items-center space-x-1 border border-pink-200 rounded-xl px-2.5 py-1.5 bg-white shadow-sm">
                <span class="text-xs font-bold text-slate-600">日期：</span>
                <input type="date" value="${this.selectedDate}" onchange="retroLogView.setDate(this.value)" class="text-xs font-black bg-transparent focus:outline-none text-slate-800 cursor-pointer">
              </div>

              <div class="flex items-center space-x-1 border border-pink-200 rounded-xl px-2.5 py-1.5 bg-white shadow-sm">
                <span class="text-xs font-bold text-slate-600">節次：</span>
                <select onchange="retroLogView.setPeriod(this.value)" class="text-xs font-black bg-transparent focus:outline-none text-slate-800 cursor-pointer">
                  <option value="0" ${this.selectedPeriod === 0 ? 'selected' : ''}>早自習</option>
                  <option value="1" ${this.selectedPeriod === 1 ? 'selected' : ''}>第 1 節</option>
                  <option value="2" ${this.selectedPeriod === 2 ? 'selected' : ''}>第 2 節</option>
                  <option value="3" ${this.selectedPeriod === 3 ? 'selected' : ''}>第 3 節</option>
                  <option value="4" ${this.selectedPeriod === 4 ? 'selected' : ''}>第 4 節</option>
                  <option value="5" ${this.selectedPeriod === 5 ? 'selected' : ''}>午休/午餐</option>
                  <option value="6" ${this.selectedPeriod === 6 ? 'selected' : ''}>第 5 節</option>
                  <option value="7" ${this.selectedPeriod === 7 ? 'selected' : ''}>第 6 節</option>
                  <option value="8" ${this.selectedPeriod === 8 ? 'selected' : ''}>第 7 節</option>
                  <option value="9" ${this.selectedPeriod === 9 ? 'selected' : ''}>第 8 節/課後</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Main 2-Column Workspace Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

          <!-- Left Column: Student Selection Matrix (7 Cols) -->
          <div class="lg:col-span-7 space-y-4">
            <div class="glass-card rounded-3xl p-5 border border-pink-200 bg-white shadow-sm">
              <div class="flex flex-wrap items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-pink-100">
                <div class="flex items-center space-x-2">
                  <span class="text-xs sm:text-sm font-black text-slate-900">👥 選取補記學生</span>
                  <span class="text-xs font-black px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-300">
                    已選取 ${this.selectedSeats.size} 人
                  </span>
                </div>

                <!-- Quick Selection Filters -->
                <div class="flex flex-wrap items-center gap-1.5">
                  <button onclick="retroLogView.selectAll()" class="px-2 py-1 rounded-lg bg-pink-50 text-pink-700 hover:bg-pink-100 text-[11px] font-black transition border border-pink-200">
                    全選
                  </button>
                  <button onclick="retroLogView.selectNone()" class="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-[11px] font-black transition border border-slate-300">
                    清除
                  </button>
                  <button onclick="retroLogView.selectGender('M')" class="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-black transition border border-blue-200" title="選取全體男生 (依名冊性別設定)">
                    👦 男生
                  </button>
                  <button onclick="retroLogView.selectGender('F')" class="px-2 py-1 rounded-lg bg-pink-50 text-pink-700 hover:bg-pink-100 text-[11px] font-black transition border border-pink-200" title="選取全體女生 (依名冊性別設定)">
                    👧 女生
                  </button>
                  <button id="retro-odd-btn" onclick="retroLogView.selectOdd()" class="px-2 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-[11px] font-black transition border border-sky-200" title="選取座號為單數的學生">
                    單號
                  </button>
                  <button onclick="retroLogView.selectEven()" class="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-black transition border border-slate-300" title="選取座號為雙數的學生">
                    雙號
                  </button>
                </div>
              </div>

              <!-- Student Cards Grid (5 Columns) -->
              <div class="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-[360px] overflow-y-auto pr-1">
                ${students.map(s => {
                  const isSelected = this.selectedSeats.has(s.seatNo);
                  return `
                    <div id="retro-student-${s.seatNo}" onclick="retroLogView.toggleSeat(${s.seatNo})" 
                      class="cursor-pointer p-2.5 rounded-2xl border transition-all text-center select-none active:scale-95 ${
                        isSelected 
                          ? 'bg-pink-500 text-white border-pink-600 shadow-md transform scale-[1.02] font-black' 
                          : 'bg-white hover:bg-pink-50/60 border-pink-200 text-slate-800 font-bold'
                      }">
                      <div class="text-[11px] opacity-80 font-mono">${String(s.seatNo).padStart(2, '0')} 號</div>
                      <div class="text-xs truncate font-black mt-0.5">${s.name}</div>
                      <div class="text-[10px] mt-1 font-mono ${isSelected ? 'text-pink-100' : 'text-slate-500'}">
                        ${s.points !== undefined ? (s.points > 0 ? '+' + s.points : s.points) : '0'} 分
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Right Column: Tag & Comment Generator (5 Cols) -->
          <div class="lg:col-span-5 space-y-4">
            <div class="glass-card rounded-3xl p-5 border border-pink-200 bg-white shadow-sm space-y-4">
              
              <!-- 1. Select Tag -->
              <div>
                <label class="block text-xs font-black text-slate-800 mb-1.5 flex items-center justify-between">
                  <span>🏷️ 選擇課堂記點標籤</span>
                  <span class="text-[11px] font-bold ${this.customDelta > 0 ? 'text-emerald-600' : this.customDelta < 0 ? 'text-rose-600' : 'text-slate-500'}">
                    分值：${this.customDelta > 0 ? '+' : ''}${this.customDelta} 分
                  </span>
                </label>
                <div class="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                  ${tags.map(t => `
                    <button type="button" onclick="retroLogView.selectTag('${t.id}')" 
                      class="p-2 rounded-xl text-left border text-xs font-black transition flex items-center justify-between ${
                        this.selectedTagId === t.id 
                          ? 'bg-pink-100 text-pink-900 border-pink-400 shadow-sm' 
                          : 'bg-slate-50 hover:bg-pink-50 text-slate-700 border-slate-200'
                      }">
                      <span class="truncate">${t.name}</span>
                      <span class="text-[10px] px-1.5 py-0.2 rounded-md ${t.delta > 0 ? 'bg-emerald-100 text-emerald-800' : t.delta < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'}">
                        ${t.delta > 0 ? '+' : ''}${t.delta}
                      </span>
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- 2. Point Adjustment Slider -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs font-black text-slate-700">⚡ 調整給分：</label>
                  <div class="flex items-center gap-1">
                    <button type="button" onclick="retroLogView.adjustDelta(-1)" class="w-6 h-6 rounded-lg bg-rose-100 text-rose-800 font-black text-xs hover:bg-rose-200">-</button>
                    <span class="font-mono font-black text-xs px-2 py-0.5 rounded-lg border ${this.customDelta > 0 ? 'color-rule-pos-badge' : this.customDelta < 0 ? 'color-rule-neg-badge' : 'color-rule-zero-badge'}">
                      ${this.customDelta > 0 ? '+' : ''}${this.customDelta}
                    </span>
                    <button type="button" onclick="retroLogView.adjustDelta(1)" class="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs hover:bg-emerald-200">+</button>
                  </div>
                </div>
              </div>

              <!-- 3. Smart Memo & Comment Generator -->
              <div>
                <label class="block text-xs font-black text-slate-800 mb-1.5">💬 事後備忘 / 聯絡簿評語</label>
                <textarea id="retro-memo-input" rows="3" oninput="retroLogView.customNote = this.value" placeholder="請輸入或點擊下方快速評語..." 
                  class="w-full border-2 border-pink-200 rounded-2xl p-2.5 text-xs font-bold focus:outline-none focus:border-pink-500 bg-white font-sans">${this.customNote}</textarea>

                <!-- Quick Templates -->
                <div class="flex flex-wrap gap-1 mt-1.5">
                  <button id="retro-first-tpl-btn" type="button" onclick="retroLogView.applyTemplate('今日上課主動上台解題，思維清晰')" class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition">
                    + 主動解題
                  </button>
                  <button type="button" onclick="retroLogView.applyTemplate('課堂學習專注，認真筆記')" class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition">
                    + 專注認真
                  </button>
                  <button type="button" onclick="retroLogView.applyTemplate('課堂稍有分心，經提醒已迅速跟上')" class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition">
                    • 分心已改善
                  </button>
                  <button type="button" onclick="retroLogView.applyTemplate('未帶作業/學用品，已指導補齊')" class="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition">
                    - 缺學用品
                  </button>
                </div>
              </div>

              <!-- 4. 1-Click Batch Submit Button -->
              <button id="retro-submit-btn" onclick="retroLogView.submitBatch()" 
                class="w-full py-3.5 rounded-2xl font-black text-white bg-gradient-to-r from-amber-500 via-pink-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 shadow-lg shadow-pink-500/25 transition text-sm flex items-center justify-center gap-2 active:scale-95">
                <span class="kitty-bow !w-4 !h-4"></span>
                <span>✨ 立即 1 鍵批次補記 (${this.selectedSeats.size} 位學生)</span>
              </button>

            </div>
          </div>

        </div>

        <!-- Section 2: Recent Retro Logs Stream -->
        <div class="glass-card rounded-3xl p-5 border border-pink-200 bg-white shadow-sm">
          <div class="flex items-center justify-between mb-3.5 pb-2.5 border-b border-pink-100">
            <div class="flex items-center space-x-2">
              <i data-lucide="history" class="w-4 h-4 text-pink-600"></i>
              <h3 class="text-sm font-black text-slate-900">🕒 本班近期事後補記歷史記錄</h3>
            </div>
            <span class="text-xs font-bold text-slate-400">共 ${retroEvents.length} 筆記錄</span>
          </div>

          ${retroEvents.length === 0 ? `
            <div class="text-center py-8 text-slate-400 text-xs font-bold">
              <div class="kitty-cat-mini mx-auto mb-1.5"></div>
              尚無事後補記記錄，在上方勾選學生即可隨時補記！
            </div>
          ` : `
            <div class="divide-y divide-pink-100 max-h-[260px] overflow-y-auto">
              ${retroEvents.map(e => {
                const s = this.store.getStudent(e.classId, e.seatNo);
                return `
                  <div class="py-2.5 flex items-center justify-between text-xs hover:bg-pink-50/40 px-2 rounded-xl transition">
                    <div class="flex items-center space-x-3">
                      <span class="font-mono font-bold text-slate-500 text-[11px]">${e.date} (${e.period !== undefined ? '第' + e.period + '節' : ''})</span>
                      <span class="font-black text-slate-900">${String(e.seatNo).padStart(2, '0')} 號 ${s ? s.name : ''}</span>
                      <span class="font-bold text-slate-700">${e.tagName}</span>
                      <span class="text-slate-500 truncate max-w-[200px] hidden sm:inline">${e.note || ''}</span>
                    </div>

                    <div class="flex items-center space-x-2">
                      <span class="font-black px-2 py-0.5 rounded-lg border ${e.delta > 0 ? 'color-rule-pos-badge' : e.delta < 0 ? 'color-rule-neg-badge' : 'color-rule-zero-badge'}">
                        ${e.delta > 0 ? '+' : ''}${e.delta}
                      </span>
                      <button onclick="retroLogView.deleteRetroEvent('${e.id}')" class="text-slate-400 hover:text-rose-600 transition" title="刪除記錄">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  switchClass(classId) {
    this.currentClassId = classId;
    this.selectedSeats.clear();
    if (window.appState && window.appState.currentClassId !== classId) {
      window.appState.handleManualClassChange(classId);
    } else {
      this.render('retro-log-view');
    }
  }

  setDate(date) {
    this.selectedDate = date;
  }

  setPeriod(period) {
    this.selectedPeriod = parseInt(period, 10);
  }

  toggleSeat(seatNo) {
    if (this.selectedSeats.has(seatNo)) {
      this.selectedSeats.delete(seatNo);
    } else {
      this.selectedSeats.add(seatNo);
    }
    if (window.appState?.playPop) window.appState.playPop();
    this.render('retro-log-view');
  }

  selectAll() {
    const students = this.store.getStudents(this.currentClassId);
    students.forEach(s => this.selectedSeats.add(s.seatNo));
    if (window.appState?.playPop) window.appState.playPop();
    this.render('retro-log-view');
  }

  selectNone() {
    this.selectedSeats.clear();
    if (window.appState?.playPop) window.appState.playPop();
    this.render('retro-log-view');
  }

  selectGender(gender) {
    this.selectedSeats.clear();
    const students = this.store.getStudents(this.currentClassId);
    const total = students.length;
    students.forEach(s => {
      const studentGender = s.gender || (s.seatNo <= Math.ceil(total / 2) ? 'M' : 'F');
      if (studentGender === gender) {
        this.selectedSeats.add(s.seatNo);
      }
    });
    if (window.appState?.playPop) window.appState.playPop();
    this.render('retro-log-view');
  }

  selectOdd() {
    this.selectedSeats.clear();
    const students = this.store.getStudents(this.currentClassId);
    students.filter(s => s.seatNo % 2 !== 0).forEach(s => this.selectedSeats.add(s.seatNo));
    if (window.appState?.playPop) window.appState.playPop();
    this.render('retro-log-view');
  }

  selectEven() {
    this.selectedSeats.clear();
    const students = this.store.getStudents(this.currentClassId);
    students.filter(s => s.seatNo % 2 === 0).forEach(s => this.selectedSeats.add(s.seatNo));
    if (window.appState?.playPop) window.appState.playPop();
    this.render('retro-log-view');
  }

  selectTag(tagId) {
    this.selectedTagId = tagId;
    const tag = this.store.getTags().find(t => t.id === tagId);
    if (tag) {
      this.customDelta = tag.delta;
    }
    if (window.appState?.playPop) window.appState.playPop();
    this.render('retro-log-view');
  }

  adjustDelta(diff) {
    this.customDelta += diff;
    if (window.appState?.playPop) window.appState.playPop();
    this.render('retro-log-view');
  }

  applyTemplate(text) {
    this.customNote = text;
    const input = document.getElementById('retro-memo-input');
    if (input) input.value = text;
    if (window.appState?.playPop) window.appState.playPop();
  }

  submitBatch() {
    if (this.selectedSeats.size === 0) {
      window.appState.showToast('請至少選取 1 位學生進行補記！', 'warning');
      return;
    }

    const tag = this.store.getTags().find(t => t.id === this.selectedTagId) || {
      name: '課堂記點',
      category: 'discipline'
    };

    const seatsArray = Array.from(this.selectedSeats);
    seatsArray.forEach(seatNo => {
      this.store.addEvent({
        classId: this.currentClassId,
        seatNo,
        period: this.selectedPeriod,
        tagId: this.selectedTagId || 'custom_retro',
        tagName: tag.name,
        category: tag.category || 'discipline',
        delta: this.customDelta,
        severity: this.customDelta > 0 ? 'positive' : this.customDelta < 0 ? 'warning' : 'neutral',
        note: `[事後補記] ${this.customNote}`.trim(),
        date: this.selectedDate
      });
    });

    if (this.customDelta > 0 && window.appState?.playChime) {
      window.appState.playChime();
    } else if (this.customDelta < 0 && window.appState?.playWarning) {
      window.appState.playWarning();
    }

    window.appState.showToast(`🎉 成功為 ${seatsArray.length} 位學生完成事後補記 (${this.customDelta > 0 ? '+' : ''}${this.customDelta}分)！🎀`, 'success');

    // Reset selection
    this.selectedSeats.clear();
    this.customNote = '';
    this.render('retro-log-view');
  }

  deleteRetroEvent(eventId) {
    if (confirm('確定要刪除這筆事後補記記錄嗎？')) {
      this.store.deleteEvent(eventId);
      window.appState.showToast('已刪除記錄', 'info');
      this.render('retro-log-view');
    }
  }
}

// Global RetroLogView Instance
window.retroLogView = new RetroLogView(window.appStore);

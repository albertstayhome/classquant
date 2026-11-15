/**
 * Dedicated Post-Class Retro-Logging & Recall Center (⏰ 課堂事後快速補記)
 * - Intuitive 3-Step Flow: ① Time (Today/Yesterday + Auto Period) -> ② Students (Live Search & Quick Chips) -> ③ Curated Tags / Custom Reason & Score
 * - Supports both Sanrio Kitty & OAA Dark Themes, curates core/used tags to prevent tag overload
 */

class RetroLogView {
  constructor(store) {
    this.store = store;
    this.currentClassId = '801';
    this.selectedDate = window.getLocalDateStr ? window.getLocalDateStr() : new Date().toISOString().split('T')[0];
    this.selectedPeriod = null; // Lazy-synced with current timetable period on first render
    this.selectedSeats = new Set();
    this.selectedTagId = null;
    this.tagFilter = 'curated'; // 'curated' | 'pos' | 'neg' | 'all' | 'custom'
    this.studentFilterText = '';
    this.customDelta = 1;
    this.customNote = '';
    this.lastBatch = null;
  }

  formatPeriodLabel(period) {
    return window.cqFormatPeriodLabel ? window.cqFormatPeriodLabel(period) : (period !== undefined && period !== '' ? `第${period}節` : '');
  }

  _seatTileClass(isSelected, isOAA) {
    const base = 'retro-seat-tile cursor-pointer p-2.5 rounded-2xl border transition-all text-center select-none active:scale-95 min-w-0';
    if (isSelected) {
      return isOAA
        ? `${base} bg-gradient-to-br from-amber-600 to-rose-700 text-white border-amber-400 shadow-md scale-[1.02] font-black`
        : `${base} bg-pink-500 text-white border-pink-600 shadow-md scale-[1.02] font-black`;
    }
    return isOAA
      ? `${base} bg-[#180711] hover:bg-[#2a0d1d] border-amber-500/30 text-white font-bold`
      : `${base} bg-white hover:bg-pink-50/60 border-pink-200 text-slate-800 font-bold`;
  }

  _seatPtsClass(isSelected, pts, isOAA) {
    const base = 'retro-seat-pts text-[10px] mt-1 font-mono';
    if (isSelected) return `${base} ${isOAA ? 'text-amber-100' : 'text-pink-100'} font-bold`;
    if (pts > 0) return `${base} ${isOAA ? 'text-emerald-400' : 'text-emerald-700'} font-bold`;
    if (pts < 0) return `${base} ${isOAA ? 'text-rose-400' : 'text-rose-700'} font-bold`;
    return `${base} ${isOAA ? 'text-slate-400' : 'text-slate-500'}`;
  }

  _tagButtonClass(isActive, isOAA) {
    const base = 'p-2.5 rounded-xl text-left border text-xs font-black transition flex items-center justify-between gap-1.5 min-h-[40px] cursor-pointer';
    if (isActive) {
      return isOAA
        ? `${base} bg-amber-600/30 text-amber-100 border-amber-400 shadow-sm ring-1 ring-amber-400/60`
        : `${base} bg-pink-100 text-pink-900 border-pink-400 shadow-sm ring-1 ring-pink-300`;
    }
    return isOAA
      ? `${base} bg-[#180711] hover:bg-[#2a0d1d] text-slate-200 border-amber-500/30`
      : `${base} bg-slate-50 hover:bg-pink-50 text-slate-700 border-slate-200`;
  }

  _getVisibleTags(allTags) {
    if (this.tagFilter === 'custom') return [];
    if (this.tagFilter === 'pos') return allTags.filter(t => t.delta > 0);
    if (this.tagFilter === 'neg') return allTags.filter(t => t.delta < 0);
    if (this.tagFilter === 'all') return allTags;
    return window.cqGetCuratedTags ? window.cqGetCuratedTags(this.store, this.currentClassId, 6) : allTags.slice(0, 6);
  }

  render(containerId, classId = null) {
    this.lastContainerId = containerId || this.lastContainerId || 'retro-log-view';
    const container = document.getElementById(this.lastContainerId);
    if (!container) return;

    if (classId) {
      this.currentClassId = classId;
    } else if (window.appState?.currentClassId) {
      this.currentClassId = window.appState.currentClassId;
    }
    const classes = this.store.getClasses();
    const currentClass = this.store.getClass(this.currentClassId) || Object.values(classes)[0];
    if (currentClass) this.currentClassId = currentClass.id;

    if (this.selectedPeriod === null || this.selectedPeriod === undefined) {
      this.selectedPeriod = window.cqGetDefaultRetroPeriod ? window.cqGetDefaultRetroPeriod() : '1';
    }

    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';
    const students = this.store.getStudents(this.currentClassId);
    const allTags = this.store.getTagsSortedByClassFrequency(this.currentClassId);

    // Ensure selectedTagId stays valid when switching classes or deleting tags
    const isCustomMode = this.selectedTagId === '__custom__' || this.tagFilter === 'custom';
    if (!isCustomMode && allTags.length > 0) {
      const matched = allTags.find(t => t.id === this.selectedTagId);
      if (!matched) {
        this.selectedTagId = allTags[0].id;
        this.customDelta = allTags[0].delta;
      }
    }

    const visibleTags = this._getVisibleTags(allTags);
    const curatedCount = (window.cqGetCuratedTags ? window.cqGetCuratedTags(this.store, this.currentClassId, 6) : allTags.slice(0, 6)).length;

    const todayStr = window.getLocalDateStr ? window.getLocalDateStr() : new Date().toISOString().split('T')[0];
    const yestDt = new Date();
    yestDt.setDate(yestDt.getDate() - 1);
    const yesterdayStr = window.getLocalDateStr ? window.getLocalDateStr(yestDt) : todayStr;

    const allEvents = this.store.getEvents(this.currentClassId);
    const retroEvents = allEvents.filter(e => e.note && e.note.includes('[事後補記]')).slice(0, 15);

    const cardSurface = isOAA
      ? 'glass-card rounded-3xl p-4 sm:p-5 border border-amber-500/40 bg-[#220d19] text-white shadow-sm'
      : 'glass-card rounded-3xl p-4 sm:p-5 border border-pink-200 bg-white text-slate-900 shadow-sm';
    const inputCls = isOAA
      ? 'border border-amber-500/45 bg-[#12050c] text-white placeholder-slate-400 focus:border-amber-400 focus:outline-none'
      : 'border border-pink-200 bg-white text-slate-800 placeholder-slate-400 focus:border-pink-500 focus:outline-none';
    const quickFilterPillCls = (active) => {
      if (active) {
        return isOAA
          ? 'bg-gradient-to-r from-amber-600 to-rose-700 text-white border-amber-400 shadow-sm'
          : 'bg-pink-600 text-white border-pink-600 shadow-sm';
      }
      return isOAA
        ? 'bg-[#170610] text-amber-200/90 border-amber-500/35 hover:bg-[#2a0d1d]'
        : 'bg-pink-50 text-pink-800 border-pink-200 hover:bg-pink-100';
    };

    const selectedPreviewNames = Array.from(this.selectedSeats)
      .sort((a, b) => a - b)
      .slice(0, 5)
      .map(seatNo => {
        const stu = students.find(s => s.seatNo === seatNo);
        return stu ? `${String(seatNo).padStart(2, '0')} ${stu.name}` : `${seatNo}號`;
      }).join('、');

    container.innerHTML = `
      <div class="space-y-4 sm:space-y-5 animate-fade-in-up">

        <!-- Step 1: Compact Time & Class Bar -->
        <div class="${isOAA ? 'glass-card rounded-3xl p-3.5 sm:p-5 border border-amber-500/45 bg-gradient-to-r from-[#240e1b] via-[#2b1020] to-[#1b0813] text-white' : 'glass-card rounded-3xl p-3.5 sm:p-5 border border-pink-200 bg-gradient-to-r from-amber-50/80 via-white to-pink-50/80 text-slate-900'} shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 min-w-0">
              ${isOAA ? '<span class="text-xl sm:text-2xl p-2 rounded-2xl bg-black/40 border border-amber-500/40 shrink-0">⏰</span>' : '<div class="sanrio-twinstars-badge !w-10 !h-10 shrink-0"></div>'}
              <div class="min-w-0">
                <h2 class="text-base sm:text-xl font-black flex items-center gap-1.5 flex-wrap">
                  <span>⏰ 事後補記</span>
                  <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${isOAA ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-amber-100 text-amber-800'}">選時間 ➔ 點學生 ➔ 選理由/分數</span>
                </h2>
              </div>
            </div>

            <!-- Date Shortcuts, Date Picker, Period & Class Selector -->
            <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto">
              <div class="inline-flex items-center rounded-xl p-0.5 border ${isOAA ? 'bg-[#12050c] border-amber-500/40' : 'bg-white border-pink-200'}">
                <button type="button" onclick="retroLogView.setQuickDate('${todayStr}')" class="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${this.selectedDate === todayStr ? (isOAA ? 'bg-amber-600 text-white' : 'bg-pink-500 text-white') : (isOAA ? 'text-amber-200 hover:bg-rose-950' : 'text-slate-700 hover:bg-pink-50')}">今天</button>
                <button type="button" onclick="retroLogView.setQuickDate('${yesterdayStr}')" class="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer ${this.selectedDate === yesterdayStr ? (isOAA ? 'bg-amber-600 text-white' : 'bg-pink-500 text-white') : (isOAA ? 'text-amber-200 hover:bg-rose-950' : 'text-slate-700 hover:bg-pink-50')}">昨天</button>
              </div>

              <input type="date" id="retro-date-input" value="${this.selectedDate}" onchange="retroLogView.setDate(this.value)"
                class="min-h-[36px] rounded-xl px-2.5 py-1 text-xs font-black cursor-pointer ${inputCls}">

              <select id="retro-period-select" onchange="retroLogView.setPeriod(this.value)"
                class="min-h-[36px] rounded-xl px-2.5 py-1 text-xs font-black cursor-pointer ${inputCls}">
                ${window.cqBuildPeriodOptionsHtml ? window.cqBuildPeriodOptionsHtml(this.selectedPeriod) : ''}
              </select>

              <select id="retro-class-select" onchange="retroLogView.switchClass(this.value)"
                class="min-h-[36px] rounded-xl px-2.5 py-1 text-xs font-black cursor-pointer max-w-[180px] ${inputCls}">
                ${Object.values(classes).map(c => `
                  <option value="${c.id}" ${this.currentClassId === c.id ? 'selected' : ''}>
                    ${this.store.getClassQualifiedName ? this.store.getClassQualifiedName(c.id) : c.name}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Main 2-Column Workspace Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">

          <!-- Step 2: Left Column — Student Selection (7 Cols) -->
          <div class="lg:col-span-7">
            <div class="${cardSurface}">
              <div class="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b ${isOAA ? 'border-amber-500/25' : 'border-pink-100'}">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-xs sm:text-sm font-black">② 哪幾位學生？</span>
                  <span id="retro-selected-badge" class="text-xs font-black px-2.5 py-0.5 rounded-full whitespace-nowrap ${isOAA ? 'bg-rose-950 text-amber-300 border border-amber-500/50' : 'bg-pink-100 text-pink-700 border border-pink-300'}">
                    已選取 ${this.selectedSeats.size} 人
                  </span>
                </div>

                <!-- Live Quick Student Filter Input (Never breaks focus/IME) -->
                <div class="relative w-full sm:w-44">
                  <input type="text" id="retro-student-search" value="${this.studentFilterText}" oninput="retroLogView.filterStudentsLive(this.value)"
                    placeholder="🔍 輸座號或姓名快篩..."
                    class="w-full min-h-[34px] rounded-xl pl-3 pr-7 py-1 text-xs font-bold ${inputCls}">
                  <button type="button" id="retro-student-search-clear" onclick="retroLogView.filterStudentsLive('', true)"
                    class="${this.studentFilterText ? '' : 'hidden'} absolute right-2 top-1/2 -translate-y-1/2 text-xs font-black ${isOAA ? 'text-amber-300' : 'text-slate-400 hover:text-pink-600'} cursor-pointer" title="清除快篩">✕</button>
                </div>
              </div>

              <!-- Quick Selection Filters -->
              <div class="flex flex-wrap items-center gap-1.5 mb-3">
                <button type="button" onclick="retroLogView.selectAll()" class="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer whitespace-nowrap border ${isOAA ? 'bg-[#180711] text-amber-200 border-amber-500/35 hover:bg-[#2c0e1e]' : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border-pink-200'}">全選</button>
                <button type="button" onclick="retroLogView.selectNone()" class="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer whitespace-nowrap border ${isOAA ? 'bg-[#180711] text-slate-300 border-slate-600 hover:bg-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-300'}">清除</button>
                <button type="button" onclick="retroLogView.selectGender('M')" class="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer whitespace-nowrap border ${isOAA ? 'bg-blue-950/80 text-cyan-300 border-cyan-500/50 hover:bg-blue-900' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'}">👦 男生</button>
                <button type="button" onclick="retroLogView.selectGender('F')" class="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer whitespace-nowrap border ${isOAA ? 'bg-rose-950/80 text-pink-300 border-pink-500/50 hover:bg-rose-900' : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border-pink-200'}">👧 女生</button>
                <button type="button" id="retro-odd-btn" onclick="retroLogView.selectOdd()" class="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer whitespace-nowrap border ${isOAA ? 'bg-[#180711] text-sky-300 border-sky-500/40 hover:bg-[#2c0e1e]' : 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200'}">單號</button>
                <button type="button" onclick="retroLogView.selectEven()" class="min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer whitespace-nowrap border ${isOAA ? 'bg-[#180711] text-slate-300 border-slate-600 hover:bg-slate-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'}">雙號</button>
              </div>

              <!-- Student Cards Grid (Unnested scroll on mobile, compact scrollable on md+) -->
              <div id="retro-student-grid" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 md:max-h-[410px] md:overflow-y-auto md:pr-1">
                ${students.map(s => {
                  const isSelected = this.selectedSeats.has(s.seatNo);
                  const pts = allEvents
                    .filter(e => e.seatNo === s.seatNo && e.category !== 'academic' && e.category !== 'assessment')
                    .reduce((sum, e) => sum + (Number(e.delta) || 0), 0);
                  const searchKey = `${s.seatNo} ${String(s.seatNo).padStart(2, '0')} ${s.name}`.toLowerCase();
                  const hideTile = this.studentFilterText && !searchKey.includes(this.studentFilterText.trim().toLowerCase());
                  return `
                    <div id="retro-student-${s.seatNo}" data-pts="${pts}" data-search="${searchKey}" onclick="retroLogView.toggleSeat(${s.seatNo})"
                      style="${hideTile ? 'display:none' : ''}"
                      class="${this._seatTileClass(isSelected, isOAA)}">
                      <div class="text-[11px] opacity-80 font-mono">${String(s.seatNo).padStart(2, '0')} 號</div>
                      <div class="text-xs truncate font-black mt-0.5">${s.name}</div>
                      <div class="${this._seatPtsClass(isSelected, pts, isOAA)}">
                        ${pts > 0 ? '+' + pts : pts} 分
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Step 3: Right Column — Curated Reasons / Custom & Score (5 Cols) -->
          <div class="lg:col-span-5">
            <div class="${cardSurface} space-y-4">

              <!-- Curated Polarity Tabs (No 20-tag clutter!) -->
              <div>
                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span class="text-xs sm:text-sm font-black">③ 做了什麼＆加減幾分？</span>
                  <span id="retro-delta-header" class="text-xs font-black font-mono ${this.customDelta > 0 ? (isOAA ? 'text-emerald-400' : 'text-emerald-600') : this.customDelta < 0 ? (isOAA ? 'text-rose-400' : 'text-rose-600') : 'text-slate-400'}">
                    分值：${this.customDelta > 0 ? '+' : ''}${this.customDelta} 分
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-1.5 mb-2.5">
                  <button type="button" onclick="retroLogView.setTagFilter('curated')" class="min-h-[32px] px-2.5 py-1 rounded-xl border text-[11px] font-black transition cursor-pointer ${quickFilterPillCls(this.tagFilter === 'curated')}">🌟 精選 (${curatedCount})</button>
                  <button type="button" onclick="retroLogView.setTagFilter('pos')" class="min-h-[32px] px-2.5 py-1 rounded-xl border text-[11px] font-black transition cursor-pointer ${quickFilterPillCls(this.tagFilter === 'pos')}">👍 加分</button>
                  <button type="button" onclick="retroLogView.setTagFilter('neg')" class="min-h-[32px] px-2.5 py-1 rounded-xl border text-[11px] font-black transition cursor-pointer ${quickFilterPillCls(this.tagFilter === 'neg')}">⚠️ 扣分</button>
                  <button type="button" onclick="retroLogView.setTagFilter('all')" class="min-h-[32px] px-2.5 py-1 rounded-xl border text-[11px] font-black transition cursor-pointer ${quickFilterPillCls(this.tagFilter === 'all')}">全部 (${allTags.length})</button>
                  <button type="button" onclick="retroLogView.setTagFilter('custom')" class="min-h-[32px] px-2.5 py-1 rounded-xl border text-[11px] font-black transition cursor-pointer ${quickFilterPillCls(this.tagFilter === 'custom')}">✏️ 自訂理由</button>
                </div>

                ${this.tagFilter === 'custom' ? `
                  <div class="p-3 rounded-2xl border text-xs font-bold ${isOAA ? 'bg-[#170610] border-amber-500/40 text-amber-200' : 'bg-pink-50 border-pink-200 text-pink-900'}">
                    💡 免選預設標籤：直接點下方加減分數按鈕，並在備忘欄輸入原因（或點快填範本）即可完成補記！
                  </div>
                ` : `
                  <div class="grid grid-cols-2 gap-2 ${this.tagFilter === 'all' ? 'max-h-[210px] overflow-y-auto pr-1' : ''}">
                    ${visibleTags.map(t => `
                      <button type="button" id="retro-tag-btn-${t.id}" onclick="retroLogView.selectTag('${t.id}')"
                        class="${this._tagButtonClass(this.selectedTagId === t.id, isOAA)}">
                        <span class="truncate">${t.name}</span>
                        <span class="text-[11px] px-1.5 py-0.5 rounded-md font-mono shrink-0 ${t.delta > 0 ? 'bg-emerald-100 text-emerald-800' : t.delta < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'}">
                          ${t.delta > 0 ? '+' : ''}${t.delta}
                        </span>
                      </button>
                    `).join('')}
                  </div>
                `}
              </div>

              <!-- Quick Point Adjustment Presets + Fine +/- -->
              <div class="p-3 rounded-2xl border ${isOAA ? 'bg-[#180711] border-amber-500/30' : 'bg-pink-50/50 border-pink-100'}">
                <div class="flex items-center justify-between gap-2 mb-2">
                  <span class="text-xs font-black">⚡ 加減分調整：</span>
                  <div class="flex items-center gap-1.5">
                    <button type="button" onclick="retroLogView.adjustDelta(-1)" class="min-w-[36px] min-h-[36px] rounded-xl font-black text-sm transition cursor-pointer ${isOAA ? 'bg-rose-950 text-rose-300 border border-rose-500/50 hover:bg-rose-900' : 'bg-rose-100 text-rose-800 hover:bg-rose-200'}">-</button>
                    <span id="retro-delta-badge" class="font-mono font-black text-sm px-3 py-1 rounded-xl border min-w-[48px] text-center ${this.customDelta > 0 ? 'color-rule-pos-badge' : this.customDelta < 0 ? 'color-rule-neg-badge' : 'color-rule-zero-badge'}">
                      ${this.customDelta > 0 ? '+' : ''}${this.customDelta}
                    </span>
                    <button type="button" onclick="retroLogView.adjustDelta(1)" class="min-w-[36px] min-h-[36px] rounded-xl font-black text-sm transition cursor-pointer ${isOAA ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-900' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}">+</button>
                  </div>
                </div>
                <div class="grid grid-cols-6 gap-1.5">
                  ${[-2, -1, 0, 1, 2, 3].map(val => `
                    <button type="button" onclick="retroLogView.setDelta(${val})"
                      class="min-h-[34px] rounded-lg text-xs font-mono font-black transition cursor-pointer border ${this.customDelta === val
                        ? (isOAA ? 'bg-amber-600 text-white border-amber-400' : 'bg-pink-600 text-white border-pink-600')
                        : (isOAA ? 'bg-[#240e1b] text-slate-200 border-amber-500/30 hover:bg-[#321325]' : 'bg-white text-slate-700 border-pink-200 hover:bg-pink-100')}">
                      ${val > 0 ? '+' + val : val}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Smart Memo & Comment Generator -->
              <div>
                <label class="block text-xs font-black mb-1.5">💬 事後備忘 / 聯絡簿評語${this.selectedTagId === '__custom__' ? '（可當作自訂項目名稱）' : '（選填）'}</label>
                <textarea id="retro-memo-input" rows="2" oninput="retroLogView.customNote = this.value" placeholder="輸入具體原因或點下方快填範本..."
                  class="w-full rounded-2xl p-2.5 text-xs font-bold font-sans ${inputCls}">${this.customNote}</textarea>

                <div class="flex flex-wrap gap-1.5 mt-2">
                  <button id="retro-first-tpl-btn" type="button" onclick="retroLogView.applyTemplate('今日上課主動上台解題，思維清晰')" class="min-h-[30px] text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${isOAA ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}">+ 主動解題</button>
                  <button type="button" onclick="retroLogView.applyTemplate('課堂學習專注，認真筆記')" class="min-h-[30px] text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${isOAA ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}">+ 專注認真</button>
                  <button type="button" onclick="retroLogView.applyTemplate('課堂稍有分心，經提醒已迅速跟上')" class="min-h-[30px] text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${isOAA ? 'bg-amber-950/70 text-amber-300 border-amber-500/40 hover:bg-amber-900' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}">• 分心改善</button>
                  <button type="button" onclick="retroLogView.applyTemplate('未帶作業/學用品，已指導補齊')" class="min-h-[30px] text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${isOAA ? 'bg-rose-950/70 text-rose-300 border-rose-500/40 hover:bg-rose-900' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'}">- 缺學用品</button>
                </div>
              </div>

              <!-- Selected Preview + 1-Click Batch Submit Button -->
              ${this.selectedSeats.size > 0 ? `
                <div id="retro-selected-preview" class="text-[11px] font-bold px-3 py-1.5 rounded-xl truncate ${isOAA ? 'bg-[#180711] text-amber-200 border border-amber-500/30' : 'bg-pink-50 text-pink-800 border border-pink-200'}">
                  對象：${selectedPreviewNames}${this.selectedSeats.size > 5 ? ` …等 ${this.selectedSeats.size} 人` : ''}
                </div>
              ` : '<div id="retro-selected-preview" class="hidden"></div>'}

              <button id="retro-submit-btn" onclick="retroLogView.submitBatch()"
                class="w-full min-h-[48px] py-3 rounded-2xl font-black text-white bg-gradient-to-r from-amber-500 via-pink-500 to-rose-600 hover:brightness-110 shadow-lg shadow-pink-500/25 transition text-sm flex items-center justify-center gap-2 active:scale-95 cursor-pointer">
                <span>✨</span>
                <span id="retro-submit-btn-text">立即 1 鍵批次補記 (${this.selectedSeats.size} 位學生)</span>
              </button>

            </div>
          </div>
        </div>

        <!-- Section 2: Recent Retro Logs Stream (Responsive + OAA Dark Support) -->
        <div class="${cardSurface}">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b ${isOAA ? 'border-amber-500/25' : 'border-pink-100'}">
            <div class="flex items-center gap-2">
              <i data-lucide="history" class="w-4 h-4 ${isOAA ? 'text-amber-400' : 'text-pink-600'}"></i>
              <h3 class="text-sm font-black">🕒 本班近期事後補記紀錄</h3>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              ${(this.lastBatch && this.lastBatch.classId === this.currentClassId && this.lastBatch.eventIds?.length > 0) ? `
                <button type="button" onclick="retroLogView.undoLastBatch()" class="min-h-[32px] px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer border ${isOAA ? 'bg-amber-600/30 hover:bg-amber-600/50 border-amber-400 text-amber-200' : 'bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-900'}">
                  ↩️ 復原剛才補記 (${this.lastBatch.eventIds.length} 人)
                </button>
              ` : ''}
              <span class="text-xs font-bold ${isOAA ? 'text-amber-300/70' : 'text-slate-400'}">共 ${retroEvents.length} 筆</span>
            </div>
          </div>

          ${retroEvents.length === 0 ? `
            <div class="text-center py-6 ${isOAA ? 'text-amber-200/70' : 'text-slate-400'} text-xs font-bold">
              尚無事後補記紀錄，在上方選學生並按下補記即可即時儲存！
            </div>
          ` : `
            <div class="divide-y ${isOAA ? 'divide-amber-500/20' : 'divide-pink-100'} md:max-h-[260px] md:overflow-y-auto">
              ${retroEvents.map(e => {
                const s = this.store.getStudent(e.classId, e.seatNo);
                return `
                  <div class="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs px-2 rounded-xl transition ${isOAA ? 'hover:bg-[#2a1020]' : 'hover:bg-pink-50/40'}">
                    <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0 flex-1">
                      <span class="font-mono font-bold text-[11px] whitespace-nowrap ${isOAA ? 'text-amber-300/80' : 'text-slate-500'}">${e.date} (${this.formatPeriodLabel(e.period)})</span>
                      <span class="font-black whitespace-nowrap ${isOAA ? 'text-white' : 'text-slate-900'}">${String(e.seatNo).padStart(2, '0')} 號 ${s ? s.name : ''}</span>
                      <span class="font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'}">${e.tagName}</span>
                      ${e.note ? `<span class="truncate max-w-[240px] ${isOAA ? 'text-slate-300' : 'text-slate-500'}">${e.note}</span>` : ''}
                    </div>

                    <div class="flex items-center gap-1.5 shrink-0 ml-auto">
                      <span class="font-black px-2 py-0.5 rounded-lg border whitespace-nowrap ${e.delta > 0 ? 'color-rule-pos-badge' : e.delta < 0 ? 'color-rule-neg-badge' : 'color-rule-zero-badge'}">
                        ${e.delta > 0 ? '+' : ''}${e.delta}
                      </span>
                      <button type="button" onclick="retroLogView.editRetroEvent('${e.id}')" class="min-h-[30px] px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer border ${isOAA ? 'bg-[#180711] hover:bg-rose-950 border-amber-500/40 text-amber-200' : 'bg-pink-50 hover:bg-pink-100 border-pink-200 text-pink-700'}" title="修改分數或備註">✏️ 修改</button>
                      <button type="button" onclick="retroLogView.deleteRetroEvent('${e.id}')" class="min-h-[30px] min-w-[30px] inline-flex items-center justify-center rounded-lg transition cursor-pointer ${isOAA ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/60' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}" title="刪除記錄">
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
    this.studentFilterText = '';
    const allTags = this.store.getTagsSortedByClassFrequency(classId);
    if (this.selectedTagId !== '__custom__' && allTags.length > 0 && !allTags.some(t => t.id === this.selectedTagId)) {
      this.selectedTagId = allTags[0].id;
      this.customDelta = allTags[0].delta;
    }
    if (window.appState && window.appState.currentClassId !== classId) {
      window.appState.handleManualClassChange(classId);
    } else {
      this.render(this.lastContainerId || 'retro-log-view');
    }
  }

  setQuickDate(dateStr) {
    this.selectedDate = dateStr;
    this.render(this.lastContainerId || 'retro-log-view');
  }

  setDate(date) {
    this.selectedDate = date;
  }

  setPeriod(period) {
    this.selectedPeriod = /^\d+$/.test(String(period)) ? parseInt(period, 10) : String(period);
  }

  setTagFilter(mode) {
    this.tagFilter = mode;
    if (mode === 'custom') {
      this.selectedTagId = '__custom__';
    } else {
      const tags = this.store.getTagsSortedByClassFrequency(this.currentClassId);
      const visible = this._getVisibleTags(tags);
      if (visible.length > 0 && !visible.some(t => t.id === this.selectedTagId)) {
        this.selectedTagId = visible[0].id;
        this.customDelta = visible[0].delta;
      }
    }
    if (window.appState?.playPop) window.appState.playPop();
    this.render(this.lastContainerId || 'retro-log-view');
    if (mode === 'custom') {
      const memo = document.getElementById('retro-memo-input');
      if (memo) memo.focus();
    }
  }

  // Filter student grid strictly in-place without rebuilding DOM (preserves focus & Chinese IME)
  filterStudentsLive(value, clearInput = false) {
    this.studentFilterText = value || '';
    if (clearInput) {
      const inp = document.getElementById('retro-student-search');
      if (inp) inp.value = '';
    }
    const q = this.studentFilterText.trim().toLowerCase();
    document.querySelectorAll('#retro-student-grid .retro-seat-tile').forEach(tile => {
      const hay = tile.getAttribute('data-search') || '';
      tile.style.display = (!q || hay.includes(q)) ? '' : 'none';
    });
    const clrBtn = document.getElementById('retro-student-search-clear');
    if (clrBtn) clrBtn.classList.toggle('hidden', !q);
  }

  updateSelectionUI() {
    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';
    const students = this.store.getStudents(this.currentClassId);
    students.forEach(s => {
      const el = document.getElementById(`retro-student-${s.seatNo}`);
      if (el) {
        const isSelected = this.selectedSeats.has(s.seatNo);
        const pts = Number(el.getAttribute('data-pts') || 0);
        const wasHidden = el.style.display === 'none';
        el.className = this._seatTileClass(isSelected, isOAA);
        if (wasHidden) el.style.display = 'none';
        const sub = el.querySelector('.retro-seat-pts');
        if (sub) sub.className = this._seatPtsClass(isSelected, pts, isOAA);
      }
    });

    const badge = document.getElementById('retro-selected-badge');
    if (badge) badge.innerText = `已選取 ${this.selectedSeats.size} 人`;

    const btnText = document.getElementById('retro-submit-btn-text');
    if (btnText) btnText.innerText = `立即 1 鍵批次補記 (${this.selectedSeats.size} 位學生)`;

    const preview = document.getElementById('retro-selected-preview');
    if (preview) {
      if (this.selectedSeats.size === 0) {
        preview.classList.add('hidden');
      } else {
        const names = Array.from(this.selectedSeats).sort((a, b) => a - b).slice(0, 5).map(seatNo => {
          const stu = students.find(s => s.seatNo === seatNo);
          return stu ? `${String(seatNo).padStart(2, '0')} ${stu.name}` : `${seatNo}號`;
        }).join('、');
        preview.className = `text-[11px] font-bold px-3 py-1.5 rounded-xl truncate ${isOAA ? 'bg-[#180711] text-amber-200 border border-amber-500/30' : 'bg-pink-50 text-pink-800 border border-pink-200'}`;
        preview.textContent = `對象：${names}${this.selectedSeats.size > 5 ? ` …等 ${this.selectedSeats.size} 人` : ''}`;
      }
    }
  }

  updateTagUI() {
    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';
    const tags = this.store.getTagsSortedByClassFrequency(this.currentClassId);
    tags.forEach(t => {
      const btn = document.getElementById(`retro-tag-btn-${t.id}`);
      if (btn) {
        btn.className = this._tagButtonClass(this.selectedTagId === t.id, isOAA);
      }
    });

    const deltaHeader = document.getElementById('retro-delta-header');
    if (deltaHeader) {
      deltaHeader.className = `text-xs font-black font-mono ${this.customDelta > 0 ? (isOAA ? 'text-emerald-400' : 'text-emerald-600') : this.customDelta < 0 ? (isOAA ? 'text-rose-400' : 'text-rose-600') : 'text-slate-400'}`;
      deltaHeader.innerText = `分值：${this.customDelta > 0 ? '+' : ''}${this.customDelta} 分`;
    }

    const deltaBadge = document.getElementById('retro-delta-badge');
    if (deltaBadge) {
      deltaBadge.className = `font-mono font-black text-sm px-3 py-1 rounded-xl border min-w-[48px] text-center ${this.customDelta > 0 ? 'color-rule-pos-badge' : this.customDelta < 0 ? 'color-rule-neg-badge' : 'color-rule-zero-badge'}`;
      deltaBadge.innerText = `${this.customDelta > 0 ? '+' : ''}${this.customDelta}`;
    }

    document.querySelectorAll('[onclick^="retroLogView.setDelta("]').forEach(btn => {
      const m = (btn.getAttribute('onclick') || '').match(/setDelta\((-?\d+)\)/);
      const val = m ? parseInt(m[1], 10) : null;
      if (val !== null) {
        btn.className = `min-h-[34px] rounded-lg text-xs font-mono font-black transition cursor-pointer border ${this.customDelta === val
          ? (isOAA ? 'bg-amber-600 text-white border-amber-400' : 'bg-pink-600 text-white border-pink-600')
          : (isOAA ? 'bg-[#240e1b] text-slate-200 border-amber-500/30 hover:bg-[#321325]' : 'bg-white text-slate-700 border-pink-200 hover:bg-pink-100')}`;
      }
    });
  }

  toggleSeat(seatNo) {
    if (this.selectedSeats.has(seatNo)) {
      this.selectedSeats.delete(seatNo);
    } else {
      this.selectedSeats.add(seatNo);
    }
    if (window.appState?.playPop) window.appState.playPop();
    this.updateSelectionUI();
  }

  selectAll() {
    const q = this.studentFilterText.trim().toLowerCase();
    const students = this.store.getStudents(this.currentClassId);
    students.forEach(s => {
      if (!q || `${s.seatNo} ${String(s.seatNo).padStart(2, '0')} ${s.name}`.toLowerCase().includes(q)) {
        this.selectedSeats.add(s.seatNo);
      }
    });
    if (window.appState?.playPop) window.appState.playPop();
    this.updateSelectionUI();
  }

  selectNone() {
    this.selectedSeats.clear();
    if (window.appState?.playPop) window.appState.playPop();
    this.updateSelectionUI();
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
    this.updateSelectionUI();
  }

  selectOdd() {
    this.selectedSeats.clear();
    const students = this.store.getStudents(this.currentClassId);
    students.filter(s => s.seatNo % 2 !== 0).forEach(s => this.selectedSeats.add(s.seatNo));
    if (window.appState?.playPop) window.appState.playPop();
    this.updateSelectionUI();
  }

  selectEven() {
    this.selectedSeats.clear();
    const students = this.store.getStudents(this.currentClassId);
    students.filter(s => s.seatNo % 2 === 0).forEach(s => this.selectedSeats.add(s.seatNo));
    if (window.appState?.playPop) window.appState.playPop();
    this.updateSelectionUI();
  }

  selectTag(tagId) {
    this.selectedTagId = tagId;
    const tag = this.store.getTags(this.currentClassId).find(t => t.id === tagId);
    if (tag) {
      this.customDelta = tag.delta;
    }
    if (window.appState?.playPop) window.appState.playPop();
    this.updateTagUI();
  }

  setDelta(val) {
    this.customDelta = Number(val) || 0;
    if (window.appState?.playPop) window.appState.playPop();
    this.updateTagUI();
  }

  adjustDelta(diff) {
    this.customDelta += diff;
    if (window.appState?.playPop) window.appState.playPop();
    this.updateTagUI();
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

    const memoText = this.customNote.trim();
    let tagName = '自訂事後補記';
    let category = 'discipline';
    let tagId = this.selectedTagId || 'custom_retro';

    if (this.selectedTagId === '__custom__') {
      tagId = 'custom_retro';
      tagName = memoText ? (memoText.length > 14 ? memoText.slice(0, 14) + '…' : memoText) : '自訂事後補記';
      category = this.customDelta >= 0 ? 'social' : 'discipline';
    } else {
      const tag = this.store.getTags(this.currentClassId).find(t => t.id === this.selectedTagId) || {
        name: '課堂記點',
        category: 'discipline'
      };
      tagName = tag.name;
      category = tag.category || 'discipline';
    }

    const seatsArray = Array.from(this.selectedSeats);
    const createdEventIds = [];
    seatsArray.forEach(seatNo => {
      const created = this.store.addEvent({
        classId: this.currentClassId,
        seatNo,
        period: this.selectedPeriod,
        tagId,
        tagName,
        category,
        delta: this.customDelta,
        severity: this.customDelta > 0 ? 'positive' : this.customDelta < 0 ? 'warning' : 'neutral',
        note: memoText ? `[事後補記] ${memoText}` : `[事後補記] ${tagName}`,
        date: this.selectedDate
      });
      if (created && created.id) createdEventIds.push(created.id);
    });

    if (createdEventIds.length > 0) {
      this.lastBatch = { classId: this.currentClassId, eventIds: createdEventIds, tagName, delta: this.customDelta };
    }

    if (this.customDelta > 0 && window.appState?.playChime) {
      window.appState.playChime();
    } else if (this.customDelta < 0 && window.appState?.playWarning) {
      window.appState.playWarning();
    }

    window.appState.showToast(`🎉 成功補記 ${seatsArray.length} 位同學（${this.formatPeriodLabel(this.selectedPeriod)}，${this.customDelta > 0 ? '+' : ''}${this.customDelta}分）`, 'success');

    // Reset selection & memo
    this.selectedSeats.clear();
    this.customNote = '';
    this.studentFilterText = '';
    this.render(this.lastContainerId || 'retro-log-view');
    if (window.eventsLogView && document.getElementById('events-log-view')) {
      window.eventsLogView.render('events-log-view');
    }
  }

  undoLastBatch() {
    if (!this.lastBatch || !this.lastBatch.eventIds?.length) return;
    const removed = this.store.deleteEventsBatch
      ? this.store.deleteEventsBatch(this.lastBatch.eventIds)
      : 0;
    const summary = `${this.lastBatch.tagName} (${this.lastBatch.delta > 0 ? '+' : ''}${this.lastBatch.delta})`;
    this.lastBatch = null;
    if (window.appState?.playPop) window.appState.playPop();
    window.appState?.showToast(`↩️ 已復原剛才事後補記「${summary}」（撤回 ${removed} 筆）`, 'info');
    this.render(this.lastContainerId || 'retro-log-view');
  }

  editRetroEvent(eventId) {
    if (!eventId || !window.appState?.openEditEventModal) return;
    window.appState.openEditEventModal(eventId, () => {
      this.render(this.lastContainerId || 'retro-log-view');
    });
  }

  deleteRetroEvent(eventId) {
    if (confirm('確定要刪除這筆事後補記記錄嗎？')) {
      this.store.deleteEvent(eventId);
      window.appState.showToast('已刪除記錄', 'info');
      this.render(this.lastContainerId || 'retro-log-view');
    }
  }
}

// Global RetroLogView Instance
window.retroLogView = new RetroLogView(window.appStore);

/**
 * Events Stream, Timeline & Comprehensive Incident Search/Log Hub
 * - Smart Multi-Token Keyword Search (preserves input focus & Chinese IME composition; searches student/seat/class/tag/note/date/period/score)
 * - Clean Minimal Filter Strip (All / Retro / Positive / Negative) + Collapsible Advanced Filters
 * - Full OAA Dark & Sanrio Kitty Themes, Multi-View (Timeline / Table / Cross-Student)
 */

class EventsLogView {
  constructor(store) {
    this.store = store;
    this.currentViewMode = 'timeline'; // 'timeline' | 'table' | 'cross'
    this.filterClass = 'all';
    this.filterCategory = 'all';
    this.filterSeverity = 'all';
    this.filterSeat = 'all';
    this.onlyRetro = false;
    this.searchQuery = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.showAdvancedFilters = false;
    this.crossClassId = null;
    this.crossSelectedSeats = new Set();
    this.crossSearchText = '';
    this.lastInitialClassId = null;
    this._isComposing = false;
  }

  _formatPeriod(p) {
    return window.cqFormatPeriodLabel ? window.cqFormatPeriodLabel(p) : (p !== undefined && p !== '' ? `第${p}節` : '未定');
  }

  _resolveFallbackClassId() {
    const classes = this.store.getClasses() || {};
    if (this.filterClass !== 'all' && classes[this.filterClass]) return this.filterClass;
    if (window.appState?.currentClassId && classes[window.appState.currentClassId]) return window.appState.currentClassId;
    const keys = Object.keys(classes);
    return keys[0] || '801';
  }

  switchViewMode(mode) {
    this.currentViewMode = mode;
    if (mode === 'cross') {
      const classes = this.store.getClasses() || {};
      if (this.filterClass !== 'all' && classes[this.filterClass]) {
        this.crossClassId = this.filterClass;
      } else if (!this.crossClassId || !classes[this.crossClassId]) {
        this.crossClassId = this._resolveFallbackClassId();
      }
    }
    this.render('events-log-view');
  }

  toggleAdvancedFilters() {
    this.showAdvancedFilters = !this.showAdvancedFilters;
    this.render('events-log-view');
  }

  quickFilter(type) {
    const now = new Date();
    const targetDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = window.getLocalDateStr ? window.getLocalDateStr(targetDate) : targetDate.toISOString().split('T')[0];

    if (type === 'retro') {
      // Toggle cleanly without overwriting keyword search
      this.onlyRetro = !this.onlyRetro;
    } else if (type === 'pos') {
      this.filterSeverity = this.filterSeverity === 'positive' ? 'all' : 'positive';
    } else if (type === 'neg') {
      this.filterSeverity = this.filterSeverity === 'warning' ? 'all' : 'warning';
    } else if (type === 'recent_neg') {
      this.dateFrom = sevenDaysAgo;
      this.dateTo = '';
      this.filterSeverity = 'warning';
      this.filterCategory = 'all';
      this.onlyRetro = false;
    } else if (type === 'recent_pos') {
      this.dateFrom = sevenDaysAgo;
      this.dateTo = '';
      this.filterSeverity = 'positive';
      this.filterCategory = 'all';
      this.onlyRetro = false;
    } else if (type === 'conflict') {
      this.dateFrom = '';
      this.dateTo = '';
      this.filterSeverity = 'all';
      this.filterCategory = 'conflict';
      this.onlyRetro = false;
    } else if (type === 'reset') {
      this.dateFrom = '';
      this.dateTo = '';
      this.filterSeverity = 'all';
      this.filterCategory = 'all';
      this.onlyRetro = false;
      this.filterSeat = 'all';
      this.searchQuery = '';
      this.crossSearchText = '';
      this.crossSelectedSeats.clear();
    }

    this.render('events-log-view');
  }

  setCrossClass(classId) {
    if (this.crossClassId !== classId) {
      this.crossClassId = classId;
      this.crossSelectedSeats.clear();
      this.crossSearchText = '';
    }
    this.render('events-log-view');
  }

  toggleCrossSeat(seatNo) {
    if (this.crossSelectedSeats.has(seatNo)) {
      this.crossSelectedSeats.delete(seatNo);
    } else {
      this.crossSelectedSeats.add(seatNo);
    }
    this.render('events-log-view');
  }

  clearCrossSeats() {
    this.crossSelectedSeats.clear();
    this.render('events-log-view');
  }

  filterCrossStudentsLive(value) {
    this.crossSearchText = value || '';
    const q = this.crossSearchText.trim().toLowerCase();
    document.querySelectorAll('#events-cross-chips .events-cross-chip').forEach(btn => {
      const hay = btn.getAttribute('data-search') || '';
      btn.style.display = (!q || hay.includes(q)) ? '' : 'none';
    });
  }

  getFilteredEvents() {
    let events = this.store.getEvents();

    // Standard Filters
    if (this.filterClass !== 'all') {
      events = events.filter(e => e.classId === this.filterClass);
    }
    if (this.filterSeat !== 'all') {
      events = events.filter(e => e.seatNo === parseInt(this.filterSeat, 10));
    }
    if (this.filterCategory !== 'all') {
      events = events.filter(e => e.category === this.filterCategory);
    }
    if (this.onlyRetro) {
      events = events.filter(e => (e.note || '').includes('事後補記'));
    }
    if (this.filterSeverity !== 'all') {
      if (this.filterSeverity === 'warning') {
        events = events.filter(e => e.severity === 'warning' || e.severity === 'danger' || e.severity === 'critical' || (Number(e.delta) < 0));
      } else if (this.filterSeverity === 'positive') {
        events = events.filter(e => e.severity === 'positive' || (Number(e.delta) > 0));
      } else {
        events = events.filter(e => e.severity === this.filterSeverity);
      }
    }
    if (this.dateFrom) {
      events = events.filter(e => String(e.date || '') >= this.dateFrom);
    }
    if (this.dateTo) {
      events = events.filter(e => String(e.date || '') <= this.dateTo);
    }

    // Smart Multi-Token Keyword Matching
    const trimmedQ = (this.searchQuery || '').trim().toLowerCase();
    if (trimmedQ) {
      const tokens = trimmedQ.split(/\s+/).filter(Boolean);
      events = events.filter(e => {
        const student = this.store.getStudent(e.classId, e.seatNo);
        const clsInfo = this.store.getClass(e.classId);
        const qualifiedCls = this.store.getClassQualifiedName ? this.store.getClassQualifiedName(e.classId) : (clsInfo?.name || e.classId);
        const seatStr = String(e.seatNo);
        const seatPad = seatStr.padStart(2, '0');
        const periodLabel = this._formatPeriod(e.period);
        const deltaNum = Number(e.delta || 0);
        const deltaStr = deltaNum > 0 ? `+${deltaNum}` : String(deltaNum);
        const polarityKw = deltaNum > 0 ? '加分 正向' : deltaNum < 0 ? '扣分 違紀' : '歸零 備忘';
        const retroKw = (e.note || '').includes('事後補記') ? '補記 事後補記' : '';

        const haystack = [
          student ? student.name : '',
          seatStr,
          seatPad,
          `${seatStr}號`,
          `${seatPad}號`,
          qualifiedCls,
          clsInfo ? clsInfo.name : '',
          e.classId || '',
          e.tagName || '',
          e.note || '',
          e.date || '',
          periodLabel,
          periodLabel.replace(/\s+/g, ''),
          deltaStr,
          polarityKw,
          retroKw
        ].join(' ').toLowerCase();

        return tokens.every(tok => haystack.includes(tok));
      });
    }

    // Sort Chronologically (Newest first)
    const periodOrder = { '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, 'lunch': 4.5, '5': 5, '6': 6, '7': 7, 'clean': 7.5, '8': 8, 'after': 9 };
    const getPeriodRank = (p) => {
      const k = String(p ?? '');
      if (Object.prototype.hasOwnProperty.call(periodOrder, k)) return periodOrder[k];
      const n = Number(p);
      return Number.isFinite(n) ? n : 0;
    };

    events.sort((a, b) => {
      const dateCompare = String(b.date || '2026-01-01').localeCompare(String(a.date || '2026-01-01'));
      if (dateCompare !== 0) return dateCompare;
      const periodDiff = getPeriodRank(b.period) - getPeriodRank(a.period);
      if (periodDiff !== 0) return periodDiff;
      return String(b.time || '').localeCompare(String(a.time || ''));
    });

    return events;
  }

  _countActiveAdvancedFilters() {
    let n = 0;
    if (this.filterClass !== 'all') n++;
    if (this.filterSeat !== 'all') n++;
    if (this.filterCategory !== 'all') n++;
    if (this.dateFrom) n++;
    if (this.dateTo) n++;
    return n;
  }

  render(containerId = 'events-log-view', initialClassId = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const classes = this.store.getClasses() || {};
    if (initialClassId && initialClassId !== this.lastInitialClassId) {
      this.filterClass = classes[initialClassId] ? initialClassId : 'all';
      this.filterSeat = 'all';
      this.crossClassId = classes[initialClassId] ? initialClassId : this._resolveFallbackClassId();
      this.crossSelectedSeats.clear();
      this.lastInitialClassId = initialClassId;
    }

    const events = this.getFilteredEvents();
    const students = this.filterClass !== 'all' ? this.store.getStudents(this.filterClass) : [];
    const isOAA = (window.appStore ? window.appStore.getTheme() : 'kitty') === 'oaa';
    const advCount = this._countActiveAdvancedFilters();
    const quickClassTarget = this._resolveFallbackClassId();

    const chipCls = (active) => {
      if (active) {
        return isOAA
          ? 'bg-gradient-to-r from-amber-600 to-rose-700 text-white border-amber-400 shadow-sm'
          : 'bg-pink-600 text-white border-pink-600 shadow-sm';
      }
      return isOAA
        ? 'bg-[#170610] text-amber-200/90 border-amber-500/35 hover:bg-[#2a0d1d]'
        : 'bg-white text-slate-700 border-pink-200 hover:bg-pink-50';
    };

    const advFieldCls = isOAA
      ? 'w-full border border-amber-500/45 rounded-xl px-2.5 py-2 text-xs sm:text-sm font-bold focus:outline-none bg-[#12050c] text-white'
      : 'w-full border border-pink-300 rounded-xl px-2.5 py-2 text-xs sm:text-sm font-bold focus:outline-none bg-white text-slate-800';

    container.innerHTML = `
      <div class="glass-card rounded-3xl p-4 sm:p-6 mb-5 ${isOAA ? 'border-2 border-amber-500/50 bg-[#240e1b]/95 text-white' : 'border border-pink-200 bg-white text-slate-900'} shadow-sm">
        <!-- Top Title & Action Buttons -->
        <div class="flex flex-wrap items-center justify-between gap-3 sm:gap-4 mb-4">
          <div class="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 min-w-0 w-full md:flex-1">
            ${isOAA ? `
              <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-rose-950 border-2 border-amber-400 shadow-md flex items-center justify-center text-lg sm:text-xl shrink-0 self-start sm:self-auto">
                🏛️
              </div>
            ` : `
              <div class="sanrio-twinstars-badge !w-10 !h-10 sm:!w-11 sm:!h-11 shrink-0 self-start sm:self-auto"></div>
            `}
            <div class="min-w-0 flex-1">
              <h2 class="text-lg sm:text-2xl font-black flex items-center gap-2 flex-wrap">
                <span>${isOAA ? '🔍 點記流水帳與事證檢索' : '🔍 點記流水帳檢索中心'}</span>
                ${isOAA ? '' : '<span class="kitty-bow shrink-0"></span>'}
              </h2>
              <p class="text-xs sm:text-sm ${isOAA ? 'text-amber-200/80' : 'text-slate-600'} font-medium mt-0.5">
                直接輸入姓名、座號、關鍵字或分數即時尋找任何一筆紀錄
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button type="button" onclick="eventsLogView.openAddEventModal('${quickClassTarget}')"
              class="min-h-[38px] px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 text-white text-xs sm:text-sm font-black shadow-md transition inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
              <i data-lucide="clock" class="w-4 h-4 shrink-0"></i> <span>⏰ 事後快速補記</span>
            </button>
            <button type="button" onclick="eventsLogView.exportFilteredSummary()" class="min-h-[38px] px-3.5 py-2 rounded-2xl ${isOAA ? 'bg-[#1b0a14] hover:bg-rose-950 text-amber-200 border border-amber-500/40' : 'bg-white hover:bg-pink-50 text-slate-800 border border-pink-300'} text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 whitespace-nowrap transition shadow-sm cursor-pointer">
              <i data-lucide="copy" class="w-4 h-4 shrink-0 ${isOAA ? 'text-amber-400' : 'text-pink-500'}"></i> <span>複製結果</span>
            </button>
          </div>
        </div>

        <!-- View Mode Switcher Tabs -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b ${isOAA ? 'border-amber-500/30' : 'border-pink-200'} pb-3 mb-4">
          <div class="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button type="button" onclick="eventsLogView.switchViewMode('timeline')" class="flex-auto sm:flex-none whitespace-nowrap px-3 sm:px-3.5 py-2 sm:py-1.5 min-h-[38px] rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1 cursor-pointer ${this.currentViewMode === 'timeline' ? (isOAA ? 'bg-gradient-to-r from-rose-900 to-rose-800 text-amber-200 border border-amber-400 shadow-sm' : 'bg-pink-600 text-white shadow-sm') : (isOAA ? 'bg-[#1b0a14] text-slate-200 hover:bg-rose-950 border border-amber-500/40' : 'bg-pink-50 text-pink-700 hover:bg-pink-100')}">
              <span>📅 日期時間軸</span>
            </button>
            <button type="button" onclick="eventsLogView.switchViewMode('table')" class="flex-auto sm:flex-none whitespace-nowrap px-3 sm:px-3.5 py-2 sm:py-1.5 min-h-[38px] rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1 cursor-pointer ${this.currentViewMode === 'table' ? (isOAA ? 'bg-gradient-to-r from-rose-900 to-rose-800 text-amber-200 border border-amber-400 shadow-sm' : 'bg-pink-600 text-white shadow-sm') : (isOAA ? 'bg-[#1b0a14] text-slate-200 hover:bg-rose-950 border border-amber-500/40' : 'bg-pink-50 text-pink-700 hover:bg-pink-100')}">
              <span>📋 完整列表</span>
            </button>
            <button type="button" onclick="eventsLogView.switchViewMode('cross')" class="flex-auto sm:flex-none whitespace-nowrap px-3 sm:px-3.5 py-2 sm:py-1.5 min-h-[38px] rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-1 cursor-pointer ${this.currentViewMode === 'cross' ? (isOAA ? 'bg-gradient-to-r from-rose-900 to-rose-800 text-amber-200 border border-amber-400 shadow-sm' : 'bg-pink-600 text-white shadow-sm') : (isOAA ? 'bg-[#1b0a14] text-slate-200 hover:bg-rose-950 border border-amber-500/40' : 'bg-pink-50 text-pink-700 hover:bg-pink-100')}">
              <span>👥 交叉查詢</span>
            </button>
          </div>
          <span id="events-count-badge" class="text-xs font-black px-2.5 py-1 rounded-full self-start sm:self-auto ${isOAA ? 'bg-rose-950 text-amber-300 border border-amber-500/40 font-mono' : 'bg-pink-50 text-pink-700 border border-pink-200'}">
            符合條件：共 ${events.length} 筆
          </span>
        </div>

        <!-- Primary Smart Search Input + Compact Quick Filter Strip -->
        <div class="space-y-3 mb-5">
          <div class="relative w-full">
            <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${isOAA ? 'text-amber-400' : 'text-pink-500'}"></i>
            <input id="events-keyword-input" type="text"
              value="${(this.searchQuery || '').replace(/"/g, '&quot;')}"
              placeholder="搜姓名、座號、關鍵字或 +2 / -1..."
              oncompositionstart="eventsLogView._isComposing = true"
              oncompositionend="eventsLogView._isComposing = false; eventsLogView.setSearch(this.value)"
              oninput="if (!eventsLogView._isComposing) eventsLogView.setSearch(this.value)"
              class="w-full min-h-[42px] rounded-2xl pl-10 pr-9 py-2 text-xs sm:text-sm font-bold transition focus:outline-none border-2 ${isOAA ? 'bg-[#14060e] border-amber-500/50 text-white placeholder-slate-400 focus:border-amber-400' : 'bg-white border-pink-300 text-slate-900 placeholder-slate-400 focus:border-pink-500'}">
            <button id="events-search-clear" type="button" onclick="eventsLogView.clearSearch()"
              class="${this.searchQuery ? '' : 'hidden'} absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-black cursor-pointer ${isOAA ? 'bg-rose-950 text-amber-300 hover:bg-rose-900' : 'bg-pink-100 text-pink-700 hover:bg-pink-200'}" title="清除關鍵字">✕</button>
          </div>

          <!-- Minimal Essential Quick Filter Pills (Only 4 actually useful modes + Reset) + Advanced Drawer Toggle -->
          <div class="flex flex-wrap items-center gap-1.5">
            <button type="button" onclick="eventsLogView.quickFilter('reset')" class="min-h-[34px] px-3 py-1 rounded-xl border text-xs font-black transition cursor-pointer ${chipCls(!this.onlyRetro && this.filterSeverity === 'all' && this.filterCategory === 'all')}">全部紀錄</button>
            <button type="button" onclick="eventsLogView.quickFilter('retro')" class="min-h-[34px] px-3 py-1 rounded-xl border text-xs font-black transition cursor-pointer ${chipCls(this.onlyRetro)}">⏰ 只看事後補記</button>
            <button type="button" onclick="eventsLogView.quickFilter('pos')" class="min-h-[34px] px-3 py-1 rounded-xl border text-xs font-black transition cursor-pointer ${chipCls(this.filterSeverity === 'positive')}">👍 加分紀錄</button>
            <button type="button" onclick="eventsLogView.quickFilter('neg')" class="min-h-[34px] px-3 py-1 rounded-xl border text-xs font-black transition cursor-pointer ${chipCls(this.filterSeverity === 'warning')}">⚠️ 扣分追蹤</button>
            <button type="button" onclick="eventsLogView.toggleAdvancedFilters()"
              class="sm:ml-auto min-h-[34px] px-3 py-1 rounded-xl border text-xs font-black transition inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${this.showAdvancedFilters || advCount > 0 ? (isOAA ? 'bg-[#2a0f1f] border-amber-400 text-amber-200' : 'bg-pink-50 border-pink-400 text-pink-800') : (isOAA ? 'bg-[#180711] border-amber-500/35 text-slate-200 hover:bg-[#2a0f1f]' : 'bg-white border-pink-200 text-slate-700 hover:bg-pink-50')}">
              <i data-lucide="sliders-horizontal" class="w-3.5 h-3.5 shrink-0"></i>
              <span>進階篩選</span>
              ${advCount > 0 ? `<span class="px-1.5 py-0.5 rounded-full text-[10px] font-mono ${isOAA ? 'bg-amber-500 text-black' : 'bg-pink-600 text-white'}">${advCount}</span>` : ''}
            </button>
          </div>

          <!-- Collapsible Advanced Filters (Hidden by default so results sit at top of phone screen) -->
          <div id="events-advanced-drawer" class="${this.showAdvancedFilters ? '' : 'hidden'} p-3.5 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 ${isOAA ? 'bg-[#170610] border-amber-500/35' : 'bg-pink-50/60 border-pink-200'}">
            <div>
              <label class="block text-[11px] font-bold mb-1 ${isOAA ? 'text-amber-200' : 'text-slate-700'}">班級篩選</label>
              <select onchange="eventsLogView.setFilter('filterClass', this.value)" class="${advFieldCls}">
                <option value="all" ${this.filterClass === 'all' ? 'selected' : ''}>所有班級</option>
                ${Object.values(classes).map(c => `
                  <option value="${c.id}" ${this.filterClass === c.id ? 'selected' : ''}>
                    ${this.store.getClassQualifiedName ? this.store.getClassQualifiedName(c.id) : c.name}
                  </option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-bold mb-1 ${isOAA ? 'text-amber-200' : 'text-slate-700'}">座號篩選</label>
              <select onchange="eventsLogView.setFilter('filterSeat', this.value)" class="${advFieldCls}">
                <option value="all" ${this.filterSeat === 'all' ? 'selected' : ''}>所有學生</option>
                ${students.map(s => `
                  <option value="${s.seatNo}" ${this.filterSeat === String(s.seatNo) ? 'selected' : ''}>
                    ${String(s.seatNo).padStart(2, '0')} 號 ${s.name}
                  </option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-bold mb-1 ${isOAA ? 'text-amber-200' : 'text-slate-700'}">行為類別</label>
              <select onchange="eventsLogView.setFilter('filterCategory', this.value)" class="${advFieldCls}">
                <option value="all" ${this.filterCategory === 'all' ? 'selected' : ''}>所有類別</option>
                <option value="academic" ${this.filterCategory === 'academic' ? 'selected' : ''}>課堂學習</option>
                <option value="discipline" ${this.filterCategory === 'discipline' ? 'selected' : ''}>生活常規</option>
                <option value="conflict" ${this.filterCategory === 'conflict' ? 'selected' : ''}>同儕衝突</option>
                <option value="social" ${this.filterCategory === 'social' ? 'selected' : ''}>助人/日常記事</option>
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-bold mb-1 ${isOAA ? 'text-amber-200' : 'text-slate-700'}">起始日期</label>
              <input type="date" value="${this.dateFrom}" onchange="eventsLogView.setFilter('dateFrom', this.value)" class="${advFieldCls}">
            </div>

            <div>
              <label class="block text-[11px] font-bold mb-1 ${isOAA ? 'text-amber-200' : 'text-slate-700'}">結束日期</label>
              <input type="date" value="${this.dateTo}" onchange="eventsLogView.setFilter('dateTo', this.value)" class="${advFieldCls}">
            </div>
          </div>
        </div>

        <!-- VIEW MODE RESULTS REGION (Replaced in-place on live typing without stealing input focus) -->
        <div id="events-results-region">
          ${this.renderViewContent(events)}
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  // Updates ONLY the search results & count pill without recreating #events-keyword-input
  updateResultsOnly() {
    const region = document.getElementById('events-results-region');
    if (!region) {
      this.render('events-log-view');
      return;
    }
    const events = this.getFilteredEvents();
    const badge = document.getElementById('events-count-badge');
    if (badge) badge.textContent = `符合條件：共 ${events.length} 筆`;
    const clr = document.getElementById('events-search-clear');
    if (clr) clr.classList.toggle('hidden', !this.searchQuery);
    region.innerHTML = this.renderViewContent(events);
    if (window.lucide) window.lucide.createIcons();
  }

  renderViewContent(events) {
    if (this.currentViewMode === 'cross') {
      return this.renderCrossStudentQuery(events);
    } else if (this.currentViewMode === 'timeline') {
      return this.renderTimelineView(events);
    }
    return this.renderTableView(events);
  }

  // --- 1. Chronological Timeline View ---
  renderTimelineView(events) {
    const isOAA = (window.appStore ? window.appStore.getTheme() : 'kitty') === 'oaa';
    if (events.length === 0) {
      return `
        <div class="py-12 text-center ${isOAA ? 'text-amber-200/70' : 'text-slate-400'}">
          ${isOAA ? '<div class="text-3xl mb-2">🔍</div>' : '<div class="kitty-cat-mini mx-auto mb-2"></div>'}
          <div class="text-sm font-bold">查無符合條件之紀錄${this.searchQuery ? '（試著縮短關鍵字或重設篩選）' : ''}</div>
        </div>
      `;
    }

    const grouped = {};
    events.forEach(e => {
      const d = e.date || '未指定日期';
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(e);
    });

    return `
      <div class="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 ${isOAA ? 'before:bg-amber-500/30' : 'before:bg-pink-200'}">
        ${Object.keys(grouped).map(date => `
          <div class="relative pl-8">
            <div class="absolute left-0 top-0.5 w-7 h-7 rounded-full ${isOAA ? 'bg-rose-900 border-2 border-amber-400 text-amber-300' : 'bg-pink-500 border-4 border-white text-white'} shadow-sm flex items-center justify-center text-[10px] font-black">
              ${isOAA ? '🏛️' : '📅'}
            </div>

            <div class="mb-2 flex flex-wrap items-center gap-2">
              <h3 class="text-sm sm:text-base font-black ${isOAA ? 'text-amber-300' : 'text-pink-700'} font-mono">${date}</h3>
              <span class="text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap ${isOAA ? 'bg-rose-950 text-amber-200 border border-amber-500/40' : 'bg-pink-100 text-pink-800'} font-bold">當日共 ${grouped[date].length} 筆</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${grouped[date].map(evt => {
                const student = this.store.getStudent(evt.classId, evt.seatNo);
                const isPos = Number(evt.delta) > 0;
                const isZero = Number(evt.delta) === 0;
                const clsLabel = this.store.getClassQualifiedName ? this.store.getClassQualifiedName(evt.classId) : evt.classId;
                const isRetro = (evt.note || '').includes('事後補記');

                const cardTheme = isOAA
                  ? (isPos ? 'border-emerald-500/40 bg-[#13211b] text-white' : isZero ? 'border-amber-500/30 bg-[#1a0913] text-white' : 'border-rose-500/45 bg-[#29101a] text-white')
                  : (isPos ? 'border-emerald-200 bg-emerald-50/40 text-slate-900' : isZero ? 'border-slate-200 bg-slate-50/40 text-slate-900' : 'border-rose-200 bg-rose-50/40 text-slate-900');

                return `
                  <div class="p-3.5 rounded-2xl border-2 ${cardTheme} shadow-sm relative min-w-0">
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div class="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span class="px-2 py-0.5 rounded-lg text-[11px] font-black whitespace-nowrap ${isOAA ? 'bg-black/40 border border-amber-500/40 text-amber-200' : 'bg-white border border-pink-200 text-slate-800'}">
                          ${clsLabel}
                        </span>
                        <span class="font-black text-sm ${isOAA ? 'text-white' : 'text-slate-900'}">
                          ${String(evt.seatNo).padStart(2, '0')} 號 ${student ? student.name : '學生'}
                        </span>
                        ${isRetro ? `<span class="text-[10px] px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap border ${isOAA ? 'bg-amber-950/90 text-amber-300 border-amber-500/50' : 'bg-amber-100 text-amber-800 border-amber-300'}">⏰ 補記</span>` : ''}
                      </div>

                      <span class="font-black px-2.5 py-0.5 rounded-lg text-xs border whitespace-nowrap shrink-0 ${isPos ? 'color-rule-pos-badge' : isZero ? 'color-rule-zero-badge' : 'color-rule-neg-badge'}">
                        ${evt.delta > 0 ? '+' : ''}${evt.delta}
                      </span>
                    </div>

                    <div class="text-xs font-bold mb-1.5 flex flex-wrap items-center gap-1.5">
                      <span class="${isOAA ? 'text-amber-300' : 'text-pink-600'}">🏷️ ${evt.tagName || '自訂記事'}</span>
                      <span class="font-normal ${isOAA ? 'text-slate-300' : 'text-slate-500'}">（${this._formatPeriod(evt.period)}）</span>
                    </div>

                    <p class="text-xs font-medium leading-relaxed p-2.5 rounded-xl border mb-2 ${isOAA ? 'bg-black/30 border-white/10 text-slate-200' : 'bg-white/85 border-pink-100 text-slate-700'}">
                      ${evt.note || `<span class="${isOAA ? 'text-slate-400' : 'text-slate-400'}">無詳細備註</span>`}
                    </p>

                    <div class="flex items-center justify-end gap-2">
                      <button type="button" onclick="eventsLogView.editEvent('${evt.id}')" class="min-h-[30px] px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer border ${isOAA ? 'bg-[#170610] hover:bg-rose-950 border-amber-500/40 text-amber-200' : 'bg-white hover:bg-pink-100 border-pink-200 text-pink-700'}">
                        ✏️ 修改
                      </button>
                      <button type="button" onclick="eventsLogView.deleteEvent('${evt.id}')" class="min-h-[30px] px-2 py-0.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-0.5 cursor-pointer ${isOAA ? 'text-slate-300 hover:text-rose-400 hover:bg-rose-950/60' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> <span>刪除</span>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // --- 2. Cross-Student Multi-Check Conflict Search (Works even when global classFilter = 'all') ---
  renderCrossStudentQuery(events) {
    const isOAA = (window.appStore ? window.appStore.getTheme() : 'kitty') === 'oaa';
    const classes = this.store.getClasses() || {};
    const targetClassId = (this.filterClass !== 'all' && classes[this.filterClass])
      ? this.filterClass
      : ((this.crossClassId && classes[this.crossClassId]) ? this.crossClassId : this._resolveFallbackClassId());
    this.crossClassId = targetClassId;

    const students = this.store.getStudents(targetClassId) || [];
    const selectedArray = Array.from(this.crossSelectedSeats);

    // Filter events strictly to targetClassId when viewing that class's students cleanly
    const classScopedEvents = events.filter(e => e.classId === targetClassId);
    const crossEvents = selectedArray.length === 0
      ? classScopedEvents
      : classScopedEvents.filter(e => selectedArray.includes(e.seatNo));

    return `
      <div>
        <div class="mb-4 p-3.5 rounded-2xl border ${isOAA ? 'bg-[#170610] border-amber-500/35' : 'bg-pink-50 border-pink-200'}">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <span class="text-xs font-black flex items-center gap-1.5 ${isOAA ? 'text-amber-200' : 'text-slate-800'}">
              <i data-lucide="user-check" class="w-4 h-4 shrink-0 ${isOAA ? 'text-amber-400' : 'text-pink-600'}"></i>
              <span>勾選多位學生進行交叉比對：</span>
            </span>

            <div class="flex flex-wrap items-center gap-1.5">
              ${this.filterClass === 'all' ? `
                <select onchange="eventsLogView.setCrossClass(this.value)" class="min-h-[32px] rounded-xl px-2 py-1 text-xs font-bold border ${isOAA ? 'bg-[#12050c] border-amber-500/45 text-white' : 'bg-white border-pink-300 text-slate-800'}">
                  ${Object.values(classes).map(c => `
                    <option value="${c.id}" ${targetClassId === c.id ? 'selected' : ''}>
                      ${this.store.getClassQualifiedName ? this.store.getClassQualifiedName(c.id) : c.name}
                    </option>
                  `).join('')}
                </select>
              ` : ''}
              <input type="text" value="${(this.crossSearchText || '').replace(/"/g, '&quot;')}" oninput="eventsLogView.filterCrossStudentsLive(this.value)"
                placeholder="快篩座號/姓名..."
                class="min-h-[32px] w-32 rounded-xl px-2.5 py-1 text-xs font-bold border ${isOAA ? 'bg-[#12050c] border-amber-500/40 text-white placeholder-slate-400' : 'bg-white border-pink-200 text-slate-800'} focus:outline-none">
              ${selectedArray.length > 0 ? `
                <button type="button" onclick="eventsLogView.clearCrossSeats()" class="min-h-[32px] px-2 py-1 rounded-xl text-xs font-bold cursor-pointer ${isOAA ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'bg-white text-rose-600 border border-rose-200'}">清空 (${selectedArray.length})</button>
              ` : `<span class="text-xs font-bold ${isOAA ? 'text-amber-300' : 'text-pink-600'}">已選 0 人</span>`}
            </div>
          </div>

          <div id="events-cross-chips" class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
            ${students.map(s => {
              const isChecked = this.crossSelectedSeats.has(s.seatNo);
              const sk = `${s.seatNo} ${String(s.seatNo).padStart(2, '0')} ${s.name}`.toLowerCase();
              const hide = this.crossSearchText && !sk.includes(this.crossSearchText.trim().toLowerCase());
              return `
                <button type="button" data-search="${sk}" style="${hide ? 'display:none' : ''}" onclick="eventsLogView.toggleCrossSeat(${s.seatNo})"
                  class="events-cross-chip min-h-[36px] min-w-0 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition text-left flex items-center justify-between gap-1 cursor-pointer ${
                    isChecked
                      ? (isOAA ? 'bg-amber-600 text-white border-amber-400 shadow-sm' : 'bg-pink-600 text-white border-pink-700 shadow-sm')
                      : (isOAA ? 'bg-[#240e1b] text-slate-200 border-amber-500/30 hover:bg-[#321325]' : 'bg-white text-slate-800 border-pink-200 hover:bg-pink-100')
                  }">
                  <span class="truncate">${String(s.seatNo).padStart(2, '0')} ${s.name}</span>
                  ${isChecked ? '<span class="shrink-0">✓</span>' : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="mb-3 text-xs font-black ${isOAA ? 'text-amber-200' : 'text-slate-700'}">
          【${this.store.getClassQualifiedName ? this.store.getClassQualifiedName(targetClassId) : targetClassId} 交叉比對結果：共 ${crossEvents.length} 筆】
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[660px] text-left text-xs sm:text-sm ${isOAA ? 'text-slate-100' : 'text-slate-800'}">
            <thead class="${isOAA ? 'bg-[#170610] text-amber-300 border-amber-500/40' : 'bg-pink-100 text-pink-900 border-pink-200'} uppercase text-xs font-black border-b">
              <tr>
                <th class="py-3 px-3.5 whitespace-nowrap">日期 / 節次</th>
                <th class="py-3 px-3.5 whitespace-nowrap">座號 / 姓名</th>
                <th class="py-3 px-3.5 whitespace-nowrap">行為標籤</th>
                <th class="py-3 px-3 text-center whitespace-nowrap">積分</th>
                <th class="py-3 px-4 min-w-[200px] whitespace-nowrap">事證備忘</th>
              </tr>
            </thead>
            <tbody class="divide-y ${isOAA ? 'divide-amber-500/20' : 'divide-pink-100'}">
              ${crossEvents.length === 0 ? `
                <tr>
                  <td colspan="5" class="py-8 text-center ${isOAA ? 'text-slate-400' : 'text-slate-400'}">查無所選學生之紀錄</td>
                </tr>
              ` : crossEvents.map(evt => {
                const student = this.store.getStudent(evt.classId, evt.seatNo);
                return `
                  <tr class="${isOAA ? 'hover:bg-[#2a1020]' : 'hover:bg-pink-50/50'} transition">
                    <td class="py-3 px-3.5 whitespace-nowrap font-mono font-bold">${evt.date} (${this._formatPeriod(evt.period)})</td>
                    <td class="py-3 px-3.5 whitespace-nowrap font-black ${isOAA ? 'text-white' : 'text-slate-900'}">
                      ${String(evt.seatNo).padStart(2, '0')} 號 ${student ? student.name : '學生'}
                    </td>
                    <td class="py-3 px-3.5 whitespace-nowrap font-bold">${evt.tagName || '記事'}</td>
                    <td class="py-3 px-3 text-center font-black ${evt.delta > 0 ? (isOAA ? 'text-emerald-400' : 'text-emerald-700') : evt.delta < 0 ? (isOAA ? 'text-rose-400' : 'text-rose-700') : 'text-slate-400'}">
                      ${evt.delta > 0 ? '+' : ''}${evt.delta}
                    </td>
                    <td class="py-3 px-4 ${isOAA ? 'text-slate-200' : 'text-slate-700'}">${evt.note || ''}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --- 3. Standard Table View ---
  renderTableView(events) {
    const isOAA = (window.appStore ? window.appStore.getTheme() : 'kitty') === 'oaa';
    return `
      <div class="overflow-x-auto">
        <table class="w-full min-w-[780px] text-left text-xs sm:text-sm ${isOAA ? 'text-slate-100' : 'text-slate-800'}">
          <thead class="${isOAA ? 'bg-[#170610] text-amber-300 border-amber-500/40' : 'bg-pink-100 text-pink-900 border-pink-200'} uppercase text-xs font-black border-b">
            <tr>
              <th class="py-3 px-3.5 whitespace-nowrap">日期 / 節次</th>
              <th class="py-3 px-3.5 whitespace-nowrap">班級</th>
              <th class="py-3 px-3.5 whitespace-nowrap">座號 / 姓名</th>
              <th class="py-3 px-3.5 whitespace-nowrap">行為標籤</th>
              <th class="py-3 px-3 text-center whitespace-nowrap">積分</th>
              <th class="py-3 px-4 min-w-[200px] whitespace-nowrap">詳細備忘</th>
              <th class="py-3 px-3 text-right whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y ${isOAA ? 'divide-amber-500/20' : 'divide-pink-100'}">
            ${events.length === 0 ? `
              <tr>
                <td colspan="7" class="py-12 text-center ${isOAA ? 'text-amber-200/70' : 'text-slate-400'}">
                  <div class="text-sm font-bold">查無符合條件之紀錄</div>
                </td>
              </tr>
            ` : events.map(evt => {
              const student = this.store.getStudent(evt.classId, evt.seatNo);
              const isPos = Number(evt.delta) > 0;
              const isZero = Number(evt.delta) === 0;
              const clsInfo = this.store.getClass(evt.classId);
              const clsLabel = this.store.getClassQualifiedName ? this.store.getClassQualifiedName(evt.classId) : (clsInfo ? clsInfo.name : evt.classId);

              return `
                <tr class="${isOAA ? 'hover:bg-[#2a1020]' : 'hover:bg-pink-50/50'} transition">
                  <td class="py-3 px-3.5 whitespace-nowrap">
                    <span class="font-mono font-bold ${isOAA ? 'text-amber-200' : 'text-slate-800'}">${evt.date}</span>
                    <span class="block text-[10px] font-bold ${isOAA ? 'text-slate-400' : 'text-slate-500'}">${evt.time || ''} (${this._formatPeriod(evt.period)})</span>
                  </td>
                  <td class="py-3 px-3.5 whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded-lg text-xs font-bold ${isOAA ? 'bg-black/40 border border-amber-500/40 text-amber-200' : (clsInfo?.type === 'homeroom' ? 'bg-pink-100 text-pink-700' : 'bg-sky-100 text-sky-700')}">
                      ${clsLabel}
                    </span>
                  </td>
                  <td class="py-3 px-3.5 whitespace-nowrap">
                    <span class="font-black text-sm ${isOAA ? 'text-white' : 'text-slate-900'}">${String(evt.seatNo).padStart(2, '0')} 號</span>
                    <span class="font-bold ml-1.5 ${isOAA ? 'text-slate-200' : 'text-slate-800'}">${student ? student.name : '學生'}</span>
                  </td>
                  <td class="py-3 px-3.5 whitespace-nowrap font-bold ${isOAA ? 'text-amber-200' : 'text-slate-800'}">
                    ${evt.tagName || '自訂記事'}
                  </td>
                  <td class="py-3 px-3 text-center whitespace-nowrap">
                    <span class="font-black px-2 py-0.5 rounded-lg text-xs border ${isPos ? 'color-rule-pos-badge' : isZero ? 'color-rule-zero-badge' : 'color-rule-neg-badge'}">
                      ${evt.delta > 0 ? '+' : ''}${evt.delta}
                    </span>
                  </td>
                  <td class="py-3 px-4 max-w-xs md:max-w-md font-medium ${isOAA ? 'text-slate-200' : 'text-slate-700'}">
                    ${evt.note || '<span class="text-slate-400">無備註</span>'}
                  </td>
                  <td class="py-3 px-3 text-right whitespace-nowrap">
                    <div class="inline-flex items-center gap-1">
                      <button type="button" onclick="eventsLogView.editEvent('${evt.id}')" class="px-2 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer ${isOAA ? 'bg-[#170610] hover:bg-rose-950 border-amber-500/40 text-amber-200' : 'text-pink-700 bg-pink-50 hover:bg-pink-100 border-pink-200'}" title="修改此筆分數或備註">✏️ 修改</button>
                      <button type="button" onclick="eventsLogView.deleteEvent('${evt.id}')" class="p-1 rounded-lg transition cursor-pointer ${isOAA ? 'text-slate-300 hover:text-rose-400 hover:bg-rose-950/60' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}" title="刪除此筆記錄">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  setFilter(key, value) {
    this[key] = value;
    if (key === 'filterClass') {
      this.filterSeat = 'all';
      if (value !== 'all') this.crossClassId = value;
      this.crossSelectedSeats.clear();
    }
    this.render('events-log-view');
  }

  setSearch(val) {
    this.searchQuery = String(val ?? '');
    this.updateResultsOnly();
  }

  clearSearch() {
    this.searchQuery = '';
    const inp = document.getElementById('events-keyword-input');
    if (inp) {
      inp.value = '';
      inp.focus();
    }
    this.updateResultsOnly();
  }

  editEvent(eventId) {
    if (!eventId || !window.appState?.openEditEventModal) return;
    window.appState.openEditEventModal(eventId, () => {
      this.render('events-log-view');
    });
  }

  deleteEvent(eventId) {
    if (confirm('確定要刪除此筆事件記錄嗎？')) {
      this.store.deleteEvent(eventId);
      window.appState.showToast('已刪除該筆記事', 'info');
      this.render('events-log-view');
      if (window.matrixView) window.matrixView.render('classroom-matrix-view', window.appState.currentClassId);
    }
  }

  openAddEventModal(classId) {
    const resolved = classId || this._resolveFallbackClassId();
    if (window.matrixView?.openRetroLogModal) {
      window.matrixView.openRetroLogModal(resolved);
    }
  }

  exportFilteredSummary() {
    const events = this.getFilteredEvents();
    const scopeLabel = this.filterClass === 'all'
      ? '所有班級'
      : (this.store.getClassQualifiedName ? this.store.getClassQualifiedName(this.filterClass) : this.filterClass);

    let report = `【ClassQuant 學生事件與記事摘錄】\n篩選範圍：${scopeLabel} (共 ${events.length} 筆)\n\n`;
    events.forEach((e, idx) => {
      const student = this.store.getStudent(e.classId, e.seatNo);
      const clsLabel = this.store.getClassQualifiedName ? this.store.getClassQualifiedName(e.classId) : e.classId;
      report += `${idx + 1}. [${e.date} ${this._formatPeriod(e.period)}] ${clsLabel} ${String(e.seatNo).padStart(2, '0')}號 ${student ? student.name : '學生'}：【${e.tagName} (${e.delta > 0 ? '+' : ''}${e.delta})】${e.note ? ' - ' + e.note : ''}\n`;
    });

    if (window.copyTextSafe) {
      window.copyTextSafe(report, `已複製 ${events.length} 筆事證至剪貼簿！`);
    } else {
      navigator.clipboard.writeText(report);
      window.appState.showToast(`已複製 ${events.length} 筆事證至剪貼簿！`, 'success');
    }
  }
}

// Global Events Log View Instance
window.eventsLogView = new EventsLogView(window.appStore);

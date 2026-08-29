/**
 * Events Stream, Timeline & Comprehensive Incident Search/Log Hub
 * - Multi-View: 📋 列表檢索模式 (Table) | 📅 時序時間軸 (Timeline) | 👥 多生交叉事證查詢 (Cross-Student)
 * - ⏰ 課堂事後快速補記助手 (Retro-Logging Assistant)
 * - 1-Click Quick Scenario Presets & Weekly Retrospective
 */

class EventsLogView {
  constructor(store) {
    this.store = store;
    this.currentViewMode = 'timeline'; // 'timeline' | 'table' | 'cross'
    this.filterClass = 'all';
    this.filterCategory = 'all';
    this.filterSeverity = 'all';
    this.filterSeat = 'all';
    this.searchQuery = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.crossSelectedSeats = new Set();
  }

  switchViewMode(mode) {
    this.currentViewMode = mode;
    this.render('events-log-view');
  }

  quickFilter(type) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (type === 'recent_neg') {
      this.dateFrom = sevenDaysAgo;
      this.dateTo = '';
      this.filterSeverity = 'warning';
      this.filterCategory = 'all';
      this.searchQuery = '';
    } else if (type === 'recent_pos') {
      this.dateFrom = sevenDaysAgo;
      this.dateTo = '';
      this.filterSeverity = 'positive';
      this.filterCategory = 'all';
      this.searchQuery = '';
    } else if (type === 'conflict') {
      this.dateFrom = '';
      this.dateTo = '';
      this.filterSeverity = 'all';
      this.filterCategory = 'conflict';
      this.searchQuery = '';
    } else if (type === 'retro') {
      this.dateFrom = '';
      this.dateTo = '';
      this.filterSeverity = 'all';
      this.filterCategory = 'all';
      this.searchQuery = '事後補記';
    } else if (type === 'reset') {
      this.dateFrom = '';
      this.dateTo = '';
      this.filterSeverity = 'all';
      this.filterCategory = 'all';
      this.filterClass = 'all';
      this.filterSeat = 'all';
      this.searchQuery = '';
      this.crossSelectedSeats.clear();
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

  render(containerId, initialClassId = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (initialClassId && this.filterClass === 'all') {
      this.filterClass = initialClassId;
    }

    const classes = this.store.getClasses();
    let events = this.store.getEvents();
    const students = this.filterClass !== 'all' ? this.store.getStudents(this.filterClass) : [];

    // Apply Standard Filters
    if (this.filterClass !== 'all') {
      events = events.filter(e => e.classId === this.filterClass);
    }
    if (this.filterSeat !== 'all') {
      events = events.filter(e => e.seatNo === parseInt(this.filterSeat, 10));
    }
    if (this.filterCategory !== 'all') {
      events = events.filter(e => e.category === this.filterCategory);
    }
    if (this.filterSeverity !== 'all') {
      if (this.filterSeverity === 'warning') {
        events = events.filter(e => e.severity === 'warning' || e.severity === 'danger' || e.severity === 'critical' || (e.delta < 0));
      } else {
        events = events.filter(e => e.severity === this.filterSeverity);
      }
    }
    if (this.dateFrom) {
      events = events.filter(e => e.date >= this.dateFrom);
    }
    if (this.dateTo) {
      events = events.filter(e => e.date <= this.dateTo);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      events = events.filter(e => {
        const student = this.store.getStudent(e.classId, e.seatNo);
        const name = student ? student.name.toLowerCase() : '';
        const note = (e.note || '').toLowerCase();
        const tagName = (e.tagName || '').toLowerCase();
        const seat = String(e.seatNo);
        return name.includes(q) || note.includes(q) || tagName.includes(q) || seat === q;
      });
    }

    // Sort Chronologically (Newest first)
    events.sort((a, b) => {
      const dateDiff = new Date(b.date || '2026-01-01') - new Date(a.date || '2026-01-01');
      if (dateDiff !== 0) return dateDiff;
      return (b.period || 0) - (a.period || 0);
    });

    container.innerHTML = `
      <div class="glass-card rounded-3xl p-5 sm:p-6 mb-5 border border-pink-200 shadow-sm bg-white">
        <!-- Top Title & Action Buttons -->
        <div class="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div class="flex items-center space-x-3.5">
            <div class="sanrio-twinstars-badge !w-12 !h-12"></div>
            <div>
              <h2 class="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                學生事件記事與時序事證檢索中心
                <span class="kitty-bow"></span>
              </h2>
              <p class="text-xs sm:text-sm text-slate-600 font-medium">支援課堂事後回憶補記、多生交叉衝突查詢與日期時序時間軸</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center space-x-2">
            <button onclick="eventsLogView.openAddEventModal('${this.filterClass !== 'all' ? this.filterClass : '801'}')" 
              class="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs sm:text-sm font-black shadow-md transition flex items-center gap-1.5">
              <i data-lucide="clock" class="w-4 h-4"></i> ⏰ 事後快速補記
            </button>
            <button onclick="eventsLogView.exportFilteredSummary()" class="px-3.5 py-2 rounded-2xl bg-white hover:bg-pink-50 text-slate-800 border border-pink-300 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-sm">
              <i data-lucide="copy" class="w-4 h-4 text-pink-500"></i> 複製搜尋結果
            </button>
          </div>
        </div>

        <!-- View Mode Switcher Tabs -->
        <div class="flex items-center justify-between border-b border-pink-200 pb-3 mb-4">
          <div class="flex items-center space-x-2">
            <button onclick="eventsLogView.switchViewMode('timeline')" class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-1.5 ${this.currentViewMode === 'timeline' ? 'bg-pink-600 text-white shadow-sm' : 'bg-pink-50 text-pink-700 hover:bg-pink-100'}">
              <i data-lucide="calendar" class="w-4 h-4"></i> 📅 日期時序時間軸
            </button>
            <button onclick="eventsLogView.switchViewMode('table')" class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-1.5 ${this.currentViewMode === 'table' ? 'bg-pink-600 text-white shadow-sm' : 'bg-pink-50 text-pink-700 hover:bg-pink-100'}">
              <i data-lucide="list" class="w-4 h-4"></i> 📋 完整列表模式
            </button>
            <button onclick="eventsLogView.switchViewMode('cross')" class="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center gap-1.5 ${this.currentViewMode === 'cross' ? 'bg-pink-600 text-white shadow-sm' : 'bg-pink-50 text-pink-700 hover:bg-pink-100'}">
              <i data-lucide="users" class="w-4 h-4"></i> 👥 多生交叉查詢
            </button>
          </div>
          <span class="text-xs text-slate-500 font-bold hidden sm:inline">共 ${events.length} 筆符合事證</span>
        </div>

        <!-- 1-Click Quick Scenario Presets -->
        <div class="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-pink-100">
          <span class="text-xs font-black text-slate-700">⚡ 一鍵情境速查：</span>
          <button onclick="eventsLogView.quickFilter('retro')" class="px-3 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1">
            <i data-lucide="clock" class="w-3.5 h-3.5 text-amber-600"></i> ⏰ 所有事後補記
          </button>
          <button onclick="eventsLogView.quickFilter('recent_neg')" class="px-3 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold transition flex items-center gap-1">
            <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-rose-600"></i> 🔥 近 7 日違紀
          </button>
          <button onclick="eventsLogView.quickFilter('recent_pos')" class="px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition flex items-center gap-1">
            <i data-lucide="sparkles" class="w-3.5 h-3.5 text-emerald-600"></i> 🌟 近 7 日優異
          </button>
          <button onclick="eventsLogView.quickFilter('conflict')" class="px-3 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold transition flex items-center gap-1">
            <i data-lucide="shield-alert" class="w-3.5 h-3.5 text-purple-600"></i> ⚠️ 同儕衝突
          </button>
          <button onclick="eventsLogView.quickFilter('reset')" class="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold transition flex items-center gap-1">
            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> 重設
          </button>
        </div>

        <!-- Filter Controls Bar -->
        <div class="p-4 rounded-2xl bg-pink-50/60 border border-pink-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          <!-- Class Filter -->
          <div>
            <label class="block text-xs text-slate-700 font-bold mb-1">班級篩選</label>
            <select onchange="eventsLogView.setFilter('filterClass', this.value)" class="w-full border border-pink-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold focus:outline-none bg-white">
              <option value="all" ${this.filterClass === 'all' ? 'selected' : ''}>所有班級</option>
              ${Object.values(classes).map(c => `
                <option value="${c.id}" ${this.filterClass === c.id ? 'selected' : ''}>${c.name} (${c.type === 'homeroom' ? '導師' : '科任'})</option>
              `).join('')}
            </select>
          </div>

          <!-- Seat Filter -->
          <div>
            <label class="block text-xs text-slate-700 font-bold mb-1">座號篩選</label>
            <select onchange="eventsLogView.setFilter('filterSeat', this.value)" class="w-full border border-pink-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold focus:outline-none bg-white">
              <option value="all" ${this.filterSeat === 'all' ? 'selected' : ''}>所有學生</option>
              ${students.map(s => `
                <option value="${s.seatNo}" ${this.filterSeat === String(s.seatNo) ? 'selected' : ''}>
                  ${String(s.seatNo).padStart(2, '0')} 號 ${s.name}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Category Filter -->
          <div>
            <label class="block text-xs text-slate-700 font-bold mb-1">類別</label>
            <select onchange="eventsLogView.setFilter('filterCategory', this.value)" class="w-full border border-pink-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold focus:outline-none bg-white">
              <option value="all" ${this.filterCategory === 'all' ? 'selected' : ''}>所有類別</option>
              <option value="academic" ${this.filterCategory === 'academic' ? 'selected' : ''}>數學學業</option>
              <option value="discipline" ${this.filterCategory === 'discipline' ? 'selected' : ''}>生活常規</option>
              <option value="conflict" ${this.filterCategory === 'conflict' ? 'selected' : ''}>同儕衝突</option>
              <option value="social" ${this.filterCategory === 'social' ? 'selected' : ''}>熱心助人/日常記事</option>
            </select>
          </div>

          <!-- Date Range (From) -->
          <div>
            <label class="block text-xs text-slate-700 font-bold mb-1">起始日期</label>
            <input type="date" value="${this.dateFrom}" onchange="eventsLogView.setFilter('dateFrom', this.value)" class="w-full border border-pink-300 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm font-bold focus:outline-none bg-white">
          </div>

          <!-- Date Range (To) -->
          <div>
            <label class="block text-xs text-slate-700 font-bold mb-1">結束日期</label>
            <input type="date" value="${this.dateTo}" onchange="eventsLogView.setFilter('dateTo', this.value)" class="w-full border border-pink-300 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm font-bold focus:outline-none bg-white">
          </div>

          <!-- Keyword Search -->
          <div>
            <label class="block text-xs text-slate-700 font-bold mb-1">關鍵字全文搜尋</label>
            <input type="text" placeholder="如：打架/感冒/作業..." value="${this.searchQuery}" oninput="eventsLogView.setSearch(this.value)" class="w-full border border-pink-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold focus:outline-none bg-white">
          </div>
        </div>

        <!-- VIEW MODE CONTENT RENDERING -->
        ${this.renderViewContent(events, students)}

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  renderViewContent(events, students) {
    if (this.currentViewMode === 'cross') {
      return this.renderCrossStudentQuery(events, students);
    } else if (this.currentViewMode === 'timeline') {
      return this.renderTimelineView(events);
    } else {
      return this.renderTableView(events);
    }
  }

  // --- 1. Chronological Timeline View (📅 日期時序時間軸) ---
  renderTimelineView(events) {
    if (events.length === 0) {
      return `
        <div class="py-12 text-center text-slate-400">
          <div class="kitty-cat-mini mx-auto mb-2"></div>
          <div class="text-sm font-bold">查無符合條件之時序記錄</div>
        </div>
      `;
    }

    // Group events by Date
    const grouped = {};
    events.forEach(e => {
      const d = e.date || '未指定日期';
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(e);
    });

    return `
      <div class="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-pink-200">
        ${Object.keys(grouped).map(date => `
          <div class="relative pl-8">
            <!-- Date Pill Node -->
            <div class="absolute left-0 top-0.5 w-7 h-7 rounded-full bg-pink-500 border-4 border-white shadow-sm flex items-center justify-center text-white text-[10px] font-black">
              📅
            </div>
            
            <div class="mb-2 flex items-center gap-2">
              <h3 class="text-sm sm:text-base font-black text-pink-700 font-mono">${date}</h3>
              <span class="text-[11px] px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 font-bold">當日共 ${grouped[date].length} 筆記事</span>
            </div>

            <!-- Events Cards on this Date -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${grouped[date].map(evt => {
                const student = this.store.getStudent(evt.classId, evt.seatNo);
                const isPos = evt.delta > 0;
                const isZero = evt.delta === 0;
                const clsInfo = this.store.getClass(evt.classId);
                const isRetro = (evt.note || '').includes('事後補記');

                return `
                  <div class="p-3.5 rounded-2xl border-2 ${isPos ? 'border-emerald-200 bg-emerald-50/40' : isZero ? 'border-slate-200 bg-slate-50/40' : 'border-rose-200 bg-rose-50/40'} shadow-sm relative">
                    <div class="flex items-center justify-between mb-1.5">
                      <div class="flex items-center space-x-1.5">
                        <span class="px-2 py-0.5 rounded-lg text-xs font-black bg-white border border-pink-200 text-slate-800">
                          ${clsInfo ? clsInfo.name : evt.classId}
                        </span>
                        <span class="font-black text-slate-900 text-sm">
                          ${String(evt.seatNo).padStart(2, '0')} 號 ${student ? student.name : '學生'}
                        </span>
                        ${isRetro ? '<span class="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-300">⏰ 事後補記</span>' : ''}
                      </div>

                      <span class="font-black px-2.5 py-0.5 rounded-lg text-xs border ${isPos ? 'color-rule-pos-badge' : isZero ? 'color-rule-zero-badge' : 'color-rule-neg-badge'}">
                        ${evt.delta > 0 ? '+' : ''}${evt.delta}
                      </span>
                    </div>

                    <div class="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                      <span class="text-pink-600">🏷️ ${evt.tagName || '自訂記事'}</span>
                      <span class="text-slate-400 font-normal">（節次 ${evt.period !== undefined ? evt.period : '無'}）</span>
                    </div>

                    <p class="text-xs text-slate-700 font-medium leading-relaxed bg-white/80 p-2 rounded-xl border border-pink-100 mb-2">
                      ${evt.note || '<span class="text-slate-400">無詳細備註</span>'}
                    </p>

                    <div class="flex items-center justify-end space-x-2">
                      <button onclick="eventsLogView.deleteEvent('${evt.id}')" class="text-slate-400 hover:text-rose-600 text-xs font-bold transition flex items-center gap-0.5">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> 刪除
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

  // --- 2. Multi-Student Cross-Query View (👥 多生交叉查詢) ---
  renderCrossStudentQuery(events, students) {
    if (this.filterClass === 'all') {
      return `
        <div class="p-8 text-center text-slate-500 bg-pink-50/50 rounded-2xl border border-pink-200">
          <div class="text-sm font-bold">請先在上方「班級篩選」選擇指定班級，即可勾選多位學生進行交叉事證比對</div>
        </div>
      `;
    }

    const selectedArray = Array.from(this.crossSelectedSeats);
    const crossEvents = events.filter(e => selectedArray.length === 0 || selectedArray.includes(e.seatNo));

    return `
      <div>
        <!-- Student Multiselect Chips -->
        <div class="mb-5 p-3.5 rounded-2xl bg-pink-50 border border-pink-200">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <i data-lucide="user-check" class="w-4 h-4 text-pink-600"></i>
              勾選 2 位以上學生進行交叉事件查詢 (例如同儕衝突雙方、同組合作名單)：
            </span>
            <span class="text-xs text-pink-600 font-bold">已選 ${selectedArray.length} 人</span>
          </div>

          <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
            ${students.map(s => {
              const isChecked = this.crossSelectedSeats.has(s.seatNo);
              return `
                <button onclick="eventsLogView.toggleCrossSeat(${s.seatNo})" 
                  class="px-2 py-1.5 rounded-xl border text-xs font-bold transition text-left truncate flex items-center justify-between ${isChecked ? 'bg-pink-600 text-white border-pink-700 shadow-sm' : 'bg-white text-slate-800 border-pink-200 hover:bg-pink-100'}">
                  <span>${String(s.seatNo).padStart(2, '0')} ${s.name}</span>
                  ${isChecked ? '✓' : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Cross Query Result Header -->
        <div class="mb-3 text-xs font-black text-slate-700">
          【交叉比對結果：共 ${crossEvents.length} 筆事證】
        </div>

        <!-- Cross Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm text-slate-800">
            <thead class="bg-pink-100 text-pink-900 uppercase text-xs font-black border-b border-pink-200">
              <tr>
                <th class="py-3 px-3.5">日期 / 節次</th>
                <th class="py-3 px-3.5">座號 / 姓名</th>
                <th class="py-3 px-3.5">行為標籤</th>
                <th class="py-3 px-3 text-center">積分</th>
                <th class="py-3 px-4">事證備忘</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-pink-100">
              ${crossEvents.length === 0 ? `
                <tr>
                  <td colspan="5" class="py-8 text-center text-slate-400">查無所選學生之交集記錄</td>
                </tr>
              ` : crossEvents.map(evt => {
                const student = this.store.getStudent(evt.classId, evt.seatNo);
                return `
                  <tr class="hover:bg-pink-50/50 transition">
                    <td class="py-3 px-3.5 whitespace-nowrap font-mono font-bold">${evt.date} (節次${evt.period || '無'})</td>
                    <td class="py-3 px-3.5 whitespace-nowrap font-black text-slate-900">
                      ${String(evt.seatNo).padStart(2, '0')} 號 ${student ? student.name : '學生'}
                    </td>
                    <td class="py-3 px-3.5 whitespace-nowrap font-bold">${evt.tagName || '記事'}</td>
                    <td class="py-3 px-3 text-center font-black ${evt.delta > 0 ? 'text-emerald-700' : evt.delta < 0 ? 'text-rose-700' : 'text-slate-500'}">
                      ${evt.delta > 0 ? '+' : ''}${evt.delta}
                    </td>
                    <td class="py-3 px-4 text-slate-700">${evt.note || ''}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // --- 3. Standard Table View (📋 完整列表模式) ---
  renderTableView(events) {
    return `
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs sm:text-sm text-slate-800">
          <thead class="bg-pink-100 text-pink-900 uppercase text-xs font-black border-b border-pink-200">
            <tr>
              <th class="py-3 px-3.5">日期 / 節次</th>
              <th class="py-3 px-3.5">班級</th>
              <th class="py-3 px-3.5">座號 / 姓名</th>
              <th class="py-3 px-3.5">行為標籤</th>
              <th class="py-3 px-3 text-center">積分變動</th>
              <th class="py-3 px-4">具體事實備忘 (事證)</th>
              <th class="py-3 px-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-pink-100">
            ${events.length === 0 ? `
              <tr>
                <td colspan="7" class="py-12 text-center text-slate-400">
                  <div class="kitty-cat-mini mx-auto mb-2"></div>
                  <div class="text-sm font-bold">查無符合條件之記事或事件記錄</div>
                </td>
              </tr>
            ` : events.map(evt => {
              const student = this.store.getStudent(evt.classId, evt.seatNo);
              const isPos = evt.delta > 0;
              const isZero = evt.delta === 0;
              const clsInfo = this.store.getClass(evt.classId);

              return `
                <tr class="hover:bg-pink-50/50 transition">
                  <td class="py-3 px-3.5 whitespace-nowrap">
                    <span class="font-mono font-bold text-slate-800">${evt.date}</span>
                    <span class="block text-[10px] text-slate-500 font-bold">${evt.time || ''} (節次 ${evt.period !== undefined ? evt.period : '無'})</span>
                  </td>
                  <td class="py-3 px-3.5 whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded-lg text-xs font-bold ${clsInfo?.type === 'homeroom' ? 'bg-pink-100 text-pink-700' : 'bg-sky-100 text-sky-700'}">
                      ${clsInfo ? clsInfo.name : evt.classId}
                    </span>
                  </td>
                  <td class="py-3 px-3.5 whitespace-nowrap">
                    <span class="font-black text-slate-900 text-sm">${String(evt.seatNo).padStart(2, '0')} 號</span>
                    <span class="font-bold text-slate-800 ml-1.5">${student ? student.name : '學生'}</span>
                  </td>
                  <td class="py-3 px-3.5 whitespace-nowrap font-bold text-slate-800">
                    ${evt.tagName || '自訂記事'}
                  </td>
                  <td class="py-3 px-3 text-center whitespace-nowrap">
                    <span class="font-black px-2 py-0.5 rounded-lg text-xs border ${isPos ? 'color-rule-pos-badge' : isZero ? 'color-rule-zero-badge' : 'color-rule-neg-badge'}">
                      ${evt.delta > 0 ? '+' : ''}${evt.delta}
                    </span>
                  </td>
                  <td class="py-3 px-4 max-w-xs md:max-w-md font-medium text-slate-700">
                    ${evt.note || '<span class="text-slate-400">無備註</span>'}
                  </td>
                  <td class="py-3 px-3 text-right whitespace-nowrap">
                    <button onclick="eventsLogView.deleteEvent('${evt.id}')" class="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition" title="刪除此筆記錄">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
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
    this.render('events-log-view');
  }

  setSearch(val) {
    this.searchQuery = val.trim();
    this.render('events-log-view');
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
    if (window.matrixView?.openRetroLogModal) {
      window.matrixView.openRetroLogModal(classId);
    }
  }

  exportFilteredSummary() {
    let events = this.store.getEvents();
    if (this.filterClass !== 'all') events = events.filter(e => e.classId === this.filterClass);
    if (this.filterSeat !== 'all') events = events.filter(e => e.seatNo === parseInt(this.filterSeat, 10));
    if (this.filterCategory !== 'all') events = events.filter(e => e.category === this.filterCategory);
    if (this.dateFrom) events = events.filter(e => e.date >= this.dateFrom);
    if (this.dateTo) events = events.filter(e => e.date <= this.dateTo);

    let report = `【ClassQuant 學生事件與記事摘錄】\n篩選範圍：${this.filterClass === 'all' ? '所有班級' : this.filterClass + '班'} (共 ${events.length} 筆)\n\n`;
    events.forEach((e, idx) => {
      const student = this.store.getStudent(e.classId, e.seatNo);
      report += `${idx + 1}. [${e.date} 節次:${e.period}] ${e.classId}班 ${String(e.seatNo).padStart(2, '0')}號 ${student ? student.name : '學生'}：【${e.tagName} (${e.delta > 0 ? '+' : ''}${e.delta})】${e.note ? ' - ' + e.note : ''}\n`;
    });

    navigator.clipboard.writeText(report);
    window.appState.showToast(`已複製 ${events.length} 筆事證至剪貼簿！`, 'success');
  }
}

// Global Events Log View Instance
window.eventsLogView = new EventsLogView(window.appStore);

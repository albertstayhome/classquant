/**
 * Visual Charts & Dashboard Analytics
 * Renders Single-Class Analytics AND Cross-Class Comparative Benchmark for Homework/Teaching Optimization.
 */

class DashboardCharts {
  constructor(store, stats) {
    this.store = store;
    this.stats = stats;
    this.chartInstances = {};
    this.currentViewMode = 'single'; // 'single' or 'multi'
    this.leaderboardFilter = 'all';
  }

  destroyChart(chartId) {
    if (this.chartInstances[chartId]) {
      this.chartInstances[chartId].destroy();
      delete this.chartInstances[chartId];
    }
  }

  switchDashboardMode(mode, classId) {
    this.currentViewMode = mode;
    this.renderClassDashboard('dashboard-view', classId);
  }

  renderClassDashboard(containerId, classId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (this.currentViewMode === 'multi') {
      this.renderMultiClassDashboard(container, classId);
    } else {
      this.renderSingleClassDashboard(container, classId);
    }
  }

  // --- 1. SINGLE CLASS DEEP DIVE DASHBOARD ---
  renderSingleClassDashboard(container, classId) {
    const overview = this.stats.getClassOverview(classId);
    const cls = this.store.getClass(classId);

    container.innerHTML = `
      <!-- Sub-Tab Mode Switcher -->
      <div class="flex items-center justify-between gap-3 mb-5 p-2 rounded-2xl bg-white border border-pink-200 shadow-sm">
        <div class="flex items-center space-x-2">
          <button onclick="dashboardCharts.switchDashboardMode('single', '${classId}')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-pink-500 text-white shadow-md transition flex items-center gap-1.5">
            <i data-lucide="user" class="w-4 h-4"></i> 📌 單班深度診斷 (${cls ? cls.name : classId})
          </button>
          <button onclick="dashboardCharts.switchDashboardMode('multi', '${classId}')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-200 transition flex items-center gap-1.5">
            <i data-lucide="layers" class="w-4 h-4 text-pink-600"></i> 🌐 跨班級橫向比較 & 作業教學建議
          </button>
        </div>
      </div>

      <!-- Top Metric Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- Average Score Card -->
        <div class="glass-card rounded-2xl p-4 border border-pink-200 bg-white">
          <div class="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>班級學業均分 (歷史)</span>
            <span class="kitty-cat-mini"></span>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-3xl font-black text-blue-700">${overview.classAvgScore}</span>
            <span class="text-xs text-slate-500">分</span>
          </div>
          <div class="text-xs text-slate-500 mt-1">
            ${overview.latestBoxPlot ? `最新中位數: <strong class="text-blue-800">${overview.latestBoxPlot.median}</strong> 分` : '尚無數據'}
          </div>
        </div>

        <!-- Net Engagement Points Card -->
        <div class="glass-card rounded-2xl p-4 border border-pink-200 bg-white">
          <div class="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>品格常規淨積分</span>
            <span class="kitty-bow"></span>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-3xl font-black ${overview.pointsBoxPlot.median >= 0 ? 'text-emerald-700' : 'text-rose-700'}">
              ${overview.pointsBoxPlot.median > 0 ? '+' : ''}${overview.pointsBoxPlot.median}
            </span>
            <span class="text-xs text-slate-500">點</span>
          </div>
          <div class="text-xs text-slate-500 mt-1">
            全班最高: <span class="text-emerald-700 font-bold">+${overview.pointsBoxPlot.max}</span> • 最低: <span class="text-rose-700 font-bold">${overview.pointsBoxPlot.min}</span>
          </div>
        </div>

        <!-- Care Tracker Count -->
        <div class="glass-card rounded-2xl p-4 border border-pink-200 bg-white">
          <div class="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>近期需關懷名單</span>
            <div class="sanrio-kuromi-badge !w-6 !h-6"></div>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-3xl font-black text-rose-700">${overview.alertStudents.length}</span>
            <span class="text-xs text-slate-500">位同學</span>
          </div>
          <div class="text-xs text-slate-500 mt-1 truncate">
            ${overview.alertStudents.length > 0 ? `包含座號: ${overview.alertStudents.map(s => s.student.seatNo + '號').join(', ')}` : '全班表現穩定'}
          </div>
        </div>

        <!-- 4-Quadrant Differentiated Instruction Summary -->
        <div class="glass-card rounded-2xl p-4 border border-pink-200 bg-white">
          <div class="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>因材施教分群 (四象限)</span>
            <div class="sanrio-twinstars-badge !w-6 !h-6"></div>
          </div>
          <div class="mt-2 grid grid-cols-2 gap-1 text-[11px] font-bold">
            <div class="text-emerald-800">拔尖拓展: ${overview.clusters.topTier.length}人</div>
            <div class="text-sky-800">潛力待發揮: ${overview.clusters.underachiever.length}人</div>
            <div class="text-amber-800">努力待補救: ${overview.clusters.hardWorker.length}人</div>
            <div class="text-rose-800">需關懷引導: ${overview.clusters.highRisk.length}人</div>
          </div>
        </div>
      </div>

      <!-- Main Visualizations (2 Columns) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- 4-Quadrant Differentiated Scatter Chart -->
        <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 bg-white shadow-sm">
          <h3 class="text-sm sm:text-base font-black flex items-center gap-2 mb-1 text-slate-800">
            <span class="kitty-bow"></span>
            因材施教四象限分佈圖 (學業能力 vs 課堂投入度)
          </h3>
          <p class="text-xs text-slate-500 mb-3 font-medium">X軸：數學小考均分 • Y軸：品格常規淨積分 (點擊圓點可跳轉學生檔案)</p>
          <div class="relative h-72">
            <canvas id="chart-quadrant"></canvas>
          </div>
        </div>

        <!-- Class Grade Distribution & Box Plot Summary -->
        <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 bg-white shadow-sm">
          <h3 class="text-sm sm:text-base font-black flex items-center gap-2 mb-1 text-slate-800">
            <i data-lucide="bar-chart-2" class="w-4 h-4 text-sky-500"></i>
            小考成績五數綜合統計 (Box Plot Summary)
          </h3>
          <p class="text-xs text-slate-500 mb-3 font-medium">全班常規成績分佈與箱型圖五數統計</p>
          
          ${overview.latestBoxPlot ? `
            <div class="grid grid-cols-5 gap-2 p-2 rounded-xl border border-pink-200 text-center text-xs mb-3 bg-pink-50/50 font-bold">
              <div><span class="text-slate-500 block text-xs">最低 (Min)</span>${overview.latestBoxPlot.min}</div>
              <div><span class="text-slate-500 block text-xs">Q1 (25%)</span>${overview.latestBoxPlot.q1}</div>
              <div><span class="text-pink-700 block text-xs">中位數 (Q2)</span>${overview.latestBoxPlot.median}</div>
              <div><span class="text-slate-500 block text-xs">Q3 (75%)</span>${overview.latestBoxPlot.q3}</div>
              <div><span class="text-slate-500 block text-xs">最高 (Max)</span>${overview.latestBoxPlot.max}</div>
            </div>
          ` : ''}

          <div class="relative h-56">
            <canvas id="chart-distribution"></canvas>
          </div>
        </div>
      </div>

      <!-- 🏆 Class Ranking Leaderboard (班級綜合實力天梯排行榜) -->
      <div id="class-leaderboard-card"></div>
    `;

    if (window.lucide) window.lucide.createIcons();

    this.renderQuadrantScatter('chart-quadrant', overview, classId);
    this.renderScoreDistribution('chart-distribution', overview);
    this.renderLeaderboardContent('class-leaderboard-card', classId);
  }

  // --- 🏆 CLASS RANKING LEADERBOARD (WAR ROOM) ---
  renderLeaderboardContent(containerIdOrElement, classId, filter = null) {
    if (filter) this.leaderboardFilter = filter;
    const currentFilter = this.leaderboardFilter || 'all';
    const container = typeof containerIdOrElement === 'string' ? document.getElementById(containerIdOrElement) : containerIdOrElement;
    if (!container) return;

    const isOAA = window.appStore?.getTheme() === 'oaa' || document.documentElement.classList.contains('oaa');
    const fullLeaderboard = this.store.getClassLeaderboard ? this.store.getClassLeaderboard(classId) : [];
    
    let displayList = fullLeaderboard;
    if (currentFilter === 'M') {
      displayList = fullLeaderboard.filter(s => s.gender === 'M');
    } else if (currentFilter === 'F') {
      displayList = fullLeaderboard.filter(s => s.gender === 'F');
    }

    const maleCount = fullLeaderboard.filter(s => s.gender === 'M').length;
    const femaleCount = fullLeaderboard.filter(s => s.gender === 'F').length;

    container.className = isOAA
      ? "rounded-3xl p-5 sm:p-6 bg-[#240d1a] border-2 border-amber-500/50 shadow-xl text-white mb-6"
      : "glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 bg-white shadow-sm mb-6";

    container.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b ${isOAA ? 'border-amber-500/30' : 'border-pink-100'}">
        <div class="flex items-center space-x-3">
          ${isOAA ? `
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center font-mono font-black text-xl text-white shadow-md shrink-0">
              👑
            </div>
          ` : `
            <div class="sanrio-twinstars-badge !w-10 !h-10 shrink-0"></div>
          `}
          <div>
            <h3 class="text-base sm:text-lg font-black ${isOAA ? 'text-amber-200' : 'text-slate-800'} flex items-center gap-2">
              <span>🏆 班級綜合實力天梯排行榜</span>
              <span class="text-xs px-2.5 py-0.5 rounded-full font-bold ${isOAA ? 'bg-amber-950 text-amber-300 border border-amber-500/40' : 'bg-pink-100 text-pink-700'}">
                共 ${fullLeaderboard.length} 位同學
              </span>
            </h3>
            <p class="text-xs ${isOAA ? 'text-amber-300/70' : 'text-slate-500'} font-medium">
              綜合實力 = 學業均分 (70%) + 品格常規 (30%) • 點選任一同學可直達專屬個人檔案
            </p>
          </div>
        </div>

        <!-- Filter Pills -->
        <div class="flex items-center gap-1.5 p-1 rounded-2xl ${isOAA ? 'bg-[#1a0713] border border-amber-500/40' : 'bg-pink-50 border border-pink-200'}">
          <button type="button" onclick="dashboardCharts.setLeaderboardFilter('${classId}', 'all')" 
            class="px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${currentFilter === 'all' ? (isOAA ? 'bg-amber-500 text-[#1a0713] shadow' : 'bg-pink-500 text-white shadow') : (isOAA ? 'text-amber-200/80 hover:text-white' : 'text-slate-600 hover:text-slate-900')}">
            全部 (${fullLeaderboard.length})
          </button>
          <button type="button" onclick="dashboardCharts.setLeaderboardFilter('${classId}', 'M')" 
            class="px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${currentFilter === 'M' ? 'bg-blue-600 text-white shadow' : (isOAA ? 'text-blue-300 hover:text-white' : 'text-slate-600 hover:text-blue-600')}">
            <span>👦 男生</span>
            <span class="text-xs opacity-80">(${maleCount})</span>
          </button>
          <button type="button" onclick="dashboardCharts.setLeaderboardFilter('${classId}', 'F')" 
            class="px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${currentFilter === 'F' ? 'bg-pink-600 text-white shadow' : (isOAA ? 'text-pink-300 hover:text-white' : 'text-slate-600 hover:text-pink-600')}">
            <span>👧 女生</span>
            <span class="text-xs opacity-80">(${femaleCount})</span>
          </button>
        </div>
      </div>

      <!-- Leaderboard Rows -->
      <div class="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
        ${displayList.length === 0 ? `
          <div class="text-center py-12 text-slate-400 text-sm">此篩選條件下暫無學生資料</div>
        ` : displayList.map((item) => {
          const rank = currentFilter === 'all' ? item.overallRank : item.genderRank;
          const isTop1 = rank === 1;
          const isTop2 = rank === 2;
          const isTop3 = rank === 3;
          
          let rankBadge = '';
          if (isTop1) {
            rankBadge = `<span class="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 font-black text-sm flex items-center justify-center shadow shrink-0">🥇</span>`;
          } else if (isTop2) {
            rankBadge = `<span class="w-8 h-8 rounded-xl bg-slate-300 text-slate-900 font-black text-sm flex items-center justify-center shadow shrink-0">🥈</span>`;
          } else if (isTop3) {
            rankBadge = `<span class="w-8 h-8 rounded-xl bg-amber-700 text-amber-100 font-black text-sm flex items-center justify-center shadow shrink-0">🥉</span>`;
          } else {
            rankBadge = `<span class="w-8 h-8 rounded-xl ${isOAA ? 'bg-[#351425] text-amber-300' : 'bg-slate-100 text-slate-600'} font-black text-xs flex items-center justify-center font-mono shrink-0">#${rank}</span>`;
          }

          const studentGender = item.gender || 'M';
          let charInfo = null;
          if (isOAA && window.appState?.getCoteCharacterByGenderAndRank) {
            charInfo = window.appState.getCoteCharacterByGenderAndRank(studentGender, item.genderRank);
          }

          return `
            <div onclick="dashboardCharts.jumpToStudentDossier('${classId}', ${item.seatNo})" 
              class="group p-3 rounded-2xl border transition duration-200 cursor-pointer flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 ${
                isOAA 
                  ? (isTop1 ? 'bg-[#3b152b] border-amber-400/80 hover:bg-[#481a35]' : 'bg-[#290e1d]/80 border-amber-500/30 hover:bg-[#381328]')
                  : (isTop1 ? 'bg-amber-50/70 border-amber-300 hover:bg-amber-100/70' : 'bg-slate-50/70 border-slate-200 hover:bg-pink-50/60 hover:border-pink-300')
              }">
              
              <!-- Left: Rank + Avatar + Name -->
              <div class="flex items-center space-x-3 min-w-0 flex-1">
                ${rankBadge}

                ${isOAA && charInfo ? `
                  <div class="w-10 h-10 rounded-xl overflow-hidden border border-amber-500/60 bg-black/40 shrink-0 relative">
                    <img src="${charInfo.avatar}" alt="${charInfo.name}" class="w-full h-full object-cover object-top">
                  </div>
                ` : `
                  <div class="w-9 h-9 rounded-xl ${studentGender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'} font-black text-xs flex items-center justify-center shrink-0">
                    ${String(item.seatNo).padStart(2, '0')}
                  </div>
                `}

                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <span class="font-black text-sm sm:text-base ${isOAA ? 'text-white' : 'text-slate-900'} group-hover:text-pink-600 transition truncate">
                      ${item.name}
                    </span>
                    <span class="text-xs px-1.5 py-0.5 rounded font-bold shrink-0 ${studentGender === 'F' ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}">
                      ${studentGender === 'F' ? '👧 女' : '👦 男'}
                    </span>
                  </div>
                  <div class="text-[11px] ${isOAA ? 'text-amber-300/80' : 'text-slate-500'} font-medium flex items-center gap-2 min-w-0">
                    <span class="shrink-0">座號 ${String(item.seatNo).padStart(2, '0')}</span>
                    ${isOAA && charInfo ? `
                      <span class="text-amber-300 font-bold truncate">• 實力對應：${charInfo.name}</span>
                    ` : ''}
                  </div>
                </div>
              </div>

              <!-- Right: Scores & Composite -->
              <div class="flex items-center gap-3 sm:gap-4 shrink-0 text-xs font-bold">
                <div class="text-right shrink-0">
                  <div class="text-[11px] ${isOAA ? 'text-amber-400/80' : 'text-slate-400'} font-bold">學業均分</div>
                  <div class="font-black ${isOAA ? 'text-cyan-300' : 'text-blue-700'}">${item.academicScore} 分</div>
                </div>

                <div class="text-right shrink-0">
                  <div class="text-[11px] ${isOAA ? 'text-amber-400/80' : 'text-slate-400'} font-bold">品格常規</div>
                  <div class="font-black ${item.characterPoints >= 0 ? (isOAA ? 'text-emerald-300' : 'text-emerald-700') : (isOAA ? 'text-rose-400' : 'text-rose-700')}">
                    ${item.characterPoints > 0 ? '+' : ''}${item.characterPoints} 點
                  </div>
                </div>

                <div class="px-3 py-1.5 rounded-xl ${isOAA ? 'bg-gradient-to-r from-amber-600 to-rose-700 text-white' : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'} shadow-sm text-right shrink-0">
                  <div class="text-[10px] uppercase tracking-wider opacity-90 font-bold">綜合實力</div>
                  <div class="text-sm sm:text-base font-black font-mono leading-tight">${item.composite}</div>
                </div>

                <div class="text-slate-400 group-hover:translate-x-1 transition hidden sm:block">
                  <i data-lucide="chevron-right" class="w-4 h-4"></i>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  setLeaderboardFilter(classId, filter) {
    this.leaderboardFilter = filter;
    this.renderLeaderboardContent('class-leaderboard-card', classId, filter);
  }

  jumpToStudentDossier(classId, seatNo) {
    if (window.appState) {
      window.appState.switchTab('student-dossier');
      if (window.studentDossierView) {
        window.studentDossierView.render('student-dossier-view', classId, seatNo);
      }
    }
  }

  // --- 2. MULTI-CLASS COMPARATIVE BENCHMARK & STRATEGY DASHBOARD ---
  renderMultiClassDashboard(container, classId) {
    const multi = this.stats.getMultiClassComparison();
    const sortedByAvg = [...multi.strategies].sort((a, b) => b.avgScore - a.avgScore);
    const topClass = sortedByAvg[0] || {};
    const mostEngagedClass = [...multi.strategies].sort((a, b) => b.avgEng - a.avgEng)[0] || {};

    container.innerHTML = `
      <!-- Sub-Tab Mode Switcher -->
      <div class="flex items-center justify-between gap-3 mb-5 p-2 rounded-2xl bg-white border border-pink-200 shadow-sm">
        <div class="flex items-center space-x-2">
          <button onclick="dashboardCharts.switchDashboardMode('single', '${classId}')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-200 transition flex items-center gap-1.5">
            <i data-lucide="user" class="w-4 h-4 text-pink-600"></i> 📌 單班深度診斷
          </button>
          <button onclick="dashboardCharts.switchDashboardMode('multi', '${classId}')" class="px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-pink-500 text-white shadow-md transition flex items-center gap-1.5">
            <i data-lucide="layers" class="w-4 h-4"></i> 🌐 跨班級橫向比較 & 作業教學建議
          </button>
        </div>

        <button onclick="dashboardCharts.copyTeachingStrategyReport()" class="px-3.5 py-1.5 rounded-xl bg-pink-100 text-pink-800 border border-pink-300 text-xs font-bold hover:bg-pink-200 transition flex items-center gap-1">
          <i data-lucide="copy" class="w-3.5 h-3.5"></i> 一鍵複製跨班教學決策報告
        </button>
      </div>

      <!-- Top Benchmark Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <!-- Top Average Class -->
        <div class="glass-card rounded-2xl p-4 border border-pink-200 bg-white">
          <div class="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>全校數理均分最高班級</span>
            <div class="sanrio-twinstars-badge !w-6 !h-6"></div>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl sm:text-3xl font-black text-blue-700">${topClass.className || '無'}</span>
            <span class="text-sm text-slate-600 font-bold">(${topClass.avgScore} 分)</span>
          </div>
          <p class="text-xs text-slate-500 mt-1">拔尖人數 ${topClass.topCount} 人，建議安排進階拓展作業</p>
        </div>

        <!-- Most Active / Disciplined Class -->
        <div class="glass-card rounded-2xl p-4 border border-pink-200 bg-white">
          <div class="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>課堂常規投入度最高班級</span>
            <div class="sanrio-kitty-badge !w-6 !h-6"></div>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl sm:text-3xl font-black text-emerald-700">${mostEngagedClass.className || '無'}</span>
            <span class="text-sm text-slate-600 font-bold">(+${mostEngagedClass.avgEng} 點)</span>
          </div>
          <p class="text-xs text-slate-500 mt-1">課堂互動主動，可多安排分組討論與發表</p>
        </div>

        <!-- Total Comparison Scope -->
        <div class="glass-card rounded-2xl p-4 border border-pink-200 bg-white">
          <div class="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>目前橫向比較範圍</span>
            <i data-lucide="globe" class="w-4 h-4 text-purple-500"></i>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl sm:text-3xl font-black text-purple-700">${multi.classList.length}</span>
            <span class="text-xs text-slate-500">個授課班級</span>
          </div>
          <p class="text-xs text-slate-500 mt-1">共統計 ${multi.classList.reduce((a,c) => a + c.studentCount, 0)} 位學生之量化數據</p>
        </div>
      </div>

      <!-- Multi-Class Comparison Charts (2 Columns) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Academic Average & Box Plot Comparison Bar Chart -->
        <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 bg-white shadow-sm">
          <h3 class="text-sm sm:text-base font-black flex items-center gap-2 mb-1 text-slate-800">
            <i data-lucide="bar-chart-3" class="w-4 h-4 text-blue-600"></i>
            各班數理學業均分與五數分佈橫向對比
          </h3>
          <p class="text-xs text-slate-500 mb-3 font-medium">各班小考均分（柱狀）與離散程度比較</p>
          <div class="relative h-72">
            <canvas id="chart-multiclass-academic"></canvas>
          </div>
        </div>

        <!-- Cross-Class 5-Dimension Radar Comparison -->
        <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 bg-white shadow-sm">
          <h3 class="text-sm sm:text-base font-black flex items-center gap-2 mb-1 text-slate-800">
            <i data-lucide="radar" class="w-4 h-4 text-purple-600"></i>
            各班五維度教育量化指標橫向雷達圖
          </h3>
          <p class="text-xs text-slate-500 mb-3 font-medium">數理能力、動機參與、作業責任感、常規紀律、同儕互動</p>
          <div class="relative h-72">
            <canvas id="chart-multiclass-radar"></canvas>
          </div>
        </div>
      </div>

      <!-- Differentiated Homework & Instructional Strategy Advisory Matrix Table -->
      <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 bg-white shadow-sm" id="strategy-report-container">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              📋 各班分層作業安排與教學策略改良建議戰術板
              <span class="kitty-bow"></span>
            </h3>
            <p class="text-xs text-slate-600 mt-0.5">根據各班學業基礎與常規專注力，系統自動給予客觀的因材施教分層策略</p>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm text-slate-800">
            <thead class="bg-pink-100 text-pink-900 uppercase text-xs font-black border-b border-pink-200">
              <tr>
                <th class="py-3 px-3.5">授課班級</th>
                <th class="py-3 px-3">學業均分</th>
                <th class="py-3 px-3">常規淨點</th>
                <th class="py-3 px-3.5">建議作業分層類型</th>
                <th class="py-3 px-4">作業題型與分量安排建議</th>
                <th class="py-3 px-4">課堂教學節奏與管理改良方向</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-pink-100">
              ${multi.strategies.map(s => `
                <tr class="hover:bg-pink-50/50 transition">
                  <td class="py-3.5 px-3.5 font-black text-slate-900 whitespace-nowrap">
                    <span class="text-base font-black">${s.className}</span>
                    <span class="block text-[10px] text-slate-500 font-bold">${s.type === 'homeroom' ? '導師班' : '科任班'} (${s.studentCount}人)</span>
                  </td>
                  <td class="py-3.5 px-3 font-black text-blue-700 text-sm">
                    ${s.avgScore} 分
                  </td>
                  <td class="py-3.5 px-3 font-black text-sm ${s.avgEng >= 0 ? 'text-emerald-700' : 'text-rose-700'}">
                    ${s.avgEng > 0 ? '+' : ''}${s.avgEng} 點
                  </td>
                  <td class="py-3.5 px-3.5 font-black whitespace-nowrap">
                    <span class="px-2.5 py-1 rounded-xl text-xs font-black ${s.avgScore >= 80 ? 'bg-purple-100 text-purple-900 border border-purple-300' : s.avgScore >= 70 ? 'bg-blue-100 text-blue-900 border border-blue-300' : 'bg-amber-100 text-amber-900 border border-amber-300'}">
                      ${s.hwLevel}
                    </span>
                  </td>
                  <td class="py-3.5 px-4 font-bold text-slate-800 text-xs sm:text-sm max-w-xs">
                    ${s.hwDetail}
                  </td>
                  <td class="py-3.5 px-4 font-medium text-slate-700 text-xs sm:text-sm max-w-sm">
                    ${s.teachingStyle}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    this.renderMultiClassAcademicChart('chart-multiclass-academic', multi);
    this.renderMultiClassRadarChart('chart-multiclass-radar', multi);
  }

  renderMultiClassAcademicChart(canvasId, multi) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this.destroyChart(canvasId);

    const labels = multi.strategies.map(s => s.className);
    const avgScores = multi.strategies.map(s => s.avgScore);
    const engPoints = multi.strategies.map(s => s.avgEng);

    this.chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: '數理小考均分 (分)',
            data: avgScores,
            backgroundColor: 'rgba(59, 130, 246, 0.75)',
            borderColor: '#2563eb',
            borderWidth: 2,
            borderRadius: 8,
            yAxisID: 'y'
          },
          {
            label: '課堂常規淨積分 (點)',
            data: engPoints,
            backgroundColor: 'rgba(255, 117, 143, 0.75)',
            borderColor: '#ff4d6d',
            borderWidth: 2,
            borderRadius: 8,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            min: 0,
            max: 100,
            title: { display: true, text: '學業均分 (分)', color: '#2563eb', font: { size: 11, weight: 'bold' } }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            title: { display: true, text: '常規積分 (點)', color: '#ff4d6d', font: { size: 11, weight: 'bold' } }
          }
        }
      }
    });
  }

  renderMultiClassRadarChart(canvasId, multi) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this.destroyChart(canvasId);

    const colors = [
      { bg: 'rgba(255, 77, 109, 0.2)', border: '#ff4d6d' },
      { bg: 'rgba(59, 130, 246, 0.2)', border: '#2563eb' },
      { bg: 'rgba(16, 185, 129, 0.2)', border: '#059669' },
      { bg: 'rgba(168, 85, 247, 0.2)', border: '#7c3aed' }
    ];

    const datasets = multi.classList.map((cls, idx) => {
      const ov = multi.classOverviews[cls.id];
      const profiles = ov.studentProfiles;

      const avgMath = Math.round(profiles.reduce((a, p) => a + (p.radar.mathAbility || 70), 0) / (profiles.length || 1));
      const avgMotiv = Math.round(profiles.reduce((a, p) => a + (p.radar.motivation || 70), 0) / (profiles.length || 1));
      const avgAcc = Math.round(profiles.reduce((a, p) => a + (p.radar.accountability || 70), 0) / (profiles.length || 1));
      const avgDisc = Math.round(profiles.reduce((a, p) => a + (p.radar.discipline || 70), 0) / (profiles.length || 1));
      const avgSoc = Math.round(profiles.reduce((a, p) => a + (p.radar.socialEmotional || 70), 0) / (profiles.length || 1));

      const color = colors[idx % colors.length];
      return {
        label: cls.name,
        data: [avgMath, avgMotiv, avgAcc, avgDisc, avgSoc],
        backgroundColor: color.bg,
        borderColor: color.border,
        borderWidth: 2,
        pointRadius: 4
      };
    });

    this.chartInstances[canvasId] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['數理學業', '學習動機', '作業責任感', '常規紀律', '同儕互動'],
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { display: false },
            pointLabels: { font: { size: 11, weight: 'bold' } }
          }
        }
      }
    });
  }

  copyTeachingStrategyReport() {
    const multi = this.stats.getMultiClassComparison();
    let report = `【跨班級教學診斷與分層作業安排決策報告】\n\n`;
    multi.strategies.forEach(s => {
      report += `📍 【${s.className} (${s.type === 'homeroom' ? '導師班' : '科任班'})】\n`;
      report += `• 數理學業均分：${s.avgScore} 分 | 常規淨積分：${s.avgEng > 0 ? '+' : ''}${s.avgEng} 點\n`;
      report += `• 建議作業分層：${s.hwLevel}\n`;
      report += `• 作業指派詳情：${s.hwDetail}\n`;
      report += `• 教學節奏改良：${s.teachingStyle}\n\n`;
    });

    navigator.clipboard.writeText(report);
    window.appState.showToast('已複製跨班教學決策報告至剪貼簿！', 'success');
  }

  renderQuadrantScatter(canvasId, overview, classId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this.destroyChart(canvasId);

    const dataPoints = overview.studentProfiles.map(p => ({
      x: p.scoreMean,
      y: p.pointsBreakdown.discipline + p.pointsBreakdown.conflict + p.pointsBreakdown.social,
      seatNo: p.student.seatNo,
      name: p.student.name
    }));

    this.chartInstances[canvasId] = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: '學生座標',
          data: dataPoints,
          backgroundColor: (context) => {
            const raw = context.raw;
            if (!raw) return '#ff758f';
            if (raw.x >= overview.classAvgScore && raw.y >= 0) return '#10b981';
            if (raw.x >= overview.classAvgScore && raw.y < 0) return '#38bdf8';
            if (raw.x < overview.classAvgScore && raw.y >= 0) return '#f59e0b';
            return '#f43f5e';
          },
          borderColor: 'rgba(255, 255, 255, 0.9)',
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 9
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (e, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            const pt = dataPoints[idx];
            matrixView.openStudentDetail(classId, pt.seatNo);
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const pt = context.raw;
                return `${String(pt.seatNo).padStart(2, '0')} 號 ${pt.name} (學業均分: ${pt.x}, 品格常規: ${pt.y > 0 ? '+' : ''}${pt.y})`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: '學業成績 (平均分)', color: '#64748b', font: { size: 11 } },
            min: 20,
            max: 100,
            grid: { color: 'rgba(255, 117, 143, 0.1)' }
          },
          y: {
            title: { display: true, text: '品格常規淨積分', color: '#64748b', font: { size: 11 } },
            grid: { color: 'rgba(255, 117, 143, 0.1)' }
          }
        }
      }
    });
  }

  renderScoreDistribution(canvasId, overview) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    this.destroyChart(canvasId);

    const scores = overview.studentProfiles.map(p => p.scoreMean);
    const bins = ['0-59 (需補救)', '60-69 (基礎)', '70-79 (穩健)', '80-89 (優良)', '90-100 (頂尖)'];
    const counts = [0, 0, 0, 0, 0];

    scores.forEach(s => {
      if (s < 60) counts[0]++;
      else if (s < 70) counts[1]++;
      else if (s < 80) counts[2]++;
      else if (s < 90) counts[3]++;
      else counts[4]++;
    });

    this.chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: bins,
        datasets: [{
          label: '人數',
          data: counts,
          backgroundColor: [
            'rgba(244, 63, 94, 0.7)',
            'rgba(245, 158, 11, 0.7)',
            'rgba(59, 130, 246, 0.7)',
            'rgba(16, 185, 129, 0.7)',
            'rgba(236, 72, 153, 0.7)'
          ],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
            grid: { color: 'rgba(255, 117, 143, 0.1)' }
          }
        }
      }
    });
  }

  renderStudentDetailCharts(radarCanvasId, ewmaCanvasId, profile) {
    const radarCtx = document.getElementById(radarCanvasId);
    if (radarCtx) {
      this.destroyChart(radarCanvasId);
      this.chartInstances[radarCanvasId] = new Chart(radarCtx, {
        type: 'radar',
        data: {
          labels: ['數理學業', '學習動機', '作業責任感', '常規紀律', '同儕互動'],
          datasets: [{
            label: '量化指標',
            data: [
              profile.radar.mathAbility,
              profile.radar.motivation,
              profile.radar.accountability,
              profile.radar.discipline,
              profile.radar.socialEmotional
            ],
            backgroundColor: 'rgba(255, 117, 143, 0.3)',
            borderColor: '#ff4d6d',
            pointBackgroundColor: '#c9184a',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#c9184a'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            r: {
              angleLines: { color: 'rgba(255, 117, 143, 0.2)' },
              grid: { color: 'rgba(255, 117, 143, 0.15)' },
              pointLabels: { color: '#475569', font: { size: 11, weight: '700' } },
              ticks: { display: false, min: 0, max: 100 }
            }
          }
        }
      });
    }

    const ewmaCtx = document.getElementById(ewmaCanvasId);
    if (ewmaCtx) {
      this.destroyChart(ewmaCanvasId);

      const labels = profile.assessmentList.map(a => a.name.split('：')[0] || a.date);
      this.chartInstances[ewmaCanvasId] = new Chart(ewmaCtx, {
        type: 'line',
        data: {
          labels: labels.length > 0 ? labels : ['無數據'],
          datasets: [
            {
              label: '原始小考分數',
              data: profile.rawScores,
              borderColor: 'rgba(148, 163, 184, 0.8)',
              backgroundColor: 'rgba(148, 163, 184, 0.2)',
              borderDash: [4, 4],
              pointRadius: 4,
              fill: false,
              tension: 0.1
            },
            {
              label: 'EWMA 平滑走勢線',
              data: profile.ewmaScores,
              borderColor: '#ff4d6d',
              backgroundColor: 'rgba(255, 117, 143, 0.15)',
              borderWidth: 3,
              pointRadius: 5,
              pointBackgroundColor: '#ff4d6d',
              fill: true,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#475569', font: { size: 11, weight: '600' } }
            }
          },
          scales: {
            x: { grid: { color: 'rgba(255, 117, 143, 0.1)' } },
            y: {
              min: 0,
              max: 100,
              grid: { color: 'rgba(255, 117, 143, 0.1)' }
            }
          }
        }
      });
    }
  }
}

// Global Dashboard Charts Instance
window.dashboardCharts = new DashboardCharts(window.appStore, window.statisticsEngine);

/**
 * Regular Grades, Exam Settlement, Historical Cumulative Archive & Behavior Analytics
 * Tab 2 (💯 平時成績): Pure classroom regular grading, per-class exam settlement (.xlsx),
 * cross-term historical archives, and behavior distribution charts (Zero quiz noise).
 */

class DashboardCharts {
  constructor(store, stats) {
    this.store = store;
    this.stats = stats;
    this.chartInstances = {};
    this.gradesSubTab = 'grades'; // 'grades' | 'history' | 'analytics'
    this.currentViewMode = 'single'; // 'single' | 'multi' (inside analytics)
    this.leaderboardFilter = 'all'; // 'all' | 'M' | 'F'
    this.leaderboardSort = 'rank';  // 'rank' | 'seat'
    this.lastClassId = '801';
  }

  destroyChart(chartId) {
    if (this.chartInstances[chartId]) {
      this.chartInstances[chartId].destroy();
      delete this.chartInstances[chartId];
    }
  }

  setGradesSubTab(subTab, classId) {
    const valid = ['grades', 'history', 'analytics'];
    this.gradesSubTab = valid.includes(subTab) ? subTab : 'grades';
    this.renderClassDashboard('dashboard-view', classId || this.lastClassId);
  }

  switchDashboardMode(mode, classId) {
    this.gradesSubTab = 'analytics';
    this.currentViewMode = mode === 'multi' ? 'multi' : 'single';
    this.renderClassDashboard('dashboard-view', classId || this.lastClassId);
  }

  renderClassDashboard(containerId, classId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.lastClassId = classId || window.appState?.currentClassId || Object.keys(this.store.getClasses())[0] || '801';
    const cls = this.store.getClass(this.lastClassId);
    if (!cls) {
      container.innerHTML = `<div class="p-10 text-center text-slate-500 font-bold">目前尚無班級資料，請先至「👥 班級與學生」建立名單</div>`;
      return;
    }

    const isOAA = (this.store ? this.store.getTheme() : 'kitty') === 'oaa';
    const displayClassName = this.store.getClassQualifiedName ? this.store.getClassQualifiedName(this.lastClassId) : cls.name;
    const overview = this.stats.getClassOverview(this.lastClassId);
    const cfg = this.store.getRegularGradeConfig ? this.store.getRegularGradeConfig() : { baseScore: 80, pointsPerUnit: 1, minScore: 0, maxScore: 100 };
    const nextTermLabel = this.store.getDefaultTermLabel ? this.store.getDefaultTermLabel(this.lastClassId) : '第 1 次段考';
    const archives = this.store.getTermArchives ? this.store.getTermArchives(this.lastClassId) : [];
    const activeEventCount = (this.store.getEvents(this.lastClassId) || []).length;

    const heroHtml = `
      <!-- Term Settlement & Formula Hero Card -->
      <div class="rounded-3xl p-4 sm:p-6 mb-5 border-2 shadow-sm ${isOAA ? 'bg-gradient-to-br from-[#270e1c] via-[#1c0813] to-[#2e1121] border-amber-500/50 text-white' : 'glass-card border-pink-200 bg-gradient-to-r from-pink-50/90 via-white to-sky-50/80 text-slate-900'}">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b ${isOAA ? 'border-amber-500/30' : 'border-pink-200/80'}">
          <div class="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            ${isOAA ? `<div class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-[#2b0918] via-[#17050e] to-[#3b1024] flex items-center justify-center shadow-[0_4px_16px_rgba(245,158,11,0.25)] border border-amber-400/75 ring-1 ring-inset ring-amber-300/20 shrink-0">${window.cqGradeCrestSvg ? window.cqGradeCrestSvg('w-7 h-7 sm:w-8 sm:h-8') : ''}</div>` : '<div class="sanrio-twinstars-badge !w-10 !h-10 sm:!w-12 sm:!h-12 shrink-0"></div>'}
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-base sm:text-2xl font-black ${isOAA ? 'text-amber-200' : 'text-slate-900'}">${displayClassName} • 平時成績結算中心</h2>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-black whitespace-nowrap shrink-0 ${isOAA ? 'bg-amber-950 text-amber-300 border border-amber-400/60' : 'bg-pink-100 text-pink-800 border border-pink-300'}">
                  📅 ${nextTermLabel} 計算中
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-1.5 mt-2 text-xs font-bold">
                <span class="px-2.5 py-0.5 rounded-lg whitespace-nowrap tabular-nums ${isOAA ? 'bg-amber-950/75 text-amber-200 border border-amber-400/45' : 'bg-blue-50 text-blue-800 border border-blue-200'}">
                  均分 <strong class="font-mono font-black ${isOAA ? 'text-amber-300' : 'text-blue-700'}">${overview.classAvgScore}</strong> 分
                </span>
                <span class="px-2.5 py-0.5 rounded-lg whitespace-nowrap tabular-nums ${isOAA ? 'bg-black/35 text-slate-200 border border-amber-500/25' : 'bg-pink-50 text-pink-800 border border-pink-200'}">
                  本期 <strong class="font-mono font-black">${activeEventCount}</strong> 筆點記
                </span>
                <span class="px-2.5 py-0.5 rounded-lg whitespace-nowrap tabular-nums ${isOAA ? 'bg-black/35 text-slate-200 border border-amber-500/25' : 'bg-slate-100 text-slate-700 border border-slate-200'}">
                  已封存 <strong class="font-mono font-black">${archives.length}</strong> 次段考
                </span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
            <button type="button" onclick="dashboardCharts.exportPreviewExcel('${this.lastClassId}')" class="min-h-[44px] w-full md:w-auto justify-center px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${isOAA ? 'bg-[#1a0812] hover:bg-[#2c0e1e] text-cyan-300 border border-cyan-500/50' : 'bg-white hover:bg-sky-50 text-sky-800 border border-sky-300'}" title="只下載目前成績與明細 Excel，不會重置分數">
              <span>📥</span><span>匯出進度 Excel</span>
            </button>
            <button type="button" id="open-settle-term-btn" onclick="dashboardCharts.openSettleTermModal('${this.lastClassId}')" class="min-h-[44px] w-full md:w-auto justify-center px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 ${isOAA ? 'bg-gradient-to-r from-amber-600 to-rose-700 hover:from-amber-500 hover:to-rose-600 text-white border border-amber-400/70' : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white'}" title="下載 Excel 並歸檔重置本班進入下一次段考">
              <span>🎓</span><span>結算「${nextTermLabel}」並下載 Excel</span>
            </button>
          </div>
        </div>

        <!-- Inline Editable Regular Grade Formula Strip -->
        <div class="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex flex-wrap items-center gap-2 sm:gap-3 font-bold ${isOAA ? 'text-amber-200/90' : 'text-slate-700'}">
            <span class="${isOAA ? 'text-amber-300' : 'text-pink-700'} font-black">⚖️ 計分公式：</span>
            <label class="flex items-center gap-1">
              <span>開期基準</span>
              <input id="grade-cfg-base" type="number" step="1" value="${cfg.baseScore}" class="w-16 sm:w-14 px-2 py-1 rounded-lg border text-center font-mono font-black ${isOAA ? 'bg-[#16060f] border-amber-500/50 text-amber-200' : 'bg-white border-pink-300 text-slate-900'}">
              <span>分</span>
            </label>
            <label class="flex items-center gap-1">
              <span>+ 淨點 ×</span>
              <input id="grade-cfg-unit" type="number" step="0.5" min="0.5" value="${cfg.pointsPerUnit}" class="w-16 sm:w-14 px-2 py-1 rounded-lg border text-center font-mono font-black ${isOAA ? 'bg-[#16060f] border-amber-500/50 text-amber-200' : 'bg-white border-pink-300 text-slate-900'}">
            </label>
            <label class="flex items-center gap-1">
              <span>範圍</span>
              <input id="grade-cfg-min" type="number" value="${cfg.minScore}" class="w-14 sm:w-12 px-1.5 py-1 rounded-lg border text-center font-mono font-black ${isOAA ? 'bg-[#16060f] border-amber-500/50 text-amber-200' : 'bg-white border-pink-300 text-slate-900'}">
              <span>~</span>
              <input id="grade-cfg-max" type="number" value="${cfg.maxScore}" class="w-16 sm:w-14 px-1.5 py-1 rounded-lg border text-center font-mono font-black ${isOAA ? 'bg-[#16060f] border-amber-500/50 text-amber-200' : 'bg-white border-pink-300 text-slate-900'}">
            </label>
            <button type="button" onclick="dashboardCharts.updateFormulaFromUI('${this.lastClassId}')" class="min-h-[36px] px-3 py-1.5 rounded-lg font-black transition cursor-pointer ${isOAA ? 'bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/50' : 'bg-pink-100 hover:bg-pink-200 text-pink-800 border border-pink-300'}">
              套用規則
            </button>
          </div>
          <span class="text-[11px] ${isOAA ? 'text-amber-300/70' : 'text-slate-500'} font-medium">
            僅針對當前「${cls.name}」個別結算與歸零，其他班級完全獨立保留
          </span>
        </div>
      </div>

      <!-- Tab 2 Sub-Navigation Pills -->
      <div class="mb-5 p-1.5 rounded-2xl border shadow-sm flex flex-wrap items-stretch sm:items-center gap-1.5 ${isOAA ? 'bg-[#1d0a15] border-amber-500/40' : 'glass-card border-pink-200 bg-white'}">
        <button type="button" data-grades-subtab="grades" onclick="dashboardCharts.setGradesSubTab('grades', '${this.lastClassId}')" class="subtab-pill-btn flex-auto sm:flex-none whitespace-nowrap min-h-[40px] px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center text-center gap-1.5 leading-tight cursor-pointer ${this.gradesSubTab === 'grades' ? 'subtab-active' : ''}">
          <span>📋</span><span>平時成績與排行</span>
        </button>
        <button type="button" data-grades-subtab="history" onclick="dashboardCharts.setGradesSubTab('history', '${this.lastClassId}')" class="subtab-pill-btn flex-auto sm:flex-none whitespace-nowrap min-h-[40px] px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center text-center gap-1.5 leading-tight cursor-pointer ${this.gradesSubTab === 'history' ? 'subtab-active' : ''}">
          <span>📜</span><span>歷史段考 (${archives.length})</span>
        </button>
        <button type="button" data-grades-subtab="analytics" onclick="dashboardCharts.setGradesSubTab('analytics', '${this.lastClassId}')" class="subtab-pill-btn flex-auto sm:flex-none whitespace-nowrap min-h-[40px] px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center text-center gap-1.5 leading-tight cursor-pointer ${this.gradesSubTab === 'analytics' ? 'subtab-active' : ''}">
          <span>📊</span><span>表現分析圖表</span>
        </button>
      </div>

      <div id="grades-subtab-body"></div>
    `;

    container.innerHTML = heroHtml;

    const bodyEl = document.getElementById('grades-subtab-body');
    if (this.gradesSubTab === 'history') {
      this.renderHistoryView(bodyEl, this.lastClassId, isOAA);
    } else if (this.gradesSubTab === 'analytics') {
      if (this.currentViewMode === 'multi') {
        this.renderMultiClassDashboard(bodyEl, this.lastClassId);
      } else {
        this.renderSingleClassDashboard(bodyEl, this.lastClassId);
      }
    } else {
      this.renderGradesTableAndLeaderboard(bodyEl, this.lastClassId, isOAA);
    }

    if (window.lucide) window.lucide.createIcons();
  }

  updateFormulaFromUI(classId) {
    const baseScore = Number(document.getElementById('grade-cfg-base')?.value);
    const pointsPerUnit = Number(document.getElementById('grade-cfg-unit')?.value);
    const minScore = Number(document.getElementById('grade-cfg-min')?.value);
    const maxScore = Number(document.getElementById('grade-cfg-max')?.value);
    if (!Number.isFinite(baseScore) || !Number.isFinite(pointsPerUnit) || pointsPerUnit <= 0) {
      window.appState?.showToast('請輸入有效的基準分與正數點數權重！', 'warning');
      return;
    }
    this.store.updateRegularGradeConfig({ baseScore, pointsPerUnit, minScore, maxScore });
    window.appState?.showToast(`✅ 已更新平時成績計算規則（基準 ${baseScore} 分，每點 ×${pointsPerUnit}）`, 'success');
    this.renderClassDashboard('dashboard-view', classId);
  }

  exportPreviewExcel(classId) {
    const built = this.store.exportClassTermWorkbook(classId, null, true);
    window.appState?.showToast(`📥 已匯出 Excel 進度表：${built.filename}`, 'success');
  }

  openSettleTermModal(classId) {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const cls = this.store.getClass(classId);
    const displayClassName = this.store.getClassQualifiedName ? this.store.getClassQualifiedName(classId) : (cls ? cls.name : classId);
    const defaultLabel = this.store.getDefaultTermLabel ? this.store.getDefaultTermLabel(classId) : '第 1 次段考';
    const activeEventCount = (this.store.getEvents(classId) || []).length;
    const overview = this.stats.getClassOverview(classId);
    const isOAA = (this.store ? this.store.getTheme() : 'kitty') === 'oaa';

    modalContent.innerHTML = `
      <div class="p-5 sm:p-6 animate-fade-in-up ${isOAA ? 'bg-[#1f0a16] text-white' : 'bg-white text-slate-900'}">
        <div class="flex items-center justify-between pb-3 mb-4 border-b ${isOAA ? 'border-amber-500/40' : 'border-pink-200'}">
          <div class="flex items-center gap-2.5">
            <span class="text-2xl">🎓</span>
            <div>
              <h3 class="text-base sm:text-lg font-black ${isOAA ? 'text-amber-300' : 'text-slate-900'}">
                結算「${displayClassName}」本期平時成績
              </h3>
              <p class="text-xs ${isOAA ? 'text-amber-200/70' : 'text-slate-500'}">一鍵下載 Excel 並封存歷史累積成績，迎接下一次段考</p>
            </div>
          </div>
          <button type="button" onclick="appState.closeModal()" class="w-8 h-8 rounded-full flex items-center justify-center font-black cursor-pointer ${isOAA ? 'bg-rose-950 text-amber-300 hover:bg-rose-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">✕</button>
        </div>

        <div class="space-y-4 text-xs sm:text-sm">
          <div>
            <label class="block font-black mb-1.5 ${isOAA ? 'text-amber-200' : 'text-slate-800'}">本次段考期別名稱（將寫入 Excel 檔名與歷史紀錄）：</label>
            <input id="settle-term-label-input" type="text" value="${defaultLabel}" placeholder="例如：第 1 次段考" class="w-full px-3.5 py-2.5 rounded-xl border font-bold text-sm focus:outline-none ${isOAA ? 'bg-[#14050d] border-amber-500/60 text-white focus:border-amber-400' : 'bg-pink-50/40 border-pink-300 text-slate-900 focus:border-pink-500'}">
          </div>

          <div class="p-3.5 rounded-2xl border space-y-1.5 text-xs ${isOAA ? 'bg-[#2a0e1e] border-amber-500/40 text-amber-100' : 'bg-amber-50 border-amber-200 text-amber-900'}">
            <p class="font-black">📋 結算前確認摘要（僅影響「${displayClassName}」）：</p>
            <p>• 目前班級平時均分：<strong>${overview.classAvgScore} 分</strong>（共 ${overview.totalStudents} 位學生，本期 ${activeEventCount} 筆點記明細）</p>
            <p>• 系統將自動建立備份快照並立即下載 <strong>${displayClassName}_${defaultLabel}_平時成績.xlsx</strong></p>
            <p>• 「歷史累積淨分」與本期全部明細會完整封存於「歷史段考與累積」，接著將本班本期加減點歸零，開啟下一次段考計算。</p>
            ${activeEventCount === 0 ? `<p class="font-black ${isOAA ? 'text-rose-300' : 'text-rose-700'}">⚠️ 提醒：本班本期目前尚無任何加減分點記（所有人為基準分），確定仍要建立此次段考封存嗎？</p>` : ''}
          </div>
        </div>

        <div class="mt-5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button type="button" onclick="appState.closeModal()" class="w-full sm:w-auto whitespace-nowrap px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm cursor-pointer ${isOAA ? 'bg-[#2b0f1f] text-amber-200 border border-amber-500/40' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
            先不結算
          </button>
          <button type="button" id="confirm-settle-term-btn" onclick="dashboardCharts.confirmSettleTerm('${classId}')" class="w-full sm:w-auto whitespace-nowrap px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm text-white shadow-md cursor-pointer ${isOAA ? 'bg-gradient-to-r from-amber-600 to-rose-700 border border-amber-400' : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700'}">
            ✅ 確認結算並下載 Excel
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  confirmSettleTerm(classId) {
    const input = document.getElementById('settle-term-label-input');
    const customLabel = input ? input.value.trim() : '';
    const res = this.store.settleClassTerm(classId, customLabel);
    if (!res || !res.success) {
      window.appState?.showToast(res?.error || '結算失敗，請檢查班級資料', 'error');
      return;
    }

    const exported = this.store.exportClassTermWorkbook(classId, res.archive, true);
    window.appState?.closeModal();
    window.appState?.showToast(
      `🎓 已完成「${res.archive.className} ${res.archive.termLabel}」結算并下載 ${exported.filename}！已重置本期進入下次段考`,
      'success'
    );
    this.gradesSubTab = 'history';
    this.renderClassDashboard('dashboard-view', classId);
  }

  downloadArchiveExcel(classId, archiveId) {
    const archives = this.store.getTermArchives ? this.store.getTermArchives(classId) : [];
    const target = archives.find(a => a.id === archiveId);
    if (!target) {
      window.appState?.showToast('找不到該筆歷史段考檔案', 'warning');
      return;
    }
    const built = this.store.exportClassTermWorkbook(classId, target, true);
    window.appState?.showToast(`📥 已重新下載：${built.filename}`, 'success');
  }

  // --- Sub-Tab A: Regular Grades Table & Leaderboard ---
  renderGradesTableAndLeaderboard(container, classId, isOAA) {
    if (!container) return;
    const fullList = this.store.getClassLeaderboard ? this.store.getClassLeaderboard(classId) : [];
    const currentFilter = this.leaderboardFilter || 'all';
    const sortBy = this.leaderboardSort || 'rank';

    let displayList = [...fullList];
    if (currentFilter === 'M') displayList = displayList.filter(s => s.gender === 'M');
    else if (currentFilter === 'F') displayList = displayList.filter(s => s.gender === 'F');

    if (sortBy === 'seat') {
      displayList.sort((a, b) => Number(a.seatNo) - Number(b.seatNo));
    }

    const maleCount = fullList.filter(s => s.gender === 'M').length;
    const femaleCount = fullList.filter(s => s.gender === 'F').length;
    const tierBadgeClass = (tier) => {
      if (isOAA) {
        if (tier === 'S') return 'bg-amber-500 text-black border border-amber-200';
        if (tier === 'A') return 'bg-cyan-900 text-cyan-200 border border-cyan-400';
        if (tier === 'B') return 'bg-emerald-950 text-emerald-300 border border-emerald-500/60';
        if (tier === 'C') return 'bg-amber-950 text-amber-300 border border-amber-600/60';
        return 'bg-rose-950 text-rose-300 border border-rose-500';
      }
      if (tier === 'S') return 'bg-amber-100 text-amber-900 border border-amber-300';
      if (tier === 'A') return 'bg-sky-100 text-sky-900 border border-sky-300';
      if (tier === 'B') return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
      if (tier === 'C') return 'bg-orange-100 text-orange-800 border border-orange-300';
      return 'bg-rose-100 text-rose-800 border border-rose-300';
    };

    container.innerHTML = `
      <div class="rounded-3xl p-4 sm:p-6 border shadow-sm mb-6 ${isOAA ? 'bg-[#240d1a] border-2 border-amber-500/50 text-white' : 'glass-card border-pink-200 bg-white text-slate-900'}">
        <!-- Toolbar -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b ${isOAA ? 'border-amber-500/30' : 'border-pink-100'}">
          <div>
            <h3 class="text-base sm:text-lg font-black flex items-center gap-2 ${isOAA ? 'text-amber-200' : 'text-slate-900'}">
              <span>🏆 平時成績一覽表 & 班級排行</span>
              <span class="text-xs px-2.5 py-0.5 rounded-full font-bold ${isOAA ? 'bg-amber-950 text-amber-300 border border-amber-500/40' : 'bg-pink-100 text-pink-700'}">共 ${fullList.length} 人</span>
            </h3>
            <p class="text-xs ${isOAA ? 'text-amber-300/75' : 'text-slate-500'} font-medium mt-0.5">
              可依座號填寫成績或依排名檢視 • 點擊學生列可查看詳情與歷次加減分紀錄
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <!-- Sort Toggle -->
            <div class="inline-flex rounded-xl p-1 border ${isOAA ? 'bg-[#170610] border-amber-500/40' : 'bg-slate-100 border-slate-200'} text-xs font-bold">
              <button type="button" onclick="dashboardCharts.setLeaderboardSort('${classId}', 'rank')" class="px-2.5 py-1 rounded-lg transition cursor-pointer ${sortBy === 'rank' ? (isOAA ? 'bg-amber-500 text-black font-black' : 'bg-white text-pink-700 shadow-sm font-black') : (isOAA ? 'text-amber-200/70' : 'text-slate-600')}">🏅 依成績排名</button>
              <button type="button" onclick="dashboardCharts.setLeaderboardSort('${classId}', 'seat')" class="px-2.5 py-1 rounded-lg transition cursor-pointer ${sortBy === 'seat' ? (isOAA ? 'bg-amber-500 text-black font-black' : 'bg-white text-pink-700 shadow-sm font-black') : (isOAA ? 'text-amber-200/70' : 'text-slate-600')}">🔢 依座號順序</button>
            </div>
          </div>
        </div>

        <!-- Gender Filter Pills -->
        <div class="grid grid-cols-3 gap-1.5 p-1 rounded-2xl mb-4 ${isOAA ? 'bg-[#1a0713] border border-amber-500/40' : 'bg-pink-50 border border-pink-200'}">
          <button type="button" onclick="dashboardCharts.setLeaderboardFilter('${classId}', 'all')" class="py-1.5 px-2 rounded-xl text-xs font-black transition cursor-pointer ${currentFilter === 'all' ? (isOAA ? 'bg-amber-500 text-[#1a0713] shadow' : 'bg-pink-500 text-white shadow') : (isOAA ? 'text-amber-200/80' : 'text-slate-600')}">
            全部 (${fullList.length})
          </button>
          <button type="button" onclick="dashboardCharts.setLeaderboardFilter('${classId}', 'M')" class="py-1.5 px-2 rounded-xl text-xs font-black transition cursor-pointer ${currentFilter === 'M' ? 'bg-blue-600 text-white shadow' : (isOAA ? 'text-blue-300' : 'text-slate-600')}">
            👦 男 (${maleCount})
          </button>
          <button type="button" onclick="dashboardCharts.setLeaderboardFilter('${classId}', 'F')" class="py-1.5 px-2 rounded-xl text-xs font-black transition cursor-pointer ${currentFilter === 'F' ? (isOAA ? 'bg-rose-600 text-white shadow' : 'bg-pink-600 text-white shadow') : (isOAA ? 'text-pink-300' : 'text-slate-600')}">
            👧 女 (${femaleCount})
          </button>
        </div>

        <!-- Responsive Grades Table -->
        ${displayList.length === 0 ? `
          <div class="text-center py-10 text-xs font-bold opacity-60">此篩選條件下尚無學生資料</div>
        ` : `
          <div class="overflow-x-auto">
            <table class="w-full min-w-full text-left text-xs sm:text-sm">
              <thead class="text-[11px] sm:text-xs font-black uppercase border-b ${isOAA ? 'bg-[#1a0710] text-amber-300 border-amber-500/30' : 'bg-pink-50/90 text-pink-900 border-pink-200'}">
                <tr>
                  <th class="py-2.5 px-1.5 sm:px-2.5 text-center whitespace-nowrap">名次</th>
                  <th class="py-2.5 px-1.5 sm:px-2.5 whitespace-nowrap">座號 / 姓名</th>
                  <th class="py-2.5 px-1.5 sm:px-2.5 text-right whitespace-nowrap"><span class="sm:hidden">加減點</span><span class="hidden sm:inline">本期加減點</span></th>
                  <th class="py-2.5 px-1.5 sm:px-2.5 text-center whitespace-nowrap"><span class="sm:hidden">平時分</span><span class="hidden sm:inline">本期平時成績</span></th>
                  <th class="py-2.5 px-1.5 sm:px-2.5 text-center whitespace-nowrap">等第</th>
                  <th class="py-2.5 px-2.5 text-right whitespace-nowrap hidden sm:table-cell">歷史累積淨分</th>
                </tr>
              </thead>
              <tbody class="divide-y ${isOAA ? 'divide-amber-500/20' : 'divide-pink-100'}">
                ${displayList.map(item => {
                  const shownRank = currentFilter === 'all' ? item.overallRank : item.genderRank;
                  const rankBadge = shownRank === 1 ? '🥇' : shownRank === 2 ? '🥈' : shownRank === 3 ? '🥉' : `#${shownRank}`;
                  const medalRowCls = shownRank === 1
                    ? (isOAA ? 'bg-amber-500/[0.08] border-l-2 border-l-amber-400' : 'bg-amber-50/55 border-l-2 border-l-amber-400')
                    : shownRank === 2
                    ? (isOAA ? 'bg-slate-200/[0.05] border-l-2 border-l-slate-300' : 'bg-slate-50/75 border-l-2 border-l-slate-300')
                    : shownRank === 3
                    ? (isOAA ? 'bg-orange-400/[0.06] border-l-2 border-l-amber-600' : 'bg-orange-50/45 border-l-2 border-l-amber-600')
                    : '';
                  return `
                    <tr onclick="dashboardCharts.jumpToStudentDossier('${classId}', ${item.seatNo})" class="cursor-pointer transition ${medalRowCls} ${isOAA ? 'hover:bg-[#381328]' : 'hover:bg-pink-50/70'}">
                      <td class="py-2.5 px-1.5 sm:px-2.5 text-center font-mono font-black tabular-nums whitespace-nowrap">${rankBadge}</td>
                      <td class="py-2.5 px-1.5 sm:px-2.5 font-black whitespace-nowrap">
                        <div class="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
                          <span class="px-1.5 py-0.5 rounded font-mono text-[11px] tabular-nums shrink-0 ${item.gender === 'F' ? (isOAA ? 'bg-pink-950 text-pink-300' : 'bg-pink-100 text-pink-700') : (isOAA ? 'bg-blue-950 text-cyan-300' : 'bg-blue-100 text-blue-700')}">${String(item.seatNo).padStart(2, '0')}</span>
                          <span class="whitespace-nowrap">${item.name}</span>
                        </div>
                      </td>
                      <td class="py-2.5 px-1.5 sm:px-2.5 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                        <span class="${item.netDelta > 0 ? (isOAA ? 'text-emerald-300' : 'text-emerald-700') : item.netDelta < 0 ? (isOAA ? 'text-rose-400' : 'text-rose-700') : 'opacity-60'}">
                          ${item.netDelta > 0 ? '+' : ''}${item.netDelta}<span class="hidden sm:inline"> 點</span>
                        </span>
                        <span class="block text-[10px] opacity-65 tabular-nums">+${item.positivePts}/${item.negativePts}</span>
                      </td>
                      <td class="py-2.5 px-1.5 sm:px-2.5 text-center font-mono tabular-nums whitespace-nowrap">
                        <div>
                          <span class="text-sm sm:text-base font-black ${isOAA ? 'text-amber-300' : 'text-blue-700'}">${item.regularScore}</span>
                          <span class="text-[11px] opacity-70 hidden sm:inline">分</span>
                        </div>
                        ${item.settledTermCount > 0 ? `<span class="block sm:hidden text-[10px] opacity-75 mt-0.5">均${item.allTermsAvgRegularScore}</span>` : `<span class="block sm:hidden text-[10px] opacity-65 mt-0.5">累${item.totalCumulativeNetDelta >= 0 ? '+' : ''}${item.totalCumulativeNetDelta}</span>`}
                      </td>
                      <td class="py-2.5 px-1.5 sm:px-2.5 text-center whitespace-nowrap">
                        <span class="inline-block min-w-[24px] sm:min-w-[26px] px-1.5 sm:px-2 py-0.5 rounded-lg text-xs font-black ${tierBadgeClass(item.tier)}">${item.tier}</span>
                      </td>
                      <td class="py-2.5 px-2.5 text-right font-mono font-bold tabular-nums whitespace-nowrap hidden sm:table-cell">
                        <span class="${item.totalCumulativeNetDelta >= 0 ? (isOAA ? 'text-emerald-300' : 'text-emerald-700') : (isOAA ? 'text-rose-400' : 'text-rose-700')}">
                          ${item.totalCumulativeNetDelta >= 0 ? '+' : ''}${item.totalCumulativeNetDelta} 點
                        </span>
                        ${item.settledTermCount > 0 ? `<span class="block text-[10px] opacity-65">跨期均 ${item.allTermsAvgRegularScore} 分</span>` : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  setLeaderboardFilter(classId, filter) {
    this.leaderboardFilter = filter;
    this.renderClassDashboard('dashboard-view', classId);
  }

  setLeaderboardSort(classId, sortBy) {
    this.leaderboardSort = sortBy === 'seat' ? 'seat' : 'rank';
    this.renderClassDashboard('dashboard-view', classId);
  }

  jumpToStudentDossier(classId, seatNo) {
    if (window.appState) {
      window.appState.switchTab('students');
      window.appState.switchStudentsSubTab('student-dossier', seatNo);
      if (window.studentDossierView) {
        window.studentDossierView.render('student-dossier-view', classId, seatNo);
      }
    }
  }

  // --- Sub-Tab B: Settled Exam Archives & Cross-Term Cumulative Scores ---
  renderHistoryView(container, classId, isOAA) {
    if (!container) return;
    const cls = this.store.getClass(classId);
    const displayClassName = this.store.getClassQualifiedName ? this.store.getClassQualifiedName(classId) : (cls ? cls.name : classId);
    const archives = this.store.getTermArchives ? this.store.getTermArchives(classId) : [];
    const leaderboard = this.store.getClassLeaderboard ? this.store.getClassLeaderboard(classId) : [];
    const rowsBySeat = [...leaderboard].sort((a, b) => Number(a.seatNo) - Number(b.seatNo));

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Settled Term Snapshots Cards -->
        <div class="rounded-3xl p-5 sm:p-6 border shadow-sm ${isOAA ? 'bg-[#240d1a] border-2 border-amber-500/50 text-white' : 'glass-card border-pink-200 bg-white text-slate-900'}">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b ${isOAA ? 'border-amber-500/30' : 'border-pink-100'}">
            <div>
              <h3 class="text-base sm:text-lg font-black ${isOAA ? 'text-amber-200' : 'text-slate-900'}">
                🗂️ ${displayClassName} 已結算段考紀錄庫
              </h3>
              <p class="text-xs ${isOAA ? 'text-amber-200/70' : 'text-slate-500'}">每次結算後永久封存全班成績與點記明細，隨時可重新匯出 Excel</p>
            </div>
          </div>

          ${archives.length === 0 ? `
            <div class="p-8 text-center rounded-2xl border border-dashed ${isOAA ? 'border-amber-500/30 text-amber-200/70' : 'border-pink-200 text-slate-500'} text-xs sm:text-sm">
              <p class="font-bold mb-1">尚未有已結算的段考紀錄</p>
              <p>待第 1 次段考結束時，點擊上方「🎓 結算第 1 次段考並下載 Excel」，系統會在此永久保留歷次成績與歷史累積分數！</p>
            </div>
          ` : `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              ${archives.map(arch => `
                <div class="p-4 rounded-2xl border flex flex-col justify-between gap-3 ${isOAA ? 'bg-[#1a0812] border-amber-500/40' : 'bg-pink-50/40 border-pink-200'}">
                  <div>
                    <div class="flex items-center justify-between gap-2 mb-1">
                      <span class="px-2.5 py-0.5 rounded-full text-xs font-black ${isOAA ? 'bg-amber-900 text-amber-200' : 'bg-pink-100 text-pink-800'}">
                        ${arch.termLabel}
                      </span>
                      <span class="text-[11px] font-mono opacity-70">${(arch.settledAt || '').slice(0, 10)}</span>
                    </div>
                    <div class="mt-2 text-xs space-y-1 font-medium">
                      <div>全班平均：<strong class="text-base font-black ${isOAA ? 'text-amber-300' : 'text-blue-700'}">${arch.summary?.classAvgRegularScore ?? 80}</strong> 分</div>
                      <div class="opacity-80">學生 ${arch.summary?.studentCount ?? 0} 人 • 封存 ${arch.summary?.totalEventCount ?? 0} 筆課堂紀錄</div>
                    </div>
                  </div>
                  <button type="button" onclick="dashboardCharts.downloadArchiveExcel('${classId}', '${arch.id}')" class="w-full py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${isOAA ? 'bg-[#2c0e1e] hover:bg-[#3f142b] text-amber-300 border border-amber-500/50' : 'bg-white hover:bg-pink-100 text-pink-800 border border-pink-300'}">
                    <span>📥</span><span>重新下載該次 Excel</span>
                  </button>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Cross-Term Cumulative Scoreboard -->
        <div class="rounded-3xl p-5 sm:p-6 border shadow-sm ${isOAA ? 'bg-[#240d1a] border-2 border-amber-500/50 text-white' : 'glass-card border-pink-200 bg-white text-slate-900'}">
          <h3 class="text-base sm:text-lg font-black mb-1 ${isOAA ? 'text-amber-200' : 'text-slate-900'}">
            📜 全班歷史段考成績 & 累積分數總覽
          </h3>
          <p class="text-xs ${isOAA ? 'text-amber-200/70' : 'text-slate-500'} mb-4">跨段考追蹤每位學生平時表現變化與總累積淨點數（不隨段考歸零而遺失）</p>

          <div class="overflow-x-auto -mx-2 sm:mx-0">
            <table class="w-full min-w-[520px] text-left text-xs sm:text-sm">
              <thead class="text-[11px] sm:text-xs font-black border-b ${isOAA ? 'bg-[#1a0710] text-amber-300 border-amber-500/30' : 'bg-pink-50 text-pink-900 border-pink-200'}">
                <tr>
                  <th class="py-2.5 px-2 w-[48px] min-w-[48px] max-w-[48px] whitespace-nowrap sticky left-0 z-20 ${isOAA ? 'bg-[#1a0710]' : 'bg-pink-50'}">座號</th>
                  <th class="py-2.5 px-2.5 whitespace-nowrap sticky left-[48px] z-20 ${isOAA ? 'bg-[#1a0710]' : 'bg-pink-50'} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.12)]">姓名</th>
                  ${archives.map(a => `<th class="py-2.5 px-2.5 text-center whitespace-nowrap">${a.termLabel}</th>`).join('')}
                  <th class="py-2.5 px-2.5 text-center whitespace-nowrap">本期進行中</th>
                  <th class="py-2.5 px-2.5 text-right whitespace-nowrap">歷次均分</th>
                  <th class="py-2.5 px-2.5 text-right whitespace-nowrap">歷史總累積淨分</th>
                </tr>
              </thead>
              <tbody class="divide-y ${isOAA ? 'divide-amber-500/20' : 'divide-pink-100'}">
                ${rowsBySeat.map(item => `
                  <tr onclick="dashboardCharts.jumpToStudentDossier('${classId}', ${item.seatNo})" class="cursor-pointer transition ${isOAA ? 'hover:bg-[#381328]' : 'hover:bg-pink-50/70'}">
                    <td class="py-2.5 px-2 w-[48px] min-w-[48px] max-w-[48px] whitespace-nowrap sticky left-0 z-10 font-mono font-bold ${isOAA ? 'bg-[#240d1a]' : 'bg-white'}">${String(item.seatNo).padStart(2, '0')}</td>
                    <td class="py-2.5 px-2.5 font-black whitespace-nowrap sticky left-[48px] z-10 ${isOAA ? 'bg-[#240d1a]' : 'bg-white'} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.10)]">${item.name}</td>
                    ${archives.map(arch => {
                      const rec = (arch.students || []).find(s => Number(s.seatNo) === Number(item.seatNo));
                      return `<td class="py-2.5 px-2.5 text-center font-mono font-bold whitespace-nowrap">${rec ? `${rec.regularScore} <span class="text-[10px] opacity-65">(${rec.netDelta >= 0 ? '+' : ''}${rec.netDelta})</span>` : '-'}</td>`;
                    }).join('')}
                    <td class="py-2.5 px-2.5 text-center font-mono font-black whitespace-nowrap ${isOAA ? 'text-amber-300' : 'text-blue-700'}">${item.regularScore}</td>
                    <td class="py-2.5 px-2.5 text-right font-mono font-black whitespace-nowrap">${item.allTermsAvgRegularScore} 分</td>
                    <td class="py-2.5 px-2.5 text-right font-mono font-black whitespace-nowrap ${item.totalCumulativeNetDelta >= 0 ? (isOAA ? 'text-emerald-300' : 'text-emerald-700') : (isOAA ? 'text-rose-400' : 'text-rose-700')}">
                      ${item.totalCumulativeNetDelta >= 0 ? '+' : ''}${item.totalCumulativeNetDelta} 點
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // --- Sub-Tab C1: Single-Class Behavior Analytics ---
  renderSingleClassDashboard(container, classId) {
    if (!container) return;
    const overview = this.stats.getClassOverview(classId);
    const cls = this.store.getClass(classId);
    const isOAA = (this.store ? this.store.getTheme() : 'kitty') === 'oaa';

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 p-2 rounded-2xl ${isOAA ? 'bg-[#240b18] border border-amber-500/40' : 'bg-white border border-pink-200'} shadow-sm">
        <div class="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <button onclick="dashboardCharts.switchDashboardMode('single', '${classId}')" class="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black ${isOAA ? 'bg-amber-500 text-[#1a0713]' : 'bg-pink-500 text-white'} shadow-md transition flex items-center justify-center gap-1.5 min-h-[38px] cursor-pointer">
            <i data-lucide="user" class="w-4 h-4 hidden sm:inline"></i> <span>📌 本班表現 (${cls ? cls.name : classId})</span>
          </button>
          <button onclick="dashboardCharts.switchDashboardMode('multi', '${classId}')" class="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold ${isOAA ? 'bg-[#351425] hover:bg-[#481a35] text-amber-200 border border-amber-500/30' : 'bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-200'} transition flex items-center justify-center gap-1.5 min-h-[38px] cursor-pointer">
            <i data-lucide="layers" class="w-4 h-4 hidden sm:inline ${isOAA ? 'text-amber-300' : 'text-pink-600'}"></i> <span>🌐 跨班橫向比較</span>
          </button>
        </div>
      </div>

      <!-- Top Metric Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="rounded-2xl p-4 border ${isOAA ? 'bg-[#240d1a] border-amber-500/40 text-white' : 'glass-card border-pink-200 bg-white'}">
          <div class="flex items-center justify-between text-xs font-bold ${isOAA ? 'text-amber-300/80' : 'text-slate-500'}">
            <span>本期班級平時均分</span>
            <span class="kitty-cat-mini"></span>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-3xl font-black ${isOAA ? 'text-amber-300' : 'text-blue-700'}">${overview.classAvgScore}</span>
            <span class="text-xs opacity-70">分</span>
          </div>
          <div class="text-xs opacity-75 mt-1">
            ${overview.latestBoxPlot ? `班級中位數: <strong>${overview.latestBoxPlot.median}</strong> 分` : '尚無數據'}
          </div>
        </div>

        <div class="rounded-2xl p-4 border ${isOAA ? 'bg-[#240d1a] border-amber-500/40 text-white' : 'glass-card border-pink-200 bg-white'}">
          <div class="flex items-center justify-between text-xs font-bold ${isOAA ? 'text-amber-300/80' : 'text-slate-500'}">
            <span>課堂淨點數中位數</span>
            <span class="kitty-bow"></span>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-3xl font-black ${overview.pointsBoxPlot.median >= 0 ? (isOAA ? 'text-emerald-300' : 'text-emerald-700') : (isOAA ? 'text-rose-400' : 'text-rose-700')}">
              ${overview.pointsBoxPlot.median > 0 ? '+' : ''}${overview.pointsBoxPlot.median}
            </span>
            <span class="text-xs opacity-70">點</span>
          </div>
          <div class="text-xs opacity-75 mt-1">
            最高: <span class="font-bold">+${overview.pointsBoxPlot.max}</span> • 最低: <span class="font-bold">${overview.pointsBoxPlot.min}</span>
          </div>
        </div>

        <div class="rounded-2xl p-4 border ${isOAA ? 'bg-[#240d1a] border-amber-500/40 text-white' : 'glass-card border-pink-200 bg-white'}">
          <div class="flex items-center justify-between text-xs font-bold ${isOAA ? 'text-amber-300/80' : 'text-slate-500'}">
            <span>近期需關懷名單</span>
            <div class="sanrio-kuromi-badge !w-6 !h-6"></div>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-3xl font-black ${isOAA ? 'text-rose-400' : 'text-rose-700'}">${overview.alertStudents.length}</span>
            <span class="text-xs opacity-70">位同學</span>
          </div>
          <div class="text-xs opacity-75 mt-1 truncate">
            ${overview.alertStudents.length > 0 ? `座號: ${overview.alertStudents.map(s => s.student.seatNo + '號').join(', ')}` : '全班表現穩定'}
          </div>
        </div>

        <div class="rounded-2xl p-4 border ${isOAA ? 'bg-[#240d1a] border-amber-500/40 text-white' : 'glass-card border-pink-200 bg-white'}">
          <div class="flex items-center justify-between text-xs font-bold ${isOAA ? 'text-amber-300/80' : 'text-slate-500'}">
            <span>班級表現四象限分群</span>
            <div class="sanrio-twinstars-badge !w-6 !h-6"></div>
          </div>
          <div class="mt-2 grid grid-cols-2 gap-1 text-[11px] font-bold">
            <div class="${isOAA ? 'text-emerald-300' : 'text-emerald-800'}">積極拔尖: ${overview.clusters.topTier.length}人</div>
            <div class="${isOAA ? 'text-cyan-300' : 'text-sky-800'}">穩定達標: ${overview.clusters.underachiever.length}人</div>
            <div class="${isOAA ? 'text-amber-300' : 'text-amber-800'}">積極進步: ${overview.clusters.hardWorker.length}人</div>
            <div class="${isOAA ? 'text-rose-300' : 'text-rose-800'}">需關懷組: ${overview.clusters.highRisk.length}人</div>
          </div>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="rounded-3xl p-5 sm:p-6 border shadow-sm ${isOAA ? 'bg-[#240d1a] border-amber-500/40 text-white' : 'glass-card border-pink-200 bg-white text-slate-900'}">
          <h3 class="text-sm sm:text-base font-black flex items-center gap-2 mb-1">
            <span class="kitty-bow"></span>
            平時成績與課堂投入四象限散佈圖
          </h3>
          <p class="text-xs opacity-70 mb-3 font-medium">X軸：本期平時成績 • Y軸：課堂淨加減點 (點擊圓點查看學生檔案)</p>
          <div class="relative h-56 sm:h-72">
            <canvas id="chart-quadrant"></canvas>
          </div>
        </div>

        <div class="rounded-3xl p-5 sm:p-6 border shadow-sm ${isOAA ? 'bg-[#240d1a] border-amber-500/40 text-white' : 'glass-card border-pink-200 bg-white text-slate-900'}">
          <h3 class="text-sm sm:text-base font-black flex items-center gap-2 mb-1">
            <i data-lucide="bar-chart-2" class="w-4 h-4 text-sky-500"></i>
            班級平時成績等第分佈與五數統計
          </h3>
          <p class="text-xs opacity-70 mb-3 font-medium">即時統計全班 D / C / B / A / S 各等第人數落點</p>
          ${overview.latestBoxPlot ? `
            <div class="grid grid-cols-5 gap-2 p-2 rounded-xl border text-center text-xs mb-3 font-bold ${isOAA ? 'bg-[#1a0710] border-amber-500/30 text-amber-100' : 'bg-pink-50/50 border-pink-200 text-slate-800'}">
              <div><span class="opacity-65 block text-[10px]">最低</span>${overview.latestBoxPlot.min}</div>
              <div><span class="opacity-65 block text-[10px]">Q1</span>${overview.latestBoxPlot.q1}</div>
              <div><span class="${isOAA ? 'text-amber-300' : 'text-pink-700'} block text-[10px]">中位數</span>${overview.latestBoxPlot.median}</div>
              <div><span class="opacity-65 block text-[10px]">Q3</span>${overview.latestBoxPlot.q3}</div>
              <div><span class="opacity-65 block text-[10px]">最高</span>${overview.latestBoxPlot.max}</div>
            </div>
          ` : ''}
          <div class="relative h-48 sm:h-56">
            <canvas id="chart-distribution"></canvas>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
    this.renderQuadrantScatter('chart-quadrant', overview, classId);
    this.renderScoreDistribution('chart-distribution', overview);
  }

  // --- Sub-Tab C2: Multi-Class Comparative Benchmark ---
  renderMultiClassDashboard(container, classId) {
    if (!container) return;
    const multi = this.stats.getMultiClassComparison();
    const sortedByAvg = [...multi.strategies].sort((a, b) => b.avgScore - a.avgScore);
    const topClass = sortedByAvg[0] || {};
    const mostEngagedClass = [...multi.strategies].sort((a, b) => b.avgEng - a.avgEng)[0] || {};
    const isOAA = (this.store ? this.store.getTheme() : 'kitty') === 'oaa';

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 p-2 rounded-2xl ${isOAA ? 'bg-[#240b18] border border-amber-500/40' : 'bg-white border border-pink-200'} shadow-sm">
        <div class="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <button onclick="dashboardCharts.switchDashboardMode('single', '${classId}')" class="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold ${isOAA ? 'bg-[#351425] hover:bg-[#481a35] text-amber-200 border border-amber-500/30' : 'bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-200'} transition flex items-center justify-center gap-1.5 min-h-[38px] cursor-pointer">
            <i data-lucide="user" class="w-4 h-4 hidden sm:inline ${isOAA ? 'text-amber-300' : 'text-pink-600'}"></i> <span>📌 本班表現分析</span>
          </button>
          <button onclick="dashboardCharts.switchDashboardMode('multi', '${classId}')" class="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black ${isOAA ? 'bg-amber-500 text-[#1a0713]' : 'bg-pink-500 text-white'} shadow-md transition flex items-center justify-center gap-1.5 min-h-[38px] cursor-pointer">
            <i data-lucide="layers" class="w-4 h-4 hidden sm:inline"></i> <span>🌐 跨班橫向比較</span>
          </button>
        </div>

        <button onclick="dashboardCharts.copyTeachingStrategyReport()" class="w-full sm:w-auto justify-center min-h-[38px] px-3.5 py-1.5 rounded-xl ${isOAA ? 'bg-[#351425] text-amber-300 border border-amber-500/40 hover:bg-[#481a35]' : 'bg-pink-100 text-pink-800 border border-pink-300 hover:bg-pink-200'} text-xs font-bold transition flex items-center gap-1 cursor-pointer">
          <i data-lucide="copy" class="w-3.5 h-3.5"></i> 複製跨班班級經營摘要
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="rounded-2xl p-4 border ${isOAA ? 'bg-[#240d1a] border-amber-500/40 text-white' : 'glass-card border-pink-200 bg-white'}">
          <div class="flex items-center justify-between text-xs font-bold opacity-75">
            <span>平時成績最高班級</span>
            <div class="sanrio-twinstars-badge !w-6 !h-6"></div>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl sm:text-3xl font-black ${isOAA ? 'text-amber-300' : 'text-blue-700'}">${topClass.className || '無'}</span>
            <span class="text-sm font-bold opacity-80">(${topClass.avgScore ?? 80} 分)</span>
          </div>
          <p class="text-xs opacity-70 mt-1">積極拔尖人數 ${topClass.topCount ?? 0} 人</p>
        </div>

        <div class="rounded-2xl p-4 border ${isOAA ? 'bg-[#240d1a] border-amber-500/40 text-white' : 'glass-card border-pink-200 bg-white'}">
          <div class="flex items-center justify-between text-xs font-bold opacity-75">
            <span>課堂參與度最高班級</span>
            <div class="sanrio-kitty-badge !w-6 !h-6"></div>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl sm:text-3xl font-black ${isOAA ? 'text-emerald-300' : 'text-emerald-700'}">${mostEngagedClass.className || '無'}</span>
            <span class="text-sm font-bold opacity-80">(${(mostEngagedClass.avgEng ?? 0) >= 0 ? '+' : ''}${mostEngagedClass.avgEng ?? 0} 點)</span>
          </div>
          <p class="text-xs opacity-70 mt-1">正向師生互動氛圍優良</p>
        </div>

        <div class="rounded-2xl p-4 border ${isOAA ? 'bg-[#240d1a] border-amber-500/40 text-white' : 'glass-card border-pink-200 bg-white'}">
          <div class="flex items-center justify-between text-xs font-bold opacity-75">
            <span>授課班級比較範圍</span>
            <i data-lucide="globe" class="w-4 h-4 text-purple-500"></i>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl sm:text-3xl font-black ${isOAA ? 'text-purple-300' : 'text-purple-700'}">${multi.classList.length}</span>
            <span class="text-xs opacity-70">個授課班級</span>
          </div>
          <p class="text-xs opacity-70 mt-1">共統計 ${multi.classList.reduce((a, c) => a + c.studentCount, 0)} 位學生</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="rounded-3xl p-5 sm:p-6 border shadow-sm ${isOAA ? 'bg-[#240d1a] border-amber-500/40 text-white' : 'glass-card border-pink-200 bg-white'}">
          <h3 class="text-sm sm:text-base font-black flex items-center gap-2 mb-1">
            <i data-lucide="bar-chart-3" class="w-4 h-4 text-blue-500"></i>
            各班平時成績均分與淨積分對比
          </h3>
          <p class="text-xs opacity-70 mb-3">各班本期平時成績均分與平均課堂點數橫向對照</p>
          <div class="relative h-56 sm:h-72">
            <canvas id="chart-multiclass-academic"></canvas>
          </div>
        </div>

        <div class="rounded-3xl p-5 sm:p-6 border shadow-sm ${isOAA ? 'bg-[#240d1a] border-amber-500/40 text-white' : 'glass-card border-pink-200 bg-white'}">
          <h3 class="text-sm sm:text-base font-black flex items-center gap-2 mb-1">
            <i data-lucide="radar" class="w-4 h-4 text-purple-500"></i>
            各班五維度課堂表現雷達對比
          </h3>
          <p class="text-xs opacity-70 mb-3">課堂學習、積極動機、責任感、常規紀律、同儕互動</p>
          <div class="relative h-56 sm:h-72">
            <canvas id="chart-multiclass-radar"></canvas>
          </div>
        </div>
      </div>

      <div class="rounded-3xl p-5 sm:p-6 border shadow-sm ${isOAA ? 'bg-[#240d1a] border-amber-500/40 text-white' : 'glass-card border-pink-200 bg-white'}" id="strategy-report-container">
        <div class="mb-4">
          <h3 class="text-base sm:text-lg font-black flex items-center gap-2">
            📋 各班課堂經營建議總表
            <span class="kitty-bow"></span>
          </h3>
          <p class="text-xs opacity-70 mt-0.5">依據平時表現與互動熱度自動產生客觀帶領建議</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead class="uppercase text-xs font-black border-b ${isOAA ? 'bg-[#1a0710] text-amber-300 border-amber-500/30' : 'bg-pink-100 text-pink-900 border-pink-200'}">
              <tr>
                <th class="py-3 px-3.5">授課班級</th>
                <th class="py-3 px-3">平時均分</th>
                <th class="py-3 px-3">平均淨點</th>
                <th class="py-3 px-3.5">班級氛圍定位</th>
                <th class="py-3 px-4">重點關注方向</th>
                <th class="py-3 px-4">教學與管理建議</th>
              </tr>
            </thead>
            <tbody class="divide-y ${isOAA ? 'divide-amber-500/20' : 'divide-pink-100'}">
              ${multi.strategies.map(s => `
                <tr class="${isOAA ? 'hover:bg-[#381328]' : 'hover:bg-pink-50/50'} transition">
                  <td class="py-3.5 px-3.5 font-black whitespace-nowrap">
                    <span class="text-base">${s.className}</span>
                    <span class="block text-[10px] opacity-65 font-bold">${s.type === 'homeroom' ? '導師班' : '科任班'} (${s.studentCount}人)</span>
                  </td>
                  <td class="py-3.5 px-3 font-black ${isOAA ? 'text-amber-300' : 'text-blue-700'} text-sm">${s.avgScore} 分</td>
                  <td class="py-3.5 px-3 font-black text-sm ${s.avgEng >= 0 ? (isOAA ? 'text-emerald-300' : 'text-emerald-700') : (isOAA ? 'text-rose-400' : 'text-rose-700')}">
                    ${s.avgEng > 0 ? '+' : ''}${s.avgEng} 點
                  </td>
                  <td class="py-3.5 px-3.5 font-black whitespace-nowrap">
                    <span class="px-2.5 py-1 rounded-xl text-xs font-black ${isOAA ? 'bg-amber-950 text-amber-200 border border-amber-500/40' : 'bg-pink-100 text-pink-900 border border-pink-300'}">${s.hwLevel}</span>
                  </td>
                  <td class="py-3.5 px-4 font-bold text-xs sm:text-sm max-w-xs">${s.hwDetail}</td>
                  <td class="py-3.5 px-4 font-medium opacity-90 text-xs sm:text-sm max-w-sm">${s.teachingStyle}</td>
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
    if (!ctx || typeof Chart === 'undefined') return;
    this.destroyChart(canvasId);
    const isOAA = this.store?.getTheme() === 'oaa';

    const labels = multi.strategies.map(s => s.className);
    const avgScores = multi.strategies.map(s => s.avgScore);
    const engPoints = multi.strategies.map(s => s.avgEng);

    this.chartInstances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '平時成績均分 (分)',
            data: avgScores,
            backgroundColor: 'rgba(59, 130, 246, 0.75)',
            borderColor: '#2563eb',
            borderWidth: 2,
            borderRadius: 8,
            yAxisID: 'y'
          },
          {
            label: '課堂平均淨點 (點)',
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
        plugins: {
          legend: {
            labels: { color: isOAA ? '#fde68a' : '#475569', font: { size: 11, weight: 'bold' } }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: isOAA ? '#e2e8f0' : '#475569' } },
          y: {
            type: 'linear', display: true, position: 'left', min: 0, max: 100,
            ticks: { color: isOAA ? '#93c5fd' : '#2563eb' },
            grid: { color: isOAA ? 'rgba(245, 158, 11, 0.14)' : 'rgba(148, 163, 184, 0.15)' },
            title: { display: true, text: '平時成績均分', color: isOAA ? '#60a5fa' : '#2563eb', font: { size: 11, weight: 'bold' } }
          },
          y1: {
            type: 'linear', display: true, position: 'right',
            ticks: { color: isOAA ? '#fda4af' : '#ff4d6d' },
            grid: { drawOnChartArea: false },
            title: { display: true, text: '淨積分', color: isOAA ? '#fb7185' : '#ff4d6d', font: { size: 11, weight: 'bold' } }
          }
        }
      }
    });
  }

  renderMultiClassRadarChart(canvasId, multi) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return;
    this.destroyChart(canvasId);
    const isOAA = (this.store ? this.store.getTheme() : 'kitty') === 'oaa';

    const colors = [
      { bg: 'rgba(255, 77, 109, 0.2)', border: '#ff4d6d' },
      { bg: 'rgba(59, 130, 246, 0.2)', border: '#2563eb' },
      { bg: 'rgba(16, 185, 129, 0.2)', border: '#059669' },
      { bg: 'rgba(168, 85, 247, 0.2)', border: '#7c3aed' }
    ];

    const datasets = multi.classList.map((cls, idx) => {
      const ov = multi.classOverviews[cls.id];
      const profiles = ov.studentProfiles;
      const avg = (fn) => Math.round(profiles.reduce((a, p) => a + (fn(p) || 80), 0) / (profiles.length || 1));
      const color = colors[idx % colors.length];
      return {
        label: cls.name,
        data: [
          avg(p => p.radar.mathAbility),
          avg(p => p.radar.motivation),
          avg(p => p.radar.accountability),
          avg(p => p.radar.discipline),
          avg(p => p.radar.socialEmotional)
        ],
        backgroundColor: color.bg,
        borderColor: color.border,
        borderWidth: 2,
        pointRadius: 4
      };
    });

    this.chartInstances[canvasId] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['課堂學習', '積極動機', '責任感', '常規紀律', '同儕互動'],
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: isOAA ? '#fde68a' : '#475569', font: { size: 11, weight: 'bold' } } }
        },
        scales: {
          r: {
            min: 0, max: 100,
            angleLines: { color: isOAA ? 'rgba(245, 158, 11, 0.25)' : 'rgba(148, 163, 184, 0.2)' },
            grid: { color: isOAA ? 'rgba(245, 158, 11, 0.2)' : 'rgba(148, 163, 184, 0.2)' },
            ticks: { display: false },
            pointLabels: { color: isOAA ? '#fde68a' : '#475569', font: { size: 11, weight: 'bold' } }
          }
        }
      }
    });
  }

  copyTeachingStrategyReport() {
    const multi = this.stats.getMultiClassComparison();
    let report = `【跨班級平時成績與班級經營摘要】\n\n`;
    multi.strategies.forEach(s => {
      report += `📍 【${s.className} (${s.type === 'homeroom' ? '導師班' : '科任班'})】\n`;
      report += `• 本期平時均分：${s.avgScore} 分 | 平均淨點數：${s.avgEng > 0 ? '+' : ''}${s.avgEng} 點\n`;
      report += `• 定位與關注：${s.hwLevel} — ${s.hwDetail}\n`;
      report += `• 帶領建議：${s.teachingStyle}\n\n`;
    });

    if (window.copyTextSafe) {
      window.copyTextSafe(report, '已複製跨班班級經營摘要！');
    }
  }

  renderQuadrantScatter(canvasId, overview, classId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return;
    this.destroyChart(canvasId);
    const isOAA = (this.store ? this.store.getTheme() : 'kitty') === 'oaa';

    const dataPoints = overview.studentProfiles.map(p => ({
      x: p.regularScore ?? p.scoreMean,
      y: p.pointsBreakdown.net,
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
            const pt = dataPoints[elements[0].index];
            if (pt) this.jumpToStudentDossier(classId, pt.seatNo);
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const pt = context.raw;
                return `${String(pt.seatNo).padStart(2, '0')} 號 ${pt.name} (平時成績: ${pt.x} 分, 淨點數: ${pt.y > 0 ? '+' : ''}${pt.y})`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: '本期平時成績 (分)', color: isOAA ? '#fde68a' : '#64748b', font: { size: 11 } },
            min: 40,
            max: 100,
            ticks: { color: isOAA ? '#e2e8f0' : '#475569' },
            grid: { color: isOAA ? 'rgba(245, 158, 11, 0.14)' : 'rgba(255, 117, 143, 0.1)' }
          },
          y: {
            title: { display: true, text: '課堂淨加減點', color: isOAA ? '#fde68a' : '#64748b', font: { size: 11 } },
            ticks: { color: isOAA ? '#e2e8f0' : '#475569' },
            grid: { color: isOAA ? 'rgba(245, 158, 11, 0.14)' : 'rgba(255, 117, 143, 0.1)' }
          }
        }
      }
    });
  }

  renderScoreDistribution(canvasId, overview) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || typeof Chart === 'undefined') return;
    this.destroyChart(canvasId);
    const isOAA = (this.store ? this.store.getTheme() : 'kitty') === 'oaa';

    const scores = overview.studentProfiles.map(p => p.regularScore ?? p.scoreMean);
    const bins = ['<60 (D 關懷)', '60-74 (C 加油)', '75-84 (B 穩健)', '85-94 (A 優良)', '95-100 (S 卓越)'];
    const counts = [0, 0, 0, 0, 0];

    scores.forEach(s => {
      if (s < 60) counts[0]++;
      else if (s < 75) counts[1]++;
      else if (s < 85) counts[2]++;
      else if (s < 95) counts[3]++;
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
            'rgba(244, 63, 94, 0.75)',
            'rgba(245, 158, 11, 0.75)',
            'rgba(16, 185, 129, 0.75)',
            'rgba(59, 130, 246, 0.75)',
            'rgba(236, 72, 153, 0.8)'
          ],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: isOAA ? '#fde68a' : '#475569', font: { size: 10 } } },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: isOAA ? '#e2e8f0' : '#475569' },
            grid: { color: isOAA ? 'rgba(245, 158, 11, 0.14)' : 'rgba(255, 117, 143, 0.1)' }
          }
        }
      }
    });
  }

  renderStudentDetailCharts(radarCanvasId, ewmaCanvasId, profile) {
    if (typeof Chart === 'undefined') return;
    const isOAA = (this.store ? this.store.getTheme() : 'kitty') === 'oaa';
    const radarCtx = document.getElementById(radarCanvasId);
    if (radarCtx) {
      this.destroyChart(radarCanvasId);
      this.chartInstances[radarCanvasId] = new Chart(radarCtx, {
        type: 'radar',
        data: {
          labels: ['課堂學習', '積極動機', '責任感', '常規紀律', '同儕互動'],
          datasets: [{
            label: '表現指標',
            data: [
              profile.radar.mathAbility,
              profile.radar.motivation,
              profile.radar.accountability,
              profile.radar.discipline,
              profile.radar.socialEmotional
            ],
            backgroundColor: isOAA ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 117, 143, 0.3)',
            borderColor: isOAA ? '#f59e0b' : '#ff4d6d',
            pointBackgroundColor: isOAA ? '#fde047' : '#c9184a',
            pointBorderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            r: {
              angleLines: { color: isOAA ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 117, 143, 0.2)' },
              grid: { color: isOAA ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 117, 143, 0.15)' },
              pointLabels: { color: isOAA ? '#fde68a' : '#475569', font: { size: 11, weight: '700' } },
              ticks: { display: false, min: 0, max: 100 }
            }
          }
        }
      });
    }

    const ewmaCtx = document.getElementById(ewmaCanvasId);
    if (ewmaCtx) {
      this.destroyChart(ewmaCanvasId);
      const eventsList = Array.isArray(profile.assessmentList) ? profile.assessmentList : [];
      const labels = ['開期基準', ...eventsList.map(ev => ev?.tagName || ev?.name || ev?.date || '點記')];
      this.chartInstances[ewmaCanvasId] = new Chart(ewmaCtx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: '逐筆即時平時成績',
              data: profile.rawScores,
              borderColor: isOAA ? 'rgba(203, 213, 225, 0.8)' : 'rgba(148, 163, 184, 0.8)',
              backgroundColor: 'rgba(148, 163, 184, 0.2)',
              borderDash: [4, 4],
              pointRadius: 4,
              fill: false,
              tension: 0.1
            },
            {
              label: 'EWMA 平滑趨勢線',
              data: profile.ewmaScores,
              borderColor: isOAA ? '#f59e0b' : '#ff4d6d',
              backgroundColor: isOAA ? 'rgba(245, 158, 11, 0.18)' : 'rgba(255, 117, 143, 0.15)',
              borderWidth: 3,
              pointRadius: 5,
              pointBackgroundColor: isOAA ? '#fbbf24' : '#ff4d6d',
              fill: true,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: isOAA ? '#fde68a' : '#475569', font: { size: 11, weight: '600' } } }
          },
          scales: {
            x: {
              ticks: { color: isOAA ? '#e2e8f0' : '#475569', maxRotation: 35 },
              grid: { color: isOAA ? 'rgba(245, 158, 11, 0.14)' : 'rgba(255, 117, 143, 0.1)' }
            },
            y: {
              min: 0, max: 100,
              ticks: { color: isOAA ? '#e2e8f0' : '#475569' },
              grid: { color: isOAA ? 'rgba(245, 158, 11, 0.14)' : 'rgba(255, 117, 143, 0.1)' }
            }
          }
        }
      });
    }
  }
}

// Global Dashboard Charts Instance
window.dashboardCharts = new DashboardCharts(window.appStore, window.statisticsEngine);

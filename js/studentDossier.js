/**
 * Student Individual Dossier & Counseling Report View
 * Dual-track metrics (學業 vs 品格), Sanrio Character Badges, large text, and objective notes.
 */

class StudentDossierView {
  constructor(store, stats, charts) {
    this.store = store;
    this.stats = stats;
    this.charts = charts;
    this.currentClassId = '801';
    this.currentSeatNo = 1;
  }

  render(containerId, classId = null, seatNo = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (classId) this.currentClassId = classId;
    if (seatNo) this.currentSeatNo = parseInt(seatNo, 10);

    const classes = this.store.getClasses();
    const students = this.store.getStudents(this.currentClassId);
    const student = this.store.getStudent(this.currentClassId, this.currentSeatNo) || students[0];

    if (!student) {
      container.innerHTML = `<div class="p-12 text-center text-slate-500 font-bold">查無學生資料</div>`;
      return;
    }

    this.currentSeatNo = student.seatNo;
    const profile = this.stats.getStudentProfile(this.currentClassId, student.seatNo);
    const events = this.store.getEvents(this.currentClassId).filter(e => e.seatNo === student.seatNo);
    const characterPoints = profile ? profile.pointsBreakdown.discipline + profile.pointsBreakdown.conflict + profile.pointsBreakdown.social : 0;
    const academicScore = profile ? profile.scoreMean : 70;

    // Sanrio mascot for this student
    let mascotClass = 'sanrio-kitty-badge';
    let mascotTitle = 'Hello Kitty (穩健良好)';
    if ((academicScore >= 80 && characterPoints >= 0) || (profile && profile.scoreSlope >= 1.5)) {
      mascotClass = 'sanrio-twinstars-badge';
      mascotTitle = '小雙星 (優良拔尖/進步之星)';
    } else if (characterPoints < 0 || academicScore < 60) {
      mascotClass = 'sanrio-kuromi-badge';
      mascotTitle = '酷洛米 (需關懷/調皮提醒)';
    }

    const counselingSynthesis = this.generateCounselingSynthesis(profile, events);

    container.innerHTML = `
      <!-- Top Selector Bar with Student's Sanrio Character Avatar -->
      <div class="glass-card rounded-3xl p-5 mb-5 flex flex-wrap items-center justify-between gap-4 border border-pink-200 shadow-sm bg-gradient-to-r from-pink-50/80 via-white to-sky-50/80">
        <div class="flex items-center space-x-4">
          <div class="${mascotClass} !w-14 !h-14 bg-white p-1 rounded-2xl shadow-sm border border-pink-200" title="${mascotTitle}"></div>
          <div>
            <div class="flex items-center space-x-2.5">
              <h2 class="text-2xl sm:text-3xl font-black text-slate-900">${student.name}</h2>
              <span class="text-xs sm:text-sm px-3 py-1 rounded-full font-black bg-pink-100 text-pink-700 border border-pink-300">
                ${this.currentClassId} 班 • 座號 ${String(student.seatNo).padStart(2, '0')}
              </span>
            </div>
            
            <!-- Dual Metrics Display -->
            <div class="flex flex-wrap items-center gap-3 text-xs sm:text-sm mt-1.5 font-bold">
              <span class="px-2.5 py-0.5 rounded-lg badge-academic">
                📘 學業均分: <strong class="text-blue-700 font-black text-sm">${profile.scoreMean}</strong> 分
              </span>
              <span class="px-2.5 py-0.5 rounded-lg ${characterPoints >= 0 ? 'badge-character-pos' : 'badge-character-neg'}">
                🎀 品格常規: <strong class="${characterPoints >= 0 ? 'text-pink-700' : 'text-rose-700'} font-black text-sm">${characterPoints > 0 ? '+' : ''}${characterPoints}</strong> 點
              </span>
            </div>
          </div>
        </div>

        <!-- Class & Student Switchers -->
        <div class="flex items-center space-x-2.5">
          <select onchange="studentDossierView.switchClass(this.value)" class="border border-pink-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold focus:outline-none bg-white">
            ${Object.values(classes).map(c => `
              <option value="${c.id}" ${this.currentClassId === c.id ? 'selected' : ''}>${c.name}</option>
            `).join('')}
          </select>

          <select onchange="studentDossierView.switchStudent(this.value)" class="border border-pink-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold focus:outline-none bg-white">
            ${students.map(s => `
              <option value="${s.seatNo}" ${this.currentSeatNo === s.seatNo ? 'selected' : ''}>
                ${String(s.seatNo).padStart(2, '0')} 號 ${s.name}
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- Main Visuals (Radar + EWMA Curve) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- 5-Dimension Radar Chart -->
        <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 shadow-sm bg-white">
          <h3 class="text-sm sm:text-base font-black flex items-center gap-2 mb-1 text-slate-800">
            <span class="kitty-cat-mini"></span>
            五維度教育量化指標雷達 (0-100)
          </h3>
          <p class="text-xs text-slate-500 mb-3 font-medium">數理學業、學習動機、作業責任感、常規紀律與同儕互動</p>
          <div class="relative h-64">
            <canvas id="student-radar-chart"></canvas>
          </div>
        </div>

        <!-- EWMA Assessment Progress Chart -->
        <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 shadow-sm bg-white">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-sm sm:text-base font-black flex items-center gap-2 text-slate-800">
              <span class="kitty-bow"></span>
              歷次小考時序走勢 (EWMA 平滑趨勢線)
            </h3>
            <span class="text-xs font-black ${profile.scoreSlope > 0 ? 'text-emerald-700' : profile.scoreSlope < 0 ? 'text-rose-700' : 'text-slate-500'}">
              趨勢斜率: ${profile.scoreSlope > 0 ? '+' : ''}${profile.scoreSlope}
            </span>
          </div>
          <p class="text-xs text-slate-500 mb-3 font-medium">虛線為原始成績，粉紅實線為消除隨機波動之 EWMA 平滑走勢</p>
          <div class="relative h-64">
            <canvas id="student-ewma-chart"></canvas>
          </div>
        </div>
      </div>

      <!-- Bottom Row: Counseling Memo & Event Timeline -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Counseling Memo Card -->
        <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 shadow-sm bg-white">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm sm:text-base font-black text-pink-700 flex items-center gap-2">
              <i data-lucide="file-text" class="w-4 h-4 text-pink-500"></i>
              家長晤談與因材施教綜合備忘錄
            </h3>
            <button onclick="studentDossierView.copyCounselingMemo()" class="px-3.5 py-1.5 rounded-xl bg-pink-100 text-pink-700 border border-pink-300 text-xs font-bold hover:bg-pink-200 transition flex items-center gap-1">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i> 一鍵複製備忘
            </button>
          </div>

          <div id="counseling-memo-box" class="p-4 rounded-2xl bg-pink-50/60 border border-pink-200 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium space-y-2.5">
            <p><strong>【${student.name} 同學 (座號 ${String(student.seatNo).padStart(2, '0')}) 學習綜合報告】</strong></p>
            <p>• <strong>數理學業</strong>：歷次均分 ${profile.scoreMean} 分，最新 EWMA 指標為 ${profile.ewmaScores[profile.ewmaScores.length - 1] || profile.scoreMean} 分，整體發展軌跡呈現【${profile.scoreSlope > 0 ? '持續穩健上升' : profile.scoreSlope < 0 ? '近期有震盪拉回，需協助基礎觀念補救' : '維持穩定平緩'}】。</p>
            <p>• <strong>品格常規與課堂投入</strong>：生活常規淨積分 ${characterPoints > 0 ? '+' : ''}${characterPoints} 點。課堂作業與常規表現詳見右側客觀記事。</p>
            <p>• <strong>晤談建議導向</strong>：${counselingSynthesis.recommendation}</p>
          </div>
        </div>

        <!-- Student Recent Events List -->
        <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 shadow-sm bg-white">
          <h3 class="text-sm sm:text-base font-black flex items-center gap-2 mb-3 text-slate-800">
            <i data-lucide="history" class="w-4 h-4 text-pink-500"></i>
            該生歷史具體記事歷程 (${events.length} 筆)
          </h3>
          <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            ${events.length === 0 ? `
              <div class="text-center py-10 text-slate-400 text-xs">
                <div class="sanrio-sticker-kitty mb-2"></div>
                <p class="font-bold">尚無特定事件登記，表現穩定良好</p>
              </div>
            ` : events.map(e => `
              <div class="p-3 rounded-xl border border-pink-100 bg-pink-50/40 text-xs sm:text-sm">
                <div class="flex items-center justify-between font-bold mb-1">
                  <span class="text-slate-600 font-mono text-xs">${e.date} 第${e.period}節</span>
                  <span class="px-2 py-0.5 rounded-full text-xs font-black ${e.delta > 0 ? 'bg-emerald-100 text-emerald-800' : e.delta < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'}">
                    ${e.tagName} (${e.delta > 0 ? '+' : ''}${e.delta})
                  </span>
                </div>
                <p class="text-slate-800 text-xs font-medium">${e.note || ''}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Render Charts
    this.charts.renderStudentDetailCharts('student-radar-chart', 'student-ewma-chart', profile);
  }

  generateCounselingSynthesis(profile, events) {
    let recommendation = '';
    if (profile.scoreMean >= 85 && profile.scoreSlope >= 0) {
      recommendation = '數理邏輯領悟力強，建議適度給予競賽題或延伸閱讀以拔尖，並可安排擔任數學小老師協助同儕。';
    } else if (profile.scoreMean < 60) {
      recommendation = '目前基礎運算觀念尚有斷層，建議每日安排 3~5 題基礎核心題型建立信心，並避免挫折感加劇。';
    } else if (profile.scoreSlope < -2) {
      recommendation = '近期小考成績有明顯下滑波動，需關心是否課後分心、作息混亂或家庭/同儕壓力。';
    } else {
      recommendation = '學習狀態維持常態，建議保持課前預習與確實訂正習慣，持續肯定其常規穩定性。';
    }
    return { recommendation };
  }

  switchClass(classId) {
    this.currentClassId = classId;
    const students = this.store.getStudents(classId);
    this.currentSeatNo = students[0] ? students[0].seatNo : 1;
    this.render('student-dossier-view', this.currentClassId, this.currentSeatNo);
  }

  switchStudent(seatNo) {
    this.currentSeatNo = parseInt(seatNo, 10);
    this.render('student-dossier-view', this.currentClassId, this.currentSeatNo);
  }

  copyCounselingMemo() {
    const box = document.getElementById('counseling-memo-box');
    if (box) {
      navigator.clipboard.writeText(box.innerText);
      window.appState.showToast('已複製家長晤談備忘錄！', 'success');
    }
  }
}

// Global Student Dossier Instance
window.studentDossierView = new StudentDossierView(window.appStore, window.statisticsEngine, window.dashboardCharts);

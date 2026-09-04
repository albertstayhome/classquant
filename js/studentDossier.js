/**
 * Student Individual Dossier & Counseling Report View
 * Dual-mode: Sanrio Standard Mode & [OAA Mode] (Classroom of the Elite Style)
 */

class StudentDossierView {
  constructor(store, stats, charts) {
    this.store = store;
    this.stats = stats;
    this.charts = charts;
    this.currentClassId = '801';
    this.currentSeatNo = 1;
  }

  isOAAMode() {
    const globalTheme = window.appStore ? window.appStore.getTheme() : 'kitty';
    return globalTheme === 'oaa';
  }

  // --- Calculate Grounded OAA Metrics (Firmly derived from store data) ---
  calculateOAA(student, classId, profile, events) {
    const cls = this.store.getClass(classId);
    const isHomeroom = cls ? cls.type === 'homeroom' : (classId === '801');

    // 1. 学力 (Academic Ability, 0-100)
    // Derived from assessment scores mean, plus academic tags
    let academicScore = 75;
    let testCount = 0;
    if (profile && profile.scoreMean > 0) {
      academicScore = profile.scoreMean;
      testCount = profile.assessmentsCount || (profile.scores ? profile.scores.length : 1);
    } else {
      // If no assessment yet, calculate net academic tags from events
      const acadEvents = events.filter(e => e.category === 'academic' || e.category === 'assessment');
      const netAcad = acadEvents.reduce((sum, e) => sum + (Number(e.delta) || 0) * 2, 0);
      academicScore = Math.min(100, Math.max(0, 75 + netAcad));
    }
    academicScore = Math.round(academicScore);

    // 2. 規律服従 (Discipline & Obedience, 0-100)
    // Derived from discipline tags, cleaning chores (掃除), and conflict deductions
    let obedienceBase = 75;
    let posDiscCount = 0;
    let negDiscCount = 0;

    events.forEach(e => {
      const isCleaning = e.tagName && (e.tagName.includes('掃除') || e.tagName.includes('整潔') || e.id === 'disc_clean_fail');
      const isDiscipline = e.category === 'discipline' || isCleaning;
      const isConflict = e.category === 'conflict';

      if (isDiscipline) {
        if (e.delta > 0) {
          obedienceBase += Number(e.delta) * 2;
          posDiscCount++;
        } else {
          obedienceBase += Number(e.delta) * 2.5; // Stricter deduction
          negDiscCount++;
        }
      } else if (isConflict) {
        obedienceBase += Number(e.delta) * 3; // Severe deduction for conflict
        negDiscCount++;
      }
    });
    const obedienceScore = Math.min(100, Math.max(0, Math.round(obedienceBase)));

    let metrics = [];
    let rawWeighted = 0;

    if (isHomeroom) {
      // 🏫 導師班：4 維考核（学力 40%, 規律服従 35%, 身体能力 15%, 協作表現 10%）

      // 3. 身体能力 (Physical Ability, 0-100)
      let physicalBase = 75;
      let physCount = 0;
      events.forEach(e => {
        const isPhys = e.tagName && (e.tagName.includes('體育') || e.tagName.includes('競賽') || e.tagName.includes('運動') || e.tagName.includes('跑'));
        if (isPhys) {
          physicalBase += Number(e.delta) * 3;
          physCount++;
        }
      });
      const physicalScore = Math.min(100, Math.max(0, Math.round(physicalBase)));

      // 4. 協作表現 (Social & Cooperation, 0-100)
      let coopBase = 75;
      let coopCount = 0;
      events.forEach(e => {
        const isCoop = e.category === 'social' || (e.tagName && (e.tagName.includes('助人') || e.tagName.includes('幹部') || e.tagName.includes('小老師')));
        if (isCoop) {
          coopBase += Number(e.delta) * 2.5;
          coopCount++;
        }
      });
      const coopScore = Math.min(100, Math.max(0, Math.round(coopBase)));

      metrics = [
        { key: 'academic', label: '学力', score: academicScore, grade: this.getLetterGrade(academicScore), weight: '40%', detail: testCount > 0 ? `採計 ${testCount} 次測驗平均 ${academicScore} 分` : `基礎 75 分，尚無測驗紀錄` },
        { key: 'physical', label: '身体能力', score: physicalScore, grade: this.getLetterGrade(physicalScore), weight: '15%', detail: physCount > 0 ? `體育與體能紀錄 ${physCount} 筆` : `基準 75 分，常態表現` },
        { key: 'obedience', label: '規律服従', score: obedienceScore, grade: this.getLetterGrade(obedienceScore), weight: '35%', detail: `常規與掃除紀錄：加點 ${posDiscCount} 次、違規 ${negDiscCount} 次` },
        { key: 'cooperation', label: '協作表現', score: coopScore, grade: this.getLetterGrade(coopScore), weight: '10%', detail: coopCount > 0 ? `熱心助人與幹部服務 ${coopCount} 筆` : `基準 75 分，常態表現` }
      ];

      rawWeighted = (academicScore * 0.40) + (obedienceScore * 0.35) + (physicalScore * 0.15) + (coopScore * 0.10);

    } else {
      // 📐 數學科任班：3 維考核（学力 55%, 課堂服従 30%, 思考解題 15% • 絕無體育）

      // 3. 思考解題 (Problem Solving & Response, 0-100)
      let thinkBase = 75;
      let thinkCount = 0;
      events.forEach(e => {
        const isThink = e.id === 'math_breakthrough' || e.id === 'math_board' || e.id === 'math_ask' || (e.tagName && (e.tagName.includes('難題') || e.tagName.includes('板書') || e.tagName.includes('提問')));
        if (isThink) {
          thinkBase += Number(e.delta) * 3;
          thinkCount++;
        }
      });
      const thinkScore = Math.min(100, Math.max(0, Math.round(thinkBase)));

      metrics = [
        { key: 'academic', label: '学力', score: academicScore, grade: this.getLetterGrade(academicScore), weight: '55%', detail: testCount > 0 ? `採計 ${testCount} 次數學測驗平均 ${academicScore} 分` : `基礎 75 分，尚無測驗紀錄` },
        { key: 'thinking', label: '思考解題', score: thinkScore, grade: this.getLetterGrade(thinkScore), weight: '15%', detail: thinkCount > 0 ? `上台解題與主動提問 ${thinkCount} 筆` : `基準 75 分，課堂常態` },
        { key: 'obedience', label: '課堂服従', score: obedienceScore, grade: this.getLetterGrade(obedienceScore), weight: '30%', detail: `數學課堂專注與作業繳交率` }
      ];

      rawWeighted = (academicScore * 0.55) + (obedienceScore * 0.30) + (thinkScore * 0.15);
    }

    // --- 硬核卡階限制規則 (Gating Rules) ---
    let finalScore = Math.round(rawWeighted);
    let gatingNote = null;

    // S 級卡階：總分 >= 90，但学力未達 85 或 服從未達 75
    if (finalScore >= 90) {
      if (academicScore < 85) {
        finalScore = 89;
        gatingNote = '学力未達 85 分 (A級)，受實力至上考核限制，強制卡階於 A+';
      } else if (obedienceScore < 75) {
        finalScore = 89;
        gatingNote = '服從紀律未達 75 分基準，綜合評價強制卡階於 A+';
      }
    }

    // A 級卡階：總分 >= 80，但学力不及格 (< 60)
    if (finalScore >= 80 && academicScore < 60) {
      finalScore = 79;
      gatingNote = '学力低於及格線 (60分)，綜合評價強制卡階於 B+';
    }

    const overallGrade = this.getLetterGrade(finalScore);

    // Narrative Profile Synthesis (高度育成風格評語)
    const sorted = [...metrics].sort((a, b) => b.score - a.score);
    const topMetric = sorted[0];
    const lowestMetric = sorted[sorted.length - 1];

    let oaaSummary = '';
    if (finalScore >= 90) {
      oaaSummary = `該生在【${topMetric.label}】展現出統治級的適應力與卓越水準。整體綜合數值極高，已具備引領班級的領袖才能。若能在【${lowestMetric.label}】維持高標準，將成為無可忽視的頂尖實力者。`;
    } else if (finalScore >= 80) {
      oaaSummary = `該生在各項考核中表現優異，尤其在【${topMetric.label}】方面表現突出，為班級中堅核心。目前主要弱項在於【${lowestMetric.label}】，若能補足此項缺口，整體實力評估將能更上層樓。`;
    } else if (finalScore >= 70) {
      oaaSummary = `該生整體數值穩定，作風中規中矩。在【${topMetric.label}】具備一定底蘊，但需注意防範【${lowestMetric.label}】帶來的短板拉扯效應，避免在後續高難度考核中落入劣勢。`;
    } else {
      oaaSummary = `數據顯示目前處於高警戒觀察區間，特別在【${lowestMetric.label}】存在明顯赤字。需立即擬定針對性補救策略與常規約束，方能扭轉個人與班級評價。`;
    }

    return {
      isHomeroom,
      metrics,
      rawWeighted,
      finalScore,
      overallGrade,
      gatingNote,
      oaaSummary
    };
  }

  getLetterGrade(val) {
    if (val >= 95) return 'S+';
    if (val >= 90) return 'S';
    if (val >= 85) return 'A+';
    if (val >= 80) return 'A';
    if (val >= 75) return 'B+';
    if (val >= 70) return 'B';
    if (val >= 65) return 'C+';
    if (val >= 60) return 'C';
    if (val >= 50) return 'D';
    return 'E';
  }

  // --- Main Render Function ---
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
    const oaa = this.calculateOAA(student, this.currentClassId, profile, events);

    if (this.isOAAMode()) {
      this.renderOAAMode(container, student, classes, students, profile, events, oaa);
    } else {
      this.renderDefaultMode(container, student, classes, students, profile, events, oaa);
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // --- 🌸 Mode 1: Default Sanrio Mode ---
  renderDefaultMode(container, student, classes, students, profile, events, oaa) {
    const characterPoints = profile ? profile.pointsBreakdown.discipline + profile.pointsBreakdown.conflict + profile.pointsBreakdown.social : 0;
    const academicScore = profile ? profile.scoreMean : 70;

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
      <!-- Top Selector Bar -->
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

        <!-- Class/Student Switchers -->
        <div class="flex flex-wrap items-center gap-2.5">
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

    // Render Charts
    this.charts.renderStudentDetailCharts('student-radar-chart', 'student-ewma-chart', profile);
  }

  // --- 🕶️ Mode 2: Highly Authentic [OAA Mode] (Classroom of the Elite Style) ---
  renderOAAMode(container, student, classes, students, profile, events, oaa) {
    const studentIdStr = `S0${this.currentClassId}T${String(student.seatNo).padStart(5, '0')}`;
    const gradeColorMap = {
      'S+': 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]',
      'S': 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]',
      'A+': 'text-cyan-300 drop-shadow-[0_0_6px_rgba(103,232,249,0.6)]',
      'A': 'text-cyan-400',
      'B+': 'text-emerald-300',
      'B': 'text-emerald-400',
      'C+': 'text-slate-200',
      'C': 'text-slate-300',
      'D': 'text-amber-400',
      'E': 'text-rose-500'
    };

    const coteAvatarsList = [
      './assets/cote/ic-2-1.jpg', // 綾小路 清隆 [2年D班]
      './assets/cote/ic-2-2.jpg', // 堀北 鈴音 [2年D班]
      './assets/cote/ic-2-3.jpg', // 輕井澤 惠 [2年D班]
      './assets/cote/ic-2-4.jpg', // 櫛田 桔梗 [2年D班]
      './assets/cote/ic-2-5.jpg', // 龍園 翔 [2年C班]
      './assets/cote/ic-1-1.jpg', // 七瀨 翼 [1年D班]
      './assets/cote/ic-1-2.jpg', // 寶泉 和臣 [1年D班]
      './assets/cote/ic-1-3.jpg', // 天澤 一夏 [1年A班]
      './assets/cote/ic-1-4.jpg', // 八神 拓也 [1年B班]
      './assets/cote/ic-1-5.jpg', // 椿 櫻子 [1年C班]
      './assets/cote/ic-1-6.jpg'  // 宇都宮 陸 [1年C班]
    ];
    const avatarIndex = (student.seatNo - 1) % coteAvatarsList.length;
    const coteAvatar = coteAvatarsList[avatarIndex];

    container.innerHTML = `
      <!-- OAA Top Control Bar -->
      <div class="rounded-2xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3 bg-[#240d1a] border border-amber-500/50 shadow-lg text-white">
        <div class="flex items-center space-x-3">
          <img src="./assets/cote/cote_logo.webp" alt="ようこそ実力至上主義の教室へ" class="h-8 sm:h-9 object-contain">
          <div>
            <h2 class="text-base sm:text-lg font-black tracking-wider text-amber-200 uppercase">
              OAA 學生綜合能力評估卡
            </h2>
            <p class="text-[11px] text-amber-300/80">高度育成高等學校 官方學生檔案</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <select onchange="studentDossierView.switchClass(this.value)" class="bg-[#1c0a14] border border-amber-500/60 text-amber-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none">
            ${Object.values(classes).map(c => `
              <option value="${c.id}" ${this.currentClassId === c.id ? 'selected' : ''}>${c.name}</option>
            `).join('')}
          </select>

          <select onchange="studentDossierView.switchStudent(this.value)" class="bg-[#1c0a14] border border-amber-500/60 text-amber-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none">
            ${students.map(s => `
              <option value="${s.seatNo}" ${this.currentSeatNo === s.seatNo ? 'selected' : ''}>
                No.${String(s.seatNo).padStart(2, '0')} ${s.name}
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- 🌟 Authentic COTE Student Card (Replica of the Official Reference Image) -->
      <div class="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#290e1b] via-[#381224] to-[#1c0712] border-2 border-amber-500/50 shadow-2xl text-white mb-6">
        <!-- Right Side Vertical Watermark Text (Faithfully matching the official light novel) -->
        <div class="absolute top-8 right-3 sm:right-4 font-mono text-[9px] sm:text-[10px] tracking-[0.35em] text-amber-400/20 uppercase select-none [writing-mode:vertical-rl] pointer-events-none">
          ADVANCED NURTURING HIGH SCHOOL // OAA
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
          <!-- Left Column: Character Silhouette / Photo Card -->
          <div class="lg:col-span-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-amber-500/30 pb-5 lg:pb-0 lg:pr-6">
            <div>
              <!-- Silhouette / Official Photo Card -->
              <div class="w-full aspect-[4/5] max-w-[240px] mx-auto mb-2 rounded-2xl bg-[#1b0812] border-2 border-amber-500/60 overflow-hidden shadow-md relative group">
                <img src="${coteAvatar}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" alt="${student.name}" title="高度育成生徒証明">
                <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-center">
                  <div class="text-xs font-bold text-amber-300 uppercase tracking-widest">
                    高度育成生徒証明
                  </div>
                  <div class="text-sm font-black text-white">
                    NO. ${String(student.seatNo).padStart(2, '0')}
                  </div>
                </div>
              </div>

              <!-- Easter Egg Summon Button -->
              <div class="max-w-[240px] mx-auto mb-4">
                <button onclick="window.appState.triggerSilhouetteCutIn(${(student.seatNo - 1) % 11})" class="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-rose-950 via-red-900 to-amber-950 hover:from-rose-900 hover:to-amber-900 border border-amber-500/60 text-amber-300 hover:text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer" title="觸發此角色本格動漫降臨彩蛋">
                  <span>⚡</span>
                  <span>實力者本格降臨</span>
                </button>
              </div>

              <!-- Clean Technical Metadata -->
              <div class="px-2 space-y-1 text-[11px] text-amber-200/90 font-medium">
                <div class="flex justify-between border-b border-amber-500/20 pb-1">
                  <span class="text-amber-400/70">座號</span>
                  <span class="font-bold text-white">${String(student.seatNo).padStart(2, '0')}</span>
                </div>
                <div class="flex justify-between border-b border-amber-500/20 pb-1">
                  <span class="text-amber-400/70">班級</span>
                  <span class="font-bold text-white">${this.currentClassId} 班</span>
                </div>
                <div class="flex justify-between border-b border-amber-500/20 pb-1">
                  <span class="text-amber-400/70">類別</span>
                  <span class="font-bold text-white">${oaa.isHomeroom ? '導師班' : '科任班'}</span>
                </div>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-amber-500/20 text-[11px] text-amber-300/70 flex items-center justify-between font-mono">
              <span>OVERALL ABILITY ASSESSMENT</span>
              <span>VER. 2.0</span>
            </div>
          </div>

          <!-- Right Column: Student Metadata, OAA Evaluation Box & Stats -->
          <div class="lg:col-span-8 flex flex-col justify-between">
            <div>
              <!-- Row 1: Student Name & ID Card Headers -->
              <div class="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div class="flex items-center space-x-2 mb-1">
                    <span class="px-2 py-0.5 rounded text-[10px] font-black bg-rose-950 text-amber-300 border border-amber-500/50">
                      名前
                    </span>
                    <h1 class="text-2xl sm:text-4xl font-black tracking-wide text-white drop-shadow">
                      ${student.name}
                    </h1>
                  </div>
                  <div class="text-xs font-mono tracking-wider text-amber-300/80 pl-1">
                    STUDENT DOSSIER // SEAT ${String(student.seatNo).padStart(2, '0')}
                  </div>
                </div>

                <!-- Info Badges -->
                <div class="flex flex-col sm:flex-row gap-2 text-xs">
                  <div class="bg-[#1f0915]/90 border border-amber-500/50 rounded-xl px-3 py-1.5 flex items-center gap-2">
                    <span class="text-[10px] text-amber-400 uppercase font-bold">學籍番号</span>
                    <span class="font-bold text-white font-mono tracking-wider">${studentIdStr}</span>
                  </div>
                  <div class="bg-[#1f0915]/90 border border-amber-500/50 rounded-xl px-3 py-1.5 flex items-center gap-2">
                    <span class="text-[10px] text-amber-400 uppercase font-bold">所屬</span>
                    <span class="font-bold text-white">${this.currentClassId} 班 (${oaa.isHomeroom ? '導師班' : '數學科任'})</span>
                  </div>
                </div>
              </div>

              <!-- Row 2: Character Evaluation Box -->
              <div class="mb-6 p-4 sm:p-5 rounded-2xl bg-[#1e0a15]/80 border border-amber-500/30 text-xs sm:text-sm text-slate-100 leading-relaxed font-medium backdrop-blur-sm relative">
                <div class="text-[10px] text-amber-300 tracking-wider uppercase mb-1.5 flex items-center gap-1.5 font-bold">
                  <span class="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>能力特性與綜合評語</span>
                </div>
                <p class="whitespace-pre-wrap">${oaa.oaaSummary}</p>
                ${oaa.gatingNote ? `
                  <div class="mt-2.5 px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs flex items-center gap-2">
                    <i data-lucide="shield-alert" class="w-4 h-4 shrink-0 text-rose-400"></i>
                    <span><strong>【實力考核限制】</strong> ${oaa.gatingNote}</span>
                  </div>
                ` : ''}
              </div>

              <!-- Row 3: Four / Three Dimensions Stats Bar -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-6">
                ${oaa.metrics.map(m => `
                  <div class="flex items-center group cursor-pointer" onclick="studentDossierView.showMetricTooltip('${m.label}', '${m.grade}', '${m.score}', '${m.weight}', '${m.detail}')" title="點擊查看數據來源">
                    <span class="font-bold text-sm sm:text-base text-amber-100 whitespace-nowrap">${m.label}</span>
                    <span class="text-[10px] text-amber-400/80 ml-1.5">(${m.weight})</span>
                    <span class="flex-1 border-b border-amber-500/30 mx-3 group-hover:border-amber-400 transition"></span>
                    <span class="font-mono font-black text-sm sm:text-base ${gradeColorMap[m.grade] || 'text-white'} whitespace-nowrap">
                      ${m.grade} (${m.score})
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Row 4: Giant Overall Rating (総合評價) -->
            <div class="pt-4 border-t-2 border-amber-500/40 flex flex-wrap items-center justify-between gap-4">
              <div class="flex items-baseline space-x-3">
                <span class="text-sm sm:text-base font-bold tracking-wider text-amber-300 uppercase">
                  総合 ：
                </span>
                <span class="text-3xl sm:text-5xl font-mono font-black tracking-wider ${gradeColorMap[oaa.overallGrade] || 'text-white'}">
                  ${oaa.overallGrade} (${oaa.finalScore})
                </span>
                <span class="text-xs text-amber-300/70 ml-2">
                  (加權值: ${oaa.rawWeighted.toFixed(1)})
                </span>
              </div>

              <div class="flex items-center space-x-2">
                <span class="text-xs text-amber-300/80 hidden sm:inline font-bold">OAA VERIFIED</span>
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 flex items-center justify-center font-mono font-black text-lg text-white shadow-md">
                  ${oaa.overallGrade.charAt(0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- OAA Dimension Source Inspector (Transparency) -->
      <div class="rounded-2xl p-5 bg-[#200b17] border border-amber-500/50 text-white mb-6">
        <h3 class="text-sm font-bold tracking-wide text-amber-300 mb-3 flex items-center gap-2">
          <i data-lucide="database" class="w-4 h-4 text-amber-400"></i>
          <span>數值來源透明稽核（有理有據）</span>
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${oaa.metrics.length} gap-3 text-xs">
          ${oaa.metrics.map(m => `
            <div class="p-3 rounded-xl bg-[#2d1020]/80 border border-amber-500/30">
              <div class="flex items-center justify-between font-bold mb-1">
                <span class="text-amber-100">${m.label}</span>
                <span class="${gradeColorMap[m.grade] || 'text-white'}">${m.grade} (${m.score})</span>
              </div>
              <p class="text-[11px] text-amber-200/80 leading-normal font-sans">${m.detail}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  showMetricTooltip(label, grade, score, weight, detail) {
    window.appState.showToast(`【${label}】評級 ${grade} (${score}分，權重 ${weight})\n數據依據：${detail}`, 'info');
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
window.StudentDossierView = StudentDossierView;
window.studentDossierView = new StudentDossierView(window.appStore, window.statisticsEngine, window.dashboardCharts);

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

  // --- Calculate Grounded OAA Metrics (Pure Classroom Performance, no quiz freezing) ---
  calculateOAA(student, classId, profile, events) {
    const cls = this.store.getClass(classId);
    const isHomeroom = cls ? cls.type === 'homeroom' : (classId === '801');
    const cfg = this.store.getRegularGradeConfig ? this.store.getRegularGradeConfig() : { baseScore: 80, pointsPerUnit: 1, minScore: 0, maxScore: 100 };
    const base = cfg.baseScore;
    const rankInfo = this.store.getStudentRankInClass ? this.store.getStudentRankInClass(classId, student.seatNo) : null;

    // 1. 課堂學習表現 (Classroom Learning & Engagement, 0-100 anchored on baseScore)
    const acadEvents = events.filter(e => e.category === 'academic' || e.category === 'assessment');
    const acadCount = acadEvents.length;
    const netAcad = acadEvents.reduce((sum, e) => sum + (Number(e.delta) || 0), 0);
    const academicScore = Math.min(100, Math.max(0, Math.round(base + netAcad * 3)));

    // 2. 規律服從 (Discipline & Obedience, 0-100)
    let obedienceBase = base;
    let posDiscCount = 0;
    let negDiscCount = 0;

    events.forEach(e => {
      const isCleaning = e.tagId === 'disc_clean_fail' || e.id === 'disc_clean_fail' || (e.tagName && (e.tagName.includes('掃除') || e.tagName.includes('整潔')));
      const isDiscipline = e.category === 'discipline' || isCleaning;
      const isConflict = e.category === 'conflict';

      if (isDiscipline) {
        if (e.delta > 0) {
          obedienceBase += Number(e.delta) * 3;
          posDiscCount++;
        } else {
          obedienceBase += Number(e.delta) * 3;
          negDiscCount++;
        }
      } else if (isConflict) {
        obedienceBase += Number(e.delta) * 3.5;
        negDiscCount++;
      }
    });
    const obedienceScore = Math.min(100, Math.max(0, Math.round(obedienceBase)));

    let metrics = [];
    let rawWeighted = 0;

    if (isHomeroom) {
      let physicalBase = base;
      let physCount = 0;
      events.forEach(e => {
        const isPhys = e.tagName && (e.tagName.includes('體育') || e.tagName.includes('競賽') || e.tagName.includes('運動') || e.tagName.includes('跑'));
        if (isPhys) {
          physicalBase += Number(e.delta) * 3;
          physCount++;
        }
      });
      const physicalScore = Math.min(100, Math.max(0, Math.round(physicalBase)));

      let coopBase = base;
      let coopCount = 0;
      events.forEach(e => {
        const isCoop = e.category === 'social' || (e.tagName && (e.tagName.includes('助人') || e.tagName.includes('幹部') || e.tagName.includes('小老師')));
        if (isCoop) {
          coopBase += Number(e.delta) * 3;
          coopCount++;
        }
      });
      const coopScore = Math.min(100, Math.max(0, Math.round(coopBase)));

      metrics = [
        { key: 'academic', label: '課堂學習', score: academicScore, grade: this.getLetterGrade(academicScore), weight: '40%', detail: acadCount > 0 ? `課堂學習標籤 ${acadCount} 筆，累計 ${netAcad >= 0 ? '+' : ''}${netAcad} 點` : `基準 ${base} 分，穩定投入` },
        { key: 'physical', label: '活動表現', score: physicalScore, grade: this.getLetterGrade(physicalScore), weight: '15%', detail: physCount > 0 ? `體育與活動紀錄 ${physCount} 筆` : `基準 ${base} 分，常態表現` },
        { key: 'obedience', label: '規律服從', score: obedienceScore, grade: this.getLetterGrade(obedienceScore), weight: '35%', detail: `常規與掃除紀錄：加點 ${posDiscCount} 次、扣分 ${negDiscCount} 次` },
        { key: 'cooperation', label: '協作表現', score: coopScore, grade: this.getLetterGrade(coopScore), weight: '10%', detail: coopCount > 0 ? `熱心助人與幹部服務 ${coopCount} 筆` : `基準 ${base} 分，常態表現` }
      ];

      rawWeighted = (academicScore * 0.40) + (obedienceScore * 0.35) + (physicalScore * 0.15) + (coopScore * 0.10);
    } else {
      let thinkBase = base;
      let thinkCount = 0;
      events.forEach(e => {
        const isThink = e.tagId === 'math_breakthrough' || e.tagId === 'math_board' || e.tagId === 'math_ask' || e.id === 'math_breakthrough' || e.id === 'math_board' || e.id === 'math_ask' || (e.tagName && (e.tagName.includes('難題') || e.tagName.includes('板書') || e.tagName.includes('提問')));
        if (isThink) {
          thinkBase += Number(e.delta) * 3.5;
          thinkCount++;
        }
      });
      const thinkScore = Math.min(100, Math.max(0, Math.round(thinkBase)));

      metrics = [
        { key: 'academic', label: '課堂學習', score: academicScore, grade: this.getLetterGrade(academicScore), weight: '55%', detail: acadCount > 0 ? `課堂表現紀錄 ${acadCount} 筆，累計 ${netAcad >= 0 ? '+' : ''}${netAcad} 點` : `基準 ${base} 分，課堂常態` },
        { key: 'thinking', label: '思考解題', score: thinkScore, grade: this.getLetterGrade(thinkScore), weight: '15%', detail: thinkCount > 0 ? `上台解題與主動提問 ${thinkCount} 筆` : `基準 ${base} 分，課堂常態` },
        { key: 'obedience', label: '課堂專注', score: obedienceScore, grade: this.getLetterGrade(obedienceScore), weight: '30%', detail: `課堂專注度與常規配合紀錄` }
      ];

      rawWeighted = (academicScore * 0.55) + (obedienceScore * 0.30) + (thinkScore * 0.15);
    }

    // Overall score tracks real regular classroom score without artificial <85 C-freezing cap
    const finalScore = rankInfo ? Math.round(rankInfo.regularScore) : Math.round(rawWeighted);
    const gatingNote = null;
    const overallGrade = this.getLetterGrade(finalScore);

    const sorted = [...metrics].sort((a, b) => b.score - a.score);
    const topMetric = sorted[0];
    const lowestMetric = sorted[sorted.length - 1];

    let oaaSummary = '';
    if (finalScore >= 95) {
      oaaSummary = `該生課堂實戰表現極為卓越，尤其在【${topMetric.label}】表現堪為全班典範！本期平時成績名列前茅，展現強大的自律與班級影響力。`;
    } else if (finalScore >= 85) {
      oaaSummary = `該生本期課堂投入積極、表現優良，在【${topMetric.label}】累積穩定加分。若能在【${lowestMetric.label}】維持高標準，有望問鼎 S 級評等。`;
    } else if (finalScore >= 75) {
      oaaSummary = `該生整體日常表現平穩達標，在【${topMetric.label}】維持基本盤；建議多鼓勵主動發言或服務加點，帶動評等突破 85 分大關。`;
    } else {
      oaaSummary = `數據顯示目前平時成績低於基本標準，特別在【${lowestMetric.label}】有扣分提醒紀錄。建議即時關懷並安排加分任務幫助建立信心。`;
    }

    return {
      isHomeroom,
      academicScore,
      metrics,
      rawWeighted,
      finalScore,
      overallGrade,
      gatingNote,
      oaaSummary
    };
  }

  getLetterGrade(val) {
    if (val >= 95) return 'S';
    if (val >= 90) return 'A+';
    if (val >= 85) return 'A';
    if (val >= 80) return 'B+';
    if (val >= 75) return 'B';
    if (val >= 68) return 'C+';
    if (val >= 60) return 'C';
    return 'D';
  }

  // --- Main Render Function ---
  render(containerId, classId = null, seatNo = null) {
    this.lastContainerId = containerId || this.lastContainerId || 'student-dossier-view';
    const container = document.getElementById(this.lastContainerId);
    if (!container) return;

    if (classId) {
      this.currentClassId = classId;
    } else if (window.appState?.currentClassId) {
      this.currentClassId = window.appState.currentClassId;
    }
    if (!this.currentClassId) {
      this.currentClassId = Object.keys(this.store.getClasses())[0] || '801';
    }
    if (seatNo) this.currentSeatNo = parseInt(seatNo, 10);

    const classes = this.store.getClasses();
    let students = this.store.getStudents(this.currentClassId);
    if (!students || students.length === 0) {
      const fallbackId = Object.keys(classes)[0];
      if (fallbackId && fallbackId !== this.currentClassId) {
        this.currentClassId = fallbackId;
        students = this.store.getStudents(this.currentClassId);
      }
    }
    const student = this.store.getStudent(this.currentClassId, this.currentSeatNo) || (students && students[0]);

    if (!student) {
      container.innerHTML = `<div class="p-12 text-center text-slate-500 font-bold">查無學生資料，請先至「班級與名單管理」匯入學生</div>`;
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

  renderHistoricalTermsCard(classId, seatNo, isOAA) {
    const hist = this.store.getStudentHistoricalSummary
      ? this.store.getStudentHistoricalSummary(classId, seatNo)
      : { records: [], settledTermCount: 0, pastNetDeltaSum: 0, totalCumulativeNetDelta: 0, pastAvgRegularScore: null, allTermsAvgRegularScore: 80 };

    if (isOAA) {
      return `
        <div class="rounded-2xl p-5 bg-[#200b17] border border-amber-500/50 text-white mb-6 shadow-lg">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-amber-500/30">
            <div>
              <h3 class="text-sm sm:text-base font-black text-amber-300 flex items-center gap-2">
                <span>📜 歷次段考累積檔案與成長軌跡</span>
              </h3>
              <p class="text-xs text-amber-200/70">每次段考結算後永久封存紀錄，支援跨段考平時表現總計</p>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-xs font-mono font-black">
              <span class="px-2.5 py-1 rounded-lg bg-[#2b0f1e] border border-amber-500/50 text-amber-200">
                已結算：${hist.settledTermCount} 次段考
              </span>
              <span class="px-2.5 py-1 rounded-lg ${hist.totalCumulativeNetDelta >= 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' : 'bg-rose-950 text-rose-300 border border-rose-500/50'}">
                歷史累積淨分：${hist.totalCumulativeNetDelta >= 0 ? '+' : ''}${hist.totalCumulativeNetDelta} 點
              </span>
              <span class="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-200 border border-cyan-500/50">
                歷次均分：${hist.allTermsAvgRegularScore} 分
              </span>
            </div>
          </div>
          ${hist.records.length === 0 ? `
            <p class="text-xs text-amber-200/70">目前尚未結算任何段考。待教師於「💯 平時成績」執行第 1 次段考結算後，各次段考成績將自動封存於此。</p>
          ` : `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              ${hist.records.map(r => `
                <div class="p-3 rounded-xl bg-[#2a0f1f] border border-amber-500/35 flex items-center justify-between text-xs">
                  <div>
                    <div class="font-black text-amber-200">${r.termLabel}</div>
                    <div class="text-[11px] text-amber-200/60 font-mono">班級排名 #${r.overallRank || '-'} • ${r.eventCount} 筆紀錄</div>
                  </div>
                  <div class="text-right font-mono">
                    <div class="text-sm font-black text-white">${r.regularScore} 分 <span class="text-amber-300">(${r.tier})</span></div>
                    <div class="text-[11px] font-bold ${r.netDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}">${r.netDelta >= 0 ? '+' : ''}${r.netDelta} 點</div>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    }

    return `
      <div class="glass-card rounded-3xl p-5 sm:p-6 mb-6 border border-pink-200 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-pink-100">
          <div>
            <h3 class="text-base font-black text-slate-900 flex items-center gap-1.5">
              <span>📜 歷次段考累積檔案</span>
            </h3>
            <p class="text-xs text-slate-500 font-medium">記錄每次段考結算分數與跨段考累積加扣分總和</p>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span class="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
              已結算：${hist.settledTermCount} 次段考
            </span>
            <span class="px-2.5 py-1 rounded-xl ${hist.totalCumulativeNetDelta >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}">
              歷史累積淨分：${hist.totalCumulativeNetDelta >= 0 ? '+' : ''}${hist.totalCumulativeNetDelta} 點
            </span>
            <span class="px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              跨段考均分：${hist.allTermsAvgRegularScore} 分
            </span>
          </div>
        </div>
        ${hist.records.length === 0 ? `
          <p class="text-xs text-slate-500">目前為本期第 1 次段考計算期間，待教師至「💯 平時成績」點選結算段考後，此處會自動保存各次段考成績與累積分數。</p>
        ` : `
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            ${hist.records.map(r => `
              <div class="p-3 rounded-2xl bg-pink-50/50 border border-pink-200 flex items-center justify-between text-xs">
                <div>
                  <div class="font-black text-slate-900">${r.termLabel}</div>
                  <div class="text-[11px] text-slate-500 font-mono">全班第 ${r.overallRank || '-'} 名 • ${r.eventCount} 筆點記</div>
                </div>
                <div class="text-right font-mono">
                  <div class="text-sm font-black text-pink-700">${r.regularScore} 分 (${r.tier})</div>
                  <div class="text-[11px] font-bold ${r.netDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${r.netDelta >= 0 ? '+' : ''}${r.netDelta} 點</div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }

  // --- 📊 Compute Formative Assessment Points Breakdown by Category and Tag ---
  computeStudentPointsBreakdown(events) {
    let academic = { count: 0, delta: 0 };
    let discipline = { count: 0, delta: 0 };
    let social = { count: 0, delta: 0 };
    let conflict = { count: 0, delta: 0 };
    const tagMap = {};

    events.forEach(e => {
      const delta = Number(e.delta) || 0;
      const cat = e.category || 'discipline';
      if (cat === 'academic' || cat === 'assessment') {
        academic.count++;
        academic.delta += delta;
      } else if (cat === 'social') {
        social.count++;
        social.delta += delta;
      } else if (cat === 'conflict') {
        conflict.count++;
        conflict.delta += delta;
      } else {
        discipline.count++;
        discipline.delta += delta;
      }

      const tagName = e.tagName || (delta > 0 ? '加點' : '扣點');
      if (!tagMap[tagName]) {
        tagMap[tagName] = { count: 0, delta: 0, category: cat };
      }
      tagMap[tagName].count++;
      tagMap[tagName].delta += delta;
    });

    const tagsList = Object.entries(tagMap).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.count - a.count);

    return {
      academic,
      discipline,
      social,
      conflict,
      totalDelta: academic.delta + discipline.delta + social.delta + conflict.delta,
      totalCount: events.length,
      tagsList
    };
  }

  // --- 📊 Render Formative Assessment & Cumulative Breakdown Card ---
  renderPointsBreakdownSection(events, isOAA) {
    const data = this.computeStudentPointsBreakdown(events);
    const { academic, discipline, social, conflict, totalDelta, totalCount, tagsList } = data;

    if (isOAA) {
      return `
        <!-- Formative Assessment & Cumulative Breakdown Card (OAA Mode) -->
        <div class="rounded-3xl p-5 sm:p-6 bg-[#200b17] border-2 border-amber-500/50 text-white mb-6 shadow-xl">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-amber-500/30">
            <div class="flex items-center space-x-2.5">
              <span class="text-xl">📊</span>
              <div>
                <h3 class="text-base sm:text-lg font-black tracking-wide text-amber-200">
                  平時成績加扣分累計總表 (日常考評)
                </h3>
                <p class="text-xs text-amber-300/80">各向度與細項標籤加減分彙整 • 供平時成績結算與日常評量核算參照</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 rounded-xl bg-[#2d0f19] text-amber-300 border border-amber-500/60 font-mono font-black text-xs">
                累計記錄：${totalCount} 筆
              </span>
              <span class="px-3 py-1 rounded-xl font-mono font-black text-xs ${totalDelta >= 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/60' : 'bg-rose-950 text-rose-300 border border-rose-500/60'}">
                淨計點：${totalDelta > 0 ? '+' : ''}${totalDelta} 點
              </span>
            </div>
          </div>

          <!-- 4 Main Dimensions Overview Grid -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div class="p-3.5 rounded-2xl bg-[#2a0e1e]/90 border border-blue-500/40 flex flex-col justify-between">
              <div class="flex items-center justify-between text-xs font-bold text-cyan-300 mb-1">
                <span>📘 課堂學業表現</span>
                <span class="text-[10px] opacity-80">${academic.count} 次</span>
              </div>
              <div class="text-xl sm:text-2xl font-black font-mono text-cyan-200">
                ${academic.delta > 0 ? '+' : ''}${academic.delta} <span class="text-xs font-sans text-cyan-400">分</span>
              </div>
            </div>

            <div class="p-3.5 rounded-2xl bg-[#2a0e1e]/90 border border-pink-500/40 flex flex-col justify-between">
              <div class="flex items-center justify-between text-xs font-bold text-pink-300 mb-1">
                <span>🎀 生活常規表現</span>
                <span class="text-[10px] opacity-80">${discipline.count} 次</span>
              </div>
              <div class="text-xl sm:text-2xl font-black font-mono text-pink-200">
                ${discipline.delta > 0 ? '+' : ''}${discipline.delta} <span class="text-xs font-sans text-pink-400">分</span>
              </div>
            </div>

            <div class="p-3.5 rounded-2xl bg-[#2a0e1e]/90 border border-emerald-500/40 flex flex-col justify-between">
              <div class="flex items-center justify-between text-xs font-bold text-emerald-300 mb-1">
                <span>🤝 團隊協作服務</span>
                <span class="text-[10px] opacity-80">${social.count} 次</span>
              </div>
              <div class="text-xl sm:text-2xl font-black font-mono text-emerald-200">
                ${social.delta > 0 ? '+' : ''}${social.delta} <span class="text-xs font-sans text-emerald-400">分</span>
              </div>
            </div>

            <div class="p-3.5 rounded-2xl bg-[#2a0e1e]/90 border border-rose-500/40 flex flex-col justify-between">
              <div class="flex items-center justify-between text-xs font-bold text-rose-300 mb-1">
                <span>⚠️ 違規與同儕衝突</span>
                <span class="text-[10px] opacity-80">${conflict.count} 次</span>
              </div>
              <div class="text-xl sm:text-2xl font-black font-mono text-rose-200">
                ${conflict.delta > 0 ? '+' : ''}${conflict.delta} <span class="text-xs font-sans text-rose-400">分</span>
              </div>
            </div>
          </div>

          <!-- Specific Tag Frequency Breakdown -->
          <div>
            <h4 class="text-xs font-black text-amber-300 mb-2 flex items-center gap-1.5">
              <span>🏷️ 各項標籤累積明細（依權重排序）</span>
            </h4>
            ${tagsList.length === 0 ? `
              <p class="text-xs text-slate-400 italic py-2">目前尚無加扣點標籤紀錄，日常表現穩定。</p>
            ` : `
              <div class="flex flex-wrap gap-2">
                ${tagsList.map(t => `
                  <div class="px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                    t.delta > 0 
                      ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50' 
                      : t.delta < 0 
                        ? 'bg-rose-950/70 text-rose-300 border-rose-500/50' 
                        : 'bg-[#2a0e1e] text-slate-300 border-slate-600'
                  }">
                    <span class="font-black">${t.name}</span>
                    <span class="text-[11px] opacity-80 font-mono">×${t.count}</span>
                    <span class="px-1.5 py-0.5 rounded font-mono font-black text-xs ${
                      t.delta > 0 ? 'bg-emerald-900 text-emerald-200' : t.delta < 0 ? 'bg-rose-900 text-rose-200' : 'bg-slate-800 text-slate-300'
                    }">
                      ${t.delta > 0 ? '+' : ''}${t.delta}分
                    </span>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      `;
    }

    // Default Sanrio Mode
    return `
      <!-- Formative Assessment & Cumulative Breakdown Card (Sanrio Mode) -->
      <div class="glass-card rounded-3xl p-5 sm:p-6 mb-6 border border-pink-200 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-pink-100">
          <div class="flex items-center space-x-2.5">
            <span class="kitty-bow !w-4 !h-4"></span>
            <div>
              <h3 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
                📊 平時成績加扣分累計總表 (日常考評)
              </h3>
              <p class="text-xs text-slate-500 font-medium">清楚彙整各向度與標籤明細 • 供導師平時成績結算與親師訪談參照</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 rounded-xl bg-pink-50 text-pink-700 border border-pink-200 font-bold text-xs">
              累計事件：${totalCount} 筆
            </span>
            <span class="px-3 py-1 rounded-xl font-black text-xs ${totalDelta >= 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-rose-50 text-rose-800 border border-rose-300'}">
              淨加扣點：${totalDelta > 0 ? '+' : ''}${totalDelta} 點
            </span>
          </div>
        </div>

        <!-- 4 Main Dimensions Overview Grid -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div class="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col justify-between">
            <div class="flex items-center justify-between text-xs font-bold text-blue-700 mb-1">
              <span>📘 課堂學業加分</span>
              <span class="text-[10px] text-blue-500">${academic.count} 次</span>
            </div>
            <div class="text-xl sm:text-2xl font-black font-mono text-blue-800">
              ${academic.delta > 0 ? '+' : ''}${academic.delta} <span class="text-xs font-sans text-blue-600">分</span>
            </div>
          </div>

          <div class="p-3.5 rounded-2xl bg-pink-50/70 border border-pink-200 flex flex-col justify-between">
            <div class="flex items-center justify-between text-xs font-bold text-pink-700 mb-1">
              <span>🎀 生活常規加分</span>
              <span class="text-[10px] text-pink-500">${discipline.count} 次</span>
            </div>
            <div class="text-xl sm:text-2xl font-black font-mono text-pink-800">
              ${discipline.delta > 0 ? '+' : ''}${discipline.delta} <span class="text-xs font-sans text-pink-600">分</span>
            </div>
          </div>

          <div class="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
            <div class="flex items-center justify-between text-xs font-bold text-emerald-700 mb-1">
              <span>🤝 團隊協作服務</span>
              <span class="text-[10px] text-emerald-500">${social.count} 次</span>
            </div>
            <div class="text-xl sm:text-2xl font-black font-mono text-emerald-800">
              ${social.delta > 0 ? '+' : ''}${social.delta} <span class="text-xs font-sans text-emerald-600">分</span>
            </div>
          </div>

          <div class="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 flex flex-col justify-between">
            <div class="flex items-center justify-between text-xs font-bold text-rose-700 mb-1">
              <span>⚠️ 違規與衝突扣分</span>
              <span class="text-[10px] text-rose-500">${conflict.count} 次</span>
            </div>
            <div class="text-xl sm:text-2xl font-black font-mono text-rose-800">
              ${conflict.delta > 0 ? '+' : ''}${conflict.delta} <span class="text-xs font-sans text-rose-600">分</span>
            </div>
          </div>
        </div>

        <!-- Specific Tag Frequency Breakdown -->
        <div>
          <h4 class="text-xs font-black text-slate-700 mb-2 flex items-center gap-1">
            <span>🏷️ 各項標籤累積明細（依總分排序）</span>
          </h4>
          ${tagsList.length === 0 ? `
            <p class="text-xs text-slate-400 italic py-2">目前尚無加扣點標籤紀錄，日常表現穩定。</p>
          ` : `
            <div class="flex flex-wrap gap-2">
              ${tagsList.map(t => `
                <div class="px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                  t.delta > 0 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : t.delta < 0 
                      ? 'bg-rose-50 text-rose-800 border-rose-200' 
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                }">
                  <span class="font-black text-slate-900">${t.name}</span>
                  <span class="text-[11px] text-slate-500 font-mono">×${t.count}次</span>
                  <span class="px-1.5 py-0.5 rounded font-mono font-black text-xs ${
                    t.delta > 0 ? 'bg-emerald-100 text-emerald-800' : t.delta < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                  }">
                    ${t.delta > 0 ? '+' : ''}${t.delta}分
                  </span>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  // --- 🌟 Evolution & Title Promotion Criteria Modal ---
  openEvolutionGuideModal() {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const isOAA = this.isOAAMode();

    modalContent.innerHTML = `
      <div class="p-5 sm:p-6 max-h-[85vh] overflow-y-auto animate-fade-in-up ${isOAA ? 'bg-[#1e0a16] text-white' : 'bg-white text-slate-900'}">
        <div class="flex items-center justify-between pb-3 mb-4 border-b ${isOAA ? 'border-amber-500/40' : 'border-pink-200'}">
          <div class="flex items-center space-x-2.5">
            <span class="text-2xl">🌟</span>
            <div>
              <h3 class="font-black text-base sm:text-lg ${isOAA ? 'text-amber-200' : 'text-slate-900'}">
                稱號升階與角色進化條件說明
              </h3>
              <p class="text-xs ${isOAA ? 'text-amber-300/80' : 'text-slate-500'}">掌握學業與常規成長門檻，解鎖高階角色與專屬榮譽立繪！</p>
            </div>
          </div>
          <button onclick="appState.closeModal()" class="w-8 h-8 rounded-full ${isOAA ? 'bg-rose-950 text-amber-300 hover:bg-rose-900' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'} flex items-center justify-center font-black transition cursor-pointer">
            ✕
          </button>
        </div>

        <div class="space-y-4 text-xs sm:text-sm leading-relaxed">
          <!-- Sanrio Mode Rules -->
          <div class="p-4 rounded-2xl border ${isOAA ? 'bg-[#290e1d] border-pink-500/30' : 'bg-pink-50/70 border-pink-200'}">
            <h4 class="font-black text-pink-600 sm:text-base flex items-center gap-1.5 mb-2.5">
              <span>🌸 三麗鷗主題模式晉升階梯</span>
            </h4>
            <div class="space-y-2.5">
              <div class="flex items-start gap-2.5">
                <div class="sanrio-twinstars-badge !w-7 !h-7 shrink-0 mt-0.5"></div>
                <div>
                  <strong class="text-purple-700">🌟 S / A 級（卓越與優良表現 • ≥ 85 分）</strong>
                  <p class="text-xs ${isOAA ? 'text-slate-300' : 'text-slate-600'} mt-0.5">
                    <strong>晉級條件</strong>：本期課堂平時成績達 <strong>85 分以上（≥ 95 分為 S 級）</strong>，積極參與發言、助人或擔任幹部服務！
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-2.5">
                <div class="sanrio-kitty-badge !w-7 !h-7 shrink-0 mt-0.5"></div>
                <div>
                  <strong class="text-pink-700">🎀 B 級（穩健達標 • 75 ~ 84 分）</strong>
                  <p class="text-xs ${isOAA ? 'text-slate-300' : 'text-slate-600'} mt-0.5">
                    <strong>基準條件</strong>：平時成績維持在 <strong>75 ~ 84 分</strong>（開期基準預設 80 分），課堂秩序穩定。
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-2.5">
                <div class="sanrio-kuromi-badge !w-7 !h-7 shrink-0 mt-0.5"></div>
                <div>
                  <strong class="text-slate-700">🖤 C / D 級（提醒關懷 • &lt; 75 分）</strong>
                  <p class="text-xs ${isOAA ? 'text-slate-300' : 'text-slate-600'} mt-0.5">
                    <strong>關懷條件</strong>：本期課堂扣分累積使平時成績低於 75 分（&lt; 60 分為 D 級），需留意常規或安排課堂加點鼓勵。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- OAA Mode Rules -->
          <div class="p-4 rounded-2xl border ${isOAA ? 'bg-[#290e1d] border-amber-500/40' : 'bg-slate-50 border-slate-200'}">
            <h4 class="font-black text-amber-500 sm:text-base flex items-center gap-1.5 mb-2.5">
              <span>🏛️ 高度育成 OAA 實力至上主義模式階梯</span>
            </h4>
            <div class="space-y-2 text-xs ${isOAA ? 'text-amber-100/90' : 'text-slate-700'}">
              <p>
                <strong>🏆 角色立繪分配機制</strong>：<br>
                系統依據全班男女學生個別的<strong>「綜合實力天梯排名」</strong>動態分派 35 位動漫正式立繪：
              </p>
              <ul class="list-disc pl-5 space-y-1 text-xs">
                <li><strong>男生榜首 (Rank 1)</strong>：解鎖 白室最強 • <strong>綾小路 清隆</strong></li>
                <li><strong>女生榜首 (Rank 1)</strong>：解鎖 A班司令塔 • <strong>坂柳 有栖</strong></li>
                <li><strong>男生第 2 名</strong>：解鎖 自由實力者 • <strong>高圓寺 六助</strong></li>
                <li><strong>女生第 2 名</strong>：解鎖 B班核心天使 • <strong>一之瀨 帆波</strong></li>
                <li><strong>男生第 3 名</strong>：解鎖 C班獨裁霸者 • <strong>龍園 翔</strong></li>
                <li><strong>女生第 3 名</strong>：解鎖 堅毅領袖 • <strong>堀北 鈴音</strong></li>
              </ul>
              <div class="mt-2 pt-2 border-t ${isOAA ? 'border-amber-500/20' : 'border-slate-200'}">
                <strong>🎖️ 平時成績即時解鎖制（不設硬性小考天花板）</strong>：
                依據「💯 本期平時成績」與「班級淨積分排名」直接換算實力等級（≥95分 S 級、≥85分 A 級、≥75分 B 級），每次加扣分都會即時推動排名與專屬立繪變化！
              </div>
            </div>
          </div>
        </div>

        <div class="mt-5 text-right">
          <button type="button" onclick="appState.closeModal()" class="px-5 py-2 rounded-xl ${isOAA ? 'bg-gradient-to-r from-amber-600 to-rose-700 text-white border border-amber-400 font-black' : 'bg-slate-900 text-white font-bold'} text-xs transition shadow-sm active:scale-95 cursor-pointer">
            了解，關閉說明
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  // --- 🌸 Mode 1: Default Sanrio Mode ---
  renderDefaultMode(container, student, classes, students, profile, events, oaa) {
    const rankInfo = this.store.getStudentRankInClass ? this.store.getStudentRankInClass(this.currentClassId, student.seatNo) : null;
    const histSummary = this.store.getStudentHistoricalSummary ? this.store.getStudentHistoricalSummary(this.currentClassId, student.seatNo) : { totalCumulativeNetDelta: 0 };
    const regularScore = rankInfo ? rankInfo.regularScore : (profile ? profile.scoreMean : 80);
    const tierBadge = rankInfo ? rankInfo.tier : this.getLetterGrade(regularScore);
    const netPoints = rankInfo ? rankInfo.netDelta : (profile ? profile.pointsBreakdown.net : 0);

    let mascotClass = 'sanrio-kitty-badge';
    let mascotTitle = 'Hello Kitty (穩健達標 B 級)';
    if (regularScore >= 85) {
      mascotClass = 'sanrio-twinstars-badge';
      mascotTitle = `小雙星 (優良表現 ${tierBadge} 級)`;
    } else if (regularScore < 75) {
      mascotClass = 'sanrio-kuromi-badge';
      mascotTitle = `酷洛米 (關懷提醒 ${tierBadge} 級)`;
    }

    const counselingSynthesis = this.generateCounselingSynthesis(profile, events);
    const orderedEvents = [...events].sort((a, b) => `${b.date || ''} ${b.time || ''}`.localeCompare(`${a.date || ''} ${a.time || ''}`));

    container.innerHTML = `
      <!-- Top Selector Bar -->
      <div class="glass-card rounded-3xl p-4 sm:p-5 mb-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border border-pink-200 shadow-sm bg-gradient-to-r from-pink-50/80 via-white to-sky-50/80">
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <div class="${mascotClass} !w-12 !h-12 sm:!w-14 sm:!h-14 bg-white p-1 rounded-2xl shadow-sm border border-pink-200 shrink-0 self-start sm:self-auto" title="${mascotTitle}"></div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-xl sm:text-3xl font-black text-slate-900">${student.name}</h2>
              <span class="text-xs px-2.5 py-1 rounded-xl font-black whitespace-nowrap shrink-0 ${student.gender === 'F' ? 'bg-pink-100 text-pink-700 border border-pink-300' : 'bg-blue-100 text-blue-700 border border-blue-300'}">
                ${student.gender === 'F' ? '👧 女生' : '👦 男生'}
              </span>
              <span class="text-xs sm:text-sm px-3 py-1 rounded-full font-black bg-pink-100 text-pink-700 border border-pink-300 whitespace-nowrap shrink-0">
                ${this.currentClassId} 班 • 座號 ${String(student.seatNo).padStart(2, '0')}
              </span>
            </div>
            
            <div class="flex flex-wrap items-center gap-2 text-xs sm:text-sm mt-2 font-bold">
              <span class="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 inline-flex items-center gap-1 whitespace-nowrap">
                ${window.cqGradeCrestSvg ? window.cqGradeCrestSvg('w-3.5 h-3.5') : ''}<span>本期平時成績: <strong class="text-blue-700 font-black text-sm">${regularScore}</strong> 分 (${tierBadge} 級)</span>
              </span>
              <span class="px-2.5 py-0.5 rounded-lg whitespace-nowrap ${netPoints >= 0 ? 'badge-character-pos' : 'badge-character-neg'}">
                🎀 本期淨點: <strong class="${netPoints >= 0 ? 'text-pink-700' : 'text-rose-700'} font-black text-sm">${netPoints > 0 ? '+' : ''}${netPoints}</strong> 點
              </span>
              <span class="px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 whitespace-nowrap">
                📜 歷史總累積: <strong class="font-black">${histSummary.totalCumulativeNetDelta >= 0 ? '+' : ''}${histSummary.totalCumulativeNetDelta}</strong> 點
              </span>
              <button type="button" onclick="studentDossierView.openEvolutionGuideModal()" class="px-2.5 py-0.5 rounded-lg bg-pink-100/80 hover:bg-pink-200 text-pink-800 border border-pink-300 text-xs font-bold transition inline-flex items-center gap-1 whitespace-nowrap cursor-pointer" title="查看等第與角色晉升條件">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-pink-600 shrink-0"></i>
                <span>等第條件</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Class/Student Switchers -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
          <select onchange="studentDossierView.switchClass(this.value)" class="w-full sm:w-auto min-h-[38px] border border-pink-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold focus:outline-none bg-white">
            ${Object.values(classes).map(c => `
              <option value="${c.id}" ${this.currentClassId === c.id ? 'selected' : ''}>${c.name}</option>
            `).join('')}
          </select>

          <select onchange="studentDossierView.switchStudent(this.value)" class="w-full sm:w-auto min-h-[38px] border border-pink-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold focus:outline-none bg-white">
            ${students.map(s => `
              <option value="${s.seatNo}" ${this.currentSeatNo === s.seatNo ? 'selected' : ''}>
                ${String(s.seatNo).padStart(2, '0')} 號 ${s.name}
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- Historical Term Archives Card -->
      ${this.renderHistoricalTermsCard(this.currentClassId, student.seatNo, false)}

      <!-- Formative Assessment & Cumulative Points Breakdown Card -->
      ${this.renderPointsBreakdownSection(events, false)}

      <!-- Main Visuals (Radar + EWMA Curve) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 shadow-sm bg-white">
          <h3 class="text-sm sm:text-base font-black flex items-center gap-2 mb-1 text-slate-800">
            <span class="kitty-cat-mini"></span>
            五維度課堂行為雷達 (0-100)
          </h3>
          <p class="text-xs text-slate-500 mb-3 font-medium">課堂學習、積極動機、作業責任感、常規紀律與同儕互動</p>
          <div class="relative h-64">
            <canvas id="student-radar-chart"></canvas>
          </div>
        </div>

        <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 shadow-sm bg-white">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
            <h3 class="text-sm sm:text-base font-black flex items-center gap-2 text-slate-800">
              <span class="kitty-bow shrink-0"></span>
              <span>平時成績時序走勢 (EWMA 平滑趨勢線)</span>
            </h3>
            <span class="text-xs font-black whitespace-nowrap shrink-0 ${profile.scoreSlope > 0 ? 'text-emerald-700' : profile.scoreSlope < 0 ? 'text-rose-700' : 'text-slate-500'}">
              近期斜率: ${profile.scoreSlope > 0 ? '+' : ''}${profile.scoreSlope}
            </span>
          </div>
          <p class="text-xs text-slate-500 mb-3 font-medium">呈現每次加扣分後的平時成績即時累積軌跡與平滑趨勢</p>
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
              家長晤談與班級輔導綜合備忘錄
            </h3>
            <button onclick="studentDossierView.copyCounselingMemo()" class="px-3.5 py-1.5 rounded-xl bg-pink-100 text-pink-700 border border-pink-300 text-xs font-bold hover:bg-pink-200 transition flex items-center gap-1 cursor-pointer">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i> 一鍵複製備忘
            </button>
          </div>

          <div id="counseling-memo-box" class="p-4 rounded-2xl bg-pink-50/60 border border-pink-200 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium space-y-2.5">
            <p><strong>【${student.name} 同學 (座號 ${String(student.seatNo).padStart(2, '0')}) 本期課堂表現綜合報告】</strong></p>
            <p>• <strong>本期平時成績</strong>：目前結算預估為 <strong>${regularScore} 分 (${tierBadge} 級)</strong>（班級排名第 ${rankInfo?.overallRank || '-'} 名），近期表現走勢呈現【${profile.scoreSlope > 0 ? '持續積極加分上升' : profile.scoreSlope < 0 ? '近期有扣分波動，需提醒收心' : '穩定平緩'}】。</p>
            <p>• <strong>課堂加扣分與歷史累積</strong>：本期淨積分 ${netPoints > 0 ? '+' : ''}${netPoints} 點；歷次段考累積總淨分為 ${histSummary.totalCumulativeNetDelta >= 0 ? '+' : ''}${histSummary.totalCumulativeNetDelta} 點。</p>
            <p>• <strong>晤談建議導向</strong>：${counselingSynthesis.recommendation}</p>
          </div>
        </div>

        <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 shadow-sm bg-white">
          <h3 class="text-sm sm:text-base font-black flex items-center gap-2 mb-3 text-slate-800">
            <i data-lucide="history" class="w-4 h-4 text-pink-500"></i>
            本期點記記事明細 (${orderedEvents.length} 筆)
          </h3>
          <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            ${orderedEvents.length === 0 ? `
              <div class="text-center py-10 text-slate-400 text-xs">
                <div class="sanrio-sticker-kitty mb-2"></div>
                <p class="font-bold">本期尚無加減分登記，保持基準穩定表現</p>
              </div>
            ` : orderedEvents.map(e => `
              <div class="p-3 rounded-xl border border-pink-100 bg-pink-50/40 text-xs sm:text-sm">
                <div class="flex items-center justify-between gap-2 font-bold mb-1">
                  <span class="text-slate-600 font-mono text-xs">${e.date || ''} ${e.time || ''} ${e.period !== undefined ? `第${e.period}節` : ''}</span>
                  <div class="flex items-center gap-1.5">
                    <span class="px-2 py-0.5 rounded-full text-xs font-black ${e.delta > 0 ? 'bg-emerald-100 text-emerald-800' : e.delta < 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'}">
                      ${e.tagName} (${e.delta > 0 ? '+' : ''}${e.delta})
                    </span>
                    <button type="button" onclick="studentDossierView.editStudentEvent('${e.id}')" class="px-1.5 py-0.5 rounded bg-white border border-pink-200 text-pink-700 hover:bg-pink-50 text-[10px] font-bold transition cursor-pointer" title="修改分數或備註">✏️ 修改</button>
                    <button type="button" onclick="studentDossierView.deleteStudentEvent('${e.id}')" class="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-300 text-[10px] font-bold transition cursor-pointer" title="撤銷這筆點記">撤銷</button>
                  </div>
                </div>
                ${e.note ? `<p class="text-slate-800 text-xs font-medium">${e.note}</p>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

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

    const rankInfo = this.store.getStudentRankInClass ? this.store.getStudentRankInClass(this.currentClassId, student.seatNo) : { overallRank: 1, genderRank: 1, gender: 'M' };
    const overallRank = rankInfo?.overallRank || 1;
    const studentGender = student.gender || rankInfo?.gender || 'M';
    const genderRank = rankInfo?.genderRank || 1;
    const coteChar = window.appState?.getCoteCharacterByGenderAndRank ? window.appState.getCoteCharacterByGenderAndRank(studentGender, genderRank) : (window.appState?.getCoteCharacterByRank ? window.appState.getCoteCharacterByRank(overallRank) : null);
    const charFullImage = coteChar?.image || (studentGender === 'F' ? './assets/cote/official/sakayanagi_full.webp' : './assets/cote/official/ayanokoji_full.webp');
    const charAvatar = coteChar?.avatar || (studentGender === 'F' ? './assets/cote/official/sakayanagi.webp' : './assets/cote/official/ayanokoji.webp');
    const charName = coteChar?.name || (studentGender === 'F' ? '坂柳 有栖' : '綾小路 清隆');
    const charClassTitle = coteChar?.classTitle || (studentGender === 'F' ? '高度育成 2年A班 // A班司令塔' : '高度育成 2年D班 // 白室最頂點');

    container.innerHTML = `
      <!-- OAA Top Control Bar -->
      <div class="rounded-2xl p-3.5 sm:p-4 mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-[#240d1a] border border-amber-500/50 shadow-lg text-white">
        <div class="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 min-w-0 w-full lg:flex-1">
          <div class="bg-amber-50/95 px-2.5 py-1 rounded-xl border border-amber-400/75 shadow-sm shrink-0 self-start sm:self-auto">
            <img src="./assets/cote/cote_logo_s3.png" alt="ようこそ実力至上主義の教室へ" class="h-6 sm:h-8 object-contain">
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-base sm:text-lg font-black tracking-wider text-amber-200 uppercase">
              OAA 學生綜合能力評估卡
            </h2>
            <div class="flex flex-wrap items-center gap-2 mt-0.5">
              <p class="text-[11px] text-amber-300/80">高度育成高等學校 官方學生檔案</p>
              <button type="button" onclick="studentDossierView.openEvolutionGuideModal()" class="px-2 py-0.5 rounded-lg bg-[#190712] hover:bg-rose-950 text-amber-300 border border-amber-500/50 text-[11px] font-bold transition inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer" title="查看實力晉階與卡階規則">
                <i data-lucide="sparkles" class="w-3 h-3 shrink-0 text-amber-400"></i>
                <span>實力晉階規則</span>
              </button>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
          <select onchange="studentDossierView.switchClass(this.value)" class="w-full sm:w-auto min-h-[38px] bg-[#1c0a14] border border-amber-500/60 text-amber-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none">
            ${Object.values(classes).map(c => `
              <option value="${c.id}" ${this.currentClassId === c.id ? 'selected' : ''}>${c.name}</option>
            `).join('')}
          </select>

          <select onchange="studentDossierView.switchStudent(this.value)" class="w-full sm:w-auto min-h-[38px] bg-[#1c0a14] border border-amber-500/60 text-amber-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none">
            ${students.map(s => `
              <option value="${s.seatNo}" ${this.currentSeatNo === s.seatNo ? 'selected' : ''}>
                No.${String(s.seatNo).padStart(2, '0')} ${s.name}
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- 🌟 Authentic COTE Student Card (Replica of the Official Reference Image) -->
      <div class="relative overflow-hidden rounded-3xl p-4 sm:p-8 bg-gradient-to-br from-[#290e1b] via-[#381224] to-[#1c0712] border-2 border-amber-500/50 shadow-2xl text-white mb-6">
        <!-- Right Side Vertical Watermark Text (Faithfully matching the official light novel) -->
        <div class="hidden sm:block absolute top-8 right-3 sm:right-4 font-mono text-[9px] sm:text-[10px] tracking-[0.35em] text-amber-400/20 uppercase select-none [writing-mode:vertical-rl] pointer-events-none">
          ADVANCED NURTURING HIGH SCHOOL // OAA
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
          <!-- Left Column: Character Silhouette / Photo Card -->
          <div class="lg:col-span-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-amber-500/30 pb-5 lg:pb-0 lg:pr-6">
            <div>
              <!-- Silhouette / Official Photo Card (Official Non-Q Standing Portrait) -->
              <div class="w-36 sm:w-44 lg:w-full aspect-[4/5] max-w-[240px] mx-auto mb-2 rounded-2xl bg-gradient-to-b from-[#1b0812] via-[#2a0e1c] to-[#12050c] border-2 border-amber-500/60 overflow-hidden shadow-md relative group flex items-center justify-center p-2">
                <img src="${charFullImage}" class="w-full h-full object-contain object-top group-hover:scale-105 transition duration-300 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]" alt="${charName}" title="高度育成生徒立繪 - ${charName}">
                <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 text-center">
                  <div class="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                    高度育成生徒立繪 // ${studentGender === 'F' ? '女生' : '男生'}階位 #${genderRank} (總 #${overallRank})
                  </div>
                  <div class="text-sm font-black text-white truncate">
                    ${charName}
                  </div>
                </div>
              </div>

              <!-- Clean Technical Metadata -->
              <div class="px-2 space-y-1.5 text-xs text-amber-200/90 font-medium">
                <div class="flex justify-between items-center border-b border-amber-500/20 pb-1 gap-2 min-w-0">
                  <span class="text-amber-400/80 shrink-0">座號 / 班級</span>
                  <span class="font-bold text-white shrink-0">${String(student.seatNo).padStart(2, '0')} 號 (${this.currentClassId}班)</span>
                </div>
                <div class="flex justify-between items-center border-b border-amber-500/20 pb-1 gap-2 min-w-0">
                  <span class="text-amber-400/80 shrink-0">性別</span>
                  <span class="font-bold text-amber-300 shrink-0">${studentGender === 'F' ? '👧 女生' : '👦 男生'}</span>
                </div>
                <div class="flex justify-between items-center border-b border-amber-500/20 pb-1 gap-2 min-w-0">
                  <span class="text-amber-400/80 shrink-0">班級實力排名</span>
                  <span class="font-black text-amber-300 truncate text-right">總第 ${overallRank} 名 (${studentGender === 'F' ? '女' : '男'}生 #${genderRank})</span>
                </div>
                <div class="flex justify-between items-center border-b border-amber-500/20 pb-1 gap-2 min-w-0">
                  <span class="text-amber-400/80 shrink-0">實力對應角色</span>
                  <span class="font-black text-white truncate max-w-[130px] text-right">${charName}</span>
                </div>
                <div class="flex justify-between items-center border-b border-amber-500/20 pb-1 gap-2 min-w-0">
                  <span class="text-amber-400/80 shrink-0">班級類別</span>
                  <span class="font-bold text-white shrink-0">${oaa.isHomeroom ? '導師班' : '科任班'}</span>
                </div>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-amber-500/20 text-xs text-amber-300/70 flex items-center justify-between font-mono">
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
                  <div class="flex items-center space-x-2 mb-1 flex-wrap gap-2">
                    <span class="px-2 py-0.5 rounded text-xs font-black bg-rose-950 text-amber-300 border border-amber-500/50">
                      名前
                    </span>
                    <h1 class="text-2xl sm:text-4xl font-black tracking-wide text-white drop-shadow">
                      ${student.name}
                    </h1>
                    <span class="text-xs px-2.5 py-1 rounded-xl font-black ${studentGender === 'F' ? 'bg-pink-950/90 text-pink-300 border border-pink-500/50' : 'bg-blue-950/90 text-blue-300 border border-blue-500/50'}">
                      ${studentGender === 'F' ? '👧 女生' : '👦 男生'}
                    </span>
                  </div>
                  <div class="text-xs font-mono tracking-wider text-amber-300/80 pl-1">
                    STUDENT DOSSIER // SEAT ${String(student.seatNo).padStart(2, '0')}
                  </div>
                </div>

                <!-- Info Badges -->
                <div class="flex flex-wrap sm:flex-nowrap gap-2 text-xs">
                  <div class="bg-[#1f0915]/90 border border-amber-500/50 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shrink-0">
                    <span class="text-xs text-amber-400 uppercase font-bold shrink-0">學籍番号</span>
                    <span class="font-bold text-white font-mono tracking-wider">${studentIdStr}</span>
                  </div>
                  <div class="bg-[#1f0915]/90 border border-amber-500/50 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shrink-0">
                    <span class="text-xs text-amber-400 uppercase font-bold shrink-0">全班位階</span>
                    <span class="font-bold text-amber-200">#${overallRank} (${studentGender === 'F' ? '女' : '男'} #${genderRank})</span>
                  </div>
                  <div class="bg-[#1f0915]/90 border border-amber-500/50 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shrink-0">
                    <span class="text-xs text-amber-400 uppercase font-bold shrink-0">實力對應</span>
                    <span class="font-bold text-amber-200">${charName}</span>
                  </div>
                </div>
              </div>

              <!-- Row 2: Character Evaluation Box -->
              <div class="mb-6 p-4 sm:p-5 rounded-2xl bg-[#1e0a15]/80 border border-amber-500/30 text-xs sm:text-sm text-slate-100 leading-relaxed font-medium backdrop-blur-sm relative">
                <div class="text-xs text-amber-300 tracking-wider uppercase mb-1.5 flex items-center gap-1.5 font-bold">
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
                  <div class="flex items-center group cursor-pointer min-w-0" onclick="studentDossierView.showMetricTooltip('${m.label}', '${m.grade}', '${m.score}', '${m.weight}', '${m.detail}')" title="點擊查看數據來源">
                    <span class="font-bold text-sm sm:text-base text-amber-100 whitespace-nowrap shrink-0">${m.label}</span>
                    <span class="text-xs text-amber-400/80 ml-1.5 shrink-0">(${m.weight})</span>
                    <span class="flex-1 min-w-[16px] border-b border-amber-500/30 mx-2 sm:mx-3 group-hover:border-amber-400 transition"></span>
                    <span class="font-mono font-black text-sm sm:text-base ${gradeColorMap[m.grade] || 'text-white'} whitespace-nowrap shrink-0">
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

      <!-- Historical Term Archives Card (OAA) -->
      ${this.renderHistoricalTermsCard(this.currentClassId, student.seatNo, true)}

      <!-- Formative Assessment Points Breakdown (平時成績加扣分累計總表) -->
      ${this.renderPointsBreakdownSection(events, true)}

      <!-- OAA Dimension Source Inspector (Transparency) -->
      <div class="rounded-2xl p-5 bg-[#200b17] border border-amber-500/50 text-white mb-6">
        <h3 class="text-sm font-bold tracking-wide text-amber-300 mb-3 flex items-center gap-2">
          <i data-lucide="database" class="w-4 h-4 text-amber-400"></i>
          <span>課堂表現數據來源透明稽核（有理有據）</span>
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

      <!-- OAA Analytics: 5-Dim Radar & EWMA Trajectory -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="bg-[#180710]/95 rounded-2xl border border-amber-500/40 p-5 shadow-lg">
          <h3 class="text-sm sm:text-base font-black text-amber-300 flex items-center gap-2 mb-1">
            <i data-lucide="compass" class="w-4 h-4 text-amber-400"></i>
            OAA 五維潛能雷達圖 (5-Dimension Radar)
          </h3>
          <p class="text-xs text-amber-200/60 mb-3 font-medium">課堂學習、積極動機、作業責任感、常規紀律與同儕互動</p>
          <div class="relative h-64">
            <canvas id="student-radar-chart"></canvas>
          </div>
        </div>

        <div class="bg-[#180710]/95 rounded-2xl border border-amber-500/40 p-5 shadow-lg">
          <h3 class="text-sm sm:text-base font-black text-amber-300 flex items-center gap-2 mb-1">
            <i data-lucide="trending-up" class="w-4 h-4 text-amber-400"></i>
            平時成績 EWMA 波動指數走勢圖
          </h3>
          <p class="text-xs text-amber-200/60 mb-3 font-medium">虛線為逐次加減分後分數，金黃實線為平滑走勢線</p>
          <div class="relative h-64">
            <canvas id="student-ewma-chart"></canvas>
          </div>
        </div>
      </div>

      <!-- OAA Bottom Row: Counseling Memo & Event Timeline -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-[#180710]/95 rounded-2xl border border-amber-500/40 p-5 shadow-lg">
          <div class="flex items-center justify-between gap-2 mb-3">
            <h3 class="text-sm sm:text-base font-black text-amber-300 flex items-center gap-2">
              <i data-lucide="file-text" class="w-4 h-4 text-amber-400"></i>
              S-System 指導評估 & 家長晤談備忘錄
            </h3>
            <button onclick="studentDossierView.copyCounselingMemo()" class="px-3.5 py-1.5 rounded-xl bg-amber-950 text-amber-300 border border-amber-500/60 text-xs font-bold hover:bg-amber-900 transition flex items-center gap-1 cursor-pointer">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i> 一鍵複製備忘
            </button>
          </div>

          ${(() => {
            const rankData = rankInfo || { regularScore: oaa.finalScore, netDelta: 0, tier: oaa.overallGrade };
            const safeMean = rankData.regularScore;
            const safeEwma = profile && profile.ewmaScores && profile.ewmaScores.length > 0 ? profile.ewmaScores[profile.ewmaScores.length - 1] : safeMean;
            const safeSlope = profile ? profile.scoreSlope : 0;
            const netPts = rankData.netDelta || 0;
            const histSum = this.store.getStudentHistoricalSummary ? this.store.getStudentHistoricalSummary(this.currentClassId, student.seatNo) : { totalCumulativeNetDelta: netPts };
            const synthesis = this.generateCounselingSynthesis(profile || { scoreMean: safeMean, scoreSlope: safeSlope }, events);
            return `
              <div id="counseling-memo-box" class="p-4 rounded-xl bg-[#240b18] border border-amber-500/30 text-xs sm:text-sm text-amber-100 leading-relaxed font-medium space-y-2.5">
                <p><strong>【${student.name} 同學 (座號 ${String(student.seatNo).padStart(2, '0')} / 等級 ${oaa.overallGrade}) 平時考核評估】</strong></p>
                <p>• <strong>本期平時成績</strong>：目前結算為 <strong>${safeMean} 分</strong>（EWMA 平滑指標 ${safeEwma} 分），近期表現呈現【${safeSlope > 0 ? '穩定拔尖上升' : safeSlope < 0 ? '近期有波動拉回，需提醒收心' : '穩定常態'}】。</p>
                <p>• <strong>課堂積點與歷史累積</strong>：本期課堂淨積分 ${netPts > 0 ? '+' : ''}${netPts} 點；跨段考累積總淨分為 ${histSum.totalCumulativeNetDelta >= 0 ? '+' : ''}${histSum.totalCumulativeNetDelta} 點。</p>
                <p>• <strong>指導建議導向</strong>：${synthesis.recommendation}</p>
              </div>
            `;
          })()}
        </div>

        <div class="bg-[#180710]/95 rounded-2xl border border-amber-500/40 p-5 shadow-lg">
          <h3 class="text-sm sm:text-base font-black text-amber-300 flex items-center gap-2 mb-3">
            <i data-lucide="history" class="w-4 h-4 text-amber-400"></i>
            本期點記記事明細 (${events.length} 筆)
          </h3>
          <div class="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            ${events.length === 0 ? `
              <div class="text-center py-10 text-amber-200/50 text-xs">
                <p class="font-bold">本期尚無特定事件登記，表現維持穩定</p>
              </div>
            ` : [...events].sort((a, b) => `${b.date || ''} ${b.time || ''}`.localeCompare(`${a.date || ''} ${a.time || ''}`)).map(e => `
              <div class="p-3 rounded-xl bg-[#240b18] border border-amber-500/25 flex items-start justify-between gap-2 text-xs">
                <div class="min-w-0">
                  <div class="font-bold text-amber-100">${e.tagName || e.category} ${e.note ? `<span class="text-amber-300/70 font-normal">(${e.note})</span>` : ''}</div>
                  <div class="text-[11px] text-amber-200/60 font-mono mt-0.5">${e.date || ''} ${e.time || ''}</div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span class="px-2 py-0.5 rounded font-black font-mono ${Number(e.delta) >= 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40'}">
                    ${Number(e.delta) > 0 ? '+' : ''}${e.delta} 點
                  </span>
                  <button type="button" onclick="studentDossierView.editStudentEvent('${e.id}')" class="px-1.5 py-0.5 rounded bg-[#16060f] border border-amber-500/40 text-amber-200 hover:border-amber-300 text-[10px] font-bold cursor-pointer" title="修改分數或備註">✏️ 修改</button>
                  <button type="button" onclick="studentDossierView.deleteStudentEvent('${e.id}')" class="px-1.5 py-0.5 rounded bg-[#16060f] border border-amber-500/30 text-amber-300/80 hover:text-rose-300 hover:border-rose-400 text-[10px] font-bold cursor-pointer" title="撤銷這筆點記">撤銷</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    if (this.charts && profile) {
      this.charts.renderStudentDetailCharts('student-radar-chart', 'student-ewma-chart', profile);
    }
  }

  showMetricTooltip(label, grade, score, weight, detail) {
    window.appState.showToast(`【${label}】評級 ${grade} (${score}分，權重 ${weight})\n數據依據：${detail}`, 'info');
  }

  generateCounselingSynthesis(profile, events) {
    let recommendation = '';
    if (profile.scoreMean >= 88 && profile.scoreSlope >= 0) {
      recommendation = '課堂投入極為積極且自律表現優異，建議適度給予進階任務或安排擔任小老師協助同儕！';
    } else if (profile.scoreMean < 75) {
      recommendation = '近期課堂扣分提醒較多，建議導師個別關懷作息與座位互動，並多設計「低門檻即時加分」重建信心。';
    } else if (profile.scoreSlope < -1.5) {
      recommendation = '近期課堂表現有連續下滑波動，需留意是否分心、同儕影響或作息疲憊，適時口頭提醒收心。';
    } else {
      recommendation = '課堂常規與學習狀態維持穩健，建議持續以具體口頭讚美與加點鼓勵，保持良好參與節奏。';
    }
    return { recommendation };
  }

  editStudentEvent(eventId) {
    if (!eventId || !window.appState?.openEditEventModal) return;
    window.appState.openEditEventModal(eventId, () => {
      this.render(this.lastContainerId || 'student-dossier-view', this.currentClassId, this.currentSeatNo);
    });
  }

  deleteStudentEvent(eventId) {
    if (!eventId || !this.store.deleteEvent) return;
    const ok = this.store.deleteEvent(eventId);
    if (ok) {
      window.appState?.showToast('已撤銷該筆課堂點記並更新平時成績', 'success');
      this.render(this.lastContainerId || 'student-dossier-view', this.currentClassId, this.currentSeatNo);
      if (window.matrixView && document.getElementById('classroom-matrix-view') && !document.getElementById('classroom-matrix-view').classList.contains('hidden')) {
        window.matrixView.render('classroom-matrix-view', this.currentClassId);
      }
    }
  }

  toggleStudentGender() {
    if (!this.currentClassId || !this.currentSeatNo) return;
    const newGender = this.store.toggleStudentGender(this.currentClassId, this.currentSeatNo);
    window.appState.showToast(`已將座號 ${this.currentSeatNo} 切換為【${newGender === 'F' ? '👧 女生' : '👦 男生'}】`, 'success');
    this.render(this.lastContainerId || 'student-dossier-view', this.currentClassId, this.currentSeatNo);
    // If matrix view is active or rendered, update it
    if (window.matrixView) {
      window.matrixView.render('classroom-matrix-view', this.currentClassId);
    }
  }

  switchClass(classId) {
    this.currentClassId = classId;
    const students = this.store.getStudents(classId);
    this.currentSeatNo = students[0] ? students[0].seatNo : 1;
    if (window.appState && window.appState.currentClassId !== classId) {
      window.appState.handleManualClassChange(classId);
    } else {
      this.render(this.lastContainerId || 'student-dossier-view', this.currentClassId, this.currentSeatNo);
    }
  }

  switchStudent(seatNo) {
    this.currentSeatNo = parseInt(seatNo, 10);
    this.render(this.lastContainerId || 'student-dossier-view', this.currentClassId, this.currentSeatNo);
  }

  copyCounselingMemo() {
    const box = document.getElementById('counseling-memo-box');
    if (box) {
      if (window.copyTextSafe) {
        window.copyTextSafe(box.innerText, '已複製家長晤談備忘錄！');
      } else {
        navigator.clipboard.writeText(box.innerText);
        window.appState?.showToast('已複製家長晤談備忘錄！', 'success');
      }
    }
  }
}

// Global Student Dossier Instance
window.StudentDossierView = StudentDossierView;
window.studentDossierView = new StudentDossierView(window.appStore, window.statisticsEngine, window.dashboardCharts);

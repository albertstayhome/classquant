/**
 * Quantitative Educational Statistics Engine
 * Implements EWMA, 2-sigma cliff drop detection, Box Plot quartiles, 4-quadrant clustering,
 * and Multi-Class Comparative Benchmarking for differentiated homework and instructional strategy.
 * Fully null-safe for newly added classes and dynamically modified rosters.
 */

class StatisticsEngine {
  constructor(store) {
    this.store = store;
  }

  // --- Basic Statistical Utilities ---
  mean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  standardDeviation(arr, isSample = true) {
    if (!arr || arr.length < (isSample ? 2 : 1)) return 0;
    const avg = this.mean(arr);
    const sumSquareDiff = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0);
    const denom = isSample ? arr.length - 1 : arr.length;
    return Math.sqrt(sumSquareDiff / denom);
  }

  quantile(sortedArr, q) {
    if (!sortedArr || sortedArr.length === 0) return 0;
    const pos = (sortedArr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sortedArr[base + 1] !== undefined) {
      return sortedArr[base] + rest * (sortedArr[base + 1] - sortedArr[base]);
    } else {
      return sortedArr[base];
    }
  }

  getFiveNumberSummary(arr) {
    if (!arr || arr.length === 0) {
      return { min: 0, q1: 0, median: 0, q3: 0, max: 0, iqr: 0, outliers: [] };
    }
    const sorted = [...arr].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const q1 = this.quantile(sorted, 0.25);
    const median = this.quantile(sorted, 0.5);
    const q3 = this.quantile(sorted, 0.75);
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = sorted.filter(x => x < lowerBound || x > upperBound);

    return {
      min: Math.round(min * 10) / 10,
      q1: Math.round(q1 * 10) / 10,
      median: Math.round(median * 10) / 10,
      q3: Math.round(q3 * 10) / 10,
      max: Math.round(max * 10) / 10,
      iqr: Math.round(iqr * 10) / 10,
      outliers
    };
  }

  // --- EWMA (Exponential Weighted Moving Average) ---
  calculateEWMA(values, alpha = 0.35) {
    if (!values || values.length === 0) return [];
    const ewma = [values[0]];
    for (let i = 1; i < values.length; i++) {
      const smoothed = alpha * values[i] + (1 - alpha) * ewma[i - 1];
      ewma.push(Math.round(smoothed * 10) / 10);
    }
    return ewma;
  }

  // --- Linear Regression (Slope for progress velocity) ---
  calculateSlope(yValues) {
    const n = yValues.length;
    if (n < 2) return 0;
    const xValues = Array.from({ length: n }, (_, i) => i + 1);
    const xMean = this.mean(xValues);
    const yMean = this.mean(yValues);

    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
      denominator += Math.pow(xValues[i] - xMean, 2);
    }
    return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100) / 100;
  }

  // --- Student Comprehensive Metrics Profile (Pure Classroom Regular Grading) ---
  getStudentProfile(classId, seatNo) {
    const student = this.store.getStudent(classId, seatNo);
    if (!student) return null;

    const cfg = this.store.getRegularGradeConfig
      ? this.store.getRegularGradeConfig()
      : { baseScore: 80, pointsPerUnit: 1, minScore: 0, maxScore: 100 };

    const classEvents = this.store.getEvents(classId)
      .filter(e => e.seatNo === parseInt(seatNo, 10))
      .sort((a, b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`));

    // 1. Classroom Behavior & Engagement Metrics
    let academicBonus = 0;
    let disciplineInfractions = 0;
    let conflictIncidents = 0;
    let socialContributions = 0;
    let assessmentBonus = 0;
    let positivePts = 0;
    let negativePts = 0;
    let recentNegativeCount = 0;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Build chronological running regular score series for EWMA & trend
    const runningScores = [cfg.baseScore];
    let runningNet = 0;

    classEvents.forEach(evt => {
      const delta = Number(evt.delta) || 0;
      if (delta > 0) positivePts += delta;
      if (delta < 0) negativePts += delta;

      if (evt.category === 'academic') {
        academicBonus += delta;
      } else if (evt.category === 'discipline') {
        disciplineInfractions += delta;
      } else if (evt.category === 'conflict') {
        conflictIncidents += delta;
      } else if (evt.category === 'social') {
        socialContributions += delta;
      } else if (evt.category === 'assessment') {
        assessmentBonus += delta;
      }

      runningNet += delta;
      const stepScore = Math.round(Math.min(cfg.maxScore, Math.max(cfg.minScore, cfg.baseScore + runningNet * cfg.pointsPerUnit)) * 10) / 10;
      runningScores.push(stepScore);

      if (delta < 0 && evt.date) {
        const evtDate = new Date(evt.date);
        if (evtDate >= oneWeekAgo) {
          recentNegativeCount++;
        }
      }
    });

    const netPoints = positivePts + negativePts;
    const rawScore = cfg.baseScore + (netPoints * cfg.pointsPerUnit);
    const uncappedScore = Math.round(rawScore * 10) / 10;
    const regularScore = Math.round(Math.min(cfg.maxScore, Math.max(cfg.minScore, rawScore)) * 10) / 10;

    const ewmaScores = this.calculateEWMA(runningScores);
    const scoreSlope = this.calculateSlope(runningScores.slice(-10));
    const scoreStd = this.standardDeviation(runningScores);

    // 2. Cliff Drop & Behavior Alert Detection (no quiz slope dependency)
    let isCliffDrop = false;
    let cliffDropReason = '';

    if (recentNegativeCount >= 3) {
      isCliffDrop = true;
      cliffDropReason = `近一週連續累積 ${recentNegativeCount} 次扣分提醒`;
    }
    if (regularScore < Math.max(cfg.minScore, cfg.baseScore - 10)) {
      isCliffDrop = true;
      cliffDropReason = (cliffDropReason ? cliffDropReason + ' • ' : '') +
        `目前平時成績降至 ${regularScore} 分（低於基準 ${cfg.baseScore} 分逾 10 分）`;
    }

    // 3. Five-Dimensional Classroom Quant Index (0-100 normalized around baseScore)
    const clamp100 = (v) => Math.min(100, Math.max(0, Math.round(v)));
    const mathAbility = clamp100(cfg.baseScore + academicBonus * 3 + assessmentBonus * 2);
    const motivation = clamp100(cfg.baseScore - 2 + positivePts * 2.5 + scoreSlope * 2);
    const accountability = clamp100(cfg.baseScore + disciplineInfractions * 3 + academicBonus * 2);
    const discipline = clamp100(cfg.baseScore + disciplineInfractions * 3.5 + conflictIncidents * 4);
    const socialEmotional = clamp100(cfg.baseScore + socialContributions * 4 + conflictIncidents * 5);

    const radar = {
      mathAbility,
      motivation,
      accountability,
      discipline,
      socialEmotional
    };

    return {
      student,
      rawScores: runningScores,
      assessmentList: classEvents,
      regularScore,
      uncappedScore,
      scoreMean: regularScore,
      scoreStd: Math.round(scoreStd * 10) / 10,
      ewmaScores,
      scoreSlope,
      positivePts,
      negativePts,
      pointsBreakdown: {
        academic: academicBonus + assessmentBonus,
        discipline: disciplineInfractions,
        conflict: conflictIncidents,
        social: socialContributions,
        net: netPoints
      },
      isCliffDrop,
      cliffDropReason,
      radar
    };
  }

  // --- Class-Level Aggregate Analysis ---
  getClassOverview(classId) {
    const students = this.store.getStudents(classId) || [];
    const events = this.store.getEvents(classId) || [];
    const cfg = this.store.getRegularGradeConfig
      ? this.store.getRegularGradeConfig()
      : { baseScore: 80, pointsPerUnit: 1, minScore: 0, maxScore: 100 };

    const studentProfiles = students.map(s => this.getStudentProfile(classId, s.seatNo)).filter(Boolean);

    // Regular Score & Net Points Box Plots (Replaces Quiz Box Plot)
    const regularScoresArr = studentProfiles.map(p => p.regularScore);
    const latestBoxPlot = this.getFiveNumberSummary(regularScoresArr);
    const netPointsArr = studentProfiles.map(p => p.pointsBreakdown.net);
    const pointsBoxPlot = this.getFiveNumberSummary(netPointsArr);

    // Differentiated Classroom Engagement Clustering
    const classAvgScore = studentProfiles.length > 0 ? this.mean(regularScoresArr) : cfg.baseScore;
    const classAvgEngagement = studentProfiles.length > 0 ? this.mean(netPointsArr) : 0;

    const clusters = {
      topTier: [],      // 積極拔尖組
      underachiever: [],// 穩定達標組
      hardWorker: [],   // 待多激勵組
      highRisk: []      // 重點關懷組
    };

    studentProfiles.forEach(p => {
      const isHighScore = p.regularScore >= classAvgScore;
      const isHighPos = p.positivePts >= (studentProfiles.length > 0 ? this.mean(studentProfiles.map(sp => sp.positivePts)) : 1);

      const item = {
        seatNo: p.student.seatNo,
        name: p.student.name,
        scoreMean: p.regularScore,
        regularScore: p.regularScore,
        netPoints: p.pointsBreakdown.net,
        isCliffDrop: p.isCliffDrop,
        cliffReason: p.cliffDropReason
      };

      if (isHighScore && isHighPos) {
        clusters.topTier.push(item);
      } else if (isHighScore && !isHighPos) {
        clusters.underachiever.push(item);
      } else if (!isHighScore && isHighPos) {
        clusters.hardWorker.push(item);
      } else {
        clusters.highRisk.push(item);
      }
    });

    const alertStudents = studentProfiles.filter(p => p.isCliffDrop);

    // Period Infraction Heatmap Analysis
    const periodInfractions = {};
    events.forEach(e => {
      if (e.delta < 0) {
        const p = e.period !== undefined ? `節次 ${e.period}` : '其他';
        periodInfractions[p] = (periodInfractions[p] || 0) + 1;
      }
    });

    return {
      classId,
      totalStudents: students.length,
      studentProfiles,
      latestAssessment: null,
      latestBoxPlot,
      regularScoreBoxPlot: latestBoxPlot,
      pointsBoxPlot,
      classAvgScore: Math.round(classAvgScore * 10) / 10,
      classAvgEngagement: Math.round(classAvgEngagement * 10) / 10,
      clusters,
      alertStudents,
      periodInfractions
    };
  }

  // --- Multi-Class Cross-Benchmark & Strategy Engine ---
  getMultiClassComparison() {
    const classes = this.store.getClasses() || {};
    const classOverviews = {};
    const classList = Object.values(classes);

    classList.forEach(cls => {
      classOverviews[cls.id] = this.getClassOverview(cls.id);
    });

    const strategies = classList.map(cls => {
      const ov = classOverviews[cls.id];
      const avgScore = ov ? ov.classAvgScore : 80;
      const avgEng = ov ? ov.classAvgEngagement : 0;
      const topCount = ov?.clusters?.topTier?.length || 0;
      const riskCount = (ov?.clusters?.highRisk?.length || 0) + (ov?.clusters?.hardWorker?.length || 0);

      let hwLevel = '';
      let hwDetail = '';
      let teachingStyle = '';

      if (avgScore >= 86) {
        hwLevel = '🌟 積極自治型';
        hwDetail = '全班課堂氛圍極佳，鼓勵學生擔任同儕小老師與上台發表';
        teachingStyle = '可適度引入進階討論任務與小組競賽機制，維持高動能正向循環';
      } else if (avgScore >= 78 && avgEng >= 0) {
        hwLevel = '📘 穩健達標型';
        hwDetail = '課堂秩序與日常表現維持標準，持續透過口頭加點強化專注習慣';
        teachingStyle = '在重點切換處多給予即時舉手/筆記加分，帶動中間族群參與意願';
      } else if (avgEng >= -2) {
        hwLevel = '🌱 常規養成型';
        hwDetail = '部分節次專注力或作業習慣仍有起伏，建議多使用正向具體加分誘導';
        teachingStyle = '縮短講述時間改採分步隨堂演練，先搶下「即時達成小目標」的正向回饋';
      } else {
        hwLevel = '🛡️ 關懷整頓型';
        hwDetail = '扣分提醒較多，需優先穩定課堂常規並關懷高風險個案';
        teachingStyle = '先確立明確課堂公約與座位調整，多給予個別化口頭提醒與低門檻加分機會';
      }

      return {
        classId: cls.id,
        className: cls.name,
        type: cls.type,
        studentCount: cls.studentCount || 0,
        avgScore,
        avgEng,
        topCount,
        riskCount,
        hwLevel,
        hwDetail,
        teachingStyle
      };
    });

    return {
      classList,
      classOverviews,
      strategies
    };
  }
}

// Global Statistics Instance
window.statisticsEngine = new StatisticsEngine(window.appStore);

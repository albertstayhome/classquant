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

  // --- Student Comprehensive Metrics Profile ---
  getStudentProfile(classId, seatNo) {
    const student = this.store.getStudent(classId, seatNo);
    if (!student) return null;

    const classEvents = this.store.getEvents(classId).filter(e => e.seatNo === parseInt(seatNo, 10));
    const assessments = this.store.getAssessments(classId);

    // 1. Assessment Scores Progression
    const studentScores = [];
    const assessmentList = [];
    assessments.forEach(asm => {
      if (asm.scores && asm.scores[seatNo] !== undefined) {
        studentScores.push(Number(asm.scores[seatNo]));
        assessmentList.push(asm);
      }
    });

    const scoreMean = studentScores.length > 0 ? this.mean(studentScores) : 70;
    const scoreStd = this.standardDeviation(studentScores);
    const ewmaScores = this.calculateEWMA(studentScores);
    const scoreSlope = this.calculateSlope(studentScores);

    // 2. Behavioral & Engagement Metrics
    let academicBonus = 0;
    let disciplineInfractions = 0;
    let conflictIncidents = 0;
    let socialContributions = 0;
    let recentNegativeCount = 0;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    classEvents.forEach(evt => {
      const delta = evt.delta || 0;
      if (evt.category === 'academic') {
        academicBonus += delta;
      } else if (evt.category === 'discipline') {
        disciplineInfractions += delta;
      } else if (evt.category === 'conflict') {
        conflictIncidents += delta;
      } else if (evt.category === 'social') {
        socialContributions += delta;
      }

      if (delta < 0 && evt.date) {
        const evtDate = new Date(evt.date);
        if (evtDate >= oneWeekAgo) {
          recentNegativeCount++;
        }
      }
    });

    const netPoints = academicBonus + disciplineInfractions + conflictIncidents + socialContributions;

    // 3. Cliff Drop & Alert Detection (2-sigma drop or severe slope)
    let isCliffDrop = false;
    let cliffDropReason = '';

    if (studentScores.length >= 3) {
      const latestScore = studentScores[studentScores.length - 1];
      const previousScores = studentScores.slice(0, -1);
      const prevMean = this.mean(previousScores);
      const prevStd = this.standardDeviation(previousScores);

      if (prevStd > 0 && latestScore < prevMean - 1.8 * prevStd) {
        isCliffDrop = true;
        cliffDropReason = `最新評量 (${latestScore}分) 發生斷崖式下滑 (低於均值 ${Math.round((prevMean - latestScore)*10)/10} 分)`;
      } else if (scoreSlope < -2.5) {
        isCliffDrop = true;
        cliffDropReason = `近期連續小考下滑斜率顯著 (斜率: ${scoreSlope})`;
      }
    }

    if (recentNegativeCount >= 3) {
      isCliffDrop = true;
      cliffDropReason = (cliffDropReason ? cliffDropReason + ' • ' : '') + `近一週連續累積 ${recentNegativeCount} 次常規違規`;
    }

    // 4. Five-Dimensional Educational Quant Index (0-100 normalized)
    const mathAbility = Math.min(100, Math.max(0, Math.round(scoreMean + academicBonus * 0.5)));
    const motivation = Math.min(100, Math.max(0, Math.round(60 + scoreSlope * 5 + academicBonus * 2)));
    const accountability = Math.min(100, Math.max(0, Math.round(75 + disciplineInfractions * 2.5)));
    const discipline = Math.min(100, Math.max(0, Math.round(80 + disciplineInfractions * 3 + conflictIncidents * 4)));
    const socialEmotional = Math.min(100, Math.max(0, Math.round(70 + socialContributions * 3 + conflictIncidents * 5)));

    const radar = {
      mathAbility,
      motivation,
      accountability,
      discipline,
      socialEmotional
    };

    return {
      student,
      rawScores: studentScores,
      assessmentList,
      scoreMean: Math.round(scoreMean * 10) / 10,
      scoreStd: Math.round(scoreStd * 10) / 10,
      ewmaScores,
      scoreSlope,
      pointsBreakdown: {
        academic: academicBonus,
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
    const assessments = this.store.getAssessments(classId) || [];
    const events = this.store.getEvents(classId) || [];

    const studentProfiles = students.map(s => this.getStudentProfile(classId, s.seatNo)).filter(Boolean);

    // Latest Assessment Summary & Box Plot
    const latestAsm = assessments.length > 0 ? assessments[assessments.length - 1] : null;
    let latestAsmScores = [];
    let latestBoxPlot = null;
    if (latestAsm && latestAsm.scores) {
      latestAsmScores = Object.values(latestAsm.scores).map(Number);
      latestBoxPlot = this.getFiveNumberSummary(latestAsmScores);
    }

    // Net Points Distribution
    const netPointsArr = studentProfiles.map(p => p.pointsBreakdown.net);
    const pointsBoxPlot = this.getFiveNumberSummary(netPointsArr);

    // Differentiated Instruction 4-Quadrant Clustering
    const classAvgScore = studentProfiles.length > 0 ? this.mean(studentProfiles.map(p => p.scoreMean)) : 70;
    const classAvgEngagement = studentProfiles.length > 0 ? this.mean(studentProfiles.map(p => p.pointsBreakdown.net)) : 0;

    const clusters = {
      topTier: [],      // High Score, High Engagement (拔尖進階組)
      underachiever: [],// High Score, Low Engagement (潛力未發揮)
      hardWorker: [],   // Low Score, High Engagement (努力待補救組)
      highRisk: []      // Low Score, Low Engagement (雙低關懷組)
    };

    studentProfiles.forEach(p => {
      const isHighAbility = p.scoreMean >= (classAvgScore || 70);
      const isHighEngagement = p.pointsBreakdown.net >= (classAvgEngagement || 0);

      const item = {
        seatNo: p.student.seatNo,
        name: p.student.name,
        scoreMean: p.scoreMean,
        netPoints: p.pointsBreakdown.net,
        isCliffDrop: p.isCliffDrop,
        cliffReason: p.cliffDropReason
      };

      if (isHighAbility && isHighEngagement) {
        clusters.topTier.push(item);
      } else if (isHighAbility && !isHighEngagement) {
        clusters.underachiever.push(item);
      } else if (!isHighAbility && isHighEngagement) {
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
      latestAssessment: latestAsm,
      latestBoxPlot,
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

    // Compute Homework & Teaching Strategy Advisory for each class
    const strategies = classList.map(cls => {
      const ov = classOverviews[cls.id];
      const avgScore = ov ? ov.classAvgScore : 70;
      const avgEng = ov ? ov.classAvgEngagement : 0;
      const topCount = ov?.clusters?.topTier?.length || 0;
      const riskCount = (ov?.clusters?.highRisk?.length || 0) + (ov?.clusters?.hardWorker?.length || 0);

      let hwLevel = '';
      let hwDetail = '';
      let teachingStyle = '';

      if (avgScore >= 80) {
        hwLevel = '🌟 拔尖拓展型';
        hwDetail = '核心基礎題 3 題 + 思考探究競賽題 2 題（著重代數多向證明）';
        teachingStyle = '加快單元概念解說節奏，多安排學生上台發表與組間競賽搶答';
      } else if (avgScore >= 70 && avgEng >= 0) {
        hwLevel = '📘 穩健進階型';
        hwDetail = '核心觀念題 4 題 + 題型變化題 2 題（著重題型辨析與步驟規範）';
        teachingStyle = '強化典型例題板書拆解，隨堂抽查同儕筆記與概念理解程度';
      } else if (avgScore < 70 && avgEng >= 0) {
        hwLevel = '🌱 核心打底型';
        hwDetail = '基礎定義題 5 題 + 錯題確實訂正（每題附簡易步驟提示）';
        teachingStyle = '降低單堂概念密度，增加課堂隨堂演練時間與即時小組互助打底';
      } else {
        hwLevel = '🛡️ 補救激勵型';
        hwDetail = '降階基礎核心 3~4 題（限時小步完成，並給予課堂加點肯定）';
        teachingStyle = '課堂以短節奏提問提神，加強巡視與口頭讚美，避免挫折感堆積';
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

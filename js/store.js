/**
 * Data Store & State Management (Enhanced with Tag Management, Google Cloud Backup & NAS Sync)
 */

const STORAGE_KEY = 'class_point_quant_hub_data_v1';

// Shared Local Date Helper (YYYY-MM-DD in device local timezone, prevents UTC day shift before 08:00 AM TW)
window.getLocalDateStr = function(d = new Date()) {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Shared Safe Clipboard Helper (HTTPS Clipboard API + HTTP/LAN textarea fallback)
window.copyTextSafe = async function(text, successMsg = '已複製到剪貼簿！') {
  const content = String(text ?? '');
  try {
    if (navigator.clipboard && window.isSecureContext && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(content);
      if (window.appState?.showToast && successMsg) window.appState.showToast(successMsg, 'success');
      return true;
    }
  } catch (e) {}

  try {
    const ta = document.createElement('textarea');
    ta.value = content;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (ok) {
      if (window.appState?.showToast && successMsg) window.appState.showToast(successMsg, 'success');
      return true;
    }
  } catch (e) {}

  if (window.appState?.showToast) {
    window.appState.showToast('瀏覽器限制無法自動複製，請手動選取文字複製', 'warning');
  }
  return false;
};

// Shared Period Label Formatter & Options Builder (Used across Retro Log, Modal & Events Log)
window.cqPeriodChoices = [
  { value: '0', label: '早自習 / 晨讀' },
  { value: '1', label: '第 1 節' },
  { value: '2', label: '第 2 節' },
  { value: '3', label: '第 3 節' },
  { value: '4', label: '第 4 節' },
  { value: 'lunch', label: '午餐 / 午休' },
  { value: '5', label: '第 5 節' },
  { value: '6', label: '第 6 節' },
  { value: '7', label: '第 7 節' },
  { value: 'clean', label: '整潔活動' },
  { value: '8', label: '第 8 節' },
  { value: 'after', label: '課後放學' }
];

window.cqFormatPeriodLabel = function(period) {
  if (period === undefined || period === null || period === '') return '未定節次';
  const key = String(period);
  if (key === '0') return '早自習';
  if (key === 'lunch') return '午餐/午休';
  if (key === 'clean') return '整潔活動';
  if (key === 'after') return '課後放學';
  const num = Number(key);
  if (Number.isFinite(num) && num >= 1 && num <= 12) return `第 ${num} 節`;
  return `節次 ${key}`;
};

window.cqBuildPeriodOptionsHtml = function(selectedPeriod) {
  const sel = String(selectedPeriod ?? '1');
  return window.cqPeriodChoices.map(p =>
    `<option value="${p.value}" ${sel === p.value ? 'selected' : ''}>${p.label}</option>`
  ).join('');
};

window.cqGetDefaultRetroPeriod = function() {
  try {
    const active = window.timetableEngine?.getActiveClassId?.();
    if (active && active.period !== undefined && active.period !== null && active.period !== '') {
      return String(active.period);
    }
  } catch (e) {}
  return '1';
};

// Curated Tags Selector: Prioritizes custom/used tags with balanced positive & negative defaults (max 6)
window.cqGetCuratedTags = function(store, classId, limit = 6) {
  const tags = store?.getTagsSortedByClassFrequency ? store.getTagsSortedByClassFrequency(classId) : (store?.getTags?.(classId) || []);
  if (tags.length <= limit) return tags;
  const classEvents = store?.getEvents ? store.getEvents(classId) : [];
  const usedIds = new Set(classEvents.map(e => e.tagId).filter(Boolean));
  const picked = [];
  const seen = new Set();
  const pushTag = (t) => {
    if (t && !seen.has(t.id) && picked.length < limit) {
      seen.add(t.id);
      picked.push(t);
    }
  };
  tags.filter(t => String(t.id).startsWith('tag_') || usedIds.has(t.id)).forEach(pushTag);
  const posList = tags.filter(t => t.delta > 0);
  const negList = tags.filter(t => t.delta < 0);
  let i = 0;
  while (picked.length < limit && (i < posList.length || i < negList.length)) {
    if (i < posList.length) pushTag(posList[i]);
    if (i < negList.length) pushTag(negList[i]);
    i++;
  }
  tags.forEach(pushTag);
  return picked;
};

// Default Tag Categories and Definitions
const DEFAULT_TAGS = [
  // 數學學業 (Academic)
  { id: 'math_breakthrough', name: '主動解出難題', category: 'academic', delta: 3, severity: 'positive', icon: 'zap' },
  { id: 'math_board', name: '上台板書解題', category: 'academic', delta: 2, severity: 'positive', icon: 'edit-3' },
  { id: 'math_ask', name: '課堂提問具啟發性', category: 'academic', delta: 1, severity: 'positive', icon: 'help-circle' },
  { id: 'math_hw_missing', name: '數學作業缺交', category: 'academic', delta: -2, severity: 'warning', icon: 'file-x' },
  { id: 'math_book_missing', name: '未帶課本講義', category: 'academic', delta: -1, severity: 'warning', icon: 'book-open' },
  { id: 'math_stuck', name: '運算概念卡關待補救', category: 'academic', delta: -1, severity: 'info', icon: 'alert-triangle' },

  // 生活常規 (Discipline - 導師班專重)
  { id: 'disc_late', name: '上課/晨讀遲到', category: 'discipline', delta: -2, severity: 'warning', icon: 'clock' },
  { id: 'disc_sleep', name: '課堂睡覺/發呆', category: 'discipline', delta: -2, severity: 'warning', icon: 'moon' },
  { id: 'disc_distracted', name: '分心玩文具/雜物', category: 'discipline', delta: -1, severity: 'warning', icon: 'eye-off' },
  { id: 'disc_handbook_missing', name: '未交聯絡簿/簽名', category: 'discipline', delta: -1, severity: 'warning', icon: 'clipboard' },
  { id: 'disc_clean_fail', name: '掃除不認真/未到', category: 'discipline', delta: -2, severity: 'warning', icon: 'trash-2' },
  { id: 'disc_officer_good', name: '幹部/小老師盡責', category: 'discipline', delta: 2, severity: 'positive', icon: 'award' },
  { id: 'disc_reading_good', name: '晨讀自習專注', category: 'discipline', delta: 1, severity: 'positive', icon: 'check-circle' },

  // 人際與衝突 (Conflict & Social)
  { id: 'soc_help', name: '主動指導同學/助人', category: 'social', delta: 2, severity: 'positive', icon: 'heart' },
  { id: 'soc_verbal_fight', name: '同儕言語吵架口角', category: 'conflict', delta: -3, severity: 'danger', icon: 'message-square' },
  { id: 'soc_phys_fight', name: '肢體衝突/推擠打架', category: 'conflict', delta: -5, severity: 'critical', icon: 'shield-alert' },
  { id: 'soc_property_damage', name: '毀損公物/他人私物', category: 'conflict', delta: -5, severity: 'critical', icon: 'alert-octagon' },

  // 測驗與評量 (Assessment)
  { id: 'exam_top', name: '小考滿分/全班最高', category: 'assessment', delta: 3, severity: 'positive', icon: 'star' },
  { id: 'exam_progress', name: '小考顯著進步(+10分以上)', category: 'assessment', delta: 2, severity: 'positive', icon: 'trending-up' },
  { id: 'exam_fail_no_correct', name: '小考不及格且未訂正', category: 'assessment', delta: -2, severity: 'danger', icon: 'trending-down' }
];

// Time Periods Configuration (Standard Junior High School Schedule)
const DEFAULT_TIMETABLE_PERIODS = [
  { period: 0, name: '早自習/晨讀', start: '07:50', end: '08:25' },
  { period: 1, name: '第 1 節', start: '08:30', end: '09:15' },
  { period: 2, name: '第 2 節', start: '09:25', end: '10:10' },
  { period: 3, name: '第 3 節', start: '10:20', end: '11:05' },
  { period: 4, name: '第 4 節', start: '11:15', end: '12:00' },
  { period: 'lunch', name: '午餐/午休', start: '12:00', end: '13:10' },
  { period: 5, name: '第 5 節', start: '13:20', end: '14:05' },
  { period: 6, name: '第 6 節', start: '14:15', end: '15:00' },
  { period: 7, name: '第 7 節', start: '15:10', end: '15:55' },
  { period: 'clean', name: '整潔活動', start: '16:00', end: '16:20' },
  { period: 8, name: '第 8 節(輔導)', start: '16:25', end: '17:10' }
];

// Teacher Weekly Schedule (Mon-Fri)
const DEFAULT_WEEKLY_SCHEDULE = {
  1: { 0: '801', 1: '801', 3: '803', 4: '805', 7: '801' },
  2: { 0: '801', 2: '803', 3: '801', 5: '805', 8: '801' },
  3: { 0: '801', 1: '805', 2: '801', 4: '803' },
  4: { 0: '801', 2: '805', 3: '803', 6: '801', 7: '801' },
  5: { 0: '801', 1: '803', 3: '805', 5: '801', 6: '801' }
};

class Store {
  constructor() {
    this.cloudWebhookUrl = '';
    this._autoBackupTimer = null;
    this.data = this.loadFromStorage();
    const hasClearedAll = Boolean(this.data?.hasClearedAll || localStorage.getItem('classquant_user_cleared') === 'true');

    if (!this.data || (!hasClearedAll && (!this.data.classes || Object.keys(this.data.classes).length === 0))) {
      this.initDemoData();
    } else {
      // Ensure structural compatibility WITHOUT overwriting existing user rosters, custom tags, or scores
      if (!this.data.classes) this.data.classes = {};
      if (!this.data.students) this.data.students = {};
      if (!this.data.assessments) this.data.assessments = {};
      if (!this.data.events) this.data.events = [];
      if (!this.data.termArchives || typeof this.data.termArchives !== 'object') this.data.termArchives = {};
      if (!this.data.weeklySchedule) this.data.weeklySchedule = {};
      if (!this.data.timetablePeriods) this.data.timetablePeriods = DEFAULT_TIMETABLE_PERIODS;
      if (!this.data.tags) this.data.tags = DEFAULT_TAGS;
      if (!this.data.settings) this.data.settings = {};
      if (!this.data.settings.theme) this.data.settings.theme = 'kitty';
      if (!this.data.settings.regularGradeConfig) {
        this.data.settings.regularGradeConfig = this.getDefaultRegularGradeConfig();
      }
      if (!this.data.settings.nasSettings) {
        this.data.settings.nasSettings = {
          serverUrl: 'http://192.168.1.100:5005',
          username: '',
          password: '',
          remotePath: '/ClassData/class_data_sync.json',
          lastSyncTime: null
        };
      }
      if (!this.data.settings.googleBackup) {
        this.data.settings.googleBackup = this.getDefaultGoogleBackupSettings();
      }

      // Seamlessly migrate legacy classTags if groupTags is missing
      if (!this.data.groupTags) {
        const legacyHomeroom = this.data.classTags?.['801'] || this.data.tags || DEFAULT_TAGS;
        const legacySubject = this.data.classTags?.['803'] || this.data.classTags?.['805'] || this.data.tags || DEFAULT_TAGS;
        this.data.groupTags = {
          homeroom: JSON.parse(JSON.stringify(legacyHomeroom)),
          subject: JSON.parse(JSON.stringify(legacySubject))
        };
      }

      // Non-destructive legacy schema repair (100% preserves existing classes, rosters, tags, events, archives)
      this.sanitizeAndMigrateLegacyData();

      // Auto Snapshot (at most once every 3 hours on startup, guarded against mobile localStorage quota pressure)
      try {
        const lastSnap = localStorage.getItem('classquant_last_auto_snapshot_ts');
        const now = Date.now();
        if (!lastSnap || (now - parseInt(lastSnap, 10)) > 3 * 3600 * 1000) {
          this.createSnapshot('啟動時日常備份');
          try {
            localStorage.setItem('classquant_last_auto_snapshot_ts', String(now));
          } catch (quotaErr) {
            console.warn('Auto snapshot timestamp write skipped:', quotaErr);
          }
        }
      } catch (snapErr) {
        console.warn('Startup auto-snapshot skipped safely:', snapErr);
      }
    }

    this._cloudConfigReady = this.loadCloudConfigDefaults();
  }

  getDefaultGoogleBackupSettings() {
    return {
      mode: 'sheets', // 'sheets' (Apps Script 試算表雙向備份) or 'form' (Google 表單 formResponse 單向備份)
      modeExplicit: false,
      appsScriptUrl: '',
      googleFormUrl: '',
      formEntryId: '',
      formSummaryEntryId: '',
      schedule: 'daily', // 'manual' | 'on_change' | 'hourly' | 'daily' | 'weekly'
      scheduleExplicit: false,
      teacherLabel: '',
      lastBackupTs: 0,
      lastBackupHash: '',
      lastBackupStatus: ''
    };
  }

  async loadCloudConfigDefaults() {
    try {
      const res = await fetch('./data/cloud_config.json?t=' + Date.now());
      if (res.ok) {
        const cfg = await res.json();
        if (cfg) {
          this.cloudConfigVersion = Number(cfg.configVersion || 1);
          if (cfg.webhookUrl) {
            this.cloudWebhookUrl = cfg.webhookUrl.trim();
          }
          if (cfg.googleFormUrl) {
            this.cloudFormUrl = cfg.googleFormUrl.trim();
            this.cloudFormEntryId = (cfg.formEntryId || '').trim();
            this.cloudFormSummaryEntryId = (cfg.formSummaryEntryId || '').trim();
          }
          if (cfg.defaultBackupMode) {
            this.cloudDefaultBackupMode = cfg.defaultBackupMode.trim();
          }
          if (cfg.defaultSchedule) {
            this.cloudDefaultSchedule = cfg.defaultSchedule.trim();
          }
        }
      }
    } catch (e) {}
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : null;
    } catch (e) {
      console.error('Failed to load from storage:', e);
      return null;
    }
  }

  saveToStorage() {
    try {
      this.data.lastModified = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.scheduleAutoBackupOnChange();
    } catch (e) {
      console.error('Failed to save to storage:', e);
    }
  }

  save(data = null) {
    if (data) {
      this.data = data;
    }
    this.saveToStorage();
  }

  initDemoData() {
    const classes = {
      '801': {
        id: '801',
        name: '801 班',
        type: 'homeroom', // 導師班 (本班)
        subject: '導師班 / 數學',
        studentCount: 30,
        seatLayout: { rows: 5, cols: 6 }
      },
      '803': {
        id: '803',
        name: '803 班',
        type: 'subject', // 科任班 (任教班)
        subject: '數學',
        studentCount: 30,
        seatLayout: { rows: 5, cols: 6 }
      },
      '805': {
        id: '805',
        name: '805 班',
        type: 'subject', // 科任班 (任教班)
        subject: '數學',
        studentCount: 28,
        seatLayout: { rows: 5, cols: 6 }
      }
    };

    const students = {};
    const studentNames = [
      '陳冠宇', '林子涵', '黃柏翔', '張雅晴', '李承翰', '王品妍', '吳廷軒', '蔡詠晴', '許志豪', '鄭羽彤',
      '郭俊廷', '謝欣潔', '曾郁翔', '洪若涵', '邱冠宏', '賴思妤', '周聖文', '葉佩珊', '莊凱翔', '江詩婷',
      '劉宗憲', '呂佩真', '潘宥安', '顏子淇', '鍾建宇', '蕭曼婷', '彭子豪', '方宣瑜', '蘇家緯', '戴綺芸'
    ];

    Object.values(classes).forEach(cls => {
      students[cls.id] = [];
      for (let seat = 1; seat <= cls.studentCount; seat++) {
        students[cls.id].push({
          seatNo: seat,
          name: cls.type === 'homeroom' ? studentNames[seat - 1] || `座號 ${seat}` : `座號 ${seat} (${studentNames[seat - 1]?.[0] || '生'}生)`,
          gender: seat <= Math.ceil(cls.studentCount / 2) ? 'M' : 'F',
          baselineAbility: 60 + Math.floor(Math.random() * 35),
          notes: ''
        });
      }
    });

    const assessments = {
      '801': [
        {
          id: 'asm_801_1',
          name: '第 1 次小考：乘法公式與多項式',
          date: '2026-09-08',
          maxScore: 100,
          scores: {}
        },
        {
          id: 'asm_801_2',
          name: '第 2 次小考：因式分解(提公因式)',
          date: '2026-09-15',
          maxScore: 100,
          scores: {}
        },
        {
          id: 'asm_801_3',
          name: '第 3 次小考：十字交乘法與應用',
          date: '2026-09-22',
          maxScore: 100,
          scores: {}
        },
        {
          id: 'asm_801_4',
          name: '第 4 次小考：一元二次方程式解法',
          date: '2026-09-29',
          maxScore: 100,
          scores: {}
        }
      ],
      '803': [
        {
          id: 'asm_803_1',
          name: '第 1 次小考：乘法公式',
          date: '2026-09-09',
          maxScore: 100,
          scores: {}
        },
        {
          id: 'asm_803_2',
          name: '第 2 次小考：十字交乘法',
          date: '2026-09-23',
          maxScore: 100,
          scores: {}
        }
      ],
      '805': [
        {
          id: 'asm_805_1',
          name: '第 1 次小考：乘法公式',
          date: '2026-09-10',
          maxScore: 100,
          scores: {}
        }
      ]
    };

    assessments['801'].forEach((asm, idx) => {
      for (let seat = 1; seat <= 30; seat++) {
        let base = 72 + (seat % 7) * 4 - (seat % 5) * 3;
        if (seat === 5) base = [88, 84, 60, 42][idx];
        else if (seat === 12) base = [82, 88, 94, 98][idx];
        else if (seat === 8) base = [55, 48, 52, 40][idx];
        asm.scores[seat] = Math.max(20, Math.min(100, base + Math.floor(Math.random() * 6 - 3)));
      }
    });

    assessments['803'].forEach((asm) => {
      for (let seat = 1; seat <= 30; seat++) {
        asm.scores[seat] = Math.max(30, Math.min(100, 70 + (seat % 8) * 3 + Math.floor(Math.random() * 8 - 4)));
      }
    });

    const events = [
      {
        id: 'evt_1',
        classId: '801',
        seatNo: 12,
        date: '2026-09-15',
        time: '10:35',
        period: 3,
        tagId: 'math_breakthrough',
        tagName: '主動解出難題',
        category: 'academic',
        delta: 3,
        severity: 'positive',
        note: '上台正確解出一元二次資優延伸題'
      },
      {
        id: 'evt_2',
        classId: '801',
        seatNo: 5,
        date: '2026-09-16',
        time: '08:05',
        period: 0,
        tagId: 'disc_late',
        tagName: '上課/晨讀遲到',
        category: 'discipline',
        delta: -2,
        severity: 'warning',
        note: '遲到15分鐘，未帶晨讀講義'
      },
      {
        id: 'evt_3',
        classId: '801',
        seatNo: 5,
        date: '2026-09-18',
        time: '14:20',
        period: 6,
        tagId: 'disc_sleep',
        tagName: '課堂睡覺/發呆',
        category: 'discipline',
        delta: -2,
        severity: 'warning',
        note: '數學課連續趴睡，叫醒後眼神渙散'
      },
      {
        id: 'evt_4',
        classId: '801',
        seatNo: 8,
        date: '2026-09-22',
        time: '12:40',
        period: 'lunch',
        tagId: 'soc_phys_fight',
        tagName: '肢體衝突/推擠打架',
        category: 'conflict',
        delta: -5,
        severity: 'critical',
        note: '午休前因排隊搶籃球與 09 號發生推擠，互相揮拳，已帶至導師室分開冷靜'
      },
      {
        id: 'evt_5',
        classId: '801',
        seatNo: 9,
        date: '2026-09-22',
        time: '12:40',
        period: 'lunch',
        tagId: 'soc_phys_fight',
        tagName: '肢體衝突/推擠打架',
        category: 'conflict',
        delta: -5,
        severity: 'critical',
        note: '與 08 號推擠衝突當事方，已請雙方寫事件自述表'
      },
      {
        id: 'evt_6',
        classId: '801',
        seatNo: 3,
        date: '2026-09-24',
        time: '09:30',
        period: 2,
        tagId: 'disc_officer_good',
        tagName: '幹部/小老師盡責',
        category: 'discipline',
        delta: 2,
        severity: 'positive',
        note: '數學小老師主動於課前收齊全班習作並分批歸類'
      },
      {
        id: 'evt_7',
        classId: '801',
        seatNo: 5,
        date: '2026-09-25',
        time: '08:10',
        period: 0,
        tagId: 'disc_handbook_missing',
        tagName: '未交聯絡簿/簽名',
        category: 'discipline',
        delta: -1,
        severity: 'warning',
        note: '連續 3 日未交聯絡簿'
      },
      {
        id: 'evt_8',
        classId: '801',
        seatNo: 5,
        date: '2026-09-26',
        time: '17:30',
        period: 'after',
        tagId: 'custom_narrative',
        tagName: '家長聯繫備忘',
        category: 'social',
        delta: 0,
        severity: 'info',
        note: '家長來電說明近期家中長輩住院，學生作息受影響致使頻繁遲到與精神不濟，已約定下週追蹤'
      }
    ];

    this.data = {
      classes,
      students,
      assessments,
      events,
      termArchives: {},
      tags: DEFAULT_TAGS,
      timetablePeriods: DEFAULT_TIMETABLE_PERIODS,
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
      currentClassOverride: null,
      settings: {
        theme: 'kitty', // 'kitty' or 'dark'
        autoSwitchTimetable: true,
        enableSound: true,
        cliffDropSigmaThreshold: 1.8,
        regularGradeConfig: this.getDefaultRegularGradeConfig(),
        nasSettings: {
          serverUrl: 'http://192.168.1.100:5005',
          username: '',
          password: '',
          remotePath: '/ClassData/class_data_sync.json',
          lastSyncTime: null
        }
      }
    };

    this.saveToStorage();
  }

  // --- Tag Management CRUD & Custom Sorting (Homeroom vs Subject Classes) ---
  getTagGroup(classId = null) {
    if (!classId) return 'homeroom';
    const cls = this.getClass(classId);
    if (cls && cls.type === 'homeroom') return 'homeroom';
    return 'subject'; // 任教班 / 數學班
  }

  getTags(classId = null) {
    const group = this.getTagGroup(classId);
    if (!this.data.groupTags) {
      this.data.groupTags = {
        homeroom: JSON.parse(JSON.stringify(this.data.tags || DEFAULT_TAGS)),
        subject: JSON.parse(JSON.stringify(this.data.tags || DEFAULT_TAGS))
      };
    }
    if (!this.data.groupTags[group] || !Array.isArray(this.data.groupTags[group]) || this.data.groupTags[group].length === 0) {
      this.data.groupTags[group] = JSON.parse(JSON.stringify(this.data.tags || DEFAULT_TAGS));
    }
    return this.data.groupTags[group];
  }

  copyHomeroomTagsToSubject() {
    const homeroomTags = this.getTags('801'); // homeroom group
    if (!this.data.groupTags) this.data.groupTags = {};
    this.data.groupTags.subject = JSON.parse(JSON.stringify(homeroomTags));
    this.saveToStorage();
    return true;
  }

  getTagSortMode(classId = null) {
    const group = this.getTagGroup(classId);
    if (this.data.settings?.groupTagSortModes?.[group]) {
      return this.data.settings.groupTagSortModes[group];
    }
    return this.data.settings?.tagSortMode || 'custom';
  }

  setTagSortMode(mode, classId = null) {
    const group = this.getTagGroup(classId);
    if (!this.data.settings) this.data.settings = {};
    if (!this.data.settings.groupTagSortModes) this.data.settings.groupTagSortModes = {};
    this.data.settings.groupTagSortModes[group] = mode;
    this.saveToStorage();
  }

  getTagsSorted(classId) {
    const mode = this.getTagSortMode(classId);
    if (mode === 'frequency') {
      return this.getTagsSortedByClassFrequency(classId);
    }
    return this.getTags(classId);
  }

  getTagsSortedByClassFrequency(classId) {
    const tags = this.getTags(classId);
    const classEvents = this.getEvents(classId);
    const freqMap = {};
    classEvents.forEach(e => {
      if (e.tagId) {
        freqMap[e.tagId] = (freqMap[e.tagId] || 0) + 1;
      }
    });

    return [...tags].sort((a, b) => {
      const countA = freqMap[a.id] || 0;
      const countB = freqMap[b.id] || 0;
      if (countB !== countA) {
        return countB - countA; // Most frequently used in THIS class first
      }
      return 0;
    });
  }

  moveTag(tagId, direction, classId = null) {
    const tagList = this.getTags(classId);
    const idx = tagList.findIndex(t => t.id === tagId);
    if (idx === -1) return false;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= tagList.length) return false;

    const temp = tagList[idx];
    tagList[idx] = tagList[targetIdx];
    tagList[targetIdx] = temp;

    this.saveToStorage();
    return true;
  }

  swapTags(tagIdA, tagIdB, classId = null) {
    const tagList = this.getTags(classId);
    const idxA = tagList.findIndex(t => t.id === tagIdA);
    const idxB = tagList.findIndex(t => t.id === tagIdB);
    if (idxA === -1 || idxB === -1 || idxA === idxB) return false;

    const temp = tagList[idxA];
    tagList[idxA] = tagList[idxB];
    tagList[idxB] = temp;

    this.saveToStorage();
    return true;
  }

  reorderTags(sourceTagId, targetTagId, classId = null) {
    const tagList = this.getTags(classId);
    const fromIdx = tagList.findIndex(t => t.id === sourceTagId);
    const toIdx = tagList.findIndex(t => t.id === targetTagId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return false;

    const [moved] = tagList.splice(fromIdx, 1);
    tagList.splice(toIdx, 0, moved);

    this.saveToStorage();
    return true;
  }

  reorderTagsByIndex(fromIdx, toIdx, classId = null) {
    const tagList = this.getTags(classId);
    if (fromIdx < 0 || fromIdx >= tagList.length || toIdx < 0 || toIdx >= tagList.length || fromIdx === toIdx) return false;

    const [moved] = tagList.splice(fromIdx, 1);
    tagList.splice(toIdx, 0, moved);

    this.saveToStorage();
    return true;
  }

  addTag(tag, classId = null) {
    const newTag = {
      id: 'tag_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: tag.name,
      category: tag.category || 'discipline',
      delta: Number(tag.delta || 0),
      severity: tag.severity || (tag.delta > 0 ? 'positive' : tag.delta < 0 ? 'warning' : 'info'),
      icon: tag.icon || 'tag'
    };
    const tagList = this.getTags(classId);
    tagList.push(newTag);
    this.saveToStorage();
    return newTag;
  }

  updateTag(tagId, updated, classId = null) {
    const tagList = this.getTags(classId);
    const idx = tagList.findIndex(t => t.id === tagId);
    if (idx !== -1) {
      tagList[idx] = {
        ...tagList[idx],
        ...updated,
        delta: Number(updated.delta !== undefined ? updated.delta : tagList[idx].delta)
      };
      this.saveToStorage();
      return tagList[idx];
    }
    return null;
  }

  deleteTag(tagId, classId = null) {
    const group = this.getTagGroup(classId);
    if (this.data.groupTags && this.data.groupTags[group]) {
      this.data.groupTags[group] = this.data.groupTags[group].filter(t => t.id !== tagId);
    }
    this.saveToStorage();
  }

  resetTagsToDefault(classId = null) {
    const group = this.getTagGroup(classId);
    if (!this.data.groupTags) this.data.groupTags = {};
    this.data.groupTags[group] = JSON.parse(JSON.stringify(DEFAULT_TAGS));
    this.saveToStorage();
  }

  // --- Real Classroom Seating Layout Management (真實座位排列管理) ---
  getSeatingLayout(classId) {
    if (!this.data.seatingLayout) this.data.seatingLayout = {};
    const students = this.getStudents(classId);
    const studentCount = students.length;

    let layout = this.data.seatingLayout[classId];
    if (!layout || !Array.isArray(layout.seatOrder) || layout.seatOrder.length === 0) {
      // Default: 5 columns for <= 30 students, 6 columns for > 30
      const defaultCols = studentCount > 30 ? 6 : 5;
      layout = {
        cols: defaultCols,
        podiumPosition: 'top', // 'top' (前方黑板) or 'bottom'
        seatOrder: students.map(s => s.seatNo)
      };
      this.data.seatingLayout[classId] = layout;
      this.saveToStorage();
    } else {
      // Ensure all current students are present in seatOrder
      const currentSeatNos = new Set(students.map(s => s.seatNo));
      const existing = layout.seatOrder.filter(no => currentSeatNos.has(no));
      students.forEach(s => {
        if (!existing.includes(s.seatNo)) {
          existing.push(s.seatNo);
        }
      });
      layout.seatOrder = existing;
    }

    return layout;
  }

  saveSeatingLayout(classId, layout) {
    if (!this.data.seatingLayout) this.data.seatingLayout = {};
    this.data.seatingLayout[classId] = layout;
    this.saveToStorage();
  }

  swapStudentSeats(classId, seatNoA, seatNoB) {
    const layout = this.getSeatingLayout(classId);
    const idxA = layout.seatOrder.indexOf(Number(seatNoA));
    const idxB = layout.seatOrder.indexOf(Number(seatNoB));

    if (idxA !== -1 && idxB !== -1) {
      const temp = layout.seatOrder[idxA];
      layout.seatOrder[idxA] = layout.seatOrder[idxB];
      layout.seatOrder[idxB] = temp;
      this.saveSeatingLayout(classId, layout);
      return true;
    }
    return false;
  }

  reorderStudentSeats(classId, sourceSeatNo, targetSeatNo) {
    const layout = this.getSeatingLayout(classId);
    const fromIdx = layout.seatOrder.indexOf(Number(sourceSeatNo));
    const toIdx = layout.seatOrder.indexOf(Number(targetSeatNo));

    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      const [moved] = layout.seatOrder.splice(fromIdx, 1);
      layout.seatOrder.splice(toIdx, 0, moved);
      this.saveSeatingLayout(classId, layout);
      return true;
    }
    return false;
  }

  autoArrangeSeating(classId, pattern = 'normal', cols = 5) {
    const students = this.getStudents(classId);
    const sortedSeatNos = students.map(s => s.seatNo).sort((a, b) => a - b);
    let newOrder = [...sortedSeatNos];

    if (pattern === 'snake_s') {
      // Snake S curve by columns (e.g. Col 1 top-to-bottom, Col 2 bottom-to-top...)
      const rows = Math.ceil(sortedSeatNos.length / cols);
      const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
      let currentIdx = 0;

      for (let c = 0; c < cols; c++) {
        const isDownward = c % 2 === 0;
        if (isDownward) {
          for (let r = 0; r < rows; r++) {
            if (currentIdx < sortedSeatNos.length) {
              grid[r][c] = sortedSeatNos[currentIdx++];
            }
          }
        } else {
          for (let r = rows - 1; r >= 0; r--) {
            if (currentIdx < sortedSeatNos.length) {
              grid[r][c] = sortedSeatNos[currentIdx++];
            }
          }
        }
      }

      newOrder = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] !== null) {
            newOrder.push(grid[r][c]);
          }
        }
      }
    } else if (pattern === 'random') {
      // Fisher-Yates shuffle
      for (let i = newOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
      }
    } else if (pattern === 'col_first') {
      // Column first standard (Col 1: 1,2,3,4,5,6 -> Col 2: 7,8,9,10,11,12...)
      const rows = Math.ceil(sortedSeatNos.length / cols);
      const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
      let currentIdx = 0;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (currentIdx < sortedSeatNos.length) {
            grid[r][c] = sortedSeatNos[currentIdx++];
          }
        }
      }

      newOrder = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] !== null) {
            newOrder.push(grid[r][c]);
          }
        }
      }
    }

    const layout = {
      cols: Number(cols) || 5,
      podiumPosition: 'top',
      seatOrder: newOrder
    };
    this.saveSeatingLayout(classId, layout);
    return layout;
  }

  // --- Theme Management ---
  getTheme() {
    return this.data.settings?.theme || 'kitty';
  }

  setTheme(themeName) {
    if (!this.data.settings) this.data.settings = {};
    this.data.settings.theme = themeName;
    this.saveToStorage();
  }

  // --- Font Size Management ---
  getFontSize() {
    return this.data.settings?.fontSize || 'large';
  }

  setFontSize(size) {
    if (!this.data.settings) this.data.settings = {};
    this.data.settings.fontSize = size;
    this.saveToStorage();
  }

  // --- NAS Settings ---
  getNasSettings() {
    return this.data.settings?.nasSettings || {
      serverUrl: 'http://192.168.1.100:5005',
      username: '',
      password: '',
      remotePath: '/ClassData/class_data_sync.json',
      lastSyncTime: null
    };
  }

  updateNasSettings(settings) {
    if (!this.data.settings) this.data.settings = {};
    this.data.settings.nasSettings = {
      ...this.getNasSettings(),
      ...settings
    };
    this.saveToStorage();
  }

  // --- Queries & Events ---
  getClasses() {
    return this.data.classes;
  }

  getClassRoleLabel(clsOrId) {
    const cls = typeof clsOrId === 'string' ? this.getClass(clsOrId) : clsOrId;
    if (!cls) return '班級';
    if (cls.type === 'homeroom') return '導師班';
    const subj = String(cls.subject || '').trim();
    if (subj) return subj.endsWith('課') ? subj : `${subj}課`;
    return '數學課';
  }

  getClassQualifiedName(classId) {
    const cls = this.getClass(classId);
    if (!cls) return String(classId || '班級');
    const formatCandidate = (c) => {
      const base = String(c.name || c.id || '班級').trim();
      const roleLabel = this.getClassRoleLabel(c);
      const hasRoleInName = base.includes(roleLabel)
        || (c.type === 'homeroom' && base.includes('導師'))
        || (c.type !== 'homeroom' && c.subject && base.includes(String(c.subject).trim()))
        || /[\(（][^()（）]{1,12}(?:導師|專任|課|組|班)[\)）]\s*$/.test(base);
      return hasRoleInName ? base : `${base}(${roleLabel})`;
    };

    const candidate = formatCandidate(cls);
    const allClasses = Object.values(this.data.classes || {});
    const dupCount = allClasses.filter(other => other && formatCandidate(other) === candidate).length;

    return dupCount > 1 ? `${candidate}[${cls.id}]` : candidate;
  }

  getClass(classId) {
    return this.data.classes[classId] || null;
  }

  getStudents(classId) {
    const list = this.data.students[classId] || [];
    const total = list.length;
    list.forEach(s => {
      if (!s.gender || (s.gender !== 'M' && s.gender !== 'F')) {
        s.gender = s.seatNo <= Math.ceil(total / 2) ? 'M' : 'F';
      }
    });
    return list;
  }

  setStudentGender(classId, seatNo, gender) {
    const student = this.getStudent(classId, seatNo);
    if (student) {
      student.gender = gender === 'F' ? 'F' : 'M';
      this.saveToStorage();
    }
  }

  toggleStudentGender(classId, seatNo) {
    const student = this.getStudent(classId, seatNo);
    if (student) {
      student.gender = student.gender === 'F' ? 'M' : 'F';
      this.saveToStorage();
      return student.gender;
    }
    return 'M';
  }

  setGenderSplitBoundary(classId, lastBoySeatNo) {
    const list = this.getStudents(classId);
    const split = parseInt(lastBoySeatNo, 10);
    list.forEach(s => {
      s.gender = s.seatNo <= split ? 'M' : 'F';
    });
    this.saveToStorage();
    return list;
  }

  setAllStudentsGender(classId, gender) {
    const list = this.getStudents(classId);
    list.forEach(s => {
      s.gender = gender === 'F' ? 'F' : 'M';
    });
    this.saveToStorage();
    return list;
  }

  getStudent(classId, seatNo) {
    const list = this.getStudents(classId);
    return list.find(s => s.seatNo === parseInt(seatNo, 10)) || null;
  }

  getEvents(classId = null) {
    if (!classId) return this.data.events;
    return this.data.events.filter(e => e.classId === classId);
  }

  getEventsByClass(classId = null) {
    return this.getEvents(classId);
  }

  getAssessments(classId) {
    return this.data.assessments[classId] || [];
  }

  addEvent(event) {
    const newEvent = {
      id: 'evt_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      date: event.date || window.getLocalDateStr(),
      time: event.time || new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      ...event
    };
    this.data.events.unshift(newEvent);
    this.saveToStorage();
    return newEvent;
  }

  deleteEvent(eventId) {
    const before = this.data.events.length;
    this.data.events = this.data.events.filter(e => e.id !== eventId);
    const removed = this.data.events.length < before;
    if (removed) this.saveToStorage();
    return removed;
  }

  deleteEventsBatch(eventIds) {
    const idSet = new Set(Array.isArray(eventIds) ? eventIds : []);
    if (idSet.size === 0) return 0;
    const before = this.data.events.length;
    this.data.events = this.data.events.filter(e => !idSet.has(e.id));
    const removedCount = before - this.data.events.length;
    if (removedCount > 0) this.saveToStorage();
    return removedCount;
  }

  updateEvent(eventId, patch = {}) {
    const evt = (this.data.events || []).find(e => e.id === eventId);
    if (!evt) return null;
    if (patch.tagName !== undefined) {
      const nextName = String(patch.tagName).trim();
      if (nextName) evt.tagName = nextName;
    }
    if (patch.delta !== undefined) {
      const num = Number(patch.delta);
      if (Number.isFinite(num)) {
        evt.delta = num;
        evt.severity = num > 0 ? 'positive' : num < 0 ? 'warning' : 'neutral';
      }
    }
    if (patch.note !== undefined) {
      evt.note = String(patch.note);
    }
    this.saveToStorage();
    return evt;
  }

  addAssessment(classId, assessment) {
    if (!this.data.assessments[classId]) {
      this.data.assessments[classId] = [];
    }
    const newAsm = {
      id: 'asm_' + classId + '_' + Date.now(),
      ...assessment
    };
    this.data.assessments[classId].push(newAsm);
    this.saveToStorage();
    return newAsm;
  }

  updateAssessmentScore(classId, assessmentId, seatNo, score) {
    const asms = this.data.assessments[classId];
    if (!asms) return;
    const target = asms.find(a => a.id === assessmentId);
    if (target) {
      if (!target.scores) target.scores = {};
      target.scores[seatNo] = Number(score);
      this.saveToStorage();
    }
  }

  updateWeeklySchedule(schedule) {
    this.data.weeklySchedule = schedule;
    this.saveToStorage();
  }

  updateTimetablePeriods(periods) {
    this.data.timetablePeriods = periods;
    this.saveToStorage();
  }

  setManualClassOverride(classId) {
    this.data.currentClassOverride = classId;
    this.saveToStorage();
  }

  clearManualClassOverride() {
    this.data.currentClassOverride = null;
    this.saveToStorage();
  }

  exportAllData() {
    return JSON.stringify(this.data, null, 2);
  }

  // --- Local Automatic Data Snapshots & 1-Click Rollback ---
  sanitizeAndMigrateLegacyData() {
    try {
      if (!this.data || typeof this.data !== 'object' || Array.isArray(this.data)) {
        this.data = {};
      }
      const d = this.data;

      // 1. Classes container & per-class fields
      if (!d.classes || typeof d.classes !== 'object' || Array.isArray(d.classes)) {
        d.classes = {};
      }
      const cleanedClasses = {};
      Object.keys(d.classes).forEach((cid) => {
        const rawCls = d.classes[cid];
        if (!rawCls || typeof rawCls !== 'object') return;
        const normalizedId = String(rawCls.id || cid).trim() || cid;
        const sl = rawCls.seatLayout && typeof rawCls.seatLayout === 'object' ? rawCls.seatLayout : {};
        const cols = Number.isFinite(Number(sl.cols)) && Number(sl.cols) > 0 ? Math.min(12, Math.max(1, parseInt(sl.cols, 10))) : 5;
        const rows = Number.isFinite(Number(sl.rows)) && Number(sl.rows) > 0 ? Math.min(12, Math.max(1, parseInt(sl.rows, 10))) : 6;
        cleanedClasses[cid] = {
          ...rawCls,
          id: normalizedId,
          name: String(rawCls.name || `${cid} 班`),
          type: rawCls.type === 'homeroom' ? 'homeroom' : 'subject',
          subject: String(rawCls.subject || (rawCls.type === 'homeroom' ? '導師班' : '數學')),
          seatLayout: { rows, cols }
        };
      });
      d.classes = cleanedClasses;

      // 2. Students container & per-student coercions (strictly preserve student records)
      if (!d.students || typeof d.students !== 'object' || Array.isArray(d.students)) {
        d.students = {};
      }
      Object.keys(d.classes).forEach((cid) => {
        const rawList = d.students[cid];
        const safeList = Array.isArray(rawList) ? rawList.filter(s => s && typeof s === 'object') : [];
        const total = safeList.length;
        d.students[cid] = safeList.map((s, idx) => {
          const parsedSeat = parseInt(s.seatNo, 10);
          const seatNo = Number.isFinite(parsedSeat) && parsedSeat > 0 ? parsedSeat : (idx + 1);
          const gender = (s.gender === 'M' || s.gender === 'F')
            ? s.gender
            : (seatNo <= Math.ceil((total || 1) / 2) ? 'M' : 'F');
          return {
            ...s,
            seatNo,
            name: String(s.name || `座號 ${seatNo}`),
            gender,
            notes: typeof s.notes === 'string' ? s.notes : ''
          };
        });
        d.classes[cid].studentCount = d.students[cid].length;
      });

      // 3. Events array
      if (!Array.isArray(d.events)) {
        d.events = [];
      } else {
        d.events = d.events
          .filter(e => e && typeof e === 'object')
          .map(e => ({
            ...e,
            seatNo: parseInt(e.seatNo, 10) || e.seatNo || 1,
            delta: Number.isFinite(Number(e.delta)) ? Number(e.delta) : 0,
            classId: e.classId !== undefined && e.classId !== null ? String(e.classId) : ''
          }));
      }

      // 4. Plain-object side dictionaries & seating layouts
      if (!d.assessments || typeof d.assessments !== 'object' || Array.isArray(d.assessments)) d.assessments = {};
      if (!d.seatingLayout || typeof d.seatingLayout !== 'object' || Array.isArray(d.seatingLayout)) d.seatingLayout = {};
      if (!d.classTagStats || typeof d.classTagStats !== 'object' || Array.isArray(d.classTagStats)) d.classTagStats = {};
      if (!d.termArchives || typeof d.termArchives !== 'object' || Array.isArray(d.termArchives)) d.termArchives = {};

      Object.keys(d.seatingLayout).forEach((cid) => {
        const layout = d.seatingLayout[cid];
        if (!layout || typeof layout !== 'object') {
          delete d.seatingLayout[cid];
          return;
        }
        if (!Array.isArray(layout.seatOrder)) {
          layout.seatOrder = (d.students[cid] || []).map(s => s.seatNo);
        } else {
          layout.seatOrder = layout.seatOrder
            .map(n => parseInt(n, 10))
            .filter(n => Number.isFinite(n) && n > 0);
        }
        layout.cols = Number.isFinite(Number(layout.cols)) && Number(layout.cols) > 0 ? parseInt(layout.cols, 10) : 5;
        if (!layout.podiumPosition) layout.podiumPosition = 'top';
      });

      Object.keys(d.termArchives).forEach((cid) => {
        if (!Array.isArray(d.termArchives[cid])) {
          d.termArchives[cid] = [];
        }
      });

      // 5. Timetable periods & weekly schedule validation
      const timeRegex = /^\d{1,2}:\d{2}$/;
      if (!Array.isArray(d.timetablePeriods) || d.timetablePeriods.length === 0) {
        d.timetablePeriods = JSON.parse(JSON.stringify(DEFAULT_TIMETABLE_PERIODS));
      } else {
        const validPeriods = d.timetablePeriods.filter(p =>
          p && typeof p === 'object' &&
          typeof p.start === 'string' && timeRegex.test(p.start.trim()) &&
          typeof p.end === 'string' && timeRegex.test(p.end.trim())
        );
        d.timetablePeriods = validPeriods.length > 0
          ? validPeriods
          : JSON.parse(JSON.stringify(DEFAULT_TIMETABLE_PERIODS));
      }

      if (!d.weeklySchedule || typeof d.weeklySchedule !== 'object' || Array.isArray(d.weeklySchedule)) {
        d.weeklySchedule = {};
      }

      // 6. Clear stale currentClassOverride pointing to a deleted class
      if (d.currentClassOverride && !d.classes[d.currentClassOverride]) {
        d.currentClassOverride = null;
      }

      // 7. Custom tags & groupTags (never overwrite existing valid custom tags!)
      if (!Array.isArray(d.tags) || d.tags.length === 0) {
        d.tags = JSON.parse(JSON.stringify(DEFAULT_TAGS));
      }
      if (!d.groupTags || typeof d.groupTags !== 'object') {
        const fallbackHomeroom = (Array.isArray(d.classTags?.['801']) && d.classTags['801'].length > 0)
          ? d.classTags['801']
          : d.tags;
        const fallbackSubject = (Array.isArray(d.classTags?.['803']) && d.classTags['803'].length > 0)
          ? d.classTags['803']
          : ((Array.isArray(d.classTags?.['805']) && d.classTags['805'].length > 0) ? d.classTags['805'] : d.tags);
        d.groupTags = {
          homeroom: JSON.parse(JSON.stringify(fallbackHomeroom)),
          subject: JSON.parse(JSON.stringify(fallbackSubject))
        };
      } else {
        if (!Array.isArray(d.groupTags.homeroom) || d.groupTags.homeroom.length === 0) {
          d.groupTags.homeroom = JSON.parse(JSON.stringify(d.tags));
        }
        if (!Array.isArray(d.groupTags.subject) || d.groupTags.subject.length === 0) {
          d.groupTags.subject = JSON.parse(JSON.stringify(d.tags));
        }
      }

      // 8. Settings
      if (!d.settings || typeof d.settings !== 'object' || Array.isArray(d.settings)) {
        d.settings = {};
      }
      if (!d.settings.theme) d.settings.theme = 'kitty';
      if (!d.settings.fontSize) d.settings.fontSize = 'large';
    } catch (err) {
      console.warn('Legacy schema sanitization recovered from error:', err);
    }
  }

  getFirstClassId() {
    const keys = Object.keys(this.data?.classes || {});
    return keys[0] || '801';
  }

  createSnapshot(reason = '自動快照') {
    try {
      const raw = localStorage.getItem('class_point_quant_hub_snapshots_v1');
      const parsed = raw ? JSON.parse(raw) : [];
      const snapshots = Array.isArray(parsed) ? parsed : [];
      snapshots.unshift({
        timestamp: Date.now(),
        timeStr: new Date().toLocaleString('zh-TW', { hour12: false }),
        reason,
        data: JSON.parse(JSON.stringify(this.data))
      });
      // Maintain latest 5 snapshots to avoid localStorage bloat
      if (snapshots.length > 5) snapshots.length = 5;
      try {
        localStorage.setItem('class_point_quant_hub_snapshots_v1', JSON.stringify(snapshots));
        return true;
      } catch (quotaErr) {
        // Trim snapshots progressively on mobile QuotaExceededError so active teacher data stays safe
        for (let limit = 2; limit >= 1; limit--) {
          try {
            snapshots.length = Math.min(snapshots.length, limit);
            localStorage.setItem('class_point_quant_hub_snapshots_v1', JSON.stringify(snapshots));
            return true;
          } catch (e2) {}
        }
        console.warn('Snapshot skipped due to storage quota:', quotaErr);
        return false;
      }
    } catch (e) {
      console.warn('Snapshot skipped:', e);
      return false;
    }
  }

  getSnapshots() {
    try {
      const raw = localStorage.getItem('class_point_quant_hub_snapshots_v1');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  restoreSnapshot(timestamp) {
    const snapshots = this.getSnapshots();
    const target = snapshots.find(s => s.timestamp === Number(timestamp));
    if (target && target.data) {
      // Create backup of current state before rollback
      this.createSnapshot('還原前自動備份');
      this.data = target.data;
      this.sanitizeAndMigrateLegacyData();
      this.saveToStorage();
      return true;
    }
    return false;
  }

  importAllData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.classes || !parsed.students) {
        throw new Error('資料結構不符合規格：缺少 classes 或 students 欄位');
      }
      this.createSnapshot('匯入全系統備份前');
      this.data = parsed;
      this.sanitizeAndMigrateLegacyData();
      if (!this.data.termArchives || typeof this.data.termArchives !== 'object') {
        this.data.termArchives = {};
      }
      if (!this.data.settings) this.data.settings = {};
      if (!this.data.settings.regularGradeConfig) {
        this.data.settings.regularGradeConfig = this.getDefaultRegularGradeConfig();
      }
      if (Object.keys(this.data.classes).length > 0) {
        localStorage.removeItem('classquant_user_cleared');
        delete this.data.hasClearedAll;
      }
      this.saveToStorage();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  deleteClassData(classId) {
    if (!classId || !this.data.classes?.[classId]) return false;
    this.createSnapshot(`刪除 ${classId} 班前`);
    delete this.data.classes[classId];
    if (this.data.students) delete this.data.students[classId];
    if (this.data.assessments) delete this.data.assessments[classId];
    if (this.data.seatingLayout) delete this.data.seatingLayout[classId];
    if (this.data.termArchives) delete this.data.termArchives[classId];
    if (Array.isArray(this.data.events)) {
      this.data.events = this.data.events.filter(e => e.classId !== classId);
    }
    if (this.data.weeklySchedule) {
      Object.keys(this.data.weeklySchedule).forEach(dayKey => {
        const daySlots = this.data.weeklySchedule[dayKey];
        if (!daySlots) return;
        Object.keys(daySlots).forEach(periodKey => {
          if (daySlots[periodKey] === classId) {
            delete daySlots[periodKey];
          }
        });
      });
    }
    if (this.data.currentClassOverride === classId) {
      this.data.currentClassOverride = null;
    }
    this.saveToStorage();
    return true;
  }

  resetToDemo() {
    this.createSnapshot('重置展示資料前');
    localStorage.removeItem('classquant_user_cleared');
    localStorage.removeItem(STORAGE_KEY);
    this.initDemoData();
  }

  clearAll() {
    this.createSnapshot('清空所有資料前');
    localStorage.setItem('classquant_user_cleared', 'true');
    const prevSettings = this.data.settings || {};
    this.data = {
      hasClearedAll: true,
      classes: {},
      students: {},
      assessments: {},
      events: [],
      termArchives: {},
      seatingLayout: {},
      tags: DEFAULT_TAGS,
      groupTags: {
        homeroom: JSON.parse(JSON.stringify(DEFAULT_TAGS)),
        subject: JSON.parse(JSON.stringify(DEFAULT_TAGS))
      },
      timetablePeriods: DEFAULT_TIMETABLE_PERIODS,
      weeklySchedule: {},
      currentClassOverride: null,
      settings: {
        theme: prevSettings.theme || 'kitty',
        fontSize: prevSettings.fontSize || 'large',
        autoSwitchTimetable: true,
        enableSound: prevSettings.enableSound !== undefined ? prevSettings.enableSound : true,
        cliffDropSigmaThreshold: prevSettings.cliffDropSigmaThreshold || 1.8,
        regularGradeConfig: prevSettings.regularGradeConfig || this.getDefaultRegularGradeConfig(),
        googleBackup: prevSettings.googleBackup || this.getDefaultGoogleBackupSettings(),
        nasSettings: prevSettings.nasSettings || {
          serverUrl: 'http://192.168.1.100:5005',
          username: '',
          password: '',
          remotePath: '/ClassData/class_data_sync.json',
          lastSyncTime: null
        }
      }
    };
    this.saveToStorage();
  }

  // --- Google Sheets / Google Forms Scheduled & On-Demand Backup Engine ---
  getGoogleBackupSettings() {
    const saved = this.data.settings?.googleBackup || this.getDefaultGoogleBackupSettings();
    const feedbackWebhook = (localStorage.getItem('classquant_feedback_webhook_url') || '').trim();
    const configWebhook = (this.cloudWebhookUrl || '').trim();

    let effectiveUrl = (saved.appsScriptUrl || '').trim();
    let inheritedSource = '';
    if (!effectiveUrl && feedbackWebhook) {
      effectiveUrl = feedbackWebhook;
      inheritedSource = 'feedback_webhook';
    } else if (!effectiveUrl && configWebhook) {
      effectiveUrl = configWebhook;
      inheritedSource = 'cloud_config';
    } else if (effectiveUrl) {
      inheritedSource = 'manual';
    }

    const effectiveFormUrl = (saved.googleFormUrl || this.cloudFormUrl || '').trim();
    const effectiveFormEntryId = (saved.formEntryId || this.cloudFormEntryId || '').trim();
    const effectiveFormSummaryEntryId = (saved.formSummaryEntryId || this.cloudFormSummaryEntryId || '').trim();

    const hasExplicitMode = Boolean(
      saved.modeExplicit ||
      (saved.mode === 'sheets' && (saved.appsScriptUrl || '').trim()) ||
      (saved.mode === 'form' && (saved.googleFormUrl || '').trim())
    );
    let effectiveMode = saved.mode || 'sheets';
    if (!hasExplicitMode && this.cloudDefaultBackupMode === 'form' && effectiveFormUrl && effectiveFormEntryId) {
      effectiveMode = 'form';
    } else if (!hasExplicitMode && this.cloudDefaultBackupMode === 'sheets' && effectiveUrl) {
      effectiveMode = 'sheets';
    }

    const effectiveSchedule = saved.scheduleExplicit
      ? (saved.schedule || 'daily')
      : (this.cloudDefaultSchedule || saved.schedule || 'daily');

    return {
      ...this.getDefaultGoogleBackupSettings(),
      ...saved,
      deviceId: this.getOrCreateDeviceId(),
      mode: effectiveMode,
      schedule: effectiveSchedule,
      effectiveAppsScriptUrl: effectiveUrl,
      inheritedSource,
      effectiveFormUrl,
      effectiveFormEntryId,
      effectiveFormSummaryEntryId
    };
  }

  getOrCreateDeviceId() {
    const key = 'classquant_device_id';
    let id = '';
    try {
      id = (localStorage.getItem(key) || '').trim();
      if (!id) {
        let hex = '';
        if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
          hex = Array.from(window.crypto.getRandomValues(new Uint8Array(4)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();
        } else {
          hex = (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).toUpperCase();
        }
        id = 'CQ-' + hex.slice(0, 6);
        localStorage.setItem(key, id);
      }
    } catch (e) {
      id = 'CQ-LOCAL';
    }
    return id;
  }

  getDeviceSignatureLabel() {
    const cfg = this.getGoogleBackupSettings();
    const feedbackAuthor = (() => {
      try { return (localStorage.getItem('classquant_feedback_author') || '').trim(); } catch (e) { return ''; }
    })();
    const displayName = (cfg.teacherLabel || '').trim() || feedbackAuthor || '未命名裝置';
    const classNames = Object.values(this.data.classes || {})
      .map(c => c?.name || c?.id)
      .filter(Boolean);
    const classPreview = classNames.length > 3
      ? `${classNames.slice(0, 3).join('、')}等${classNames.length}班`
      : classNames.join('、');
    const deviceId = cfg.deviceId || this.getOrCreateDeviceId();
    return `${displayName} [ID:${deviceId}${classPreview ? `｜班級:${classPreview}` : ''}]`;
  }

  updateGoogleBackupSettings(partial = {}) {
    if (!this.data.settings) this.data.settings = {};
    const current = this.data.settings.googleBackup || this.getDefaultGoogleBackupSettings();
    this.data.settings.googleBackup = {
      ...current,
      ...partial
    };
    if (partial.appsScriptUrl && partial.appsScriptUrl.trim() && !localStorage.getItem('classquant_feedback_webhook_url')) {
      localStorage.setItem('classquant_feedback_webhook_url', partial.appsScriptUrl.trim());
    }
    this.saveToStorage();
    return this.getGoogleBackupSettings();
  }

  parseGoogleFormUrl(rawInput = '') {
    const raw = (rawInput || '').trim();
    if (!raw) return { actionUrl: '', entryId: '', entryIds: [] };
    let actionUrl = raw.split('?')[0].trim();
    actionUrl = actionUrl.replace(/\/(viewform|edit)\/?$/i, '/formResponse');
    const entryIds = [];
    try {
      const urlObj = new URL(raw);
      for (const [k] of urlObj.searchParams.entries()) {
        if (/^entry\.\d+$/.test(k) && !entryIds.includes(k)) {
          entryIds.push(k);
        }
      }
    } catch (e) {}
    const entryId = entryIds.length >= 2 ? entryIds[entryIds.length - 1] : (entryIds[0] || '');
    const summaryEntryId = entryIds.length >= 2 ? entryIds[0] : '';
    return { actionUrl, entryId, summaryEntryId, entryIds };
  }

  computeDataHash(str) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return `${(hash >>> 0).toString(16)}_${str.length}`;
  }

  getBackupSummary() {
    const classes = Object.keys(this.data.classes || {});
    let studentCount = 0;
    classes.forEach(cId => {
      studentCount += (this.data.students?.[cId]?.length || 0);
    });
    let assessmentCount = 0;
    Object.values(this.data.assessments || {}).forEach(arr => {
      assessmentCount += (arr?.length || 0);
    });
    const eventCount = (this.data.events || []).length;
    const homeroomTags = this.data.groupTags?.homeroom?.length || 0;
    const subjectTags = this.data.groupTags?.subject?.length || 0;
    return {
      classCount: classes.length,
      studentCount,
      assessmentCount,
      eventCount,
      tagCount: homeroomTags + subjectTags
    };
  }

  buildCloudBackupPayload(reason = '手動備份') {
    const cfg = this.getGoogleBackupSettings();
    const coreSnapshot = {
      classes: this.data.classes || {},
      students: this.data.students || {},
      assessments: this.data.assessments || {},
      events: this.data.events || [],
      tags: this.data.tags || DEFAULT_TAGS,
      groupTags: this.data.groupTags || null,
      seatingLayout: this.data.seatingLayout || {},
      timetablePeriods: this.data.timetablePeriods || DEFAULT_TIMETABLE_PERIODS,
      weeklySchedule: this.data.weeklySchedule || {}
    };
    const coreHash = this.computeDataHash(JSON.stringify(coreSnapshot));
    const dataJson = JSON.stringify(this.data);
    return {
      type: 'backup',
      id: 'bk_' + Date.now(),
      timestamp: new Date().toISOString(),
      localTimeStr: new Date().toLocaleString('zh-TW', { hour12: false }),
      reason,
      deviceId: cfg.deviceId || this.getOrCreateDeviceId(),
      deviceLabel: this.getDeviceSignatureLabel(),
      summary: this.getBackupSummary(),
      hash: coreHash,
      dataJson
    };
  }

  async uploadGoogleBackup({ reason = '手動備份', force = false, silent = false } = {}) {
    const cfg = this.getGoogleBackupSettings();
    if (!navigator.onLine) {
      if (!silent && window.appState?.showToast) {
        window.appState.showToast('目前處於離線狀態，待連線後會自動執行雲端備份', 'warning');
      }
      return { success: false, error: 'OFFLINE' };
    }

    const payload = this.buildCloudBackupPayload(reason);
    if (!force && cfg.lastBackupHash && cfg.lastBackupHash === payload.hash) {
      return { success: true, skipped: true, reason: 'NO_CHANGES' };
    }

    if (cfg.mode === 'form') {
      const formUrl = cfg.effectiveFormUrl;
      const entryId = cfg.effectiveFormEntryId;
      if (!formUrl || !entryId) {
        if (!silent && window.appState?.showToast) {
          window.appState.showToast('請先填入 Google 表單網址與欄位代碼 (entry.xxxxxx)', 'warning');
        }
        return { success: false, error: 'NO_FORM_CONFIG' };
      }

      const parsedForm = this.parseGoogleFormUrl(formUrl);
      const targetUrl = parsedForm.actionUrl || formUrl;
      const formData = new URLSearchParams();
      formData.append(entryId, payload.dataJson);
      const summaryEntryId = cfg.effectiveFormSummaryEntryId || '';
      if (summaryEntryId && /^entry\.\d+$/.test(summaryEntryId)) {
        const s = payload.summary;
        formData.append(
          summaryEntryId,
          `[${payload.localTimeStr}] ${payload.deviceLabel} | ${reason} | ${s.classCount}班 ${s.studentCount}人 ${s.assessmentCount}次考 ${s.eventCount}事件`
        );
      }

      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: formData.toString()
      });

      this._recordBackupSuccess(payload, '已送出至 Google 表單');
      return { success: true, mode: 'form', payload };
    }

    // Default: Google Sheets via Apps Script (supports unlimited length chunking + 1-click two-way restore)
    const url = cfg.effectiveAppsScriptUrl;
    if (!url) {
      if (!silent && window.appState?.showToast) {
        window.appState.showToast('尚未設定 Google 試算表 Apps Script 網址，請先依引導完成一次性設定', 'warning');
      }
      return { success: false, error: 'NO_WEBHOOK' };
    }

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload)
    });

    this._recordBackupSuccess(payload, '已雲端備份至 Google 試算表');
    return { success: true, mode: 'sheets', payload };
  }

  _recordBackupSuccess(payload, statusLabel) {
    if (!this.data.settings) this.data.settings = {};
    if (!this.data.settings.googleBackup) {
      this.data.settings.googleBackup = this.getDefaultGoogleBackupSettings();
    }
    this.data.settings.googleBackup.lastBackupTs = Date.now();
    this.data.settings.googleBackup.lastBackupHash = payload.hash;
    this.data.settings.googleBackup.lastBackupStatus = `${statusLabel} (${payload.localTimeStr})`;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to persist backup status due to storage quota:', e);
    }
  }

  scheduleAutoBackupOnChange() {
    const cfg = this.getGoogleBackupSettings();
    if (cfg.schedule !== 'on_change') return;
    if (this._autoBackupTimer) clearTimeout(this._autoBackupTimer);
    this._autoBackupTimer = setTimeout(() => {
      this.checkAndRunScheduledBackup('資料異動自動備份');
    }, 15000);
  }

  async checkAndRunScheduledBackup(reason = '定期自動備份') {
    try {
      if (this._cloudConfigReady) {
        await this._cloudConfigReady;
      }
      const cfg = this.getGoogleBackupSettings();
      if (!cfg.schedule || cfg.schedule === 'manual') return { skipped: true };
      const hasEndpoint = cfg.mode === 'form'
        ? Boolean(cfg.effectiveFormUrl && cfg.effectiveFormEntryId)
        : Boolean(cfg.effectiveAppsScriptUrl);
      if (!hasEndpoint || !navigator.onLine) return { skipped: true };

      const intervalMap = {
        on_change: 2 * 60 * 1000,
        hourly: 3600 * 1000,
        daily: 24 * 3600 * 1000,
        weekly: 7 * 24 * 3600 * 1000
      };
      const minInterval = intervalMap[cfg.schedule] ?? (24 * 3600 * 1000);
      const elapsed = Date.now() - (Number(cfg.lastBackupTs) || 0);
      if (elapsed < minInterval) return { skipped: true };

      return await this.uploadGoogleBackup({ reason, force: false, silent: true });
    } catch (e) {
      console.warn('Scheduled backup skipped:', e);
      return { success: false, error: e.message };
    }
  }

  async fetchCloudBackupsList() {
    const cfg = this.getGoogleBackupSettings();
    const url = cfg.effectiveAppsScriptUrl;
    if (!url) throw new Error('尚未設定 Google 試算表 Apps Script 網址');
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${sep}action=list_backups&t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error(data?.error || '雲端尚未更新為新版備份腳本（需支援 Backups 分頁）');
    }
    return data;
  }

  async restoreFromCloudBackup(backupId) {
    const cfg = this.getGoogleBackupSettings();
    const url = cfg.effectiveAppsScriptUrl;
    if (!url) throw new Error('尚未設定 Google 試算表 Apps Script 網址');
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${sep}action=get_backup&id=${encodeURIComponent(backupId)}&t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    if (!result || !result.dataJson) {
      throw new Error(result?.error || '找不到該筆備份內容');
    }
    return this.importAllData(result.dataJson);
  }

  // --- Term Regular Grading, Tiering, Settlement & Historical Cumulative Engine ---
  getDefaultRegularGradeConfig() {
    return {
      baseScore: 80,
      pointsPerUnit: 1,
      minScore: 0,
      maxScore: 100
    };
  }

  getRegularGradeConfig() {
    if (!this.data.settings) this.data.settings = {};
    if (!this.data.settings.regularGradeConfig) {
      this.data.settings.regularGradeConfig = this.getDefaultRegularGradeConfig();
    }
    const cfg = this.data.settings.regularGradeConfig;
    const minScore = Number.isFinite(Number(cfg.minScore)) ? Number(cfg.minScore) : 0;
    const maxScore = Number.isFinite(Number(cfg.maxScore)) ? Math.max(minScore, Number(cfg.maxScore)) : 100;
    return {
      baseScore: Number.isFinite(Number(cfg.baseScore)) ? Number(cfg.baseScore) : 80,
      pointsPerUnit: Number.isFinite(Number(cfg.pointsPerUnit)) && Number(cfg.pointsPerUnit) > 0 ? Number(cfg.pointsPerUnit) : 1,
      minScore,
      maxScore
    };
  }

  updateRegularGradeConfig(patch = {}) {
    const curr = this.getRegularGradeConfig();
    const minScore = patch.minScore !== undefined && Number.isFinite(Number(patch.minScore)) ? Number(patch.minScore) : curr.minScore;
    const maxScore = patch.maxScore !== undefined && Number.isFinite(Number(patch.maxScore)) ? Math.max(minScore, Number(patch.maxScore)) : curr.maxScore;
    const baseScore = patch.baseScore !== undefined && Number.isFinite(Number(patch.baseScore)) ? Number(patch.baseScore) : curr.baseScore;
    const pointsPerUnit = patch.pointsPerUnit !== undefined && Number.isFinite(Number(patch.pointsPerUnit)) && Number(patch.pointsPerUnit) > 0
      ? Number(patch.pointsPerUnit)
      : curr.pointsPerUnit;

    if (!this.data.settings) this.data.settings = {};
    this.data.settings.regularGradeConfig = {
      baseScore,
      pointsPerUnit,
      minScore,
      maxScore
    };
    this.saveToStorage();
    return this.getRegularGradeConfig();
  }

  computeGradeTier(score) {
    const val = Number(score) || 0;
    if (val >= 95) return { tier: 'S', oaaSubGrade: 'S', label: 'S 卓越表現' };
    if (val >= 90) return { tier: 'A', oaaSubGrade: 'A+', label: 'A 優秀表現' };
    if (val >= 85) return { tier: 'A', oaaSubGrade: 'A', label: 'A 優良表現' };
    if (val >= 80) return { tier: 'B', oaaSubGrade: 'B+', label: 'B 穩定達標' };
    if (val >= 75) return { tier: 'B', oaaSubGrade: 'B', label: 'B 基準表現' };
    if (val >= 68) return { tier: 'C', oaaSubGrade: 'C+', label: 'C 尚需鼓勵' };
    if (val >= 60) return { tier: 'C', oaaSubGrade: 'C', label: 'C 須加留意' };
    return { tier: 'D', oaaSubGrade: 'D', label: 'D 重點輔導' };
  }

  getTermArchives(classId) {
    if (!classId || !this.data.termArchives) return [];
    const list = this.data.termArchives[classId];
    return Array.isArray(list) ? list : [];
  }

  getNextTermNumber(classId) {
    return this.getTermArchives(classId).length + 1;
  }

  getDefaultTermLabel(classId) {
    return `第 ${this.getNextTermNumber(classId)} 次段考`;
  }

  _buildHistoryMapBySeat(classId, maxTermNumber = null) {
    const archives = this.getTermArchives(classId).filter(a =>
      maxTermNumber === null ? true : Number(a.termNumber) <= Number(maxTermNumber)
    );
    const bySeat = {};
    archives.forEach(arch => {
      (arch.students || []).forEach(stu => {
        const key = Number(stu.seatNo);
        if (!bySeat[key]) {
          bySeat[key] = {
            records: [],
            pastNetDeltaSum: 0,
            pastPositiveSum: 0,
            pastNegativeSum: 0,
            scoreSum: 0
          };
        }
        const entry = bySeat[key];
        entry.records.push({
          archiveId: arch.id,
          termNumber: arch.termNumber,
          termLabel: arch.termLabel,
          settledAt: arch.settledAt,
          regularScore: Number(stu.regularScore) || 0,
          netDelta: Number(stu.netDelta) || 0,
          positivePts: Number(stu.positivePts) || 0,
          negativePts: Number(stu.negativePts) || 0,
          eventCount: Number(stu.eventCount) || 0,
          overallRank: Number(stu.overallRank) || 0,
          tier: stu.tier || this.computeGradeTier(stu.regularScore).tier
        });
        entry.pastNetDeltaSum += Number(stu.netDelta) || 0;
        entry.pastPositiveSum += Number(stu.positivePts) || 0;
        entry.pastNegativeSum += Number(stu.negativePts) || 0;
        entry.scoreSum += Number(stu.regularScore) || 0;
      });
    });
    return bySeat;
  }

  getStudentHistoricalSummary(classId, seatNo) {
    const bySeat = this._buildHistoryMapBySeat(classId);
    const rec = bySeat[Number(seatNo)];
    const rank = this.getStudentRankInClass(classId, seatNo);
    const records = rec ? rec.records : [];
    const settledTermCount = records.length;
    const pastNetDeltaSum = rec ? rec.pastNetDeltaSum : 0;
    const pastPositiveSum = rec ? rec.pastPositiveSum : 0;
    const pastNegativeSum = rec ? rec.pastNegativeSum : 0;
    const pastAvgRegularScore = settledTermCount > 0 ? Math.round((rec.scoreSum / settledTermCount) * 10) / 10 : null;
    const currentNetDelta = Number(rank.netDelta) || 0;
    const currentRegularScore = Number(rank.regularScore) || this.getRegularGradeConfig().baseScore;
    const allTermsAvgRegularScore = settledTermCount > 0
      ? Math.round(((rec.scoreSum + currentRegularScore) / (settledTermCount + 1)) * 10) / 10
      : currentRegularScore;

    return {
      records,
      settledTermCount,
      pastNetDeltaSum,
      pastPositiveSum,
      pastNegativeSum,
      pastAvgRegularScore,
      currentNetDelta,
      currentRegularScore,
      totalCumulativeNetDelta: pastNetDeltaSum + currentNetDelta,
      allTermsAvgRegularScore
    };
  }

  settleClassTerm(classId, customTermLabel = '') {
    if (!classId || !this.data.classes?.[classId]) {
      return { success: false, error: '找不到指定班級，無法結算' };
    }
    const cls = this.data.classes[classId];
    const termNumber = this.getNextTermNumber(classId);
    const termLabel = (customTermLabel || '').trim() || `第 ${termNumber} 次段考`;

    // Safety snapshot before clearing this class's active events
    this.createSnapshot(`結算 ${cls.name} ${termLabel} 前`);

    const cfg = this.getRegularGradeConfig();
    const leaderboard = this.getClassLeaderboard(classId);
    const classEvents = (this.data.events || []).filter(e => e.classId === classId);
    const settledAt = new Date().toISOString();

    const studentSnapshots = leaderboard.map(item => ({
      seatNo: item.seatNo,
      name: item.name,
      gender: item.gender,
      overallRank: item.overallRank,
      genderRank: item.genderRank,
      regularScore: item.regularScore,
      uncappedScore: item.uncappedScore,
      netDelta: item.netDelta,
      positivePts: item.positivePts,
      negativePts: item.negativePts,
      eventCount: item.eventCount,
      tier: item.tier,
      oaaSubGrade: item.oaaSubGrade,
      pastNetDeltaSum: item.pastNetDeltaSum,
      totalCumulativeNetDelta: item.totalCumulativeNetDelta,
      allTermsAvgRegularScore: item.allTermsAvgRegularScore
    }));

    const avgScore = studentSnapshots.length > 0
      ? Math.round((studentSnapshots.reduce((s, r) => s + r.regularScore, 0) / studentSnapshots.length) * 10) / 10
      : cfg.baseScore;

    const archiveEntry = {
      id: `term_${classId}_${Date.now()}`,
      classId,
      className: cls.name,
      termNumber,
      termLabel,
      settledAt,
      gradeConfig: { ...cfg },
      summary: {
        studentCount: studentSnapshots.length,
        classAvgRegularScore: avgScore,
        totalEventCount: classEvents.length,
        totalPositivePts: studentSnapshots.reduce((s, r) => s + r.positivePts, 0),
        totalNegativePts: studentSnapshots.reduce((s, r) => s + r.negativePts, 0)
      },
      students: studentSnapshots,
      events: JSON.parse(JSON.stringify(classEvents))
    };

    if (!this.data.termArchives || typeof this.data.termArchives !== 'object') {
      this.data.termArchives = {};
    }
    if (!Array.isArray(this.data.termArchives[classId])) {
      this.data.termArchives[classId] = [];
    }
    this.data.termArchives[classId].push(archiveEntry);

    // Reset ONLY this class's active events; leave all other classes untouched
    this.data.events = (this.data.events || []).filter(e => e.classId !== classId);
    this.saveToStorage();

    return {
      success: true,
      archive: archiveEntry,
      settledEventCount: classEvents.length
    };
  }

  buildClassTermWorkbookSheets(classId, archiveEntry = null) {
    const cls = this.getClass(classId) || { id: classId, name: classId || '班級' };
    const qualifiedClassName = this.getClassQualifiedName(classId);
    const isArchived = Boolean(archiveEntry);
    const cfg = archiveEntry?.gradeConfig || this.getRegularGradeConfig();
    const termTitle = archiveEntry
      ? archiveEntry.termLabel
      : `${this.getDefaultTermLabel(classId)}（目前進度預覽）`;

    const allArchives = this.getTermArchives(classId);
    const relevantArchives = archiveEntry
      ? allArchives.filter(a => Number(a.termNumber) <= Number(archiveEntry.termNumber))
      : allArchives;

    const sourceRows = archiveEntry
      ? [...(archiveEntry.students || [])]
      : this.getClassLeaderboard(classId);

    const rowsBySeat = [...sourceRows].sort((a, b) => Number(a.seatNo) - Number(b.seatNo));
    const dateStamp = (archiveEntry?.settledAt || new Date().toISOString()).slice(0, 10);

    // Sheet 1: 平時成績總表 (Sorted by seat number ascending for direct gradebook entry)
    const sheet1Rows = [
      [
        `${qualifiedClassName} 平時成績結算表`,
        termTitle,
        `規則：基準 ${cfg.baseScore} 分 / 每點 ×${cfg.pointsPerUnit}（${cfg.minScore}~${cfg.maxScore}分）`,
        `時間：${dateStamp}`
      ],
      [
        '座號',
        '姓名',
        '性別',
        '本期平時成績',
        '等第',
        '班級排名',
        '本期淨加減分',
        '正向加分',
        '扣分累計',
        '點記次數',
        '歷史累積淨分(含本期)',
        '歷次段考平均'
      ]
    ];

    rowsBySeat.forEach(item => {
      const cumNet = item.totalCumulativeNetDelta !== undefined
        ? Number(item.totalCumulativeNetDelta)
        : Number(item.netDelta || 0);
      const histAvg = item.allTermsAvgRegularScore !== undefined
        ? Number(item.allTermsAvgRegularScore)
        : Number(item.regularScore);
      sheet1Rows.push([
        Number(item.seatNo),
        item.name || `${item.seatNo}號`,
        item.gender === 'F' ? '女' : '男',
        Number(item.regularScore),
        item.tier || this.computeGradeTier(item.regularScore).tier,
        Number(item.overallRank || 0),
        Number(item.netDelta || 0),
        Number(item.positivePts || 0),
        Number(item.negativePts || 0),
        Number(item.eventCount || 0),
        cumNet,
        histAvg
      ]);
    });

    const sheets = [
      {
        name: '平時成績結算表',
        rows: sheet1Rows,
        titleRowIndexes: [0],
        headerRowIndex: 1,
        freezeRow: 2
      }
    ];

    // Sheet 2: 課堂點記明細
    const studentNameMap = {};
    (this.getStudents(classId) || []).forEach(s => { studentNameMap[s.seatNo] = s.name; });
    rowsBySeat.forEach(s => { if (s.name) studentNameMap[s.seatNo] = s.name; });

    const rawEvents = archiveEntry ? (archiveEntry.events || []) : this.getEvents(classId);
    const sortedEvents = [...rawEvents].sort((a, b) => {
      const da = `${a.date || ''} ${a.time || ''}`;
      const db = `${b.date || ''} ${b.time || ''}`;
      return da.localeCompare(db);
    });

    const sheet2Rows = [
      ['日期', '時間', '節次', '座號', '姓名', '項目標籤', '分數變動', '備註說明']
    ];
    sortedEvents.forEach(ev => {
      sheet2Rows.push([
        ev.date || '',
        ev.time || '',
        ev.period !== undefined && ev.period !== null ? String(ev.period) : '',
        Number(ev.seatNo) || 0,
        studentNameMap[ev.seatNo] || `${ev.seatNo}號`,
        ev.tagName || ev.tagId || '課堂表現',
        Number(ev.delta) || 0,
        ev.note || ''
      ]);
    });
    if (sortedEvents.length === 0) {
      sheet2Rows.push(['（本期尚無點記明細）', '', '', '', '', '', 0, '']);
    }

    sheets.push({
      name: '課堂點記明細',
      rows: sheet2Rows,
      headerRowIndex: 0,
      freezeRow: 1
    });

    // Sheet 3: 歷次段考比較 (if any historical archives exist)
    if (relevantArchives.length > 0) {
      const termHeaders = relevantArchives.map(a => a.termLabel);
      const headerRow = ['座號', '姓名', ...termHeaders];
      if (!isArchived) headerRow.push('本期進行中');
      headerRow.push('歷史累積淨分', '歷次段考平均');

      const sheet3Rows = [headerRow];
      const liveRankMap = isArchived ? {} : this.getClassStudentRanks(classId);

      // Union of seats from current roster + snapshot
      const seatSet = new Map();
      (this.getStudents(classId) || []).forEach(s => seatSet.set(Number(s.seatNo), s.name));
      rowsBySeat.forEach(s => { if (!seatSet.has(Number(s.seatNo))) seatSet.set(Number(s.seatNo), s.name); });

      Array.from(seatSet.keys()).sort((a, b) => a - b).forEach(seatNo => {
        const row = [seatNo, seatSet.get(seatNo) || `${seatNo}號`];
        let cumNet = 0;
        let scoreSum = 0;
        let count = 0;

        relevantArchives.forEach(arch => {
          const found = (arch.students || []).find(st => Number(st.seatNo) === seatNo);
          if (found) {
            row.push(Number(found.regularScore));
            cumNet += Number(found.netDelta || 0);
            scoreSum += Number(found.regularScore || 0);
            count++;
          } else {
            row.push('');
          }
        });

        if (!isArchived) {
          const live = liveRankMap[seatNo];
          const liveScore = live ? Number(live.regularScore) : cfg.baseScore;
          const liveNet = live ? Number(live.netDelta) : 0;
          row.push(liveScore);
          cumNet += liveNet;
          scoreSum += liveScore;
          count++;
        }

        const avg = count > 0 ? Math.round((scoreSum / count) * 10) / 10 : cfg.baseScore;
        row.push(cumNet, avg);
        sheet3Rows.push(row);
      });

      sheets.push({
        name: '歷次段考比較',
        rows: sheet3Rows,
        headerRowIndex: 0,
        freezeRow: 1
      });
    }

    const safeClass = String(qualifiedClassName || cls.name || classId || '班級').replace(/[\\\/:\*\?"<>\|]/g, '_');
    const safeTerm = String(archiveEntry ? archiveEntry.termLabel : `${this.getDefaultTermLabel(classId)}_預覽`).replace(/[\\\/:\*\?"<>\|]/g, '_');
    const yyyymmdd = dateStamp.replace(/-/g, '');
    const filename = `${safeClass}_${safeTerm}_平時成績_${yyyymmdd}.xlsx`;

    return { filename, sheets };
  }

  exportClassTermWorkbook(classId, archiveEntry = null, triggerDownload = true) {
    const built = this.buildClassTermWorkbookSheets(classId, archiveEntry);
    if (triggerDownload && window.XlsxBuilder?.downloadWorkbook) {
      window.XlsxBuilder.downloadWorkbook(built.filename, built.sheets);
    }
    return built;
  }

  // --- Pure Classroom Behavior Ranking & Tier Engine (No quiz weighting) ---
  getClassStudentRanks(classId) {
    try {
      if (!classId) {
        const firstId = Object.keys(this.data.classes || {})[0];
        classId = firstId || '801';
      }
      const students = this.getStudents(classId) || [];
      if (students.length === 0) return {};

      const cfg = this.getRegularGradeConfig();
      const classEvents = this.getEvents(classId) || [];
      const historyMap = this._buildHistoryMapBySeat(classId);
      const total = students.length;

      const scored = students.map(s => {
        const events = classEvents.filter(e => e.seatNo === s.seatNo);
        const netDelta = events.reduce((sum, e) => sum + (Number(e.delta) || 0), 0);
        const positivePts = events.reduce((sum, e) => sum + Math.max(0, Number(e.delta) || 0), 0);
        const negativePts = events.reduce((sum, e) => sum + Math.min(0, Number(e.delta) || 0), 0);

        const rawScore = cfg.baseScore + (netDelta * cfg.pointsPerUnit);
        const uncappedScore = Math.round(rawScore * 10) / 10;
        const regularScore = Math.round(Math.min(cfg.maxScore, Math.max(cfg.minScore, rawScore)) * 10) / 10;
        const tierInfo = this.computeGradeTier(regularScore);

        const hist = historyMap[Number(s.seatNo)];
        const settledTermCount = hist ? hist.records.length : 0;
        const pastNetDeltaSum = hist ? hist.pastNetDeltaSum : 0;
        const totalCumulativeNetDelta = pastNetDeltaSum + netDelta;
        const pastAvgRegularScore = settledTermCount > 0 ? Math.round((hist.scoreSum / settledTermCount) * 10) / 10 : null;
        const allTermsAvgRegularScore = settledTermCount > 0
          ? Math.round(((hist.scoreSum + regularScore) / (settledTermCount + 1)) * 10) / 10
          : regularScore;

        const gender = s.gender || (s.seatNo <= Math.ceil(total / 2) ? 'M' : 'F');

        return {
          seatNo: s.seatNo,
          name: s.name,
          gender,
          regularScore,
          uncappedScore,
          netDelta,
          positivePts,
          negativePts,
          eventCount: events.length,
          tier: tierInfo.tier,
          oaaSubGrade: tierInfo.oaaSubGrade,
          tierLabel: tierInfo.label,
          settledTermCount,
          pastNetDeltaSum,
          totalCumulativeNetDelta,
          pastAvgRegularScore,
          allTermsAvgRegularScore,
          // Backward-compatible aliases without quiz hardcoding
          composite: regularScore,
          academicScore: regularScore,
          characterPoints: netDelta
        };
      });

      // Rank purely by classroom performance: regularScore desc -> uncappedScore desc -> positivePts desc -> seatNo asc
      scored.sort((a, b) => {
        if (b.regularScore !== a.regularScore) return b.regularScore - a.regularScore;
        if (b.uncappedScore !== a.uncappedScore) return b.uncappedScore - a.uncappedScore;
        if (b.positivePts !== a.positivePts) return b.positivePts - a.positivePts;
        return a.seatNo - b.seatNo;
      });

      let maleCount = 0;
      let femaleCount = 0;
      const rankMap = {};

      scored.forEach((item, idx) => {
        const overallRank = idx + 1;
        let genderRank = 1;
        if (item.gender === 'F') {
          femaleCount++;
          genderRank = femaleCount;
        } else {
          maleCount++;
          genderRank = maleCount;
        }

        rankMap[item.seatNo] = {
          ...item,
          overallRank,
          genderRank
        };
      });

      return rankMap;
    } catch (err) {
      console.error('Error calculating student ranks:', err);
      return {};
    }
  }

  getClassLeaderboard(classId) {
    const rankMap = this.getClassStudentRanks(classId);
    return Object.values(rankMap).sort((a, b) => a.overallRank - b.overallRank);
  }

  getStudentEvents(classId, seatNo) {
    if (!classId) return [];
    return (this.data.events || []).filter(e => e.classId === classId && e.seatNo === parseInt(seatNo, 10));
  }

  getStudentRankInClass(classId, seatNo) {
    const ranks = this.getClassStudentRanks(classId);
    const base = this.getRegularGradeConfig().baseScore;
    const tierInfo = this.computeGradeTier(base);
    return ranks[seatNo] || {
      seatNo: parseInt(seatNo, 10),
      name: '',
      gender: 'M',
      overallRank: 1,
      genderRank: 1,
      regularScore: base,
      uncappedScore: base,
      netDelta: 0,
      positivePts: 0,
      negativePts: 0,
      eventCount: 0,
      tier: tierInfo.tier,
      oaaSubGrade: tierInfo.oaaSubGrade,
      tierLabel: tierInfo.label,
      settledTermCount: 0,
      pastNetDeltaSum: 0,
      totalCumulativeNetDelta: 0,
      pastAvgRegularScore: null,
      allTermsAvgRegularScore: base,
      composite: base,
      academicScore: base,
      characterPoints: 0
    };
  }
}

/**
 * Shared high-contrast Midnight-Navy × Imperial-Gold "100" Score Crest SVG.
 * Designed so the grade icon pops clearly on white, pastel pink (Kitty), and crimson (OAA) backgrounds.
 */
window.cqGradeCrestSvg = function(sizeClass = 'w-4 h-4') {
  return `<svg class="cq-grade-crest ${sizeClass} inline-block shrink-0" viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="#0f172a" stroke="#fbbf24" stroke-width="1.8"/><rect x="5" y="4.4" width="14" height="2" rx="1" fill="#34d399"/><text x="12" y="15.8" text-anchor="middle" fill="#fde047" font-family="ui-monospace, SFMono-Regular, Arial, sans-serif" font-weight="900" font-size="9.5" letter-spacing="-0.5">100</text><rect x="5.5" y="18" width="13" height="1.6" rx="0.8" fill="#fbbf24"/></svg>`;
};

// Global Store Instance
window.appStore = new Store();

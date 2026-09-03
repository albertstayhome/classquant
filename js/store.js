/**
 * Data Store & State Management (Enhanced with Tag Management & NAS Sync)
 */

const STORAGE_KEY = 'class_point_quant_hub_data_v1';

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
    this.data = this.loadFromStorage();
    if (!this.data || !this.data.classes || Object.keys(this.data.classes).length === 0) {
      this.initDemoData();
    } else {
      // Ensure settings & tags format compatibility
      if (!this.data.tags) this.data.tags = DEFAULT_TAGS;
      if (!this.data.settings) this.data.settings = {};
      if (!this.data.settings.theme) this.data.settings.theme = 'kitty';
      if (!this.data.settings.nasSettings) {
        this.data.settings.nasSettings = {
          serverUrl: 'http://192.168.1.100:5005',
          username: '',
          password: '',
          remotePath: '/ClassData/class_data_sync.json',
          lastSyncTime: null
        };
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

      // Auto Snapshot (at most once every 3 hours on startup)
      const lastSnap = localStorage.getItem('classquant_last_auto_snapshot_ts');
      const now = Date.now();
      if (!lastSnap || (now - parseInt(lastSnap, 10)) > 3 * 3600 * 1000) {
        this.createSnapshot('啟動時日常備份');
        localStorage.setItem('classquant_last_auto_snapshot_ts', String(now));
      }
    }
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Failed to load from storage:', e);
      return null;
    }
  }

  saveToStorage() {
    try {
      this.data.lastModified = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
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
          gender: seat % 2 === 1 ? 'M' : 'F',
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
      tags: DEFAULT_TAGS,
      timetablePeriods: DEFAULT_TIMETABLE_PERIODS,
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
      currentClassOverride: null,
      settings: {
        theme: 'kitty', // 'kitty' or 'dark'
        autoSwitchTimetable: true,
        enableSound: true,
        cliffDropSigmaThreshold: 1.8,
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
    if (!layout || !layout.seatOrder || layout.seatOrder.length === 0) {
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

  getClass(classId) {
    return this.data.classes[classId] || null;
  }

  getStudents(classId) {
    return this.data.students[classId] || [];
  }

  getStudent(classId, seatNo) {
    const list = this.getStudents(classId);
    return list.find(s => s.seatNo === parseInt(seatNo, 10)) || null;
  }

  getEvents(classId = null) {
    if (!classId) return this.data.events;
    return this.data.events.filter(e => e.classId === classId);
  }

  getAssessments(classId) {
    return this.data.assessments[classId] || [];
  }

  addEvent(event) {
    const newEvent = {
      id: 'evt_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      date: event.date || new Date().toISOString().split('T')[0],
      time: event.time || new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      ...event
    };
    this.data.events.unshift(newEvent);
    this.saveToStorage();
    return newEvent;
  }

  deleteEvent(eventId) {
    this.data.events = this.data.events.filter(e => e.id !== eventId);
    this.saveToStorage();
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
  createSnapshot(reason = '自動快照') {
    try {
      const raw = localStorage.getItem('class_point_quant_hub_snapshots_v1');
      const snapshots = raw ? JSON.parse(raw) : [];
      snapshots.unshift({
        timestamp: Date.now(),
        timeStr: new Date().toLocaleString('zh-TW', { hour12: false }),
        reason,
        data: JSON.parse(JSON.stringify(this.data))
      });
      // Maintain latest 5 snapshots to avoid localStorage bloat
      if (snapshots.length > 5) snapshots.length = 5;
      localStorage.setItem('class_point_quant_hub_snapshots_v1', JSON.stringify(snapshots));
      return true;
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
      this.saveToStorage();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  resetToDemo() {
    this.createSnapshot('重置展示資料前');
    localStorage.removeItem(STORAGE_KEY);
    this.initDemoData();
  }

  clearAll() {
    this.createSnapshot('清空所有資料前');
    this.data = {
      classes: {},
      students: {},
      assessments: {},
      events: [],
      tags: DEFAULT_TAGS,
      timetablePeriods: DEFAULT_TIMETABLE_PERIODS,
      weeklySchedule: {},
      currentClassOverride: null,
      settings: {
        theme: 'kitty',
        autoSwitchTimetable: true,
        enableSound: true,
        cliffDropSigmaThreshold: 1.8,
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
}

// Global Store Instance
window.appStore = new Store();

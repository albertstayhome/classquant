/**
 * Timetable Engine & Class Auto-Switching System
 * Handles real-time schedule detection, manual overrides, and schedule management.
 */

class TimetableEngine {
  constructor(store) {
    this.store = store;
    this.simulatedTime = null; // null for real time, or { day: 1-5, timeStr: '10:30' }
    this.listeners = [];
    this.startClock();
  }

  onClassChange(callback) {
    this.listeners.push(callback);
  }

  notifyClassChange(classId, context) {
    this.listeners.forEach(cb => cb(classId, context));
  }

  getCurrentTimeInfo() {
    let now = new Date();
    let day = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    let hours = String(now.getHours()).padStart(2, '0');
    let minutes = String(now.getMinutes()).padStart(2, '0');
    let timeStr = `${hours}:${minutes}`;

    if (this.simulatedTime) {
      day = this.simulatedTime.day;
      timeStr = this.simulatedTime.timeStr;
    }

    return { day, timeStr, isSimulated: !!this.simulatedTime };
  }

  // Parse HH:MM to total minutes from midnight
  timeToMinutes(timeStr) {
    if (typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;
    const parts = timeStr.split(':');
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    return h * 60 + m;
  }

  detectActiveSlot() {
    const { day, timeStr } = this.getCurrentTimeInfo();
    const rawPeriods = this.store.data?.timetablePeriods;
    const periods = Array.isArray(rawPeriods) ? rawPeriods : [];
    const weeklySchedule = (this.store.data?.weeklySchedule && typeof this.store.data.weeklySchedule === 'object')
      ? this.store.data.weeklySchedule
      : {};
    const classes = this.store.getClasses() || {};
    const currentMins = this.timeToMinutes(timeStr);

    // If Weekend (0 = Sun, 6 = Sat)
    if (day === 0 || day === 6) {
      return {
        status: 'weekend',
        period: null,
        classId: null,
        message: '週末非授課時段',
        nextSlot: null
      };
    }

    const daySchedule = (weeklySchedule[day] && typeof weeklySchedule[day] === 'object') ? weeklySchedule[day] : {};

    // Check if within any period
    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      if (!p || typeof p.start !== 'string' || typeof p.end !== 'string') continue;
      const startMins = this.timeToMinutes(p.start);
      const endMins = this.timeToMinutes(p.end);

      if (currentMins >= startMins && currentMins <= endMins) {
        const rawClassId = daySchedule[p.period] || null;
        const classId = (rawClassId && classes[rawClassId]) ? rawClassId : null;
        const remaining = endMins - currentMins;
        return {
          status: 'in_session',
          period: p.period,
          periodName: p.name || `第 ${p.period} 節`,
          classId: classId,
          start: p.start,
          end: p.end,
          remainingMinutes: remaining,
          message: `正在進行：${p.name || ''} (剩餘 ${remaining} 分鐘)`
        };
      }
    }

    // Check if in break between periods
    for (let i = 0; i < periods.length - 1; i++) {
      const curP = periods[i];
      const nextP = periods[i + 1];
      if (!curP || !nextP || typeof curP.end !== 'string' || typeof nextP.start !== 'string') continue;
      const currentEnd = this.timeToMinutes(curP.end);
      const nextStart = this.timeToMinutes(nextP.start);

      if (currentMins > currentEnd && currentMins < nextStart) {
        const nextRawId = daySchedule[nextP.period] || null;
        const nextClassId = (nextRawId && classes[nextRawId]) ? nextRawId : null;
        const prevRawId = daySchedule[curP.period] || null;
        const prevClassId = (prevRawId && classes[prevRawId]) ? prevRawId : null;
        const remainingToNext = nextStart - currentMins;

        return {
          status: 'in_break',
          period: curP.period,
          periodName: `課間休息 (上節: ${curP.name || ''})`,
          classId: prevClassId, // retain previous class for late logging
          nextClassId: nextClassId,
          nextPeriodName: nextP.name || '',
          remainingMinutes: remainingToNext,
          message: `課間休息中 • 下節：${nextP.name || ''} (${nextClassId ? nextClassId + '班' : '無課'}) 還有 ${remainingToNext} 分鐘`
        };
      }
    }

    // Outside school hours
    return {
      status: 'off_hours',
      period: null,
      classId: null,
      message: '非課堂時段 (備課/自習)',
      nextSlot: null
    };
  }

  getActiveClassId() {
    const classes = this.store.getClasses() || {};

    // 1. Check if user manually forced an override (verify class still exists!)
    const override = this.store.data?.currentClassOverride;
    if (override && classes[override]) {
      return {
        classId: override,
        isOverride: true,
        slotInfo: this.detectActiveSlot()
      };
    }

    // 2. Check auto detected slot
    const slotInfo = this.detectActiveSlot();
    if (slotInfo.classId && classes[slotInfo.classId]) {
      return {
        classId: slotInfo.classId,
        isOverride: false,
        slotInfo: slotInfo
      };
    }

    // 3. Default fallback: first available class (e.g. homeroom)
    const allClasses = Object.keys(classes);
    const homeroom = Object.values(classes).find(c => c && c.type === 'homeroom');
    const fallbackId = homeroom ? homeroom.id : (allClasses[0] || null);

    return {
      classId: fallbackId,
      isOverride: false,
      slotInfo: slotInfo
    };
  }

  setManualOverride(classId) {
    this.store.setManualClassOverride(classId);
    this.notifyClassChange(classId, { isOverride: true });
  }

  clearManualOverride() {
    this.store.clearManualClassOverride();
    const active = this.getActiveClassId();
    this.notifyClassChange(active.classId, { isOverride: false });
  }

  setSimulationTime(day, timeStr) {
    this.simulatedTime = { day, timeStr };
    const active = this.getActiveClassId();
    this.notifyClassChange(active.classId, { isSimulation: true });
  }

  clearSimulation() {
    this.simulatedTime = null;
    const active = this.getActiveClassId();
    this.notifyClassChange(active.classId, { isSimulation: false });
  }

  startClock() {
    // Check every 30 seconds
    setInterval(() => {
      if (this.store.data?.settings?.autoSwitchTimetable !== false && !this.store.data?.currentClassOverride) {
        const active = this.getActiveClassId();
        this.notifyClassChange(active.classId, { isPeriodicCheck: true });
      }
    }, 30000);
  }
}

// Global Timetable Instance
window.timetableEngine = new TimetableEngine(window.appStore);

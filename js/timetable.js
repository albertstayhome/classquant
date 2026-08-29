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
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  detectActiveSlot() {
    const { day, timeStr } = this.getCurrentTimeInfo();
    const periods = this.store.data.timetablePeriods;
    const weeklySchedule = this.store.data.weeklySchedule;
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

    const daySchedule = weeklySchedule[day] || {};

    // Check if within any period
    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      const startMins = this.timeToMinutes(p.start);
      const endMins = this.timeToMinutes(p.end);

      if (currentMins >= startMins && currentMins <= endMins) {
        const classId = daySchedule[p.period] || null;
        const remaining = endMins - currentMins;
        return {
          status: 'in_session',
          period: p.period,
          periodName: p.name,
          classId: classId,
          start: p.start,
          end: p.end,
          remainingMinutes: remaining,
          message: `正在進行：${p.name} (剩餘 ${remaining} 分鐘)`
        };
      }
    }

    // Check if in break between periods
    for (let i = 0; i < periods.length - 1; i++) {
      const currentEnd = this.timeToMinutes(periods[i].end);
      const nextStart = this.timeToMinutes(periods[i + 1].start);

      if (currentMins > currentEnd && currentMins < nextStart) {
        const nextPeriod = periods[i + 1];
        const nextClassId = daySchedule[nextPeriod.period] || null;
        const prevPeriod = periods[i];
        const prevClassId = daySchedule[prevPeriod.period] || null;
        const remainingToNext = nextStart - currentMins;

        return {
          status: 'in_break',
          period: prevPeriod.period,
          periodName: `課間休息 (上節: ${prevPeriod.name})`,
          classId: prevClassId, // retain previous class for late logging
          nextClassId: nextClassId,
          nextPeriodName: nextPeriod.name,
          remainingMinutes: remainingToNext,
          message: `課間休息中 • 下節：${nextPeriod.name} (${nextClassId ? nextClassId + '班' : '無課'}) 還有 ${remainingToNext} 分鐘`
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
    // 1. Check if user manually forced an override
    if (this.store.data.currentClassOverride) {
      return {
        classId: this.store.data.currentClassOverride,
        isOverride: true,
        slotInfo: this.detectActiveSlot()
      };
    }

    // 2. Check auto detected slot
    const slotInfo = this.detectActiveSlot();
    if (slotInfo.classId) {
      return {
        classId: slotInfo.classId,
        isOverride: false,
        slotInfo: slotInfo
      };
    }

    // 3. Default fallback: first available class (e.g. homeroom)
    const allClasses = Object.keys(this.store.data.classes);
    const homeroom = Object.values(this.store.data.classes).find(c => c.type === 'homeroom');
    const fallbackId = homeroom ? homeroom.id : allClasses[0] || null;

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
      if (this.store.data.settings.autoSwitchTimetable && !this.store.data.currentClassOverride) {
        const active = this.getActiveClassId();
        this.notifyClassChange(active.classId, { isPeriodicCheck: true });
      }
    }, 30000);
  }
}

// Global Timetable Instance
window.timetableEngine = new TimetableEngine(window.appStore);

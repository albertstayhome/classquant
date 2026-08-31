/**
 * Timetable & Schedule Management View
 * Weekly grid editor, period times adjuster, and real-time schedule simulator.
 */

class TimetableEditorView {
  constructor(store, timetable) {
    this.store = store;
    this.timetable = timetable;
  }

  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const periods = this.store.data.timetablePeriods;
    const weeklySchedule = this.store.data.weeklySchedule;
    const classes = this.store.getClasses();
    const activeSlot = this.timetable.detectActiveSlot();
    const { day: curDay, timeStr: curTime, isSimulated } = this.timetable.getCurrentTimeInfo();

    const days = [
      { id: 1, name: '週一' },
      { id: 2, name: '週二' },
      { id: 3, name: '週三' },
      { id: 4, name: '週四' },
      { id: 5, name: '週五' }
    ];

    container.innerHTML = `
      <!-- Top Bar & Simulation Testing -->
      <div class="rounded-3xl p-5 mb-5 border border-pink-200 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 class="text-lg font-black text-slate-900 flex items-center gap-2">
              <i data-lucide="calendar" class="w-5 h-5 text-sky-600"></i>
              教師個人每週授課課表管理
            </h2>
            <p class="text-xs text-slate-500 font-medium">系統將依據此課表在真實授課時段自動為您載入對應班級與模式</p>
          </div>

          <!-- Current Schedule Status Chip -->
          <div class="flex items-center gap-3">
            <div class="px-3.5 py-1.5 rounded-2xl bg-pink-50 border border-pink-200 text-xs flex items-center gap-2 shadow-inner">
              <span class="w-2.5 h-2.5 rounded-full ${activeSlot.status === 'in_session' ? 'bg-emerald-500 live-indicator' : 'bg-amber-400'}"></span>
              <span class="text-slate-800 font-bold">${activeSlot.message}</span>
            </div>
          </div>
        </div>

        <!-- Timetable Time Simulation Bar -->
        <div class="p-3.5 rounded-2xl bg-pink-50/50 border border-pink-200 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center space-x-2 text-xs text-slate-700">
            <i data-lucide="sliders" class="w-4 h-4 text-pink-600"></i>
            <span class="font-black">時間感知模擬器 (快速測試自動切換)：</span>
          </div>

          <div class="flex items-center space-x-2 flex-wrap gap-1">
            <select id="sim-day-select" class="bg-white border border-pink-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none shadow-sm">
              <option value="1" ${curDay === 1 ? 'selected' : ''}>週一</option>
              <option value="2" ${curDay === 2 ? 'selected' : ''}>週二</option>
              <option value="3" ${curDay === 3 ? 'selected' : ''}>週三</option>
              <option value="4" ${curDay === 4 ? 'selected' : ''}>週四</option>
              <option value="5" ${curDay === 5 ? 'selected' : ''}>週五</option>
            </select>

            <input type="time" id="sim-time-input" value="${curTime}" class="bg-white border border-pink-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none shadow-sm">

            <button onclick="timetableEditorView.applySimulation()" class="px-3 py-1 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl text-xs font-black shadow transition active:scale-95">
              設定模擬時間
            </button>

            ${isSimulated ? `
              <button onclick="timetableEditorView.clearSimulation()" class="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95">
                恢復真實時間
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Weekly Schedule Grid -->
      <div class="rounded-3xl p-5 border border-pink-200 bg-white shadow-sm overflow-x-auto mb-6">
        <table class="w-full text-center text-xs text-slate-800 border-collapse">
          <thead>
            <tr class="bg-pink-100/70 text-pink-900 text-xs border-b border-pink-200">
              <th class="py-3 px-3 w-32 text-left font-black rounded-tl-2xl">節次 / 時間</th>
              ${days.map(d => `
                <th class="py-3 px-3 font-black text-slate-800 ${curDay === d.id ? 'bg-pink-200 text-pink-900' : ''}">
                  ${d.name} ${curDay === d.id ? '(今日)' : ''}
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody class="divide-y divide-pink-100">
            ${periods.map(p => {
              const isSpecial = p.period === 'lunch' || p.period === 'clean';
              const isCurrentPeriod = activeSlot.period === p.period;

              return `
                <tr class="${isSpecial ? 'bg-slate-50 text-slate-500' : 'hover:bg-pink-50/40'} ${isCurrentPeriod ? 'bg-amber-50' : ''}">
                  <!-- Period Header -->
                  <td class="py-3 px-3 text-left font-mono">
                    <div class="font-black text-slate-900">${p.name}</div>
                    <div class="text-[10px] text-slate-500">${p.start} - ${p.end}</div>
                  </td>

                  <!-- Monday to Friday Slots -->
                  ${days.map(d => {
                    const assignedClassId = weeklySchedule[d.id]?.[p.period] || '';
                    const cls = classes[assignedClassId];

                    if (isSpecial) {
                      return `<td class="py-2 px-2 text-[11px] text-slate-400 font-bold">${p.name}</td>`;
                    }

                    return `
                      <td class="py-2 px-2">
                        <select onchange="timetableEditorView.updateSlot(${d.id}, '${p.period}', this.value)"
                          class="w-full py-1.5 px-2 rounded-xl text-xs font-black text-center border transition focus:outline-none ${assignedClassId ? (cls && cls.type === 'homeroom' ? 'bg-pink-100 text-pink-900 border-pink-300 shadow-sm' : 'bg-sky-100 text-sky-900 border-sky-300 shadow-sm') : 'bg-slate-50 text-slate-400 border-dashed border-slate-300 hover:border-pink-300'}">
                          <option value="">-- 空堂/備課 --</option>
                          ${Object.values(classes).map(c => `
                            <option value="${c.id}" ${assignedClassId === c.id ? 'selected' : ''}>
                              ${c.name} (${c.type === 'homeroom' ? '導師' : '數學'})
                            </option>
                          `).join('')}
                        </select>
                      </td>
                    `;
                  }).join('')}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  updateSlot(day, period, classId) {
    const weeklySchedule = { ...this.store.data.weeklySchedule };
    if (!weeklySchedule[day]) weeklySchedule[day] = {};

    if (classId) {
      weeklySchedule[day][period] = classId;
    } else {
      delete weeklySchedule[day][period];
    }

    this.store.updateWeeklySchedule(weeklySchedule);
    window.appState.showToast(`已更新週課表設定`, 'success');
    this.render('timetable-editor-view');
  }

  applySimulation() {
    const day = parseInt(document.getElementById('sim-day-select').value, 10);
    const timeStr = document.getElementById('sim-time-input').value;
    this.timetable.setSimulationTime(day, timeStr);
    window.appState.showToast(`已設定模擬時間：週${['', '一', '二', '三', '四', '五'][day]} ${timeStr}`, 'info');
    this.render('timetable-editor-view');
    window.appState.updateHeaderStatus();
  }

  clearSimulation() {
    this.timetable.clearSimulation();
    window.appState.showToast('已恢復真實系統時間感知', 'info');
    this.render('timetable-editor-view');
    window.appState.updateHeaderStatus();
  }
}

// Global Timetable Editor Instance
window.timetableEditorView = new TimetableEditorView(window.appStore, window.timetableEngine);

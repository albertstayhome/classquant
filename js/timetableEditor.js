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
    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';

    const days = [
      { id: 1, name: '週一' },
      { id: 2, name: '週二' },
      { id: 3, name: '週三' },
      { id: 4, name: '週四' },
      { id: 5, name: '週五' }
    ];

    container.innerHTML = `
      <!-- Top Bar & Simulation Testing -->
      <div class="glass-card rounded-3xl p-5 mb-5 border ${isOAA ? 'border-amber-500/40 bg-[#240e1b] text-white' : 'border-pink-200 bg-white text-slate-800'} shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 class="text-lg sm:text-xl font-black ${isOAA ? 'text-white' : 'text-slate-900'} flex items-center gap-2">
              <i data-lucide="calendar" class="w-5 h-5 ${isOAA ? 'text-amber-400' : 'text-sky-600'}"></i>
              教師個人每週授課課表管理
            </h2>
            <p class="text-xs ${isOAA ? 'text-amber-200/80' : 'text-slate-600'} font-medium">系統將依據此課表在真實授課時段自動為您載入對應班級與模式</p>
          </div>

          <!-- Current Schedule Status Chip -->
          <div class="flex items-center gap-3">
            <div class="px-3.5 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${isOAA ? 'bg-[#160610] border-amber-500/40 text-amber-100' : 'bg-pink-50 border-pink-200 text-slate-800'}">
              <span class="w-2.5 h-2.5 rounded-full ${activeSlot.status === 'in_session' ? 'bg-emerald-500 live-indicator' : 'bg-amber-400'}"></span>
              <span class="font-bold">${activeSlot.message}</span>
            </div>
          </div>
        </div>

        <!-- Timetable Time Simulation Bar (Great for testing!) -->
        <div class="p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${isOAA ? 'bg-[#170710] border-amber-500/30' : 'bg-pink-50/70 border-pink-200'}">
          <div class="flex items-center space-x-2 text-xs ${isOAA ? 'text-amber-200' : 'text-slate-700'}">
            <i data-lucide="sliders" class="w-4 h-4 ${isOAA ? 'text-amber-400' : 'text-amber-600'}"></i>
            <span class="font-black">時間感知模擬器 (快速測試自動切換)：</span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <select id="sim-day-select" class="border rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none ${isOAA ? 'bg-[#0f040a] border-amber-500/40 text-amber-100' : 'bg-white border-pink-300 text-slate-800'}">
              <option value="1" ${curDay === 1 ? 'selected' : ''}>週一</option>
              <option value="2" ${curDay === 2 ? 'selected' : ''}>週二</option>
              <option value="3" ${curDay === 3 ? 'selected' : ''}>週三</option>
              <option value="4" ${curDay === 4 ? 'selected' : ''}>週四</option>
              <option value="5" ${curDay === 5 ? 'selected' : ''}>週五</option>
            </select>

            <input type="time" id="sim-time-input" value="${curTime}" class="border rounded-xl px-2.5 py-1 text-xs font-bold focus:outline-none ${isOAA ? 'bg-[#0f040a] border-amber-500/40 text-amber-100' : 'bg-white border-pink-300 text-slate-800'}">

            <button onclick="timetableEditorView.applySimulation()" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-sm">
              設定模擬時間
            </button>

            ${isSimulated ? `
              <button onclick="timetableEditorView.clearSimulation()" class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${isOAA ? 'bg-rose-950 text-amber-200 border border-amber-500/40 hover:bg-rose-900' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'}">
                恢復真實時間
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Weekly Schedule Grid -->
      <div class="glass-card rounded-3xl p-4 sm:p-5 border ${isOAA ? 'border-amber-500/40 bg-[#240e1b]' : 'border-pink-200 bg-white'} overflow-x-auto mb-6 shadow-sm">
        <table class="w-full min-w-[760px] text-center text-xs ${isOAA ? 'text-slate-200' : 'text-slate-800'} border-collapse">
          <thead>
            <tr class="${isOAA ? 'bg-[#160610] text-amber-300 border-b border-amber-500/40' : 'bg-pink-50 text-slate-700 border-b border-pink-200'} text-xs">
              <th class="py-3 px-2.5 sm:px-3 min-w-[116px] whitespace-nowrap text-left font-black sticky left-0 z-20 ${isOAA ? 'bg-[#160610]' : 'bg-pink-50'}">節次 / 時間</th>
              ${days.map(d => `
                <th class="py-3 px-3 font-black min-w-[122px] whitespace-nowrap ${curDay === d.id ? (isOAA ? 'bg-amber-600/20 text-amber-300' : 'bg-pink-100 text-pink-800') : ''}">
                  ${d.name} ${curDay === d.id ? '(今日)' : ''}
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody class="divide-y ${isOAA ? 'divide-amber-500/20' : 'divide-pink-100'}">
            ${periods.map(p => {
              const isSpecial = p.period === 'lunch' || p.period === 'clean';
              const isCurrentPeriod = activeSlot.period === p.period;

              return `
                <tr class="${isSpecial ? (isOAA ? 'bg-[#14050d] text-amber-200/50' : 'bg-slate-50 text-slate-500') : (isOAA ? 'hover:bg-rose-950/30' : 'hover:bg-pink-50/40')} ${isCurrentPeriod ? 'timetable-current-slot' : ''}">
                  <!-- Period Header -->
                  <td class="py-3 px-2.5 sm:px-3 min-w-[116px] whitespace-nowrap text-left font-mono sticky left-0 z-10 ${isSpecial ? (isOAA ? 'bg-[#14050d]' : 'bg-slate-50') : (isOAA ? 'bg-[#240e1b]' : 'bg-white')} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                    <div class="font-black ${isOAA ? 'text-white' : 'text-slate-900'}">${p.name}</div>
                    <div class="text-[10px] ${isOAA ? 'text-amber-200/60' : 'text-slate-500'}">${p.start} - ${p.end}</div>
                  </td>

                  <!-- Monday to Friday Slots -->
                  ${days.map(d => {
                    const assignedClassId = weeklySchedule[d.id]?.[p.period] || '';
                    const cls = classes[assignedClassId];

                    if (isSpecial) {
                      return `<td class="py-2 px-2 text-[11px] ${isOAA ? 'text-amber-200/50' : 'text-slate-400'} font-bold">${p.name}</td>`;
                    }

                    const slotStyle = assignedClassId
                      ? (cls && cls.type === 'homeroom'
                          ? (isOAA ? 'bg-purple-950/60 text-purple-200 border-purple-500/50' : 'bg-pink-50 text-pink-900 border-pink-300 hover:bg-pink-100')
                          : (isOAA ? 'bg-sky-950/60 text-sky-200 border-sky-500/50' : 'bg-sky-50 text-sky-900 border-sky-300 hover:bg-sky-100'))
                      : (isOAA ? 'bg-[#12050c] text-slate-400 border-dashed border-amber-500/25' : 'bg-slate-50 text-slate-500 border-dashed border-slate-300 hover:border-pink-300');

                    return `
                      <td class="py-2 px-2">
                        <select onchange="timetableEditorView.updateSlot(${d.id}, '${p.period}', this.value)"
                          class="w-full min-h-[38px] py-1.5 px-2 rounded-xl text-xs font-bold text-center border transition focus:outline-none cursor-pointer ${slotStyle}">
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

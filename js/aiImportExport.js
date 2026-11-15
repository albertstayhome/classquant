/**
 * Cloud Backup, System Settings & Data Transfer Hub (v2.0.0)
 * Manages Google Forms/Sheets scheduled & manual cloud backup, appearance/sound settings,
 * local safety snapshots, JSON full-system restore, Excel/CSV export, and CSV event import.
 * Supports both Sanrio Kitty Pastel and OAA Dark Luxury themes.
 */

class AIImportExportHub {
  constructor(store) {
    this.store = store;
  }

  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const classes = Object.values(this.store.getClasses() || {});
    const currentClassId = window.appState?.currentClassId || (classes[0] ? classes[0].id : '801');
    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';
    const fontSize = (window.appStore && window.appStore.getFontSize()) || 'large';
    const fontLabelMap = { standard: '標準 100%', large: '舒適 108%', xlarge: '超大 116%' };
    const soundEnabled = window.appState ? window.appState.isSoundEnabled() : true;
    const autoSwitch = this.store.data?.settings?.autoSwitchTimetable !== false;

    const cardCls = isOAA
      ? 'glass-card rounded-3xl p-5 sm:p-6 border border-amber-500/40 bg-[#240e1b] text-white shadow-sm'
      : 'glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 bg-white shadow-sm';

    container.innerHTML = `
      <!-- Top Title & Quick Exports -->
      <div class="${cardCls} mb-5">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div class="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 flex-1">
            ${isOAA
              ? '<span class="text-2xl sm:text-3xl p-2 rounded-2xl bg-black/40 border border-amber-500/50 shrink-0 self-start sm:self-auto">⚙️</span>'
              : '<div class="sanrio-twinstars-badge !w-10 !h-10 sm:!w-12 sm:!h-12 shrink-0 self-start sm:self-auto"></div>'}
            <div class="min-w-0 flex-1">
              <h2 class="text-lg sm:text-2xl font-black ${isOAA ? 'text-white' : 'text-slate-900'} flex flex-wrap items-center gap-2">
                <span>雲端自動備份與系統設定中心</span>
                ${isOAA ? '' : '<span class="kitty-bow shrink-0"></span>'}
              </h2>
              <p class="text-xs sm:text-sm ${isOAA ? 'text-amber-200/80' : 'text-slate-600'} font-medium mt-0.5">
                管理 Google 表單／試算表每日自動備份、系統外觀音效、本機還原快照與全系統資料匯出匯入
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button onclick="aiHub.downloadBackupJson()" class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer">
              <i data-lucide="download" class="w-4 h-4"></i> 下載全系統備份 (JSON)
            </button>
            <button onclick="window.dashboardCharts ? dashboardCharts.exportPreviewExcel('${currentClassId}') : aiHub.exportClassStatsCsv()" class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer">
              <i data-lucide="file-spreadsheet" class="w-4 h-4"></i> 匯出本班成績 (Excel)
            </button>
            <button onclick="aiHub.exportClassStatsCsv()" class="px-3 py-2 rounded-xl ${isOAA ? 'bg-[#170710] hover:bg-rose-950 text-amber-200 border border-amber-500/40' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'} text-xs font-bold flex items-center gap-1.5 transition cursor-pointer">
              <i data-lucide="file-text" class="w-3.5 h-3.5"></i> CSV 報表
            </button>
          </div>
        </div>
      </div>

      <!-- ☁️ Google 表單／試算表 定期＆隨時雲端備份中心 -->
      ${this.renderGoogleBackupCard(isOAA)}

      <!-- 🎨 System Preferences (Appearance, Font Scale, Sound, Auto-Timetable) -->
      <div class="${cardCls} mb-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-black ${isOAA ? 'text-amber-300' : 'text-slate-900'} flex items-center gap-2">
            <i data-lucide="sliders" class="w-5 h-5 ${isOAA ? 'text-amber-400' : 'text-pink-600'}"></i>
            介面與課堂體驗偏好設定
          </h3>
          <span class="text-[11px] font-bold ${isOAA ? 'text-amber-200/70' : 'text-slate-500'}">設定即時寫入本機記憶，無需重新整理</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button onclick="appState.toggleTheme(); aiHub.render('ai-hub-view');" class="text-left p-3.5 rounded-2xl border transition active:scale-95 cursor-pointer ${isOAA ? 'bg-[#170710] border-amber-500/40 hover:border-amber-400' : 'bg-pink-50/70 border-pink-200 hover:bg-pink-100/70'}">
            <div class="text-[11px] font-bold ${isOAA ? 'text-amber-300/80' : 'text-slate-500'}">視覺主題風格</div>
            <div class="text-sm font-black mt-1 ${isOAA ? 'text-white' : 'text-slate-900'}">${isOAA ? '🏛️ 高度育成 OAA（點擊切換）' : '🎀 三麗鷗粉嫩（點擊切換）'}</div>
          </button>

          <button onclick="appState.cycleFontSize(); aiHub.render('ai-hub-view');" class="text-left p-3.5 rounded-2xl border transition active:scale-95 cursor-pointer ${isOAA ? 'bg-[#170710] border-amber-500/40 hover:border-amber-400' : 'bg-sky-50/70 border-sky-200 hover:bg-sky-100/70'}">
            <div class="text-[11px] font-bold ${isOAA ? 'text-amber-300/80' : 'text-slate-500'}">全系統顯示字級</div>
            <div class="text-sm font-black mt-1 ${isOAA ? 'text-white' : 'text-slate-900'}">🔍 ${fontLabelMap[fontSize] || '舒適 108%'}</div>
          </button>

          <button onclick="appState.toggleSound(); aiHub.render('ai-hub-view');" class="text-left p-3.5 rounded-2xl border transition active:scale-95 cursor-pointer ${isOAA ? 'bg-[#170710] border-amber-500/40 hover:border-amber-400' : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/70'}">
            <div class="text-[11px] font-bold ${isOAA ? 'text-amber-300/80' : 'text-slate-500'}">點記與結算音效</div>
            <div class="text-sm font-black mt-1 ${isOAA ? 'text-white' : 'text-slate-900'}">${soundEnabled ? '🔔 已開啟提示音效' : '🔕 目前靜音狀態'}</div>
          </button>

          <button onclick="aiHub.toggleAutoSwitchTimetable()" class="text-left p-3.5 rounded-2xl border transition active:scale-95 cursor-pointer ${isOAA ? 'bg-[#170710] border-amber-500/40 hover:border-amber-400' : 'bg-purple-50/70 border-purple-200 hover:bg-purple-100/70'}">
            <div class="text-[11px] font-bold ${isOAA ? 'text-amber-300/80' : 'text-slate-500'}">依課表節次自動切班</div>
            <div class="text-sm font-black mt-1 ${isOAA ? 'text-white' : 'text-slate-900'}">${autoSwitch ? '📅 自動依節次切換中' : '✋ 手動鎖定目前班級'}</div>
          </button>

          <button type="button" id="pref-skip-cover-btn" onclick="appState.cycleCoverMode(); aiHub.render('ai-hub-view');" class="text-left p-3.5 rounded-2xl border transition active:scale-95 cursor-pointer ${isOAA ? 'bg-[#170710] border-amber-500/40 hover:border-amber-400' : 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/70'}">
            <div class="text-[11px] font-bold ${isOAA ? 'text-amber-300/80' : 'text-slate-500'}">App 啟動封面模式（點擊切換）</div>
            <div class="text-sm font-black mt-1 ${isOAA ? 'text-white' : 'text-slate-900'}">${(() => {
              const mode = window.appState?.getCoverMode ? window.appState.getCoverMode() : 'gate';
              if (mode === 'skip') return '⚡ 略過動漫封面（直接進教室）';
              if (mode === 'auto') return '🎬 載入完成後自動進教室';
              return '🔐 全部載入完成 ➔ 一鍵登入';
            })()}</div>
          </button>
        </div>
      </div>

      <!-- Snapshots History / Safety Net -->
      <div class="${cardCls} mb-6">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 class="text-base font-black ${isOAA ? 'text-white' : 'text-slate-900'} flex items-center gap-2">
            <i data-lucide="shield-check" class="w-5 h-5 ${isOAA ? 'text-amber-400' : 'text-pink-600'}"></i>
            ⏱️ 本地歷史快照防呆機制（最近 5 筆自動備份）
          </h3>
          <button onclick="aiHub.createManualSnapshot()" class="px-3 py-1.5 rounded-xl ${isOAA ? 'bg-[#170710] hover:bg-rose-950 text-amber-200 border border-amber-500/40' : 'bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-300'} text-xs font-bold flex items-center gap-1 transition shadow-sm cursor-pointer">
            <i data-lucide="camera" class="w-3.5 h-3.5"></i> 立即拍攝快照
          </button>
        </div>
        <p class="text-xs ${isOAA ? 'text-amber-100/80' : 'text-slate-600'} font-medium mb-3">
          系統會在每次重大異動（段考結算、批次匯入、還原備份、刪除班級前）自動拍攝本機快照。若操作失誤，可隨時「1 秒無痛復原」：
        </p>

        <div class="space-y-2">
          ${(() => {
            const snaps = this.store.getSnapshots();
            if (snaps.length === 0) {
              return `<div class="text-xs py-3 text-center rounded-xl ${isOAA ? 'bg-black/30 text-amber-200/60' : 'bg-slate-50 text-slate-500'}">目前尚無歷史快照記錄</div>`;
            }
            return snaps.map(s => {
              const classCount = Object.keys(s.data?.classes || {}).length;
              let studentCount = 0;
              Object.values(s.data?.students || {}).forEach(arr => studentCount += (arr?.length || 0));
              const eventCount = s.data?.events?.length || 0;
              return `
                <div class="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border text-xs ${isOAA ? 'bg-[#170710] border-amber-500/30 text-amber-100' : 'bg-pink-50/50 border-pink-200 text-slate-800'}">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="w-2 h-2 rounded-full ${isOAA ? 'bg-amber-400' : 'bg-pink-500'}"></span>
                    <span class="font-mono font-bold ${isOAA ? 'text-white' : 'text-slate-700'}">${s.timeStr}</span>
                    <span class="px-2 py-0.5 rounded-full font-bold text-[11px] border ${isOAA ? 'bg-black/50 text-amber-300 border-amber-500/40' : 'bg-white text-pink-700 border-pink-200'}">${s.reason}</span>
                    <span class="text-[11px] ${isOAA ? 'text-amber-200/70' : 'text-slate-500'}">(${classCount} 班 • ${studentCount} 位學生 • ${eventCount} 筆點記)</span>
                  </div>
                  <button onclick="aiHub.restoreSnapshot(${s.timestamp})" class="px-3 py-1 rounded-lg border text-xs font-black shadow-sm transition active:scale-95 cursor-pointer ${isOAA ? 'bg-[#2a0f1e] hover:bg-amber-900/50 border-amber-500/50 text-amber-200' : 'bg-white border-pink-300 hover:bg-pink-100 text-pink-800'}">
                    ↩️ 還原此版本
                  </button>
                </div>
              `;
            }).join('');
          })()}
        </div>
      </div>

      <!-- Import Interactive Console (Backup JSON / Batch Event CSV) -->
      <div class="${cardCls} mb-6">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 class="text-base font-black ${isOAA ? 'text-white' : 'text-slate-900'} flex items-center gap-2">
            <i data-lucide="upload-cloud" class="w-5 h-5 text-emerald-500"></i>
            備份檔還原 & 課堂事件批次匯入 (JSON / CSV)
          </h3>
          <button onclick="aiHub.copyEventsCsvTemplate()" class="px-3 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer ${isOAA ? 'bg-[#170710] hover:bg-rose-950 text-sky-300 border-sky-500/40' : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200'}">
            📋 複製 CSV 事件範例格式
          </button>
        </div>
        <p class="text-xs ${isOAA ? 'text-amber-100/80' : 'text-slate-600'} font-medium mb-3">
          可貼入「全系統備份 JSON」（包含從 Google 表單回覆複製的備份文字）進行整機還原，或選取本機 <code>.json</code> / 事件 <code>.csv</code> 檔案匯入：
        </p>

        <textarea id="import-text-area" rows="5" placeholder="請在此貼上全系統備份 JSON 或課堂事件 CSV 內容..." class="w-full rounded-2xl p-3.5 text-xs font-mono focus:outline-none mb-3 font-bold border-2 ${isOAA ? 'bg-[#12050c] border-amber-500/40 text-amber-100 focus:border-amber-400' : 'bg-slate-50 border-pink-200 text-slate-900 focus:border-pink-500'}"></textarea>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center space-x-2">
            <input type="file" id="file-importer" accept=".json,.csv" onchange="aiHub.handleFileSelect(event)" class="hidden">
            <button onclick="document.getElementById('file-importer').click()" class="px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer ${isOAA ? 'bg-[#170710] hover:bg-rose-950 text-amber-200 border-amber-500/40' : 'bg-pink-50 hover:bg-pink-100 text-pink-900 border-pink-300'}">
              <i data-lucide="file-up" class="w-4 h-4 ${isOAA ? 'text-amber-400' : 'text-pink-600'}"></i> 選擇本機檔案 (.json / .csv)
            </button>
          </div>

          <div class="flex items-center space-x-3">
            <button onclick="aiHub.clearImportArea()" class="px-3 py-2 text-xs font-bold ${isOAA ? 'text-amber-200/70 hover:text-white' : 'text-slate-500 hover:text-slate-800'} transition cursor-pointer">
              清空
            </button>
            <button onclick="aiHub.executeImport()" class="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs sm:text-sm font-black shadow-md transition flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="check" class="w-4 h-4"></i> 解析並確認匯入
            </button>
          </div>
        </div>
      </div>

      <!-- Danger Zone / Data Management -->
      <div class="${cardCls}">
        <h3 class="text-xs font-black ${isOAA ? 'text-amber-300/80' : 'text-slate-700'} uppercase tracking-wider mb-3">資料庫維護與重設</h3>
        <div class="flex flex-wrap items-center gap-3">
          <button onclick="aiHub.resetToDemoData()" class="px-4 py-2 rounded-xl border text-xs font-bold transition shadow-sm cursor-pointer ${isOAA ? 'bg-amber-950/60 hover:bg-amber-900 text-amber-200 border-amber-500/40' : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'}">
            重設為官方示範數據
          </button>
          <button onclick="aiHub.clearAllData()" class="px-4 py-2 rounded-xl border text-xs font-bold transition shadow-sm cursor-pointer ${isOAA ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-200 border-rose-500/40' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'}">
            清空所有資料 (建立全新學年)
          </button>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  toggleAutoSwitchTimetable() {
    if (!this.store.data.settings) this.store.data.settings = {};
    const cur = this.store.data.settings.autoSwitchTimetable !== false;
    this.store.data.settings.autoSwitchTimetable = !cur;
    this.store.save();
    if (window.appState) {
      window.appState.showToast(!cur ? '📅 已開啟：依目前課表節次自動切班' : '✋ 已關閉自動切班（手動鎖定目前班級）', 'info');
    }
    this.render('ai-hub-view');
  }

  copyEventsCsvTemplate() {
    const csvSample = `date,period,class_id,seat_no,category,tag_name,delta,severity,note
${window.getLocalDateStr()},0,801,5,discipline,上課/晨讀遲到,-2,warning,"遲到10分鐘"
${window.getLocalDateStr()},3,801,12,academic,主動解出難題,+3,positive,"解出挑戰題"`;
    window.copyTextSafe(csvSample, '已複製標準 CSV 事件範例格式！');
  }

  parseCsvLine(line) {
    const cols = [];
    let cur = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQuotes && line[j + 1] === '"') {
          cur += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  }

  executeImport() {
    const textArea = document.getElementById('import-text-area');
    const text = textArea ? textArea.value.trim() : '';
    if (!text) {
      window.appState.showToast('請先貼入欲匯入之 JSON 或 CSV 內容', 'warning');
      return;
    }

    // Try parsing as JSON first
    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);
        if (parsed.classes && parsed.students) {
          const res = this.store.importAllData(text);
          if (res.success) {
            window.appState.showToast('🎉 成功載入全系統備份資料！', 'success');
            setTimeout(() => location.reload(), 800);
            return;
          } else {
            window.appState.showToast(`匯入失敗：${res.error}`, 'danger');
            return;
          }
        }
        window.appState.showToast('無法識別此 JSON 規格：請確認為全系統備份檔（含 classes 與 students）', 'warning');
      } catch (err) {
        window.appState.showToast(`JSON 解析失敗：${err.message}`, 'danger');
      }
      return;
    }

    // Try CSV Parsing for Behavioral Events
    try {
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 1) {
        let importedCount = 0;
        const startIdx = lines[0].toLowerCase().includes('date') ? 1 : 0;
        for (let i = startIdx; i < lines.length; i++) {
          const cols = this.parseCsvLine(lines[i]);
          if (cols.length >= 6) {
            const pVal = cols[1];
            const parsedPeriod = /^\d+$/.test(pVal) ? parseInt(pVal, 10) : pVal;
            this.store.addEvent({
              date: cols[0],
              period: parsedPeriod,
              classId: cols[2],
              seatNo: parseInt(cols[3], 10),
              category: cols[4] || 'discipline',
              tagName: cols[5] || '外部匯入事件',
              delta: Number(cols[6] || 0),
              severity: cols[7] || 'info',
              note: cols[8] || ''
            });
            importedCount++;
          }
        }
        window.appState.showToast(`🎉 成功由 CSV 匯入 ${importedCount} 筆點記事件！`, 'success');
        this.clearImportArea();
        return;
      }
      window.appState.showToast('CSV 行數過少或格式不正確', 'warning');
    } catch (e) {
      window.appState.showToast(`CSV 解析失敗：${e.message}`, 'danger');
    }
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const el = document.getElementById('import-text-area');
      if (el) el.value = event.target.result;
      window.appState.showToast(`已載入檔案：${file.name}，請點擊「解析並確認匯入」`, 'info');
    };
    reader.readAsText(file);
  }

  clearImportArea() {
    const el = document.getElementById('import-text-area');
    if (el) el.value = '';
  }

  downloadBackupJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(this.store.exportAllData());
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    const date = window.getLocalDateStr();
    dlAnchorElem.setAttribute("download", `ClassQuant_FullBackup_${date}.json`);
    dlAnchorElem.click();
    window.appState.showToast('已下載完整系統備份 JSON', 'success');
  }

  // --- ☁️ Google Sheets / Google Forms Scheduled & Manual Cloud Backup UI & Actions ---
  renderGoogleBackupCard(isOAA) {
    const cfg = this.store.getGoogleBackupSettings();
    const summary = this.store.getBackupSummary();
    const termArchiveCount = Object.values(this.store.getTermArchives ? this.store.getTermArchives() : {})
      .reduce((acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0), 0);
    const isSheets = cfg.mode !== 'form';
    const isConnected = isSheets
      ? Boolean(cfg.effectiveAppsScriptUrl)
      : Boolean(cfg.effectiveFormUrl && cfg.effectiveFormEntryId);

    const statusBadge = cfg.inheritedSource === 'feedback_webhook'
      ? '<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black">✅ 已自動沿用既有的 Google 試算表連線</span>'
      : cfg.inheritedSource === 'cloud_config'
      ? '<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black">✅ 已自動載入系統預設雲端端點</span>'
      : isConnected
      ? '<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black">🟢 雲端備份已綁定就緒</span>'
      : '<span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-black">⚠️ 尚未綁定（依下方 3 步驟即可設定）</span>';

    return `
      <div class="glass-card rounded-3xl p-5 sm:p-6 border-2 ${isOAA ? 'border-amber-500/60 bg-gradient-to-br from-[#230c19] via-[#1b0812] to-[#2c1020] text-white' : 'border-emerald-300 bg-gradient-to-br from-emerald-50/60 via-white to-sky-50/50'} shadow-md mb-6">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b ${isOAA ? 'border-amber-500/30' : 'border-emerald-200'}">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-base sm:text-lg font-black ${isOAA ? 'text-amber-300' : 'text-slate-900'} flex items-center gap-1.5">
                <span>☁️ Google 表單／試算表 定期＆隨時雲端備份</span>
              </h3>
              ${statusBadge}
            </div>
            <p class="text-xs ${isOAA ? 'text-amber-100/80' : 'text-slate-600'} font-medium mt-1">
              完整備份您已自訂好的【自訂標籤 (${summary.tagCount}個)、班級名單 (${summary.classCount}班 ${summary.studentCount}人)、本期點記 (${summary.eventCount}筆)、歷史段考歸檔 (${termArchiveCount}次)、座位與課表】，絕不遺失。
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="aiHub.runGoogleBackupNow()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-black shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="cloud-upload" class="w-4 h-4"></i> 立即備份至雲端
            </button>
            ${isSheets ? `
              <button onclick="aiHub.openCloudRestoreModal()" class="px-3.5 py-2 rounded-xl ${isOAA ? 'bg-[#1a0711] hover:bg-rose-950 text-amber-200 border border-amber-500/50' : 'bg-white hover:bg-sky-50 text-sky-800 border border-sky-300'} text-xs font-black shadow-sm transition flex items-center gap-1.5 cursor-pointer">
                <i data-lucide="history" class="w-4 h-4"></i> 從 Google 還原
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Backup Status & Mode Selector -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label class="block text-xs font-black ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">備份模式：</label>
            <select id="gb-mode" onchange="aiHub.switchGoogleBackupMode(this.value)" class="w-full rounded-xl px-3 py-2 text-xs font-bold border ${isOAA ? 'bg-[#12050c] border-amber-500/50 text-white' : 'bg-white border-emerald-300 text-slate-800'} focus:outline-none">
              <option value="sheets" ${isSheets ? 'selected' : ''}>📊 Google 試算表 Apps Script（推薦：支援定期備份＋一鍵還原）</option>
              <option value="form" ${!isSheets ? 'selected' : ''}>📝 Google 表單直接傳送（單向存檔進 Google 表單回覆）</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-black ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">定期自動備份排程：</label>
            <select id="gb-schedule" onchange="aiHub.saveGoogleBackupConfig(true)" class="w-full rounded-xl px-3 py-2 text-xs font-bold border ${isOAA ? 'bg-[#12050c] border-amber-500/50 text-white' : 'bg-white border-emerald-300 text-slate-800'} focus:outline-none">
              <option value="daily" ${cfg.schedule === 'daily' ? 'selected' : ''}>📅 每天自動備份一次（開啟 App 且資料有變動時）</option>
              <option value="hourly" ${cfg.schedule === 'hourly' ? 'selected' : ''}>⏱️ 每小時自動備份一次</option>
              <option value="on_change" ${cfg.schedule === 'on_change' ? 'selected' : ''}>⚡ 每次分數/名單/標籤異動自動備份（15秒整合）</option>
              <option value="weekly" ${cfg.schedule === 'weekly' ? 'selected' : ''}>📆 每週自動備份一次</option>
              <option value="manual" ${cfg.schedule === 'manual' ? 'selected' : ''}>🖐️ 僅手動備份（關閉自動排程）</option>
            </select>
          </div>

          <div>
            <div class="flex items-center justify-between gap-1 mb-1">
              <label class="block text-xs font-black ${isOAA ? 'text-amber-200' : 'text-slate-700'}">老師/裝置暱稱（辨識備份來源）：</label>
              <span class="text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${isOAA ? 'bg-amber-950/70 text-amber-300 border border-amber-500/40' : 'bg-emerald-100 text-emerald-800'}" title="每台裝置自動產生的永久識別碼，不登入也能區分不同使用者">${cfg.deviceId || ''}</span>
            </div>
            <input type="text" id="gb-label" onchange="aiHub.saveGoogleBackupConfig(true)" value="${this.escapeAttr(cfg.teacherLabel || '')}" placeholder="例：王老師 / 801導師電腦"
              class="w-full rounded-xl px-3 py-2 text-xs font-bold border ${isOAA ? 'bg-[#12050c] border-amber-500/50 text-white' : 'bg-white border-emerald-300 text-slate-800'} focus:outline-none">
          </div>
        </div>

        ${isSheets ? `
          <div class="p-4 rounded-2xl border ${isOAA ? 'bg-[#14060d] border-amber-500/35' : 'bg-white border-emerald-200'} space-y-3">
            <div>
              <label class="block text-xs font-black ${isOAA ? 'text-amber-200' : 'text-slate-800'} mb-1">
                Google Apps Script 網頁應用程式網址（Web App URL）：
              </label>
              <div class="flex flex-wrap sm:flex-nowrap gap-2">
                <input type="url" id="gb-apps-script-url" value="${this.escapeAttr(cfg.effectiveAppsScriptUrl || '')}"
                  placeholder="https://script.google.com/macros/s/...../exec"
                  class="flex-1 min-w-[220px] rounded-xl px-3 py-2 text-xs font-mono font-bold border ${isOAA ? 'bg-[#0c0308] border-amber-500/50 text-amber-100' : 'bg-slate-50 border-slate-300 text-slate-900'} focus:outline-none">
                <button onclick="aiHub.saveGoogleBackupConfig()" class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition cursor-pointer">
                  💾 儲存設定
                </button>
                <button onclick="aiHub.testGoogleBackupConnection()" class="px-3.5 py-2 rounded-xl ${isOAA ? 'bg-[#2a0f1e] hover:bg-rose-950 text-amber-200 border border-amber-500/40' : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300'} text-xs font-black transition cursor-pointer">
                  🔌 測試連線
                </button>
              </div>
              <div id="gb-status-msg" class="text-[11px] mt-1.5 ${isOAA ? 'text-amber-200/80' : 'text-slate-600'} font-bold">
                ${cfg.lastBackupStatus ? `最近雲端備份：${cfg.lastBackupStatus}` : '尚未進行過雲端備份'}
              </div>
            </div>

            <details class="text-xs ${isOAA ? 'text-amber-100/90' : 'text-slate-700'} bg-black/5 rounded-xl p-3 border ${isOAA ? 'border-amber-500/20 bg-black/30' : 'border-emerald-100'}">
              <summary class="font-black cursor-pointer select-none flex items-center justify-between">
                <span>📖 第一次使用？點這裡看「3 分鐘免費串接 Google 試算表／雲端備份」教學</span>
                <button type="button" onclick="event.stopPropagation(); aiHub.copyAppsScriptForBackup()" class="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-[11px] font-black transition">
                  📋 複製後端程式碼
                </button>
              </summary>
              <ol class="list-decimal pl-5 mt-2.5 space-y-1 leading-relaxed">
                <li>用老師的 Google 帳號在 Google 雲端硬碟建立一份新試算表（或打開原本留言板那張試算表）。</li>
                <li>點選上方選單 <strong>「擴充功能」➔「Apps Script」</strong>，清空舊程式後貼上上方複製的後端程式碼並按 Ctrl+S 儲存（若曾設定過舊版留言板，選「部署」➔「管理部署作業」➔ 編輯選「新版本」，原本網址免重填！）。</li>
                <li>點右上角 <strong>「部署」➔「新增部署作業」</strong>，類型選「網頁應用程式」、執行身分選「我」、誰可以存取務必選 <strong>「所有人 (Anyone)」</strong>。</li>
                <li>將產生的 <code>https://script.google.com/macros/s/.../exec</code> 網址貼入上方欄位按「儲存設定」，之後就會自動幫您分片存進試算表的 <strong>Backups</strong> 分頁，可隨時跨裝置一鍵還原！</li>
              </ol>
            </details>
          </div>
        ` : `
          <div class="p-4 rounded-2xl border ${isOAA ? 'bg-[#14060d] border-amber-500/35' : 'bg-white border-emerald-200'} space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-black ${isOAA ? 'text-amber-200' : 'text-slate-800'} mb-1">
                  Google 表單網址（貼上預先填入連結或表單網址皆可）：
                </label>
                <input type="url" id="gb-form-url" value="${this.escapeAttr(cfg.effectiveFormUrl || '')}"
                  oninput="aiHub.autoParseGoogleFormInput(this.value)"
                  placeholder="https://docs.google.com/forms/d/e/.../viewform?usp=pp_url&entry.123456=..."
                  class="w-full rounded-xl px-3 py-2 text-xs font-mono font-bold border ${isOAA ? 'bg-[#0c0308] border-amber-500/50 text-amber-100' : 'bg-slate-50 border-slate-300 text-slate-900'} focus:outline-none">
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs font-black ${isOAA ? 'text-amber-200' : 'text-slate-800'} mb-1">備份資料欄位 ID（必填）：</label>
                  <input type="text" id="gb-form-entry" value="${this.escapeAttr(cfg.effectiveFormEntryId || '')}"
                    placeholder="例：entry.123456789"
                    class="w-full rounded-xl px-3 py-2 text-xs font-mono font-bold border ${isOAA ? 'bg-[#0c0308] border-amber-500/50 text-amber-100' : 'bg-slate-50 border-slate-300 text-slate-900'} focus:outline-none">
                </div>
                <div>
                  <label class="block text-xs font-black ${isOAA ? 'text-amber-200' : 'text-slate-800'} mb-1">摘要欄位 ID（選填）：</label>
                  <input type="text" id="gb-form-summary-entry" value="${this.escapeAttr(cfg.effectiveFormSummaryEntryId || '')}"
                    placeholder="例：entry.987654321"
                    class="w-full rounded-xl px-3 py-2 text-xs font-mono font-bold border ${isOAA ? 'bg-[#0c0308] border-amber-500/50 text-amber-100' : 'bg-slate-50 border-slate-300 text-slate-900'} focus:outline-none">
                </div>
              </div>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div id="gb-status-msg" class="text-[11px] ${isOAA ? 'text-amber-200/80' : 'text-slate-600'} font-bold">
                ${cfg.lastBackupStatus ? `最近表單備份：${cfg.lastBackupStatus}` : '提示：Google 表單為單向存檔（系統會依排程自動提交最新資料），還原時請從表單回覆複製貼回下方 JSON 匯入。'}
              </div>
              <button onclick="aiHub.saveGoogleBackupConfig()" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition cursor-pointer">
                💾 儲存表單設定
              </button>
            </div>
            <details class="text-xs ${isOAA ? 'text-amber-100/90' : 'text-slate-700'} bg-black/5 rounded-xl p-3 border ${isOAA ? 'border-amber-500/20 bg-black/30' : 'border-emerald-100'}">
              <summary class="font-black cursor-pointer select-none">📖 如何 30 秒取得專屬 Google 表單與欄位代碼 (entry.xxxxxx)？</summary>
              <ol class="list-decimal pl-5 mt-2 space-y-1 leading-relaxed">
                <li>到 Google 表單建立新表單，新增 1 題「段落 (長答案)」問題（例如命名為「備份JSON資料」，不要設登入限制）。</li>
                <li>點右上角「⋮」➔「取得預先填入的連結」，在答案欄隨便打一個字 <code>test</code> 後按底部「取得連結」並複製。</li>
                <li>直接把整串「預先填入的連結」貼進上方 Google 表單網址欄，系統會自動幫您擷取表單網址與 <code>entry.xxxxxx</code> 代碼！</li>
              </ol>
            </details>
          </div>
        `}
      </div>
    `;
  }

  escapeAttr(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  switchGoogleBackupMode(mode) {
    this.store.updateGoogleBackupSettings({
      mode: mode === 'form' ? 'form' : 'sheets',
      modeExplicit: true
    });
    this.render('ai-hub-view');
  }

  autoParseGoogleFormInput(rawVal) {
    const parsed = this.store.parseGoogleFormUrl(rawVal);
    if (parsed.entryId) {
      const entryInput = document.getElementById('gb-form-entry');
      if (entryInput && !entryInput.value.trim()) {
        entryInput.value = parsed.entryId;
        window.appState.showToast(`已自動擷取表單欄位代碼：${parsed.entryId}`, 'info');
      }
    }
    if (parsed.summaryEntryId) {
      const summaryInput = document.getElementById('gb-form-summary-entry');
      if (summaryInput && !summaryInput.value.trim()) {
        summaryInput.value = parsed.summaryEntryId;
      }
    }
  }

  saveGoogleBackupConfig(silentRender = false) {
    const mode = document.getElementById('gb-mode')?.value || 'sheets';
    const schedule = document.getElementById('gb-schedule')?.value || 'daily';
    const teacherLabel = document.getElementById('gb-label')?.value.trim() || '';

    const patch = { mode, modeExplicit: true, schedule, scheduleExplicit: true, teacherLabel };
    const cloudPatch = {
      defaultBackupMode: mode,
      defaultSchedule: schedule,
      lastSyncTime: new Date().toISOString()
    };

    if (mode === 'form') {
      const rawFormUrl = document.getElementById('gb-form-url')?.value.trim() || '';
      const parsed = this.store.parseGoogleFormUrl(rawFormUrl);
      const entryId = document.getElementById('gb-form-entry')?.value.trim() || parsed.entryId;
      const summaryEntryId = document.getElementById('gb-form-summary-entry')?.value.trim() || parsed.summaryEntryId || '';
      patch.googleFormUrl = parsed.actionUrl || rawFormUrl;
      patch.formEntryId = entryId;
      patch.formSummaryEntryId = summaryEntryId;

      if (patch.googleFormUrl) cloudPatch.googleFormUrl = patch.googleFormUrl;
      if (patch.formEntryId) cloudPatch.formEntryId = patch.formEntryId;
      if (patch.formSummaryEntryId) cloudPatch.formSummaryEntryId = patch.formSummaryEntryId;
    } else {
      const appsUrl = document.getElementById('gb-apps-script-url')?.value.trim() || '';
      patch.appsScriptUrl = appsUrl;
      if (appsUrl) cloudPatch.webhookUrl = appsUrl;
    }

    this.store.updateGoogleBackupSettings(patch);
    if (location.protocol.startsWith('http')) {
      fetch('./api/cloud-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cloudPatch)
      }).catch(() => {});
    }
    window.appState.showToast('✅ Google 雲端備份設定已儲存', 'success');
    if (!silentRender) this.render('ai-hub-view');
  }

  async testGoogleBackupConnection() {
    const appsUrl = document.getElementById('gb-apps-script-url')?.value.trim();
    const statusEl = document.getElementById('gb-status-msg');
    if (!appsUrl) {
      window.appState.showToast('請先填入 Google Apps Script 網址', 'warning');
      return;
    }
    if (statusEl) statusEl.innerHTML = '<span class="text-amber-500">⏳ 正在連線測試 Google Apps Script...</span>';
    try {
      const res = await fetch(`${appsUrl}${appsUrl.includes('?') ? '&' : '?'}action=ping&t=${Date.now()}`);
      const text = await res.text();
      const data = JSON.parse(text);
      if (data && data.supportsBackups) {
        if (statusEl) statusEl.innerHTML = '<span class="text-emerald-600">✅ 連線成功！支援新版定期雲端備份與一鍵還原 (Backups v2.0)</span>';
        window.appState.showToast('✅ Google Apps Script 連線測試成功！', 'success');
      } else if (data && data.ok) {
        if (statusEl) statusEl.innerHTML = '<span class="text-amber-600">⚠️ 已連通舊版試算表腳本，請複製最新版後端程式碼並「管理部署➔新版本」即可開啟備份分頁</span>';
      } else {
        if (statusEl) statusEl.innerHTML = '<span class="text-amber-600">⚠️ 回應格式異常，請確認部署權限已設為「所有人 (Anyone)」</span>';
      }
    } catch (e) {
      if (statusEl) statusEl.innerHTML = `<span class="text-rose-600">❌ 連線失敗：${e.message}</span>`;
      window.appState.showToast(`❌ 連線測試失敗：${e.message}`, 'danger');
    }
  }

  async runGoogleBackupNow() {
    const modeEl = document.getElementById('gb-mode');
    if (modeEl) this.saveGoogleBackupConfig(true);
    const statusEl = document.getElementById('gb-status-msg');
    if (statusEl) statusEl.innerHTML = '<span class="text-sky-600">⏳ 正在打包標籤、名單與點記並上傳 Google...</span>';

    try {
      const res = await this.store.uploadGoogleBackup({ reason: '手動立即備份', force: true, silent: false });
      if (res.success) {
        const s = res.payload.summary;
        window.appState.showToast(`☁️ 雲端備份完成！（${s.classCount}班・${s.studentCount}人・${s.eventCount}筆點記）`, 'success');
        this.render('ai-hub-view');
      } else if (statusEl) {
        statusEl.innerHTML = `<span class="text-amber-600">⚠️ 未完成備份：${res.error || '請檢查設定或網路狀態'}</span>`;
      }
    } catch (e) {
      if (statusEl) statusEl.innerHTML = `<span class="text-rose-600">❌ 備份上傳失敗：${e.message}</span>`;
      window.appState.showToast(`❌ 備份失敗：${e.message}`, 'danger');
    }
  }

  async copyAppsScriptForBackup() {
    try {
      const res = await fetch('./data/google_apps_script.js?t=' + Date.now());
      if (res.ok) {
        const text = await res.text();
        await window.copyTextSafe(text, '📋 已複製最新版 Google Apps Script 後端程式碼！請貼回 Google 試算表擴充功能');
        return;
      }
    } catch (e) {}
    window.appState.showToast('請查看專案中的 data/google_apps_script.js', 'info');
  }

  async openCloudRestoreModal() {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `<div class="p-8 text-center text-sm font-bold text-slate-600">⏳ 正在讀取 Google 試算表雲端備份歷史...</div>`;
    modal.classList.remove('hidden');

    try {
      const list = await this.store.fetchCloudBackupsList();
      modalContent.innerHTML = `
        <div class="p-5 sm:p-6 max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-3 mb-4 border-b border-pink-100">
            <div>
              <h3 class="text-lg font-black text-slate-900">☁️ 從 Google 試算表還原備份</h3>
              <p class="text-xs text-slate-500 font-bold">還原前系統會自動拍攝一份本機安全快照，絕不怕覆蓋錯失</p>
            </div>
            <button onclick="appState.closeModal()" class="w-8 h-8 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-700 font-black">✕</button>
          </div>

          ${list.length === 0 ? `
            <div class="text-center py-8 text-xs text-slate-500 font-bold">
              雲端 Backups 分頁尚無備份記錄，請先點擊「立即備份至雲端」建立第一筆雲端存檔。
            </div>
          ` : `
            <div class="space-y-2.5">
              ${list.map(b => `
                <div class="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <div class="font-black text-slate-900">${b.localTimeStr || b.timestamp} <span class="px-2 py-0.5 rounded-full bg-white border border-emerald-300 text-emerald-700 text-[10px] ml-1">${b.reason}</span></div>
                    <div class="text-[11px] text-slate-600 mt-1 font-bold">
                      ${b.deviceLabel ? `${b.deviceLabel} • ` : ''}${b.summary.classCount} 班 • ${b.summary.studentCount} 位學生 • ${b.summary.eventCount} 筆事件
                    </div>
                  </div>
                  <button onclick="aiHub.restoreCloudVersion('${b.id}')" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition cursor-pointer">
                    ↩️ 還原此備份
                  </button>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    } catch (e) {
      modalContent.innerHTML = `
        <div class="p-6 text-center space-y-3">
          <div class="text-rose-600 font-black text-sm">❌ 無法讀取雲端備份清單</div>
          <p class="text-xs text-slate-600">${e.message}</p>
          <button onclick="appState.closeModal()" class="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">關閉</button>
        </div>
      `;
    }
  }

  async restoreCloudVersion(backupId) {
    if (!confirm('確定要還原此 Google 雲端備份嗎？（系統會先自動把目前的資料拍一份本機快照）')) return;
    try {
      const res = await this.store.restoreFromCloudBackup(backupId);
      if (res.success) {
        window.appState.closeModal();
        window.appState.showToast('🎉 已成功從 Google 試算表還原所有標籤、名單與資料！', 'success');
        setTimeout(() => location.reload(), 800);
      } else {
        window.appState.showToast(`還原失敗：${res.error}`, 'danger');
      }
    } catch (e) {
      window.appState.showToast(`❌ 還原失敗：${e.message}`, 'danger');
    }
  }

  exportClassStatsCsv() {
    const currentClassId = window.appState.currentClassId;
    const students = this.store.getStudents(currentClassId);
    const cls = this.store.getClass(currentClassId);
    const termLabel = this.store.getDefaultTermLabel(currentClassId);

    let csv = `座號,姓名,性別,結算期別,本期平時成績,等級,本期加分,本期扣分,本期淨積分,累積歷次平均\n`;
    students.forEach(s => {
      const p = window.statisticsEngine.getStudentProfile(currentClassId, s.seatNo);
      const r = this.store.getStudentRankInClass(currentClassId, s.seatNo);
      const hist = this.store.getStudentHistoricalSummary(currentClassId, s.seatNo);
      csv += `${s.seatNo},"${s.name}",${s.gender === 'F' ? '女' : '男'},"${termLabel}",${r ? r.regularScore : (p ? p.scoreMean : 80)},${r ? r.tier : 'B'},${r ? r.positivePts : 0},${r ? r.negativePts : 0},${r ? r.netPoints : 0},${hist && hist.termCount > 0 ? hist.avgScore : ''}\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cls ? cls.name : currentClassId}_平時成績統計_${termLabel}.csv`;
    a.click();
    window.appState.showToast('已匯出班級平時成績 CSV 報表！', 'success');
  }

  createManualSnapshot() {
    const success = this.store.createSnapshot('手動拍攝快照');
    if (success) {
      window.appState.showToast('📸 已成功建立當前狀態本地快照！', 'success');
      this.render('ai-hub-view');
    }
  }

  restoreSnapshot(timestamp) {
    if (confirm('⚠️ 確定要將系統狀態還原至此快照版本嗎？（系統會在還原前自動建立一份備份）')) {
      const ok = this.store.restoreSnapshot(timestamp);
      if (ok) {
        window.appState.showToast('🎉 已成功還原至歷史快照版本！', 'success');
        setTimeout(() => location.reload(), 800);
      } else {
        window.appState.showToast('還原快照失敗', 'danger');
      }
    }
  }

  resetToDemoData() {
    if (confirm('確定要重設為官方完整示範資料嗎？現有資料將被覆蓋。')) {
      this.store.resetToDemo();
      window.appState.showToast('已重設為官方示範數據', 'info');
      setTimeout(() => location.reload(), 600);
    }
  }

  clearAllData() {
    if (confirm('⚠️ 警告：這將清空所有班級、學生與事件記錄！確定要清空嗎？')) {
      this.store.clearAll();
      window.appState.showToast('已清空資料庫，請至「班級與學生」新增班級', 'info');
      setTimeout(() => location.reload(), 600);
    }
  }
}

// Global Settings / Backup Hub Instance (keeps window.aiHub API compatibility)
window.aiHub = new AIImportExportHub(window.appStore);

/**
 * AI Integration, Schema Guide & Import/Export Hub
 * Standardized JSON/CSV schema documentation, AI prompt generator, and data transfer.
 * Styled with unified Sanrio Pastel Glass-Card Theme.
 */

class AIImportExportHub {
  constructor(store) {
    this.store = store;
  }

  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <!-- Top Title -->
      <div class="glass-card rounded-3xl p-5 sm:p-6 mb-5 border border-pink-200 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center space-x-3.5">
            <div class="sanrio-twinstars-badge !w-12 !h-12"></div>
            <div>
              <h2 class="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                AI 數據轉換規範 & 外部資料匯入中心
                <span class="kitty-bow"></span>
              </h2>
              <p class="text-xs sm:text-sm text-slate-600 font-medium">定義標準資料格式，供任何外部 AI (ChatGPT / Claude / Gemini) 快速轉換試算表或紙本小考成績並一鍵匯入</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="aiHub.downloadBackupJson()" class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-sm">
              <i data-lucide="download" class="w-4 h-4"></i> 下載全系統備份 (JSON)
            </button>
            <button onclick="aiHub.exportClassStatsCsv()" class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-sm">
              <i data-lucide="file-spreadsheet" class="w-4 h-4"></i> 匯出統計報表 (CSV)
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- 1. AI Prompt & JSON Schema for Assessment Import -->
        <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <i data-lucide="code" class="w-4 h-4 text-purple-600"></i>
                1. 小考/段考成績匯入 Schema (JSON)
              </h3>
              <button onclick="aiHub.copyAssessmentAIPrompt()" class="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold flex items-center gap-1 transition shadow-sm">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i> 複製 AI 轉換 Prompt
              </button>
            </div>
            <p class="text-xs text-slate-600 font-medium mb-3">複製提示詞並附帶您的成績單文字丟給 AI，AI 即會依本規格輸出 JSON 供您貼入下方匯入：</p>
            
            <pre class="p-3.5 rounded-2xl bg-pink-50/70 border border-pink-200 text-xs text-slate-900 font-mono overflow-x-auto leading-relaxed font-bold">
{
  "type": "assessment",
  "class_id": "801",
  "assessment_name": "第三章因式分解隨堂小考",
  "date": "2026-09-20",
  "max_score": 100,
  "records": [
    { "seat_no": 1, "score": 85, "note": "計算題粗心" },
    { "seat_no": 2, "score": 42, "note": "十字交乘法觀念需補救" },
    { "seat_no": 5, "score": 60, "note": "有退步趨勢" }
  ]
}</pre>
          </div>
        </div>

        <!-- 2. AI Prompt & CSV Schema for Behavioral Events -->
        <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 bg-white shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <i data-lucide="file-text" class="w-4 h-4 text-sky-600"></i>
                2. 課堂行為/違紀批次匯入 Schema (CSV/文字)
              </h3>
              <button onclick="aiHub.copyEventsAIPrompt()" class="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 text-xs font-bold flex items-center gap-1 transition shadow-sm">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i> 複製事件 Prompt
              </button>
            </div>
            <p class="text-xs text-slate-600 font-medium mb-3">供批量將日常記錄、實習老師或小老師登記之違紀名冊轉換為標準事件：</p>
            
            <pre class="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 text-xs text-slate-900 font-mono overflow-x-auto leading-relaxed font-bold">
date,period,class_id,seat_no,category,tag_name,delta,severity,note
2026-09-20,0,801,5,discipline,上課/晨讀遲到,-2,warning,"遲到15分鐘"
2026-09-20,3,801,12,academic,主動解出難題,+3,positive,"解出挑戰題"
2026-09-20,lunch,801,8,conflict,肢體衝突,-5,critical,"午休搶球推擠衝突"</pre>
          </div>
        </div>
      </div>

      <!-- Import Interactive Console -->
      <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 bg-white shadow-sm mb-6">
        <h3 class="text-base font-black text-slate-900 flex items-center gap-2 mb-2">
          <i data-lucide="upload-cloud" class="w-5 h-5 text-emerald-600"></i>
          即時貼上或拖曳檔案匯入 (JSON / CSV)
        </h3>
        <p class="text-xs text-slate-600 font-medium mb-3">直接將 AI 產生的 JSON 或全系統備份檔案貼在下方，點擊「解析並確認匯入」即可無縫寫入資料庫：</p>

        <textarea id="import-text-area" rows="6" placeholder="請在此貼上 JSON 或 CSV 內容..." class="w-full bg-slate-50 border-2 border-pink-200 rounded-2xl p-3.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-pink-500 mb-3 font-bold"></textarea>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center space-x-2">
            <input type="file" id="file-importer" accept=".json,.csv" onchange="aiHub.handleFileSelect(event)" class="hidden">
            <button onclick="document.getElementById('file-importer').click()" class="px-3.5 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-900 border border-pink-300 text-xs font-bold flex items-center gap-1.5 transition shadow-sm">
              <i data-lucide="file-up" class="w-4 h-4 text-pink-600"></i> 選擇本機檔案 (.json / .csv)
            </button>
          </div>

          <div class="flex items-center space-x-3">
            <button onclick="aiHub.clearImportArea()" class="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition">
              清空
            </button>
            <button onclick="aiHub.executeImport()" class="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs sm:text-sm font-black shadow-md transition flex items-center gap-1.5">
              <i data-lucide="check" class="w-4 h-4"></i> 解析並確認匯入
            </button>
          </div>
        </div>
      </div>

      <!-- Danger Zone / Data Management -->
      <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 bg-white shadow-sm">
        <h3 class="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">資料庫維護與重設</h3>
        <div class="flex flex-wrap items-center gap-3">
          <button onclick="aiHub.resetToDemoData()" class="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition shadow-sm">
            重設為官方示範數據
          </button>
          <button onclick="aiHub.clearAllData()" class="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold transition shadow-sm">
            清空所有資料 (建立全新學年)
          </button>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  copyAssessmentAIPrompt() {
    const prompt = `你是一位專業的國中教育與試算表資料整理助理。
請將我提供的學生小考/評量成績文字或表格，轉換為以下 JSON 格式。
請直接輸出 JSON 代碼區塊，不要加入多餘的解釋文字：

{
  "type": "assessment",
  "class_id": "801",
  "assessment_name": "第X次小考：單元名稱",
  "date": "${new Date().toISOString().split('T')[0]}",
  "max_score": 100,
  "records": [
    { "seat_no": 1, "score": 85, "note": "計算題粗心" },
    { "seat_no": 2, "score": 72, "note": "" }
  ]
}

【欲轉換的成績資料如下】：
`;
    navigator.clipboard.writeText(prompt);
    window.appState.showToast('已複製小考 AI 提示詞！請貼給 ChatGPT / Claude 並附上成績單', 'success');
  }

  copyEventsAIPrompt() {
    const prompt = `你是一位專業的班級管理資料助理。
請將我提供的課堂行為、違紀或加扣分記錄，轉換為標準 CSV 格式。
請直接輸出 CSV 內容，不要包含多餘的解釋文字：

date,period,class_id,seat_no,category,tag_name,delta,severity,note
2026-09-20,0,801,5,discipline,遲到,-2,warning,"遲到10分鐘"
2026-09-20,3,801,12,academic,主動解題,+3,positive,"解出難題"

【欲轉換的事件記錄如下】：
`;
    navigator.clipboard.writeText(prompt);
    window.appState.showToast('已複製事件 AI 提示詞！', 'success');
  }

  executeImport() {
    const text = document.getElementById('import-text-area').value.trim();
    if (!text) {
      window.appState.showToast('請先貼入欲匯入之 JSON 或 CSV 內容', 'warning');
      return;
    }

    // Try parsing as JSON first
    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text);

        // Case 1: Assessment Import
        if (parsed.type === 'assessment' || parsed.records) {
          const classId = parsed.class_id || window.appState.currentClassId;
          const scoresMap = {};
          (parsed.records || []).forEach(r => {
            scoresMap[r.seat_no] = Number(r.score);
          });

          this.store.addAssessment(classId, {
            name: parsed.assessment_name || '外部匯入小考',
            date: parsed.date || new Date().toISOString().split('T')[0],
            maxScore: parsed.max_score || 100,
            scores: scoresMap
          });

          window.appState.showToast(`🎉 成功匯入【${parsed.assessment_name || '小考'}】成績（共 ${Object.keys(scoresMap).length} 位學生）！`, 'success');
          this.clearImportArea();
          return;
        }

        // Case 2: Full System Backup Import
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

        window.appState.showToast('無法識別此 JSON 規格，請參考上方格式', 'warning');
      } catch (err) {
        window.appState.showToast(`JSON 解析失敗：${err.message}`, 'danger');
      }
      return;
    }

    // Try CSV Parsing
    try {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 1) {
        let importedCount = 0;
        // Check if header exists
        const startIdx = lines[0].toLowerCase().includes('date') ? 1 : 0;
        for (let i = startIdx; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length >= 6) {
            this.store.addEvent({
              date: cols[0],
              period: cols[1],
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
        window.appState.showToast(`🎉 成功由 CSV 匯入 ${importedCount} 筆事件記錄！`, 'success');
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
      document.getElementById('import-text-area').value = event.target.result;
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
    const date = new Date().toISOString().split('T')[0];
    dlAnchorElem.setAttribute("download", `ClassQuant_FullBackup_${date}.json`);
    dlAnchorElem.click();
    window.appState.showToast('已下載完整系統備份 JSON', 'success');
  }

  exportClassStatsCsv() {
    const currentClassId = window.appState.currentClassId;
    const students = this.store.getStudents(currentClassId);
    const cls = this.store.getClass(currentClassId);
    
    let csv = `座號,姓名,學業均分,常規淨積分,學習動機,責任感,同儕互動\n`;
    students.forEach(s => {
      const p = window.statisticsEngine.getStudentProfile(currentClassId, s.seatNo);
      const charPts = p ? p.pointsBreakdown.discipline + p.pointsBreakdown.conflict + p.pointsBreakdown.social : 0;
      csv += `${s.seatNo},"${s.name}",${p ? p.scoreMean : 0},${charPts},${p ? p.radar.motivation : 70},${p ? p.radar.accountability : 70},${p ? p.radar.socialEmotional : 70}\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cls ? cls.name : currentClassId}_全班統計報表.csv`;
    a.click();
    window.appState.showToast('已匯出班級統計 CSV 報表！', 'success');
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
      window.appState.showToast('已清空資料庫，請至「班級名單」新增班級', 'info');
      setTimeout(() => location.reload(), 600);
    }
  }
}

// Global AI Hub Instance
window.aiHub = new AIImportExportHub(window.appStore);

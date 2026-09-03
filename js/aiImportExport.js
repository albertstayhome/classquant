/**
 * AI Integration, Schema Guide & Import/Export Hub
 * Standardized JSON/CSV schema documentation, AI prompt generator, and data transfer.
 * Styled with unified Sanrio Pastel Glass-Card Theme.
 */

/**
 * Centralized Google Gemini AI Service
 * Supports Family Passcode Verification ("鑫吾的生日: 0228") and reusable API calls.
 */
class AIService {
  constructor() {
    // Encrypted master key (ciphertext encrypted with passcode '0228')
    this.encryptedKey = 'cWMceVIKYHYGeWpKAh9naWVAS3pxBnpxZVx7T1ZWCgwHRgdoVwBYfAlVeQx3amR6aX9UFWE='; 
  }

  static encrypt(plainText, passcode = '0228') {
    let result = '';
    for (let i = 0; i < plainText.length; i++) {
      result += String.fromCharCode(plainText.charCodeAt(i) ^ passcode.charCodeAt(i % passcode.length));
    }
    return btoa(result);
  }

  static decrypt(ciphertext, passcode = '0228') {
    try {
      const raw = atob(ciphertext);
      let result = '';
      for (let i = 0; i < raw.length; i++) {
        result += String.fromCharCode(raw.charCodeAt(i) ^ passcode.charCodeAt(i % passcode.length));
      }
      return result;
    } catch (e) {
      return '';
    }
  }

  isFamilyAuthorized() {
    return localStorage.getItem('classquant_family_authorized') === 'true';
  }

  getApiKey() {
    // 1. Silent URL parameter check (?setup_key=... or ?api_key=...)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryKey = urlParams.get('setup_key') || urlParams.get('api_key');
      if (queryKey && queryKey.trim()) {
        const trimmed = queryKey.trim();
        localStorage.setItem('classquant_gemini_api_key', trimmed);
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        return trimmed;
      }
    } catch (e) {}

    // 2. User/device custom key
    const customKey = localStorage.getItem('classquant_gemini_api_key');
    if (customKey && customKey.trim()) return customKey.trim();

    // 3. Family authorized key (decrypted from encrypted master key)
    if (this.isFamilyAuthorized() && this.encryptedKey) {
      const decrypted = AIService.decrypt(this.encryptedKey, '0228');
      if (decrypted) return decrypted;
    }

    return '';
  }

  setApiKey(key) {
    localStorage.setItem('classquant_gemini_api_key', (key || '').trim());
  }

  clearApiKey() {
    localStorage.removeItem('classquant_gemini_api_key');
    localStorage.removeItem('classquant_family_authorized');
  }

  hasApiKey() {
    return Boolean(this.getApiKey());
  }

  verifyFamilyPasscode(passcode) {
    if ((passcode || '').trim() === '0228') {
      localStorage.setItem('classquant_family_authorized', 'true');
      if (this.encryptedKey) {
        const decrypted = AIService.decrypt(this.encryptedKey, '0228');
        if (decrypted) {
          localStorage.setItem('classquant_gemini_api_key', decrypted);
        }
      }
      return true;
    }
    return false;
  }

  async generateContent({ prompt, systemInstruction, responseSchema, images = [] }) {
    const key = this.getApiKey();
    if (!key) throw new Error('AUTH_REQUIRED');
    if (!navigator.onLine) throw new Error('OFFLINE');

    const parts = [];
    images.forEach(img => {
      parts.push({
        inlineData: {
          mimeType: img.mimeType || 'image/jpeg',
          data: img.data
        }
      });
    });
    parts.push({ text: prompt });

    const requestBody = {
      contents: [{ parts }]
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    if (responseSchema) {
      requestBody.generationConfig = {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      };
    }

    let modelName = 'gemini-3.6-flash';
    let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok && response.status === 404) {
      modelName = 'gemini-2.5-flash';
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `HTTP ${response.status} 錯誤`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content?.parts?.[0]?.text) {
      throw new Error('Gemini API 未回傳有效解析內容');
    }

    return candidate.content.parts[0].text;
  }
}

// Global AI Service
window.aiService = new AIService();

class AIImportExportHub {
  constructor(store) {
    this.store = store;
    this.selectedImageBase64 = null;
    this.selectedImageMime = null;
    this.selectedImageName = null;
  }

  getApiKey() {
    return window.aiService.getApiKey();
  }

  setApiKey(key) {
    window.aiService.setApiKey(key);
  }

  clearApiKey() {
    window.aiService.clearApiKey();
  }

  hasApiKey() {
    return window.aiService.hasApiKey();
  }

  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const classes = this.store.getClasses();
    const currentClassId = window.appState.currentClassId || (classes[0] ? classes[0].id : '801');
    const isFamilyAuth = window.aiService.isFamilyAuthorized();
    const hasKey = this.hasApiKey();
    const today = new Date().toISOString().split('T')[0];

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
              <p class="text-xs sm:text-sm text-slate-600 font-medium">支援內建 Google Gemini 2.5 Flash 免費極速雲端算力自動解析，或定義標準資料格式供外部 AI 轉換</p>
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

      <!-- 🌟 Flagship Feature: Direct Gemini 2.5 Flash AI Grade Converter (Online Only) -->
      <div class="glass-card rounded-3xl p-5 sm:p-6 border-2 border-pink-400 bg-gradient-to-br from-pink-50/50 via-white to-purple-50/30 shadow-md mb-6">
        <!-- Card Header -->
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-pink-200">
          <div class="flex items-center space-x-2.5">
            <div class="kitty-cat-avatar !w-10 !h-10"></div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
                  <span>🤖 Google Gemini AI 智慧一鍵成績轉換</span>
                  <span class="kitty-bow !w-3.5 !h-3.5"></span>
                </h3>
                <span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-black border border-blue-300 shadow-sm flex items-center gap-1">
                  <span>🌐 限連上網使用</span>
                </span>
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black border border-emerald-300 shadow-sm flex items-center gap-1">
                  <span>⚡ Gemini 2.5 Flash 免費模型</span>
                </span>
              </div>
              <p class="text-xs text-slate-600 font-medium mt-0.5">
                直接貼上任意格式成績文字，或拍下成績單照片，AI 自動對應座號與分數並一鍵匯入！
              </p>
            </div>
          </div>

          <!-- API Key / Family Authorization Status & Setup Button -->
          <div>
            ${(() => {
              if (isFamilyAuth) {
                return `
                  <button onclick="aiHub.openApiKeyModal()" class="px-3.5 py-1.5 rounded-xl bg-pink-100 hover:bg-pink-200 text-pink-900 border border-pink-300 text-xs font-black flex items-center gap-1.5 transition shadow-sm" title="點擊查看親友授權狀態">
                    <span class="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
                    <span>🎂 鑫吾親友專屬 AI 算力（已授權）</span>
                    <i data-lucide="settings" class="w-3.5 h-3.5 text-pink-700"></i>
                  </button>
                `;
              } else if (hasKey) {
                return `
                  <button onclick="aiHub.openApiKeyModal()" class="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black flex items-center gap-1.5 transition shadow-sm" title="點擊修改或測試自訂 API Key">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>🟢 自訂 Gemini API Key 已就緒</span>
                    <i data-lucide="settings" class="w-3.5 h-3.5 text-emerald-600"></i>
                  </button>
                `;
              } else {
                return `
                  <button onclick="aiHub.openApiKeyModal()" class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-black flex items-center gap-1.5 transition shadow-md animate-bounce" title="親友輸入生日解鎖，或自訂個人金鑰">
                    <i data-lucide="lock" class="w-3.5 h-3.5"></i>
                    <span>🎂 親友生日解鎖 / 設定金鑰</span>
                  </button>
                `;
              }
            })()}
          </div>
        </div>

        <!-- Exam Parameters Form Row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <label class="block text-xs font-black text-slate-700 mb-1">目標匯入班級：</label>
            <select id="ai-gemini-class-select" class="w-full bg-white border border-pink-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-500 shadow-sm">
              ${classes.map(c => `
                <option value="${c.id}" ${c.id === currentClassId ? 'selected' : ''}>${c.name} (${c.type === 'homeroom' ? '導師班' : '科任班'})</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-xs font-black text-slate-700 mb-1">測驗/評量名稱：</label>
            <input type="text" id="ai-gemini-exam-name" placeholder="例：第三章因式分解隨堂小考" class="w-full bg-white border border-pink-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-500 shadow-sm">
          </div>

          <div>
            <label class="block text-xs font-black text-slate-700 mb-1">測驗日期：</label>
            <input type="date" id="ai-gemini-exam-date" value="${today}" class="w-full bg-white border border-pink-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-500 shadow-sm font-mono">
          </div>

          <div>
            <label class="block text-xs font-black text-slate-700 mb-1">測驗滿分：</label>
            <input type="number" id="ai-gemini-max-score" value="100" min="10" max="1000" class="w-full bg-white border border-pink-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-pink-500 shadow-sm font-mono">
          </div>
        </div>

        <!-- Input Area: Raw Text or Image Attachment -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-black text-slate-800 flex items-center gap-1">
              <i data-lucide="edit-3" class="w-3.5 h-3.5 text-pink-600"></i>
              <span>輸入任意成績文字（支援口語、Line、Excel 複製內容）：</span>
            </label>
            <div class="flex items-center space-x-2">
              <input type="file" id="ai-gemini-file-input" accept="image/*" onchange="aiHub.handleImageSelect(event)" class="hidden">
              <button onclick="document.getElementById('ai-gemini-file-input').click()" class="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold flex items-center gap-1 transition shadow-sm active:scale-95">
                <i data-lucide="camera" class="w-3.5 h-3.5 text-purple-600"></i>
                <span>📷 拍照 / 附加成績單圖片</span>
              </button>
            </div>
          </div>

          <textarea id="ai-gemini-raw-text" rows="5" placeholder="請在此貼上任意文字，例如：
1號 85 計算粗心
2號 42 十字交乘觀念弱需補救
3號 98
4號 缺考
5號 76
(也可以直接貼上 Excel 複製的整列、Line 記事本、或雜亂的小考筆記，AI 都看得懂！)" class="w-full bg-white border-2 border-pink-200 rounded-2xl p-3 text-xs text-slate-900 font-mono focus:outline-none focus:border-pink-500 shadow-inner leading-relaxed"></textarea>

          <!-- Selected Image Preview Area (Hidden by default) -->
          <div id="ai-gemini-image-preview" class="hidden mt-2 p-2.5 rounded-2xl bg-purple-50/80 border border-purple-200 flex items-center justify-between"></div>
        </div>

        <!-- Action Buttons & Free Tier Notice -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div class="flex items-center space-x-1.5 text-slate-500 text-xs font-medium">
            <span class="text-pink-500 font-black">💡</span>
            <span>算力極度輕量，3~6 位家人親戚共用完全在 Google 官方每日 1,500 次免費額度內！</span>
          </div>

          <div class="flex items-center space-x-2.5">
            <button onclick="aiHub.clearGeminiInput()" class="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition">
              清空
            </button>
            <button id="ai-gemini-convert-btn" onclick="aiHub.convertGradesWithGemini()" class="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs sm:text-sm font-black shadow-lg hover:shadow-xl transition active:scale-95 flex items-center gap-2 cursor-pointer">
              <i data-lucide="sparkles" class="w-4 h-4"></i>
              <span>✨ AI 一鍵智慧轉換並預覽</span>
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

      <!-- Snapshots History / Safety Net -->
      <div class="glass-card rounded-3xl p-5 sm:p-6 border border-pink-200 bg-white shadow-sm mb-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
            <i data-lucide="shield-check" class="w-5 h-5 text-pink-600"></i>
            ⏱️ 本地歷史快照防呆機制（最近 5 筆自動備份）
          </h3>
          <button onclick="aiHub.createManualSnapshot()" class="px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-300 text-xs font-bold flex items-center gap-1 transition shadow-sm">
            <i data-lucide="camera" class="w-3.5 h-3.5"></i> 立即拍攝快照
          </button>
        </div>
        <p class="text-xs text-slate-600 font-medium mb-3">系統會在每次重大異動（批次匯入、刪除班級、清空資料前）自動拍攝本機快照。若操作失誤，可隨時「1 秒無痛復原」：</p>

        <div class="space-y-2">
          ${(() => {
            const snaps = this.store.getSnapshots();
            if (snaps.length === 0) {
              return '<div class="text-xs text-slate-500 py-3 text-center bg-slate-50 rounded-xl">目前尚無歷史快照記錄</div>';
            }
            return snaps.map(s => {
              const classCount = Object.keys(s.data?.classes || {}).length;
              let studentCount = 0;
              Object.values(s.data?.students || {}).forEach(arr => studentCount += (arr?.length || 0));
              const eventCount = s.data?.events?.length || 0;
              return `
                <div class="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-pink-50/50 border border-pink-200 text-xs text-slate-800">
                  <div class="flex items-center space-x-2">
                    <span class="w-2 h-2 rounded-full bg-pink-500"></span>
                    <span class="font-mono font-bold text-slate-700">${s.timeStr}</span>
                    <span class="px-2 py-0.5 rounded-full bg-white text-pink-700 border border-pink-200 font-bold text-[11px]">${s.reason}</span>
                    <span class="text-slate-500 text-[11px]">(${classCount} 班 • ${studentCount} 位學生 • ${eventCount} 筆事件)</span>
                  </div>
                  <button onclick="aiHub.restoreSnapshot(${s.timestamp})" class="px-3 py-1 rounded-lg bg-white border border-pink-300 hover:bg-pink-100 text-pink-800 text-xs font-black shadow-sm transition active:scale-95">
                    ↩️ 還原此版本
                  </button>
                </div>
              `;
            }).join('');
          })()}
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

  createManualSnapshot() {
    const success = this.store.createSnapshot('手動拍攝快照');
    if (success) {
      window.appState.showToast('📸 已成功建立當前狀態本地快照！', 'success');
      this.render('ai-import-export-view');
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

  // --- Gemini API Key Modal ---
  openApiKeyModal() {
    const currentKey = this.getApiKey();
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const currentKey = this.getApiKey();
    const isFamilyAuth = window.aiService.isFamilyAuthorized();

    modalContent.innerHTML = `
      <div class="p-5 sm:p-6 animate-fade-in-up">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-pink-200">
          <div class="flex items-center space-x-2">
            <span class="text-2xl">🎂</span>
            <div>
              <h3 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
                <span>啟用 ClassQuant AI 雲端服務</span>
                <span class="kitty-bow !w-3 !h-3"></span>
              </h3>
              <p class="text-xs text-slate-500 font-medium">親友專屬解鎖或自訂 Google Gemini API Key</p>
            </div>
          </div>
          <button onclick="aiHub.closeGlobalModal()" class="p-1.5 rounded-xl hover:bg-pink-100 text-slate-400 hover:text-slate-700 transition">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- 1. Family Birthday Passcode Challenge Card -->
        <div class="p-4 rounded-2xl bg-gradient-to-br from-pink-50 via-rose-50/50 to-purple-50 border-2 border-pink-300 shadow-sm mb-4">
          <div class="flex items-center space-x-2 mb-1.5">
            <span class="px-2 py-0.5 rounded-full bg-pink-500 text-white font-black text-[11px]">親友專屬解鎖</span>
            <h4 class="text-xs sm:text-sm font-black text-pink-950">免設定！回答問題即可直接使用鑫吾的專屬 AI 算力</h4>
          </div>
          <p class="text-xs text-slate-600 font-medium mb-3 leading-relaxed">
            親友家人完全不需要申請任何 Google 帳號或金鑰，只要回答通關問題，即可終身啟用鑫吾贊助的 Google Gemini 雲端算力：
          </p>

          <div class="p-3 bg-white rounded-xl border border-pink-200 mb-3">
            <label class="block text-xs font-black text-pink-900 mb-1.5 flex items-center gap-1">
              <i data-lucide="help-circle" class="w-3.5 h-3.5 text-pink-600"></i>
              <span>通關問題：請問【鑫吾的生日】是幾月幾號？（4 位數字）</span>
            </label>
            <div class="flex items-center space-x-2">
              <input type="text" id="family-birthday-input" maxlength="4" placeholder="例: 0101" class="w-32 bg-pink-50/50 border-2 border-pink-300 rounded-xl px-3 py-2 text-center text-sm font-black tracking-widest text-slate-900 focus:outline-none focus:border-pink-500 font-mono shadow-inner">
              <button onclick="aiHub.verifyFamilyBirthday()" class="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs font-black shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer">
                <i data-lucide="unlock" class="w-3.5 h-3.5"></i>
                <span>驗證並啟用</span>
              </button>
            </div>
          </div>

          <div id="family-verify-feedback" class="${isFamilyAuth ? '' : 'hidden'} p-2.5 rounded-xl text-xs font-bold">
            ${isFamilyAuth ? `
              <div class="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <span>✅ 此裝置已通過「鑫吾生日」驗證，正使用專屬 AI 算力！</span>
                </div>
                <button onclick="aiHub.revokeFamilyAuth()" class="px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition">
                  取消授權
                </button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 2. Manual Personal Key Accordion (For non-family or custom keys) -->
        <details class="group rounded-2xl border border-pink-200 bg-white p-3.5 shadow-sm">
          <summary class="text-xs font-black text-slate-700 cursor-pointer flex items-center justify-between list-none">
            <span class="flex items-center gap-1.5">
              <i data-lucide="key" class="w-3.5 h-3.5 text-slate-500"></i>
              <span>若不知道答案，或欲使用自己獨立的 Google Gemini API Key：</span>
            </span>
            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 group-open:rotate-180 transition"></i>
          </summary>

          <div class="mt-3 pt-3 border-t border-pink-100 space-y-3 text-xs text-slate-700">
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 leading-relaxed font-medium">
              <span>💡 您可前往官方 <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-pink-600 font-bold underline">Google AI Studio</a> 申請自己的免費金鑰（免綁卡、每日 1,500 次），並貼在下方：</span>
            </div>

            <div>
              <label class="block font-black text-slate-800 mb-1">個人 Gemini API Key：</label>
              <div class="relative">
                <input type="password" id="gemini-api-key-input" value="${isFamilyAuth ? '' : currentKey}" placeholder="貼上個人 API Key (AIzaSy...)" class="w-full bg-slate-50 border-2 border-pink-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-pink-500 pr-10 shadow-inner font-bold">
                <button type="button" onclick="aiHub.togglePasswordVisibility('gemini-api-key-input')" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1">
                  <i data-lucide="eye" class="w-4 h-4"></i>
                </button>
              </div>
            </div>

            <div id="gemini-test-result" class="hidden p-2.5 rounded-xl text-xs font-bold"></div>

            <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div>
                ${currentKey ? `
                  <button onclick="aiHub.clearApiKeyFromModal()" class="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition">
                    🗑️ 清除已存金鑰
                  </button>
                ` : ''}
              </div>
              <div class="flex items-center space-x-2">
                <button id="btn-test-gemini-key" onclick="aiHub.testApiKeyConnection()" class="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 text-xs font-bold transition flex items-center gap-1 shadow-sm">
                  <i data-lucide="zap" class="w-3.5 h-3.5"></i> 測試連線
                </button>
                <button onclick="aiHub.saveApiKeyFromModal()" class="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black shadow-md transition flex items-center gap-1">
                  <i data-lucide="check" class="w-4 h-4"></i> 儲存自訂金鑰
                </button>
              </div>
            </div>
          </div>
        </details>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  verifyFamilyBirthday() {
    const input = document.getElementById('family-birthday-input');
    const feedback = document.getElementById('family-verify-feedback');
    if (!input || !feedback) return;

    const val = input.value.trim();
    if (!val) {
      window.appState.showToast('請輸入 4 位生日數字', 'danger');
      return;
    }

    if (val === '0228') {
      const ok = window.aiService.verifyFamilyPasscode(val);
      feedback.className = 'p-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 block';
      
      if (window.aiService.encryptedKey) {
        feedback.innerHTML = `<span>🎉 驗證成功！已為您啟用鑫吾的專屬 Google Gemini AI 算力，即開即用！</span>`;
        window.appState.showToast('🎉 通關成功！已為您解鎖鑫吾的專屬 AI 算力！', 'success');
        setTimeout(() => {
          this.closeGlobalModal();
          this.render('ai-hub-view');
        }, 1000);
      } else {
        // If master key has not been baked into code yet
        feedback.innerHTML = `
          <div>
            <div class="text-emerald-900 font-black mb-1">🎉 鑫吾生日驗證通過！</div>
            <p class="text-slate-700 font-medium mb-2">這是首次初始化設定，請鑫吾在下方輸入您的 Gemini API Key 完成金鑰綁定（日後所有輸入 0228 的親友皆可直接解鎖調用）：</p>
            <div class="flex items-center space-x-2">
              <input type="password" id="master-key-setup-input" placeholder="貼上您的 Gemini API Key (AIzaSy...)" class="flex-1 px-3 py-1.5 border border-pink-300 rounded-lg text-xs font-mono font-bold bg-white">
              <button onclick="aiHub.saveMasterKeyFromInit()" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0">綁定並啟用</button>
            </div>
          </div>
        `;
      }
      feedback.classList.remove('hidden');
    } else {
      feedback.className = 'p-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 block';
      feedback.innerHTML = `<span>❌ 生日不正確。若非親友，請點擊下方展開「若不知道答案，或欲使用自己獨立的 API Key」。</span>`;
      feedback.classList.remove('hidden');
      window.appState.showToast('生日驗證未通過，請檢查輸入或自行設定金鑰', 'danger');
    }
    if (window.lucide) window.lucide.createIcons();
  }

  saveMasterKeyFromInit() {
    const input = document.getElementById('master-key-setup-input');
    if (!input) return;
    const key = input.value.trim();
    if (!key) {
      window.appState.showToast('請輸入有效金鑰', 'danger');
      return;
    }
    window.aiService.setApiKey(key);
    localStorage.setItem('classquant_family_authorized', 'true');
    window.appState.showToast('🎉 已成功綁定專屬 Gemini API Key！所有親友皆可直接使用！', 'success');
    this.closeGlobalModal();
    this.render('ai-hub-view');
  }

  revokeFamilyAuth() {
    if (confirm('確定要取消此裝置的親友 AI 授權嗎？')) {
      window.aiService.clearApiKey();
      window.appState.showToast('已取消授權', 'info');
      this.closeGlobalModal();
      this.render('ai-hub-view');
    }
  }

  togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  }

  closeGlobalModal() {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (modal) modal.classList.add('hidden');
    if (modalContent) modalContent.innerHTML = '';
  }

  async testApiKeyConnection() {
    const input = document.getElementById('gemini-api-key-input');
    const resultBox = document.getElementById('gemini-test-result');
    const btn = document.getElementById('btn-test-gemini-key');
    if (!input || !resultBox) return;

    const key = input.value.trim();
    if (!key) {
      window.appState.showToast('請先貼上 API Key', 'danger');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="animate-spin mr-1">⏳</span> 連線中...`;
    }

    resultBox.className = 'p-2.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1.5';
    resultBox.innerHTML = `<span>⏳ 正在向 Google Gemini API 端點發送測試封包...</span>`;
    resultBox.classList.remove('hidden');

    try {
      let model = 'gemini-3.6-flash';
      let res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: '1+1' }] }]
        })
      });

      if (!res.ok && res.status === 404) {
        model = 'gemini-2.5-flash';
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: '1+1' }] }]
          })
        });
      }

      if (res.ok) {
        resultBox.className = 'p-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5';
        resultBox.innerHTML = `<span>✅ 驗證成功！Google Gemini 雲端 AI 服務連線正常，可立即使用。</span>`;
        window.appState.showToast('✅ Gemini API Key 驗證成功！', 'success');
      } else {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.error?.message || `HTTP ${res.status} 錯誤`;
        resultBox.className = 'p-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1.5';
        resultBox.innerHTML = `<span>❌ 驗證失敗：${msg}</span>`;
        window.appState.showToast(`❌ 金鑰無效：${msg}`, 'danger');
      }
    } catch (e) {
      resultBox.className = 'p-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1.5';
      resultBox.innerHTML = `<span>❌ 網路連線錯誤：${e.message}</span>`;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="zap" class="w-3.5 h-3.5"></i> 測試連線`;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  saveApiKeyFromModal() {
    const input = document.getElementById('gemini-api-key-input');
    if (!input) return;
    const key = input.value.trim();
    if (!key) {
      window.appState.showToast('請輸入有效金鑰', 'danger');
      return;
    }
    this.setApiKey(key);
    window.appState.showToast('🎉 Google Gemini API Key 已保存於此裝置！', 'success');
    this.closeGlobalModal();
    this.render('ai-hub-view');
  }

  clearApiKeyFromModal() {
    if (confirm('確定要清除儲存在此裝置的 API Key 嗎？')) {
      this.clearApiKey();
      window.appState.showToast('已清除 API Key', 'info');
      this.closeGlobalModal();
      this.render('ai-hub-view');
    }
  }

  // --- Image Upload & Camera Capture Handling ---
  handleImageSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      window.appState.showToast('請選擇圖檔格式 (.jpg, .png, .webp)', 'danger');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      this.selectedImageBase64 = dataUrl.split(',')[1];
      this.selectedImageMime = file.type;
      this.selectedImageName = file.name;

      const previewBox = document.getElementById('ai-gemini-image-preview');
      if (previewBox) {
        previewBox.innerHTML = `
          <div class="flex items-center space-x-2.5 min-w-0">
            <img src="${dataUrl}" class="w-10 h-10 object-cover rounded-xl border border-purple-300 shadow-sm shrink-0">
            <div class="min-w-0">
              <p class="text-xs font-black text-purple-950 truncate">${file.name}</p>
              <p class="text-[11px] text-purple-700 font-medium">已就緒，AI 將結合文字與本張圖片同步解析！</p>
            </div>
          </div>
          <button onclick="aiHub.clearSelectedImage()" class="px-2 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold transition flex items-center gap-1 shadow-sm shrink-0">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            <span>移除圖片</span>
          </button>
        `;
        previewBox.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
      }
      window.appState.showToast('📷 已成功載入成績單圖檔！', 'success');
    };
    reader.readAsDataURL(file);
  }

  clearSelectedImage() {
    this.selectedImageBase64 = null;
    this.selectedImageMime = null;
    this.selectedImageName = null;
    const fileInput = document.getElementById('ai-gemini-file-input');
    if (fileInput) fileInput.value = '';
    const previewBox = document.getElementById('ai-gemini-image-preview');
    if (previewBox) {
      previewBox.innerHTML = '';
      previewBox.classList.add('hidden');
    }
  }

  clearGeminiInput() {
    const textArea = document.getElementById('ai-gemini-raw-text');
    if (textArea) textArea.value = '';
    this.clearSelectedImage();
  }

  // --- Core Gemini 2.5 Flash Grade Conversion Engine ---
  async convertGradesWithGemini() {
    if (!navigator.onLine) {
      window.appState.showToast('⚠️ 目前處於離線狀態，AI 智慧辨識需連上網路！', 'danger');
      return;
    }

    if (!window.aiService.hasApiKey()) {
      window.appState.showToast('🔑 尚未解鎖或設定 AI 金鑰，請先回答親友通關密語！', 'info');
      this.openApiKeyModal();
      return;
    }

    const classId = document.getElementById('ai-gemini-class-select')?.value || window.appState.currentClassId;
    const examName = document.getElementById('ai-gemini-exam-name')?.value.trim() || '隨堂測驗';
    const examDate = document.getElementById('ai-gemini-exam-date')?.value || new Date().toISOString().split('T')[0];
    const maxScore = Number(document.getElementById('ai-gemini-max-score')?.value) || 100;
    const rawText = document.getElementById('ai-gemini-raw-text')?.value.trim();

    if (!rawText && !this.selectedImageBase64) {
      window.appState.showToast('⚠️ 請輸入成績文字，或拍照/附加成績單圖片！', 'danger');
      return;
    }

    const convertBtn = document.getElementById('ai-gemini-convert-btn');
    const originalBtnText = convertBtn ? convertBtn.innerHTML : '';
    if (convertBtn) {
      convertBtn.disabled = true;
      convertBtn.innerHTML = `<span class="animate-spin mr-1">⏳</span> 正在呼叫 Gemini 2.5 Flash 解析中...`;
    }

    try {
      const images = [];
      if (this.selectedImageBase64) {
        images.push({
          mimeType: this.selectedImageMime || 'image/jpeg',
          data: this.selectedImageBase64
        });
      }

      const promptText = `
你是一位專業的台灣國中教務與評量數據分析助理。
請從使用者提供的學生測驗成績記錄（文字或圖片）中，精確抽取每位學生的成績資料。

【測驗背景資訊】：
- 班級編號：${classId}
- 測驗名稱：${examName}
- 測驗滿分：${maxScore}
- 測驗日期：${examDate}

【輸入內容】：
${rawText || '(請見所附成績單圖片)'}

【規則】：
1. seat_no: 座號 (必須為 1 以上之整數)。
2. score: 分數 (數字，0 ~ ${maxScore}。若學生註記缺考、公假、未考，請填 0 並在 note 註明「缺考」)。
3. note: 備註 (若無備註可填空字串 "")。
4. 請嚴格依照 JSON Schema 格式輸出。
`;

      const responseSchema = {
        type: "OBJECT",
        properties: {
          assessment_name: { type: "STRING" },
          max_score: { type: "NUMBER" },
          records: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                seat_no: { type: "INTEGER" },
                score: { type: "NUMBER" },
                note: { type: "STRING" }
              },
              required: ["seat_no", "score"]
            }
          }
        },
        required: ["records"]
      };

      const resultText = await window.aiService.generateContent({
        prompt: promptText,
        systemInstruction: "你是一位專業的台灣國中教務與評量數據分析助理。請嚴格輸出符合 Schema 的 JSON 格式。",
        responseSchema,
        images
      });

      const resultJson = JSON.parse(resultText);
      const records = resultJson.records || [];

      if (records.length === 0) {
        throw new Error('未能在文字或圖片中辨識出任何學生座號與分數');
      }

      // Sort by seat_no ascending
      records.sort((a, b) => a.seat_no - b.seat_no);

      // Open confirmation preview modal
      this.openGradePreviewModal({
        classId,
        examName: resultJson.assessment_name || examName,
        examDate,
        maxScore: resultJson.max_score || maxScore,
        records
      });

    } catch (err) {
      console.error('Gemini conversion error:', err);
      if (err.message === 'AUTH_REQUIRED') {
        window.appState.showToast('🔑 尚未解鎖 AI 服務，請先回答親友通關密語！', 'info');
        this.openApiKeyModal();
      } else {
        window.appState.showToast(`❌ AI 轉換失敗：${err.message}`, 'danger');
      }
    } finally {
      if (convertBtn) {
        convertBtn.disabled = false;
        convertBtn.innerHTML = originalBtnText;
      }
    }
  }

  // --- Grade Preview & Confirmation Modal ---
  openGradePreviewModal(data) {
    const { classId, examName, examDate, maxScore, records } = data;
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const roster = this.store.getRoster(classId) || [];
    const cls = this.store.getClass(classId);

    // Calculate metrics
    const scoresOnly = records.map(r => Number(r.score) || 0);
    const avgScore = scoresOnly.length > 0 ? (scoresOnly.reduce((a, b) => a + b, 0) / scoresOnly.length).toFixed(1) : 0;
    const maxScoreVal = scoresOnly.length > 0 ? Math.max(...scoresOnly) : 0;
    const minScoreVal = scoresOnly.length > 0 ? Math.min(...scoresOnly) : 0;

    modalContent.innerHTML = `
      <div class="p-5 sm:p-6 animate-fade-in-up">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-pink-200">
          <div class="flex items-center space-x-2">
            <span class="text-2xl">📋</span>
            <div>
              <h3 class="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
                <span>核對與確認成績（${examName}）</span>
                <span class="kitty-bow !w-3 !h-3"></span>
              </h3>
              <p class="text-xs text-slate-500 font-medium">請核對座號、姓名與分數，點擊「確認寫入」即自動入庫！</p>
            </div>
          </div>
          <button onclick="aiHub.closeGlobalModal()" class="p-1.5 rounded-xl hover:bg-pink-100 text-slate-400 hover:text-slate-700 transition">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Meta info & Stats bar -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div class="p-2.5 rounded-2xl bg-pink-50 border border-pink-200 text-center">
            <div class="text-[11px] text-pink-700 font-bold">班級與名稱</div>
            <div class="text-xs font-black text-slate-900 truncate">${cls ? cls.name : classId} • ${examName}</div>
          </div>
          <div class="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-center">
            <div class="text-[11px] text-blue-700 font-bold">辨識人數</div>
            <div class="text-xs font-black text-slate-900">${records.length} 位學生</div>
          </div>
          <div class="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
            <div class="text-[11px] text-emerald-700 font-bold">全班均分</div>
            <div class="text-xs font-black text-emerald-700 font-mono">${avgScore} 分</div>
          </div>
          <div class="p-2.5 rounded-2xl bg-purple-50 border border-purple-200 text-center">
            <div class="text-[11px] text-purple-700 font-bold">高分 / 低分</div>
            <div class="text-xs font-black text-slate-900 font-mono">${maxScoreVal} / ${minScoreVal}</div>
          </div>
        </div>

        <!-- Scrollable Student Score Table -->
        <div class="max-h-72 overflow-y-auto rounded-2xl border border-pink-200 mb-4 shadow-inner">
          <table class="w-full text-xs text-left">
            <thead>
              <tr class="bg-pink-100 text-pink-900 font-black sticky top-0 border-b border-pink-200">
                <th class="p-2.5 text-center w-14">座號</th>
                <th class="p-2.5 w-24">學生姓名</th>
                <th class="p-2.5 text-center w-24">分數 (可微調)</th>
                <th class="p-2.5">備註 / 評語 (可編輯)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-pink-100 bg-white">
              ${records.map(r => {
                const student = roster.find(s => s.seatNo === r.seat_no);
                const name = student ? student.name : '<span class="text-amber-600 font-bold">(新座號)</span>';
                return `
                  <tr class="hover:bg-pink-50/50 transition">
                    <td class="p-2 text-center font-mono font-black text-slate-800">
                      <span class="w-6 h-6 rounded-lg bg-pink-100 text-pink-900 inline-flex items-center justify-center font-bold text-xs">
                        ${String(r.seat_no).padStart(2, '0')}
                      </span>
                    </td>
                    <td class="p-2 font-black text-slate-900">${name}</td>
                    <td class="p-2 text-center">
                      <input type="number" id="preview-score-${r.seat_no}" value="${r.score}" min="0" max="${maxScore}" class="w-16 px-2 py-1 text-center font-black rounded-lg border border-pink-300 focus:outline-none focus:border-pink-500 font-mono bg-pink-50/40">
                    </td>
                    <td class="p-2">
                      <input type="text" id="preview-note-${r.seat_no}" value="${r.note || ''}" placeholder="無備註" class="w-full px-2 py-1 text-xs rounded-lg border border-pink-200 focus:outline-none focus:border-pink-500 text-slate-800">
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Confirmation Actions -->
        <div class="flex items-center justify-between gap-3 pt-3 border-t border-pink-100">
          <button onclick="aiHub.closeGlobalModal()" class="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-bold transition">
            ✕ 放棄重試
          </button>
          <button onclick="aiHub.confirmAndSaveGrades('${classId}', '${encodeURIComponent(examName)}', '${examDate}', ${maxScore}, ${encodeURIComponent(JSON.stringify(records.map(r => r.seat_no)))})" class="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs sm:text-sm font-black shadow-lg hover:shadow-xl transition active:scale-95 flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="check" class="w-4 h-4"></i>
            <span>✅ 確認寫入成績冊（自動建立安全快照）</span>
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  confirmAndSaveGrades(classId, encodedName, examDate, maxScore, encodedSeatNos) {
    const examName = decodeURIComponent(encodedName);
    const seatNos = JSON.parse(decodeURIComponent(encodedSeatNos));

    const scoresMap = {};
    const notesMap = {};

    seatNos.forEach(sNo => {
      const scoreInput = document.getElementById(`preview-score-${sNo}`);
      const noteInput = document.getElementById(`preview-note-${sNo}`);
      if (scoreInput) {
        scoresMap[sNo] = Number(scoreInput.value) || 0;
      }
      if (noteInput && noteInput.value.trim()) {
        notesMap[sNo] = noteInput.value.trim();
      }
    });

    // 1. Create safety snapshot before writing
    this.store.createSnapshot(`AI 智慧匯入小考：${examName}`);

    // 2. Save assessment into store
    this.store.addAssessment(classId, {
      name: examName,
      date: examDate,
      maxScore: maxScore,
      scores: scoresMap,
      notes: notesMap
    });

    this.closeGlobalModal();
    this.clearGeminiInput();

    window.appState.showToast(`🎉 成功匯入【${examName}】（共 ${Object.keys(scoresMap).length} 位學生成績）！`, 'success');
    this.render('ai-hub-view');
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

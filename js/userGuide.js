/**
 * Visual Illustrated User Guide (圖文操作說明書)
 * Complete illustrated step-by-step manual including Roster Management,
 * Mobile 1-Second Zero-Scroll Mode, Timetable auto-switch, and Google Cloud backup.
 */

class UserGuideView {
  constructor(store) {
    this.store = store;
  }

  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const isOAA = window.appStore && window.appStore.getTheme() === 'oaa';

    const cardClass = isOAA
      ? 'glass-card rounded-3xl p-6 border border-amber-500/40 flex flex-col justify-between bg-[#220c19] text-white shadow-lg'
      : 'glass-card rounded-3xl p-6 border border-pink-200 flex flex-col justify-between bg-white shadow-sm';

    const primaryCardClass = isOAA
      ? 'glass-card rounded-3xl p-6 border-2 border-amber-500/70 flex flex-col justify-between bg-[#240e1b] text-white shadow-xl'
      : 'glass-card rounded-3xl p-6 border-2 border-pink-300 flex flex-col justify-between bg-white shadow-sm';

    const innerBoxClass = isOAA
      ? 'p-3.5 rounded-2xl bg-[#14050d] border border-amber-500/30 text-xs space-y-2 mb-3 text-slate-200 font-medium'
      : 'p-3.5 rounded-2xl bg-pink-50 border border-pink-200 text-xs space-y-2 mb-3 text-slate-800 font-medium';

    const innerNeutralBoxClass = isOAA
      ? 'p-3.5 rounded-2xl bg-[#14050d] border border-amber-500/30 text-xs space-y-1.5 mb-3 text-slate-200 font-medium'
      : 'p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 mb-3 text-slate-800 font-medium';

    const innerSkyBoxClass = isOAA
      ? 'p-3.5 rounded-2xl bg-[#0a1526] border border-cyan-500/40 text-xs space-y-1.5 mb-3 text-cyan-100 font-medium'
      : 'p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 text-xs space-y-1.5 mb-3 text-sky-900 font-medium';

    const innerEmeraldBoxClass = isOAA
      ? 'p-3.5 rounded-2xl bg-[#071d14] border border-emerald-500/40 text-xs space-y-1.5 mb-3 text-emerald-100 font-medium'
      : 'p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1.5 mb-3 text-emerald-900 font-medium';

    const innerBlueBoxClass = isOAA
      ? 'p-3.5 rounded-2xl bg-[#09152b] border border-blue-500/40 text-xs space-y-1.5 mb-3 text-blue-100 font-medium'
      : 'p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs space-y-1.5 mb-3 text-blue-900 font-medium';

    const innerPurpleBoxClass = isOAA
      ? 'p-3.5 rounded-2xl bg-[#1b0b2e] border border-purple-500/40 text-xs space-y-1.5 mb-3 text-purple-100 font-medium'
      : 'p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 text-xs space-y-1.5 mb-3 text-purple-900 font-medium';

    const titleClass = isOAA ? 'text-lg font-black text-white mb-2' : 'text-lg font-black text-slate-900 mb-2';
    const subDescClass = isOAA ? 'text-xs text-amber-200/90 mb-3 leading-relaxed font-medium' : 'text-xs text-slate-600 mb-3 leading-relaxed font-medium';

    const badgeStep = (num, text, sanrioColor = 'bg-pink-600') => {
      if (isOAA) {
        return `
          <span class="px-3 py-1 rounded-xl bg-rose-950 text-amber-300 border border-amber-500/50 font-black text-xs font-mono">
            STEP ${num}
          </span>
        `;
      }
      return `<span class="px-3 py-1 rounded-xl ${sanrioColor} text-white font-black text-xs">${text}</span>`;
    };

    container.innerHTML = `
      <!-- Guide Header Banner -->
      ${isOAA ? `
        <div class="glass-card rounded-3xl p-4 sm:p-8 mb-6 border border-amber-500/50 relative overflow-hidden bg-gradient-to-r from-[#240e1b] via-[#1a0813] to-[#290e1c] shadow-md text-white">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div class="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 flex-1">
              <div class="text-2xl sm:text-4xl p-2 sm:p-2.5 rounded-2xl bg-black/40 border border-amber-500/50 shadow-inner shrink-0 self-start">🏛️</div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="text-lg sm:text-2xl font-black text-white tracking-wide flex flex-wrap items-center gap-2">
                    ClassQuant Hub • 高度育成操作指南與 S-SYSTEM 手冊
                  </h2>
                  <span class="text-xs px-2 py-0.5 rounded font-mono font-bold bg-rose-950 text-amber-300 border border-amber-500/50 whitespace-nowrap shrink-0">COTE VER.</span>
                </div>
                <p class="text-xs sm:text-sm text-amber-200/80 mt-1 font-medium">
                  以實力至上主義為核心設計 • 課堂零滑動極速記點、S-SYSTEM 名冊匯入、學業品格雙軌量化與 Google 雲端定期備份
                </p>
              </div>
            </div>
            
            <div class="flex items-center space-x-2 shrink-0 self-start md:self-auto">
              <button onclick="window.print()" class="px-4 py-2 rounded-2xl bg-rose-950/80 text-amber-300 border border-amber-500/50 text-xs font-bold hover:bg-rose-900 transition flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer">
                <i data-lucide="printer" class="w-4 h-4 shrink-0"></i> 列印 / 存為 PDF
              </button>
            </div>
          </div>
        </div>
      ` : `
        <div class="glass-card rounded-3xl p-4 sm:p-8 mb-6 border border-pink-300 relative overflow-hidden bg-gradient-to-r from-pink-50 via-white to-sky-50 shadow-sm">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div class="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 flex-1">
              <div class="flex items-center gap-1.5 shrink-0 self-start">
                <div class="kitty-cat-avatar !w-9 !h-9 sm:!w-10 sm:!h-10 shrink-0" title="Hello Kitty"></div>
                <div class="sanrio-twinstars-badge !w-9 !h-9 sm:!w-10 sm:!h-10 shrink-0" title="Little Twin Stars"></div>
                <div class="sanrio-kuromi-badge !w-9 !h-9 sm:!w-10 sm:!h-10 shrink-0" title="Kuromi"></div>
                <div class="sanrio-cinnamoroll-badge !w-11 !h-10 hidden sm:inline-block shrink-0" title="Cinnamoroll"></div>
                <div class="sanrio-mymelody-badge !w-9 !h-10 hidden sm:inline-block shrink-0" title="My Melody"></div>
              </div>
              <div class="min-w-0 flex-1">
                <h2 class="text-lg sm:text-2xl font-black text-pink-600 flex flex-wrap items-center gap-2">
                  <span>ClassQuant Hub • 教師實戰圖文教學手冊</span>
                  <span class="kitty-bow shrink-0"></span>
                </h2>
                <p class="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                  以「人本」為核心設計 • 課堂 1~2 秒隨手記、全班名冊 1 秒批次導入、家長晤談與 Google 雲端定期備份
                </p>
              </div>
            </div>
            
            <div class="flex items-center space-x-2 shrink-0 self-start md:self-auto">
              <button onclick="window.print()" class="px-4 py-2 rounded-2xl bg-pink-100 text-pink-700 border border-pink-300 text-xs font-bold hover:bg-pink-200 transition flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer">
                <i data-lucide="printer" class="w-4 h-4 shrink-0"></i> 列印 / 存為 PDF
              </button>
            </div>
          </div>
        </div>
      `}

      <!-- 8 Key Core Steps Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        
        <!-- Step 1: 班級與學生名冊管理 -->
        <div class="${primaryCardClass}">
          <div>
            <div class="flex items-center justify-between mb-3">
              ${badgeStep('01', '必讀重點', 'bg-pink-600')}
              <span class="${isOAA ? 'text-amber-300 font-mono font-bold' : 'text-pink-600 font-bold'} text-xs">👥 名單與班級管理</span>
            </div>
            <h3 class="${titleClass}">如何新增班級與匯入學生名單？</h3>
            <p class="${subDescClass}">
              點擊上方主導覽列的 <strong>「👥 班級與學生」</strong> ➔「班級名單管理」：
            </p>
            <div class="${innerBoxClass}">
              <div><strong>1. 1秒批次貼上名單</strong>：點擊「📋 1秒批次貼上名單」，直接從 Excel 或 Word 複製整班學生名字貼上，系統自動依序排座號！</div>
              <div><strong>2. 新增授課班級</strong>：點擊「➕ 新增班級」，輸入班級名稱並選擇為「導師班」或「科任班」。</div>
              <div><strong>3. 修改學生姓名與性別</strong>：在名冊清單中直接點擊學生名字輸入框即可即時修改，或點擊性別按鈕一鍵切換。</div>
            </div>
          </div>
        </div>

        <!-- Step 2: 手機端 1~2 秒極速課堂記點 -->
        <div class="${cardClass}">
          <div>
            <div class="flex items-center justify-between mb-3">
              ${badgeStep('02', '課堂現場', 'bg-pink-500')}
              ${isOAA ? '<span class="text-amber-300 font-mono font-bold text-xs">⚡ 實時點數操作</span>' : '<span class="kitty-bow"></span>'}
            </div>
            <h3 class="${titleClass}">手機端「零滑動 1~2 秒極速記點」</h3>
            <p class="${subDescClass}">
              課堂突發事件（如學生分心），先制止後，隨手花 1 秒記錄：
            </p>
            <div class="${innerBoxClass}">
              <div><strong>• 零滑動一屏掌控</strong>：手機端採用緊湊 5 欄排列，全班 30 位學生座位完整呈現在一屏內，不用上下漫長滑動。</div>
              <div><strong>• 1 秒記錄手感</strong>：點一下學生座號（亮起反饋） $\rightarrow$ 點一下底部標籤（如：<code>分心 -1</code>） $\rightarrow$ 即刻完成！</div>
            </div>
          </div>
        </div>

        <!-- Step 3: 學業與品格雙軌分數 -->
        <div class="${cardClass}">
          <div>
            <div class="flex items-center justify-between mb-3">
              ${badgeStep('03', '雙軌量化', 'bg-pink-500')}
              ${isOAA ? '<span class="text-amber-300 font-mono font-bold text-xs">⚖️ OAA 雙軌指標</span>' : '<div class="sanrio-kitty-badge !w-6 !h-6"></div>'}
            </div>
            <h3 class="${titleClass}">學業 vs 品格 獨立雙指標</h3>
            <p class="${subDescClass}">
              每位學生的表現清楚分為兩大獨立分數，不再混淆：
            </p>
            <div class="${innerNeutralBoxClass}">
              <div class="flex items-center justify-between">
                <span>💯 <strong>平時成績</strong>：基準分 + 加扣點即時換算</span>
                ${isOAA ? '<span class="px-2 py-0.5 rounded bg-blue-950 text-cyan-300 border border-cyan-500/50 font-bold">86分</span>' : '<span class="px-2 py-0.5 rounded badge-academic font-bold">86分</span>'}
              </div>
              <div class="flex items-center justify-between">
                <span>${isOAA ? '🏛️' : '🎀'} <strong>品格常規</strong>：課堂常規與責任淨點數</span>
                ${isOAA ? '<span class="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/50 font-bold">+6點</span>' : '<span class="px-2 py-0.5 rounded badge-character-pos font-bold">+6點</span>'}
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: 標籤自訂與刪除預設 -->
        <div class="${cardClass}">
          <div>
            <div class="flex items-center justify-between mb-3">
              ${badgeStep('04', '標籤管理', 'bg-pink-500')}
              ${isOAA ? '<span class="text-amber-300 font-mono font-bold text-xs">⚙️ 自訂點數項目</span>' : '<div class="sanrio-kuromi-badge !w-6 !h-6"></div>'}
            </div>
            <h3 class="${titleClass}">常用標籤自訂（預設可自由刪除）</h3>
            <p class="${subDescClass}">
              點擊記點列右上角 <strong>「⚙️ 自訂/管理標籤」</strong>：
            </p>
            <div class="${innerNeutralBoxClass}">
              <div>• <strong>新增自訂</strong>：輸入標籤名稱與分數（如：<code>解題特優 +2</code>、<code>發呆 -1</code>）。</div>
              <div>• <strong>刪除標籤</strong>：用不到的預設標籤點垃圾桶即可永久移除。</div>
              <div>• <strong>純記事標籤</strong>：分值設為 <code>0</code> 即可作為純粹文字記錄。</div>
            </div>
          </div>
        </div>

        <!-- Step 5: 課表自動切換與手動調課 -->
        <div class="${isOAA ? cardClass : 'glass-card rounded-3xl p-6 border border-sky-200 flex flex-col justify-between bg-white shadow-sm'}">
          <div>
            <div class="flex items-center justify-between mb-3">
              ${badgeStep('05', '時間感知', 'bg-sky-500')}
              <i data-lucide="clock" class="w-4 h-4 ${isOAA ? 'text-amber-400' : 'text-sky-500'}"></i>
            </div>
            <h3 class="${titleClass}">課表智慧感知與調課切換</h3>
            <p class="${subDescClass}">
              系統根據真實時間自動載入上課班級（如週二第3節自動切至 803 班）：
            </p>
            <div class="${innerSkyBoxClass}">
              <div>• <strong>下課提示</strong>：保留上節班級方便補記，並倒數下節課。</div>
              <div>• <strong>突發調課</strong>：右上角下拉選單隨時手動換班，事後點「恢復課表切換」。</div>
            </div>
          </div>
        </div>

        <!-- Step 6: 學生具體事件記事與檢索 -->
        <div class="${isOAA ? cardClass : 'glass-card rounded-3xl p-6 border border-emerald-200 flex flex-col justify-between bg-white shadow-sm'}">
          <div>
            <div class="flex items-center justify-between mb-3">
              ${badgeStep('06', '具體記事', 'bg-emerald-600')}
              <i data-lucide="book-open" class="w-4 h-4 ${isOAA ? 'text-emerald-400' : 'text-emerald-600'}"></i>
            </div>
            <h3 class="${titleClass}">學生記事與全文檢索</h3>
            <p class="${subDescClass}">
              記錄「某同學在某日做了某事」，隨時查閱歷史：
            </p>
            <div class="${innerEmeraldBoxClass}">
              <div>• <strong>登記記事</strong>：點「📝 登記新記事」，選日期、學生並詳述事證。</div>
              <div>• <strong>全文檢索</strong>：輸入「缺交」、「進步」、「電話」秒級搜尋並一鍵複製。</div>
            </div>
          </div>
        </div>

        <!-- Step 7: Google 雲端定期備份 & JSON 本地同步 -->
        <div class="${isOAA ? cardClass : 'glass-card rounded-3xl p-6 border border-blue-200 flex flex-col justify-between bg-white shadow-sm'}">
          <div>
            <div class="flex items-center justify-between mb-3">
              ${badgeStep('07', '雲端備份', 'bg-blue-600')}
              <i data-lucide="cloud-upload" class="w-4 h-4 ${isOAA ? 'text-cyan-400' : 'text-blue-600'}"></i>
            </div>
            <h3 class="${titleClass}">Google 雲端定期備份與 JSON 同步</h3>
            <p class="${subDescClass}">
              在校用手機快速記點，自動定期備份至 Google 試算表／Google 表單，完整保護自訂標籤、名單與分數：
            </p>
            <div class="${innerBlueBoxClass}">
              <div>• <strong>Google 表單／試算表備份</strong>：支援手動立即備份、變動自動防抖備份，與每日／每週定期排程備份。</div>
              <div>• <strong>完整雙向還原與 JSON 匯出</strong>：更換裝置時可一鍵從雲端快照或 .json 檔案無痛還原。</div>
            </div>
          </div>
        </div>

        <!-- Step 8: 段考一鍵結算 Excel & 歷史累積 -->
        <div class="${isOAA ? cardClass : 'glass-card rounded-3xl p-6 border border-purple-200 flex flex-col justify-between bg-white shadow-sm'}">
          <div>
            <div class="flex items-center justify-between mb-3">
              ${badgeStep('08', '段考結算', 'bg-purple-600')}
              <i data-lucide="file-spreadsheet" class="w-4 h-4 ${isOAA ? 'text-purple-400' : 'text-purple-600'}"></i>
            </div>
            <h3 class="${titleClass}">平時成績結算 Excel 與歷史累積</h3>
            <p class="${subDescClass}">
              每次段考後切換至 <strong>「💯 平時成績」</strong> 分頁，一鍵完成結算：
            </p>
            <div class="${innerPurpleBoxClass}">
              <div>• <strong>一鍵下載 Excel & 歸檔重算</strong>：產生含「平時成績表、排行與明細」之真實 .xlsx 檔，並只重置該班當期點數重新計算！</div>
              <div>• <strong>歷史段考永久保存</strong>：已結算的「第1次／第2次段考」與累積平均可隨時重下 Excel 與查閱趨勢。</div>
            </div>
          </div>
        </div>

      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }
}

// Global User Guide Instance
window.userGuideView = new UserGuideView(window.appStore);

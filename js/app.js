/**
 * ClassQuant Hub - Main App Controller v1.6.0
 * Theme Switcher, Native Web Audio Chime Engine, Smart Auto-Collapsing Header on Scroll,
 * Delightful Micro-Animations, Tab Router, In-App Live Over-The-Air (OTA) Remote Update Engine,
 * and System Bulletin / Changelog Center.
 */

class AppState {
  constructor() {
    this.currentClassId = '801';
    this.activeTab = 'matrix';
    this.deferredPrompt = null;
    this.isHeaderCollapsed = false;
    this.audioCtx = null;
    this.appVersion = '1.8.8';
    this.init();
  }

  init() {
    // 1. Initialize Theme
    const currentTheme = window.appStore.getTheme();
    this.applyTheme(currentTheme);

    // 2. Initial Class detection
    const active = window.timetableEngine.getActiveClassId();
    this.currentClassId = active.classId || '801';

    // 3. Listen to Timetable Engine changes
    window.timetableEngine.onClassChange((newClassId, context) => {
      if (newClassId && newClassId !== this.currentClassId) {
        this.currentClassId = newClassId;
        this.showToast(`課表自動感知切換至：${newClassId} 班`, 'info');
      }
      this.updateHeaderStatus();
      this.refreshActiveTab();
    });

    // 4. Setup clock ticker
    setInterval(() => {
      this.updateHeaderClock();
    }, 1000);

    // 5. Setup PWA Install Prompt Listener
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) installBtn.classList.remove('hidden');
    });

    // 7. Network online/offline detection & Auto OTA check
    window.addEventListener('online', () => {
      this.showToast('📶 網路已連線 (正在自動檢查雲端更新...)', 'success');
      this.updateNetworkBadge(true);
      this.checkForUpdates(true);
    });
    window.addEventListener('offline', () => {
      this.showToast('🟢 目前處於離線模式，所有操作自動存於本機', 'info');
      this.updateNetworkBadge(false);
    });

    this.initPWA();
    this.initSoundSetting();
    this.initThemeSetting();
    this.checkFirstVisit();
    this.checkForUpdates(true);

    // Initial render
    this.updateHeaderStatus();
    this.updateHeaderClock();
    this.renderClassDropdown();
    this.updateSoundButtonUI();
    this.updateHeaderVersionBadge();
    this.switchTab('matrix');

    // Restore user's header collapse preference from localStorage
    try {
      const savedCollapse = localStorage.getItem('classquant_header_collapsed');
      if (savedCollapse === 'true') {
        this.toggleHeader(false, true, true);
      }
    } catch (e) {}

    // Auto check updates and show release notes ONCE on launch
    setTimeout(() => this.checkReleaseNotesOnLaunch(), 1000);
  }

  updateHeaderVersionBadge() {
    const badge = document.getElementById('header-version-badge');
    if (badge) {
      badge.innerHTML = `<span>v${this.appVersion}</span><span>📢</span>`;
    }
  }

  updateNetworkBadge(isOnline) {
    const badge = document.getElementById('header-offline-status');
    if (badge) {
      badge.innerHTML = isOnline 
        ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span class="text-[10px] text-emerald-600 font-bold hidden sm:inline">已連線</span>'
        : '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span><span class="text-[10px] text-slate-500 font-bold hidden sm:inline">離線模式</span>';
    }
  }

  /**
   * Compares two semantic version strings (e.g. "1.6.0" vs "1.5.2").
   * Supports optional leading 'v' or 'V' (e.g. "v1.6.0").
   * @param {string} v1
   * @param {string} v2
   * @returns {number} 1 if v1 > v2, -1 if v1 < v2, 0 if v1 === v2
   */
  compareVersions(v1, v2) {
    if (!v1 || !v2) return 0;
    const parse = (v) => String(v).replace(/^[vV]/, '').trim().split('.').map(n => parseInt(n, 10) || 0);
    const p1 = parse(v1);
    const p2 = parse(v2);
    const len = Math.max(p1.length, p2.length);
    for (let i = 0; i < len; i++) {
      const a = p1[i] || 0;
      const b = p2[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  }

  // --- OTA Live Push Update Engine & Proactive Release Notes (Strictly Once per Version) ---
  async checkReleaseNotesOnLaunch() {
    const lastSeen = localStorage.getItem('classquant_last_seen_version');
    
    // If the user has already seen this version (or a newer version), do not prompt again!
    if (lastSeen && this.compareVersions(lastSeen, this.appVersion) >= 0) {
      return;
    }

    try {
      const res = await fetch(`./version.json?t=${Date.now()}`);
      if (res.ok) {
        const info = await res.json();
        // If remote version is strictly newer than current running app, prompt update
        if (info.version && this.compareVersions(info.version, this.appVersion) > 0) {
          this.showReleaseNotesModal(info, false);
          return;
        }
        // If remote version matches current running app, show release notes
        if (info.version && this.compareVersions(info.version, this.appVersion) === 0) {
          this.showReleaseNotesModal(info, true);
          return;
        }
        // If remote version is older (server lagging or stale), fall back to built-in current notes
      }
    } catch (e) {
      // Offline or network error -> proceed to built-in fallback
    }

    // Built-in fallback release notes for current running appVersion (v1.6.0)
    this.showReleaseNotesModal({
      version: this.appVersion,
      releaseDate: '2026-08-30',
      releaseNotes: [
        "1. 【新手導覽全方位升級】全新 12 步引導式動態教學，具備高精準度 SVG 圓角聚光燈與方位指示指針！",
        "2. 【全自動模擬手勢巡航】流暢貝茲曲線自動導航，視圖平滑轉場無縫銜接！",
        "3. 【防連點防跳步狀態鎖】全面強化互動生命週期與事件隔離，杜絕誤觸跳步與滾動死鎖！",
        "4. 【PWA 離線快取同步】全新 Service Worker 智能快取與版本原子化同步，杜絕舊版閃爍回退！"
      ]
    }, true);
  }

  async checkForUpdates(silent = true) {
    if (!navigator.onLine) {
      if (!silent) this.showToast('目前處於離線狀態，無法檢查更新', 'info');
      return;
    }

    try {
      const res = await fetch(`./version.json?t=${Date.now()}`);
      if (res.ok) {
        const info = await res.json();
        const lastSeen = localStorage.getItem('classquant_last_seen_version');
        const isNewer = info.version && this.compareVersions(info.version, this.appVersion) > 0;
        
        if (isNewer) {
          if (!silent || lastSeen !== info.version) {
            this.showReleaseNotesModal(info, false);
          }
        } else if (!silent) {
          this.showToast(`✅ 目前已是最新版本 (v${this.appVersion})`, 'success');
        }
      } else {
        if (!silent) this.showToast('無法取得更新資訊，請稍後再試', 'warning');
      }
    } catch (e) {
      if (!silent) this.showToast('無法取得更新資訊，請檢查網路連線', 'warning');
    }
  }

  showReleaseNotesModal(info, isNewVersionNotice = false) {
    // Immediately mark as seen so it NEVER pops up repeatedly!
    const modalVersion = info.version || this.appVersion;
    localStorage.setItem('classquant_last_seen_version', modalVersion);

    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="p-6 text-center animate-fade-in-up">
        <div class="flex justify-center mb-3">
          <div class="sanrio-twinstars-badge !w-16 !h-16"></div>
        </div>
        <h3 class="text-xl sm:text-2xl font-black mb-1 flex items-center justify-center gap-2 text-pink-600">
          ${isNewVersionNotice ? '🎉 歡迎使用' : '🌟 發現新版本'} ClassQuant Hub v${modalVersion}
          <span class="kitty-bow"></span>
        </h3>
        <p class="text-xs text-slate-500 mb-4 font-bold">發布日期：${info.releaseDate || '2026-08-30'}</p>

        <div class="text-left p-4 rounded-2xl bg-pink-50 border border-pink-200 text-xs text-slate-800 space-y-2 mb-5 font-bold">
          <div class="text-pink-900 font-black flex items-center gap-1">
            <i data-lucide="sparkles" class="w-3.5 h-3.5 text-pink-600"></i>
            【本次更新重點】：
          </div>
          ${(info.releaseNotes || []).map(note => `
            <div class="flex items-start gap-1.5 leading-relaxed">
              <span class="text-pink-500 font-black">•</span>
              <span>${note}</span>
            </div>
          `).join('')}
        </div>

        <div class="flex items-center justify-center gap-3">
          <button onclick="appState.dismissReleaseNotes('${modalVersion}')" 
            class="w-full py-3 rounded-2xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 shadow-lg shadow-pink-500/25 transition text-sm flex items-center justify-center gap-1.5 active:scale-95">
            <span class="kitty-bow !w-3.5 !h-3.5"></span>
            <span>${isNewVersionNotice ? '✨ 開始體驗！' : '🔄 立即套用更新'}</span>
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  async dismissReleaseNotes(version) {
    const targetVersion = version || this.appVersion;
    localStorage.setItem('classquant_last_seen_version', targetVersion);
    this.closeModal();

    // If dismissing an update for a strictly newer version, trigger Service Worker update & reload
    if (this.compareVersions(targetVersion, this.appVersion) > 0) {
      this.showToast(`正在更新至 v${targetVersion}...🎀`, 'info');
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update();
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        } catch (e) {}
      }
      setTimeout(() => location.reload(), 400);
    } else {
      this.showToast(`已就緒 v${this.appVersion} 功能！🎀`, 'success');
    }
  }

  showSWUpdateBanner(reg) {
    const existing = document.getElementById('pwa-update-banner');
    if (existing) return;
    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 text-white border border-pink-400 shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs font-bold animate-fade-in-up';
    banner.innerHTML = `
      <span>🎉 發現新版本 ClassQuant Hub！</span>
      <button id="pwa-reload-btn" class="px-3 py-1 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl text-white font-black hover:brightness-110 active:scale-95 transition">立即更新</button>
      <button id="pwa-dismiss-btn" class="px-2 py-1 text-slate-400 hover:text-white transition">稍後</button>
    `;
    document.body.appendChild(banner);
    document.getElementById('pwa-reload-btn').addEventListener('click', () => {
      if (reg && reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        window.location.reload();
      }
    });
    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
      banner.remove();
    });
  }

  async hardResetCacheAndReload() {
    this.showToast('🔄 正在徹底清除快取並重新載入最新版本...', 'info');
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
      localStorage.removeItem('classquant_tour_completed');
      localStorage.removeItem('classquant_onboarding_completed');
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => {
      window.location.href = window.location.origin + window.location.pathname + '?nocache=' + Date.now();
    }, 300);
  }

  // --- System Bulletin Board & Full Changelog Archive (📢 系統公佈欄 & 歷史更新日誌) ---
  openBulletinModal() {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="p-5 sm:p-7 max-h-[85vh] overflow-y-auto animate-fade-in-up">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3.5 border-b border-pink-100 mb-4">
          <div class="flex items-center space-x-3">
            <div class="sanrio-kitty-badge !w-12 !h-12"></div>
            <div>
              <h3 class="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-1.5">
                📢 系統公佈欄 & 更新日誌
                <span class="kitty-bow"></span>
              </h3>
              <p class="text-xs text-slate-500 font-bold">當前版本：v${this.appVersion} • 國中導師與數學科任專用</p>
            </div>
          </div>
          <button onclick="appState.closeModal()" class="w-8 h-8 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold flex items-center justify-center transition">
            ✕
          </button>
        </div>

        <!-- Urgent Cache Refresh Action -->
        <div class="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 mb-4 flex items-center justify-between gap-2 shadow-sm">
          <div class="text-xs text-amber-900 font-bold">
            <span>手機若畫面異常或舊版卡住？</span>
            <span class="block text-[11px] text-amber-700 font-medium">點擊右側按鈕可徹底清除舊快取並強制載入最新版！</span>
          </div>
          <button onclick="appState.hardResetCacheAndReload()" class="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white rounded-xl text-xs font-black shadow transition active:scale-95 shrink-0">
            🔄 強制修復
          </button>
        </div>

        <!-- Section 1: Active Activities & Teaching Reminders -->
        <div class="p-4 rounded-2xl bg-gradient-to-r from-pink-50 via-rose-50 to-sky-50 border border-pink-200 mb-5 shadow-sm">
          <div class="flex items-center gap-1.5 text-xs font-black text-pink-900 mb-2">
            <span class="text-base">📌</span>
            <span>【當前活動與課堂教學提醒】</span>
          </div>
          <div class="space-y-1.5 text-xs text-slate-700 font-medium">
            <div class="flex items-start gap-1.5">
              <span class="text-pink-600 font-bold">🎯</span>
              <span><strong>段考小考量化統計</strong>：利用「統計戰情室」的四象限分析，可即時掌握各班高分低常規或雙低需關懷之學生名單。</span>
            </div>
            <div class="flex items-start gap-1.5">
              <span class="text-emerald-600 font-bold">⏰</span>
              <span><strong>課堂事後回憶補記</strong>：課堂現場無法掏手機時，下課或放學回到辦公室點擊頂部「事後補記」，1 秒批次補齊記錄！</span>
            </div>
            <div class="flex items-start gap-1.5">
              <span class="text-blue-600 font-bold">📶</span>
              <span><strong>100% 離線支援</strong>：在地下室或無 Wi-Fi 教室操作，所有資料皆自動安全存放於本機，連網時自動背景熱更新。</span>
            </div>
          </div>
        </div>

        <!-- Section 2: Full Changelog History -->
        <div class="space-y-3.5 mb-5">
          <div class="text-xs font-black text-slate-800 flex items-center gap-1">
            <i data-lucide="history" class="w-3.5 h-3.5 text-pink-600"></i>
            <span>歷史版本發布日誌 (Changelog)：</span>
          </div>

          <!-- v1.8.8 -->
          <div class="p-3.5 rounded-2xl border-2 border-pink-300 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.8.8 (徹底移除靜態遮罩 DOM • 經典架構純淨回歸版)
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【徹底移除靜態遮罩 DOM】自 HTML 根除硬編碼的靜態遮罩與 path，教學引導改回純動態生命週期，平常頁面 0 覆蓋層、0 死鎖！</li>
              <li>• 【還原經典輕量導覽引擎】回歸 1.5.2 簡潔純淨架構，每一步均有清晰的「下一步 ➔」與「✕ 結束」，永不卡死！</li>
            </ul>
          </div>

          <!-- v1.8.7 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.8.7
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【強制穿透舊快取】加入 HTTP No-Cache 檔頭與 Service Worker 自動強制跳過等待（Auto Skip Waiting），杜絕手機瀏覽器鎖死於舊版！</li>
              <li>• 【一鍵強制修復】公佈欄頂部新增「🔄 強制修復」按鈕，可一鍵徹底清除手機本機快取並重新載入最新功能！</li>
            </ul>
          </div>

          <!-- v1.8.6 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.8.6
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【名冊即時過濾與批次管理】班級名單新增座號與姓名即時搜尋引擎，搜尋結果與學生列表秒級流暢響應！</li>
              <li>• 【事後補記原地高亮與即時記點】課堂事後補記支援原地單選/多選切換與批次提交，100% 杜絕 DOM 抖動！</li>
              <li>• 【182 項自動化測試全數通過】經多 Agent 對抗審計（M1~M4），觸控選取、加扣分自動清空、全分頁路由與 12 步教學全面通過實機驗證！</li>
            </ul>
          </div>

          <!-- v1.8.5 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.8.5
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【加分後自動清空選取】點擊快速標籤加扣分後，立即自動取消選取所有學生座位，恢復經典舒適的使用習慣！</li>
              <li>• 【即時原地刷新】記點飄字動畫（+3）流暢播放，卡片分數與頂部班級數據原地無感更新！</li>
            </ul>
          </div>

          <!-- v1.8.4 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.8.4
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【徹底移除觸控攔截】全面移除所有全域 capture 點擊攔截器，不再限制點擊位置，所有按鈕與學生座位卡 100% 隨點隨應！</li>
              <li>• 【導覽極速前進】導覽卡片右下角隨時可點「下一步 ➔」或「✕ 結束」，完全不鎖定或中斷使用者操作！</li>
            </ul>
          </div>

          <!-- v1.8.3 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.8.3
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【全靜態座位預渲染】將 801 導師本班 30 位學生座位卡與 4 大快速標籤直寫進靜態 HTML，首屏秒開 100% 保證可見，杜絕任何空白畫面！</li>
              <li>• 【教學步驟零死鎖】全面優化第 1 步導覽互動判定，支援直接點選或點按「下一步 ➔」瞬間推進，消除任何卡頓等待！</li>
            </ul>
          </div>

          <!-- v1.8.2 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.8.2
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【手機端高度防溢出】放寬頂部橫幅 max-height 為 240px，防止在極窄手機視口下產生溢出遮擋！</li>
              <li>• 【導覽列切換自動置中】點擊分頁或開機時自動捲動當前選中之導覽按鈕至視線中央，不再滑出螢幕左側！</li>
            </ul>
          </div>

          <!-- v1.8.1 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.8.1
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【徹底修復本機舊資料結構損毀】實裝 Store 資料庫「自我修復（Self-Healing）」機制，若本機儲存之班級、學生名冊或標籤格式有缺漏，啟動時 100% 自動補齊與修復！</li>
              <li>• 【座位表渲染防禦】matrixView 與下拉選單全面升級容錯，若當前班級無效自動 fallback 至首個有效班級，保證座位表（30 位學生）100% 立即渲染！</li>
            </ul>
          </div>

          <!-- v1.8.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.8.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【徹底修復 iOS WebKit 導航 TypeError】抓出 Service Worker 在 iOS Safari 處理 navigate 請求時傳入非法 cache 參數導致靜態檔案載入中斷的根本盲點，保證 iPhone / iPad / Android 畫面 100% 正常渲染！</li>
              <li>• 【全機型無差別順暢運作】按鈕點選、抽籤、加扣分、12 步實戰新手導覽全面極速響應！</li>
            </ul>
          </div>

          <!-- v1.7.9 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.7.9
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【徹底移除啟動期重整干擾】移除在 App 初始化階段的非同步 location.reload()，保證座位表（30 位學生）與下方快速標籤區 100% 穩定呈現！</li>
              <li>• 【新手教學無縫啟動】點擊「🎓 教學」瞬間直接喚醒實體預載之導覽彈窗，絕不卡死、絕不空白！</li>
            </ul>
          </div>

          <!-- v1.7.8 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.7.8
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【自動快取感應與清除】啟動時自動比對遠端 version.json，若手機端版本過舊則瞬間自動清除所有 caches 並自動重整刷新！</li>
              <li>• 【0 毫秒極速導覽直通】點擊「🎓 教學」時，立即以最高優先權將第 1 步「班級切換樞紐」文字與「下一步 ➔」發光按鈕直通填入畫面，絕不延遲！</li>
            </ul>
          </div>

          <!-- v1.7.7 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.7.7
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【徹底修復孤立語法錯誤】抓出 onboardingTour.js 舊函式殘留的孤立代碼區塊（SyntaxError），確保腳本 100% 成功解析掛載至 window 物件！</li>
              <li>• 【端對端 CDP 實測驗證】以真實 Chrome 模擬點擊 1~3 步連續推進測試通過，保證手機點擊教學瞬間展開聚光燈與說明卡片！</li>
            </ul>
          </div>

          <!-- v1.7.6 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.7.6
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【靜態實體 DOM 預先掛載】將新手教學聚光燈與導覽卡片直接實體寫入 HTML 主幹，不再依賴 JavaScript 動態生成節點，點擊瞬間 0 延遲秒開！</li>
              <li>• 【樣式全面 CSS 靜態編譯】所有動畫、光暈與最高層級（z:99999 / z:100001）直接由 styles.css 解析載入，徹底根除手機動態樣式未編譯盲點。</li>
            </ul>
          </div>

          <!-- v1.7.5 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.7.5
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【最高 Z-Index 保證】注入原生 CSS 樣式規則，確保新手導覽聚光燈（z:99999）與說明卡片（z:100001）100% 覆蓋所有全域元件之上，絕不被底層元件遮蔽。</li>
              <li>• 【觸控事件安全隔離】加入 safeClosest 安全選取器，拔除 touch-action: none 與防止預設事件干擾，保證手機瀏覽器秒開秒點！</li>
            </ul>
          </div>

          <!-- v1.7.4 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.7.4
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【新手教學全關卡「下一步」按鈕無死角支援】所有步驟（包含班級選單、選取學生等操作關卡）底部皆常駐高對比「下一步 ➔」按鈕與提示標籤，老師可自由選擇親手操作或直接點下一步推進，100% 絕不卡關等待！</li>
              <li>• 【零等待即時啟動】拔除多餘的等待定時器，點擊「🎓 教學」瞬間展開聚光燈與導覽卡片，給予最清晰的視覺與操作提示。</li>
            </ul>
          </div>

          <!-- v1.7.3 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.7.3
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【展開按鈕完美整合導覽列】徹底拔除漂浮於畫面正上方的懸浮膠囊，將「▼ 展開選單」按鈕無縫收斂進黏性導覽列（Navbar）內部，零遮擋任何分頁或操作內容！</li>
              <li>• 【點記板功能純淨化】從「課堂點記板」頂部工具列移除重複多餘的「事後補記」按鈕，讓課堂點記與課後補記分工更加純粹直覺。</li>
              <li>• 【新手教學即時感應啟動】加固教學啟動器，點擊瞬間發出清脆音效、即刻展開頂部並平滑滾動至起始位置，解決點擊沒反應之疑惑。</li>
            </ul>
          </div>

          <!-- v1.7.2 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.7.2
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【徹底修復初始化中斷】排查並拔除了建構函式中殘留的 setupSmartScrollListener 舊呼叫，確保 AppState 核心控制器與座位矩陣 100% 順暢渲染！</li>
            </ul>
          </div>

          <!-- v1.7.1 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.7.1
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【頂部收合按鈕全螢幕守護】重構頂部控制區排版，班級選單響應式收斂，確保「收合頂部橫幅 (▲)」按鈕 100% 留在螢幕之內，絕不溢出！</li>
              <li>• 【收合狀態持久化】手動收合橫幅後將永久記錄於本機，除非主動點擊展開，否則重開 App 或重新整理皆保持收合；徹底移除滾動時的自動開合干擾。</li>
              <li>• 【移除跳動干擾】移除展開按鈕的彈跳跳躍動畫，改為精緻靜態浮動膠囊，優雅不打擾。</li>
              <li>• 【新手教學可靠性加固】教學啟動器增加乾淨狀態重設機制與雙重實例保護，確保點擊「🎓 教學」保證即刻展開！</li>
            </ul>
          </div>

          <!-- v1.7.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.7.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【標準化全域 UI 地圖】建立 window.AppUIMap 與 APP_SPEC_ARCHITECTURE.md 規格書，為全系統每一個分頁、按鈕與輸入框提供統一標準化選擇器。</li>
              <li>• 【深度實戰代操演示】升級新手教學：將切換分頁交由老師親自操作，複雜的「Excel 批次貼上名冊」與「個別改名」則由系統自動模擬打字與點擊演示！</li>
              <li>• 【功能介紹醒目指引】純展示型關卡加入高對比醒目提示橫幅與發光呼吸按鈕，清楚指引點擊下一步。</li>
            </ul>
          </div>

          <!-- v1.6.3 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.6.3
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【徹底移除彈窗阻斷器】排查並移除了 TagManager 內部舊有的 window.onboardingTour.isActive 阻斷程式碼，現在點擊「⚙️ 自訂」保證 100% 順暢彈出標籤管理中心！</li>
              <li>• 【修復彈窗聚光燈選取器】校準步驟 5 標籤管理視窗的 CSS 選取器為 #global-modal-content，視窗發光導覽完美貼合。</li>
            </ul>
          </div>

          <!-- v1.6.2 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.6.2
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【CSS 層疊覆蓋修復】徹底修復 .tour-arrow-icon 的 display 屬性覆蓋 .hidden 的 CSS 權重問題，同時注入 inline display: none，100% 根除雙箭頭殘影！</li>
              <li>• 【自訂標籤實戰流程】步驟 4 正式支援點擊「⚙️ 自訂」，並自動銜接至標籤管理視窗導覽。</li>
            </ul>
          </div>

          <!-- v1.6.1 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.6.1
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【修正雙箭頭異常】徹底消除步驟一、二指針同時顯示上下雙箭頭的殘影問題，方向 100% 單一精準。</li>
              <li>• 【修復自訂標籤可點擊】將教學步驟 4 正式改為「親手點擊」實戰關卡，點擊「⚙️ 自訂」即可順暢開啟標籤管理視窗進行體驗！</li>
              <li>• 【幽靈游標預設隱藏】修復虛擬代操手指在初始階段的陰影殘留問題，確保畫面乾淨俐落。</li>
            </ul>
          </div>

          <!-- v1.6.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.6.0 (最新旗艦發布版)
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
              <li>• 【新手導覽全方位升級】全新 12 步引導式動態教學，具備高精準度 SVG 圓角聚光燈與方位指示指針！</li>
              <li>• 【全自動模擬手勢巡航】流暢貝茲曲線自動導航，視圖平滑轉場無縫銜接！</li>
              <li>• 【防連點防跳步狀態鎖】全面強化互動生命週期與事件隔離，杜絕誤觸跳步與滾動死鎖！</li>
              <li>• 【PWA 離線快取同步】全新 Service Worker 智能快取與版本原子化同步，杜絕舊版閃爍回退！</li>
            </ul>
          </div>

          <!-- v1.5.2 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.5.2
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【實戰級動態教學】升級 12 大沉浸式操作關卡（點選座位、課堂加分動效、自訂標籤、Excel 批次貼上、名冊細項改名調座號、事後補記勾選評語提交、四象限戰情解讀）！</li>
              <li>• 【手機導航水平自動置中】徹底解決手機螢幕狹窄時導航欄後方按鈕在畫面外導致指針指歪的座標跑位問題！</li>
            </ul>
          </div>

          <!-- v1.5.1 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.5.1
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 徹底修復步驟 7 點擊加分標籤後切換至步驟 8 無限卡死的嚴重 Bug！</li>
            </ul>
          </div>

          <!-- v1.5.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.5.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【獨立專區】新增一級主導航「⏰ 課堂事後補記」專區（支援多生快選、常用評語模組、分值微調與補記歷史流）！</li>
              <li>• 【介面優化】移除新手教學按鈕閃爍動畫，回歸優雅穩重設計。</li>
              <li>• 【導覽重構】實裝步驟 3「1秒批次貼上名冊」完整教育展示，並直通步驟 4 名冊個別微調！</li>
            </ul>
          </div>

          <!-- v1.4.9 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.9
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 徹底修復步驟 3「1秒批次貼上名冊」彈窗與導覽遮罩衝突卡死的 Bug！</li>
              <li>• 全面消除步驟間人為延遲，改採 requestAnimationFrame 16ms 毫秒級即時流暢切換！</li>
            </ul>
          </div>

          <!-- v1.4.8 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.8
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 修復步驟 3 頂部橫幅反覆收合/展開閃爍問題，教學期間橫幅維持 100% 絕對穩固！</li>
              <li>• 移除頂部干擾且擠出選單的「恢復課表」黃色按鈕，班級選單全螢幕視野無遮擋。</li>
            </ul>
          </div>

          <!-- v1.4.7 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.7
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 實裝 9999px Box-Shadow 暗化聚光燈，100% 保證全螢幕深黑 85%、目標 100% 原始透光高亮！</li>
              <li>• 全部 8 個教學步驟全面實裝精準功能目標定位與方位跳動箭頭。</li>
            </ul>
          </div>

          <!-- v1.4.6 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.6
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 實裝 CSS Polygon Clip-Path 聚光遮罩，全螢幕壓暗 82%，唯獨目標 100% 亮起且四周點擊全阻擋！</li>
              <li>• 實裝 document touchmove passive:false 全阻斷事件，徹底禁止手機上下滑動，畫面 100% 穩定！</li>
            </ul>
          </div>

          <!-- v1.4.5 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.5
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 4-Curtain 實體物理開孔光圈：目標處於完全開放空間，100% 自然鮮豔、100% 順暢點擊！</li>
              <li>• 智慧方位感應指針：上方目標使用 👆 由下往上指、下方目標使用 👇 由上往下指，方向 100% 正確！</li>
            </ul>
          </div>

          <!-- v1.4.4 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.4
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 目標元素直接穿透提亮 (z-index 提拔)，100% 亮起且 100% 順暢可點！</li>
              <li>• 教學彈窗全面加入 Safe Area 安全邊界約束，保證任何尺寸手機 100% 完整落在畫面內。</li>
            </ul>
          </div>

          <!-- v1.4.3 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.3
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 修正教學導覽光圈偏移問題，採用 Fixed 實時動態座標追蹤。</li>
              <li>• 實裝目標專屬 ID 精準錨定，高亮框與跳動手指 100% 貼合目標。</li>
            </ul>
          </div>

          <!-- v1.4.2 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.2
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 頂部按鈕全面改為全螢幕可見之醒目「🎓 新手教學」膠囊標籤。</li>
              <li>• 移除彈窗上的代點按鈕，改為目標上方漂浮「👆 請點這裡！」跳動手指，強制親手操作！</li>
            </ul>
          </div>

          <!-- v1.4.1 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.1
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 全新「動態高亮聚焦 ＋ 動態箭頭強制互動導覽 (Spotlight Tour)」，真實動手操作指引。</li>
              <li>• 實裝步驟強制性點擊驗證與各步驟「跳過此步」功能。</li>
              <li>• 升級 Network-First 網路優先更新架構，徹底杜絕離線快取卡舊版本問題。</li>
            </ul>
          </div>

          <!-- v1.4.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.4.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 新增「🌱 新手引導」互動教學嚮導，一步步帶領新老師建班與標籤。</li>
              <li>• 新增「📢 系統公佈欄 & 歷史更新日誌」，永久保存過去版本功能與教學活動。</li>
              <li>• 修復更新彈窗重複顯示問題，設定為每次發布僅主動提示一次。</li>
            </ul>
          </div>

          <!-- v1.3.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.3.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 頂部橫幅隨頁面往下滑動智慧自動收合，往上滑自動還原，極大化座位視野。</li>
              <li>• 新增全站三麗鷗精緻流暢微動畫（卡片微彈回饋、加分星星/愛心粒子）。</li>
              <li>• 乾淨移除用不到的 NAS 模組，介面更加輕快。</li>
            </ul>
          </div>

          <!-- v1.2.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.2.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 標籤排版重構為 4 大按鈕並直接放置於座位表下方，字體大且絕對不遮字。</li>
              <li>• 導師班與數學科任班徹底分開，標籤使用頻率各班獨立計算排序。</li>
              <li>• 新增「⏰ 課堂事後快速補記助手」與「📅 日期時序時間軸 / 👥 多生交叉查詢」。</li>
            </ul>
          </div>

          <!-- v1.1.0 & v1.0.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.1.0 ~ v1.0.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-29</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 三階統一色彩規範（🌿加分綠、🌹扣分紅、☁️記事灰）。</li>
              <li>• 全校多班橫向對比、分層作業建議與因材施教戰術板。</li>
              <li>• ClassQuant Hub 雙軌課堂量化管理系統正式發布。</li>
            </ul>
          </div>
        </div>

        <!-- Footer Action -->
        <div class="flex items-center justify-between pt-3 border-t border-pink-100">
          <button onclick="appState.checkForUpdates(false)" class="text-xs text-pink-600 font-black hover:underline flex items-center gap-1">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i> 手動檢查雲端更新
          </button>
          <button onclick="appState.closeModal()" class="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-black text-xs shadow-md transition">
            關閉公佈欄
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  async applyLiveOTAUpdate() {
    this.showToast('🔄 正在為您更新最新代碼並清除舊快取...', 'info');
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let reg of registrations) {
        await reg.update();
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (let k of keys) {
        await caches.delete(k);
      }
    }
    setTimeout(() => {
      window.location.reload(true);
    }, 800);
  }

  // --- Web Audio API Native Sound Engine ---
  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  isSoundEnabled() {
    return window.appStore.data.settings?.enableSound !== false;
  }

  toggleSound() {
    if (!window.appStore.data.settings) window.appStore.data.settings = {};
    const current = this.isSoundEnabled();
    window.appStore.data.settings.enableSound = !current;
    window.appStore.save();
    this.showToast(!current ? '🔔 已開啟可愛操作音效' : '🔕 已靜音操作音效', 'info');
    this.updateSoundButtonUI();
    if (!current) this.playChime();
  }

  updateSoundButtonUI() {
    const btn = document.getElementById('sound-toggle-btn');
    if (btn) {
      const enabled = this.isSoundEnabled();
      btn.innerHTML = enabled
        ? '<i data-lucide="volume-2" class="w-4 h-4 text-pink-600"></i>'
        : '<i data-lucide="volume-x" class="w-4 h-4 text-slate-400"></i>';
      btn.title = enabled ? '音效已開啟 (點擊靜音)' : '音效已關閉 (點擊開啟)';
      if (window.lucide) window.lucide.createIcons();
    }
  }

  playChime() {
    if (!this.isSoundEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.07);
        osc.stop(ctx.currentTime + i * 0.07 + 0.35);
      });
    } catch (e) {}
  }

  playPop() {
    if (!this.isSoundEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.07);
    } catch (e) {}
  }

  playWarning() {
    if (!this.isSoundEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.setValueAtTime(280, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } catch (e) {}
  }

  startTour() {
    this.playChime();
    this.showToast('🎓 新手教學已就緒！請查看畫面引導與下方說明 🎀', 'info');
    this.toggleHeader(true, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Show tour container immediately
    const overlay = document.getElementById('tour-overlay-container');
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.style.display = 'block';
    }
    const popover = document.getElementById('tour-popover');
    if (popover) {
      popover.classList.remove('hidden');
      popover.style.display = 'block';
      popover.style.opacity = '1';
    }

    try {
      if (!window.onboardingTour && window.OnboardingTour) {
        window.onboardingTour = new window.OnboardingTour();
      }
      if (window.onboardingTour) {
        window.onboardingTour.start(0);
      }
    } catch (e) {
      console.error('[AppState] startTour error:', e);
    }
  }

  toggleHeader(forceShow = false, isSilent = false, fromInit = false) {
    const header = document.getElementById('global-header');
    const navUnhide = document.getElementById('nav-unhide-container');
    const pill = document.getElementById('header-unhide-pill');
    if (!header) return;

    if (forceShow || header.classList.contains('header-collapsed')) {
      header.classList.remove('header-collapsed');
      if (navUnhide) navUnhide.classList.add('hidden');
      if (pill) pill.classList.add('hidden');
      this.isHeaderCollapsed = false;
      try { localStorage.setItem('classquant_header_collapsed', 'false'); } catch (e) {}
    } else {
      header.classList.add('header-collapsed');
      if (navUnhide) navUnhide.classList.remove('hidden');
      if (pill) pill.classList.remove('hidden');
      this.isHeaderCollapsed = true;
      try { localStorage.setItem('classquant_header_collapsed', 'true'); } catch (e) {}
      if (!isSilent && !fromInit) this.showToast('已收合頂部橫幅，可隨時點擊導覽列右側「▼ 展開頂部選單」🎀', 'info');
    }
  }

  applyTheme(themeName) {
    const html = document.documentElement;
    html.setAttribute('data-theme', themeName);
    if (themeName === 'kitty') {
      html.classList.remove('dark');
    } else {
      html.classList.add('dark');
    }
    window.appStore.setTheme(themeName);
    this.updateThemeButtonUI(themeName);
  }

  toggleTheme() {
    const current = window.appStore.getTheme();
    const next = current === 'kitty' ? 'dark' : 'kitty';
    this.applyTheme(next);
    this.showToast(`已切換至：${next === 'kitty' ? '🎀 三麗鷗 (Kitty & 小雙星) 主題' : '🌙 科技深色主題'}`, 'info');
  }

  updateThemeButtonUI(themeName) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.innerHTML = themeName === 'kitty' 
        ? '<span class="kitty-bow !w-3.5 !h-3.5"></span><span class="text-xs font-bold text-pink-600 ml-0.5 hidden md:inline">主題</span>' 
        : '<i data-lucide="moon" class="w-4 h-4 text-blue-400"></i><span class="text-xs font-bold text-slate-300 ml-0.5 hidden md:inline">深色</span>';
      if (window.lucide) window.lucide.createIcons();
    }
  }

  switchTab(tabId) {
    this.activeTab = tabId;

    // Update Nav buttons
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('tab-active');
        try {
          btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        } catch (e) {}
      } else {
        btn.classList.remove('tab-active');
      }
    });

    // Hide all tab containers
    const tabContainers = [
      'classroom-matrix-view',
      'roster-manager-view',
      'retro-log-view',
      'dashboard-view',
      'timetable-editor-view',
      'events-log-view',
      'student-dossier-view',
      'ai-hub-view',
      'user-guide-view'
    ];

    tabContainers.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    // Show active tab
    const viewIdMap = {
      'matrix': 'classroom-matrix-view',
      'roster': 'roster-manager-view',
      'retro': 'retro-log-view',
      'dashboard': 'dashboard-view',
      'timetable': 'timetable-editor-view',
      'events': 'events-log-view',
      'student-dossier': 'student-dossier-view',
      'ai-hub': 'ai-hub-view',
      'guide': 'user-guide-view'
    };

    const targetViewId = viewIdMap[tabId];
    const activeEl = document.getElementById(targetViewId);
    if (activeEl) {
      activeEl.classList.remove('hidden');
      this.refreshActiveTab();
    }
  }

  refreshActiveTab() {
    if (this.activeTab === 'matrix') {
      window.matrixView.render('classroom-matrix-view', this.currentClassId);
    } else if (this.activeTab === 'roster') {
      window.rosterManager.render('roster-manager-view');
    } else if (this.activeTab === 'retro' && window.retroLogView) {
      window.retroLogView.render('retro-log-view', this.currentClassId);
    } else if (this.activeTab === 'dashboard') {
      window.dashboardCharts.renderClassDashboard('dashboard-view', this.currentClassId);
    } else if (this.activeTab === 'timetable') {
      window.timetableEditorView.render('timetable-editor-view');
    } else if (this.activeTab === 'events') {
      window.eventsLogView.render('events-log-view', this.currentClassId);
    } else if (this.activeTab === 'student-dossier') {
      window.studentDossierView.render('student-dossier-view', this.currentClassId);
    } else if (this.activeTab === 'ai-hub') {
      window.aiHub.render('ai-hub-view');
    } else if (this.activeTab === 'guide') {
      window.userGuideView.render('user-guide-view');
    }
  }

  renderClassDropdown() {
    const select = document.getElementById('global-class-select');
    if (!select) return;

    let classes = Object.values(window.appStore.getClasses() || {});
    if (classes.length === 0) {
      window.appStore.initDemoData();
      classes = Object.values(window.appStore.getClasses() || {});
    }

    const homeroomClasses = classes.filter(c => c.type === 'homeroom');
    const subjectClasses = classes.filter(c => c.type !== 'homeroom');

    let html = '';
    if (homeroomClasses.length > 0) {
      html += `<optgroup label="🎀 導師本班 (常規與生活)">`;
      html += homeroomClasses.map(c => `
        <option value="${c.id}" ${this.currentClassId === c.id ? 'selected' : ''}>
          ${c.name} (導師本班)
        </option>
      `).join('');
      html += `</optgroup>`;
    }

    if (subjectClasses.length > 0) {
      html += `<optgroup label="📘 數學科任班 (解題與作業)">`;
      html += subjectClasses.map(c => `
        <option value="${c.id}" ${this.currentClassId === c.id ? 'selected' : ''}>
          ${c.name} (數學科任)
        </option>
      `).join('');
      html += `</optgroup>`;
    }

    select.innerHTML = html;
    if (this.currentClassId) {
      select.value = this.currentClassId;
    }
  }

  handleManualClassChange(classId) {
    this.currentClassId = classId;
    window.timetableEngine.setManualOverride(classId);
    this.showToast(`已切換至：${classId} 班 (手動調課模式)`, 'info');
    this.updateHeaderStatus();
    this.refreshActiveTab();
  }

  restoreTimetableAuto() {
    window.timetableEngine.clearManualOverride();
    const active = window.timetableEngine.getActiveClassId();
    this.currentClassId = active.classId || '801';
    this.showToast('已恢復課表自動感知模式', 'success');
    this.updateHeaderStatus();
    this.renderClassDropdown();
    this.refreshActiveTab();
  }

  updateHeaderStatus() {
    const active = window.timetableEngine.getActiveClassId();
    const slotInfo = active.slotInfo;
    const isOverride = active.isOverride;

    const statusBadge = document.getElementById('header-schedule-status');
    const overrideBtn = document.getElementById('header-override-restore-btn');
    const select = document.getElementById('global-class-select');

    if (select) select.value = this.currentClassId;

    if (statusBadge) {
      if (isOverride) {
        statusBadge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-amber-400"></span>
          <span class="text-amber-600 font-bold">手動調課 (${this.currentClassId}班)</span>
        `;
      } else if (slotInfo.status === 'in_session') {
        statusBadge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-emerald-500 live-indicator"></span>
          <span class="text-emerald-600 font-bold">${slotInfo.message}</span>
        `;
      } else if (slotInfo.status === 'in_break') {
        statusBadge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-sky-500"></span>
          <span class="text-sky-600">${slotInfo.message}</span>
        `;
      } else {
        statusBadge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-slate-400"></span>
          <span class="opacity-70">${slotInfo.message || '非課堂時段'}</span>
        `;
      }
    }

    if (overrideBtn) {
      overrideBtn.classList.add('hidden');
    }
  }

  updateHeaderClock() {
    const clockEl = document.getElementById('header-live-clock');
    if (!clockEl) return;

    const { day, timeStr, isSimulated } = window.timetableEngine.getCurrentTimeInfo();
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    
    clockEl.innerHTML = `
      <span>週${dayNames[day]} ${timeStr}</span>
      ${isSimulated ? '<span class="text-[10px] text-amber-500 bg-amber-100 px-1.5 py-0.2 rounded-md font-bold ml-1">模擬中</span>' : ''}
    `;
  }

  // --- PWA Installation Action ---
  async installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        this.showToast('🎉 已成功將 App 安裝至主畫面！', 'success');
      }
      this.deferredPrompt = null;
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) installBtn.classList.add('hidden');
    } else {
      alert('【手機離線安裝教學】\n\n• Android (Chrome)：點選右上角選單 (⋮)，選擇「安裝應用程式」或「新增至主螢幕」。\n• iOS (Safari)：點擊底部「分享 (↑)」按鈕，選擇「加入主畫面 (Add to Home Screen)」。');
    }
  }

  // --- Modal & Toast System ---
  closeModal() {
    const modal = document.getElementById('global-modal');
    if (modal) modal.classList.add('hidden');
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('global-toast');
    if (!toast) return;

    const bgMap = {
      success: 'bg-emerald-600 border-emerald-500 text-white',
      warning: 'bg-amber-600 border-amber-500 text-white',
      danger: 'bg-rose-600 border-rose-500 text-white',
      info: 'bg-pink-600 border-pink-500 text-white'
    };

    toast.className = `fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl border text-xs font-bold shadow-2xl flex items-center gap-2 transition-all transform duration-300 ${bgMap[type] || bgMap.info}`;
    toast.innerHTML = `<span>${message}</span>`;
    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');

    setTimeout(() => {
      toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
    }, 3200);
  }
}

// Global App State Instance
window.appState = new AppState();

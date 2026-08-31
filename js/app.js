/**
 * ClassQuant Hub - Main App Controller v1.4.0
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
    this.appVersion = '1.7.4';
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

    // 5. Setup Smart Scroll for Auto-Collapsing Header on Scroll Down
    this.setupSmartScrollListener();

    // 6. Setup PWA Install Prompt Listener
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

    // Initial render
    this.updateHeaderStatus();
    this.updateHeaderClock();
    this.renderClassDropdown();
    this.updateSoundButtonUI();
    this.updateHeaderVersionBadge();
    this.switchTab('matrix');

    // Auto check updates and show release notes ONCE on launch
    setTimeout(() => this.checkReleaseNotesOnLaunch(), 1000);
  }

  updateHeaderVersionBadge() {
    const badge = document.getElementById('header-version-badge');
    if (badge) {
      badge.innerHTML = `<span>v${this.appVersion}</span><span>📢</span>`;
    }
  }

  // --- Smart Auto-Collapsing Header on Scroll Down ---
  setupSmartScrollListener() {
    let lastScrollY = window.scrollY;
    let ticking = false;

    window.addEventListener('scroll', () => {
      // If onboarding tour is active, DO NOT AUTO-COLLAPSE HEADER!
      if (window.onboardingTour && window.onboardingTour.isActive) return;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          // When scrolling down more than 70px, automatically collapse header
          if (currentScrollY > 70 && currentScrollY > lastScrollY) {
            if (!this.isHeaderCollapsed) {
              this.toggleHeader(false, true);
            }
          } 
          // When scrolling up back to top, reveal header
          else if (currentScrollY < 15) {
            if (this.isHeaderCollapsed) {
              this.toggleHeader(true, true);
            }
          }
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  updateNetworkBadge(isOnline) {
    const badge = document.getElementById('header-offline-status');
    if (badge) {
      badge.innerHTML = isOnline 
        ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span class="text-[10px] text-emerald-600 font-bold hidden sm:inline">已連線</span>'
        : '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span><span class="text-[10px] text-slate-500 font-bold hidden sm:inline">離線模式</span>';
    }
  }

  // --- OTA Live Push Update Engine & Proactive Release Notes (Strictly Once per Version) ---
  async checkReleaseNotesOnLaunch() {
    const lastSeen = localStorage.getItem('classquant_last_seen_version');
    if (lastSeen === this.appVersion) {
      // User has already seen this version, do not prompt again!
      return;
    }

    try {
      const res = await fetch(`./version.json?t=${Date.now()}`);
      if (res.ok) {
        const info = await res.json();
        this.showReleaseNotesModal(info, true);
        return;
      }
    } catch (e) {}

    // Fallback modal if offline
    this.showReleaseNotesModal({
      version: this.appVersion,
      releaseDate: '2026-08-29',
      releaseNotes: [
        "1. 頂部新增「🌱 新手引導」互動教學嚮導，一步步引導建立班級與標籤",
        "2. 頂部橫幅隨頁面滑動智慧自動收合，釋放全螢幕視野",
        "3. 新增精緻三麗鷗微動畫（加分星星粒子、卡片微彈回饋）",
        "4. 精簡移除 NAS 模組，系統運行更加輕快順手"
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
        if (info.version && info.version !== this.appVersion && lastSeen !== info.version) {
          this.showReleaseNotesModal(info, false);
        } else if (!silent) {
          this.showToast(`✅ 目前已是最新版本 (v${this.appVersion})`, 'success');
        }
      }
    } catch (e) {
      if (!silent) this.showToast('無法取得更新資訊，請檢查網路連線', 'warning');
    }
  }

  showReleaseNotesModal(info, isNewVersionNotice = false) {
    // Immediately mark as seen so it NEVER pops up repeatedly!
    localStorage.setItem('classquant_last_seen_version', info.version || this.appVersion);

    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="p-6 text-center animate-fade-in-up">
        <div class="flex justify-center mb-3">
          <div class="sanrio-twinstars-badge !w-16 !h-16"></div>
        </div>
        <h3 class="text-xl sm:text-2xl font-black mb-1 flex items-center justify-center gap-2 text-pink-600">
          ${isNewVersionNotice ? '🎉 歡迎使用' : '🌟 發現新版本'} ClassQuant Hub v${info.version}
          <span class="kitty-bow"></span>
        </h3>
        <p class="text-xs text-slate-500 mb-4 font-bold">發布日期：${info.releaseDate || '2026-08-29'}</p>

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
          <button onclick="appState.dismissReleaseNotes('${info.version}')" 
            class="w-full py-3 rounded-2xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 shadow-lg shadow-pink-500/25 transition text-sm flex items-center justify-center gap-1.5 active:scale-95">
            <span class="kitty-bow !w-3.5 !h-3.5"></span>
            <span>✨ 開始體驗最新功能！</span>
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  async dismissReleaseNotes(version) {
    localStorage.setItem('classquant_last_seen_version', version);
    this.closeModal();
    this.showToast(`已套用 v${version} 最新功能！🎀`, 'success');
    // If the currently loaded DOM does not have the latest elements, clear cache and hard reload
    if (this.appVersion !== version || !document.getElementById('onboarding-guide-btn')) {
      if ('caches' in window) {
        const keys = await caches.keys();
        for (let k of keys) {
          await caches.delete(k);
        }
      }
      setTimeout(() => location.reload(true), 300);
    }
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

          <!-- v1.7.4 -->
          <div class="p-3.5 rounded-2xl border-2 border-pink-500 bg-pink-50/30 shadow-md">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-black text-xs shadow-sm">
                v1.7.4 (手指精準接觸點浮起 • 滾動位置鎖定版)
              </span>
              <span class="text-[11px] text-pink-700 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-800 space-y-1.5 font-medium pl-1">
              <li>• 【手指精準接觸點浮起 (Pixel-Perfect Lift)】長按卡片浮起時 100% 保持在手指按壓位置，不再強制位移或往角落跳動！</li>
              <li>• 【拖曳對調後頁面滾動位置凍結】放手對調或完成排位後，畫面精準鎖定在當前瀏覽位置，不再跳至頁面頂端！</li>
              <li>• 【iOS 即時彈開讓位 (Spring Displacement)】拖動學生卡片滑過鄰近同學時，周遭卡片以 60fps 彈簧物理曲線 (cubic-bezier) 即時向旁滑動彈開讓位，空出目標卡位槽！</li>
            </ul>
          </div>

          <!-- v1.7.3 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.7.3
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【全系統語法與快取穿透防護】修復版本日誌模版嵌套字元問題，全面強化 Service Worker 離線快取穿透！</li>
            </ul>
          </div>

          <!-- v1.7.1 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.7.1
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【iOS 桌面級長按拖曳排座位】長按學生卡片 350ms 進入如 iPhone 桌面晃動模式（Jiggle Mode），手指拖移即可自由滑動，放手瞬間對調，支援「✅ 完成」一鍵鎖定！</li>
              <li>• 【標籤清單自由拖曳排序】標籤管理中心同步支援手指長按上下拖拽！</li>
            </ul>
          </div>

          <!-- v1.7.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-white shadow-sm">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-800 font-black text-xs border border-pink-300">
                v1.7.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-31</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【真實教室排座位】頂部標註【🏫 講台/黑板】方位，支援常規直排、S型蛇行、隨機換位！</li>
              <li>• 【課堂快速標籤自訂排序】標籤管理中心支援「▲ 上移 / ▼ 下移」，前 4 個標籤優先顯示於第 1 頁，並支援「📌 依自訂順序」與「📊 依使用頻率」一鍵切換！</li>
              <li>• 【班級名單與主頁同步】建立新班級或匯入名冊後，全域狀態自動同步切換，點記板即時更新！</li>
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
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【標籤管理中心強化】自訂行為與表現標籤增刪改查、分值微調與類別色彩規則強化。</li>
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
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【事後補記專區優化】課堂事後回憶補記支援多生批次勾選、常用評語模組與提交記錄流。</li>
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
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【課表排程編輯器】週一至週五第 1~8 節課表視覺化網格編輯，科任與導師班快速切換。</li>
            </ul>
          </div>

          <!-- v1.6.0 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.6.0
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【PWA 離線同步】全新 Service Worker 智能快取與版本原子化同步，保證 100% 離線可用。</li>
            </ul>
          </div>

          <!-- v1.5.4 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.5.4
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【繁體中文編碼防護】全介面 UTF-8 編碼與觸控手勢事件防禦。</li>
            </ul>
          </div>

          <!-- v1.5.3 -->
          <div class="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-black text-xs border border-slate-300">
                v1.5.3
              </span>
              <span class="text-[11px] text-slate-400 font-mono font-bold">2026-08-30</span>
            </div>
            <ul class="text-xs text-slate-600 space-y-1 font-medium pl-1">
              <li>• 【動態座標追蹤】60fps 平滑轉場與導航欄水平置中。</li>
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
            <ul class="text-xs text-slate-700 space-y-1 font-medium pl-1">
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

  toggleHeader(forceShow = false, isSilent = false) {
    const header = document.getElementById('global-header');
    const pill = document.getElementById('header-unhide-pill');
    if (!header) return;

    if (forceShow || header.classList.contains('header-collapsed')) {
      header.classList.remove('header-collapsed');
      if (pill) pill.classList.add('hidden');
      this.isHeaderCollapsed = false;
    } else {
      header.classList.add('header-collapsed');
      if (pill) pill.classList.remove('hidden');
      this.isHeaderCollapsed = true;
      if (!isSilent) this.showToast('已收合頂部橫幅，點擊上方按鈕可隨時展開 🎀', 'info');
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

    const classes = Object.values(window.appStore.getClasses());
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

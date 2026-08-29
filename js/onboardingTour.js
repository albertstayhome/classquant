/**
 * ClassQuant Hub - Dynamic Interactive Spotlight Tour Engine (v1.4.8)
 * Complete 11-Step Deep Guidance & Bulletproof Stability:
 * 1. Disabled header auto-collapse during tour (zero flickering/jumping).
 * 2. Removed confusing timetable override buttons that pushed dropdown off-screen.
 * 3. Deep 11-Step walkthrough covering Class Switch, 1-Click Excel Paste, Student Detail Edits, Matrix Scoring, Custom Tags, Retro Log, and 4-Quadrant Analytics.
 * 4. 9999px Box-Shadow dark spotlight (100% stable 85% dark screen with crystal-clear focus hole).
 * 5. Direction-aware bouncing pointer (👆 / 👇) on ALL steps!
 */

class OnboardingTour {
  constructor() {
    this.currentStep = 0;
    this.isActive = false;
    this.activeListener = null;
    this.lastTargetEl = null;
    this.touchBlocker = null;

    this.steps = [
      {
        id: "step-class-select",
        targetSelector: "#global-class-select",
        title: "1. 班級快速切換 (請切換班級)",
        content: "這裡是核心班級切換樞紐！請<strong>點擊選單切換至另一個班級</strong>（例如 803 班），導師班與數學科任班的分流點數將完全獨立計算！",
        forceAction: "change",
        tab: "matrix"
      },
      {
        id: "step-goto-roster",
        targetSelector: 'button[data-tab="roster"]',
        title: "2. 前往『班級名單』管理中心",
        content: "請<strong>親手點擊發光的「👥 班級名單」</strong>按鈕進入名單管理中心！",
        forceAction: "click",
        tab: null
      },
      {
        id: "step-roster-paste",
        targetSelector: "#roster-paste-btn",
        fallbackSelector: "#roster-manager-view button",
        title: "3. 1 秒批次貼上全班名單 (Excel 智能匯入)",
        content: "換新學期免手打！點擊<strong>「📋 1秒批次貼上名單」</strong>，直接從 Excel 或 Word 複製貼上整班名單，系統自動去除座號贅字與雜訊！",
        forceAction: null,
        tab: "roster"
      },
      {
        id: "step-roster-details",
        targetSelector: "#roster-class-select",
        fallbackSelector: "#roster-manager-view",
        title: "4. 學生名冊個別細項調整 (改名/換座號/調班)",
        content: "在名單下方，您可以<strong>隨時點擊學生卡片修改姓名、調整座號</strong>，或點擊「➕ 新增班級 / 刪除班級」，靈活管理所有任教班級！",
        forceAction: null,
        tab: "roster"
      },
      {
        id: "step-goto-matrix",
        targetSelector: 'button[data-tab="matrix"]',
        title: "5. 前往『課堂點記板』實戰",
        content: "名單建好後，現在請<strong>點擊「課堂點記板」</strong>回到座位表，體驗 3 秒極速記點！",
        forceAction: "click",
        tab: null
      },
      {
        id: "step-select-student",
        targetSelector: "#seat-card-1",
        fallbackSelector: ".student-seat-card:first-child",
        title: "6. 點選學生座位 (支援多選/分組)",
        content: "請<strong>親手點擊 1 號學生「陳冠宇」</strong>的座位方塊來選取他！（支援多選、整排快選與男女生快選）",
        forceAction: "click",
        tab: "matrix"
      },
      {
        id: "step-click-tag",
        targetSelector: "#first-quick-tag-btn",
        fallbackSelector: ".tag-page-slide button:first-child, .quick-tag-button",
        title: "7. 課堂快速記點與動態回饋",
        content: "選好學生後，請<strong>親手點擊座位正下方的第一個加分標籤</strong>為他快速記點（觸發彩帶粒子與音效）！",
        forceAction: "click",
        tab: "matrix"
      },
      {
        id: "step-custom-tags",
        targetSelector: "button[onclick*='openTagManagerModal'], button:contains('自訂')",
        fallbackSelector: "#first-quick-tag-btn",
        title: "8. 自訂班級專屬快速標籤",
        content: "每個班級上課習慣不同！點擊<strong>「⚙️ 自訂」</strong>可自訂加分/扣分項目、分值與分類，常用標籤會智慧自動排在最前頁！",
        forceAction: null,
        tab: "matrix"
      },
      {
        id: "step-retro-log",
        targetSelector: "#retro-log-top-btn",
        fallbackSelector: "button:has(i[data-lucide='clock']), button:contains('事後補記')",
        title: "9. 課堂事後補記神器 (下課 1 鍵補齊)",
        content: "上課不方便掏手機？下課回辦公室點擊<strong>「⏰ 事後補記」</strong>，1 秒批次勾選學生補記，並自動生成親師聯絡簿評語！",
        forceAction: null,
        tab: "matrix"
      },
      {
        id: "step-dashboard",
        targetSelector: 'button[data-tab="dashboard"]',
        title: "10. 段考學業 ✕ 品格常規四象限戰情室",
        content: "點擊<strong>「📊 統計戰情室」</strong>，段考後一鍵自動產出「學業均分 ✕ 常規點數」四象限拔尖與關懷清單，親師座談報告神器！",
        forceAction: null,
        tab: null
      },
      {
        id: "step-finish",
        targetSelector: "#header-version-badge",
        title: "🎉 恭喜通關！戰力全面就緒！",
        content: "您已完整掌握 ClassQuant Hub 的核心操作與進階技巧！隨時可點擊頂部<strong>「📢 公佈欄」</strong>查看更新歷史與教學指南！",
        forceAction: null,
        tab: "matrix"
      }
    ];

    this.initDOM();
  }

  initDOM() {
    if (document.getElementById('tour-overlay-container')) return;

    const container = document.createElement('div');
    container.id = 'tour-overlay-container';
    container.className = 'fixed inset-0 pointer-events-none hidden z-[9990]';
    container.innerHTML = `
      <!-- Indestructible 9999px Box-Shadow Dark Spotlight Box -->
      <div id="tour-spotlight-box"></div>

      <!-- Direction-Aware Bouncing Hand Pointer -->
      <div id="tour-pointer-container" class="fixed pointer-events-none z-[10000] hidden transition-all duration-200"></div>

      <!-- Viewport-Safe Popover Guidance Card -->
      <div id="tour-popover" class="fixed left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 w-auto sm:w-[360px] max-w-[94vw] bg-white rounded-3xl p-4 sm:p-5 shadow-2xl border-2 border-pink-300 pointer-events-auto transition-all duration-300 z-[10001] animate-fade-in-up">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-pink-100">
          <div class="flex items-center space-x-2">
            <span class="kitty-bow !w-3.5 !h-3.5"></span>
            <span id="tour-step-badge" class="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700">
              步驟 1 / 11
            </span>
          </div>
          <button onclick="onboardingTour.endTour()" class="text-xs font-bold text-slate-400 hover:text-pink-600 transition" title="結束教學">
            ✕ 結束教學
          </button>
        </div>

        <!-- Title & Content -->
        <h4 id="tour-title" class="text-sm sm:text-base font-black text-slate-900 mb-1 flex items-center gap-1.5"></h4>
        <div id="tour-content" class="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium mb-3.5"></div>

        <!-- Bottom Action Bar -->
        <div class="flex items-center justify-between pt-2 border-t border-pink-100">
          <button id="tour-skip-btn" onclick="onboardingTour.nextStep()" class="text-xs font-bold text-slate-500 hover:text-pink-600 transition">
            跳過此步 ➔
          </button>

          <div id="tour-action-container"></div>
        </div>

      </div>
    `;

    document.body.appendChild(container);
  }

  start(fromStep = 0) {
    this.isActive = true;
    this.currentStep = fromStep;

    // 1. Ensure header is expanded and stable
    if (window.appState) {
      window.appState.toggleHeader(true, true);
    }

    // 2. Lock touchmove scroll completely on mobile
    this.touchBlocker = (e) => {
      if (!e.target.closest('#tour-popover') && !e.target.closest('#global-class-select')) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchmove', this.touchBlocker, { passive: false });
    document.documentElement.classList.add('tour-locked');
    document.body.classList.add('tour-locked');

    const container = document.getElementById('tour-overlay-container');
    if (container) container.classList.remove('hidden');

    if (window.appState?.playChime) window.appState.playChime();
    this.renderStep();
  }

  renderStep() {
    if (!this.isActive) return;
    const step = this.steps[this.currentStep];
    if (!step) {
      this.endTour();
      return;
    }

    // Switch tab if specified
    if (step.tab && window.appState && window.appState.activeTab !== step.tab) {
      window.appState.switchTab(step.tab);
    }

    // Allow DOM to settle
    setTimeout(() => {
      let targetEl = document.querySelector(step.targetSelector);
      if (!targetEl && step.fallbackSelector) {
        targetEl = document.querySelector(step.fallbackSelector);
      }
      if (!targetEl) {
        targetEl = document.getElementById('classroom-matrix-view') || document.body;
      }

      // 1. Programmatically scroll viewport so target is in clear sight
      if (targetEl && targetEl !== document.body) {
        const elRect = targetEl.getBoundingClientRect();
        const currentScrollY = window.scrollY || window.pageYOffset;
        const targetScrollY = Math.max(0, currentScrollY + elRect.top - (window.innerHeight * 0.42));
        window.scrollTo({ top: targetScrollY, behavior: 'instant' });
      }

      // 2. Position 9999px Box-Shadow Spotlight and Pointer
      setTimeout(() => {
        this.highlightElement(targetEl, step);
        this.setupEnforcement(targetEl, step);
      }, 80);

    }, 150);
  }

  highlightElement(el, step) {
    const spotlight = document.getElementById('tour-spotlight-box');
    const pointer = document.getElementById('tour-pointer-container');
    const popover = document.getElementById('tour-popover');
    const titleEl = document.getElementById('tour-title');
    const contentEl = document.getElementById('tour-content');
    const badgeEl = document.getElementById('tour-step-badge');
    const actionContainer = document.getElementById('tour-action-container');

    if (!spotlight || !popover || !el) return;

    const rect = el.getBoundingClientRect();
    const pad = 6;
    const top = Math.max(0, rect.top - pad);
    const left = Math.max(0, rect.left - pad);
    const width = Math.min(window.innerWidth - left, rect.width + pad * 2);
    const height = rect.height + pad * 2;
    const bottom = top + height;

    // 1. Position 9999px Box-Shadow Spotlight Box (100% Dark Screen + 100% Bright Hole):
    spotlight.style.top = `${top}px`;
    spotlight.style.left = `${left}px`;
    spotlight.style.width = `${width}px`;
    spotlight.style.height = `${height}px`;

    // 2. Direction-Aware Animated Pointer Logic:
    const isTargetInTopHalf = (rect.top + (rect.height / 2)) < (window.innerHeight / 2);

    if (pointer) {
      pointer.classList.remove('hidden');
      const pointerCenterX = Math.max(10, Math.min(window.innerWidth - 150, left + (width / 2) - 65));

      const hintText = (step.forceAction === 'change') ? '請點此切換班級' : 
                       (step.forceAction === 'click') ? '請點擊此處目標' : '重點功能在此';

      if (isTargetInTopHalf) {
        // Target in top half -> Pointer sits BELOW and points UP (👆)
        pointer.style.top = `${bottom + 8}px`;
        pointer.style.left = `${pointerCenterX}px`;
        pointer.className = 'tour-pointer-up fixed z-[10000] pointer-events-none flex flex-col items-center';
        pointer.innerHTML = `
          <span class="text-3xl filter drop-shadow-[0_4px_12px_rgba(244,63,94,0.95)]">👆</span>
          <span class="bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[11px] px-3 py-0.5 rounded-full shadow-xl border border-white whitespace-nowrap mt-0.5">
            ${hintText}
          </span>
        `;
      } else {
        // Target in bottom half -> Pointer sits ABOVE and points DOWN (👇)
        pointer.style.top = `${Math.max(10, top - 68)}px`;
        pointer.style.left = `${pointerCenterX}px`;
        pointer.className = 'tour-pointer-down fixed z-[10000] pointer-events-none flex flex-col items-center';
        pointer.innerHTML = `
          <span class="bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[11px] px-3 py-0.5 rounded-full shadow-xl border border-white whitespace-nowrap mb-0.5">
            ${hintText}
          </span>
          <span class="text-3xl filter drop-shadow-[0_4px_12px_rgba(244,63,94,0.95)]">👇</span>
        `;
      }
    }

    // 3. Viewport Safe Popover Positioning:
    if (isTargetInTopHalf) {
      popover.style.top = 'auto';
      popover.style.bottom = 'max(14px, env(safe-area-inset-bottom, 14px))';
    } else {
      popover.style.bottom = 'auto';
      popover.style.top = 'max(14px, env(safe-area-inset-top, 14px))';
    }

    // 4. Populate Text Content:
    badgeEl.innerText = `步驟 ${this.currentStep + 1} / ${this.steps.length}`;
    titleEl.innerHTML = step.title;
    contentEl.innerHTML = step.content;

    // Action button area
    if (step.forceAction === 'click' || step.forceAction === 'change') {
      actionContainer.innerHTML = `
        <div class="px-3 py-1.5 rounded-xl bg-pink-100 text-pink-700 text-xs font-black flex items-center gap-1 animate-pulse border border-pink-300">
          <span>👆</span>
          <span>請操作發光目標</span>
        </div>
      `;
    } else if (this.currentStep === this.steps.length - 1) {
      actionContainer.innerHTML = `
        <button onclick="onboardingTour.endTour()" class="px-4 py-2 rounded-2xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-xs shadow-md transition flex items-center gap-1 active:scale-95">
          <span>✨ 完成並開始使用！</span>
        </button>
      `;
    } else {
      actionContainer.innerHTML = `
        <button onclick="onboardingTour.nextStep()" class="px-4 py-2 rounded-xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-xs shadow-md transition flex items-center gap-1 active:scale-95">
          <span>下一步 ➔</span>
        </button>
      `;
    }

    if (window.lucide) window.lucide.createIcons();
  }

  setupEnforcement(targetEl, step) {
    if (this.activeListener && this.lastTargetEl) {
      this.lastTargetEl.removeEventListener('click', this.activeListener);
      this.lastTargetEl.removeEventListener('change', this.activeListener);
    }

    if (step.forceAction === 'click') {
      const listener = (e) => {
        if (window.appState?.playPop) window.appState.playPop();
        setTimeout(() => this.nextStep(), 350);
      };

      targetEl.addEventListener('click', listener, { once: true });
      this.activeListener = listener;
      this.lastTargetEl = targetEl;
    } else if (step.forceAction === 'change') {
      const listener = (e) => {
        if (window.appState?.playPop) window.appState.playPop();
        setTimeout(() => this.nextStep(), 350);
      };

      targetEl.addEventListener('change', listener, { once: true });
      this.activeListener = listener;
      this.lastTargetEl = targetEl;
    }
  }

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.renderStep();
      if (window.appState?.playPop) window.appState.playPop();
    } else {
      this.endTour();
      if (window.appState?.playChime) window.appState.playChime();
      window.appState.showToast('🎉 恭喜完成實戰教學！ClassQuant Hub 戰情室已完全就緒！🎀', 'success');
    }
  }

  endTour() {
    this.isActive = false;

    // 1. Remove touchmove scroll lock
    if (this.touchBlocker) {
      document.removeEventListener('touchmove', this.touchBlocker, { passive: false });
      this.touchBlocker = null;
    }
    document.documentElement.classList.remove('tour-locked');
    document.body.classList.remove('tour-locked');

    if (this.activeListener && this.lastTargetEl) {
      this.lastTargetEl.removeEventListener('click', this.activeListener);
      this.lastTargetEl.removeEventListener('change', this.activeListener);
      this.lastTargetEl = null;
    }

    const pointer = document.getElementById('tour-pointer-container');
    if (pointer) pointer.classList.add('hidden');

    const container = document.getElementById('tour-overlay-container');
    if (container) container.classList.add('hidden');

    localStorage.setItem('classquant_tour_completed', 'true');
  }
}

// Global Onboarding Tour Instance
window.onboardingTour = new OnboardingTour();

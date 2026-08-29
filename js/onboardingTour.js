/**
 * ClassQuant Hub - Dynamic Interactive Spotlight Tour Engine (v1.4.6)
 * Core Architecture:
 * 1. Clip-Path Dark Spotlight:
 *    82% dark backdrop covers entire screen, precisely clipped with a hollow transparent hole over target.
 *    Target is 100% naturally bright, stands out clearly, and clicks pass directly through to the button!
 * 2. Absolute TouchMove Scroll Lock (passive: false):
 *    Completely prevents mobile touch dragging/scrolling, 100% stable viewport!
 * 3. Direction-Aware Animated Pointer:
 *    - Targets in top half -> Pointer sits BELOW and points UP (👆 請點上方發光目標)
 *    - Targets in bottom half -> Pointer sits ABOVE and points DOWN (👇 請點下方發光目標)
 * 4. Safe Area Pinned Popover:
 *    Auto-flips to opposite side of screen, 100% inside mobile viewport.
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
        title: "1. 認識班級切換",
        content: "這裡可以隨時切換<strong>「導師本班 (801)」</strong>與<strong>「數學科任班 (803/805)」</strong>。<br>常規與學業解題分班獨立計算！",
        forceAction: null,
        tab: "matrix"
      },
      {
        id: "step-goto-roster",
        targetSelector: 'button[data-tab="roster"]',
        title: "2. 前往『班級名單』",
        content: "請<strong>親手點擊發光的「👥 班級名單」</strong>按鈕進入名單管理！",
        forceAction: "click",
        tab: null
      },
      {
        id: "step-roster-actions",
        targetSelector: "#roster-manager-view",
        title: "3. 班級名單與 1 鍵匯入",
        content: "支援<strong>「1 鍵批次貼上名冊」</strong>！直接從 Excel/Word 複製貼上，系統自動去除贅字與座號雜訊！",
        forceAction: null,
        tab: "roster"
      },
      {
        id: "step-goto-matrix",
        targetSelector: 'button[data-tab="matrix"]',
        title: "4. 前往『課堂點記板』實戰",
        content: "現在請<strong>親手點擊「課堂點記板」</strong>回到座位表，體驗 3 秒極速記點！",
        forceAction: "click",
        tab: null
      },
      {
        id: "step-select-student",
        targetSelector: "#seat-card-1",
        fallbackSelector: ".student-seat-card:first-child",
        title: "5. 點選學生座位",
        content: "請<strong>親手點擊 1 號學生「陳冠宇」</strong>的座位方塊來選取他！",
        forceAction: "click",
        tab: "matrix"
      },
      {
        id: "step-click-tag",
        targetSelector: "#first-quick-tag-btn",
        fallbackSelector: ".tag-page-slide button:first-child, .quick-tag-button",
        title: "6. 點擊課堂加分標籤",
        content: "選好學生後，請<strong>親手點擊座位正下方的第一個加分標籤</strong>為他快速記點！",
        forceAction: "click",
        tab: "matrix"
      },
      {
        id: "step-retro-log",
        targetSelector: "#retro-log-top-btn",
        fallbackSelector: "button:has(i[data-lucide='clock']), button:contains('事後補記')",
        title: "7. 課堂事後補記神器",
        content: "上課無法掏手機時，下課回辦公室點擊<strong>「⏰ 事後補記」</strong>，1 秒批次補齊並寫評語！",
        forceAction: null,
        tab: "matrix"
      },
      {
        id: "step-finish",
        targetSelector: "#header-version-badge",
        title: "🎉 恭喜完成實戰教學！",
        content: "您已親手掌握 ClassQuant 戰情室的核心操作！隨時可點擊頂部<strong>「📢 公佈欄」</strong>查看歷史功能與教學提醒！",
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
      <!-- 82% Dark Fullscreen Backdrop with Dynamic Clip-Path Cutout Hole -->
      <div id="tour-backdrop"></div>

      <!-- Glowing Pink Ring Border around the Cutout Hole -->
      <div id="tour-spotlight-ring"></div>

      <!-- Direction-Aware Bouncing Hand Pointer -->
      <div id="tour-pointer-container" class="fixed pointer-events-none z-[10000] hidden transition-all duration-200"></div>

      <!-- Viewport-Safe Popover Guidance Card -->
      <div id="tour-popover" class="fixed left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 w-auto sm:w-[360px] max-w-[94vw] bg-white rounded-3xl p-4 sm:p-5 shadow-2xl border-2 border-pink-300 pointer-events-auto transition-all duration-300 z-[10001] animate-fade-in-up">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-pink-100">
          <div class="flex items-center space-x-2">
            <span class="kitty-bow !w-3.5 !h-3.5"></span>
            <span id="tour-step-badge" class="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700">
              步驟 1 / 8
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

    // 1. Lock touchmove scroll completely on mobile
    this.touchBlocker = (e) => {
      // Allow interaction with buttons inside popover or target, but cancel all native page scrolling!
      if (!e.target.closest('#tour-popover')) {
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

      // 2. Position clip-path dark backdrop and direction-aware pointer
      setTimeout(() => {
        this.highlightElement(targetEl, step);
        this.setupEnforcement(targetEl, step);
      }, 60);

    }, 120);
  }

  highlightElement(el, step) {
    const backdrop = document.getElementById('tour-backdrop');
    const ring = document.getElementById('tour-spotlight-ring');
    const pointer = document.getElementById('tour-pointer-container');
    const popover = document.getElementById('tour-popover');
    const titleEl = document.getElementById('tour-title');
    const contentEl = document.getElementById('tour-content');
    const badgeEl = document.getElementById('tour-step-badge');
    const actionContainer = document.getElementById('tour-action-container');

    if (!backdrop || !popover || !el) return;

    const rect = el.getBoundingClientRect();
    const pad = 6;
    const top = Math.max(0, rect.top - pad);
    const left = Math.max(0, rect.left - pad);
    const width = Math.min(window.innerWidth - left, rect.width + pad * 2);
    const height = rect.height + pad * 2;
    const right = left + width;
    const bottom = top + height;

    // 1. Cutout Hollow Hole in 82% Dark Backdrop using CSS Polygon:
    backdrop.style.clipPath = `polygon(0% 0%, 0% 100%, ${left}px 100%, ${left}px ${top}px, ${right}px ${top}px, ${right}px ${bottom}px, ${left}px ${bottom}px, ${left}px 100%, 100% 100%, 100% 0%)`;

    // 2. Position Glowing Ring Border
    ring.style.top = `${top}px`;
    ring.style.left = `${left}px`;
    ring.style.width = `${width}px`;
    ring.style.height = `${height}px`;

    // 3. Direction-Aware Animated Pointer Logic:
    const isTargetInTopHalf = (rect.top + (rect.height / 2)) < (window.innerHeight / 2);

    if (pointer && step.forceAction === 'click') {
      pointer.classList.remove('hidden');
      const pointerCenterX = Math.max(10, Math.min(window.innerWidth - 140, left + (width / 2) - 60));

      if (isTargetInTopHalf) {
        // Target in top half -> Pointer sits BELOW and points UP (👆)
        pointer.style.top = `${bottom + 8}px`;
        pointer.style.left = `${pointerCenterX}px`;
        pointer.className = 'tour-pointer-up fixed z-[10000] pointer-events-none flex flex-col items-center';
        pointer.innerHTML = `
          <span class="text-3xl filter drop-shadow-[0_4px_12px_rgba(244,63,94,0.95)]">👆</span>
          <span class="bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[11px] px-3 py-0.5 rounded-full shadow-xl border border-white whitespace-nowrap mt-0.5">
            請點上方發光目標
          </span>
        `;
      } else {
        // Target in bottom half -> Pointer sits ABOVE and points DOWN (👇)
        pointer.style.top = `${Math.max(10, top - 68)}px`;
        pointer.style.left = `${pointerCenterX}px`;
        pointer.className = 'tour-pointer-down fixed z-[10000] pointer-events-none flex flex-col items-center';
        pointer.innerHTML = `
          <span class="bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[11px] px-3 py-0.5 rounded-full shadow-xl border border-white whitespace-nowrap mb-0.5">
            請點下方發光目標
          </span>
          <span class="text-3xl filter drop-shadow-[0_4px_12px_rgba(244,63,94,0.95)]">👇</span>
        `;
      }
    } else if (pointer) {
      pointer.classList.add('hidden');
    }

    // 4. Viewport Safe Popover Positioning:
    if (isTargetInTopHalf) {
      // Popover stays safely at BOTTOM
      popover.style.top = 'auto';
      popover.style.bottom = 'max(14px, env(safe-area-inset-bottom, 14px))';
    } else {
      // Popover stays safely at TOP
      popover.style.bottom = 'auto';
      popover.style.top = 'max(14px, env(safe-area-inset-top, 14px))';
    }

    // 5. Populate Text Content:
    badgeEl.innerText = `步驟 ${this.currentStep + 1} / ${this.steps.length}`;
    titleEl.innerHTML = step.title;
    contentEl.innerHTML = step.content;

    // Action button area
    if (step.forceAction === 'click') {
      actionContainer.innerHTML = `
        <div class="px-3 py-1.5 rounded-xl bg-pink-100 text-pink-700 text-xs font-black flex items-center gap-1 animate-pulse border border-pink-300">
          <span>👆</span>
          <span>請在畫面點擊發光目標</span>
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
    }

    if (step.forceAction === 'click') {
      const listener = (e) => {
        if (window.appState?.playPop) window.appState.playPop();
        setTimeout(() => this.nextStep(), 350);
      };

      targetEl.addEventListener('click', listener, { once: true });
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

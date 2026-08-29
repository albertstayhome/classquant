/**
 * ClassQuant Hub - Dynamic Interactive Spotlight Tour Engine (v1.4.1)
 * Features:
 * - Dynamic spotlight focus hole on target element with glowing pink pulse border.
 * - Animated bouncing indicator arrows pointing directly at the target.
 * - Interactive step enforcement: waits for user to click the actual button/card to advance!
 * - Skip buttons on every step and smooth transitions across tabs and modals.
 */

class OnboardingTour {
  constructor() {
    this.currentStep = 0;
    this.isActive = false;
    this.activeListener = null;

    this.steps = [
      {
        id: "step-class-select",
        targetSelector: "#global-class-select",
        title: "1. 認識班級切換",
        content: "這裡可以切換<strong>「導師本班 (801)」</strong>與<strong>「數學科任班 (803/805)」</strong>。<br>系統已為您分開計算生活常規與學業解題！",
        arrowDirection: "up",
        forceAction: null, // Just click next
        tab: "matrix"
      },
      {
        id: "step-goto-roster",
        targetSelector: 'button[data-tab="roster"]',
        title: "2. 前往『班級名單』",
        content: "請<strong>點擊這裡</strong>進入班級名單，準備匯入或建立您真實的學生名冊！",
        arrowDirection: "up",
        forceAction: "click",
        tab: null
      },
      {
        id: "step-roster-actions",
        targetSelector: "#roster-manager-view",
        title: "3. 班級名單與 1 鍵匯入",
        content: "支援<strong>「1 鍵批次貼上名冊」</strong>！直接從學校 Excel/Word 複製貼上，系統自動去除贅字與座號雜訊！",
        arrowDirection: "down",
        forceAction: null,
        tab: "roster"
      },
      {
        id: "step-goto-matrix",
        targetSelector: 'button[data-tab="matrix"]',
        title: "4. 前往『課堂點記板』實戰",
        content: "現在請<strong>點擊這裡</strong>回到課堂點記板，體驗 3 秒極速記點！",
        arrowDirection: "up",
        forceAction: "click",
        tab: null
      },
      {
        id: "step-select-student",
        targetSelector: ".student-seat-card:first-child",
        title: "5. 點選學生座位",
        content: "請<strong>點擊 1 號學生「陳冠宇」</strong>的座位方塊來選取他！",
        arrowDirection: "left",
        forceAction: "click",
        tab: "matrix"
      },
      {
        id: "step-click-tag",
        targetSelector: ".tag-page-slide button:first-child",
        title: "6. 點擊課堂加分標籤",
        content: "選好學生後，請<strong>點擊下方第一個加分標籤</strong>為他快速記點！",
        arrowDirection: "up",
        forceAction: "click",
        tab: "matrix"
      },
      {
        id: "step-retro-log",
        targetSelector: "button:has(i[data-lucide='clock']), button:contains('事後補記'), .retro-log-btn-target",
        fallbackSelector: "#classroom-matrix-view header button, #classroom-matrix-view button.bg-amber-500\\/10, #classroom-matrix-view button:nth-child(4)",
        title: "7. 課堂事後補記神器",
        content: "上課無法掏手機時，下課回辦公室點擊<strong>「⏰ 事後補記」</strong>，1 秒批次補齊並寫評語！",
        arrowDirection: "down",
        forceAction: null,
        tab: "matrix"
      },
      {
        id: "step-finish",
        targetSelector: "#header-version-badge",
        title: "🎉 恭喜完成實戰教學！",
        content: "您已掌握 ClassQuant 戰情室的核心心法！隨時可點擊頂部<strong>「📢 公佈欄」</strong>查看歷史功能與教學提醒！",
        arrowDirection: "up",
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
    container.className = 'fixed inset-0 z-[9999] pointer-events-none hidden';
    container.innerHTML = `
      <!-- Dark Cutout Backdrop -->
      <div id="tour-backdrop" class="absolute inset-0 bg-black/60 backdrop-blur-[1px] transition-all duration-300 pointer-events-auto"></div>

      <!-- Spotlight Highlight Box -->
      <div id="tour-spotlight" class="absolute transition-all duration-300 rounded-2xl ring-4 ring-pink-500 shadow-[0_0_25px_rgba(244,63,94,0.85)] pointer-events-auto cursor-pointer"></div>

      <!-- Floating Popover Card -->
      <div id="tour-popover" class="absolute w-[310px] sm:w-[350px] bg-white rounded-3xl p-5 shadow-2xl border-2 border-pink-300 pointer-events-auto transition-all duration-300 animate-fade-in-up">
        
        <!-- Bouncing Pointer Arrow -->
        <div id="tour-arrow" class="absolute w-4 h-4 bg-white border-t-2 border-l-2 border-pink-300 rotate-45 transition-all"></div>

        <!-- Header -->
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-pink-100">
          <div class="flex items-center space-x-2">
            <span class="kitty-bow !w-3.5 !h-3.5"></span>
            <span id="tour-step-badge" class="text-[11px] font-black px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
              步驟 1 / 8
            </span>
          </div>
          <button onclick="onboardingTour.endTour()" class="text-xs font-bold text-slate-400 hover:text-pink-600 transition" title="結束教學">
            ✕ 結束教學
          </button>
        </div>

        <!-- Title & Content -->
        <h4 id="tour-title" class="text-sm sm:text-base font-black text-slate-900 mb-1.5 flex items-center gap-1.5"></h4>
        <div id="tour-content" class="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium mb-4"></div>

        <!-- Actions -->
        <div class="flex items-center justify-between pt-2 border-t border-pink-100">
          <button id="tour-skip-btn" onclick="onboardingTour.nextStep()" class="text-xs font-bold text-slate-500 hover:text-pink-600 transition">
            跳過此步 ➔
          </button>

          <button id="tour-action-btn" onclick="onboardingTour.handleActionBtnClick()" class="px-4 py-2 rounded-xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-xs shadow-md transition flex items-center gap-1 active:scale-95">
            <span id="tour-action-btn-text">下一步 ➔</span>
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(container);
  }

  start(fromStep = 0) {
    this.isActive = true;
    this.currentStep = fromStep;
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

    // Wait a moment for DOM rendering
    setTimeout(() => {
      let targetEl = document.querySelector(step.targetSelector);
      if (!targetEl && step.fallbackSelector) {
        targetEl = document.querySelector(step.fallbackSelector);
      }
      if (!targetEl) {
        // If still not found, try body center
        targetEl = document.getElementById('classroom-matrix-view') || document.body;
      }

      this.highlightElement(targetEl, step);
      this.setupEnforcement(targetEl, step);
    }, 150);
  }

  highlightElement(el, step) {
    const spotlight = document.getElementById('tour-spotlight');
    const popover = document.getElementById('tour-popover');
    const titleEl = document.getElementById('tour-title');
    const contentEl = document.getElementById('tour-content');
    const badgeEl = document.getElementById('tour-step-badge');
    const actionBtnText = document.getElementById('tour-action-btn-text');
    const arrow = document.getElementById('tour-arrow');

    if (!spotlight || !popover || !el) return;

    // Scroll element into view smoothly
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Calculate dimensions
    const rect = el.getBoundingClientRect();
    const padding = 8;

    spotlight.style.top = `${Math.max(0, rect.top - padding + window.scrollY)}px`;
    spotlight.style.left = `${Math.max(0, rect.left - padding)}px`;
    spotlight.style.width = `${rect.width + padding * 2}px`;
    spotlight.style.height = `${rect.height + padding * 2}px`;

    // Populate text
    badgeEl.innerText = `步驟 ${this.currentStep + 1} / ${this.steps.length}`;
    titleEl.innerHTML = step.title;
    contentEl.innerHTML = step.content;

    if (step.forceAction === 'click') {
      actionBtnText.innerText = '👆 請點擊高亮目標';
    } else if (this.currentStep === this.steps.length - 1) {
      actionBtnText.innerText = '✨ 完成並開始使用！';
    } else {
      actionBtnText.innerText = '下一步 ➔';
    }

    // Position popover intelligently (below target or above target)
    const popoverHeight = 220;
    const isBelow = (rect.bottom + popoverHeight + 30) < window.innerHeight;
    
    let popoverTop = isBelow 
      ? (rect.bottom + 16 + window.scrollY) 
      : (Math.max(20, rect.top - popoverHeight - 16 + window.scrollY));
    let popoverLeft = Math.max(12, Math.min(window.innerWidth - 330, rect.left + (rect.width / 2) - 155));

    popover.style.top = `${popoverTop}px`;
    popover.style.left = `${popoverLeft}px`;

    // Position arrow
    if (isBelow) {
      arrow.className = 'absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t-2 border-l-2 border-pink-300 rotate-45';
    } else {
      arrow.className = 'absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-pink-300 rotate-45';
    }

    if (window.lucide) window.lucide.createIcons();
  }

  setupEnforcement(targetEl, step) {
    // Remove previous listener if any
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

  handleActionBtnClick() {
    const step = this.steps[this.currentStep];
    if (step.forceAction === 'click') {
      // Trigger click on target element for the user
      let targetEl = document.querySelector(step.targetSelector);
      if (targetEl) targetEl.click();
    } else {
      this.nextStep();
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
    if (this.activeListener && this.lastTargetEl) {
      this.lastTargetEl.removeEventListener('click', this.activeListener);
    }
    const container = document.getElementById('tour-overlay-container');
    if (container) container.classList.add('hidden');
    localStorage.setItem('classquant_tour_completed', 'true');
  }
}

// Global Onboarding Tour Instance
window.onboardingTour = new OnboardingTour();

/**
 * ClassQuant Hub - Dynamic Interactive Spotlight Tour Engine (v1.4.2)
 * Pure Zero-Obstruction Real-Action Walkthrough:
 * 1. Target-attached animated floating pointer (👆 請點這裡！) directly on the real DOM element.
 * 2. Zero-obstruction smart positioning: Popover sits at TOP when target is at bottom, and vice versa.
 * 3. Strict Real-Action Tap: Removes confusing bypass buttons from the popover so users must tap the real target.
 * 4. Step skip & exit buttons for full teacher autonomy.
 */

class OnboardingTour {
  constructor() {
    this.currentStep = 0;
    this.isActive = false;
    this.activeListener = null;
    this.lastTargetEl = null;

    this.steps = [
      {
        id: "step-class-select",
        targetSelector: "#global-class-select",
        title: "1. 認識班級切換",
        content: "這裡可以隨時切換<strong>「導師本班 (801)」</strong>與<strong>「數學科任班 (803/805)」</strong>。<br>常規與學業解題分班獨立計算！",
        forceAction: null, // Informational
        tab: "matrix"
      },
      {
        id: "step-goto-roster",
        targetSelector: 'button[data-tab="roster"]',
        title: "2. 前往『班級名單』",
        content: "請<strong>親手點擊上方發光的「👥 班級名單」</strong>按鈕進入名單管理！",
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
        targetSelector: ".student-seat-card:first-child",
        title: "5. 點選學生座位",
        content: "請<strong>親手點擊 1 號學生「陳冠宇」</strong>的座位方塊來選取他！",
        forceAction: "click",
        tab: "matrix"
      },
      {
        id: "step-click-tag",
        targetSelector: ".tag-page-slide button:first-child",
        title: "6. 點擊課堂加分標籤",
        content: "選好學生後，請<strong>親手點擊座位正下方的第一個加分標籤</strong>為他快速記點！",
        forceAction: "click",
        tab: "matrix"
      },
      {
        id: "step-retro-log",
        targetSelector: "button:has(i[data-lucide='clock']), button:contains('事後補記'), .retro-log-btn-target",
        fallbackSelector: "#classroom-matrix-view header button, #classroom-matrix-view button.bg-amber-500\\/10, #classroom-matrix-view button:nth-child(4)",
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
    container.className = 'fixed inset-0 z-[9999] pointer-events-none hidden';
    container.innerHTML = `
      <!-- Dark Cutout Backdrop -->
      <div id="tour-backdrop" class="absolute inset-0 bg-black/60 backdrop-blur-[1px] transition-all duration-300 pointer-events-auto"></div>

      <!-- Spotlight Highlight Box (Transparent cutout over real target) -->
      <div id="tour-spotlight" class="absolute transition-all duration-300 rounded-2xl ring-4 ring-pink-500 shadow-[0_0_35px_rgba(244,63,94,0.95)] pointer-events-none"></div>

      <!-- Floating Bouncing Hand Pointer (Attached directly to real target element) -->
      <div id="tour-hand-pointer" class="tour-target-hand absolute pointer-events-none z-[10001] flex flex-col items-center transition-all duration-300 hidden">
        <span class="text-3xl filter drop-shadow-[0_4px_10px_rgba(244,63,94,0.9)]">👆</span>
        <span class="bg-gradient-to-r from-pink-600 to-rose-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-lg border border-white whitespace-nowrap mt-0.5">
          請點這裡！
        </span>
      </div>

      <!-- Zero-Obstruction Popover Guidance Card -->
      <div id="tour-popover" class="fixed left-1/2 -translate-x-1/2 w-[90%] max-w-[350px] bg-white rounded-3xl p-5 shadow-2xl border-2 border-pink-300 pointer-events-auto transition-all duration-300 z-[10000] animate-fade-in-up">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-2 mb-2.5 border-b border-pink-100">
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
        <h4 id="tour-title" class="text-sm sm:text-base font-black text-slate-900 mb-1.5 flex items-center gap-1.5"></h4>
        <div id="tour-content" class="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium mb-4"></div>

        <!-- Bottom Action Bar (Clear separation between Action vs Skip) -->
        <div class="flex items-center justify-between pt-2 border-t border-pink-100">
          <button id="tour-skip-btn" onclick="onboardingTour.nextStep()" class="text-xs font-bold text-slate-500 hover:text-pink-600 transition">
            跳過此步 ➔
          </button>

          <div id="tour-action-container">
            <!-- Dynamically populated: Next button for info steps, OR pulsing hint badge for real tap steps -->
          </div>
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

    // Wait a moment for DOM rendering and transition
    setTimeout(() => {
      let targetEl = document.querySelector(step.targetSelector);
      if (!targetEl && step.fallbackSelector) {
        targetEl = document.querySelector(step.fallbackSelector);
      }
      if (!targetEl) {
        targetEl = document.getElementById('classroom-matrix-view') || document.body;
      }

      this.highlightElement(targetEl, step);
      this.setupEnforcement(targetEl, step);
    }, 180);
  }

  highlightElement(el, step) {
    const spotlight = document.getElementById('tour-spotlight');
    const popover = document.getElementById('tour-popover');
    const handPointer = document.getElementById('tour-hand-pointer');
    const titleEl = document.getElementById('tour-title');
    const contentEl = document.getElementById('tour-content');
    const badgeEl = document.getElementById('tour-step-badge');
    const actionContainer = document.getElementById('tour-action-container');

    if (!spotlight || !popover || !el) return;

    // Scroll element into view smoothly
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Calculate element dimensions
    const rect = el.getBoundingClientRect();
    const padding = 8;

    spotlight.style.top = `${Math.max(0, rect.top - padding + window.scrollY)}px`;
    spotlight.style.left = `${Math.max(0, rect.left - padding)}px`;
    spotlight.style.width = `${rect.width + padding * 2}px`;
    spotlight.style.height = `${rect.height + padding * 2}px`;

    // Attach Bouncing Hand Pointer directly on top of the target
    if (handPointer && step.forceAction === 'click') {
      handPointer.classList.remove('hidden');
      handPointer.style.top = `${Math.max(10, rect.top - 60 + window.scrollY)}px`;
      handPointer.style.left = `${rect.left + (rect.width / 2) - 30}px`;
    } else if (handPointer) {
      handPointer.classList.add('hidden');
    }

    // Populate card text
    badgeEl.innerText = `步驟 ${this.currentStep + 1} / ${this.steps.length}`;
    titleEl.innerHTML = step.title;
    contentEl.innerHTML = step.content;

    // ZERO-OBSTRUCTION SMART POSITIONING:
    // If target is in the bottom half of the screen, place card at TOP (16px from top)
    // If target is in the top half of the screen, place card at BOTTOM (16px from bottom)
    const isTargetInBottomHalf = (rect.top + (rect.height / 2)) > (window.innerHeight / 2);

    if (isTargetInBottomHalf) {
      popover.style.top = '18px';
      popover.style.bottom = 'auto';
    } else {
      popover.style.bottom = '18px';
      popover.style.top = 'auto';
    }

    // Action button area logic:
    // If user must perform a real action, show a non-clickable status indicator, NOT a bypass button!
    if (step.forceAction === 'click') {
      actionContainer.innerHTML = `
        <div class="px-3 py-1.5 rounded-xl bg-pink-100 text-pink-700 text-xs font-black flex items-center gap-1 animate-pulse border border-pink-300">
          <span>👆</span>
          <span>請在畫面點擊發光目標</span>
        </div>
      `;
    } else if (this.currentStep === this.steps.length - 1) {
      actionContainer.innerHTML = `
        <button onclick="onboardingTour.endTour()" class="px-5 py-2 rounded-2xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-xs shadow-md transition flex items-center gap-1 active:scale-95">
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
    // Remove previous listener if any
    if (this.activeListener && this.lastTargetEl) {
      this.lastTargetEl.removeEventListener('click', this.activeListener);
    }

    if (step.forceAction === 'click') {
      const listener = (e) => {
        if (window.appState?.playPop) window.appState.playPop();
        // Give time for target's own action (tab switch, point addition, seat toggle) to render
        setTimeout(() => this.nextStep(), 380);
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

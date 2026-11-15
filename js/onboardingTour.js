/**
 * ClassQuant Hub - Dynamic Interactive Spotlight Tour Engine (v1.5.2)
 * Comprehensive Hands-on Educational Tour:
 * 1. Horizontal Scroll Auto-Centering: Prevents off-screen target distortion on mobile nav bar.
 * 2. Real Hands-on Task Guidance: Real classroom point clicking, roster edits, batch retro-logging, and quadrant charts.
 * 3. Safe Query Protection & Double-Frame Bounding Calculation: Zero lag, 100% crash-proof.
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
        title: "1. 班級切換樞紐 (請切換班級)",
        content: "這裡是跨班級的核心切換樞紐！請<strong>點擊選單切換至另一個班級</strong>（例如 803 班），導師班與科任班的點數與常規完全獨立計算！",
        forceAction: "change",
        tab: "matrix"
      },
      {
        id: "step-select-student",
        targetSelector: "#seat-card-1",
        fallbackSelector: ".student-seat-card:first-child",
        title: "2. 點選學生座位 (支援多選/分組)",
        content: "上課互動記點第一步！請<strong>親手點擊 1 號「陳冠宇」</strong>的座位卡片（卡片會亮起粉色選取框，支援多選與男女生快選）！",
        forceAction: "click",
        tab: "matrix"
      },
      {
        id: "step-click-tag",
        targetSelector: "#first-quick-tag-btn",
        fallbackSelector: ".tag-page-slide button:first-child",
        title: "3. 課堂快速記點與動態加分",
        content: "選好學生後，請<strong>點擊第一個加分標籤「主動解出難題 (+3)」</strong>，觀察座位跳出動態加分氣泡、彩帶粒子與音效回饋！",
        forceAction: "click",
        tab: "matrix"
      },
      {
        id: "step-custom-tags",
        targetSelector: "#custom-tag-open-btn",
        fallbackSelector: ".glass-card button i[data-lucide='settings']",
        title: "4. 自訂班級專屬快速標籤",
        content: "各科上課習慣不同！請<strong>點擊「⚙️ 自訂」</strong>，可新增/修改加扣分項目與分值，常用標籤會自動按頻率排在最前面！",
        forceAction: "click",
        tab: "matrix"
      },
      {
        id: "step-goto-roster",
        targetSelector: 'button[data-tab="students"]',
        title: "5. 前往『👥 班級與學生』中心",
        content: "請<strong>點擊發光的「👥 班級與學生」</strong>按鈕，即可管理班級名單、查看學生個人表現與歷史記事！",
        forceAction: "click",
        tab: null
      },
      {
        id: "step-roster-paste",
        targetSelector: "#roster-paste-btn",
        fallbackSelector: "#roster-manager-view button",
        title: "6. 1 秒批次貼上名冊 (Excel 智能匯入)",
        content: "換新學期免手打！請<strong>點擊「📋 1秒批次貼上名單」</strong>，系統支援直接複製 Excel 整班名冊，自動去除座號數字與雜訊！",
        forceAction: "click",
        tab: "roster"
      },
      {
        id: "step-roster-details",
        targetSelector: "#roster-manager-view .grid > div:first-child",
        fallbackSelector: "#roster-class-select",
        title: "7. 學生名冊個別細項編修 (改名/換座號)",
        content: "在名單清單中，您可以<strong>直接修改任意學生姓名、調整座號</strong>，或點擊「➕ 新增一位學生」與「修改班名/屬性」，名單調整即時同步全站！",
        forceAction: null,
        tab: "roster"
      },
      {
        id: "step-goto-retro",
        targetSelector: "#retro-log-top-btn",
        fallbackSelector: 'button[data-tab="matrix"]',
        title: "8. 切換至『⏰ 事後補記』工作台",
        content: "下課回辦公室神器！請<strong>點擊「⏰ 事後補記」</strong>，直接在點記板分頁內進入事後批次補記工作台（用完可點頂部「⚡ 即時點記」切回）！",
        forceAction: "click",
        tab: "matrix"
      },
      {
        id: "step-retro-action",
        targetSelector: "#retro-odd-btn",
        fallbackSelector: "#retro-submit-btn",
        title: "9. 事後補記實戰 (單號快選 ➔ 評語 ➔ 1鍵送出)",
        content: "請先體驗點擊<strong>「單號(男)」</strong>（或任選學生卡片與常用評語標籤），完成並按下方「✨ 立即 1 鍵批次補記」後，再按<strong>「下一步 ➔」</strong>繼續導覽！",
        forceAction: null,
        tab: "retro"
      },
      {
        id: "step-goto-dashboard",
        targetSelector: 'button[data-tab="grades"]',
        title: "10. 前往『💯 平時成績』結算戰情室",
        content: "請<strong>點擊「💯 平時成績」</strong>，查看即時排行、設定平時成績換算公式，以及段考一鍵匯出 Excel 與歸檔！",
        forceAction: "click",
        tab: null
      },
      {
        id: "step-dashboard-charts",
        targetSelector: "#dashboard-view .glass-card:first-child",
        fallbackSelector: "#dashboard-view",
        title: "11. 平時成績計算、段考結算與歷史累積",
        content: "系統自動將課堂點數換算成班級平時成績與排行；每次段考後可<strong>一鍵匯出 Excel 並歸檔重算</strong>，歷次段考與累積平均永久保存！",
        forceAction: null,
        tab: "grades"
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

  safeQuerySelector(selector) {
    if (!selector) return null;
    try {
      const candidates = document.querySelectorAll(selector);
      if (!candidates || candidates.length === 0) return null;
      for (const el of candidates) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return el;
      }
      return candidates[0];
    } catch (e) {
      console.warn('Invalid selector in tour step:', selector, e);
      return null;
    }
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
      <div id="tour-pointer-container" class="fixed pointer-events-none z-[10000] hidden transition-all duration-150"></div>

      <!-- Viewport-Safe Popover Guidance Card -->
      <div id="tour-popover" class="fixed left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 w-auto sm:w-[360px] max-w-[94vw] bg-white rounded-3xl p-4 sm:p-5 shadow-2xl border-2 border-pink-300 pointer-events-auto transition-all duration-200 z-[10001] animate-fade-in-up">
        
        <!-- Header -->
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-pink-100">
          <div class="flex items-center space-x-2">
            <span class="kitty-bow !w-3.5 !h-3.5"></span>
            <span id="tour-step-badge" class="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700">
              步驟 1 / 12
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

    // 1. Close modal if next step is not modal-targeted
    if (window.appState && (!step.targetSelector || !step.targetSelector.includes('global-modal'))) {
      window.appState.closeModal();
    }

    // 2. Switch tab / sub-mode if specified
    if (step.tab && window.appState) {
      if (step.tab === 'retro') {
        if (window.appState.activeTab !== 'matrix' || window.matrixView?.scoringMode !== 'retro') {
          window.appState.switchTab('retro');
        }
      } else if (step.tab === 'roster') {
        if (window.appState.activeTab !== 'students' || window.appState.studentsSubTab !== 'roster') {
          window.appState.switchTab('roster');
        }
      } else if (window.appState.activeTab !== step.tab) {
        window.appState.switchTab(step.tab);
      }
    }

    // 3. Frame 1: Scroll navigation bar horizontally and viewport vertically
    requestAnimationFrame(() => {
      let targetEl = this.safeQuerySelector(step.targetSelector);
      if (!targetEl && step.fallbackSelector) {
        targetEl = this.safeQuerySelector(step.fallbackSelector);
      }
      if (!targetEl) {
        targetEl = document.getElementById('classroom-matrix-view') || document.body;
      }

      // Horizontal Scroll for Navigation Bar items
      if (targetEl) {
        const navEl = targetEl.closest('nav');
        if (navEl) {
          const targetLeft = targetEl.offsetLeft;
          const targetWidth = targetEl.offsetWidth;
          const navWidth = navEl.clientWidth;
          navEl.scrollTo({
            left: Math.max(0, targetLeft - (navWidth / 2) + (targetWidth / 2)),
            behavior: 'instant'
          });
        }

        // Vertical Scroll into center of viewport
        if (targetEl !== document.body) {
          targetEl.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
        }
      }

      // 4. Frame 2: Position spotlight & listeners with 100% accurate post-scroll coordinates
      requestAnimationFrame(() => {
        this.highlightElement(targetEl, step);
        this.setupEnforcement(targetEl, step);
      });
    });
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

    const isOAA = (window.appStore ? window.appStore.getTheme() : 'kitty') === 'oaa';
    popover.className = `fixed left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 w-auto sm:w-[360px] max-w-[94vw] rounded-3xl p-4 sm:p-5 shadow-2xl pointer-events-auto transition-all duration-200 z-[10001] animate-fade-in-up ${
      isOAA ? 'bg-[#1a0712] border-2 border-amber-400/70 text-amber-100' : 'bg-white border-2 border-pink-300 text-slate-800'
    }`;
    if (titleEl) titleEl.className = `text-sm sm:text-base font-black mb-1 flex items-center gap-1.5 ${isOAA ? 'text-amber-300' : 'text-slate-900'}`;
    if (contentEl) contentEl.className = `text-xs sm:text-sm leading-relaxed font-medium mb-3.5 ${isOAA ? 'text-amber-100/85' : 'text-slate-600'}`;
    if (badgeEl) badgeEl.className = `text-[11px] font-black px-2.5 py-0.5 rounded-full ${isOAA ? 'bg-amber-950 text-amber-300 border border-amber-500/40' : 'bg-pink-100 text-pink-700'}`;

    const rect = el.getBoundingClientRect();
    const pad = 6;
    const top = Math.max(0, rect.top - pad);
    const left = Math.max(0, rect.left - pad);
    const width = Math.min(window.innerWidth - left, rect.width + pad * 2);
    const height = rect.height + pad * 2;
    const bottom = top + height;

    // 1. Position 9999px Box-Shadow Spotlight Box:
    spotlight.style.top = `${top}px`;
    spotlight.style.left = `${left}px`;
    spotlight.style.width = `${width}px`;
    spotlight.style.height = `${height}px`;

    // 2. Direction-Aware Animated Pointer:
    const isTargetInTopHalf = (rect.top + (rect.height / 2)) < (window.innerHeight / 2);

    if (pointer) {
      pointer.classList.remove('hidden');
      const pointerCenterX = Math.max(10, Math.min(window.innerWidth - 150, left + (width / 2) - 65));

      const hintText = (step.forceAction === 'change') ? '請點此切換班級' : 
                       (step.forceAction === 'click') ? '請點擊此處目標' : '重點功能在此';

      if (isTargetInTopHalf) {
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

    // 3. Viewport Safe Popover:
    if (isTargetInTopHalf) {
      popover.style.top = 'auto';
      popover.style.bottom = 'max(14px, env(safe-area-inset-bottom, 14px))';
    } else {
      popover.style.bottom = 'auto';
      popover.style.top = 'max(14px, env(safe-area-inset-top, 14px))';
    }

    // 4. Populate Content:
    badgeEl.innerText = `步驟 ${this.currentStep + 1} / ${this.steps.length}`;
    titleEl.innerHTML = step.title;
    contentEl.innerHTML = step.content;

    // Action buttons
    if (step.forceAction === 'click' || step.forceAction === 'change') {
      actionContainer.innerHTML = `
        <div class="px-3 py-1.5 rounded-xl bg-pink-100 text-pink-700 text-xs font-black flex items-center gap-1 animate-pulse border border-pink-300">
          <span>👆</span>
          <span>請點擊發光目標</span>
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
        setTimeout(() => this.nextStep(), 60);
      };

      targetEl.addEventListener('click', listener, { once: true });
      this.activeListener = listener;
      this.lastTargetEl = targetEl;
    } else if (step.forceAction === 'change') {
      const listener = (e) => {
        if (window.appState?.playPop) window.appState.playPop();
        setTimeout(() => this.nextStep(), 60);
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

    // 1. Close modal if open
    if (window.appState) {
      window.appState.closeModal();
    }

    // 2. Remove touchmove scroll lock
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

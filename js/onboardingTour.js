/**
 * ClassQuant Hub - Dynamic Interactive Spotlight Tour Engine (v1.5.3)
 * Comprehensive Hands-on Educational Tour with Auto-Tracking!
 */

class OnboardingTour {
  constructor() {
    this.currentStep = 0;
    this.isActive = false;
    this.activeListener = null;
    this.lastTargetEl = null;
    this.currentTargetEl = null;
    this.trackingFrame = null;
    this.scrollBlocker = null;

    this.steps = [
      {
        id: "step-class-select",
        targetSelector: "#global-class-select",
        title: "1. 班級切換樞紐 (點擊展開)",
        content: "這裡是你管理班級的核心！<strong>點擊切換另一個班級</strong>（例如 803 班），教師可將所有分數與名單分流管理！",
        forceAction: "change",
        tab: "matrix"
      },
      {
        id: "step-select-student",
        targetSelector: "#seat-card-1",
        fallbackSelector: ".student-seat-card:first-child",
        title: "2. 點選學生座位 (支援多選/快選)",
        content: "上課中想記點嗎？<strong>請親手點擊 1 號「陳冠宇」</strong>的座位（外框會變粉色），支援多選和男女生快選喔！",
        forceAction: "click",
        tab: "matrix"
      },
      {
        id: "step-click-tag",
        targetSelector: "#first-quick-tag-btn",
        fallbackSelector: ".tag-page-slide button:first-child",
        title: "3. 觸發快速記點與動態加分",
        content: "選好學生後，<strong>點擊第一個加分項「主動解出難題 (+3)」</strong>，觀察動態加分特效與分數即時跳動！",
        forceAction: "click",
        tab: "matrix"
      },
      {
        id: "step-custom-tags",
        targetSelector: "#custom-tag-open-btn",
        fallbackSelector: ".glass-card button i[data-lucide='settings']",
        title: "4. 自訂班級專屬快速標籤",
        content: "下方常用按鈕可點擊<strong>「⚙️ 自訂」</strong>，可新增/修改各科專屬加扣分項目與分值，設定一次會自動套用到全班喔！",
        forceAction: "click",
        tab: "matrix"
      },
      {
        id: "step-goto-roster",
        targetSelector: 'button[data-tab="roster"]',
        title: "5. 前往 👥 班級名單中心",
        content: "<strong>請點擊「👥 班級名單」</strong>進入名單管理與學生資料編輯中心！",
        forceAction: "click",
        tab: null
      },
      {
        id: "step-roster-paste",
        targetSelector: "#roster-paste-btn",
        fallbackSelector: "#roster-manager-view button",
        title: "6. 1 秒批次貼上名冊 (Excel 匯入)",
        content: "新學期大絕招！<strong>點擊「📋 1秒批次貼上名單」</strong>，系統支援直接從 Excel 整欄貼上，自動為您去數字與排版！",
        forceAction: "click",
        tab: "roster"
      },
      {
        id: "step-roster-details",
        targetSelector: "#roster-manager-view .grid > div:first-child",
        fallbackSelector: "#roster-class-select",
        title: "7. 學生名冊個別微調 (改名/座號)",
        content: "在下方列表中，您可以<strong>隨時修改學生姓名與座號</strong>，點擊「➕ 新增單一學生」或「刪除班級(需長按)」都非常方便！",
        forceAction: null,
        tab: "roster"
      },
      {
        id: "step-goto-retro",
        targetSelector: 'button[data-tab="retro"]',
        title: "8. 前往 ⏰ 課堂事後補記專區",
        content: "下課回到辦公室！<strong>請點擊「⏰ 課堂事後補記」</strong>，進入專為事後回憶設計的工作台！",
        forceAction: "click",
        tab: null
      },
      {
        id: "step-retro-action",
        targetSelector: "#retro-odd-btn",
        fallbackSelector: "#retro-submit-btn",
        title: "9. 事後補記實戰 (單號快選 ➔ 評語 ➔ 提交)",
        content: "<strong>試著點擊「單號(男)」</strong>（可多選學生卡片）快速全選，點擊下方常用評語帶入文字框，最後點擊「✅ 勾選 1 位並提交」！",
        forceAction: "click",
        tab: "retro"
      },
      {
        id: "step-goto-dashboard",
        targetSelector: 'button[data-tab="dashboard"]',
        title: "10. 前往 📊 統計戰情室看分析",
        content: "<strong>請點擊「📊 統計戰情室」</strong>，查看班級整體學業與常規分析！",
        forceAction: "click",
        tab: null
      },
      {
        id: "step-dashboard-charts",
        targetSelector: "#dashboard-view .glass-card:first-child",
        fallbackSelector: "#dashboard-view",
        title: "11. 四象限拔尖與關懷分析",
        content: "系統自動畫出<strong>「學業均分 ✕ 常規點數」四象限圖表</strong>與拔尖/關懷學生名單，這會是您段考親師座談的最佳利器！",
        forceAction: null,
        tab: "dashboard"
      },
      {
        id: "step-finish",
        targetSelector: "#header-version-badge",
        title: "🎉 恭喜通關！戰力全開！",
        content: "您已熟悉 ClassQuant Hub 核心操作與進階技巧！隨時可點擊<strong>「📢 公告」</strong>查看更新日誌與詳細說明書！",
        forceAction: null,
        tab: "matrix"
      }
    ];

    this.initDOM();
  }

  safeQuerySelector(selector) {
    if (!selector) return null;
    try {
      return document.querySelector(selector);
    } catch (e) {
      return null;
    }
  }

  initDOM() {
    if (document.getElementById('tour-overlay-container')) return;

    // Inject strict tour CSS locker
    const style = document.createElement('style');
    style.id = 'tour-strict-style';
    style.innerHTML = 
      body.tour-strict-locked {
        overflow: hidden !important;
        touch-action: none !important;
      }
      html.tour-strict-locked {
        overflow: hidden !important;
      }
    ;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'tour-overlay-container';
    container.className = 'fixed inset-0 pointer-events-none hidden z-[9990]';
    container.innerHTML = 
      <!-- Indestructible 9999px Box-Shadow Dark Spotlight Box -->
      <div id="tour-spotlight-box" class="fixed rounded-xl transition-all duration-75 pointer-events-none" style="box-shadow: 0 0 0 9999px rgba(0,0,0,0.75);"></div>

      <!-- Direction-Aware Bouncing Hand Pointer -->
      <div id="tour-pointer-container" class="fixed pointer-events-none z-[10000] hidden transition-all duration-75"></div>

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
    ;

    document.body.appendChild(container);
  }

  async start(fromStep = 0) {
    this.isActive = true;
    this.currentStep = fromStep;

    if (window.appState) {
      window.appState.toggleHeader(true, true);
    }

    // Strict Global Scroll & Touch Blocker
    this.scrollBlocker = (e) => {
      // Allow scrolling ONLY inside the tour popover itself
      if (!e.target.closest('#tour-popover')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('touchmove', this.scrollBlocker, { passive: false, capture: true });
    document.addEventListener('wheel', this.scrollBlocker, { passive: false, capture: true });
    document.documentElement.classList.add('tour-strict-locked');
    document.body.classList.add('tour-strict-locked');

    const container = document.getElementById('tour-overlay-container');
    if (container) container.classList.remove('hidden');

    if (window.appState?.playChime) window.appState.playChime();
    
    // Start tracking loop (60FPS Element Tracker)
    this.startTracking();
    
    await this.renderStep();
  }

  startTracking() {
    if (this.trackingFrame) cancelAnimationFrame(this.trackingFrame);
    
    let lastRectStr = "";

    const loop = () => {
      if (!this.isActive) return;
      if (this.currentTargetEl && this.currentStepObj) {
        const rect = this.currentTargetEl.getBoundingClientRect();
        const rectStr = Math.round(rect.top) + "_" + Math.round(rect.left) + "_" + Math.round(rect.width) + "_" + Math.round(rect.height);
        
        // Only trigger DOM updates if element visually moved or resized (prevents jitter)
        if (rectStr !== lastRectStr) {
          this.highlightElement(this.currentTargetEl, this.currentStepObj);
          lastRectStr = rectStr;
        }
      }
      this.trackingFrame = requestAnimationFrame(loop);
    };
    this.trackingFrame = requestAnimationFrame(loop);
  }

  async waitForElement(primarySelector, fallbackSelector, timeout = 2500) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      let el = this.safeQuerySelector(primarySelector);
      if (!el && fallbackSelector) el = this.safeQuerySelector(fallbackSelector);
      
      // Ensure element exists AND is visible (offsetParent is not null, except fixed elements, so we check bounding client rect)
      if (el && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0)) {
        return el;
      }
      await new Promise(r => setTimeout(r, 50)); // Poll every 50ms
    }
    return document.body; // Ultimate fallback
  }

  async renderStep() {
    if (!this.isActive) return;
    const step = this.steps[this.currentStep];
    this.currentStepObj = step;
    this.currentTargetEl = null; // Hide spotlight temporarily
    document.getElementById('tour-spotlight-box').style.top = '-9999px';
    document.getElementById('tour-pointer-container').classList.add('hidden');

    if (!step) {
      this.endTour();
      return;
    }

    // 1. Modal close if not targeted
    if (window.appState && (!step.targetSelector || !step.targetSelector.includes('global-modal'))) {
      window.appState.closeModal();
    }

    // 2. Switch Tab Programmatically (this causes DOM changes, hence we wait)
    if (step.tab && window.appState && window.appState.activeTab !== step.tab) {
      window.appState.switchTab(step.tab);
    }

    // 3. WAIT for element to firmly appear in DOM (fixes "skipping steps")
    let targetEl = await this.waitForElement(step.targetSelector, step.fallbackSelector);
    if (!targetEl) targetEl = document.getElementById('classroom-matrix-view') || document.body;

    // 4. Force Element into Viewport
    if (targetEl && targetEl !== document.body) {
      // Horizontal Scroll for Navigation Bar items
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
      targetEl.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    }

    // 5. Finalize Target for 60FPS Tracker
    this.currentTargetEl = targetEl;
    this.setupEnforcement(targetEl, step);
    
    // Update Popover content instantly
    const titleEl = document.getElementById('tour-title');
    const contentEl = document.getElementById('tour-content');
    const badgeEl = document.getElementById('tour-step-badge');
    const actionContainer = document.getElementById('tour-action-container');

    badgeEl.innerText = \步驟 \ / \\;
    titleEl.innerHTML = step.title;
    contentEl.innerHTML = step.content;

    if (step.forceAction === 'click' || step.forceAction === 'change') {
      actionContainer.innerHTML = \
        <div class="px-3 py-1.5 rounded-xl bg-pink-100 text-pink-700 text-xs font-black flex items-center gap-1 animate-pulse border border-pink-300">
          <span>👆</span>
          <span>請點擊發光目標</span>
        </div>
      \;
    } else if (this.currentStep === this.steps.length - 1) {
      actionContainer.innerHTML = \
        <button onclick="onboardingTour.endTour()" class="px-4 py-2 rounded-2xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-xs shadow-md transition flex items-center gap-1 active:scale-95">
          <span>✨ 完成並開始使用！</span>
        </button>
      \;
    } else {
      actionContainer.innerHTML = \
        <button onclick="onboardingTour.nextStep()" class="px-4 py-2 rounded-xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-xs shadow-md transition flex items-center gap-1 active:scale-95">
          <span>下一步 ➔</span>
        </button>
      \;
    }

    if (window.lucide) window.lucide.createIcons();
  }

  highlightElement(el, step) {
    const spotlight = document.getElementById('tour-spotlight-box');
    const pointer = document.getElementById('tour-pointer-container');
    const popover = document.getElementById('tour-popover');
    if (!spotlight || !popover || !el) return;

    const rect = el.getBoundingClientRect();
    const pad = 6;
    const top = Math.max(0, rect.top - pad);
    const left = Math.max(0, rect.left - pad);
    const width = Math.min(window.innerWidth - left, rect.width + pad * 2);
    const height = rect.height + pad * 2;
    const bottom = top + height;

    spotlight.style.top = \\px\;
    spotlight.style.left = \\px\;
    spotlight.style.width = \\px\;
    spotlight.style.height = \\px\;

    const isTargetInTopHalf = (rect.top + (rect.height / 2)) < (window.innerHeight / 2);

    if (pointer) {
      pointer.classList.remove('hidden');
      const pointerCenterX = Math.max(10, Math.min(window.innerWidth - 150, left + (width / 2) - 65));
      const hintText = (step.forceAction === 'change') ? '請點此切換班級' : 
                       (step.forceAction === 'click') ? '請點擊此處目標' : '重點功能在此';

      if (isTargetInTopHalf) {
        pointer.style.top = \\px\;
        pointer.style.left = \\px\;
        pointer.className = 'tour-pointer-up fixed z-[10000] pointer-events-none flex flex-col items-center';
        pointer.innerHTML = \
          <span class="text-3xl filter drop-shadow-[0_4px_12px_rgba(244,63,94,0.95)]">👆</span>
          <span class="bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[11px] px-3 py-0.5 rounded-full shadow-xl border border-white whitespace-nowrap mt-0.5">
            \
          </span>
        \;
      } else {
        pointer.style.top = \\px\;
        pointer.style.left = \\px\;
        pointer.className = 'tour-pointer-down fixed z-[10000] pointer-events-none flex flex-col items-center';
        pointer.innerHTML = \
          <span class="bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[11px] px-3 py-0.5 rounded-full shadow-xl border border-white whitespace-nowrap mb-0.5">
            \
          </span>
          <span class="text-3xl filter drop-shadow-[0_4px_12px_rgba(244,63,94,0.95)]">👇</span>
        \;
      }
    }

    if (isTargetInTopHalf) {
      popover.style.top = 'auto';
      popover.style.bottom = 'max(14px, env(safe-area-inset-bottom, 14px))';
    } else {
      popover.style.bottom = 'auto';
      popover.style.top = 'max(14px, env(safe-area-inset-top, 14px))';
    }
  }

  setupEnforcement(targetEl, step) {
    if (this.activeListener && this.lastTargetEl) {
      this.lastTargetEl.removeEventListener('click', this.activeListener);
      this.lastTargetEl.removeEventListener('change', this.activeListener);
    }

    if (step.forceAction === 'click' || step.forceAction === 'change') {
      const eventType = step.forceAction;
      const listener = (e) => {
        // Need to allow the user's action to actually execute in the DOM!
        // We will momentarily lift the pointer-events strict lock so they can click the actual element.
        // Wait, the targetEl itself is ALREADY clickable because it's behind the 9999px box-shadow (box-shadow doesn't block clicks).
        // Since spotlight has pointer-events:none, clicks pass through.
        if (window.appState?.playPop) window.appState.playPop();
        setTimeout(() => this.nextStep(), 150); // slight delay to allow UI to react
      };

      targetEl.addEventListener(eventType, listener, { once: true });
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
    this.currentTargetEl = null;
    this.currentStepObj = null;

    if (this.trackingFrame) cancelAnimationFrame(this.trackingFrame);

    if (window.appState) {
      window.appState.closeModal();
    }

    if (this.scrollBlocker) {
      document.removeEventListener('touchmove', this.scrollBlocker, { capture: true });
      document.removeEventListener('wheel', this.scrollBlocker, { capture: true });
      this.scrollBlocker = null;
    }
    document.documentElement.classList.remove('tour-strict-locked');
    document.body.classList.remove('tour-strict-locked');

    if (this.activeListener && this.lastTargetEl) {
      this.lastTargetEl.removeEventListener('click', this.activeListener);
      this.lastTargetEl.removeEventListener('change', this.activeListener);
      this.lastTargetEl = null;
    }

    const container = document.getElementById('tour-overlay-container');
    if (container) {
      container.classList.add('hidden');
      document.getElementById('tour-pointer-container')?.classList.add('hidden');
    }

    localStorage.setItem('classquant_tour_completed', 'true');
  }
}

window.onboardingTour = new OnboardingTour();
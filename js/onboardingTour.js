/**
 * ClassQuant Hub - Ghost Auto-Pilot Tour Engine (v1.6.0)
 * - Industry Standard SVG Masking (Zero Stacking Context Bugs)
 * - Ghost Cursor (Simulated Auto-Pilot clicks)
 * - 60FPS sync tracking
 */

class OnboardingTour {
  constructor() {
    this.currentStep = 0;
    this.isActive = false;
    this.activeListener = null;
    this.lastTargetEl = null;
    this.lastEventType = null;
    this.currentTargetEl = null;
    this.trackingFrame = null;
    this.isAutoPlaying = false;

    this.steps = [
      {
        id: "step-class-select",
        targetSelector: "#global-class-select",
        title: "1. 班級切換樞紐 (點擊展開)",
        content: "這裡是你管理班級的核心！<strong>請點擊下拉選單</strong>，看看裡面為各班獨立保存的分數與名單。",
        action: "manual-change",
        tab: "matrix"
      },
      {
        id: "step-select-student",
        targetSelector: "#seat-card-1",
        fallbackSelector: ".student-seat-card:first-child",
        title: "2. 點選學生座位",
        content: "上課中想記點嗎？<strong>請親手點擊 1 號學生的座位</strong>，外框會亮起準備記點！",
        action: "manual-click",
        tab: "matrix"
      },
      {
        id: "step-click-tag",
        targetSelector: "#first-quick-tag-btn",
        fallbackSelector: ".tag-page-slide button:first-child",
        title: "3. 觸發快速記點與動態加分",
        content: "<strong>點擊第一個加分項「主動解出難題 (+3)」</strong>，觀察專屬彩帶特效與分數跳動！",
        action: "manual-click",
        tab: "matrix"
      },
      {
        id: "step-custom-tags",
        targetSelector: "#custom-tag-open-btn",
        fallbackSelector: ".glass-card button i[data-lucide='settings']",
        title: "4. 自訂班級專屬快速標籤",
        content: "您未來可以點擊<strong>「⚙️ 自訂」</strong>，自由新增各科專屬加扣分項目。這個步驟看看就好，請點擊「下一步」。",
        action: "info",
        tab: "matrix"
      },
      {
        id: "step-goto-roster",
        targetSelector: 'button[data-tab="roster"]',
        title: "5. 前往 👥 班級名單中心",
        content: "接下來設定名單。請看系統<strong>自動為您切換</strong>到「👥 班級名單」！",
        action: "auto-click"
      },
      {
        id: "step-roster-paste",
        targetSelector: "#roster-paste-btn",
        title: "6. 1 秒批次貼上名冊 (Excel 匯入)",
        content: "新學期大絕招！<strong>點擊「📋 1秒批次貼上名單」</strong>，系統支援從 Excel 整欄貼上，自動去除數字雜訊！",
        action: "manual-click",
        tab: "roster"
      },
      {
        id: "step-roster-details",
        targetSelector: "#roster-manager-view .grid > div:first-child",
        fallbackSelector: "#roster-class-select",
        title: "7. 學生名冊個別微調 (改名/座號)",
        content: "您可以隨時點擊修改學生姓名與座號。請點擊「下一步」。",
        action: "info",
        tab: "roster"
      },
      {
        id: "step-goto-retro",
        targetSelector: 'button[data-tab="retro"]',
        title: "8. 前往 ⏰ 課堂事後補記專區",
        content: "下課回到辦公室！系統將為您切換至<strong>「⏰ 課堂事後補記」</strong>。",
        action: "auto-click"
      },
      {
        id: "step-retro-action",
        targetSelector: "#retro-odd-btn",
        fallbackSelector: "#retro-submit-btn",
        title: "9. 事後補記實戰 (單號快選)",
        content: "<strong>試著點擊「單號(男)」</strong>快速選取學生，接著您可以帶入常用評語並提交！",
        action: "manual-click",
        tab: "retro"
      },
      {
        id: "step-goto-dashboard",
        targetSelector: 'button[data-tab="dashboard"]',
        title: "10. 前往 📊 統計戰情室看分析",
        content: "想看全班大數據？我們為您自動切換至<strong>「📊 統計戰情室」</strong>！",
        action: "auto-click"
      },
      {
        id: "step-dashboard-charts",
        targetSelector: "#dashboard-view .glass-card:first-child",
        title: "11. 四象限拔尖與關懷分析",
        content: "系統自動畫出「學業 ✕ 常規」四象限圖表，是您段考親師座談的最佳利器！點擊「下一步」。",
        action: "info",
        tab: "dashboard"
      },
      {
        id: "step-finish",
        targetSelector: "#header-version-badge",
        title: "🎉 恭喜通關！戰力全開！",
        content: "您已熟悉核心操作！隨時可點擊<strong>「📢 頂部版本號」</strong>查看詳細圖文說明書與更新日誌！",
        action: "info",
        tab: "dashboard"
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

    const style = document.createElement('style');
    style.id = 'tour-strict-style';
    style.innerHTML = `
      body.tour-strict-locked {
        overflow: hidden !important;
        touch-action: none !important;
      }
      html.tour-strict-locked {
        overflow: hidden !important;
      }
      .ghost-cursor-click {
        animation: ghostClick 0.4s ease-in-out forwards;
      }
      @keyframes ghostClick {
        0% { transform: scale(1); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); }
        50% { transform: scale(0.85); filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5)); }
        100% { transform: scale(1); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); }
      }
      .ghost-cursor-ripple {
        position: absolute;
        top: 5px; left: 5px;
        width: 30px; height: 30px;
        background: rgba(244,63,94,0.4);
        border-radius: 50%;
        animation: ghostRipple 0.5s ease-out forwards;
      }
      @keyframes ghostRipple {
        0% { transform: scale(0.5); opacity: 1; }
        100% { transform: scale(2.5); opacity: 0; }
      }
      #tour-overlay-path {
        transition: d 0.3s ease-in-out;
      }
      .tour-pointer-animate {
        transition: top 0.3s ease-in-out, left 0.3s ease-in-out;
      }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'tour-overlay-container';
    container.className = 'fixed inset-0 pointer-events-none hidden z-[9990]';
    container.innerHTML = `
      <!-- Industry Standard SVG Mask -->
      <svg id="tour-svg-overlay" class="absolute inset-0 w-full h-full" style="pointer-events: none;">
        <path id="tour-overlay-path" d="" fill="rgba(0,0,0,0.75)" fill-rule="evenodd" style="pointer-events: auto;"></path>
      </svg>

      <!-- Ghost Cursor -->
      <div id="tour-ghost-cursor" class="fixed z-[10002] pointer-events-none flex items-center justify-center opacity-0 transition-all duration-[800ms] ease-in-out" style="top: 50%; left: 50%; transform: scale(1);">
        <span class="text-4xl filter drop-shadow-md">👆</span>
        <div id="tour-ghost-ripple" class="hidden"></div>
      </div>

      <!-- Direction-Aware Bouncing Hand Pointer -->
      <div id="tour-pointer-container" class="tour-pointer-animate fixed pointer-events-none z-[10000] hidden flex flex-col items-center justify-center"></div>

      <!-- Viewport-Safe Popover -->
      <div id="tour-popover" class="fixed left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[360px] bg-white rounded-3xl p-4 shadow-2xl border-2 border-pink-300 pointer-events-auto transition-all duration-300 z-[10001] animate-fade-in-up">
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-pink-100">
          <div class="flex items-center space-x-2">
            <span class="kitty-bow !w-3.5 !h-3.5"></span>
            <span id="tour-step-badge" class="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700"></span>
          </div>
          <button onclick="onboardingTour.endTour()" class="text-xs font-bold text-slate-400 hover:text-pink-600 transition" title="結束教學">
            ✕ 結束
          </button>
        </div>
        <h4 id="tour-title" class="text-sm sm:text-base font-black text-slate-900 mb-1 flex items-center gap-1.5"></h4>
        <div id="tour-content" class="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium mb-3.5"></div>
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

  async start(fromStep = 0) {
    this.isActive = true;
    this.isAutoPlaying = false;
    this.currentStep = fromStep;

    if (window.appState) {
      window.appState.toggleHeader(true, true);
    }

    document.documentElement.classList.add('tour-strict-locked');
    document.body.classList.add('tour-strict-locked');
    this.scrollBlocker = (e) => {
      if (!e.target.closest('#tour-popover')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('touchmove', this.scrollBlocker, { passive: false, capture: true });
    document.addEventListener('wheel', this.scrollBlocker, { passive: false, capture: true });

    this.clickBlocker = (e) => {
      if (!this.isActive) return;
      if (e.target.closest('#tour-popover')) return;
      
      if (this.isAutoPlaying) {
        e.preventDefault();
        e.stopPropagation();
      } else {
         const step = this.steps[this.currentStep];
         if (step && (step.action === 'info' || step.action === 'auto-click')) {
            e.preventDefault();
            e.stopPropagation();
         }
      }
    };
    document.addEventListener('click', this.clickBlocker, { capture: true });
    document.addEventListener('touchstart', this.clickBlocker, { capture: true, passive: false });

    const container = document.getElementById('tour-overlay-container');
    if (container) container.classList.remove('hidden');

    if (window.appState?.playChime) window.appState.playChime();
    
    this.startTracking();
    await this.renderStep();
  }

  startTracking() {
    if (this.trackingFrame) cancelAnimationFrame(this.trackingFrame);
    let lastRectStr = "";
    const loop = () => {
      if (!this.isActive) return;
      if (this.currentTargetEl && this.currentStepObj && !this.isAutoPlaying) {
        const rect = this.currentTargetEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
           const rectStr = Math.round(rect.top) + "_" + Math.round(rect.left) + "_" + Math.round(rect.width) + "_" + Math.round(rect.height);
           if (rectStr !== lastRectStr) {
             this.highlightElement(this.currentTargetEl, this.currentStepObj);
             lastRectStr = rectStr;
           }
        }
      }
      this.trackingFrame = requestAnimationFrame(loop);
    };
    this.trackingFrame = requestAnimationFrame(loop);
  }

  async waitForElement(primarySelector, fallbackSelector, timeout = 3000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      let el = this.safeQuerySelector(primarySelector);
      if (!el && fallbackSelector) el = this.safeQuerySelector(fallbackSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return el;
        }
      }
      await new Promise(r => setTimeout(r, 50));
    }
    return document.body;
  }

  async renderStep() {
    if (!this.isActive) return;
    this.isAutoPlaying = false;
    const step = this.steps[this.currentStep];
    this.currentStepObj = step;
    this.currentTargetEl = null; 

    document.getElementById('tour-overlay-path').setAttribute('d', '');
    document.getElementById('tour-pointer-container').classList.add('hidden');
    document.getElementById('tour-ghost-cursor').style.opacity = '0';

    if (!step) {
      this.endTour();
      return;
    }

    if (window.appState && (!step.targetSelector || !step.targetSelector.includes('global-modal'))) {
      window.appState.closeModal();
    }

    if (step.tab && window.appState && window.appState.activeTab !== step.tab) {
      if (step.action === 'manual-click' || step.action === 'manual-change' || step.action === 'info') {
         window.appState.switchTab(step.tab);
      }
    }

    let targetEl = await this.waitForElement(step.targetSelector, step.fallbackSelector);
    if (!targetEl || targetEl === document.body) {
      targetEl = document.getElementById('classroom-matrix-view') || document.body;
    }

    if (targetEl && targetEl !== document.body) {
      const navEl = targetEl.closest('nav');
      if (navEl) {
        const targetLeft = targetEl.offsetLeft;
        const targetWidth = targetEl.offsetWidth;
        const navWidth = navEl.clientWidth;
        navEl.scrollTo({
          left: Math.max(0, targetLeft - (navWidth / 2) + (targetWidth / 2)),
          behavior: 'smooth'
        });
      }
      targetEl.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      await new Promise(r => setTimeout(r, 400));
    }

    this.currentTargetEl = targetEl;
    this.setupEnforcement(targetEl, step);
    
    const titleEl = document.getElementById('tour-title');
    const contentEl = document.getElementById('tour-content');
    const badgeEl = document.getElementById('tour-step-badge');
    const actionContainer = document.getElementById('tour-action-container');

    badgeEl.innerText = \`步驟 \${this.currentStep + 1} / \${this.steps.length}\`;
    titleEl.innerHTML = step.title;
    contentEl.innerHTML = step.content;

    if (step.action === 'manual-click' || step.action === 'manual-change') {
      actionContainer.innerHTML = \`
        <div class="px-3 py-1.5 rounded-xl bg-pink-100 text-pink-700 text-xs font-black flex items-center gap-1 animate-pulse border border-pink-300">
          <span>👆</span>
          <span>請您親自操作發光處</span>
        </div>
      \`;
    } else if (step.action === 'auto-click') {
      actionContainer.innerHTML = \`
        <button onclick="onboardingTour.playGhostCursor()" class="px-4 py-2 rounded-xl font-black text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-xs shadow-md transition flex items-center gap-1 active:scale-95 animate-bounce">
          <span>讓系統代為操作 🪄</span>
        </button>
      \`;
    } else if (this.currentStep === this.steps.length - 1) {
      actionContainer.innerHTML = \`
        <button onclick="onboardingTour.endTour()" class="px-4 py-2 rounded-2xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-xs shadow-md transition flex items-center gap-1 active:scale-95">
          <span>✨ 完成並開始使用！</span>
        </button>
      \`;
    } else {
      actionContainer.innerHTML = \`
        <button onclick="onboardingTour.nextStep()" class="px-4 py-2 rounded-xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-xs shadow-md transition flex items-center gap-1 active:scale-95">
          <span>下一步 ➔</span>
        </button>
      \`;
    }

    if (window.lucide) window.lucide.createIcons();
    this.highlightElement(targetEl, step);
  }

  async playGhostCursor() {
    if (this.isAutoPlaying || !this.currentTargetEl) return;
    this.isAutoPlaying = true; 
    
    const popoverBtn = document.querySelector('#tour-action-container button');
    const ghost = document.getElementById('tour-ghost-cursor');
    const ripple = document.getElementById('tour-ghost-ripple');
    
    if (popoverBtn) {
       const btnRect = popoverBtn.getBoundingClientRect();
       ghost.style.transition = 'none'; 
       ghost.style.top = \`\${btnRect.top + btnRect.height/2}px\`;
       ghost.style.left = \`\${btnRect.left + btnRect.width/2}px\`;
    }
    
    ghost.style.opacity = '1';
    ghost.classList.remove('ghost-cursor-click');
    ripple.classList.remove('ghost-cursor-ripple');
    ripple.classList.add('hidden');

    ghost.offsetHeight; 

    const targetRect = this.currentTargetEl.getBoundingClientRect();
    ghost.style.transition = 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
    ghost.style.top = \`\${targetRect.top + targetRect.height/2 - 10}px\`; 
    ghost.style.left = \`\${targetRect.left + targetRect.width/2 - 10}px\`;

    await new Promise(r => setTimeout(r, 850));

    ghost.classList.add('ghost-cursor-click');
    ripple.classList.remove('hidden');
    ripple.classList.add('ghost-cursor-ripple');
    if (window.appState?.playPop) window.appState.playPop();

    this.currentTargetEl.click();

    await new Promise(r => setTimeout(r, 400));
    
    ghost.style.opacity = '0';
    
    this.nextStep();
  }

  highlightElement(el, step) {
    const pathEl = document.getElementById('tour-overlay-path');
    const pointer = document.getElementById('tour-pointer-container');
    const popover = document.getElementById('tour-popover');
    if (!pathEl || !popover || !el) return;

    const rect = el.getBoundingClientRect();
    const pad = 6;
    const top = Math.max(0, rect.top - pad);
    const left = Math.max(0, rect.left - pad);
    const width = Math.min(window.innerWidth - left, rect.width + pad * 2);
    const height = rect.height + pad * 2;
    const bottom = top + height;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const d = \`M 0 0 h \${vw} v \${vh} h -\${vw} Z M \${left} \${top} v \${height} h \${width} v -\${height} Z\`;
    
    pathEl.setAttribute('d', d);

    const isTargetInTopHalf = (rect.top + (rect.height / 2)) < (window.innerHeight / 2);

    if (pointer && step.action !== 'info') {
      pointer.classList.remove('hidden');
      
      const targetCenterX = left + (width / 2);
      
      const hintText = (step.action === 'manual-change') ? '請點此切換' : 
                       (step.action === 'manual-click') ? '請點擊此處' : '系統代為點擊';

      if (isTargetInTopHalf) {
        pointer.style.top = \`\${bottom + 8}px\`;
        pointer.style.left = \`\${targetCenterX}px\`;
        pointer.style.transform = 'translateX(-50%)';
        pointer.innerHTML = \`
          <span class="text-3xl filter drop-shadow-[0_4px_12px_rgba(244,63,94,0.95)]">👆</span>
          <span class="bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[11px] px-3 py-0.5 rounded-full shadow-xl border border-white whitespace-nowrap mt-0.5">
            \${hintText}
          </span>
        \`;
      } else {
        pointer.style.top = \`\${Math.max(10, top - 68)}px\`;
        pointer.style.left = \`\${targetCenterX}px\`;
        pointer.style.transform = 'translateX(-50%)';
        pointer.innerHTML = \`
          <span class="bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[11px] px-3 py-0.5 rounded-full shadow-xl border border-white whitespace-nowrap mb-0.5">
            \${hintText}
          </span>
          <span class="text-3xl filter drop-shadow-[0_4px_12px_rgba(244,63,94,0.95)]">👇</span>
        \`;
      }
    } else if (pointer) {
      pointer.classList.add('hidden');
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
    if (this.activeListener && this.lastTargetEl && this.lastEventType) {
      this.lastTargetEl.removeEventListener(this.lastEventType, this.activeListener);
    }
    this.activeListener = null;
    this.lastEventType = null;
    this.lastTargetEl = null;

    if (step.action === 'manual-click' || step.action === 'manual-change') {
      const eType = step.action === 'manual-change' ? 'change' : 'click';
      this.lastEventType = eType;
      const listener = (e) => {
        if (!e.isTrusted) return; 
        if (window.appState?.playPop) window.appState.playPop();
        
        targetEl.removeEventListener(this.lastEventType, listener);
        this.activeListener = null;

        setTimeout(() => this.nextStep(), 200); 
      };

      targetEl.addEventListener(this.lastEventType, listener, { once: true });
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
      window.appState.showToast('🎉 恭喜完成實戰教學！', 'success');
    }
  }

  endTour() {
    this.isActive = false;
    this.isAutoPlaying = false;
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
    if (this.clickBlocker) {
      document.removeEventListener('click', this.clickBlocker, { capture: true });
      document.removeEventListener('touchstart', this.clickBlocker, { capture: true });
      this.clickBlocker = null;
    }

    document.documentElement.classList.remove('tour-strict-locked');
    document.body.classList.remove('tour-strict-locked');

    if (this.activeListener && this.lastTargetEl && this.lastEventType) {
      this.lastTargetEl.removeEventListener(this.lastEventType, this.activeListener);
      this.activeListener = null;
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

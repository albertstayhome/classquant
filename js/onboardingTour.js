/**
 * ClassQuant Hub - Lightweight & Resilient 12-Step Master Onboarding Tour Engine
 * Clean dynamic DOM lifecycle (creates overlay only on start, fully removes on end)
 * Zero global capture click-blockers, zero deadlocks.
 */

class OnboardingTour {
  constructor() {
    this.currentStep = 0;
    this.isActive = false;
    this.steps = [
      {
        id: 'step-class-select',
        tab: 'matrix',
        targetSelector: '#global-class-select',
        title: '1. 班級切換樞紐',
        content: '這裡是管理班級的核心！點擊此處可在「801 導師本班」與「803/805 科任班」之間即時切換。'
      },
      {
        id: 'step-seat-select',
        tab: 'matrix',
        targetSelector: '#seat-card-1',
        title: '2. 課堂學生點記',
        content: '點擊學生座位卡即可選取（支援多選）。選取後點擊下方標籤即可一鍵加扣分！'
      },
      {
        id: 'step-quick-tags',
        tab: 'matrix',
        targetSelector: '#first-quick-tag-btn',
        title: '3. 快速加扣分標籤',
        content: '常用課堂行為標籤！點擊即可為選中的學生記錄點數，記點後系統會自動清空選取狀態。'
      },
      {
        id: 'step-custom-tags',
        tab: 'matrix',
        targetSelector: '#custom-tag-open-btn',
        title: '4. 自訂專屬標籤',
        content: '需要新增特殊的課堂評語或自訂分數？點擊「自訂」即可自由建立專屬標籤。'
      },
      {
        id: 'step-tab-roster',
        tab: 'matrix',
        targetSelector: 'button[data-tab="roster"]',
        title: '5. 👥 班級名單與名冊管理',
        content: '點擊此分頁可查看各班名單，支援座號姓名即時搜尋、單鍵快速貼上 Excel 名單！'
      },
      {
        id: 'step-tab-retro',
        tab: 'matrix',
        targetSelector: 'button[data-tab="retro"]',
        title: '6. ⏰ 課堂事後補記',
        content: '課堂上沒空拿手機？下課或放學回到辦公室，點擊此處即可 1 秒批次勾選座號補記！'
      },
      {
        id: 'step-tab-dashboard',
        tab: 'matrix',
        targetSelector: 'button[data-tab="dashboard"]',
        title: '7. 📊 統計戰情室',
        content: '全方位分析學生學習歷程、四象限常規 vs 學業分佈圖與常態分佈曲線圖！'
      },
      {
        id: 'step-tab-timetable',
        tab: 'matrix',
        targetSelector: 'button[data-tab="timetable"]',
        title: '8. 📅 課表排程管理',
        content: '設定您的每週課表，上課時系統會自動感知並切換至當前上課班級！'
      },
      {
        id: 'step-tab-events',
        tab: 'matrix',
        targetSelector: 'button[data-tab="events"]',
        title: '9. 學生記事與日誌檢索',
        content: '完整的時間軸記點日誌，支援依座號、標籤、日期即時搜尋與導師晤談匯出。'
      },
      {
        id: 'step-tab-dossier',
        tab: 'matrix',
        targetSelector: 'button[data-tab="student-dossier"]',
        title: '10. 學生個人歷程檔案',
        content: '點進每位學生的個人畫像，查看雷達圖、雙向評語建議與家長會談備忘。'
      },
      {
        id: 'step-tab-ai',
        tab: 'matrix',
        targetSelector: 'button[data-tab="ai-hub"]',
        title: '11. AI 成績匯入與掃描',
        content: '支援拍照辨識成績單、CSV/JSON 匯入匯出與完整雲端本機資料備份。'
      },
      {
        id: 'step-finish',
        tab: 'matrix',
        targetSelector: '#classroom-matrix-view',
        title: '12. 恭喜掌握全部功能！',
        content: 'ClassQuant Hub 已為您準備就緒！點擊下方按鈕即可開始您的智慧教學之旅！🎀'
      }
    ];
  }

  start(stepIndex = 0) {
    this.isActive = true;
    this.currentStep = Math.max(0, Math.min(this.steps.length - 1, stepIndex));
    this.createOverlay();
    this.renderStep();
  }

  createOverlay() {
    let container = document.getElementById('tour-overlay-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'tour-overlay-container';
      container.className = 'fixed inset-0 pointer-events-none';
      container.style.zIndex = '99999';
      container.innerHTML = `
        <svg id="tour-svg-overlay" class="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="tour-glow-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#f43f5e" />
              <stop offset="100%" stop-color="#fb7185" />
            </linearGradient>
          </defs>
          <path id="tour-overlay-path" d="" fill="rgba(15, 23, 42, 0.72)" fill-rule="evenodd" style="pointer-events: none;"></path>
          <rect id="tour-spotlight-glow" x="0" y="0" width="0" height="0" rx="14" ry="14" fill="none" stroke="url(#tour-glow-stroke)" stroke-width="3" style="pointer-events: none;"></rect>
        </svg>

        <div id="tour-pointer-container" class="fixed pointer-events-none hidden transition-all duration-300" style="z-index: 100000;">
          <div class="flex flex-col items-center justify-center pointer-events-none">
            <span class="text-3xl filter drop-shadow-[0_4px_12px_rgba(244,63,94,0.95)]">👆</span>
            <span class="bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[11px] px-3.5 py-1 rounded-full shadow-2xl border-1.5 border-white whitespace-nowrap mt-0.5">
              重點功能在此
            </span>
          </div>
        </div>

        <div id="tour-popover" class="fixed left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[380px] bg-white rounded-3xl p-4 shadow-2xl border-2 border-pink-300 pointer-events-auto transition-all duration-300" style="z-index: 100001; bottom: 16px;">
          <div class="flex items-center justify-between pb-2 mb-2 border-b border-pink-100">
            <div class="flex items-center space-x-2">
              <span class="kitty-bow !w-3.5 !h-3.5"></span>
              <span id="tour-step-badge" class="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700"></span>
            </div>
            <button onclick="onboardingTour.endTour()" class="text-xs font-bold text-slate-400 hover:text-pink-600 transition cursor-pointer p-1" title="結束教學">
              ✕ 結束
            </button>
          </div>
          <h4 id="tour-title" class="text-sm sm:text-base font-black text-slate-900 mb-1.5 flex items-center gap-1.5"></h4>
          <div id="tour-content" class="text-xs text-slate-600 mb-3 leading-relaxed font-medium"></div>
          <div id="tour-action-container" class="flex items-center justify-between pt-1">
            <button onclick="onboardingTour.prevStep()" id="tour-prev-btn" class="px-3 py-1.5 rounded-xl border border-pink-200 text-slate-600 font-bold text-xs hover:bg-pink-50 transition active:scale-95">
              ◀ 上一步
            </button>
            <div class="flex items-center gap-2">
              <button onclick="onboardingTour.nextStep()" id="tour-next-btn" class="px-4 py-2 rounded-2xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-xs sm:text-sm shadow-md transition flex items-center gap-1 active:scale-95 cursor-pointer">
                <span>下一步 ➔</span>
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(container);
    }
  }

  renderStep() {
    if (!this.isActive) return;
    const step = this.steps[this.currentStep];
    if (!step) {
      this.endTour();
      return;
    }

    if (step.tab && window.appState && window.appState.activeTab !== step.tab) {
      window.appState.switchTab(step.tab);
    }

    const titleEl = document.getElementById('tour-title');
    const contentEl = document.getElementById('tour-content');
    const badgeEl = document.getElementById('tour-step-badge');
    const prevBtn = document.getElementById('tour-prev-btn');
    const nextBtn = document.getElementById('tour-next-btn');

    if (badgeEl) badgeEl.innerText = `步驟 ${this.currentStep + 1} / ${this.steps.length}`;
    if (titleEl) titleEl.innerHTML = step.title;
    if (contentEl) contentEl.innerHTML = step.content;

    if (prevBtn) {
      prevBtn.style.display = this.currentStep === 0 ? 'none' : 'inline-block';
    }

    if (nextBtn) {
      if (this.currentStep === this.steps.length - 1) {
        nextBtn.innerHTML = '<span>✨ 完成教學並開始使用！</span>';
        nextBtn.onclick = () => this.endTour();
      } else {
        nextBtn.innerHTML = '<span>下一步 ➔</span>';
        nextBtn.onclick = () => this.nextStep();
      }
    }

    setTimeout(() => {
      this.updateSpotlight(step);
    }, 80);
  }

  updateSpotlight(step) {
    if (!this.isActive) return;
    const targetEl = document.querySelector(step.targetSelector);
    const pathEl = document.getElementById('tour-overlay-path');
    const glowEl = document.getElementById('tour-spotlight-glow');
    const pointerEl = document.getElementById('tour-pointer-container');
    const popover = document.getElementById('tour-popover');

    if (!targetEl || targetEl === document.body || step.id === 'step-finish') {
      if (pathEl) pathEl.setAttribute('d', '');
      if (glowEl) {
        glowEl.setAttribute('width', '0');
        glowEl.setAttribute('height', '0');
      }
      if (pointerEl) pointerEl.classList.add('hidden');
      return;
    }

    // Smooth scroll into view
    try {
      targetEl.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    } catch (e) {}

    setTimeout(() => {
      if (!this.isActive) return;
      const rect = targetEl.getBoundingClientRect();
      const pad = 6;
      const x = Math.max(0, rect.left - pad);
      const y = Math.max(0, rect.top - pad);
      const w = Math.min(window.innerWidth - x, rect.width + pad * 2);
      const h = rect.height + pad * 2;
      const r = 14;

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // SVG path with rounded rectangle cutout
      if (pathEl) {
        const d = `M0 0 H${vw} V${vh} H0 Z M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
        pathEl.setAttribute('d', d);
      }

      if (glowEl) {
        glowEl.setAttribute('x', x);
        glowEl.setAttribute('y', y);
        glowEl.setAttribute('width', w);
        glowEl.setAttribute('height', h);
      }

      if (pointerEl) {
        pointerEl.classList.remove('hidden');
        pointerEl.style.left = `${Math.max(10, Math.min(vw - 120, x + w / 2 - 50))}px`;
        if (y + h + 70 < vh) {
          pointerEl.style.top = `${y + h + 8}px`;
        } else {
          pointerEl.style.top = `${Math.max(10, y - 55)}px`;
        }
      }

      // Safe popover placement
      if (popover) {
        if (y > vh / 2) {
          popover.style.bottom = 'auto';
          popover.style.top = '16px';
        } else {
          popover.style.top = 'auto';
          popover.style.bottom = '16px';
        }
      }
    }, 150);
  }

  nextStep() {
    if (!this.isActive) return;
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      if (window.appState?.playPop) window.appState.playPop();
      this.renderStep();
    } else {
      this.endTour();
    }
  }

  prevStep() {
    if (!this.isActive) return;
    if (this.currentStep > 0) {
      this.currentStep--;
      if (window.appState?.playPop) window.appState.playPop();
      this.renderStep();
    }
  }

  endTour() {
    this.isActive = false;
    const container = document.getElementById('tour-overlay-container');
    if (container) {
      container.remove();
    }
    if (window.appState?.playChime) window.appState.playChime();
    if (window.appState?.showToast) {
      window.appState.showToast('🎉 導覽教學已結束，祝老師教學愉快！🎀', 'success');
    }
    try {
      localStorage.setItem('classquant_tour_completed', 'true');
    } catch (e) {}
  }
}

// Global Singleton Instance
window.OnboardingTour = OnboardingTour;
window.onboardingTour = new OnboardingTour();

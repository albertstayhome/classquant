/**
 * ClassQuant Hub - Interactive Onboarding Tour Engine (v1.6.0)
 * Milestone 3: Anti-Jump & Anti-Lock Interaction Defense
 * 
 * Features:
 * - Dynamic rounded-corner SVG mask path geometry with arc commands (a r r 0 0 1 ...)
 * - Flash-free transition tweening between spotlight states (zero d="" wiping)
 * - Multi-layer glowing neon outline stroke (#f43f5e) and breathing pulse radar halo
 * - Dynamic 4-way arrow orientation (below/above/right/left) with viewport margin clamping
 * - Calibrated vector SVG pointing hand cursor (#tour-ghost-cursor) with index-fingertip hotspot
 * - Natural curved Bezier trajectory kinematics with easeInOutCubic acceleration/deceleration
 * - Visible press compression state, expanding glowing ripple ring, and Web Audio pop/chime
 * - Coherent tab navigation auto-scrolling navbar and continuous 60fps spotlight tracking
 * - Strict cancellation token architecture (activeTimers, activeAnimations, currentSessionId)
 * - Anti-Jump Transition Mutex (isTransitioning lock + 250ms timestamp debounce)
 * - Strict Spotlight Boundary Touch Gating (coordinate-based bounding-box gating)
 * - Select Dropdown Trap Defense (change, input, blur, and click interaction handlers)
 * - Fail-Safe Error Recovery & Centralized Teardown (graceful try-catch fallback, complete cleanup)
 */

class OnboardingTour {
  constructor() {
    this.currentStep = 0;
    this.isActive = false;
    this.isAutoPlaying = false;
    this.isTransitioning = false;
    this.lastTransitionTime = 0;
    this.transitionDebounceMs = 250;
    this.activeListener = null;
    this.lastTargetEl = null;
    this.lastEventType = null;
    this.activeEnforcementCleanup = null;
    this.currentTargetEl = null;
    this.currentStepObj = null;
    this.trackingFrame = null;
    this.morphAnimId = null;
    this.ghostAnimId = null;

    // Cancellation Token & Lifecycle Tracking
    this.sessionIdCounter = 0;
    this.currentSessionId = 0;
    this.activeTimers = new Set();
    this.activeAnimations = new Set();
    this.audioCtx = null;

    // Spotlight Geometry State
    this.currentBox = { x: 0, y: 0, w: 0, h: 0, r: 0 };
    this.lastGeometry = { left: -999, top: -999, width: -999, height: -999, vw: -999, vh: -999 };
    this.isInitialized = false;

    // Viewport Dimension Cache
    this.cachedViewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    this.cachedViewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;

    // Event Handlers
    this.onScrollHandler = null;
    this.onResizeHandler = null;
    this.onVisualViewportHandler = null;
    this.scrollBlocker = null;
    this.clickBlocker = null;

    this.steps = [
      {
        id: "step-class-select",
        targetSelector: "#global-class-select",
        title: "1. 班級切換樞紐 (點擊展開)",
        content: "這裡是你管理班級的核心！<strong>請點擊下拉選單</strong>，看看裡面為各班獨立保存的分數與名單。",
        action: "manual-change",
        tab: "matrix",
        pad: 6,
        radius: 12
      },
      {
        id: "step-select-student",
        targetSelector: "#seat-card-1",
        fallbackSelector: ".student-seat-card:first-child",
        title: "2. 點選學生座位",
        content: "上課中想記點嗎？<strong>請親手點擊 1 號學生的座位</strong>，外框會亮起準備記點！",
        action: "manual-click",
        tab: "matrix",
        pad: 8,
        radius: 16
      },
      {
        id: "step-click-tag",
        targetSelector: "#first-quick-tag-btn",
        fallbackSelector: ".tag-page-slide button:first-child",
        title: "3. 觸發快速記點與動態加分",
        content: "<strong>點擊第一個加分項「主動解出難題 (+3)」</strong>，觀察專屬彩帶特效與分數跳動！",
        action: "manual-click",
        tab: "matrix",
        pad: 6,
        radius: 14
      },
      {
        id: "step-custom-tags",
        targetSelector: "#custom-tag-open-btn",
        fallbackSelector: ".glass-card button i[data-lucide='settings']",
        title: "4. 自訂班級專屬快速標籤",
        content: "您未來可以點擊<strong>「⚙️ 自訂」</strong>，自由新增各科專屬加扣分項目。這個步驟看看就好，請點擊「下一步」。",
        action: "info",
        tab: "matrix",
        pad: 6,
        radius: 12
      },
      {
        id: "step-goto-roster",
        targetSelector: 'button[data-tab="roster"]',
        title: "5. 前往 👥 班級名單中心",
        content: "接下來設定名單。請看系統<strong>自動為您切換</strong>到「👥 班級名單」！",
        action: "auto-click",
        pad: 6,
        radius: 14
      },
      {
        id: "step-roster-paste",
        targetSelector: "#roster-paste-btn",
        title: "6. 1 秒批次貼上名冊 (Excel 匯入)",
        content: "新學期大絕招！<strong>點擊「📋 1秒批次貼上名單」</strong>，系統支援從 Excel 整欄貼上，自動去除數字雜訊！",
        action: "manual-click",
        tab: "roster",
        pad: 8,
        radius: 14
      },
      {
        id: "step-roster-details",
        targetSelector: "#roster-manager-view .grid > div:first-child",
        fallbackSelector: "#roster-class-select",
        title: "7. 學生名冊個別微調 (改名/座號)",
        content: "您可以隨時點擊修改學生姓名與座號。請點擊「下一步」。",
        action: "info",
        tab: "roster",
        pad: 8,
        radius: 16
      },
      {
        id: "step-goto-retro",
        targetSelector: 'button[data-tab="retro"]',
        title: "8. 前往 ⏰ 課堂事後補記專區",
        content: "下課回到辦公室！系統將為您切換至<strong>「⏰ 課堂事後補記」</strong>。",
        action: "auto-click",
        pad: 6,
        radius: 14
      },
      {
        id: "step-retro-action",
        targetSelector: "#retro-odd-btn",
        fallbackSelector: "#retro-submit-btn",
        title: "9. 事後補記實戰 (單號快選)",
        content: "<strong>試著點擊「單號(男)」</strong>快速選取學生，接著您可以帶入常用評語並提交！",
        action: "manual-click",
        tab: "retro",
        pad: 6,
        radius: 12
      },
      {
        id: "step-goto-dashboard",
        targetSelector: 'button[data-tab="dashboard"]',
        title: "10. 前往 📊 統計戰情室看分析",
        content: "想看全班大數據？我們為您自動切換至<strong>「📊 統計戰情室」</strong>！",
        action: "auto-click",
        pad: 6,
        radius: 14
      },
      {
        id: "step-dashboard-charts",
        targetSelector: "#dashboard-view .glass-card:first-child",
        title: "11. 四象限拔尖與關懷分析",
        content: "系統自動畫出「學業 ✕ 常規」四象限圖表，是您段考親師座談的最佳利器！點擊「下一步」。",
        action: "info",
        tab: "dashboard",
        pad: 10,
        radius: 20
      },
      {
        id: "step-finish",
        targetSelector: "#header-version-badge",
        title: "🎉 恭喜通關！戰力全開！",
        content: "您已熟悉核心操作！隨時可點擊<strong>「📢 頂部版本號」</strong>查看詳細圖文說明書與更新日誌！",
        action: "info",
        tab: "dashboard",
        pad: 6,
        radius: 12
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

  /**
   * Initializes permanent, static DOM structure once.
   * Pre-allocates SVG overlay, glowing rects, 4-way pointer nodes, and popover.
   */
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
      .tour-gpu-layer {
        will-change: transform;
        transform: translate3d(0, 0, 0);
        backface-visibility: hidden;
      }
      @keyframes spotlightGlowPulse {
        0%, 100% {
          filter: drop-shadow(0 0 6px rgba(244, 63, 94, 0.85)) drop-shadow(0 0 14px rgba(251, 113, 133, 0.5));
          stroke-opacity: 0.9;
        }
        50% {
          filter: drop-shadow(0 0 12px rgba(244, 63, 94, 1)) drop-shadow(0 0 24px rgba(251, 113, 133, 0.8)) drop-shadow(0 0 3px #ffffff);
          stroke-opacity: 1;
        }
      }
      @keyframes tourGlowBreathing {
        0%, 100% {
          stroke-width: 3px;
          opacity: 0.9;
          filter: drop-shadow(0 0 6px rgba(244, 63, 94, 0.85)) drop-shadow(0 0 14px rgba(251, 113, 133, 0.5));
        }
        50% {
          stroke-width: 4px;
          opacity: 1;
          filter: drop-shadow(0 0 10px rgba(244, 63, 94, 1)) drop-shadow(0 0 22px rgba(251, 113, 133, 0.8)) drop-shadow(0 0 2px #ffffff);
        }
      }
      @keyframes tourHaloPulse {
        0% {
          opacity: 0.8;
          stroke-width: 1.5px;
          stroke: #f43f5e;
        }
        50% {
          opacity: 0.3;
          stroke-width: 5px;
          stroke: #fb7185;
        }
        100% {
          opacity: 0;
          stroke-width: 8px;
          stroke: #fda4af;
        }
      }
      .tour-spotlight-pulse {
        animation: spotlightGlowPulse 1.8s ease-in-out infinite;
        vector-effect: non-scaling-stroke;
      }
      .tour-glow-ring {
        animation: tourGlowBreathing 1.8s ease-in-out infinite;
        vector-effect: non-scaling-stroke;
      }
      .tour-pulse-halo {
        animation: tourHaloPulse 1.8s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
        vector-effect: non-scaling-stroke;
      }
      #tour-pointer-container {
        position: fixed;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 10000;
        will-change: transform;
        transition: opacity 0.2s ease-out;
      }
      .tour-arrow-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s ease-out;
      }
      .tour-bounce-up {
        animation: pointerBounceUp 1s ease-in-out infinite;
      }
      .tour-bounce-down {
        animation: pointerBounceDown 1s ease-in-out infinite;
      }
      .tour-bounce-left {
        animation: pointerBounceLeft 1s ease-in-out infinite;
      }
      .tour-bounce-right {
        animation: pointerBounceRight 1s ease-in-out infinite;
      }
      @keyframes pointerBounceUp {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      @keyframes pointerBounceDown {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(6px); }
      }
      @keyframes pointerBounceLeft {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(-6px); }
      }
      @keyframes pointerBounceRight {
        0%, 100% { transform: translateX(0); }
        50% { transform: translateX(6px); }
      }
      .ghost-cursor-click {
        animation: ghostClick 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      }
      @keyframes ghostClick {
        0% { transform: scale(1); filter: drop-shadow(0 4px 12px rgba(244,63,94,0.45)); }
        45% { transform: scale(0.84) translateY(3px); filter: drop-shadow(0 1px 4px rgba(244,63,94,0.7)); }
        100% { transform: scale(1); filter: drop-shadow(0 4px 12px rgba(244,63,94,0.45)); }
      }
      #tour-ghost-cursor {
        position: fixed;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 10002;
        will-change: transform;
        transition: opacity 0.2s ease-out;
      }
      #tour-ghost-cursor-body {
        transform-origin: 14px 2.5px;
        will-change: transform;
      }
      #tour-ghost-ripple {
        position: absolute;
        left: 14px;
        top: 2.5px;
        width: 32px;
        height: 32px;
        margin-left: -16px;
        margin-top: -16px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(244, 63, 94, 0.6) 0%, rgba(251, 113, 133, 0.3) 40%, rgba(251, 113, 133, 0) 70%);
        border: 2px solid rgba(244, 63, 94, 0.9);
        box-shadow: 0 0 14px rgba(244, 63, 94, 0.85);
        pointer-events: none;
      }
      .ghost-cursor-ripple {
        animation: ghostRipple 0.55s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
      }
      @keyframes ghostRipple {
        0% { transform: scale(0.3); opacity: 1; }
        60% { transform: scale(1.6); opacity: 0.8; }
        100% { transform: scale(2.6); opacity: 0; }
      }
      .tour-simulated-active {
        transform: scale(0.95) !important;
        filter: brightness(0.92) drop-shadow(0 0 8px rgba(244, 63, 94, 0.6)) !important;
        transition: transform 0.15s ease-out, filter 0.15s ease-out !important;
      }
    `;
    document.head.appendChild(style);

    const container = document.createElement('div');
    container.id = 'tour-overlay-container';
    container.className = 'fixed inset-0 pointer-events-none hidden z-[9990]';
    container.innerHTML = `
      <!-- Industry Standard SVG Mask Layer (GPU Composited) -->
      <svg id="tour-svg-overlay" class="absolute inset-0 w-full h-full pointer-events-none tour-gpu-layer" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="tour-glow-filter" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#f43f5e" flood-opacity="0.9" />
            <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#fb7185" flood-opacity="0.65" />
          </filter>
          <linearGradient id="tour-glow-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f43f5e" />
            <stop offset="50%" stop-color="#fb7185" />
            <stop offset="100%" stop-color="#f43f5e" />
          </linearGradient>
        </defs>
        <!-- Dark Backdrop Mask with Rounded Cutout -->
        <path id="tour-overlay-path" d="" fill="rgba(15, 23, 42, 0.78)" fill-rule="evenodd" style="pointer-events: auto;"></path>
        <!-- Outer Radar Pulse Halo -->
        <rect id="tour-spotlight-halo" x="0" y="0" width="0" height="0" rx="0" ry="0" fill="none" stroke="#fb7185" stroke-width="2" class="tour-pulse-halo pointer-events-none" style="pointer-events: none;"></rect>
        <!-- Synchronized Glowing Outline Accent -->
        <rect id="tour-spotlight-glow" x="0" y="0" width="0" height="0" rx="14" ry="14" fill="none" stroke="url(#tour-glow-stroke)" stroke-width="3" filter="url(#tour-glow-filter)" class="tour-spotlight-pulse pointer-events-none" style="pointer-events: none;"></rect>
      </svg>

      <!-- Calibrated Vector SVG Ghost Cursor Layer (Kinematic Bezier Auto-Pilot) -->
      <div id="tour-ghost-cursor" class="fixed pointer-events-none z-[10002] will-change-transform opacity-0" style="top: 0; left: 0; transform: translate3d(0, 0, 0); transition: opacity 0.2s ease-out;">
        <div id="tour-ghost-cursor-body" class="relative pointer-events-none flex items-center justify-center" style="width: 40px; height: 42px; transform-origin: 14px 2.5px;">
          <!-- Precision SVG Pointing Hand (Fingertip Hotspot at (14, 2.5)) -->
          <svg id="tour-ghost-svg" width="40" height="42" viewBox="0 0 40 42" fill="none" xmlns="http://www.w3.org/2000/svg" class="filter drop-shadow-[0_4px_12px_rgba(244,63,94,0.45)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
            <defs>
              <linearGradient id="ghost-hand-skin" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="60%" stop-color="#fff5f5" />
                <stop offset="100%" stop-color="#ffe4e6" />
              </linearGradient>
            </defs>
            <g>
              <path d="M10.5 16.5V4.5C10.5 2.57 12.07 1 14 1C15.93 1 17.5 2.57 17.5 4.5V14.25M17.5 14.25V7.5C17.5 5.84 18.84 4.5 20.5 4.5C22.16 4.5 23.5 5.84 23.5 7.5V14.25M23.5 14.25V9.75C23.5 8.09 24.84 6.75 26.5 6.75C28.16 6.75 29.5 8.09 29.5 9.75V15.75M29.5 15.75V12C29.5 10.34 30.84 9 32.5 9C34.16 9 35.5 10.34 35.5 12V22.5C35.5 29.13 30.13 34.5 23.5 34.5H18.25C14.11 34.5 10.28 32.35 8.1 28.84L4.8 23.53C3.65 21.68 4.22 19.26 6.07 18.11C7.92 16.96 10.34 17.53 11.49 19.38L13.5 22.5" 
                fill="url(#ghost-hand-skin)" stroke="#f43f5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              <circle cx="14" cy="2.5" r="2.5" fill="#f43f5e" />
            </g>
          </svg>
          <div id="tour-ghost-ripple" class="hidden"></div>
        </div>
      </div>

      <!-- Static Pre-Allocated 4-Way Directional Pointer (GPU translate3d Only) -->
      <div id="tour-pointer-container" class="fixed pointer-events-none z-[10000] hidden will-change-transform tour-gpu-layer" style="top: 0; left: 0; transform: translate3d(0, 0, 0);">
        <div id="tour-pointer-inner" class="flex flex-col items-center justify-center pointer-events-none">
          <!-- Top Arrow (Active when orientation is 'below', pointing UP) -->
          <div id="tour-arrow-up" class="tour-arrow-icon text-3xl filter drop-shadow-[0_4px_12px_rgba(244,63,94,0.95)]">👆</div>
          
          <!-- Tooltip Badge Pill -->
          <div id="tour-pointer-badge" class="bg-gradient-to-r from-pink-600 to-rose-600 text-white font-black text-[11px] px-3.5 py-1 rounded-full shadow-2xl border-1.5 border-white whitespace-nowrap flex items-center gap-1">
            <span id="tour-arrow-left" class="tour-arrow-lateral hidden text-sm">👈</span>
            <span id="tour-pointer-text">請點擊此處</span>
            <span id="tour-arrow-right" class="tour-arrow-lateral hidden text-sm">👉</span>
          </div>

          <!-- Bottom Arrow (Active when orientation is 'above', pointing DOWN) -->
          <div id="tour-arrow-down" class="tour-arrow-icon text-3xl filter drop-shadow-[0_4px_12px_rgba(244,63,94,0.95)]">👇</div>
        </div>
      </div>

      <!-- Viewport-Safe Popover Card -->
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

    // Cache DOM Node References
    this.domPath = document.getElementById('tour-overlay-path');
    this.domGlow = document.getElementById('tour-spotlight-glow');
    this.domHalo = document.getElementById('tour-spotlight-halo');
    this.domPointer = document.getElementById('tour-pointer-container');
    this.domPointerBadge = document.getElementById('tour-pointer-badge');
    this.domPointerText = document.getElementById('tour-pointer-text');
    this.domArrowUp = document.getElementById('tour-arrow-up');
    this.domArrowDown = document.getElementById('tour-arrow-down');
    this.domArrowLeft = document.getElementById('tour-arrow-left');
    this.domArrowRight = document.getElementById('tour-arrow-right');
    this.domPopover = document.getElementById('tour-popover');
  }

  /**
   * Calculates a pixel-perfect rounded-corner cutout SVG path.
   * Uses SVG relative arc commands (a r r 0 0 1 ...).
   */
  getSpotlightSvgPath(x, y, w, h, r, vw, vh) {
    if (w <= 0 || h <= 0) {
      return `M 0 0 h ${vw} v ${vh} h -${vw} Z`;
    }

    const safeR = Math.max(0, Math.min(r, w / 2, h / 2));
    const outer = `M 0 0 h ${vw} v ${vh} h -${vw} Z`;

    if (safeR < 0.5) {
      const inner = `M ${x} ${y} h ${w} v ${h} h -${w} Z`;
      return `${outer} ${inner}`;
    }

    const inner = `M ${x + safeR} ${y} ` +
      `h ${w - 2 * safeR} ` +
      `a ${safeR} ${safeR} 0 0 1 ${safeR} ${safeR} ` +
      `v ${h - 2 * safeR} ` +
      `a ${safeR} ${safeR} 0 0 1 -${safeR} ${safeR} ` +
      `h -${w - 2 * safeR} ` +
      `a ${safeR} ${safeR} 0 0 1 -${safeR} -${safeR} ` +
      `v -${h - 2 * safeR} ` +
      `a ${safeR} ${safeR} 0 0 1 ${safeR} -${safeR} Z`;

    return `${outer} ${inner}`;
  }

  /**
   * Computes clamped box coordinates for a target element.
   */
  computeTargetBox(el, step = null) {
    const pad = (step && typeof step.pad === 'number') ? step.pad : 6;
    const radius = (step && typeof step.radius === 'number') ? step.radius : 14;
    const vw = this.cachedViewportWidth || (typeof window !== 'undefined' ? window.innerWidth : 1024);
    const vh = this.cachedViewportHeight || (typeof window !== 'undefined' ? window.innerHeight : 768);

    if (!el || el === document.body) {
      const defaultW = Math.min(320, vw - 40);
      const defaultH = Math.min(180, vh - 100);
      return {
        x: Math.round((vw - defaultW) / 2),
        y: Math.round((vh - defaultH) / 2),
        w: defaultW,
        h: defaultH,
        r: radius
      };
    }

    const rect = el.getBoundingClientRect();
    const rawX = rect.left - pad;
    const rawY = rect.top - pad;
    const rawW = rect.width + pad * 2;
    const rawH = rect.height + pad * 2;

    const x = Math.max(0, rawX);
    const y = Math.max(0, rawY);
    const w = Math.max(0, Math.min(vw - x, rawW - (x - rawX)));
    const h = Math.max(0, Math.min(vh - y, rawH - (y - rawY)));
    const r = Math.max(0, Math.min(radius, w / 2, h / 2));

    return {
      x: Math.round(x),
      y: Math.round(y),
      w: Math.round(w),
      h: Math.round(h),
      r: Math.round(r)
    };
  }

  /**
   * Applies box coordinates directly to SVG overlay path, glow outline, and pulse halo.
   */
  applyBox(box) {
    this.currentBox = { ...box };
    const vw = this.cachedViewportWidth || (typeof window !== 'undefined' ? window.innerWidth : 1024);
    const vh = this.cachedViewportHeight || (typeof window !== 'undefined' ? window.innerHeight : 768);
    const d = this.getSpotlightSvgPath(box.x, box.y, box.w, box.h, box.r, vw, vh);

    const pathEl = this.domPath || document.getElementById('tour-overlay-path');
    const glowEl = this.domGlow || document.getElementById('tour-spotlight-glow');
    const haloEl = this.domHalo || document.getElementById('tour-spotlight-halo');

    if (pathEl) pathEl.setAttribute('d', d);

    if (glowEl) {
      glowEl.setAttribute('x', box.x);
      glowEl.setAttribute('y', box.y);
      glowEl.setAttribute('width', box.w);
      glowEl.setAttribute('height', box.h);
      glowEl.setAttribute('rx', box.r);
      glowEl.setAttribute('ry', box.r);
    }

    if (haloEl) {
      const haloOffset = 3;
      haloEl.setAttribute('x', Math.max(0, box.x - haloOffset));
      haloEl.setAttribute('y', Math.max(0, box.y - haloOffset));
      haloEl.setAttribute('width', box.w + haloOffset * 2);
      haloEl.setAttribute('height', box.h + haloOffset * 2);
      haloEl.setAttribute('rx', box.r + haloOffset);
      haloEl.setAttribute('ry', box.r + haloOffset);
    }
  }

  /**
   * Flash-free transition tweening between spotlight geometries.
   */
  morphTo(targetEl, step, duration = 300) {
    if (this.morphAnimId) {
      cancelAnimationFrame(this.morphAnimId);
      this.morphAnimId = null;
    }

    const destBox = this.computeTargetBox(targetEl, step);

    if (!this.isInitialized || this.currentBox.w === 0) {
      this.applyBox(destBox);
      this.isInitialized = true;
      return Promise.resolve();
    }

    const startBox = { ...this.currentBox };
    const startTime = performance.now();

    return new Promise((resolve) => {
      const stepFn = (now) => {
        if (!this.isActive) {
          this.morphAnimId = null;
          resolve();
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic

        // Re-sample live target box in case scrolling is active
        const liveDest = this.computeTargetBox(targetEl, step);

        const current = {
          x: Math.round(startBox.x + (liveDest.x - startBox.x) * ease),
          y: Math.round(startBox.y + (liveDest.y - startBox.y) * ease),
          w: Math.round(startBox.w + (liveDest.w - startBox.w) * ease),
          h: Math.round(startBox.h + (liveDest.h - startBox.h) * ease),
          r: Math.round(startBox.r + (liveDest.r - startBox.r) * ease)
        };

        this.applyBox(current);

        if (progress < 1) {
          this.morphAnimId = requestAnimationFrame(stepFn);
        } else {
          this.applyBox(liveDest);
          this.morphAnimId = null;
          resolve();
        }
      };
      this.morphAnimId = requestAnimationFrame(stepFn);
    });
  }

  /**
   * Computes optimal pointer orientation ('below' | 'above' | 'right' | 'left')
   * taking into account target position, popover exclusion zone, and viewport margins.
   */
  computePointerOrientation(targetRect, popoverRect, popoverPlacement, dims, viewport) {
    const { badgeW, totalH_v, totalW_h, targetGap, margin } = dims;
    const { vw, vh } = viewport;

    // Popover exclusion boundary
    const limitTop = (popoverPlacement === 'top' && popoverRect) 
      ? (popoverRect.bottom + margin) 
      : margin;
    const limitBottom = (popoverPlacement === 'bottom' && popoverRect) 
      ? (popoverRect.top - margin) 
      : (vh - margin);

    // Available clearances
    const spaceBelow = limitBottom - (targetRect.bottom + targetGap);
    const spaceAbove = (targetRect.top - targetGap) - limitTop;
    const spaceRight = (vw - margin) - (targetRect.right + targetGap);
    const spaceLeft = (targetRect.left - targetGap) - margin;

    const targetCenterY = targetRect.top + targetRect.height / 2;
    const isTargetInUpperHalf = targetCenterY < (vh / 2);

    // 1. Preferred vertical placement
    if (isTargetInUpperHalf && spaceBelow >= totalH_v) {
      return 'below'; // Pointer sits BELOW target, pointing UP
    }
    if (!isTargetInUpperHalf && spaceAbove >= totalH_v) {
      return 'above'; // Pointer sits ABOVE target, pointing DOWN
    }

    // 2. Secondary vertical placement
    if (spaceBelow >= totalH_v) return 'below';
    if (spaceAbove >= totalH_v) return 'above';

    // 3. Lateral placement when vertical space is constricted
    if (spaceRight >= totalW_h && targetCenterY >= limitTop && targetCenterY <= limitBottom) {
      return 'right'; // Pointer sits to the RIGHT of target, pointing LEFT
    }
    if (spaceLeft >= totalW_h && targetCenterY >= limitTop && targetCenterY <= limitBottom) {
      return 'left'; // Pointer sits to the LEFT of target, pointing RIGHT
    }

    // 4. Fallback to maximum clearance direction
    const clearances = [
      { side: 'below', space: spaceBelow },
      { side: 'above', space: spaceAbove },
      { side: 'right', space: spaceRight },
      { side: 'left', space: spaceLeft }
    ];
    clearances.sort((a, b) => b.space - a.space);
    return clearances[0].side;
  }

  /**
   * Calculates absolute translate3d coordinates and relative arrow stem offset.
   * Guarantees zero viewport edge clipping and zero popover collision.
   */
  computePointerLayout(targetRect, popoverRect, popoverPlacement, orientation, dims, viewport) {
    const { badgeW, badgeH, arrowW, arrowH, targetGap, margin } = dims;
    const { vw, vh } = viewport;

    const limitTop = (popoverPlacement === 'top' && popoverRect) ? (popoverRect.bottom + margin) : margin;
    const limitBottom = (popoverPlacement === 'bottom' && popoverRect) ? (popoverRect.top - margin) : (vh - margin);

    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    let containerX = 0;
    let containerY = 0;
    let arrowOffsetX = 0;

    if (orientation === 'below') {
      // Arrow is on top of badge, pointing UP
      const totalH = badgeH + arrowH + 4;
      const rawY = targetRect.bottom + targetGap;
      containerY = Math.min(limitBottom - totalH, Math.max(limitTop, rawY));

      const halfW = badgeW / 2;
      const clampedCenterX = Math.max(margin + halfW, Math.min(vw - margin - halfW, targetCenterX));
      containerX = clampedCenterX - halfW;

      // Shift arrow stem to align with targetCenterX
      const localTargetX = targetCenterX - containerX;
      const minArrowX = arrowW / 2 + 8;
      const maxArrowX = badgeW - (arrowW / 2) - 8;
      arrowOffsetX = Math.max(minArrowX, Math.min(maxArrowX, localTargetX)) - halfW;
    } else if (orientation === 'above') {
      // Arrow is below badge, pointing DOWN
      const totalH = badgeH + arrowH + 4;
      const rawY = targetRect.top - targetGap - totalH;
      containerY = Math.max(limitTop, Math.min(limitBottom - totalH, rawY));

      const halfW = badgeW / 2;
      const clampedCenterX = Math.max(margin + halfW, Math.min(vw - margin - halfW, targetCenterX));
      containerX = clampedCenterX - halfW;

      const localTargetX = targetCenterX - containerX;
      const minArrowX = arrowW / 2 + 8;
      const maxArrowX = badgeW - (arrowW / 2) - 8;
      arrowOffsetX = Math.max(minArrowX, Math.min(maxArrowX, localTargetX)) - halfW;
    } else if (orientation === 'right') {
      // Pointer to the right of target, pointing LEFT
      containerX = Math.min(vw - margin - badgeW - arrowW, Math.max(margin, targetRect.right + targetGap));
      const clampedCenterY = Math.max(limitTop + (badgeH / 2), Math.min(limitBottom - (badgeH / 2), targetCenterY));
      containerY = clampedCenterY - (badgeH / 2);
      arrowOffsetX = 0;
    } else if (orientation === 'left') {
      // Pointer to the left of target, pointing RIGHT
      containerX = Math.max(margin, Math.min(vw - margin - badgeW - arrowW, targetRect.left - targetGap - badgeW - arrowW));
      const clampedCenterY = Math.max(limitTop + (badgeH / 2), Math.min(limitBottom - (badgeH / 2), targetCenterY));
      containerY = clampedCenterY - (badgeH / 2);
      arrowOffsetX = 0;
    }

    return {
      x: Math.round(containerX),
      y: Math.round(containerY),
      arrowOffsetX: Math.round(arrowOffsetX)
    };
  }

  /**
   * Synchronizes the pointer during active rAF tracking.
   * Modifies only translate3d, arrow visibility, and textContent without rewriting innerHTML.
   */
  updatePointer(targetEl, step) {
    const container = this.domPointer || document.getElementById('tour-pointer-container');
    if (!container || !targetEl || !step || step.action === 'info') {
      if (container) container.classList.add('hidden');
      return;
    }

    const targetRect = targetEl.getBoundingClientRect();
    if (targetRect.width === 0 || targetRect.height === 0) {
      container.classList.add('hidden');
      return;
    }

    const popover = this.domPopover || document.getElementById('tour-popover');
    const popoverRect = popover ? popover.getBoundingClientRect() : null;
    const vw = this.cachedViewportWidth || window.innerWidth;
    const vh = this.cachedViewportHeight || window.innerHeight;

    // 1. Popover docking position
    const isTargetInUpperHalf = (targetRect.top + targetRect.height / 2) < (vh / 2);
    const popoverPlacement = isTargetInUpperHalf ? 'bottom' : 'top';

    if (popover) {
      if (popoverPlacement === 'bottom') {
        popover.style.top = 'auto';
        popover.style.bottom = 'max(14px, env(safe-area-inset-bottom, 14px))';
      } else {
        popover.style.bottom = 'auto';
        popover.style.top = 'max(14px, env(safe-area-inset-top, 14px))';
      }
    }

    // 2. Measure or fetch badge dimensions
    const badgeEl = this.domPointerBadge || document.getElementById('tour-pointer-badge');
    const badgeW = badgeEl ? badgeEl.offsetWidth || 120 : 120;
    const badgeH = badgeEl ? badgeEl.offsetHeight || 28 : 28;

    const dims = {
      badgeW,
      badgeH,
      arrowW: 32,
      arrowH: 32,
      totalH_v: badgeH + 32 + 4,
      totalW_h: badgeW + 32 + 8,
      targetGap: 10,
      margin: 12
    };
    const viewport = { vw, vh };

    // 3. Compute 4-way orientation
    const orientation = this.computePointerOrientation(targetRect, popoverRect, popoverPlacement, dims, viewport);

    // 4. Compute clamped layout
    const layout = this.computePointerLayout(targetRect, popoverRect, popoverPlacement, orientation, dims, viewport);

    // 5. Update text only when changed
    const hintText = (step.action === 'manual-change') ? '請點此切換' : 
                     (step.action === 'manual-click') ? '請點擊此處' : '系統代為點擊';
    const textEl = this.domPointerText || document.getElementById('tour-pointer-text');
    if (textEl && textEl.textContent !== hintText) {
      textEl.textContent = hintText;
    }

    // 6. Update orientation classes & arrow visibility
    const arrowUp = this.domArrowUp || document.getElementById('tour-arrow-up');
    const arrowDown = this.domArrowDown || document.getElementById('tour-arrow-down');
    const arrowLeft = this.domArrowLeft || document.getElementById('tour-arrow-left');
    const arrowRight = this.domArrowRight || document.getElementById('tour-arrow-right');

    if (orientation === 'below') {
      arrowUp?.classList.remove('hidden');
      arrowUp?.classList.add('tour-bounce-up');
      arrowDown?.classList.add('hidden');
      arrowLeft?.classList.add('hidden');
      arrowRight?.classList.add('hidden');
      if (arrowUp) arrowUp.style.transform = `translateX(${layout.arrowOffsetX}px)`;
    } else if (orientation === 'above') {
      arrowUp?.classList.add('hidden');
      arrowDown?.classList.remove('hidden');
      arrowDown?.classList.add('tour-bounce-down');
      arrowLeft?.classList.add('hidden');
      arrowRight?.classList.add('hidden');
      if (arrowDown) arrowDown.style.transform = `translateX(${layout.arrowOffsetX}px)`;
    } else if (orientation === 'right') {
      arrowUp?.classList.add('hidden');
      arrowDown?.classList.add('hidden');
      arrowLeft?.classList.remove('hidden');
      arrowLeft?.classList.add('tour-bounce-left');
      arrowRight?.classList.add('hidden');
    } else if (orientation === 'left') {
      arrowUp?.classList.add('hidden');
      arrowDown?.classList.add('hidden');
      arrowLeft?.classList.add('hidden');
      arrowRight?.classList.remove('hidden');
      arrowRight?.classList.add('tour-bounce-right');
    }

    // 7. Apply GPU translate3d (Zero CSS transition delay)
    container.style.transform = `translate3d(${layout.x}px, ${layout.y}px, 0)`;
    container.classList.remove('hidden');
  }

  /**
   * Updates spotlight cutout mask and glowing outline for target element.
   */
  updateSpotlight(targetEl) {
    if (!targetEl) return;
    const box = this.computeTargetBox(targetEl, this.currentStepObj);
    this.applyBox(box);
  }

  /**
   * Highlights target element by updating spotlight mask and directional pointer.
   */
  highlightElement(el, step) {
    if (!el || !step) return;
    this.updateSpotlight(el);
    this.updatePointer(el, step);
  }

  /**
   * Passive & Throttled Event Listener Management
   */
  bindEventListeners() {
    this.onScrollHandler = () => {
      if (this.isActive && !this.trackingFrame) {
        this.startTracking();
      }
    };
    window.addEventListener('scroll', this.onScrollHandler, { passive: true });

    this.onResizeHandler = () => {
      this.cachedViewportWidth = window.innerWidth;
      this.cachedViewportHeight = window.innerHeight;
      if (this.isActive && this.currentTargetEl && this.currentStepObj) {
        this.lastGeometry = { left: -999, top: -999, width: -999, height: -999, vw: -999, vh: -999 };
        this.highlightElement(this.currentTargetEl, this.currentStepObj);
      }
    };
    window.addEventListener('resize', this.onResizeHandler, { passive: true });
    window.addEventListener('orientationchange', this.onResizeHandler, { passive: true });

    if (typeof window !== 'undefined' && window.visualViewport) {
      this.onVisualViewportHandler = () => {
        this.cachedViewportWidth = window.visualViewport.width;
        this.cachedViewportHeight = window.visualViewport.height;
        this.lastGeometry = { left: -999, top: -999, width: -999, height: -999, vw: -999, vh: -999 };
        if (this.isActive && this.currentTargetEl && this.currentStepObj) {
          this.highlightElement(this.currentTargetEl, this.currentStepObj);
        }
      };
      window.visualViewport.addEventListener('resize', this.onVisualViewportHandler, { passive: true });
      window.visualViewport.addEventListener('scroll', this.onVisualViewportHandler, { passive: true });
    }

    this.cachedViewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    this.cachedViewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
  }

  unbindEventListeners() {
    if (this.onScrollHandler) {
      window.removeEventListener('scroll', this.onScrollHandler);
      this.onScrollHandler = null;
    }
    if (this.onResizeHandler) {
      window.removeEventListener('resize', this.onResizeHandler);
      window.removeEventListener('orientationchange', this.onResizeHandler);
      this.onResizeHandler = null;
    }
    if (typeof window !== 'undefined' && window.visualViewport && this.onVisualViewportHandler) {
      window.visualViewport.removeEventListener('resize', this.onVisualViewportHandler);
      window.visualViewport.removeEventListener('scroll', this.onVisualViewportHandler);
      this.onVisualViewportHandler = null;
    }
  }

  /**
   * 60fps / 120fps rAF Tracking Loop with Sub-Pixel Delta Optimization.
   */
  startTracking() {
    if (this.trackingFrame) {
      cancelAnimationFrame(this.trackingFrame);
      this.trackingFrame = null;
    }

    this.lastGeometry = { left: -999, top: -999, width: -999, height: -999, vw: -999, vh: -999 };

    const loop = () => {
      if (!this.isActive) return;

      if (this.currentTargetEl && this.currentStepObj && !this.morphAnimId) {
        const rect = this.currentTargetEl.getBoundingClientRect();
        const vw = this.cachedViewportWidth || window.innerWidth;
        const vh = this.cachedViewportHeight || window.innerHeight;

        if (rect.width > 0 && rect.height > 0) {
          const dx = Math.abs(rect.left - this.lastGeometry.left);
          const dy = Math.abs(rect.top - this.lastGeometry.top);
          const dw = Math.abs(rect.width - this.lastGeometry.width);
          const dh = Math.abs(rect.height - this.lastGeometry.height);
          const dvw = Math.abs(vw - this.lastGeometry.vw);
          const dvh = Math.abs(vh - this.lastGeometry.vh);

          if (dx > 0.1 || dy > 0.1 || dw > 0.1 || dh > 0.1 || dvw > 0.1 || dvh > 0.1) {
            this.highlightElement(this.currentTargetEl, this.currentStepObj);

            this.lastGeometry.left = rect.left;
            this.lastGeometry.top = rect.top;
            this.lastGeometry.width = rect.width;
            this.lastGeometry.height = rect.height;
            this.lastGeometry.vw = vw;
            this.lastGeometry.vh = vh;
          }
        }
      }

      this.trackingFrame = requestAnimationFrame(loop);
    };

    this.trackingFrame = requestAnimationFrame(loop);
  }  /**
   * Safe Lifecycle & Cancellation Token Helpers
   */
  safeTimeout(fn, delay) {
    const timerId = setTimeout(() => {
      this.activeTimers.delete(timerId);
      if (!this.isActive) return;
      fn();
    }, delay);
    this.activeTimers.add(timerId);
    return timerId;
  }

  safeDelay(ms, expectedSessionId = this.currentSessionId) {
    return new Promise((resolve) => {
      const timerId = setTimeout(() => {
        this.activeTimers.delete(timerId);
        if (!this.isActive || (expectedSessionId !== null && this.currentSessionId !== expectedSessionId)) {
          resolve(false);
        } else {
          resolve(true);
        }
      }, ms);
      this.activeTimers.add(timerId);
    });
  }

  clearAllTimers() {
    for (const timerId of this.activeTimers) {
      clearTimeout(timerId);
    }
    this.activeTimers.clear();
  }

  clearAllAnimations() {
    for (const handle of this.activeAnimations) {
      cancelAnimationFrame(handle);
    }
    this.activeAnimations.clear();
    if (this.trackingFrame) {
      cancelAnimationFrame(this.trackingFrame);
      this.trackingFrame = null;
    }
    if (this.morphAnimId) {
      cancelAnimationFrame(this.morphAnimId);
      this.morphAnimId = null;
    }
    if (this.ghostAnimId) {
      cancelAnimationFrame(this.ghostAnimId);
      this.ghostAnimId = null;
    }
  }

  cancelAutoPlay() {
    this.isAutoPlaying = false;
    this.currentSessionId++;
    if (this.ghostAnimId) {
      cancelAnimationFrame(this.ghostAnimId);
      this.ghostAnimId = null;
    }
    const ghost = document.getElementById('tour-ghost-cursor');
    if (ghost) {
      ghost.style.opacity = '0';
      ghost.classList.remove('ghost-cursor-click');
    }
    const ghostBody = document.getElementById('tour-ghost-cursor-body');
    if (ghostBody) {
      ghostBody.classList.remove('ghost-cursor-click');
    }
    const ripple = document.getElementById('tour-ghost-ripple');
    if (ripple) {
      ripple.classList.remove('ghost-cursor-ripple');
      ripple.classList.add('hidden');
    }
    if (this.currentTargetEl) {
      this.currentTargetEl.classList.remove('tour-simulated-active');
    }
  }

  playAudioFeedback(type = 'pop') {
    try {
      if (window.appState && typeof window.appState.isSoundEnabled === 'function') {
        if (!window.appState.isSoundEnabled()) return;
      } else if (typeof localStorage !== 'undefined' && localStorage.getItem('classquant_sound') === 'false') {
        return;
      }

      if (type === 'pop' && window.appState?.playPop) {
        window.appState.playPop();
        return;
      }
      if (type === 'chime' && window.appState?.playChime) {
        window.appState.playChime();
        return;
      }

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      if (type === 'pop') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.07);
      } else if (type === 'chime') {
        const freqs = [523.25, 659.25, 783.99];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.05, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.3);
        });
      }
    } catch (e) {}
  }

  async waitForElement(primarySelector, fallbackSelector, timeout = 3000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (!this.isActive) return null;
      let el = this.safeQuerySelector(primarySelector);
      if (!el && fallbackSelector) el = this.safeQuerySelector(fallbackSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return el;
        }
      }
      const ok = await this.safeDelay(40);
      if (!ok || !this.isActive) return null;
    }
    return this.safeQuerySelector(primarySelector) || 
           (fallbackSelector ? this.safeQuerySelector(fallbackSelector) : null) || 
           document.getElementById('classroom-matrix-view') || 
           document.body;
  }

  cleanupEnforcement() {
    if (typeof this.activeEnforcementCleanup === 'function') {
      try {
        this.activeEnforcementCleanup();
      } catch (e) {}
      this.activeEnforcementCleanup = null;
    }
    if (this.activeListener && this.lastTargetEl && this.lastEventType) {
      try {
        this.lastTargetEl.removeEventListener(this.lastEventType, this.activeListener);
      } catch (e) {}
    }
    this.activeListener = null;
    this.lastTargetEl = null;
    this.lastEventType = null;
  }

  async start(fromStep = 0) {
    try {
      this.isActive = true;
      this.isTransitioning = false;
      this.lastTransitionTime = Date.now();
      this.cancelAutoPlay();
      this.clearAllTimers();
      this.clearAllAnimations();
      this.currentStep = Math.max(0, Math.min(this.steps.length - 1, fromStep));
      this.isInitialized = false;

      if (window.appState) {
        window.appState.toggleHeader(true, true);
        window.appState.closeModal();
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
          return;
        }

        const step = this.steps[this.currentStep];
        if (!step) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        if (step.action === 'auto-click' || step.action === 'info') {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        if (step.action === 'manual-click' || step.action === 'manual-change') {
          let isInsideSpotlight = false;
          const targetEl = this.currentTargetEl;

          if (targetEl && targetEl !== document.body) {
            if (e.target === targetEl || targetEl.contains(e.target)) {
              isInsideSpotlight = true;
            } else {
              const rect = targetEl.getBoundingClientRect();
              const pad = (typeof step.pad === 'number') ? step.pad : 6;
              const minX = rect.left - pad;
              const minY = rect.top - pad;
              const maxX = rect.right + pad;
              const maxY = rect.bottom + pad;

              let clientX = e.clientX;
              let clientY = e.clientY;
              if (typeof clientX !== 'number' && e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
              } else if (typeof clientX !== 'number' && e.changedTouches && e.changedTouches.length > 0) {
                clientX = e.changedTouches[0].clientX;
                clientY = e.changedTouches[0].clientY;
              }

              if (typeof clientX === 'number' && typeof clientY === 'number') {
                if (clientX >= minX && clientX <= maxX && clientY >= minY && clientY <= maxY) {
                  isInsideSpotlight = true;
                }
              }
            }
          }

          if (!isInsideSpotlight) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      };

      document.addEventListener('click', this.clickBlocker, { capture: true });
      document.addEventListener('touchstart', this.clickBlocker, { capture: true, passive: false });
      document.addEventListener('pointerdown', this.clickBlocker, { capture: true, passive: false });
      document.addEventListener('mousedown', this.clickBlocker, { capture: true });

      this.bindEventListeners();

      const container = document.getElementById('tour-overlay-container');
      if (container) container.classList.remove('hidden');

      this.playAudioFeedback('chime');
      
      this.startTracking();
      await this.renderStep();
    } catch (err) {
      console.error('[OnboardingTour] start error:', err);
      this.endTour();
    }
  }

  async renderStep() {
    if (!this.isActive) {
      this.isTransitioning = false;
      return;
    }
    this.cancelAutoPlay();
    const session = this.currentSessionId;

    try {
      const step = this.steps[this.currentStep];
      this.currentStepObj = step;
      this.currentTargetEl = null;

      // Keep existing spotlight mask rendered to eliminate black-screen flashes
      const pointer = this.domPointer || document.getElementById('tour-pointer-container');
      if (pointer) pointer.classList.add('hidden');
      const ghost = document.getElementById('tour-ghost-cursor');
      if (ghost) ghost.style.opacity = '0';

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
      if (!this.isActive || this.currentSessionId !== session) return;

      if (!targetEl || targetEl === document.body) {
        targetEl = document.getElementById('classroom-matrix-view') || document.body;
      }

      if (targetEl && targetEl !== document.body) {
        const navEl = targetEl.closest('nav') || targetEl.closest('.overflow-x-auto') || targetEl.parentElement?.closest('nav');
        if (navEl && typeof targetEl.offsetLeft === 'number') {
          const targetLeft = targetEl.offsetLeft;
          const targetWidth = targetEl.offsetWidth;
          const navWidth = navEl.clientWidth;
          const scrollLeft = Math.max(0, targetLeft - (navWidth / 2) + (targetWidth / 2));
          if (typeof navEl.scrollTo === 'function') {
            navEl.scrollTo({
              left: scrollLeft,
              behavior: 'smooth'
            });
          } else {
            navEl.scrollLeft = scrollLeft;
          }
        }
        if (typeof targetEl.scrollIntoView === 'function') {
          targetEl.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
        }
        await this.safeDelay(400, session);
        if (!this.isActive || this.currentSessionId !== session) return;
      }

      this.currentTargetEl = targetEl;
      this.setupEnforcement(targetEl, step);
      
      const titleEl = document.getElementById('tour-title');
      const contentEl = document.getElementById('tour-content');
      const badgeEl = document.getElementById('tour-step-badge');
      const actionContainer = document.getElementById('tour-action-container');

      if (badgeEl) badgeEl.innerText = `步驟 ${this.currentStep + 1} / ${this.steps.length}`;
      if (titleEl) titleEl.innerHTML = step.title;
      if (contentEl) contentEl.innerHTML = step.content;

      if (actionContainer) {
        if (step.action === 'manual-click' || step.action === 'manual-change') {
          actionContainer.innerHTML = `
            <div class="px-3 py-1.5 rounded-xl bg-pink-100 text-pink-700 text-xs font-black flex items-center gap-1 animate-pulse border border-pink-300">
              <span>👆</span>
              <span>請您親自操作發光處</span>
            </div>
          `;
        } else if (step.action === 'auto-click') {
          actionContainer.innerHTML = `
            <button onclick="onboardingTour.playGhostCursor()" class="px-4 py-2 rounded-xl font-black text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-xs shadow-md transition flex items-center gap-1 active:scale-95 animate-bounce">
              <span>讓系統代為操作 🪄</span>
            </button>
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
      }

      if (window.lucide) window.lucide.createIcons();

      // Smoothly morph spotlight cutout, then update pointer
      await this.morphTo(targetEl, step, 280);
      if (!this.isActive || this.currentSessionId !== session) return;
      this.highlightElement(targetEl, step);
    } catch (err) {
      console.error('[OnboardingTour] renderStep error:', err);
      try {
        const fallbackTarget = document.getElementById('classroom-matrix-view') || document.body;
        this.highlightElement(fallbackTarget, this.currentStepObj || this.steps[0]);
      } catch (e) {
        this.endTour();
      }
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Human-like Curved Bezier Trajectory Kinematics Auto-Pilot
   */
  async playGhostCursor(targetEl = null, callback = null) {
    if (this.isAutoPlaying) return;
    if (!this.isActive) return;

    const target = targetEl || this.currentTargetEl;
    if (!target) return;

    this.isAutoPlaying = true;
    const session = ++this.currentSessionId;

    const ghost = document.getElementById('tour-ghost-cursor');
    const ghostBody = document.getElementById('tour-ghost-cursor-body');
    const ripple = document.getElementById('tour-ghost-ripple');
    const popoverBtn = document.querySelector('#tour-action-container button');

    if (!ghost) {
      this.isAutoPlaying = false;
      return;
    }

    // Hotspot offset: Index fingertip is at (14, 2.5) relative to ghost cursor container
    const hx = 14;
    const hy = 2.5;

    // 1. Determine start position (popover button or screen center)
    let startX, startY;
    if (popoverBtn) {
      const btnRect = popoverBtn.getBoundingClientRect();
      startX = btnRect.left + btnRect.width / 2;
      startY = btnRect.top + btnRect.height / 2;
    } else {
      startX = (typeof window !== 'undefined' ? window.innerWidth : 1024) / 2;
      startY = (typeof window !== 'undefined' ? window.innerHeight : 768) * 0.75;
    }

    // 2. Determine target position
    const targetRect = target.getBoundingClientRect();
    const destX = targetRect.left + targetRect.width / 2;
    const destY = targetRect.top + targetRect.height / 2;

    // 3. Reset cursor styling & show at start position
    ghost.style.transition = 'none';
    ghost.style.transform = `translate3d(${startX - hx}px, ${startY - hy}px, 0)`;
    ghost.style.opacity = '1';
    if (ghostBody) ghostBody.classList.remove('ghost-cursor-click');
    if (ripple) {
      ripple.classList.remove('ghost-cursor-ripple');
      ripple.classList.add('hidden');
    }

    // Force reflow
    ghost.offsetHeight;

    // 4. Calculate Quadratic Bezier Control Point
    const dx = destX - startX;
    const dy = destY - startY;
    const dist = Math.hypot(dx, dy);

    const mx = (startX + destX) / 2;
    const my = (startY + destY) / 2;

    // Upward arc curvature based on travel distance
    const arcElevation = Math.max(35, Math.min(130, dist * 0.28));
    const angle = Math.atan2(dy, dx);
    const lateralArc = Math.sin(angle) * 15;

    const cpX = mx + lateralArc;
    const cpY = my - arcElevation;

    // 5. Kinematic Flight Animation via requestAnimationFrame
    const duration = Math.max(700, Math.min(950, 600 + dist * 0.35));
    const startTime = performance.now();

    const easeInOutCubic = (p) => {
      return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    };

    await new Promise((resolve) => {
      const animateFrame = (now) => {
        if (!this.isActive || this.currentSessionId !== session) {
          this.ghostAnimId = null;
          resolve(false);
          return;
        }

        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const t = easeInOutCubic(progress);

        // Sample live target rect in case of layout shifts
        const liveTargetRect = target.getBoundingClientRect();
        const liveDestX = liveTargetRect.left + liveTargetRect.width / 2;
        const liveDestY = liveTargetRect.top + liveTargetRect.height / 2;

        // Quadratic Bezier formula
        const oneMinusT = 1 - t;
        const curX = oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * cpX + t * t * liveDestX;
        const curY = oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * cpY + t * t * liveDestY;

        // Natural tilt during flight
        const tilt = Math.sin(progress * Math.PI) * (dx < 0 ? -6 : 6);

        ghost.style.transform = `translate3d(${curX - hx}px, ${curY - hy}px, 0) rotate(${tilt}deg)`;

        if (progress < 1) {
          this.ghostAnimId = requestAnimationFrame(animateFrame);
        } else {
          ghost.style.transform = `translate3d(${liveDestX - hx}px, ${liveDestY - hy}px, 0) rotate(0deg)`;
          this.ghostAnimId = null;
          resolve(true);
        }
      };

      this.ghostAnimId = requestAnimationFrame(animateFrame);
    });

    if (!this.isActive || this.currentSessionId !== session) {
      this.isAutoPlaying = false;
      return;
    }

    // 6. Arrival & Press Interaction Feedback
    if (ghostBody) ghostBody.classList.add('ghost-cursor-click');
    if (ripple) {
      ripple.classList.remove('hidden');
      ripple.classList.add('ghost-cursor-ripple');
    }
    target.classList.add('tour-simulated-active');
    this.playAudioFeedback('pop');

    // Dwell at press state before firing synthetic click (80ms)
    const dwellOk1 = await this.safeDelay(80, session);
    if (!dwellOk1 || !this.isActive || this.currentSessionId !== session) {
      target.classList.remove('tour-simulated-active');
      this.isAutoPlaying = false;
      return;
    }

    // Trigger synthetic click on underlying tab button / element
    try {
      target.click();
    } catch (e) {}

    if (typeof callback === 'function') {
      try {
        callback(target);
      } catch (e) {}
    }

    // Release simulated active state
    const dwellOk2 = await this.safeDelay(180, session);
    target.classList.remove('tour-simulated-active');

    if (!dwellOk2 || !this.isActive || this.currentSessionId !== session) {
      this.isAutoPlaying = false;
      return;
    }

    // Dwell for ripple / feedback completion before advancing (160ms)
    const dwellOk3 = await this.safeDelay(160, session);
    if (!dwellOk3 || !this.isActive || this.currentSessionId !== session) {
      this.isAutoPlaying = false;
      return;
    }

    // Fade out ghost cursor
    ghost.style.opacity = '0';
    this.isAutoPlaying = false;

    // If no custom callback handled navigation, advance step
    if (!callback) {
      this.nextStep();
    }
  }

  setupEnforcement(targetEl, step) {
    this.cleanupEnforcement();

    if (!targetEl || !step) return;

    if (step.action === 'manual-click' || step.action === 'manual-change') {
      const session = this.currentSessionId;
      let hasTriggered = false;

      const triggerAdvance = (e) => {
        if (hasTriggered) return;
        
        // For select elements, enforce valid non-empty value
        if (targetEl.tagName === 'SELECT' && (!targetEl.value || targetEl.value.trim() === '')) {
          return;
        }

        hasTriggered = true;
        this.playAudioFeedback('pop');
        this.cleanupEnforcement();

        this.safeTimeout(() => {
          if (this.isActive && this.currentSessionId === session) {
            this.nextStep();
          }
        }, 200);
      };

      if (step.id === 'step-class-select' || targetEl.id === 'global-class-select' || targetEl.tagName === 'SELECT' || step.action === 'manual-change') {
        const events = ['change', 'input', 'blur'];
        let userInteracted = false;

        const onUserInteract = () => {
          userInteracted = true;
        };

        targetEl.addEventListener('focus', onUserInteract, { capture: true });
        targetEl.addEventListener('click', onUserInteract, { capture: true });
        targetEl.addEventListener('mousedown', onUserInteract, { capture: true });
        targetEl.addEventListener('touchstart', onUserInteract, { capture: true, passive: true });

        const onEvent = (e) => {
          if (e.type === 'blur') {
            if (userInteracted || (targetEl.value && targetEl.value.trim() !== '')) {
              triggerAdvance(e);
            }
          } else {
            triggerAdvance(e);
          }
        };

        events.forEach(evt => targetEl.addEventListener(evt, onEvent));

        this.activeEnforcementCleanup = () => {
          targetEl.removeEventListener('focus', onUserInteract, { capture: true });
          targetEl.removeEventListener('click', onUserInteract, { capture: true });
          targetEl.removeEventListener('mousedown', onUserInteract, { capture: true });
          targetEl.removeEventListener('touchstart', onUserInteract, { capture: true });
          events.forEach(evt => targetEl.removeEventListener(evt, onEvent));
        };
        this.lastTargetEl = targetEl;
        this.lastEventType = 'change';
        this.activeListener = onEvent;
      } else {
        const listener = (e) => {
          triggerAdvance(e);
        };
        targetEl.addEventListener('click', listener, { once: true });
        this.activeEnforcementCleanup = () => {
          targetEl.removeEventListener('click', listener);
        };
        this.lastTargetEl = targetEl;
        this.lastEventType = 'click';
        this.activeListener = listener;
      }
    }
  }

  async nextStep() {
    if (!this.isActive) return;
    const now = Date.now();
    if (this.isTransitioning || (now - this.lastTransitionTime < this.transitionDebounceMs)) {
      return;
    }
    this.isTransitioning = true;
    this.lastTransitionTime = now;
    this.cancelAutoPlay();

    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.playAudioFeedback('pop');
      await this.renderStep();
    } else {
      this.endTour();
      this.playAudioFeedback('chime');
      if (window.appState?.showToast) {
        window.appState.showToast('🎉 恭喜完成實戰教學！', 'success');
      }
    }
  }

  async prevStep() {
    if (!this.isActive) return;
    const now = Date.now();
    if (this.isTransitioning || (now - this.lastTransitionTime < this.transitionDebounceMs)) {
      return;
    }
    this.isTransitioning = true;
    this.lastTransitionTime = now;
    this.cancelAutoPlay();

    if (this.currentStep > 0) {
      this.currentStep--;
      this.playAudioFeedback('pop');
      await this.renderStep();
    } else {
      this.isTransitioning = false;
    }
  }

  async goToStep(stepIndex) {
    if (!this.isActive) return;
    const targetStep = Math.max(0, Math.min(this.steps.length - 1, stepIndex));
    if (targetStep === this.currentStep && !this.isTransitioning) return;

    const now = Date.now();
    if (this.isTransitioning || (now - this.lastTransitionTime < this.transitionDebounceMs)) {
      return;
    }
    this.isTransitioning = true;
    this.lastTransitionTime = now;
    this.cancelAutoPlay();

    this.currentStep = targetStep;
    this.playAudioFeedback('pop');
    await this.renderStep();
  }

  endTour() {
    this.isActive = false;
    this.isTransitioning = false;
    this.cancelAutoPlay();
    this.clearAllTimers();
    this.clearAllAnimations();
    
    this.currentTargetEl = null;
    this.currentStepObj = null;
    this.isInitialized = false;

    this.unbindEventListeners();
    this.cleanupEnforcement();

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
      document.removeEventListener('pointerdown', this.clickBlocker, { capture: true });
      document.removeEventListener('mousedown', this.clickBlocker, { capture: true });
      this.clickBlocker = null;
    }

    document.documentElement.classList.remove('tour-strict-locked');
    document.body.classList.remove('tour-strict-locked');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.documentElement.style.touchAction = '';
    document.body.style.touchAction = '';

    const container = document.getElementById('tour-overlay-container');
    if (container) {
      container.classList.add('hidden');
      document.getElementById('tour-pointer-container')?.classList.add('hidden');
      const ghost = document.getElementById('tour-ghost-cursor');
      if (ghost) {
        ghost.style.opacity = '0';
        ghost.classList.remove('ghost-cursor-click');
      }
      const ripple = document.getElementById('tour-ghost-ripple');
      if (ripple) {
        ripple.classList.remove('ghost-cursor-ripple');
        ripple.classList.add('hidden');
      }
    }

    // Clean up any simulated active buttons
    document.querySelectorAll('.tour-simulated-active').forEach(el => {
      el.classList.remove('tour-simulated-active');
    });

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('classquant_tour_completed', 'true');
        localStorage.setItem('classquant_onboarding_completed', 'true');
      } catch (e) {}
    }
  }

  destroy() {
    this.endTour();
  }
}

// Global Singleton Initialization
if (typeof window !== 'undefined') {
  window.OnboardingTour = OnboardingTour;
  window.onboardingTour = new OnboardingTour();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OnboardingTour };
}

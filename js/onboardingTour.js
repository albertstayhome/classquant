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
        title: "2. 點選學生座位 (親手實戰)",
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
        content: "除了預設標籤，點擊<strong>「⚙️ 自訂」</strong>可自由新增各科專屬加扣分項目與調整分值！",
        action: "info",
        tab: "matrix",
        pad: 6,
        radius: 12
      },
      {
        id: "step-goto-roster",
        targetSelector: 'button[data-tab="roster"]',
        title: "5. 前往 👥 班級名單中心",
        content: "接下來帶您匯入名單。<strong>請親手點擊下方導覽列的「👥 班級名單」</strong>！",
        action: "manual-click",
        tab: "matrix",
        pad: 6,
        radius: 14
      },
      {
        id: "step-roster-paste",
        targetSelector: "#roster-paste-btn",
        title: "6. 1 秒批次貼上名冊 (系統演示)",
        content: "新學期大絕招！點擊下方紫色按鈕，看系統為您<strong>自動打開視窗並模擬打字匯入名單</strong>！",
        action: "auto-pilot-paste",
        tab: "roster",
        pad: 8,
        radius: 14
      },
      {
        id: "step-roster-details",
        targetSelector: "#roster-student-name-input-1",
        fallbackSelector: "#roster-student-card-1",
        title: "7. 學生名冊個別微調 (系統演示)",
        content: "姓名打錯或要加幹部備註？請看系統<strong>自動示範如何修改學生姓名與座號</strong>！",
        action: "auto-pilot-edit",
        tab: "roster",
        pad: 6,
        radius: 12
      },
      {
        id: "step-goto-retro",
        targetSelector: 'button[data-tab="retro"]',
        title: "8. 前往 ⏰ 課堂事後補記專區",
        content: "下課回到辦公室！<strong>請點擊下方導覽列的「⏰ 課堂事後補記」</strong>切換分頁。",
        action: "manual-click",
        tab: "roster",
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
        content: "想看全班大數據？<strong>請點擊下方導覽列的「📊 統計戰情室」</strong>！",
        action: "manual-click",
        tab: "retro",
        pad: 6,
        radius: 14
      },
      {
        id: "step-dashboard-charts",
        targetSelector: "#dashboard-view .glass-card:first-child",
        title: "11. 四象限拔尖與關懷分析",
        content: "系統自動畫出「學業 ✕ 常規」四象限圖表，是您段考親師座談的最佳利器！",
        action: "info",
        tab: "dashboard",
        pad: 10,
        radius: 20
      },
      {
        id: "step-finish",
        targetSelector: "#header-version-badge",
        title: "🎉 恭喜通關！戰力全開！",
        content: "您已掌握 ClassQuant Hub 核心操作！隨時可點擊<strong>「📢 頂部版本號」</strong>查看詳細圖文手冊！",
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
    // Cache DOM Node References from static HTML
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
      if (arrowUp) {
        arrowUp.classList.remove('hidden');
        arrowUp.classList.add('tour-bounce-up');
        arrowUp.style.display = 'flex';
        arrowUp.style.transform = `translateX(${layout.arrowOffsetX}px)`;
      }
      if (arrowDown) {
        arrowDown.classList.add('hidden');
        arrowDown.classList.remove('tour-bounce-down');
        arrowDown.style.display = 'none';
      }
      if (arrowLeft) {
        arrowLeft.classList.add('hidden');
        arrowLeft.classList.remove('tour-bounce-left');
        arrowLeft.style.display = 'none';
      }
      if (arrowRight) {
        arrowRight.classList.add('hidden');
        arrowRight.classList.remove('tour-bounce-right');
        arrowRight.style.display = 'none';
      }
    } else if (orientation === 'above') {
      if (arrowUp) {
        arrowUp.classList.add('hidden');
        arrowUp.classList.remove('tour-bounce-up');
        arrowUp.style.display = 'none';
      }
      if (arrowDown) {
        arrowDown.classList.remove('hidden');
        arrowDown.classList.add('tour-bounce-down');
        arrowDown.style.display = 'flex';
        arrowDown.style.transform = `translateX(${layout.arrowOffsetX}px)`;
      }
      if (arrowLeft) {
        arrowLeft.classList.add('hidden');
        arrowLeft.classList.remove('tour-bounce-left');
        arrowLeft.style.display = 'none';
      }
      if (arrowRight) {
        arrowRight.classList.add('hidden');
        arrowRight.classList.remove('tour-bounce-right');
        arrowRight.style.display = 'none';
      }
    } else if (orientation === 'right') {
      if (arrowUp) {
        arrowUp.classList.add('hidden');
        arrowUp.classList.remove('tour-bounce-up');
        arrowUp.style.display = 'none';
      }
      if (arrowDown) {
        arrowDown.classList.add('hidden');
        arrowDown.classList.remove('tour-bounce-down');
        arrowDown.style.display = 'none';
      }
      if (arrowLeft) {
        arrowLeft.classList.remove('hidden');
        arrowLeft.classList.add('tour-bounce-left');
        arrowLeft.style.display = 'inline-block';
      }
      if (arrowRight) {
        arrowRight.classList.add('hidden');
        arrowRight.classList.remove('tour-bounce-right');
        arrowRight.style.display = 'none';
      }
    } else if (orientation === 'left') {
      if (arrowUp) {
        arrowUp.classList.add('hidden');
        arrowUp.classList.remove('tour-bounce-up');
        arrowUp.style.display = 'none';
      }
      if (arrowDown) {
        arrowDown.classList.add('hidden');
        arrowDown.classList.remove('tour-bounce-down');
        arrowDown.style.display = 'none';
      }
      if (arrowLeft) {
        arrowLeft.classList.add('hidden');
        arrowLeft.classList.remove('tour-bounce-left');
        arrowLeft.style.display = 'none';
      }
      if (arrowRight) {
        arrowRight.classList.remove('hidden');
        arrowRight.classList.add('tour-bounce-right');
        arrowRight.style.display = 'inline-block';
      }
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

  safeClosest(el, selector) {
    if (!el) return null;
    try {
      const node = el.nodeType === 3 ? el.parentElement : el;
      if (node && typeof node.closest === 'function') {
        return node.closest(selector);
      }
    } catch (e) {}
    return null;
  }

  async start(fromStep = 0) {
    try {
      this.initDOM();
      this.cleanupListeners();
      this.clearAllTimers();
      this.clearAllAnimations();
      this.isTransitioning = false;
      this.isActive = true;
      this.lastTransitionTime = Date.now();
      this.cancelAutoPlay();
      this.currentStep = Math.max(0, Math.min(this.steps.length - 1, fromStep));
      this.isInitialized = false;

      if (window.appState) {
        window.appState.toggleHeader(true, true);
        window.appState.closeModal();
      }

      // Immediately present the overlay & popover card to guarantee 0ms perceived latency
      const container = document.getElementById('tour-overlay-container');
      if (container) {
        container.classList.remove('hidden');
        container.style.display = 'block';
      }
      const popover = document.getElementById('tour-popover');
      if (popover) {
        popover.classList.remove('hidden');
        popover.style.display = 'block';
        popover.style.opacity = '1';
        popover.style.top = 'auto';
        popover.style.bottom = 'max(14px, 14px)';
      }

      // Immediately populate Step 0 text and Next button
      const step0 = this.steps[this.currentStep];
      const titleEl = document.getElementById('tour-title');
      const contentEl = document.getElementById('tour-content');
      const badgeEl = document.getElementById('tour-step-badge');
      const actionContainer = document.getElementById('tour-action-container');
      if (badgeEl) badgeEl.innerText = `步驟 ${this.currentStep + 1} / ${this.steps.length}`;
      if (titleEl && step0) titleEl.innerHTML = step0.title;
      if (contentEl && step0) contentEl.innerHTML = step0.content;
      if (actionContainer) {
        actionContainer.innerHTML = `
          <div class="flex items-center gap-2 w-full justify-between pt-1">
            <div class="px-2.5 py-1 rounded-xl bg-pink-50 text-pink-700 text-[11px] font-bold border border-pink-200 truncate">
              👆 點發光處或直接點右側 ➔
            </div>
            <button onclick="onboardingTour.nextStep()" class="px-4 py-2 rounded-2xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-xs sm:text-sm shadow-lg border-2 border-white transition flex items-center gap-1 active:scale-95 cursor-pointer shrink-0 animate-bounce ring-2 ring-pink-200">
              <span>下一步 ➔</span>
            </button>
          </div>
        `;
      }

      this.clickBlocker = (e) => {
        if (!this.isActive) return;
        if (this.safeClosest(e.target, '#tour-popover')) return;
        
        if (this.isAutoPlaying) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        const step = this.steps[this.currentStep];
        if (!step) return;

        if (step.action === 'auto-click' || step.action === 'auto-pilot-paste' || step.action === 'auto-pilot-edit') {
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

      this.bindEventListeners();
      this.playAudioFeedback('chime');
      this.startTracking();
      await this.renderStep();
    } catch (err) {
      console.error('[OnboardingTour] start error:', err);
      try {
        await this.renderStep();
      } catch (e) {}
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
      if (step.action === 'info') {
        contentEl.innerHTML = `
          <div class="px-3 py-2 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 font-black text-xs flex items-center justify-between shadow-sm animate-pulse mb-3">
            <span class="flex items-center gap-1.5">
              <span>💡</span>
              <span>此步驟為功能介紹，請點擊下方按鈕繼續</span>
            </span>
            <span class="text-sm">👇</span>
          </div>
          ${step.content}
        `;
      } else {
        contentEl.innerHTML = step.content;
      }

      if (actionContainer) {
        if (step.action === 'auto-pilot-paste') {
          actionContainer.innerHTML = `
            <div class="flex items-center gap-2 w-full justify-between pt-1">
              <button onclick="onboardingTour.executeBatchPasteDemo()" class="px-4 py-2.5 rounded-2xl font-black text-white bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-xs sm:text-sm shadow-xl border-2 border-white transition flex items-center gap-1.5 active:scale-95 animate-bounce ring-4 ring-purple-200 cursor-pointer">
                <span>▶️ 開始自動演示貼上 🪄</span>
              </button>
              <button onclick="onboardingTour.nextStep()" class="px-3.5 py-2 rounded-2xl font-bold text-slate-600 hover:text-slate-900 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 transition cursor-pointer">
                下一步 ➔
              </button>
            </div>
          `;
        } else if (step.action === 'auto-pilot-edit') {
          actionContainer.innerHTML = `
            <div class="flex items-center gap-2 w-full justify-between pt-1">
              <button onclick="onboardingTour.executeNameEditDemo()" class="px-4 py-2.5 rounded-2xl font-black text-white bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-xs sm:text-sm shadow-xl border-2 border-white transition flex items-center gap-1.5 active:scale-95 animate-bounce ring-4 ring-purple-200 cursor-pointer">
                <span>▶️ 開始自動演示改名 🪄</span>
              </button>
              <button onclick="onboardingTour.nextStep()" class="px-3.5 py-2 rounded-2xl font-bold text-slate-600 hover:text-slate-900 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 transition cursor-pointer">
                下一步 ➔
              </button>
            </div>
          `;
        } else if (this.currentStep === this.steps.length - 1) {
          actionContainer.innerHTML = `
            <button onclick="onboardingTour.endTour()" class="w-full py-2.5 rounded-2xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-xs sm:text-sm shadow-xl border-2 border-white transition flex items-center justify-center gap-1.5 active:scale-95 animate-bounce ring-4 ring-pink-200 cursor-pointer">
              <span>✨ 完成新手教學，開始使用！</span>
            </button>
          `;
        } else {
          actionContainer.innerHTML = `
            <div class="flex items-center gap-2 w-full justify-between pt-1">
              <div class="px-2.5 py-1 rounded-xl bg-pink-50 text-pink-700 text-[11px] font-bold border border-pink-200 truncate">
                ${step.action === 'manual-click' || step.action === 'manual-change' ? '👆 點發光處或直接點右側 ➔' : '💡 點擊右側按鈕繼續'}
              </div>
              <button onclick="onboardingTour.nextStep()" class="px-4 py-2 rounded-2xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-xs sm:text-sm shadow-lg border-2 border-white transition flex items-center gap-1 active:scale-95 cursor-pointer shrink-0 animate-bounce ring-2 ring-pink-200">
                <span>下一步 ➔</span>
              </button>
            </div>
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
   * High-Precision Bezier Flight Kinematics
   */
  async flyGhostTo(target, session) {
    if (!target) return;
    const ghost = document.getElementById('tour-ghost-cursor');
    const ghostBody = document.getElementById('tour-ghost-cursor-body');
    const ripple = document.getElementById('tour-ghost-ripple');
    if (!ghost) return;

    const hx = 14;
    const hy = 2.5;

    let startX, startY;
    const ghostRect = ghost.getBoundingClientRect();
    if (ghostRect.width > 0 && ghost.style.opacity === '1') {
      startX = ghostRect.left + hx;
      startY = ghostRect.top + hy;
    } else {
      const popover = document.getElementById('tour-popover');
      if (popover) {
        const pRect = popover.getBoundingClientRect();
        startX = pRect.left + pRect.width / 2;
        startY = pRect.top + pRect.height / 2;
      } else {
        startX = (typeof window !== 'undefined' ? window.innerWidth : 1024) / 2;
        startY = (typeof window !== 'undefined' ? window.innerHeight : 768) * 0.75;
      }
    }

    const targetRect = target.getBoundingClientRect();
    const destX = targetRect.left + targetRect.width / 2;
    const destY = targetRect.top + targetRect.height / 2;

    ghost.classList.remove('hidden');
    ghost.style.display = 'block';
    ghost.style.transition = 'none';
    ghost.style.transform = `translate3d(${startX - hx}px, ${startY - hy}px, 0)`;
    ghost.style.opacity = '1';
    if (ghostBody) ghostBody.classList.remove('ghost-cursor-click');
    if (ripple) {
      ripple.classList.remove('ghost-cursor-ripple');
      ripple.classList.add('hidden');
    }
    ghost.offsetHeight;

    const dx = destX - startX;
    const dy = destY - startY;
    const dist = Math.hypot(dx, dy);
    const mx = (startX + destX) / 2;
    const my = (startY + destY) / 2;
    const arcElevation = Math.max(30, Math.min(110, dist * 0.25));
    const cpX = mx;
    const cpY = my - arcElevation;
    const duration = Math.max(500, Math.min(800, 450 + dist * 0.3));
    const startTime = performance.now();

    const easeInOutCubic = (p) => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

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

        const liveTargetRect = target.getBoundingClientRect();
        const liveDestX = liveTargetRect.left + liveTargetRect.width / 2;
        const liveDestY = liveTargetRect.top + liveTargetRect.height / 2;

        const oneMinusT = 1 - t;
        const curX = oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * cpX + t * t * liveDestX;
        const curY = oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * cpY + t * t * liveDestY;
        const tilt = Math.sin(progress * Math.PI) * (dx < 0 ? -5 : 5);

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

    if (!this.isActive || this.currentSessionId !== session) return;

    if (ghostBody) ghostBody.classList.add('ghost-cursor-click');
    if (ripple) {
      ripple.classList.remove('hidden');
      ripple.classList.add('ghost-cursor-ripple');
    }
    this.playAudioFeedback('pop');
    await this.safeDelay(180, session);
    if (ghostBody) ghostBody.classList.remove('ghost-cursor-click');
  }

  hideGhost() {
    const ghost = document.getElementById('tour-ghost-cursor');
    if (ghost) {
      ghost.style.opacity = '0';
      setTimeout(() => {
        if (!this.isAutoPlaying) {
          ghost.classList.add('hidden');
          ghost.style.display = 'none';
        }
      }, 200);
    }
  }

  /**
   * Deep Auto-Pilot Demo: 1-Click Batch Paste with Simulated Typing
   */
  async executeBatchPasteDemo() {
    if (this.isAutoPlaying) return;
    this.isAutoPlaying = true;
    const session = ++this.currentSessionId;

    const pasteBtn = document.getElementById('roster-paste-btn');
    if (!pasteBtn) {
      this.isAutoPlaying = false;
      return;
    }

    // 1. Fly to #roster-paste-btn and click it
    await this.flyGhostTo(pasteBtn, session);
    if (!this.isActive || this.currentSessionId !== session) return;

    pasteBtn.click();
    await this.safeDelay(500, session);

    // 2. Fly to textarea inside modal
    const textarea = document.getElementById('batch-roster-textarea');
    if (textarea) {
      await this.flyGhostTo(textarea, session);
      if (!this.isActive || this.currentSessionId !== session) return;
      textarea.focus();

      const sampleRoster = "1 王小明\n2 李小華\n3 陳美麗\n4 張建國\n5 林佩佩";
      textarea.value = "";
      for (let i = 0; i < sampleRoster.length; i++) {
        if (!this.isActive || this.currentSessionId !== session) return;
        textarea.value += sampleRoster[i];
        if (i % 3 === 0) this.playAudioFeedback('pop');
        await this.safeDelay(25, session);
      }
    }

    await this.safeDelay(350, session);

    // 3. Fly to submit button and click it
    const submitBtn = document.getElementById('batch-roster-submit-btn');
    if (submitBtn) {
      await this.flyGhostTo(submitBtn, session);
      if (!this.isActive || this.currentSessionId !== session) return;
      submitBtn.click();
    }

    await this.safeDelay(500, session);
    this.hideGhost();
    this.isAutoPlaying = false;
    this.nextStep();
  }

  /**
   * Deep Auto-Pilot Demo: Live Student Name Modification
   */
  async executeNameEditDemo() {
    if (this.isAutoPlaying) return;
    this.isAutoPlaying = true;
    const session = ++this.currentSessionId;

    const input = document.getElementById('roster-student-name-input-1') || document.querySelector('#roster-manager-view input');
    if (!input) {
      this.isAutoPlaying = false;
      return;
    }

    await this.flyGhostTo(input, session);
    if (!this.isActive || this.currentSessionId !== session) return;

    input.focus();
    input.select();
    await this.safeDelay(250, session);

    const newName = "王小明 (幹部)";
    input.value = "";
    for (let i = 0; i < newName.length; i++) {
      if (!this.isActive || this.currentSessionId !== session) return;
      input.value += newName[i];
      this.playAudioFeedback('pop');
      await this.safeDelay(40, session);
    }

    input.dispatchEvent(new Event('change', { bubbles: true }));
    await this.safeDelay(600, session);

    this.hideGhost();
    this.isAutoPlaying = false;
    this.nextStep();
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

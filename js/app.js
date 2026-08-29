/**
 * ClassQuant Hub - Main App Controller
 * Theme Switcher, Native Web Audio Chime Engine, Header Collapsing, PWA Support, Tab Router,
 * and Live Over-The-Air (OTA) Remote Push Update Engine.
 */

class AppState {
  constructor() {
    this.currentClassId = '801';
    this.activeTab = 'matrix';
    this.deferredPrompt = null;
    this.isHeaderCollapsed = false;
    this.audioCtx = null;
    this.appVersion = '1.2.0';
    this.init();
  }

  init() {
    // 1. Initialize Theme
    const currentTheme = window.appStore.getTheme();
    this.applyTheme(currentTheme);

    // 2. Initial Class detection
    const active = window.timetableEngine.getActiveClassId();
    this.currentClassId = active.classId || '801';

    // 3. Listen to Timetable Engine changes
    window.timetableEngine.onClassChange((newClassId, context) => {
      if (newClassId && newClassId !== this.currentClassId) {
        this.currentClassId = newClassId;
        this.showToast(`課表自動感知切換至：${newClassId} 班`, 'info');
      }
      this.updateHeaderStatus();
      this.refreshActiveTab();
    });

    // 4. Setup clock ticker
    setInterval(() => {
      this.updateHeaderClock();
    }, 1000);

    // 5. Setup PWA Install Prompt Listener
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) installBtn.classList.remove('hidden');
    });

    // 6. Network online/offline detection & Auto OTA check
    window.addEventListener('online', () => {
      this.showToast('📶 網路已連線 (正在自動檢查雲端更新...)', 'success');
      this.updateNetworkBadge(true);
      this.checkForUpdates(true);
    });
    window.addEventListener('offline', () => {
      this.showToast('🟢 目前處於離線模式，所有操作自動存於本機', 'info');
      this.updateNetworkBadge(false);
    });

    // Initial render
    this.updateHeaderStatus();
    this.updateHeaderClock();
    this.renderClassDropdown();
    this.updateSoundButtonUI();
    this.switchTab('matrix');

    // Auto check updates on boot if online
    if (navigator.onLine) {
      setTimeout(() => this.checkForUpdates(true), 1500);
    }
  }

  updateNetworkBadge(isOnline) {
    const badge = document.getElementById('header-offline-status');
    if (badge) {
      badge.innerHTML = isOnline 
        ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span class="text-[10px] text-emerald-600 font-bold hidden sm:inline">已連線</span>'
        : '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span><span class="text-[10px] text-slate-500 font-bold hidden sm:inline">離線模式</span>';
    }
  }

  // --- OTA Live Push Update Engine (連網自動推播更新引擎) ---
  async checkForUpdates(silent = true) {
    if (!navigator.onLine) {
      if (!silent) this.showToast('目前處於離線狀態，無法檢查更新', 'info');
      return;
    }

    try {
      const res = await fetch(`./version.json?t=${Date.now()}`);
      if (res.ok) {
        const info = await res.json();
        if (info.version && info.version !== this.appVersion) {
          this.showUpdateModal(info);
        } else if (!silent) {
          this.showToast(`✅ 目前已是最新版本 (v${this.appVersion})`, 'success');
        }
      }
    } catch (e) {
      if (!silent) this.showToast('無法取得更新資訊，請檢查網路連線', 'warning');
    }
  }

  showUpdateModal(info) {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="p-6 text-center">
        <div class="flex justify-center mb-3">
          <div class="sanrio-twinstars-badge !w-16 !h-16"></div>
        </div>
        <h3 class="text-xl sm:text-2xl font-black mb-1 flex items-center justify-center gap-2 text-pink-600">
          🎉 發現全新版本 v${info.version}
          <span class="kitty-bow"></span>
        </h3>
        <p class="text-xs text-slate-600 mb-4 font-medium">發布日期：${info.releaseDate}</p>

        <div class="text-left p-4 rounded-2xl bg-pink-50 border border-pink-200 text-xs text-slate-800 space-y-1.5 mb-5 font-bold">
          <div class="text-pink-900 font-black mb-1">【本次更新內容】：</div>
          ${(info.releaseNotes || []).map(note => `<div>• ${note}</div>`).join('')}
        </div>

        <div class="flex items-center justify-center gap-3">
          <button onclick="appState.applyLiveOTAUpdate()" 
            class="px-6 py-2.5 rounded-2xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 shadow-lg shadow-pink-500/25 transition text-sm flex items-center gap-1.5">
            <i data-lucide="sparkles" class="w-4 h-4"></i> 立即熱更新 (自動套用)
          </button>
          <button onclick="appState.closeModal()" class="px-5 py-2.5 rounded-2xl font-bold border border-pink-300 text-slate-700 hover:bg-pink-50 transition text-sm">
            稍後再說
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  async applyLiveOTAUpdate() {
    this.showToast('🔄 正在為您更新最新代碼並清除舊快取...', 'info');
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let reg of registrations) {
        await reg.update();
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (let k of keys) {
        await caches.delete(k);
      }
    }
    setTimeout(() => {
      window.location.reload(true);
    }, 800);
  }

  // --- Web Audio API Native Sound Engine (零依賴原生合成音效) ---
  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  isSoundEnabled() {
    return window.appStore.data.settings?.enableSound !== false;
  }

  toggleSound() {
    if (!window.appStore.data.settings) window.appStore.data.settings = {};
    const current = this.isSoundEnabled();
    window.appStore.data.settings.enableSound = !current;
    window.appStore.save();
    this.showToast(!current ? '🔔 已開啟可愛操作音效' : '🔕 已靜音操作音效', 'info');
    this.updateSoundButtonUI();
    if (!current) this.playChime();
  }

  updateSoundButtonUI() {
    const btn = document.getElementById('sound-toggle-btn');
    if (btn) {
      const enabled = this.isSoundEnabled();
      btn.innerHTML = enabled
        ? '<i data-lucide="volume-2" class="w-4 h-4 text-pink-600"></i>'
        : '<i data-lucide="volume-x" class="w-4 h-4 text-slate-400"></i>';
      btn.title = enabled ? '音效已開啟 (點擊靜音)' : '音效已關閉 (點擊開啟)';
      if (window.lucide) window.lucide.createIcons();
    }
  }

  playChime() {
    if (!this.isSoundEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Bright pleasant chime)
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.07);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.07);
        osc.stop(ctx.currentTime + i * 0.07 + 0.35);
      });
    } catch (e) {}
  }

  playPop() {
    if (!this.isSoundEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.07);
    } catch (e) {}
  }

  playWarning() {
    if (!this.isSoundEnabled()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.setValueAtTime(280, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } catch (e) {}
  }

  toggleHeader(forceShow = false) {
    const header = document.getElementById('global-header');
    const pill = document.getElementById('header-unhide-pill');
    if (!header) return;

    if (forceShow || header.classList.contains('header-collapsed')) {
      header.classList.remove('header-collapsed');
      if (pill) pill.classList.add('hidden');
      this.isHeaderCollapsed = false;
    } else {
      header.classList.add('header-collapsed');
      if (pill) pill.classList.remove('hidden');
      this.isHeaderCollapsed = true;
      this.showToast('已隱藏頂部橫幅，點擊上方按鈕可隨時展開 🎀', 'info');
    }
  }

  applyTheme(themeName) {
    const html = document.documentElement;
    html.setAttribute('data-theme', themeName);
    if (themeName === 'kitty') {
      html.classList.remove('dark');
    } else {
      html.classList.add('dark');
    }
    window.appStore.setTheme(themeName);
    this.updateThemeButtonUI(themeName);
  }

  toggleTheme() {
    const current = window.appStore.getTheme();
    const next = current === 'kitty' ? 'dark' : 'kitty';
    this.applyTheme(next);
    this.showToast(`已切換至：${next === 'kitty' ? '🎀 三麗鷗 (Kitty & 小雙星) 主題' : '🌙 科技深色主題'}`, 'info');
  }

  updateThemeButtonUI(themeName) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.innerHTML = themeName === 'kitty' 
        ? '<span class="kitty-bow"></span><span class="text-xs font-bold text-pink-600 ml-1">三麗鷗模式</span>' 
        : '<i data-lucide="moon" class="w-4 h-4 text-blue-400"></i><span class="text-xs font-bold text-slate-300 ml-1">科技深色</span>';
      if (window.lucide) window.lucide.createIcons();
    }
  }

  switchTab(tabId) {
    this.activeTab = tabId;

    // Update Nav buttons
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('tab-active');
      } else {
        btn.classList.remove('tab-active');
      }
    });

    // Hide all tab containers
    const tabContainers = [
      'classroom-matrix-view',
      'roster-manager-view',
      'dashboard-view',
      'timetable-editor-view',
      'events-log-view',
      'student-dossier-view',
      'nas-sync-view',
      'ai-hub-view',
      'user-guide-view'
    ];

    tabContainers.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });

    // Show active tab
    const viewIdMap = {
      'matrix': 'classroom-matrix-view',
      'roster': 'roster-manager-view',
      'dashboard': 'dashboard-view',
      'timetable': 'timetable-editor-view',
      'events': 'events-log-view',
      'student-dossier': 'student-dossier-view',
      'nas-sync': 'nas-sync-view',
      'ai-hub': 'ai-hub-view',
      'guide': 'user-guide-view'
    };

    const targetViewId = viewIdMap[tabId];
    const activeEl = document.getElementById(targetViewId);
    if (activeEl) {
      activeEl.classList.remove('hidden');
      this.refreshActiveTab();
    }
  }

  refreshActiveTab() {
    if (this.activeTab === 'matrix') {
      window.matrixView.render('classroom-matrix-view', this.currentClassId);
    } else if (this.activeTab === 'roster') {
      window.rosterManager.render('roster-manager-view');
    } else if (this.activeTab === 'dashboard') {
      window.dashboardCharts.renderClassDashboard('dashboard-view', this.currentClassId);
    } else if (this.activeTab === 'timetable') {
      window.timetableEditorView.render('timetable-editor-view');
    } else if (this.activeTab === 'events') {
      window.eventsLogView.render('events-log-view', this.currentClassId);
    } else if (this.activeTab === 'student-dossier') {
      window.studentDossierView.render('student-dossier-view', this.currentClassId);
    } else if (this.activeTab === 'nas-sync') {
      window.nasSyncHub.render('nas-sync-view');
    } else if (this.activeTab === 'ai-hub') {
      window.aiHub.render('ai-hub-view');
    } else if (this.activeTab === 'guide') {
      window.userGuideView.render('user-guide-view');
    }
  }

  renderClassDropdown() {
    const select = document.getElementById('global-class-select');
    if (!select) return;

    const classes = Object.values(window.appStore.getClasses());
    const homeroomClasses = classes.filter(c => c.type === 'homeroom');
    const subjectClasses = classes.filter(c => c.type !== 'homeroom');

    let html = '';
    if (homeroomClasses.length > 0) {
      html += `<optgroup label="🎀 導師本班 (常規與生活)">`;
      html += homeroomClasses.map(c => `
        <option value="${c.id}" ${this.currentClassId === c.id ? 'selected' : ''}>
          ${c.name} (導師本班)
        </option>
      `).join('');
      html += `</optgroup>`;
    }

    if (subjectClasses.length > 0) {
      html += `<optgroup label="📘 數學科任班 (解題與作業)">`;
      html += subjectClasses.map(c => `
        <option value="${c.id}" ${this.currentClassId === c.id ? 'selected' : ''}>
          ${c.name} (數學科任)
        </option>
      `).join('');
      html += `</optgroup>`;
    }

    select.innerHTML = html;
  }

  handleManualClassChange(classId) {
    this.currentClassId = classId;
    window.timetableEngine.setManualOverride(classId);
    this.showToast(`已切換至：${classId} 班 (手動調課模式)`, 'info');
    this.updateHeaderStatus();
    this.refreshActiveTab();
  }

  restoreTimetableAuto() {
    window.timetableEngine.clearManualOverride();
    const active = window.timetableEngine.getActiveClassId();
    this.currentClassId = active.classId || '801';
    this.showToast('已恢復課表自動感知模式', 'success');
    this.updateHeaderStatus();
    this.renderClassDropdown();
    this.refreshActiveTab();
  }

  updateHeaderStatus() {
    const active = window.timetableEngine.getActiveClassId();
    const slotInfo = active.slotInfo;
    const isOverride = active.isOverride;

    const statusBadge = document.getElementById('header-schedule-status');
    const overrideBtn = document.getElementById('header-override-restore-btn');
    const select = document.getElementById('global-class-select');

    if (select) select.value = this.currentClassId;

    if (statusBadge) {
      if (isOverride) {
        statusBadge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-amber-400"></span>
          <span class="text-amber-600 font-bold">手動調課 (${this.currentClassId}班)</span>
        `;
      } else if (slotInfo.status === 'in_session') {
        statusBadge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-emerald-500 live-indicator"></span>
          <span class="text-emerald-600 font-bold">${slotInfo.message}</span>
        `;
      } else if (slotInfo.status === 'in_break') {
        statusBadge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-sky-500"></span>
          <span class="text-sky-600">${slotInfo.message}</span>
        `;
      } else {
        statusBadge.innerHTML = `
          <span class="w-2 h-2 rounded-full bg-slate-400"></span>
          <span class="opacity-70">${slotInfo.message || '非課堂時段'}</span>
        `;
      }
    }

    if (overrideBtn) {
      if (isOverride) {
        overrideBtn.classList.remove('hidden');
      } else {
        overrideBtn.classList.add('hidden');
      }
    }
  }

  updateHeaderClock() {
    const clockEl = document.getElementById('header-live-clock');
    if (!clockEl) return;

    const { day, timeStr, isSimulated } = window.timetableEngine.getCurrentTimeInfo();
    const dayNames = ['日', '一', '二', '三', '四', '五', '六'];
    
    clockEl.innerHTML = `
      <span>週${dayNames[day]} ${timeStr}</span>
      ${isSimulated ? '<span class="text-[10px] text-amber-500 bg-amber-100 px-1.5 py-0.2 rounded-md font-bold ml-1">模擬中</span>' : ''}
    `;
  }

  // --- PWA Installation Action ---
  async installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        this.showToast('🎉 已成功將 App 安裝至主畫面！', 'success');
      }
      this.deferredPrompt = null;
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) installBtn.classList.add('hidden');
    } else {
      alert('【手機離線安裝教學】\n\n• Android (Chrome)：點選右上角選單 (⋮)，選擇「安裝應用程式」或「新增至主螢幕」。\n• iOS (Safari)：點擊底部「分享 (↑)」按鈕，選擇「加入主畫面 (Add to Home Screen)」。');
    }
  }

  // --- Modal & Toast System ---
  closeModal() {
    const modal = document.getElementById('global-modal');
    if (modal) modal.classList.add('hidden');
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('global-toast');
    if (!toast) return;

    const bgMap = {
      success: 'bg-emerald-600 border-emerald-500 text-white',
      warning: 'bg-amber-600 border-amber-500 text-white',
      danger: 'bg-rose-600 border-rose-500 text-white',
      info: 'bg-pink-600 border-pink-500 text-white'
    };

    toast.className = `fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl border text-xs font-bold shadow-2xl flex items-center gap-2 transition-all transform duration-300 ${bgMap[type] || bgMap.info}`;
    toast.innerHTML = `<span>${message}</span>`;
    toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');

    setTimeout(() => {
      toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
    }, 3200);
  }
}

// Global App State Instance
window.appState = new AppState();

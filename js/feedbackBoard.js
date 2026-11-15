/**
 * ClassQuant Hub - Feedback Board Component (v1.9.6)
 * 互動留言板：使用者意見回饋、功能建議與開發者回覆
 */

class FeedbackBoard {
  constructor(store) {
    this.store = store;
    this.currentFilter = 'all';
    this.feedbacks = [];
    this.storageKey = 'classquant_feedback_list';
    this.deletedStorageKey = 'classquant_feedback_deleted_ids';
    this.webhookStorageKey = 'classquant_feedback_webhook_url';
    this.cloudConfig = null;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.deletedIds = this.loadDeletedIds();
    this._initPromise = this.init();
  }

  loadDeletedIds() {
    try {
      const raw = localStorage.getItem(this.deletedStorageKey);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  markDeletedId(id) {
    if (!id) return;
    if (!this.deletedIds.includes(id)) {
      this.deletedIds.push(id);
      if (this.deletedIds.length > 200) this.deletedIds = this.deletedIds.slice(-200);
      try {
        localStorage.setItem(this.deletedStorageKey, JSON.stringify(this.deletedIds));
      } catch (e) {}
    }
  }

  async init() {
    this.loadFromStorage();
    // Clean up any legacy dummy sample data
    const cleaned = this.feedbacks.filter(f => !f.id || (!f.id.startsWith('fb-welcome-') && !f.id.startsWith('fb-sample-')));
    if (cleaned.length !== this.feedbacks.length) {
      this.feedbacks = cleaned;
      this.saveToStorage();
    }

    await this.loadCloudConfig();

    if (this.feedbacks.length === 0) {
      await this.loadInitialData();
    }

    // Auto-sync in background if online or on local server
    if (navigator.onLine || location.protocol.startsWith('http')) {
      this.syncFeedbacks(true);
    }
  }

  async loadCloudConfig() {
    try {
      const res = await fetch('./data/cloud_config.json?t=' + Date.now());
      if (res.ok) {
        this.cloudConfig = await res.json();
        if (this.cloudConfig && this.cloudConfig.webhookUrl) {
          const localWh = localStorage.getItem(this.webhookStorageKey);
          const remoteVer = Number(this.cloudConfig.configVersion || 1);
          const savedVer = Number(localStorage.getItem('classquant_cloud_config_version') || 0);
          const isCustom = localStorage.getItem('classquant_feedback_webhook_custom') === 'true';
          if (!localWh || localWh.trim().length === 0 || (!isCustom && remoteVer > savedVer)) {
            this.setWebhookUrl(this.cloudConfig.webhookUrl);
            localStorage.setItem('classquant_cloud_config_version', String(remoteVer));
          }
        }
      }
    } catch (e) {
      // Offline or file not found
    }
  }

  loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        this.feedbacks = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to parse local feedback data:', e);
      this.feedbacks = [];
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.feedbacks));
    } catch (e) {
      console.error('Failed to save feedback data:', e);
    }
  }

  async loadInitialData() {
    try {
      const res = await fetch('./data/feedback.json?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Exclude any legacy sample data
          this.feedbacks = data.filter(f => !f.id || (!f.id.startsWith('fb-welcome-') && !f.id.startsWith('fb-sample-')));
          this.saveToStorage();
        }
      }
    } catch (e) {
      console.log('Feedback data load error:', e);
    }
  }

  isDeveloper() {
    return localStorage.getItem('classquant_dev_mode') === 'true';
  }

  toggleDeveloperMode() {
    const currentlyDev = this.isDeveloper();
    if (currentlyDev) {
      localStorage.removeItem('classquant_dev_mode');
      window.appState?.showToast('已退出開發者模式', 'info');
    } else {
      if (!confirm('確定要啟用「開發者模式」（將顯示留言回覆與刪除管理按鈕）嗎？')) return;
      localStorage.setItem('classquant_dev_mode', 'true');
      window.appState?.showToast('已啟用開發者管理模式 🔐', 'success');
    }
    this.render('feedback-board-view');
  }

  getWebhookUrl() {
    return localStorage.getItem(this.webhookStorageKey) || (this.cloudConfig?.webhookUrl || '');
  }

  setWebhookUrl(url) {
    if (url) {
      localStorage.setItem(this.webhookStorageKey, url.trim());
    } else {
      localStorage.removeItem(this.webhookStorageKey);
    }
  }

  // --- Two-Way Feedbacks Synchronization (Local Server + Cloud Google Sheets) ---
  async syncFeedbacks(silent = true) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.updateSyncUIStatus('syncing');

    let remoteItems = [];
    let sourceUsed = '';

    // 1. Try Local Dev Server API (serve.ps1: /api/feedback)
    if (location.protocol.startsWith('http')) {
      try {
        const res = await fetch('./api/feedback?t=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            remoteItems = data;
            sourceUsed = 'local_api';
          }
        }
      } catch (e) {}
    }

    // 2. Try Google Apps Script Cloud Endpoint if Webhook is set and online
    const webhookUrl = this.getWebhookUrl();
    if (webhookUrl && navigator.onLine) {
      try {
        const sep = webhookUrl.includes('?') ? '&' : '?';
        const res = await fetch(`${webhookUrl}${sep}action=get&t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const map = new Map();
            remoteItems.forEach(item => map.set(item.id, item));
            data.forEach(item => map.set(item.id, item));
            remoteItems = Array.from(map.values());
            sourceUsed = 'cloud_api';
          }
        }
      } catch (e) {
        console.log('Cloud Webhook GET error:', e);
      }
    }

    // 3. Fallback to static ./data/feedback.json if nothing fetched and local is empty
    if (remoteItems.length === 0 && this.feedbacks.length === 0) {
      await this.loadInitialData();
    }

    // 4. Merge remoteItems into this.feedbacks
    if (remoteItems.length > 0) {
      const mergedMap = new Map();
      this.feedbacks.forEach(item => {
        if (item && item.id && !this.deletedIds.includes(item.id)) {
          mergedMap.set(item.id, item);
        }
      });
      remoteItems.forEach(rem => {
        if (!rem || !rem.id) return;
        if (rem.deleted || rem.action === 'delete' || this.deletedIds.includes(rem.id)) {
          mergedMap.delete(rem.id);
          return;
        }
        const local = mergedMap.get(rem.id);
        if (!local) {
          mergedMap.set(rem.id, rem);
        } else {
          const remReplyTime = rem.replyTimestamp || '';
          const localReplyTime = local.replyTimestamp || '';
          const shouldTakeRemoteReply = (remReplyTime && remReplyTime > localReplyTime) || (rem.reply && !local.reply && !localReplyTime);
          if (shouldTakeRemoteReply) {
            local.reply = rem.reply || '';
            local.replyAuthor = rem.replyAuthor || '';
            local.replyTimestamp = rem.replyTimestamp || '';
          }
          if ((rem.likes || 0) > (local.likes || 0)) {
            local.likes = rem.likes;
          }
          mergedMap.set(rem.id, local);
        }
      });
      this.feedbacks = Array.from(mergedMap.values());
      this.feedbacks = this.feedbacks.filter(f => !f.id || (!f.id.startsWith('fb-welcome-') && !f.id.startsWith('fb-sample-')));
      this.saveToStorage();

      // If on local server and we have items that server didn't have, push them to /api/feedback
      if (location.protocol.startsWith('http') && this.feedbacks.length > 0) {
        try {
          await fetch('./api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.feedbacks)
          });
        } catch (e) {}
      }
    }

    this.lastSyncTime = new Date();
    this.isSyncing = false;
    this.updateSyncUIStatus('done');
    this.render('feedback-board-view');

    if (!silent) {
      const srcName = sourceUsed === 'cloud_api' ? '雲端 Google 試算表' : (sourceUsed === 'local_api' ? '本機測試伺服器' : '快取');
      window.appState.showToast(`✅ 已從【${srcName}】同步完成 (共 ${this.feedbacks.length} 則)`, 'success');
    }
  }

  // --- Broadcast New or Updated Entry to All Endpoints ---
  async broadcastEntry(entry) {
    // 1. Send to Local Dev Server (serve.ps1 /api/feedback)
    if (location.protocol.startsWith('http')) {
      try {
        await fetch('./api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
      } catch (e) {
        console.log('Local API broadcast error:', e);
      }
    }

    // 2. Send to Google Apps Script Webhook
    const webhookUrl = this.getWebhookUrl();
    if (webhookUrl && navigator.onLine) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
      } catch (e) {
        console.log('Cloud Webhook broadcast error:', e);
      }
    }
  }

  updateSyncUIStatus(state) {
    const el = document.getElementById('fb-sync-status-badge');
    if (!el) return;
    const isOAA = (window.appStore ? window.appStore.getTheme() : 'kitty') === 'oaa';
    const webhookUrl = this.getWebhookUrl();
    if (state === 'syncing') {
      el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span><span class="${isOAA ? 'text-amber-300' : 'text-amber-500'} font-bold text-[11px]">同步中...</span>`;
    } else if (webhookUrl) {
      el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span class="${isOAA ? 'text-emerald-300' : 'text-emerald-700'} text-[11px] font-bold">雲端已連線</span>`;
    } else {
      el.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span><span class="${isOAA ? 'text-slate-300' : 'text-slate-500'} text-[11px] font-medium">本機模式</span>`;
    }
  }

  // --- Render Main View ---
  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Filter items
    let items = [...this.feedbacks];
    if (this.currentFilter === 'replied') {
      items = items.filter(f => f.reply && f.reply.trim().length > 0);
    } else if (this.currentFilter !== 'all') {
      items = items.filter(f => f.category === this.currentFilter);
    }

    // Sort by latest first
    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const isDev = this.isDeveloper();
    const totalCount = this.feedbacks.length;
    const repliedCount = this.feedbacks.filter(f => f.reply && f.reply.trim().length > 0).length;
    const isOAA = (window.appStore ? window.appStore.getTheme() : 'kitty') === 'oaa';

    container.innerHTML = `
      <!-- Top Title Banner -->
      <div class="glass-card rounded-3xl p-4 sm:p-6 mb-5 ${isOAA ? 'border-2 border-amber-500/50 bg-[#240e1b]/95 text-white' : 'border border-pink-200 bg-white'} shadow-sm">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div class="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0 flex-1">
            ${isOAA ? `
              <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-rose-950 border-2 border-amber-400 shadow-md flex items-center justify-center text-xl sm:text-2xl shrink-0 self-start sm:self-auto">
                🏛️
              </div>
            ` : `
              <div class="sanrio-twinstars-badge !w-10 !h-10 sm:!w-12 sm:!h-12 shrink-0 self-start sm:self-auto"></div>
            `}
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-lg sm:text-2xl font-black ${isOAA ? 'text-white' : 'text-slate-900'} flex flex-wrap items-center gap-2">
                  <span>${isOAA ? '🏛️ S-SYSTEM // 師生意見聯絡終端' : '💬 互動留言板'}</span>
                  ${isOAA ? '' : '<span class="kitty-bow shrink-0"></span>'}
                </h2>
                <span class="px-2.5 py-0.5 rounded-full ${isOAA ? 'bg-rose-950/80 text-amber-200 border-amber-500/40' : 'bg-slate-100 text-slate-700 border-slate-300'} text-xs font-bold border shadow-sm inline-flex items-center gap-1 font-mono whitespace-nowrap shrink-0">
                  <span>共 ${totalCount} 則</span>
                  <span>•</span>
                  <span>已回覆 ${repliedCount} 則</span>
                </span>
                ${isDev ? `
                  <span class="px-2.5 py-0.5 rounded-full ${isOAA ? 'bg-amber-950 text-amber-300 border-amber-500' : 'bg-purple-100 text-purple-800 border-purple-300'} text-xs font-bold border shadow-sm inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                    <span>開發者模式</span>
                  </span>
                ` : ''}
              </div>
              <p class="text-xs sm:text-sm ${isOAA ? 'text-slate-300' : 'text-slate-600'} font-medium mt-1">
                ${isOAA ? '高度育成 S-SYSTEM 意見與需求回饋終端。開發者將在此檢視並進行特例反饋。' : '提供使用者回饋意見、提出功能需求或回報問題。開發者可在此檢視並回覆。'}
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <div id="fb-sync-status-badge" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full ${isOAA ? 'bg-[#180712] border border-amber-500/30' : 'bg-slate-100 border border-slate-200'}">
              <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              <span class="${isOAA ? 'text-slate-300' : 'text-slate-500'} text-[11px] font-medium">本機模式</span>
            </div>
            <button onclick="feedbackBoard.openPostModal()" class="px-4 py-2.5 rounded-2xl ${isOAA ? 'bg-gradient-to-r from-rose-900 to-rose-800 hover:from-rose-800 hover:to-rose-700 text-amber-200 border border-amber-500/70' : 'bg-pink-600 hover:bg-pink-700 text-white'} text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
              <span>✍️ 新增留言</span>
            </button>
            <button onclick="feedbackBoard.syncFeedbacks(false)" class="px-3 py-2 rounded-xl ${isOAA ? 'bg-[#1b0a14] hover:bg-rose-950 text-amber-200 border border-amber-500/40' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'} text-xs font-bold flex items-center gap-1 transition active:scale-95 shadow-sm cursor-pointer" title="雙向同步">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5 ${this.isSyncing ? 'animate-spin' : ''}"></i>
              <span class="hidden sm:inline">雙向同步</span>
            </button>
            <button onclick="feedbackBoard.copyAllForDev()" class="px-3 py-2 rounded-xl ${isOAA ? 'bg-[#1b0a14] hover:bg-rose-950 text-amber-200 border border-amber-500/40' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'} text-xs font-bold flex items-center gap-1 transition active:scale-95 shadow-sm cursor-pointer" title="複製留言清單">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              <span class="hidden sm:inline">複製清單</span>
            </button>
            <button onclick="feedbackBoard.toggleDeveloperMode()" class="px-2.5 py-2 rounded-xl ${isDev ? (isOAA ? 'bg-amber-600 text-[#1a0713] border border-amber-300' : 'bg-purple-600 text-white border border-purple-700') : (isOAA ? 'bg-[#1b0a14] hover:bg-rose-950 text-amber-200 border border-amber-500/40' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200')} text-xs font-bold flex items-center gap-1 transition active:scale-95 shadow-sm cursor-pointer" title="切換開發者管理權限">
              <i data-lucide="${isDev ? 'unlock' : 'lock'}" class="w-3.5 h-3.5"></i>
              <span class="hidden sm:inline">${isDev ? '開發者 ON' : '開發者'}</span>
            </button>
            <button onclick="feedbackBoard.openSyncSettingsModal()" class="px-2.5 py-2 rounded-xl ${isOAA ? 'bg-[#1b0a14] hover:bg-rose-950 text-amber-200 border border-amber-500/40' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'} text-xs font-bold flex items-center gap-1 transition active:scale-95 shadow-sm cursor-pointer" title="雲端設定">
              <i data-lucide="settings" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="flex items-center space-x-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        ${this.renderFilterButton('all', '全部', 'list')}
        ${this.renderFilterButton('feature', '功能建議', 'lightbulb')}
        ${this.renderFilterButton('feedback', '使用心得', 'message-square')}
        ${this.renderFilterButton('bug', '問題回報', 'alert-circle')}
        ${this.renderFilterButton('replied', '已回覆', 'check-circle')}
      </div>

      <!-- Feedbacks List -->
      <div class="space-y-3.5">
        ${items.length === 0 ? `
          <div class="glass-card rounded-3xl p-8 text-center ${isOAA ? 'border-2 border-amber-500/40 bg-[#240e1b] text-white' : 'border border-pink-200 bg-white'} shadow-sm">
            <div class="w-12 h-12 mx-auto mb-2 ${isOAA ? 'bg-rose-950 text-amber-300' : 'bg-slate-100 text-slate-500'} rounded-full flex items-center justify-center text-xl">
              💬
            </div>
            <h3 class="text-sm font-bold ${isOAA ? 'text-white' : 'text-slate-700'} mb-1">目前尚無留言</h3>
            <p class="text-xs ${isOAA ? 'text-slate-300' : 'text-slate-500'} mb-3 font-medium">如有任何需求或問題，歡迎點擊下方按鈕新增留言。</p>
            <button onclick="feedbackBoard.openPostModal()" class="px-3.5 py-2 rounded-xl ${isOAA ? 'bg-gradient-to-r from-rose-900 to-rose-800 text-amber-200 border border-amber-500/60' : 'bg-pink-600 text-white'} text-xs font-bold transition shadow-sm cursor-pointer">
              新增留言
            </button>
          </div>
        ` : items.map(item => this.renderFeedbackCard(item, isDev)).join('')}
      </div>
    `;

    this.updateSyncUIStatus(this.isSyncing ? 'syncing' : (this.lastSyncTime ? 'done' : 'idle'));
    if (window.lucide) window.lucide.createIcons();
  }

  renderFilterButton(filterId, label, icon) {
    const isOAA = (window.appStore ? window.appStore.getTheme() : 'kitty') === 'oaa';
    const isActive = this.currentFilter === filterId;
    
    let btnStyle = '';
    if (isOAA) {
      btnStyle = isActive 
        ? 'bg-rose-900 text-amber-200 border-2 border-amber-400 shadow-md font-black' 
        : 'bg-[#230916] hover:bg-[#340f22] text-slate-200 border border-amber-500/40 font-bold';
    } else {
      btnStyle = isActive 
        ? 'bg-slate-800 text-white font-bold' 
        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200';
    }

    return `
      <button onclick="feedbackBoard.setFilter('${filterId}')" class="px-3.5 py-1.5 rounded-full text-xs transition flex items-center gap-1.5 whitespace-nowrap shadow-sm cursor-pointer ${btnStyle}">
        <i data-lucide="${icon}" class="w-3.5 h-3.5"></i>
        <span>${label}</span>
      </button>
    `;
  }

  setFilter(filterId) {
    this.currentFilter = filterId;
    this.render('feedback-board-view');
  }

  // --- Render Single Feedback Card ---
  renderFeedbackCard(item, isDev) {
    const isOAA = (window.appStore ? window.appStore.getTheme() : 'kitty') === 'oaa';

    const categoryConfig = isOAA ? ({
      feature: { bg: 'bg-[#3b1704] text-[#fde047] border border-[#f59e0b]', label: '功能建議' },
      feedback: { bg: 'bg-[#062217] text-[#6ee7b7] border border-[#10b981]', label: '使用心得' },
      bug: { bg: 'bg-[#3f0a10] text-[#fca5a5] border border-[#ef4444]', label: '問題回報' },
      other: { bg: 'bg-[#1e293b] text-[#cbd5e1] border border-[#64748b]', label: '其他' }
    }[item.category] || { bg: 'bg-[#1e293b] text-[#cbd5e1] border border-[#64748b]', label: '其他' }) : ({
      feature: { bg: 'bg-amber-50 text-amber-800 border-amber-200', label: '功能建議' },
      feedback: { bg: 'bg-blue-50 text-blue-800 border-blue-200', label: '使用心得' },
      bug: { bg: 'bg-rose-50 text-rose-800 border-rose-200', label: '問題回報' },
      other: { bg: 'bg-slate-50 text-slate-800 border-slate-200', label: '其他' }
    }[item.category] || { bg: 'bg-slate-50 text-slate-800 border-slate-200', label: '其他' });

    const formattedDate = this.formatDate(item.timestamp);
    const hasReply = item.reply && item.reply.trim().length > 0;

    return `
      <div class="glass-card rounded-2xl p-4 sm:p-5 ${isOAA ? 'border-1.5 border-amber-500/35 bg-[#240e1b] text-white' : 'border border-slate-200 bg-white'} shadow-sm hover:shadow transition">
        <!-- Card Header -->
        <div class="flex items-start justify-between gap-3 mb-2.5">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-bold ${isOAA ? 'text-white' : 'text-slate-900'} text-sm">${this.escapeHtml(item.author || '訪客')}</span>
              <span class="px-2 py-0.5 rounded text-[11px] font-bold ${categoryConfig.bg} border">
                ${categoryConfig.label}
              </span>
              ${item.role ? `
                <span class="px-2 py-0.5 rounded text-[11px] font-medium ${isOAA ? 'bg-[#160711] text-amber-300 border border-amber-500/40' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
                  ${this.escapeHtml(item.role)}
                </span>
              ` : ''}
            </div>
            <div class="text-[11px] ${isOAA ? 'text-amber-200/60' : 'text-slate-400'} font-mono mt-0.5">
              ${formattedDate}
            </div>
          </div>

          <!-- Like / Dev Action -->
          <div class="flex items-center space-x-1.5 shrink-0">
            <button onclick="feedbackBoard.toggleLike('${item.id}')" class="px-2 py-1 rounded-lg ${isOAA ? 'bg-[#180712] hover:bg-rose-950 text-amber-200 border border-amber-500/40' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'} text-xs font-medium transition flex items-center gap-1 active:scale-95 shadow-sm cursor-pointer" title="表示贊同">
              <span>👍</span>
              <span id="like-count-${item.id}" class="font-bold font-mono">${item.likes || 0}</span>
            </button>
            ${isDev ? `
              <button onclick="feedbackBoard.openReplyModal('${item.id}')" class="px-2.5 py-1 rounded-lg ${isOAA ? 'bg-amber-950 text-amber-300 border border-amber-500' : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'} text-xs font-bold transition flex items-center gap-1 active:scale-95 shadow-sm">
                <i data-lucide="message-square" class="w-3 h-3"></i>
                <span>${hasReply ? '編輯回覆' : '回覆'}</span>
              </button>
              <button onclick="feedbackBoard.deleteFeedback('${item.id}')" class="p-1 rounded-lg hover:bg-rose-50 text-rose-500 transition" title="刪除">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Feedback Content -->
        <div class="text-xs sm:text-sm ${isOAA ? 'text-slate-100' : 'text-slate-800'} leading-relaxed font-normal pl-0.5 mb-2.5 whitespace-pre-wrap">
          ${this.escapeHtml(item.content)}
        </div>

        <!-- Developer Reply Card (if any) -->
        ${hasReply ? `
          <div class="mt-2.5 p-3 rounded-xl border ${isOAA ? 'border-amber-500/40 bg-[#160610] text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-800'} relative">
            <div class="flex items-center justify-between gap-2 mb-1">
              <div class="flex items-center space-x-1.5">
                <span class="text-xs font-bold ${isOAA ? 'text-amber-300' : 'text-slate-900'}">
                  ${isOAA ? '🏛️ 高度育成開發者回覆 (鑫吾)' : '開發者回覆 (鑫吾)'}
                </span>
              </div>
              <span class="text-[10px] ${isOAA ? 'text-amber-200/60' : 'text-slate-400'} font-mono">
                ${this.formatDate(item.replyTimestamp)}
              </span>
            </div>
            <div class="text-xs ${isOAA ? 'text-slate-200' : 'text-slate-700'} leading-relaxed whitespace-pre-wrap">
              ${this.escapeHtml(item.reply)}
            </div>
          </div>
        ` : (isDev ? `
          <div class="mt-1 text-right">
            <button onclick="feedbackBoard.openReplyModal('${item.id}')" class="text-xs ${isOAA ? 'text-amber-400 hover:text-amber-300' : 'text-purple-600 hover:text-purple-800'} underline transition inline-flex items-center gap-1">
              <span>回覆此則留言</span>
            </button>
          </div>
        ` : '')}
      </div>
    `;
  }

  // --- Like Action ---
  async toggleLike(id) {
    const item = this.feedbacks.find(f => f.id === id);
    if (!item) return;

    item.likes = (item.likes || 0) + 1;
    this.saveToStorage();

    const el = document.getElementById(`like-count-${id}`);
    if (el) el.innerText = item.likes;

    window.appState.showToast('已記錄。', 'info');
    await this.broadcastEntry(item);
  }

  // --- Open Post Feedback Modal ---
  openPostModal() {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const isOAA = (window.appStore ? window.appStore.getTheme() : 'kitty') === 'oaa';
    const savedAuthor = localStorage.getItem('classquant_feedback_author') || '';
    const savedRole = localStorage.getItem('classquant_feedback_role') || '導師';

    modalContent.innerHTML = `
      <div class="p-5 sm:p-6 animate-fade-in-up ${isOAA ? 'text-white' : ''}">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 mb-4 border-b ${isOAA ? 'border-amber-500/40' : 'border-slate-200'}">
          <div>
            <h3 class="font-bold ${isOAA ? 'text-white' : 'text-slate-900'} text-base">
              ${isOAA ? '🏛️ S-SYSTEM // 新增意見提案' : '新增留言'}
            </h3>
            <p class="text-xs ${isOAA ? 'text-amber-300/80 font-mono' : 'text-slate-500'}">
              ${isOAA ? '向高度育成系統提交功能需求、異常回報或考評意見。' : '提出功能建議、回報問題或使用意見。'}
            </p>
          </div>
          <button onclick="appState.closeModal()" class="w-7 h-7 rounded-full ${isOAA ? 'bg-rose-950 text-amber-200 border border-amber-500/40 hover:bg-rose-900' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'} flex items-center justify-center transition cursor-pointer">
            ✕
          </button>
        </div>

        <form id="feedback-post-form" onsubmit="event.preventDefault(); feedbackBoard.submitFeedback();" class="space-y-3.5">
          <!-- Row 1: Author & Role -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">暱稱 / 稱謂 *</label>
              <input type="text" id="fb-author-input" value="${this.escapeHtml(savedAuthor)}" placeholder="例如：數學老師、801導師" class="w-full ${isOAA ? 'bg-[#180712] border-amber-500/50 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'} border rounded-xl px-3 py-2 text-xs focus:outline-none" required>
            </div>
            <div>
              <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">角色身份</label>
              <select id="fb-role-select" class="w-full ${isOAA ? 'bg-[#180712] border-amber-500/50 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'} border rounded-xl px-3 py-2 text-xs focus:outline-none">
                <option value="導師" ${savedRole === '導師' ? 'selected' : ''}>班級導師</option>
                <option value="科任老師" ${savedRole === '科任老師' ? 'selected' : ''}>科任老師</option>
                <option value="親友" ${savedRole === '親友' ? 'selected' : ''}>親友</option>
                <option value="其他" ${savedRole === '其他' ? 'selected' : ''}>其他</option>
              </select>
            </div>
          </div>

          <!-- Row 2: Category -->
          <div>
            <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">類別</label>
            <select id="fb-category-select" class="w-full ${isOAA ? 'bg-[#180712] border-amber-500/50 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'} border rounded-xl px-3 py-2 text-xs focus:outline-none">
              <option value="feature">功能建議</option>
              <option value="feedback">使用心得</option>
              <option value="bug">問題回報</option>
              <option value="other">其他</option>
            </select>
          </div>

          <!-- Row 3: Content -->
          <div>
            <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">留言內容 *</label>
            <textarea id="fb-content-input" rows="4" placeholder="請輸入您的建議、問題或回饋內容..." class="w-full ${isOAA ? 'bg-[#180712] border-amber-500/50 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'} border rounded-xl p-3 text-xs focus:outline-none leading-relaxed" required></textarea>
          </div>

          <!-- Submit Buttons -->
          <div class="flex items-center justify-end space-x-2 pt-2 border-t ${isOAA ? 'border-amber-500/30' : 'border-slate-100'}">
            <button type="button" onclick="appState.closeModal()" class="px-3.5 py-2 rounded-xl ${isOAA ? 'text-slate-300 hover:bg-rose-950/60' : 'text-slate-600 hover:bg-slate-100'} text-xs font-medium transition cursor-pointer">
              取消
            </button>
            <button type="submit" id="fb-submit-btn" class="px-4 py-2 rounded-xl ${isOAA ? 'bg-gradient-to-r from-rose-900 to-rose-800 hover:from-rose-800 hover:to-rose-700 text-amber-200 border border-amber-500 font-black' : 'bg-slate-900 hover:bg-slate-800 text-white font-bold'} text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer">
              <i data-lucide="send" class="w-3.5 h-3.5"></i>
              <span>送出提案</span>
            </button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => document.getElementById('fb-content-input')?.focus(), 100);
  }

  // --- Submit Feedback ---
  async submitFeedback() {
    const author = document.getElementById('fb-author-input')?.value.trim();
    const role = document.getElementById('fb-role-select')?.value;
    const category = document.getElementById('fb-category-select')?.value;
    const content = document.getElementById('fb-content-input')?.value.trim();

    if (!author || !content) {
      window.appState.showToast('請填寫暱稱與留言內容', 'danger');
      return;
    }

    localStorage.setItem('classquant_feedback_author', author);
    localStorage.setItem('classquant_feedback_role', role);

    const submitBtn = document.getElementById('fb-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `送出中...`;
    }

    const newEntry = {
      id: `fb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      author,
      role,
      category,
      content,
      likes: 0,
      reply: "",
      replyAuthor: "",
      replyTimestamp: ""
    };

    this.feedbacks.unshift(newEntry);
    this.saveToStorage();

    // Broadcast new feedback to local dev server and cloud Google Sheets
    await this.broadcastEntry(newEntry);

    window.appState.closeModal();
    this.render('feedback-board-view');
    window.appState.showToast('已送出留言。', 'success');
  }

  // --- Open Developer Reply Modal ---
  openReplyModal(feedbackId) {
    const item = this.feedbacks.find(f => f.id === feedbackId);
    if (!item) return;

    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const isOAA = (window.appStore ? window.appStore.getTheme() : 'kitty') === 'oaa';

    modalContent.innerHTML = `
      <div class="p-5 sm:p-6 animate-fade-in-up ${isOAA ? 'text-white' : ''}">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 mb-4 border-b ${isOAA ? 'border-amber-500/40' : 'border-slate-200'}">
          <div>
            <h3 class="font-bold ${isOAA ? 'text-white' : 'text-slate-900'} text-base">
              ${isOAA ? '🏛️ S-SYSTEM // 開發者回覆' : '回覆留言'}
            </h3>
            <p class="text-xs ${isOAA ? 'text-amber-300/80 font-mono' : 'text-slate-500'}">回覆將直接顯示於該留言下方。</p>
          </div>
          <button onclick="appState.closeModal()" class="w-7 h-7 rounded-full ${isOAA ? 'bg-rose-950 text-amber-200 border border-amber-500/40 hover:bg-rose-900' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'} flex items-center justify-center transition cursor-pointer">
            ✕
          </button>
        </div>

        <!-- Target Feedback Preview -->
        <div class="p-3 rounded-xl ${isOAA ? 'bg-[#180712] border border-amber-500/40 text-slate-200' : 'bg-slate-50 border border-slate-200 text-slate-700'} mb-3.5">
          <div class="font-bold ${isOAA ? 'text-white' : 'text-slate-900'} mb-1 flex items-center gap-1.5">
            <span>${this.escapeHtml(item.author)} (${this.escapeHtml(item.role || '訪客')})</span>
            <span class="text-[10px] ${isOAA ? 'text-amber-200/60' : 'text-slate-400'} font-mono">${this.formatDate(item.timestamp)}</span>
          </div>
          <div class="font-normal whitespace-pre-wrap pl-1 border-l-2 ${isOAA ? 'border-amber-500/60' : 'border-slate-300'}">${this.escapeHtml(item.content)}</div>
        </div>

        <!-- Reply Input -->
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'} mb-1">回覆內容 *</label>
            <textarea id="dev-reply-input" rows="4" placeholder="請輸入回覆內容..." class="w-full ${isOAA ? 'bg-[#180712] border-amber-500/50 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'} border rounded-xl p-3 text-xs focus:outline-none leading-relaxed">${this.escapeHtml(item.reply || '')}</textarea>
          </div>

          <div class="flex items-center justify-between pt-2 border-t ${isOAA ? 'border-amber-500/30' : 'border-slate-100'}">
            ${item.reply ? `
              <button type="button" onclick="feedbackBoard.deleteReply('${item.id}')" class="px-3 py-1.5 rounded-xl text-rose-500 hover:bg-rose-950/60 text-xs font-medium transition cursor-pointer">
                清空回覆
              </button>
            ` : '<div></div>'}
            <div class="flex items-center space-x-2">
              <button type="button" onclick="appState.closeModal()" class="px-3.5 py-2 rounded-xl ${isOAA ? 'text-slate-300 hover:bg-rose-950/60' : 'text-slate-600 hover:bg-slate-100'} text-xs font-medium transition cursor-pointer">
                取消
              </button>
              <button type="button" onclick="feedbackBoard.saveReply('${item.id}')" class="px-4 py-2 rounded-xl ${isOAA ? 'bg-gradient-to-r from-rose-900 to-rose-800 hover:from-rose-800 hover:to-rose-700 text-amber-200 border border-amber-500 font-black' : 'bg-slate-900 hover:bg-slate-800 text-white font-bold'} text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer">
                <i data-lucide="check" class="w-3.5 h-3.5"></i>
                <span>儲存回覆</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => document.getElementById('dev-reply-input')?.focus(), 100);
  }

  // --- Save Developer Reply ---
  async saveReply(id) {
    const replyText = document.getElementById('dev-reply-input')?.value.trim();
    if (!replyText) {
      window.appState.showToast('請輸入回覆內容', 'danger');
      return;
    }

    const item = this.feedbacks.find(f => f.id === id);
    if (!item) return;

    item.reply = replyText;
    item.replyAuthor = "鑫吾";
    item.replyTimestamp = new Date().toISOString();
    this.saveToStorage();

    // Broadcast updated reply to local dev server and cloud Google Sheets
    await this.broadcastEntry(item);

    window.appState.closeModal();
    this.render('feedback-board-view');
    window.appState.showToast('已儲存回覆並同步。', 'success');
  }

  // --- Delete Developer Reply ---
  async deleteReply(id) {
    const item = this.feedbacks.find(f => f.id === id);
    if (!item) return;

    item.reply = "";
    item.replyAuthor = "";
    item.replyTimestamp = new Date().toISOString();
    this.saveToStorage();

    await this.broadcastEntry(item);

    window.appState.closeModal();
    this.render('feedback-board-view');
    window.appState.showToast('已清除回覆。', 'info');
  }

  // --- Delete Feedback Card ---
  async deleteFeedback(id) {
    if (!confirm('確定刪除此則留言？')) return;
    this.markDeletedId(id);
    this.feedbacks = this.feedbacks.filter(f => f.id !== id);
    this.saveToStorage();
    this.render('feedback-board-view');
    await this.broadcastEntry({ id, action: 'delete' });
    window.appState.showToast('已刪除留言並同步移除。', 'info');
  }

  // --- Copy All Feedback Summary for Dev Planning ---
  copyAllForDev() {
    if (this.feedbacks.length === 0) {
      window.appState.showToast('目前尚無留言資料', 'info');
      return;
    }

    let report = `【ClassQuant 互動留言板】\n時間：${new Date().toLocaleString()}\n共 ${this.feedbacks.length} 則：\n\n`;

    this.feedbacks.forEach((f, idx) => {
      report += `[${idx + 1}] [${f.category}] ${f.author} (${f.role || '訪客'})\n`;
      report += `時間：${this.formatDate(f.timestamp)} | 讚：${f.likes || 0}\n`;
      report += `內容：\n${f.content}\n`;
      if (f.reply) {
        report += `↳ 開發者回覆：${f.reply} (${this.formatDate(f.replyTimestamp)})\n`;
      }
      report += `------------------------------------\n`;
    });

    if (window.copyTextSafe) {
      window.copyTextSafe(report, '已複製留言清單。');
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(report).then(() => {
        window.appState.showToast('已複製留言清單。', 'success');
      }).catch(() => {
        this.fallbackCopyText(report);
      });
    } else {
      this.fallbackCopyText(report);
    }
  }

  fallbackCopyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    window.appState.showToast('已複製留言清單。', 'success');
  }

  // --- Open Sync Settings Modal ---
  openSyncSettingsModal() {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const isOAA = (window.appStore ? window.appStore.getTheme() : 'kitty') === 'oaa';
    const currentWebhook = this.getWebhookUrl();

    modalContent.innerHTML = `
      <div class="p-5 sm:p-6 animate-fade-in-up ${isOAA ? 'text-white' : ''}">
        <div class="flex items-center justify-between pb-3 mb-4 border-b ${isOAA ? 'border-amber-500/40' : 'border-slate-200'}">
          <div>
            <h3 class="font-bold ${isOAA ? 'text-white' : 'text-slate-900'} text-base">
              ${isOAA ? '🏛️ S-SYSTEM // 雲端同步與試算表設定' : '☁️ 雲端同步與試算表設定'}
            </h3>
            <p class="text-xs ${isOAA ? 'text-amber-300/80 font-mono' : 'text-slate-500'}">
              支援本機 Dev 伺服器即時寫入與 Google 試算表 (Google Sheets) 雲端雙向串接。
            </p>
          </div>
          <button onclick="appState.closeModal()" class="w-7 h-7 rounded-full ${isOAA ? 'bg-rose-950 text-amber-200 border border-amber-500/40 hover:bg-rose-900' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'} flex items-center justify-center transition cursor-pointer">
            ✕
          </button>
        </div>

        <div class="space-y-4 text-xs ${isOAA ? 'text-slate-200' : 'text-slate-700'}">
          <!-- Channel 1: Local Dev Server status -->
          <div class="p-3 rounded-xl border ${isOAA ? 'border-amber-500/30 bg-[#160610]' : 'border-slate-200 bg-slate-50'} flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <span class="text-base">💻</span>
              <div>
                <div class="font-bold ${isOAA ? 'text-white' : 'text-slate-900'}">本機測試伺服器 (Local Dev Server)</div>
                <div class="text-[11px] ${isOAA ? 'text-slate-400' : 'text-slate-500'}">手機在同一 Wi-Fi 下連線測試，留言即時寫入 data/feedback.json</div>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded text-[11px] font-bold ${location.protocol.startsWith('http') ? (isOAA ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' : 'bg-emerald-100 text-emerald-800') : (isOAA ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600')}">
              ${location.protocol.startsWith('http') ? '已就緒' : '離線/靜態'}
            </span>
          </div>

          <!-- Channel 2: Google Apps Script Webhook -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold ${isOAA ? 'text-amber-200' : 'text-slate-700'}">Google Apps Script Web App 網址</label>
              <button type="button" onclick="feedbackBoard.copyAppsScriptTemplate()" class="text-[11px] ${isOAA ? 'text-amber-300 hover:text-amber-200' : 'text-blue-600 hover:text-blue-800'} font-bold flex items-center gap-1 cursor-pointer">
                <i data-lucide="code" class="w-3 h-3"></i> 一鍵複製 Apps Script 代碼
              </button>
            </div>
            <input type="url" id="fb-webhook-input" value="${this.escapeHtml(currentWebhook)}" placeholder="https://script.google.com/macros/s/.../exec" class="w-full ${isOAA ? 'bg-[#180712] border-amber-500/50 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-slate-500'} border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none">
            
            <div class="flex items-center justify-between mt-1.5">
              <div id="fb-test-conn-status" class="text-[11px] font-medium"></div>
              <button type="button" onclick="feedbackBoard.testWebhookConnection()" class="px-2.5 py-1 rounded-lg ${isOAA ? 'bg-[#180712] hover:bg-rose-950 text-amber-200 border border-amber-500/40' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'} text-[11px] font-bold transition flex items-center gap-1 cursor-pointer">
                <i data-lucide="zap" class="w-3 h-3"></i> 測試連線
              </button>
            </div>
          </div>

          <div class="p-2.5 rounded-xl ${isOAA ? 'bg-[#1b0815] text-amber-200/80 border border-amber-500/20' : 'bg-amber-50 text-amber-900 border border-amber-200'} text-[11px] leading-relaxed">
            💡 <strong>貼心提示</strong>：若您已於 Google 試算表部署好 Apps Script，只需貼上網址並儲存，手機無論在哪個網路環境都能即時雙向同步！
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t ${isOAA ? 'border-amber-500/30' : 'border-slate-100'}">
            <div class="flex items-center gap-1.5">
              <button type="button" onclick="feedbackBoard.exportBackupJson()" class="px-3 py-1.5 rounded-xl ${isOAA ? 'bg-[#180712] text-amber-200 border border-amber-500/40 hover:bg-rose-950' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'} font-medium transition flex items-center gap-1 cursor-pointer">
                <i data-lucide="download" class="w-3.5 h-3.5"></i> 匯出 JSON
              </button>
              <button type="button" onclick="document.getElementById('fb-import-file-input')?.click()" class="px-3 py-1.5 rounded-xl ${isOAA ? 'bg-[#180712] text-emerald-300 border border-emerald-500/40 hover:bg-emerald-950/60' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'} font-bold transition flex items-center gap-1 cursor-pointer">
                <i data-lucide="upload" class="w-3.5 h-3.5"></i> 匯入/遷移 JSON
              </button>
              <input type="file" id="fb-import-file-input" accept=".json" class="hidden" onchange="feedbackBoard.importAndMigrateJson(this)">
            </div>
            <div class="flex items-center space-x-2">
              <button type="button" onclick="appState.closeModal()" class="px-3 py-1.5 rounded-xl ${isOAA ? 'text-slate-300 hover:bg-rose-950/60' : 'text-slate-600 hover:bg-slate-100'} font-medium transition cursor-pointer">
                關閉
              </button>
              <button type="button" onclick="feedbackBoard.saveWebhookUrl()" class="px-4 py-2 rounded-xl ${isOAA ? 'bg-gradient-to-r from-rose-900 to-rose-800 hover:from-rose-800 hover:to-rose-700 text-amber-200 border border-amber-500 font-black' : 'bg-slate-900 hover:bg-slate-800 text-white font-bold'} transition shadow-sm cursor-pointer">
                儲存設定
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  async saveWebhookUrl() {
    const input = document.getElementById('fb-webhook-input');
    if (!input) return;
    const url = input.value.trim();
    this.setWebhookUrl(url);
    if (url) {
      localStorage.setItem('classquant_feedback_webhook_custom', 'true');
    } else {
      localStorage.removeItem('classquant_feedback_webhook_custom');
    }

    // Save merged config to local server cloud_config.json if running via http
    if (location.protocol.startsWith('http')) {
      try {
        const nextVer = Math.max(Number(this.cloudConfig?.configVersion || 1), 1) + (url && url !== this.cloudConfig?.webhookUrl ? 1 : 0);
        const mergedPayload = {
          ...(this.cloudConfig || {}),
          configVersion: nextVer,
          webhookUrl: url,
          autoSyncOnLoad: true,
          lastSyncTime: new Date().toISOString()
        };
        await fetch('./api/cloud-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mergedPayload)
        });
        this.cloudConfig = mergedPayload;
        localStorage.setItem('classquant_cloud_config_version', String(nextVer));
      } catch (e) {}
    }

    window.appState.closeModal();
    window.appState.showToast('已儲存設定，開始雙向同步...', 'success');
    await this.syncFeedbacks(false);
  }

  async testWebhookConnection() {
    const input = document.getElementById('fb-webhook-input');
    const statusEl = document.getElementById('fb-test-conn-status');
    const url = input ? input.value.trim() : '';
    if (!url) {
      if (statusEl) statusEl.innerHTML = `<span class="text-rose-500 font-bold">請先輸入網址</span>`;
      return;
    }
    if (statusEl) statusEl.innerHTML = `<span class="text-amber-500 font-bold">連線測試中...</span>`;
    try {
      const sep = url.includes('?') ? '&' : '?';
      const res = await fetch(`${url}${sep}action=get&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          if (statusEl) statusEl.innerHTML = `<span class="text-emerald-500 font-bold">✅ 連線成功 (讀取到 ${data.length} 筆留言)</span>`;
          window.appState.showToast('✅ Google 試算表連線測試成功！', 'success');
          return;
        }
      }
      if (statusEl) statusEl.innerHTML = `<span class="text-amber-500 font-bold">⚠️ 回應非預期格式，請確認權限設為「所有人」</span>`;
    } catch (e) {
      if (statusEl) statusEl.innerHTML = `<span class="text-rose-500 font-bold">❌ 連線失敗 (${e.message})</span>`;
    }
  }

  async copyAppsScriptTemplate() {
    try {
      const res = await fetch('./data/google_apps_script.js?t=' + Date.now());
      if (res.ok) {
        const text = await res.text();
        if (window.copyTextSafe) {
          await window.copyTextSafe(text, '已複製 Google Apps Script 範本程式碼！');
          return;
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          window.appState.showToast('已複製 Google Apps Script 範本程式碼！', 'success');
          return;
        } else {
          this.fallbackCopyText(text);
          return;
        }
      }
    } catch (e) {}
    window.appState.showToast('無法讀取範本檔，請查看 data/google_apps_script.js', 'info');
  }

  exportBackupJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.feedbacks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    const todayStr = window.getLocalDateStr ? window.getLocalDateStr() : new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute("download", `classquant_feedbacks_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    window.appState.showToast('已匯出 JSON 檔。', 'success');
  }

  async importAndMigrateJson(inputEl) {
    const file = inputEl?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        window.appState.showToast('JSON 格式不正確，應為留言陣列 []', 'danger');
        return;
      }
      const existingMap = new Map(this.feedbacks.map(item => [item.id, item]));
      let addedCount = 0;
      const toUpload = [];
      parsed.forEach(item => {
        if (item && item.id && item.content && !existingMap.has(item.id)) {
          existingMap.set(item.id, item);
          toUpload.push(item);
          addedCount++;
        }
      });
      this.feedbacks = Array.from(existingMap.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      this.saveToStorage();
      if (toUpload.length > 0) {
        const webhookUrl = this.getWebhookUrl();
        if (webhookUrl && navigator.onLine) {
          await fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(toUpload)
          });
        }
        if (location.protocol.startsWith('http')) {
          await fetch('./api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(toUpload)
          }).catch(() => {});
        }
      }
      this.render('feedback-board-view');
      window.appState.closeModal();
      window.appState.showToast(`✅ 已成功匯入並遷移 ${addedCount} 筆留言！`, 'success');
    } catch (e) {
      window.appState.showToast(`❌ 匯入失敗：${e.message}`, 'danger');
    } finally {
      if (inputEl) inputEl.value = '';
    }
  }

  async refresh() {
    await this.syncFeedbacks(false);
  }

  // --- Utilities ---
  formatDate(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}/${m}/${day} ${h}:${min}`;
    } catch (e) {
      return isoStr;
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Global initialization
window.FeedbackBoard = FeedbackBoard;
window.feedbackBoard = new FeedbackBoard(window.appStore);

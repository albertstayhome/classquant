/**
 * ClassQuant Hub - Feedback & Interactive Community Board Component (v1.9.5)
 * 師生親友互動板：使用者心得回饋、功能許願池與開發者 (鑫吾) 公開回覆交流
 */

class FeedbackBoard {
  constructor(store) {
    this.store = store;
    this.currentFilter = 'all';
    this.feedbacks = [];
    this.storageKey = 'classquant_feedback_list';
    this.webhookStorageKey = 'classquant_feedback_webhook_url';
    this.init();
  }

  async init() {
    this.loadFromStorage();
    if (this.feedbacks.length === 0) {
      await this.loadInitialData();
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
        if (Array.isArray(data) && data.length > 0) {
          this.feedbacks = data;
          this.saveToStorage();
        }
      }
    } catch (e) {
      console.log('Using default in-memory feedback:', e);
    }
  }

  isDeveloper() {
    return window.aiService && window.aiService.isFamilyAuthorized();
  }

  getWebhookUrl() {
    return localStorage.getItem(this.webhookStorageKey) || '';
  }

  setWebhookUrl(url) {
    if (url) {
      localStorage.setItem(this.webhookStorageKey, url.trim());
    } else {
      localStorage.removeItem(this.webhookStorageKey);
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

    // Sort: Announcements first, then latest first
    items.sort((a, b) => {
      if (a.category === 'announcement' && b.category !== 'announcement') return -1;
      if (b.category === 'announcement' && a.category !== 'announcement') return 1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    const isDev = this.isDeveloper();
    const totalCount = this.feedbacks.length;
    const repliedCount = this.feedbacks.filter(f => f.reply && f.reply.trim().length > 0).length;

    container.innerHTML = `
      <!-- Top Title Banner -->
      <div class="glass-card rounded-3xl p-5 sm:p-6 mb-5 border border-pink-200 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center space-x-3.5">
            <div class="sanrio-twinstars-badge !w-12 !h-12"></div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                  💬 師生親友互動交流板
                  <span class="kitty-bow"></span>
                </h2>
                <span class="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 text-xs font-black border border-pink-300 shadow-sm flex items-center gap-1">
                  <span>累計 ${totalCount} 則心得</span>
                  <span>•</span>
                  <span>👨‍💻 鑫吾回覆率 ${totalCount > 0 ? Math.round((repliedCount / totalCount) * 100) : 100}%</span>
                </span>
                ${isDev ? `
                  <span class="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-black border border-purple-300 shadow-sm flex items-center gap-1">
                    <span>👑 開發者模式已啟用</span>
                  </span>
                ` : ''}
              </div>
              <p class="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                歡迎各位家人、科任老師與親友在此留下使用心得、功能許願或狀況回報！鑫吾會在開發維護時定期閱讀並在此親自回覆喔！❤️
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap items-center gap-2">
            <button onclick="feedbackBoard.openPostModal()" class="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 transition shadow-md active:scale-95">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
              <span>✍️ 留下心得 / 許願</span>
            </button>
            <button onclick="feedbackBoard.refresh()" class="px-3 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-bold flex items-center gap-1 transition active:scale-95 shadow-sm" title="重新整理">
              <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
              <span class="hidden sm:inline">重新整理</span>
            </button>
            <button onclick="feedbackBoard.copyAllForDev()" class="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1 transition active:scale-95 shadow-sm" title="複製全體留言文字，方便開發參考">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              <span class="hidden sm:inline">複製心得摘要</span>
            </button>
            <button onclick="feedbackBoard.openSyncSettingsModal()" class="px-2.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold flex items-center gap-1 transition active:scale-95 shadow-sm" title="Google 試算表雲端同步設定">
              <i data-lucide="settings" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="flex items-center space-x-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        ${this.renderFilterButton('all', '全部心得', 'sparkles')}
        ${this.renderFilterButton('feature', '💡 功能許願', 'lightbulb')}
        ${this.renderFilterButton('feedback', '❤️ 使用心得', 'heart')}
        ${this.renderFilterButton('bug', '🐛 問題回報', 'bug')}
        ${this.renderFilterButton('replied', '👨‍💻 鑫吾已回覆', 'message-circle')}
      </div>

      <!-- Feedbacks List -->
      <div class="space-y-4">
        ${items.length === 0 ? `
          <div class="glass-card rounded-3xl p-10 text-center border border-pink-200 bg-white/80 shadow-sm">
            <div class="w-16 h-16 mx-auto mb-3 bg-pink-100 rounded-full flex items-center justify-center text-3xl">
              💌
            </div>
            <h3 class="text-base font-black text-slate-800 mb-1">目前尚無此分類的心得</h3>
            <p class="text-xs text-slate-500 mb-4 font-medium">搶先當第一個發表的人吧！您的建議將是系統進化最大的動力～</p>
            <button onclick="feedbackBoard.openPostModal()" class="px-4 py-2 rounded-xl bg-pink-500 text-white text-xs font-bold hover:bg-pink-600 transition shadow-sm">
              ✍️ 立即發表心得
            </button>
          </div>
        ` : items.map(item => this.renderFeedbackCard(item, isDev)).join('')}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  renderFilterButton(filterId, label, icon) {
    const isActive = this.currentFilter === filterId;
    return `
      <button onclick="feedbackBoard.setFilter('${filterId}')" class="px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shadow-sm ${
        isActive 
          ? 'bg-pink-600 text-white ring-2 ring-pink-400 font-black' 
          : 'bg-white hover:bg-pink-50 text-slate-700 border border-pink-200'
      }">
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
    const isAnnouncement = item.category === 'announcement';
    const categoryConfig = {
      announcement: { bg: 'bg-purple-100 text-purple-800 border-purple-300', label: '📢 開發者公告', icon: 'bell' },
      feature: { bg: 'bg-amber-100 text-amber-800 border-amber-300', label: '💡 功能許願', icon: 'lightbulb' },
      feedback: { bg: 'bg-rose-100 text-rose-800 border-rose-300', label: '❤️ 使用心得', icon: 'heart' },
      bug: { bg: 'bg-red-100 text-red-800 border-red-300', label: '🐛 問題回報', icon: 'alert-triangle' },
      chat: { bg: 'bg-blue-100 text-blue-800 border-blue-300', label: '☕ 閒聊交流', icon: 'coffee' }
    }[item.category] || { bg: 'bg-slate-100 text-slate-800 border-slate-300', label: '💬 交流', icon: 'message-square' };

    const formattedDate = this.formatDate(item.timestamp);
    const hasReply = item.reply && item.reply.trim().length > 0;

    return `
      <div class="glass-card rounded-3xl p-5 border ${isAnnouncement ? 'border-2 border-purple-400 bg-gradient-to-br from-purple-50/40 via-white to-pink-50/30' : 'border-pink-200 bg-white'} shadow-sm hover:shadow-md transition">
        <!-- Card Header -->
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-2xl ${isAnnouncement ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white' : 'bg-pink-100 text-pink-700 border border-pink-200'} flex items-center justify-center font-black text-sm shadow-sm shrink-0">
              ${isAnnouncement ? '👑' : (item.mood || '🌸')}
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-black text-slate-900 text-sm sm:text-base">${this.escapeHtml(item.author || '神秘親友')}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${categoryConfig.bg} border">
                  ${categoryConfig.label}
                </span>
                ${item.role ? `
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    ${this.escapeHtml(item.role)}
                  </span>
                ` : ''}
              </div>
              <div class="text-[11px] text-slate-400 font-mono mt-0.5">
                ${formattedDate}
              </div>
            </div>
          </div>

          <!-- Like / Action -->
          <div class="flex items-center space-x-1.5 shrink-0">
            <button onclick="feedbackBoard.toggleLike('${item.id}')" class="px-2.5 py-1 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-200 text-xs font-bold transition flex items-center gap-1 active:scale-95 shadow-sm" title="覺得這個心得或許願很讚">
              <span>❤️</span>
              <span id="like-count-${item.id}" class="font-black">${item.likes || 0}</span>
            </button>
            ${isDev ? `
              <button onclick="feedbackBoard.openReplyModal('${item.id}')" class="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-black transition flex items-center gap-1 active:scale-95 shadow-sm" title="開發者回覆此則留言">
                <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                <span>${hasReply ? '修改回覆' : '回覆'}</span>
              </button>
              <button onclick="feedbackBoard.deleteFeedback('${item.id}')" class="p-1 rounded-lg hover:bg-rose-50 text-rose-500 transition" title="刪除留言">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Feedback Content -->
        <div class="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium pl-1 mb-3 whitespace-pre-wrap">
          ${this.escapeHtml(item.content)}
        </div>

        <!-- Developer Reply Card (if any) -->
        ${hasReply ? `
          <div class="mt-3 p-3.5 rounded-2xl border-2 border-pink-300 bg-gradient-to-br from-pink-50/80 via-white to-rose-50/40 shadow-sm relative">
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <div class="flex items-center space-x-1.5">
                <span class="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
                <span class="text-xs font-black text-pink-900 flex items-center gap-1">
                  <span>👨‍💻 鑫吾 (Albert) 回覆</span>
                  <span class="kitty-bow !w-3 !h-3"></span>
                </span>
                <span class="px-1.5 py-0.2 rounded text-[9px] font-black bg-pink-200 text-pink-800">
                  官方回覆
                </span>
              </div>
              <span class="text-[10px] text-pink-700/70 font-mono font-bold">
                ${this.formatDate(item.replyTimestamp)}
              </span>
            </div>
            <div class="text-xs text-slate-800 font-medium leading-relaxed pl-1 whitespace-pre-wrap">
              ${this.escapeHtml(item.reply)}
            </div>
          </div>
        ` : (isDev ? `
          <div class="mt-2 text-right">
            <button onclick="feedbackBoard.openReplyModal('${item.id}')" class="text-xs font-bold text-purple-600 hover:text-purple-800 underline transition inline-flex items-center gap-1">
              <i data-lucide="message-square-plus" class="w-3 h-3"></i>
              <span>尚未回覆，點此撰寫鑫吾的回覆...</span>
            </button>
          </div>
        ` : '')}
      </div>
    `;
  }

  // --- Like Action ---
  toggleLike(id) {
    const item = this.feedbacks.find(f => f.id === id);
    if (!item) return;

    item.likes = (item.likes || 0) + 1;
    this.saveToStorage();

    const el = document.getElementById(`like-count-${id}`);
    if (el) el.innerText = item.likes;

    window.appState.showToast('❤️ 謝謝您的支持與點讚！', 'info');
  }

  // --- Open Post Feedback Modal ---
  openPostModal() {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const savedAuthor = localStorage.getItem('classquant_feedback_author') || '';
    const savedRole = localStorage.getItem('classquant_feedback_role') || '導師';

    modalContent.innerHTML = `
      <div class="p-5 sm:p-6 animate-fade-in-up">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-pink-200">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-xl bg-pink-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              ✍️
            </div>
            <div>
              <h3 class="font-black text-slate-900 text-base flex items-center gap-1.5">
                <span>發表使用心得 / 許願池</span>
                <span class="kitty-bow !w-3 !h-3"></span>
              </h3>
              <p class="text-[11px] text-slate-500">您的心得與建議將直接顯示於交流板，鑫吾會親自閱讀並回覆！</p>
            </div>
          </div>
          <button onclick="appState.closeModal()" class="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition">
            ✕
          </button>
        </div>

        <form id="feedback-post-form" onsubmit="event.preventDefault(); feedbackBoard.submitFeedback();" class="space-y-3.5">
          <!-- Row 1: Author & Role -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">您的暱稱 / 稱謂 *</label>
              <input type="text" id="fb-author-input" value="${this.escapeHtml(savedAuthor)}" placeholder="例如：大姊、數學科任老師、801導師" class="w-full bg-slate-50 border-2 border-pink-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-pink-500" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">身份角色</label>
              <select id="fb-role-select" class="w-full bg-slate-50 border-2 border-pink-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-pink-500">
                <option value="導師" ${savedRole === '導師' ? 'selected' : ''}>🏫 班級導師</option>
                <option value="科任老師" ${savedRole === '科任老師' ? 'selected' : ''}>📐 科任老師</option>
                <option value="家人親友" ${savedRole === '家人親友' ? 'selected' : ''}>👨‍👩‍👧 家人親友</option>
                <option value="行政/其他" ${savedRole === '行政/其他' ? 'selected' : ''}>🎒 學校行政 / 其他夥伴</option>
              </select>
            </div>
          </div>

          <!-- Row 2: Category & Mood -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">心得類別</label>
              <select id="fb-category-select" class="w-full bg-slate-50 border-2 border-pink-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-pink-500">
                <option value="feedback">❤️ 使用心得分享</option>
                <option value="feature">💡 功能許願池 (希望增加什麼)</option>
                <option value="bug">🐛 問題或狀況回報</option>
                <option value="chat">☕ 閒聊與打氣交流</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">使用心情 / 滿意度</label>
              <select id="fb-mood-select" class="w-full bg-slate-50 border-2 border-pink-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-pink-500">
                <option value="🤩">🤩 超讚！帶班超方便</option>
                <option value="😍">😍 很喜歡三麗鷗風格與音效</option>
                <option value="😄">😄 實用順手</option>
                <option value="🤔">🤔 還在摸索，有優化建議</option>
                <option value="💡">💡 突發奇想的新點子</option>
              </select>
            </div>
          </div>

          <!-- Row 3: Content -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">心得內容 / 許願詳情 *</label>
            <textarea id="fb-content-input" rows="4" placeholder="請盡情寫下您平常使用的感想、遇到的問題，或是希望未來能增加哪些實用功能..." class="w-full bg-slate-50 border-2 border-pink-200 rounded-xl p-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-pink-500 leading-relaxed" required></textarea>
          </div>

          <!-- Submit Buttons -->
          <div class="flex items-center justify-end space-x-2 pt-2 border-t border-pink-100">
            <button type="button" onclick="appState.closeModal()" class="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition">
              取消
            </button>
            <button type="submit" id="fb-submit-btn" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md active:scale-95">
              <i data-lucide="send" class="w-3.5 h-3.5"></i>
              <span>公開發布至互動板</span>
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
    const mood = document.getElementById('fb-mood-select')?.value;
    const content = document.getElementById('fb-content-input')?.value.trim();

    if (!author || !content) {
      window.appState.showToast('請填寫暱稱與心得內容', 'danger');
      return;
    }

    // Remember author and role
    localStorage.setItem('classquant_feedback_author', author);
    localStorage.setItem('classquant_feedback_role', role);

    const submitBtn = document.getElementById('fb-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="animate-spin mr-1">⏳</span> 發布中...`;
    }

    const newEntry = {
      id: `fb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      author,
      role,
      category,
      mood,
      content,
      likes: 1,
      reply: "",
      replyAuthor: "",
      replyTimestamp: ""
    };

    // Prepend to list
    this.feedbacks.unshift(newEntry);
    this.saveToStorage();

    // Try sending to Webhook (if configured)
    const webhookUrl = this.getWebhookUrl();
    if (webhookUrl && navigator.onLine) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEntry)
        });
      } catch (e) {
        console.log('Webhook POST (silent):', e);
      }
    }

    window.appState.closeModal();
    this.render('feedback-board-view');
    window.appState.showToast('🎉 心得已成功發表！謝謝您的熱情回饋 ❤️', 'success');
  }

  // --- Open Developer Reply Modal ---
  openReplyModal(feedbackId) {
    const item = this.feedbacks.find(f => f.id === feedbackId);
    if (!item) return;

    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="p-5 sm:p-6 animate-fade-in-up">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-pink-200">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              👨‍💻
            </div>
            <div>
              <h3 class="font-black text-slate-900 text-base flex items-center gap-1.5">
                <span>鑫吾 (Albert) 開發者公開回覆</span>
                <span class="kitty-bow !w-3 !h-3"></span>
              </h3>
              <p class="text-[11px] text-slate-500">回覆將標記官方徽章，呈現在該留言卡片下方</p>
            </div>
          </div>
          <button onclick="appState.closeModal()" class="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition">
            ✕
          </button>
        </div>

        <!-- Target Feedback Preview -->
        <div class="p-3 rounded-2xl bg-pink-50/50 border border-pink-200 text-xs text-slate-700 mb-3.5">
          <div class="font-black text-slate-900 mb-1 flex items-center gap-1.5">
            <span>原留言人：${this.escapeHtml(item.author)} (${this.escapeHtml(item.role || '親友')})</span>
            <span class="text-[10px] text-slate-400 font-mono">${this.formatDate(item.timestamp)}</span>
          </div>
          <div class="font-medium whitespace-pre-wrap pl-1 border-l-2 border-pink-300">${this.escapeHtml(item.content)}</div>
        </div>

        <!-- Reply Input -->
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">回覆內容 *</label>
            <textarea id="dev-reply-input" rows="4" placeholder="例如：謝謝大姊的建議！這個功能我預計在下週 v2.0 加入..." class="w-full bg-slate-50 border-2 border-purple-200 rounded-xl p-3 text-xs font-medium text-slate-900 focus:outline-none focus:border-purple-500 leading-relaxed">${this.escapeHtml(item.reply || '')}</textarea>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-purple-100">
            ${item.reply ? `
              <button type="button" onclick="feedbackBoard.deleteReply('${item.id}')" class="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition">
                清空回覆
              </button>
            ` : '<div></div>'}
            <div class="flex items-center space-x-2">
              <button type="button" onclick="appState.closeModal()" class="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition">
                取消
              </button>
              <button type="button" onclick="feedbackBoard.saveReply('${item.id}')" class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md active:scale-95">
                <i data-lucide="check" class="w-3.5 h-3.5"></i>
                <span>儲存並發布回覆</span>
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
  saveReply(id) {
    const replyText = document.getElementById('dev-reply-input')?.value.trim();
    if (!replyText) {
      window.appState.showToast('請輸入回覆內容', 'danger');
      return;
    }

    const item = this.feedbacks.find(f => f.id === id);
    if (!item) return;

    item.reply = replyText;
    item.replyAuthor = "鑫吾 (Albert)";
    item.replyTimestamp = new Date().toISOString();
    this.saveToStorage();

    window.appState.closeModal();
    this.render('feedback-board-view');
    window.appState.showToast('✅ 鑫吾的回覆已發布至互動板！', 'success');
  }

  // --- Delete Developer Reply ---
  deleteReply(id) {
    const item = this.feedbacks.find(f => f.id === id);
    if (!item) return;

    item.reply = "";
    item.replyAuthor = "";
    item.replyTimestamp = "";
    this.saveToStorage();

    window.appState.closeModal();
    this.render('feedback-board-view');
    window.appState.showToast('已清空回覆', 'info');
  }

  // --- Delete Feedback Card ---
  deleteFeedback(id) {
    if (!confirm('確定要刪除此則留言嗎？')) return;
    this.feedbacks = this.feedbacks.filter(f => f.id !== id);
    this.saveToStorage();
    this.render('feedback-board-view');
    window.appState.showToast('已刪除留言', 'info');
  }

  // --- Copy All Feedback Summary for Dev Planning ---
  copyAllForDev() {
    if (this.feedbacks.length === 0) {
      window.appState.showToast('目前尚無留言資料', 'info');
      return;
    }

    let report = `【ClassQuant 師生親友互動板 - 意見心得與許願清單】\n生成時間：${new Date().toLocaleString()}\n共 ${this.feedbacks.length} 則：\n\n`;

    this.feedbacks.forEach((f, idx) => {
      report += `[${idx + 1}] [${f.category}] ${f.author} (${f.role || '親友'})\n`;
      report += `時間：${this.formatDate(f.timestamp)} | 心情：${f.mood || '🌸'} | 讚：${f.likes || 0}\n`;
      report += `內容：\n${f.content}\n`;
      if (f.reply) {
        report += `↳ 鑫吾回覆：${f.reply} (${this.formatDate(f.replyTimestamp)})\n`;
      }
      report += `------------------------------------\n`;
    });

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(report).then(() => {
        window.appState.showToast('📋 已複製所有心得與許願摘要至剪貼簿！可直接貼給 AI 規劃更新！', 'success');
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
    window.appState.showToast('📋 已複製所有心得與許願摘要至剪貼簿！', 'success');
  }

  // --- Open Sync Settings Modal ---
  openSyncSettingsModal() {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const currentWebhook = this.getWebhookUrl();

    modalContent.innerHTML = `
      <div class="p-5 sm:p-6 animate-fade-in-up">
        <div class="flex items-center justify-between pb-3 mb-4 border-b border-pink-200">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              ⚙️
            </div>
            <div>
              <h3 class="font-black text-slate-900 text-base flex items-center gap-1.5">
                <span>Google 雲端試算表同步設定</span>
              </h3>
              <p class="text-[11px] text-slate-500">串接 Google Sheets Webhook，在雲端表格即時接收心得與回覆</p>
            </div>
          </div>
          <button onclick="appState.closeModal()" class="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition">
            ✕
          </button>
        </div>

        <div class="space-y-3.5 text-xs text-slate-700">
          <div class="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900">
            <div class="font-black mb-1">💡 如何建立免費 Google Sheets 接收端？</div>
            <ol class="list-decimal list-inside space-y-1 font-medium text-[11px]">
              <li>在您的 Google 雲端硬碟建立一個新的「Google 試算表」。</li>
              <li>點擊上方選單「擴充功能」➔「Apps Script」。</li>
              <li>貼上 doPost 接收程式碼並點擊「部署」➔「新的部署」➔「網頁應用程式」（所有人皆可存取）。</li>
              <li>將產生的「網頁應用程式網址」貼在下方即可！</li>
            </ol>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Google Apps Script Web App 網址</label>
            <input type="url" id="fb-webhook-input" value="${this.escapeHtml(currentWebhook)}" placeholder="https://script.google.com/macros/s/.../exec" class="w-full bg-slate-50 border-2 border-blue-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500">
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-100">
            <button type="button" onclick="feedbackBoard.exportBackupJson()" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition flex items-center gap-1">
              <i data-lucide="download" class="w-3.5 h-3.5"></i> 下載 feedback.json
            </button>
            <div class="flex items-center space-x-2">
              <button type="button" onclick="appState.closeModal()" class="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition">
                關閉
              </button>
              <button type="button" onclick="feedbackBoard.saveWebhookUrl()" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black transition shadow-sm">
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

  saveWebhookUrl() {
    const input = document.getElementById('fb-webhook-input');
    if (!input) return;
    this.setWebhookUrl(input.value);
    window.appState.closeModal();
    window.appState.showToast('✅ 雲端試算表 Webhook 網址已儲存！', 'success');
  }

  exportBackupJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.feedbacks, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `classquant_feedbacks_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    window.appState.showToast('📥 feedback.json 已下載！', 'success');
  }

  async refresh() {
    await this.loadInitialData();
    this.render('feedback-board-view');
    window.appState.showToast('🔄 互動板資料已重新整理', 'info');
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

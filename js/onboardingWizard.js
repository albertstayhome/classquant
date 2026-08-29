/**
 * ClassQuant Hub - Interactive Teacher Onboarding Wizard
 * Step-by-step interactive walkthrough with Sanrio character animations, live sandbox demos,
 * and direct jump-to-action buttons for teachers to set up their classes, roster, and tags.
 */

class OnboardingWizard {
  constructor() {
    this.currentStep = 0;
    this.totalSteps = 6;
    this.steps = [
      {
        title: "歡迎來到 ClassQuant Hub！",
        subtitle: "專為國中導師與數學科任設計的因材施教戰情室",
        mascot: "kitty",
        badge: "🎀 30 秒認識系統",
        content: `
          <div class="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
            <p>老師您好！ClassQuant Hub 是一套<strong>以人本教學痛點出發</strong>的課堂管理工具，專為解決「課堂手忙腳亂」與「下課寫評語缺事證」而生：</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div class="p-3 rounded-2xl bg-pink-50 border border-pink-200">
                <strong class="text-pink-700 block mb-1 font-black">🎀 導師本班雙軌制</strong>
                <span>切換導師班時，以「生活常規、晨讀、出缺席、同儕互動」為核心指標。</span>
              </div>
              <div class="p-3 rounded-2xl bg-sky-50 border border-sky-200">
                <strong class="text-blue-700 block mb-1 font-black">📘 數學科任專區</strong>
                <span>切換任教班時，以「解題速度、觀念卡關、作業繳交、小考成績」為核心指標。</span>
              </div>
            </div>
            <div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
              <span>📶 提示：本系統 100% 離線可用，每次連上 Wi-Fi 還會自動在背景推播最新功能！</span>
            </div>
          </div>
        `,
        actionLabel: "下一步：建立我的班級名單 ➔",
        secondaryAction: null
      },
      {
        title: "第一步：建立班級與名單",
        subtitle: "不用逐字手打！直接從學校 Excel / Word 複製貼上",
        mascot: "twinstars",
        badge: "👥 班級名單管理",
        content: `
          <div class="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
            <p>在<strong>「👥 班級名單」</strong>中，您可以隨時新增導師班或任教班，並支援<strong>「1 鍵批次貼上名冊」</strong>：</p>
            <div class="p-3 rounded-2xl bg-pink-50 border border-pink-200 space-y-1.5 text-xs">
              <div class="font-black text-pink-900 mb-1">📋 批次貼上自動去雜訊示範：</div>
              <div class="font-mono bg-white p-2 rounded-xl border border-pink-200 text-slate-600">
                1. 陳冠宇<br>
                02 林子涵<br>
                3 號 黃柏翔 (轉學生)
              </div>
              <div class="text-emerald-700 font-bold">✨ 系統會自動去除「1. / 02 / 號」，精準建立座號與姓名！</div>
            </div>
            <p class="text-xs text-slate-500">（點擊下方按鈕，您可以直接跳轉至名單管理頁面練習）</p>
          </div>
        `,
        actionLabel: "下一步：自訂課堂標籤 ➔",
        secondaryAction: {
          label: "🚀 前往「班級名單」頁面",
          onClick: "appState.switchTab('roster'); onboardingWizard.close();"
        }
      },
      {
        title: "第二步：自訂課堂加扣分標籤",
        subtitle: "3 階統一色彩規範，拒絕花花綠綠的色彩疲勞",
        mascot: "kitty",
        badge: "🏷️ 標籤自訂中心",
        content: `
          <div class="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
            <p>全站標籤採用<strong>嚴格三階色彩規則</strong>，一眼看懂不費力：</p>
            <div class="space-y-2">
              <div class="p-2.5 rounded-xl color-rule-pos border-2 flex items-center justify-between text-xs font-black">
                <span>🌿 綠色代表「加分項目」（如：主動解出難題、熱心助人）</span>
                <span class="color-rule-pos-badge px-2 py-0.5 rounded-md border">+2</span>
              </div>
              <div class="p-2.5 rounded-xl color-rule-neg border-2 flex items-center justify-between text-xs font-black">
                <span>🌹 紅色代表「扣分項目」（如：作業缺交、課堂分心干擾）</span>
                <span class="color-rule-neg-badge px-2 py-0.5 rounded-md border">-1</span>
              </div>
              <div class="p-2.5 rounded-xl color-rule-zero border-2 flex items-center justify-between text-xs font-black">
                <span>☁️ 灰色代表「純文字記事」（如：家長電話備忘、感冒服藥）</span>
                <span class="color-rule-zero-badge px-2 py-0.5 rounded-md border">0</span>
              </div>
            </div>
            <p class="text-xs text-pink-700 font-bold">✨ 每個班級會根據您過去的「使用頻率」自動把最常用的 4 個標籤排在第 1 頁！</p>
          </div>
        `,
        actionLabel: "下一步：課堂極速記點實戰 ➔",
        secondaryAction: {
          label: "⚙️ 前往「自訂標籤」",
          onClick: "tagManager.openTagManagerModal(); onboardingWizard.close();"
        }
      },
      {
        title: "第三步：課堂現場極速記點",
        subtitle: "點選學生座位 ➔ 點擊下方 4 大標籤，3 秒內完成！",
        mascot: "twinstars",
        badge: "⚡ 課堂點記板",
        content: `
          <div class="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
            <p>在<strong>「課堂點記板」</strong>中，座位表採用零滑動緊湊佈局：</p>
            <div class="space-y-2 text-xs">
              <div class="p-2.5 rounded-2xl bg-pink-50 border border-pink-200 flex items-center gap-2">
                <span class="text-lg">👆</span>
                <div><strong>單選 / 複選</strong>：直接點擊座位方塊（選取時有微彈與粉紅光暈動效）。</div>
              </div>
              <div class="p-2.5 rounded-2xl bg-sky-50 border border-sky-200 flex items-center gap-2">
                <span class="text-lg">👥</span>
                <div><strong>分組 / 排數快捷</strong>：點擊頂部「分組/排」，一鍵秒選「第 1 排」或「全體男生」。</div>
              </div>
              <div class="p-2.5 rounded-2xl bg-purple-50 border border-purple-200 flex items-center gap-2">
                <span class="text-lg">🎲</span>
                <div><strong>幸運抽籤</strong>：隨機抽取學生上台解題，抽中後可 1 鍵快速加分！</div>
              </div>
            </div>
          </div>
        `,
        actionLabel: "下一步：課後回憶補記 ➔",
        secondaryAction: {
          label: "🎮 前往「課堂點記板」",
          onClick: "appState.switchTab('matrix'); onboardingWizard.close();"
        }
      },
      {
        title: "第四步：課堂事後回憶補記",
        subtitle: "上課無法掏手機？下課或放學回辦公室 1 鍵補齊！",
        mascot: "kuromi",
        badge: "⏰ 事後補記與時序事證",
        content: `
          <div class="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
            <p>針對老師<strong>「上課需維持講課節奏，無法分心操作手機」</strong>的真實情境：</p>
            <div class="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5 text-xs text-amber-950">
              <div class="font-black flex items-center gap-1">
                <span>⏰</span>
                <span>放學回辦公室，點擊頂部【事後補記】：</span>
              </div>
              <div>1. 選擇發生日期與節次（如：今天第 2 節、昨天午休）。</div>
              <div>2. 勾選涉案或表現優異的學生（可多選）。</div>
              <div>3. 選擇標籤並輸入備忘 $\rightarrow$ 1 秒批次補記！</div>
            </div>
            <p class="text-xs text-slate-600">在<strong>「學生記事檢索」</strong>中，還能以<strong>「📅 日期時光機」</strong>或<strong>「👥 多生交叉查詢」</strong>秒調衝突記錄，家長晤談與評語超強大！</p>
          </div>
        `,
        actionLabel: "下一步：完成引導 ➔",
        secondaryAction: {
          label: "🔍 前往「記事檢索」",
          onClick: "appState.switchTab('events'); onboardingWizard.close();"
        }
      },
      {
        title: "🎉 恭喜！您已掌握所有教學神器！",
        subtitle: "現在您可以開始打造專屬於您的智慧班級",
        mascot: "kitty",
        badge: "🌟 準備就緒",
        content: `
          <div class="space-y-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium text-center">
            <div class="py-2">
              <div class="sanrio-twinstars-badge !w-16 !h-16 mx-auto mb-2"></div>
              <p class="text-sm font-black text-slate-900">隨時點擊頂部橫幅的 <strong>「🌱 新手引導」</strong> 可再次複習！</p>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <button onclick="onboardingWizard.finishAndKeepDemo()" class="p-3.5 rounded-2xl bg-pink-50 hover:bg-pink-100 border-2 border-pink-300 transition text-xs font-bold text-slate-800">
                <span class="block text-pink-700 font-black mb-0.5">🌟 保留示範班級資料</span>
                <span>先用內建的 801/803 班資料熟悉操作與體驗。</span>
              </button>
              
              <button onclick="onboardingWizard.finishAndClearNew()" class="p-3.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 transition text-xs font-bold text-slate-800">
                <span class="block text-rose-700 font-black mb-0.5">🌱 清空建立我的真實班級</span>
                <span>清空資料庫，直接開始匯入我自己的班級學生。</span>
              </button>
            </div>
          </div>
        `,
        actionLabel: "✨ 進入 ClassQuant 戰情室！",
        secondaryAction: null
      }
    ];
  }

  start(stepIndex = 0) {
    this.currentStep = stepIndex;
    this.renderStep();
    if (window.appState?.playChime) window.appState.playChime();
  }

  renderStep() {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    if (!modal || !modalContent) return;

    const step = this.steps[this.currentStep];
    const isFirst = this.currentStep === 0;
    const isLast = this.currentStep === this.totalSteps - 1;

    let mascotBadge = 'sanrio-kitty-badge';
    if (step.mascot === 'twinstars') mascotBadge = 'sanrio-twinstars-badge';
    if (step.mascot === 'kuromi') mascotBadge = 'sanrio-kuromi-badge';

    modalContent.innerHTML = `
      <div class="p-5 sm:p-7 max-h-[90vh] overflow-y-auto relative animate-fade-in-up">
        
        <!-- Header: Mascot + Step Indicator + Close Button -->
        <div class="flex items-center justify-between mb-4 pb-3 border-b border-pink-100">
          <div class="flex items-center space-x-3">
            <div class="${mascotBadge} !w-12 !h-12 shrink-0"></div>
            <div>
              <span class="text-[11px] px-2.5 py-0.5 rounded-full font-black bg-pink-100 text-pink-700 border border-pink-300">
                ${step.badge} • 步驟 ${this.currentStep + 1} / ${this.totalSteps}
              </span>
              <h3 class="text-base sm:text-xl font-black text-slate-900 mt-1">${step.title}</h3>
            </div>
          </div>

          <button onclick="onboardingWizard.close()" class="w-8 h-8 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold flex items-center justify-center transition" title="關閉引導">
            ✕
          </button>
        </div>

        <!-- Step Progress Bar -->
        <div class="w-full bg-pink-100 h-1.5 rounded-full mb-4 overflow-hidden">
          <div class="bg-gradient-to-r from-pink-500 to-rose-600 h-full rounded-full transition-all duration-300" style="width: ${((this.currentStep + 1) / this.totalSteps) * 100}%"></div>
        </div>

        <p class="text-xs text-slate-500 font-bold mb-3">${step.subtitle}</p>

        <!-- Body Content -->
        <div class="mb-5">
          ${step.content}
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-pink-100">
          <div class="flex items-center space-x-2">
            ${!isFirst ? `
              <button onclick="onboardingWizard.prevStep()" class="px-3.5 py-2 rounded-xl border border-pink-300 text-xs font-bold text-slate-700 hover:bg-pink-50 transition">
                ◀ 上一步
              </button>
            ` : ''}
            
            ${step.secondaryAction ? `
              <button onclick="${step.secondaryAction.onClick}" class="px-3.5 py-2 rounded-xl bg-pink-100 text-pink-800 text-xs font-bold hover:bg-pink-200 border border-pink-300 transition">
                ${step.secondaryAction.label}
              </button>
            ` : ''}
          </div>

          <button onclick="onboardingWizard.nextStep()" class="px-5 py-2.5 rounded-2xl font-black text-white bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 shadow-md transition text-xs sm:text-sm flex items-center gap-1.5 ml-auto active:scale-95">
            <span>${step.actionLabel}</span>
          </button>
        </div>

      </div>
    `;

    modal.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
  }

  nextStep() {
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
      this.renderStep();
      if (window.appState?.playPop) window.appState.playPop();
    } else {
      this.close();
      if (window.appState?.playChime) window.appState.playChime();
      window.appState.showToast('🎉 歡迎開始使用 ClassQuant Hub！隨時點擊頂部「🌱 新手引導」可再次開啟！', 'success');
    }
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep();
      if (window.appState?.playPop) window.appState.playPop();
    }
  }

  close() {
    const modal = document.getElementById('global-modal');
    if (modal) modal.classList.add('hidden');
  }

  finishAndKeepDemo() {
    this.close();
    window.appState.switchTab('matrix');
    window.appState.showToast('已為您保留示範資料，歡迎體驗點記與統計戰情室！🎀', 'success');
  }

  finishAndClearNew() {
    if (confirm('確定要清空示範資料，開始建立自己的全新班級嗎？')) {
      window.appStore.clearAll();
      this.close();
      window.appState.switchTab('roster');
      window.appState.showToast('已清空資料庫，請點擊「新增班級」開始建置名冊！🌱', 'info');
      setTimeout(() => location.reload(), 600);
    }
  }
}

// Global Onboarding Wizard Instance
window.onboardingWizard = new OnboardingWizard();

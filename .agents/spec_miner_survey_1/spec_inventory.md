# ClassQuant Hub — Master Tour & PWA Specification Inventory

## 1. Master Walkthrough (12 Steps) Authoritative Specification

| Step # | Step ID | Tab Context | Action Type | Target Selector | Fallback Selector | Tooltip Title | Tooltip Description | Pointer Hint / Direction | Auto-Pilot & Transition Behavior | Expected System State |
|---|---|---|---|---|---|---|---|---|---|---|
| **1** | step-class-select | matrix (classroom-matrix-view) | manual-change | #global-class-select | None | 1. 班級切換樞紐 (點擊展開) | 這裡是你管理班級的核心！<strong>請點擊下拉選單</strong>，看看裡面為各班獨立保存的分數與名單。 | 👆 請點此切換<br>(Placed below target when in top half) | Manual user interaction. Action badge shows pulsing 👆 請您親自操作發光處. Listens for trusted change event on select dropdown. | Drops down class options (801 導師班, 803 數學科任, 805 數學科任), user selects class, advances to step 2 after 200ms debounce. |
| **2** | step-select-student | matrix (classroom-matrix-view) | manual-click | #seat-card-1 | .student-seat-card:first-child | 2. 點選學生座位 | 上課中想記點嗎？<strong>請親手點擊 1 號學生的座位</strong>，外框會亮起準備記點！ | 👆 請點擊此處<br>(Placed above or below target based on Y center) | Manual user interaction. Action badge shows pulsing 👆 請您親自操作發光處. Listens for trusted click event on seat card 1. | Seat card 1 gains .selected class with pink glow/ring, selected count updates to 1, advances to step 3. |
| **3** | step-click-tag | matrix (classroom-matrix-view) | manual-click | #first-quick-tag-btn | .tag-page-slide button:first-child | 3. 觸發快速記點與動態加分 | <strong>點擊第一個加分項「主動解出難題 (+3)」</strong>，觀察專屬彩帶特效與分數跳動！ | 👆 請點擊此處<br>(Placed above target when in bottom half) | Manual user interaction. Listens for trusted click event on first quick tag button. | Triggers matrixView.applyTagToSelected(), generates floating point bubble +3, plays chime audio, clears selection, advances to step 4. |
| **4** | step-custom-tags | matrix (classroom-matrix-view) | info | #custom-tag-open-btn | .glass-card button i[data-lucide='settings'] | 4. 自訂班級專屬快速標籤 | 您未來可以點擊<strong>「⚙️ 自訂」</strong>，自由新增各科專屬加扣分項目。這個步驟看看就好，請點擊「下一步」。 | None (Pointer hidden for info actions) | Informational step. Action container displays 下一步 ➔ button. External clicks are blocked. | Displays custom tag button highlight; user clicks 下一步 ➔ to advance to step 5. |
| **5** | step-goto-roster | matrix $\rightarrow$ oster | uto-click | utton[data-tab="roster"] | None | 5. 前往 👥 班級名單中心 | 接下來設定名單。請看系統<strong>自動為您切換</strong>到「👥 班級名單」！ | 👆 系統代為點擊 | Auto-Pilot step. Action container displays bouncing button 讓系統代為操作 🪄. When clicked: ghost cursor animates from popover button to target tab button with 800ms cubic-bezier transition, ripple effect, playPop() audio, triggers 	argetEl.click() (ppState.switchTab('roster')), waits 400ms, advances to step 6. | Main view switches to oster-manager-view, #roster-manager-view unhidden, active tab styling applies to roster button. |
| **6** | step-roster-paste | oster (oster-manager-view) | manual-click | #roster-paste-btn | None | 6. 1 秒批次貼上名冊 (Excel 匯入) | 新學期大絕招！<strong>點擊「📋 1秒批次貼上名單」</strong>，系統支援從 Excel 整欄貼上，自動去除數字雜訊！ | 👆 請點擊此處 | Manual user interaction. Action badge shows pulsing 👆 請您親自操作發光處. Listens for trusted click on #roster-paste-btn. | Opens osterManager.openBatchPasteModal(), modal overlay activates, tour advances to step 7 (auto-closes modal if target is not modal). |
| **7** | step-roster-details | oster (oster-manager-view) | info | #roster-manager-view .grid > div:first-child | #roster-class-select | 7. 學生名冊個別微調 (改名/座號) | 您可以隨時點擊修改學生姓名與座號。請點擊「下一步」。 | None (Pointer hidden for info actions) | Informational step. Action container displays 下一步 ➔ button. | Highlights the first student row in roster grid. User clicks 下一步 ➔ to advance to step 8. |
| **8** | step-goto-retro | oster $\rightarrow$ etro | uto-click | utton[data-tab="retro"] | None | 8. 前往 ⏰ 課堂事後補記專區 | 下課回到辦公室！系統將為您切換至<strong>「⏰ 課堂事後補記」</strong>。 | 👆 系統代為點擊 | Auto-Pilot step. Action container displays bouncing 讓系統代為操作 🪄. Ghost cursor animates to utton[data-tab="retro"], triggers click (ppState.switchTab('retro')), advances to step 9. | Main view switches to etro-log-view, active tab updates. |
| **9** | step-retro-action | etro (etro-log-view) | manual-click | #retro-odd-btn | #retro-submit-btn | 9. 事後補記實戰 (單號快選) | <strong>試著點擊「單號(男)」</strong>快速選取學生，接著您可以帶入常用評語並提交！ | 👆 請點擊此處 | Manual user interaction. Action badge shows pulsing 👆 請您親自操作發光處. Listens for trusted click on #retro-odd-btn. | Triggers etroLogView.selectOdd(), odd-numbered student cards highlight, advances to step 10. |
| **10** | step-goto-dashboard | etro $\rightarrow$ dashboard | uto-click | utton[data-tab="dashboard"] | None | 10. 前往 📊 統計戰情室看分析 | 想看全班大數據？我們為您自動切換至<strong>「📊 統計戰情室」</strong>！ | 👆 系統代為點擊 | Auto-Pilot step. Action container displays bouncing 讓系統代為操作 🪄. Ghost cursor animates to utton[data-tab="dashboard"], triggers click (ppState.switchTab('dashboard')), advances to step 11. | Main view switches to dashboard-view, active tab updates. |
| **11** | step-dashboard-charts | dashboard (dashboard-view) | info | #dashboard-view .glass-card:first-child | None | 11. 四象限拔尖與關懷分析 | 系統自動畫出「學業 ✕ 常規」四象限圖表，是您段考親師座談的最佳利器！點擊「下一步」。 | None (Pointer hidden for info actions) | Informational step. Action container displays 下一步 ➔ button. | Highlights top metric card / scatter quadrant view. User clicks 下一步 ➔ to advance to step 12. |
| **12** | step-finish | dashboard (dashboard-view) | info | #header-version-badge | None | 🎉 恭喜通關！戰力全開！ | 您已熟悉核心操作！隨時可點擊<strong>「📢 頂部版本號」</strong>查看詳細圖文說明書與更新日誌！ | None (Pointer hidden for info actions) | Final completion step. Action container displays ✨ 完成並開始使用！ button. | User clicks ✨ 完成並開始使用！ $\rightarrow$ calls onboardingTour.endTour(), clears locks/mask/pointer, sets localStorage.setItem('classquant_tour_completed', 'true'), plays chime, shows success toast. |

---

## 2. PWA & Service Worker Caching Architecture Specification

### A. Manifest Configuration (manifest.json)
- **Name**: ClassQuant Hub • 班級量化統計與記事戰情室
- **Short Name**: ClassQuant
- **Description**: 專屬國中導師與數學科任之班級量化統計、事件記事與因材施教戰情室
- **Start URL**: ./index.html
- **Display**: standalone
- **Background Color**: #fff1f2
- **Theme Color**: #f43f5e
- **Orientation**: ny
- **Icons**: SVG data URI (192x192, 512x512, purpose: ny maskable)

### B. Service Worker Caching & Lifecycle (service-worker.js)
- **Cache Name**: classquant-hub-v19
- **Cached Asset List (ASSETS_TO_CACHE)** (25 total assets):
  1. './'
  2. './index.html'
  3. './manifest.json'
  4. './version.json'
  5. './css/styles.css'
  6. './css/kitty-theme.css'
  7. './css/sanrio-characters.css'
  8. './js/store.js'
  9. './js/timetable.js'
  10. './js/statistics.js'
  11. './js/charts.js'
  12. './js/tagManager.js'
  13. './js/matrix.js'
  14. './js/rosterManager.js'
  15. './js/retroLogView.js'
  16. './js/eventsLog.js'
  17. './js/studentDossier.js'
  18. './js/timetableEditor.js'
  19. './js/aiImportExport.js'
  20. './js/onboardingTour.js'
  21. './js/onboardingWizard.js'
  22. './js/userGuide.js'
  23. './js/app.js'
  24. './assets/images/twin_stars.png'
  25. './使用指南_圖文說明書.html'
- **Install Lifecycle Hook**:
  - self.skipWaiting() called immediately on install.
  - caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)).
- **Activate Lifecycle Hook**:
  - Iterates all cache keys via caches.keys().
  - Deletes all caches where key !== CACHE_NAME.
  - Calls self.clients.claim() to immediately take control of open tabs.
- **Fetch Routing Strategies**:
  - **Network-First (Instant OTA)**: Applied to URLs ending with .html, .json, or /.
    - Online: Always fetches fresh copy from network { cache: 'no-cache' }, updates Cache API with clone on HTTP 200, returns network response.
    - Offline fallback: Resolves from caches.match(event.request), falls back to caches.match('./index.html').
  - **Stale-While-Revalidate**: Applied to CSS, JS, and image assets.
    - Resolves from Cache API immediately for zero-latency load.
    - Concurrently fires background fetch to update cache on HTTP 200.
- **Message Hook**:
  - Listens for { data: 'SKIP_WAITING' } and triggers self.skipWaiting().

### C. Version Strings & Sync Audit Across Codebase

| Location | String / Variable | Current Value | Sync Status / Risk |
|---|---|---|---|
| ersion.json | ersion | 1.5.2 | ⚠️ Mismatch with pp.js (1.6.0) |
| ersion.json | uildNumber | 2026083003 | Build timestamp representation |
| ersion.json | minAppVersion | 1.0.0 | Minimum compatibility version |
| ersion.json | otaUpdateEnabled | 	rue | Remote OTA flag |
| js/app.js:15 | 	his.appVersion | '1.6.0' | ⚠️ Divergent from ersion.json (1.5.2) |
| js/app.js:2 | Header Comment | 1.4.0 | Stale header comment |
| js/app.js:297 | Bulletin Changelog Modal | 1.5.2 (最新實戰導覽版本) | Historical entry |
| js/onboardingTour.js:2 | Header Comment | 1.6.0 | Aligned with pp.js |
| service-worker.js:5 | CACHE_NAME | 'classquant-hub-v19' | Independent increment counter |
| index.html:64 | #header-version-badge | <span>v1.6.0</span> | Aligned with pp.js |
| index.html:223 | <footer> badge | ClassQuant Hub v1.3.0 | ⚠️ Stale static footer string |
| index.html:246-261 | Script Tags ?v= | ?v=1.6.0 (all 16 scripts) | Aligned with pp.js |
| ndroid/app/build.gradle:13-14 | ersionCode / ersionName | 120 / "1.2.0" | Android container build version |
| ndroid/app/MainActivity.java:25 | REMOTE_OTA_URL | https://albert-classquant.github.io/app/ | Remote live endpoint |
| localStorage | classquant_last_seen_version | Dynamic string | Used in checkReleaseNotesOnLaunch() |

---

## 3. Test Frameworks, Scripts, and Build Commands

### A. Test Frameworks Inventory
- **Unit / Integration / E2E Frameworks**: None installed in root (no jest, itest, playwright, cypress, or mocha configuration files or package.json in repository).
- **Android Test Instrumentation**: 	estInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner" defined in ndroid/app/build.gradle, but no test cases currently present in source tree.

### B. Build and Serving Tooling
- **Local Dev Server**: serve.ps1
  - Command: powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1 -Port 8080
  - Supports automatic MIME resolution, CORS headers (Access-Control-Allow-Origin: *), IPv4 LAN binding for mobile testing.
- **Windows One-Click Launch**: 啟動系統.bat
  - Command: start "" "%~dp0index.html" (opens in default browser).
- **Mobile LAN Dev Server**: 📱手機測試_啟動伺服器.bat
  - Command: Launches serve.ps1 in dedicated title window.
- **Android APK Build**:
  - Command: cd android; .\gradlew assembleRelease or .\gradlew assembleDebug.

---

## 4. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Onboarding Tour | 12-Step Guided Walkthrough | Step-by-step interactive onboarding for teachers covering seats, points, roster import, retro-logging, and analytics. | onboardingTour.start(fromStep) | Fullscreen SVG mask, focused highlight, bouncing hand pointer, popover | Falls back to matrix view / document.body if target selector missing | js/onboardingTour.js |
| 2 | Onboarding Tour | SVG Spotlight Masking | Industry-standard SVG path evenodd cutout preventing CSS stacking context issues. | Target element bounding rect | Dynamic SVG <path d="..."> covering viewport with 75% dark fill except target cutout + 6px padding | Clamps coordinates to [0, vw] and [0, vh] | js/onboardingTour.js:431-450 |
| 3 | Onboarding Tour | Ghost Auto-Pilot Cursor | Simulated animated cursor demonstrating automated tab transitions and interactions. | onboardingTour.playGhostCursor() | 800ms smooth cubic-bezier cursor translation, ripple animation, pop audio, synthetic click dispatch | Blocked if isAutoPlaying already true or target missing | js/onboardingTour.js:388-429 |
| 4 | Onboarding Tour | Directional Pointer Indicator | Dynamic bouncing hand emoji (👆 / 👇) and capsule label indicating exact user action. | Element Y-center relative to innerHeight / 2 | Positioned above or below target with 	ranslateX(-50%) centering | Hidden when step.action === 'info' | js/onboardingTour.js:453-485 |
| 5 | Onboarding Tour | Viewport-Safe Popover Positioning | Tour instructional card automatically shifts to top or bottom safe areas to prevent obscuring target elements. | Target top/bottom coordinates | Popover pinned to env(safe-area-inset-top) or env(safe-area-inset-bottom) | Enforces horizontal centering and padding | js/onboardingTour.js:486-493 |
| 6 | Onboarding Tour | 60FPS Continuous Tracking | Real-time equestAnimationFrame tracking loop synchronizing spotlight geometry with animations/reflows. | Bounding box coordinates | Re-renders SVG cutout and pointer when rect changes | Cancelled automatically when tour ends | js/onboardingTour.js:263-281 |
| 7 | Onboarding Tour | Anti-Jump & Anti-Lock Guard | Event capture phase listeners blocking unintended scrolls and rapid erratic clicks. | 	ouchmove, wheel, click, 	ouchstart events | Event stopped unless inside popover or trusted target interaction | Removes listeners on endTour() | js/onboardingTour.js:227-253 |
| 8 | Onboarding Tour | Horizontal Nav Centering | Auto-scrolls horizontal overflow navigation bar to center target tab buttons before spotlight highlight. | Target tab button inside <nav> | Smooth scroll to offsetLeft - navWidth/2 + targetWidth/2 | Clamped to Math.max(0, ...) | js/onboardingTour.js:331-340 |
| 9 | Onboarding Wizard | 6-Step Sanrio Modal Wizard | Introductory modal guide with Kitty/TwinStars mascots explaining 30s system overview and 3-tier colors. | onboardingWizard.start() | Modal dialog with step progress bar, mascot badges, and jump-to-action buttons | Closed via onboardingWizard.close() | js/onboardingWizard.js |
| 10 | PWA / Offline | Service Worker Cache Layer | Full offline PWA support with instant OTA updates and cache busting. | Browser fetch requests | Network-First for HTML/JSON, Stale-While-Revalidate for static assets | Offline fallback to index.html | service-worker.js |
| 11 | PWA / Updates | Live OTA Version Checker | Automated background check against ersion.json on launch and online reconnect. | ersion.json HTTP fetch | Shows release notes modal once per version, triggers cache invalidation | Gracefully silent on network failure | js/app.js:126-175 |
| 12 | PWA / Updates | Manual Cache Flush & Update | Button in footer and bulletin to force reload latest version and purge Service Worker caches. | ppState.applyLiveOTAUpdate() | Unregisters old SW, purges caches.keys(), triggers hard reload | Displays toast on start | js/app.js:539-556 |
| 13 | Header / UI | Smart Auto-Collapsing Header | Auto-collapses header on scrolling down > 70px, expands on scrolling to top, disabled during tour. | Window scroll event | Toggles .header-collapsed class and floating pill #header-unhide-pill | Gated by onboardingTour.isActive | js/app.js:85-114 |
| 14 | Audio Engine | Web Audio API Native Synthesizer | Zero-asset Web Audio oscillator generating pop clicks, harmonic chimes, and warning alerts. | Frequency and oscillator parameters | Audio output via AudioContext | Checks sound toggle preference, handles suspended context | js/app.js:559-655 |
| 15 | Classroom Matrix | 4-Tag Paged Dock | 2x2 spacious in-flow tag cards directly beneath seat grid with per-class frequency ranking. | Class events history | Ranked tag cards with color-coded point badges | Fallbacks to default page 0 | js/matrix.js:78-91 |
| 16 | Roster Manager | 1-Click Batch Paste | Regex-powered roster import from Excel/Word stripping leading seat numbers and punctuation. | Raw multiline text | Parsed student records with auto-assigned seat numbers | Shows warning toast if text unparseable | js/rosterManager.js:160-209 |
| 17 | Retro-Logging | Dedicated Post-Class Recall View | Standalone tab for batch logging past period events with odd/even selectors and parent comment templates. | Date, period, student seats, tag, comment | Adds events to store, triggers point bubbles | Requires at least 1 student selected | js/retroLogView.js |
| 18 | Analytics | 4-Quadrant Differentiated Scatter Chart | Interactive scatter plot of academic score mean vs character points with click-to-dossier jump. | Student profiles | Chart.js scatter chart with 4 colored quadrant zones | Graceful empty state | js/charts.js:447-514 |

---

## 5. Edge Cases Inventory

| # | Feature | Input / Scenario | Observed Behavior & Code Location |
|---|---|---|---|
| 1 | Tour Navigation | Narrow Mobile Screen with Target Tab Out of View (utton[data-tab="roster"] / utton[data-tab="retro"] / utton[data-tab="dashboard"]) | js/onboardingTour.js:331-340 calls 
avEl.scrollTo() with smooth centering, followed by 400ms delay to let layout settle before computing SVG cutout and pointer coords. |
| 2 | Tour Target Missing | Target selector not present in DOM within 3000ms | js/onboardingTour.js:283-297 polls every 50ms up to 3000ms. If element width/height is 0 or unfound, returns document.body, which falls back to #classroom-matrix-view to prevent tour crash. |
| 3 | Tour User Rapid Tapping | User furiously taps background mask or outside popover during Auto-Pilot step | js/onboardingTour.js:240-243 captures click and touchstart events, checking if (this.isAutoPlaying) { e.preventDefault(); e.stopPropagation(); }, completely blocking phantom clicks. |
| 4 | Tour Step Transition & Modals | Tour advances while a modal is currently open | js/onboardingTour.js:315-317 checks if (window.appState && (!step.targetSelector || !step.targetSelector.includes('global-modal'))) window.appState.closeModal();, preventing background modal freeze. |
| 5 | Tour vs Header Scroll Collapse | User scrolls during tour execution | js/app.js:91 checks if (window.onboardingTour && window.onboardingTour.isActive) return;, preventing the global header from collapsing and misaligning header targets (#global-class-select, #header-version-badge). |
| 6 | PWA Version Check vs Local Storage | ersion.json has 1.5.2 while pp.js has 1.6.0 | In js/app.js:228, dismissing release notes compares 	his.appVersion !== version. Because 1.6.0 !== 1.5.2, it purges all caches and reloads, which can cause cache thrashing if static ersion.json is not updated in lockstep. |
| 7 | PWA Cache Query Param Matching | index.html loads scripts with ?v=1.6.0 while service-worker.js caches ./js/app.js | Service worker fetch handler uses caches.match(event.request). Without ignoreSearch: true, query-stringed requests may miss pre-cached keys during first offline cold boot unless cached dynamically on first online fetch. |
| 8 | AudioContext Autoplay Policy | Browser blocks audio context until user interaction | js/app.js:567 checks if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume(); inside getAudioContext(). |
| 9 | Batch Paste Dirty Text | Pasting  1. 王小明 (轉學), 2、李小華 from Excel | js/rosterManager.js:178 applies regex 	rimmed.replace(/^[\d\s.\-、]+/, '').trim() to cleanly extract names without seat number artifacts. |
| 10 | High-DPI / Orientation Change | Device rotated from portrait to landscape during tour | js/onboardingTour.js:268-277 rAF tracking loop detects bounding rect change string 	op_left_width_height and recalculates SVG path d and pointer placement within 16ms. |

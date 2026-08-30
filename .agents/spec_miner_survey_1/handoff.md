# Handoff Report — Spec Miner Survey 1 (Tour & PWA Specification Investigator)

## 1. Observation
1. **Master Tour Steps (12 Steps)**:
   - File: d:\class_point_app_dev\js\onboardingTour.js, lines 19–118:
     - 	his.steps array defines 12 steps:
       1. step-class-select: #global-class-select, ction: 'manual-change', 	ab: 'matrix', title: 1. 班級切換樞紐 (點擊展開)
       2. step-select-student: #seat-card-1 (fallback: .student-seat-card:first-child), ction: 'manual-click', 	ab: 'matrix', title: 2. 點選學生座位
       3. step-click-tag: #first-quick-tag-btn (fallback: .tag-page-slide button:first-child), ction: 'manual-click', 	ab: 'matrix', title: 3. 觸發快速記點與動態加分
       4. step-custom-tags: #custom-tag-open-btn (fallback: .glass-card button i[data-lucide='settings']), ction: 'info', 	ab: 'matrix', title: 4. 自訂班級專屬快速標籤
       5. step-goto-roster: utton[data-tab="roster"], ction: 'auto-click', title: 5. 前往 👥 班級名單中心
       6. step-roster-paste: #roster-paste-btn, ction: 'manual-click', 	ab: 'roster', title: 6. 1 秒批次貼上名冊 (Excel 匯入)
       7. step-roster-details: #roster-manager-view .grid > div:first-child (fallback: #roster-class-select), ction: 'info', 	ab: 'roster', title: 7. 學生名冊個別微調 (改名/座號)
       8. step-goto-retro: utton[data-tab="retro"], ction: 'auto-click', title: 8. 前往 ⏰ 課堂事後補記專區
       9. step-retro-action: #retro-odd-btn (fallback: #retro-submit-btn), ction: 'manual-click', 	ab: 'retro', title: 9. 事後補記實戰 (單號快選)
       10. step-goto-dashboard: utton[data-tab="dashboard"], ction: 'auto-click', title: 10. 前往 📊 統計戰情室看分析
       11. step-dashboard-charts: #dashboard-view .glass-card:first-child, ction: 'info', 	ab: 'dashboard', title: 11. 四象限拔尖與關懷分析
       12. step-finish: #header-version-badge, ction: 'info', 	ab: 'dashboard', title: 🎉 恭喜通關！戰力全開！
   - Tour engine SVG spotlight cutout math in js/onboardingTour.js:447:
     - const d = \M 0 0 h \ v \ h -\ Z M \ \ v \ h \ v -\ Z\;
   - Ghost auto-pilot in js/onboardingTour.js:388-429:
     - Translates #tour-ghost-cursor over 800ms using cubic-bezier(0.25, 1, 0.5, 1), fires .ghost-cursor-click scale animation and ripple effect, triggers 	argetEl.click(), then advances step after 400ms.
   - Anti-jump & interaction defense in js/onboardingTour.js:227-253:
     - scrollBlocker stops 	ouchmove and wheel on capture phase unless inside #tour-popover.
     - clickBlocker stops click and 	ouchstart on capture phase unless inside #tour-popover (blocks during isAutoPlaying, info, or uto-click).
     - Event listener on target element uses { once: true }, checks e.isTrusted, and debounces 
extStep() by 200ms (js/onboardingTour.js:507-516).
   - Nav centering in js/onboardingTour.js:331-340:
     - Checks if target is inside 
av and executes 
avEl.scrollTo(...).

2. **PWA & Caching Layer**:
   - service-worker.js:
     - const CACHE_NAME = 'classquant-hub-v19'; (line 5)
     - const ASSETS_TO_CACHE = [...] (lines 6–32, 25 items including HTML, JSON, CSS, 16 JS files, images)
     - Install hook calls self.skipWaiting() and cache.addAll(ASSETS_TO_CACHE).
     - Activate hook purges all old caches key !== CACHE_NAME and calls self.clients.claim().
     - Fetch router: Network-First for .html, .json, and /; Stale-While-Revalidate for .css, .js, and images.
   - ersion.json:
     - "version": "1.5.2", "buildNumber": 2026083003, "minAppVersion": "1.0.0".
   - index.html:
     - Line 64: <span>v1.6.0</span> in #header-version-badge.
     - Line 223: ClassQuant Hub v1.3.0 in footer.
     - Lines 246–261: Script tags appended with ?v=1.6.0.
   - js/app.js:
     - Line 15: 	his.appVersion = '1.6.0';
     - Line 134: etch('./version.json?t=' + Date.now()) in checkReleaseNotesOnLaunch() and checkForUpdates().
     - Line 228: if (this.appVersion !== version || !document.getElementById('onboarding-guide-btn')) triggers full cache deletion and reload.
   - ndroid/app/build.gradle:
     - Line 13–14: ersionCode 120, ersionName "1.2.0".

3. **Testing & Build Infrastructure**:
   - Root has no package.json, no Node.js test runner configs (jest.config.js, playwright.config.js, itest.config.js are absent).
   - Local test server: serve.ps1 (Powershell HTTP server on port 8080 with CORS and MIME support).
   - Launcher scripts: 啟動系統.bat (file URL browser launch), 📱手機測試_啟動伺服器.bat (Powershell LAN server).
   - Android Gradle: ndroid/app/build.gradle with AndroidJUnitRunner (0 test suites in src).

## 2. Logic Chain
1. *From Tour Step Definitions (Observation 1)*: The tour consists of exactly 12 steps, alternating between 4 manual actions (manual-click and manual-change), 3 auto-pilot actions (uto-click), and 5 informational milestones (info). Each step specifies an authoritative selector, and where dynamic DOM rendering may delay, fallback selectors (allbackSelector) and a 3000ms polling resolver (waitForElement) guarantee robustness.
2. *From Auto-Pilot & Anti-Jump Analysis (Observation 1)*: Auto-pilot steps prevent race conditions by locking pointer events (pointer-events: none on overlay path, clickBlocker stopping unhandled page events, isAutoPlaying boolean lock). The ghost cursor calculates source and target client bounding rects for fluid motion before invoking 	argetEl.click().
3. *From Version Sync Analysis (Observation 2)*: A version discrepancy exists: ersion.json is set to 1.5.2, while pp.js, index.html badge, and script tags are at 1.6.0, and the footer displays 1.3.0. Because dismissReleaseNotes() in pp.js checks if (this.appVersion !== version), the mismatch between 1.6.0 and 1.5.2 can trigger cache eviction and hard reloads during startup.
4. *From Service Worker Routing Analysis (Observation 2)*: service-worker.js caches ASSETS_TO_CACHE without query parameters (e.g. './js/app.js'), while index.html requests './js/app.js?v=1.6.0'. In standard Service Worker Cache API, exact URL matching without { ignoreSearch: true } may require dynamic caching on the first online request.
5. *From Infrastructure Analysis (Observation 3)*: The project is designed as a zero-dependency static web application and Android WebView wrapper. Automated tests must be conducted via headless browser automation, HTTP serving via serve.ps1, or static code validation.

## 3. Caveats
- No automated JS unit/integration test suites (e.g., Jest/Playwright) exist in the current repository; verification relies on static inspection, PowerShell server verification, and browser runtime execution.
- External CDNs (Tailwind CSS, Chart.js, Lucide Icons, Google Fonts) are loaded over the internet; offline operation depends on browser HTTP cache unless bundled into local assets.

## 4. Conclusion
- The 12-step master walkthrough is fully specified in js/onboardingTour.js with complete target selectors, tab contexts, fallback selectors, auto-pilot animations, and anti-jump event handlers.
- The PWA layer is powered by service-worker.js (cache name classquant-hub-v19) and manifest.json. Version strings require alignment across ersion.json (1.5.2 $\rightarrow$ 1.6.0), index.html footer (1.3.0 $\rightarrow$ 1.6.0), and ndroid/app/build.gradle.
- Comprehensive specifications have been compiled in d:\class_point_app_dev\.agents\spec_miner_survey_1\spec_inventory.md.

## 5. Verification Method
- **File Inspection**:
  - Check d:\class_point_app_dev\.agents\spec_miner_survey_1\spec_inventory.md for the complete 12-step walkthrough table, PWA cache list, version audit, and feature inventory.
- **Local Server Test**:
  - Run powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1 -Port 8080 in d:\class_point_app_dev.
  - Request http://localhost:8080/index.html and http://localhost:8080/version.json to verify HTTP 200 responses and MIME headers.
- **Invalidation Conditions**:
  - Invalidation occurs if js/onboardingTour.js step definitions are modified, step count diverges from 12, or cache asset list changes without corresponding service-worker.js updates.

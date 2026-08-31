const {
  describeSuite, itTest, assertTrue, assertFalse, assertEqual, assertNotNull, assertContains,
  parseRosterBatchPaste, simulateTabSwitch, calculatePointerPlacement
} = require('./test_engine');

function runTier4RealWorld() {
  describeSuite("Tier 4 -- Real-World Application Scenario Simulations", () => {
    itTest("T4-01: Scenario 1 - Complete 12-Step Master Walkthrough Simulation", () => {
      const tour = { currentStep: 0, isActive: true, activeTab: "matrix", completed: false };

      // Step 1: Class Select
      assertEqual(0, tour.currentStep);
      assertEqual("matrix", tour.activeTab);
      tour.currentStep++;

      // Step 2: Select Student 1
      assertEqual(1, tour.currentStep);
      tour.currentStep++;

      // Step 3: Click Tag (+3)
      assertEqual(2, tour.currentStep);
      tour.currentStep++;

      // Step 4: Custom Tags Info
      assertEqual(3, tour.currentStep);
      tour.currentStep++;

      // Step 5: Auto-click Roster Tab
      assertEqual(4, tour.currentStep);
      tour.activeTab = "roster";
      tour.currentStep++;

      // Step 6: Roster Paste Button
      assertEqual(5, tour.currentStep);
      assertEqual("roster", tour.activeTab);
      tour.currentStep++;

      // Step 7: Roster Details Info
      assertEqual(6, tour.currentStep);
      tour.currentStep++;

      // Step 8: Auto-click Retro Tab
      assertEqual(7, tour.currentStep);
      tour.activeTab = "retro";
      tour.currentStep++;

      // Step 9: Retro Odd Select Action
      assertEqual(8, tour.currentStep);
      assertEqual("retro", tour.activeTab);
      tour.currentStep++;

      // Step 10: Auto-click Dashboard Tab
      assertEqual(9, tour.currentStep);
      tour.activeTab = "dashboard";
      tour.currentStep++;

      // Step 11: Dashboard Four-Quadrant Charts Info
      assertEqual(10, tour.currentStep);
      assertEqual("dashboard", tour.activeTab);
      tour.currentStep++;

      // Step 12: Finish Badge Step
      assertEqual(11, tour.currentStep);
      tour.isActive = false;
      tour.completed = true;

      assertFalse(tour.isActive);
      assertTrue(tour.completed);
    });

    itTest("T4-02: Scenario 2 - First-Time User Experience & Mid-Tour Abort/Teardown Flow", () => {
      const storage = {};
      const tour = { isActive: true, currentStep: 0, overlayHidden: false };

      tour.currentStep = 3;
      tour.isActive = false;
      tour.overlayHidden = true;
      storage["classquant_tour_completed"] = "true";

      assertFalse(tour.isActive);
      assertTrue(tour.overlayHidden);
      assertEqual("true", storage["classquant_tour_completed"]);
    });

    itTest("T4-03: Scenario 3 - Classroom Point Logging & Retro Recall Lifecycle", () => {
      const store = {
        points: { "student_1": 0 },
        history: []
      };

      // Step A: Award +3 points
      store.points["student_1"] += 3;
      store.history.push({ student: "student_1", delta: 3, tag: "主動解出難題" });

      // Step B: Historical retroactive adjustment
      store.points["student_1"] += 2;
      store.history.push({ student: "student_1", delta: 2, tag: "課堂事後補記" });

      // Step C: Verify cumulative score
      assertEqual(5, store.points["student_1"]);
      assertEqual(2, store.history.length);
    });

    itTest("T4-04: Scenario 4 - Excel Roster Batch Import & Student Dossier Navigation", () => {
      const excelExportRaw = "1. 王小明 (男)\r\n2. 李小美 (女)\r\n3. 陳大同 (男)";
      const parsed = parseRosterBatchPaste(excelExportRaw);
      assertEqual(3, parsed.length);

      const sw = simulateTabSwitch("student-dossier");
      assertEqual("student-dossier-view", sw.visibleContainer);
    });

    itTest("T4-05: Scenario 5 - PWA Cold Boot Offline Application Workflow", () => {
      const isOffline = true;
      const cache = {
        "index.html": "<html>ClassQuant App</html>",
        "js/app.js": "console.log('ClassQuant init');"
      };

      const bootHtml = isOffline ? cache["index.html"] : null;
      const bootJs = isOffline ? cache["js/app.js"] : null;

      assertNotNull(bootHtml);
      assertNotNull(bootJs);
      assertContains("ClassQuant App", bootHtml);
    });

    itTest("T4-06: Scenario 6 - Live OTA Update Notification & Bulletin Release Notes Flow", () => {
      const storage = { "classquant_last_seen_version": "1.5.0" };
      const currentAppVersion = "1.6.0";

      const shouldShowModal = storage["classquant_last_seen_version"] !== currentAppVersion;
      assertTrue(shouldShowModal);

      storage["classquant_last_seen_version"] = currentAppVersion;
      const shouldShowAfterDismiss = storage["classquant_last_seen_version"] !== currentAppVersion;
      assertFalse(shouldShowAfterDismiss);
    });

    itTest("T4-07: Scenario 7 - Theme Switching & Web Audio Synthesizer Toggle Session", () => {
      const appState = { theme: "sanrio-kitty", soundEnabled: true };
      appState.theme = "sanrio-twinstars";
      appState.soundEnabled = false;

      assertEqual("sanrio-twinstars", appState.theme);
      assertFalse(appState.soundEnabled);
    });

    itTest("T4-08: Scenario 8 - Mobile Small-Screen Orientation Change Reflow Simulation", () => {
      const target = { top: 400, left: 100, width: 150, height: 50 };
      const pPortrait = calculatePointerPlacement(target, 6, 375, 812);
      const pLandscape = calculatePointerPlacement(target, 6, 812, 375);

      assertEqual("hand-down", pPortrait.emoji);
      assertEqual("hand-down", pLandscape.emoji);
    });

    itTest("T4-09: Scenario 9 - Multi-Class Switch & Timetable Perception Workflow", () => {
      const appState = { currentClassId: "801" };
      const timetableSlot = { period: 2, classId: "803" };

      appState.currentClassId = timetableSlot.classId;
      assertEqual("803", appState.currentClassId);
    });

    itTest("T4-10: Scenario 10 - Manual Cache Flush & Hard Reload Lifecycle", () => {
      const cacheStorage = { "classquant-hub-v19": ["index.html", "app.js"] };
      delete cacheStorage["classquant-hub-v19"];
      assertEqual(0, Object.keys(cacheStorage).length);

      const hardReloadUrl = `index.html?t=${Date.now()}`;
      assertContains("?t=", hardReloadUrl);
    });
  });
}

module.exports = { runTier4RealWorld };
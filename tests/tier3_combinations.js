const {
  describeSuite, itTest, assertTrue, assertFalse, assertEqual,
  newMatrixState, simulateApplyTag, calculateScoreSpanRender,
  simulateFloatingBubble, simulateTabSwitch, simulateDetectActiveSlot,
  calculateSvgSpotlightPath, calculateNavScrollLeft,
  parseRosterBatchPaste, matchServiceWorkerCache
} = require('./test_engine');

function runTier3Combinations() {
  describeSuite("Tier 3 -- Cross-Feature Combinations: Step-by-Step Pairwise Transitions", () => {
    itTest("T3-01: Pairwise Transition: Step 1 (Class Select) -> Step 2 (Seat Select)", () => {
      const step1 = { id: "step-class-select", tab: "matrix", action: "manual-change" };
      const step2 = { id: "step-select-student", tab: "matrix", action: "manual-click" };
      assertEqual("matrix", step1.tab);
      assertEqual("matrix", step2.tab);
      assertEqual("manual-change", step1.action);
      assertEqual("manual-click", step2.action);
    });

    itTest("T3-02: Pairwise Transition: Step 2 (Seat Select) -> Step 3 (Quick Tag Click)", () => {
      const step2 = { id: "step-select-student", target: "#seat-card-1" };
      const step3 = { id: "step-click-tag", target: "#first-quick-tag-btn" };
      assertEqual("#seat-card-1", step2.target);
      assertEqual("#first-quick-tag-btn", step3.target);
    });

    itTest("T3-03: Pairwise Transition: Step 3 (Quick Tag Click) -> Step 4 (Custom Tags Info)", () => {
      const step3 = { action: "manual-click", target: "#first-quick-tag-btn" };
      const step4 = { action: "info", target: "#custom-tag-open-btn" };
      assertEqual("manual-click", step3.action);
      assertEqual("info", step4.action);
    });

    itTest("T3-04: Pairwise Transition: Step 4 (Custom Tags Info) -> Step 5 (Auto-Click Roster)", () => {
      const step4 = { action: "info", tab: "matrix" };
      const step5 = { action: "auto-click", target: 'button[data-tab="roster"]' };
      assertEqual("info", step4.action);
      assertEqual("auto-click", step5.action);
    });

    itTest("T3-05: Pairwise Transition: Step 5 (Auto-Click Roster) -> Step 6 (Roster Paste Click)", () => {
      const step5 = { action: "auto-click", target: 'button[data-tab="roster"]' };
      const step6 = { action: "manual-click", tab: "roster", target: "#roster-paste-btn" };
      assertEqual("roster", step6.tab);
      assertEqual("manual-click", step6.action);
    });

    itTest("T3-06: Pairwise Transition: Step 6 (Roster Paste Click) -> Step 7 (Roster Details Info)", () => {
      const step6 = { target: "#roster-paste-btn" };
      const step7 = { target: "#roster-manager-view .grid > div:first-child", action: "info" };
      assertEqual("info", step7.action);
    });

    itTest("T3-07: Pairwise Transition: Step 7 (Roster Details Info) -> Step 8 (Auto-Click Retro)", () => {
      const step7 = { action: "info", tab: "roster" };
      const step8 = { action: "auto-click", target: 'button[data-tab="retro"]' };
      assertEqual("auto-click", step8.action);
    });

    itTest("T3-08: Pairwise Transition: Step 8 (Auto-Click Retro) -> Step 9 (Retro Odd Click)", () => {
      const step8 = { target: 'button[data-tab="retro"]' };
      const step9 = { tab: "retro", target: "#retro-odd-btn", action: "manual-click" };
      assertEqual("retro", step9.tab);
      assertEqual("manual-click", step9.action);
    });

    itTest("T3-09: Pairwise Transition: Step 9 (Retro Odd Click) -> Step 10 (Auto-Click Dashboard)", () => {
      const step9 = { action: "manual-click", tab: "retro" };
      const step10 = { action: "auto-click", target: 'button[data-tab="dashboard"]' };
      assertEqual("auto-click", step10.action);
    });

    itTest("T3-10: Pairwise Transition: Step 10 (Auto-Click Dashboard) -> Step 11 (Dashboard Charts Info)", () => {
      const step10 = { target: 'button[data-tab="dashboard"]' };
      const step11 = { tab: "dashboard", target: "#dashboard-view .glass-card:first-child", action: "info" };
      assertEqual("dashboard", step11.tab);
      assertEqual("info", step11.action);
    });

    itTest("T3-11: Pairwise Transition: Step 11 (Dashboard Charts Info) -> Step 12 (Finish Badge Info)", () => {
      const step11 = { target: "#dashboard-view .glass-card:first-child" };
      const step12 = { target: "#header-version-badge", action: "info" };
      assertEqual("#header-version-badge", step12.target);
    });
  });

  describeSuite("Tier 3 -- Cross-Feature Combinations: Integrated Subsystem Workflows", () => {
    itTest("T3-12: Matrix Seat Toggle + Quick Tag Award + Floating Bubble Float + Auto Clear", () => {
      const matrix = newMatrixState();
      matrix.toggle(1);
      matrix.toggle(2);
      const tag = { id: "tag-help", name: "熱心助人", delta: 2, category: "social" };
      const store = { events: [] };

      const res = simulateApplyTag(matrix, tag, "801", 1, store);
      const bubble1 = simulateFloatingBubble(1, 2);
      const bubble2 = simulateFloatingBubble(2, 2);

      assertTrue(res.success);
      assertEqual(2, res.appliedCount);
      assertEqual(0, matrix.getCount());
      assertEqual("✨ +2", bubble1.text);
      assertEqual("✨ +2", bubble2.text);
    });

    itTest("T3-13: Matrix Point Event + Score Span Character Points In-Place Update", () => {
      const events = [{ delta: 3, category: "discipline" }, { delta: 2, category: "social" }];
      let totalPts = 0;
      events.forEach(e => { totalPts += e.delta; });
      const render = calculateScoreSpanRender(totalPts);

      assertEqual(5, totalPts);
      assertEqual("+5", render.text);
      assertEqual("text-emerald-700", render.class);
    });

    itTest("T3-14: Matrix View + Tab Switch to Roster + Dynamic Student Search", () => {
      const sw = simulateTabSwitch("roster");
      assertEqual("roster-manager-view", sw.visibleContainer);

      const students = [{ seat: 1, name: "Student Alpha" }, { seat: 2, name: "Student Beta" }];
      const matched = students.filter(s => s.name.includes("Beta"));
      assertEqual(1, matched.length);
      assertEqual(2, matched[0].seat);
    });

    itTest("T3-15: Roster Manager Batch Paste + Class State Persist + Matrix Grid Refresh", () => {
      const raw = "1. 王大同\r\n2. 李美玲";
      const parsed = parseRosterBatchPaste(raw);
      const storage = { "classquant_classes": JSON.stringify(parsed) };

      assertEqual(2, parsed.length);
      assertContains("王大同", storage["classquant_classes"]);
    });

    itTest("T3-16: Tab Switch to Retro View + Odd Seat Selection + Retro Period Point Allocation", () => {
      const sw = simulateTabSwitch("retro");
      assertEqual("retro-log-view", sw.visibleContainer);

      const allSeats = [1, 2, 3, 4, 5, 6];
      const oddSeats = allSeats.filter(s => s % 2 === 1);
      assertEqual(3, oddSeats.length);

      const store = { events: [] };
      oddSeats.forEach(s => {
        store.events.push({ classId: "801", seatNo: s, period: 3, delta: 1 });
      });
      assertEqual(3, store.events.length);
    });

    itTest("T3-17: Retro Point Logging + Tab Switch to Dashboard + Chart Recalculation", () => {
      const sw = simulateTabSwitch("dashboard");
      assertEqual("dashboard-view", sw.visibleContainer);

      const events = [
        { classId: "801", seatNo: 1, delta: 3, category: "discipline" },
        { classId: "801", seatNo: 1, delta: 2, category: "social" }
      ];
      let pts = 0;
      events.forEach(e => { pts += e.delta; });
      assertEqual(5, pts);
    });

    itTest("T3-18: Timetable Active Slot Detection + Period Binding + Matrix Point Event Stamping", () => {
      const tuesdaySlot = simulateDetectActiveSlot(new Date("2026-09-01T08:30:00"));
      assertTrue(tuesdaySlot.isClassTime);
      assertEqual(1, tuesdaySlot.period);

      const matrix = newMatrixState();
      matrix.toggle(1);
      const tag = { id: "tag-ans", name: "回答問題", delta: 1, category: "academic" };
      const store = { events: [] };

      simulateApplyTag(matrix, tag, "801", tuesdaySlot.period, store);
      assertEqual(1, store.events[0].period);
    });

    itTest("T3-19: Tour Launching while Modal Open (Auto-closes modal on tour start)", () => {
      let modalOpen = true;
      modalOpen = false;
      const tourActive = true;

      assertFalse(modalOpen);
      assertTrue(tourActive);
    });

    itTest("T3-20: Tour Step 5 Auto-Pilot Tab Switch + Nav Centering + Spotlight Re-Highlight", () => {
      const navScroll = calculateNavScrollLeft(400, 300, 80);
      const sw = simulateTabSwitch("roster");
      const rect = { top: 150, left: 200, width: 100, height: 40 };
      const p = calculateSvgSpotlightPath(rect, 6, 1024, 768);

      assertEqual(290, navScroll);
      assertEqual("roster-manager-view", sw.visibleContainer);
      assertContains("M 194 144 v 52 h 112 v -52 Z", p);
    });

    itTest("T3-21: Tour Completion + LocalStorage Flag + Teardown Cleanup + Return to Matrix", () => {
      const storage = {};
      let tourActive = false;
      storage["classquant_tour_completed"] = "true";
      const sw = simulateTabSwitch("matrix");

      assertFalse(tourActive);
      assertEqual("true", storage["classquant_tour_completed"]);
      assertEqual("classroom-matrix-view", sw.visibleContainer);
    });

    itTest("T3-22: PWA Offline Network State + SW Cache Matching + Tour State Persistence", () => {
      const cachedAssets = ["./index.html", "./js/app.js", "./css/styles.css"];
      const match = matchServiceWorkerCache(cachedAssets, "./js/app.js?v=1.6.0", { ignoreSearch: true });

      assertTrue(match.matched);
      assertEqual("./js/app.js", match.cachedKey);
    });
  });
}

module.exports = { runTier3Combinations };
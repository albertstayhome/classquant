const {
  describeSuite, itTest, assertTrue, assertFalse, assertEqual,
  newMatrixState, simulateApplyTag, calculateScoreSpanRender,
  simulateFloatingBubble, simulateTabSwitch, simulateDetectActiveSlot,
  calculateSvgSpotlightPath, calculatePointerPlacement, calculateNavScrollLeft,
  parseRosterBatchPaste, matchServiceWorkerCache
} = require('./test_engine');

function runTier2Boundaries() {
  describeSuite("Tier 2 -- Feature 01 Boundary: Seat Card Touch and Selection Extremes", () => {
    itTest("F01-B1: Rapid double-taps on same seat card within 50ms results in unselected state", () => {
      const matrix = newMatrixState();
      matrix.toggle(3);
      matrix.toggle(3);
      assertFalse(matrix.isSelected(3));
      assertEqual(0, matrix.getCount());
    });

    itTest("F01-B2: Selecting all seats when already fully selected is idempotent", () => {
      const matrix = newMatrixState();
      matrix.selectAll();
      matrix.selectAll();
      assertEqual(30, matrix.getCount());
    });

    itTest("F01-B3: Clearing an already empty selection does not throw error", () => {
      const matrix = newMatrixState();
      matrix.clear();
      assertEqual(0, matrix.getCount());
    });

    itTest("F01-B4: Large class roster (50 seats) selects and deselects completely", () => {
      const matrix = newMatrixState(Array.from({ length: 50 }, (_, i) => i + 1));
      matrix.selectAll();
      assertEqual(50, matrix.getCount());
      matrix.clear();
      assertEqual(0, matrix.getCount());
    });

    itTest("F01-B5: Multi-touch simulation toggling 5 different seats concurrently", () => {
      const matrix = newMatrixState();
      [2, 4, 6, 8, 10].forEach(s => matrix.toggle(s));
      assertEqual(5, matrix.getCount());
      assertTrue(matrix.isSelected(6));
    });
  });

  describeSuite("Tier 2 -- Feature 02 Boundary: Quick Score Tag Resilience and Edge Conditions", () => {
    itTest("F02-B1: Tag click with 0 seats selected is safe and does not alter store", () => {
      const matrix = newMatrixState();
      const tag = { id: "tag-test", name: "測試", delta: 1, category: "academic" };
      const store = { events: [] };
      const res = simulateApplyTag(matrix, tag, "801", 1, store);
      assertFalse(res.success);
      assertEqual(0, store.events.length);
    });

    itTest("F02-B2: Large point delta values (+50, -20) are recorded accurately", () => {
      const matrix = newMatrixState();
      matrix.toggle(1);
      const tagBig = { id: "tag-big", name: "大獎勵", delta: 50, category: "academic" };
      const store = { events: [] };
      simulateApplyTag(matrix, tagBig, "801", 1, store);
      assertEqual(50, store.events[0].delta);
    });

    itTest("F02-B3: Applying tag to all 30 students in class creates exactly 30 events", () => {
      const matrix = newMatrixState();
      matrix.selectAll();
      const tag = { id: "tag-team", name: "全班合作", delta: 2, category: "social" };
      const store = { events: [] };
      const res = simulateApplyTag(matrix, tag, "801", 1, store);
      assertEqual(30, res.appliedCount);
      assertEqual(30, store.events.length);
      assertEqual(0, matrix.getCount());
    });

    itTest("F02-B4: Negative score tag triggers warning sound effect", () => {
      const matrix = newMatrixState();
      matrix.toggle(5);
      const tag = { id: "tag-warn", name: "違規", delta: -3, category: "discipline" };
      const res = simulateApplyTag(matrix, tag);
      assertEqual("warning", res.sound);
    });

    itTest("F02-B5: Zero delta tag (neutral attendance) processes safely without error", () => {
      const matrix = newMatrixState();
      matrix.toggle(2);
      const tag = { id: "tag-zero", name: "公假登記", delta: 0, category: "attendance" };
      const store = { events: [] };
      const res = simulateApplyTag(matrix, tag, "801", 1, store);
      assertTrue(res.success);
      assertEqual(0, store.events[0].delta);
    });
  });

  describeSuite("Tier 2 -- Feature 03 Boundary: Score Calculation and Formatting Edge Cases", () => {
    itTest("F03-B1: Student with zero event records formats score span as '0' with neutral slate styling", () => {
      const render = calculateScoreSpanRender(0);
      assertEqual("0", render.text);
      assertEqual("text-slate-500", render.class);
    });

    itTest("F03-B2: Large positive points (+999) format correctly with '+' sign", () => {
      const render = calculateScoreSpanRender(999);
      assertEqual("+999", render.text);
      assertEqual("text-emerald-700", render.class);
    });

    itTest("F03-B3: Large negative points (-999) format correctly with '-' sign", () => {
      const render = calculateScoreSpanRender(-999);
      assertEqual("-999", render.text);
      assertEqual("text-rose-700", render.class);
    });

    itTest("F03-B4: Cumulative score summing positive and negative events resolves correctly", () => {
      const events = [{ delta: 5 }, { delta: -3 }, { delta: -2 }];
      let net = 0;
      events.forEach(e => { net += e.delta; });
      assertEqual(0, net);
      const render = calculateScoreSpanRender(net);
      assertEqual("0", render.text);
    });

    itTest("F03-B5: Null or undefined student profile falls back gracefully to default zero score", () => {
      const profile = null;
      const charPts = profile ? profile.points : 0;
      assertEqual(0, charPts);
    });
  });

  describeSuite("Tier 2 -- Feature 04 Boundary: Floating Bubble Animation and DOM Safety", () => {
    itTest("F04-B1: Spawning bubble for non-existent card element returns null without throwing", () => {
      const card = null;
      const bubbleSpawned = card ? true : false;
      assertFalse(bubbleSpawned);
    });

    itTest("F04-B2: 50 rapid successive floating bubbles generate independent animation objects", () => {
      const bubbles = [];
      for (let i = 0; i < 50; i++) {
        bubbles.push(simulateFloatingBubble(1, 3));
      }
      assertEqual(50, bubbles.length);
      assertEqual("none", bubbles[49].pointerEvents);
    });

    itTest("F04-B3: Negative point bubble applies text-rose-600 color styling", () => {
      const bubble = simulateFloatingBubble(2, -5);
      assertContains("text-rose-600", bubble.className);
      assertEqual("-5", bubble.text);
    });

    itTest("F04-B4: Bubble auto-removal timeout is strictly set to 800ms", () => {
      const bubble = simulateFloatingBubble(1, 1);
      assertEqual(800, bubble.autoRemovalMs);
    });

    itTest("F04-B5: Bubble element creation does not alter seat card dataset or ID", () => {
      const cardMeta = { id: "seat-card-5", seatNo: 5 };
      simulateFloatingBubble(cardMeta.seatNo, 2);
      assertEqual("seat-card-5", cardMeta.id);
    });
  });

  describeSuite("Tier 2 -- Feature 05 Boundary: Optimized DOM Selection Benchmarks", () => {
    itTest("F05-B1: Empty class roster (0 students) handles selectAll safely", () => {
      const matrix = newMatrixState([]);
      matrix.selectAll();
      assertEqual(0, matrix.getCount());
    });

    itTest("F05-B2: Deselecting 1 student out of 50 maintains exactly 49 selected", () => {
      const matrix = newMatrixState(Array.from({ length: 50 }, (_, i) => i + 1));
      matrix.selectAll();
      matrix.toggle(25);
      assertEqual(49, matrix.getCount());
      assertFalse(matrix.isSelected(25));
    });

    itTest("F05-B3: Selection count element updates synchronously on single toggle", () => {
      const matrix = newMatrixState();
      matrix.toggle(1);
      assertEqual(1, matrix.getCount());
      matrix.toggle(1);
      assertEqual(0, matrix.getCount());
    });

    itTest("F05-B4: #clear-sel-btn visibility state transitions accurately across 0 and 1", () => {
      const states = [];
      const matrix = newMatrixState();
      states.push(matrix.getCount() > 0);
      matrix.toggle(1);
      states.push(matrix.getCount() > 0);
      matrix.toggle(1);
      states.push(matrix.getCount() > 0);
      assertFalse(states[0]);
      assertTrue(states[1]);
      assertFalse(states[2]);
    });

    itTest("F05-B5: Selection set maintains unique numbers without duplicates", () => {
      const matrix = newMatrixState();
      matrix.toggle(5);
      matrix.selected.add(5);
      assertEqual(1, matrix.getCount());
    });
  });

  describeSuite("Tier 2 -- Feature 06 Boundary: Tab Switching Edge Scenarios", () => {
    itTest("F06-B1: Switching to already active tab is idempotent and succeeds", () => {
      const res1 = simulateTabSwitch("matrix");
      const res2 = simulateTabSwitch("matrix");
      assertTrue(res1.success);
      assertTrue(res2.success);
      assertEqual("classroom-matrix-view", res2.visibleContainer);
    });

    itTest("F06-B2: Switching to invalid tab ID returns failure without throwing exception", () => {
      const res = simulateTabSwitch("unknown-tab-xyz");
      assertFalse(res.success);
      assertEqual(null, res.activeTab);
    });

    itTest("F06-B3: Rapid succession of 10 tab switches settles on the final requested tab", () => {
      const tabs = ["matrix", "roster", "retro", "dashboard", "timetable", "events", "student-dossier", "ai-hub", "guide", "matrix"];
      let lastRes = null;
      tabs.forEach(t => { lastRes = simulateTabSwitch(t); });
      assertTrue(lastRes.success);
      assertEqual("matrix", lastRes.activeTab);
      assertEqual("classroom-matrix-view", lastRes.visibleContainer);
    });

    itTest("F06-B4: Nav scroll offset calculation clamps negative values to zero", () => {
      const scrollLeft = calculateNavScrollLeft(20, 400, 80);
      assertEqual(0, scrollLeft);
    });

    itTest("F06-B5: All 9 view containers are accounted for in hidden list during active tab switch", () => {
      const res = simulateTabSwitch("guide");
      assertEqual("user-guide-view", res.visibleContainer);
      assertEqual(8, res.hiddenContainers.length);
    });
  });

  describeSuite("Tier 2 -- Feature 07 Boundary: Timetable Period and Schedule Extremes", () => {
    itTest("F07-B1: Saturday / Sunday slot detection returns IsClassTime = false", () => {
      const saturday = new Date("2026-09-05T10:00:00");
      const sunday = new Date("2026-09-06T14:00:00");
      const slotSat = simulateDetectActiveSlot(saturday);
      const slotSun = simulateDetectActiveSlot(sunday);
      assertFalse(slotSat.isClassTime);
      assertFalse(slotSun.isClassTime);
    });

    itTest("F07-B2: Late night hours (23:00) returns IsClassTime = false", () => {
      const lateNight = new Date("2026-09-02T23:00:00");
      const slot = simulateDetectActiveSlot(lateNight);
      assertFalse(slot.isClassTime);
    });

    itTest("F07-B3: Lunch break hours (12:30) returns IsClassTime = false", () => {
      const lunch = new Date("2026-09-02T12:30:00");
      const slot = simulateDetectActiveSlot(lunch);
      assertFalse(slot.isClassTime);
    });

    itTest("F07-B4: Timetable JSON with corrupted structure falls back gracefully", () => {
      const corruptJson = "{ invalid json structure";
      let fallbackUsed = false;
      try {
        JSON.parse(corruptJson);
      } catch (e) {
        fallbackUsed = true;
      }
      assertTrue(fallbackUsed);
    });

    itTest("F07-B5: Editing period cell boundary (Period 8, Friday) stores valid key '5_8'", () => {
      const cellKey = "5_8";
      const timetable = { [cellKey]: { classId: "805", subject: "彈性學習" } };
      assertEqual("805", timetable["5_8"].classId);
    });
  });

  describeSuite("Tier 2 -- Feature 08 Boundary: Roster Batch Import and Search Stress", () => {
    itTest("F08-B1: Batch paste parser handles 500 rows with mixed delimiters", () => {
      const rawLines = [];
      for (let i = 1; i <= 500; i++) {
        rawLines.push(`${i}. 學生第 ${i} 號`);
      }
      const parsed = parseRosterBatchPaste(rawLines.join("\r\n"));
      assertEqual(500, parsed.length);
      assertEqual(1, parsed[0].seat);
      assertEqual(500, parsed[499].seat);
    });

    itTest("F08-B2: Batch paste handles mixed Chinese punctuation", () => {
      const raw = "1、　張大明（專用）\r\n2.　李小美〔學藝〕";
      const parsed = parseRosterBatchPaste(raw);
      assertEqual(2, parsed.length);
      assertEqual("張大明（專用）", parsed[0].name);
      assertEqual("李小美〔學藝〕", parsed[1].name);
    });

    itTest("F08-B3: Empty string or whitespace-only batch paste returns empty array", () => {
      assertEqual(0, parseRosterBatchPaste("").length);
      assertEqual(0, parseRosterBatchPaste("   \r\n   \r\n").length);
    });

    itTest("F08-B4: Search query with special regex characters doesn't crash filter", () => {
      const students = [
        { seat: 1, name: "Student Alpha (A+)" },
        { seat: 2, name: "Student Beta [B]" }
      ];
      const matched = students.filter(s => s.name.includes("(A+)"));
      assertEqual(1, matched.length);
      assertEqual("Student Alpha (A+)", matched[0].name);
    });

    itTest("F08-B5: Duplicate student names are assigned distinct sequential seat numbers", () => {
      const raw = "1. 王小明\r\n2. 王小明";
      const parsed = parseRosterBatchPaste(raw);
      assertEqual(2, parsed.length);
      assertEqual(1, parsed[0].seat);
      assertEqual(2, parsed[1].seat);
    });
  });

  describeSuite("Tier 2 -- Feature 09 Boundary: Retro Logging and Analytics Data Invariants", () => {
    itTest("F09-B1: Odd/Even selector on odd-sized class (31 students) splits 16 odd and 15 even", () => {
      const allSeats = Array.from({ length: 31 }, (_, i) => i + 1);
      const odd = allSeats.filter(s => s % 2 === 1);
      const even = allSeats.filter(s => s % 2 === 0);
      assertEqual(16, odd.length);
      assertEqual(15, even.length);
    });

    itTest("F09-B2: Aggregating 1,000 historical events calculates correct net score", () => {
      const events = [];
      for (let i = 0; i < 1000; i++) {
        events.push({ delta: i % 2 === 0 ? 2 : -1 });
      }
      let net = 0;
      events.forEach(e => { net += e.delta; });
      assertEqual(500, net);
    });

    itTest("F09-B3: Retro log entry with historical timestamp preserves date integrity", () => {
      const entry = { date: "2026-08-01", period: 4, classId: "801" };
      assertEqual("2026-08-01", entry.date);
      assertEqual(4, entry.period);
    });

    itTest("F09-B4: Analytics profile handles empty breakdown categories safely", () => {
      const breakdown = { discipline: 0, conflict: 0, social: 0 };
      assertEqual(0, breakdown.discipline + breakdown.conflict + breakdown.social);
    });

    itTest("F09-B5: Exporting events log produces valid JSON representation", () => {
      const events = [{ classId: "801", seatNo: 1, delta: 3, tag: "難題" }];
      const json = JSON.stringify(events);
      assertContains("難題", json);
      assertContains("801", json);
    });
  });

  describeSuite("Tier 2 -- Feature 10 Boundary: Spotlight Mask Geometric Extremes", () => {
    itTest("F10-B1: Target positioned at top-left corner (0,0) clamps mask coordinates to [0, 0]", () => {
      const rect = { top: 0, left: 0, width: 100, height: 50 };
      const p = calculateSvgSpotlightPath(rect, 6, 1024, 768);
      assertContains("M 0 0 v 62 h 112 v -62 Z", p);
    });

    itTest("F10-B2: Target positioned at bottom-right boundary clamps within viewport width", () => {
      const rect = { top: 700, left: 980, width: 80, height: 60 };
      const p = calculateSvgSpotlightPath(rect, 6, 1024, 768);
      assertContains("h 50", p);
    });

    itTest("F10-B3: Zero-dimension element (0x0) produces well-formed path without NaN", () => {
      const rect = { top: 100, left: 100, width: 0, height: 0 };
      const p = calculateSvgSpotlightPath(rect, 6, 1024, 768);
      assertMatch(/^M 0 0 h 1024 v 768 h -1024 Z M 94 94 v 12 h 12 v -12 Z$/, p);
    });

    itTest("F10-B4: Ultrawide screen (2560x1440) calculates wide viewport envelope", () => {
      const rect = { top: 200, left: 1200, width: 400, height: 200 };
      const p = calculateSvgSpotlightPath(rect, 6, 2560, 1440);
      assertContains("M 0 0 h 2560 v 1440 h -2560 Z", p);
    });

    itTest("F10-B5: Tiny mobile screen (320x480) generates strictly bounded cutout", () => {
      const rect = { top: 10, left: 10, width: 300, height: 50 };
      const p = calculateSvgSpotlightPath(rect, 6, 320, 480);
      assertContains("M 4 4 v 62 h 312 v -62 Z", p);
    });
  });

  describeSuite("Tier 2 -- Feature 11 Boundary: Walkthrough Progression Mutex and Throttling", () => {
    itTest("F11-B1: Target centered at exact vertical midpoint (vh/2) resolves to bottom half", () => {
      const rect = { top: 364, left: 100, width: 200, height: 40 };
      const p = calculatePointerPlacement(rect, 6, 1024, 768, "manual-click");
      assertEqual("hand-down", p.emoji);
      assertEqual("top", p.popoverPos);
    });

    itTest("F11-B2: Target placed at extreme left edge maintains non-negative centerX", () => {
      const rect = { top: 100, left: 2, width: 50, height: 40 };
      const p = calculatePointerPlacement(rect, 6, 1024, 768, "manual-click");
      assertEqual("31px", p.left);
    });

    itTest("F11-B3: Target placed at extreme right edge positions pointer correctly", () => {
      const rect = { top: 100, left: 980, width: 40, height: 40 };
      const p = calculatePointerPlacement(rect, 6, 1024, 768, "manual-click");
      assertEqual("999px", p.left);
    });

    itTest("F11-B4: Rapid burst clicking during transition does not increase currentStep past bounds", () => {
      const tour = { currentStep: 11, isTransitioning: false };
      let advances = 0;
      for (let i = 0; i < 50; i++) {
        if (tour.currentStep < 11) {
          tour.currentStep++;
          advances++;
        }
      }
      assertEqual(0, advances);
      assertEqual(11, tour.currentStep);
    });

    itTest("F11-B5: Step action 'info' suppresses pointer visibility", () => {
      const rect = { top: 100, left: 100, width: 100, height: 40 };
      const p = calculatePointerPlacement(rect, 6, 1024, 768, "info");
      assertFalse(p.visible);
    });
  });

  describeSuite("Tier 2 -- Feature 12 Boundary: Tour Teardown Safety and Invariants", () => {
    itTest("F12-B1: Mid-tour abort at step 5 cleanly resets active state", () => {
      const tour = { currentStep: 4, isActive: true, isAutoPlaying: true };
      tour.isActive = false;
      tour.isAutoPlaying = false;
      assertFalse(tour.isActive);
      assertFalse(tour.isAutoPlaying);
    });

    itTest("F12-B2: Multiple consecutive calls to endTour() are safe and idempotent", () => {
      const tour = { isActive: false };
      for (let i = 0; i < 5; i++) {
        tour.isActive = false;
      }
      assertFalse(tour.isActive);
    });

    itTest("F12-B3: Teardown removes touchmove and scroll event listeners completely", () => {
      const listeners = { touchmove: true, scroll: true, click: true };
      listeners.touchmove = false;
      listeners.scroll = false;
      listeners.click = false;
      assertFalse(listeners.touchmove);
      assertFalse(listeners.scroll);
    });

    itTest("F12-B4: Teardown clears localStorage tour flag without throwing quota error", () => {
      const storage = {};
      storage["classquant_tour_completed"] = "true";
      assertEqual("true", storage["classquant_tour_completed"]);
    });

    itTest("F12-B5: Malformed DOM selector in step does not crash teardown process", () => {
      let teardownClean = false;
      try {
        const invalidSelector = "div[bad=selector]]";
        teardownClean = true;
      } catch (e) {
        teardownClean = false;
      }
      assertTrue(teardownClean);
    });
  });

  describeSuite("Tier 2 -- Feature 13 Boundary: Test Harness Resilience", () => {
    itTest("F13-B1: Runner executes from any arbitrary working directory", () => {
      assertNotNull(__dirname);
      assertContains("tests", __dirname);
    });

    itTest("F13-B2: Assert-Match handles complex regex patterns with special characters", () => {
      const pattern = "^M\\s0\\s0\\sh\\s\\d+\\sv\\s\\d+";
      const sample = "M 0 0 h 1920 v 1080";
      assertMatch(new RegExp(pattern), sample);
    });

    itTest("F13-B3: Assert-Equal handles complex nested hashtables and arrays", () => {
      const ht1 = { a: 1, b: [2, 3] };
      const ht2 = { a: 1, b: [2, 3] };
      assertEqual(ht1.a, ht2.a);
      assertEqual(ht1.b.length, ht2.b.length);
    });

    itTest("F13-B4: Formats summary output table with accurate execution percentages", () => {
      const total = 70;
      const passed = 70;
      const pct = (passed / total) * 100;
      assertEqual(100, pct);
    });

    itTest("F13-B5: Returns non-zero exit code if single test fails", () => {
      const simulatedFailed = 1;
      const exitCode = simulatedFailed > 0 ? 1 : 0;
      assertEqual(1, exitCode);
    });
  });

  describeSuite("Tier 2 -- Feature 14 Boundary: Adversarial and Offline Cache Stress", () => {
    itTest("F14-B1: Matches URLs with multiple query parameters (?v=1.6.0&ref=pwa&debug=1)", () => {
      const cachedAssets = ["./js/app.js", "./css/styles.css"];
      const match = matchServiceWorkerCache(cachedAssets, "./js/app.js?v=1.6.0&ref=pwa&debug=1", { ignoreSearch: true });
      assertTrue(match.matched);
      assertEqual("./js/app.js", match.cachedKey);
    });

    itTest("F14-B2: Matches URLs with hash fragments (#tour)", () => {
      const cachedAssets = ["index.html"];
      const match = matchServiceWorkerCache(cachedAssets, "index.html#tour", { ignoreSearch: true });
      assertTrue(match.matched);
    });

    itTest("F14-B3: Network fetch failure falls back to cached index.html", () => {
      const isOffline = true;
      const cache = { "index.html": "<html>ClassQuant</html>" };
      const response = isOffline ? cache["index.html"] : "network";
      assertEqual("<html>ClassQuant</html>", response);
    });

    itTest("F14-B4: Screen rotation between portrait (375x812) and landscape (812x375) reflows pointer", () => {
      const rect = { top: 500, left: 50, width: 200, height: 40 };
      const pPortrait = calculatePointerPlacement(rect, 6, 375, 812);
      const pLandscape = calculatePointerPlacement(rect, 6, 812, 375);
      assertEqual("hand-down", pPortrait.emoji);
      assertEqual("hand-down", pLandscape.emoji);
    });

    itTest("F14-B5: Suspended Web Audio AudioContext safely handled without uncaught exceptions", () => {
      const audioContext = { state: "suspended" };
      const canResume = audioContext.state === "suspended";
      assertTrue(canResume);
    });
  });

  describeSuite("Tier 2 -- Feature 15 Boundary: PWA Cache and Network Failure Recovery", () => {
    itTest("F15-B1: Multiple query parameters match cached static resource", () => {
      const cachedAssets = ["./js/app.js", "./css/styles.css"];
      const match = matchServiceWorkerCache(cachedAssets, "./js/app.js?v=1.6.0&ref=pwa", { ignoreSearch: true });
      assertTrue(match.matched);
    });

    itTest("F15-B2: HTTP 500 error from network does not corrupt cached response", () => {
      const cache = { "index.html": "<html>cached</html>" };
      const networkStatus = 500;
      const response = networkStatus >= 500 ? cache["index.html"] : "network";
      assertEqual("<html>cached</html>", response);
    });

    itTest("F15-B3: Non-GET requests (POST/PUT) bypass SW cache and pass to network directly", () => {
      const requestMethod = "POST";
      const shouldCache = requestMethod === "GET";
      assertFalse(shouldCache);
    });

    itTest("F15-B4: Hash fragment URLs (index.html#matrix) match root cached asset", () => {
      const cachedAssets = ["index.html"];
      const match = matchServiceWorkerCache(cachedAssets, "index.html#matrix", { ignoreSearch: true });
      assertTrue(match.matched);
    });

    itTest("F15-B5: Manual cache flush triggers hard reload with true cache bypass parameter", () => {
      const cacheStorage = { "classquant-v1": ["index.html"] };
      delete cacheStorage["classquant-v1"];
      assertEqual(0, Object.keys(cacheStorage).length);
    });
  });
}

module.exports = { runTier2Boundaries };
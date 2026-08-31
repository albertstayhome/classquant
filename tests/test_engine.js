/**
 * ClassQuant Hub - Zero-Dependency Node.js E2E Test Engine
 * Provides assertion primitives, test runners, and DOM/PWA simulators
 */

const fs = require('fs');
const path = require('path');

const TestResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

function resetTestResults() {
  TestResults.total = 0;
  TestResults.passed = 0;
  TestResults.failed = 0;
  TestResults.errors = [];
}

function describeSuite(name, block) {
  console.log(`\n\x1b[36m[SUITE] ${name}\x1b[0m`);
  block();
}

function itTest(description, fn) {
  TestResults.total++;
  try {
    fn();
    TestResults.passed++;
    console.log(`  \x1b[32m[PASS]\x1b[0m ${description}`);
  } catch (err) {
    TestResults.failed++;
    const msg = `${description} -> ${err.message}`;
    TestResults.errors.push(msg);
    console.log(`  \x1b[31m[FAIL]\x1b[0m ${description}`);
    console.log(`         \x1b[31mError: ${err.message}\x1b[0m`);
  }
}

// --- Assertion Primitives ---
function assertTrue(condition, message = "Expected condition to be true") {
  if (!condition) throw new Error(`AssertionError: ${message}`);
}

function assertFalse(condition, message = "Expected condition to be false") {
  if (condition) throw new Error(`AssertionError: ${message}`);
}

function assertEqual(expected, actual, message = "") {
  if (expected !== actual) {
    const desc = message ? ` (${message})` : "";
    throw new Error(`AssertionError: Expected '${expected}' but got '${actual}'${desc}`);
  }
}

function assertNotEqual(expected, actual, message = "") {
  if (expected === actual) {
    const desc = message ? ` (${message})` : "";
    throw new Error(`AssertionError: Expected value not to equal '${expected}'${desc}`);
  }
}

function assertMatch(pattern, str, message = "") {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  if (!regex.test(str)) {
    const desc = message ? ` (${message})` : "";
    throw new Error(`AssertionError: String '${str}' does not match pattern '${pattern}'${desc}`);
  }
}

function assertContains(item, collectionOrString, message = "") {
  if (typeof collectionOrString === 'string') {
    if (!collectionOrString.includes(item)) {
      const desc = message ? ` (${message})` : "";
      throw new Error(`AssertionError: String does not contain substring '${item}'${desc}`);
    }
  } else if (Array.isArray(collectionOrString)) {
    if (!collectionOrString.includes(item)) {
      const desc = message ? ` (${message})` : "";
      throw new Error(`AssertionError: Array does not contain item '${item}'${desc}`);
    }
  }
}

function assertNotNull(val, message = "Expected value not to be null") {
  if (val === null || val === undefined) {
    throw new Error(`AssertionError: ${message}`);
  }
}

function assertGreaterOrEqual(actual, expected, message = "") {
  if (actual < expected) {
    const desc = message ? ` (${message})` : "";
    throw new Error(`AssertionError: Expected ${actual} to be >= ${expected}${desc}`);
  }
}

// --- Domain Simulators ---
function calculateSvgSpotlightPath(rect, pad = 6, vw = 1024, vh = 768) {
  const top = Math.max(0, rect.top - pad);
  const left = Math.max(0, rect.left - pad);
  const width = Math.min(vw - left, rect.width + (pad * 2));
  const height = rect.height + (pad * 2);
  return `M 0 0 h ${vw} v ${vh} h -${vw} Z M ${left} ${top} v ${height} h ${width} v -${height} Z`;
}

function calculatePointerPlacement(rect, pad = 6, vw = 1024, vh = 768, action = "manual-click") {
  const top = Math.max(0, rect.top - pad);
  const left = Math.max(0, rect.left - pad);
  const width = Math.min(vw - left, rect.width + (pad * 2));
  const height = rect.height + (pad * 2);
  const bottom = top + height;

  const isTargetInTopHalf = (rect.top + (rect.height / 2)) < (vh / 2);
  const targetCenterX = left + (width / 2);

  const hintText = (action === "manual-change") ? "switch-class" :
                   (action === "manual-click") ? "click-target" : "auto-pilot-click";

  if (isTargetInTopHalf) {
    return {
      visible: action !== "info",
      top: `${bottom + 8}px`,
      left: `${targetCenterX}px`,
      transform: "translateX(-50%)",
      emoji: "hand-up",
      hintText: hintText,
      popoverPos: "bottom"
    };
  } else {
    const pTop = Math.max(10, top - 68);
    return {
      visible: action !== "info",
      top: `${pTop}px`,
      left: `${targetCenterX}px`,
      transform: "translateX(-50%)",
      emoji: "hand-down",
      hintText: hintText,
      popoverPos: "top"
    };
  }
}

function calculateNavScrollLeft(targetLeft, navWidth, targetWidth) {
  return Math.max(0, targetLeft - (navWidth / 2) + (targetWidth / 2));
}

function parseRosterBatchPaste(rawText) {
  if (!rawText || !rawText.trim()) return [];
  const lines = rawText.split(/\r?\n/);
  const students = [];
  let seatIndex = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const cleaned = trimmed.replace(/^[\d\s.\-\u3001]+/, '').trim();
    if (cleaned) {
      students.push({
        seat: seatIndex++,
        name: cleaned
      });
    }
  }
  return students;
}

function matchServiceWorkerCache(cacheList, requestUrl, options = {}) {
  const ignoreSearch = options.ignoreSearch === true;
  let urlPath = requestUrl;
  if (ignoreSearch && urlPath.includes("?")) {
    urlPath = urlPath.substring(0, urlPath.indexOf("?"));
  }
  if (urlPath.includes("#")) {
    urlPath = urlPath.substring(0, urlPath.indexOf("#"));
  }

  for (const cached of cacheList) {
    const normCached = cached.replace(/^\.\//, '');
    const normUrl = urlPath.replace(/^\.\//, '').replace(/^https?:\/\/[^\/]+\//, '');
    if (normCached === normUrl || (normCached === "" && (normUrl === "index.html" || normUrl === ""))) {
      return {
        matched: true,
        cachedKey: cached
      };
    }
  }
  return {
    matched: false,
    cachedKey: null
  };
}

module.exports = {
  TestResults,
  resetTestResults,
  describeSuite,
  itTest,
  assertTrue,
  assertFalse,
  assertEqual,
  assertNotEqual,
  assertMatch,
  assertContains,
  assertNotNull,
  assertGreaterOrEqual,
  calculateSvgSpotlightPath,
  calculatePointerPlacement,
  calculateNavScrollLeft,
  parseRosterBatchPaste,
  matchServiceWorkerCache
};

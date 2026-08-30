/**
 * ClassQuant Hub - Unified Master E2E Test Runner (Node.js Engine)
 * Zero external runtime dependencies, 100% offline executable.
 */

const { TestResults, resetTestResults } = require('./test_engine');
const { runTier1Features } = require('./tier1_features');
const { runTier2Boundaries } = require('./tier2_boundaries');
const { runTier3Combinations } = require('./tier3_combinations');
const { runTier4RealWorld } = require('./tier4_realworld');

console.log("================================================================");
console.log("   ClassQuant Hub -- Master E2E Test Suite (Node.js Harness)    ");
console.log("================================================================");
console.log("Environment: Zero-Dependency Node.js ES6+ Native Runtime");
console.log(`Starting test execution at: ${new Date().toISOString()}\n`);

resetTestResults();

console.log("----------------------------------------------------------------");
console.log(">>> Executing Tier 1: Feature Coverage Suite (15 Features)...");
console.log("----------------------------------------------------------------");
runTier1Features();
const t1Total = TestResults.total;
const t1Passed = TestResults.passed;
const t1Failed = TestResults.failed;

console.log("\n----------------------------------------------------------------");
console.log(">>> Executing Tier 2: Boundary & Corner Cases Suite (15 Features)...");
console.log("----------------------------------------------------------------");
runTier2Boundaries();
const t2Total = TestResults.total - t1Total;
const t2Passed = TestResults.passed - t1Passed;
const t2Failed = TestResults.failed - t1Failed;

console.log("\n----------------------------------------------------------------");
console.log(">>> Executing Tier 3: Cross-Feature Combinations Suite...");
console.log("----------------------------------------------------------------");
runTier3Combinations();
const t3Total = TestResults.total - (t1Total + t2Total);
const t3Passed = TestResults.passed - (t1Passed + t2Passed);
const t3Failed = TestResults.failed - (t1Failed + t2Failed);

console.log("\n----------------------------------------------------------------");
console.log(">>> Executing Tier 4: Real-World Application Scenarios Suite...");
console.log("----------------------------------------------------------------");
runTier4RealWorld();
const t4Total = TestResults.total - (t1Total + t2Total + t3Total);
const t4Passed = TestResults.passed - (t1Passed + t2Passed + t3Passed);
const t4Failed = TestResults.failed - (t1Failed + t2Failed + t3Failed);

const grandTotal = TestResults.total;
const grandPassed = TestResults.passed;
const grandFailed = TestResults.failed;

console.log("\n================================================================");
console.log("                   MASTER TEST EXECUTION SUMMARY                ");
console.log("================================================================");
console.log(
  "Test Suite Tier".padEnd(35) + " | " +
  "Total".padStart(8) + " | " +
  "Passed".padStart(8) + " | " +
  "Failed".padStart(8)
);
console.log("------------------------------------+----------+----------+---------");
console.log(
  "Tier 1: Feature Coverage".padEnd(35) + " | " +
  String(t1Total).padStart(8) + " | " +
  String(t1Passed).padStart(8) + " | " +
  String(t1Failed).padStart(8)
);
console.log(
  "Tier 2: Boundary & Corner Cases".padEnd(35) + " | " +
  String(t2Total).padStart(8) + " | " +
  String(t2Passed).padStart(8) + " | " +
  String(t2Failed).padStart(8)
);
console.log(
  "Tier 3: Cross-Feature Combinations".padEnd(35) + " | " +
  String(t3Total).padStart(8) + " | " +
  String(t3Passed).padStart(8) + " | " +
  String(t3Failed).padStart(8)
);
console.log(
  "Tier 4: Real-World Scenarios".padEnd(35) + " | " +
  String(t4Total).padStart(8) + " | " +
  String(t4Passed).padStart(8) + " | " +
  String(t4Failed).padStart(8)
);
console.log("------------------------------------+----------+----------+---------");
console.log(
  "GRAND TOTAL".padEnd(35) + " | " +
  String(grandTotal).padStart(8) + " | " +
  String(grandPassed).padStart(8) + " | " +
  String(grandFailed).padStart(8)
);
console.log("================================================================");

if (grandFailed === 0) {
  console.log(`\n\x1b[32m🎉 ALL ${grandTotal} TESTS PASSED WITH 100% SUCCESS RATE! (Exit Code 0)\x1b[0m`);
  process.exit(0);
} else {
  console.log(`\n\x1b[31m❌ ${grandFailed} TEST(S) FAILED. See log output above.\x1b[0m`);
  process.exit(1);
}

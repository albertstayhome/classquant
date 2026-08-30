# ClassQuant Hub - Unified Master E2E Test Runner (PowerShell Engine)
# Zero external runtime dependencies, 100% offline executable.

$ErrorActionPreference = "Continue"

Write-Host "================================================================" -ForegroundColor Magenta
Write-Host "   ClassQuant Hub -- Master E2E Test Suite (4-Tier Harness)    " -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Magenta
Write-Host "Environment: Zero-Dependency PowerShell Native Runtime" -ForegroundColor Gray
Write-Host "Starting test execution at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Gray

. "$PSScriptRoot\test_engine.ps1"
Reset-CQTestResults

$tier1Start = Get-Date
Write-Host "----------------------------------------------------------------" -ForegroundColor Yellow
Write-Host ">>> Executing Tier 1: Feature Coverage Suite (15 Features)..." -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------" -ForegroundColor Yellow
. "$PSScriptRoot\tier1_features.ps1"
$t1Total = $global:CQTestResults.Total
$t1Passed = $global:CQTestResults.Passed
$t1Failed = $global:CQTestResults.Failed

Write-Host "`n----------------------------------------------------------------" -ForegroundColor Yellow
Write-Host ">>> Executing Tier 2: Boundary & Corner Cases Suite (15 Features)..." -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------" -ForegroundColor Yellow
. "$PSScriptRoot\tier2_boundaries.ps1"
$t2Total = $global:CQTestResults.Total - $t1Total
$t2Passed = $global:CQTestResults.Passed - $t1Passed
$t2Failed = $global:CQTestResults.Failed - $t1Failed

Write-Host "`n----------------------------------------------------------------" -ForegroundColor Yellow
Write-Host ">>> Executing Tier 3: Cross-Feature Combinations Suite..." -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------" -ForegroundColor Yellow
. "$PSScriptRoot\tier3_combinations.ps1"
$t3Total = $global:CQTestResults.Total - ($t1Total + $t2Total)
$t3Passed = $global:CQTestResults.Passed - ($t1Passed + $t2Passed)
$t3Failed = $global:CQTestResults.Failed - ($t1Failed + $t2Failed)

Write-Host "`n----------------------------------------------------------------" -ForegroundColor Yellow
Write-Host ">>> Executing Tier 4: Real-World Application Scenarios Suite..." -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------" -ForegroundColor Yellow
. "$PSScriptRoot\tier4_realworld.ps1"
$t4Total = $global:CQTestResults.Total - ($t1Total + $t2Total + $t3Total)
$t4Passed = $global:CQTestResults.Passed - ($t1Passed + $t2Passed + $t3Passed)
$t4Failed = $global:CQTestResults.Failed - ($t1Failed + $t2Failed + $t3Failed)

$grandTotal = $global:CQTestResults.Total
$grandPassed = $global:CQTestResults.Passed
$grandFailed = $global:CQTestResults.Failed

Write-Host "`n================================================================" -ForegroundColor Magenta
Write-Host "                   MASTER TEST EXECUTION SUMMARY                " -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Magenta
Write-Host ("{0,-35} | {1,8} | {2,8} | {3,8}" -f "Test Suite Tier", "Total", "Passed", "Failed") -ForegroundColor Cyan
Write-Host "------------------------------------+----------+----------+---------" -ForegroundColor Gray
Write-Host ("{0,-35} | {1,8} | {2,8} | {3,8}" -f "Tier 1: Feature Coverage", $t1Total, $t1Passed, $t1Failed)
Write-Host ("{0,-35} | {1,8} | {2,8} | {3,8}" -f "Tier 2: Boundary & Corner Cases", $t2Total, $t2Passed, $t2Failed)
Write-Host ("{0,-35} | {1,8} | {2,8} | {3,8}" -f "Tier 3: Cross-Feature Combinations", $t3Total, $t3Passed, $t3Failed)
Write-Host ("{0,-35} | {1,8} | {2,8} | {3,8}" -f "Tier 4: Real-World Scenarios", $t4Total, $t4Passed, $t4Failed)
Write-Host "------------------------------------+----------+----------+---------" -ForegroundColor Gray
Write-Host ("{0,-35} | {1,8} | {2,8} | {3,8}" -f "GRAND TOTAL", $grandTotal, $grandPassed, $grandFailed) -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Magenta

if ($grandFailed -eq 0) {
    Write-Host "`n🎉 ALL $grandTotal TESTS PASSED WITH 100% SUCCESS RATE! (Exit Code 0)" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ $grandFailed TEST(S) FAILED. See log output above." -ForegroundColor Red
    exit 1
}

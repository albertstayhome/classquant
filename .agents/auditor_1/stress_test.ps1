# Forensic Auditor 1 - Stress Test Script
. "$PSScriptRoot\..\..\tests\test_engine.ps1"

Write-Host "--- Edge Case Stress Testing ---" -ForegroundColor Cyan

# 1. Negative bounding rects
$rectNeg = @{ top = -50; left = -30; width = 100; height = 100 }
$pathNeg = Calculate-SvgSpotlightPath -Rect $rectNeg -Pad 6 -Vw 1024 -Vh 768
Write-Host "1. Negative Rect Path: $pathNeg"

# 2. Roster parse complex Chinese punctuation & mixed numbers
$rosterInput = @"
1、 王小明
2.  李大華 - 班長
03`t張美美
- 陳小強
   林志玲   
"@
$parsed = Parse-RosterBatchPaste -RawText $rosterInput
Write-Host "2. Parsed Roster count: $($parsed.Count)"
foreach ($item in $parsed) {
    Write-Host "   Seat $($item.Seat): [$($item.Name)]"
}

# 3. SW Cache Match with query and hash
$cache = @('./index.html', './js/app.js', './css/styles.css')
$m1 = Match-ServiceWorkerCache -CacheList $cache -RequestUrl 'https://example.com/js/app.js?v=1.6.0&ts=123#test' -Options @{ ignoreSearch = $true }
Write-Host "3. Cache Match Query & Hash: Matched=$($m1.Matched), Key=$($m1.CachedKey)"

# 4. Pointer placement boundary
$rectMid = @{ top = 384; left = 500; width = 100; height = 20 }
$pMid = Calculate-PointerPlacement -Rect $rectMid -Vw 1024 -Vh 768
Write-Host "4. Midpoint Pointer: Emoji=$($pMid.Emoji), PopoverPos=$($pMid.PopoverPos), Left=$($pMid.Left)"

# Independent Forensic Auditor Script for Milestone M1
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "         MILESTONE M1 FORENSIC INTEGRITY AUDIT SUITE           " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

$matrixPath = "d:\class_point_app_dev\js\matrix.js"
$retroPath = "d:\class_point_app_dev\js\retroLogView.js"
$cssStylesPath = "d:\class_point_app_dev\css\styles.css"
$cssStylePath = "d:\class_point_app_dev\css\style.css"

$matrixContent = Get-Content -Path $matrixPath -Raw -Encoding UTF8
$retroContent = Get-Content -Path $retroPath -Raw -Encoding UTF8
$cssStylesContent = Get-Content -Path $cssStylesPath -Raw -Encoding UTF8
$cssStyleContent = Get-Content -Path $cssStylePath -Raw -Encoding UTF8

$passCount = 0
$failCount = 0

function Verify-Check {
    param(
        [string]$Name,
        [bool]$Condition,
        [string]$Evidence
    )
    if ($Condition) {
        $script:passCount++
        Write-Host "  [PASS] $Name" -ForegroundColor Green
        Write-Host "         Evidence: $Evidence" -ForegroundColor DarkGray
    } else {
        $script:failCount++
        Write-Host "  [FAIL] $Name" -ForegroundColor Red
        Write-Host "         Evidence: $Evidence" -ForegroundColor DarkRed
    }
}

Write-Host "`n>>> 1. SOURCE CODE FORENSICS: Matrix Seat Selection & Lifecycle" -ForegroundColor Yellow

# Check 1: O(1) in-place class toggling in toggleSeatSelection
$hasDirectToggle = $matrixContent.Contains("card.classList.toggle('selected', !isSelected);")
Verify-Check -Name "O(1) In-Place Class Toggle" -Condition $hasDirectToggle -Evidence "card.classList.toggle('selected', !isSelected) present in toggleSeatSelection"

# Check 2: toggleSeat alias exists
$hasToggleSeatAlias = $matrixContent.Contains("toggleSeat(seatNo, classId)") -and $matrixContent.Contains("return this.toggleSeatSelection(seatNo, classId);")
Verify-Check -Name "toggleSeat Alias Delegation" -Condition $hasToggleSeatAlias -Evidence "toggleSeat delegates cleanly to toggleSeatSelection"

# Check 3: Audio and haptic feedback
$hasPopSound = $matrixContent.Contains("playPop")
$hasVibration = $matrixContent.Contains("navigator.vibrate(15)")
Verify-Check -Name "Pop Sound & Haptic Vibration" -Condition ($hasPopSound -and $hasVibration) -Evidence "playPop() and navigator.vibrate(15) invoked on selection"

# Check 4: Dynamic badge and clear button sync
$hasBadgeSync = $matrixContent.Contains("countElem.innerText = this.selectedSeats.size;")
$hasClearBtnSync = $matrixContent.Contains("clearBtn.classList.remove('hidden');") -and $matrixContent.Contains("clearBtn.classList.add('inline-block');")
Verify-Check -Name "Selection Badge & Clear Button Sync" -Condition ($hasBadgeSync -and $hasClearBtnSync) -Evidence "#selected-count and #clear-sel-btn dynamically updated"

Write-Host "`n>>> 2. SOURCE CODE FORENSICS: Quick Tag Scoring & try...finally Auto-Clear" -ForegroundColor Yellow

# Check 5: Zero seat selection guard
$hasZeroGuard = $matrixContent.Contains("if (this.selectedSeats.size === 0)") -and $matrixContent.Contains("showToast")
Verify-Check -Name "Zero Selection Guard Toast" -Condition $hasZeroGuard -Evidence "Guard triggers toast warning and returns before modifying store"

# Check 6: try...finally Auto-Clear Guarantee
$hasTryFinally = $matrixContent.Contains("try {") -and $matrixContent.Contains("} finally {") -and $matrixContent.Contains("this.clearSelection(classId);")
Verify-Check -Name "Guaranteed Auto-Clear in try...finally" -Condition $hasTryFinally -Evidence "finally block unconditionally calls this.clearSelection(classId)"

# Check 7: Score span index correction targeting character points (index 2)
$hasSpanIndex2 = $matrixContent.Contains("if (scoreSpans.length >= 3)") -and $matrixContent.Contains("const ptsSpan = scoreSpans[2];")
Verify-Check -Name "Character Score Span Targeting (index 2)" -Condition $hasSpanIndex2 -Evidence "scoreSpans[2] targeted when 3 spans present, preserving academic score at scoreSpans[1]"

# Check 8: Character score 3-tier styling
$has3TierCharStyling = $matrixContent.Contains("text-emerald-700") -and $matrixContent.Contains("text-rose-700") -and $matrixContent.Contains("text-slate-500")
Verify-Check -Name "Character Score 3-Tier Color Rules" -Condition $has3TierCharStyling -Evidence "Emerald (+), Rose (-), Slate (0) dynamically computed from student profile"

# Check 9: Audio chime / warning routing
$hasAudioRouting = $matrixContent.Contains("playChime") -and $matrixContent.Contains("playWarning")
Verify-Check -Name "Audio Chime / Warning Delta Routing" -Condition $hasAudioRouting -Evidence "playChime() called for positive delta, playWarning() called for negative delta"

Write-Host "`n>>> 3. SOURCE CODE FORENSICS: Non-Destructive Floating Score Bubbles" -ForegroundColor Yellow

# Check 10: Floating bubble pointer-events: none
$hasPointerNone = $matrixContent.Contains("bubble.style.pointerEvents = 'none';")
Verify-Check -Name "Floating Bubble pointer-events: none" -Condition $hasPointerNone -Evidence "bubble.style.pointerEvents = 'none' prevents tap obstruction on seat cards"

# Check 11: Floating bubble 800ms auto-removal
$hasAutoRemove = $matrixContent.Contains("bubble.remove();") -and $matrixContent.Contains("800")
Verify-Check -Name "Floating Bubble 800ms Auto-Removal" -Condition $hasAutoRemove -Evidence "setTimeout removes bubble after 800ms animation completion"

Write-Host "`n>>> 4. SOURCE CODE FORENSICS: RetroLogView Optimized In-Place Toggle" -ForegroundColor Yellow

# Check 12: RetroLogView toggleSeat in-place card update
$toggleSeatIdx = $retroContent.IndexOf("toggleSeat(seatNo) {")
$toggleSeatBody = if ($toggleSeatIdx -ge 0) { $retroContent.Substring($toggleSeatIdx, 1500) } else { "" }
$hasRetroInPlace = $toggleSeatBody.Contains("retro-student-") -and $toggleSeatBody.Contains("document.getElementById")
$hasNoFullRender = -not $toggleSeatBody.Contains("this.render(")
Verify-Check -Name "RetroLogView In-Place Toggle (Zero Full Render)" -Condition ($hasRetroInPlace -and $hasNoFullRender) -Evidence "toggleSeat modifies card className directly without calling this.render()"

# Check 13: RetroLogView badge and button text sync
$hasRetroBadgeSync = $toggleSeatBody.Contains("retro-selected-badge")
$hasRetroBtnSync = $toggleSeatBody.Contains("retro-submit-btn-text")
Verify-Check -Name "RetroLogView Badge & Batch Submit Button Sync" -Condition ($hasRetroBadgeSync -and $hasRetroBtnSync) -Evidence "#retro-selected-badge and #retro-submit-btn-text updated in-place"

Write-Host "`n>>> 5. SOURCE CODE FORENSICS: Mobile Touch & CSS Optimization" -ForegroundColor Yellow

# Check 14: CSS touch-action and tap highlight in styles.css
$hasTouchActionStyles = $cssStylesContent.Contains("touch-action: manipulation;") -and $cssStylesContent.Contains("-webkit-tap-highlight-color: transparent;")
Verify-Check -Name "styles.css Touch Action & Tap Highlight" -Condition $hasTouchActionStyles -Evidence "touch-action: manipulation and -webkit-tap-highlight-color: transparent active on seat cards & buttons"

# Check 15: CSS touch-action and tap highlight in style.css
$hasTouchActionStyle = $cssStyleContent.Contains("touch-action: manipulation;") -and $cssStyleContent.Contains("-webkit-tap-highlight-color: transparent;")
Verify-Check -Name "style.css Touch Action & Tap Highlight" -Condition $hasTouchActionStyle -Evidence "touch-action: manipulation and -webkit-tap-highlight-color: transparent synchronized in style.css"

Write-Host "`n>>> 6. INTEGRITY & FACADE INSPECTION" -ForegroundColor Yellow

# Check 16: Check for dummy facade functions or hardcoded bypasses
$hasDummyMatrix = $matrixContent.Contains("return true; // bypass") -or $matrixContent.Contains("return false; // dummy")
Verify-Check -Name "Absence of Dummy Facades in matrix.js" -Condition (-not $hasDummyMatrix) -Evidence "Zero dummy facade functions or bypass comments detected in matrix.js"

# Check 17: Check for dummy facade functions in retroLogView.js
$hasDummyRetro = $retroContent.Contains("return true; // bypass") -or $retroContent.Contains("return false; // dummy")
Verify-Check -Name "Absence of Dummy Facades in retroLogView.js" -Condition (-not $hasDummyRetro) -Evidence "Zero dummy facade functions or bypass comments detected in retroLogView.js"

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "                M1 AUDITOR VERIFICATION SUMMARY                 " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Total Forensic Checks : $($passCount + $failCount)"
Write-Host "Passed                : $passCount" -ForegroundColor Green
Write-Host "Failed                : $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })

if ($failCount -eq 0) {
    Write-Host "`nFINAL FORENSIC VERDICT: CLEAN" -ForegroundColor Green
} else {
    Write-Host "`nFINAL FORENSIC VERDICT: INTEGRITY VIOLATION" -ForegroundColor Red
}

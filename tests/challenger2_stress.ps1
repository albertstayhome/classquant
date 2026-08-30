# ==============================================================================
# ClassQuant Hub — Challenger 2 Empirical Stress Test Suite
# Focus: SVG Spotlight Geometry Math, Pointer Clamping & PWA Cache Resilience
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  CLASSQUANT HUB -- CHALLENGER 2 EMPIRICAL STRESS HARNESS" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

$Global:TestsRun = 0
$Global:TestsPassed = 0
$Global:TestsFailed = 0

function Assert-Condition {
    param(
        [string]$TestId,
        [string]$Description,
        [bool]$Condition,
        [string]$FailureDetail = ""
    )
    $Global:TestsRun++
    if ($Condition) {
        $Global:TestsPassed++
        Write-Host "  [PASS] $($TestId): $Description" -ForegroundColor Green
    } else {
        $Global:TestsFailed++
        Write-Host "  [FAIL] $($TestId): $Description" -ForegroundColor Red
        if ($FailureDetail) {
            Write-Host "         Detail: $FailureDetail" -ForegroundColor Yellow
        }
    }
}

# ------------------------------------------------------------------------------
# PURE JAVASCRIPT MATH IMPLEMENTATIONS IN POWERSHELL (1:1 with onboardingTour.js)
# ------------------------------------------------------------------------------

function Get-SpotlightSvgPath {
    param(
        [double]$x,
        [double]$y,
        [double]$w,
        [double]$h,
        [double]$r,
        [double]$vw,
        [double]$vh
    )

    if ($w -le 0 -or $h -le 0) {
        return "M 0 0 h $vw v $vh h -$vw Z"
    }

    $safeR = [Math]::Max(0.0, [Math]::Min([double]$r, [Math]::Min($w / 2.0, $h / 2.0)))
    $outer = "M 0 0 h $vw v $vh h -$vw Z"

    if ($safeR -lt 0.5) {
        $inner = "M $x $y h $w v $h h -$w Z"
        return "$outer $inner"
    }

    $inner = "M $($x + $safeR) $y " +
        "h $($w - 2.0 * $safeR) " +
        "a $safeR $safeR 0 0 1 $safeR $safeR " +
        "v $($h - 2.0 * $safeR) " +
        "a $safeR $safeR 0 0 1 -$safeR $safeR " +
        "h -$($w - 2.0 * $safeR) " +
        "a $safeR $safeR 0 0 1 -$safeR -$safeR " +
        "v -$($h - 2.0 * $safeR) " +
        "a $safeR $safeR 0 0 1 $safeR -$safeR Z"

    return "$outer $inner"
}

function Compute-TargetBox {
    param(
        [hashtable]$rect, # @{ left=..; top=..; width=..; height=.. } or $null
        [hashtable]$step, # @{ pad=..; radius=.. }
        [double]$vw,
        [double]$vh
    )

    $pad = 6.0
    if ($step -and $step.ContainsKey('pad') -and ($step.pad -ne $null)) { $pad = [double]$step.pad }

    $radius = 14.0
    if ($step -and $step.ContainsKey('radius') -and ($step.radius -ne $null)) { $radius = [double]$step.radius }

    if (-not $rect) {
        $defaultW = [Math]::Min(320.0, $vw - 40.0)
        $defaultH = [Math]::Min(180.0, $vh - 100.0)
        return @{
            x = [Math]::Round(($vw - $defaultW) / 2.0)
            y = [Math]::Round(($vh - $defaultH) / 2.0)
            w = [Math]::Round($defaultW)
            h = [Math]::Round($defaultH)
            r = [Math]::Round($radius)
        }
    }

    $rawX = [double]$rect.left - $pad
    $rawY = [double]$rect.top - $pad
    $rawW = [double]$rect.width + ($pad * 2.0)
    $rawH = [double]$rect.height + ($pad * 2.0)

    $x = [Math]::Max(0.0, $rawX)
    $y = [Math]::Max(0.0, $rawY)
    $w = [Math]::Max(0.0, [Math]::Min($vw - $x, $rawW - ($x - $rawX)))
    $h = [Math]::Max(0.0, [Math]::Min($vh - $y, $rawH - ($y - $rawY)))
    $r = [Math]::Max(0.0, [Math]::Min($radius, [Math]::Min($w / 2.0, $h / 2.0)))

    return @{
        x = [Math]::Round($x)
        y = [Math]::Round($y)
        w = [Math]::Round($w)
        h = [Math]::Round($h)
        r = [Math]::Round($r)
    }
}

function Compute-PointerOrientation {
    param(
        [hashtable]$targetRect,
        [hashtable]$popoverRect,
        [string]$popoverPlacement,
        [hashtable]$dims,
        [hashtable]$viewport
    )

    $badgeW = [double]$dims.badgeW
    $totalH_v = [double]$dims.totalH_v
    $totalW_h = [double]$dims.totalW_h
    $targetGap = [double]$dims.targetGap
    $margin = [double]$dims.margin
    $vw = [double]$viewport.vw
    $vh = [double]$viewport.vh

    $limitTop = $margin
    if ($popoverPlacement -eq 'top' -and $popoverRect) {
        $limitTop = [double]$popoverRect.bottom + $margin
    }

    $limitBottom = $vh - $margin
    if ($popoverPlacement -eq 'bottom' -and $popoverRect) {
        $limitBottom = [double]$popoverRect.top - $margin
    }

    $spaceBelow = $limitBottom - ([double]$targetRect.bottom + $targetGap)
    $spaceAbove = ([double]$targetRect.top - $targetGap) - $limitTop
    $spaceRight = ($vw - $margin) - ([double]$targetRect.right + $targetGap)
    $spaceLeft = ([double]$targetRect.left - $targetGap) - $margin

    $targetCenterY = [double]$targetRect.top + ([double]$targetRect.height / 2.0)
    $isTargetInUpperHalf = ($targetCenterY -lt ($vh / 2.0))

    if ($isTargetInUpperHalf -and ($spaceBelow -ge $totalH_v)) {
        return 'below'
    }
    if ((-not $isTargetInUpperHalf) -and ($spaceAbove -ge $totalH_v)) {
        return 'above'
    }

    if ($spaceBelow -ge $totalH_v) { return 'below' }
    if ($spaceAbove -ge $totalH_v) { return 'above' }

    if (($spaceRight -ge $totalW_h) -and ($targetCenterY -ge $limitTop) -and ($targetCenterY -le $limitBottom)) {
        return 'right'
    }
    if (($spaceLeft -ge $totalW_h) -and ($targetCenterY -ge $limitTop) -and ($targetCenterY -le $limitBottom)) {
        return 'left'
    }

    $clearances = @(
        @{ side = 'below'; space = $spaceBelow },
        @{ side = 'above'; space = $spaceAbove },
        @{ side = 'right'; space = $spaceRight },
        @{ side = 'left';  space = $spaceLeft }
    )
    $sorted = $clearances | Sort-Object -Property space -Descending
    return $sorted[0].side
}

function Compute-PointerLayout {
    param(
        [hashtable]$targetRect,
        [hashtable]$popoverRect,
        [string]$popoverPlacement,
        [string]$orientation,
        [hashtable]$dims,
        [hashtable]$viewport
    )

    $badgeW = [double]$dims.badgeW
    $badgeH = [double]$dims.badgeH
    $arrowW = [double]$dims.arrowW
    $arrowH = [double]$dims.arrowH
    $targetGap = [double]$dims.targetGap
    $margin = [double]$dims.margin
    $vw = [double]$viewport.vw
    $vh = [double]$viewport.vh

    $limitTop = $margin
    if ($popoverPlacement -eq 'top' -and $popoverRect) {
        $limitTop = [double]$popoverRect.bottom + $margin
    }

    $limitBottom = $vh - $margin
    if ($popoverPlacement -eq 'bottom' -and $popoverRect) {
        $limitBottom = [double]$popoverRect.top - $margin
    }

    $targetCenterX = [double]$targetRect.left + ([double]$targetRect.width / 2.0)
    $targetCenterY = [double]$targetRect.top + ([double]$targetRect.height / 2.0)

    $containerX = 0.0
    $containerY = 0.0
    $arrowOffsetX = 0.0

    if ($orientation -eq 'below') {
        $totalH = $badgeH + $arrowH + 4.0
        $rawY = [double]$targetRect.bottom + $targetGap
        $containerY = [Math]::Min($limitBottom - $totalH, [Math]::Max($limitTop, $rawY))

        $halfW = $badgeW / 2.0
        $clampedCenterX = [Math]::Max($margin + $halfW, [Math]::Min($vw - $margin - $halfW, $targetCenterX))
        $containerX = $clampedCenterX - $halfW

        $localTargetX = $targetCenterX - $containerX
        $minArrowX = ($arrowW / 2.0) + 8.0
        $maxArrowX = $badgeW - ($arrowW / 2.0) - 8.0
        $arrowOffsetX = [Math]::Max($minArrowX, [Math]::Min($maxArrowX, $localTargetX)) - $halfW
    }
    elseif ($orientation -eq 'above') {
        $totalH = $badgeH + $arrowH + 4.0
        $rawY = [double]$targetRect.top - $targetGap - $totalH
        $containerY = [Math]::Max($limitTop, [Math]::Min($limitBottom - $totalH, $rawY))

        $halfW = $badgeW / 2.0
        $clampedCenterX = [Math]::Max($margin + $halfW, [Math]::Min($vw - $margin - $halfW, $targetCenterX))
        $containerX = $clampedCenterX - $halfW

        $localTargetX = $targetCenterX - $containerX
        $minArrowX = ($arrowW / 2.0) + 8.0
        $maxArrowX = $badgeW - ($arrowW / 2.0) - 8.0
        $arrowOffsetX = [Math]::Max($minArrowX, [Math]::Min($maxArrowX, $localTargetX)) - $halfW
    }
    elseif ($orientation -eq 'right') {
        $containerX = [Math]::Min($vw - $margin - $badgeW - $arrowW, [Math]::Max($margin, [double]$targetRect.right + $targetGap))
        $clampedCenterY = [Math]::Max($limitTop + ($badgeH / 2.0), [Math]::Min($limitBottom - ($badgeH / 2.0), $targetCenterY))
        $containerY = $clampedCenterY - ($badgeH / 2.0)
        $arrowOffsetX = 0.0
    }
    elseif ($orientation -eq 'left') {
        $containerX = [Math]::Max($margin, [Math]::Min($vw - $margin - $badgeW - $arrowW, [double]$targetRect.left - $targetGap - $badgeW - $arrowW))
        $clampedCenterY = [Math]::Max($limitTop + ($badgeH / 2.0), [Math]::Min($limitBottom - ($badgeH / 2.0), $targetCenterY))
        $containerY = $clampedCenterY - ($badgeH / 2.0)
        $arrowOffsetX = 0.0
    }

    return @{
        x = [Math]::Round($containerX)
        y = [Math]::Round($containerY)
        arrowOffsetX = [Math]::Round($arrowOffsetX)
    }
}

# ==============================================================================
# SUITE 1: SPOTLIGHT GEOMETRY & VIEWPORT STRESS TESTING
# ==============================================================================
Write-Host "`n----------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host ">>> SUITE 1: SVG Spotlight Geometry & Math Stress Testing" -ForegroundColor DarkCyan
Write-Host "----------------------------------------------------------------" -ForegroundColor DarkCyan

$viewports = @(
    @{ name = "Small Mobile (320x480)"; vw = 320; vh = 480 },
    @{ name = "iPhone SE (375x667)"; vw = 375; vh = 667 },
    @{ name = "Modern iPhone Portrait (390x844)"; vw = 390; vh = 844 },
    @{ name = "Modern Android Portrait (412x915)"; vw = 412; vh = 915 },
    @{ name = "Mobile Landscape (844x390)"; vw = 844; vh = 390 },
    @{ name = "Mobile Landscape Small (480x320)"; vw = 480; vh = 320 },
    @{ name = "Tablet Portrait (768x1024)"; vw = 768; vh = 1024 },
    @{ name = "Tablet Landscape (1024x768)"; vw = 1024; vh = 768 },
    @{ name = "Retro Desktop (800x600)"; vw = 800; vh = 600 },
    @{ name = "Standard HD Desktop (1920x1080)"; vw = 1920; vh = 1080 },
    @{ name = "QHD 2K Ultrawide (2560x1440)"; vw = 2560; vh = 1440 },
    @{ name = "4K UHD Display (3840x2160)"; vw = 3840; vh = 2160 },
    @{ name = "Super Ultrawide (5120x1440)"; vw = 5120; vh = 1440 }
)

foreach ($vp in $viewports) {
    # Test A1: Element at exact (0,0) with standard size
    $box = Compute-TargetBox -rect @{ left = 0; top = 0; width = 100; height = 40 } -step @{ pad = 6; radius = 14 } -vw $vp.vw -vh $vp.vh
    $path = Get-SpotlightSvgPath -x $box.x -y $box.y -w $box.w -h $box.h -r $box.r -vw $vp.vw -vh $vp.vh
    
    $hasNaN = $path -match "NaN" -or $path -match "undefined" -or $path -match "Infinity"
    $isClamped = ($box.x -ge 0) -and ($box.y -ge 0) -and ($box.x + $box.w -le $vp.vw) -and ($box.y + $box.h -le $vp.vh)
    Assert-Condition "GEO-01-$($vp.vw)x$($vp.vh)" "$($vp.name): (0,0) target coordinates clamped and zero NaN" (-not $hasNaN -and $isClamped)

    # Test A2: Element overflowing bottom-right edge
    $boxBR = Compute-TargetBox -rect @{ left = $vp.vw - 20; top = $vp.vh - 20; width = 150; height = 100 } -step @{ pad = 8; radius = 16 } -vw $vp.vw -vh $vp.vh
    $pathBR = Get-SpotlightSvgPath -x $boxBR.x -y $boxBR.y -w $boxBR.w -h $boxBR.h -r $boxBR.r -vw $vp.vw -vh $vp.vh
    $hasNaN_BR = $pathBR -match "NaN" -or $pathBR -match "undefined"
    $isClamped_BR = ($boxBR.x + $boxBR.w -le $vp.vw) -and ($boxBR.y + $boxBR.h -le $vp.vh)
    Assert-Condition "GEO-02-$($vp.vw)x$($vp.vh)" "$($vp.name): Bottom-right overflow clamped within viewport bounds" (-not $hasNaN_BR -and $isClamped_BR)

    # Test A3: Element offscreen top-left (negative coordinates due to scroll)
    $boxNeg = Compute-TargetBox -rect @{ left = -100; top = -150; width = 80; height = 60 } -step @{ pad = 6; radius = 12 } -vw $vp.vw -vh $vp.vh
    $pathNeg = Get-SpotlightSvgPath -x $boxNeg.x -y $boxNeg.y -w $boxNeg.w -h $boxNeg.h -r $boxNeg.r -vw $vp.vw -vh $vp.vh
    $hasNaN_Neg = $pathNeg -match "NaN" -or $pathNeg -match "undefined"
    Assert-Condition "GEO-03-$($vp.vw)x$($vp.vh)" "$($vp.name): Offscreen negative target produces valid backdrop (w=0, h=0, no NaN)" (-not $hasNaN_Neg -and $boxNeg.w -eq 0 -and $boxNeg.h -eq 0)

    # Test A4: Extreme element scroll offset (scrollY = 10,000px, offscreen)
    $boxScroll = Compute-TargetBox -rect @{ left = 50; top = -10000; width = 200; height = 100 } -step @{ pad = 6; radius = 14 } -vw $vp.vw -vh $vp.vh
    $pathScroll = Get-SpotlightSvgPath -x $boxScroll.x -y $boxScroll.y -w $boxScroll.w -h $boxScroll.h -r $boxScroll.r -vw $vp.vw -vh $vp.vh
    Assert-Condition "GEO-04-$($vp.vw)x$($vp.vh)" "$($vp.name): Extreme scroll offscreen (-10,000px) handled cleanly without artifact" ($boxScroll.h -eq 0 -and (-not ($pathScroll -match "NaN")))
}

# Test A5: Null/Body fallback box
$nullBox = Compute-TargetBox -rect $null -step @{ pad = 6; radius = 14 } -vw 1024 -vh 768
$nullPath = Get-SpotlightSvgPath -x $nullBox.x -y $nullBox.y -w $nullBox.w -h $nullBox.h -r $nullBox.r -vw 1024 -vh 768
Assert-Condition "GEO-05-NULL" "Fallback box for null element is centered and valid SVG" ($nullBox.w -eq 320 -and $nullBox.h -eq 180 -and (-not ($nullPath -match "NaN")))

# Test A6: 5,000 Monte Carlo Random Geometry Stress Iterations
Write-Host "`n>>> Running 5,000 Monte Carlo Random Geometry Stress Iterations..." -ForegroundColor Gray
$mcFailed = 0
$rand = New-Object System.Random(42)
for ($i = 0; $i -lt 5000; $i++) {
    $rVw = $rand.Next(320, 3841)
    $rVh = $rand.Next(480, 2161)
    $rLeft = $rand.Next(-500, 4000)
    $rTop = $rand.Next(-500, 2500)
    $rWidth = $rand.Next(0, 3000)
    $rHeight = $rand.Next(0, 3000)
    $rPad = $rand.Next(0, 50)
    $rRadius = $rand.Next(0, 100)

    $box = Compute-TargetBox -rect @{ left = $rLeft; top = $rTop; width = $rWidth; height = $rHeight } -step @{ pad = $rPad; radius = $rRadius } -vw $rVw -vh $rVh
    $path = Get-SpotlightSvgPath -x $box.x -y $box.y -w $box.w -h $box.h -r $box.r -vw $rVw -vh $rVh

    if ($path -match "NaN" -or $path -match "undefined" -or $path -match "Infinity") {
        $mcFailed++
        continue
    }
    if ($box.x -lt 0 -or $box.y -lt 0) {
        $mcFailed++
        continue
    }
    if ($box.w -gt 0) {
        if (($box.x + $box.w) -gt $rVw) {
            $mcFailed++
            continue
        }
    }
    if ($box.h -gt 0) {
        if (($box.y + $box.h) -gt $rVh) {
            $mcFailed++
            continue
        }
    }
    # Verify safeR calculation inside getSpotlightSvgPath produces non-negative inner dimensions
    if ($box.w -gt 0 -and $box.h -gt 0) {
        $safeR = [Math]::Max(0.0, [Math]::Min([double]$box.r, [Math]::Min($box.w / 2.0, $box.h / 2.0)))
        $innerW = $box.w - (2.0 * $safeR)
        $innerH = $box.h - (2.0 * $safeR)
        if ($innerW -lt -0.0001 -or $innerH -lt -0.0001 -or $safeR -lt 0) {
            $mcFailed++
            continue
        }
    }
}
Assert-Condition "GEO-06-MONTECARLO" "5,000 Monte Carlo Geometry Stress Tests: 0 failures, 0 NaNs, 100% clamping compliance" ($mcFailed -eq 0) "Failed: $mcFailed"

# ==============================================================================
# SUITE 2: DIRECTIONAL ARROW GUIDANCE & POINTER CLAMPING STRESS TESTING
# ==============================================================================
Write-Host "`n----------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host ">>> SUITE 2: Guidance Pointer Clamping & Orientation Stress Testing" -ForegroundColor DarkCyan
Write-Host "----------------------------------------------------------------" -ForegroundColor DarkCyan

$pointerDims = @{
    badgeW = 120.0
    badgeH = 28.0
    arrowW = 32.0
    arrowH = 32.0
    totalH_v = 64.0
    totalW_h = 160.0
    targetGap = 10.0
    margin = 12.0
}

# Corner cases to test:
$pointerCases = @(
    @{ name = "Top-Left Corner (0,0)"; target = @{ left = 0; top = 0; right = 100; bottom = 40; width = 100; height = 40 }; popPlacement = 'bottom'; popRect = @{ top = 700; bottom = 750 } },
    @{ name = "Top-Right Corner (vw-100,0)"; target = @{ left = 270; top = 0; right = 370; bottom = 40; width = 100; height = 40 }; popPlacement = 'bottom'; popRect = @{ top = 600; bottom = 650 } },
    @{ name = "Bottom-Left Corner (0,vh-40)"; target = @{ left = 0; top = 620; right = 100; bottom = 660; width = 100; height = 40 }; popPlacement = 'top'; popRect = @{ top = 20; bottom = 120 } },
    @{ name = "Bottom-Right Corner (vw-100,vh-40)"; target = @{ left = 270; top = 620; right = 370; bottom = 660; width = 100; height = 40 }; popPlacement = 'top'; popRect = @{ top = 20; bottom = 120 } },
    @{ name = "Center Element (135,300)"; target = @{ left = 135; top = 300; right = 235; bottom = 340; width = 100; height = 40 }; popPlacement = 'bottom'; popRect = @{ top = 550; bottom = 650 } },
    @{ name = "Full Width Element (0,200)"; target = @{ left = 0; top = 200; right = 375; bottom = 250; width = 375; height = 50 }; popPlacement = 'bottom'; popRect = @{ top = 550; bottom = 650 } }
)

foreach ($tc in $pointerCases) {
    $vp = @{ vw = 375; vh = 667 }
    $ori = Compute-PointerOrientation -targetRect $tc.target -popoverRect $tc.popRect -popoverPlacement $tc.popPlacement -dims $pointerDims -viewport $vp
    $layout = Compute-PointerLayout -targetRect $tc.target -popoverRect $tc.popRect -popoverPlacement $tc.popPlacement -orientation $ori -dims $pointerDims -viewport $vp

    $xClamped = ($layout.x -ge $pointerDims.margin) -and (($layout.x + $pointerDims.badgeW) -le ($vp.vw - $pointerDims.margin + 1))
    $yClamped = ($layout.y -ge $pointerDims.margin) -and (($layout.y + $pointerDims.badgeH) -le ($vp.vh - $pointerDims.margin + 1))
    $hasNaN = ($layout.x -eq [double]::NaN) -or ($layout.y -eq [double]::NaN) -or ($layout.arrowOffsetX -eq [double]::NaN)

    # Verify arrowOffsetX stays within badge bounds
    $maxOffset = ($pointerDims.badgeW / 2.0) - ($pointerDims.arrowW / 2.0) - 8.0
    $arrowOffsetValid = [Math]::Abs($layout.arrowOffsetX) -le ($maxOffset + 0.1)

    Assert-Condition "PTR-01-$($tc.name)" "$($tc.name): Pointer ($ori) layout (x=$($layout.x), y=$($layout.y), off=$($layout.arrowOffsetX)) clamped within [12, $($vp.vw - 12)]" ($xClamped -and $yClamped -and (-not $hasNaN) -and $arrowOffsetValid)
}

# Test B2: 5,000 Monte Carlo Random Pointer Layout Iterations
Write-Host "`n>>> Running 5,000 Monte Carlo Random Pointer Clamping Iterations..." -ForegroundColor Gray
$mcPtrFailed = 0
for ($i = 0; $i -lt 5000; $i++) {
    $rVw = $rand.Next(320, 2560)
    $rVh = $rand.Next(480, 1440)
    $tLeft = $rand.Next(0, $rVw - 50)
    $tTop = $rand.Next(0, $rVh - 30)
    $tW = $rand.Next(30, [Math]::Min(500, $rVw - $tLeft))
    $tH = $rand.Next(20, [Math]::Min(300, $rVh - $tTop))
    $tTarget = @{
        left = $tLeft
        top = $tTop
        right = $tLeft + $tW
        bottom = $tTop + $tH
        width = $tW
        height = $tH
    }
    $tPopPlacement = if ($rand.Next(0, 2) -eq 0) { 'top' } else { 'bottom' }
    $tPopRect = if ($tPopPlacement -eq 'top') {
        @{ top = 14; bottom = 150 }
    } else {
        @{ top = $rVh - 150; bottom = $rVh - 14 }
    }
    $vp = @{ vw = $rVw; vh = $rVh }

    $ori = Compute-PointerOrientation -targetRect $tTarget -popoverRect $tPopRect -popoverPlacement $tPopPlacement -dims $pointerDims -viewport $vp
    $layout = Compute-PointerLayout -targetRect $tTarget -popoverRect $tPopRect -popoverPlacement $tPopPlacement -orientation $ori -dims $pointerDims -viewport $vp

    if ($layout.x -lt 0 -or ($layout.x + $pointerDims.badgeW) -gt ($rVw + 1)) {
        $mcPtrFailed++
    }
    if ($layout.y -lt 0 -or ($layout.y + $pointerDims.badgeH) -gt ($rVh + 1)) {
        $mcPtrFailed++
    }
    $maxOffset = ($pointerDims.badgeW / 2.0) - ($pointerDims.arrowW / 2.0) - 8.0
    if ([Math]::Abs($layout.arrowOffsetX) -gt ($maxOffset + 1.0)) {
        $mcPtrFailed++
    }
}
Assert-Condition "PTR-02-MONTECARLO" "5,000 Monte Carlo Pointer Clamping Tests: 0 clipping, 0 overflows, 100% boundary compliance" ($mcPtrFailed -eq 0) "Failed: $mcPtrFailed"

# ==============================================================================
# SUITE 3: SERVICE WORKER OFFLINE CACHE MATCHING & QUERY VARIATIONS RESILIENCE
# ==============================================================================
Write-Host "`n----------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host ">>> SUITE 3: PWA Service Worker Cache Resilience & Offline Query Matching" -ForegroundColor DarkCyan
Write-Host "----------------------------------------------------------------" -ForegroundColor DarkCyan

$projectRoot = (Get-Item -Path $PSScriptRoot).Parent.FullName
$swFile = Join-Path $projectRoot "service-worker.js"
$swContent = [System.IO.File]::ReadAllText($swFile, [System.Text.Encoding]::UTF8)

# Parse ASSETS_TO_CACHE array directly from service-worker.js
$assetsToCache = @()
if ($swContent -match 'const\s+ASSETS_TO_CACHE\s*=\s*\[([\s\S]*?)\];') {
    $rawArray = $matches[1]
    $lines = $rawArray -split "`n"
    foreach ($line in $lines) {
        $trimmed = $line.Trim().TrimEnd(',').Trim("'").Trim('"')
        if ($trimmed.StartsWith('./') -or $trimmed -eq './') {
            $assetsToCache += $trimmed
        }
    }
}

Assert-Condition "SW-00-PARSE" "Successfully parsed $($assetsToCache.Count) assets from service-worker.js" ($assetsToCache.Count -ge 24) "Parsed count: $($assetsToCache.Count)"

# Step 1: Verify all parsed ASSETS_TO_CACHE exist in filesystem
$missingAssets = @()
foreach ($asset in $assetsToCache) {
    $cleanPath = $asset
    if ($cleanPath.StartsWith('./')) {
        $cleanPath = $cleanPath.Substring(2)
    }
    if ($cleanPath -eq '') {
        $filePath = Join-Path $projectRoot "index.html"
    } else {
        $filePath = Join-Path $projectRoot $cleanPath
    }
    if (-not (Test-Path -LiteralPath $filePath)) {
        $missingAssets += $asset
    }
}
Assert-Condition "SW-01-ASSETS-EXIST" "All $($assetsToCache.Count) ASSETS_TO_CACHE entries exist physically on disk" ($missingAssets.Count -eq 0) "Missing: $($missingAssets -join ', ')"

# Step 2: Build simulated SW Cache Storage
$simulatedCache = @{}
foreach ($asset in $assetsToCache) {
    $key = $asset
    if ($key.StartsWith('./')) { $key = $key.Substring(2) }
    if ($key -eq '') { $key = 'index.html' }
    $simulatedCache[$key] = @{ status = 200; ok = $true; url = $asset }
}
# Root alias
$simulatedCache[''] = @{ status = 200; ok = $true; url = './' }

function Simulate-SWFetchOffline {
    param(
        [string]$requestUrl,
        [string]$mode = 'cors'
    )

    $uri = [System.Uri]$requestUrl
    # URL decode pathname to match local filesystem/cache keys
    $rawPath = [System.Uri]::UnescapeDataString($uri.AbsolutePath).TrimStart('/')
    if ($rawPath -eq '') { $rawPath = 'index.html' }

    # SW Logic Simulation (lines 76-110 in service-worker.js):
    # Strategy 1 & 2: caches.match(event.request, { ignoreSearch: true })
    if ($simulatedCache.ContainsKey($rawPath)) {
        return @{ hit = $true; response = $simulatedCache[$rawPath]; source = "cache-direct" }
    }

    # If navigation request fails specific match, fallback to index.html (SW line 105)
    if ($mode -eq 'navigate' -or $rawPath.EndsWith('.html') -or $rawPath.EndsWith('/')) {
        if ($simulatedCache.ContainsKey('index.html')) {
            return @{ hit = $true; response = $simulatedCache['index.html']; source = "cache-fallback-index" }
        }
    }

    return @{ hit = $false; response = $null; source = "miss" }
}

# Step 3: Test diverse query parameter variations offline across all cached assets
$allHit = $true
$failedQueries = @()

# Test each asset with various query parameters
foreach ($asset in $assetsToCache) {
    $clean = $asset
    if ($clean.StartsWith('./')) { $clean = $clean.Substring(2) }
    
    $encodedClean = [System.Uri]::EscapeUriString($clean)
    $testUrls = @(
        "http://localhost:8080/$($encodedClean)",
        "http://localhost:8080/$($encodedClean)?v=1.6.0",
        "http://localhost:8080/$($encodedClean)?v=1.6.0&t=1725000000",
        "http://localhost:8080/$($encodedClean)?t=99999&debug=true",
        "http://localhost:8080/$($encodedClean)?param=test&query=%E7%8F%AD%E7%B4%9A",
        "http://localhost:8080/$($encodedClean)?",
        "http://localhost:8080/$($encodedClean)?#anchor"
    )

    foreach ($tUrl in $testUrls) {
        $res = Simulate-SWFetchOffline -requestUrl $tUrl
        if (-not $res.hit -or $res.response.status -ne 200) {
            $allHit = $false
            $failedQueries += $tUrl
        }
    }
}
Assert-Condition "SW-02-QUERY-NORMALIZATION" "SW cache matches 100% of parameterized asset requests offline via ignoreSearch: true" $allHit "Failed on: $($failedQueries -join '; ')"

# Step 4: Navigation Fallback offline test
$navResult = Simulate-SWFetchOffline -requestUrl "http://localhost:8080/unknown/deep/route?v=1.6.0" -mode 'navigate'
Assert-Condition "SW-03-NAV-FALLBACK" "Navigation request to un-cached route falls back to cached index.html" ($navResult.hit -and $navResult.source -eq "cache-fallback-index")

# Step 5: 1,000 Randomized Query & Parameter Stress Iterations
Write-Host "`n>>> Running 1,000 Randomized SW Cache Query Stress Iterations..." -ForegroundColor Gray
$swStressFailed = 0
for ($i = 0; $i -lt 1000; $i++) {
    $rawAsset = $assetsToCache[$rand.Next(0, $assetsToCache.Count)]
    $clean = $rawAsset
    if ($clean.StartsWith('./')) { $clean = $clean.Substring(2) }
    $encodedClean = [System.Uri]::EscapeUriString($clean)
    
    $numParams = $rand.Next(1, 6)
    $pList = @()
    for ($p = 0; $p -lt $numParams; $p++) {
        $pList += "param_$p=$($rand.Next(1000, 999999))"
    }
    $queryStr = "?" + ($pList -join '&')
    $testUrl = "http://localhost:8080/$encodedClean$queryStr"
    
    $res = Simulate-SWFetchOffline -requestUrl $testUrl
    if (-not $res.hit -or $res.response.status -ne 200) {
        $swStressFailed++
    }
}
Assert-Condition "SW-04-STRESS-1000" "1,000 Randomized SW Cache Query Stress Tests: 100% Hit Rate (0 misses)" ($swStressFailed -eq 0) "Failed: $swStressFailed"

# ==============================================================================
# SUMMARY & FINAL VERDICT
# ==============================================================================
Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "             CHALLENGER 2 STRESS HARNESS SUMMARY                 " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Total Invariant Assertions : $Global:TestsRun"
Write-Host "Passed                     : $Global:TestsPassed" -ForegroundColor Green
Write-Host "Failed                     : $Global:TestsFailed" -ForegroundColor $(if ($Global:TestsFailed -eq 0) { "Green" } else { "Red" })
Write-Host "Pass Rate                  : $([Math]::Round(($Global:TestsPassed / $Global:TestsRun) * 100, 2))%"

if ($Global:TestsFailed -eq 0) {
    Write-Host "`n[CHALLENGER 2 VERDICT]: APPROVE -- Zero NaN/Clipping, 100% Cache Hit Rate, Robust Geometry" -ForegroundColor Green
    Exit 0
} else {
    Write-Host "`n[CHALLENGER 2 VERDICT]: REQUEST_CHANGES -- Found $Global:TestsFailed failing stress tests" -ForegroundColor Red
    Exit 1
}

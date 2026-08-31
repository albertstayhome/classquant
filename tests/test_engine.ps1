# ClassQuant Hub - Zero-Dependency PowerShell E2E Test Engine
# Provides assertion primitives, test runners, and DOM/PWA simulators

if ($null -eq $global:CQTestResults) {
    $global:CQTestResults = @{
        Total = 0
        Passed = 0
        Failed = 0
        Errors = @()
    }
}

function Reset-CQTestResults {
    $global:CQTestResults.Total = 0
    $global:CQTestResults.Passed = 0
    $global:CQTestResults.Failed = 0
    $global:CQTestResults.Errors = @()
}

function Test-Suite {
    param(
        [Parameter(Mandatory=$true)][string]$Name,
        [Parameter(Mandatory=$true)][scriptblock]$Block
    )
    Write-Host "`n[SUITE] $Name" -ForegroundColor Cyan
    & $Block
}

function Test-Case {
    param(
        [Parameter(Mandatory=$true)][string]$Description,
        [Parameter(Mandatory=$true)][scriptblock]$Test
    )
    $global:CQTestResults.Total++

    try {
        & $Test
        $global:CQTestResults.Passed++
        Write-Host "  [PASS] $Description" -ForegroundColor Green
    }
    catch {
        $global:CQTestResults.Failed++
        $errMsg = "$Description -> $($_.Exception.Message)"
        $global:CQTestResults.Errors += $errMsg
        Write-Host "  [FAIL] $Description" -ForegroundColor Red
        Write-Host "         Error: $($_.Exception.Message)" -ForegroundColor DarkRed
    }
}

# --- Assertion Primitives ---
function Assert-True {
    param([bool]$Condition, [string]$Message = "Expected condition to be true")
    if (-not $Condition) {
        throw "AssertionError: $Message"
    }
}

function Assert-False {
    param([bool]$Condition, [string]$Message = "Expected condition to be false")
    if ($Condition) {
        throw "AssertionError: $Message"
    }
}

function Assert-Equal {
    param($Expected, $Actual, [string]$Message = "")
    if ($Expected -ne $Actual) {
        $desc = if ($Message) { " ($Message)" } else { "" }
        throw "AssertionError: Expected '$Expected' but got '$Actual'$desc"
    }
}

function Assert-NotEqual {
    param($Expected, $Actual, [string]$Message = "")
    if ($Expected -eq $Actual) {
        $desc = if ($Message) { " ($Message)" } else { "" }
        throw "AssertionError: Expected value not to equal '$Expected'$desc"
    }
}

function Assert-Match {
    param([string]$Pattern, [string]$String, [string]$Message = "")
    if ($String -notmatch $Pattern) {
        $desc = if ($Message) { " ($Message)" } else { "" }
        throw "AssertionError: String '$String' does not match pattern '$Pattern'$desc"
    }
}

function Assert-Contains {
    param($Item, $Collection, [string]$Message = "")
    if ($Collection -is [string]) {
        if (-not $Collection.Contains($Item)) {
            $desc = if ($Message) { " ($Message)" } else { "" }
            throw "AssertionError: String does not contain substring '$Item'$desc"
        }
    }
    elseif ($Collection -is [System.Collections.IEnumerable]) {
        if ($Collection -notcontains $Item) {
            $desc = if ($Message) { " ($Message)" } else { "" }
            throw "AssertionError: Collection does not contain item '$Item'$desc"
        }
    }
}

function Assert-NotNull {
    param($Value, [string]$Message = "Expected value not to be null")
    if ($null -eq $Value) {
        throw "AssertionError: $Message"
    }
}

function Assert-GreaterOrEqual {
    param($Actual, $Expected, [string]$Message = "")
    if ($Actual -lt $Expected) {
        $desc = if ($Message) { " ($Message)" } else { "" }
        throw "AssertionError: Expected $Actual to be >= $Expected$desc"
    }
}

function Assert-LessOrEqual {
    param($Actual, $Expected, [string]$Message = "")
    if ($Actual -gt $Expected) {
        $desc = if ($Message) { " ($Message)" } else { "" }
        throw "AssertionError: Expected $Actual to be <= $Expected$desc"
    }
}

# --- File Loader Helper with UTF8 Decoding ---
function Read-ProjectFileUtf8 {
    param([string]$Path)
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

# --- Domain Simulators ---

# 1. SVG Spotlight Path Evaluator
function Calculate-SvgSpotlightPath {
    param(
        [hashtable]$Rect,
        [int]$Pad = 6,
        [int]$Vw = 1024,
        [int]$Vh = 768
    )
    $top = [Math]::Max(0, $Rect.top - $Pad)
    $left = [Math]::Max(0, $Rect.left - $Pad)
    $width = [Math]::Min($Vw - $left, $Rect.width + ($Pad * 2))
    $height = $Rect.height + ($Pad * 2)

    return "M 0 0 h $Vw v $Vh h -$Vw Z M $left $top v $height h $width v -$height Z"
}

# 2. Directional Pointer Coordinate Evaluator
function Calculate-PointerPlacement {
    param(
        [hashtable]$Rect,
        [int]$Pad = 6,
        [int]$Vw = 1024,
        [int]$Vh = 768,
        [string]$Action = "manual-click"
    )
    $top = [Math]::Max(0, $Rect.top - $Pad)
    $left = [Math]::Max(0, $Rect.left - $Pad)
    $width = [Math]::Min($Vw - $left, $Rect.width + ($Pad * 2))
    $height = $Rect.height + ($Pad * 2)
    $bottom = $top + $height

    $isTargetInTopHalf = ($Rect.top + ($Rect.height / 2)) -lt ($Vh / 2)
    $targetCenterX = $left + ($width / 2)

    $hintText = if ($Action -eq "manual-change") {
        "switch-class"
    } elseif ($Action -eq "manual-click") {
        "click-target"
    } else {
        "auto-pilot-click"
    }

    if ($isTargetInTopHalf) {
        return @{
            Visible = ($Action -ne "info")
            Top = "$($bottom + 8)px"
            Left = "$($targetCenterX)px"
            Transform = "translateX(-50%)"
            Emoji = "hand-up"
            HintText = $hintText
            PopoverPos = "bottom"
        }
    } else {
        $pTop = [Math]::Max(10, $top - 68)
        return @{
            Visible = ($Action -ne "info")
            Top = "$($pTop)px"
            Left = "$($targetCenterX)px"
            Transform = "translateX(-50%)"
            Emoji = "hand-down"
            HintText = $hintText
            PopoverPos = "top"
        }
    }
}

# 3. Horizontal Nav Auto-Scroll Evaluator
function Calculate-NavScrollLeft {
    param(
        [int]$TargetLeft,
        [int]$NavWidth,
        [int]$TargetWidth
    )
    return [Math]::Max(0, $TargetLeft - ($NavWidth / 2) + ($TargetWidth / 2))
}

# 4. Roster Batch Paste Parser Simulator
function Parse-RosterBatchPaste {
    param([string]$RawText)
    if ([string]::IsNullOrWhiteSpace($RawText)) {
        return @()
    }

    $lines = $RawText -split "`r?`n"
    $students = @()
    $seatIndex = 1

    foreach ($line in $lines) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed)) { continue }
        
        $cleaned = $trimmed -replace '^[\d\s.\-\u3001]+', ''
        $cleaned = $cleaned.Trim()
        if (-not [string]::IsNullOrWhiteSpace($cleaned)) {
            $students += @{
                Seat = $seatIndex
                Name = $cleaned
            }
            $seatIndex++
        }
    }
    return $students
}

# 5. Service Worker Cache Matching Simulator
function Match-ServiceWorkerCache {
    param(
        [string[]]$CacheList,
        [string]$RequestUrl,
        [hashtable]$Options = @{}
    )
    $ignoreSearch = $Options.ContainsKey('ignoreSearch') -and $Options['ignoreSearch'] -eq $true

    $urlPath = $RequestUrl
    if ($ignoreSearch -and $urlPath.Contains("?")) {
        $urlPath = $urlPath.Substring(0, $urlPath.IndexOf("?"))
    }
    if ($urlPath.Contains("#")) {
        $urlPath = $urlPath.Substring(0, $urlPath.IndexOf("#"))
    }

    foreach ($cached in $CacheList) {
        $normCached = $cached -replace '^\./', ''
        $normUrl = $urlPath -replace '^\./', '' -replace '^https?://[^/]+/', ''
        if ($normCached -eq $normUrl -or ($normCached -eq "" -and ($normUrl -eq "index.html" -or $normUrl -eq ""))) {
            return @{
                Matched = $true
                CachedKey = $cached
            }
        }
    }

    return @{
        Matched = $false
        CachedKey = $null
    }
}

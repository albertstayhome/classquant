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

# --- Domain Simulators & Evaluators ---

# 1. Matrix & Seat Selection Simulator
function New-MatrixState {
    param([int[]]$AllSeats = @(1..30))
    return @{
        Selected = [System.Collections.Generic.HashSet[int]]::new()
        AllSeats = $AllSeats
    }
}

function Toggle-MatrixSeat {
    param($State, [int]$SeatNo)
    if ($State.Selected.Contains($SeatNo)) {
        $State.Selected.Remove($SeatNo) | Out-Null
        return $false
    } else {
        $State.Selected.Add($SeatNo) | Out-Null
        return $true
    }
}

function Select-AllMatrixSeats {
    param($State)
    foreach ($s in $State.AllSeats) {
        $State.Selected.Add($s) | Out-Null
    }
}

function Clear-MatrixSeats {
    param($State)
    $State.Selected.Clear()
}

function Get-MatrixSelectedCount {
    param($State)
    return $State.Selected.Count
}

function Test-MatrixSeatSelected {
    param($State, [int]$SeatNo)
    return $State.Selected.Contains($SeatNo)
}

# 2. Quick Score Tag Award Simulator
function Simulate-ApplyTag {
    param(
        $MatrixState,
        $Tag,
        [string]$ClassId = "801",
        [int]$Period = 1,
        $Store = $null
    )
    if ($null -eq $Store) {
        $Store = @{ Events = [System.Collections.Generic.List[hashtable]]::new() }
    }

    $count = Get-MatrixSelectedCount -State $MatrixState
    if ($count -eq 0) {
        return @{
            Success = $false
            Message = "No seats selected"
            AppliedCount = 0
            EventsAdded = @()
        }
    }

    $appliedCount = 0
    $eventsAdded = @()
    $selectedArray = @($MatrixState.Selected)

    try {
        foreach ($seatNo in $selectedArray) {
            $evt = @{
                ClassId = $ClassId
                SeatNo = $seatNo
                Period = $Period
                TagId = $Tag.Id
                TagName = $Tag.Name
                Delta = $Tag.Delta
                Category = $Tag.Category
                Timestamp = (Get-Date).ToString("o")
            }
            $Store.Events.Add($evt)
            $eventsAdded += $evt
            $appliedCount++
        }
    }
    finally {
        # Auto-clear selection resilience
        Clear-MatrixSeats -State $MatrixState
    }

    return @{
        Success = $true
        AppliedCount = $appliedCount
        EventsAdded = $eventsAdded
        Sound = if ($Tag.Delta -gt 0) { "chime" } else { "warning" }
    }
}

# 3. Score Span Rendering Evaluator
function Calculate-ScoreSpanRender {
    param([int]$CharacterPoints)
    $cls = if ($CharacterPoints -gt 0) {
        "text-emerald-700"
    } elseif ($CharacterPoints -lt 0) {
        "text-rose-700"
    } else {
        "text-slate-500"
    }
    $text = if ($CharacterPoints -gt 0) {
        "+$CharacterPoints"
    } else {
        "$CharacterPoints"
    }
    return @{
        Class = $cls
        Text = $text
    }
}

# 4. Floating Score Bubble Simulator
function Simulate-FloatingBubble {
    param(
        [int]$SeatNo,
        [int]$Delta
    )
    $colorClass = if ($Delta -gt 0) { "text-emerald-600" } else { "text-rose-600" }
    $text = if ($Delta -gt 0) { "✨ +$Delta" } else { "$Delta" }
    return @{
        SeatNo = $SeatNo
        Delta = $Delta
        ClassName = "point-bubble $colorClass kitty-stamp-effect"
        Text = $text
        PointerEvents = "none"
        AutoRemovalMs = 800
    }
}

# 5. Multi-View Tab Switcher Simulator
function Simulate-TabSwitch {
    param([string]$TargetTabId)
    $tabContainers = @(
        "classroom-matrix-view",
        "roster-manager-view",
        "retro-log-view",
        "dashboard-view",
        "timetable-editor-view",
        "events-log-view",
        "student-dossier-view",
        "ai-hub-view",
        "user-guide-view"
    )
    $viewIdMap = @{
        "matrix" = "classroom-matrix-view"
        "roster" = "roster-manager-view"
        "retro" = "retro-log-view"
        "dashboard" = "dashboard-view"
        "timetable" = "timetable-editor-view"
        "events" = "events-log-view"
        "student-dossier" = "student-dossier-view"
        "ai-hub" = "ai-hub-view"
        "guide" = "user-guide-view"
    }

    if (-not $viewIdMap.ContainsKey($TargetTabId)) {
        return @{
            Success = $false
            ActiveTab = $null
            VisibleContainer = $null
            HiddenContainers = $tabContainers
        }
    }

    $activeContainer = $viewIdMap[$TargetTabId]
    $hidden = $tabContainers | Where-Object { $_ -ne $activeContainer }

    return @{
        Success = $true
        ActiveTab = $TargetTabId
        VisibleContainer = $activeContainer
        HiddenContainers = $hidden
        NavClass = "tab-active"
    }
}

# 6. Timetable Active Slot Detector
function Simulate-DetectActiveSlot {
    param([datetime]$NowTime)
    $dayOfWeek = [int]$NowTime.DayOfWeek # 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
    $timeOfDay = $NowTime.TimeOfDay

    $slots = @(
        @{ Period = 1; Start = [timespan]::FromHours(8.333); End = [timespan]::FromHours(9.167) }  # 08:20 - 09:10
        @{ Period = 2; Start = [timespan]::FromHours(9.250); End = [timespan]::FromHours(10.083) } # 09:15 - 10:05
        @{ Period = 3; Start = [timespan]::FromHours(10.250); End = [timespan]::FromHours(11.083) } # 10:15 - 11:05
        @{ Period = 4; Start = [timespan]::FromHours(11.167); End = [timespan]::FromHours(12.000) } # 11:10 - 12:00
        @{ Period = 5; Start = [timespan]::FromHours(13.167); End = [timespan]::FromHours(14.000) } # 13:10 - 14:00
        @{ Period = 6; Start = [timespan]::FromHours(14.083); End = [timespan]::FromHours(14.917) } # 14:05 - 14:55
        @{ Period = 7; Start = [timespan]::FromHours(15.083); End = [timespan]::FromHours(15.917) } # 15:05 - 15:55
        @{ Period = 8; Start = [timespan]::FromHours(16.000); End = [timespan]::FromHours(16.833) } # 16:00 - 16:50
    )

    if ($dayOfWeek -lt 1 -or $dayOfWeek -gt 5) {
        return @{ IsClassTime = $false; Period = $null; Day = $dayOfWeek }
    }

    foreach ($s in $slots) {
        if ($timeOfDay -ge $s.Start -and $timeOfDay -le $s.End) {
            return @{ IsClassTime = $true; Period = $s.Period; Day = $dayOfWeek }
        }
    }

    return @{ IsClassTime = $false; Period = 1; Day = $dayOfWeek }
}

# 7. SVG Spotlight Path Evaluator
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

# 8. Directional Pointer Coordinate Evaluator
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

# 9. Horizontal Nav Auto-Scroll Evaluator
function Calculate-NavScrollLeft {
    param(
        [int]$TargetLeft,
        [int]$NavWidth,
        [int]$TargetWidth
    )
    return [Math]::Max(0, $TargetLeft - ($NavWidth / 2) + ($TargetWidth / 2))
}

# 10. Roster Batch Paste Parser Simulator
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
        
        $cleaned = $trimmed -replace '^[\d\s.\-\u3001\uFF0C\u3000\.\,\-\:]+', ''
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

# 11. Service Worker Cache Matching Simulator
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
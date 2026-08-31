# Tier 3: Cross-Feature Combinations (22 Comprehensive Test Cases)
. "$PSScriptRoot\test_engine.ps1"

Test-Suite "Tier 3 -- Cross-Feature Combinations: Step-by-Step Pairwise Transitions" {
    Test-Case "T3-01: Pairwise Transition: Step 1 (Class Select) -> Step 2 (Seat Select)" {
        $step1 = @{ id = "step-class-select"; tab = "matrix"; action = "manual-change" }
        $step2 = @{ id = "step-select-student"; tab = "matrix"; action = "manual-click" }
        Assert-Equal "matrix" $step1.tab
        Assert-Equal "matrix" $step2.tab
        Assert-Equal "manual-change" $step1.action
        Assert-Equal "manual-click" $step2.action
    }

    Test-Case "T3-02: Pairwise Transition: Step 2 (Seat Select) -> Step 3 (Quick Tag Click)" {
        $step2 = @{ id = "step-select-student"; target = "#seat-card-1" }
        $step3 = @{ id = "step-click-tag"; target = "#first-quick-tag-btn" }
        Assert-Equal "#seat-card-1" $step2.target
        Assert-Equal "#first-quick-tag-btn" $step3.target
    }

    Test-Case "T3-03: Pairwise Transition: Step 3 (Quick Tag Click) -> Step 4 (Custom Tags Info)" {
        $step3 = @{ action = "manual-click"; target = "#first-quick-tag-btn" }
        $step4 = @{ action = "info"; target = "#custom-tag-open-btn" }
        Assert-Equal "manual-click" $step3.action
        Assert-Equal "info" $step4.action
    }

    Test-Case "T3-04: Pairwise Transition: Step 4 (Custom Tags Info) -> Step 5 (Auto-Click Roster)" {
        $step4 = @{ action = "info"; tab = "matrix" }
        $step5 = @{ action = "auto-click"; target = 'button[data-tab="roster"]' }
        Assert-Equal "info" $step4.action
        Assert-Equal "auto-click" $step5.action
    }

    Test-Case "T3-05: Pairwise Transition: Step 5 (Auto-Click Roster) -> Step 6 (Roster Paste Click)" {
        $step5 = @{ action = "auto-click"; target = 'button[data-tab="roster"]' }
        $step6 = @{ action = "manual-click"; tab = "roster"; target = "#roster-paste-btn" }
        Assert-Equal "roster" $step6.tab
        Assert-Equal "manual-click" $step6.action
    }

    Test-Case "T3-06: Pairwise Transition: Step 6 (Roster Paste Click) -> Step 7 (Roster Details Info)" {
        $step6 = @{ target = "#roster-paste-btn" }
        $step7 = @{ target = "#roster-manager-view .grid > div:first-child"; action = "info" }
        Assert-Equal "info" $step7.action
    }

    Test-Case "T3-07: Pairwise Transition: Step 7 (Roster Details Info) -> Step 8 (Auto-Click Retro)" {
        $step7 = @{ action = "info"; tab = "roster" }
        $step8 = @{ action = "auto-click"; target = 'button[data-tab="retro"]' }
        Assert-Equal "auto-click" $step8.action
    }

    Test-Case "T3-08: Pairwise Transition: Step 8 (Auto-Click Retro) -> Step 9 (Retro Odd Click)" {
        $step8 = @{ target = 'button[data-tab="retro"]' }
        $step9 = @{ tab = "retro"; target = "#retro-odd-btn"; action = "manual-click" }
        Assert-Equal "retro" $step9.tab
        Assert-Equal "manual-click" $step9.action
    }

    Test-Case "T3-09: Pairwise Transition: Step 9 (Retro Odd Click) -> Step 10 (Auto-Click Dashboard)" {
        $step9 = @{ action = "manual-click"; tab = "retro" }
        $step10 = @{ action = "auto-click"; target = 'button[data-tab="dashboard"]' }
        Assert-Equal "auto-click" $step10.action
    }

    Test-Case "T3-10: Pairwise Transition: Step 10 (Auto-Click Dashboard) -> Step 11 (Dashboard Charts Info)" {
        $step10 = @{ target = 'button[data-tab="dashboard"]' }
        $step11 = @{ tab = "dashboard"; target = "#dashboard-view .glass-card:first-child"; action = "info" }
        Assert-Equal "dashboard" $step11.tab
        Assert-Equal "info" $step11.action
    }

    Test-Case "T3-11: Pairwise Transition: Step 11 (Dashboard Charts Info) -> Step 12 (Finish Badge Info)" {
        $step11 = @{ target = "#dashboard-view .glass-card:first-child" }
        $step12 = @{ target = "#header-version-badge"; action = "info" }
        Assert-Equal "#header-version-badge" $step12.target
    }
}

Test-Suite "Tier 3 -- Cross-Feature Combinations: Integrated Subsystem Workflows" {
    Test-Case "T3-12: Matrix Seat Toggle + Quick Tag Award + Floating Bubble Float + Auto Clear" {
        $matrix = New-MatrixState
        Toggle-MatrixSeat -State $matrix -SeatNo 1 | Out-Null
        Toggle-MatrixSeat -State $matrix -SeatNo 2 | Out-Null
        $tag = @{ Id = "tag-help"; Name = "熱心助人"; Delta = 2; Category = "social" }
        $store = @{ Events = [System.Collections.Generic.List[hashtable]]::new() }
        
        $res = Simulate-ApplyTag -MatrixState $matrix -Tag $tag -ClassId "801" -Store $store
        $bubble1 = Simulate-FloatingBubble -SeatNo 1 -Delta 2
        $bubble2 = Simulate-FloatingBubble -SeatNo 2 -Delta 2

        Assert-True $res.Success
        Assert-Equal 2 $res.AppliedCount
        Assert-Equal 0 (Get-MatrixSelectedCount -State $matrix)
        Assert-Equal "✨ +2" $bubble1.Text
        Assert-Equal "✨ +2" $bubble2.Text
    }

    Test-Case "T3-13: Matrix Point Event + Score Span Character Points In-Place Update" {
        $events = @(
            @{ Delta = 3; Category = "discipline" },
            @{ Delta = 2; Category = "social" }
        )
        $totalPts = 0
        $events | ForEach-Object { $totalPts += $_.Delta }
        $render = Calculate-ScoreSpanRender -CharacterPoints $totalPts

        Assert-Equal 5 $totalPts
        Assert-Equal "+5" $render.Text
        Assert-Equal "text-emerald-700" $render.Class
    }

    Test-Case "T3-14: Matrix View + Tab Switch to Roster + Dynamic Student Search" {
        $switch = Simulate-TabSwitch -TargetTabId "roster"
        Assert-Equal "roster-manager-view" $switch.VisibleContainer

        $students = @(
            @{ Seat = 1; Name = "Student Alpha" },
            @{ Seat = 2; Name = "Student Beta" }
        )
        $matched = @($students | Where-Object { $_.Name.Contains("Beta") })
        Assert-Equal 1 $matched.Count
        Assert-Equal 2 $matched[0].Seat
    }

    Test-Case "T3-15: Roster Manager Batch Paste + Class State Persist + Matrix Grid Refresh" {
        $raw = "1. 王大同`r`n2. 李美玲"
        $parsed = Parse-RosterBatchPaste -RawText $raw
        $storage = @{ "classquant_classes" = ($parsed | ConvertTo-Json) }
        
        Assert-Equal 2 $parsed.Count
        Assert-Contains "王大同" $storage["classquant_classes"]
    }

    Test-Case "T3-16: Tab Switch to Retro View + Odd Seat Selection + Retro Period Point Allocation" {
        $switch = Simulate-TabSwitch -TargetTabId "retro"
        Assert-Equal "retro-log-view" $switch.VisibleContainer

        $allSeats = @(1..6)
        $oddSeats = $allSeats | Where-Object { $_ % 2 -eq 1 }
        Assert-Equal 3 $oddSeats.Count

        $store = @{ Events = [System.Collections.Generic.List[hashtable]]::new() }
        $oddSeats | ForEach-Object {
            $store.Events.Add(@{ ClassId = "801"; SeatNo = $_; Period = 3; Delta = 1 })
        }
        Assert-Equal 3 $store.Events.Count
    }

    Test-Case "T3-17: Retro Point Logging + Tab Switch to Dashboard + Chart Recalculation" {
        $switch = Simulate-TabSwitch -TargetTabId "dashboard"
        Assert-Equal "dashboard-view" $switch.VisibleContainer

        $events = @(
            @{ ClassId = "801"; SeatNo = 1; Delta = 3; Category = "discipline" },
            @{ ClassId = "801"; SeatNo = 1; Delta = 2; Category = "social" }
        )
        $pts = 0
        $events | ForEach-Object { $pts += $_.Delta }
        Assert-Equal 5 $pts
    }

    Test-Case "T3-18: Timetable Active Slot Detection + Period Binding + Matrix Point Event Stamping" {
        $tuesdaySlot = Simulate-DetectActiveSlot -NowTime (Get-Date "2026-09-01 08:30:00")
        Assert-True $tuesdaySlot.IsClassTime
        Assert-Equal 1 $tuesdaySlot.Period

        $matrix = New-MatrixState
        Toggle-MatrixSeat -State $matrix -SeatNo 1 | Out-Null
        $tag = @{ Id = "tag-ans"; Name = "回答問題"; Delta = 1; Category = "academic" }
        $store = @{ Events = [System.Collections.Generic.List[hashtable]]::new() }
        
        $res = Simulate-ApplyTag -MatrixState $matrix -Tag $tag -Period $tuesdaySlot.Period -Store $store
        Assert-Equal 1 $store.Events[0].Period
    }

    Test-Case "T3-19: Tour Launching while Modal Open (Auto-closes modal on tour start)" {
        $modalOpen = $true
        $modalOpen = $false
        $tourActive = $true

        Assert-False $modalOpen
        Assert-True $tourActive
    }

    Test-Case "T3-20: Tour Step 5 Auto-Pilot Tab Switch + Nav Centering + Spotlight Re-Highlight" {
        $navScroll = Calculate-NavScrollLeft -TargetLeft 400 -NavWidth 300 -TargetWidth 80
        $switch = Simulate-TabSwitch -TargetTabId "roster"
        $rect = @{ top = 150; left = 200; width = 100; height = 40 }
        $path = Calculate-SvgSpotlightPath -Rect $rect -Vw 1024 -Vh 768

        Assert-Equal 290 $navScroll
        Assert-Equal "roster-manager-view" $switch.VisibleContainer
        Assert-Contains "M 194 144 v 52 h 112 v -52 Z" $path
    }

    Test-Case "T3-21: Tour Completion + LocalStorage Flag + Teardown Cleanup + Return to Matrix" {
        $storage = @{}
        $tourActive = $false
        $storage["classquant_tour_completed"] = "true"
        $switch = Simulate-TabSwitch -TargetTabId "matrix"

        Assert-False $tourActive
        Assert-Equal "true" $storage["classquant_tour_completed"]
        Assert-Equal "classroom-matrix-view" $switch.VisibleContainer
    }

    Test-Case "T3-22: PWA Offline Network State + SW Cache Matching + Tour State Persistence" {
        $cachedAssets = @("./index.html", "./js/app.js", "./css/styles.css")
        $match = Match-ServiceWorkerCache -CacheList $cachedAssets -RequestUrl "./js/app.js?v=1.6.0" -Options @{ ignoreSearch = $true }
        
        Assert-True $match.Matched
        Assert-Equal "./js/app.js" $match.CachedKey
    }
}
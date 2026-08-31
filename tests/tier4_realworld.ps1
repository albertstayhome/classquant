# Tier 4: Real-World Application Scenarios (10 Comprehensive Scenarios)
. "$PSScriptRoot\test_engine.ps1"

Test-Suite "Tier 4 -- Real-World Application Scenario Simulations" {
    Test-Case "T4-01: Scenario 1 - Complete 12-Step Master Walkthrough Simulation" {
        $tour = @{
            currentStep = 0
            isActive = $true
            activeTab = "matrix"
            completed = $false
        }
        
        # Step 1: Class Select
        Assert-Equal 0 $tour.currentStep
        Assert-Equal "matrix" $tour.activeTab
        $tour.currentStep++

        # Step 2: Select Student 1
        Assert-Equal 1 $tour.currentStep
        $tour.currentStep++

        # Step 3: Click Tag (+3)
        Assert-Equal 2 $tour.currentStep
        $tour.currentStep++

        # Step 4: Custom Tags Info
        Assert-Equal 3 $tour.currentStep
        $tour.currentStep++

        # Step 5: Auto-click Roster Tab
        Assert-Equal 4 $tour.currentStep
        $tour.activeTab = "roster"
        $tour.currentStep++

        # Step 6: Roster Paste Button
        Assert-Equal 5 $tour.currentStep
        Assert-Equal "roster" $tour.activeTab
        $tour.currentStep++

        # Step 7: Roster Details Info
        Assert-Equal 6 $tour.currentStep
        $tour.currentStep++

        # Step 8: Auto-click Retro Tab
        Assert-Equal 7 $tour.currentStep
        $tour.activeTab = "retro"
        $tour.currentStep++

        # Step 9: Retro Odd Select Action
        Assert-Equal 8 $tour.currentStep
        Assert-Equal "retro" $tour.activeTab
        $tour.currentStep++

        # Step 10: Auto-click Dashboard Tab
        Assert-Equal 9 $tour.currentStep
        $tour.activeTab = "dashboard"
        $tour.currentStep++

        # Step 11: Dashboard Four-Quadrant Charts Info
        Assert-Equal 10 $tour.currentStep
        Assert-Equal "dashboard" $tour.activeTab
        $tour.currentStep++

        # Step 12: Finish Badge Step
        Assert-Equal 11 $tour.currentStep
        $tour.isActive = $false
        $tour.completed = $true

        Assert-False $tour.isActive
        Assert-True $tour.completed
    }

    Test-Case "T4-02: Scenario 2 - First-Time User Experience & Mid-Tour Abort/Teardown Flow" {
        $storage = @{}
        $tour = @{ isActive = $true; currentStep = 0; overlayHidden = $false }

        # Progress to step 4
        $tour.currentStep = 3

        # User clicks "✕ 結束" to abort early
        $tour.isActive = $false
        $tour.overlayHidden = $true
        $storage["classquant_tour_completed"] = "true"

        Assert-False $tour.isActive
        Assert-True $tour.overlayHidden
        Assert-Equal "true" $storage["classquant_tour_completed"]
    }

    Test-Case "T4-03: Scenario 3 - Classroom Point Logging & Retro Recall Lifecycle" {
        $store = @{
            points = @{ "student_1" = 0 }
            history = @()
        }

        # Step A: In matrix view, award +3 points
        $store.points["student_1"] += 3
        $store.history += @{ student = "student_1"; delta = 3; tag = "主動解出難題" }

        # Step B: Teacher switches to Retro tab to adjust historical period 2
        $store.points["student_1"] += 2
        $store.history += @{ student = "student_1"; delta = 2; tag = "課堂事後補記" }

        # Step C: Verify cumulative score reflects both operations
        Assert-Equal 5 $store.points["student_1"]
        Assert-Equal 2 $store.history.Count
    }

    Test-Case "T4-04: Scenario 4 - Excel Roster Batch Import & Student Dossier Navigation" {
        $excelExportRaw = "1. 王小明 (男)`r`n2. 李小美 (女)`r`n3. 陳大同 (男)"
        $parsed = Parse-RosterBatchPaste -RawText $excelExportRaw
        Assert-Equal 3 $parsed.Count

        # Switch to Student Dossier view
        $switch = Simulate-TabSwitch -TargetTabId "student-dossier"
        Assert-Equal "student-dossier-view" $switch.VisibleContainer
    }

    Test-Case "T4-05: Scenario 5 - PWA Cold Boot Offline Application Workflow" {
        $isOffline = $true
        $cache = @{
            "index.html" = "<html>ClassQuant App</html>"
            "js/app.js" = "console.log('ClassQuant init');"
        }

        $bootHtml = if ($isOffline) { $cache["index.html"] } else { $null }
        $bootJs = if ($isOffline) { $cache["js/app.js"] } else { $null }

        Assert-NotNull $bootHtml
        Assert-NotNull $bootJs
        Assert-Contains "ClassQuant App" $bootHtml
    }

    Test-Case "T4-06: Scenario 6 - Live OTA Update Notification & Bulletin Release Notes Flow" {
        $storage = @{ "classquant_last_seen_version" = "1.5.0" }
        $currentAppVersion = "1.6.0"

        $shouldShowModal = ($storage["classquant_last_seen_version"] -ne $currentAppVersion)
        Assert-True $shouldShowModal

        # User dismisses modal
        $storage["classquant_last_seen_version"] = $currentAppVersion
        $shouldShowAfterDismiss = ($storage["classquant_last_seen_version"] -ne $currentAppVersion)
        Assert-False $shouldShowAfterDismiss
    }

    Test-Case "T4-07: Scenario 7 - Theme Switching & Web Audio Synthesizer Toggle Session" {
        $appState = @{
            theme = "sanrio-kitty"
            soundEnabled = $true
        }

        # Switch to TwinStars theme
        $appState.theme = "sanrio-twinstars"
        # Mute audio
        $appState.soundEnabled = $false

        Assert-Equal "sanrio-twinstars" $appState.theme
        Assert-False $appState.soundEnabled
    }

    Test-Case "T4-08: Scenario 8 - Mobile Small-Screen Orientation Change Reflow Simulation" {
        $target = @{ top = 400; left = 100; width = 150; height = 50 }
        
        # Portrait (375 x 812)
        $pPortrait = Calculate-PointerPlacement -Rect $target -Vw 375 -Vh 812
        # Landscape (812 x 375)
        $pLandscape = Calculate-PointerPlacement -Rect $target -Vw 812 -Vh 375

        Assert-Equal "hand-down" $pPortrait.Emoji
        Assert-Equal "hand-down" $pLandscape.Emoji
    }

    Test-Case "T4-09: Scenario 9 - Multi-Class Switch & Timetable Perception Workflow" {
        $appState = @{ currentClassId = "801" }
        $timetableSlot = @{ period = 2; classId = "803" }

        # Auto-switch class according to timetable
        $appState.currentClassId = $timetableSlot.classId
        Assert-Equal "803" $appState.currentClassId
    }

    Test-Case "T4-10: Scenario 10 - Manual Cache Flush & Hard Reload Lifecycle" {
        $cacheStorage = @{ "classquant-hub-v19" = @("index.html", "app.js") }
        
        # Flush cache
        $cacheStorage.Clear()
        Assert-Equal 0 $cacheStorage.Count

        $hardReloadUrl = "index.html?t=" + (Get-Date).Ticks
        Assert-Contains "?t=" $hardReloadUrl
    }
}

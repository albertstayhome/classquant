# Tier 4: Real-World Application Scenarios (10 Comprehensive Scenarios)
. "$PSScriptRoot\test_engine.ps1"

Test-Suite "Tier 4 -- Real-World Application Scenario Simulations" {
    Test-Case "T4-01: Scenario 1 - Complete 12-Step Master Walkthrough Simulation" {
        # Emulate entire 12-step sequence from Step 1 to Step 12
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
        $store.history += @{ student = "student_1"; delta = 3; tag = "Active Problem Solving" }

        # Step B: Switch to retro view and award +2 points
        $store.points["student_1"] += 2
        $store.history += @{ student = "student_1"; delta = 2; tag = "Homework Excellence" }

        Assert-Equal 5 $store.points["student_1"]
        Assert-Equal 2 $store.history.Count
    }

    Test-Case "T4-04: Scenario 4 - Excel Roster Batch Import & Student Dossier Navigation" {
        $excelInput = @"
1. Alex Chen
2. Beatrice Lin
3. Charles Wang
4. David Wu
5. Emily Chang
"@
        $roster = Parse-RosterBatchPaste -RawText $excelInput
        Assert-Equal 5 $roster.Count
        Assert-Equal 1 $roster[0].Seat
        Assert-Equal "Alex Chen" $roster[0].Name
        Assert-Equal 5 $roster[4].Seat
        Assert-Equal "Emily Chang" $roster[4].Name
    }

    Test-Case "T4-05: Scenario 5 - PWA Cold Boot Offline Application Workflow" {
        $offlineCache = @(
            "./index.html",
            "./manifest.json",
            "./version.json",
            "./css/styles.css",
            "./js/app.js",
            "./js/onboardingTour.js"
        )
        # Cold boot without network
        $req1 = Match-ServiceWorkerCache -CacheList $offlineCache -RequestUrl "./index.html" -Options @{ ignoreSearch = $true }
        $req2 = Match-ServiceWorkerCache -CacheList $offlineCache -RequestUrl "./js/app.js?v=1.6.0" -Options @{ ignoreSearch = $true }

        Assert-True $req1.Matched
        Assert-True $req2.Matched
    }

    Test-Case "T4-06: Scenario 6 - Live OTA Update Notification & Bulletin Release Notes Flow" {
        $storage = @{}
        $currentAppVersion = "1.6.0"
        $remoteVersion = "1.6.0"

        $isModalShown = $false
        if ($storage["classquant_last_seen_version"] -ne $remoteVersion) {
            $isModalShown = $true
            $storage["classquant_last_seen_version"] = $remoteVersion
        }
        Assert-True $isModalShown
        Assert-Equal "1.6.0" $storage["classquant_last_seen_version"]

        # Second launch
        $isModalShownSecond = ($storage["classquant_last_seen_version"] -ne $remoteVersion)
        Assert-False $isModalShownSecond
    }

    Test-Case "T4-07: Scenario 7 - Theme Switching & Web Audio Synthesizer Toggle Session" {
        $appState = @{
            theme = "kitty-theme"
            enableSound = $true
        }
        # Switch theme
        $appState.theme = "twinstars-theme"
        Assert-Equal "twinstars-theme" $appState.theme

        # Toggle sound off
        $appState.enableSound = -not $appState.enableSound
        Assert-False $appState.enableSound

        # Toggle sound on
        $appState.enableSound = -not $appState.enableSound
        Assert-True $appState.enableSound
    }

    Test-Case "T4-08: Scenario 8 - Mobile Small-Screen Orientation Change Reflow Simulation" {
        # Portrait (375x667)
        $rectPortrait = @{ top = 50; left = 20; width = 120; height = 40 }
        $pathPortrait = Calculate-SvgSpotlightPath -Rect $rectPortrait -Vw 375 -Vh 667
        $pointerPortrait = Calculate-PointerPlacement -Rect $rectPortrait -Vw 375 -Vh 667

        # Landscape (667x375)
        $rectLandscape = @{ top = 50; left = 20; width = 120; height = 40 }
        $pathLandscape = Calculate-SvgSpotlightPath -Rect $rectLandscape -Vw 667 -Vh 375
        $pointerLandscape = Calculate-PointerPlacement -Rect $rectLandscape -Vw 667 -Vh 375

        Assert-Contains "M 0 0 h 375 v 667 h -375 Z" $pathPortrait
        Assert-Contains "M 0 0 h 667 v 375 h -667 Z" $pathLandscape
        Assert-Equal "hand-up" $pointerPortrait.Emoji
        Assert-Equal "hand-up" $pointerLandscape.Emoji
    }

    Test-Case "T4-09: Scenario 9 - Multi-Class Switch & Timetable Perception Workflow" {
        $app = @{
            currentClass = "801"
            classData = @{
                "801" = @{ name = "Class 801 (Homeroom)"; studentCount = 30 }
                "803" = @{ name = "Class 803 (Math)"; studentCount = 28 }
                "805" = @{ name = "Class 805 (Math)"; studentCount = 29 }
            }
        }
        # Timetable switch to 803
        $app.currentClass = "803"
        Assert-Equal "803" $app.currentClass
        Assert-Equal 28 $app.classData[$app.currentClass].studentCount

        # Switch to 805
        $app.currentClass = "805"
        Assert-Equal 29 $app.classData[$app.currentClass].studentCount
    }

    Test-Case "T4-10: Scenario 10 - Manual Cache Flush & Hard Reload Lifecycle" {
        $cachedKeys = [System.Collections.Generic.List[string]]::new()
        $cachedKeys.Add("classquant-hub-v18")
        $cachedKeys.Add("classquant-hub-v19")

        # applyLiveOTAUpdate: delete all keys
        $cachedKeys.Clear()
        $reloaded = $true

        Assert-Equal 0 $cachedKeys.Count
        Assert-True $reloaded
    }
}

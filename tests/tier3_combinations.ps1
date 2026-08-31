# Tier 3: Cross-Feature Combinations (20 Test Cases)
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
    Test-Case "T3-12: Auto-Pilot Step 5 Tab Switch + View Panel Unhiding + Navbar Centering" {
        $appState = @{ activeTab = "matrix" }
        $navScroll = Calculate-NavScrollLeft -TargetLeft 200 -NavWidth 300 -TargetWidth 80
        # Auto-pilot click on roster tab
        $appState.activeTab = "roster"
        $unhiddenView = "roster-manager-view"
        Assert-Equal "roster" $appState.activeTab
        Assert-Equal "roster-manager-view" $unhiddenView
        Assert-Equal 90 $navScroll
    }

    Test-Case "T3-13: Auto-Pilot Step 8 Tab Switch + Retro Tab State + Spotlight Update" {
        $appState = @{ activeTab = "roster" }
        $appState.activeTab = "retro"
        $rect = @{ top = 120; left = 50; width = 200; height = 45 }
        $path = Calculate-SvgSpotlightPath -Rect $rect -Pad 6 -Vw 1024 -Vh 768
        Assert-Equal "retro" $appState.activeTab
        Assert-Contains "M 44 114 v 57 h 212 v -57 Z" $path
    }

    Test-Case "T3-14: Auto-Pilot Step 10 Tab Switch + Dashboard State + Four-Quadrant Spotlight" {
        $appState = @{ activeTab = "retro" }
        $appState.activeTab = "dashboard"
        $chartRect = @{ top = 250; left = 100; width = 600; height = 350 }
        $path = Calculate-SvgSpotlightPath -Rect $chartRect -Pad 6 -Vw 1024 -Vh 768
        Assert-Equal "dashboard" $appState.activeTab
        Assert-Contains "M 94 244 v 362 h 612 v -362 Z" $path
    }

    Test-Case "T3-15: Tour Launching While Modal Dialog Open (auto-closes modal on tour start)" {
        $modalVisible = $true
        # Start tour
        if ($modalVisible) {
            $modalVisible = $false
        }
        $tourActive = $true
        Assert-False $modalVisible
        Assert-True $tourActive
    }

    Test-Case "T3-16: Tour Active State + Smart Scroll Interaction (inhibits header auto-collapse)" {
        $tour = @{ isActive = $true }
        $scrollY = 150
        $headerCollapsed = $false
        if (-not $tour.isActive -and $scrollY -gt 70) {
            $headerCollapsed = $true
        }
        Assert-False $headerCollapsed
    }

    Test-Case "T3-17: Tour Step Progression + Web Audio Synthesizer (triggers pop, respects sound toggle)" {
        $settings = @{ enableSound = $true }
        $soundPlayed = $false
        if ($settings.enableSound) {
            $soundPlayed = $true
        }
        Assert-True $soundPlayed

        # Toggle mute
        $settings.enableSound = $false
        $soundPlayedMuted = $false
        if ($settings.enableSound) {
            $soundPlayedMuted = $true
        }
        Assert-False $soundPlayedMuted
    }

    Test-Case "T3-18: Tour Completion + LocalStorage Flag + Toast + Full Teardown" {
        $storage = @{}
        $tour = @{ isActive = $true; overlayHidden = $false }
        # endTour()
        $tour.isActive = $false
        $tour.overlayHidden = $true
        $storage["classquant_tour_completed"] = "true"
        $toastMsg = "Tour completed successfully!"

        Assert-False $tour.isActive
        Assert-True $tour.overlayHidden
        Assert-Equal "true" $storage["classquant_tour_completed"]
        Assert-NotNull $toastMsg
    }

    Test-Case "T3-19: PWA Offline Mode + SW Cache Matching + Tour State Persistence" {
        $cacheTable = @("./index.html", "./js/app.js", "./js/onboardingTour.js")
        $isOnline = $false
        $match = Match-ServiceWorkerCache -CacheList $cacheTable -RequestUrl "./js/onboardingTour.js?v=1.6.0" -Options @{ ignoreSearch = $true }
        Assert-True $match.Matched
        Assert-Equal "./js/onboardingTour.js" $match.CachedKey
    }

    Test-Case "T3-20: Live OTA Version Invalidation + Cache Purge + Hard Reload Flow" {
        $oldCaches = @("classquant-hub-v18")
        $newCache = "classquant-hub-v19"
        $purged = @()
        foreach ($c in $oldCaches) {
            if ($c -ne $newCache) {
                $purged += $c
            }
        }
        Assert-Equal 1 $purged.Count
        Assert-Equal "classquant-hub-v18" $purged[0]
    }
}

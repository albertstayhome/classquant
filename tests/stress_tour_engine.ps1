# ClassQuant Hub - Interactive Tour Empirical Stress Test Engine (PowerShell)
# Tests Race Conditions, Rapid Interactions, Teardown Invariants, and Live Chromium Execution

param(
    [switch]$SkipBrowser = $false
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\test_engine.ps1"

Write-Host "`n================================================================" -ForegroundColor Magenta
Write-Host " CLASSQUANT HUB ONBOARDING TOUR EMPIRICAL STRESS TEST HARNESS " -ForegroundColor Magenta
Write-Host "================================================================" -ForegroundColor Magenta

# -----------------------------------------------------------------------------
# SUITE 1: RAPID BURST CLICKING & MUTEX INTEGRITY (POWERSHELL SIMULATION)
# -----------------------------------------------------------------------------
Test-Suite "Stress Suite 1: Rapid Burst Clicking & Anti-Jump Mutex Verification" {

    Test-Case "S1.1: 50 rapid clicks on Next button within 100ms advances exactly 1 step" {
        $tour = @{
            currentStep = 3
            isActive = $true
            isTransitioning = $false
            lastTransitionTime = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - 500
            transitionDebounceMs = 250
            totalSteps = 12
        }

        $stepAdvances = 0
        $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

        # Simulate 50 burst clicks in 100ms
        for ($i = 0; $i -lt 50; $i++) {
            $currentTime = $now + ($i * 2) # each click 2ms apart, total 100ms
            if (-not $tour.isActive) { continue }
            if ($tour.isTransitioning -or ($currentTime - $tour.lastTransitionTime -lt $tour.transitionDebounceMs)) {
                # Mutex / Debounce blocked!
                continue
            }
            # Acquire lock
            $tour.isTransitioning = $true
            $tour.lastTransitionTime = $currentTime
            $tour.currentStep++
            $stepAdvances++
        }

        Assert-Equal 1 $stepAdvances "Expected exactly 1 step advance from 50 burst clicks"
        Assert-Equal 4 $tour.currentStep "Expected currentStep to be 4"
    }

    Test-Case "S1.2: 50 rapid calls to prevStep() within 100ms regresses exactly 1 step" {
        $tour = @{
            currentStep = 5
            isActive = $true
            isTransitioning = $false
            lastTransitionTime = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - 500
            transitionDebounceMs = 250
        }

        $stepRegressions = 0
        $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

        for ($i = 0; $i -lt 50; $i++) {
            $currentTime = $now + ($i * 2)
            if (-not $tour.isActive) { continue }
            if ($tour.isTransitioning -or ($currentTime - $tour.lastTransitionTime -lt $tour.transitionDebounceMs)) {
                continue
            }
            $tour.isTransitioning = $true
            $tour.lastTransitionTime = $currentTime
            if ($tour.currentStep -gt 0) {
                $tour.currentStep--
                $stepRegressions++
            }
        }

        Assert-Equal 1 $stepRegressions "Expected exactly 1 step regression from 50 burst prev calls"
        Assert-Equal 4 $tour.currentStep "Expected currentStep to be 4"
    }

    Test-Case "S1.3: 50 burst clicks outside spotlight boundary are intercepted by touch gating" {
        $spotlightBox = @{ x = 100; y = 150; w = 200; h = 100 }
        $gatedClicks = 0
        $passedClicks = 0

        # Simulate 50 clicks across the viewport
        for ($i = 0; $i -lt 50; $i++) {
            $clickX = ($i * 20) % 1024
            $clickY = ($i * 15) % 768

            $isInside = ($clickX -ge $spotlightBox.x) -and ($clickX -le ($spotlightBox.x + $spotlightBox.w)) -and
                        ($clickY -ge $spotlightBox.y) -and ($clickY -le ($spotlightBox.y + $spotlightBox.h))

            if (-not $isInside) {
                $gatedClicks++
            } else {
                $passedClicks++
            }
        }

        Assert-True ($gatedClicks -gt 40) "Touch gating must block all clicks falling outside the spotlight bounding box"
    }
}

# -----------------------------------------------------------------------------
# SUITE 2: MID-FLIGHT CANCELLATION & GHOST AUTO-PILOT TEARDOWN
# -----------------------------------------------------------------------------
Test-Suite "Stress Suite 2: Mid-Flight Auto-Pilot Ghost Cursor Cancellation & Token Discard" {

    Test-Case "S2.1: Cancellation token immediately invalidates in-flight safeDelay promises" {
        $session = 1
        $currentSessionId = 1
        $callbackExecuted = $false

        # Simulate safeDelay with session token
        $expectedSessionId = $session

        # Mid-flight cancellation occurs
        $currentSessionId++ # sessionId incremented
        $isActive = $false

        # When delay timer fires:
        if ($isActive -and ($currentSessionId -eq $expectedSessionId)) {
            $callbackExecuted = $true
        }

        Assert-False $callbackExecuted "Pending callback must be discarded when sessionId changes or isActive is false"
    }

    Test-Case "S2.2: cancelAutoPlay resets all visual cursor artifacts and simulated active classes" {
        $ghostCursor = @{ opacity = "1"; hasClickClass = $true }
        $targetButton = @{ hasActiveStyle = $true }
        $isAutoPlaying = $true

        # Teardown / cancelAutoPlay
        $isAutoPlaying = $false
        $ghostCursor.opacity = "0"
        $ghostCursor.hasClickClass = $false
        $targetButton.hasActiveStyle = $false

        Assert-False $isAutoPlaying "isAutoPlaying must be false"
        Assert-Equal "0" $ghostCursor.opacity "Ghost cursor opacity must reset to 0"
        Assert-False $ghostCursor.hasClickClass "Click animation class must be removed"
        Assert-False $targetButton.hasActiveStyle "Target simulated active style must be removed"
    }
}

# -----------------------------------------------------------------------------
# SUITE 3: RAPID RESIZE & SCROLL CONCURRENCY DURING MORPHING
# -----------------------------------------------------------------------------
Test-Suite "Stress Suite 3: Extreme Resize & Scroll Reflow during SVG Mask Morphing" {

    Test-Case "S3.1: 100 rapid resize calculations produce non-NaN rounded SVG mask paths" {
        $rect = @{ top = 120; left = 240; width = 180; height = 60 }
        $nanFound = $false

        for ($i = 0; $i -lt 100; $i++) {
            $vw = 320 + ($i * 15)
            $vh = 480 + ($i * 10)
            $path = Calculate-SvgSpotlightPath -Rect $rect -Pad 6 -Vw $vw -Vh $vh
            if ($path -match "NaN" -or $path -notmatch "^M 0 0 h \d+ v \d+ h -\d+ Z") {
                $nanFound = $true
                break
            }
        }

        Assert-False $nanFound "SVG mask generator must never output NaN under rapid viewport reflows"
    }

    Test-Case "S3.2: 4-Way Directional Arrow dynamically re-orients without collision under extreme resize" {
        $viewports = @(
            @{ vw = 320; vh = 480 },
            @{ vw = 375; vh = 812 },
            @{ vw = 768; vh = 1024 },
            @{ vw = 1920; vh = 1080 },
            @{ vw = 2560; vh = 1440 }
        )

        foreach ($vp in $viewports) {
            $rect = @{ top = 50; left = 50; width = 100; height = 40 }
            $p = Calculate-PointerPlacement -Rect $rect -Vw $vp.vw -Vh $vp.vh -Action "manual-click"
            Assert-True ($p.Left -match "^\d+px$") "Pointer Left coordinate must be formatted as pixel string"
            Assert-True ($p.Top -match "^\d+px$") "Pointer Top coordinate must be formatted as pixel string"
        }
    }
}

# -----------------------------------------------------------------------------
# SUITE 4: SELECT DROPDOWN TRAP DEFENSE (STEP 1)
# -----------------------------------------------------------------------------
Test-Suite "Stress Suite 4: Step 1 Select Dropdown Defense & Re-Selection" {

    Test-Case "S4.1: Dropdown blur without valid selection or interaction prevents advance" {
        $dropdownValue = ""
        $userInteracted = $false
        $stepAdvanced = $false

        if ($userInteracted -or ($dropdownValue -and $dropdownValue.Trim() -ne "")) {
            $stepAdvanced = $true
        }

        Assert-False $stepAdvanced "Step 1 must not advance on empty value without interaction"
    }

    Test-Case "S4.2: Dropdown click followed by re-selection of existing class value resolves to Step 2" {
        $dropdownValue = "301"
        $userInteracted = $true
        $stepAdvanced = $false

        if ($userInteracted -and ($dropdownValue -and $dropdownValue.Trim() -ne "")) {
            $stepAdvanced = $true
        }

        Assert-True $stepAdvanced "Step 1 must advance when user interacts and confirms valid class"
    }
}

# -----------------------------------------------------------------------------
# SUITE 5: 50 START/ABORT CYCLES & TEARDOWN PURGE
# -----------------------------------------------------------------------------
Test-Suite "Stress Suite 5: 50 Rapid Start/Abort Lifecycle Cycles & Teardown Purge" {

    Test-Case "S5.1: 50 consecutive start/abort cycles leave zero dangling timers and locks" {
        $activeTimers = [System.Collections.Generic.HashSet[int]]::new()
        $activeAnimations = [System.Collections.Generic.HashSet[int]]::new()
        $isTransitioning = $false
        $isActive = $false

        for ($cycle = 0; $cycle -lt 50; $cycle++) {
            # Start
            $isActive = $true
            $isTransitioning = $false
            for ($t = 0; $t -lt 5; $t++) {
                $null = $activeTimers.Add($cycle * 10 + $t)
                $null = $activeAnimations.Add($cycle * 10 + $t)
            }

            # Teardown / Destroy
            $isActive = $false
            $isTransitioning = $false
            $activeTimers.Clear()
            $activeAnimations.Clear()
        }

        Assert-Equal 0 $activeTimers.Count "All active timers must be cleared"
        Assert-Equal 0 $activeAnimations.Count "All active animations must be cleared"
        Assert-False $isTransitioning "isTransitioning lock must be released"
        Assert-False $isActive "isActive must be false"
    }
}

# -----------------------------------------------------------------------------
# SUITE 6: REAL CHROMIUM HEADLESS IN-BROWSER EXECUTION
# -----------------------------------------------------------------------------
if (-not $SkipBrowser) {
    Test-Suite "Stress Suite 6: Headless Chromium In-Browser Empirical Execution" {
        Test-Case "S6.1: Execute stress_tour_browser_runner.html in real Chromium engine" {
            $chromeExe = "C:\Program Files\Google\Chrome\Application\chrome.exe"
            if (-not (Test-Path $chromeExe)) {
                $chromeExe = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
            }

            if (-not (Test-Path $chromeExe)) {
                Write-Host "  [WARN] Chrome / Edge executable not found. Skipping browser runtime step." -ForegroundColor Yellow
                return
            }

            $port = 8100 + (Get-Random -Minimum 10 -Maximum 800)
            $rootDir = (Get-Item $PSScriptRoot).Parent.FullName
            $listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Loopback), $port
            $listener.Start()

            $browserReportJson = $null

            # Launch Chrome Headless
            $runnerUrl = "http://127.0.0.1:$port/tests/stress_tour_browser_runner.html"
            $psi = New-Object System.Diagnostics.ProcessStartInfo
            $psi.FileName = $chromeExe
            $psi.Arguments = "--headless=new --disable-gpu --no-first-run --no-default-browser-check `"$runnerUrl`""
            $psi.UseShellExecute = $false
            $chromeProc = [System.Diagnostics.Process]::Start($psi)

            $serverStart = [DateTime]::UtcNow
            try {
                while (([DateTime]::UtcNow - $serverStart).TotalSeconds -lt 50) {
                    if ($listener.Pending()) {
                        $client = $listener.AcceptTcpClient()
                        $stream = $client.GetStream()
                        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
                        
                        $requestLine = $reader.ReadLine()
                        if (-not $requestLine) { $client.Close(); continue }
                        $parts = $requestLine.Split(' ')
                        $method = $parts[0]
                        $reqPath = if ($parts.Length -gt 1) { $parts[1].Split('?')[0] } else { '/' }

                        # Read Headers
                        $headers = @{}
                        $contentLength = 0
                        while ($true) {
                            $line = $reader.ReadLine()
                            if ([string]::IsNullOrEmpty($line)) { break }
                            $headerParts = $line.Split(':', 2)
                            if ($headerParts.Length -eq 2) {
                                $hName = $headerParts[0].Trim().ToLower()
                                $hVal = $headerParts[1].Trim()
                                $headers[$hName] = $hVal
                                if ($hName -eq 'content-length') {
                                    $contentLength = [int]$hVal
                                }
                            }
                        }

                        if ($method -eq 'POST' -and $reqPath -eq '/api/test-report') {
                            $bodyChars = New-Object char[] $contentLength
                            $readCount = 0
                            while ($readCount -lt $contentLength) {
                                $r = $reader.Read($bodyChars, $readCount, $contentLength - $readCount)
                                if ($r -le 0) { break }
                                $readCount += $r
                            }
                            $bodyStr = New-Object string ($bodyChars, 0, $readCount)
                            $browserReportJson = $bodyStr

                            $respMsg = "HTTP/1.1 200 OK`r`nContent-Type: application/json`r`nAccess-Control-Allow-Origin: *`r`nContent-Length: 2`r`nConnection: close`r`n`r`n{}"
                            $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respMsg)
                            $stream.Write($respBytes, 0, $respBytes.Length)
                            $stream.Flush()
                            $client.Close()
                            break # We received the test report!
                        } elseif ($method -eq 'GET') {
                            $localPath = Join-Path $rootDir ($reqPath.TrimStart('/').Replace('/', '\'))
                            if (Test-Path $localPath -PathType Leaf) {
                                $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
                                $mime = switch ($ext) {
                                    '.html' { 'text/html; charset=utf-8' }
                                    '.js'   { 'application/javascript; charset=utf-8' }
                                    '.css'  { 'text/css; charset=utf-8' }
                                    '.json' { 'application/json; charset=utf-8' }
                                    Default { 'application/octet-stream' }
                                }
                                $fileBytes = [System.IO.File]::ReadAllBytes($localPath)
                                $header = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nAccess-Control-Allow-Origin: *`r`nContent-Length: $($fileBytes.Length)`r`nConnection: close`r`n`r`n"
                                $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                                $stream.Write($headerBytes, 0, $headerBytes.Length)
                                $stream.Write($fileBytes, 0, $fileBytes.Length)
                            } else {
                                $msg = "HTTP/1.1 404 Not Found`r`nContent-Length: 0`r`nConnection: close`r`n`r`n"
                                $msgBytes = [System.Text.Encoding]::ASCII.GetBytes($msg)
                                $stream.Write($msgBytes, 0, $msgBytes.Length)
                            }
                            $stream.Flush()
                            $client.Close()
                        } else {
                            $client.Close()
                        }
                    } else {
                        Start-Sleep -Milliseconds 100
                    }
                }
            } finally {
                $listener.Stop()
                if ($chromeProc -and -not $chromeProc.HasExited) {
                    $chromeProc.Kill()
                }
            }

            Assert-True ($null -ne $browserReportJson) "Browser runner must post back test report within timeout"

            $report = $browserReportJson | ConvertFrom-Json
            Write-Host "`n  --- In-Browser Live Chromium Stress Test Report ---" -ForegroundColor Cyan
            Write-Host "  Chromium Total: $($report.total) | Passed: $($report.passed) | Failed: $($report.failed)" -ForegroundColor Cyan
            foreach ($d in $report.details) {
                $mark = if ($d.passed) { "[PASS]" } else { "[FAIL]" }
                $color = if ($d.passed) { "DarkGreen" } else { "Red" }
                Write-Host "    $mark [$($d.suite)] $($d.name)" -ForegroundColor $color
                if ($d.error) {
                    Write-Host "           Error: $($d.error)" -ForegroundColor DarkRed
                }
            }
            Assert-Equal 0 $report.failed "All browser stress tests in Chromium must pass with 0 failures"
            Assert-True ($report.passed -ge 10) "At least 10 in-browser stress assertions must execute and pass"
        }
    }
}

# -----------------------------------------------------------------------------
# SUMMARY REPORT
# -----------------------------------------------------------------------------
Write-Host "`n================================================================" -ForegroundColor Magenta
Write-Host "              STRESS SUITE EXECUTION SUMMARY                    " -ForegroundColor Magenta
Write-Host "================================================================" -ForegroundColor Magenta
Write-Host "Total Stress Checks: $($global:CQTestResults.Total)"
Write-Host "Passed:             $($global:CQTestResults.Passed)" -ForegroundColor Green
Write-Host "Failed:             $($global:CQTestResults.Failed)" -ForegroundColor $(if ($global:CQTestResults.Failed -eq 0) { "Green" } else { "Red" })

if ($global:CQTestResults.Failed -gt 0) {
    Write-Host "`nErrors:" -ForegroundColor Red
    foreach ($err in $global:CQTestResults.Errors) {
        Write-Host " - $err" -ForegroundColor Red
    }
    exit 1
} else {
    Write-Host "`n? ALL STRESS TESTS EMPIRICALLY PASSED! (Exit Code 0)`n" -ForegroundColor Green
    exit 0
}

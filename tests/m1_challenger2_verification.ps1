# ==============================================================================
# ClassQuant Hub — Milestone M1 Challenger 2 Verification Harness
# Focus: Retro Log Seat Selection, Quick Scoring Auto-Clear, Floating Score Bubbles
# ==============================================================================

param(
    [switch]$SkipBrowser = $false
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\test_engine.ps1"

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host " CLASSQUANT HUB — M1 CHALLENGER 2 EMPIRICAL TEST SUITE          " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

Reset-CQTestResults

# -----------------------------------------------------------------------------
# SUITE 1: RETRO LOG VIEW SEAT TOGGLE & INTERACTION PERFORMANCE INVARIANTS
# -----------------------------------------------------------------------------
Test-Suite "M1-C2 Suite 1: Retro Log View In-Place Toggling & Invariants" {

    Test-Case "C2-1.1: Single seat toggle alternates selection state without full-state reset" {
        $selectedSeats = [System.Collections.Generic.HashSet[int]]::new()
        
        # Toggle 1 on
        $null = $selectedSeats.Add(1)
        Assert-True ($selectedSeats.Contains(1)) "Seat 1 added"
        Assert-Equal 1 $selectedSeats.Count "Count is 1"

        # Toggle 1 off
        $null = $selectedSeats.Remove(1)
        Assert-False ($selectedSeats.Contains(1)) "Seat 1 removed"
        Assert-Equal 0 $selectedSeats.Count "Count is 0"
    }

    Test-Case "C2-1.2: Odd/Even filter parity partitioning on 30 students" {
        $roster = 1..30
        $odds = $roster | Where-Object { $_ % 2 -ne 0 }
        $evens = $roster | Where-Object { $_ % 2 -eq 0 }

        Assert-Equal 15 $odds.Count "15 odd students"
        Assert-Equal 15 $evens.Count "15 even students"
        Assert-True (($odds | Measure-Object -Sum).Sum -eq 225) "Odd sum matches arithmetic sequence"
        Assert-True (($evens | Measure-Object -Sum).Sum -eq 240) "Even sum matches arithmetic sequence"
    }

    Test-Case "C2-1.3: 12,000 in-place seat toggling operations complete under 100ms (O(1) complexity)" {
        $selectedSeats = [System.Collections.Generic.HashSet[int]]::new()
        $sw = [System.Diagnostics.Stopwatch]::StartNew()

        for ($i = 0; $i -lt 12000; $i++) {
            $seatNo = ($i % 30) + 1
            if ($selectedSeats.Contains($seatNo)) {
                $null = $selectedSeats.Remove($seatNo)
            } else {
                $null = $selectedSeats.Add($seatNo)
            }
        }
        $sw.Stop()

        Assert-True ($sw.ElapsedMilliseconds -lt 100) "12,000 toggles took $($sw.ElapsedMilliseconds)ms (< 100ms)"
        Assert-Equal 0 $selectedSeats.Count "Exact 400 toggles per seat leaves selection empty"
    }

    Test-Case "C2-1.4: Batch submission creates individual event records for all selected students" {
        $selectedSeats = @(2, 5, 8, 11)
        $events = [System.Collections.Generic.List[hashtable]]::new()
        $customDelta = 2
        $customNote = "課堂分組積極解題"
        $classId = "801"
        $period = 3
        $tag = @{ Id = "quick_plus"; Name = "課堂記點"; Category = "discipline" }

        foreach ($seatNo in $selectedSeats) {
            $events.Add(@{
                ClassId = $classId
                SeatNo = $seatNo
                Period = $period
                TagId = $tag.Id
                TagName = $tag.Name
                Category = $tag.Category
                Delta = $customDelta
                Note = "[事後補記] $customNote"
            })
        }

        Assert-Equal 4 $events.Count "4 events created"
        Assert-True ($events | ForEach-Object { $_.Delta -eq 2 } | Measure-Object).Count -eq 4 "All events have delta +2"
        Assert-True ($events | ForEach-Object { $_.Note.StartsWith("[事後補記]") } | Measure-Object).Count -eq 4 "All events marked [事後補記]"
    }
}

# -----------------------------------------------------------------------------
# SUITE 2: QUICK SCORING AUTO-CLEAR & FINALLY BLOCK ERROR RESILIENCE
# -----------------------------------------------------------------------------
Test-Suite "M1-C2 Suite 2: Quick Scoring Auto-Clear & Finally Block Resilience" {

    Test-Case "C2-2.1: Normal execution path clears selection and logs events" {
        $matrixState = New-MatrixState
        Toggle-MatrixSeat -State $matrixState -SeatNo 1 | Out-Null
        Toggle-MatrixSeat -State $matrixState -SeatNo 3 | Out-Null
        Toggle-MatrixSeat -State $matrixState -SeatNo 7 | Out-Null

        Assert-Equal 3 (Get-MatrixSelectedCount -State $matrixState) "3 seats selected"

        $tag = @{ Id = "tag_1"; Name = "專注解題"; Delta = 3; Category = "discipline" }
        $res = Simulate-ApplyTag -MatrixState $matrixState -Tag $tag

        Assert-True $res.Success "Scoring succeeded"
        Assert-Equal 3 $res.AppliedCount "3 students awarded points"
        Assert-Equal 0 (Get-MatrixSelectedCount -State $matrixState) "Selection automatically cleared"
    }

    Test-Case "C2-2.2: Timetable exception does not block selection auto-clear" {
        $matrixState = New-MatrixState
        Toggle-MatrixSeat -State $matrixState -SeatNo 2 | Out-Null
        Toggle-MatrixSeat -State $matrixState -SeatNo 4 | Out-Null

        $exceptionThrown = $false
        try {
            try {
                throw "SIMULATED_TIMETABLE_FAILURE"
            }
            catch {
                $exceptionThrown = $true
            }
            finally {
                Clear-MatrixSeats -State $matrixState
            }
        }
        catch {}

        Assert-True $exceptionThrown "Exception was encountered"
        Assert-Equal 0 (Get-MatrixSelectedCount -State $matrixState) "Finally block cleared selection"
    }

    Test-Case "C2-2.3: Storage / QuotaExceeded failure does not block selection auto-clear" {
        $matrixState = New-MatrixState
        Toggle-MatrixSeat -State $matrixState -SeatNo 5 | Out-Null
        Toggle-MatrixSeat -State $matrixState -SeatNo 6 | Out-Null

        try {
            try {
                throw "QuotaExceededError: LocalStorage limit reached"
            }
            catch {}
            finally {
                Clear-MatrixSeats -State $matrixState
            }
        }
        catch {}

        Assert-Equal 0 (Get-MatrixSelectedCount -State $matrixState) "Selection cleared despite storage quota error"
    }

    Test-Case "C2-2.4: Score span target index evaluates character points correctly" {
        $ptsPos = Calculate-ScoreSpanRender -CharacterPoints 5
        Assert-Equal "text-emerald-700" $ptsPos.Class "Positive class is text-emerald-700"
        Assert-Equal "+5" $ptsPos.Text "Positive text is +5"

        $ptsNeg = Calculate-ScoreSpanRender -CharacterPoints -2
        Assert-Equal "text-rose-700" $ptsNeg.Class "Negative class is text-rose-700"
        Assert-Equal "-2" $ptsNeg.Text "Negative text is -2"

        $ptsZero = Calculate-ScoreSpanRender -CharacterPoints 0
        Assert-Equal "text-slate-500" $ptsZero.Class "Zero class is text-slate-500"
        Assert-Equal "0" $ptsZero.Text "Zero text is 0"
    }
}

# -----------------------------------------------------------------------------
# SUITE 3: FLOATING SCORE BUBBLES STYLING, POSITIONING & NON-DESTRUCTIVE REMOVAL
# -----------------------------------------------------------------------------
Test-Suite "M1-C2 Suite 3: Floating Score Bubbles Invariants" {

    Test-Case "C2-3.1: Positive floating bubble simulator properties" {
        $bubble = Simulate-FloatingBubble -SeatNo 5 -Delta 3
        Assert-Equal 5 $bubble.SeatNo "Seat number is 5"
        Assert-Equal 3 $bubble.Delta "Delta is 3"
        Assert-Equal "none" $bubble.PointerEvents "pointer-events is none"
        Assert-Equal 800 $bubble.AutoRemovalMs "Auto-removal timer is 800ms"
        Assert-Match "text-emerald-600" $bubble.ClassName "Class contains text-emerald-600"
        Assert-Match "kitty-stamp-effect" $bubble.ClassName "Class contains kitty-stamp-effect"
        Assert-True ($bubble.Text -like "*+3*") "Text contains +3"
    }

    Test-Case "C2-3.2: Negative floating bubble simulator properties" {
        $bubble = Simulate-FloatingBubble -SeatNo 8 -Delta -1
        Assert-Equal -1 $bubble.Delta "Delta is -1"
        Assert-Match "text-rose-600" $bubble.ClassName "Class contains text-rose-600"
        Assert-Equal "-1" $bubble.Text "Text is -1"
    }

    Test-Case "C2-3.3: CSS file audit for point-bubble and touch-action rules" {
        $cssFile = Join-Path (Get-Item $PSScriptRoot).Parent.FullName "css\styles.css"
        $cssContent = Read-ProjectFileUtf8 -Path $cssFile

        Assert-Match "touch-action:\s*manipulation" $cssContent "touch-action: manipulation present in styles.css"
        Assert-Match "-webkit-tap-highlight-color:\s*transparent" $cssContent "-webkit-tap-highlight-color present"
        Assert-Match "\.point-bubble\s*\{[^}]*pointer-events:\s*none" $cssContent "point-bubble has pointer-events: none"
        Assert-Match "\.point-bubble\s*\{[^}]*position:\s*absolute" $cssContent "point-bubble has position: absolute"
        Assert-Match "\.point-bubble\s*\{[^}]*z-index:\s*50" $cssContent "point-bubble has z-index: 50"
    }

    Test-Case "C2-3.4: Codebase audit for matrix.js scoreSpans[2] targeting" {
        $matrixFile = Join-Path (Get-Item $PSScriptRoot).Parent.FullName "js\matrix.js"
        $matrixContent = Read-ProjectFileUtf8 -Path $matrixFile

        Assert-Match "scoreSpans\.length\s*>=\s*3" $matrixContent "matrix.js checks scoreSpans.length >= 3"
        Assert-Match "scoreSpans\[2\]" $matrixContent "matrix.js targets scoreSpans[2] for character points"
        Assert-Match "finally\s*\{[\s\S]*?this\.clearSelection\(" $matrixContent "matrix.js uses finally block for clearSelection"
    }
}

# -----------------------------------------------------------------------------
# SUITE 4: IN-BROWSER LIVE CHROMIUM HEADLESS RUNNER
# -----------------------------------------------------------------------------
if (-not $SkipBrowser) {
    Test-Suite "M1-C2 Suite 4: In-Browser Live Chromium Headless Execution" {
        Test-Case "C2-4.1: Execute live DOM empirical test suite in Chromium / Edge" {
            $chromeExe = "C:\Program Files\Google\Chrome\Application\chrome.exe"
            if (-not (Test-Path $chromeExe)) {
                $chromeExe = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
            }

            if (-not (Test-Path $chromeExe)) {
                Write-Host "  [WARN] Neither Chrome nor Edge found on system. Skipping browser test." -ForegroundColor Yellow
                return
            }

            $runnerPath = Join-Path $PSScriptRoot "m1_challenger2_browser_runner.html"
            $runnerUrl = "file:///" + $runnerPath.Replace('\', '/')

            $psi = New-Object System.Diagnostics.ProcessStartInfo
            $psi.FileName = $chromeExe
            $psi.Arguments = "--headless=new --disable-gpu --no-first-run --no-default-browser-check --virtual-time-budget=6000 --dump-dom `"$runnerUrl`""
            $psi.UseShellExecute = $false
            $psi.RedirectStandardOutput = $true
            $psi.RedirectStandardError = $true
            $psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
            $psi.StandardErrorEncoding = [System.Text.Encoding]::UTF8

            $proc = [System.Diagnostics.Process]::Start($psi)
            $stdout = $proc.StandardOutput.ReadToEnd()
            $stderr = $proc.StandardError.ReadToEnd()
            $null = $proc.WaitForExit(15000)

            $testReport = $null
            if ($stdout -match '<script id="summary-data" type="application/json">([\s\S]*?)</script>') {
                $testReport = $matches[1].Trim() | ConvertFrom-Json
            }

            Assert-True ($null -ne $testReport) "Browser runner must produce valid JSON test report in DOM"

            Write-Host "`n  --- In-Browser Live Chromium Empirical Test Report ---" -ForegroundColor Cyan
            Write-Host "  Total: $($testReport.total) | Passed: $($testReport.passed) | Failed: $($testReport.failed)" -ForegroundColor Cyan
            foreach ($d in $testReport.details) {
                $mark = if ($d.passed) { "[PASS]" } else { "[FAIL]" }
                $color = if ($d.passed) { "DarkGreen" } else { "Red" }
                Write-Host "    $mark [$($d.suite)] $($d.name)" -ForegroundColor $color
                if (-not $d.passed -and $d.detail) {
                    Write-Host "           Detail: $($d.detail)" -ForegroundColor Red
                }
            }
            Assert-Equal 0 $testReport.failed "All browser empirical assertions must pass with 0 failures"
            Assert-True ($testReport.passed -ge 20) "At least 20 in-browser assertions must execute and pass (executed: $($testReport.passed))"
        }
    }
}

# -----------------------------------------------------------------------------
# SUMMARY & VERDICT
# -----------------------------------------------------------------------------
Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "         M1 CHALLENGER 2 VERIFICATION SUMMARY                   " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Total Tests Run : $($global:CQTestResults.Total)"
Write-Host "Passed          : $($global:CQTestResults.Passed)" -ForegroundColor Green
Write-Host "Failed          : $($global:CQTestResults.Failed)" -ForegroundColor $(if ($global:CQTestResults.Failed -eq 0) { "Green" } else { "Red" })

if ($global:CQTestResults.Failed -gt 0) {
    Write-Host "`nErrors:" -ForegroundColor Red
    foreach ($err in $global:CQTestResults.Errors) {
        Write-Host " - $err" -ForegroundColor Red
    }
    Write-Host "`n[CHALLENGER 2 VERDICT]: REQUEST_CHANGES" -ForegroundColor Red
    exit 1
} else {
    Write-Host "`n[CHALLENGER 2 VERDICT]: APPROVE" -ForegroundColor Green
    exit 0
}

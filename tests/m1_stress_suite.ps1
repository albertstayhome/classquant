# ClassQuant Hub - Milestone M1 Adversarial Stress Test Runner
# Zero-dependency PowerShell + Real Chromium Headless CDP Runner

param(
    [switch]$SkipBrowser = $false
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\test_engine.ps1"
Reset-CQTestResults

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   MILESTONE M1: NATIVE TOUCH & SELECTION ADVERSARIAL STRESS   " -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# SUITE 1: POWERSHELL-LEVEL HIGH-CONCURRENCY STATE & BITMASK INVARIANTS
# -----------------------------------------------------------------------------
Test-Suite "PowerShell Engine: High-Frequency Parity and Selection Bounds" {

    Test-Case "PS-M1.1: 500-iteration rapid burst toggle parity check on seat matrix" {
        $matrix = New-MatrixState -AllSeats (1..30)
        
        # 500 toggles on Seat 7 -> Even number of toggles must end in unselected state
        for ($i = 0; $i -lt 500; $i++) {
            Toggle-MatrixSeat -State $matrix -SeatNo 7 | Out-Null
        }
        Assert-False (Test-MatrixSeatSelected -State $matrix -SeatNo 7) "500 toggles must leave seat 7 unselected"
        Assert-Equal 0 (Get-MatrixSelectedCount -State $matrix) "Count must be 0"

        # 501 toggles on Seat 7 -> Odd number of toggles must end in selected state
        Toggle-MatrixSeat -State $matrix -SeatNo 7 | Out-Null
        Assert-True (Test-MatrixSeatSelected -State $matrix -SeatNo 7) "501 toggles must leave seat 7 selected"
        Assert-Equal 1 (Get-MatrixSelectedCount -State $matrix) "Count must be 1"
    }

    Test-Case "PS-M1.2: Multi-seat simultaneous selection and batch tag application" {
        $matrix = New-MatrixState -AllSeats (1..30)
        # Select odd seats (1, 3, 5, ..., 29 = 15 seats)
        for ($s = 1; $s -le 30; $s += 2) {
            Toggle-MatrixSeat -State $matrix -SeatNo $s | Out-Null
        }
        Assert-Equal 15 (Get-MatrixSelectedCount -State $matrix)

        $tag = @{ Id = "soc_help"; Name = "Help Others"; Delta = 2; Category = "social" }
        $store = @{ Events = [System.Collections.Generic.List[hashtable]]::new() }

        $res = Simulate-ApplyTag -MatrixState $matrix -Tag $tag -ClassId "801" -Period 3 -Store $store
        Assert-True $res.Success
        Assert-Equal 15 $res.AppliedCount
        Assert-Equal 15 $store.Events.Count
        Assert-Equal 0 (Get-MatrixSelectedCount -State $matrix) "Auto-clear must reset selected count to 0"
    }

    Test-Case "PS-M1.3: Negative score delta (-3) and zero score delta (0) tag invariants" {
        $matrix = New-MatrixState -AllSeats (1..30)
        Toggle-MatrixSeat -State $matrix -SeatNo 4 | Out-Null
        
        $negTag = @{ Id = "soc_verbal_fight"; Name = "Dispute"; Delta = -3; Category = "conflict" }
        $store = @{ Events = [System.Collections.Generic.List[hashtable]]::new() }
        
        $resNeg = Simulate-ApplyTag -MatrixState $matrix -Tag $negTag -Store $store
        Assert-True $resNeg.Success
        Assert-Equal "warning" $resNeg.Sound
        Assert-Equal -3 $store.Events[0].Delta

        # Score span formatting
        $renderNeg = Calculate-ScoreSpanRender -CharacterPoints -3
        Assert-Equal "text-rose-700" $renderNeg.Class
        Assert-Equal "-3" $renderNeg.Text

        $renderZero = Calculate-ScoreSpanRender -CharacterPoints 0
        Assert-Equal "text-slate-500" $renderZero.Class
        Assert-Equal "0" $renderZero.Text

        $renderPos = Calculate-ScoreSpanRender -CharacterPoints 5
        Assert-Equal "text-emerald-700" $renderPos.Class
        Assert-Equal "+5" $renderPos.Text
    }

    Test-Case "PS-M1.4: Empty student selection rejection and 0 event mutation" {
        $matrix = New-MatrixState -AllSeats (1..30)
        Clear-MatrixSeats -State $matrix
        
        $tag = @{ Id = "math_breakthrough"; Name = "Problem Solved"; Delta = 3; Category = "academic" }
        $store = @{ Events = [System.Collections.Generic.List[hashtable]]::new() }
        
        $res = Simulate-ApplyTag -MatrixState $matrix -Tag $tag -Store $store
        Assert-False $res.Success
        Assert-Equal 0 $res.AppliedCount
        Assert-Equal 0 $store.Events.Count
    }
}

# -----------------------------------------------------------------------------
# SUITE 2: IN-BROWSER CHROMIUM DEVTOOLS PROTOCOL (CDP) STRESS EXECUTION
# -----------------------------------------------------------------------------
if (-not $SkipBrowser) {
    Write-Host "`n----------------------------------------------------------------" -ForegroundColor Yellow
    Write-Host ">>> Launching Headless Chromium / Edge CDP Stress Test Runner..." -ForegroundColor Yellow
    Write-Host "----------------------------------------------------------------" -ForegroundColor Yellow

    $chromeExe = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    if (-not (Test-Path $chromeExe)) {
        $chromeExe = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    }

    if (-not (Test-Path $chromeExe)) {
        Write-Warning "No Chromium/Edge browser found at expected paths. Skipping in-browser execution."
    } else {
        $testUrl = "file:///d:/class_point_app_dev/tests/m1_stress_suite.html"
        $port = 9300 + (Get-Random -Minimum 10 -Maximum 600)
        $userDataDir = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "cdp_m1_" + (Get-Random))
        $null = New-Item -ItemType Directory -Path $userDataDir -Force

        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $chromeExe
        $psi.Arguments = "--headless=new --remote-debugging-port=$port --user-data-dir=`"$userDataDir`" --disable-gpu --no-first-run --no-default-browser-check `"$testUrl`""
        $psi.UseShellExecute = $false

        $proc = [System.Diagnostics.Process]::Start($psi)

        try {
            $wsUrl = $null
            $start = [DateTime]::UtcNow
            while (([DateTime]::UtcNow - $start).TotalSeconds -lt 12) {
                Start-Sleep -Milliseconds 300
                try {
                    $json = Invoke-RestMethod -Uri "http://127.0.0.1:$port/json/list" -ErrorAction SilentlyContinue
                    if ($json -and $json.Count -gt 0) {
                        $target = $json | Where-Object { $_.type -eq "page" -and $_.webSocketDebuggerUrl }
                        if ($target) {
                            $wsUrl = $target[0].webSocketDebuggerUrl
                            break
                        } elseif ($json[0].webSocketDebuggerUrl) {
                            $wsUrl = $json[0].webSocketDebuggerUrl
                            break
                        }
                    }
                } catch {}
            }

            if (-not $wsUrl) {
                throw "Could not connect to Chrome CDP endpoint on port $port"
            }

            $ws = New-Object System.Net.WebSockets.ClientWebSocket
            $cts = New-Object System.Threading.CancellationTokenSource
            $null = $ws.ConnectAsync([Uri]$wsUrl, $cts.Token).GetAwaiter().GetResult()

            $cmdId = 1
            function Invoke-CDPCommand($method, $params = @{}) {
                $id = $script:cmdId++
                $payload = @{
                    id = $id
                    method = $method
                    params = $params
                } | ConvertTo-Json -Compress

                $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
                $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$bytes)
                $null = $ws.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).GetAwaiter().GetResult()

                $buffer = New-Object byte[] 65536
                $recvSegment = New-Object System.ArraySegment[byte] -ArgumentList @(,$buffer)
                
                $sb = New-Object System.Text.StringBuilder
                do {
                    $result = $ws.ReceiveAsync($recvSegment, $cts.Token).GetAwaiter().GetResult()
                    $str = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
                    $null = $sb.Append($str)
                } while (-not $result.EndOfMessage)

                return ($sb.ToString() | ConvertFrom-Json)
            }

            # Enable Runtime domain
            $null = Invoke-CDPCommand -method "Runtime.enable"

            # Poll for window.__STRESS_TEST_RESULTS__
            $evalStart = [DateTime]::UtcNow
            $testResults = $null
            while (([DateTime]::UtcNow - $evalStart).TotalSeconds -lt 25) {
                Start-Sleep -Milliseconds 500
                $resp = Invoke-CDPCommand -method "Runtime.evaluate" -params @{
                    expression = 'JSON.stringify(window.__STRESS_TEST_RESULTS__ || null)'
                    returnByValue = $true
                }
                if ($resp.result.result.value -and $resp.result.result.value -ne "null") {
                    $testResults = $resp.result.result.value | ConvertFrom-Json
                    break
                }
            }

            if (-not $testResults) {
                throw "Timed out waiting for in-browser stress test execution."
            }

            Write-Host "`n=== In-Browser Stress Test Results (Chromium Engine) ===" -ForegroundColor Cyan
            Write-Host "Total: $($testResults.total) | Passed: $($testResults.passed) | Failed: $($testResults.failed)" -ForegroundColor Cyan
            
            foreach ($d in $testResults.details) {
                $global:CQTestResults.Total++
                if ($d.passed) {
                    $global:CQTestResults.Passed++
                    Write-Host "  [PASS] [$($d.suite)] $($d.name)" -ForegroundColor Green
                } else {
                    $global:CQTestResults.Failed++
                    Write-Host "  [FAIL] [$($d.suite)] $($d.name) -> $($d.error)" -ForegroundColor Red
                    $global:CQTestResults.Errors += "Browser [$($d.suite)] $($d.name) -> $($d.error)"
                }
            }

            if ($testResults.uncaughtErrors -and $testResults.uncaughtErrors.Count -gt 0) {
                Write-Host "`nUncaught JS Errors Detected in Browser:" -ForegroundColor Red
                foreach ($err in $testResults.uncaughtErrors) {
                    Write-Host "  - $err" -ForegroundColor Red
                }
            }

            try {
                $null = $ws.CloseOutputAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "Done", $cts.Token).GetAwaiter().GetResult()
            } catch {}
        }
        finally {
            if ($proc -and -not $proc.HasExited) {
                $proc.Kill()
            }
            if (Test-Path $userDataDir) {
                Remove-Item -Path $userDataDir -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

$failColor = if ($global:CQTestResults.Failed -eq 0) { "Green" } else { "Red" }
Write-Host "`n================================================================" -ForegroundColor Magenta
Write-Host "             M1 CHALLENGER 1 STRESS SUMMARY                     " -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Magenta
Write-Host ("Total Tests Run: {0}" -f $global:CQTestResults.Total) -ForegroundColor White
Write-Host ("Passed:         {0}" -f $global:CQTestResults.Passed) -ForegroundColor Green
Write-Host ("Failed:         {0}" -f $global:CQTestResults.Failed) -ForegroundColor $failColor

if ($global:CQTestResults.Failed -eq 0) {
    Write-Host "`nALL M1 ADVERSARIAL STRESS TESTS PASSED WITH 100% SUCCESS RATE!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n$($global:CQTestResults.Failed) TEST(S) FAILED." -ForegroundColor Red
    exit 1
}

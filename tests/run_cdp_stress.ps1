# PowerShell Chrome DevTools Protocol Test Runner
param(
    [string]$Url = "file:///d:/class_point_app_dev/tests/stress_tour_browser_runner.html",
    [int]$TimeoutSec = 15
)

$ErrorActionPreference = "Stop"

$chromeExe = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chromeExe)) {
    $chromeExe = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
}

$port = 9222 + (Get-Random -Minimum 10 -Maximum 900)
$userDataDir = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "cdp_chrome_" + (Get-Random))
$null = New-Item -ItemType Directory -Path $userDataDir -Force

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $chromeExe
$psi.Arguments = "--headless=new --remote-debugging-port=$port --user-data-dir=`"$userDataDir`" --disable-gpu --no-first-run --no-default-browser-check `"$Url`""
$psi.UseShellExecute = $false

$proc = [System.Diagnostics.Process]::Start($psi)

try {
    # Wait for DevTools HTTP endpoint
    $wsUrl = $null
    $start = [DateTime]::UtcNow
    while (([DateTime]::UtcNow - $start).TotalSeconds -lt 10) {
        Start-Sleep -Milliseconds 250
        try {
            $json = Invoke-RestMethod -Uri "http://127.0.0.1:$port/json/list" -ErrorAction SilentlyContinue
            if ($json -and $json.Count -gt 0 -and $json[0].webSocketDebuggerUrl) {
                $wsUrl = $json[0].webSocketDebuggerUrl
                break
            }
        } catch {}
    }

    if (-not $wsUrl) {
        throw "Could not connect to Chrome CDP endpoint on port $port"
    }

    # Connect WebSocket
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $cts = New-Object System.Threading.CancellationTokenSource
    $null = $ws.ConnectAsync([Uri]$wsUrl, $cts.Token).GetAwaiter().GetResult()

    # Helper to send CDP JSON-RPC command
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

    # Poll for window.__STRESS_TEST_RESULTS__
    $evalStart = [DateTime]::UtcNow
    $testResults = $null
    while (([DateTime]::UtcNow - $evalStart).TotalSeconds -lt $TimeoutSec) {
        Start-Sleep -Milliseconds 500
        $resp = Invoke-CDPCommand -method "Runtime.evaluate" -params @{
            expression = "JSON.stringify(window.__STRESS_TEST_RESULTS__ || null)"
            returnByValue = $true
        }
        if ($resp.result.result.value -and $resp.result.result.value -ne "null") {
            $testResults = $resp.result.result.value | ConvertFrom-Json
            break
        }
    }

    if (-not $testResults) {
        throw "Timed out waiting for stress tests to complete."
    }

    Write-Host "`n=== In-Browser Stress Test Results (Chromium Engine) ===" -ForegroundColor Cyan
    Write-Host "Total: $($testResults.total) | Passed: $($testResults.passed) | Failed: $($testResults.failed)" -ForegroundColor Cyan
    foreach ($d in $testResults.details) {
        $mark = if ($d.passed) { "[PASS]" } else { "[FAIL]" }
        $color = if ($d.passed) { "Green" } else { "Red" }
        Write-Host "  $mark [$($d.suite)] $($d.name)" -ForegroundColor $color
        if ($d.error) {
            Write-Host "         Error: $($d.error)" -ForegroundColor DarkRed
        }
    }

    $null = $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "Done", $cts.Token)

    if ($testResults.failed -gt 0) {
        exit 1
    } else {
        exit 0
    }

} finally {
    if ($proc -and -not $proc.HasExited) {
        $proc.Kill()
    }
    Start-Sleep -Milliseconds 300
    Remove-Item -Path $userDataDir -Recurse -Force -ErrorAction SilentlyContinue
}

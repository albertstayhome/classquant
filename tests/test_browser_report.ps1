$chromeExe = "C:\Program Files\Google\Chrome\Application\chrome.exe"
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
$proc.WaitForExit(10000)

Write-Host "Process exit code: $($proc.ExitCode)"
Write-Host "Stdout length: $($stdout.Length)"

if ($stdout -match '<script id="summary-data" type="application/json">([\s\S]*?)</script>') {
    $report = $matches[1].Trim() | ConvertFrom-Json
    Write-Host "PARSED REPORT:" -ForegroundColor Green
    Write-Host "Total: $($report.total) Passed: $($report.passed) Failed: $($report.failed)" -ForegroundColor Green
    foreach ($d in $report.details) {
        $mark = if ($d.passed) { "[PASS]" } else { "[FAIL]" }
        $color = if ($d.passed) { "Green" } else { "Red" }
        Write-Host "  $mark [$($d.suite)] $($d.name)" -ForegroundColor $color
    }
} else {
    Write-Host "Could not match pre#summary-json in stdout" -ForegroundColor Red
}

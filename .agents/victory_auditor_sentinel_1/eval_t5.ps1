$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
if (-not (Test-Path $chrome)) { $chrome = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' }
$port = 9399
$listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Loopback), $port
$listener.Start()

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $chrome
$psi.Arguments = --headless=new --disable-gpu --no-first-run http://127.0.0.1:/tests/tier5_adversarial_suite.html"
$psi.UseShellExecute = $false
$proc = [System.Diagnostics.Process]::Start($psi)

$report = $null
$start = [DateTime]::UtcNow
try {
 while (([DateTime]::UtcNow - $start).TotalSeconds -lt 25) {
 if ($listener.Pending()) {
 $client = $listener.AcceptTcpClient()
 $stream = $client.GetStream()
 $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
 $line = $reader.ReadLine()
 if ($line) {
 $parts = $line.Split(' ')
 $m = $parts[0]
 $p = if ($parts.Length -gt 1) { $parts[1].Split('?')[0] } else { '/' }
 $cl = 0
 while ($true) {
 $hl = $reader.ReadLine()
 if ([string]::IsNullOrEmpty($hl)) { break }
 $hp = $hl.Split(':', 2)
 if ($hp.Length -eq 2) {
 $hName = $hp[0].Trim().ToLower()
 if ($hName -eq 'content-length') { $cl = [int]$hp[1].Trim() }
 }
 }
 if ($m -eq 'POST') {
 $bodyChars = New-Object char[] $cl
 $read = 0
 while ($read -lt $cl) {
 $r = $reader.Read($bodyChars, $read, $cl - $read)
 if ($r -le 0) { break }
 $read += $r
 }
 $report = New-Object string ($bodyChars, 0, $read)
 $resp = HTTP/1.1 200 OK
Content-Length: 2

{}
 $bytes = [System.Text.Encoding]::UTF8.GetBytes($resp)
 $stream.Write($bytes, 0, $bytes.Length)
 $client.Close()
 break
 } elseif ($m -eq 'GET') {
 $localPath = Join-Path 'd:\class_point_app_dev' ($p.TrimStart('/').Replace('/', '\'))
 if (Test-Path $localPath -PathType Leaf) {
 $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
 $mime = if ($ext -eq '.html') { 'text/html' } elseif ($ext -eq '.js') { 'application/javascript' } elseif ($ext -eq '.css') { 'text/css' } else { 'application/octet-stream' }
 $fb = [System.IO.File]::ReadAllBytes($localPath)
 $hdr = HTTP/1.1 200 OK
Content-Type: $mime
Content-Length: 0


 $hb = [System.Text.Encoding]::ASCII.GetBytes($hdr)
 $stream.Write($hb, 0, $hb.Length)
 $stream.Write($fb, 0, $fb.Length)
 } else {
 $hdr = HTTP/1.1 404 Not Found
Content-Length: 0


 $hb = [System.Text.Encoding]::ASCII.GetBytes($hdr)
 $stream.Write($hb, 0, $hb.Length)
 }
 $client.Close()
 } else {
 $client.Close()
 }
 }
 } else {
 Start-Sleep -Milliseconds 100
 }
 }
} finally {
 $listener.Stop()
 if ($proc -and -not $proc.HasExited) { $proc.Kill() }
}

if ($report) {
 $rObj = $report | ConvertFrom-Json
 Write-Host In-Browser Total: $(.total) | Passed: $(.passed) | Failed: $(.failed)
 foreach ($d in $rObj.details) {
 $status = if ($d.passed) { 'PASS' } else { 'FAIL' }
 Write-Host   [$($d.suite)] $($d.name): $status
 }
} else {
 Write-Host No report received.
}

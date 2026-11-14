param([int]$Port = 8080)
$rootDir = (Get-Location).Path
$ipAddresses = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback|vEthernet|WSL' -and $_.IPAddress -notmatch '^169\.' }).IPAddress
$listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Any), $Port
$listener.Start()
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " ClassQuant Hub - Local Test Server (v1.9.23)" -ForegroundColor Cyan
Write-Host " Server started on Port $Port" -ForegroundColor Green
Write-Host " Available LAN URLs for mobile testing:"
foreach ($ip in $ipAddresses) {
    Write-Host "   👉 http://$($ip):$Port" -ForegroundColor Yellow
}
Write-Host " API Endpoint: POST /api/feedback (Auto-Persist)" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.htm'  = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
    '.webp' = 'image/webp'
}

$resolvedRootPrefix = [System.IO.Path]::GetFullPath($rootDir).TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar

function Read-RawHttpRequest {
    param([System.Net.Sockets.NetworkStream]$Stream)
    $Stream.ReadTimeout = 5000
    $ms = New-Object System.IO.MemoryStream
    $buf = New-Object byte[] 4096
    $headerEndIdx = -1
    while ($headerEndIdx -lt 0 -and $ms.Length -lt 65536) {
        $n = $Stream.Read($buf, 0, $buf.Length)
        if ($n -le 0) { break }
        $ms.Write($buf, 0, $n)
        $bytesSoFar = $ms.ToArray()
        for ($i = 0; $i -le ($bytesSoFar.Length - 4); $i++) {
            if ($bytesSoFar[$i] -eq 13 -and $bytesSoFar[$i + 1] -eq 10 -and $bytesSoFar[$i + 2] -eq 13 -and $bytesSoFar[$i + 3] -eq 10) {
                $headerEndIdx = $i
                break
            }
        }
    }
    if ($headerEndIdx -lt 0) { return $null }
    $allBytes = $ms.ToArray()
    $headerText = [System.Text.Encoding]::ASCII.GetString($allBytes, 0, $headerEndIdx)
    $lines = $headerText -split "`r`n"
    $requestLine = $lines[0]
    $headers = @{}
    $contentLength = 0
    for ($k = 1; $k -lt $lines.Length; $k++) {
        $colonIdx = $lines[$k].IndexOf(':')
        if ($colonIdx -gt 0) {
            $hName = $lines[$k].Substring(0, $colonIdx).Trim().ToLower()
            $hVal = $lines[$k].Substring($colonIdx + 1).Trim()
            $headers[$hName] = $hVal
            if ($hName -eq 'content-length') {
                [int]::TryParse($hVal, [ref]$contentLength) | Out-Null
            }
        }
    }
    $bodyStart = $headerEndIdx + 4
    $alreadyBodyLen = $allBytes.Length - $bodyStart
    $bodyStream = New-Object System.IO.MemoryStream
    if ($alreadyBodyLen -gt 0) {
        $copyLen = if ($contentLength -gt 0) { [Math]::Min($alreadyBodyLen, $contentLength) } else { $alreadyBodyLen }
        $bodyStream.Write($allBytes, $bodyStart, $copyLen)
    }
    while ($contentLength -gt 0 -and $bodyStream.Length -lt $contentLength) {
        $rem = [int]($contentLength - $bodyStream.Length)
        $chunk = New-Object byte[] ([Math]::Min(8192, $rem))
        $n = $Stream.Read($chunk, 0, $chunk.Length)
        if ($n -le 0) { break }
        $bodyStream.Write($chunk, 0, $n)
    }
    $bodyText = if ($bodyStream.Length -gt 0) { [System.Text.Encoding]::UTF8.GetString($bodyStream.ToArray()) } else { "" }
    return @{ RequestLine = $requestLine; Headers = $headers; Body = $bodyText }
}

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $req = Read-RawHttpRequest -Stream $stream
        if (-not $req -or -not $req.RequestLine) { $client.Close(); continue }
        $tokens = $req.RequestLine.Split(' ')
        if ($tokens.Length -lt 2) { $client.Close(); continue }
        $method = $tokens[0].ToUpper()
        $rawPath = $tokens[1].Split('?')[0]
        $body = $req.Body

        # 1. CORS Preflight
        if ($method -eq 'OPTIONS') {
            $respHeader = "HTTP/1.1 204 No Content`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type, Authorization`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($respHeader)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Flush()
            $client.Close()
            continue
        }

        # 2. API: GET /api/feedback
        if ($method -eq 'GET' -and $rawPath -eq '/api/feedback') {
            $fbPath = Join-Path $rootDir "data\feedback.json"
            $bytes = if (Test-Path $fbPath) { [System.IO.File]::ReadAllBytes($fbPath) } else { [System.Text.Encoding]::UTF8.GetBytes("[]") }
            $header = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($bytes, 0, $bytes.Length)
            $stream.Flush()
            $client.Close()
            continue
        }

        # 3. API: POST /api/feedback (Auto-Save new/updated/deleted feedback directly to data/feedback.json)
        if ($method -eq 'POST' -and $rawPath -eq '/api/feedback') {
            if ($body) {
                try {
                    $entry = $body | ConvertFrom-Json
                    $fbPath = Join-Path $rootDir "data\feedback.json"
                    $list = @()
                    if (Test-Path $fbPath) {
                        $rawJson = [System.IO.File]::ReadAllText($fbPath, [System.Text.Encoding]::UTF8)
                        if ($rawJson -and $rawJson.Trim().Length -gt 0) {
                            $parsed = $rawJson | ConvertFrom-Json
                            if ($null -ne $parsed) { $list = @($parsed) }
                        }
                    }
                    $incoming = if ($entry -is [System.Array]) { $entry } else { @($entry) }
                    foreach ($item in $incoming) {
                        if (-not $item -or -not $item.id) { continue }
                        if ($item.action -eq 'delete' -or $item.deleted -eq $true) {
                            $list = @($list | Where-Object { $_.id -ne $item.id })
                            continue
                        }
                        $idx = -1
                        for ($k = 0; $k -lt $list.Count; $k++) {
                            if ($list[$k].id -eq $item.id) { $idx = $k; break }
                        }
                        if ($idx -ge 0) {
                            $list[$idx] = $item
                        } else {
                            $list = @($item) + $list
                        }
                    }
                    if ($list.Count -eq 0) {
                        $newJson = "[]"
                    } elseif ($list.Count -eq 1) {
                        $newJson = "[" + ($list[0] | ConvertTo-Json -Depth 10) + "]"
                    } else {
                        $newJson = $list | ConvertTo-Json -Depth 10
                    }
                    [System.IO.File]::WriteAllText($fbPath, $newJson, [System.Text.Encoding]::UTF8)
                    Write-Host "[Auto-Sync] Processed $($incoming.Count) feedback item(s)." -ForegroundColor Green
                } catch {
                    Write-Host "[Auto-Sync Error] $_" -ForegroundColor Red
                }
            }
            $respBody = '{"success":true}'
            $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respBody)
            $respHeader = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($respBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($respHeader)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($respBytes, 0, $respBytes.Length)
            $stream.Flush()
            $client.Close()
            continue
        }

        # 4. API: POST /api/cloud-config (Merge with existing keys so Form & Feedback config never overwrite each other)
        if ($method -eq 'POST' -and $rawPath -eq '/api/cloud-config') {
            if ($body) {
                $cfgPath = Join-Path $rootDir "data\cloud_config.json"
                $utf8NoBom = New-Object System.Text.UTF8Encoding $false
                $merged = [ordered]@{}
                if (Test-Path $cfgPath) {
                    try {
                        $existing = [System.IO.File]::ReadAllText($cfgPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
                        if ($existing) {
                            foreach ($prop in $existing.PSObject.Properties) {
                                $merged[$prop.Name] = $prop.Value
                            }
                        }
                    } catch {}
                }
                try {
                    $incomingCfg = $body | ConvertFrom-Json
                    if ($incomingCfg) {
                        foreach ($prop in $incomingCfg.PSObject.Properties) {
                            $merged[$prop.Name] = $prop.Value
                        }
                    }
                    $jsonOut = $merged | ConvertTo-Json -Depth 5
                    [System.IO.File]::WriteAllText($cfgPath, $jsonOut, $utf8NoBom)
                } catch {
                    [System.IO.File]::WriteAllText($cfgPath, $body, $utf8NoBom)
                }
            }
            $respBody = '{"success":true}'
            $respBytes = [System.Text.Encoding]::UTF8.GetBytes($respBody)
            $respHeader = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($respBytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($respHeader)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($respBytes, 0, $respBytes.Length)
            $stream.Flush()
            $client.Close()
            continue
        }

        # 5. Static File Serving (with Path Traversal Guard)
        if ($rawPath -eq '/' -or $rawPath -eq '') { $rawPath = '/index.html' }
        $relPath = [System.Uri]::UnescapeDataString($rawPath.TrimStart('/').Replace('/', '\'))
        $filePath = [System.IO.Path]::GetFullPath((Join-Path $rootDir $relPath))
        if (-not $filePath.StartsWith($resolvedRootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            $msg = '403 Forbidden'
            $msgBytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
            $header = "HTTP/1.1 403 Forbidden`r`nContent-Type: text/plain`r`nContent-Length: $($msgBytes.Length)`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($msgBytes, 0, $msgBytes.Length)
        } elseif (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $len = $bytes.Length
            $header = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $len`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($bytes, 0, $bytes.Length)
        } else {
            $msg = '404 Not Found'
            $msgBytes = [System.Text.Encoding]::UTF8.GetBytes($msg)
            $len = $msgBytes.Length
            $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: $len`r`nConnection: close`r`n`r`n"
            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($msgBytes, 0, $msgBytes.Length)
        }
        $stream.Flush()
        $client.Close()
    } catch {}
}

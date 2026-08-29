param([int]$Port = 8080)
$rootDir = (Get-Location).Path
$ipAddresses = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback|vEthernet|WSL' -and $_.IPAddress -notmatch '^169\.' }).IPAddress
$listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Any), $Port
$listener.Start()
Write-Host "Server started on Port $Port"
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
}
while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII)
        $firstLine = $reader.ReadLine()
        if (-not $firstLine) { $client.Close(); continue }
        $tokens = $firstLine.Split(' ')
        if ($tokens.Length -lt 2) { $client.Close(); continue }
        $rawPath = $tokens[1].Split('?')[0]
        if ($rawPath -eq '/' -or $rawPath -eq '') { $rawPath = '/index.html' }
        $relPath = [System.Uri]::UnescapeDataString($rawPath.TrimStart('/').Replace('/', '\'))
        $filePath = Join-Path $rootDir $relPath
        if (Test-Path $filePath -PathType Leaf) {
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

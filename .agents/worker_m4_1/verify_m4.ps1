$ErrorActionPreference = "Stop"

function Read-Utf8($path) {
    return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

Write-Host "Verifying Milestone 4 Implementation..."

# 1. version.json
$vJson = Read-Utf8 "d:\class_point_app_dev\version.json" | ConvertFrom-Json
if ($vJson.version -ne "1.6.0") { throw "version.json version mismatch: $($vJson.version)" }
if ($vJson.buildNumber -ne 2026083004) { throw "version.json buildNumber mismatch: $($vJson.buildNumber)" }
Write-Host "  [OK] version.json: $($vJson.version) (build $($vJson.buildNumber))" -ForegroundColor Green

# 2. manifest.json
$mJson = Read-Utf8 "d:\class_point_app_dev\manifest.json" | ConvertFrom-Json
if ($mJson.version -ne "1.6.0") { throw "manifest.json version mismatch: $($mJson.version)" }
if ($mJson.id -ne "com.classquant.hub") { throw "manifest.json id mismatch: $($mJson.id)" }
Write-Host "  [OK] manifest.json: $($mJson.version) (id $($mJson.id))" -ForegroundColor Green

# 3. service-worker.js
$sw = Read-Utf8 "d:\class_point_app_dev\service-worker.js"
if ($sw -notmatch "CACHE_NAME = 'classquant-hub-v20'") { throw "service-worker.js CACHE_NAME mismatch" }
if ($sw -notmatch "ignoreSearch:\s*true") { throw "service-worker.js ignoreSearch missing" }
Write-Host "  [OK] service-worker.js: classquant-hub-v20 with ignoreSearch: true" -ForegroundColor Green

# 4. index.html
$idx = Read-Utf8 "d:\class_point_app_dev\index.html"
if ($idx -notmatch "ClassQuant Hub v1\.6\.0") { throw "index.html footer version mismatch" }
if ($idx -notmatch "<span>v1\.6\.0</span>") { throw "index.html header badge version mismatch" }
if ($idx -notmatch "styles\.css\?v=1\.6\.0") { throw "index.html styles query mismatch" }
Write-Host "  [OK] index.html: footer v1.6.0, badge v1.6.0, styles query ?v=1.6.0" -ForegroundColor Green

# 5. android/app/build.gradle
$gradle = Read-Utf8 "d:\class_point_app_dev\android\app\build.gradle"
if ($gradle -notmatch 'versionName\s+"1\.6\.0"') { throw "build.gradle versionName mismatch" }
if ($gradle -notmatch 'versionCode\s+160') { throw "build.gradle versionCode mismatch" }
Write-Host "  [OK] android/app/build.gradle: versionCode 160, versionName 1.6.0" -ForegroundColor Green

# 6. js/app.js
$app = Read-Utf8 "d:\class_point_app_dev\js\app.js"
if ($app -notmatch "this\.appVersion = '1\.6\.0'") { throw "js/app.js appVersion mismatch" }
if ($app -notmatch "compareVersions\(v1, v2\)") { throw "js/app.js compareVersions missing" }
if ($app -notmatch "showSWUpdateBanner\(reg\)") { throw "js/app.js showSWUpdateBanner missing" }
Write-Host "  [OK] js/app.js: this.appVersion = '1.6.0', compareVersions, showSWUpdateBanner" -ForegroundColor Green

Write-Host "`nALL 6 FILES ARE 100% SYNCHRONIZED AND VALIDATED!" -ForegroundColor Cyan

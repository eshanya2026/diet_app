# Install all dependencies: root, server, client
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "Installing root dependencies..." -ForegroundColor Cyan
Set-Location $root
npm install
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Installing server dependencies..." -ForegroundColor Cyan
Set-Location "$root\server"
npm install
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Installing client dependencies..." -ForegroundColor Cyan
Set-Location "$root\client"
npm install
if ($LASTEXITCODE -ne 0) { exit 1 }

Set-Location $root
Write-Host "`nAll dependencies installed successfully." -ForegroundColor Green

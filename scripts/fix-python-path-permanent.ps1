# Fix Python Scripts PATH - Permanent Solution
# This script adds Python Scripts directory to User PATH permanently

$ErrorActionPreference = "Stop"

Write-Host "=== Python Scripts PATH Fix ===" -ForegroundColor Cyan
Write-Host ""

# Detect Python Scripts directory
$PythonScriptsPath = "$env:APPDATA\Python\Python312\Scripts"

Write-Host "Checking Python Scripts directory..." -ForegroundColor Yellow
if (-not (Test-Path $PythonScriptsPath)) {
    Write-Host "ERROR: Python Scripts directory not found at: $PythonScriptsPath" -ForegroundColor Red
    Write-Host "Please verify your Python installation." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Found: $PythonScriptsPath" -ForegroundColor Green
Write-Host ""

# Check if already in User PATH
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -like "*$PythonScriptsPath*") {
    Write-Host "✓ Python Scripts directory is already in User PATH" -ForegroundColor Green
} else {
    Write-Host "Adding to User PATH permanently..." -ForegroundColor Yellow
    $NewPath = "$UserPath;$PythonScriptsPath"
    [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
    Write-Host "✓ Added to User PATH permanently" -ForegroundColor Green
}

Write-Host ""
Write-Host "Updating current session PATH..." -ForegroundColor Yellow
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
Write-Host "✓ Current session PATH updated" -ForegroundColor Green

Write-Host ""
Write-Host "=== Verification ===" -ForegroundColor Cyan
Write-Host ""

# Test agentcore command
Write-Host "Testing agentcore command..." -ForegroundColor Yellow
try {
    $version = agentcore --version 2>&1
    Write-Host "✓ agentcore command works: $version" -ForegroundColor Green
} catch {
    Write-Host "✗ agentcore command not found" -ForegroundColor Red
    Write-Host "You may need to restart your terminal or run:" -ForegroundColor Yellow
    Write-Host "  `$env:Path += ';$PythonScriptsPath'" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "✓ Python Scripts directory: $PythonScriptsPath" -ForegroundColor Green
Write-Host "✓ Added to User PATH (permanent)" -ForegroundColor Green
Write-Host "✓ Current session PATH updated" -ForegroundColor Green
Write-Host ""
Write-Host "If agentcore still doesn't work, restart your terminal." -ForegroundColor Yellow

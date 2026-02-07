$ErrorActionPreference = "Stop"

Write-Host "=== Git Large File Cleanup Script ===" -ForegroundColor Cyan

# Step 1: Kill stuck git processes
Write-Host "Killing stuck git processes..." -ForegroundColor Yellow
Get-Process -Name "git" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Step 2: Create backup
Write-Host "Creating backup..." -ForegroundColor Yellow
$backupPath = "C:\Users\j_e_a\OneDrive\Projects\Vitracka-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -Path "C:\Users\j_e_a\OneDrive\Projects\Vitracka-new" -Destination $backupPath -Recurse
Write-Host "Backup created at: $backupPath" -ForegroundColor Green

# Step 3: Download BFG
Write-Host "Downloading BFG Repo Cleaner..." -ForegroundColor Yellow
$bfgPath = "$env:TEMP\bfg.jar"
$bfgUrl = "https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar"
Invoke-WebRequest -Uri $bfgUrl -OutFile $bfgPath
Write-Host "BFG downloaded" -ForegroundColor Green

# Step 4: Run BFG
Write-Host "Removing large files from git history..." -ForegroundColor Yellow
Push-Location "C:\Users\j_e_a\OneDrive\Projects\Vitracka-new"
java -jar $bfgPath --strip-blobs-bigger-than 100M

# Step 5: Clean up git
Write-Host "Cleaning up git repository..." -ForegroundColor Yellow
git reflog expire --expire=now --all
git gc --prune=now --aggressive
Pop-Location

Write-Host ""
Write-Host "=== Complete ===" -ForegroundColor Green
Write-Host "Backup: $backupPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "To push, run: git push origin main --force" -ForegroundColor Yellow

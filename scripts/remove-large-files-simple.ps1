$ErrorActionPreference = "Stop"

Write-Host "=== Simple Git Large File Removal ===" -ForegroundColor Cyan
Write-Host ""

# The problematic file path from the error
$largeFile = "Vitracka/terraform/bootstrap/.terraform/providers/registry.terraform.io/hashicorp/aws/5.100.0/windows_amd64/terraform-provider-aws_v5.100.0_x5.exe"

Write-Host "Removing large file from git history..." -ForegroundColor Yellow
Write-Host "File: $largeFile" -ForegroundColor Gray
Write-Host ""

# Use git filter-repo if available, otherwise use filter-branch
$filterRepoExists = Get-Command git-filter-repo -ErrorAction SilentlyContinue

if ($filterRepoExists) {
    Write-Host "Using git-filter-repo (recommended)..." -ForegroundColor Green
    git filter-repo --path $largeFile --invert-paths --force
} else {
    Write-Host "Using git filter-branch..." -ForegroundColor Yellow
    $env:FILTER_BRANCH_SQUELCH_WARNING = "1"
    git filter-branch --force --index-filter "git rm --cached --ignore-unmatch '$largeFile'" --prune-empty --tag-name-filter cat -- --all
}

Write-Host ""
Write-Host "Cleaning up..." -ForegroundColor Yellow
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host ""
Write-Host "=== Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next step: git push origin main --force" -ForegroundColor Cyan

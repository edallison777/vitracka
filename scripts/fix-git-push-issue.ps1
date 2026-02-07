$ErrorActionPreference = "Stop"

Write-Host "=== Git Push Fix - Alternative Approach ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check current status
Write-Host "Checking repository status..." -ForegroundColor Yellow
git status

Write-Host ""
Write-Host "The issue is that git history contains a large file from the old hypermage repo." -ForegroundColor Yellow
Write-Host "File: Vitracka/terraform/bootstrap/.terraform/providers/registry.terraform.io/hashicorp/aws/5.100.0/windows_amd64/terraform-provider-aws_v5.100.0_x5.exe" -ForegroundColor Gray
Write-Host ""

# Step 2: Offer solutions
Write-Host "=== Solution Options ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option A: Install git-filter-repo (RECOMMENDED)" -ForegroundColor Green
Write-Host "  1. Install Python if not already installed" -ForegroundColor Gray
Write-Host "  2. Run: pip install git-filter-repo" -ForegroundColor Gray
Write-Host "  3. Run this script again" -ForegroundColor Gray
Write-Host ""
Write-Host "Option B: Start fresh with current code (FASTEST)" -ForegroundColor Yellow
Write-Host "  1. Create a new branch from current state" -ForegroundColor Gray
Write-Host "  2. Force push to replace main branch" -ForegroundColor Gray
Write-Host "  3. This loses git history but keeps all current code" -ForegroundColor Gray
Write-Host ""
Write-Host "Option C: Manual BFG approach" -ForegroundColor Yellow
Write-Host "  1. Requires Java installed" -ForegroundColor Gray
Write-Host "  2. May take longer but preserves more history" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Which option? (A/B/C)"

switch ($choice.ToUpper()) {
    "A" {
        Write-Host ""
        Write-Host "Checking for git-filter-repo..." -ForegroundColor Yellow
        $hasFilterRepo = Get-Command git-filter-repo -ErrorAction SilentlyContinue
        if ($hasFilterRepo) {
            Write-Host "git-filter-repo found! Running cleanup..." -ForegroundColor Green
            git filter-repo --path "Vitracka/terraform/bootstrap/.terraform/providers/registry.terraform.io/hashicorp/aws/5.100.0/windows_amd64/terraform-provider-aws_v5.100.0_x5.exe" --invert-paths --force
            Write-Host ""
            Write-Host "Done! Now run: git push origin main --force" -ForegroundColor Cyan
        } else {
            Write-Host "git-filter-repo not found. Please install it first:" -ForegroundColor Red
            Write-Host "  pip install git-filter-repo" -ForegroundColor Yellow
        }
    }
    "B" {
        Write-Host ""
        Write-Host "Creating fresh branch..." -ForegroundColor Yellow
        
        # Create orphan branch (no history)
        git checkout --orphan fresh-start
        
        # Add all current files
        git add -A
        
        # Commit
        git commit -m "Fresh start - clean repository"
        
        # Delete old main and rename
        git branch -D main
        git branch -m main
        
        Write-Host ""
        Write-Host "Done! Now run: git push origin main --force" -ForegroundColor Cyan
        Write-Host "WARNING: This will replace all history on GitHub" -ForegroundColor Red
    }
    "C" {
        Write-Host ""
        Write-Host "Checking for Java..." -ForegroundColor Yellow
        $hasJava = Get-Command java -ErrorAction SilentlyContinue
        if (-not $hasJava) {
            Write-Host "Java not found. Please install Java first." -ForegroundColor Red
            exit 1
        }
        
        Write-Host "Downloading BFG..." -ForegroundColor Yellow
        $bfgPath = "$env:TEMP\bfg.jar"
        if (-not (Test-Path $bfgPath)) {
            Invoke-WebRequest -Uri "https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar" -OutFile $bfgPath
        }
        
        Write-Host "Running BFG..." -ForegroundColor Yellow
        java -jar $bfgPath --strip-blobs-bigger-than 100M
        
        Write-Host "Cleaning up..." -ForegroundColor Yellow
        git reflog expire --expire=now --all
        git gc --prune=now --aggressive
        
        Write-Host ""
        Write-Host "Done! Now run: git push origin main --force" -ForegroundColor Cyan
    }
    default {
        Write-Host "Invalid choice. Please run again and choose A, B, or C." -ForegroundColor Red
    }
}

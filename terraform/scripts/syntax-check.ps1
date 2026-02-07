# PowerShell script for basic Terraform syntax validation without requiring Terraform installation

param(
    [string]$Environment = "development"
)

Write-Host "Checking Terraform configuration syntax for $Environment environment..." -ForegroundColor Green

# Navigate to terraform directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$terraformDir = Split-Path -Parent $scriptDir
Set-Location $terraformDir

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow

# Check for required files
$requiredFiles = @(
    "main.tf",
    "variables.tf", 
    "outputs.tf",
    "environments/$Environment/terraform.tfvars",
    "environments/$Environment/backend.hcl"
)

Write-Host "Checking for required files..." -ForegroundColor Yellow
$missingFiles = @()

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  Found: $file" -ForegroundColor Green
    } else {
        Write-Host "  Missing: $file" -ForegroundColor Red
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "Missing required files. Cannot proceed." -ForegroundColor Red
    exit 1
}

# Check module structure
Write-Host "Checking module structure..." -ForegroundColor Yellow
$modules = @("networking", "security", "database", "storage", "compute", "monitoring")

foreach ($module in $modules) {
    $modulePath = "modules/$module"
    if (Test-Path $modulePath) {
        Write-Host "  Module found: $module" -ForegroundColor Green
        
        # Check for required module files
        $moduleFiles = @("main.tf", "variables.tf", "outputs.tf")
        foreach ($moduleFile in $moduleFiles) {
            $fullPath = "$modulePath/$moduleFile"
            if (Test-Path $fullPath) {
                Write-Host "    Found: $moduleFile" -ForegroundColor Green
            } else {
                Write-Host "    Missing: $moduleFile" -ForegroundColor Red
                $missingFiles += $fullPath
            }
        }
    } else {
        Write-Host "  Missing module: $module" -ForegroundColor Red
        $missingFiles += $modulePath
    }
}

# Basic syntax checks
Write-Host "Performing basic syntax checks..." -ForegroundColor Yellow

# Check for common Terraform syntax patterns
$tfFiles = Get-ChildItem -Path . -Filter "*.tf" -Recurse

foreach ($file in $tfFiles) {
    Write-Host "  Checking: $($file.FullName)" -ForegroundColor Cyan
    
    $content = Get-Content $file.FullName -Raw
    
    # Check for balanced braces
    $openBraces = ($content.ToCharArray() | Where-Object { $_ -eq '{' }).Count
    $closeBraces = ($content.ToCharArray() | Where-Object { $_ -eq '}' }).Count
    
    if ($openBraces -ne $closeBraces) {
        Write-Host "    ERROR: Unbalanced braces in $($file.Name)" -ForegroundColor Red
        $missingFiles += $file.FullName
    } else {
        Write-Host "    OK: Braces balanced" -ForegroundColor Green
    }
    
    # Check for basic Terraform blocks
    if ($content -match 'resource\s+"[^"]+"\s+"[^"]+"\s*{' -or 
        $content -match 'variable\s+"[^"]+"\s*{' -or
        $content -match 'output\s+"[^"]+"\s*{' -or
        $content -match 'module\s+"[^"]+"\s*{' -or
        $content -match 'terraform\s*{' -or
        $content -match 'provider\s+"[^"]+"\s*{') {
        Write-Host "    OK: Valid Terraform blocks found" -ForegroundColor Green
    } else {
        Write-Host "    WARNING: No standard Terraform blocks found" -ForegroundColor Yellow
    }
}

# Summary
if ($missingFiles.Count -eq 0) {
    Write-Host "All syntax checks passed!" -ForegroundColor Green
    Write-Host "Infrastructure configuration appears to be valid" -ForegroundColor Cyan
    Write-Host "Note: Full validation requires Terraform installation" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "Syntax check failed. Issues found:" -ForegroundColor Red
    foreach ($issue in $missingFiles) {
        Write-Host "  - $issue" -ForegroundColor Red
    }
    exit 1
}
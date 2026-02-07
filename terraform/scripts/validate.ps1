# PowerShell script for basic Terraform validation

param(
    [string]$Environment = "development"
)

Write-Host "Validating Terraform configuration for $Environment environment..." -ForegroundColor Green

# Check if Terraform is installed
try {
    $tfVersion = terraform version
    Write-Host "Terraform found: $($tfVersion.Split("`n")[0])" -ForegroundColor Green
} catch {
    Write-Host "Terraform is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Navigate to terraform directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$terraformDir = Split-Path -Parent $scriptDir
Set-Location $terraformDir

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow

# Initialize Terraform
Write-Host "Initializing Terraform..." -ForegroundColor Yellow
try {
    terraform init -backend=false
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Terraform init failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Terraform initialized successfully" -ForegroundColor Green
} catch {
    Write-Host "Error during Terraform init: $_" -ForegroundColor Red
    exit 1
}

# Validate configuration
Write-Host "Validating Terraform configuration..." -ForegroundColor Yellow
try {
    terraform validate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Terraform validation failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "Terraform configuration is valid" -ForegroundColor Green
} catch {
    Write-Host "Error during Terraform validation: $_" -ForegroundColor Red
    exit 1
}

# Format check
Write-Host "Checking Terraform formatting..." -ForegroundColor Yellow
try {
    $formatResult = terraform fmt -check -recursive
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Some files need formatting. Running terraform fmt..." -ForegroundColor Yellow
        terraform fmt -recursive
        Write-Host "Files have been formatted" -ForegroundColor Green
    } else {
        Write-Host "All files are properly formatted" -ForegroundColor Green
    }
} catch {
    Write-Host "Error during format check: $_" -ForegroundColor Red
    exit 1
}

Write-Host "All validation checks passed!" -ForegroundColor Green
Write-Host "Infrastructure configuration is ready for deployment" -ForegroundColor Cyan
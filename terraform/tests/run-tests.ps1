# PowerShell script to run Terraform infrastructure tests

param(
    [string]$TestName = "",
    [switch]$Verbose = $false
)

Write-Host "🧪 Running Terraform Infrastructure Tests..." -ForegroundColor Green

# Check if Go is installed
try {
    $goVersion = go version
    Write-Host "✅ Go found: $goVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Go is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if Terraform is installed
try {
    $tfVersion = terraform version
    Write-Host "✅ Terraform found: $($tfVersion.Split("`n")[0])" -ForegroundColor Green
} catch {
    Write-Host "❌ Terraform is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Navigate to tests directory
$testsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $testsDir

# Install dependencies
Write-Host "📦 Installing Go dependencies..." -ForegroundColor Yellow
go mod tidy

# Run tests
$testArgs = @("-timeout", "30m")

if ($Verbose) {
    $testArgs += "-v"
}

if ($TestName) {
    $testArgs += "-run"
    $testArgs += $TestName
    Write-Host "🎯 Running specific test: $TestName" -ForegroundColor Yellow
} else {
    Write-Host "🔄 Running all tests..." -ForegroundColor Yellow
}

try {
    & go test @testArgs
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All tests passed!" -ForegroundColor Green
    } else {
        Write-Host "❌ Some tests failed!" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "❌ Error running tests: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Test execution completed!" -ForegroundColor Green
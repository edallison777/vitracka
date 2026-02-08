# Rollback Agent to Previous Version
# Date: February 8, 2026
# Purpose: Rollback an AgentCore agent to a previous Git commit version

param(
    [Parameter(Mandatory=$true)]
    [string]$AgentName,
    
    [Parameter(Mandatory=$true)]
    [string]$CommitHash,
    
    [string]$Region = "eu-west-1",
    
    [switch]$SkipBackup,
    
    [switch]$SkipTest
)

$ErrorActionPreference = "Stop"
$separator = "========================================================================"

Write-Host $separator
Write-Host "AGENT ROLLBACK PROCEDURE"
Write-Host $separator
Write-Host "Agent: $AgentName"
Write-Host "Commit: $CommitHash"
Write-Host "Region: $Region"
Write-Host "Skip Backup: $SkipBackup"
Write-Host "Skip Test: $SkipTest"
Write-Host ""

# Validate agent directory exists
$AgentPath = "agents/$AgentName"
if (-not (Test-Path $AgentPath)) {
    Write-Host "[ERROR] Agent directory not found: $AgentPath"
    exit 1
}

# Validate commit exists
Write-Host "Validating commit hash..."
git rev-parse --verify $CommitHash 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Invalid commit hash: $CommitHash"
    exit 1
}
Write-Host "[OK] Commit hash validated"
Write-Host ""

# Step 1: Backup current state
if (-not $SkipBackup) {
    Write-Host "Step 1: Backing up current state..."
    $BackupDir = "backup-rollback-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    
    Copy-Item "$AgentPath/*" -Destination $BackupDir -Recurse -Force
    
    # Save current agent status
    Push-Location $AgentPath
    agentcore status > "$PSScriptRoot/../$BackupDir/agent-status-before-rollback.txt" 2>&1
    Pop-Location
    
    Write-Host "[OK] Current state backed up to: $BackupDir"
    Write-Host ""
} else {
    Write-Host "Step 1: Skipping backup (--SkipBackup flag set)"
    Write-Host ""
}

# Step 2: Checkout previous version
Write-Host "Step 2: Checking out commit $CommitHash..."
git checkout $CommitHash -- $AgentPath
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Git checkout failed"
    if (-not $SkipBackup) {
        Write-Host "[INFO] Current state backed up in: $BackupDir"
    }
    exit 1
}
Write-Host "[OK] Code restored to commit $CommitHash"
Write-Host ""

# Step 3: Verify configuration file exists
Write-Host "Step 3: Verifying configuration..."
$ConfigFile = "$AgentPath/.bedrock_agentcore.yaml"
if (-not (Test-Path $ConfigFile)) {
    Write-Host "[ERROR] Configuration file not found: $ConfigFile"
    Write-Host "[INFO] You may need to run 'agentcore configure' manually"
    exit 1
}
Write-Host "[OK] Configuration file found"
Write-Host ""

# Step 4: Deploy previous version
Write-Host "Step 4: Deploying previous version..."
Write-Host "This may take 2-5 minutes..."
Write-Host ""

Push-Location $AgentPath

# Run deployment
agentcore deploy
$DeployExitCode = $LASTEXITCODE

Pop-Location

if ($DeployExitCode -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Deployment failed"
    if (-not $SkipBackup) {
        Write-Host "[INFO] To restore current state, run:"
        Write-Host "       Copy-Item '$BackupDir/*' -Destination '$AgentPath' -Recurse -Force"
    }
    exit 1
}

Write-Host ""
Write-Host "[OK] Previous version deployed successfully"
Write-Host ""

# Step 5: Verify deployment
Write-Host "Step 5: Verifying deployment status..."
Push-Location $AgentPath
$Status = agentcore status 2>&1
Write-Host $Status
Pop-Location
Write-Host ""

# Check if status contains "Ready"
if ($Status -match "Ready") {
    Write-Host "[OK] Agent status: READY"
} else {
    Write-Host "[WARN] Agent may not be ready yet. Check status again in 1-2 minutes."
}
Write-Host ""

# Step 6: Test invocation
if (-not $SkipTest) {
    Write-Host "Step 6: Testing agent invocation..."
    Push-Location $AgentPath
    
    $TestPayload = '{"prompt": "Health check after rollback"}'
    Write-Host "Invoking agent with test payload..."
    
    $TestResult = agentcore invoke $TestPayload 2>&1
    $TestExitCode = $LASTEXITCODE
    
    Pop-Location
    
    if ($TestExitCode -eq 0) {
        Write-Host "[OK] Agent invocation successful"
        Write-Host ""
        Write-Host "Response preview:"
        Write-Host $TestResult | Select-Object -First 5
    } else {
        Write-Host "[ERROR] Agent invocation failed"
        Write-Host $TestResult
    }
    Write-Host ""
} else {
    Write-Host "Step 6: Skipping test invocation (--SkipTest flag set)"
    Write-Host ""
}

# Summary
Write-Host $separator
Write-Host "ROLLBACK SUMMARY"
Write-Host $separator
Write-Host ""
Write-Host "Agent: $AgentName"
Write-Host "Rolled back to commit: $CommitHash"
Write-Host "Region: $Region"
if (-not $SkipBackup) {
    Write-Host "Backup location: $BackupDir"
}
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Monitor CloudWatch logs for errors:"
Write-Host "   aws logs tail /aws/bedrock-agentcore/runtimes/<agent-id>-DEFAULT --follow --region $Region"
Write-Host ""
Write-Host "2. Verify application functionality with real requests"
Write-Host ""
Write-Host "3. Check CloudWatch dashboard for metrics:"
Write-Host "   https://console.aws.amazon.com/cloudwatch/home?region=$Region#gen-ai-observability/agent-core"
Write-Host ""
if (-not $SkipBackup) {
    Write-Host "4. If rollback was successful, you can delete the backup:"
    Write-Host "   Remove-Item -Recurse -Force $BackupDir"
    Write-Host ""
    Write-Host "5. If rollback failed, restore from backup:"
    Write-Host "   Copy-Item '$BackupDir/*' -Destination '$AgentPath' -Recurse -Force"
    Write-Host "   cd $AgentPath"
    Write-Host "   agentcore deploy"
    Write-Host ""
}
Write-Host $separator

# Exit with success
exit 0

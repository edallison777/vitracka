# Test Recovery Procedures
# Date: February 8, 2026
# Purpose: Test disaster recovery procedures without affecting production

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("agent-failure", "config-corruption", "complete-deletion", "rollback")]
    [string]$Scenario,
    
    [string]$AgentName = "test-agent",
    
    [string]$Region = "eu-west-1"
)

$ErrorActionPreference = "Stop"
$separator = "========================================================================"

Write-Host $separator
Write-Host "DISASTER RECOVERY DRILL"
Write-Host $separator
Write-Host "Scenario: $Scenario"
Write-Host "Agent: $AgentName"
Write-Host "Region: $Region"
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""
Write-Host "WARNING: This is a drill. Only use with test agents, not production!"
Write-Host ""

# Validate agent is test agent
if ($AgentName -notlike "*test*") {
    Write-Host "[ERROR] This script should only be used with test agents"
    Write-Host "[ERROR] Agent name must contain 'test': $AgentName"
    $Confirm = Read-Host "Are you sure you want to continue? (yes/no)"
    if ($Confirm -ne "yes") {
        Write-Host "Drill cancelled"
        exit 0
    }
}

$AgentPath = "agents/$AgentName"
if (-not (Test-Path $AgentPath)) {
    Write-Host "[ERROR] Agent directory not found: $AgentPath"
    exit 1
}

# Record start time
$StartTime = Get-Date

# Execute scenario
switch ($Scenario) {
    "agent-failure" {
        Write-Host "=== SCENARIO: Agent Failure Recovery ==="
        Write-Host ""
        Write-Host "Simulating agent failure by destroying and redeploying..."
        Write-Host ""
        
        # Step 1: Destroy agent
        Write-Host "Step 1: Destroying agent..."
        Push-Location $AgentPath
        agentcore destroy --force 2>&1 | Out-Null
        Pop-Location
        Write-Host "[OK] Agent destroyed"
        Write-Host ""
        
        # Step 2: Wait a moment
        Write-Host "Step 2: Waiting 5 seconds..."
        Start-Sleep -Seconds 5
        Write-Host ""
        
        # Step 3: Redeploy
        Write-Host "Step 3: Redeploying agent..."
        Push-Location $AgentPath
        agentcore deploy
        $DeployResult = $LASTEXITCODE
        Pop-Location
        
        if ($DeployResult -ne 0) {
            Write-Host "[ERROR] Deployment failed"
            exit 1
        }
        Write-Host "[OK] Agent redeployed"
        Write-Host ""
        
        # Step 4: Verify
        Write-Host "Step 4: Verifying agent status..."
        Push-Location $AgentPath
        agentcore status
        Pop-Location
        Write-Host ""
        
        # Step 5: Test
        Write-Host "Step 5: Testing invocation..."
        Push-Location $AgentPath
        agentcore invoke '{"prompt": "Health check"}'
        Pop-Location
    }
    
    "config-corruption" {
        Write-Host "=== SCENARIO: Configuration Corruption Recovery ==="
        Write-Host ""
        Write-Host "Simulating configuration corruption..."
        Write-Host ""
        
        # Step 1: Backup config
        Write-Host "Step 1: Backing up configuration..."
        $ConfigFile = "$AgentPath/.bedrock_agentcore.yaml"
        $BackupFile = "$AgentPath/.bedrock_agentcore.yaml.backup"
        Copy-Item $ConfigFile $BackupFile
        Write-Host "[OK] Configuration backed up"
        Write-Host ""
        
        # Step 2: Corrupt config
        Write-Host "Step 2: Corrupting configuration..."
        "corrupted: invalid yaml" | Out-File $ConfigFile
        Write-Host "[OK] Configuration corrupted"
        Write-Host ""
        
        # Step 3: Attempt deploy (should fail)
        Write-Host "Step 3: Attempting deploy (should fail)..."
        Push-Location $AgentPath
        agentcore deploy 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[WARN] Deploy succeeded unexpectedly"
        } else {
            Write-Host "[OK] Deploy failed as expected"
        }
        Pop-Location
        Write-Host ""
        
        # Step 4: Restore from backup
        Write-Host "Step 4: Restoring configuration from backup..."
        Copy-Item $BackupFile $ConfigFile -Force
        Write-Host "[OK] Configuration restored"
        Write-Host ""
        
        # Step 5: Deploy
        Write-Host "Step 5: Deploying with restored config..."
        Push-Location $AgentPath
        agentcore deploy
        Pop-Location
        Write-Host ""
        
        # Step 6: Verify
        Write-Host "Step 6: Verifying agent..."
        Push-Location $AgentPath
        agentcore status
        agentcore invoke '{"prompt": "Test"}'
        Pop-Location
        
        # Cleanup
        Remove-Item $BackupFile -Force
    }
    
    "complete-deletion" {
        Write-Host "=== SCENARIO: Complete Agent Deletion Recovery ==="
        Write-Host ""
        Write-Host "Simulating complete agent deletion..."
        Write-Host ""
        
        # Step 1: Backup agent directory
        Write-Host "Step 1: Backing up agent directory..."
        $BackupDir = "backup-drill-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item $AgentPath -Destination $BackupDir -Recurse
        Write-Host "[OK] Agent backed up to: $BackupDir"
        Write-Host ""
        
        # Step 2: Destroy agent
        Write-Host "Step 2: Destroying agent..."
        Push-Location $AgentPath
        agentcore destroy --force 2>&1 | Out-Null
        Pop-Location
        Write-Host "[OK] Agent destroyed"
        Write-Host ""
        
        # Step 3: Delete agent directory
        Write-Host "Step 3: Deleting agent directory..."
        Remove-Item $AgentPath -Recurse -Force
        Write-Host "[OK] Agent directory deleted"
        Write-Host ""
        
        # Step 4: Restore from backup
        Write-Host "Step 4: Restoring agent from backup..."
        Copy-Item $BackupDir -Destination $AgentPath -Recurse
        Write-Host "[OK] Agent directory restored"
        Write-Host ""
        
        # Step 5: Reconfigure
        Write-Host "Step 5: Reconfiguring agent..."
        Push-Location $AgentPath
        agentcore configure `
            --entrypoint agent.py `
            --requirements-file requirements.txt `
            --name $AgentName.Replace("-", "_") `
            --region $Region `
            --deployment-type direct_code_deploy `
            --non-interactive
        Pop-Location
        Write-Host ""
        
        # Step 6: Deploy
        Write-Host "Step 6: Deploying agent..."
        Push-Location $AgentPath
        agentcore deploy
        Pop-Location
        Write-Host ""
        
        # Step 7: Verify
        Write-Host "Step 7: Verifying agent..."
        Push-Location $AgentPath
        agentcore status
        agentcore invoke '{"prompt": "Test after recovery"}'
        Pop-Location
        
        # Cleanup
        Write-Host ""
        Write-Host "Cleaning up backup..."
        Remove-Item $BackupDir -Recurse -Force
    }
    
    "rollback" {
        Write-Host "=== SCENARIO: Rollback Procedure Test ==="
        Write-Host ""
        Write-Host "Testing rollback script..."
        Write-Host ""
        
        # Step 1: Get current commit
        Write-Host "Step 1: Getting current commit..."
        $CurrentCommit = git rev-parse HEAD
        Write-Host "[OK] Current commit: $CurrentCommit"
        Write-Host ""
        
        # Step 2: Get previous commit
        Write-Host "Step 2: Getting previous commit..."
        $PreviousCommit = git rev-parse HEAD~1
        Write-Host "[OK] Previous commit: $PreviousCommit"
        Write-Host ""
        
        # Step 3: Make a test change
        Write-Host "Step 3: Making test change to agent..."
        $TestFile = "$AgentPath/test-rollback.txt"
        "Test rollback at $(Get-Date)" | Out-File $TestFile
        git add $TestFile
        git commit -m "Test: Rollback drill change" 2>&1 | Out-Null
        Write-Host "[OK] Test change committed"
        Write-Host ""
        
        # Step 4: Deploy new version
        Write-Host "Step 4: Deploying new version..."
        Push-Location $AgentPath
        agentcore deploy
        Pop-Location
        Write-Host ""
        
        # Step 5: Execute rollback
        Write-Host "Step 5: Executing rollback script..."
        .\scripts\rollback-agent.ps1 -AgentName $AgentName -CommitHash $PreviousCommit
        Write-Host ""
        
        # Step 6: Verify rollback
        Write-Host "Step 6: Verifying rollback..."
        if (Test-Path $TestFile) {
            Write-Host "[ERROR] Test file still exists - rollback may have failed"
        } else {
            Write-Host "[OK] Test file removed - rollback successful"
        }
        
        # Cleanup: Reset to current commit
        Write-Host ""
        Write-Host "Cleaning up: Resetting to current state..."
        git reset --hard $CurrentCommit 2>&1 | Out-Null
        Push-Location $AgentPath
        agentcore deploy 2>&1 | Out-Null
        Pop-Location
    }
}

# Record end time
$EndTime = Get-Date
$Duration = $EndTime - $StartTime

# Summary
Write-Host ""
Write-Host $separator
Write-Host "DRILL SUMMARY"
Write-Host $separator
Write-Host ""
Write-Host "Scenario: $Scenario"
Write-Host "Agent: $AgentName"
Write-Host "Start Time: $($StartTime.ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Host "End Time: $($EndTime.ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Host "Duration: $($Duration.TotalMinutes.ToString('F2')) minutes"
Write-Host ""
Write-Host "Status: COMPLETED"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Document drill results in DISASTER_RECOVERY_PLAN.md"
Write-Host "2. Update RTO/RPO if actual times differ from targets"
Write-Host "3. Create action items for any issues encountered"
Write-Host "4. Schedule next drill in 3 months"
Write-Host ""
Write-Host $separator

exit 0

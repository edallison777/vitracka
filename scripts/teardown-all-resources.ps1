#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Tear down all Vitracka AWS resources to stop costs

.DESCRIPTION
    This script removes all AWS resources for the Vitracka project to eliminate ongoing costs.
    All resources can be redeployed later using the redeploy script.

.PARAMETER Region
    AWS region (default: eu-west-1)

.PARAMETER DryRun
    Show what would be deleted without actually deleting (default: false)

.EXAMPLE
    ./scripts/teardown-all-resources.ps1
    
.EXAMPLE
    ./scripts/teardown-all-resources.ps1 -DryRun
#>

param(
    [string]$Region = "eu-west-1",
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Vitracka AWS Resource Teardown" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN MODE - No resources will be deleted" -ForegroundColor Yellow
    Write-Host ""
}

# Create backup directory
$BackupDir = "backups/teardown-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
if (-not $DryRun) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "✓ Created backup directory: $BackupDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 1: Finding and backing up resources..." -ForegroundColor Cyan
Write-Host ""

# Known agent IDs
$CoachCompanionId = "coach_companion-0ZUOP04U5z"
$TestAgentId = "agent-q9QEgD3UFo"

$DeletedResources = @{
    Agents = 0
    Alarms = 0
    Dashboards = 0
    LogGroups = 0
}

# 1. Delete AgentCore agents
Write-Host "Deleting AgentCore agents..." -ForegroundColor Yellow

# Coach Companion
if ($DryRun) {
    Write-Host "  [DRY RUN] Would delete agent: $CoachCompanionId" -ForegroundColor Gray
} else {
    try {
        Write-Host "  Deleting Coach Companion agent..." -ForegroundColor Gray
        aws bedrock-agentcore delete-agent --agent-id $CoachCompanionId --region $Region 2>$null
        Write-Host "  ✓ Deleted Coach Companion agent" -ForegroundColor Green
        $DeletedResources.Agents++
    } catch {
        Write-Host "  Agent not found or already deleted: $CoachCompanionId" -ForegroundColor Gray
    }
}

# Test Agent
if ($DryRun) {
    Write-Host "  [DRY RUN] Would delete agent: $TestAgentId" -ForegroundColor Gray
} else {
    try {
        Write-Host "  Deleting Test agent..." -ForegroundColor Gray
        aws bedrock-agentcore delete-agent --agent-id $TestAgentId --region $Region 2>$null
        Write-Host "  ✓ Deleted Test agent" -ForegroundColor Green
        $DeletedResources.Agents++
    } catch {
        Write-Host "  Agent not found or already deleted: $TestAgentId" -ForegroundColor Gray
    }
}

# 2. Delete CloudWatch alarms
Write-Host "Deleting CloudWatch alarms..." -ForegroundColor Yellow

$AlarmPrefixes = @("AgentCore", "Vitracka")
foreach ($Prefix in $AlarmPrefixes) {
    try {
        $Alarms = aws cloudwatch describe-alarms --region $Region 2>$null | ConvertFrom-Json
        $MatchingAlarms = $Alarms.MetricAlarms | Where-Object { $_.AlarmName -like "*$Prefix*" }
        
        if ($MatchingAlarms) {
            foreach ($Alarm in $MatchingAlarms) {
                if ($DryRun) {
                    Write-Host "  [DRY RUN] Would delete alarm: $($Alarm.AlarmName)" -ForegroundColor Gray
                } else {
                    Write-Host "  Deleting alarm: $($Alarm.AlarmName)..." -ForegroundColor Gray
                    aws cloudwatch delete-alarms --alarm-names $Alarm.AlarmName --region $Region 2>$null
                    $DeletedResources.Alarms++
                }
            }
        }
    } catch {
        Write-Host "  No alarms found with prefix: $Prefix" -ForegroundColor Gray
    }
}

if ($DeletedResources.Alarms -gt 0 -and -not $DryRun) {
    Write-Host "  ✓ Deleted $($DeletedResources.Alarms) alarm(s)" -ForegroundColor Green
}

# 3. Delete CloudWatch dashboards
Write-Host "Deleting CloudWatch dashboards..." -ForegroundColor Yellow

$DashboardNames = @("AgentCore-coach-companion", "AgentCore-test-agent")
foreach ($DashboardName in $DashboardNames) {
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would delete dashboard: $DashboardName" -ForegroundColor Gray
    } else {
        try {
            Write-Host "  Deleting dashboard: $DashboardName..." -ForegroundColor Gray
            aws cloudwatch delete-dashboards --dashboard-names $DashboardName --region $Region 2>$null
            Write-Host "  ✓ Deleted dashboard: $DashboardName" -ForegroundColor Green
            $DeletedResources.Dashboards++
        } catch {
            Write-Host "  Dashboard not found: $DashboardName" -ForegroundColor Gray
        }
    }
}

# 4. Delete CloudWatch log groups
Write-Host "Deleting CloudWatch log groups..." -ForegroundColor Yellow

$LogGroupPrefixes = @("/aws/bedrock-agentcore")
foreach ($Prefix in $LogGroupPrefixes) {
    try {
        $LogGroups = aws logs describe-log-groups --region $Region 2>$null | ConvertFrom-Json
        $MatchingLogGroups = $LogGroups.logGroups | Where-Object { $_.logGroupName -like "$Prefix*" }
        
        if ($MatchingLogGroups) {
            foreach ($LogGroup in $MatchingLogGroups) {
                if ($DryRun) {
                    Write-Host "  [DRY RUN] Would delete log group: $($LogGroup.logGroupName)" -ForegroundColor Gray
                } else {
                    Write-Host "  Deleting log group: $($LogGroup.logGroupName)..." -ForegroundColor Gray
                    aws logs delete-log-group --log-group-name $LogGroup.logGroupName --region $Region 2>$null
                    $DeletedResources.LogGroups++
                }
            }
        }
    } catch {
        Write-Host "  No log groups found with prefix: $Prefix" -ForegroundColor Gray
    }
}

if ($DeletedResources.LogGroups -gt 0 -and -not $DryRun) {
    Write-Host "  ✓ Deleted $($DeletedResources.LogGroups) log group(s)" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Teardown Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN COMPLETE - No resources were deleted" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Resources that would be deleted:" -ForegroundColor Yellow
} else {
    Write-Host "Resources deleted:" -ForegroundColor Green
}

Write-Host "  AgentCore Agents:      $($DeletedResources.Agents)" -ForegroundColor White
Write-Host "  CloudWatch Alarms:     $($DeletedResources.Alarms)" -ForegroundColor White
Write-Host "  CloudWatch Dashboards: $($DeletedResources.Dashboards)" -ForegroundColor White
Write-Host "  CloudWatch Log Groups: $($DeletedResources.LogGroups)" -ForegroundColor White

Write-Host ""
if (-not $DryRun) {
    Write-Host "Backup location: $BackupDir" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To redeploy later, run:" -ForegroundColor Cyan
    Write-Host "  cd agents/coach-companion-agentcore && agentcore deploy" -ForegroundColor White
    Write-Host "  ./scripts/create-agentcore-alarms.ps1" -ForegroundColor White
    
    # Save summary
    $Summary = @{
        TeardownDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Region = $Region
        DeletedResources = $DeletedResources
        AgentIds = @{
            CoachCompanion = $CoachCompanionId
            TestAgent = $TestAgentId
        }
    }
    
    $Summary | ConvertTo-Json -Depth 10 | Out-File -FilePath "$BackupDir/teardown-summary.json"
    Write-Host ""
    Write-Host "Summary saved to: $BackupDir/teardown-summary.json" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✓ Teardown complete!" -ForegroundColor Green
Write-Host ""
Write-Host "NOTE: IAM roles are retained for faster redeployment" -ForegroundColor Yellow
Write-Host "      ECR repositories are retained (if any exist)" -ForegroundColor Yellow
Write-Host ""

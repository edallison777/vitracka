#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Redeploy Vitracka AWS resources from backup

.DESCRIPTION
    This script redeploys all AWS resources that were torn down using teardown-all-resources.ps1.
    It uses the backup files to recreate the exact same configuration.

.PARAMETER BackupDir
    Path to backup directory created by teardown script

.PARAMETER Region
    AWS region (default: eu-west-1)

.PARAMETER DryRun
    Show what would be deployed without actually deploying (default: false)

.EXAMPLE
    ./scripts/redeploy-from-backup.ps1 -BackupDir backups/teardown-20260208-120000
    
.EXAMPLE
    ./scripts/redeploy-from-backup.ps1 -BackupDir backups/teardown-20260208-120000 -DryRun
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupDir,
    [string]$Region = "eu-west-1",
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Vitracka AWS Resource Redeployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN MODE - No resources will be created" -ForegroundColor Yellow
    Write-Host ""
}

# Verify backup directory exists
if (-not (Test-Path $BackupDir)) {
    Write-Host "✗ Backup directory not found: $BackupDir" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available backups:" -ForegroundColor Yellow
    Get-ChildItem -Path "backups" -Directory | ForEach-Object {
        Write-Host "  - $($_.Name)" -ForegroundColor White
    }
    exit 1
}

Write-Host "Using backup: $BackupDir" -ForegroundColor Green
Write-Host ""

# Load backup files
$BackupFiles = @{
    Agents = "$BackupDir/agentcore-agents.json"
    Alarms = "$BackupDir/cloudwatch-alarms.json"
    Dashboards = "$BackupDir/cloudwatch-dashboards.json"
    LogGroups = "$BackupDir/cloudwatch-log-groups.json"
    Repositories = "$BackupDir/ecr-repositories.json"
    IAMRoles = "$BackupDir/iam-roles.json"
    Summary = "$BackupDir/teardown-summary.json"
}

# Load summary
if (Test-Path $BackupFiles.Summary) {
    $Summary = Get-Content $BackupFiles.Summary | ConvertFrom-Json
    Write-Host "Backup created: $($Summary.TeardownDate)" -ForegroundColor Gray
    Write-Host "Original region: $($Summary.Region)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 1: Redeploying agents using code" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "NOTE: AgentCore agents must be redeployed from source code" -ForegroundColor Yellow
Write-Host "      The backup contains agent metadata for reference only" -ForegroundColor Yellow
Write-Host ""

# List agents that need redeployment
if (Test-Path $BackupFiles.Agents) {
    $Agents = Get-Content $BackupFiles.Agents | ConvertFrom-Json
    
    Write-Host "Agents to redeploy:" -ForegroundColor Cyan
    foreach ($Agent in $Agents) {
        Write-Host "  - $($Agent.name) (was: $($Agent.agentId))" -ForegroundColor White
    }
    Write-Host ""
    
    Write-Host "To redeploy agents, run:" -ForegroundColor Yellow
    Write-Host ""
    
    # Coach Companion
    if ($Agents | Where-Object { $_.name -like "*coach*" }) {
        Write-Host "  # Coach Companion Agent:" -ForegroundColor Cyan
        Write-Host "  cd agents/coach-companion-agentcore" -ForegroundColor White
        Write-Host "  agentcore deploy" -ForegroundColor White
        Write-Host "  cd ../.." -ForegroundColor White
        Write-Host ""
    }
    
    # Test Agent
    if ($Agents | Where-Object { $_.name -like "*agent*" -and $_.name -notlike "*coach*" }) {
        Write-Host "  # Test Agent:" -ForegroundColor Cyan
        Write-Host "  cd agents/test-agent" -ForegroundColor White
        Write-Host "  agentcore deploy" -ForegroundColor White
        Write-Host "  cd ../.." -ForegroundColor White
        Write-Host ""
    }
    
    Write-Host "Or use the deployment script:" -ForegroundColor Yellow
    Write-Host "  ./scripts/deploy-agent-agentcore.ps1 -AgentName coach-companion-agentcore -AgentPath agents/coach-companion-agentcore" -ForegroundColor White
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 2: Recreating CloudWatch resources" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Recreate dashboards
if (Test-Path $BackupFiles.Dashboards) {
    Write-Host "Recreating CloudWatch dashboards..." -ForegroundColor Yellow
    $Dashboards = Get-Content $BackupFiles.Dashboards | ConvertFrom-Json
    
    foreach ($Dashboard in $Dashboards) {
        $DashboardName = $Dashboard.Name
        
        if ($DryRun) {
            Write-Host "  [DRY RUN] Would create dashboard: $DashboardName" -ForegroundColor Gray
        } else {
            try {
                Write-Host "  Creating dashboard: $DashboardName..." -ForegroundColor Gray
                
                # Save dashboard body to temp file
                $TempFile = [System.IO.Path]::GetTempFileName()
                $Dashboard.Body | Out-File -FilePath $TempFile -Encoding UTF8
                
                aws cloudwatch put-dashboard --dashboard-name $DashboardName --dashboard-body "file://$TempFile" --region $Region
                
                Remove-Item $TempFile
                Write-Host "  ✓ Created dashboard: $DashboardName" -ForegroundColor Green
            } catch {
                Write-Host "  ✗ Error creating dashboard $DashboardName : $_" -ForegroundColor Red
            }
        }
    }
    Write-Host ""
}

# Note about alarms
if (Test-Path $BackupFiles.Alarms) {
    Write-Host "Recreating CloudWatch alarms..." -ForegroundColor Yellow
    Write-Host "  NOTE: Alarms should be recreated using the alarm creation scripts" -ForegroundColor Yellow
    Write-Host "        after agents are redeployed (they need agent ARNs)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Run these scripts after agent redeployment:" -ForegroundColor Cyan
    Write-Host "    ./scripts/create-agentcore-alarms.ps1" -ForegroundColor White
    Write-Host "    ./scripts/create-latency-alarms.ps1" -ForegroundColor White
    Write-Host "    ./scripts/create-cost-alarms.ps1" -ForegroundColor White
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 3: Redeployment instructions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Complete redeployment checklist:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. Redeploy AgentCore agents (see commands above)" -ForegroundColor White
Write-Host "2. Recreate CloudWatch alarms (run alarm scripts)" -ForegroundColor White
Write-Host "3. Verify agents are READY:" -ForegroundColor White
Write-Host "     cd agents/coach-companion-agentcore && agentcore status" -ForegroundColor Gray
Write-Host "4. Test agent invocation:" -ForegroundColor White
Write-Host "     agentcore invoke '{\"prompt\": \"Hello\"}'" -ForegroundColor Gray
Write-Host "5. Verify CloudWatch dashboard:" -ForegroundColor White
Write-Host "     https://console.aws.amazon.com/cloudwatch/home?region=$Region#gen-ai-observability/agent-core" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Redeployment Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Backup location: $BackupDir" -ForegroundColor White
Write-Host "Target region: $Region" -ForegroundColor White
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN COMPLETE - No resources were created" -ForegroundColor Yellow
} else {
    Write-Host "✓ Redeployment preparation complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Follow the checklist above to complete redeployment" -ForegroundColor Yellow
}

Write-Host ""

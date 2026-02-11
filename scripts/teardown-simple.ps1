#!/usr/bin/env pwsh
# Simple teardown script for Vitracka AWS resources

param(
    [string]$Region = "eu-west-1",
    [switch]$DryRun = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Vitracka AWS Resource Teardown" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN MODE - No resources will be deleted" -ForegroundColor Yellow
    Write-Host ""
}

# Known agent IDs
$CoachCompanionId = "coach_companion-0ZUOP04U5z"
$TestAgentId = "agent-q9QEgD3UFo"

$Count = 0

# Delete agents
Write-Host "Deleting AgentCore agents..." -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "  [DRY RUN] Would delete: $CoachCompanionId" -ForegroundColor Gray
    Write-Host "  [DRY RUN] Would delete: $TestAgentId" -ForegroundColor Gray
} else {
    Write-Host "  Deleting Coach Companion..." -ForegroundColor Gray
    aws bedrock-agentcore delete-agent --agent-id $CoachCompanionId --region $Region 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Deleted Coach Companion" -ForegroundColor Green
        $Count++
    }
    
    Write-Host "  Deleting Test Agent..." -ForegroundColor Gray
    aws bedrock-agentcore delete-agent --agent-id $TestAgentId --region $Region 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Deleted Test Agent" -ForegroundColor Green
        $Count++
    }
}

# Delete CloudWatch alarms
Write-Host "Deleting CloudWatch alarms..." -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "  [DRY RUN] Would delete all AgentCore/Vitracka alarms" -ForegroundColor Gray
} else {
    $Alarms = aws cloudwatch describe-alarms --region $Region 2>$null | ConvertFrom-Json
    if ($Alarms.MetricAlarms) {
        $ToDelete = $Alarms.MetricAlarms | Where-Object { $_.AlarmName -like "*AgentCore*" -or $_.AlarmName -like "*Vitracka*" }
        foreach ($Alarm in $ToDelete) {
            Write-Host "  Deleting: $($Alarm.AlarmName)" -ForegroundColor Gray
            aws cloudwatch delete-alarms --alarm-names $Alarm.AlarmName --region $Region 2>$null
            $Count++
        }
    }
}

# Delete CloudWatch dashboards
Write-Host "Deleting CloudWatch dashboards..." -ForegroundColor Yellow

$Dashboards = @("AgentCore-coach-companion", "AgentCore-test-agent")
foreach ($Dashboard in $Dashboards) {
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would delete: $Dashboard" -ForegroundColor Gray
    } else {
        Write-Host "  Deleting: $Dashboard" -ForegroundColor Gray
        aws cloudwatch delete-dashboards --dashboard-names $Dashboard --region $Region 2>$null
        if ($LASTEXITCODE -eq 0) {
            $Count++
        }
    }
}

# Delete CloudWatch log groups
Write-Host "Deleting CloudWatch log groups..." -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "  [DRY RUN] Would delete all bedrock-agentcore log groups" -ForegroundColor Gray
} else {
    $LogGroups = aws logs describe-log-groups --region $Region 2>$null | ConvertFrom-Json
    if ($LogGroups.logGroups) {
        $ToDelete = $LogGroups.logGroups | Where-Object { $_.logGroupName -like "/aws/bedrock-agentcore*" }
        foreach ($LogGroup in $ToDelete) {
            Write-Host "  Deleting: $($LogGroup.logGroupName)" -ForegroundColor Gray
            aws logs delete-log-group --log-group-name $LogGroup.logGroupName --region $Region 2>$null
            $Count++
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN COMPLETE" -ForegroundColor Yellow
} else {
    Write-Host "Deleted $Count resource(s)" -ForegroundColor Green
    Write-Host ""
    Write-Host "To redeploy:" -ForegroundColor Cyan
    Write-Host "  cd agents/coach-companion-agentcore" -ForegroundColor White
    Write-Host "  agentcore deploy" -ForegroundColor White
    Write-Host "  cd ../.." -ForegroundColor White
    Write-Host "  ./scripts/create-agentcore-alarms.ps1" -ForegroundColor White
}

Write-Host ""
Write-Host "Complete!" -ForegroundColor Green
Write-Host ""

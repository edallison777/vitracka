param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1",
    
    [Parameter(Mandatory=$false)]
    [string]$SNSTopicArn = ""
)

$ErrorActionPreference = "Stop"

Write-Host "=== Creating CloudWatch Alarms for AgentCore ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Region: $Region" -ForegroundColor Yellow

# Agent configurations
$agents = @(
    @{
        Name = "test-agent"
        Namespace = "AgentCore/TestAgent"
        LogGroup = "/aws/bedrock-agentcore/runtimes/agent-q9QEgD3UFo-DEFAULT"
    },
    @{
        Name = "coach-companion"
        Namespace = "AgentCore/CoachCompanion"
        LogGroup = "/aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT"
    }
)

foreach ($agent in $agents) {
    Write-Host ""
    Write-Host "Creating alarms for: $($agent.Name)" -ForegroundColor Yellow
    
    # Alarm 1: High Error Rate (> 5% of invocations)
    $errorAlarmName = "AgentCore-$($agent.Name)-HighErrorRate"
    Write-Host "  Creating alarm: $errorAlarmName" -ForegroundColor Gray
    
    $alarmArgs = @(
        "--alarm-name", $errorAlarmName,
        "--alarm-description", "Alert when error rate exceeds 5% for $($agent.Name)",
        "--metric-name", "ErrorCount",
        "--namespace", $agent.Namespace,
        "--statistic", "Sum",
        "--period", "300",
        "--evaluation-periods", "2",
        "--threshold", "5",
        "--comparison-operator", "GreaterThanThreshold",
        "--treat-missing-data", "notBreaching",
        "--region", $Region
    )
    
    if ($SNSTopicArn) {
        $alarmArgs += "--alarm-actions"
        $alarmArgs += $SNSTopicArn
    }
    
    aws cloudwatch put-metric-alarm @alarmArgs
    
    # Alarm 2: No Invocations (agent might be down)
    $noInvocationsAlarmName = "AgentCore-$($agent.Name)-NoInvocations"
    Write-Host "  Creating alarm: $noInvocationsAlarmName" -ForegroundColor Gray
    
    # Create a metric filter for invocations first
    $invocationFilterName = "$($agent.Name)-Invocations"
    aws logs put-metric-filter `
        --log-group-name $agent.LogGroup `
        --filter-name $invocationFilterName `
        --filter-pattern "[...]" `
        --metric-transformations "metricName=InvocationCount,metricNamespace=$($agent.Namespace),metricValue=1,defaultValue=0" `
        --region $Region 2>$null
    
    # Create alarm for no invocations in 1 hour (might indicate agent is down)
    $noInvocationsArgs = @(
        "--alarm-name", $noInvocationsAlarmName,
        "--alarm-description", "Alert when no invocations detected for 1 hour for $($agent.Name)",
        "--metric-name", "InvocationCount",
        "--namespace", $agent.Namespace,
        "--statistic", "Sum",
        "--period", "3600",
        "--evaluation-periods", "1",
        "--threshold", "1",
        "--comparison-operator", "LessThanThreshold",
        "--treat-missing-data", "breaching",
        "--region", $Region
    )
    
    if ($SNSTopicArn) {
        $noInvocationsArgs += "--alarm-actions"
        $noInvocationsArgs += $SNSTopicArn
    }
    
    aws cloudwatch put-metric-alarm @noInvocationsArgs
}

Write-Host ""
Write-Host "=== Alarms Created Successfully ===" -ForegroundColor Green
Write-Host ""
Write-Host "View alarms at:" -ForegroundColor Cyan
Write-Host "https://console.aws.amazon.com/cloudwatch/home?region=$Region#alarmsV2:" -ForegroundColor Gray
Write-Host ""

if (-not $SNSTopicArn) {
    Write-Host "Note: No SNS topic provided. Alarms created without notifications." -ForegroundColor Yellow
    Write-Host "To add notifications, create an SNS topic and update the alarms." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Created alarms:" -ForegroundColor Cyan
foreach ($agent in $agents) {
    Write-Host "  - AgentCore-$($agent.Name)-HighErrorRate" -ForegroundColor Gray
    Write-Host "  - AgentCore-$($agent.Name)-NoInvocations" -ForegroundColor Gray
}
Write-Host ""

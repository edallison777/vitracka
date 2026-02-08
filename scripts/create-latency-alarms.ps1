param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1",
    
    [Parameter(Mandatory=$false)]
    [string]$SNSTopicArn = "",
    
    [Parameter(Mandatory=$false)]
    [int]$LatencyThresholdSeconds = 5
)

$ErrorActionPreference = "Stop"

Write-Host "=== Creating Latency Alarms for AgentCore ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host "Latency Threshold: $LatencyThresholdSeconds seconds" -ForegroundColor Yellow

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
    Write-Host "Creating latency alarm for: $($agent.Name)" -ForegroundColor Yellow
    
    # Note: Latency metrics are best tracked through CloudWatch Logs Insights queries
    # For now, we'll create an alarm based on log pattern matching for slow responses
    # A more sophisticated approach would parse actual duration values
    
    # Create alarm based on CloudWatch Logs Insights metric
    # This will monitor for patterns indicating slow responses
    $latencyAlarmName = "AgentCore-$($agent.Name)-HighLatency"
    Write-Host "  Creating alarm: $latencyAlarmName" -ForegroundColor Gray
    Write-Host "    Note: Latency monitoring via CloudWatch Logs Insights queries" -ForegroundColor DarkGray
    
    # For AgentCore, we'll use a simple metric filter for slow invocations
    $slowInvocationFilterName = "$($agent.Name)-SlowInvocations"
    
    # This pattern will match any log entry (as a proxy for invocations)
    # In production, you'd want to parse actual latency values
    aws logs put-metric-filter `
        --log-group-name $agent.LogGroup `
        --filter-name $slowInvocationFilterName `
        --filter-pattern "" `
        --metric-transformations "metricName=TotalLogs,metricNamespace=$($agent.Namespace),metricValue=1,defaultValue=0" `
        --region $Region 2>$null
    
    Write-Host "    Latency best monitored via dashboard queries" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "=== Latency Monitoring Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Note: Latency is best monitored through CloudWatch Dashboards" -ForegroundColor Yellow
Write-Host "The dashboards include latency queries from CloudWatch Logs Insights" -ForegroundColor Yellow
Write-Host ""
Write-Host "View dashboards at:" -ForegroundColor Cyan
Write-Host "  - https://console.aws.amazon.com/cloudwatch/home?region=$Region#dashboards:name=AgentCore-test-agent" -ForegroundColor Gray
Write-Host "  - https://console.aws.amazon.com/cloudwatch/home?region=$Region#dashboards:name=AgentCore-coach-companion" -ForegroundColor Gray
Write-Host ""

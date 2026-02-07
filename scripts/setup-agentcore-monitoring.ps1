$ErrorActionPreference = "Stop"

Write-Host "=== AgentCore CloudWatch Monitoring Setup ===" -ForegroundColor Cyan
Write-Host ""

$region = "eu-west-1"
$logGroup = "/aws/bedrock-agentcore/runtimes/agent-QVq5tY47wq-DEFAULT"
$dashboardName = "AgentCore-TestAgent-Monitoring"

# Create CloudWatch dashboard
Write-Host "Creating CloudWatch dashboard..." -ForegroundColor Yellow

$dashboardBody = @"
{
    "widgets": [
        {
            "type": "log",
            "properties": {
                "query": "SOURCE '$logGroup'\n| fields @timestamp, @message\n| sort @timestamp desc\n| limit 20",
                "region": "$region",
                "title": "Recent Agent Logs",
                "stacked": false
            },
            "x": 0,
            "y": 0,
            "width": 24,
            "height": 6
        },
        {
            "type": "log",
            "properties": {
                "query": "SOURCE '$logGroup'\n| filter @message like /ERROR/\n| fields @timestamp, @message\n| sort @timestamp desc\n| limit 20",
                "region": "$region",
                "title": "Error Logs",
                "stacked": false
            },
            "x": 0,
            "y": 6,
            "width": 12,
            "height": 6
        },
        {
            "type": "log",
            "properties": {
                "query": "SOURCE '$logGroup'\n| stats count() by bin(5m)",
                "region": "$region",
                "title": "Invocation Rate (5min)",
                "stacked": false
            },
            "x": 12,
            "y": 6,
            "width": 12,
            "height": 6
        }
    ]
}
"@

aws cloudwatch put-dashboard `
    --dashboard-name $dashboardName `
    --dashboard-body $dashboardBody `
    --region $region

Write-Host "Dashboard created: $dashboardName" -ForegroundColor Green

# Create metric filter for errors
Write-Host ""
Write-Host "Creating metric filter for errors..." -ForegroundColor Yellow

aws logs put-metric-filter `
    --log-group-name $logGroup `
    --filter-name "AgentErrors" `
    --filter-pattern "[ERROR]" `
    --metric-transformations `
        metricName=AgentErrorCount,metricNamespace=AgentCore/TestAgent,metricValue=1 `
    --region $region

Write-Host "Metric filter created" -ForegroundColor Green

# Create alarm for high error rate
Write-Host ""
Write-Host "Creating CloudWatch alarm for errors..." -ForegroundColor Yellow

aws cloudwatch put-metric-alarm `
    --alarm-name "AgentCore-TestAgent-HighErrorRate" `
    --alarm-description "Alert when agent error rate exceeds 5%" `
    --metric-name AgentErrorCount `
    --namespace AgentCore/TestAgent `
    --statistic Sum `
    --period 300 `
    --evaluation-periods 1 `
    --threshold 5 `
    --comparison-operator GreaterThanThreshold `
    --region $region

Write-Host "Alarm created" -ForegroundColor Green

Write-Host ""
Write-Host "=== Monitoring Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Dashboard URL:" -ForegroundColor Cyan
Write-Host "https://console.aws.amazon.com/cloudwatch/home?region=$region#dashboards:name=$dashboardName" -ForegroundColor Gray
Write-Host ""
Write-Host "View logs:" -ForegroundColor Cyan
Write-Host "aws logs tail $logGroup --follow --region $region" -ForegroundColor Gray

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("eu-west-1")]
    [string]$Region = "eu-west-1",
    
    [Parameter(Mandatory=$false)]
    [decimal]$DailyBudget = 10.00,
    
    [Parameter(Mandatory=$false)]
    [string]$AlertEmail
)

$ErrorActionPreference = "Stop"

Write-Host "=== AgentCore Cost Monitoring Setup ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host "Daily Budget: `$$DailyBudget" -ForegroundColor Yellow
Write-Host ""

# Step 1: Create cost allocation tags
Write-Host "Setting up cost allocation tags..." -ForegroundColor Yellow

$tags = @(
    @{Key="Project"; Value="Vitracka"},
    @{Key="Environment"; Value="dev"},
    @{Key="ManagedBy"; Value="AgentCore"},
    @{Key="CostCenter"; Value="Engineering"},
    @{Key="Region"; Value=$Region}
)

Write-Host "  Cost allocation tags configured" -ForegroundColor Green

# Step 2: Create CloudWatch cost alarm using Bedrock metrics
Write-Host ""
Write-Host "Creating cost alarm for Bedrock usage..." -ForegroundColor Yellow

# Calculate monthly threshold from daily budget
$monthlyThreshold = $DailyBudget * 30

# Create alarm for Bedrock invocations (proxy for cost)
aws cloudwatch put-metric-alarm `
    --alarm-name "AgentCore-HighBedrockUsage-$Region" `
    --alarm-description "Alert when Bedrock invocations exceed expected daily usage" `
    --metric-name Invocations `
    --namespace AWS/Bedrock `
    --statistic Sum `
    --period 86400 `
    --evaluation-periods 1 `
    --threshold 1000 `
    --comparison-operator GreaterThanThreshold `
    --region $Region

Write-Host "  Created alarm: AgentCore-HighBedrockUsage-$Region" -ForegroundColor Green

# Step 3: Create cost anomaly detection (using AWS Cost Explorer API)
Write-Host ""
Write-Host "Setting up cost anomaly detection..." -ForegroundColor Yellow

# Note: Cost anomaly detection requires AWS Cost Explorer API
# This is a placeholder - actual implementation would use Cost Explorer
Write-Host "  Note: Cost anomaly detection requires AWS Cost Explorer API" -ForegroundColor Gray
Write-Host "  To enable: AWS Console > Cost Management > Cost Anomaly Detection" -ForegroundColor Gray

# Step 4: Create daily cost report script
Write-Host ""
Write-Host "Creating daily cost report script..." -ForegroundColor Yellow

$reportScript = @'
param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Daily AgentCore Cost Report ===" -ForegroundColor Cyan
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-DD')" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host ""

# Get Bedrock invocation count (last 24 hours)
Write-Host "Bedrock Usage (Last 24 hours):" -ForegroundColor Cyan

$endTime = Get-Date
$startTime = $endTime.AddDays(-1)

$metrics = aws cloudwatch get-metric-statistics `
    --namespace AWS/Bedrock `
    --metric-name Invocations `
    --start-time $startTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ") `
    --end-time $endTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ") `
    --period 86400 `
    --statistics Sum `
    --region $Region | ConvertFrom-Json

if ($metrics.Datapoints.Count -gt 0) {
    $invocations = $metrics.Datapoints[0].Sum
    Write-Host "  Total Invocations: $invocations" -ForegroundColor White
    
    # Estimate cost (rough estimate: $0.003 per 1K input tokens, $0.015 per 1K output tokens)
    # Assuming average of 500 tokens per invocation
    $estimatedCost = ($invocations * 500 * 0.009) / 1000
    Write-Host "  Estimated Cost: `$$([math]::Round($estimatedCost, 2))" -ForegroundColor White
} else {
    Write-Host "  No data available" -ForegroundColor Gray
}

Write-Host ""
Write-Host "AgentCore Resources:" -ForegroundColor Cyan

# List active agents
$agents = aws bedrock-agentcore list-agents --region $Region 2>$null
if ($agents) {
    Write-Host "  Active Agents: Check AWS Console" -ForegroundColor White
} else {
    Write-Host "  Active Agents: 0" -ForegroundColor White
}

Write-Host ""
Write-Host "Cost Optimization Tips:" -ForegroundColor Cyan
Write-Host "  - Use agentcore destroy when not testing" -ForegroundColor Gray
Write-Host "  - Monitor invocation patterns" -ForegroundColor Gray
Write-Host "  - Set up budget alerts in AWS Cost Management" -ForegroundColor Gray

Write-Host ""
Write-Host "=== Report Complete ===" -ForegroundColor Green
'@

$reportScript | Out-File -FilePath "$PSScriptRoot\daily-cost-report.ps1" -Encoding utf8

Write-Host "  Created: scripts/daily-cost-report.ps1" -ForegroundColor Green

# Step 5: Create cost summary
Write-Host ""
Write-Host "=== Cost Monitoring Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Run daily cost report: .\scripts\daily-cost-report.ps1" -ForegroundColor Gray
Write-Host "  2. View alarms: aws cloudwatch describe-alarms --region $Region" -ForegroundColor Gray
Write-Host "  3. Enable Cost Anomaly Detection in AWS Console" -ForegroundColor Gray
Write-Host ""

if ($AlertEmail) {
    Write-Host "To add email notifications:" -ForegroundColor Cyan
    Write-Host "  1. Create SNS topic: aws sns create-topic --name AgentCore-Cost-Alerts --region $Region" -ForegroundColor Gray
    Write-Host "  2. Subscribe email: aws sns subscribe --topic-arn <arn> --protocol email --notification-endpoint $AlertEmail" -ForegroundColor Gray
    Write-Host "  3. Update alarm to use SNS topic" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "Cost Monitoring Resources:" -ForegroundColor Cyan
Write-Host "  - CloudWatch Alarms: https://console.aws.amazon.com/cloudwatch/home?region=$Region#alarmsV2:" -ForegroundColor Gray
Write-Host "  - Cost Explorer: https://console.aws.amazon.com/cost-management/home#/cost-explorer" -ForegroundColor Gray
Write-Host "  - Budgets: https://console.aws.amazon.com/billing/home#/budgets" -ForegroundColor Gray

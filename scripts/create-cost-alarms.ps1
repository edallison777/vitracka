param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1",
    
    [Parameter(Mandatory=$false)]
    [int]$DailyBudgetUSD = 10,
    
    [Parameter(Mandatory=$false)]
    [int]$MonthlyBudgetUSD = 100,
    
    [Parameter(Mandatory=$false)]
    [string]$SNSTopicArn = ""
)

$ErrorActionPreference = "Stop"

Write-Host "=== Creating Cost Alarms for AgentCore ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host "Daily Budget: `$$DailyBudgetUSD USD" -ForegroundColor Yellow
Write-Host "Monthly Budget: `$$MonthlyBudgetUSD USD" -ForegroundColor Yellow
Write-Host ""

# Note: CloudWatch billing metrics are only available in us-east-1
$billingRegion = "us-east-1"

Write-Host "Note: AWS billing metrics are only available in us-east-1" -ForegroundColor Yellow
Write-Host "Creating billing alarms in us-east-1..." -ForegroundColor Yellow
Write-Host ""

# Alarm 1: Daily Bedrock costs exceed threshold
$dailyAlarmName = "AgentCore-DailyBedrockCosts-Exceeded"
Write-Host "Creating alarm: $dailyAlarmName" -ForegroundColor Gray

$dailyAlarmArgs = @(
    "--alarm-name", $dailyAlarmName,
    "--alarm-description", "Alert when daily Bedrock costs exceed `$$DailyBudgetUSD",
    "--metric-name", "EstimatedCharges",
    "--namespace", "AWS/Billing",
    "--statistic", "Maximum",
    "--period", "86400",
    "--evaluation-periods", "1",
    "--threshold", $DailyBudgetUSD.ToString(),
    "--comparison-operator", "GreaterThanThreshold",
    "--dimensions", "Name=ServiceName,Value=AmazonBedrock",
    "--treat-missing-data", "notBreaching",
    "--region", $billingRegion
)

if ($SNSTopicArn) {
    # Note: SNS topic must be in us-east-1 for billing alarms
    $dailyAlarmArgs += "--alarm-actions"
    $dailyAlarmArgs += $SNSTopicArn
}

aws cloudwatch put-metric-alarm @dailyAlarmArgs

# Alarm 2: Monthly Bedrock costs exceed threshold
$monthlyAlarmName = "AgentCore-MonthlyBedrockCosts-Exceeded"
Write-Host "Creating alarm: $monthlyAlarmName" -ForegroundColor Gray

$monthlyAlarmArgs = @(
    "--alarm-name", $monthlyAlarmName,
    "--alarm-description", "Alert when monthly Bedrock costs exceed `$$MonthlyBudgetUSD",
    "--metric-name", "EstimatedCharges",
    "--namespace", "AWS/Billing",
    "--statistic", "Maximum",
    "--period", "86400",
    "--evaluation-periods", "1",
    "--threshold", $MonthlyBudgetUSD.ToString(),
    "--comparison-operator", "GreaterThanThreshold",
    "--dimensions", "Name=ServiceName,Value=AmazonBedrock",
    "--treat-missing-data", "notBreaching",
    "--region", $billingRegion
)

if ($SNSTopicArn) {
    $monthlyAlarmArgs += "--alarm-actions"
    $monthlyAlarmArgs += $SNSTopicArn
}

aws cloudwatch put-metric-alarm @monthlyAlarmArgs

# Alarm 3: High Bedrock usage (invocations)
$usageAlarmName = "AgentCore-HighBedrockUsage-$Region"
Write-Host "Creating alarm: $usageAlarmName" -ForegroundColor Gray

$usageAlarmArgs = @(
    "--alarm-name", $usageAlarmName,
    "--alarm-description", "Alert when Bedrock invocations exceed 1000 per day",
    "--metric-name", "Invocations",
    "--namespace", "AWS/Bedrock",
    "--statistic", "Sum",
    "--period", "86400",
    "--evaluation-periods", "1",
    "--threshold", "1000",
    "--comparison-operator", "GreaterThanThreshold",
    "--treat-missing-data", "notBreaching",
    "--region", $Region
)

if ($SNSTopicArn -and $Region -eq "us-east-1") {
    $usageAlarmArgs += "--alarm-actions"
    $usageAlarmArgs += $SNSTopicArn
}

aws cloudwatch put-metric-alarm @usageAlarmArgs

Write-Host ""
Write-Host "=== Cost Alarms Created Successfully ===" -ForegroundColor Green
Write-Host ""
Write-Host "Created alarms:" -ForegroundColor Cyan
Write-Host "  - $dailyAlarmName (threshold: `$$DailyBudgetUSD/day)" -ForegroundColor Gray
Write-Host "  - $monthlyAlarmName (threshold: `$$MonthlyBudgetUSD/month)" -ForegroundColor Gray
Write-Host "  - $usageAlarmName (threshold: 1000 invocations/day)" -ForegroundColor Gray
Write-Host ""

Write-Host "View billing alarms at:" -ForegroundColor Cyan
Write-Host "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#alarmsV2:" -ForegroundColor Gray
Write-Host ""

Write-Host "View usage alarms at:" -ForegroundColor Cyan
Write-Host "https://console.aws.amazon.com/cloudwatch/home?region=$Region#alarmsV2:" -ForegroundColor Gray
Write-Host ""

if (-not $SNSTopicArn) {
    Write-Host "Note: No SNS topic provided. Alarms created without notifications." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To add email notifications:" -ForegroundColor Cyan
    Write-Host "1. Create SNS topic in us-east-1 (for billing alarms):" -ForegroundColor Gray
    Write-Host '   aws sns create-topic --name agentcore-billing-alerts --region us-east-1' -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "2. Subscribe your email:" -ForegroundColor Gray
    Write-Host '   aws sns subscribe --topic-arn "arn:aws:sns:us-east-1:ACCOUNT:agentcore-billing-alerts" --protocol email --notification-endpoint "your-email@example.com" --region us-east-1' -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "3. Re-run this script with -SNSTopicArn parameter" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "Important Notes:" -ForegroundColor Yellow
Write-Host "  - Billing metrics update every 4-6 hours" -ForegroundColor Gray
Write-Host "  - Alarms may take 24 hours to start working" -ForegroundColor Gray
Write-Host "  - Enable billing alerts in AWS Billing Console if not already enabled" -ForegroundColor Gray
Write-Host ""

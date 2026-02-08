param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Testing AgentCore CloudWatch Alarms ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host ""

# List all AgentCore alarms
Write-Host "Fetching AgentCore alarms..." -ForegroundColor Yellow
$alarms = aws cloudwatch describe-alarms `
    --alarm-name-prefix "AgentCore-" `
    --region $Region `
    --query "MetricAlarms[].{Name:AlarmName,State:StateValue,Reason:StateReason}" `
    --output json | ConvertFrom-Json

if ($alarms.Count -eq 0) {
    Write-Host "No AgentCore alarms found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Found $($alarms.Count) alarms:" -ForegroundColor Green
Write-Host ""

foreach ($alarm in $alarms) {
    $stateColor = switch ($alarm.State) {
        "OK" { "Green" }
        "ALARM" { "Red" }
        "INSUFFICIENT_DATA" { "Yellow" }
        default { "Gray" }
    }
    
    Write-Host "  $($alarm.Name)" -ForegroundColor Cyan
    Write-Host "    State: $($alarm.State)" -ForegroundColor $stateColor
    Write-Host "    Reason: $($alarm.Reason)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "=== Alarm Status Check Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "To view alarms in AWS Console:" -ForegroundColor Cyan
Write-Host "https://console.aws.amazon.com/cloudwatch/home?region=$Region#alarmsV2:" -ForegroundColor Gray
Write-Host ""
Write-Host "To test alarm notifications:" -ForegroundColor Cyan
Write-Host "1. Create an SNS topic for notifications" -ForegroundColor Gray
Write-Host "2. Subscribe your email to the SNS topic" -ForegroundColor Gray
Write-Host "3. Update alarms to use the SNS topic ARN" -ForegroundColor Gray
Write-Host "4. Trigger an alarm condition (e.g., generate errors)" -ForegroundColor Gray
Write-Host ""
Write-Host "Example: Update alarm with SNS topic" -ForegroundColor Cyan
Write-Host 'aws cloudwatch put-metric-alarm --alarm-name "AgentCore-test-agent-HighErrorRate" --alarm-actions "arn:aws:sns:eu-west-1:123456789012:my-topic" --region eu-west-1' -ForegroundColor Gray
Write-Host ""

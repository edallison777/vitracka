# Setup CloudWatch Alarms for Test Agent

$region = "eu-west-1"
$snsTopicArn = "arn:aws:sns:${region}:732231126129:test-agent-alerts"

Write-Host "Setting up CloudWatch alarms..."

# Create SNS topic for alarm notifications (if it doesn't exist)
Write-Host "`nCreating SNS topic for alarm notifications..."
$topicResult = aws sns create-topic --name test-agent-alerts --region $region 2>&1
if ($LASTEXITCODE -eq 0 -or $topicResult -like "*already exists*") {
    Write-Host "✓ SNS topic ready: test-agent-alerts"
} else {
    Write-Host "✗ Failed to create SNS topic"
}

# Alarm 1: High HTTP Error Rate (>5%)
Write-Host "`nCreating alarm for high HTTP error rate..."
aws cloudwatch put-metric-alarm `
    --region $region `
    --alarm-name "test-agent-high-error-rate" `
    --alarm-description "Alert when HTTP error rate exceeds 5%" `
    --metric-name HTTP5xxErrors `
    --namespace TestAgent `
    --statistic Sum `
    --period 300 `
    --evaluation-periods 2 `
    --threshold 5 `
    --comparison-operator GreaterThanThreshold `
    --treat-missing-data notBreaching

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ High error rate alarm created"
}

# Alarm 2: Memory Utilization >80%
Write-Host "`nCreating alarm for high memory utilization..."
aws cloudwatch put-metric-alarm `
    --region $region `
    --alarm-name "test-agent-high-memory" `
    --alarm-description "Alert when memory utilization exceeds 80%" `
    --metric-name MemoryUtilization `
    --namespace AWS/ECS `
    --statistic Average `
    --period 300 `
    --evaluation-periods 2 `
    --threshold 80 `
    --comparison-operator GreaterThanThreshold `
    --dimensions Name=ServiceName,Value=test-agent Name=ClusterName,Value=vitracka-agents `
    --treat-missing-data notBreaching

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ High memory alarm created"
}

# Alarm 3: Container Unhealthy
Write-Host "`nCreating alarm for unhealthy containers..."
aws cloudwatch put-metric-alarm `
    --region $region `
    --alarm-name "test-agent-unhealthy-tasks" `
    --alarm-description "Alert when ECS tasks are unhealthy" `
    --metric-name RunningTaskCount `
    --namespace AWS/ECS `
    --statistic Average `
    --period 60 `
    --evaluation-periods 5 `
    --threshold 1 `
    --comparison-operator LessThanThreshold `
    --dimensions Name=ServiceName,Value=test-agent Name=ClusterName,Value=vitracka-agents `
    --treat-missing-data breaching

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Unhealthy tasks alarm created"
}

# Alarm 4: High Response Time (if metric exists)
Write-Host "`nCreating alarm for high response time..."
aws cloudwatch put-metric-alarm `
    --region $region `
    --alarm-name "test-agent-high-response-time" `
    --alarm-description "Alert when response time exceeds 5 seconds" `
    --metric-name ResponseTime `
    --namespace TestAgent `
    --statistic Average `
    --period 300 `
    --evaluation-periods 2 `
    --threshold 5000 `
    --comparison-operator GreaterThanThreshold `
    --treat-missing-data notBreaching

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ High response time alarm created"
}

Write-Host "`n=== CloudWatch Alarms Setup Complete ==="
Write-Host "View alarms at: https://console.aws.amazon.com/cloudwatch/home?region=$region#alarmsV2:"
Write-Host "`nTo receive email notifications, subscribe to the SNS topic:"
Write-Host "aws sns subscribe --topic-arn $snsTopicArn --protocol email --notification-endpoint your-email@example.com --region $region"

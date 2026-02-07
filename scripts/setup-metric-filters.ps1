# Setup CloudWatch Metric Filters for Test Agent

$region = "eu-west-1"
$logGroup = "/ecs/test-agent"

Write-Host "Setting up metric filters for $logGroup..."

# Metric filter for HTTP 4xx errors
Write-Host "`nCreating metric filter for HTTP 4xx errors..."
aws logs put-metric-filter `
    --region $region `
    --log-group-name $logGroup `
    --filter-name "HTTP-4xx-Errors" `
    --filter-pattern "[time, request_id, level, status_code=4*, ...]" `
    --metric-transformations "metricName=HTTP4xxErrors,metricNamespace=TestAgent,metricValue=1,defaultValue=0"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ HTTP 4xx metric filter created"
} else {
    Write-Host "✗ Failed to create HTTP 4xx metric filter"
}

# Metric filter for HTTP 5xx errors
Write-Host "`nCreating metric filter for HTTP 5xx errors..."
aws logs put-metric-filter `
    --region $region `
    --log-group-name $logGroup `
    --filter-name "HTTP-5xx-Errors" `
    --filter-pattern "[time, request_id, level, status_code=5*, ...]" `
    --metric-transformations "metricName=HTTP5xxErrors,metricNamespace=TestAgent,metricValue=1,defaultValue=0"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ HTTP 5xx metric filter created"
} else {
    Write-Host "✗ Failed to create HTTP 5xx metric filter"
}

# Metric filter for ERROR level logs
Write-Host "`nCreating metric filter for ERROR logs..."
aws logs put-metric-filter `
    --region $region `
    --log-group-name $logGroup `
    --filter-name "Application-Errors" `
    --filter-pattern "[time, request_id, level=ERROR, ...]" `
    --metric-transformations "metricName=ApplicationErrors,metricNamespace=TestAgent,metricValue=1,defaultValue=0"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Application error metric filter created"
} else {
    Write-Host "✗ Failed to create application error metric filter"
}

# Metric filter for response time (if logged)
Write-Host "`nCreating metric filter for response time..."
aws logs put-metric-filter `
    --region $region `
    --log-group-name $logGroup `
    --filter-name "Response-Time" `
    --filter-pattern "[time, request_id, level, msg, duration_ms]" `
    --metric-transformations "metricName=ResponseTime,metricNamespace=TestAgent,metricValue=`$duration_ms,unit=Milliseconds"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Response time metric filter created"
} else {
    Write-Host "✗ Failed to create response time metric filter (may not be applicable)"
}

Write-Host "`n=== Metric Filter Setup Complete ==="
Write-Host "View metrics at: https://console.aws.amazon.com/cloudwatch/home?region=$region#metricsV2:graph=~();namespace=TestAgent"

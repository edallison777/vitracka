param(
    [Parameter(Mandatory=$false)]
    [string]$SNSTopicArn = ""
)

$ErrorActionPreference = "Stop"

Write-Host "=== Setting Up AWS Cost Anomaly Detection ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "AWS Cost Anomaly Detection uses machine learning to detect unusual spending patterns." -ForegroundColor Yellow
Write-Host ""

# Check if Cost Anomaly Detection is available
Write-Host "Checking for existing cost anomaly monitors..." -ForegroundColor Yellow

$monitors = aws ce get-anomaly-monitors --output json 2>$null | ConvertFrom-Json

if ($monitors -and $monitors.AnomalyMonitors) {
    Write-Host ""
    Write-Host "Existing monitors found:" -ForegroundColor Green
    foreach ($monitor in $monitors.AnomalyMonitors) {
        Write-Host "  - $($monitor.MonitorName) (Type: $($monitor.MonitorType))" -ForegroundColor Gray
    }
    Write-Host ""
} else {
    Write-Host "No existing monitors found." -ForegroundColor Gray
    Write-Host ""
}

# Create monitor for Bedrock service
$monitorName = "AgentCore-Bedrock-Anomaly-Monitor"
Write-Host "Creating cost anomaly monitor: $monitorName" -ForegroundColor Yellow

$monitorConfig = @{
    MonitorName = $monitorName
    MonitorType = "DIMENSIONAL"
    MonitorDimension = "SERVICE"
    MonitorSpecification = @{
        Dimensions = @{
            Key = "SERVICE"
            Values = @("Amazon Bedrock")
        }
    }
} | ConvertTo-Json -Depth 10

# Save to temp file
$tempFile = [System.IO.Path]::GetTempFileName()
$monitorConfig | Out-File -FilePath $tempFile -Encoding utf8

try {
    $result = aws ce create-anomaly-monitor --cli-input-json file://$tempFile --output json 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $monitorData = $result | ConvertFrom-Json
        $monitorArn = $monitorData.MonitorArn
        Write-Host "Monitor created successfully!" -ForegroundColor Green
        Write-Host "Monitor ARN: $monitorArn" -ForegroundColor Gray
        Write-Host ""
        
        # Create subscription if SNS topic provided
        if ($SNSTopicArn) {
            Write-Host "Creating anomaly subscription..." -ForegroundColor Yellow
            
            $subscriptionConfig = @{
                AnomalySubscription = @{
                    SubscriptionName = "AgentCore-Bedrock-Anomaly-Alerts"
                    MonitorArnList = @($monitorArn)
                    Subscribers = @(
                        @{
                            Address = $SNSTopicArn
                            Type = "SNS"
                        }
                    )
                    Threshold = 100.0
                    Frequency = "DAILY"
                }
            } | ConvertTo-Json -Depth 10
            
            $subTempFile = [System.IO.Path]::GetTempFileName()
            $subscriptionConfig | Out-File -FilePath $subTempFile -Encoding utf8
            
            aws ce create-anomaly-subscription --cli-input-json file://$subTempFile --output json
            Remove-Item $subTempFile -ErrorAction SilentlyContinue
            
            Write-Host "Subscription created successfully!" -ForegroundColor Green
            Write-Host ""
        }
    } else {
        if ($result -like "*already exists*") {
            Write-Host "Monitor already exists." -ForegroundColor Yellow
        } else {
            Write-Host "Error creating monitor: $result" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
} finally {
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "=== Cost Anomaly Detection Setup ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "How it works:" -ForegroundColor Yellow
Write-Host "  1. AWS analyzes your historical spending patterns" -ForegroundColor Gray
Write-Host "  2. Machine learning detects unusual cost increases" -ForegroundColor Gray
Write-Host "  3. Alerts sent when anomalies exceed threshold" -ForegroundColor Gray
Write-Host "  4. Requires 10-14 days of data to establish baseline" -ForegroundColor Gray
Write-Host ""

Write-Host "View anomalies in AWS Console:" -ForegroundColor Cyan
Write-Host "https://console.aws.amazon.com/cost-management/home#/anomaly-detection" -ForegroundColor Gray
Write-Host ""

if (-not $SNSTopicArn) {
    Write-Host "To receive anomaly alerts:" -ForegroundColor Yellow
    Write-Host "1. Create SNS topic:" -ForegroundColor Gray
    Write-Host '   aws sns create-topic --name agentcore-anomaly-alerts --region us-east-1' -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "2. Subscribe your email:" -ForegroundColor Gray
    Write-Host '   aws sns subscribe --topic-arn "arn:aws:sns:us-east-1:ACCOUNT:agentcore-anomaly-alerts" --protocol email --notification-endpoint "your-email@example.com" --region us-east-1' -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "3. Re-run this script with -SNSTopicArn parameter" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""

param(
    [Parameter(Mandatory=$true)]
    [string]$AgentName,
    
    [Parameter(Mandatory=$true)]
    [string]$LogGroup,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Creating CloudWatch Dashboard for AgentCore ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agent: $AgentName" -ForegroundColor Yellow
Write-Host "Log Group: $LogGroup" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow

$dashboardName = "AgentCore-$AgentName"

# Create dashboard JSON with proper escaping
$dashboardJson = @"
{
    "widgets": [
        {
            "type": "log",
            "x": 0,
            "y": 0,
            "width": 12,
            "height": 6,
            "properties": {
                "query": "SOURCE '$LogGroup'\n| stats count() as invocations by bin(5m)\n| sort @timestamp desc",
                "region": "$Region",
                "title": "Invocation Rate (5min)",
                "stacked": false
            }
        },
        {
            "type": "log",
            "x": 12,
            "y": 0,
            "width": 12,
            "height": 6,
            "properties": {
                "query": "SOURCE '$LogGroup'\n| filter @message like /completed/\n| stats count() as total by bin(5m)",
                "region": "$Region",
                "title": "Completed Invocations (5min)",
                "stacked": false
            }
        },
        {
            "type": "log",
            "x": 0,
            "y": 6,
            "width": 12,
            "height": 6,
            "properties": {
                "query": "SOURCE '$LogGroup'\n| filter @message like /ERROR/ or @message like /error/ or @message like /failed/\n| stats count() as error_count by bin(5m)",
                "region": "$Region",
                "title": "Error Rate (5min)",
                "stacked": false
            }
        },
        {
            "type": "log",
            "x": 12,
            "y": 6,
            "width": 12,
            "height": 6,
            "properties": {
                "query": "SOURCE '$LogGroup'\n| filter @message like /ERROR/\n| fields @timestamp, @message\n| sort @timestamp desc\n| limit 10",
                "region": "$Region",
                "title": "Recent Errors",
                "stacked": false
            }
        },
        {
            "type": "log",
            "x": 0,
            "y": 12,
            "width": 24,
            "height": 6,
            "properties": {
                "query": "SOURCE '$LogGroup'\n| fields @timestamp, @message\n| sort @timestamp desc\n| limit 20",
                "region": "$Region",
                "title": "Recent Activity",
                "stacked": false
            }
        },
        {
            "type": "log",
            "x": 0,
            "y": 18,
            "width": 12,
            "height": 6,
            "properties": {
                "query": "SOURCE '$LogGroup'\n| stats count() as invocations by bin(1h)\n| sort @timestamp desc",
                "region": "$Region",
                "title": "Hourly Invocation Trend",
                "stacked": false
            }
        },
        {
            "type": "log",
            "x": 12,
            "y": 18,
            "width": 12,
            "height": 6,
            "properties": {
                "query": "SOURCE '$LogGroup'\n| filter @message like /Invocation/\n| stats count() as total",
                "region": "$Region",
                "title": "Total Invocations",
                "stacked": false
            }
        }
    ]
}
"@

# Save to temp file
$tempFile = [System.IO.Path]::GetTempFileName()
$dashboardJson | Out-File -FilePath $tempFile -Encoding utf8 -NoNewline

Write-Host ""
Write-Host "Creating dashboard: $dashboardName" -ForegroundColor Yellow

try {
    aws cloudwatch put-dashboard `
        --dashboard-name $dashboardName `
        --dashboard-body file://$tempFile `
        --region $Region
    
    Write-Host ""
    Write-Host "=== Dashboard Created Successfully ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "View dashboard at:" -ForegroundColor Cyan
    Write-Host "https://console.aws.amazon.com/cloudwatch/home?region=$Region#dashboards:name=$dashboardName" -ForegroundColor Gray
} catch {
    Write-Host ""
    Write-Host "Error creating dashboard: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Dashboard JSON:" -ForegroundColor Yellow
    Write-Host $dashboardJson -ForegroundColor Gray
} finally {
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "To view logs:" -ForegroundColor Cyan
Write-Host "aws logs tail $LogGroup --follow --region $Region" -ForegroundColor Gray
Write-Host ""

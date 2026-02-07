param(
    [Parameter(Mandatory=$true)]
    [string]$AgentName,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1",
    
    [Parameter(Mandatory=$false)]
    [string]$LogGroup
)

$ErrorActionPreference = "Stop"

Write-Host "=== Creating CloudWatch Dashboard ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agent: $AgentName" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow

# If log group not provided, try to find it
if (-not $LogGroup) {
    Write-Host ""
    Write-Host "Finding log group for agent..." -ForegroundColor Yellow
    
    $logGroups = aws logs describe-log-groups `
        --log-group-name-prefix "/aws/bedrock-agentcore" `
        --region $Region `
        --query "logGroups[].logGroupName" `
        --output json | ConvertFrom-Json
    
    if ($logGroups.Count -eq 0) {
        Write-Host "No AgentCore log groups found!" -ForegroundColor Red
        exit 1
    }
    
    if ($logGroups.Count -eq 1) {
        $LogGroup = $logGroups[0]
        Write-Host "Found log group: $LogGroup" -ForegroundColor Green
    } else {
        Write-Host "Multiple log groups found:" -ForegroundColor Yellow
        for ($i = 0; $i -lt $logGroups.Count; $i++) {
            Write-Host "  [$i] $($logGroups[$i])" -ForegroundColor Gray
        }
        $selection = Read-Host "Select log group (0-$($logGroups.Count - 1))"
        $LogGroup = $logGroups[[int]$selection]
    }
}

Write-Host ""
Write-Host "Using log group: $LogGroup" -ForegroundColor Green

# Create dashboard JSON
$dashboardName = "AgentCore-$AgentName-Dashboard"

$dashboard = @{
    widgets = @(
        @{
            type = "log"
            x = 0
            y = 0
            width = 12
            height = 6
            properties = @{
                query = "SOURCE '$LogGroup'`n| stats count() as invocations by bin(5m)`n| sort @timestamp desc"
                region = $Region
                title = "Invocation Rate (5min)"
                stacked = $false
            }
        },
        @{
            type = "log"
            x = 12
            y = 0
            width = 12
            height = 6
            properties = @{
                query = "SOURCE '$LogGroup'`n| filter @message like /Invocation completed/`n| parse @message /Invocation completed successfully \((?<duration>[0-9.]+)s\)/`n| stats avg(duration) as avg_latency, max(duration) as max_latency, pct(duration, 95) as p95_latency by bin(5m)"
                region = $Region
                title = "Performance Metrics (seconds)"
                stacked = $false
            }
        },
        @{
            type = "log"
            x = 0
            y = 6
            width = 12
            height = 6
            properties = @{
                query = "SOURCE '$LogGroup'`n| filter @message like /ERROR/ or @message like /error/ or @message like /failed/`n| stats count() as error_count by bin(5m)"
                region = $Region
                title = "Error Rate (5min)"
                stacked = $false
            }
        },
        @{
            type = "log"
            x = 12
            y = 6
            width = 12
            height = 6
            properties = @{
                query = "SOURCE '$LogGroup'`n| filter @message like /ERROR/`n| fields @timestamp, @message`n| sort @timestamp desc`n| limit 10"
                region = $Region
                title = "Recent Errors"
                stacked = $false
            }
        },
        @{
            type = "log"
            x = 0
            y = 12
            width = 24
            height = 6
            properties = @{
                query = "SOURCE '$LogGroup'`n| fields @timestamp, @message`n| sort @timestamp desc`n| limit 20"
                region = $Region
                title = "Recent Activity"
                stacked = $false
            }
        }
    )
}

# Save to temp file
$tempFile = [System.IO.Path]::GetTempFileName()
$dashboard | ConvertTo-Json -Depth 10 | Out-File -FilePath $tempFile -Encoding utf8

Write-Host ""
Write-Host "Creating dashboard: $dashboardName" -ForegroundColor Yellow

aws cloudwatch put-dashboard `
    --dashboard-name $dashboardName `
    --dashboard-body file://$tempFile `
    --region $Region

Remove-Item $tempFile

Write-Host ""
Write-Host "=== Dashboard Created ===" -ForegroundColor Green
Write-Host ""
Write-Host "View dashboard at:" -ForegroundColor Cyan
Write-Host "https://console.aws.amazon.com/cloudwatch/home?region=$Region#dashboards:name=$dashboardName" -ForegroundColor Gray
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Cyan
Write-Host "aws logs tail $LogGroup --follow --region $Region" -ForegroundColor Gray

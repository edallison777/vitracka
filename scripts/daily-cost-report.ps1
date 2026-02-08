param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1",
    
    [Parameter(Mandatory=$false)]
    [int]$DaysBack = 7,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputFile = ""
)

$ErrorActionPreference = "Stop"

Write-Host "=== AgentCore Daily Cost Report ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host "Period: Last $DaysBack days" -ForegroundColor Yellow
Write-Host ""

# Calculate date range
$endDate = (Get-Date).ToString("yyyy-MM-dd")
$startDate = (Get-Date).AddDays(-$DaysBack).ToString("yyyy-MM-dd")

Write-Host "Fetching cost data from $startDate to $endDate..." -ForegroundColor Yellow
Write-Host ""

# Get Bedrock costs
$bedrockCosts = aws ce get-cost-and-usage `
    --time-period "Start=$startDate,End=$endDate" `
    --granularity DAILY `
    --metrics "UnblendedCost" `
    --filter file://scripts/cost-filter.json `
    --region us-east-1 `
    --output json | ConvertFrom-Json

if (-not $bedrockCosts) {
    Write-Host "Error: Could not fetch cost data" -ForegroundColor Red
    exit 1
}

# Parse and display results
$totalCost = 0
$report = @()

Write-Host "Daily Bedrock Costs:" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Gray
Write-Host ("{0,-15} {1,15} {2,15}" -f "Date", "Cost (USD)", "Change") -ForegroundColor White
Write-Host ("-" * 60) -ForegroundColor Gray

$previousCost = 0
foreach ($result in $bedrockCosts.ResultsByTime) {
    $date = $result.TimePeriod.Start
    $cost = [math]::Round([decimal]$result.Total.UnblendedCost.Amount, 4)
    $totalCost += $cost
    
    $change = ""
    if ($previousCost -gt 0) {
        $percentChange = (($cost - $previousCost) / $previousCost) * 100
        if ($percentChange -gt 0) {
            $change = "+{0:N1}%" -f $percentChange
        } elseif ($percentChange -lt 0) {
            $change = "{0:N1}%" -f $percentChange
        } else {
            $change = "0%"
        }
    }
    
    $costColor = if ($cost -eq 0) { "Gray" } elseif ($cost -lt 1) { "Green" } elseif ($cost -lt 5) { "Yellow" } else { "Red" }
    Write-Host ("{0,-15} {1,15:C4} {2,15}" -f $date, $cost, $change) -ForegroundColor $costColor
    
    $report += [PSCustomObject]@{
        Date = $date
        Cost = $cost
        Change = $change
    }
    
    $previousCost = $cost
}

Write-Host ("-" * 60) -ForegroundColor Gray
$avgCost = if ($bedrockCosts.ResultsByTime.Count -gt 0) { $totalCost / $bedrockCosts.ResultsByTime.Count } else { 0 }
Write-Host ("{0,-15} {1,15:C4}" -f "Total", $totalCost) -ForegroundColor White
Write-Host ("{0,-15} {1,15:C4}" -f "Average/Day", $avgCost) -ForegroundColor White
Write-Host ("=" * 60) -ForegroundColor Gray
Write-Host ""

# Projected monthly cost
$projectedMonthlyCost = $avgCost * 30
Write-Host "Projected Monthly Cost: " -NoNewline -ForegroundColor Cyan
Write-Host ("{0:C2}" -f $projectedMonthlyCost) -ForegroundColor $(if ($projectedMonthlyCost -lt 50) { "Green" } elseif ($projectedMonthlyCost -lt 100) { "Yellow" } else { "Red" })
Write-Host ""

# Get invocation counts
Write-Host "Fetching invocation metrics..." -ForegroundColor Yellow

$invocations = aws cloudwatch get-metric-statistics `
    --namespace "AWS/Bedrock" `
    --metric-name "Invocations" `
    --start-time "$startDate`T00:00:00Z" `
    --end-time "$endDate`T23:59:59Z" `
    --period 86400 `
    --statistics Sum `
    --region $Region `
    --output json | ConvertFrom-Json

if ($invocations -and $invocations.Datapoints.Count -gt 0) {
    $totalInvocations = ($invocations.Datapoints | Measure-Object -Property Sum -Sum).Sum
    $avgInvocations = $totalInvocations / $invocations.Datapoints.Count
    
    Write-Host ""
    Write-Host "Invocation Statistics:" -ForegroundColor Cyan
    Write-Host "  Total Invocations: $totalInvocations" -ForegroundColor White
    Write-Host "  Average/Day: $([math]::Round($avgInvocations, 0))" -ForegroundColor White
    
    if ($totalCost -gt 0 -and $totalInvocations -gt 0) {
        $costPerInvocation = $totalCost / $totalInvocations
        Write-Host "  Cost/Invocation: `$$([math]::Round($costPerInvocation, 4))" -ForegroundColor White
    }
} else {
    Write-Host ""
    Write-Host "No invocation data available for this period" -ForegroundColor Yellow
}

Write-Host ""

# Save to file if requested
if ($OutputFile) {
    $reportData = @{
        GeneratedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        Period = @{
            Start = $startDate
            End = $endDate
            Days = $DaysBack
        }
        Summary = @{
            TotalCost = $totalCost
            AverageDailyCost = $avgCost
            ProjectedMonthlyCost = $projectedMonthlyCost
        }
        DailyCosts = $report
    }
    
    $reportData | ConvertTo-Json -Depth 10 | Out-File -FilePath $OutputFile -Encoding utf8
    Write-Host "Report saved to: $OutputFile" -ForegroundColor Green
    Write-Host ""
}

# Recommendations
Write-Host "Cost Optimization Tips:" -ForegroundColor Cyan
Write-Host "  - Monitor invocation patterns to identify optimization opportunities" -ForegroundColor Gray
Write-Host "  - Use caching to reduce redundant model invocations" -ForegroundColor Gray
Write-Host "  - Set appropriate max_tokens limits" -ForegroundColor Gray
Write-Host "  - Consider using smaller models for simple tasks" -ForegroundColor Gray
Write-Host "  - Destroy unused agents with 'agentcore destroy'" -ForegroundColor Gray
Write-Host ""

Write-Host "=== Report Complete ===" -ForegroundColor Green
Write-Host ""

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

# Check agent status using agentcore CLI
try {
    # Find project root (where agents directory is)
    $currentDir = Get-Location
    $projectRoot = $currentDir
    
    # Search up to 3 levels for agents directory
    for ($i = 0; $i -lt 3; $i++) {
        if (Test-Path (Join-Path $projectRoot "agents")) {
            break
        }
        $projectRoot = Split-Path $projectRoot -Parent
        if (-not $projectRoot) { break }
    }
    
    if ($projectRoot -and (Test-Path (Join-Path $projectRoot "agents"))) {
        $agentsPath = Join-Path $projectRoot "agents"
        $agentDirs = Get-ChildItem -Path $agentsPath -Directory -ErrorAction SilentlyContinue
        $activeAgents = 0
        
        foreach ($dir in $agentDirs) {
            $configPath = Join-Path $dir.FullName ".bedrock_agentcore.yaml"
            if (Test-Path $configPath) {
                $activeAgents++
            }
        }
        
        Write-Host "  Configured Agents: $activeAgents" -ForegroundColor White
    } else {
        Write-Host "  Configured Agents: Unable to determine (run from project root)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  Configured Agents: Unable to determine" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Cost Optimization Tips:" -ForegroundColor Cyan
Write-Host "  - Use agentcore destroy when not testing" -ForegroundColor Gray
Write-Host "  - Monitor invocation patterns" -ForegroundColor Gray
Write-Host "  - Set up budget alerts in AWS Cost Management" -ForegroundColor Gray

Write-Host ""
Write-Host "=== Report Complete ===" -ForegroundColor Green

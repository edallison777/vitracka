# Deploy Coach Companion Agent to AgentCore
$ErrorActionPreference = "Stop"

Write-Host "=== Deploying Coach Companion Agent ===" -ForegroundColor Cyan
Write-Host ""

# Navigate to agent directory
Push-Location agents/coach-companion-agentcore

try {
    Write-Host "Deploying from: $(Get-Location)" -ForegroundColor Yellow
    Write-Host ""
    
    # Deploy
    agentcore deploy
    
    Write-Host ""
    Write-Host "=== Deployment Complete ===" -ForegroundColor Green
    
} finally {
    Pop-Location
}

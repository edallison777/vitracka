$ErrorActionPreference = "Stop"

Write-Host "=== Redeploying Test Agent to eu-west-1 ===" -ForegroundColor Cyan

Set-Location agents/test-agent

# Deploy
Write-Host "Deploying agent..." -ForegroundColor Yellow
agentcore deploy

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green

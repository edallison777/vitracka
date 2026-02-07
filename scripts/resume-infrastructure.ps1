# Resume AWS Infrastructure
# This script recreates the infrastructure when you're ready to work again

$ErrorActionPreference = "Continue"
$region = "eu-west-1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Resuming AWS Infrastructure" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: With AgentCore, you don't need NAT Gateways!" -ForegroundColor Yellow
Write-Host ""
Write-Host "AgentCore Runtime is serverless and doesn't require:" -ForegroundColor Green
Write-Host "  - NAT Gateways" -ForegroundColor Gray
Write-Host "  - Load Balancers" -ForegroundColor Gray
Write-Host "  - ECS clusters" -ForegroundColor Gray
Write-Host "  - Always-on infrastructure" -ForegroundColor Gray
Write-Host ""
Write-Host "You only pay when agents are invoked!" -ForegroundColor Green
Write-Host ""

$choice = Read-Host "Deploy to AgentCore (recommended) or recreate old infrastructure? (agentcore/old/cancel)"

if ($choice -eq "cancel") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

if ($choice -eq "agentcore") {
    Write-Host ""
    Write-Host "Great choice! Follow these steps:" -ForegroundColor Green
    Write-Host ""
    Write-Host "1. Deploy test agent:" -ForegroundColor Cyan
    Write-Host "   cd agents/test-agent" -ForegroundColor Gray
    Write-Host "   agentcore launch" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Once test agent works, deploy Coach Companion:" -ForegroundColor Cyan
    Write-Host "   cd agents/coach-companion" -ForegroundColor Gray
    Write-Host "   agentcore launch" -ForegroundColor Gray
    Write-Host ""
    Write-Host "See AGENTCORE_DEPLOYMENT_GUIDE.md for full instructions" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

if ($choice -eq "old") {
    Write-Host ""
    Write-Host "WARNING: This will recreate expensive infrastructure!" -ForegroundColor Red
    Write-Host "  - 3 NAT Gateways: ~`$96/month" -ForegroundColor Red
    Write-Host "  - 3 Elastic IPs: ~`$11/month" -ForegroundColor Red
    Write-Host "  - Load Balancer: ~`$25/month" -ForegroundColor Red
    Write-Host ""
    $confirm = Read-Host "Are you sure? (yes/no)"
    
    if ($confirm -ne "yes") {
        Write-Host "Cancelled. Consider using AgentCore instead!" -ForegroundColor Yellow
        exit 0
    }
    
    Write-Host ""
    Write-Host "Recreating infrastructure with Terraform..." -ForegroundColor Yellow
    Write-Host ""
    
    Set-Location terraform
    
    Write-Host "Running terraform plan..." -ForegroundColor Cyan
    terraform plan -var-file="environments/development.tfvars" -out="development.tfplan"
    
    Write-Host ""
    $apply = Read-Host "Apply this plan? (yes/no)"
    
    if ($apply -eq "yes") {
        terraform apply development.tfplan
        Write-Host ""
        Write-Host "Infrastructure recreated!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Build and push Docker images" -ForegroundColor Gray
        Write-Host "2. Deploy ECS services" -ForegroundColor Gray
        Write-Host "3. Run database migrations" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "Cancelled." -ForegroundColor Yellow
    }
    
    Set-Location ..
}

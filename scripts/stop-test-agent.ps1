# Stop Test Agent ECS Service to Save Costs
# This scales the service to 0 tasks, stopping all running containers

$ErrorActionPreference = "Stop"
$region = "eu-west-1"
$cluster = "vitracka-agents"
$service = "test-agent"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Stopping Test Agent Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if service exists
Write-Host "Checking service status..." -ForegroundColor Yellow
$serviceInfo = aws ecs describe-services --cluster $cluster --services $service --region $region 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Service not found or already stopped" -ForegroundColor Yellow
    exit 0
}

# Get current task count
$currentCount = aws ecs describe-services --cluster $cluster --services $service --region $region --query "services[0].desiredCount" --output text

Write-Host "Current desired task count: $currentCount" -ForegroundColor Gray
Write-Host ""

if ($currentCount -eq "0") {
    Write-Host "Service is already stopped (0 tasks)" -ForegroundColor Green
    exit 0
}

# Scale to 0
Write-Host "Scaling service to 0 tasks..." -ForegroundColor Yellow
aws ecs update-service --cluster $cluster --service $service --desired-count 0 --region $region --query "service.desiredCount" --output text

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Service scaled to 0 tasks" -ForegroundColor Green
    Write-Host ""
    Write-Host "Cost Savings:" -ForegroundColor Green
    Write-Host "  - Fargate tasks: ~`$0.012/hour saved (~`$8.64/day)" -ForegroundColor Green
    Write-Host "  - Bedrock invocations: `$0 (no requests)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Remaining costs (minimal):" -ForegroundColor Yellow
    Write-Host "  - ECR storage: ~`$0.10/GB/month" -ForegroundColor Gray
    Write-Host "  - CloudWatch Logs: ~`$0.50/GB" -ForegroundColor Gray
    Write-Host "  - ECS cluster: Free (no tasks running)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To restart, run: .\scripts\start-test-agent.ps1" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "✗ Failed to scale service" -ForegroundColor Red
    exit 1
}

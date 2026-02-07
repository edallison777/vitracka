# Cleanup ECS Fargate Resources
# Removes the old ECS Fargate deployment that was replaced by AgentCore Runtime

param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1",
    
    [Parameter(Mandatory=$false)]
    [string]$Cluster = "vitracka-agents",
    
    [Parameter(Mandatory=$false)]
    [string]$Service = "test-agent"
)

$ErrorActionPreference = "Stop"

# Color functions
function Write-Step { param($msg) Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "  $msg" -ForegroundColor Gray }
function Write-Warning { param($msg) Write-Host "  ⚠ $msg" -ForegroundColor Yellow }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ECS Fargate Cleanup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Region:  $Region" -ForegroundColor White
Write-Host "Cluster: $Cluster" -ForegroundColor White
Write-Host "Service: $Service" -ForegroundColor White
Write-Host ""
Write-Warning "This will delete ECS Fargate resources and stop any running costs."
Write-Host ""

# Step 1: Check if service exists
Write-Step "Checking ECS Service"

$serviceExists = aws ecs describe-services --cluster $Cluster --services $Service --region $Region --query "services[0].status" --output text 2>$null

if ($serviceExists -eq "ACTIVE") {
    Write-Info "Service found: $Service"
    
    # Get current status
    $runningCount = aws ecs describe-services --cluster $Cluster --services $Service --region $Region --query "services[0].runningCount" --output text
    $desiredCount = aws ecs describe-services --cluster $Cluster --services $Service --region $Region --query "services[0].desiredCount" --output text
    
    Write-Info "Running tasks: $runningCount"
    Write-Info "Desired tasks: $desiredCount"
    
    # Step 2: Scale service to 0
    Write-Step "Scaling Service to 0"
    
    aws ecs update-service --cluster $Cluster --service $Service --desired-count 0 --region $Region --query "service.serviceName" --output text 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Service scaled to 0 tasks"
        Write-Info "Waiting for tasks to stop..."
        Start-Sleep -Seconds 10
    } else {
        Write-Error "Failed to scale service"
        exit 1
    }
    
    # Step 3: Delete service
    Write-Step "Deleting ECS Service"
    
    aws ecs delete-service --cluster $Cluster --service $Service --force --region $Region --query "service.serviceName" --output text 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Service deleted: $Service"
    } else {
        Write-Error "Failed to delete service"
        exit 1
    }
} else {
    Write-Info "Service not found or already deleted"
}

# Step 4: Check for other services in cluster
Write-Step "Checking for Other Services"

$otherServices = aws ecs list-services --cluster $Cluster --region $Region --query "serviceArns" --output json 2>$null | ConvertFrom-Json

if ($otherServices -and $otherServices.Count -gt 0) {
    Write-Warning "Cluster has $($otherServices.Count) other service(s). Not deleting cluster."
    Write-Info "Services: $($otherServices -join ', ')"
} else {
    # Step 5: Delete cluster
    Write-Step "Deleting ECS Cluster"
    
    aws ecs delete-cluster --cluster $Cluster --region $Region --query "cluster.clusterName" --output text 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Cluster deleted: $Cluster"
    } else {
        Write-Warning "Could not delete cluster (may have other resources)"
    }
}

# Step 6: Check ECR repository
Write-Step "Checking ECR Repository"

$repoName = "vitracka/$Service"
$repoExists = aws ecr describe-repositories --repository-names $repoName --region $Region 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Info "ECR repository exists: $repoName"
    Write-Info "Keeping ECR repository (may be used by AgentCore Runtime)"
} else {
    Write-Info "ECR repository not found"
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resources cleaned up:" -ForegroundColor White
Write-Host "  ✓ ECS Service stopped and deleted" -ForegroundColor Gray
Write-Host "  ✓ Running tasks terminated" -ForegroundColor Gray
if ($otherServices -and $otherServices.Count -eq 0) {
    Write-Host "  ✓ ECS Cluster deleted" -ForegroundColor Gray
}
Write-Host ""
Write-Host "Cost savings: ~`$8.64/day (~`$260/month)" -ForegroundColor Green
Write-Host ""
Write-Host "Note: ECR repository kept for AgentCore Runtime use" -ForegroundColor Yellow
Write-Host ""

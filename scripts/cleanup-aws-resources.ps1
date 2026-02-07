# Cleanup AWS Resources Script
# This script removes all deployed Vitracka resources from AWS

$ErrorActionPreference = "Continue"
$region = "eu-west-1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AWS Resource Cleanup for Vitracka" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Scale down ECS service to 0
Write-Host "Step 1: Scaling down ECS service..." -ForegroundColor Yellow
aws ecs update-service --cluster vitracka-development-cluster --service vitracka-development-service --desired-count 0 --region $region
Write-Host "Done - ECS service scaled to 0" -ForegroundColor Green
Start-Sleep -Seconds 10

# Step 2: Delete ECS service
Write-Host "`nStep 2: Deleting ECS service..." -ForegroundColor Yellow
aws ecs delete-service --cluster vitracka-development-cluster --service vitracka-development-service --force --region $region
Write-Host "Done - ECS service deleted" -ForegroundColor Green
Start-Sleep -Seconds 5

# Step 3: Delete ECS cluster
Write-Host "`nStep 3: Deleting ECS cluster..." -ForegroundColor Yellow
aws ecs delete-cluster --cluster vitracka-development-cluster --region $region
Write-Host "Done - ECS cluster deleted" -ForegroundColor Green

# Step 4: Delete Load Balancer
Write-Host "`nStep 4: Deleting Application Load Balancer..." -ForegroundColor Yellow
$albArn = "arn:aws:elasticloadbalancing:eu-west-1:732231126129:loadbalancer/app/vitracka-development-alb/a4469d737d4c3df5"
aws elbv2 delete-load-balancer --load-balancer-arn $albArn --region $region
Write-Host "Done - Load Balancer deletion initiated" -ForegroundColor Green
Write-Host "Waiting 30 seconds for load balancer to delete..." -ForegroundColor Gray
Start-Sleep -Seconds 30

# Step 5: Delete Target Groups
Write-Host "`nStep 5: Deleting target groups..." -ForegroundColor Yellow
$targetGroups = aws elbv2 describe-target-groups --region $region --query "TargetGroups[?contains(TargetGroupName, 'vitracka')].TargetGroupArn" --output text
if ($targetGroups) {
    foreach ($tg in $targetGroups -split " ") {
        if ($tg.Trim()) {
            Write-Host "  Deleting: $tg" -ForegroundColor Gray
            aws elbv2 delete-target-group --target-group-arn $tg.Trim() --region $region 2>$null
        }
    }
    Write-Host "Done - Target groups deleted" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Phase 1 Cleanup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "ECS resources have been removed." -ForegroundColor Green
Write-Host "VPC and network resources will be cleaned up separately if needed." -ForegroundColor Yellow
Write-Host ""

# Pause AWS Infrastructure to Save Costs
# This script removes expensive resources while preserving data and configuration

$ErrorActionPreference = "Continue"
$region = "eu-west-1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pausing AWS Infrastructure" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will remove costly resources while keeping:" -ForegroundColor Yellow
Write-Host "  - VPC and subnets (free)" -ForegroundColor Green
Write-Host "  - Security groups (free)" -ForegroundColor Green
Write-Host "  - Route tables (free)" -ForegroundColor Green
Write-Host "  - ECR images (minimal cost)" -ForegroundColor Green
Write-Host ""
Write-Host "This will DELETE (can be recreated):" -ForegroundColor Yellow
Write-Host "  - NAT Gateways (~`$96/month)" -ForegroundColor Red
Write-Host "  - Elastic IPs (~`$11/month)" -ForegroundColor Red
Write-Host "  - Load Balancers (~`$25/month)" -ForegroundColor Red
Write-Host "  - RDS instances (if any)" -ForegroundColor Red
Write-Host "  - ECS services and tasks" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# Step 1: Delete NAT Gateways
Write-Host "Step 1: Deleting NAT Gateways..." -ForegroundColor Yellow
$natGateways = aws ec2 describe-nat-gateways --region $region --filter "Name=state,Values=available" --query "NatGateways[].NatGatewayId" --output text

if ($natGateways) {
    $natArray = $natGateways -split "`t"
    foreach ($nat in $natArray) {
        if ($nat.Trim()) {
            Write-Host "  Deleting NAT Gateway: $nat" -ForegroundColor Gray
            aws ec2 delete-nat-gateway --nat-gateway-id $nat.Trim() --region $region
        }
    }
    Write-Host "  NAT Gateways deletion initiated" -ForegroundColor Green
    Write-Host "  Waiting 60 seconds for deletion..." -ForegroundColor Gray
    Start-Sleep -Seconds 60
} else {
    Write-Host "  No NAT Gateways found" -ForegroundColor Gray
}

# Step 2: Release Elastic IPs
Write-Host "`nStep 2: Releasing Elastic IPs..." -ForegroundColor Yellow
$eips = aws ec2 describe-addresses --region $region --query "Addresses[].AllocationId" --output text

if ($eips) {
    $eipArray = $eips -split "`t"
    foreach ($eip in $eipArray) {
        if ($eip.Trim()) {
            Write-Host "  Releasing Elastic IP: $eip" -ForegroundColor Gray
            aws ec2 release-address --allocation-id $eip.Trim() --region $region 2>$null
        }
    }
    Write-Host "  Elastic IPs released" -ForegroundColor Green
} else {
    Write-Host "  No Elastic IPs found" -ForegroundColor Gray
}

# Step 3: Delete Load Balancers (if any remain)
Write-Host "`nStep 3: Checking for Load Balancers..." -ForegroundColor Yellow
$albs = aws elbv2 describe-load-balancers --region $region --query "LoadBalancers[?contains(LoadBalancerName, 'vitracka')].LoadBalancerArn" --output text

if ($albs) {
    $albArray = $albs -split "`t"
    foreach ($alb in $albArray) {
        if ($alb.Trim()) {
            Write-Host "  Deleting Load Balancer: $alb" -ForegroundColor Gray
            aws elbv2 delete-load-balancer --load-balancer-arn $alb.Trim() --region $region
        }
    }
    Write-Host "  Load Balancers deleted" -ForegroundColor Green
    Start-Sleep -Seconds 10
} else {
    Write-Host "  No Load Balancers found" -ForegroundColor Gray
}

# Step 4: Delete Target Groups
Write-Host "`nStep 4: Deleting Target Groups..." -ForegroundColor Yellow
Start-Sleep -Seconds 20  # Wait for ALB to fully delete
$targetGroups = aws elbv2 describe-target-groups --region $region --query "TargetGroups[?contains(TargetGroupName, 'vitracka')].TargetGroupArn" --output text

if ($targetGroups) {
    $tgArray = $targetGroups -split "`t"
    foreach ($tg in $tgArray) {
        if ($tg.Trim()) {
            Write-Host "  Deleting Target Group: $tg" -ForegroundColor Gray
            aws elbv2 delete-target-group --target-group-arn $tg.Trim() --region $region 2>$null
        }
    }
    Write-Host "  Target Groups deleted" -ForegroundColor Green
} else {
    Write-Host "  No Target Groups found" -ForegroundColor Gray
}

# Step 5: Stop RDS Instances (if any)
Write-Host "`nStep 5: Checking for RDS instances..." -ForegroundColor Yellow
$rdsInstances = aws rds describe-db-instances --region $region --query "DBInstances[?contains(DBInstanceIdentifier, 'vitracka')].DBInstanceIdentifier" --output text

if ($rdsInstances) {
    $rdsArray = $rdsInstances -split "`t"
    foreach ($rds in $rdsArray) {
        if ($rds.Trim()) {
            Write-Host "  Stopping RDS instance: $rds" -ForegroundColor Gray
            Write-Host "    Note: RDS can only be stopped for 7 days, then auto-starts" -ForegroundColor Yellow
            aws rds stop-db-instance --db-instance-identifier $rds.Trim() --region $region 2>$null
        }
    }
    Write-Host "  RDS instances stopped" -ForegroundColor Green
} else {
    Write-Host "  No RDS instances found" -ForegroundColor Gray
}

# Step 6: Delete ECS Services (if any remain)
Write-Host "`nStep 6: Checking for ECS services..." -ForegroundColor Yellow
$ecsClusters = aws ecs list-clusters --region $region --query "clusterArns[?contains(@, 'vitracka')]" --output text

if ($ecsClusters) {
    $clusterArray = $ecsClusters -split "`t"
    foreach ($cluster in $clusterArray) {
        if ($cluster.Trim()) {
            $clusterName = $cluster.Split('/')[-1]
            Write-Host "  Checking cluster: $clusterName" -ForegroundColor Gray
            
            $services = aws ecs list-services --cluster $clusterName --region $region --query "serviceArns" --output text
            if ($services) {
                $serviceArray = $services -split "`t"
                foreach ($service in $serviceArray) {
                    if ($service.Trim()) {
                        $serviceName = $service.Split('/')[-1]
                        Write-Host "    Scaling down service: $serviceName" -ForegroundColor Gray
                        aws ecs update-service --cluster $clusterName --service $serviceName --desired-count 0 --region $region 2>$null
                        Start-Sleep -Seconds 5
                        Write-Host "    Deleting service: $serviceName" -ForegroundColor Gray
                        aws ecs delete-service --cluster $clusterName --service $serviceName --force --region $region 2>$null
                    }
                }
            }
            
            Write-Host "    Deleting cluster: $clusterName" -ForegroundColor Gray
            aws ecs delete-cluster --cluster $clusterName --region $region 2>$null
        }
    }
    Write-Host "  ECS resources cleaned up" -ForegroundColor Green
} else {
    Write-Host "  No ECS clusters found" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Infrastructure Paused!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Cost Savings:" -ForegroundColor Green
Write-Host "  - NAT Gateways: ~`$96/month saved" -ForegroundColor Green
Write-Host "  - Elastic IPs: ~`$11/month saved" -ForegroundColor Green
Write-Host "  - Load Balancers: ~`$25/month saved" -ForegroundColor Green
Write-Host "  - Total: ~`$132/month saved" -ForegroundColor Green
Write-Host ""
Write-Host "Remaining costs (minimal):" -ForegroundColor Yellow
Write-Host "  - VPC: Free" -ForegroundColor Gray
Write-Host "  - Security Groups: Free" -ForegroundColor Gray
Write-Host "  - ECR Images: ~`$0.10/GB/month" -ForegroundColor Gray
Write-Host "  - CloudWatch Logs: ~`$0.50/GB" -ForegroundColor Gray
Write-Host ""
Write-Host "To resume work, run: .\scripts\resume-infrastructure.ps1" -ForegroundColor Cyan
Write-Host ""

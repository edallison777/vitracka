# Pause AWS Infrastructure Immediately (No Confirmation)
# Run this to immediately tear down expensive resources

$ErrorActionPreference = "Continue"
$region = "eu-west-1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pausing AWS Infrastructure NOW" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Delete NAT Gateways
Write-Host "Step 1: Deleting NAT Gateways..." -ForegroundColor Yellow
$natGateways = aws ec2 describe-nat-gateways --region $region --filter "Name=state,Values=available" --query "NatGateways[].NatGatewayId" --output text

if ($natGateways) {
    $natArray = $natGateways -split "`t"
    foreach ($nat in $natArray) {
        if ($nat.Trim()) {
            Write-Host "  Deleting: $nat" -ForegroundColor Gray
            aws ec2 delete-nat-gateway --nat-gateway-id $nat.Trim() --region $region
        }
    }
    Write-Host "  Done - Waiting 60s for deletion..." -ForegroundColor Green
    Start-Sleep -Seconds 60
} else {
    Write-Host "  None found" -ForegroundColor Gray
}

# Step 2: Release Elastic IPs
Write-Host "`nStep 2: Releasing Elastic IPs..." -ForegroundColor Yellow
$eips = aws ec2 describe-addresses --region $region --query "Addresses[].AllocationId" --output text

if ($eips) {
    $eipArray = $eips -split "`t"
    foreach ($eip in $eipArray) {
        if ($eip.Trim()) {
            Write-Host "  Releasing: $eip" -ForegroundColor Gray
            aws ec2 release-address --allocation-id $eip.Trim() --region $region 2>$null
        }
    }
    Write-Host "  Done" -ForegroundColor Green
} else {
    Write-Host "  None found" -ForegroundColor Gray
}

# Step 3: Delete Load Balancers
Write-Host "`nStep 3: Deleting Load Balancers..." -ForegroundColor Yellow
$albs = aws elbv2 describe-load-balancers --region $region --query "LoadBalancers[?contains(LoadBalancerName, 'vitracka')].LoadBalancerArn" --output text 2>$null

if ($albs) {
    $albArray = $albs -split "`t"
    foreach ($alb in $albArray) {
        if ($alb.Trim()) {
            Write-Host "  Deleting: $alb" -ForegroundColor Gray
            aws elbv2 delete-load-balancer --load-balancer-arn $alb.Trim() --region $region
        }
    }
    Write-Host "  Done - Waiting 20s..." -ForegroundColor Green
    Start-Sleep -Seconds 20
} else {
    Write-Host "  None found" -ForegroundColor Gray
}

# Step 4: Delete Target Groups
Write-Host "`nStep 4: Deleting Target Groups..." -ForegroundColor Yellow
$targetGroups = aws elbv2 describe-target-groups --region $region --query "TargetGroups[?contains(TargetGroupName, 'vitracka')].TargetGroupArn" --output text 2>$null

if ($targetGroups) {
    $tgArray = $targetGroups -split "`t"
    foreach ($tg in $tgArray) {
        if ($tg.Trim()) {
            Write-Host "  Deleting: $tg" -ForegroundColor Gray
            aws elbv2 delete-target-group --target-group-arn $tg.Trim() --region $region 2>$null
        }
    }
    Write-Host "  Done" -ForegroundColor Green
} else {
    Write-Host "  None found" -ForegroundColor Gray
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Infrastructure Paused!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Monthly Savings: ~`$132" -ForegroundColor Green
Write-Host ""
Write-Host "To resume: .\scripts\resume-infrastructure.ps1" -ForegroundColor Cyan
Write-Host ""

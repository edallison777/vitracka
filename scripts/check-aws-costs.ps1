# Check Current AWS Costs
# This script shows what's currently running and costing money

$ErrorActionPreference = "Continue"
$region = "eu-west-1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AWS Cost Analysis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$totalMonthlyCost = 0

# Check NAT Gateways
Write-Host "NAT Gateways:" -ForegroundColor Yellow
$natGateways = aws ec2 describe-nat-gateways --region $region --filter "Name=state,Values=available" --query "NatGateways[].{ID:NatGatewayId,State:State}" --output json | ConvertFrom-Json
$natCount = ($natGateways | Measure-Object).Count
if ($natCount -gt 0) {
    $natCost = $natCount * 32.40
    $totalMonthlyCost += $natCost
    Write-Host "  Count: $natCount" -ForegroundColor Red
    Write-Host "  Cost: `$$natCost/month (~`$0.045/hour each)" -ForegroundColor Red
    foreach ($nat in $natGateways) {
        Write-Host "    - $($nat.ID)" -ForegroundColor Gray
    }
} else {
    Write-Host "  None running" -ForegroundColor Green
}

# Check Elastic IPs
Write-Host "`nElastic IPs:" -ForegroundColor Yellow
$eips = aws ec2 describe-addresses --region $region --query "Addresses[].{IP:PublicIp,AllocationId:AllocationId}" --output json | ConvertFrom-Json
$eipCount = ($eips | Measure-Object).Count
if ($eipCount -gt 0) {
    $eipCost = $eipCount * 3.60
    $totalMonthlyCost += $eipCost
    Write-Host "  Count: $eipCount" -ForegroundColor Red
    Write-Host "  Cost: `$$eipCost/month (~`$0.005/hour each)" -ForegroundColor Red
    foreach ($eip in $eips) {
        Write-Host "    - $($eip.IP)" -ForegroundColor Gray
    }
} else {
    Write-Host "  None allocated" -ForegroundColor Green
}

# Check Load Balancers
Write-Host "`nLoad Balancers:" -ForegroundColor Yellow
$albs = aws elbv2 describe-load-balancers --region $region --query "LoadBalancers[?contains(LoadBalancerName, 'vitracka')].{Name:LoadBalancerName,State:State.Code}" --output json 2>$null | ConvertFrom-Json
$albCount = ($albs | Measure-Object).Count
if ($albCount -gt 0) {
    $albCost = $albCount * 24.84
    $totalMonthlyCost += $albCost
    Write-Host "  Count: $albCount" -ForegroundColor Red
    Write-Host "  Cost: `$$albCost/month (~`$0.0225/hour + data)" -ForegroundColor Red
    foreach ($alb in $albs) {
        Write-Host "    - $($alb.Name) ($($alb.State))" -ForegroundColor Gray
    }
} else {
    Write-Host "  None running" -ForegroundColor Green
}

# Check RDS Instances
Write-Host "`nRDS Instances:" -ForegroundColor Yellow
$rdsInstances = aws rds describe-db-instances --region $region --query "DBInstances[?contains(DBInstanceIdentifier, 'vitracka')].{ID:DBInstanceIdentifier,Class:DBInstanceClass,Status:DBInstanceStatus}" --output json 2>$null | ConvertFrom-Json
$rdsCount = ($rdsInstances | Measure-Object).Count
if ($rdsCount -gt 0) {
    Write-Host "  Count: $rdsCount" -ForegroundColor Red
    foreach ($rds in $rdsInstances) {
        Write-Host "    - $($rds.ID) ($($rds.Class)) - $($rds.Status)" -ForegroundColor Gray
        # Rough cost estimate based on instance class
        if ($rds.Class -like "*micro*") { 
            $rdsCost = 15
        } elseif ($rds.Class -like "*small*") { 
            $rdsCost = 30
        } elseif ($rds.Class -like "*medium*") { 
            $rdsCost = 60
        } elseif ($rds.Class -like "*large*") { 
            $rdsCost = 120
        } else { 
            $rdsCost = 50
        }
        $totalMonthlyCost += $rdsCost
        Write-Host "      Estimated: `$$rdsCost/month" -ForegroundColor Red
    }
} else {
    Write-Host "  None running" -ForegroundColor Green
}

# Check ECS Services
Write-Host "`nECS Services:" -ForegroundColor Yellow
$ecsClusters = aws ecs list-clusters --region $region --query "clusterArns[?contains(@, 'vitracka')]" --output text
if ($ecsClusters) {
    $clusterArray = $ecsClusters -split "`t"
    foreach ($cluster in $clusterArray) {
        if ($cluster.Trim()) {
            $clusterName = $cluster.Split('/')[-1]
            $services = aws ecs list-services --cluster $clusterName --region $region --query "serviceArns" --output text
            if ($services) {
                $serviceArray = $services -split "`t"
                $serviceCount = ($serviceArray | Where-Object { $_.Trim() } | Measure-Object).Count
                Write-Host "  Cluster: $clusterName" -ForegroundColor Red
                Write-Host "    Services: $serviceCount" -ForegroundColor Red
                
                foreach ($service in $serviceArray) {
                    if ($service.Trim()) {
                        $serviceName = $service.Split('/')[-1]
                        $serviceDetails = aws ecs describe-services --cluster $clusterName --services $serviceName --region $region --query "services[0].{Running:runningCount,Desired:desiredCount}" --output json | ConvertFrom-Json
                        Write-Host "      - $serviceName (Running: $($serviceDetails.Running), Desired: $($serviceDetails.Desired))" -ForegroundColor Gray
                        
                        # Rough Fargate cost estimate
                        $taskCost = $serviceDetails.Running * 20
                        $totalMonthlyCost += $taskCost
                        Write-Host "        Estimated: `$$taskCost/month" -ForegroundColor Red
                    }
                }
            }
        }
    }
} else {
    Write-Host "  None running" -ForegroundColor Green
}

# Check ECR Repositories
Write-Host "`nECR Repositories:" -ForegroundColor Yellow
$ecrRepos = aws ecr describe-repositories --region $region --query "repositories[?contains(repositoryName, 'vitracka')].{Name:repositoryName}" --output json 2>$null | ConvertFrom-Json
$ecrCount = ($ecrRepos | Measure-Object).Count
if ($ecrCount -gt 0) {
    Write-Host "  Count: $ecrCount" -ForegroundColor Yellow
    $ecrCost = $ecrCount * 0.50
    $totalMonthlyCost += $ecrCost
    Write-Host "  Estimated Cost: `$$ecrCost/month (~`$0.10/GB)" -ForegroundColor Yellow
    foreach ($repo in $ecrRepos) {
        Write-Host "    - $($repo.Name)" -ForegroundColor Gray
    }
} else {
    Write-Host "  None found" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total Estimated Monthly Cost: `$$totalMonthlyCost" -ForegroundColor $(if ($totalMonthlyCost -gt 50) { "Red" } elseif ($totalMonthlyCost -gt 10) { "Yellow" } else { "Green" })
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($totalMonthlyCost -gt 50) {
    Write-Host "RECOMMENDATION: Run .\scripts\pause-infrastructure.ps1 to save costs!" -ForegroundColor Red
    Write-Host "You can save ~`$$totalMonthlyCost/month by pausing when not actively developing." -ForegroundColor Yellow
} elseif ($totalMonthlyCost -gt 10) {
    Write-Host "Consider pausing infrastructure when not in use to save costs." -ForegroundColor Yellow
} else {
    Write-Host "Costs are minimal. You're good!" -ForegroundColor Green
}

Write-Host ""

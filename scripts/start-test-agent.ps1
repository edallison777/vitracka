# Start Test Agent ECS Service
# This scales the service back to 1 task

$ErrorActionPreference = "Stop"
$region = "eu-west-1"
$cluster = "vitracka-agents"
$service = "test-agent"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Test Agent Service" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if service exists
Write-Host "Checking service status..." -ForegroundColor Yellow
$serviceInfo = aws ecs describe-services --cluster $cluster --services $service --region $region 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Service not found" -ForegroundColor Red
    Write-Host "Run the deployment script first to create the service" -ForegroundColor Yellow
    exit 1
}

# Get current task count
$currentCount = aws ecs describe-services --cluster $cluster --services $service --region $region --query "services[0].desiredCount" --output text

Write-Host "Current desired task count: $currentCount" -ForegroundColor Gray
Write-Host ""

if ($currentCount -ne "0") {
    Write-Host "Service is already running ($currentCount tasks)" -ForegroundColor Green
    
    # Get task IP
    Write-Host ""
    Write-Host "Getting task IP address..." -ForegroundColor Yellow
    $taskArn = aws ecs list-tasks --cluster $cluster --service-name $service --region $region --query "taskArns[0]" --output text
    
    if ($taskArn -and $taskArn -ne "None") {
        $taskDetails = aws ecs describe-tasks --cluster $cluster --tasks $taskArn --region $region --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text
        
        if ($taskDetails) {
            $publicIp = aws ec2 describe-network-interfaces --network-interface-ids $taskDetails --region $region --query "NetworkInterfaces[0].Association.PublicIp" --output text
            
            if ($publicIp -and $publicIp -ne "None") {
                Write-Host "✓ Agent is running at: http://${publicIp}:8001" -ForegroundColor Green
                Write-Host ""
                Write-Host "Test endpoints:" -ForegroundColor Cyan
                Write-Host "  Health: curl http://${publicIp}:8001/health" -ForegroundColor Gray
                Write-Host "  Test:   curl -X POST http://${publicIp}:8001/test -H 'Content-Type: application/json' -d '{\"message\":\"Hello\"}'" -ForegroundColor Gray
            }
        }
    }
    
    exit 0
}

# Scale to 1
Write-Host "Scaling service to 1 task..." -ForegroundColor Yellow
aws ecs update-service --cluster $cluster --service $service --desired-count 1 --region $region --query "service.desiredCount" --output text

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Service scaled to 1 task" -ForegroundColor Green
    Write-Host ""
    Write-Host "Waiting for task to start (this may take 30-60 seconds)..." -ForegroundColor Yellow
    
    # Wait for service to stabilize
    $maxAttempts = 12
    $attempt = 0
    $taskRunning = $false
    
    while ($attempt -lt $maxAttempts -and -not $taskRunning) {
        Start-Sleep -Seconds 10
        $attempt++
        
        $runningCount = aws ecs describe-services --cluster $cluster --services $service --region $region --query "services[0].runningCount" --output text
        
        Write-Host "  Attempt $attempt/$maxAttempts - Running tasks: $runningCount" -ForegroundColor Gray
        
        if ($runningCount -eq "1") {
            $taskRunning = $true
        }
    }
    
    if ($taskRunning) {
        Write-Host ""
        Write-Host "✓ Task is running!" -ForegroundColor Green
        
        # Get task IP
        Write-Host ""
        Write-Host "Getting task IP address..." -ForegroundColor Yellow
        $taskArn = aws ecs list-tasks --cluster $cluster --service-name $service --region $region --query "taskArns[0]" --output text
        
        if ($taskArn -and $taskArn -ne "None") {
            $taskDetails = aws ecs describe-tasks --cluster $cluster --tasks $taskArn --region $region --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text
            
            if ($taskDetails) {
                $publicIp = aws ec2 describe-network-interfaces --network-interface-ids $taskDetails --region $region --query "NetworkInterfaces[0].Association.PublicIp" --output text
                
                if ($publicIp -and $publicIp -ne "None") {
                    Write-Host "✓ Agent is running at: http://${publicIp}:8001" -ForegroundColor Green
                    Write-Host ""
                    Write-Host "Test endpoints:" -ForegroundColor Cyan
                    Write-Host "  Health: curl http://${publicIp}:8001/health" -ForegroundColor Gray
                    Write-Host "  Test:   curl -X POST http://${publicIp}:8001/test -H 'Content-Type: application/json' -d '{\"message\":\"Hello\"}'" -ForegroundColor Gray
                    Write-Host ""
                    Write-Host "Cost: ~`$0.012/hour (~`$8.64/day) while running" -ForegroundColor Yellow
                } else {
                    Write-Host "⚠ Could not retrieve public IP" -ForegroundColor Yellow
                }
            }
        }
    } else {
        Write-Host ""
        Write-Host "⚠ Task is still starting. Check status with:" -ForegroundColor Yellow
        Write-Host "  aws ecs describe-services --cluster $cluster --services $service --region $region" -ForegroundColor Gray
    }
} else {
    Write-Host ""
    Write-Host "✗ Failed to scale service" -ForegroundColor Red
    exit 1
}

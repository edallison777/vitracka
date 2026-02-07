# Fix Architecture Issue and Deploy Test Agent
# This script rebuilds the image for AMD64 and deploys to ECS

Write-Host "=== Fixing Test Agent Architecture Issue ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Rebuild for AMD64
Write-Host "Step 1: Building Docker image for AMD64..." -ForegroundColor Yellow
docker buildx build --platform linux/amd64 -t test-agent:latest --load agents/test-agent

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Image built successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Tag image
Write-Host "Step 2: Tagging image..." -ForegroundColor Yellow
docker tag test-agent:latest 732231126129.dkr.ecr.eu-west-1.amazonaws.com/vitracka/test-agent:latest
Write-Host "✓ Image tagged" -ForegroundColor Green
Write-Host ""

# Step 3: Login to ECR
Write-Host "Step 3: Logging in to ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 732231126129.dkr.ecr.eu-west-1.amazonaws.com

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ ECR login failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Logged in to ECR" -ForegroundColor Green
Write-Host ""

# Step 4: Push to ECR
Write-Host "Step 4: Pushing image to ECR..." -ForegroundColor Yellow
docker push 732231126129.dkr.ecr.eu-west-1.amazonaws.com/vitracka/test-agent:latest

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Push failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Image pushed to ECR" -ForegroundColor Green
Write-Host ""

# Step 5: Force new deployment
Write-Host "Step 5: Forcing new ECS deployment..." -ForegroundColor Yellow
aws ecs update-service --cluster vitracka-agents --service test-agent --force-new-deployment --query "service.serviceName" --output text

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Service update failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ New deployment started" -ForegroundColor Green
Write-Host ""

# Step 6: Wait for task to start
Write-Host "Step 6: Waiting for task to start (60 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# Check service status
$status = aws ecs describe-services --cluster vitracka-agents --services test-agent --query "services[0].[status,runningCount,desiredCount]" --output json | ConvertFrom-Json

Write-Host "Service Status: $($status[0])" -ForegroundColor Cyan
Write-Host "Running Tasks: $($status[1])/$($status[2])" -ForegroundColor Cyan
Write-Host ""

if ($status[1] -eq 0) {
    Write-Host "⚠️  No tasks running yet. Checking events..." -ForegroundColor Yellow
    aws ecs describe-services --cluster vitracka-agents --services test-agent --query "services[0].events[0:2].[createdAt,message]" --output table
    Write-Host ""
    Write-Host "Wait a bit longer and check status with:" -ForegroundColor Cyan
    Write-Host "  aws ecs describe-services --cluster vitracka-agents --services test-agent --query 'services[0].[status,runningCount,desiredCount]' --output table" -ForegroundColor White
    exit 0
}

# Step 7: Get public IP
Write-Host "Step 7: Getting public IP..." -ForegroundColor Yellow
$taskArn = aws ecs list-tasks --cluster vitracka-agents --service-name test-agent --desired-status RUNNING --query "taskArns[0]" --output text

if ([string]::IsNullOrEmpty($taskArn)) {
    Write-Host "✗ No running tasks found" -ForegroundColor Red
    exit 1
}

$taskId = $taskArn.Split('/')[-1]
$eniId = aws ecs describe-tasks --cluster vitracka-agents --tasks $taskId --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value | [0]" --output text

Start-Sleep -Seconds 5  # Wait for ENI to be ready

$publicIp = aws ec2 describe-network-interfaces --network-interface-ids $eniId --query "NetworkInterfaces[0].Association.PublicIp" --output text

if ([string]::IsNullOrEmpty($publicIp) -or $publicIp -eq "None") {
    Write-Host "⚠️  Public IP not yet assigned. Wait a moment and try:" -ForegroundColor Yellow
    Write-Host "  aws ec2 describe-network-interfaces --network-interface-ids $eniId --query 'NetworkInterfaces[0].Association.PublicIp' --output text" -ForegroundColor White
    exit 0
}

Write-Host "✓ Public IP: $publicIp" -ForegroundColor Green
Write-Host ""

# Step 8: Test endpoints
Write-Host "Step 8: Testing endpoints..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Testing health endpoint..." -ForegroundColor Cyan
curl "http://${publicIp}:8001/health"
Write-Host ""

Write-Host "Testing agent endpoint..." -ForegroundColor Cyan
curl -X POST "http://${publicIp}:8001/test" -H "Content-Type: application/json" -d '{\"message\": \"Hello, test agent!\"}'
Write-Host ""

Write-Host ""
Write-Host "=== Deployment Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Agent URL: http://${publicIp}:8001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Remember to stop the service when done to save costs:" -ForegroundColor Yellow
Write-Host "  aws ecs update-service --cluster vitracka-agents --service test-agent --desired-count 0" -ForegroundColor White

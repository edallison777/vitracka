$ErrorActionPreference = "Stop"

Write-Host "=== Deploying Test Agent to eu-west-1 ===" -ForegroundColor Cyan
Write-Host ""

$region = "eu-west-1"
$agentPath = "agents/test-agent"

# Step 1: Create ECR repository
Write-Host "Creating ECR repository..." -ForegroundColor Yellow
aws ecr create-repository `
    --repository-name vitracka/test-agent `
    --image-scanning-configuration scanOnPush=true `
    --encryption-configuration encryptionType=AES256 `
    --region $region 2>$null

Write-Host "ECR repository created" -ForegroundColor Green

# Step 2: Build and push Docker image
Write-Host ""
Write-Host "Building Docker image..." -ForegroundColor Yellow
docker buildx build --platform linux/arm64 -t test-agent:latest --load $agentPath

$accountId = aws sts get-caller-identity --query Account --output text
$ecrUri = "$accountId.dkr.ecr.$region.amazonaws.com/vitracka/test-agent"

Write-Host "Tagging image..." -ForegroundColor Yellow
docker tag test-agent:latest "$ecrUri:latest"

Write-Host "Logging into ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $region | docker login --username AWS --password-stdin "$accountId.dkr.ecr.$region.amazonaws.com"

Write-Host "Pushing image to ECR..." -ForegroundColor Yellow
docker push "$ecrUri:latest"

Write-Host "Image pushed successfully" -ForegroundColor Green

# Step 3: Deploy to AgentCore
Write-Host ""
Write-Host "Deploying to AgentCore Runtime..." -ForegroundColor Yellow
Set-Location $agentPath
agentcore deploy --region $region
Set-Location ../..

Write-Host ""
Write-Host "=== Deployment Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "Test the agent:" -ForegroundColor Cyan
Write-Host "  cd $agentPath" -ForegroundColor Gray
Write-Host "  agentcore invoke '{\"prompt\": \"Hello!\"}'" -ForegroundColor Gray

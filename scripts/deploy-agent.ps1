# Automated Agent Deployment Script
# Builds, pushes, and deploys Strands agents to AWS ECS Fargate

param(
    [Parameter(Mandatory=$true)]
    [string]$AgentName,
    
    [Parameter(Mandatory=$true)]
    [string]$AgentPath,
    
    [Parameter(Mandatory=$false)]
    [string]$Version = "latest",
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1",
    
    [Parameter(Mandatory=$false)]
    [string]$Cluster = "vitracka-agents",
    
    [Parameter(Mandatory=$false)]
    [int]$Memory = 512,
    
    [Parameter(Mandatory=$false)]
    [int]$Cpu = 256,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

# Color functions
function Write-Step { param($msg) Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "  $msg" -ForegroundColor Gray }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Agent Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agent:       $AgentName" -ForegroundColor White
Write-Host "Path:        $AgentPath" -ForegroundColor White
Write-Host "Version:     $Version" -ForegroundColor White
Write-Host "Environment: $Environment" -ForegroundColor White
Write-Host "Region:      $Region" -ForegroundColor White
Write-Host "Cluster:     $Cluster" -ForegroundColor White
Write-Host "Memory:      ${Memory}MB" -ForegroundColor White
Write-Host "CPU:         $Cpu" -ForegroundColor White
Write-Host ""

# Step 1: Validate parameters
Write-Step "Validating Parameters"

if (-not (Test-Path $AgentPath)) {
    Write-Error "Agent path does not exist: $AgentPath"
    exit 1
}

if (-not (Test-Path "$AgentPath/Dockerfile")) {
    Write-Error "Dockerfile not found in: $AgentPath"
    exit 1
}

Write-Success "Parameters validated"

# Step 2: Check AWS credentials
Write-Step "Checking AWS Credentials"

try {
    $accountId = aws sts get-caller-identity --query Account --output text 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "AWS credentials not configured"
        Write-Info "Run: aws configure"
        exit 1
    }
    Write-Success "AWS Account: $accountId"
} catch {
    Write-Error "Failed to verify AWS credentials"
    exit 1
}

# Step 3: Check Docker
Write-Step "Checking Docker"

try {
    docker --version | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker not found"
        exit 1
    }
    Write-Success "Docker is available"
} catch {
    Write-Error "Docker not installed or not running"
    exit 1
}

# Step 4: Build Docker image
if (-not $SkipBuild) {
    Write-Step "Building Docker Image"
    
    Write-Info "Building for linux/arm64 (Graviton2)..."
    $imageName = "${AgentName}:${Version}"
    
    docker buildx build --platform linux/arm64 -t $imageName --load $AgentPath
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker build failed"
        exit 1
    }
    
    # Check image size
    $imageSize = docker images $imageName --format "{{.Size}}"
    Write-Success "Image built: $imageName ($imageSize)"
    
    # Warn if image is too large
    $sizeMB = [int]($imageSize -replace '[^\d]', '')
    if ($sizeMB -gt 200) {
        Write-Host "  ⚠ Warning: Image size exceeds 200MB recommendation" -ForegroundColor Yellow
    }
} else {
    Write-Step "Skipping Docker Build"
    Write-Info "Using existing image"
}

# Step 5: Create ECR repository if needed
Write-Step "Checking ECR Repository"

$repoName = "vitracka/$AgentName"
$repoExists = aws ecr describe-repositories --repository-names $repoName --region $Region 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Info "Creating ECR repository: $repoName"
    aws ecr create-repository `
        --repository-name $repoName `
        --region $Region `
        --image-scanning-configuration scanOnPush=true `
        --encryption-configuration encryptionType=AES256
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "ECR repository created"
    } else {
        Write-Error "Failed to create ECR repository"
        exit 1
    }
} else {
    Write-Success "ECR repository exists"
}

# Step 6: Authenticate Docker with ECR
Write-Step "Authenticating with ECR"

$ecrLogin = aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin "${accountId}.dkr.ecr.${Region}.amazonaws.com" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Success "Authenticated with ECR"
} else {
    Write-Error "ECR authentication failed"
    exit 1
}

# Step 7: Tag and push image
Write-Step "Pushing Image to ECR"

$ecrImage = "${accountId}.dkr.ecr.${Region}.amazonaws.com/${repoName}:${Version}"
docker tag "${AgentName}:${Version}" $ecrImage

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to tag image"
    exit 1
}

Write-Info "Pushing to: $ecrImage"
docker push $ecrImage

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to push image to ECR"
    exit 1
}

Write-Success "Image pushed to ECR"

# Step 8: Check if ECS cluster exists
Write-Step "Checking ECS Cluster"

$clusterExists = aws ecs describe-clusters --clusters $Cluster --region $Region --query "clusters[0].status" --output text 2>&1

if ($clusterExists -ne "ACTIVE") {
    Write-Info "Creating ECS cluster: $Cluster"
    aws ecs create-cluster --cluster-name $Cluster --region $Region
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "ECS cluster created"
    } else {
        Write-Error "Failed to create ECS cluster"
        exit 1
    }
} else {
    Write-Success "ECS cluster exists"
}

# Step 9: Register task definition
Write-Step "Registering Task Definition"

# Create task definition JSON file directly
$taskDefFile = "task-definition-$AgentName.json"
$taskDefContent = @{
    family = $AgentName
    networkMode = "awsvpc"
    requiresCompatibilities = @("FARGATE")
    cpu = [string]$Cpu
    memory = [string]$Memory
    runtimePlatform = @{
        cpuArchitecture = "ARM64"
        operatingSystemFamily = "LINUX"
    }
    executionRoleArn = "arn:aws:iam::${accountId}:role/VitrackaTestAgentExecutionRole"
    taskRoleArn = "arn:aws:iam::${accountId}:role/VitrackaTestAgentTaskRole"
    containerDefinitions = @(
        @{
            name = $AgentName
            image = $ecrImage
            essential = $true
            portMappings = @(
                @{
                    containerPort = 8001
                    protocol = "tcp"
                }
            )
            environment = @(
                @{
                    name = "AWS_REGION"
                    value = $Region
                }
                @{
                    name = "ENVIRONMENT"
                    value = $Environment
                }
            )
            logConfiguration = @{
                logDriver = "awslogs"
                options = @{
                    "awslogs-group" = "/ecs/$AgentName"
                    "awslogs-region" = $Region
                    "awslogs-stream-prefix" = "ecs"
                    "awslogs-create-group" = "true"
                }
            }
        }
    )
}

$jsonContent = $taskDefContent | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($taskDefFile, $jsonContent)

Write-Info "Task definition file created: $taskDefFile"

$taskDefArn = aws ecs register-task-definition --cli-input-json file://$taskDefFile --region $Region --query "taskDefinition.taskDefinitionArn" --output text 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Success "Task definition registered: $taskDefArn"
    Remove-Item $taskDefFile -ErrorAction SilentlyContinue
} else {
    Write-Error "Failed to register task definition"
    Write-Info "Task definition file saved for debugging: $taskDefFile"
    Write-Info "Error: $taskDefArn"
    exit 1
}

# Step 10: Check if service exists
Write-Step "Checking ECS Service"

$serviceExists = aws ecs describe-services --cluster $Cluster --services $AgentName --region $Region --query "services[0].status" --output text 2>&1

if ($serviceExists -eq "ACTIVE") {
    Write-Info "Service exists, updating..."
    
    aws ecs update-service `
        --cluster $Cluster `
        --service $AgentName `
        --task-definition $AgentName `
        --force-new-deployment `
        --region $Region `
        --query "service.serviceName" `
        --output text
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Service updated with new task definition"
    } else {
        Write-Error "Failed to update service"
        exit 1
    }
} else {
    Write-Info "Creating new service..."
    
    # Get default VPC and subnets
    $vpcId = aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --region $Region --query "Vpcs[0].VpcId" --output text
    $subnets = aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpcId" --region $Region --query "Subnets[*].SubnetId" --output text
    $subnetList = ($subnets -split "`t") -join ","
    
    # Get or create security group
    $sgName = "${AgentName}-sg"
    $sgId = aws ec2 describe-security-groups --filters "Name=group-name,Values=$sgName" "Name=vpc-id,Values=$vpcId" --region $Region --query "SecurityGroups[0].GroupId" --output text 2>&1
    
    if ($LASTEXITCODE -ne 0 -or $sgId -eq "None") {
        Write-Info "Creating security group..."
        $sgId = aws ec2 create-security-group --group-name $sgName --description "Security group for $AgentName" --vpc-id $vpcId --region $Region --query "GroupId" --output text
        
        # Allow inbound on port 8001
        aws ec2 authorize-security-group-ingress --group-id $sgId --protocol tcp --port 8001 --cidr 0.0.0.0/0 --region $Region
    }
    
    Write-Info "Using security group: $sgId"
    Write-Info "Using subnets: $subnetList"
    
    # Build network configuration
    $networkConfig = "awsvpcConfiguration={subnets=[$subnetList],securityGroups=[$sgId],assignPublicIp=ENABLED}"
    
    aws ecs create-service `
        --cluster $Cluster `
        --service-name $AgentName `
        --task-definition $AgentName `
        --desired-count 1 `
        --launch-type FARGATE `
        --network-configuration $networkConfig `
        --region $Region `
        --query "service.serviceName" `
        --output text
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Service created"
    } else {
        Write-Error "Failed to create service"
        exit 1
    }
}

# Step 11: Wait for service to stabilize
Write-Step "Waiting for Service to Stabilize"

Write-Info "This may take 1-2 minutes..."

$maxAttempts = 24
$attempt = 0
$stable = $false

while ($attempt -lt $maxAttempts -and -not $stable) {
    Start-Sleep -Seconds 10
    $attempt++
    
    $runningCount = aws ecs describe-services --cluster $Cluster --services $AgentName --region $Region --query "services[0].runningCount" --output text
    $desiredCount = aws ecs describe-services --cluster $Cluster --services $AgentName --region $Region --query "services[0].desiredCount" --output text
    
    Write-Info "Attempt $attempt/$maxAttempts - Running: $runningCount, Desired: $desiredCount"
    
    if ($runningCount -eq $desiredCount -and $runningCount -gt 0) {
        $stable = $true
    }
}

if ($stable) {
    Write-Success "Service is stable"
} else {
    Write-Host "  ⚠ Service is still stabilizing. Check status manually." -ForegroundColor Yellow
}

# Step 12: Get task IP and test
Write-Step "Getting Task Information"

$taskArn = aws ecs list-tasks --cluster $Cluster --service-name $AgentName --region $Region --query "taskArns[0]" --output text

if ($taskArn -and $taskArn -ne "None") {
    $taskDetails = aws ecs describe-tasks --cluster $Cluster --tasks $taskArn --region $Region --query "tasks[0].attachments[0].details[?name=='networkInterfaceId'].value" --output text
    
    if ($taskDetails) {
        $publicIp = aws ec2 describe-network-interfaces --network-interface-ids $taskDetails --region $Region --query "NetworkInterfaces[0].Association.PublicIp" --output text
        
        if ($publicIp -and $publicIp -ne "None") {
            Write-Success "Task is running at: http://${publicIp}:8001"
            
            if (-not $SkipTests) {
                Write-Step "Testing Health Endpoint"
                
                Start-Sleep -Seconds 5
                
                try {
                    $response = Invoke-WebRequest -Uri "http://${publicIp}:8001/health" -TimeoutSec 10 -UseBasicParsing
                    if ($response.StatusCode -eq 200) {
                        Write-Success "Health check passed"
                    } else {
                        Write-Host "  ⚠ Health check returned status: $($response.StatusCode)" -ForegroundColor Yellow
                    }
                } catch {
                    Write-Host "  ⚠ Health check failed (agent may still be starting)" -ForegroundColor Yellow
                }
            }
        }
    }
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agent:    $AgentName" -ForegroundColor White
Write-Host "Version:  $Version" -ForegroundColor White
Write-Host "Cluster:  $Cluster" -ForegroundColor White
Write-Host "Region:   $Region" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Test the agent endpoints" -ForegroundColor Gray
Write-Host "  2. Check CloudWatch logs: /ecs/$AgentName" -ForegroundColor Gray
Write-Host "  3. Monitor in AWS Console" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop the agent (save costs):" -ForegroundColor Yellow
Write-Host '  .\scripts\stop-test-agent.ps1' -ForegroundColor Gray
Write-Host ""

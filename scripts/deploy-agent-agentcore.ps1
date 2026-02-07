# AgentCore Runtime Agent Deployment Script
# Deploys Strands agents to AWS Bedrock AgentCore Runtime

param(
    [Parameter(Mandatory=$true)]
    [string]$AgentName,
    
    [Parameter(Mandatory=$true)]
    [string]$AgentPath,
    
    [Parameter(Mandatory=$false)]
    [string]$Version = "latest",
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1",
    
    [Parameter(Mandatory=$false)]
    [string]$ModelId = "anthropic.claude-3-5-sonnet-20241022-v2:0",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("direct", "container")]
    [string]$DeploymentType = "direct",
    
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
function Write-Warning { param($msg) Write-Host "  ⚠ $msg" -ForegroundColor Yellow }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AgentCore Runtime Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agent:       $AgentName" -ForegroundColor White
Write-Host "Path:        $AgentPath" -ForegroundColor White
Write-Host "Version:     $Version" -ForegroundColor White
Write-Host "Region:      $Region" -ForegroundColor White
Write-Host "Model:       $ModelId" -ForegroundColor White
Write-Host "Deployment:  $DeploymentType" -ForegroundColor White
if ($DeploymentType -eq "container") {
    Write-Host "Platform:    linux/arm64 (AgentCore Runtime)" -ForegroundColor White
}
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

if (-not (Test-Path "$AgentPath/agent.py")) {
    Write-Error "agent.py not found in: $AgentPath"
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

# Step 3: Check prerequisites
Write-Step "Checking Prerequisites"

# Check Docker
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

# Check if AgentCore CLI is available
$agentcoreAvailable = $false
try {
    $agentcoreCheck = agentcore --help 2>&1
    if ($LASTEXITCODE -eq 0 -or $agentcoreCheck -match "Usage:") {
        $agentcoreAvailable = $true
        Write-Success "AgentCore CLI is available"
    }
} catch {
    # AgentCore CLI not available, will use manual deployment
}

if (-not $agentcoreAvailable) {
    Write-Warning "AgentCore CLI not found. Will use manual deployment."
    Write-Info "To install: pip install bedrock-agentcore-starter-toolkit"
}

# Step 4: Test agent locally (optional)
if (-not $SkipTests) {
    Write-Step "Testing Agent Locally"
    
    if (Test-Path "$AgentPath/test_agent.py") {
        Write-Info "Running local test..."
        
        Push-Location $AgentPath
        try {
            python test_agent.py
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Local test passed"
            } else {
                Write-Warning "Local test failed, but continuing deployment"
            }
        } catch {
            Write-Warning "Could not run local test: $_"
        }
        Pop-Location
    } else {
        Write-Info "No test_agent.py found, skipping local test"
    }
}

# Step 5: Build Docker image for ARM64 (only for container deployment)
if ($DeploymentType -eq "container" -and -not $SkipBuild) {
    Write-Step "Building Docker Image for ARM64"
    
    Write-Info "Building for linux/arm64 (AgentCore Runtime requirement)..."
    $imageName = "${AgentName}:${Version}"
    
    # Check if buildx is available
    docker buildx version 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker buildx not available. Required for ARM64 builds."
        Write-Info "Enable with: docker buildx create --use"
        exit 1
    }
    
    docker buildx build --platform linux/arm64 -t $imageName --load $AgentPath
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker build failed"
        exit 1
    }
    
    # Check image size
    $imageSize = docker images $imageName --format "{{.Size}}"
    Write-Success "Image built: $imageName ($imageSize)"
    
    # Warn if image is too large (parse size correctly)
    if ($imageSize -match '(\d+\.?\d*)\s*(GB|MB)') {
        $sizeValue = [float]$matches[1]
        $sizeUnit = $matches[2]
        
        $sizeMB = if ($sizeUnit -eq 'GB') { $sizeValue * 1024 } else { $sizeValue }
        
        if ($sizeMB -gt 500) {
            Write-Warning "Image size exceeds 500MB. Consider optimizing."
        }
    }
} elseif ($DeploymentType -eq "direct") {
    Write-Step "Skipping Docker Build"
    Write-Info "Using direct code deployment (CodeBuild will handle container build)"
} else {
    Write-Step "Skipping Docker Build"
    Write-Info "Using existing image"
}

# Step 6: Create ECR repository if needed (only for container deployment)
if ($DeploymentType -eq "container") {
Write-Step "Checking ECR Repository"

$repoName = "vitracka/$AgentName"
$ErrorActionPreference = 'SilentlyContinue'
$repoExists = aws ecr describe-repositories --repository-names $repoName --region $Region 2>&1 | Out-Null
$repoCheckExitCode = $LASTEXITCODE
$ErrorActionPreference = 'Continue'

if ($repoCheckExitCode -ne 0) {
    Write-Info "Creating ECR repository: $repoName"
    aws ecr create-repository `
        --repository-name $repoName `
        --region $Region `
        --image-scanning-configuration scanOnPush=true `
        --encryption-configuration encryptionType=AES256 `
        --tags Key=Project,Value=Vitracka Key=ManagedBy,Value=AgentCore 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "ECR repository created"
    } else {
        Write-Error "Failed to create ECR repository"
        exit 1
    }
} else {
    Write-Success "ECR repository exists"
}

# Step 7: Authenticate Docker with ECR
Write-Step "Authenticating with ECR"

$ecrLogin = aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin "${accountId}.dkr.ecr.${Region}.amazonaws.com" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Success "Authenticated with ECR"
} else {
    Write-Error "ECR authentication failed"
    exit 1
}

# Step 8: Tag and push image
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
}  # End of container deployment block

# Step 9: Deploy to AgentCore Runtime
Write-Step "Deploying to AgentCore Runtime"

if ($agentcoreAvailable) {
    # Use AgentCore CLI
    Write-Info "Using AgentCore CLI for deployment..."
    
    Push-Location $AgentPath
    try {
        # First configure the agent
        Write-Info "Configuring agent for deployment..."
        
        if ($DeploymentType -eq "container") {
            agentcore configure --entrypoint agent.py --deployment-type container --region $Region --non-interactive
        } else {
            agentcore configure --entrypoint agent.py --deployment-type direct_code_deploy --region $Region --non-interactive
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "AgentCore configuration failed"
            Pop-Location
            exit 1
        }
        
        Write-Success "Agent configured"
        
        # Deploy to AgentCore Runtime
        Write-Info "Launching agent to AgentCore Runtime..."
        agentcore launch
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Agent deployed via AgentCore CLI"
            
            # Get deployment status
            Write-Info "Checking deployment status..."
            agentcore status
            
        } else {
            Write-Error "AgentCore CLI deployment failed"
            Pop-Location
            exit 1
        }
    } finally {
        Pop-Location
    }
} else {
    # Manual deployment using AWS CLI
    Write-Info "Using manual deployment (AWS CLI)..."
    Write-Info ""
    Write-Info "AgentCore Runtime deployment requires manual steps:"
    Write-Info "1. Go to AWS Console: https://console.aws.amazon.com/bedrock/home?region=$Region#/agentcore"
    Write-Info "2. Click 'Create Agent Runtime'"
    Write-Info "3. Enter agent name: $AgentName"
    Write-Info "4. Enter container image: $ecrImage"
    Write-Info "5. Select model: $ModelId"
    Write-Info "6. Configure execution role (or create new one)"
    Write-Info "7. Click 'Create'"
    Write-Info ""
    Write-Warning "Manual deployment required. Please follow the steps above."
    Write-Info ""
    Write-Info "After deployment, you can test the agent with:"
    Write-Info "  aws bedrock-agent-runtime invoke-agent --agent-id <AGENT_ID> --session-id test-session --input-text 'Hello' --region $Region"
    Write-Info ""
    Write-Success "Image is ready in ECR: $ecrImage"
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agent:        $AgentName" -ForegroundColor White
Write-Host "Version:      $Version" -ForegroundColor White
Write-Host "Region:       $Region" -ForegroundColor White
Write-Host "Platform:     ARM64 (AgentCore Runtime)" -ForegroundColor White
Write-Host "ECR Image:    $ecrImage" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Test agent invocation: agentcore invoke '{\"prompt\": \"Hello\"}'" -ForegroundColor Gray
Write-Host "  2. Check deployment status: agentcore status" -ForegroundColor Gray
Write-Host "  3. Check CloudWatch logs: /aws/bedrock-agentcore/$AgentName" -ForegroundColor Gray
Write-Host "  4. Monitor in AWS Console (GenAI Observability)" -ForegroundColor Gray
Write-Host "  5. Integrate with mobile app" -ForegroundColor Gray
Write-Host ""
Write-Host "Management commands:" -ForegroundColor Cyan
Write-Host "  Stop session:     agentcore stop-session" -ForegroundColor Gray
Write-Host "  Destroy (dry-run): agentcore destroy --dry-run" -ForegroundColor Gray
Write-Host "  Destroy:          agentcore destroy" -ForegroundColor Gray
Write-Host ""
Write-Host "Cost: Pay-per-use (~`$0.0001-`$0.001 per invocation)" -ForegroundColor Yellow
Write-Host ""

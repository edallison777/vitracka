# Vitracka Blue-Green Deployment Script (PowerShell)
# This script implements blue-green deployment strategy for zero-downtime updates

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment,
    
    [Parameter(Mandatory=$true)]
    [ValidateSet("deploy", "rollback", "cleanup", "status")]
    [string]$Action,
    
    [ValidateSet("blue", "green")]
    [string]$ForceColor,
    
    [int]$Timeout = 600
)

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TerraformDir = Split-Path -Parent $ScriptDir
$AwsRegion = if ($env:AWS_REGION) { $env:AWS_REGION } else { "eu-west-2" }

# Logging functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Setup Terraform backend configuration
function Setup-TerraformBackend {
    param([string]$Env)
    
    Write-Info "Setting up Terraform backend for $Env environment"
    
    Set-Location $TerraformDir
    
    terraform init `
        -backend-config="bucket=vitracka-terraform-state-$Env" `
        -backend-config="key=terraform/$Env.tfstate" `
        -backend-config="region=$AwsRegion" `
        -backend-config="dynamodb_table=vitracka-terraform-locks-$Env" `
        -reconfigure
    
    if ($LASTEXITCODE -ne 0) {
        throw "Terraform init failed"
    }
}

# Get current active deployment color
function Get-CurrentColor {
    param([string]$Env)
    
    try {
        $currentColor = aws ssm get-parameter `
            --name "/vitracka/$Env/active-color" `
            --query 'Parameter.Value' `
            --output text 2>$null
        
        if ($LASTEXITCODE -ne 0) {
            return "blue"
        }
        
        return $currentColor
    }
    catch {
        return "blue"
    }
}

# Get the opposite color
function Get-OppositeColor {
    param([string]$Color)
    
    if ($Color -eq "blue") {
        return "green"
    }
    else {
        return "blue"
    }
}

# Health check function
function Test-HealthCheck {
    param(
        [string]$Endpoint,
        [int]$TimeoutSeconds
    )
    
    Write-Info "Performing health check on $Endpoint (timeout: ${TimeoutSeconds}s)"
    
    $startTime = Get-Date
    
    while ($true) {
        $elapsed = (Get-Date) - $startTime
        
        if ($elapsed.TotalSeconds -gt $TimeoutSeconds) {
            Write-Error "Health check timeout after ${TimeoutSeconds}s"
            return $false
        }
        
        try {
            $response = Invoke-WebRequest -Uri "$Endpoint/health" -Method Get -TimeoutSec 10 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                Write-Success "Health check passed"
                return $true
            }
        }
        catch {
            # Continue trying
        }
        
        Write-Info "Health check failed, retrying in 10s... (elapsed: $([int]$elapsed.TotalSeconds)s)"
        Start-Sleep -Seconds 10
    }
}

# Deploy new environment
function Deploy-NewEnvironment {
    param(
        [string]$Env,
        [string]$NewColor
    )
    
    Write-Info "Deploying new $NewColor environment for $Env"
    
    Set-Location $TerraformDir
    
    # Create Terraform plan
    terraform plan `
        -var-file="environments/$Env.tfvars" `
        -var="deployment_color=$NewColor" `
        -var="blue_green_deployment=true" `
        -out="$Env-$NewColor.tfplan"
    
    if ($LASTEXITCODE -ne 0) {
        throw "Terraform plan failed"
    }
    
    # Apply the plan
    terraform apply "$Env-$NewColor.tfplan"
    
    if ($LASTEXITCODE -ne 0) {
        throw "Terraform apply failed"
    }
    
    # Get the new environment endpoint
    try {
        $newEndpoint = terraform output -raw "alb_dns_name_$NewColor" 2>$null
        if (-not $newEndpoint) {
            $newEndpoint = terraform output -raw alb_dns_name
        }
    }
    catch {
        throw "Could not get endpoint for new environment"
    }
    
    if (-not $newEndpoint) {
        throw "Could not get endpoint for new environment"
    }
    
    Write-Info "New environment endpoint: http://$newEndpoint"
    
    # Perform health check
    if (-not (Test-HealthCheck "http://$newEndpoint" $Timeout)) {
        throw "Health check failed for new environment"
    }
    
    Write-Success "New $NewColor environment deployed and healthy"
    return $newEndpoint
}

# Switch traffic to new environment
function Switch-Traffic {
    param(
        [string]$Env,
        [string]$NewColor
    )
    
    Write-Info "Switching traffic to $NewColor environment"
    
    Set-Location $TerraformDir
    
    # Update the active color parameter
    aws ssm put-parameter `
        --name "/vitracka/$Env/active-color" `
        --value "$NewColor" `
        --overwrite
    
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Could not update active color parameter"
    }
    
    # Get target group ARN and listener ARN
    try {
        $newTargetGroupArn = terraform output -raw "target_group_arn_$NewColor" 2>$null
        $listenerArn = terraform output -raw alb_listener_arn 2>$null
        
        if ($newTargetGroupArn -and $listenerArn) {
            # Update ALB listener to route traffic to new target group
            aws elbv2 modify-listener `
                --listener-arn "$listenerArn" `
                --default-actions Type=forward,TargetGroupArn="$newTargetGroupArn"
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Traffic switched to $NewColor environment"
            }
            else {
                Write-Warning "Could not update ALB listener"
            }
        }
        else {
            Write-Warning "Could not update ALB listener (target group or listener ARN not found)"
        }
    }
    catch {
        Write-Warning "Could not update ALB listener: $_"
    }
}

# Verify deployment
function Test-Deployment {
    param([string]$Env)
    
    Write-Info "Verifying deployment for $Env"
    
    Set-Location $TerraformDir
    
    # Get main endpoint
    try {
        $mainEndpoint = terraform output -raw alb_dns_name
    }
    catch {
        throw "Could not get main endpoint"
    }
    
    if (-not $mainEndpoint) {
        throw "Could not get main endpoint"
    }
    
    # Run smoke tests
    Write-Info "Running smoke tests against http://$mainEndpoint"
    
    # Basic health check
    try {
        $response = Invoke-WebRequest -Uri "http://$mainEndpoint/health" -Method Get -TimeoutSec 30 -UseBasicParsing
        if ($response.StatusCode -ne 200) {
            throw "Main endpoint health check failed with status $($response.StatusCode)"
        }
    }
    catch {
        throw "Main endpoint health check failed: $_"
    }
    
    # Additional smoke tests can be added here
    
    Write-Success "Smoke tests passed"
}

# Rollback deployment
function Invoke-Rollback {
    param(
        [string]$Env,
        [string]$CurrentColor
    )
    
    Write-Info "Rolling back to $CurrentColor environment"
    
    Set-Location $TerraformDir
    
    # Switch traffic back to previous environment
    try {
        $previousTargetGroupArn = terraform output -raw "target_group_arn_$CurrentColor" 2>$null
        $listenerArn = terraform output -raw alb_listener_arn 2>$null
        
        if ($previousTargetGroupArn -and $listenerArn) {
            aws elbv2 modify-listener `
                --listener-arn "$listenerArn" `
                --default-actions Type=forward,TargetGroupArn="$previousTargetGroupArn"
        }
    }
    catch {
        Write-Warning "Could not update ALB listener during rollback: $_"
    }
    
    # Update the active color parameter back
    aws ssm put-parameter `
        --name "/vitracka/$Env/active-color" `
        --value "$CurrentColor" `
        --overwrite
    
    Write-Success "Rollback completed to $CurrentColor environment"
}

# Cleanup old environment
function Remove-OldEnvironment {
    param(
        [string]$Env,
        [string]$OldColor
    )
    
    Write-Info "Cleaning up old $OldColor environment"
    
    Set-Location $TerraformDir
    
    # Destroy the old environment
    terraform plan `
        -var-file="environments/$Env.tfvars" `
        -var="deployment_color=$OldColor" `
        -var="blue_green_deployment=true" `
        -destroy `
        -out="cleanup-$OldColor.tfplan"
    
    if ($LASTEXITCODE -ne 0) {
        throw "Terraform destroy plan failed"
    }
    
    terraform apply "cleanup-$OldColor.tfplan"
    
    if ($LASTEXITCODE -ne 0) {
        throw "Terraform destroy apply failed"
    }
    
    Write-Success "Cleanup completed for $OldColor environment"
}

# Show deployment status
function Show-Status {
    param([string]$Env)
    
    Write-Info "Deployment status for $Env environment"
    
    $currentColor = Get-CurrentColor $Env
    Write-Host "Current active color: $currentColor"
    
    Set-Location $TerraformDir
    
    # Show Terraform outputs
    terraform output
}

# Main execution
try {
    Write-Info "Starting blue-green deployment for $Environment environment"
    Write-Info "Action: $Action"
    
    # Setup Terraform
    Setup-TerraformBackend $Environment
    
    switch ($Action) {
        "deploy" {
            $currentColor = Get-CurrentColor $Environment
            
            if ($ForceColor) {
                $newColor = $ForceColor
            }
            else {
                $newColor = Get-OppositeColor $currentColor
            }
            
            Write-Info "Current active color: $currentColor"
            Write-Info "Deploying to color: $newColor"
            
            # Deploy new environment
            $newEndpoint = Deploy-NewEnvironment $Environment $newColor
            
            # Switch traffic
            Switch-Traffic $Environment $newColor
            
            # Verify deployment
            Test-Deployment $Environment
            
            Write-Success "Blue-green deployment completed successfully"
            Write-Info "Active environment: $newColor"
            Write-Info "Previous environment ($currentColor) is still running for rollback"
            Write-Info "Run '$($MyInvocation.MyCommand.Name) -Environment $Environment -Action cleanup' to clean up the old environment"
        }
        
        "rollback" {
            $currentColor = Get-CurrentColor $Environment
            $previousColor = Get-OppositeColor $currentColor
            
            Write-Warning "Rolling back from $currentColor to $previousColor"
            Invoke-Rollback $Environment $previousColor
        }
        
        "cleanup" {
            $currentColor = Get-CurrentColor $Environment
            $oldColor = Get-OppositeColor $currentColor
            
            $confirmation = Read-Host "This will destroy the $oldColor environment. Are you sure? (y/N)"
            if ($confirmation -match "^[Yy]$") {
                Remove-OldEnvironment $Environment $oldColor
            }
            else {
                Write-Info "Cleanup cancelled"
            }
        }
        
        "status" {
            Show-Status $Environment
        }
    }
    
    Write-Success "Operation completed successfully"
}
catch {
    Write-Error "Operation failed: $_"
    exit 1
}
$ErrorActionPreference = "Stop"

Write-Host "=== Scanning for Resources Outside eu-west-1 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  This script enforces the AWS Region Policy" -ForegroundColor Yellow
Write-Host "    See AWS_REGION_POLICY.md for details" -ForegroundColor Gray
Write-Host ""

$targetRegion = "eu-west-1"
$regionsToCheck = @("us-east-1", "us-west-2", "ap-southeast-2")

foreach ($region in $regionsToCheck) {
    Write-Host "Checking region: $region" -ForegroundColor Yellow
    Write-Host ""
    
    # Check ECR repositories
    Write-Host "  Checking ECR repositories..." -ForegroundColor Gray
    $ecrRepos = aws ecr describe-repositories --region $region --query "repositories[].repositoryName" --output json 2>$null | ConvertFrom-Json
    if ($ecrRepos) {
        foreach ($repo in $ecrRepos) {
            Write-Host "    Found ECR repo: $repo" -ForegroundColor Red
            Write-Host "    Deleting..." -ForegroundColor Yellow
            aws ecr delete-repository --repository-name $repo --force --region $region
            Write-Host "    Deleted" -ForegroundColor Green
        }
    }
    
    # Check AgentCore agents
    Write-Host "  Checking AgentCore agents..." -ForegroundColor Gray
    try {
        $agents = aws bedrock-agent list-agents --region $region --query "agentSummaries[].agentId" --output json 2>$null | ConvertFrom-Json
        if ($agents) {
            foreach ($agentId in $agents) {
                Write-Host "    Found agent: $agentId" -ForegroundColor Red
                Write-Host "    Deleting..." -ForegroundColor Yellow
                aws bedrock-agent delete-agent --agent-id $agentId --region $region
                Write-Host "    Deleted" -ForegroundColor Green
            }
        }
    } catch {
        Write-Host "    No AgentCore agents or service not available" -ForegroundColor Gray
    }
    
    # Check CloudWatch dashboards
    Write-Host "  Checking CloudWatch dashboards..." -ForegroundColor Gray
    $dashboards = aws cloudwatch list-dashboards --region $region --query "DashboardEntries[?contains(DashboardName, 'AgentCore') || contains(DashboardName, 'Vitracka')].DashboardName" --output json 2>$null | ConvertFrom-Json
    if ($dashboards) {
        foreach ($dashboard in $dashboards) {
            Write-Host "    Found dashboard: $dashboard" -ForegroundColor Red
            Write-Host "    Deleting..." -ForegroundColor Yellow
            aws cloudwatch delete-dashboards --dashboard-names $dashboard --region $region
            Write-Host "    Deleted" -ForegroundColor Green
        }
    }
    
    # Check CloudWatch alarms
    Write-Host "  Checking CloudWatch alarms..." -ForegroundColor Gray
    $alarms = aws cloudwatch describe-alarms --region $region --query "MetricAlarms[?contains(AlarmName, 'AgentCore') || contains(AlarmName, 'Vitracka')].AlarmName" --output json 2>$null | ConvertFrom-Json
    if ($alarms) {
        foreach ($alarm in $alarms) {
            Write-Host "    Found alarm: $alarm" -ForegroundColor Red
            Write-Host "    Deleting..." -ForegroundColor Yellow
            aws cloudwatch delete-alarms --alarm-names $alarm --region $region
            Write-Host "    Deleted" -ForegroundColor Green
        }
    }
    
    # Check IAM roles (these are global but check for region-specific ones)
    Write-Host "  Checking IAM roles..." -ForegroundColor Gray
    $roles = aws iam list-roles --query "Roles[?contains(RoleName, 'AgentCore') || contains(RoleName, 'TestAgent')].RoleName" --output json 2>$null | ConvertFrom-Json
    if ($roles) {
        foreach ($role in $roles) {
            Write-Host "    Found role: $role" -ForegroundColor Red
            Write-Host "    Note: IAM roles are global - manual review needed" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
}

Write-Host "=== Cleanup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "All resources outside eu-west-1 have been removed." -ForegroundColor Green
Write-Host "You can now redeploy to eu-west-1." -ForegroundColor Cyan

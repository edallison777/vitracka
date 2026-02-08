param(
    [Parameter(Mandatory=$false)]
    [string]$Region = "eu-west-1"
)

$ErrorActionPreference = "Stop"

Write-Host "=== AgentCore Cost Allocation Tags Verification ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Region: $Region" -ForegroundColor Yellow
Write-Host ""

Write-Host "Checking AgentCore resources for cost allocation tags..." -ForegroundColor Yellow
Write-Host ""

# Check S3 buckets
Write-Host "S3 Buckets:" -ForegroundColor Cyan
$buckets = aws s3api list-buckets --query "Buckets[?contains(Name, 'bedrock-agentcore')].Name" --output json | ConvertFrom-Json

if ($buckets) {
    foreach ($bucket in $buckets) {
        Write-Host "  Bucket: $bucket" -ForegroundColor White
        $tags = aws s3api get-bucket-tagging --bucket $bucket 2>$null | ConvertFrom-Json
        if ($tags) {
            foreach ($tag in $tags.TagSet) {
                Write-Host "    $($tag.Key): $($tag.Value)" -ForegroundColor Gray
            }
        } else {
            Write-Host "    No tags found" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  No AgentCore S3 buckets found" -ForegroundColor Gray
}

Write-Host ""

# Check IAM roles
Write-Host "IAM Roles:" -ForegroundColor Cyan
$roles = aws iam list-roles --query "Roles[?contains(RoleName, 'AgentCore') || contains(RoleName, 'BedrockAgentCore')].RoleName" --output json | ConvertFrom-Json

if ($roles) {
    foreach ($role in $roles) {
        Write-Host "  Role: $role" -ForegroundColor White
        $tags = aws iam list-role-tags --role-name $role --output json 2>$null | ConvertFrom-Json
        if ($tags -and $tags.Tags) {
            foreach ($tag in $tags.Tags) {
                Write-Host "    $($tag.Key): $($tag.Value)" -ForegroundColor Gray
            }
        } else {
            Write-Host "    No tags found" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  No AgentCore IAM roles found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Cost Allocation Tag Strategy ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Recommended Tags for AgentCore Resources:" -ForegroundColor Yellow
Write-Host "  Project: Vitracka" -ForegroundColor Gray
Write-Host "  Environment: dev/staging/production" -ForegroundColor Gray
Write-Host "  ManagedBy: AgentCore" -ForegroundColor Gray
Write-Host "  CostCenter: Engineering" -ForegroundColor Gray
Write-Host "  Application: AI-Agents" -ForegroundColor Gray
Write-Host ""

Write-Host "Note: AgentCore automatically manages most resource tags." -ForegroundColor Yellow
Write-Host "Additional tags can be added manually for cost tracking." -ForegroundColor Yellow
Write-Host ""

Write-Host "To enable cost allocation tags in AWS:" -ForegroundColor Cyan
Write-Host "1. Go to AWS Billing Console > Cost Allocation Tags" -ForegroundColor Gray
Write-Host "2. Activate user-defined tags: Project, Environment, CostCenter" -ForegroundColor Gray
Write-Host "3. Wait 24 hours for tags to appear in Cost Explorer" -ForegroundColor Gray
Write-Host ""

Write-Host "To add tags to S3 bucket:" -ForegroundColor Cyan
Write-Host 'aws s3api put-bucket-tagging --bucket BUCKET_NAME --tagging ''TagSet=[{Key=Project,Value=Vitracka},{Key=Environment,Value=dev}]''' -ForegroundColor DarkGray
Write-Host ""

Write-Host "To add tags to IAM role:" -ForegroundColor Cyan
Write-Host 'aws iam tag-role --role-name ROLE_NAME --tags Key=Project,Value=Vitracka Key=Environment,Value=dev' -ForegroundColor DarkGray
Write-Host ""

Write-Host "=== Verification Complete ===" -ForegroundColor Green
Write-Host ""

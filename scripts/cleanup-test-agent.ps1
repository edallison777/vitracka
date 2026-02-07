# Complete Cleanup of Test Agent Resources
# WARNING: This will delete all test agent resources created today

Write-Host "⚠️  WARNING: This will delete all test agent resources!" -ForegroundColor Red
Write-Host "Press Ctrl+C to cancel, or press Enter to continue..."
Read-Host

Write-Host "Cleaning up test agent resources..." -ForegroundColor Yellow

# Delete ECS service
Write-Host "1. Deleting ECS service..." -ForegroundColor Cyan
aws ecs delete-service --cluster vitracka-agents --service test-agent --force
Start-Sleep -Seconds 10

# Delete ECS cluster
Write-Host "2. Deleting ECS cluster..." -ForegroundColor Cyan
aws ecs delete-cluster --cluster vitracka-agents

# Delete security group
Write-Host "3. Deleting security group..." -ForegroundColor Cyan
aws ec2 delete-security-group --group-id sg-053bd3c78e0135d01

# Detach and delete IAM role policies
Write-Host "4. Cleaning up IAM roles..." -ForegroundColor Cyan
aws iam delete-role-policy --role-name VitrackaTestAgentExecutionRole --policy-name CloudWatchLogsPolicy
aws iam detach-role-policy --role-name VitrackaTestAgentExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
aws iam delete-role-policy --role-name VitrackaTestAgentTaskRole --policy-name BedrockInvokePolicy
aws iam delete-role --role-name VitrackaTestAgentExecutionRole
aws iam delete-role --role-name VitrackaTestAgentTaskRole

# Deregister task definition (optional - doesn't cost anything)
Write-Host "5. Deregistering task definition..." -ForegroundColor Cyan
aws ecs deregister-task-definition --task-definition test-agent:1

# Delete ECR repository (optional - costs ~$0.02/month)
Write-Host "6. Deleting ECR repository..." -ForegroundColor Cyan
Write-Host "   (Press Ctrl+C to skip if you want to keep the image)" -ForegroundColor Yellow
Start-Sleep -Seconds 5
aws ecr delete-repository --repository-name vitracka/test-agent --force

Write-Host ""
Write-Host "✓ Cleanup complete! All resources deleted." -ForegroundColor Green
Write-Host ""
Write-Host "Note: CloudWatch log groups may still exist. To delete:" -ForegroundColor Yellow
Write-Host "  aws logs delete-log-group --log-group-name /ecs/test-agent" -ForegroundColor White

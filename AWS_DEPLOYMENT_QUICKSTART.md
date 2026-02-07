# AWS Deployment Quick Start Guide
## Vitracka Weight Management System

**Current Status**: Ready to deploy to AWS
**AWS Account**: 732231126129
**Region**: eu-west-1 (Ireland)
**Terraform**: v1.14.3 ✓

---

## Pre-Deployment Steps (Complete These First)

### 1. AWS Bedrock Setup (Required for AI Agent)

You need to enable AWS Bedrock and Claude 4 Sonnet model:

1. **Open AWS Bedrock Console**: https://console.aws.amazon.com/bedrock
2. **Enable Model Access**:
   - Click "Model access" in left sidebar
   - Click "Manage model access"
   - Find and enable: **Claude 4 Sonnet** (anthropic.claude-sonnet-4-20250514-v1:0)
   - Click "Save changes"
   - Wait 2-3 minutes for access to propagate

3. **Update .env file** with AWS region (already set):
   ```
   AWS_REGION=us-east-1
   ```

### 2. Generate Production Secrets

Run the secret generation script:

```bash
python scripts/generate-secrets.py
```

This will create secure values for:
- Database password
- JWT secret
- Encryption keys
- API secrets

**Save these values securely** - you'll need them for deployment.

### 3. Build and Test Locally (Optional but Recommended)

```bash
# Build the application
npm run build

# Run tests
npm test

# Test the Coach Companion agent
cd agents/coach-companion
python test_agent.py
cd ../..
```

---

## Deployment Process

### Option A: Automated Deployment (Recommended)

Use the automated deployment script:

```bash
# Make script executable (if on Linux/Mac)
chmod +x scripts/deploy-production.sh

# Run deployment
./scripts/deploy-production.sh
```

**On Windows**, run these commands manually:

```powershell
# Navigate to terraform directory
cd terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var-file="environments/production.tfvars" -out="production.tfplan"

# Review the plan, then apply
terraform apply production.tfplan
```

### Option B: Step-by-Step Manual Deployment

#### Step 1: Bootstrap Infrastructure (One-time)

```bash
cd terraform/bootstrap
terraform init
terraform plan -out=bootstrap.tfplan
terraform apply bootstrap.tfplan
cd ..
```

**Creates**:
- S3 bucket for Terraform state
- DynamoDB table for state locking

#### Step 2: Deploy Main Infrastructure

```bash
cd terraform
terraform init -backend-config="environments/production/backend.hcl" -reconfigure
terraform plan -var-file="environments/production.tfvars" -out="production.tfplan"
terraform apply production.tfplan
```

**Creates**:
- VPC with public/private subnets across 3 availability zones
- RDS PostgreSQL database (db.r5.large, 200GB)
- ElastiCache Redis cluster
- ECS Fargate cluster
- Application Load Balancer
- ECR repository for Docker images
- S3 bucket + CloudFront CDN
- CloudWatch monitoring
- Auto-scaling configuration

**Expected Time**: 15-20 minutes

#### Step 3: Build and Push Docker Images

```bash
# Get ECR login
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 732231126129.dkr.ecr.eu-west-1.amazonaws.com

# Build main application
docker build -t vitracka-weight-management .

# Tag for ECR
docker tag vitracka-weight-management:latest 732231126129.dkr.ecr.eu-west-1.amazonaws.com/vitracka-weight-management:latest

# Push to ECR
docker push 732231126129.dkr.ecr.eu-west-1.amazonaws.com/vitracka-weight-management:latest

# Build Coach Companion agent
cd agents/coach-companion
docker build -t vitracka-coach-companion .
docker tag vitracka-coach-companion:latest 732231126129.dkr.ecr.eu-west-1.amazonaws.com/vitracka-coach-companion:latest
docker push 732231126129.dkr.ecr.eu-west-1.amazonaws.com/vitracka-coach-companion:latest
cd ../..
```

#### Step 4: Run Database Migrations

```bash
# Get RDS endpoint from Terraform
terraform output rds_endpoint

# Update .env with production database endpoint
# Then run migrations
npm run migrate
```

#### Step 5: Deploy ECS Services

Terraform should have created the ECS services automatically. Verify:

```bash
aws ecs list-services --cluster vitracka-production --region eu-west-1
aws ecs describe-services --cluster vitracka-production --services vitracka-app --region eu-west-1
```

#### Step 6: Verify Deployment

```bash
# Get ALB DNS name
terraform output alb_dns_name

# Test health endpoint
curl https://<alb-dns-name>/health

# Test API
curl https://<alb-dns-name>/api/health
```

---

## Post-Deployment Verification

### 1. Check Application Health

```bash
# Get load balancer URL
terraform output alb_dns_name

# Health check
curl https://<alb-url>/health

# Expected response:
# {"status":"healthy","timestamp":"..."}
```

### 2. Verify Database Connection

```bash
# Check ECS task logs
aws logs tail /ecs/vitracka-production/vitracka-app --follow --region eu-west-1
```

### 3. Test Safety Mechanisms

```bash
# Test safety trigger detection
curl -X POST https://<alb-url>/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"I want to hurt myself","userId":"test-user"}'

# Should return safety intervention response
```

### 4. Monitor CloudWatch

1. Open CloudWatch Console: https://console.aws.amazon.com/cloudwatch
2. Navigate to Dashboards
3. Find "Vitracka-Production" dashboard
4. Verify metrics are being collected

---

## User Acceptance Testing Setup

### 1. Create Test Users

```bash
# Use the API to create test users
curl -X POST https://<alb-url>/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser1@example.com",
    "password": "SecurePassword123!",
    "name": "Test User 1"
  }'
```

### 2. Configure Mobile App

Update mobile app configuration to point to production:

```typescript
// mobile/src/services/apiClient.ts
const API_BASE_URL = 'https://<your-alb-url>';
```

### 3. Run UAT Test Plan

Follow the test plan in `docs/user-acceptance-testing-plan.md`:

- [ ] User registration and login
- [ ] Profile setup and onboarding
- [ ] Weight entry and tracking
- [ ] AI coach interactions
- [ ] Safety mechanism triggers
- [ ] Data export functionality
- [ ] Internationalization (multiple languages)
- [ ] Offline functionality
- [ ] Performance under load

---

## Monitoring and Alerts

### CloudWatch Dashboards

- **Application Metrics**: Response times, error rates, request counts
- **Infrastructure Metrics**: CPU, memory, network usage
- **Database Metrics**: Connection count, query performance
- **Safety Metrics**: Intervention triggers, response times

### Key Metrics to Watch

1. **Error Rate**: Should be < 0.1%
2. **Response Time**: 95th percentile < 2 seconds
3. **Safety Response Time**: < 100ms
4. **Database Connections**: < 80% of max
5. **ECS Task Health**: All tasks running

### Alerts Configured

- High error rate (> 5%)
- Slow response times (> 5 seconds)
- Database connection issues
- ECS task failures
- Safety mechanism failures

---

## Cost Estimate

### Monthly Production Costs (Estimated)

- **ECS Fargate**: ~$150-200 (5 tasks, t3.large equivalent)
- **RDS PostgreSQL**: ~$300-400 (db.r5.large, Multi-AZ)
- **ElastiCache Redis**: ~$100-150
- **Application Load Balancer**: ~$25-30
- **Data Transfer**: ~$50-100
- **CloudWatch**: ~$20-30
- **S3 + CloudFront**: ~$20-50
- **AWS Bedrock (AI)**: ~$50-100 (depends on usage)

**Total Estimated**: $715-1,060/month

### Cost Optimization Tips

1. Use Reserved Instances for RDS (save 30-40%)
2. Enable auto-scaling to scale down during low usage
3. Use S3 Intelligent Tiering
4. Set up billing alerts
5. Review and optimize after first month

---

## Rollback Procedure

If something goes wrong:

```bash
# Use the rollback script
chmod +x scripts/rollback-production.sh
./scripts/rollback-production.sh

# Or manually with Terraform
cd terraform
terraform destroy -var-file="environments/production.tfvars"
```

---

## Troubleshooting

### Issue: Terraform Apply Fails

**Solution**:
```bash
# Check AWS credentials
aws sts get-caller-identity

# Re-initialize Terraform
terraform init -reconfigure

# Check for resource conflicts
terraform plan
```

### Issue: Docker Push Fails

**Solution**:
```bash
# Re-authenticate with ECR
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 732231126129.dkr.ecr.eu-west-1.amazonaws.com

# Verify ECR repository exists
aws ecr describe-repositories --region eu-west-1
```

### Issue: ECS Tasks Not Starting

**Solution**:
```bash
# Check task logs
aws ecs describe-tasks --cluster vitracka-production --tasks <task-id> --region eu-west-1

# Check CloudWatch logs
aws logs tail /ecs/vitracka-production/vitracka-app --follow --region eu-west-1
```

### Issue: Database Connection Fails

**Solution**:
- Verify RDS security group allows ECS access
- Check database credentials in environment variables
- Confirm VPC and subnet configuration
- Test connection from ECS task

---

## Next Steps After Deployment

1. **Domain Setup**: Configure custom domain with Route 53
2. **SSL Certificate**: Set up ACM certificate for HTTPS
3. **CI/CD Pipeline**: Automate future deployments
4. **Backup Testing**: Verify backup and restore procedures
5. **Load Testing**: Test with realistic user load
6. **User Onboarding**: Begin inviting beta users
7. **Support Setup**: Prepare support team and documentation

---

## Support Contacts

- **AWS Support**: Use AWS Console support center
- **Terraform Issues**: Check terraform/README.md
- **Application Issues**: Check CloudWatch logs
- **Emergency**: Use rollback script immediately

---

## Ready to Deploy?

**Pre-flight Checklist**:
- [ ] AWS Bedrock enabled with Claude 4 Sonnet
- [ ] Production secrets generated
- [ ] Local tests passing
- [ ] Terraform installed and configured
- [ ] Docker installed and running
- [ ] AWS CLI authenticated
- [ ] Backup plan reviewed
- [ ] Rollback procedure understood

**When ready, run**:
```bash
cd terraform
terraform init
terraform plan -var-file="environments/production.tfvars" -out="production.tfplan"
terraform apply production.tfplan
```

Good luck with your deployment! 🚀

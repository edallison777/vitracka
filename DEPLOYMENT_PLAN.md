# Vitracka Weight Management System - AWS Deployment Plan

## Overview
This document provides a step-by-step plan for deploying the Vitracka Weight Management System to your AWS account. The system uses Docker containers, Amazon ECR, AWS ECS with Fargate, and supporting AWS services.

## Architecture Summary
- **Containers**: Docker images stored in Amazon ECR
- **Compute**: AWS ECS with Fargate (no Kubernetes needed)
- **Database**: Amazon RDS PostgreSQL
- **Caching**: Amazon ElastiCache Redis
- **Storage**: Amazon S3 + CloudFront CDN
- **Load Balancing**: Application Load Balancer (ALB)
- **Infrastructure**: Terraform for Infrastructure as Code

## Prerequisites Checklist

### 1. Local Development Environment
- [ ] **AWS CLI** installed and configured
- [ ] **Terraform** >= 1.0 installed (see Windows setup below)
- [ ] **Docker** installed and running
- [ ] **Node.js** and npm installed
- [ ] **Git** repository cloned locally

#### Windows Terraform Setup
1. Create directory: `C:\tools\terraform\`
2. Place `terraform.exe` in that directory
3. Add `C:\tools\terraform` to your system PATH
4. Open new Command Prompt and verify: `terraform version`

### 2. AWS Account Setup
- [ ] AWS account with appropriate permissions
- [ ] AWS CLI configured with credentials (`aws configure`)
- [ ] Verify access: `aws sts get-caller-identity`
- [ ] Choose deployment region (default: eu-west-1)

### 3. Environment Variables
Create a `.env` file in project root:
```bash
DATABASE_PASSWORD=your-secure-database-password-32-chars
JWT_SECRET=your-jwt-secret-key-minimum-32-characters
ENCRYPTION_KEY=your-encryption-key-exactly-32-bytes-long
API_SECRET_KEY=your-api-secret-key-for-external-services
```

## Deployment Phases

### Phase 1: Infrastructure Bootstrap (One-time setup)

**Objective**: Set up Terraform state management infrastructure

**Steps**:
1. Navigate to bootstrap directory:
   ```bash
   cd terraform/bootstrap
   ```

2. Initialize and deploy bootstrap resources:
   ```bash
   terraform init
   terraform plan -out=bootstrap.tfplan
   terraform apply bootstrap.tfplan
   ```

**Expected Outputs**:
- S3 bucket for Terraform state
- DynamoDB table for state locking
- IAM roles for Terraform operations

**Verification**:
- Check AWS Console for created S3 bucket and DynamoDB table
- Verify Terraform state is stored remotely

---

### Phase 2: Development Environment Deployment

**Objective**: Deploy minimal development environment for testing

**Steps**:
1. Navigate to main terraform directory:
   ```bash
   cd ../
   ```

2. Initialize with development backend:
   ```bash
   terraform init -backend-config="environments/development/backend.hcl" -reconfigure
   ```

3. Plan development deployment:
   ```bash
   terraform plan -var-file="environments/development.tfvars" -out="development.tfplan"
   ```

4. Apply development infrastructure:
   ```bash
   terraform apply development.tfplan
   ```

**Expected Outputs**:
- VPC with public/private subnets
- RDS PostgreSQL instance (t3.micro)
- ElastiCache Redis cluster
- ECS cluster with Fargate
- Application Load Balancer
- ECR repository
- S3 bucket for static assets

**Verification**:
- Check AWS Console for all created resources
- Verify ECS cluster is running
- Confirm RDS instance is available

---

### Phase 3: Application Container Build and Push

**Objective**: Build Docker image and push to ECR

**Steps**:
1. Create Dockerfile (if not exists):
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. Get ECR login credentials:
   ```bash
   aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.eu-west-1.amazonaws.com
   ```

3. Build Docker image:
   ```bash
   docker build -t vitracka-weight-management .
   ```

4. Tag for ECR:
   ```bash
   docker tag vitracka-weight-management:latest <account-id>.dkr.ecr.eu-west-1.amazonaws.com/vitracka-weight-management:latest
   ```

5. Push to ECR:
   ```bash
   docker push <account-id>.dkr.ecr.eu-west-1.amazonaws.com/vitracka-weight-management:latest
   ```

**Expected Outputs**:
- Docker image successfully built
- Image pushed to ECR repository
- ECR repository contains the latest tag

**Verification**:
- Check ECR console for uploaded image
- Verify image size and tags

---

### Phase 4: Database Setup and Migrations

**Objective**: Initialize database schema and seed data

**Steps**:
1. Get RDS endpoint from Terraform outputs:
   ```bash
   terraform output rds_endpoint
   ```

2. Update database connection in application config

3. Run database migrations:
   ```bash
   npm run migrate:up
   ```

4. Seed initial data (optional):
   ```bash
   npm run seed:development
   ```

**Expected Outputs**:
- Database schema created
- Initial data populated
- Application can connect to database

**Verification**:
- Connect to RDS instance and verify tables exist
- Run application locally to test database connection

---

### Phase 5: ECS Service Deployment

**Objective**: Deploy application containers to ECS

**Steps**:
1. Create ECS task definition with environment variables

2. Create ECS service:
   ```bash
   aws ecs create-service \
     --cluster vitracka-development \
     --service-name vitracka-app \
     --task-definition vitracka-task:1 \
     --desired-count 1 \
     --launch-type FARGATE \
     --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
   ```

3. Wait for service to stabilize:
   ```bash
   aws ecs wait services-stable --cluster vitracka-development --services vitracka-app
   ```

**Expected Outputs**:
- ECS service running with desired task count
- Tasks in RUNNING state
- Application accessible via ALB

**Verification**:
- Check ECS console for running tasks
- Test application health endpoint
- Verify ALB target group health

---

### Phase 6: Testing and Validation

**Objective**: Verify all components are working correctly

**Steps**:
1. Run health checks:
   ```bash
   curl https://<alb-dns-name>/health
   ```

2. Run security audit tests:
   ```bash
   npm test -- --testPathPattern="SecurityAuditProductionReadiness"
   ```

3. Run integration tests:
   ```bash
   npm test -- --testPathPattern="integration"
   ```

4. Test safety mechanisms:
   ```bash
   # Test safety trigger detection
   curl -X POST https://<alb-dns-name>/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"I want to hurt myself"}'
   ```

**Expected Outputs**:
- All health checks pass
- Security tests pass
- Safety mechanisms trigger appropriately
- Application responds correctly

**Verification**:
- Review test results
- Check CloudWatch logs for any errors
- Verify safety interventions are logged

---

### Phase 7: Monitoring and Alerting Setup

**Objective**: Configure monitoring, logging, and alerting

**Steps**:
1. Deploy CloudWatch dashboard:
   ```bash
   aws cloudwatch put-dashboard \
     --dashboard-name "Vitracka-Development" \
     --dashboard-body file://monitoring/dashboard-config.json
   ```

2. Set up CloudWatch alarms:
   ```bash
   aws cloudwatch put-metric-alarm \
     --alarm-name "Vitracka-HighErrorRate" \
     --alarm-description "High error rate detected" \
     --metric-name ErrorRate \
     --namespace "Vitracka/Development" \
     --statistic Average \
     --period 300 \
     --threshold 5.0 \
     --comparison-operator GreaterThanThreshold
   ```

3. Configure log groups and retention

**Expected Outputs**:
- CloudWatch dashboard showing metrics
- Alarms configured and active
- Log groups collecting application logs

**Verification**:
- Check CloudWatch console for dashboard
- Verify metrics are being collected
- Test alarm notifications

---

## Production Deployment (After Development Success)

### Phase 8: Production Environment

**Objective**: Deploy production-ready infrastructure

**Steps**:
1. Deploy production infrastructure:
   ```bash
   terraform init -backend-config="environments/production/backend.hcl" -reconfigure
   terraform plan -var-file="environments/production.tfvars" -out="production.tfplan"
   terraform apply production.tfplan
   ```

2. Use automated deployment script:
   ```bash
   chmod +x scripts/deploy-production.sh
   ./scripts/deploy-production.sh
   ```

**Key Differences from Development**:
- Multi-AZ RDS deployment
- Higher instance types
- Auto-scaling enabled
- Enhanced monitoring
- Backup and disaster recovery

---

## Troubleshooting Guide

### Common Issues and Solutions

**1. Terraform State Lock**
```bash
# If state is locked, force unlock (use carefully)
terraform force-unlock <lock-id>
```

**2. ECR Authentication Issues**
```bash
# Re-authenticate with ECR
aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.eu-west-1.amazonaws.com
```

**3. ECS Service Won't Start**
- Check CloudWatch logs for container errors
- Verify environment variables are set correctly
- Ensure security groups allow necessary traffic

**4. Database Connection Issues**
- Verify RDS security group allows ECS access
- Check database credentials in Secrets Manager
- Confirm VPC and subnet configuration

**5. Load Balancer Health Checks Failing**
- Verify application is listening on correct port
- Check health check endpoint returns 200 status
- Review ALB target group configuration

### Useful Commands

**Check ECS Service Status**:
```bash
aws ecs describe-services --cluster <cluster-name> --services <service-name>
```

**View Container Logs**:
```bash
aws logs tail /ecs/<cluster-name>/<service-name> --follow
```

**Check RDS Status**:
```bash
aws rds describe-db-instances --db-instance-identifier <db-name>
```

**Test Database Connection**:
```bash
psql -h <rds-endpoint> -U <username> -d <database-name>
```

---

## Cost Optimization Tips

1. **Use Spot Instances** for development (not production)
2. **Right-size Resources** based on actual usage
3. **Enable Auto Scaling** to scale down during low usage
4. **Use S3 Intelligent Tiering** for cost-effective storage
5. **Set up Billing Alerts** to monitor costs
6. **Clean up unused resources** regularly

---

## Security Checklist

- [ ] All secrets stored in AWS Secrets Manager
- [ ] Security groups follow least privilege principle
- [ ] RDS encryption at rest enabled
- [ ] S3 bucket encryption enabled
- [ ] ALB uses HTTPS with valid SSL certificate
- [ ] VPC flow logs enabled
- [ ] CloudTrail logging enabled
- [ ] IAM roles use minimal required permissions

---

## Next Steps After Successful Deployment

1. **Domain Setup**: Configure Route 53 and SSL certificates
2. **CI/CD Pipeline**: Set up automated deployments
3. **Backup Strategy**: Implement and test backup procedures
4. **Disaster Recovery**: Test failover procedures
5. **Performance Tuning**: Optimize based on real usage
6. **User Acceptance Testing**: Run UAT with real users
7. **Go-Live Planning**: Prepare for production launch

---

## Support and Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **Terraform Documentation**: https://www.terraform.io/docs/
- **ECS Documentation**: https://docs.aws.amazon.com/ecs/
- **Project Repository**: [Your Git Repository URL]
- **Deployment Scripts**: `scripts/deploy-production.sh` and `scripts/rollback-production.sh`

---

## Session Continuation Notes

When continuing in a new session, reference this document and let me know:

1. **Current Phase**: Which phase you're working on
2. **Issues Encountered**: Any errors or problems you've faced
3. **Environment**: Development, staging, or production
4. **Specific Questions**: What you need help with next

This deployment plan provides a complete roadmap for getting Vitracka deployed to AWS using the infrastructure and scripts we've built together.
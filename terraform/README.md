# Vitracka Infrastructure as Code

This directory contains Terraform configurations for deploying the Vitracka weight management system infrastructure on AWS.

## Architecture Overview

The infrastructure is designed with the following components:

- **VPC with Multi-AZ subnets** (public, private, database)
- **Application Load Balancer** for traffic distribution
- **ECS Fargate** for containerized application hosting
- **RDS PostgreSQL** for primary data storage
- **ElastiCache Redis** for caching and session management
- **S3 + CloudFront** for static asset storage and CDN
- **CloudWatch** for monitoring and alerting
- **Auto Scaling** for high availability and cost optimization

## Directory Structure

```
terraform/
├── main.tf                    # Main Terraform configuration
├── variables.tf               # Input variables
├── outputs.tf                 # Output values
├── modules/                   # Reusable Terraform modules
│   ├── networking/           # VPC, subnets, routing
│   ├── security/             # Security groups, IAM roles
│   ├── database/             # RDS and ElastiCache
│   ├── storage/              # S3 and CloudFront
│   ├── compute/              # ECS, ALB, Auto Scaling
│   └── monitoring/           # CloudWatch dashboards and alarms
├── environments/             # Environment-specific configurations
│   ├── development/
│   ├── staging/
│   └── production/
├── bootstrap/                # Bootstrap resources for state management
└── scripts/                  # Deployment scripts
```

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.0 installed
3. **Appropriate AWS permissions** for creating infrastructure resources

## Initial Setup (One-time)

Before deploying any environments, you need to create the S3 buckets and DynamoDB tables for Terraform state management:

### On Linux/macOS:
```bash
cd terraform
./scripts/bootstrap.sh
```

### On Windows:
```powershell
cd terraform/bootstrap
terraform init
terraform plan -out=bootstrap.tfplan
terraform apply bootstrap.tfplan
```

## Environment Deployment

### Using the deployment script (Linux/macOS):

```bash
# Plan changes
./scripts/deploy.sh development plan

# Apply changes
./scripts/deploy.sh development apply

# Destroy infrastructure
./scripts/deploy.sh development destroy
```

### Manual deployment (Windows/Cross-platform):

```powershell
# Navigate to terraform directory
cd terraform

# Initialize with backend configuration
terraform init -backend-config="environments/development/backend.hcl" -reconfigure

# Plan the deployment
terraform plan -var-file="environments/development/terraform.tfvars" -out="development.tfplan"

# Apply the changes
terraform apply development.tfplan

# Or apply directly without plan file
terraform apply -var-file="environments/development/terraform.tfvars"
```

## Environment Configurations

### Development
- **Purpose**: Development and testing
- **Resources**: Minimal configuration for cost optimization
- **Database**: Single-AZ RDS with basic backup
- **Scaling**: 1-3 ECS tasks

### Staging
- **Purpose**: Pre-production testing
- **Resources**: Production-like but smaller scale
- **Database**: Single-AZ RDS with extended backup
- **Scaling**: 1-5 ECS tasks

### Production
- **Purpose**: Live production environment
- **Resources**: High availability and performance
- **Database**: Multi-AZ RDS with comprehensive backup
- **Scaling**: 2-10 ECS tasks with auto-scaling

## Security Features

- **VPC isolation** with private subnets for application and database tiers
- **Security groups** with least-privilege access
- **Encryption at rest** for RDS and S3
- **Encryption in transit** for ElastiCache and ALB
- **IAM roles** with minimal required permissions
- **Secrets Manager** for database credentials

## Monitoring and Alerting

The infrastructure includes comprehensive monitoring:

- **CloudWatch Dashboard** with key metrics
- **Automated alarms** for CPU, memory, response time, and error rates
- **SNS notifications** for production alerts
- **Centralized logging** with CloudWatch Logs

## Cost Optimization

- **Auto Scaling** based on CPU and memory utilization
- **S3 Intelligent Tiering** for automatic cost optimization
- **Environment-specific sizing** (smaller resources for dev/staging)
- **Spot instances** consideration for non-production workloads

## Disaster Recovery

- **Multi-AZ deployment** for production RDS
- **Automated backups** with configurable retention
- **Cross-region replication** capability for S3
- **Infrastructure as Code** for rapid environment recreation

## Customization

To customize the infrastructure for your needs:

1. **Modify variables** in `environments/{env}/terraform.tfvars`
2. **Update module configurations** in the respective module directories
3. **Add new resources** following the existing module structure
4. **Test changes** in development environment first

## Troubleshooting

### Common Issues

1. **State lock errors**: Ensure DynamoDB table exists and is accessible
2. **Permission errors**: Verify AWS credentials and IAM permissions
3. **Resource conflicts**: Check for existing resources with same names
4. **Version conflicts**: Ensure Terraform and provider versions are compatible

### Getting Help

- Check Terraform documentation: https://www.terraform.io/docs
- Review AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws
- Validate configurations: `terraform validate`
- Format code: `terraform fmt -recursive`

## Maintenance

- **Regular updates**: Keep Terraform and providers updated
- **Security patches**: Monitor and apply security updates
- **Cost review**: Regular review of AWS costs and optimization opportunities
- **Backup verification**: Test backup and restore procedures

## Next Steps

After infrastructure deployment:

1. **Configure DNS** (Route 53 or external DNS provider)
2. **Set up SSL certificates** (ACM or external CA)
3. **Deploy application containers** to ECS
4. **Configure monitoring dashboards** and alerts
5. **Set up CI/CD pipelines** for automated deployments
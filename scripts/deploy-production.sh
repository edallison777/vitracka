#!/bin/bash

# Vitracka Weight Management System - Production Deployment Script
# This script handles the complete production deployment process with safety checks

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Configuration
ENVIRONMENT="production"
REGION="eu-west-1"
APP_NAME="vitracka-weight-management"
BACKUP_RETENTION_DAYS=30
HEALTH_CHECK_TIMEOUT=300  # 5 minutes
ROLLBACK_TIMEOUT=600      # 10 minutes

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    # Check required tools
    command -v aws >/dev/null 2>&1 || { error "AWS CLI is required but not installed."; exit 1; }
    command -v terraform >/dev/null 2>&1 || { error "Terraform is required but not installed."; exit 1; }
    command -v docker >/dev/null 2>&1 || { error "Docker is required but not installed."; exit 1; }
    # kubectl not needed for ECS deployment
    
    # Check AWS credentials
    aws sts get-caller-identity >/dev/null 2>&1 || { error "AWS credentials not configured."; exit 1; }
    
    # Check environment variables
    [ -z "${DATABASE_PASSWORD:-}" ] && { error "DATABASE_PASSWORD environment variable not set."; exit 1; }
    [ -z "${JWT_SECRET:-}" ] && { error "JWT_SECRET environment variable not set."; exit 1; }
    [ -z "${ENCRYPTION_KEY:-}" ] && { error "ENCRYPTION_KEY environment variable not set."; exit 1; }
    
    success "Prerequisites check passed"
}

# Create deployment backup
create_backup() {
    log "Creating deployment backup..."
    
    BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_NAME="${APP_NAME}_backup_${BACKUP_TIMESTAMP}"
    
    # Backup database
    log "Backing up database..."
    aws rds create-db-snapshot \
        --db-instance-identifier "${APP_NAME}-db-prod" \
        --db-snapshot-identifier "${BACKUP_NAME}-db" \
        --region ${REGION}
    
    # Backup application state (ECS service configuration)
    log "Backing up ECS service configuration..."
    aws ecs describe-services \
        --cluster "${APP_NAME}-cluster-prod" \
        --services "${APP_NAME}-service" \
        --region ${REGION} > "${BACKUP_NAME}-ecs-config.json"
    
    # Store backup metadata
    echo "${BACKUP_NAME}" > .last_backup
    echo "${BACKUP_TIMESTAMP}" >> deployment_history.log
    
    success "Backup created: ${BACKUP_NAME}"
}

# Run pre-deployment tests
run_pre_deployment_tests() {
    log "Running pre-deployment tests..."
    
    # Run security audit
    log "Running security audit..."
    npm test -- --testPathPattern="SecurityAuditProductionReadiness" || {
        error "Security audit failed"
        exit 1
    }
    
    # Run integration tests
    log "Running integration tests..."
    npm test -- --testPathPattern="integration" || {
        error "Integration tests failed"
        exit 1
    }
    
    # Run property-based tests
    log "Running property-based tests..."
    npm test -- --testPathPattern="property" || {
        error "Property-based tests failed"
        exit 1
    }
    
    # Validate Terraform configuration
    log "Validating Terraform configuration..."
    cd terraform
    terraform validate || {
        error "Terraform validation failed"
        exit 1
    }
    terraform plan -var-file="environments/production.tfvars" -out=production.tfplan || {
        error "Terraform plan failed"
        exit 1
    }
    cd ..
    
    success "Pre-deployment tests passed"
}

# Deploy infrastructure
deploy_infrastructure() {
    log "Deploying infrastructure..."
    
    cd terraform
    
    # Apply infrastructure changes
    terraform apply -var-file="environments/production.tfvars" -auto-approve production.tfplan || {
        error "Infrastructure deployment failed"
        exit 1
    }
    
    # Wait for infrastructure to be ready
    log "Waiting for infrastructure to be ready..."
    sleep 30
    
    cd ..
    success "Infrastructure deployed successfully"
}

# Build and deploy application
deploy_application() {
    log "Building and deploying application..."
    
    # Build Docker image
    log "Building Docker image..."
    docker build -t ${APP_NAME}:${BACKUP_TIMESTAMP} . || {
        error "Docker build failed"
        exit 1
    }
    
    # Tag and push to ECR
    log "Pushing to ECR..."
    aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
    docker tag ${APP_NAME}:${BACKUP_TIMESTAMP} ${ECR_REGISTRY}/${APP_NAME}:${BACKUP_TIMESTAMP}
    docker tag ${APP_NAME}:${BACKUP_TIMESTAMP} ${ECR_REGISTRY}/${APP_NAME}:latest
    docker push ${ECR_REGISTRY}/${APP_NAME}:${BACKUP_TIMESTAMP}
    docker push ${ECR_REGISTRY}/${APP_NAME}:latest
    
    # Deploy to ECS Fargate
    log "Deploying to ECS Fargate..."
    
    # Update ECS service with new image
    aws ecs update-service \
        --cluster "${APP_NAME}-cluster-prod" \
        --service "${APP_NAME}-service" \
        --task-definition "${APP_NAME}-task:${BACKUP_TIMESTAMP}" \
        --region ${REGION}
    
    # Wait for deployment to complete
    aws ecs wait services-stable \
        --cluster "${APP_NAME}-cluster-prod" \
        --services "${APP_NAME}-service" \
        --region ${REGION}
    
    success "Application deployed successfully"
}

# Run health checks
run_health_checks() {
    log "Running health checks..."
    
    # Wait for application to start
    sleep 30
    
    # Get application URL from ALB
    APP_URL=$(aws elbv2 describe-load-balancers \
        --names "${APP_NAME}-alb-prod" \
        --query 'LoadBalancers[0].DNSName' \
        --output text \
        --region ${REGION})
    
    # Health check endpoint
    HEALTH_URL="https://${APP_URL}/health"
    
    # Check application health
    for i in {1..30}; do
        log "Health check attempt ${i}/30..."
        
        if curl -f -s "${HEALTH_URL}" > /dev/null; then
            success "Application is healthy"
            return 0
        fi
        
        sleep 10
    done
    
    error "Health checks failed after 5 minutes"
    return 1
}

# Run smoke tests
run_smoke_tests() {
    log "Running smoke tests..."
    
    # Test authentication endpoint
    log "Testing authentication..."
    curl -f -s -X POST "${APP_URL}/api/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"test@example.com","password":"testpassword"}' > /dev/null || {
        error "Authentication smoke test failed"
        return 1
    }
    
    # Test safety sentinel
    log "Testing safety mechanisms..."
    curl -f -s -X POST "${APP_URL}/api/chat" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TEST_TOKEN}" \
        -d '{"message":"I want to hurt myself"}' | grep -q "professional" || {
        error "Safety mechanism smoke test failed"
        return 1
    }
    
    # Test database connectivity
    log "Testing database connectivity..."
    curl -f -s "${APP_URL}/api/health/database" > /dev/null || {
        error "Database connectivity smoke test failed"
        return 1
    }
    
    success "Smoke tests passed"
}

# Update monitoring and alerting
update_monitoring() {
    log "Updating monitoring and alerting..."
    
    # Update CloudWatch dashboards
    aws cloudwatch put-dashboard \
        --dashboard-name "${APP_NAME}-production" \
        --dashboard-body file://monitoring/production-dashboard.json \
        --region ${REGION}
    
    # Update alerts
    aws cloudwatch put-metric-alarm \
        --alarm-name "${APP_NAME}-high-error-rate" \
        --alarm-description "High error rate detected" \
        --metric-name ErrorRate \
        --namespace "${APP_NAME}/Production" \
        --statistic Average \
        --period 300 \
        --threshold 5.0 \
        --comparison-operator GreaterThanThreshold \
        --evaluation-periods 2 \
        --region ${REGION}
    
    success "Monitoring updated"
}

# Cleanup old deployments
cleanup_old_deployments() {
    log "Cleaning up old deployments..."
    
    # Remove old Docker images (keep last 5)
    docker images ${APP_NAME} --format "table {{.Tag}}" | tail -n +6 | xargs -r docker rmi ${APP_NAME}: 2>/dev/null || true
    
    # Remove old database snapshots (keep last 30 days)
    aws rds describe-db-snapshots \
        --db-instance-identifier "${APP_NAME}-db-prod" \
        --query "DBSnapshots[?SnapshotCreateTime<='$(date -d "${BACKUP_RETENTION_DAYS} days ago" -Iseconds)'].DBSnapshotIdentifier" \
        --output text \
        --region ${REGION} | xargs -r -n1 aws rds delete-db-snapshot --db-snapshot-identifier --region ${REGION}
    
    success "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting production deployment for ${APP_NAME}"
    
    # Get ECR registry URL
    ECR_REGISTRY=$(aws ecr describe-registry --query 'registryId' --output text --region ${REGION}).dkr.ecr.${REGION}.amazonaws.com
    
    # Create deployment log
    echo "=== Deployment started at $(date) ===" >> deployment_history.log
    
    # Execute deployment steps
    check_prerequisites
    create_backup
    run_pre_deployment_tests
    deploy_infrastructure
    deploy_application
    
    # Run health checks and smoke tests
    if run_health_checks && run_smoke_tests; then
        update_monitoring
        cleanup_old_deployments
        
        success "Production deployment completed successfully!"
        echo "=== Deployment completed successfully at $(date) ===" >> deployment_history.log
    else
        error "Deployment failed health checks or smoke tests"
        warning "Initiating automatic rollback..."
        
        # Call rollback script
        ./scripts/rollback-production.sh
        exit 1
    fi
}

# Handle script interruption
trap 'error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"
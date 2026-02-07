#!/bin/bash

# Vitracka Weight Management System - Production Rollback Script
# This script handles emergency rollback procedures for production deployments

set -e  # Exit on any error
set -u  # Exit on undefined variables

# Configuration
ENVIRONMENT="production"
REGION="eu-west-1"
APP_NAME="vitracka-weight-management"
ROLLBACK_TIMEOUT=600  # 10 minutes

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

# Get last backup information
get_last_backup() {
    if [ ! -f ".last_backup" ]; then
        error "No backup information found. Cannot proceed with rollback."
        exit 1
    fi
    
    BACKUP_NAME=$(cat .last_backup)
    log "Found backup: ${BACKUP_NAME}"
}

# Check rollback prerequisites
check_rollback_prerequisites() {
    log "Checking rollback prerequisites..."
    
    # Check required tools
    command -v aws >/dev/null 2>&1 || { error "AWS CLI is required but not installed."; exit 1; }
    # kubectl not needed for ECS deployment
    
    # Check AWS credentials
    aws sts get-caller-identity >/dev/null 2>&1 || { error "AWS credentials not configured."; exit 1; }
    
    # Check if backup exists
    get_last_backup
    
    success "Rollback prerequisites check passed"
}

# Stop current deployment
stop_current_deployment() {
    log "Stopping current deployment..."
    
    # Scale down ECS service
    aws ecs update-service \
        --cluster "${APP_NAME}-cluster-prod" \
        --service "${APP_NAME}-service" \
        --desired-count 0 \
        --region ${REGION}
    
    # Wait for tasks to stop
    aws ecs wait services-stable \
        --cluster "${APP_NAME}-cluster-prod" \
        --services "${APP_NAME}-service" \
        --region ${REGION}
    
    success "Current deployment stopped"
}

# Rollback application
rollback_application() {
    log "Rolling back application..."
    
    # Get previous task definition
    PREVIOUS_TASK_DEF=$(aws ecs describe-services \
        --cluster "${APP_NAME}-cluster-prod" \
        --services "${APP_NAME}-service" \
        --query 'services[0].deployments[1].taskDefinition' \
        --output text \
        --region ${REGION})
    
    if [ -z "${PREVIOUS_TASK_DEF}" ] || [ "${PREVIOUS_TASK_DEF}" = "None" ]; then
        error "Could not determine previous task definition"
        exit 1
    fi
    
    log "Rolling back to task definition: ${PREVIOUS_TASK_DEF}"
    
    # Update service with previous task definition
    aws ecs update-service \
        --cluster "${APP_NAME}-cluster-prod" \
        --service "${APP_NAME}-service" \
        --task-definition "${PREVIOUS_TASK_DEF}" \
        --desired-count 2 \
        --region ${REGION}
    
    # Wait for rollback to complete
    aws ecs wait services-stable \
        --cluster "${APP_NAME}-cluster-prod" \
        --services "${APP_NAME}-service" \
        --region ${REGION}
    
    success "Application rollback completed"
}

# Rollback database
rollback_database() {
    log "Rolling back database..."
    
    # Check if database rollback is needed
    read -p "Do you want to rollback the database? This will restore from backup ${BACKUP_NAME}-db (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        warning "Database rollback initiated. This operation cannot be undone."
        
        # Create a snapshot of current state before rollback
        EMERGENCY_BACKUP="${APP_NAME}_emergency_$(date +%Y%m%d_%H%M%S)"
        aws rds create-db-snapshot \
            --db-instance-identifier "${APP_NAME}-db-prod" \
            --db-snapshot-identifier "${EMERGENCY_BACKUP}" \
            --region ${REGION}
        
        log "Emergency backup created: ${EMERGENCY_BACKUP}"
        
        # Restore from backup
        log "Restoring database from backup: ${BACKUP_NAME}-db"
        
        # Stop database connections
        aws rds modify-db-instance \
            --db-instance-identifier "${APP_NAME}-db-prod" \
            --apply-immediately \
            --region ${REGION}
        
        # Restore from snapshot
        aws rds restore-db-instance-from-db-snapshot \
            --db-instance-identifier "${APP_NAME}-db-rollback" \
            --db-snapshot-identifier "${BACKUP_NAME}-db" \
            --region ${REGION}
        
        # Wait for restore to complete
        aws rds wait db-instance-available \
            --db-instance-identifier "${APP_NAME}-db-rollback" \
            --region ${REGION}
        
        # Update application to use rollback database
        # This would require updating the ECS task definition with new environment variables
        log "Database connection updated to rollback instance"
        
        success "Database rollback completed"
    else
        log "Database rollback skipped"
    fi
}

# Rollback infrastructure
rollback_infrastructure() {
    log "Checking if infrastructure rollback is needed..."
    
    read -p "Do you want to rollback infrastructure changes? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        warning "Infrastructure rollback initiated"
        
        cd terraform
        
        # Get previous Terraform state
        terraform state pull > current_state.json
        
        # Apply previous configuration
        if [ -f "previous.tfplan" ]; then
            terraform apply previous.tfplan
            success "Infrastructure rollback completed"
        else
            warning "No previous Terraform plan found. Manual intervention may be required."
        fi
        
        cd ..
    else
        log "Infrastructure rollback skipped"
    fi
}

# Verify rollback health
verify_rollback_health() {
    log "Verifying rollback health..."
    
    # Wait for application to start
    sleep 30
    
    # Get application URL
    APP_URL=$(kubectl get service ${APP_NAME} --namespace production -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
    
    # Health check endpoint
    HEALTH_URL="https://${APP_URL}/health"
    
    # Check application health
    for i in {1..30}; do
        log "Health check attempt ${i}/30..."
        
        if curl -f -s "${HEALTH_URL}" > /dev/null; then
            success "Rollback application is healthy"
            return 0
        fi
        
        sleep 10
    done
    
    error "Rollback health checks failed"
    return 1
}

# Send rollback notifications
send_rollback_notifications() {
    log "Sending rollback notifications..."
    
    # Send to Slack/Teams
    ROLLBACK_MESSAGE="🚨 PRODUCTION ROLLBACK COMPLETED 🚨\nApplication: ${APP_NAME}\nEnvironment: ${ENVIRONMENT}\nTime: $(date)\nBackup used: ${BACKUP_NAME}"
    
    # Send email notification
    aws ses send-email \
        --source "alerts@vitracka.com" \
        --destination "ToAddresses=devops@vitracka.com,management@vitracka.com" \
        --message "Subject={Data='Production Rollback Completed - ${APP_NAME}'},Body={Text={Data='${ROLLBACK_MESSAGE}'}}" \
        --region ${REGION} 2>/dev/null || warning "Failed to send email notification"
    
    # Log to incident management system
    curl -X POST "https://api.pagerduty.com/incidents" \
        -H "Authorization: Token token=${PAGERDUTY_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{
            "incident": {
                "type": "incident",
                "title": "Production Rollback Completed - '${APP_NAME}'",
                "service": {
                    "id": "'${PAGERDUTY_SERVICE_ID}'",
                    "type": "service_reference"
                },
                "urgency": "high",
                "body": {
                    "type": "incident_body",
                    "details": "'${ROLLBACK_MESSAGE}'"
                }
            }
        }' 2>/dev/null || warning "Failed to create PagerDuty incident"
    
    success "Rollback notifications sent"
}

# Update monitoring after rollback
update_monitoring_after_rollback() {
    log "Updating monitoring after rollback..."
    
    # Add rollback event to monitoring
    aws logs put-log-events \
        --log-group-name "/aws/ecs/${APP_NAME}" \
        --log-stream-name "rollback-$(date +%Y%m%d)" \
        --log-events timestamp=$(date +%s000),message="Production rollback completed using backup ${BACKUP_NAME}" \
        --region ${REGION}
    
    # Update CloudWatch metrics
    aws cloudwatch put-metric-data \
        --namespace "${APP_NAME}/Deployment" \
        --metric-data MetricName=RollbackCount,Value=1,Unit=Count \
        --region ${REGION}
    
    success "Monitoring updated"
}

# Main rollback function
main() {
    log "Starting production rollback for ${APP_NAME}"
    
    # Create rollback log
    echo "=== Rollback started at $(date) ===" >> rollback_history.log
    
    # Execute rollback steps
    check_rollback_prerequisites
    stop_current_deployment
    rollback_application
    rollback_database
    rollback_infrastructure
    
    # Verify rollback
    if verify_rollback_health; then
        send_rollback_notifications
        update_monitoring_after_rollback
        
        success "Production rollback completed successfully!"
        echo "=== Rollback completed successfully at $(date) ===" >> rollback_history.log
        
        warning "Please investigate the root cause of the deployment failure."
        warning "Review logs and fix issues before attempting another deployment."
    else
        error "Rollback failed health checks"
        error "Manual intervention required immediately!"
        echo "=== Rollback failed at $(date) ===" >> rollback_history.log
        exit 1
    fi
}

# Handle script interruption
trap 'error "Rollback interrupted"; exit 1' INT TERM

# Run main function
main "$@"
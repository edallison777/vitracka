#!/bin/bash

# Vitracka Blue-Green Deployment Script
# This script implements blue-green deployment strategy for zero-downtime updates

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")"
AWS_REGION="${AWS_REGION:-eu-west-2}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Usage function
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Blue-Green Deployment Script for Vitracka Infrastructure

OPTIONS:
    -e, --environment    Environment (development|staging|production)
    -a, --action        Action (deploy|rollback|cleanup|status)
    -c, --color         Force deployment color (blue|green)
    -t, --timeout       Health check timeout in seconds (default: 600)
    -h, --help          Show this help message

EXAMPLES:
    $0 -e staging -a deploy
    $0 -e production -a rollback
    $0 -e staging -a cleanup
    $0 -e production -a status

EOF
}

# Parse command line arguments
ENVIRONMENT=""
ACTION=""
FORCE_COLOR=""
TIMEOUT=600

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -a|--action)
            ACTION="$2"
            shift 2
            ;;
        -c|--color)
            FORCE_COLOR="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "$ENVIRONMENT" ]]; then
    log_error "Environment is required"
    usage
    exit 1
fi

if [[ -z "$ACTION" ]]; then
    log_error "Action is required"
    usage
    exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    log_error "Environment must be one of: development, staging, production"
    exit 1
fi

if [[ ! "$ACTION" =~ ^(deploy|rollback|cleanup|status)$ ]]; then
    log_error "Action must be one of: deploy, rollback, cleanup, status"
    exit 1
fi

# Set up Terraform backend configuration
setup_terraform_backend() {
    local env=$1
    
    log_info "Setting up Terraform backend for $env environment"
    
    cd "$TERRAFORM_DIR"
    
    terraform init \
        -backend-config="bucket=vitracka-terraform-state-$env" \
        -backend-config="key=terraform/$env.tfstate" \
        -backend-config="region=$AWS_REGION" \
        -backend-config="dynamodb_table=vitracka-terraform-locks-$env" \
        -reconfigure
}

# Get current active deployment color
get_current_color() {
    local env=$1
    
    # Try to get from AWS Parameter Store
    local current_color
    current_color=$(aws ssm get-parameter \
        --name "/vitracka/$env/active-color" \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "blue")
    
    echo "$current_color"
}

# Get the opposite color
get_opposite_color() {
    local color=$1
    
    if [[ "$color" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Health check function
health_check() {
    local endpoint=$1
    local timeout=$2
    local start_time=$(date +%s)
    
    log_info "Performing health check on $endpoint (timeout: ${timeout}s)"
    
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [[ $elapsed -gt $timeout ]]; then
            log_error "Health check timeout after ${timeout}s"
            return 1
        fi
        
        if curl -f -s "$endpoint/health" > /dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        
        log_info "Health check failed, retrying in 10s... (elapsed: ${elapsed}s)"
        sleep 10
    done
}

# Deploy new environment
deploy_new_environment() {
    local env=$1
    local new_color=$2
    
    log_info "Deploying new $new_color environment for $env"
    
    cd "$TERRAFORM_DIR"
    
    # Create Terraform plan
    terraform plan \
        -var-file="environments/$env.tfvars" \
        -var="deployment_color=$new_color" \
        -var="blue_green_deployment=true" \
        -out="$env-$new_color.tfplan"
    
    # Apply the plan
    terraform apply "$env-$new_color.tfplan"
    
    # Get the new environment endpoint
    local new_endpoint
    new_endpoint=$(terraform output -raw "alb_dns_name_$new_color" 2>/dev/null || terraform output -raw alb_dns_name)
    
    if [[ -z "$new_endpoint" ]]; then
        log_error "Could not get endpoint for new environment"
        return 1
    fi
    
    log_info "New environment endpoint: http://$new_endpoint"
    
    # Perform health check
    if ! health_check "http://$new_endpoint" "$TIMEOUT"; then
        log_error "Health check failed for new environment"
        return 1
    fi
    
    log_success "New $new_color environment deployed and healthy"
}

# Switch traffic to new environment
switch_traffic() {
    local env=$1
    local new_color=$2
    
    log_info "Switching traffic to $new_color environment"
    
    cd "$TERRAFORM_DIR"
    
    # Update the active color parameter
    aws ssm put-parameter \
        --name "/vitracka/$env/active-color" \
        --value "$new_color" \
        --overwrite
    
    # Get target group ARN and listener ARN
    local new_target_group_arn
    local listener_arn
    
    new_target_group_arn=$(terraform output -raw "target_group_arn_$new_color" 2>/dev/null)
    listener_arn=$(terraform output -raw alb_listener_arn 2>/dev/null)
    
    if [[ -n "$new_target_group_arn" && -n "$listener_arn" ]]; then
        # Update ALB listener to route traffic to new target group
        aws elbv2 modify-listener \
            --listener-arn "$listener_arn" \
            --default-actions Type=forward,TargetGroupArn="$new_target_group_arn"
        
        log_success "Traffic switched to $new_color environment"
    else
        log_warning "Could not update ALB listener (target group or listener ARN not found)"
    fi
}

# Verify deployment
verify_deployment() {
    local env=$1
    
    log_info "Verifying deployment for $env"
    
    cd "$TERRAFORM_DIR"
    
    # Get main endpoint
    local main_endpoint
    main_endpoint=$(terraform output -raw alb_dns_name)
    
    if [[ -z "$main_endpoint" ]]; then
        log_error "Could not get main endpoint"
        return 1
    fi
    
    # Run smoke tests
    log_info "Running smoke tests against http://$main_endpoint"
    
    # Basic health check
    if ! curl -f -s "http://$main_endpoint/health" > /dev/null; then
        log_error "Main endpoint health check failed"
        return 1
    fi
    
    # Additional smoke tests can be added here
    # Example: API endpoint tests, database connectivity, etc.
    
    log_success "Smoke tests passed"
}

# Rollback deployment
rollback_deployment() {
    local env=$1
    local current_color=$2
    
    log_info "Rolling back to $current_color environment"
    
    cd "$TERRAFORM_DIR"
    
    # Switch traffic back to previous environment
    local previous_target_group_arn
    local listener_arn
    
    previous_target_group_arn=$(terraform output -raw "target_group_arn_$current_color" 2>/dev/null)
    listener_arn=$(terraform output -raw alb_listener_arn 2>/dev/null)
    
    if [[ -n "$previous_target_group_arn" && -n "$listener_arn" ]]; then
        aws elbv2 modify-listener \
            --listener-arn "$listener_arn" \
            --default-actions Type=forward,TargetGroupArn="$previous_target_group_arn"
    fi
    
    # Update the active color parameter back
    aws ssm put-parameter \
        --name "/vitracka/$env/active-color" \
        --value "$current_color" \
        --overwrite
    
    log_success "Rollback completed to $current_color environment"
}

# Cleanup old environment
cleanup_old_environment() {
    local env=$1
    local old_color=$2
    
    log_info "Cleaning up old $old_color environment"
    
    cd "$TERRAFORM_DIR"
    
    # Destroy the old environment
    terraform plan \
        -var-file="environments/$env.tfvars" \
        -var="deployment_color=$old_color" \
        -var="blue_green_deployment=true" \
        -destroy \
        -out="cleanup-$old_color.tfplan"
    
    terraform apply "cleanup-$old_color.tfplan"
    
    log_success "Cleanup completed for $old_color environment"
}

# Show deployment status
show_status() {
    local env=$1
    
    log_info "Deployment status for $env environment"
    
    local current_color
    current_color=$(get_current_color "$env")
    
    echo "Current active color: $current_color"
    
    cd "$TERRAFORM_DIR"
    
    # Show Terraform outputs
    terraform output
}

# Main execution
main() {
    log_info "Starting blue-green deployment for $ENVIRONMENT environment"
    log_info "Action: $ACTION"
    
    # Setup Terraform
    setup_terraform_backend "$ENVIRONMENT"
    
    case "$ACTION" in
        deploy)
            local current_color
            current_color=$(get_current_color "$ENVIRONMENT")
            
            local new_color
            if [[ -n "$FORCE_COLOR" ]]; then
                new_color="$FORCE_COLOR"
            else
                new_color=$(get_opposite_color "$current_color")
            fi
            
            log_info "Current active color: $current_color"
            log_info "Deploying to color: $new_color"
            
            # Deploy new environment
            if deploy_new_environment "$ENVIRONMENT" "$new_color"; then
                # Switch traffic
                switch_traffic "$ENVIRONMENT" "$new_color"
                
                # Verify deployment
                if verify_deployment "$ENVIRONMENT"; then
                    log_success "Blue-green deployment completed successfully"
                    log_info "Active environment: $new_color"
                    log_info "Previous environment ($current_color) is still running for rollback"
                    log_info "Run '$0 -e $ENVIRONMENT -a cleanup' to clean up the old environment"
                else
                    log_error "Deployment verification failed, consider rollback"
                    exit 1
                fi
            else
                log_error "Deployment failed"
                exit 1
            fi
            ;;
        rollback)
            local current_color
            current_color=$(get_current_color "$ENVIRONMENT")
            local previous_color
            previous_color=$(get_opposite_color "$current_color")
            
            log_warning "Rolling back from $current_color to $previous_color"
            rollback_deployment "$ENVIRONMENT" "$previous_color"
            ;;
        cleanup)
            local current_color
            current_color=$(get_current_color "$ENVIRONMENT")
            local old_color
            old_color=$(get_opposite_color "$current_color")
            
            log_warning "This will destroy the $old_color environment. Are you sure? (y/N)"
            read -r confirmation
            if [[ "$confirmation" =~ ^[Yy]$ ]]; then
                cleanup_old_environment "$ENVIRONMENT" "$old_color"
            else
                log_info "Cleanup cancelled"
            fi
            ;;
        status)
            show_status "$ENVIRONMENT"
            ;;
    esac
    
    log_success "Operation completed successfully"
}

# Run main function
main "$@"
#!/bin/bash

# Vitracka Infrastructure Deployment Script
# Usage: ./deploy.sh <environment> [plan|apply|destroy]

set -e

ENVIRONMENT=$1
ACTION=${2:-plan}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")"

# Validate inputs
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo "Error: Environment must be one of: development, staging, production"
    exit 1
fi

if [[ ! "$ACTION" =~ ^(plan|apply|destroy)$ ]]; then
    echo "Error: Action must be one of: plan, apply, destroy"
    exit 1
fi

echo "🚀 Deploying Vitracka infrastructure for $ENVIRONMENT environment..."

# Change to terraform directory
cd "$TERRAFORM_DIR"

# Initialize Terraform with backend configuration
echo "📋 Initializing Terraform..."
terraform init \
    -backend-config="environments/$ENVIRONMENT/backend.hcl" \
    -reconfigure

# Validate Terraform configuration
echo "✅ Validating Terraform configuration..."
terraform validate

# Format Terraform files
echo "🎨 Formatting Terraform files..."
terraform fmt -recursive

# Run the specified action
case $ACTION in
    plan)
        echo "📊 Planning infrastructure changes..."
        terraform plan \
            -var-file="environments/$ENVIRONMENT/terraform.tfvars" \
            -out="$ENVIRONMENT.tfplan"
        ;;
    apply)
        echo "🔨 Applying infrastructure changes..."
        if [ -f "$ENVIRONMENT.tfplan" ]; then
            terraform apply "$ENVIRONMENT.tfplan"
            rm "$ENVIRONMENT.tfplan"
        else
            terraform apply \
                -var-file="environments/$ENVIRONMENT/terraform.tfvars" \
                -auto-approve
        fi
        ;;
    destroy)
        echo "💥 Destroying infrastructure..."
        terraform destroy \
            -var-file="environments/$ENVIRONMENT/terraform.tfvars" \
            -auto-approve
        ;;
esac

echo "✨ $ACTION completed successfully for $ENVIRONMENT environment!"
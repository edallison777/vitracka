#!/bin/bash

# Bootstrap script to create S3 buckets and DynamoDB tables for Terraform state management
# This should be run once before deploying any environments

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BOOTSTRAP_DIR="$(dirname "$SCRIPT_DIR")/bootstrap"

echo "🏗️  Bootstrapping Terraform state management resources..."

# Change to bootstrap directory
cd "$BOOTSTRAP_DIR"

# Initialize Terraform (no backend configuration needed for bootstrap)
echo "📋 Initializing Terraform..."
terraform init

# Validate configuration
echo "✅ Validating Terraform configuration..."
terraform validate

# Plan the bootstrap resources
echo "📊 Planning bootstrap resources..."
terraform plan -out=bootstrap.tfplan

# Apply the bootstrap resources
echo "🔨 Creating bootstrap resources..."
terraform apply bootstrap.tfplan

# Clean up plan file
rm bootstrap.tfplan

echo "✨ Bootstrap completed successfully!"
echo "📝 You can now deploy environments using the deploy.sh script"
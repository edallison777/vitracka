# Makefile for Vitracka Infrastructure

.PHONY: help init plan apply destroy test test-syntax test-format bootstrap clean

# Default environment
ENV ?= development

help: ## Show this help message
	@echo "Vitracka Infrastructure Management"
	@echo "================================="
	@echo ""
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

bootstrap: ## Bootstrap Terraform state management (run once)
	@echo "🏗️  Bootstrapping Terraform state management..."
	cd bootstrap && terraform init && terraform apply -auto-approve

init: ## Initialize Terraform for specified environment
	@echo "📋 Initializing Terraform for $(ENV) environment..."
	terraform init -backend-config="environments/$(ENV)/backend.hcl" -reconfigure

validate: ## Validate Terraform configuration
	@echo "✅ Validating Terraform configuration..."
	terraform validate

format: ## Format Terraform files
	@echo "🎨 Formatting Terraform files..."
	terraform fmt -recursive

plan: init validate ## Plan infrastructure changes
	@echo "📊 Planning infrastructure changes for $(ENV)..."
	terraform plan -var-file="environments/$(ENV)/terraform.tfvars" -out="$(ENV).tfplan"

apply: ## Apply infrastructure changes
	@echo "🔨 Applying infrastructure changes for $(ENV)..."
	@if [ -f "$(ENV).tfplan" ]; then \
		terraform apply "$(ENV).tfplan" && rm "$(ENV).tfplan"; \
	else \
		terraform apply -var-file="environments/$(ENV)/terraform.tfvars" -auto-approve; \
	fi

destroy: init ## Destroy infrastructure
	@echo "💥 Destroying infrastructure for $(ENV)..."
	terraform destroy -var-file="environments/$(ENV)/terraform.tfvars" -auto-approve

test: ## Run all infrastructure tests
	@echo "🧪 Running infrastructure tests..."
	cd tests && go mod tidy && go test -v -timeout 30m

test-syntax: ## Test Terraform syntax
	@echo "🔍 Testing Terraform syntax..."
	cd tests && go test -v -run TestTerraformSyntax

test-format: ## Test Terraform formatting
	@echo "📝 Testing Terraform formatting..."
	cd tests && go test -v -run TestTerraformFormat

test-modules: ## Test individual modules
	@echo "🔧 Testing Terraform modules..."
	cd tests && go test -v -run "TestNetworkingModule|TestStorageModule|TestMonitoringModule"

clean: ## Clean up temporary files
	@echo "🧹 Cleaning up temporary files..."
	rm -f *.tfplan
	rm -rf .terraform
	rm -f .terraform.lock.hcl

# Environment-specific shortcuts
dev: ENV=development
dev: plan ## Plan development environment

staging: ENV=staging  
staging: plan ## Plan staging environment

prod: ENV=production
prod: plan ## Plan production environment

dev-apply: ENV=development
dev-apply: apply ## Apply development environment

staging-apply: ENV=staging
staging-apply: apply ## Apply staging environment

prod-apply: ENV=production
prod-apply: apply ## Apply production environment
# Vitracka Weight Management System - Main Terraform Configuration
# Infrastructure as Code for AWS deployment in eu-west-2

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    # Backend configuration will be provided via backend config files
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "vitracka"
      Environment = var.environment
      Owner       = "vitracka-team"
      CostCenter  = "product-development"
      ManagedBy   = "terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local values
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    Owner       = var.owner
    CostCenter  = var.cost_center
  }
}

# Networking Module
module "networking" {
  source = "./modules/networking"
  
  name_prefix         = local.name_prefix
  vpc_cidr           = var.vpc_cidr
  availability_zones = data.aws_availability_zones.available.names
  environment        = var.environment
  
  tags = local.common_tags
}

# Security Module
module "security" {
  source = "./modules/security"
  
  name_prefix = local.name_prefix
  vpc_id      = module.networking.vpc_id
  environment = var.environment
  
  tags = local.common_tags
}

# Database Module
module "database" {
  source = "./modules/database"
  
  name_prefix                    = local.name_prefix
  vpc_id                        = module.networking.vpc_id
  private_subnet_ids            = module.networking.private_subnet_ids
  database_subnet_ids           = module.networking.database_subnet_ids
  security_group_ids            = [module.security.rds_security_group_id]
  elasticache_subnet_group_name = module.networking.elasticache_subnet_group_name
  environment                   = var.environment
  
  # Database configuration
  db_instance_class    = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
  db_name             = var.db_name
  db_username         = var.db_username
  
  tags = local.common_tags
}

# Storage Module
module "storage" {
  source = "./modules/storage"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  tags = local.common_tags
}

# Compute Module
module "compute" {
  source = "./modules/compute"
  
  name_prefix                  = local.name_prefix
  vpc_id                      = module.networking.vpc_id
  private_subnet_ids          = module.networking.private_subnet_ids
  public_subnet_ids           = module.networking.public_subnet_ids
  security_group_ids          = [module.security.alb_security_group_id, module.security.ecs_security_group_id]
  ecs_task_execution_role_arn = module.security.ecs_task_execution_role_arn
  ecs_task_role_arn          = module.security.ecs_task_role_arn
  environment                = var.environment
  
  tags = local.common_tags
}

# Monitoring Module
module "monitoring" {
  source = "./modules/monitoring"
  
  name_prefix = local.name_prefix
  environment = var.environment
  
  tags = local.common_tags
}

# International Expansion Module
module "international" {
  source = "./modules/international"
  
  name_prefix             = local.name_prefix
  aws_region             = var.aws_region
  environment            = var.environment
  enable_multi_region    = var.enable_multi_region
  backup_regions         = var.backup_regions
  data_residency_region  = var.data_residency_region
  compliance_requirements = var.compliance_requirements
  primary_region         = var.primary_region
  supported_languages    = var.supported_languages
  supported_currencies   = var.supported_currencies
  primary_endpoint       = module.compute.load_balancer_dns_name
  
  tags = local.common_tags
}
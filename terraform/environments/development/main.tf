# Development Environment Configuration
# Single region deployment for cost optimization

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "vitracka-terraform-state-dev"
    key            = "development/terraform.tfstate"
    region         = "eu-west-2"
    dynamodb_table = "vitracka-terraform-locks"
    encrypt        = true
  }
}

# Primary AWS Provider (EU West 2 - London)
provider "aws" {
  region = var.primary_region
  
  default_tags {
    tags = {
      Environment = "development"
      Project     = "vitracka"
      ManagedBy   = "terraform"
      Region      = var.primary_region
    }
  }
}

# Local variables
locals {
  name_prefix = "vitracka-dev"
  environment = "development"
  
  # Development-specific settings
  enable_multi_region = false
  backup_regions     = []
  
  # Compliance requirements for development
  compliance_requirements = ["GDPR"]
  
  # Supported localization
  supported_languages  = ["en", "es", "fr", "de", "it"]
  supported_currencies = ["GBP", "USD", "EUR", "CAD", "AUD"]
}

# Core infrastructure modules
module "networking" {
  source = "../../modules/networking"
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  # Development uses smaller subnets
  vpc_cidr = "10.0.0.0/16"
  
  tags = {
    Environment = local.environment
  }
}

module "security" {
  source = "../../modules/security"
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  vpc_id = module.networking.vpc_id
  
  tags = {
    Environment = local.environment
  }
}

module "database" {
  source = "../../modules/database"
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  security_group_ids = [module.security.database_security_group_id]
  
  # Development uses smaller instance
  instance_class = "db.t3.micro"
  allocated_storage = 20
  
  tags = {
    Environment = local.environment
  }
}

module "storage" {
  source = "../../modules/storage"
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  # Development doesn't need cross-region replication
  enable_cross_region_replication = false
  
  tags = {
    Environment = local.environment
  }
}

module "compute" {
  source = "../../modules/compute"
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  public_subnet_ids  = module.networking.public_subnet_ids
  security_group_ids = [module.security.application_security_group_id]
  
  # Development uses smaller instances
  instance_type = "t3.small"
  min_capacity  = 1
  max_capacity  = 2
  
  tags = {
    Environment = local.environment
  }
}

module "international" {
  source = "../../modules/international"
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  # Development configuration
  enable_multi_region     = local.enable_multi_region
  backup_regions         = local.backup_regions
  primary_region         = true
  data_residency_region  = var.primary_region
  compliance_requirements = local.compliance_requirements
  supported_languages    = local.supported_languages
  supported_currencies   = local.supported_currencies
  
  # Development endpoints
  primary_endpoint = module.compute.load_balancer_dns_name
  domain_name     = "dev.vitracka.com"
  
  tags = {
    Environment = local.environment
  }
}

module "monitoring" {
  source = "../../modules/monitoring"
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  # Development monitoring
  log_retention_days = 7
  
  tags = {
    Environment = local.environment
  }
}
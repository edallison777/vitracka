# Staging Environment Configuration
# Production-like setup for testing with reduced capacity

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "vitracka-terraform-state-staging"
    key            = "staging/terraform.tfstate"
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
      Environment = "staging"
      Project     = "vitracka"
      ManagedBy   = "terraform"
      Region      = var.primary_region
    }
  }
}

# Local variables
locals {
  name_prefix = "vitracka-staging"
  environment = "staging"
  
  # Staging uses limited multi-region for testing
  enable_multi_region = true
  backup_regions     = ["us-east-1"] # Only one backup region for staging
  
  # Test compliance requirements
  compliance_requirements = ["GDPR", "CCPA"]
  
  # Full localization support for testing
  supported_languages  = ["en", "es", "fr", "de", "it"]
  supported_currencies = ["GBP", "USD", "EUR", "CAD", "AUD"]
}

# Core infrastructure modules
module "networking" {
  source = "../../modules/networking"
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  vpc_cidr = "10.10.0.0/16"
  
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
  
  # Staging uses production-like but smaller instances
  instance_class    = "db.t3.small"
  allocated_storage = 50
  multi_az         = true
  backup_retention_period = 7
  
  tags = {
    Environment = local.environment
  }
}

module "storage" {
  source = "../../modules/storage"
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  # Staging tests cross-region replication
  enable_cross_region_replication = true
  replication_regions = local.backup_regions
  
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
  
  # Staging compute configuration
  instance_type = "t3.medium"
  min_capacity  = 2
  max_capacity  = 4
  desired_capacity = 2
  
  tags = {
    Environment = local.environment
  }
}

module "international" {
  source = "../../modules/international"
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  # Staging configuration
  enable_multi_region     = local.enable_multi_region
  backup_regions         = local.backup_regions
  primary_region         = true
  data_residency_region  = var.primary_region
  compliance_requirements = local.compliance_requirements
  supported_languages    = local.supported_languages
  supported_currencies   = local.supported_currencies
  
  # Staging endpoints
  primary_endpoint    = module.compute.load_balancer_dns_name
  domain_name        = "staging.vitracka.com"
  ssl_certificate_arn = var.ssl_certificate_arn
  
  tags = {
    Environment = local.environment
  }
}

module "monitoring" {
  source = "../../modules/monitoring"
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  # Staging monitoring
  log_retention_days = 30
  enable_detailed_monitoring = true
  
  tags = {
    Environment = local.environment
  }
}
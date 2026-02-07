# Production Environment Configuration
# Multi-region deployment with high availability and compliance

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "vitracka-terraform-state-prod"
    key            = "production/terraform.tfstate"
    region         = "eu-west-2"
    dynamodb_table = "vitracka-terraform-locks"
    encrypt        = true
  }
}

# Primary AWS Provider (EU West 2 - London)
provider "aws" {
  alias  = "primary"
  region = var.primary_region
  
  default_tags {
    tags = {
      Environment = "production"
      Project     = "vitracka"
      ManagedBy   = "terraform"
      Region      = var.primary_region
    }
  }
}

# Secondary AWS Provider (US East 1 - Virginia)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  
  default_tags {
    tags = {
      Environment = "production"
      Project     = "vitracka"
      ManagedBy   = "terraform"
      Region      = "us-east-1"
    }
  }
}

# Tertiary AWS Provider (AP Southeast 2 - Sydney)
provider "aws" {
  alias  = "ap_southeast_2"
  region = "ap-southeast-2"
  
  default_tags {
    tags = {
      Environment = "production"
      Project     = "vitracka"
      ManagedBy   = "terraform"
      Region      = "ap-southeast-2"
    }
  }
}

# Local variables
locals {
  name_prefix = "vitracka-prod"
  environment = "production"
  
  # Production multi-region settings
  enable_multi_region = true
  backup_regions     = ["us-east-1", "ap-southeast-2"]
  
  # Comprehensive compliance requirements
  compliance_requirements = ["GDPR", "CCPA", "HIPAA", "PIPEDA", "Privacy_Act"]
  
  # Full localization support
  supported_languages  = ["en", "es", "fr", "de", "it"]
  supported_currencies = ["GBP", "USD", "EUR", "CAD", "AUD"]
  
  # Regional configurations
  regions = {
    primary = {
      region                 = var.primary_region
      data_residency_region  = "eu-west-2"
      compliance_requirements = ["GDPR"]
      supported_countries    = ["GB", "DE", "FR", "ES", "IT"]
    }
    us_east_1 = {
      region                 = "us-east-1"
      data_residency_region  = "us-east-1"
      compliance_requirements = ["CCPA", "HIPAA"]
      supported_countries    = ["US"]
    }
    ap_southeast_2 = {
      region                 = "ap-southeast-2"
      data_residency_region  = "ap-southeast-2"
      compliance_requirements = ["Privacy_Act"]
      supported_countries    = ["AU"]
    }
  }
}

# Primary Region Infrastructure (EU West 2)
module "primary_networking" {
  source = "../../modules/networking"
  providers = {
    aws = aws.primary
  }
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  vpc_cidr = "10.0.0.0/16"
  
  tags = {
    Environment = local.environment
    Region      = "primary"
  }
}

module "primary_security" {
  source = "../../modules/security"
  providers = {
    aws = aws.primary
  }
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  vpc_id = module.primary_networking.vpc_id
  
  tags = {
    Environment = local.environment
    Region      = "primary"
  }
}

module "primary_database" {
  source = "../../modules/database"
  providers = {
    aws = aws.primary
  }
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  vpc_id             = module.primary_networking.vpc_id
  private_subnet_ids = module.primary_networking.private_subnet_ids
  security_group_ids = [module.primary_security.database_security_group_id]
  
  # Production database configuration
  instance_class    = "db.r5.large"
  allocated_storage = 100
  multi_az         = true
  backup_retention_period = 30
  
  # Cross-region read replicas
  enable_cross_region_replicas = true
  replica_regions = local.backup_regions
  
  tags = {
    Environment = local.environment
    Region      = "primary"
  }
}

module "primary_storage" {
  source = "../../modules/storage"
  providers = {
    aws = aws.primary
  }
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  # Production storage with cross-region replication
  enable_cross_region_replication = true
  replication_regions = local.backup_regions
  
  tags = {
    Environment = local.environment
    Region      = "primary"
  }
}

module "primary_compute" {
  source = "../../modules/compute"
  providers = {
    aws = aws.primary
  }
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  vpc_id             = module.primary_networking.vpc_id
  private_subnet_ids = module.primary_networking.private_subnet_ids
  public_subnet_ids  = module.primary_networking.public_subnet_ids
  security_group_ids = [module.primary_security.application_security_group_id]
  
  # Production compute configuration
  instance_type = "t3.large"
  min_capacity  = 3
  max_capacity  = 10
  desired_capacity = 3
  
  tags = {
    Environment = local.environment
    Region      = "primary"
  }
}

module "primary_international" {
  source = "../../modules/international"
  providers = {
    aws = aws.primary
  }
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  # Primary region configuration
  enable_multi_region     = local.enable_multi_region
  backup_regions         = local.backup_regions
  primary_region         = true
  data_residency_region  = local.regions.primary.data_residency_region
  compliance_requirements = local.regions.primary.compliance_requirements
  supported_languages    = local.supported_languages
  supported_currencies   = local.supported_currencies
  
  # Production endpoints
  primary_endpoint    = module.primary_compute.load_balancer_dns_name
  domain_name        = var.domain_name
  ssl_certificate_arn = var.ssl_certificate_arn
  
  # Geo-restriction for compliance
  geo_restriction_type = "whitelist"
  allowed_countries   = local.regions.primary.supported_countries
  
  tags = {
    Environment = local.environment
    Region      = "primary"
  }
}

# US East 1 Region Infrastructure
module "us_east_1_networking" {
  source = "../../modules/networking"
  providers = {
    aws = aws.us_east_1
  }
  
  name_prefix = "${local.name_prefix}-us"
  environment = local.environment
  aws_region  = "us-east-1"
  
  vpc_cidr = "10.1.0.0/16"
  
  tags = {
    Environment = local.environment
    Region      = "us-east-1"
  }
}

module "us_east_1_compute" {
  source = "../../modules/compute"
  providers = {
    aws = aws.us_east_1
  }
  
  name_prefix = "${local.name_prefix}-us"
  environment = local.environment
  aws_region  = "us-east-1"
  
  vpc_id             = module.us_east_1_networking.vpc_id
  private_subnet_ids = module.us_east_1_networking.private_subnet_ids
  public_subnet_ids  = module.us_east_1_networking.public_subnet_ids
  security_group_ids = [module.us_east_1_networking.default_security_group_id]
  
  # US region compute configuration
  instance_type = "t3.medium"
  min_capacity  = 2
  max_capacity  = 6
  desired_capacity = 2
  
  tags = {
    Environment = local.environment
    Region      = "us-east-1"
  }
}

module "us_east_1_international" {
  source = "../../modules/international"
  providers = {
    aws = aws.us_east_1
  }
  
  name_prefix = "${local.name_prefix}-us"
  environment = local.environment
  aws_region  = "us-east-1"
  
  # US region configuration
  enable_multi_region     = false
  backup_regions         = []
  primary_region         = false
  data_residency_region  = local.regions.us_east_1.data_residency_region
  compliance_requirements = local.regions.us_east_1.compliance_requirements
  supported_languages    = local.supported_languages
  supported_currencies   = local.supported_currencies
  
  # US endpoints
  primary_endpoint = module.us_east_1_compute.load_balancer_dns_name
  domain_name     = "us.${var.domain_name}"
  
  # US-specific geo-restriction
  geo_restriction_type = "whitelist"
  allowed_countries   = local.regions.us_east_1.supported_countries
  
  tags = {
    Environment = local.environment
    Region      = "us-east-1"
  }
}

# AP Southeast 2 Region Infrastructure
module "ap_southeast_2_networking" {
  source = "../../modules/networking"
  providers = {
    aws = aws.ap_southeast_2
  }
  
  name_prefix = "${local.name_prefix}-au"
  environment = local.environment
  aws_region  = "ap-southeast-2"
  
  vpc_cidr = "10.2.0.0/16"
  
  tags = {
    Environment = local.environment
    Region      = "ap-southeast-2"
  }
}

module "ap_southeast_2_compute" {
  source = "../../modules/compute"
  providers = {
    aws = aws.ap_southeast_2
  }
  
  name_prefix = "${local.name_prefix}-au"
  environment = local.environment
  aws_region  = "ap-southeast-2"
  
  vpc_id             = module.ap_southeast_2_networking.vpc_id
  private_subnet_ids = module.ap_southeast_2_networking.private_subnet_ids
  public_subnet_ids  = module.ap_southeast_2_networking.public_subnet_ids
  security_group_ids = [module.ap_southeast_2_networking.default_security_group_id]
  
  # AU region compute configuration
  instance_type = "t3.medium"
  min_capacity  = 2
  max_capacity  = 6
  desired_capacity = 2
  
  tags = {
    Environment = local.environment
    Region      = "ap-southeast-2"
  }
}

module "ap_southeast_2_international" {
  source = "../../modules/international"
  providers = {
    aws = aws.ap_southeast_2
  }
  
  name_prefix = "${local.name_prefix}-au"
  environment = local.environment
  aws_region  = "ap-southeast-2"
  
  # AU region configuration
  enable_multi_region     = false
  backup_regions         = []
  primary_region         = false
  data_residency_region  = local.regions.ap_southeast_2.data_residency_region
  compliance_requirements = local.regions.ap_southeast_2.compliance_requirements
  supported_languages    = local.supported_languages
  supported_currencies   = local.supported_currencies
  
  # AU endpoints
  primary_endpoint = module.ap_southeast_2_compute.load_balancer_dns_name
  domain_name     = "au.${var.domain_name}"
  
  # AU-specific geo-restriction
  geo_restriction_type = "whitelist"
  allowed_countries   = local.regions.ap_southeast_2.supported_countries
  
  tags = {
    Environment = local.environment
    Region      = "ap-southeast-2"
  }
}

# Global monitoring and alerting
module "global_monitoring" {
  source = "../../modules/monitoring"
  providers = {
    aws = aws.primary
  }
  
  name_prefix = local.name_prefix
  environment = local.environment
  aws_region  = var.primary_region
  
  # Production monitoring configuration
  log_retention_days = 365
  enable_detailed_monitoring = true
  
  # Multi-region monitoring
  monitored_regions = [var.primary_region, "us-east-1", "ap-southeast-2"]
  
  tags = {
    Environment = local.environment
    Scope      = "global"
  }
}
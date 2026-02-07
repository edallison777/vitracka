# Production Environment Variables

variable "primary_region" {
  description = "Primary AWS region for production deployment"
  type        = string
  default     = "eu-west-2"
}

variable "domain_name" {
  description = "Domain name for production environment"
  type        = string
  default     = "vitracka.com"
}

variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate for production CloudFront"
  type        = string
  validation {
    condition     = can(regex("^arn:aws:acm:", var.ssl_certificate_arn))
    error_message = "SSL certificate ARN must be a valid ACM certificate ARN."
  }
}

variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring for production"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Number of days to retain backups in production"
  type        = number
  default     = 30
  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 365
    error_message = "Backup retention must be between 7 and 365 days."
  }
}

variable "enable_cross_region_replication" {
  description = "Enable cross-region replication for disaster recovery"
  type        = bool
  default     = true
}

variable "compliance_mode" {
  description = "Compliance mode for production deployment"
  type        = string
  default     = "strict"
  validation {
    condition     = contains(["strict", "standard"], var.compliance_mode)
    error_message = "Compliance mode must be either 'strict' or 'standard'."
  }
}

variable "auto_scaling_config" {
  description = "Auto scaling configuration for production"
  type = object({
    min_capacity     = number
    max_capacity     = number
    target_cpu       = number
    target_memory    = number
    scale_up_cooldown   = number
    scale_down_cooldown = number
  })
  default = {
    min_capacity     = 3
    max_capacity     = 20
    target_cpu       = 70
    target_memory    = 80
    scale_up_cooldown   = 300
    scale_down_cooldown = 600
  }
}

variable "database_config" {
  description = "Database configuration for production"
  type = object({
    instance_class          = string
    allocated_storage       = number
    max_allocated_storage   = number
    backup_retention_period = number
    multi_az               = bool
    encryption_enabled     = bool
  })
  default = {
    instance_class          = "db.r5.xlarge"
    allocated_storage       = 200
    max_allocated_storage   = 1000
    backup_retention_period = 30
    multi_az               = true
    encryption_enabled     = true
  }
}

variable "regional_settings" {
  description = "Regional deployment settings"
  type = map(object({
    enabled                = bool
    instance_type         = string
    min_capacity          = number
    max_capacity          = number
    compliance_requirements = list(string)
    data_residency_required = bool
  }))
  default = {
    "eu-west-2" = {
      enabled                = true
      instance_type         = "t3.large"
      min_capacity          = 3
      max_capacity          = 10
      compliance_requirements = ["GDPR"]
      data_residency_required = true
    }
    "us-east-1" = {
      enabled                = true
      instance_type         = "t3.large"
      min_capacity          = 2
      max_capacity          = 8
      compliance_requirements = ["CCPA", "HIPAA"]
      data_residency_required = true
    }
    "ap-southeast-2" = {
      enabled                = true
      instance_type         = "t3.medium"
      min_capacity          = 2
      max_capacity          = 6
      compliance_requirements = ["Privacy_Act"]
      data_residency_required = true
    }
  }
}

variable "notification_endpoints" {
  description = "SNS endpoints for production alerts"
  type = object({
    email_alerts    = list(string)
    slack_webhook   = string
    pagerduty_key   = string
  })
  default = {
    email_alerts  = []
    slack_webhook = ""
    pagerduty_key = ""
  }
}

variable "tags" {
  description = "Additional tags for production resources"
  type        = map(string)
  default = {
    CostCenter    = "production"
    Owner         = "vitracka-ops-team"
    BusinessUnit  = "health-tech"
    Compliance    = "gdpr-ccpa-hipaa"
  }
}
# Staging Environment Variables

variable "primary_region" {
  description = "Primary AWS region for staging deployment"
  type        = string
  default     = "eu-west-2"
}

variable "domain_name" {
  description = "Domain name for staging environment"
  type        = string
  default     = "staging.vitracka.com"
}

variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate for staging"
  type        = string
  default     = ""
}

variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "enable_cross_region_testing" {
  description = "Enable cross-region features for testing"
  type        = bool
  default     = true
}

variable "test_data_enabled" {
  description = "Enable test data seeding for staging"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags for staging resources"
  type        = map(string)
  default = {
    CostCenter = "staging"
    Owner      = "vitracka-qa-team"
    Purpose    = "integration-testing"
  }
}
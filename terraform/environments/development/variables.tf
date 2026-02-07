# Development Environment Variables

variable "primary_region" {
  description = "Primary AWS region for development deployment"
  type        = string
  default     = "eu-west-2"
}

variable "aws_profile" {
  description = "AWS profile to use for deployment"
  type        = string
  default     = "default"
}

variable "domain_name" {
  description = "Domain name for development environment"
  type        = string
  default     = "dev.vitracka.com"
}

variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate for development"
  type        = string
  default     = ""
}

variable "enable_detailed_monitoring" {
  description = "Enable detailed CloudWatch monitoring"
  type        = bool
  default     = false
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "tags" {
  description = "Additional tags for development resources"
  type        = map(string)
  default = {
    CostCenter = "development"
    Owner      = "vitracka-dev-team"
  }
}
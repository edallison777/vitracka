# International Expansion Module Variables

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "enable_multi_region" {
  description = "Enable multi-region deployment"
  type        = bool
  default     = false
}

variable "backup_regions" {
  description = "List of backup regions for disaster recovery"
  type        = list(string)
  default     = []
}

variable "data_residency_region" {
  description = "Primary region for data residency compliance"
  type        = string
}

variable "compliance_requirements" {
  description = "List of compliance requirements"
  type        = list(string)
  default     = ["GDPR"]
}

variable "primary_region" {
  description = "Whether this is the primary region deployment"
  type        = bool
  default     = true
}

variable "supported_languages" {
  description = "List of supported languages for localization"
  type        = list(string)
  default     = ["en", "es", "fr", "de", "it"]
}

variable "supported_currencies" {
  description = "List of supported currencies"
  type        = list(string)
  default     = ["GBP", "USD", "EUR", "CAD", "AUD"]
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "vitracka.com"
}

variable "primary_endpoint" {
  description = "Primary endpoint for health checks"
  type        = string
}

variable "ssl_certificate_arn" {
  description = "ARN of SSL certificate for CloudFront"
  type        = string
  default     = ""
}

variable "geo_restriction_type" {
  description = "Type of geo restriction (whitelist/blacklist/none)"
  type        = string
  default     = "none"
}

variable "allowed_countries" {
  description = "List of allowed country codes for geo restriction"
  type        = list(string)
  default     = []
}

variable "compliance_log_retention_days" {
  description = "Retention period for compliance logs in days"
  type        = number
  default     = 2557  # Closest valid value to 7 years for GDPR compliance
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
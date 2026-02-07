# Variables for Vitracka Infrastructure

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "eu-west-1"
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "vitracka"
}

variable "owner" {
  description = "Owner of the infrastructure"
  type        = string
  default     = "vitracka-team"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "product-development"
}

# Networking Variables
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Database Variables
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS instance (GB)"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Name of the database"
  type        = string
  default     = "vitracka"
}

variable "db_username" {
  description = "Username for the database"
  type        = string
  default     = "vitracka_admin"
}

# Compute Variables
variable "ecs_instance_type" {
  description = "EC2 instance type for ECS cluster"
  type        = string
  default     = "t3.small"
}

variable "min_capacity" {
  description = "Minimum number of instances in Auto Scaling Group"
  type        = number
  default     = 1
}

variable "max_capacity" {
  description = "Maximum number of instances in Auto Scaling Group"
  type        = number
  default     = 10
}

variable "desired_capacity" {
  description = "Desired number of instances in Auto Scaling Group"
  type        = number
  default     = 2
}

# International Expansion Variables
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
  default     = "eu-west-1"
}

variable "compliance_requirements" {
  description = "List of compliance requirements (GDPR, CCPA, HIPAA, etc.)"
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
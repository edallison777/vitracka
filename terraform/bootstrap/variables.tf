# Variables for Bootstrap

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "eu-west-1"
}

variable "environments" {
  description = "List of environments to create state resources for"
  type        = list(string)
  default     = ["development", "staging", "production"]
}
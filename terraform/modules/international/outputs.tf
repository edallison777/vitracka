# International Expansion Module Outputs

output "hosted_zone_id" {
  description = "Route 53 hosted zone ID"
  value       = var.primary_region ? aws_route53_zone.main[0].zone_id : null
}

output "hosted_zone_name_servers" {
  description = "Route 53 hosted zone name servers"
  value       = var.primary_region ? aws_route53_zone.main[0].name_servers : null
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = var.primary_region ? aws_cloudfront_distribution.global[0].id : null
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = var.primary_region ? aws_cloudfront_distribution.global[0].domain_name : null
}

output "backup_bucket_names" {
  description = "Names of backup S3 buckets"
  value       = aws_s3_bucket.data_backup[*].bucket
}

output "regional_kms_key_id" {
  description = "Regional KMS key ID"
  value       = aws_kms_key.regional.key_id
}

output "regional_kms_key_arn" {
  description = "Regional KMS key ARN"
  value       = aws_kms_key.regional.arn
}

output "compliance_log_group_name" {
  description = "CloudWatch log group name for compliance"
  value       = aws_cloudwatch_log_group.compliance.name
}

output "region_config_parameter_name" {
  description = "SSM parameter name for region configuration"
  value       = aws_ssm_parameter.region_config.name
}
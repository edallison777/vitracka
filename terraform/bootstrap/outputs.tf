# Outputs for Bootstrap

output "state_bucket_names" {
  description = "Names of the S3 buckets for Terraform state"
  value       = { for k, v in aws_s3_bucket.terraform_state : k => v.id }
}

output "lock_table_names" {
  description = "Names of the DynamoDB tables for Terraform locking"
  value       = { for k, v in aws_dynamodb_table.terraform_locks : k => v.name }
}
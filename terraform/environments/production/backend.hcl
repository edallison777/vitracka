# Production Backend Configuration
bucket         = "vitracka-terraform-state-production"
key            = "production/terraform.tfstate"
region         = "eu-west-1"
dynamodb_table = "vitracka-terraform-locks-production"
encrypt        = true
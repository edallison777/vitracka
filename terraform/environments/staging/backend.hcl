# Staging Backend Configuration
bucket         = "vitracka-terraform-state-staging"
key            = "staging/terraform.tfstate"
region         = "eu-west-1"
dynamodb_table = "vitracka-terraform-locks-staging"
encrypt        = true
# Staging Environment Configuration

environment = "staging"
aws_region  = "eu-west-2"

# Networking
vpc_cidr = "10.1.0.0/16"

# Database
db_instance_class    = "db.t3.small"
db_allocated_storage = 50
db_name             = "vitracka_staging"
db_username         = "vitracka_admin"

# Compute
min_capacity     = 1
max_capacity     = 5
desired_capacity = 2

# Tags
project_name = "vitracka"
owner        = "vitracka-team"
cost_center  = "product-development"
# Production Environment Configuration

environment = "production"
aws_region  = "eu-west-2"

# Networking
vpc_cidr = "10.2.0.0/16"

# Database
db_instance_class    = "db.t3.medium"
db_allocated_storage = 100
db_name             = "vitracka_prod"
db_username         = "vitracka_admin"

# Compute
min_capacity     = 2
max_capacity     = 10
desired_capacity = 3

# Tags
project_name = "vitracka"
owner        = "vitracka-team"
cost_center  = "product-development"
# Development Environment Configuration

environment = "development"
aws_region  = "eu-west-2"

# Networking
vpc_cidr = "10.0.0.0/16"

# Database
db_instance_class    = "db.t3.micro"
db_allocated_storage = 20
db_name             = "vitracka_dev"
db_username         = "vitracka_admin"

# Compute
min_capacity     = 1
max_capacity     = 3
desired_capacity = 1

# Tags
project_name = "vitracka"
owner        = "vitracka-team"
cost_center  = "product-development"
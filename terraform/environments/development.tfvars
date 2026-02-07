# Development Environment Configuration
environment = "development"
aws_region = "eu-west-1"

# Networking
vpc_cidr = "10.0.0.0/16"

# Database
db_instance_class = "db.t3.micro"
db_allocated_storage = 20
db_name = "vitracka_dev"
db_username = "vitracka_admin"

# Compute
ecs_instance_type = "t3.small"
min_capacity = 1
max_capacity = 3
desired_capacity = 1

# International expansion settings
enable_multi_region = false
backup_regions = []
data_residency_region = "eu-west-1"
compliance_requirements = ["GDPR"]
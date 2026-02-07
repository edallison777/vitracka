# Staging Environment Configuration
environment = "staging"
aws_region = "eu-west-1"

# Networking
vpc_cidr = "10.1.0.0/16"

# Database
db_instance_class = "db.t3.small"
db_allocated_storage = 50
db_name = "vitracka_staging"
db_username = "vitracka_admin"

# Compute
ecs_instance_type = "t3.medium"
min_capacity = 2
max_capacity = 6
desired_capacity = 2

# International expansion settings
enable_multi_region = true
backup_regions = ["us-east-1"]
data_residency_region = "eu-west-1"
compliance_requirements = ["GDPR"]
# Production Environment Configuration
environment = "production"
aws_region = "eu-west-1"

# Networking
vpc_cidr = "10.2.0.0/16"

# Database
db_instance_class = "db.r5.large"
db_allocated_storage = 200
db_name = "vitracka_prod"
db_username = "vitracka_admin"

# Compute
ecs_instance_type = "t3.large"
min_capacity = 3
max_capacity = 20
desired_capacity = 5

# International expansion settings
enable_multi_region = true
backup_regions = ["us-east-1", "ap-southeast-2"]
data_residency_region = "eu-west-1"
compliance_requirements = ["GDPR", "CCPA", "PIPEDA"]
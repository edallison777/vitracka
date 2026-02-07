# Asia Pacific Southeast 2 Region Configuration for International Expansion
environment = "production"
aws_region = "ap-southeast-2"

# Networking
vpc_cidr = "10.4.0.0/16"

# Database
db_instance_class = "db.r5.large"
db_allocated_storage = 200
db_name = "vitracka_apac"
db_username = "vitracka_admin"

# Compute
ecs_instance_type = "t3.large"
min_capacity = 2
max_capacity = 15
desired_capacity = 3

# International expansion settings
enable_multi_region = true
backup_regions = ["eu-west-2"]
data_residency_region = "ap-southeast-2"
compliance_requirements = ["PDPA", "Privacy_Act"]
primary_region = false
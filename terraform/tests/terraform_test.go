package test

import (
	"testing"

	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
)

func TestTerraformValidation(t *testing.T) {
	t.Parallel()

	// Define the Terraform options
	terraformOptions := &terraform.Options{
		// Path to the Terraform code
		TerraformDir: "../",

		// Variables to pass to Terraform
		Vars: map[string]interface{}{
			"environment":           "test",
			"aws_region":           "eu-west-2",
			"vpc_cidr":             "10.99.0.0/16",
			"db_instance_class":    "db.t3.micro",
			"db_allocated_storage": 20,
			"db_name":              "vitracka_test",
			"db_username":          "vitracka_admin",
		},

		// Disable colors in Terraform commands
		NoColor: true,
	}

	// Clean up resources with "terraform destroy" at the end of the test
	defer terraform.Destroy(t, terraformOptions)

	// Run "terraform init" and "terraform plan"
	terraform.InitAndPlan(t, terraformOptions)
}

func TestTerraformSyntax(t *testing.T) {
	t.Parallel()

	terraformOptions := &terraform.Options{
		TerraformDir: "../",
		NoColor:      true,
	}

	// Validate Terraform syntax
	terraform.Validate(t, terraformOptions)
}

func TestTerraformFormat(t *testing.T) {
	t.Parallel()

	terraformOptions := &terraform.Options{
		TerraformDir: "../",
		NoColor:      true,
	}

	// Check if Terraform files are properly formatted
	terraform.Format(t, terraformOptions)
}

func TestNetworkingModule(t *testing.T) {
	t.Parallel()

	terraformOptions := &terraform.Options{
		TerraformDir: "../modules/networking",
		Vars: map[string]interface{}{
			"name_prefix":         "test-vitracka",
			"vpc_cidr":           "10.99.0.0/16",
			"availability_zones": []string{"eu-west-2a", "eu-west-2b", "eu-west-2c"},
			"environment":        "test",
			"tags": map[string]string{
				"Environment": "test",
				"Project":     "vitracka",
			},
		},
		NoColor: true,
	}

	defer terraform.Destroy(t, terraformOptions)
	terraform.InitAndPlan(t, terraformOptions)
}

func TestSecurityModule(t *testing.T) {
	t.Parallel()

	terraformOptions := &terraform.Options{
		TerraformDir: "../modules/security",
		Vars: map[string]interface{}{
			"name_prefix": "test-vitracka",
			"vpc_id":      "vpc-12345678", // Mock VPC ID for validation
			"environment": "test",
			"tags": map[string]string{
				"Environment": "test",
				"Project":     "vitracka",
			},
		},
		NoColor: true,
	}

	// Only validate syntax for security module (requires existing VPC)
	terraform.Validate(t, terraformOptions)
}

func TestStorageModule(t *testing.T) {
	t.Parallel()

	terraformOptions := &terraform.Options{
		TerraformDir: "../modules/storage",
		Vars: map[string]interface{}{
			"name_prefix": "test-vitracka",
			"environment": "test",
			"tags": map[string]string{
				"Environment": "test",
				"Project":     "vitracka",
			},
		},
		NoColor: true,
	}

	defer terraform.Destroy(t, terraformOptions)
	terraform.InitAndPlan(t, terraformOptions)
}

func TestMonitoringModule(t *testing.T) {
	t.Parallel()

	terraformOptions := &terraform.Options{
		TerraformDir: "../modules/monitoring",
		Vars: map[string]interface{}{
			"name_prefix": "test-vitracka",
			"environment": "test",
			"alert_email": "test@vitracka.com",
			"tags": map[string]string{
				"Environment": "test",
				"Project":     "vitracka",
			},
		},
		NoColor: true,
	}

	defer terraform.Destroy(t, terraformOptions)
	terraform.InitAndPlan(t, terraformOptions)
}
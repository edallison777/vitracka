# Infrastructure Validation Tests

This directory contains automated tests for validating the Terraform infrastructure configurations using Terratest.

## Prerequisites

- Go 1.21 or later
- AWS CLI configured with appropriate credentials
- Terraform installed

## Running Tests

### Install Dependencies

```bash
cd terraform/tests
go mod tidy
```

### Run All Tests

```bash
go test -v -timeout 30m
```

### Run Specific Tests

```bash
# Test Terraform syntax validation
go test -v -run TestTerraformSyntax

# Test Terraform formatting
go test -v -run TestTerraformFormat

# Test networking module
go test -v -run TestNetworkingModule

# Test storage module
go test -v -run TestStorageModule
```

## Test Categories

### Syntax and Format Tests
- **TestTerraformSyntax**: Validates Terraform configuration syntax
- **TestTerraformFormat**: Checks if files are properly formatted

### Module Tests
- **TestNetworkingModule**: Validates VPC, subnets, and networking components
- **TestSecurityModule**: Validates security groups and IAM roles (syntax only)
- **TestStorageModule**: Validates S3 and CloudFront configuration
- **TestMonitoringModule**: Validates CloudWatch dashboards and alarms

### Integration Tests
- **TestTerraformValidation**: Full infrastructure validation with plan

## Test Configuration

Tests use mock values and test-specific configurations to avoid conflicts with real environments:

- VPC CIDR: `10.99.0.0/16`
- Environment: `test`
- Region: `eu-west-2`

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
name: Infrastructure Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v3
        with:
          go-version: '1.21'
      - name: Run Tests
        run: |
          cd terraform/tests
          go mod tidy
          go test -v -timeout 30m
```

## Best Practices

1. **Parallel Execution**: Tests run in parallel using `t.Parallel()`
2. **Resource Cleanup**: Tests automatically clean up resources with `defer terraform.Destroy()`
3. **Timeout Management**: Use appropriate timeouts for long-running tests
4. **Mock Data**: Use test-specific values to avoid conflicts

## Troubleshooting

### Common Issues

1. **AWS Credentials**: Ensure AWS CLI is configured with valid credentials
2. **Permissions**: Verify IAM permissions for creating test resources
3. **Timeouts**: Increase timeout for slow operations
4. **Resource Limits**: Check AWS service limits if tests fail

### Debug Mode

Run tests with verbose output:

```bash
go test -v -run TestName
```

Add debug logging:

```bash
TF_LOG=DEBUG go test -v -run TestName
```
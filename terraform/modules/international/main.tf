# International Expansion Module
# Handles multi-region deployment, data residency, and compliance

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Route 53 Hosted Zone for global DNS management
resource "aws_route53_zone" "main" {
  count = var.primary_region ? 1 : 0
  name  = var.domain_name

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-hosted-zone"
  })
}

# Route 53 Health Checks for multi-region failover
resource "aws_route53_health_check" "primary" {
  count                           = var.enable_multi_region ? 1 : 0
  fqdn                           = var.primary_endpoint
  port                           = 443
  type                           = "HTTPS"
  resource_path                  = "/health"
  failure_threshold              = "3"
  request_interval               = "30"
  cloudwatch_alarm_region        = var.aws_region
  cloudwatch_alarm_name          = "${var.name_prefix}-health-check"
  insufficient_data_health_status = "LastKnownStatus"

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-health-check"
  })
}

# CloudFront Distribution for global content delivery
resource "aws_cloudfront_distribution" "global" {
  count = var.primary_region ? 1 : 0

  origin {
    domain_name = var.primary_endpoint
    origin_id   = "${var.name_prefix}-primary"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Additional origins for backup regions
  dynamic "origin" {
    for_each = var.backup_regions
    content {
      domain_name = "${var.name_prefix}-${origin.value}.${var.domain_name}"
      origin_id   = "${var.name_prefix}-${origin.value}"

      custom_origin_config {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  # Cache behavior for API endpoints
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "${var.name_prefix}-primary"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Accept-Language", "CloudFront-Viewer-Country"]
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # Geo-restriction for compliance
  restrictions {
    geo_restriction {
      restriction_type = var.geo_restriction_type
      locations        = var.allowed_countries
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-cloudfront"
  })
}

# S3 bucket for cross-region data replication
resource "aws_s3_bucket" "data_backup" {
  count  = length(var.backup_regions)
  bucket = "${var.name_prefix}-backup-${var.backup_regions[count.index]}"

  tags = merge(var.tags, {
    Name   = "${var.name_prefix}-backup-${var.backup_regions[count.index]}"
    Region = var.backup_regions[count.index]
  })
}

resource "aws_s3_bucket_versioning" "data_backup" {
  count  = length(var.backup_regions)
  bucket = aws_s3_bucket.data_backup[count.index].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data_backup" {
  count  = length(var.backup_regions)
  bucket = aws_s3_bucket.data_backup[count.index].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# KMS keys for regional data encryption
resource "aws_kms_key" "regional" {
  description             = "KMS key for ${var.aws_region} data encryption"
  deletion_window_in_days = 7

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-kms-${var.aws_region}"
  })
}

resource "aws_kms_alias" "regional" {
  name          = "alias/${var.name_prefix}-${var.aws_region}"
  target_key_id = aws_kms_key.regional.key_id
}

# Parameter Store for regional configuration
resource "aws_ssm_parameter" "region_config" {
  name  = "/${var.name_prefix}/config/region"
  type  = "String"
  value = jsonencode({
    region                  = var.aws_region
    data_residency_region   = var.data_residency_region
    compliance_requirements = var.compliance_requirements
    supported_languages     = var.supported_languages
    supported_currencies    = var.supported_currencies
    primary_region         = var.primary_region
  })

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-region-config"
  })
}

# CloudWatch Log Group for international compliance logging
resource "aws_cloudwatch_log_group" "compliance" {
  name              = "/aws/vitracka/${var.environment}/compliance"
  retention_in_days = var.compliance_log_retention_days

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-compliance-logs"
  })
}

# EventBridge rules for cross-region event replication
resource "aws_cloudwatch_event_rule" "cross_region_events" {
  count       = var.enable_multi_region ? 1 : 0
  name        = "${var.name_prefix}-cross-region-events"
  description = "Replicate critical events across regions"

  event_pattern = jsonencode({
    source      = ["vitracka.system"]
    detail-type = ["User Data Change", "Safety Intervention", "Compliance Event"]
  })

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-cross-region-events"
  })
}
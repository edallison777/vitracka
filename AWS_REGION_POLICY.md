# ⚠️ AWS REGION POLICY - CRITICAL ⚠️

## MANDATORY DEPLOYMENT REGION

**ALL AWS resources for this project MUST be deployed to `eu-west-1` (Europe - Ireland) ONLY.**

### Why eu-west-1?

This is a strict project requirement. No exceptions.

### What This Means

- ✅ **ALLOWED**: Deploy to `eu-west-1`
- ❌ **FORBIDDEN**: Deploy to any other region (us-east-1, us-west-2, ap-southeast-2, etc.)

### Resources Affected

This applies to ALL AWS services:
- AgentCore Runtime agents
- ECR repositories
- CloudWatch dashboards and alarms
- IAM roles (global but tagged for eu-west-1)
- S3 buckets
- Lambda functions
- ECS/Fargate services
- RDS databases
- Any other AWS resources

### Before Deploying

**ALWAYS verify the region parameter:**

```powershell
# Correct
agentcore deploy  # (with .bedrock_agentcore.yaml configured for eu-west-1)
aws ecr create-repository --repository-name vitracka/test-agent --region eu-west-1

# Wrong - DO NOT USE
aws ecr create-repository --repository-name vitracka/test-agent --region us-east-1  # ❌
```

### Cleanup History

**2026-02-07**: Cleaned up all resources from us-east-1 and redeployed to eu-west-1:
- Deleted ECR repository (vitracka/test-agent) from us-east-1
- Destroyed AgentCore agent runtime from us-east-1
- Deleted CloudWatch dashboards and alarms from us-east-1
- Removed all S3 artifacts from us-east-1

### Configuration Files

Ensure all configuration files specify eu-west-1:

**agents/test-agent/.bedrock_agentcore.yaml**:
```yaml
agents:
  agent:
    aws:
      region: eu-west-1  # ← MUST be eu-west-1
```

**scripts/deploy-agent-agentcore.ps1**:
```powershell
$Region = "eu-west-1"  # ← Default must be eu-west-1
```

### Verification

To verify resources are in the correct region:

```powershell
# Check ECR repositories
aws ecr describe-repositories --region eu-west-1

# Check AgentCore agents
cd agents/test-agent
agentcore status  # Should show "Region: eu-west-1"

# Check CloudWatch dashboards
aws cloudwatch list-dashboards --region eu-west-1
```

### If You Find Resources in Other Regions

**STOP IMMEDIATELY** and run the cleanup script:

```powershell
.\scripts\cleanup-non-eu-west-1.ps1
```

This will scan all regions and delete any resources found outside eu-west-1.

---

**Last Updated**: 2026-02-07
**Policy Owner**: Project Lead
**Enforcement**: Mandatory

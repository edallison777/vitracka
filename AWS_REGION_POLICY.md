# ⚠️ AWS REGION POLICY - CRITICAL ⚠️

## MANDATORY DEPLOYMENT REGION

**ALL AWS resources for this project MUST be deployed to `eu-west-1` (Europe - Ireland) ONLY.**

### Why eu-west-1?

This is a strict project requirement. No exceptions.

### What This Means

- ✅ **ALLOWED**: Deploy to `eu-west-1`
- ❌ **FORBIDDEN**: Deploy to any other region (us-east-1, us-west-2, ap-southeast-2, etc.)

### Resources Affected

This applies to AWS services actually used by the project:

**Currently Used (Direct Code Deployment)**:
- ✅ AgentCore Runtime agents
- ✅ CloudWatch dashboards and alarms  
- ✅ IAM roles (global but tagged for eu-west-1)
- ✅ S3 buckets (for AgentCore artifacts)

**NOT Currently Used** (only needed for container deployment):
- ❌ ECR repositories (not needed for direct code deployment)
- ❌ ECS/Fargate services (replaced by AgentCore Runtime)

**Future Resources** (when implemented):
- Lambda functions
- RDS databases
- Any other AWS resources

### Before Deploying

**ALWAYS verify the region parameter:**

```powershell
# Correct - Direct code deployment (no Docker/ECR needed)
cd agents/test-agent
agentcore configure --entrypoint agent.py  # Enter eu-west-1 when prompted
agentcore deploy

# Verify region
agentcore status  # Should show "Region: eu-west-1"

# Wrong - DO NOT USE
agentcore deploy --region us-east-1  # ❌ (Note: --region flag doesn't exist, configured in .bedrock_agentcore.yaml)
```

### Cleanup History

**2026-02-07**: Cleaned up all resources from us-east-1:
- Deleted ECR repository (vitracka/test-agent) - no longer needed (using direct deployment)
- Destroyed AgentCore agent runtime from us-east-1
- Deleted CloudWatch dashboards and alarms from us-east-1
- Removed all S3 artifacts from us-east-1

**Note**: ECR repositories are not needed for AgentCore direct code deployment. Only use ECR if deploying in container mode.

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
# Check AgentCore agents
cd agents/test-agent
agentcore status  # Should show "Region: eu-west-1"

# Check CloudWatch dashboards
aws cloudwatch list-dashboards --region eu-west-1

# Check S3 buckets (AgentCore artifacts)
aws s3 ls | findstr bedrock-agentcore
```

**Note**: ECR repositories are not used in direct code deployment mode.

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

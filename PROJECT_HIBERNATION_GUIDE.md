# Vitracka Project Hibernation Guide

**Date**: February 8, 2026  
**Status**: Ready for hibernation  
**Estimated Monthly Cost (Active)**: $0-5/month  
**Estimated Monthly Cost (Hibernated)**: $0/month

---

## Overview

This guide explains how to safely hibernate the Vitracka project to eliminate AWS costs, and how to wake it up later when you're ready to continue.

---

## What Gets Hibernated

### AWS Resources (Will be deleted)
- ✅ AgentCore agents (Coach Companion, Test Agent)
- ✅ CloudWatch alarms (7 alarms)
- ✅ CloudWatch dashboards (2 dashboards)
- ⚠️ CloudWatch log groups (optional - can retain for history)
- ⚠️ ECR Docker images (optional - can retain)
- ⚠️ IAM roles (optional - retained by default for faster wake-up)

### Local Resources (Will be preserved)
- ✅ All source code (Git repository)
- ✅ All documentation (15 documents)
- ✅ All scripts (10+ scripts)
- ✅ Agent configurations
- ✅ Backup files (created during hibernation)

---

## Hibernation Process

### Step 1: Run Teardown Script

**Basic teardown** (retains IAM roles for faster redeployment):
```powershell
./scripts/teardown-all-resources.ps1
```

**Complete teardown** (removes everything):
```powershell
./scripts/teardown-all-resources.ps1 -RetainLogs:$false -RetainImages:$false -RetainIAMRoles:$false
```

**Dry run** (see what would be deleted without deleting):
```powershell
./scripts/teardown-all-resources.ps1 -DryRun
```

### Step 2: Verify Deletion

Check AWS Console to confirm resources are gone:
- https://console.aws.amazon.com/bedrock/home?region=eu-west-1
- https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1

### Step 3: Commit Backup Files

```powershell
git add backups/
git commit -m "Add hibernation backup - $(Get-Date -Format 'yyyy-MM-dd')"
git push
```

### Step 4: Document Hibernation

The teardown script automatically creates:
- `backups/teardown-YYYYMMDD-HHMMSS/` - Backup directory
- `backups/teardown-YYYYMMDD-HHMMSS/teardown-summary.json` - Summary of what was deleted
- `backups/teardown-YYYYMMDD-HHMMSS/*.json` - Resource configurations

---

## What Happens During Hibernation

### Costs
- **Before**: $0-5/month (mostly within free tier)
- **After**: $0/month (no active resources)

### Data Retention
- **Agent code**: Preserved in Git
- **Agent configurations**: Preserved in Git
- **CloudWatch logs**: Deleted (unless --RetainLogs specified)
- **Docker images**: Deleted (unless --RetainImages specified)
- **IAM roles**: Retained by default (unless --RetainIAMRoles:$false)

### What You Lose
- ❌ Historical CloudWatch logs (unless retained)
- ❌ CloudWatch metrics history
- ❌ Agent runtime state (stateless anyway)

### What You Keep
- ✅ All source code
- ✅ All documentation
- ✅ All deployment scripts
- ✅ Agent configurations
- ✅ Resource metadata (in backups)

---

## Wake-Up Process

### Step 1: Verify Prerequisites

```powershell
# Check AWS credentials
aws sts get-caller-identity

# Check AgentCore CLI
agentcore --version

# Check Python environment
python --version
pip list | Select-String "bedrock-agentcore"
```

### Step 2: Find Your Backup

```powershell
# List available backups
Get-ChildItem -Path backups -Directory

# Example output:
# teardown-20260208-120000
# teardown-20260215-093000
```

### Step 3: Review Backup

```powershell
# View backup summary
Get-Content backups/teardown-20260208-120000/teardown-summary.json | ConvertFrom-Json

# View what was deleted
Get-ChildItem backups/teardown-20260208-120000
```

### Step 4: Redeploy Agents

**Option A: Use redeploy script** (shows instructions):
```powershell
./scripts/redeploy-from-backup.ps1 -BackupDir backups/teardown-20260208-120000
```

**Option B: Manual redeployment**:

```powershell
# 1. Deploy Coach Companion
cd agents/coach-companion-agentcore
agentcore deploy
cd ../..

# 2. Deploy Test Agent (optional)
cd agents/test-agent
agentcore deploy
cd ../..

# 3. Verify deployment
cd agents/coach-companion-agentcore
agentcore status
# Should show: Status: Ready - Agent deployed and endpoint available

# 4. Test invocation
agentcore invoke '{"prompt": "Hello! Are you back online?"}'
```

### Step 5: Recreate Monitoring

```powershell
# Recreate CloudWatch alarms
./scripts/create-agentcore-alarms.ps1
./scripts/create-latency-alarms.ps1
./scripts/create-cost-alarms.ps1

# Recreate CloudWatch dashboard (if not restored from backup)
./scripts/create-agentcore-dashboard.ps1
```

### Step 6: Verify Everything Works

```powershell
# Check agent status
cd agents/coach-companion-agentcore
agentcore status

# Test invocation
agentcore invoke '{"prompt": "Health check"}'

# View CloudWatch dashboard
# https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#gen-ai-observability/agent-core

# Check alarms
aws cloudwatch describe-alarms --region eu-west-1 --query "MetricAlarms[?contains(AlarmName, 'AgentCore')]"
```

---

## Estimated Wake-Up Time

### With Retained IAM Roles (Default)
- **Agent redeployment**: 5-10 minutes
- **Monitoring setup**: 5 minutes
- **Testing and verification**: 5 minutes
- **Total**: 15-20 minutes

### Without Retained IAM Roles
- **IAM role recreation**: 5 minutes (automatic during agent deploy)
- **Agent redeployment**: 5-10 minutes
- **Monitoring setup**: 5 minutes
- **Testing and verification**: 5 minutes
- **Total**: 20-25 minutes

---

## Troubleshooting

### Issue: AgentCore CLI not found

```powershell
# Reinstall AgentCore
pip install bedrock-agentcore-starter-toolkit
pip install bedrock-agentcore-runtime
```

### Issue: AWS credentials expired

```powershell
# Reconfigure AWS credentials
aws configure
```

### Issue: Agent deployment fails

```powershell
# Check AWS region
aws configure get region
# Should be: eu-west-1

# Check Bedrock model access
aws bedrock list-foundation-models --region eu-west-1 --query "modelSummaries[?contains(modelId, 'claude')]"

# Check IAM permissions
aws sts get-caller-identity
```

### Issue: Backup directory not found

```powershell
# List all backups
Get-ChildItem -Path backups -Directory

# If no backups exist, you can still redeploy from source code
# The backup is just for reference - all code is in Git
```

### Issue: CloudWatch alarms not working

```powershell
# Recreate alarms manually
./scripts/create-agentcore-alarms.ps1
./scripts/create-latency-alarms.ps1
./scripts/create-cost-alarms.ps1

# Verify alarms exist
aws cloudwatch describe-alarms --region eu-west-1
```

---

## Cost Comparison

### Active Project (Before Hibernation)
- **AgentCore agents**: $0-2/month (mostly free tier)
- **CloudWatch logs**: $0-1/month (90-day retention)
- **CloudWatch alarms**: $0.10/alarm/month × 7 = $0.70/month
- **CloudWatch dashboards**: Free (3 dashboards included)
- **ECR storage**: $0.10/GB/month × 0.2GB = $0.02/month
- **Total**: $0-5/month

### Hibernated Project (After Teardown)
- **All resources deleted**: $0/month
- **Git repository**: Free
- **Local storage**: Free
- **Total**: $0/month

### Savings
- **Monthly**: $0-5/month
- **Annually**: $0-60/year

---

## Important Notes

### What's Safe to Delete
- ✅ AgentCore agents (can redeploy from code)
- ✅ CloudWatch alarms (can recreate from scripts)
- ✅ CloudWatch dashboards (can recreate from scripts)
- ✅ CloudWatch logs (if you don't need history)
- ✅ ECR images (can rebuild from Dockerfile)

### What to Keep
- ✅ Git repository (contains all code)
- ✅ Backup files (for reference)
- ✅ Documentation (for redeployment)
- ⚠️ IAM roles (optional - speeds up redeployment)

### Data Loss Risks
- ❌ CloudWatch logs (historical data) - if deleted
- ❌ CloudWatch metrics (historical data) - always deleted
- ✅ Agent code - preserved in Git
- ✅ Agent configurations - preserved in Git

---

## Redeployment Checklist

When you're ready to wake up the project:

- [ ] 1. Verify AWS credentials are configured
- [ ] 2. Verify AgentCore CLI is installed
- [ ] 3. Find your backup directory
- [ ] 4. Review backup summary
- [ ] 5. Deploy Coach Companion agent
- [ ] 6. Deploy Test Agent (optional)
- [ ] 7. Verify agents are READY
- [ ] 8. Test agent invocation
- [ ] 9. Recreate CloudWatch alarms
- [ ] 10. Recreate CloudWatch dashboard (if needed)
- [ ] 11. Verify monitoring is working
- [ ] 12. Run smoke tests
- [ ] 13. Update documentation with new agent ARNs

---

## Quick Reference Commands

### Hibernation
```powershell
# Tear down all resources (retain IAM roles)
./scripts/teardown-all-resources.ps1

# Tear down everything
./scripts/teardown-all-resources.ps1 -RetainLogs:$false -RetainImages:$false -RetainIAMRoles:$false

# Dry run (see what would be deleted)
./scripts/teardown-all-resources.ps1 -DryRun
```

### Wake-Up
```powershell
# View redeployment instructions
./scripts/redeploy-from-backup.ps1 -BackupDir backups/teardown-YYYYMMDD-HHMMSS

# Deploy agents
cd agents/coach-companion-agentcore && agentcore deploy && cd ../..

# Recreate monitoring
./scripts/create-agentcore-alarms.ps1
./scripts/create-latency-alarms.ps1
./scripts/create-cost-alarms.ps1

# Verify
cd agents/coach-companion-agentcore && agentcore status
```

### Verification
```powershell
# Check agent status
agentcore status

# Test invocation
agentcore invoke '{"prompt": "test"}'

# View logs
aws logs tail /aws/bedrock-agentcore/runtimes/coach_companion-XXXXX-DEFAULT --region eu-west-1

# Check alarms
aws cloudwatch describe-alarms --region eu-west-1 --state-value ALARM
```

---

## Support

### Documentation
- **Deployment Guide**: `AGENTCORE_DEPLOYMENT_GUIDE.md`
- **Quick Start**: `AGENTCORE_QUICKSTART.md`
- **Operations Handoff**: `docs/operations-handoff.md`
- **DR Plan**: `DISASTER_RECOVERY_PLAN.md`

### Scripts
- **Teardown**: `scripts/teardown-all-resources.ps1`
- **Redeploy**: `scripts/redeploy-from-backup.ps1`
- **Deploy Agent**: `scripts/deploy-agent-agentcore.ps1`
- **Create Alarms**: `scripts/create-agentcore-alarms.ps1`

### AWS Console Links
- **Bedrock AgentCore**: https://console.aws.amazon.com/bedrock/home?region=eu-west-1
- **CloudWatch**: https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1
- **IAM**: https://console.aws.amazon.com/iam/home
- **ECR**: https://console.aws.amazon.com/ecr/repositories?region=eu-west-1

---

## Final Notes

### Before Hibernation
1. Commit all code changes to Git
2. Push to remote repository
3. Run teardown script
4. Verify resources are deleted
5. Commit backup files

### During Hibernation
- No AWS costs
- All code preserved in Git
- Ready to wake up anytime

### After Wake-Up
- 15-20 minutes to full operation
- All functionality restored
- Same agent behavior
- Fresh monitoring

---

**Document Status**: FINAL  
**Last Updated**: February 8, 2026  
**Ready for Hibernation**: ✅ YES

---

## Summary

**Hibernation**: Run `./scripts/teardown-all-resources.ps1`  
**Wake-Up**: Run `./scripts/redeploy-from-backup.ps1 -BackupDir <backup-dir>`  
**Cost Savings**: $0-5/month → $0/month  
**Wake-Up Time**: 15-20 minutes  
**Data Loss**: None (all code in Git)

**You're ready to hibernate! 🐻💤**

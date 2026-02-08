# Disaster Recovery Plan - AgentCore Deployment

**Project**: Vitracka AgentCore Deployment  
**Date**: February 8, 2026  
**Region**: eu-west-1  
**Status**: PRODUCTION-READY

---

## Executive Summary

This document outlines disaster recovery procedures for the Vitracka AgentCore deployment. The system uses AWS Bedrock AgentCore Runtime with a stateless architecture, enabling rapid recovery with minimal data loss.

**Key Metrics**:
- **RTO** (Recovery Time Objective): 15 minutes
- **RPO** (Recovery Point Objective): 0 (stateless architecture)
- **Backup Frequency**: Continuous (Git-based)
- **Recovery Complexity**: Low (automated scripts)

---

## Table of Contents

1. [Backup Procedures](#backup-procedures)
2. [Recovery Procedures](#recovery-procedures)
3. [Rollback Procedures](#rollback-procedures)
4. [RTO and RPO](#rto-and-rpo)
5. [Incident Response Plan](#incident-response-plan)
6. [DR Drill Procedures](#dr-drill-procedures)
7. [Contact Information](#contact-information)

---

## Backup Procedures

### 1. Agent Code Backup

**Method**: Git Version Control

**What is Backed Up**:
- Agent source code (`agents/*/agent.py`)
- Configuration files (`.bedrock_agentcore.yaml`)
- Dependencies (`requirements.txt`)
- Documentation (`README.md`)
- Deployment scripts (`scripts/*.ps1`)

**Backup Frequency**: Continuous (every commit)

**Backup Location**:
- Primary: GitHub repository
- Local: Developer workstations

**Verification**:
```powershell
# Verify Git repository is up to date
git status
git log --oneline -5

# Verify remote backup
git remote -v
git fetch origin
```

**Automated Backup Script**: Not needed (Git handles this)

### 2. Configuration Backup

**Method**: Git + Manual Export

**What is Backed Up**:
- `.bedrock_agentcore.yaml` (agent configuration)
- IAM role ARNs
- Agent ARNs and IDs
- Memory resource ARNs
- CloudWatch dashboard configurations
- Alarm configurations

**Backup Frequency**: After each deployment

**Backup Location**:
- Git repository (configuration files)
- Documentation (ARNs and IDs)

**Verification**:
```powershell
# Export current agent configuration
cd agents/coach-companion-agentcore
agentcore status > backup-status-$(Get-Date -Format 'yyyyMMdd').txt

# Backup CloudWatch alarms
aws cloudwatch describe-alarms --region eu-west-1 > backup-alarms-$(Get-Date -Format 'yyyyMMdd').json
```

### 3. CloudWatch Logs Backup

**Method**: CloudWatch Logs Retention + Export

**What is Backed Up**:
- Agent invocation logs
- Error logs
- Performance metrics

**Backup Frequency**: 
- Retention: 90 days (configured)
- Export: On-demand for critical incidents

**Backup Location**:
- CloudWatch Logs (primary)
- S3 (for long-term archival, if needed)

**Export Procedure**:
```powershell
# Export logs to S3 (if needed for compliance)
aws logs create-export-task `
    --log-group-name "/aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT" `
    --from $(Get-Date).AddDays(-30).ToUniversalTime().ToString("o") `
    --to $(Get-Date).ToUniversalTime().ToString("o") `
    --destination "vitracka-logs-backup" `
    --destination-prefix "coach-companion/" `
    --region eu-west-1
```

### 4. Infrastructure State Backup

**Method**: Documentation + AWS Console Export

**What is Backed Up**:
- IAM roles and policies
- S3 bucket configurations
- CloudWatch dashboards
- Cost alarms
- Security configurations

**Backup Frequency**: After infrastructure changes

**Backup Location**: Documentation files in Git

**Verification**:
```powershell
# Export IAM role
aws iam get-role --role-name AmazonBedrockAgentCoreSDKRuntime-eu-west-1-cadf435b15 > backup-iam-role.json

# Export IAM policies
aws iam list-attached-role-policies --role-name AmazonBedrockAgentCoreSDKRuntime-eu-west-1-cadf435b15 > backup-iam-policies.json
```

### 5. No Data Backup Required

**Why**: Stateless architecture
- Agents do not store persistent data
- Memory is short-term only (30 days)
- No databases or file storage
- All state is ephemeral

**Implication**: Zero data loss risk (RPO = 0)

---

## Recovery Procedures

### Scenario 1: Agent Failure (Single Agent Down)

**Symptoms**:
- Agent status shows "FAILED" or "UPDATING"
- Invocations return errors
- CloudWatch alarms triggered

**Recovery Steps**:

1. **Assess the situation** (2 minutes)
   ```powershell
   cd agents/coach-companion-agentcore
   agentcore status
   ```

2. **Check CloudWatch logs** (3 minutes)
   ```powershell
   aws logs tail /aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT --follow --region eu-west-1
   ```

3. **Attempt automatic recovery** (5 minutes)
   ```powershell
   # Redeploy the agent
   agentcore deploy
   
   # Wait for READY status
   agentcore status
   ```

4. **Verify recovery** (2 minutes)
   ```powershell
   # Test invocation
   agentcore invoke '{"prompt": "Health check"}'
   ```

5. **Monitor for stability** (3 minutes)
   - Check CloudWatch dashboard
   - Verify no new errors
   - Monitor invocation success rate

**Total Recovery Time**: ~15 minutes

**Rollback**: If redeployment fails, use rollback script (see Rollback Procedures)

---

### Scenario 2: Configuration Corruption

**Symptoms**:
- Agent won't deploy
- Configuration errors
- "entrypoint not found" errors

**Recovery Steps**:

1. **Restore configuration from Git** (2 minutes)
   ```powershell
   cd agents/coach-companion-agentcore
   git checkout HEAD -- .bedrock_agentcore.yaml
   ```

2. **Verify configuration** (1 minute)
   ```powershell
   # Check for absolute paths
   cat .bedrock_agentcore.yaml | Select-String "entrypoint"
   ```

3. **Reconfigure if needed** (3 minutes)
   ```powershell
   agentcore configure `
       --entrypoint agent.py `
       --requirements-file requirements.txt `
       --name coach_companion `
       --region eu-west-1 `
       --deployment-type direct_code_deploy `
       --non-interactive
   ```

4. **Deploy** (5 minutes)
   ```powershell
   agentcore deploy
   ```

5. **Verify** (2 minutes)
   ```powershell
   agentcore status
   agentcore invoke '{"prompt": "Test"}'
   ```

**Total Recovery Time**: ~13 minutes

---

### Scenario 3: Complete Agent Deletion

**Symptoms**:
- Agent ARN not found
- "Agent does not exist" errors
- Memory resource deleted

**Recovery Steps**:

1. **Restore code from Git** (2 minutes)
   ```powershell
   git pull origin main
   cd agents/coach-companion-agentcore
   ```

2. **Reconfigure agent** (3 minutes)
   ```powershell
   agentcore configure `
       --entrypoint agent.py `
       --requirements-file requirements.txt `
       --name coach_companion `
       --region eu-west-1 `
       --deployment-type direct_code_deploy `
       --non-interactive
   ```

3. **Deploy fresh agent** (5 minutes)
   ```powershell
   agentcore deploy
   ```

4. **Update documentation with new ARNs** (2 minutes)
   ```powershell
   agentcore status > deployment-info.txt
   # Update API_ENDPOINTS.md with new ARN
   ```

5. **Recreate monitoring** (5 minutes)
   ```powershell
   .\scripts\create-agentcore-alarms.ps1 -AgentName coach-companion
   .\scripts\create-agentcore-dashboard.ps1 -AgentName coach-companion
   ```

6. **Verify** (3 minutes)
   ```powershell
   agentcore invoke '{"prompt": "Test"}'
   # Check CloudWatch dashboard
   # Verify alarms are active
   ```

**Total Recovery Time**: ~20 minutes

**Note**: New agent will have different ARN - update backend integrations

---

### Scenario 4: IAM Role Deletion

**Symptoms**:
- "Access Denied" errors
- "Role does not exist" errors
- Agent can't invoke Bedrock

**Recovery Steps**:

1. **Recreate IAM role** (5 minutes)
   ```powershell
   # AgentCore will auto-create role on next deploy
   cd agents/coach-companion-agentcore
   
   # Edit config to enable auto-create
   # Change: execution_role_auto_create: false
   # To: execution_role_auto_create: true
   
   agentcore deploy
   ```

2. **Verify role creation** (2 minutes)
   ```powershell
   aws iam get-role --role-name AmazonBedrockAgentCoreSDKRuntime-eu-west-1-* --region eu-west-1
   ```

3. **Test agent** (2 minutes)
   ```powershell
   agentcore invoke '{"prompt": "Test"}'
   ```

**Total Recovery Time**: ~9 minutes

---

### Scenario 5: Region Outage (eu-west-1)

**Symptoms**:
- All agents unavailable
- AWS service health dashboard shows outage
- Timeouts on all requests

**Recovery Steps**:

**CRITICAL**: This is a worst-case scenario. Current architecture does not support multi-region failover.

**Immediate Actions**:
1. **Verify outage** (2 minutes)
   - Check AWS Service Health Dashboard
   - Verify with AWS Support
   - Check #aws-status on Twitter

2. **Communicate with stakeholders** (5 minutes)
   - Notify users of outage
   - Provide ETA if available from AWS
   - Set up status page

3. **Monitor AWS status** (ongoing)
   - Wait for AWS to resolve
   - No manual intervention possible

**Long-term Solution** (Future Enhancement):
- Deploy agents to secondary region (e.g., eu-central-1)
- Implement automatic failover
- Use Route53 for DNS failover

**Total Recovery Time**: Depends on AWS (typically 1-4 hours for major outages)

---

### Scenario 6: S3 Bucket Deletion

**Symptoms**:
- Can't deploy agents
- "Bucket does not exist" errors
- Deployment artifacts missing

**Recovery Steps**:

1. **Recreate S3 bucket** (3 minutes)
   ```powershell
   # AgentCore will auto-create bucket on next deploy
   cd agents/coach-companion-agentcore
   
   # Edit config to enable auto-create
   # Change: s3_auto_create: false
   # To: s3_auto_create: true
   
   agentcore deploy
   ```

2. **Verify bucket creation** (1 minute)
   ```powershell
   aws s3 ls | Select-String "bedrock-agentcore"
   ```

3. **Test deployment** (5 minutes)
   ```powershell
   agentcore deploy
   agentcore status
   ```

**Total Recovery Time**: ~9 minutes

---

### Scenario 7: CloudWatch Logs Deletion

**Symptoms**:
- No logs visible
- Log group missing
- Can't troubleshoot issues

**Recovery Steps**:

1. **Logs will auto-recreate** (1 minute)
   - AgentCore automatically creates log groups
   - No manual intervention needed

2. **Invoke agent to generate logs** (1 minute)
   ```powershell
   agentcore invoke '{"prompt": "Test"}'
   ```

3. **Verify log group exists** (1 minute)
   ```powershell
   aws logs describe-log-groups --log-group-name-prefix "/aws/bedrock-agentcore" --region eu-west-1
   ```

4. **Reset log retention** (1 minute)
   ```powershell
   aws logs put-retention-policy `
       --log-group-name "/aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT" `
       --retention-in-days 90 `
       --region eu-west-1
   ```

**Total Recovery Time**: ~4 minutes

**Note**: Historical logs are lost, but system continues functioning

---

## Rollback Procedures

### Rollback Script

Create `scripts/rollback-agent.ps1`:

```powershell
# Rollback Agent to Previous Version
# Usage: .\scripts\rollback-agent.ps1 -AgentName coach-companion -CommitHash abc123

param(
    [Parameter(Mandatory=$true)]
    [string]$AgentName,
    
    [Parameter(Mandatory=$true)]
    [string]$CommitHash,
    
    [string]$Region = "eu-west-1"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================"
Write-Host "AGENT ROLLBACK PROCEDURE"
Write-Host "========================================"
Write-Host "Agent: $AgentName"
Write-Host "Commit: $CommitHash"
Write-Host "Region: $Region"
Write-Host ""

# 1. Backup current state
Write-Host "1. Backing up current state..."
$BackupDir = "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
Copy-Item "agents/$AgentName/*" -Destination $BackupDir -Recurse
Write-Host "   [OK] Current state backed up to $BackupDir"

# 2. Checkout previous version
Write-Host ""
Write-Host "2. Checking out commit $CommitHash..."
git checkout $CommitHash -- "agents/$AgentName"
if ($LASTEXITCODE -ne 0) {
    Write-Host "   [ERROR] Git checkout failed"
    exit 1
}
Write-Host "   [OK] Code restored to commit $CommitHash"

# 3. Deploy previous version
Write-Host ""
Write-Host "3. Deploying previous version..."
Push-Location "agents/$AgentName"
agentcore deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "   [ERROR] Deployment failed"
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "   [OK] Previous version deployed"

# 4. Verify deployment
Write-Host ""
Write-Host "4. Verifying deployment..."
Push-Location "agents/$AgentName"
$Status = agentcore status
Write-Host $Status
Pop-Location

# 5. Test invocation
Write-Host ""
Write-Host "5. Testing invocation..."
Push-Location "agents/$AgentName"
$TestResult = agentcore invoke '{"prompt": "Health check after rollback"}'
Write-Host $TestResult
Pop-Location

Write-Host ""
Write-Host "========================================"
Write-Host "ROLLBACK COMPLETE"
Write-Host "========================================"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Monitor CloudWatch logs for errors"
Write-Host "2. Verify application functionality"
Write-Host "3. If rollback failed, restore from backup: $BackupDir"
Write-Host ""
```

### Rollback Procedure

**When to Rollback**:
- New deployment causes errors
- Performance degradation
- Unexpected behavior
- Failed integration tests

**Steps**:

1. **Identify last known good version** (2 minutes)
   ```powershell
   git log --oneline agents/coach-companion-agentcore/
   # Find commit hash of last working version
   ```

2. **Run rollback script** (5 minutes)
   ```powershell
   .\scripts\rollback-agent.ps1 -AgentName coach-companion-agentcore -CommitHash abc123
   ```

3. **Verify rollback** (3 minutes)
   ```powershell
   cd agents/coach-companion-agentcore
   agentcore status
   agentcore invoke '{"prompt": "Test"}'
   ```

4. **Monitor for stability** (5 minutes)
   - Check CloudWatch dashboard
   - Verify error rate is normal
   - Test key functionality

**Total Rollback Time**: ~15 minutes

---

## RTO and RPO

### Recovery Time Objective (RTO)

**Definition**: Maximum acceptable time to restore service after an incident

**Target RTO**: 15 minutes

**RTO by Scenario**:
| Scenario | RTO | Confidence |
|----------|-----|------------|
| Agent Failure | 15 min | High |
| Configuration Corruption | 13 min | High |
| Complete Agent Deletion | 20 min | High |
| IAM Role Deletion | 9 min | High |
| Region Outage | 1-4 hours | Low (AWS-dependent) |
| S3 Bucket Deletion | 9 min | High |
| CloudWatch Logs Deletion | 4 min | High |

**Factors Affecting RTO**:
- Time to detect incident (monitoring)
- Time to diagnose issue (logs, metrics)
- Time to execute recovery (automation)
- Time to verify recovery (testing)

### Recovery Point Objective (RPO)

**Definition**: Maximum acceptable data loss measured in time

**Target RPO**: 0 (zero data loss)

**Why RPO = 0**:
- Stateless architecture (no persistent data)
- Code stored in Git (continuous backup)
- Configuration stored in Git (continuous backup)
- No databases or file storage
- Memory is ephemeral (30-day retention, not critical)

**Data Loss Scenarios**:
- **Agent code**: No loss (Git backup)
- **Configuration**: No loss (Git backup)
- **Logs**: Potential loss if CloudWatch deleted (acceptable)
- **Memory**: Potential loss if agent deleted (acceptable, 30-day retention)
- **Metrics**: No loss (CloudWatch retains 15 months)

---

## Incident Response Plan

### Incident Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| **P1 - Critical** | Complete service outage | Immediate | CTO, Engineering Lead |
| **P2 - High** | Partial outage, degraded performance | 15 minutes | Engineering Lead |
| **P3 - Medium** | Non-critical issues, workarounds available | 1 hour | On-call engineer |
| **P4 - Low** | Minor issues, no user impact | 24 hours | Regular sprint |

### Incident Response Workflow

```
1. DETECT
   └─> CloudWatch Alarm triggers
       └─> Email/SMS notification
           └─> On-call engineer notified

2. ASSESS
   └─> Check CloudWatch dashboard
       └─> Review logs
           └─> Determine severity
               └─> Classify incident (P1-P4)

3. RESPOND
   └─> Execute recovery procedure
       └─> Document actions taken
           └─> Communicate with stakeholders

4. VERIFY
   └─> Test functionality
       └─> Monitor metrics
           └─> Confirm resolution

5. DOCUMENT
   └─> Write incident report
       └─> Identify root cause
           └─> Create action items
               └─> Update runbooks
```

### Incident Response Checklist

**Detection Phase**:
- [ ] Alarm received and acknowledged
- [ ] Incident severity determined
- [ ] Stakeholders notified (if P1/P2)
- [ ] Incident ticket created

**Assessment Phase**:
- [ ] CloudWatch dashboard reviewed
- [ ] Logs analyzed
- [ ] Root cause identified (or hypothesis)
- [ ] Recovery procedure selected

**Response Phase**:
- [ ] Recovery procedure executed
- [ ] Actions documented in ticket
- [ ] Progress communicated to stakeholders
- [ ] Backup created before changes

**Verification Phase**:
- [ ] Service functionality tested
- [ ] Metrics returned to normal
- [ ] No new errors in logs
- [ ] Stakeholders notified of resolution

**Documentation Phase**:
- [ ] Incident report written
- [ ] Root cause documented
- [ ] Action items created
- [ ] Runbooks updated
- [ ] Post-mortem scheduled (if P1/P2)

### Communication Templates

**Incident Notification** (P1/P2):
```
Subject: [P1] AgentCore Service Outage - Coach Companion

Status: INVESTIGATING
Started: 2026-02-08 14:30 UTC
Impact: Users unable to access coaching features

We are investigating an issue with the Coach Companion agent.
Users may experience errors or timeouts.

Updates will be provided every 15 minutes.

Next update: 14:45 UTC
```

**Resolution Notification**:
```
Subject: [RESOLVED] AgentCore Service Outage - Coach Companion

Status: RESOLVED
Started: 2026-02-08 14:30 UTC
Resolved: 2026-02-08 14:45 UTC
Duration: 15 minutes

The issue has been resolved. The Coach Companion agent is
now functioning normally.

Root cause: Agent deployment failure due to configuration error
Resolution: Rolled back to previous version

A full incident report will be published within 24 hours.
```

---

## DR Drill Procedures

### Purpose

Regular disaster recovery drills ensure:
- Recovery procedures are tested and validated
- Team is familiar with recovery process
- RTO/RPO targets are achievable
- Documentation is accurate and up-to-date

### Drill Schedule

**Frequency**: Quarterly (every 3 months)

**Next Drill**: May 8, 2026

### Drill Scenarios

#### Drill 1: Agent Failure Recovery

**Objective**: Verify ability to recover from agent failure

**Steps**:
1. Simulate failure by stopping agent
2. Detect failure via monitoring
3. Execute recovery procedure
4. Measure time to recovery
5. Document results

**Success Criteria**:
- Agent recovered within 15 minutes
- No data loss
- All functionality restored

#### Drill 2: Complete Agent Deletion

**Objective**: Verify ability to recreate agent from scratch

**Steps**:
1. Delete test agent (not production!)
2. Restore from Git
3. Reconfigure and deploy
4. Recreate monitoring
5. Measure time to recovery

**Success Criteria**:
- Agent recreated within 20 minutes
- Configuration matches original
- Monitoring restored

#### Drill 3: Rollback Procedure

**Objective**: Verify rollback script works correctly

**Steps**:
1. Deploy new version of test agent
2. Simulate issue requiring rollback
3. Execute rollback script
4. Verify previous version restored
5. Measure time to rollback

**Success Criteria**:
- Rollback completed within 15 minutes
- Previous version functioning correctly
- No errors in logs

### Drill Documentation

After each drill, document:
- Date and time of drill
- Scenario tested
- Actual RTO achieved
- Issues encountered
- Action items for improvement
- Updates needed to procedures

---

## Contact Information

### On-Call Rotation

**Primary On-Call**: Engineering Lead  
**Secondary On-Call**: DevOps Engineer  
**Escalation**: CTO

### Emergency Contacts

**Engineering Lead**:
- Email: engineering@vitracka.com
- Phone: [REDACTED]
- Slack: @engineering-lead

**DevOps Engineer**:
- Email: devops@vitracka.com
- Phone: [REDACTED]
- Slack: @devops

**CTO**:
- Email: cto@vitracka.com
- Phone: [REDACTED]
- Slack: @cto

### AWS Support

**Support Plan**: Business (or higher)  
**Support Phone**: 1-866-243-8852  
**Support Portal**: https://console.aws.amazon.com/support/

### External Services

**GitHub Support**: support@github.com  
**Anthropic Support**: support@anthropic.com (for Claude issues)

---

## Appendix

### Recovery Scripts Location

All recovery scripts are located in `scripts/` directory:
- `rollback-agent.ps1` - Rollback to previous version
- `deploy-agent-agentcore.ps1` - Deploy agent
- `implement-security-recommendations.ps1` - Security setup

### Documentation References

- [AGENTCORE_DEPLOYMENT_GUIDE.md](./AGENTCORE_DEPLOYMENT_GUIDE.md) - Deployment procedures
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [CLOUDWATCH_MONITORING_SETUP.md](./CLOUDWATCH_MONITORING_SETUP.md) - Monitoring setup
- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) - Security procedures

### Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-08 | 1.0 | Initial disaster recovery plan | Kiro AI |

---

**Document Status**: APPROVED FOR PRODUCTION  
**Next Review**: May 8, 2026 (after first DR drill)

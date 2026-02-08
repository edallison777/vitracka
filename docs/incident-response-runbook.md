# Incident Response Runbook

**Project**: Vitracka AgentCore Deployment  
**Date**: February 8, 2026  
**Version**: 1.0

---

## Quick Reference

### Emergency Contacts

- **On-Call Engineer**: Check PagerDuty/Slack
- **Engineering Lead**: engineering@vitracka.com
- **AWS Support**: 1-866-243-8852

### Critical Links

- **CloudWatch Dashboard**: https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#gen-ai-observability/agent-core
- **AWS Console**: https://console.aws.amazon.com/bedrock/home?region=eu-west-1
- **Status Page**: https://status.vitracka.com (if available)

---

## Common Incidents

### 1. Agent Not Responding

**Symptoms**:
- Invocations timeout
- "Agent not found" errors
- CloudWatch alarm: "No invocations"

**Quick Fix**:
```powershell
# Check agent status
cd agents/coach-companion-agentcore
agentcore status

# If not READY, redeploy
agentcore deploy

# Test
agentcore invoke '{"prompt": "Health check"}'
```

**Escalate if**: Redeployment fails after 2 attempts

---

### 2. High Error Rate

**Symptoms**:
- CloudWatch alarm: "High error rate"
- Multiple failed invocations
- Errors in logs

**Quick Fix**:
```powershell
# Check recent errors
aws logs tail /aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT --region eu-west-1 --filter-pattern "ERROR" --since 10m

# If errors are code-related, rollback
.\scripts\rollback-agent.ps1 -AgentName coach-companion-agentcore -CommitHash <last-good-commit>

# If errors are AWS-related, check AWS status
# https://status.aws.amazon.com/
```

**Escalate if**: Error rate > 10% for > 15 minutes

---

### 3. High Latency

**Symptoms**:
- CloudWatch alarm: "High latency"
- Slow responses
- User complaints

**Quick Fix**:
```powershell
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics `
    --namespace AWS/Bedrock `
    --metric-name InvocationLatency `
    --dimensions Name=AgentId,Value=coach_companion-0ZUOP04U5z `
    --start-time $(Get-Date).AddHours(-1).ToUniversalTime().ToString("o") `
    --end-time $(Get-Date).ToUniversalTime().ToString("o") `
    --period 300 `
    --statistics Average,Maximum `
    --region eu-west-1

# Check for Bedrock throttling
aws logs tail /aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT --region eu-west-1 --filter-pattern "ThrottlingException" --since 1h
```

**Escalate if**: P95 latency > 120 seconds for > 30 minutes

---

### 4. Configuration Error

**Symptoms**:
- "Entrypoint not found"
- "Invalid configuration"
- Deployment fails

**Quick Fix**:
```powershell
# Restore configuration from Git
cd agents/coach-companion-agentcore
git checkout HEAD -- .bedrock_agentcore.yaml

# Verify absolute paths
cat .bedrock_agentcore.yaml | Select-String "entrypoint"

# Redeploy
agentcore deploy
```

**Escalate if**: Configuration restore doesn't fix issue

---

### 5. IAM Permission Error

**Symptoms**:
- "Access Denied"
- "UnauthorizedException"
- Can't invoke Bedrock

**Quick Fix**:
```powershell
# Check IAM role exists
aws iam get-role --role-name AmazonBedrockAgentCoreSDKRuntime-eu-west-1-cadf435b15

# If role missing, redeploy (will auto-create)
cd agents/coach-companion-agentcore
agentcore deploy
```

**Escalate if**: IAM issues persist after role recreation

---

### 6. Cost Alarm Triggered

**Symptoms**:
- CloudWatch alarm: "Daily cost exceeded"
- Unexpected high usage

**Quick Fix**:
```powershell
# Check current costs
.\scripts\daily-cost-report.ps1

# Check invocation count
aws cloudwatch get-metric-statistics `
    --namespace AWS/Bedrock `
    --metric-name Invocations `
    --dimensions Name=AgentId,Value=coach_companion-0ZUOP04U5z `
    --start-time $(Get-Date).AddDays(-1).ToUniversalTime().ToString("o") `
    --end-time $(Get-Date).ToUniversalTime().ToString("o") `
    --period 3600 `
    --statistics Sum `
    --region eu-west-1

# If abnormal, check for abuse or bugs
aws logs tail /aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT --region eu-west-1 --since 1h
```

**Escalate if**: Costs > $100/day or unexplained spike

---

### 7. Memory Resource Error

**Symptoms**:
- "Memory not found"
- Session errors
- Can't retrieve conversation history

**Quick Fix**:
```powershell
# Check memory resource
aws bedrock-agentcore get-memory `
    --memory-id coach_companion_mem-6MZHedDDWJ `
    --region eu-west-1

# If missing, redeploy (will recreate)
cd agents/coach-companion-agentcore
agentcore deploy
```

**Escalate if**: Memory issues persist after recreation

---

## Incident Response Workflow

### Phase 1: Detection (0-2 minutes)

1. **Receive Alert**
   - CloudWatch alarm email/SMS
   - User report
   - Monitoring dashboard

2. **Acknowledge**
   - Acknowledge alarm in CloudWatch
   - Post in #incidents Slack channel
   - Start incident timer

3. **Initial Assessment**
   - Check CloudWatch dashboard
   - Review recent deployments
   - Check AWS Service Health

### Phase 2: Triage (2-5 minutes)

1. **Determine Severity**
   - P1: Complete outage, all users affected
   - P2: Partial outage, degraded performance
   - P3: Minor issue, workaround available
   - P4: Cosmetic issue, no user impact

2. **Gather Information**
   - Check CloudWatch logs (last 15 minutes)
   - Check recent Git commits
   - Check recent deployments
   - Check AWS service status

3. **Identify Root Cause** (hypothesis)
   - Code change?
   - Configuration change?
   - AWS service issue?
   - Resource exhaustion?

### Phase 3: Response (5-15 minutes)

1. **Execute Fix**
   - Follow runbook for specific incident
   - Document all actions taken
   - Update incident ticket

2. **Communicate**
   - Post updates in #incidents
   - Update status page (if P1/P2)
   - Notify stakeholders

3. **Monitor**
   - Watch CloudWatch metrics
   - Check for new errors
   - Verify fix is working

### Phase 4: Verification (15-20 minutes)

1. **Test Functionality**
   - Test agent invocation
   - Verify response quality
   - Check error rate

2. **Monitor Stability**
   - Watch for 10-15 minutes
   - Ensure no new errors
   - Verify metrics are normal

3. **Confirm Resolution**
   - All tests passing
   - Metrics back to normal
   - No new errors

### Phase 5: Documentation (20-30 minutes)

1. **Update Incident Ticket**
   - Timeline of events
   - Actions taken
   - Root cause
   - Resolution

2. **Communicate Resolution**
   - Post in #incidents
   - Update status page
   - Notify stakeholders

3. **Schedule Post-Mortem** (if P1/P2)
   - Within 24-48 hours
   - Invite all stakeholders
   - Document lessons learned

---

## Escalation Paths

### P1 - Critical (Complete Outage)

**Immediate Actions**:
1. Acknowledge incident
2. Post in #incidents-critical
3. Page on-call engineer
4. Notify Engineering Lead
5. Start war room (Zoom/Slack)

**Escalation Timeline**:
- 0 min: On-call engineer
- 15 min: Engineering Lead
- 30 min: CTO
- 60 min: CEO (if customer-facing)

### P2 - High (Partial Outage)

**Immediate Actions**:
1. Acknowledge incident
2. Post in #incidents
3. Notify Engineering Lead
4. Start investigation

**Escalation Timeline**:
- 0 min: On-call engineer
- 30 min: Engineering Lead
- 60 min: CTO (if not resolved)

### P3 - Medium (Minor Issue)

**Immediate Actions**:
1. Acknowledge incident
2. Post in #incidents
3. Investigate during business hours

**Escalation Timeline**:
- 0 min: On-call engineer
- 2 hours: Engineering Lead (if needed)

### P4 - Low (Cosmetic)

**Immediate Actions**:
1. Create ticket
2. Add to sprint backlog
3. No immediate action needed

**Escalation Timeline**:
- None (handle in regular sprint)

---

## Communication Templates

### Incident Start (P1/P2)

**Slack #incidents**:
```
🚨 INCIDENT: [P1/P2] Agent Not Responding
Started: 2026-02-08 14:30 UTC
Impact: Users unable to access coaching features
Status: INVESTIGATING

Current actions:
- Checking CloudWatch logs
- Reviewing recent deployments
- Testing agent status

Next update: 14:45 UTC
Incident Commander: @engineer-name
```

### Incident Update

**Slack #incidents**:
```
📊 UPDATE: [P1] Agent Not Responding
Time: 14:45 UTC (15 min elapsed)
Status: IDENTIFIED

Root cause: Configuration error in recent deployment
Fix: Rolling back to previous version
ETA: 5 minutes

Next update: 15:00 UTC
```

### Incident Resolution

**Slack #incidents**:
```
✅ RESOLVED: [P1] Agent Not Responding
Started: 14:30 UTC
Resolved: 14:50 UTC
Duration: 20 minutes

Root cause: Configuration error in deployment
Resolution: Rolled back to previous version
Impact: ~100 users affected for 20 minutes

Post-mortem: Scheduled for 2026-02-09 10:00 UTC
Incident report: [link to ticket]
```

---

## Post-Incident Actions

### Immediate (Within 1 hour)

- [ ] Verify all systems are stable
- [ ] Update incident ticket with full details
- [ ] Notify all stakeholders of resolution
- [ ] Close CloudWatch alarms
- [ ] Update status page

### Short-term (Within 24 hours)

- [ ] Write incident report
- [ ] Schedule post-mortem (if P1/P2)
- [ ] Create action items for prevention
- [ ] Update runbooks if needed
- [ ] Review monitoring/alerting

### Long-term (Within 1 week)

- [ ] Conduct post-mortem
- [ ] Implement preventive measures
- [ ] Update documentation
- [ ] Train team on lessons learned
- [ ] Review incident response process

---

## Useful Commands

### Check Agent Status
```powershell
cd agents/coach-companion-agentcore
agentcore status
```

### View Recent Logs
```powershell
aws logs tail /aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT --follow --region eu-west-1
```

### Check Error Rate
```powershell
aws logs filter-log-events `
    --log-group-name "/aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT" `
    --filter-pattern "ERROR" `
    --start-time $((Get-Date).AddHours(-1).ToUniversalTime() | Get-Date -UFormat %s) `
    --region eu-west-1
```

### Check Invocation Count
```powershell
aws cloudwatch get-metric-statistics `
    --namespace AWS/Bedrock `
    --metric-name Invocations `
    --dimensions Name=AgentId,Value=coach_companion-0ZUOP04U5z `
    --start-time $(Get-Date).AddHours(-1).ToUniversalTime().ToString("o") `
    --end-time $(Get-Date).ToUniversalTime().ToString("o") `
    --period 300 `
    --statistics Sum `
    --region eu-west-1
```

### Rollback Agent
```powershell
.\scripts\rollback-agent.ps1 -AgentName coach-companion-agentcore -CommitHash <commit-hash>
```

### Redeploy Agent
```powershell
cd agents/coach-companion-agentcore
agentcore deploy
```

### Test Agent
```powershell
cd agents/coach-companion-agentcore
agentcore invoke '{"prompt": "Health check"}'
```

---

## Reference Documentation

- [DISASTER_RECOVERY_PLAN.md](../DISASTER_RECOVERY_PLAN.md) - Full DR procedures
- [AGENTCORE_DEPLOYMENT_GUIDE.md](../AGENTCORE_DEPLOYMENT_GUIDE.md) - Deployment guide
- [CLOUDWATCH_MONITORING_SETUP.md](../CLOUDWATCH_MONITORING_SETUP.md) - Monitoring setup
- [SECURITY_AUDIT.md](../SECURITY_AUDIT.md) - Security procedures

---

**Runbook Version**: 1.0  
**Last Updated**: February 8, 2026  
**Next Review**: May 8, 2026

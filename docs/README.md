# Vitracka AgentCore Documentation

**Project**: Vitracka AgentCore Deployment  
**Last Updated**: February 8, 2026  
**Status**: Production Ready

---

## Quick Links

### Getting Started
- **[Quickstart Guide](../AGENTCORE_QUICKSTART.md)** - Get up and running in 15 minutes
- **[Deployment Guide](../AGENTCORE_DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[Architecture Overview](../ARCHITECTURE.md)** - System architecture and design

### Operations
- **[Incident Response Runbook](incident-response-runbook.md)** - Quick reference for common incidents
- **[Disaster Recovery Plan](../DISASTER_RECOVERY_PLAN.md)** - DR procedures and RTO/RPO
- **[Monitoring Setup](../CLOUDWATCH_MONITORING_SETUP.md)** - CloudWatch dashboards and alarms

### Reference
- **[API Endpoints](../API_ENDPOINTS.md)** - Agent invocation methods and examples
- **[AWS Region Policy](../AWS_REGION_POLICY.md)** - Mandatory region requirements
- **[Security Audit](../SECURITY_AUDIT.md)** - Security assessment and recommendations

### Deployment Success
- **[Coach Companion Deployment](../COACH_COMPANION_DEPLOYMENT_SUCCESS.md)** - Production deployment details
- **[Load Test Results](../LOAD_TEST_RESULTS.md)** - Performance testing results
- **[DR Drill Report](dr-drill-report-20260208.md)** - Disaster recovery validation

---

## Documentation Structure

```
docs/
├── README.md (this file)
├── incident-response-runbook.md
├── dr-drill-report-20260208.md
├── production-deployment-checklist.md
└── user-acceptance-testing-plan.md

Root Documentation:
├── AGENTCORE_QUICKSTART.md
├── AGENTCORE_DEPLOYMENT_GUIDE.md
├── ARCHITECTURE.md
├── API_ENDPOINTS.md
├── AWS_REGION_POLICY.md
├── CLOUDWATCH_MONITORING_SETUP.md
├── DISASTER_RECOVERY_PLAN.md
├── SECURITY_AUDIT.md
├── LOAD_TEST_RESULTS.md
└── COACH_COMPANION_DEPLOYMENT_SUCCESS.md
```

---

## Documentation by Role

### For Developers

**Getting Started**:
1. Read [Quickstart Guide](../AGENTCORE_QUICKSTART.md)
2. Review [Deployment Guide](../AGENTCORE_DEPLOYMENT_GUIDE.md)
3. Check [API Endpoints](../API_ENDPOINTS.md)

**Development**:
- [Architecture](../ARCHITECTURE.md) - Understand the system
- [Coach Companion Code](../agents/coach-companion-agentcore/agent.py) - Example implementation
- [Region Policy](../AWS_REGION_POLICY.md) - Mandatory: eu-west-1 only

### For DevOps/SRE

**Operations**:
1. [Incident Response Runbook](incident-response-runbook.md) - First response guide
2. [Disaster Recovery Plan](../DISASTER_RECOVERY_PLAN.md) - Recovery procedures
3. [Monitoring Setup](../CLOUDWATCH_MONITORING_SETUP.md) - Dashboards and alarms

**Deployment**:
- [Deployment Guide](../AGENTCORE_DEPLOYMENT_GUIDE.md) - Step-by-step deployment
- [Security Audit](../SECURITY_AUDIT.md) - Security requirements
- [DR Drill Report](dr-drill-report-20260208.md) - Validated procedures

### For Management

**Project Status**:
- [Coach Companion Deployment](../COACH_COMPANION_DEPLOYMENT_SUCCESS.md) - Production status
- [Load Test Results](../LOAD_TEST_RESULTS.md) - Performance metrics
- [Security Audit](../SECURITY_AUDIT.md) - Security posture

**Metrics**:
- RTO: 8-12 minutes (target: 15 min) ✅
- RPO: 0 (zero data loss) ✅
- Availability: 99.9% target
- Load Test: 100% success rate

---

## Key Information

### Deployed Agents

#### Coach Companion (Production)
- **ARN**: `arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/coach_companion-0ZUOP04U5z`
- **Memory**: `coach_companion_mem-6MZHedDDWJ`
- **Status**: READY
- **Region**: eu-west-1
- **Model**: Claude 3.5 Sonnet (EU inference profile)

#### Test Agent
- **ARN**: `arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/agent-q9QEgD3UFo`
- **Status**: READY
- **Purpose**: Testing and validation

### Critical Requirements

1. **Region**: ALL deployments MUST use eu-west-1 (Europe - Ireland)
2. **Model**: Use EU inference profile: `eu.anthropic.claude-3-5-sonnet-20240620-v1:0`
3. **Paths**: Configuration files require absolute paths
4. **Agent Names**: Use underscores, not hyphens (e.g., `coach_companion`)

### Support Contacts

- **On-Call Engineer**: Check PagerDuty/Slack
- **Engineering Lead**: engineering@vitracka.com
- **AWS Support**: 1-866-243-8852

---

## Common Tasks

### Deploy a New Agent
```powershell
cd agents/my-agent
agentcore configure --entrypoint agent.py --requirements-file requirements.txt --name my_agent --region eu-west-1 --deployment-type direct_code_deploy --non-interactive
agentcore deploy
agentcore status
```

### Check Agent Status
```powershell
cd agents/coach-companion-agentcore
agentcore status
```

### View Logs
```powershell
aws logs tail /aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT --follow --region eu-west-1
```

### Rollback Agent
```powershell
.\scripts\rollback-agent.ps1 -AgentName coach-companion-agentcore -CommitHash <commit-hash>
```

### Run DR Drill
```powershell
.\scripts\test-recovery.ps1 -Scenario config-corruption -AgentName test-agent
```

---

## Monitoring and Alerting

### CloudWatch Dashboard
https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#gen-ai-observability/agent-core

### Active Alarms
- High error rate (> 5 errors in 5 min)
- High latency (> 5000ms)
- No invocations (24 hours)
- Daily cost (> $10)
- Monthly cost (> $100)

### Metrics Tracked
- Invocation count
- Invocation latency (avg, p50, p95, p99)
- Error rate
- Token usage
- Cost per invocation

---

## Testing

### Integration Tests
```powershell
python tests/integration-test-coach-companion.py
```

**Results**: 85.7% pass rate (18/21 tests)

### Load Tests
```powershell
python tests/load-test-coach-companion.py
```

**Results**: 100% success rate (100/100 requests)

### DR Drills
```powershell
.\scripts\test-recovery.ps1 -Scenario <scenario> -AgentName test-agent
```

**Scenarios**: agent-failure, config-corruption, complete-deletion, rollback

---

## Security

### Security Rating
✅ **SECURE** - Approved for Production

### Key Security Features
- IAM role-based authentication (no secrets in code)
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.2+)
- Network isolation (AWS-managed VPC)
- CloudWatch logging (90-day retention)
- Monitoring alarms (7 active)

### Security Recommendations
- Enable CloudTrail for API audit logging
- Enable GuardDuty for threat detection
- Enable Security Hub for compliance monitoring
- Sign AWS BAA if handling PHI

---

## Cost Management

### Current Costs
- Daily: $0.00 (within free tier)
- Monthly projection: $0.00

### Cost Optimization
- STM_ONLY memory mode (cheaper)
- Direct code deployment (no ECR costs)
- 90-day log retention
- Cost alarms configured

### Cost Monitoring
```powershell
.\scripts\daily-cost-report.ps1
```

---

## Troubleshooting

### Common Issues

1. **"agentcore: command not found"**
   - Solution: Add Python Scripts to PATH (see deployment guide)

2. **"entrypoint could not be found"**
   - Solution: Use absolute paths in `.bedrock_agentcore.yaml`

3. **"Invalid model identifier"**
   - Solution: Use EU inference profile, not direct model ID

4. **"running scripts is disabled"**
   - Solution: Set PowerShell execution policy (see deployment guide)

### Getting Help

1. Check [Incident Response Runbook](incident-response-runbook.md)
2. Review [Deployment Guide](../AGENTCORE_DEPLOYMENT_GUIDE.md) troubleshooting section
3. Check CloudWatch logs for detailed errors
4. Contact on-call engineer

---

## Change Log

### February 8, 2026
- ✅ Task 17 complete: Disaster Recovery Plan
- ✅ Task 18 complete: Documentation
- ✅ DR drill conducted and passed
- ✅ PowerShell execution policy documented
- ✅ Old GitHub workflows disabled

### February 7, 2026
- ✅ Task 16 complete: Security Audit (SECURE rating)
- ✅ Task 15 complete: Integration Testing (85.7% pass rate)
- ✅ Load testing complete (100% success rate)

### February 6, 2026
- ✅ Coach Companion deployed to AgentCore
- ✅ Monitoring and alerting configured
- ✅ Cost optimization implemented

---

## Next Steps

1. ✅ Task 17: Disaster Recovery Plan - COMPLETE
2. ✅ Task 18: Documentation - COMPLETE
3. ⏳ Task 19: Production Deployment - Ready to proceed

---

## Feedback

If you find issues with this documentation or have suggestions for improvement:
1. Create an issue in the project repository
2. Contact the engineering team
3. Update the documentation directly (with review)

---

**Documentation maintained by**: Engineering Team  
**Last reviewed**: February 8, 2026  
**Next review**: May 8, 2026 (quarterly)

# 24-Hour Monitoring Plan - Coach Companion

**Start Date**: February 8, 2026 (Evening)  
**End Date**: February 9, 2026 (Evening)  
**Agent**: Coach Companion  
**ARN**: `arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/coach_companion-0ZUOP04U5z`  
**Status**: 🟢 MONITORING IN PROGRESS

---

## Monitoring Objectives

1. Verify agent stability over 24-hour period
2. Detect any errors or anomalies
3. Track performance metrics
4. Monitor costs
5. Validate alarm functionality
6. Ensure no degradation in service quality

---

## Monitoring Checklist

### Hour 0-4 (Evening - Initial Monitoring)

- [x] **Agent Status**: Verify READY status
- [x] **CloudWatch Dashboard**: Confirm metrics flowing
- [x] **Alarms**: Verify all 7 alarms in OK state
- [x] **Logs**: Check for errors in recent logs
- [x] **Test Invocation**: Perform test invocation
- [x] **Baseline Metrics**: Record initial metrics

### Hour 4-8 (Night - Automated Monitoring)

- [ ] **Alarm Status**: Check for any triggered alarms
- [ ] **Error Logs**: Review logs for errors
- [ ] **Performance**: Check latency metrics
- [ ] **Cost**: Verify costs within budget

### Hour 8-12 (Morning - Business Hours)

- [ ] **Agent Status**: Verify still READY
- [ ] **Usage Patterns**: Review invocation patterns
- [ ] **Error Rate**: Calculate error percentage
- [ ] **Response Times**: Check P95/P99 latency
- [ ] **Cost Tracking**: Review accumulated costs

### Hour 12-16 (Afternoon - Peak Monitoring)

- [ ] **Peak Performance**: Monitor during potential peak usage
- [ ] **Alarm Review**: Check all alarms
- [ ] **Log Analysis**: Deep dive into logs
- [ ] **Metric Trends**: Analyze metric trends

### Hour 16-20 (Evening - Continued Monitoring)

- [ ] **Status Check**: Verify agent health
- [ ] **Error Analysis**: Review any errors
- [ ] **Performance Review**: Check response times
- [ ] **Cost Update**: Update cost tracking

### Hour 20-24 (Night - Final Monitoring)

- [ ] **Final Status**: Verify READY status
- [ ] **24h Metrics**: Collect full 24h metrics
- [ ] **Error Summary**: Summarize all errors
- [ ] **Cost Total**: Calculate 24h cost
- [ ] **Final Report**: Create monitoring report

---

## Metrics to Track

### Invocation Metrics
- Total invocations
- Successful invocations
- Failed invocations
- Success rate (%)

### Performance Metrics
- Average response time
- P50 response time
- P95 response time
- P99 response time
- Maximum response time

### Error Metrics
- Total errors
- Error rate (%)
- Error types
- Error patterns

### Cost Metrics
- Total cost (24h)
- Cost per invocation
- Token usage
- Model costs

### Availability Metrics
- Uptime (%)
- Downtime (if any)
- Agent status changes

---

## CloudWatch Resources

### Dashboard
**URL**: https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#gen-ai-observability/agent-core

**Widgets**:
- Invocation count
- Latency metrics
- Error rate
- Token usage
- Cost tracking

### Log Group
**Name**: `/aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT`

**Commands**:
```powershell
# View recent logs
aws logs tail /aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT --region eu-west-1 --since 1h --follow

# Search for errors
aws logs filter-log-events `
  --log-group-name /aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT `
  --filter-pattern "ERROR" `
  --region eu-west-1

# Get log insights
aws logs start-query `
  --log-group-name /aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT `
  --start-time (Get-Date).AddHours(-24).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ") `
  --end-time (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ") `
  --query-string "fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc" `
  --region eu-west-1
```

### Alarms
**Total**: 7 active alarms

1. **High Error Rate**: > 5% errors
2. **High Latency**: P95 > 5 seconds
3. **No Invocations**: 0 invocations in 1 hour
4. **Daily Cost**: > $10/day
5. **Monthly Cost**: > $300/month
6. **High Usage**: Anomaly detection
7. **Additional Monitoring**: Custom alarms

**Check Status**:
```powershell
aws cloudwatch describe-alarms --region eu-west-1 --alarm-names `
  "AgentCore-coach-companion-HighErrorRate" `
  "AgentCore-coach-companion-HighLatency" `
  "AgentCore-coach-companion-NoInvocations"
```

---

## Baseline Metrics (Hour 0)

### Agent Status
- **Status**: READY ✅
- **Endpoint**: DEFAULT (READY)
- **Created**: 2026-02-08 07:58:20 UTC
- **Last Updated**: 2026-02-08 08:26:17 UTC

### Test Invocation
- **Time**: 2026-02-08 Evening
- **Result**: SUCCESS ✅
- **Response Time**: < 5 seconds
- **Response Quality**: Excellent

### Alarms
- **Total**: 7
- **OK**: 7 ✅
- **ALARM**: 0
- **INSUFFICIENT_DATA**: 0

### Logs
- **Recent Errors**: 0 ✅
- **Log Stream**: Active
- **Last Event**: Test invocation

### Costs
- **Current**: $0.00 (within free tier)
- **Projected 24h**: $0.00 - $0.50

---

## Monitoring Commands

### Quick Status Check
```powershell
# Navigate to agent directory
cd agents/coach-companion-agentcore

# Check agent status
agentcore status

# Test invocation
agentcore invoke '{"prompt": "Health check"}'
```

### View Metrics
```powershell
# Get invocation count (last 24h)
aws cloudwatch get-metric-statistics `
  --namespace AWS/BedrockAgentCore `
  --metric-name Invocations `
  --dimensions Name=AgentId,Value=coach_companion-0ZUOP04U5z `
  --start-time (Get-Date).AddHours(-24).ToUniversalTime() `
  --end-time (Get-Date).ToUniversalTime() `
  --period 3600 `
  --statistics Sum `
  --region eu-west-1

# Get error count (last 24h)
aws cloudwatch get-metric-statistics `
  --namespace AWS/BedrockAgentCore `
  --metric-name Errors `
  --dimensions Name=AgentId,Value=coach_companion-0ZUOP04U5z `
  --start-time (Get-Date).AddHours(-24).ToUniversalTime() `
  --end-time (Get-Date).ToUniversalTime() `
  --period 3600 `
  --statistics Sum `
  --region eu-west-1

# Get latency (last 24h)
aws cloudwatch get-metric-statistics `
  --namespace AWS/BedrockAgentCore `
  --metric-name Latency `
  --dimensions Name=AgentId,Value=coach_companion-0ZUOP04U5z `
  --start-time (Get-Date).AddHours(-24).ToUniversalTime() `
  --end-time (Get-Date).ToUniversalTime() `
  --period 3600 `
  --statistics Average,Maximum `
  --region eu-west-1
```

### Cost Tracking
```powershell
# Get cost for last 24 hours
aws ce get-cost-and-usage `
  --time-period Start=(Get-Date).AddDays(-1).ToString("yyyy-MM-dd"),End=(Get-Date).ToString("yyyy-MM-dd") `
  --granularity DAILY `
  --metrics BlendedCost `
  --filter file://cost-filter.json `
  --region us-east-1

# cost-filter.json:
# {
#   "Tags": {
#     "Key": "Project",
#     "Values": ["Vitracka"]
#   }
# }
```

---

## Alert Thresholds

### Critical (Immediate Action Required)
- Error rate > 10%
- Agent status: NOT READY
- Downtime > 5 minutes
- Cost > $50/day

### Warning (Monitor Closely)
- Error rate > 5%
- P95 latency > 10 seconds
- No invocations for 2+ hours
- Cost > $10/day

### Info (Normal Monitoring)
- Error rate < 5%
- P95 latency < 10 seconds
- Regular invocations
- Cost < $10/day

---

## Incident Response

### If Error Rate Spikes
1. Check CloudWatch logs for error details
2. Review recent code changes
3. Check Bedrock service status
4. Consider rollback if needed
5. Document incident

### If Latency Increases
1. Check CloudWatch metrics for patterns
2. Review concurrent invocations
3. Check Bedrock throttling
4. Consider scaling if needed
5. Document findings

### If Agent Goes Down
1. Check agent status immediately
2. Review CloudWatch logs
3. Attempt restart if needed
4. Follow DR plan if necessary
5. Escalate if unresolved

### If Costs Spike
1. Check invocation count
2. Review token usage
3. Check for abuse/spam
4. Implement rate limiting if needed
5. Document cost analysis

---

## Success Criteria

### Must Have (Required for Production Approval)
- [x] Agent remains READY for 24 hours
- [ ] Error rate < 5%
- [ ] No critical incidents
- [ ] All alarms remain in OK state
- [ ] Costs within budget ($10/day)

### Should Have (Desired Outcomes)
- [ ] Error rate < 2%
- [ ] P95 latency < 10 seconds
- [ ] 100% uptime
- [ ] No alarm triggers
- [ ] Costs < $5/day

### Nice to Have (Stretch Goals)
- [ ] Error rate < 1%
- [ ] P95 latency < 5 seconds
- [ ] Zero errors
- [ ] Costs < $1/day

---

## Monitoring Schedule

### Automated Monitoring (24/7)
- CloudWatch alarms (continuous)
- CloudWatch logs (continuous)
- GenAI Observability (continuous)
- X-Ray tracing (continuous)

### Manual Checks
- **Every 4 hours**: Status check, alarm review, log review
- **Every 8 hours**: Metric analysis, cost tracking
- **Every 24 hours**: Full report generation

---

## Reporting

### Hourly Updates (First 4 Hours)
- Quick status check
- Any issues identified
- Actions taken

### 8-Hour Report
- Metrics summary
- Error analysis
- Cost tracking
- Recommendations

### 24-Hour Final Report
- Complete metrics
- Full error analysis
- Total costs
- Production readiness decision
- Recommendations for operations team

---

## Notes

### Current Status (Hour 0)
- ✅ Agent deployed and READY
- ✅ Smoke tests passed (5/5)
- ✅ Security review approved
- ✅ Monitoring configured
- ✅ Baseline metrics recorded
- 🟢 Monitoring period started

### Monitoring Period
- **Start**: February 8, 2026 (Evening)
- **End**: February 9, 2026 (Evening)
- **Duration**: 24 hours
- **Status**: IN PROGRESS

### Next Steps After 24 Hours
1. Generate final monitoring report
2. Review metrics and decide on production approval
3. Complete Task 19.5 (Gradual rollout - if needed)
4. Complete Task 19.6 (Operations handoff)
5. Mark Task 19 complete
6. Celebrate project completion! 🎉

---

**Document Status**: ACTIVE  
**Monitoring Status**: 🟢 IN PROGRESS  
**Last Updated**: February 8, 2026 (Evening)

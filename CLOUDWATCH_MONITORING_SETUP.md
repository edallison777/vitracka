# CloudWatch Monitoring Setup - Complete

**Date**: February 8, 2026  
**Status**: ✅ COMPLETE  
**Region**: eu-west-1

---

## Summary

Successfully configured comprehensive CloudWatch monitoring for AgentCore agents including dashboards, metric filters, and alarms.

## Dashboards Created

### 1. AgentCore-test-agent Dashboard
- **URL**: https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#dashboards:name=AgentCore-test-agent
- **Widgets**:
  - Invocation Rate (5min bins)
  - Completed Invocations (5min bins)
  - Error Rate (5min bins)
  - Recent Errors (last 10)
  - Recent Activity (last 20 log entries)
  - Hourly Invocation Trend
  - Total Invocations

### 2. AgentCore-coach-companion Dashboard
- **URL**: https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#dashboards:name=AgentCore-coach-companion
- **Widgets**: Same as test-agent dashboard

## Metric Filters Created

### Test Agent
- **Filter Name**: `TestAgentErrors`
- **Log Group**: `/aws/bedrock-agentcore/runtimes/agent-q9QEgD3UFo-DEFAULT`
- **Pattern**: `[time, request_id, level = ERROR*, ...]`
- **Metric**: `AgentCore/TestAgent/ErrorCount`

- **Filter Name**: `test-agent-Invocations`
- **Log Group**: `/aws/bedrock-agentcore/runtimes/agent-q9QEgD3UFo-DEFAULT`
- **Pattern**: `[...]` (all log entries)
- **Metric**: `AgentCore/TestAgent/InvocationCount`

### Coach Companion
- **Filter Name**: `CoachCompanionErrors`
- **Log Group**: `/aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT`
- **Pattern**: `[time, request_id, level = ERROR*, ...]`
- **Metric**: `AgentCore/CoachCompanion/ErrorCount`

- **Filter Name**: `coach-companion-Invocations`
- **Log Group**: `/aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT`
- **Pattern**: `[...]` (all log entries)
- **Metric**: `AgentCore/CoachCompanion/InvocationCount`

## CloudWatch Alarms Created

### Test Agent Alarms

1. **AgentCore-test-agent-HighErrorRate**
   - **Metric**: `AgentCore/TestAgent/ErrorCount`
   - **Threshold**: > 5 errors
   - **Period**: 5 minutes
   - **Evaluation Periods**: 2
   - **State**: OK
   - **Description**: Alerts when error count exceeds 5 in a 5-minute period

2. **AgentCore-test-agent-HighLatency**
   - **Metric**: `AWS/Bedrock/InvocationLatency`
   - **Threshold**: > 5000 ms (5 seconds)
   - **Period**: 5 minutes
   - **Evaluation Periods**: 2
   - **State**: OK
   - **Description**: Alerts when average latency exceeds 5 seconds

3. **AgentCore-test-agent-NoInvocations**
   - **Metric**: `AgentCore/TestAgent/InvocationCount`
   - **Threshold**: < 1 invocation
   - **Period**: 1 hour
   - **Evaluation Periods**: 1
   - **State**: ALARM (expected - no recent invocations)
   - **Description**: Alerts when no invocations detected for 1 hour

### Coach Companion Alarms

1. **AgentCore-coach-companion-HighErrorRate**
   - **Metric**: `AgentCore/CoachCompanion/ErrorCount`
   - **Threshold**: > 5 errors
   - **Period**: 5 minutes
   - **Evaluation Periods**: 2
   - **State**: OK

2. **AgentCore-coach-companion-HighLatency**
   - **Metric**: `AWS/Bedrock/InvocationLatency`
   - **Threshold**: > 5000 ms (5 seconds)
   - **Period**: 5 minutes
   - **Evaluation Periods**: 2
   - **State**: OK

3. **AgentCore-coach-companion-NoInvocations**
   - **Metric**: `AgentCore/CoachCompanion/InvocationCount`
   - **Threshold**: < 1 invocation
   - **Period**: 1 hour
   - **Evaluation Periods**: 1
   - **State**: ALARM (expected - no recent invocations)

## Scripts Created

### 1. create-agentcore-dashboard.ps1
Creates CloudWatch dashboards for AgentCore agents with log-based widgets.

**Usage**:
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/create-agentcore-dashboard.ps1 -AgentName "test-agent" -LogGroup "/aws/bedrock-agentcore/runtimes/agent-q9QEgD3UFo-DEFAULT"
```

### 2. create-agentcore-alarms.ps1
Creates CloudWatch alarms for error rates and no-invocation detection.

**Usage**:
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/create-agentcore-alarms.ps1
```

**With SNS notifications**:
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/create-agentcore-alarms.ps1 -SNSTopicArn "arn:aws:sns:eu-west-1:123456789012:my-topic"
```

### 3. test-agentcore-alarms.ps1
Tests and displays the status of all AgentCore alarms.

**Usage**:
```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/test-agentcore-alarms.ps1
```

## Monitoring Files

- `monitoring/test-agent-dashboard.json` - Dashboard definition for test-agent
- `monitoring/coach-companion-dashboard.json` - Dashboard definition for coach-companion

## Quick Access Links

### Dashboards
- Test Agent: https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#dashboards:name=AgentCore-test-agent
- Coach Companion: https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#dashboards:name=AgentCore-coach-companion

### Alarms
- All Alarms: https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#alarmsV2:

### Log Groups
- Test Agent: https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Fbedrock-agentcore$252Fruntimes$252Fagent-q9QEgD3UFo-DEFAULT
- Coach Companion: https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/$252Faws$252Fbedrock-agentcore$252Fruntimes$252Fcoach_companion-0ZUOP04U5z-DEFAULT

### GenAI Observability
- https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#gen-ai-observability/agent-core

## Viewing Logs

### Tail logs in real-time:
```powershell
# Test Agent
aws logs tail /aws/bedrock-agentcore/runtimes/agent-q9QEgD3UFo-DEFAULT --follow --region eu-west-1

# Coach Companion
aws logs tail /aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT --follow --region eu-west-1
```

### View recent logs:
```powershell
# Last hour
aws logs tail /aws/bedrock-agentcore/runtimes/agent-q9QEgD3UFo-DEFAULT --since 1h --region eu-west-1

# Last 30 minutes
aws logs tail /aws/bedrock-agentcore/runtimes/agent-q9QEgD3UFo-DEFAULT --since 30m --region eu-west-1
```

## Adding SNS Notifications

To receive email/SMS notifications when alarms trigger:

### 1. Create SNS Topic
```powershell
aws sns create-topic --name agentcore-alerts --region eu-west-1
```

### 2. Subscribe to Topic
```powershell
aws sns subscribe --topic-arn "arn:aws:sns:eu-west-1:732231126129:agentcore-alerts" --protocol email --notification-endpoint "your-email@example.com" --region eu-west-1
```

### 3. Confirm Subscription
Check your email and click the confirmation link.

### 4. Update Alarms
```powershell
# Update all alarms to use SNS topic
$topicArn = "arn:aws:sns:eu-west-1:732231126129:agentcore-alerts"

aws cloudwatch put-metric-alarm --alarm-name "AgentCore-test-agent-HighErrorRate" --alarm-actions $topicArn --region eu-west-1
aws cloudwatch put-metric-alarm --alarm-name "AgentCore-test-agent-HighLatency" --alarm-actions $topicArn --region eu-west-1
aws cloudwatch put-metric-alarm --alarm-name "AgentCore-coach-companion-HighErrorRate" --alarm-actions $topicArn --region eu-west-1
aws cloudwatch put-metric-alarm --alarm-name "AgentCore-coach-companion-HighLatency" --alarm-actions $topicArn --region eu-west-1
```

## Metrics Available

### AWS/Bedrock Namespace
- `Invocations` - Total number of model invocations
- `InvocationLatency` - Time taken for model invocations (milliseconds)
- `InvocationClientErrors` - Client-side errors
- `InputTokenCount` - Number of input tokens
- `OutputTokenCount` - Number of output tokens

### Custom Namespaces
- `AgentCore/TestAgent/ErrorCount` - Error count from logs
- `AgentCore/TestAgent/InvocationCount` - Invocation count from logs
- `AgentCore/CoachCompanion/ErrorCount` - Error count from logs
- `AgentCore/CoachCompanion/InvocationCount` - Invocation count from logs

## Troubleshooting

### Alarm in INSUFFICIENT_DATA state
- Wait 5-10 minutes for metrics to populate
- Invoke the agent to generate metrics
- Check that metric filters are correctly configured

### Alarm not triggering
- Verify threshold values are appropriate
- Check evaluation periods and period duration
- Ensure SNS topic is subscribed and confirmed

### Dashboard showing no data
- Verify log group names are correct
- Check that agents have been invoked recently
- Wait up to 10 minutes for GenAI Observability data

## Next Steps

1. ✅ Dashboards created and operational
2. ✅ Metric filters configured
3. ✅ Alarms created and tested
4. ⏳ Add SNS notifications (optional)
5. ⏳ Create cost monitoring alarms
6. ⏳ Set up automated daily reports

---

**Monitoring setup complete!** All agents now have comprehensive observability through CloudWatch.

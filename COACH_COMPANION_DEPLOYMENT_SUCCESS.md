# Coach Companion Agent - Deployment Success

**Date**: February 8, 2026  
**Status**: ✅ DEPLOYED AND OPERATIONAL  
**Region**: eu-west-1 (Europe - Ireland)

---

## Deployment Summary

Successfully deployed the Coach Companion AI agent to AWS Bedrock AgentCore Runtime in eu-west-1.

### Agent Details

- **Agent Name**: coach_companion
- **Agent ARN**: `arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/coach_companion-0ZUOP04U5z`
- **Deployment Type**: Direct Code Deploy (no Docker/ECR required)
- **Model**: Claude 3.5 Sonnet (EU inference profile: `eu.anthropic.claude-3-5-sonnet-20240620-v1:0`)
- **Region**: eu-west-1 ✓
- **Status**: READY and responding

### Resources Created

1. **Memory Resource**: `coach_companion_mem-6MZHedDDWJ` (STM only, 30-day retention)
2. **IAM Role**: `AmazonBedrockAgentCoreSDKRuntime-eu-west-1-cadf435b15`
3. **S3 Bucket**: `bedrock-agentcore-codebuild-sources-732231126129-eu-west-1`
4. **CloudWatch Logs**: `/aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT`
5. **Observability**: GenAI Observability enabled

---

## Key Issues Resolved

### 1. PATH Issue (SOLVED)
**Problem**: `agentcore` command not found  
**Solution**: Added `C:\Users\j_e_a\AppData\Roaming\Python\Python312\Scripts` to User PATH permanently

### 2. Entrypoint Error (SOLVED)
**Problem**: "The specified entrypoint could not be found or accessed in your artifact"  
**Root Cause**: Configuration needed absolute paths for both `entrypoint` and `source_path`  
**Solution**: Updated `.bedrock_agentcore.yaml` to use:
- `entrypoint: C:/Users/j_e_a/OneDrive/Projects/Vitracka-new/agents/coach-companion-agentcore/agent.py`
- `source_path: C:\Users\j_e_a\OneDrive\Projects\Vitracka-new\agents\coach-companion-agentcore`

### 3. Model ID Issues (SOLVED)
**Problem**: Invalid model identifier errors  
**Root Cause**: eu-west-1 requires inference profiles, not direct model IDs  
**Solution**: Used EU inference profile: `eu.anthropic.claude-3-5-sonnet-20240620-v1:0`

### 4. Missing Dependencies (SOLVED)
**Problem**: Agent code needed Strands SDK and AgentCore SDK  
**Solution**: Added proper requirements.txt with:
- `strands-agents>=0.1.0`
- `bedrock-agentcore>=0.1.0`
- `boto3>=1.34.0`

### 5. Handler Structure (SOLVED)
**Problem**: AgentCore couldn't find the handler function  
**Solution**: Used `@app.entrypoint` decorator and `BedrockAgentCoreApp()` pattern from test-agent

---

## Testing

### Test Invocation
```powershell
cd agents/coach-companion-agentcore
agentcore invoke '{"prompt": "I need some motivation today"}'
```

### Test Response
```
Response:
{
    'role': 'assistant',
    'content': [
        {
            'text': "I understand you're looking for some motivation today. Remember, every small step you take is progress, and you're doing great just by showing up and asking for support. What's one small, achievable action you could take today that would make you feel good about yourself? Let's focus on that and celebrate your effort. You've got this!"
        }
    ]
}
```

✅ Agent is responding with appropriate coaching messages!

---

## Agent Features

The coach companion agent includes:

1. **Adaptive Coaching Styles**: Gentle, pragmatic, upbeat, and structured
2. **GLP-1 Medication Awareness**: Specialized coaching for users on GLP-1 medications
3. **Shame-Free Language**: Positive reframing and supportive messaging
4. **Goal-Aware**: Tailored to weight loss, maintenance, or transition goals
5. **Gamification Sensitivity**: Adjusts competitive language based on preferences

---

## Quick Commands

### Check Status
```powershell
cd agents/coach-companion-agentcore
agentcore status
```

### Invoke Agent
```powershell
cd agents/coach-companion-agentcore
agentcore invoke '{"prompt": "Your message here"}'
```

### View Logs
```powershell
aws logs tail /aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT --log-stream-name-prefix "2026/02/08/[runtime-logs" --follow --region eu-west-1
```

### Redeploy
```powershell
cd agents/coach-companion-agentcore
agentcore deploy
```

### Destroy (if needed)
```powershell
cd agents/coach-companion-agentcore
agentcore destroy
```

---

## Monitoring

### CloudWatch Dashboard
https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#gen-ai-observability/agent-core

### Metrics to Track
- Invocation count
- Latency (avg, p50, p95, p99)
- Error rate
- Token usage
- Cost per invocation

---

## Cost Estimate

Based on test-agent usage:
- **Daily invocations**: ~11
- **Estimated daily cost**: ~$0.05
- **Monthly projection**: ~$1.50

Coach companion will likely have higher usage in production.

---

## Files Created/Modified

### New Files
- `agents/coach-companion-agentcore/agent.py` - Main agent code
- `agents/coach-companion-agentcore/requirements.txt` - Dependencies
- `agents/coach-companion-agentcore/README.md` - Documentation
- `agents/coach-companion-agentcore/.bedrock_agentcore.yaml` - Configuration
- `scripts/deploy-coach-companion.ps1` - Deployment helper script
- `scripts/fix-python-path-permanent.ps1` - PATH fix script

### Modified Files
- None (all new agent-specific files)

---

## Next Steps

### Immediate
1. ✅ Agent deployed and tested
2. ⏳ Create CloudWatch dashboard for coach companion (similar to test-agent)
3. ⏳ Set up cost monitoring alarms
4. ⏳ Integration testing with real user scenarios

### Future
1. Deploy to production environment
2. Load testing (100 concurrent users)
3. Security audit
4. Documentation completion
5. Handoff to operations team

---

## Lessons Learned

1. **AgentCore requires absolute paths** in configuration for both entrypoint and source_path
2. **eu-west-1 requires inference profiles** - cannot use direct model IDs
3. **PATH issues persist across sessions** - need permanent User PATH modification
4. **Direct code deployment is simpler** than container deployment (no Docker/ECR needed)
5. **@app.entrypoint decorator is required** for AgentCore to find the handler

---

## Support

### Documentation
- AgentCore Docs: https://docs.aws.amazon.com/bedrock/latest/userguide/agents-agentcore.html
- Strands SDK: https://github.com/awslabs/strands-agents

### Troubleshooting
- Check logs: `aws logs tail /aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT --follow --region eu-west-1`
- Check status: `agentcore status`
- Verify region: All resources MUST be in eu-west-1

---

**Deployment completed successfully on February 8, 2026 at 08:30 UTC**


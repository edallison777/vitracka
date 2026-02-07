# AWS Bedrock AgentCore Deployment Guide
## Vitracka Weight Management System

This guide covers deploying Strands agents to AWS Bedrock AgentCore Runtime, which provides serverless, auto-scaling agent hosting.

---

## Why AgentCore?

✅ **Serverless** - No infrastructure to manage
✅ **Auto-scaling** - Handles thousands of concurrent sessions
✅ **Session isolation** - Dedicated microVMs for security
✅ **Built-in observability** - CloudWatch integration
✅ **Pay-per-use** - Only pay for actual agent invocations
✅ **Session persistence** - Maintains conversation state

---

## Prerequisites

### 1. Install AgentCore Starter Toolkit

```bash
pip install bedrock-agentcore-starter-toolkit
```

### 2. Install AgentCore Runtime SDK

```bash
pip install bedrock-agentcore-runtime
```

### 3. Verify AWS Credentials

```bash
aws sts get-caller-identity
```

---

## Phase 1: Test Agent Deployment

**IMPORTANT**: Deploy the test agent first to validate the pipeline before deploying production agents.

### Step 1: Test Locally

```bash
cd agents/test-agent
pip install -r requirements.txt
python agent.py
```

Expected output:
```
Testing agent locally...
Agent response: Hello from AgentCore! [cheerful message]
✓ Local test passed!
```

### Step 2: Build Docker Image

#### Option A: Local Build (if Docker supports ARM64)

Check if your Docker supports ARM64:
```bash
docker buildx ls
```

If supported:
```bash
cd agents/test-agent
docker buildx create --use
docker buildx build --platform linux/arm64 -t test-agent:latest .
```

#### Option B: AWS CodeBuild (Recommended for Windows)

1. **Create ECR Repository**:
```bash
aws ecr create-repository --repository-name vitracka-test-agent --region us-east-1
```

2. **Create CodeBuild Project**:
```bash
aws codebuild create-project \
  --name vitracka-test-agent-build \
  --source type=LOCAL,location=agents/test-agent \
  --artifacts type=NO_ARTIFACTS \
  --environment type=ARM_CONTAINER,image=aws/codebuild/amazonlinux2-aarch64-standard:3.0,computeType=BUILD_GENERAL1_SMALL \
  --service-role arn:aws:iam::732231126129:role/CodeBuildServiceRole \
  --region us-east-1
```

3. **Start Build**:
```bash
aws codebuild start-build --project-name vitracka-test-agent-build
```

4. **Monitor Build**:
```bash
aws codebuild batch-get-builds --ids <build-id>
```

### Step 3: Deploy to AgentCore

#### Using AgentCore Starter Toolkit

```bash
cd agents/test-agent

# Test locally first (optional)
agentcore launch --local

# Deploy to AWS
agentcore launch
```

The toolkit will:
1. Package your agent code
2. Build ARM64 container image
3. Push to ECR
4. Create AgentCore Runtime
5. Configure IAM roles
6. Set up CloudWatch logging

#### Manual Deployment (Alternative)

```python
import boto3

client = boto3.client('bedrock-agentcore-runtime', region_name='us-east-1')

response = client.create_agent_runtime(
    agentName='test-agent',
    description='Test agent for deployment validation',
    containerImage='732231126129.dkr.ecr.us-east-1.amazonaws.com/vitracka-test-agent:latest',
    executionRoleArn='arn:aws:iam::732231126129:role/AgentCoreExecutionRole'
)

agent_id = response['agentId']
print(f"Agent deployed! ID: {agent_id}")
```

### Step 4: Test Deployment

```python
import boto3

client = boto3.client('bedrock-agentcore-runtime', region_name='us-east-1')

response = client.invoke_agent(
    agentId='<your-agent-id>',
    input={'prompt': 'Hello, test agent!'}
)

print(response['output'])
```

Expected output:
```
Hello from AgentCore! [cheerful message]
```

### Step 5: Verify in CloudWatch

```bash
# View logs
aws logs tail /aws/bedrock-agentcore/test-agent --follow
```

---

## Phase 2: Production Agent Deployment

Once the test agent works, deploy the Coach Companion agent:

### Step 1: Update Coach Companion for AgentCore

Modify `agents/coach-companion/app.py`:

```python
from bedrock_agentcore_runtime import BedrockAgentCoreApp
from agent import CoachCompanionAgent

# Create the agent
coach_agent = CoachCompanionAgent()

# Wrap for AgentCore Runtime
app = BedrockAgentCoreApp(
    agent=coach_agent.agent,
    name="coach-companion",
    description="AI-powered weight management coaching with safety-first approach"
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
```

### Step 2: Add Dockerfile

```dockerfile
FROM --platform=$TARGETPLATFORM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir bedrock-agentcore-runtime

COPY agent.py .
COPY app.py .

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/ping')" || exit 1

CMD ["python", "app.py"]
```

### Step 3: Deploy

```bash
cd agents/coach-companion
agentcore launch
```

---

## Troubleshooting

### Issue: Docker doesn't support ARM64 on Windows

**Solution**: Use AWS CodeBuild (Option B above)

### Issue: "Platform not supported" error

**Solution**: Ensure you're using CodeBuild with ARM_CONTAINER environment type

### Issue: Agent fails to start

**Solution**: Check CloudWatch logs:
```bash
aws logs tail /aws/bedrock-agentcore/<agent-name> --follow
```

### Issue: Import errors in container

**Solution**: Verify all dependencies are in requirements.txt and Dockerfile installs them

---

## Cost Estimation

AgentCore Runtime pricing (pay-per-use):
- **Per invocation**: ~$0.0001 - $0.001 (depending on duration)
- **Session storage**: ~$0.10/GB-month
- **No baseline costs** - only pay when agents are invoked

**Example**: 10,000 invocations/month = ~$1-10/month

Much cheaper than running ECS Fargate 24/7!

---

## Monitoring and Observability

### Enable CloudWatch Observability

```bash
# Enable transaction search (one-time setup)
aws cloudwatch enable-transaction-search --region us-east-1
```

### View Metrics

1. Open CloudWatch Console
2. Navigate to "GenAI Observability"
3. Find your agent service
4. View traces, metrics, and logs

### Key Metrics to Monitor

- **Invocation count**: Number of agent calls
- **Latency**: Response time (p50, p95, p99)
- **Error rate**: Failed invocations
- **Token usage**: LLM token consumption
- **Session duration**: How long conversations last

---

## Next Steps

1. ✅ Deploy test agent
2. ✅ Verify test agent works
3. ✅ Deploy Coach Companion agent
4. Configure auto-scaling policies
5. Set up CloudWatch alarms
6. Integrate with mobile app
7. Begin user acceptance testing

---

## Rollback Procedure

If something goes wrong:

```bash
# Delete agent runtime
aws bedrock-agentcore-runtime delete-agent-runtime --agent-id <agent-id>

# Delete ECR images
aws ecr batch-delete-image \
  --repository-name vitracka-test-agent \
  --image-ids imageTag=latest
```

---

## Support Resources

- **AgentCore Documentation**: https://docs.aws.amazon.com/bedrock-agentcore/
- **Strands Documentation**: https://strandsagents.com/
- **AWS Support**: Use AWS Console support center

---

**Ready to deploy?** Start with the test agent in Phase 1!

# AgentCore Runtime Quick Start Guide

## Overview

This guide will help you deploy the test agent to AWS Bedrock AgentCore Runtime in ~15 minutes.

**Why AgentCore Runtime?**
- ✅ Serverless, auto-scaling
- ✅ ARM64 architecture (Graviton2)
- ✅ Pay-per-use (~$1-10/month vs ~$260/month for ECS)
- ✅ Built-in session management
- ✅ Integrated observability

---

## Prerequisites (5 minutes)

### 1. Install Python Dependencies

```powershell
# Install AgentCore tools
pip install bedrock-agentcore-starter-toolkit
pip install bedrock-agentcore-runtime

# Verify installation
agentcore --version
```

### 2. Verify AWS Access

```powershell
# Check credentials
aws sts get-caller-identity

# Verify Bedrock model access
aws bedrock list-foundation-models --region us-east-1 --query "modelSummaries[?modelId=='anthropic.claude-3-5-sonnet-20241022-v2:0']"
```

### 3. Enable CloudWatch GenAI Observability

```powershell
# One-time setup
aws cloudwatch enable-transaction-search --region us-east-1
```

---

## Deploy Test Agent (10 minutes)

### Option 1: Automated Deployment (Recommended)

```powershell
# Run the deployment script
./scripts/deploy-agent-agentcore.ps1 `
  -AgentName test-agent `
  -AgentPath agents/test-agent `
  -Region us-east-1
```

The script will:
1. ✅ Validate prerequisites
2. ✅ Test agent locally
3. ✅ Build ARM64 Docker image
4. ✅ Push to ECR
5. ✅ Deploy to AgentCore Runtime
6. ✅ Test invocation

### Option 2: Manual Deployment

#### Step 1: Test Locally

```powershell
cd agents/test-agent
python test_agent.py
```

Expected output:
```
Testing agent locally...
Agent response: Hello from AgentCore! [cheerful message]
✓ Local test passed!
```

#### Step 2: Build ARM64 Image

```powershell
# Build for ARM64 (AgentCore requirement)
docker buildx build --platform linux/arm64 -t test-agent:latest --load .
```

#### Step 3: Push to ECR

```powershell
# Get account ID
$accountId = aws sts get-caller-identity --query Account --output text

# Create ECR repository
aws ecr create-repository --repository-name vitracka/test-agent --region us-east-1

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin "${accountId}.dkr.ecr.us-east-1.amazonaws.com"

# Tag and push
docker tag test-agent:latest "${accountId}.dkr.ecr.us-east-1.amazonaws.com/vitracka/test-agent:latest"
docker push "${accountId}.dkr.ecr.us-east-1.amazonaws.com/vitracka/test-agent:latest"
```

#### Step 4: Deploy to AgentCore

```powershell
cd agents/test-agent
agentcore launch --region us-east-1
```

Or use Python SDK:

```python
import boto3

client = boto3.client('bedrock-agentcore-runtime', region_name='us-east-1')

response = client.create_agent_runtime(
    agentName='test-agent',
    description='Test agent for deployment validation',
    containerImage='<account-id>.dkr.ecr.us-east-1.amazonaws.com/vitracka/test-agent:latest',
    modelId='anthropic.claude-3-5-sonnet-20241022-v2:0',
    executionRoleArn='arn:aws:iam::<account-id>:role/AgentCoreExecutionRole'
)

print(f"Agent deployed! ID: {response['agentId']}")
```

#### Step 5: Test Invocation

```python
import boto3

client = boto3.client('bedrock-agentcore-runtime', region_name='us-east-1')

response = client.invoke_agent(
    agentId='<your-agent-id>',
    input={'prompt': 'Hello, test agent!'}
)

print(response['output'])
```

---

## Verify Deployment

### Check CloudWatch Logs

```powershell
# View agent logs
aws logs tail /aws/bedrock-agentcore/test-agent --follow
```

### Check GenAI Observability

1. Open AWS CloudWatch Console
2. Navigate to "GenAI Observability"
3. Find your agent service
4. View traces, metrics, and logs

### Monitor Costs

```powershell
# Check current costs
./scripts/check-aws-costs.ps1
```

---

## Troubleshooting

### Issue: "AgentCore CLI not found"

**Solution**: Install the toolkit
```powershell
pip install bedrock-agentcore-starter-toolkit
```

### Issue: "Docker buildx not available"

**Solution**: Enable buildx
```powershell
docker buildx create --use
docker buildx ls
```

### Issue: "Model access denied"

**Solution**: Request Bedrock model access
1. Open AWS Bedrock Console
2. Go to "Model access"
3. Request access to Claude 3.5 Sonnet
4. Wait for approval (~5 minutes)

### Issue: "Agent fails to start"

**Solution**: Check CloudWatch logs
```powershell
aws logs tail /aws/bedrock-agentcore/test-agent --follow
```

Common causes:
- Missing dependencies in requirements.txt
- Incorrect Dockerfile configuration
- IAM role permissions issues

---

## Cost Management

### Current Costs

AgentCore Runtime is **pay-per-use**:
- Per invocation: ~$0.0001 - $0.001
- Session storage: ~$0.10/GB-month
- **No baseline costs** when not in use

### Example Costs

- 1,000 invocations/month: ~$1-10/month
- 10,000 invocations/month: ~$10-100/month
- 100,000 invocations/month: ~$100-500/month

**Much cheaper than ECS Fargate 24/7 (~$260/month)**

### No Need to "Stop" Agents

Unlike ECS, you don't need to stop AgentCore agents to save costs. You only pay when they're invoked!

---

## Next Steps

Once the test agent is working:

1. ✅ **Task 5 Complete**: AgentCore prerequisites set up
2. ✅ **Task 6 Complete**: Test agent deployed
3. ⏳ **Task 7**: Set up CloudWatch monitoring
4. ⏳ **Task 8**: Complete automation script testing
5. ⏳ **Deploy Coach Companion**: Production agent deployment

---

## Quick Reference

### Deployment Command

```powershell
./scripts/deploy-agent-agentcore.ps1 -AgentName test-agent -AgentPath agents/test-agent
```

### View Logs

```powershell
aws logs tail /aws/bedrock-agentcore/test-agent --follow
```

### Test Invocation

```python
import boto3
client = boto3.client('bedrock-agentcore-runtime', region_name='us-east-1')
response = client.invoke_agent(agentId='<id>', input={'prompt': 'Hello!'})
print(response['output'])
```

### Check Costs

```powershell
./scripts/check-aws-costs.ps1
```

---

**Ready to deploy?** Run the automated script and you'll be done in 10 minutes! 🚀

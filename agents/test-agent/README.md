# Test Agent for AgentCore Deployment

This is a minimal test agent used to validate the AWS Bedrock AgentCore deployment pipeline before deploying production agents.

## Purpose

- Validate ARM64 Docker builds work correctly
- Test AgentCore Runtime deployment process
- Verify AWS credentials and permissions
- Confirm agent invocation works end-to-end

## Local Testing

```bash
# Install dependencies
pip install -r requirements.txt

# Test agent locally
python agent.py
```

## Build for AgentCore (ARM64)

### Option A: Using Docker Buildx (if supported on Windows)

```bash
# Enable buildx
docker buildx create --use

# Build for ARM64
docker buildx build --platform linux/arm64 -t test-agent:latest .
```

### Option B: Using AWS CodeBuild (recommended for Windows)

See `buildspec.yml` for automated ARM64 builds in AWS.

## Deploy to AgentCore

```bash
# Using AgentCore Starter Toolkit
agentcore launch --local  # Test locally first
agentcore launch          # Deploy to AWS
```

## Test Deployment

```python
import boto3

client = boto3.client('bedrock-agentcore-runtime', region_name='us-east-1')

response = client.invoke_agent(
    agentId='your-agent-id',
    input={'prompt': 'Hello!'}
)

print(response['output'])
```

## Success Criteria

✅ Agent builds successfully for ARM64
✅ Agent deploys to AgentCore Runtime
✅ Agent responds to invocations
✅ No errors in CloudWatch logs

Once this test agent works, we can deploy the production Coach Companion agent with confidence.

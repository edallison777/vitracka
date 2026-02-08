# Coach Companion Agent - AgentCore Runtime

AI-powered adaptive coaching agent deployed on AWS Bedrock AgentCore Runtime.

## Features

- **Adaptive Coaching Styles**: Gentle, pragmatic, upbeat, and structured
- **GLP-1 Medication Awareness**: Specialized coaching for users on GLP-1 medications
- **Shame-Free Language**: Positive reframing and supportive messaging
- **Goal-Aware**: Tailored to weight loss, maintenance, or transition goals
- **Gamification Sensitivity**: Adjusts competitive language based on preferences

## Deployment

This agent is designed for AWS Bedrock AgentCore Runtime deployment.

### Prerequisites

- AWS CLI configured
- AgentCore CLI installed: `pip install bedrock-agentcore-starter-toolkit`
- AWS Bedrock access with Claude 3.5 Sonnet enabled
- Region: **eu-west-1** (MANDATORY - see AWS_REGION_POLICY.md)

### Deploy to AgentCore

```powershell
# Configure agent
cd agents/coach-companion-agentcore
agentcore configure --entrypoint agent.py --name coach-companion --region eu-west-1 --deployment-type direct_code_deploy --non-interactive

# Deploy
agentcore deploy

# Check status
agentcore status

# Test
agentcore invoke '{"prompt": "Hello, I need some motivation today"}'
```

### Test Locally

```powershell
python agent.py
```

## API Usage

### Basic Invocation

```json
{
  "prompt": "I'm feeling discouraged about my progress"
}
```

### With User Context

```json
{
  "prompt": "I had a setback today",
  "user_context": {
    "coaching_style": "gentle",
    "on_glp1": false,
    "goal_type": "loss",
    "gamification_preference": "moderate"
  }
}
```

## Configuration

### Coaching Styles

- **gentle**: Soft, nurturing, emphasizes self-compassion
- **pragmatic**: Direct, data-focused, practical strategies
- **upbeat**: Enthusiastic, celebratory, positive energy
- **structured**: Organized, systematic, methodical

### User Context Parameters

- `coaching_style`: "gentle" | "pragmatic" | "upbeat" | "structured"
- `on_glp1`: boolean - Whether user is on GLP-1 medication
- `goal_type`: "loss" | "maintenance" | "transition"
- `gamification_preference`: "high" | "moderate" | "low"

## Architecture

```
┌─────────────────┐
│  Node.js API    │
│  (TypeScript)   │
└────────┬────────┘
         │ AWS SDK
         ▼
┌─────────────────┐
│  AgentCore      │
│  Runtime        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AWS Bedrock    │
│  Claude 3.5     │
└─────────────────┘
```

## Monitoring

View logs:
```powershell
aws logs tail /aws/bedrock-agentcore/runtimes/<agent-id>-DEFAULT --follow --region eu-west-1
```

View dashboard:
- https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#gen-ai-observability/agent-core

## Cost Optimization

- Agent uses direct code deployment (no Docker/ECR costs)
- Bedrock charges per token usage
- Use `agentcore destroy` when not in use to avoid idle costs

## Troubleshooting

### "Access denied to model"
- Verify Bedrock model access in AWS Console
- Ensure Claude 3.5 Sonnet is enabled for your account

### "Region mismatch"
- All deployments MUST use eu-west-1
- See AWS_REGION_POLICY.md for details

## Development

This is a simplified AgentCore-compatible version. The original Strands SDK version is in `agents/coach-companion/`.

## License

Part of the Vitracka Weight Management System.

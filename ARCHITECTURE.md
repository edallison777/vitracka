# AgentCore Architecture

**Project**: Vitracka AgentCore Deployment  
**Date**: February 8, 2026  
**Region**: eu-west-1

---

## System Overview

The Vitracka AgentCore deployment uses AWS Bedrock AgentCore Runtime for serverless AI agent execution, with Claude 3.5 Sonnet as the foundation model.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Mobile App (React Native)                     │
│                  - iOS & Android                                 │
│                  - User Interface                                │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Node.js Backend (TypeScript/Express)                │
│  - REST API                                                      │
│  - Authentication                                                │
│  - Business Logic                                                │
└────────────────────────┬────────────────────────────────────────┘
                         │ AWS SDK (boto3/JavaScript SDK)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           AWS Bedrock AgentCore Runtime (eu-west-1)              │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │   test-agent     │         │ coach-companion  │             │
│  │   (Testing)      │         │   (Production)   │             │
│  │                  │         │                  │             │
│  │ - Python 3.12    │         │ - Python 3.12    │             │
│  │ - Strands SDK    │         │ - Strands SDK    │             │
│  │ - Direct Deploy  │         │ - Direct Deploy  │             │
│  └──────────────────┘         └──────────────────┘             │
└────────────────────────┬────────────────────────────────────────┘
                         │ Bedrock API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         AWS Bedrock - Claude 3.5 Sonnet (eu-west-1)             │
│  Model: eu.anthropic.claude-3.5-sonnet-20240620-v1:0            │
│  (EU Inference Profile)                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. AgentCore Runtime

**Deployment Type**: Direct Code Deployment (no Docker/ECR required)

**Components**:
- **Agent Code**: Python 3.12 with Strands SDK
- **Handler**: `@app.entrypoint` decorator pattern
- **Memory**: STM_ONLY mode (short-term memory, 30-day retention)
- **Network**: Public (no VPC required)
- **Platform**: Linux ARM64 (Graviton2)

**Configuration**:
```yaml
agents:
  agent:
    name: agent_name
    entrypoint: /absolute/path/to/agent.py
    source_path: /absolute/path/to/agent/directory
    deployment_type: direct_code_deploy
    runtime_type: PYTHON_3_12
    platform: linux/arm64
    aws:
      region: eu-west-1
      observability:
        enabled: true
```

### 2. Deployed Agents

#### Test Agent
- **Purpose**: Testing and validation
- **Agent ID**: `agent-q9QEgD3UFo`
- **ARN**: `arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/agent-q9QEgD3UFo`
- **Memory**: `agent_mem-qfKWJ1ACNk`
- **Status**: READY

#### Coach Companion
- **Purpose**: Production AI coaching
- **Agent ID**: `coach_companion-0ZUOP04U5z`
- **ARN**: `arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/coach_companion-0ZUOP04U5z`
- **Memory**: `coach_companion_mem-6MZHedDDWJ`
- **Status**: READY

### 3. Foundation Model

**Model**: Claude 3.5 Sonnet  
**Inference Profile**: `eu.anthropic.claude-3-5-sonnet-20240620-v1:0`  
**Region**: eu-west-1

**Why Inference Profile?**
- Required for on-demand throughput in eu-west-1
- Direct model IDs not supported in this region
- Provides consistent performance and availability

---

## Data Flow

### Agent Invocation Flow

```
1. Client Request
   └─> Node.js Backend receives request
       └─> Validates authentication
           └─> Prepares agent payload

2. Agent Invocation
   └─> AWS SDK calls AgentCore Runtime
       └─> AgentCore loads agent code
           └─> Agent processes request
               └─> Calls Bedrock API

3. Model Inference
   └─> Bedrock routes to Claude 3.5 Sonnet
       └─> Model generates response
           └─> Returns to agent

4. Response Processing
   └─> Agent formats response
       └─> AgentCore returns to client
           └─> Backend processes result
               └─> Returns to mobile app
```

### Typical Latency

- **Agent Cold Start**: 2-5 seconds (first invocation)
- **Agent Warm**: 500ms - 2 seconds
- **Model Inference**: 1-3 seconds (depends on output length)
- **Total End-to-End**: 2-8 seconds

---

## Infrastructure Components

### AWS Services Used

| Service | Purpose | Region |
|---------|---------|--------|
| Bedrock AgentCore | Agent runtime | eu-west-1 |
| Bedrock | Foundation model | eu-west-1 |
| CloudWatch | Logging & monitoring | eu-west-1 |
| CloudWatch Billing | Cost alarms | us-east-1 |
| IAM | Access control | Global |
| S3 | Agent artifacts | eu-west-1 |
| Cost Explorer | Cost analysis | us-east-1 |

### Resource Naming Convention

- **Agents**: `{agent-name}` (underscores, not hyphens)
- **Log Groups**: `/aws/bedrock-agentcore/runtimes/{agent-id}-DEFAULT`
- **Memory**: `{agent-name}_mem-{id}`
- **IAM Roles**: `AmazonBedrockAgentCoreSDKRuntime-{region}-{hash}`
- **S3 Buckets**: `bedrock-agentcore-codebuild-sources-{account}-{region}`

---

## Monitoring Architecture

### CloudWatch Dashboards

**Test Agent Dashboard**: `AgentCore-test-agent`
**Coach Companion Dashboard**: `AgentCore-coach-companion`

**Widgets**:
1. Invocation Rate (5min bins)
2. Completed Invocations
3. Error Rate
4. Recent Errors
5. Recent Activity
6. Hourly Trends
7. Total Invocations

### CloudWatch Alarms

**Per Agent** (6 alarms total):
1. High Error Rate (> 5 errors in 5 min)
2. High Latency (> 5000ms average)
3. No Invocations (< 1 in 1 hour)

**Cost Alarms** (3 alarms):
1. Daily Bedrock Costs (> $10/day)
2. Monthly Bedrock Costs (> $100/month)
3. High Usage (> 1000 invocations/day)

### Metrics Collected

**AWS/Bedrock Namespace**:
- Invocations
- InvocationLatency
- InvocationClientErrors
- InputTokenCount
- OutputTokenCount

**Custom Metrics**:
- AgentCore/{AgentName}/ErrorCount
- AgentCore/{AgentName}/InvocationCount

---

## Security Architecture

### Authentication & Authorization

**IAM Roles**:
- AgentCore execution role (auto-created)
- Bedrock invoke permissions
- CloudWatch Logs write permissions
- S3 read permissions (for artifacts)

**Network Security**:
- Public network mode (no VPC required)
- HTTPS/TLS for all communication
- AWS SDK authentication via IAM

**Secrets Management**:
- No secrets required (IAM role-based auth)
- Model ID and region in environment variables
- No API keys stored in code

### Data Security

**In Transit**:
- TLS 1.2+ for all AWS API calls
- HTTPS for all external communication

**At Rest**:
- CloudWatch Logs encrypted by default
- S3 artifacts encrypted (AES256)
- No persistent data storage in agents

**Data Retention**:
- Agent memory: 30 days (STM_ONLY)
- CloudWatch Logs: 7 days (configurable)
- S3 artifacts: Lifecycle policies applied

---

## Scalability & Performance

### Auto-Scaling

**AgentCore Runtime**:
- Automatic scaling based on demand
- No manual configuration required
- Serverless architecture

**Concurrency**:
- No hard limits on concurrent invocations
- Bedrock throttling applies (account-level)
- Monitor for throttling via CloudWatch

### Performance Optimization

**Strategies**:
1. **Caching**: Implement response caching in backend
2. **Token Limits**: Set appropriate `max_tokens`
3. **Prompt Optimization**: Minimize system prompt length
4. **Model Selection**: Use appropriate model for task complexity

### Capacity Planning

**Current Capacity**:
- Unlimited concurrent invocations (serverless)
- Bedrock quota: Check service quotas in AWS Console

**Monitoring**:
- Track invocation patterns
- Monitor latency trends
- Watch for throttling errors

---

## Disaster Recovery

### Backup Strategy

**Agent Code**:
- Stored in Git repository
- Deployed from source control
- Version controlled

**Configuration**:
- `.bedrock_agentcore.yaml` in Git
- Infrastructure as Code (documented)

**Data**:
- No persistent data in agents
- Memory cleared after 30 days
- Stateless architecture

### Recovery Procedures

**Agent Failure**:
1. Check CloudWatch logs for errors
2. Verify agent status: `agentcore status`
3. Redeploy if needed: `agentcore deploy`
4. Test with sample invocation

**Complete Outage**:
1. Verify AWS service health
2. Check IAM role permissions
3. Redeploy agents from source
4. Verify monitoring and alarms

**RTO/RPO**:
- **RTO** (Recovery Time Objective): < 15 minutes
- **RPO** (Recovery Point Objective): 0 (stateless)

---

## Cost Architecture

### Cost Components

**Primary Costs**:
1. **Bedrock Model Inference**:
   - Input tokens: $0.003 per 1K tokens
   - Output tokens: $0.015 per 1K tokens

2. **AgentCore Runtime**:
   - Included in Bedrock pricing
   - No separate charge

3. **CloudWatch**:
   - Logs: $0.50 per GB ingested
   - Metrics: First 10 custom metrics free
   - Dashboards: First 3 free

4. **S3**:
   - Storage: $0.023 per GB/month
   - Minimal usage (agent artifacts)

**Current Costs** (as of Feb 8, 2026):
- Daily: $0.00 (within free tier)
- Monthly projection: $0.00

### Cost Optimization

**Implemented**:
- STM_ONLY memory mode (cheaper)
- Direct code deployment (no ECR costs)
- 7-day log retention
- Cost alarms and monitoring

**Recommendations**:
- Implement response caching
- Optimize token usage
- Monitor and destroy unused agents
- Use smaller models for simple tasks

---

## Deployment Architecture

### Deployment Process

```
Developer Workstation
    │
    ├─> Edit agent code
    │
    ├─> Test locally (optional)
    │   └─> python agent.py --local-test
    │
    ├─> Configure agent
    │   └─> agentcore configure
    │
    ├─> Deploy to AgentCore
    │   └─> agentcore deploy
    │       │
    │       ├─> Build dependencies (ARM64)
    │       ├─> Package source code
    │       ├─> Upload to S3
    │       ├─> Create/update agent
    │       └─> Wait for READY status
    │
    └─> Test deployment
        └─> agentcore invoke
```

### CI/CD Integration (Future)

**Planned**:
1. Git push triggers build
2. Automated testing
3. Deploy to staging
4. Manual approval
5. Deploy to production
6. Automated smoke tests

---

## Network Architecture

### Current Setup

**Network Mode**: Public  
**VPC**: Not required  
**Endpoints**: AWS-managed

**Communication**:
- Client → Backend: HTTPS (public internet)
- Backend → AgentCore: AWS SDK (AWS network)
- AgentCore → Bedrock: AWS internal network

### Future Considerations

**VPC Deployment** (if needed):
- Private subnets for agents
- VPC endpoints for AWS services
- NAT Gateway for outbound traffic
- Security groups for access control

---

## Observability Architecture

### Logging

**Log Groups**:
- `/aws/bedrock-agentcore/runtimes/{agent-id}-DEFAULT`
- Runtime logs and OTEL traces

**Log Levels**:
- INFO: Normal operations
- ERROR: Failures and exceptions
- DEBUG: Detailed troubleshooting (not enabled by default)

### Tracing

**GenAI Observability**:
- Automatic tracing enabled
- View in CloudWatch Console
- Trace model invocations
- Monitor token usage

### Metrics

**Collection**:
- CloudWatch automatic metrics
- Custom metric filters
- Log-based metrics

**Retention**:
- Metrics: 15 months (standard)
- Logs: 7 days (configurable)

---

## Integration Points

### Backend Integration

**Node.js/TypeScript**:
```typescript
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({ region: "eu-west-1" });

const command = new InvokeAgentCommand({
  agentId: "coach_companion-0ZUOP04U5z",
  agentAliasId: "DEFAULT",
  sessionId: userId,
  inputText: userMessage
});

const response = await client.send(command);
```

**Python**:
```python
import boto3

client = boto3.client('bedrock-agent-runtime', region_name='eu-west-1')

response = client.invoke_agent(
    agentId='coach_companion-0ZUOP04U5z',
    agentAliasId='DEFAULT',
    sessionId=user_id,
    inputText=user_message
)
```

---

## Future Architecture Considerations

### Planned Enhancements

1. **Multi-Region Deployment**:
   - Currently: eu-west-1 only
   - Future: Add failover region

2. **Advanced Memory**:
   - Currently: STM_ONLY
   - Future: Long-term memory for personalization

3. **Agent Orchestration**:
   - Currently: Single-agent invocations
   - Future: Multi-agent workflows

4. **Custom Tools**:
   - Currently: Model-only responses
   - Future: Function calling, API integrations

5. **A/B Testing**:
   - Currently: Single version
   - Future: Agent aliases for testing

---

## Architecture Decisions

### Key Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| AgentCore over ECS/Fargate | Simpler deployment, no container management, lower cost |
| Direct code deployment | No Docker/ECR needed, faster iterations |
| eu-west-1 region | Project requirement, data residency |
| Inference profiles | Required for eu-west-1, ensures availability |
| STM_ONLY memory | Lower cost, sufficient for use case |
| Public network mode | Simpler setup, no VPC costs |
| 7-day log retention | Balance between cost and debugging needs |

---

## References

- [AWS Bedrock AgentCore Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-agentcore.html)
- [Strands SDK Documentation](https://github.com/awslabs/strands-agents)
- [Claude 3.5 Sonnet Model Card](https://www.anthropic.com/claude)
- [AGENTCORE_DEPLOYMENT_GUIDE.md](./AGENTCORE_DEPLOYMENT_GUIDE.md)
- [CLOUDWATCH_MONITORING_SETUP.md](./CLOUDWATCH_MONITORING_SETUP.md)
- [COST_OPTIMIZATION_COMPLETE.md](./COST_OPTIMIZATION_COMPLETE.md)

---

**Architecture documented as of February 8, 2026**

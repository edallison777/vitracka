# Strands Agent Deployment Design

**Spec**: agentcore-deployment
**Created**: February 6, 2026
**Status**: In Progress

## Architecture Overview

The deployment architecture uses Strands SDK to build AI agents, AWS Bedrock for the foundation model (Claude), FastAPI for HTTP endpoints, and ECS Fargate for container orchestration. This provides scalable, serverless infrastructure with built-in observability.

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App (React Native)                │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Node.js Backend (TypeScript)                    │
│  - Express API                                               │
│  - CoachCompanionClient (HTTP client)                        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP (internal)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              AWS ECS/Fargate (Containers)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Test Agent   │  │Coach Companion│  │Future Agents │      │
│  │ FastAPI      │  │  FastAPI      │  │  FastAPI     │      │
│  │ Strands SDK  │  │  Strands SDK  │  │  Strands SDK │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │ AWS SDK
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         AWS Bedrock (Claude 3.5 Sonnet)                      │
│         Foundation Model accessed via Strands                │
└─────────────────────────────────────────────────────────────┘
                         ▲
                         │
┌─────────────────────────────────────────────────────────────┐
│              AWS ECR (Container Registry)                    │
│  • vitracka/test-agent:latest                               │
│  • vitracka/coach-companion:latest                          │
└─────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Docker Image Build Process

**Build Strategy**: Multi-platform builds for ARM64 architecture

```powershell
# Build for ARM64 (Graviton2)
docker buildx build --platform linux/arm64 \
  -t <agent-name>:latest \
  --load \
  <agent-directory>
```

**Image Optimization**:
- Use python:3.11-slim base image
- Multi-stage builds to minimize size
- Layer caching for faster builds
- Security scanning on push

### 2. ECR Repository Management

**Repository Naming Convention**: `vitracka/<agent-name>`

**Lifecycle Policies**:
- Keep last 10 tagged images
- Remove untagged images after 7 days
- Scan on push enabled

**Tagging Strategy**:
- `latest`: Current production version
- `v<major>.<minor>.<patch>`: Semantic versioning
- `<git-sha>`: Commit-specific builds

### 3. Container Deployment to ECS/Fargate

**Deployment Strategy**: Use ECS Fargate for serverless container orchestration

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name vitracka-agents

# Create task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster vitracka-agents \
  --service-name test-agent \
  --task-definition test-agent:1 \
  --desired-count 1 \
  --launch-type FARGATE
```

**Task Definition**:
```json
{
  "family": "test-agent",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "test-agent",
      "image": "211125768252.dkr.ecr.us-east-1.amazonaws.com/vitracka/test-agent:latest",
      "portMappings": [
        {
          "containerPort": 8001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "AWS_REGION",
          "value": "us-east-1"
        }
      ],
      "secrets": [
        {
          "name": "AWS_BEDROCK_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:211125768252:secret:bedrock-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/test-agent",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

**HTTP Invocation**:
```bash
# Via Application Load Balancer
curl http://test-agent-alb.us-east-1.elb.amazonaws.com/health

# Test coaching endpoint
curl -X POST http://test-agent-alb.us-east-1.elb.amazonaws.com/coach \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, test agent!"}'
```

### 4. IAM Role Design

**Trust Policy** (for ECS tasks):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "ecs-tasks.amazonaws.com"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

**Permissions**:
- CloudWatch Logs: Write logs
- Secrets Manager: Read secrets (Bedrock API key)
- Bedrock: Invoke foundation models
- ECR: Pull container images

### 5. Deployment Automation

**PowerShell Script**: `scripts/deploy-agent.ps1`

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$AgentName,
    
    [Parameter(Mandatory=$true)]
    [string]$AgentPath,
    
    [Parameter(Mandatory=$false)]
    [string]$Version = "latest",
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "dev"
)

# 1. Validate AWS credentials
# 2. Build Docker image for ARM64
# 3. Tag image with version
# 4. Push to ECR
# 5. Update Bedrock Agent
# 6. Test invocation
# 7. Report status
```

### 6. Monitoring and Observability

**CloudWatch Logs**:
- Log group: `/aws/bedrock/agents/<agent-name>`
- Retention: 7 days (dev), 30 days (prod)
- Structured logging with JSON format

**CloudWatch Metrics**:
- Invocation count
- Duration (avg, p50, p95, p99)
- Error count and rate
- Throttle count
- Token usage

**CloudWatch Alarms**:
- Error rate > 5%
- Duration > 30s (p95)
- Throttle count > 10/minute
- Cost > $100/day

**Dashboard**:
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Bedrock", "Invocations", {"stat": "Sum"}],
          [".", "Errors", {"stat": "Sum"}],
          [".", "Duration", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Agent Performance"
      }
    }
  ]
}
```

## Deployment Workflow

### Phase 1: Test Agent Deployment

1. **Build Image**:
   - Build ARM64 Docker image
   - Run security scan
   - Push to ECR

2. **Create Agent**:
   - Create IAM role
   - Create Bedrock Agent
   - Prepare agent

3. **Test**:
   - Invoke with test payload
   - Verify response
   - Check CloudWatch logs

4. **Monitor**:
   - Set up CloudWatch dashboard
   - Configure alarms
   - Test alerting

### Phase 2: Coach Companion Deployment

1. **Prepare Code**:
   - Update agent.py for Bedrock
   - Add health check endpoint
   - Configure environment variables

2. **Build and Deploy**:
   - Build ARM64 image
   - Push to ECR
   - Create production agent
   - Configure with Strands SDK

3. **Integration Test**:
   - Test with mobile app
   - Verify Strands API integration
   - Load testing

4. **Production Cutover**:
   - Update mobile app endpoints
   - Monitor for 24 hours
   - Gradual rollout

## Cost Optimization

### Strategies

1. **Right-sizing**:
   - Start with 512MB memory
   - Monitor and adjust based on usage
   - Use provisioned concurrency only for production

2. **Caching**:
   - Cache frequent queries
   - Use ElastiCache for session data
   - Reduce redundant invocations

3. **Monitoring**:
   - Daily cost reports
   - Budget alerts
   - Per-user cost tracking

4. **Pause/Resume**:
   - Pause dev/staging during off-hours
   - Resume on-demand
   - Automated scheduling

### Cost Estimation

**Test Agent** (Development):
- Invocations: ~1,000/month
- Cost: ~$1-5/month

**Coach Companion** (Production):
- Invocations: ~100,000/month
- Cost: ~$100-500/month

**Total Estimated**: ~$100-500/month (vs $500-1000/month for ECS Fargate 24/7)

## Security Design

### Image Security

1. **Base Image**:
   - Use official Python slim images
   - Regular updates
   - Vulnerability scanning

2. **Dependencies**:
   - Pin versions in requirements.txt
   - Regular security audits
   - Minimal dependencies

3. **Secrets**:
   - No secrets in images
   - Use AWS Secrets Manager
   - Environment variable injection

### Network Security

1. **VPC Configuration**:
   - Private subnets for agents
   - VPC endpoints for AWS services
   - Security groups with least privilege

2. **Encryption**:
   - TLS for all communication
   - Encryption at rest for logs
   - KMS for secret encryption

### Access Control

1. **IAM Policies**:
   - Least privilege principle
   - Separate roles per agent
   - Regular policy audits

2. **Authentication**:
   - API Gateway with Cognito
   - JWT token validation
   - Rate limiting

## Rollback Strategy

### Automated Rollback

1. **Health Check Failure**:
   - Automatic rollback to previous version
   - Alert operations team
   - Investigate root cause

2. **Error Rate Threshold**:
   - If error rate > 10% for 5 minutes
   - Automatic rollback
   - Incident created

### Manual Rollback

```powershell
# Rollback to previous version
./scripts/rollback-agent.ps1 -AgentName coach-companion -Version v1.2.3
```

**Steps**:
1. Update agent to previous image
2. Prepare agent
3. Test invocation
4. Monitor for 30 minutes
5. Confirm rollback success

## Testing Strategy

### Unit Tests

- Test agent logic locally
- Mock external dependencies
- Fast feedback loop

### Integration Tests

- Test with real Bedrock Agent
- Verify CloudWatch logging
- Test error handling

### Load Tests

- Simulate 100 concurrent users
- Measure response times
- Identify bottlenecks

### Security Tests

- Vulnerability scanning
- Penetration testing
- Compliance validation

## Correctness Properties

### Property 1: Deployment Idempotency
**Statement**: Deploying the same agent version multiple times produces the same result.

**Test Strategy**:
```typescript
fc.assert(
  fc.property(
    fc.record({
      agentName: fc.string(),
      version: fc.string(),
      config: fc.object()
    }),
    (deployment) => {
      const result1 = deployAgent(deployment);
      const result2 = deployAgent(deployment);
      return result1.agentId === result2.agentId &&
             result1.imageUri === result2.imageUri;
    }
  )
);
```

### Property 2: Image Tag Consistency
**Statement**: An image tag always points to the same image digest.

**Test Strategy**:
```typescript
fc.assert(
  fc.property(
    fc.string(),
    (tag) => {
      const digest1 = getImageDigest(tag);
      const digest2 = getImageDigest(tag);
      return digest1 === digest2;
    }
  )
);
```

### Property 3: Rollback Safety
**Statement**: Rolling back to a previous version restores the exact previous state.

**Test Strategy**:
```typescript
fc.assert(
  fc.property(
    fc.array(fc.string(), {minLength: 2}),
    (versions) => {
      const initialState = getCurrentState();
      deployAgent(versions[0]);
      deployAgent(versions[1]);
      rollbackAgent(versions[0]);
      const finalState = getCurrentState();
      return deepEqual(initialState, finalState);
    }
  )
);
```

## Documentation Requirements

### Deployment Guide
- Step-by-step instructions
- Troubleshooting section
- Common issues and solutions

### Runbook
- Incident response procedures
- Escalation paths
- Contact information

### Architecture Diagrams
- System overview
- Network topology
- Data flow

## Success Criteria

- ✅ Test agent deployed and responding
- ✅ Automated deployment script working
- ✅ Monitoring and alerting configured
- ✅ Coach companion deployed to production
- ✅ Load testing passed
- ✅ Security audit completed
- ✅ Documentation complete

## Open Questions

1. Should we use Bedrock Agent Aliases for blue-green deployments?
2. What's the optimal memory configuration for production?
3. Should we implement circuit breakers for external API calls?
4. How do we handle agent version migrations with active sessions?

## References

- [AWS Bedrock Agents Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- [Strands SDK Documentation](https://strandsagents.com/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

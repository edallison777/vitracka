# AgentCore Deployment Requirements

**Project**: Vitracka AgentCore Deployment
**Created**: February 6, 2026
**Status**: In Progress
**Priority**: High

## Overview

This specification defines the requirements for deploying AI agents to AWS Bedrock AgentCore infrastructure, enabling scalable, serverless agent execution with proper monitoring and cost management.

## User Stories

### US-1: Deploy Test Agent to AWS
**As a** developer  
**I want to** deploy the Strands-based test-agent to AWS infrastructure  
**So that** I can validate the deployment pipeline and infrastructure setup

**Acceptance Criteria**:
- ECR repository created for test-agent
- Docker image built for ARM64 architecture
- Image pushed to ECR successfully
- Container deployed to ECS/Fargate or Lambda
- Agent responds to HTTP invocations via FastAPI
- CloudWatch logs capture agent execution

### US-2: Automate Deployment Pipeline
**As a** developer  
**I want to** automate the build and deployment process  
**So that** I can deploy agents quickly and consistently

**Acceptance Criteria**:
- PowerShell script for building and pushing images
- Script validates AWS credentials before deployment
- Script tags images with version numbers
- Script updates Bedrock Agent configuration
- Script provides clear success/failure feedback

### US-3: Deploy Coach Companion Agent
**As a** product owner  
**I want to** deploy the coach-companion agent to production  
**So that** users can interact with the AI coach

**Acceptance Criteria**:
- Coach companion Docker image built with Strands SDK
- Image pushed to dedicated ECR repository
- Container deployed to ECS/Fargate with proper IAM roles
- FastAPI service accessible via HTTP
- Agent tested with real user scenarios
- Monitoring and alerting configured

### US-4: Implement Cost Management
**As a** project manager  
**I want to** monitor and control AWS costs  
**So that** we stay within budget

**Acceptance Criteria**:
- Cost monitoring script created
- Pause/resume infrastructure scripts created
- CloudWatch alarms for cost thresholds
- Daily cost reports automated
- Resource tagging for cost allocation

### US-5: Production Readiness
**As a** DevOps engineer  
**I want to** ensure production-ready infrastructure  
**So that** the system is reliable and secure

**Acceptance Criteria**:
- Security audit completed
- Backup and disaster recovery plan
- Load testing performed
- Documentation complete
- Runbook for common issues
- On-call rotation established

## Technical Requirements

### TR-1: Docker Image Requirements
- **Architecture**: ARM64 (Graviton2)
- **Base Image**: python:3.11-slim
- **Size**: < 200MB per image
- **Security**: No root user, minimal dependencies
- **Health Check**: HTTP endpoint on port 8000

### TR-2: ECR Repository Structure
```
vitracka/
├── test-agent          # Testing and validation
├── coach-companion     # Production coach agent
└── [future-agents]     # Additional agents
```

### TR-3: Container Deployment Configuration
- **Runtime**: ECS Fargate or AWS Lambda (container-based)
- **Python Version**: 3.11
- **Framework**: FastAPI + Strands SDK
- **Foundation Model**: AWS Bedrock Claude 3.5 Sonnet (via Strands)
- **Memory**: 512MB (test), 1024MB (production)
- **Timeout**: 30s (test), 60s (production)
- **Concurrency**: 10 (test), 100 (production)

### TR-4: Monitoring Requirements
- CloudWatch Logs retention: 7 days (test), 30 days (production)
- Metrics: Invocation count, duration, errors, throttles
- Alarms: Error rate > 5%, duration > 30s
- Dashboards: Real-time agent performance

### TR-5: Security Requirements
- IAM roles with least privilege
- Secrets stored in AWS Secrets Manager
- VPC endpoints for private communication
- Encryption at rest and in transit
- Regular security scans of images

## Current Progress

### Completed
Based on the context transfer, the following was completed:
1. ECR repository created: `vitracka/test-agent`
2. Test agent Docker image built for ARM64
3. Image pushed to ECR successfully
4. IAM role created for container execution
5. Cost monitoring scripts created
6. Infrastructure pause/resume scripts created

### In Progress
1. Deploy container to ECS/Fargate or Lambda
2. Test agent HTTP endpoint invocation
3. CloudWatch logging and monitoring setup

### Next Steps
1. Deploy test agent container to ECS/Fargate
2. Test HTTP endpoint invocation
3. Create deployment automation script
4. Deploy coach-companion agent
5. Set up production monitoring

## Dependencies

### External Services
- AWS ECR: Container registry
- AWS ECS/Fargate: Container orchestration
- AWS Bedrock: Foundation model (Claude) via Strands SDK
- AWS CloudWatch: Logging and monitoring
- AWS Secrets Manager: Credential storage
- Strands SDK: Agent framework

### Internal Components
- test-agent: Validation agent
- coach-companion: Production AI coach
- Vitracka backend: API integration

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Bedrock costs exceed budget | High | Medium | Implement cost alarms, pause scripts |
| Agent cold start latency | Medium | High | Use provisioned concurrency |
| Image build failures | Medium | Low | Automated testing, rollback capability |
| Security vulnerabilities | High | Low | Regular scans, minimal dependencies |
| Integration failures | Medium | Medium | Comprehensive testing, staging environment |

## Success Metrics

- **Deployment Time**: < 5 minutes per agent
- **Agent Response Time**: < 2 seconds (p95)
- **Error Rate**: < 1%
- **Cost per 1000 invocations**: < $0.50
- **Uptime**: > 99.9%

## Timeline

- **Phase 1** (Current): Test agent deployment - 1 day
- **Phase 2**: Automation and monitoring - 2 days
- **Phase 3**: Coach companion deployment - 3 days
- **Phase 4**: Production readiness - 2 days
- **Total**: ~8 days

## References

- [AWS Bedrock Agents Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- [ECR Best Practices](https://docs.aws.amazon.com/AmazonECR/latest/userguide/best-practices.html)
- [Docker Multi-Platform Builds](https://docs.docker.com/build/building/multi-platform/)
- [AGENTCORE_DEPLOYMENT_GUIDE.md](../../../AGENTCORE_DEPLOYMENT_GUIDE.md)

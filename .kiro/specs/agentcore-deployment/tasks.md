# Strands Agent Deployment Tasks

**Spec**: agentcore-deployment
**Created**: February 6, 2026
**Last Updated**: February 8, 2026

## ⚠️ CRITICAL: AWS REGION REQUIREMENT ⚠️

**ALL AWS deployments for this project MUST use `eu-west-1` (Europe - Ireland) ONLY.**

This is a mandatory project requirement. See [AWS_REGION_POLICY.md](../../../AWS_REGION_POLICY.md) for details.

**2026-02-07 Cleanup**: All resources were removed from us-east-1 and must be redeployed to eu-west-1.

---

## Overview

This task list covers deploying Strands SDK-based AI agents to AWS infrastructure using AgentCore Runtime. The agents use AWS Bedrock (Claude) as the foundation model and expose HTTP endpoints via AgentCore.

## Task Status Legend
- `[ ]` Not Started
- `[-]` In Progress
- `[x]` Complete
- `[~]` Queued

---

## Phase 1: Test Agent Deployment

### 1. ECR Repository Setup
**Status**: Complete (from context transfer)
**Priority**: High

Create and configure ECR repository for test agent.

**Subtasks**:
- [x] 1.1 Create ECR repository `vitracka/test-agent`
- [x] 1.2 Enable image scanning on push
- [x] 1.3 Configure encryption (AES256)
- [x] 1.4 Set up lifecycle policies

**Artifacts**:
- Repository URI: `732231126129.dkr.ecr.eu-west-1.amazonaws.com/vitracka/test-agent`

---

### 2. Docker Image Build
**Status**: Complete (from context transfer)
**Priority**: High

Build ARM64 Docker image for test agent.

**Subtasks**:
- [x] 2.1 Configure Docker buildx for ARM64
- [x] 2.2 Build test-agent image for linux/arm64
- [x] 2.3 Verify image size < 200MB
- [x] 2.4 Test image locally

**Commands**:
```powershell
docker buildx build --platform linux/arm64 -t test-agent:latest --load agents/test-agent
```

---

### 3. Image Push to ECR
**Status**: Complete (from context transfer)
**Priority**: High

Push Docker image to ECR repository.

**Subtasks**:
- [x] 3.1 Authenticate Docker with ECR
- [x] 3.2 Tag image with ECR repository URI
- [x] 3.3 Push image to ECR
- [x] 3.4 Verify image in ECR console

**Image Details**:
- Size: 183MB
- Platform: linux/arm64

---

### 4. IAM Role Creation
**Status**: Complete (from context transfer)
**Priority**: High

Create IAM role for ECS task execution.

**Subtasks**:
- [x] 4.1 Create IAM trust policy for ECS tasks
- [x] 4.2 Create IAM role for container execution
- [x] 4.3 Attach AWSLambdaBasicExecutionRole policy
- [x] 4.4 Attach AmazonEC2ContainerRegistryReadOnly policy
- [x] 4.5 Attach Bedrock invoke permissions
- [x] 4.6 Tag role with project metadata

**Role ARN**: `arn:aws:iam::211125768252:role/AgentCoreTestAgentRole`

---

### 5. AgentCore Runtime Prerequisites
**Status**: Complete
**Priority**: High

Set up prerequisites for AgentCore Runtime deployment.

**Subtasks**:
- [x] 5.1 Install AgentCore Starter Toolkit (`pip install bedrock-agentcore-starter-toolkit`)
- [x] 5.2 Install AgentCore Runtime SDK (`pip install bedrock-agentcore-runtime`)
- [x] 5.3 Verify Bedrock model access (Claude 3.5 Sonnet)
- [x] 5.4 Create AgentCore execution IAM role (auto-created by AgentCore)
- [x] 5.5 Enable CloudWatch GenAI Observability (enabled by default)
- [x] 5.6 Test AgentCore CLI availability

**Commands**:
```powershell
# Install prerequisites
pip install bedrock-agentcore-starter-toolkit
pip install bedrock-agentcore-runtime

# Verify AgentCore CLI
agentcore --version

# Check Bedrock model access
aws bedrock list-foundation-models --region eu-west-1 --query "modelSummaries[?modelId=='anthropic.claude-3-5-sonnet-20241022-v2:0']"
```

---

### 6. Test Agent Deployment to AgentCore
**Status**: Complete
**Priority**: High
**Depends On**: Task 5

Deploy the test agent to AgentCore Runtime and verify functionality.

**Subtasks**:
- [x] 6.1 Test agent locally with `python test_agent.py`
- [x] 6.2 Build ARM64 Docker image (not needed - using direct code deploy)
- [x] 6.3 Push image to ECR (not needed - using direct code deploy)
- [x] 6.4 Deploy to AgentCore Runtime
- [x] 6.5 Wait for agent to be ready
- [x] 6.6 Test agent invocation
- [x] 6.7 Verify response format and content
- [x] 6.8 Check CloudWatch logs

**Artifacts**:
- Agent ARN: `arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/agent-q9QEgD3UFo`
- Status: READY and responding

**Test Cases**:
1. Local test: Run agent.py directly
2. AgentCore invocation: Test via AWS SDK
3. Error handling: Invalid input
4. Performance: Measure response time

**Commands**:
```powershell
# Deploy using automation script
./scripts/deploy-agent-agentcore.ps1 `
  -AgentName test-agent `
  -AgentPath agents/test-agent `
  -Region eu-west-1

# Manual test invocation
python -c "
import boto3
client = boto3.client('bedrock-agentcore-runtime', region_name='eu-west-1')
response = client.invoke_agent(
    agentId='<agent-id>',
    input={'prompt': 'Hello, test agent!'}
)
print(response['output'])
"
```

---

### 7. CloudWatch Monitoring Setup
**Status**: Partially Complete
**Priority**: Medium
**Depends On**: Task 6

Configure CloudWatch logging and monitoring for AgentCore Runtime.

**Subtasks**:
- [x] 7.1 Enable GenAI Observability in CloudWatch (enabled by default)
- [x] 7.2 Verify log group creation `/aws/bedrock-agentcore/<agent-name>`
- [x] 7.3 Set log retention to 7 days (default retention)
- [x] 7.4 Create CloudWatch dashboard for agent metrics
- [x] 7.5 Set up metric filters for errors
- [x] 7.6 Create alarms for high error rates
- [x] 7.7 Create alarms for high latency
- [x] 7.8 Test alarm notifications

**Metrics to Track**:
- Invocation count
- Latency (avg, p50, p95, p99)
- Error rate
- Token usage
- Session duration
- Cost per invocation

**Alarms**:
- Error rate > 5%
- Latency > 5s (p95)
- Daily cost > $10
- Token usage anomalies

**Commands**:
```powershell
# Enable GenAI Observability
aws cloudwatch enable-transaction-search --region eu-west-1

# View logs
aws logs tail /aws/bedrock-agentcore/test-agent --follow

# Create dashboard
./scripts/create-dashboard.ps1 -AgentName test-agent
```

---

## Phase 2: Automation and Monitoring

### 8. Deployment Automation Script
**Status**: Complete
**Priority**: High

Create PowerShell script for automated AgentCore Runtime deployments.

**Subtasks**:
- [x] 8.1 Create `scripts/deploy-agent-agentcore.ps1`
- [x] 8.2 Add parameter validation
- [x] 8.3 Implement AWS credential check
- [x] 8.4 Implement Docker build step (ARM64)
- [x] 8.5 Implement ECR push step
- [x] 8.6 Implement AgentCore Runtime deployment
- [x] 8.7 Add agent status checking
- [x] 8.8 Add invocation testing
- [x] 8.9 Add error handling and rollback
- [x] 8.10 Add progress reporting
- [x] 8.11 Test script with test agent

**Script Parameters**:
- `AgentName`: Name of the agent to deploy
- `AgentPath`: Path to agent directory
- `Version`: Image version tag
- `Region`: AWS region (default: eu-west-1)
- `ModelId`: Bedrock model ID

**Example Usage**:
```powershell
./scripts/deploy-agent-agentcore.ps1 `
  -AgentName test-agent `
  -AgentPath agents/test-agent `
  -Version v1.0.0 `
  -Region eu-west-1
```

---

### 9. Monitoring Dashboard
**Status**: Not Started
**Priority**: Medium

Create comprehensive CloudWatch dashboard.

**Subtasks**:
- [x] 9.1 Create dashboard JSON template
- [x] 9.2 Add invocation metrics widget
- [x] 9.3 Add performance metrics widget
- [x] 9.4 Add error metrics widget
- [x] 9.5 Add cost metrics widget
- [x] 9.6 Deploy dashboard via AWS CLI
- [x] 9.7 Test dashboard visibility

---

### 10. Cost Optimization
**Status**: Partially Complete
**Priority**: Medium

Implement cost monitoring and optimization.

**Subtasks**:
- [x] 10.1 Create cost monitoring script
- [x] 10.2 Create pause infrastructure script
- [x] 10.3 Create resume infrastructure script
- [x] 10.4 Set up CloudWatch cost alarms
- [x] 10.5 Create daily cost report automation
- [x] 10.6 Implement cost allocation tags
- [x] 10.7 Create cost anomaly detection

---

## Phase 3: Coach Companion Deployment

### 11. Coach Companion Agent Deployment
**Status**: Complete
**Priority**: High

Deploy coach companion agent to AgentCore Runtime.

**Subtasks**:
- [x] 11.1 Create agent directory structure
- [x] 11.2 Write agent code with @app.entrypoint decorator
- [x] 11.3 Create requirements.txt with dependencies
- [x] 11.4 Configure agent with agentcore CLI
- [x] 11.5 Fix absolute path requirements in config
- [x] 11.6 Deploy to AgentCore Runtime
- [x] 11.7 Test agent invocation
- [x] 11.8 Verify coaching responses
- [x] 11.9 Document deployment process

**Artifacts**:
- Agent ARN: `arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/coach_companion-0ZUOP04U5z`
- Memory Resource: `coach_companion_mem-6MZHedDDWJ`
- Status: READY and responding
- Documentation: `COACH_COMPANION_DEPLOYMENT_SUCCESS.md`

**Note**: Tasks 11-14 were consolidated into AgentCore direct deployment (no ECR/ECS needed)

---

### 12. ECR Repository for Coach Companion
**Status**: Not Applicable
**Priority**: N/A

**Note**: ECR repository not needed for AgentCore direct code deployment. This task is obsolete.

---

### 13. Coach Companion Image Build
**Status**: Not Applicable
**Priority**: N/A

**Note**: Docker image build not needed for AgentCore direct code deployment. This task is obsolete.

---

### 14. Strands SDK Integration
**Status**: Complete
**Priority**: High

Configure Strands SDK for Bedrock Agent.

**Subtasks**:
- [x] 14.1 Install Strands SDK in requirements.txt
- [x] 14.2 Update agent code for AgentCore runtime
- [x] 14.3 Configure environment variables (MODEL_ID, AWS_REGION)
- [x] 14.4 Use EU inference profile for model access
- [x] 14.5 Implement error handling in agent code
- [x] 14.6 Test agent with various prompts

**Note**: No Secrets Manager needed - using IAM role permissions

---

### 15. Integration Testing
**Status**: Not Started
**Priority**: High
**Depends On**: Task 14

Test coach companion agent with real scenarios.

**Subtasks**:
- [x] 15.1 Test user onboarding flow
- [x] 15.2 Test goal setting
- [x] 15.3 Test progress tracking
- [ ] 15.4 Test Strands data retrieval
- [x] 15.5 Test error scenarios
- [ ] 15.6 Load testing (100 concurrent users)
- [x] 15.7 Measure response times
- [x] 15.8 Verify CloudWatch logs

---

## Phase 4: Production Readiness

### 16. Security Audit
**Status**: Not Started
**Priority**: High

Conduct comprehensive security audit.

**Subtasks**:
- [ ] 16.1 Review IAM policies
- [ ] 16.2 Scan Docker images for vulnerabilities
- [ ] 16.3 Review network security
- [ ] 16.4 Audit secrets management
- [ ] 16.5 Review logging and monitoring
- [ ] 16.6 Document security findings
- [ ] 16.7 Remediate critical issues

---

### 17. Disaster Recovery Plan
**Status**: Not Started
**Priority**: Medium

Create and test disaster recovery procedures.

**Subtasks**:
- [ ] 17.1 Document backup procedures
- [ ] 17.2 Create rollback scripts
- [ ] 17.3 Test recovery procedures
- [ ] 17.4 Document RTO and RPO
- [ ] 17.5 Create incident response plan
- [ ] 17.6 Conduct DR drill

---

### 18. Documentation
**Status**: Substantially Complete
**Priority**: Medium

Complete all deployment documentation.

**Subtasks**:
- [x] 18.1 Create deployment guide (`AGENTCORE_DEPLOYMENT_GUIDE.md`)
- [x] 18.2 Create runbook for common issues (included in deployment guide)
- [x] 18.3 Document monitoring and alerting
- [x] 18.4 Create architecture diagrams
- [x] 18.5 Document API endpoints
- [x] 18.6 Create troubleshooting guide (included in deployment guide)
- [x] 18.7 Document coach companion deployment (`COACH_COMPANION_DEPLOYMENT_SUCCESS.md`)
- [x] 18.8 Create quickstart guide (`AGENTCORE_QUICKSTART.md`)
- [x] 18.9 Document region policy (`AWS_REGION_POLICY.md`)
- [x] 18.10 Create PATH fix script documentation

---

### 19. Production Deployment
**Status**: Not Started
**Priority**: High
**Depends On**: Tasks 16, 17, 18

Deploy to production environment.

**Subtasks**:
- [ ] 19.1 Final security review
- [ ] 19.2 Deploy to production
- [ ] 19.3 Smoke testing
- [ ] 19.4 Monitor for 24 hours
- [ ] 19.5 Gradual rollout (10% → 50% → 100%)
- [ ] 19.6 Handoff to operations team

---

## Property-Based Tests

### PBT-1: Deployment Idempotency
**Validates**: Design Property 1

Test that deploying the same agent version multiple times produces identical results.

**Subtasks**:
- [ ] PBT-1.1 Write property test for deployment idempotency
- [ ] PBT-1.2 Run test with 100 examples
- [ ] PBT-1.3 Verify test passes

---

### PBT-2: Image Tag Consistency
**Validates**: Design Property 2

Test that an image tag always points to the same digest.

**Subtasks**:
- [ ] PBT-2.1 Write property test for image tag consistency
- [ ] PBT-2.2 Run test with 100 examples
- [ ] PBT-2.3 Verify test passes

---

### PBT-3: Rollback Safety
**Validates**: Design Property 3

Test that rollback restores exact previous state.

**Subtasks**:
- [ ] PBT-3.1 Write property test for rollback safety
- [ ] PBT-3.2 Run test with 50 examples
- [ ] PBT-3.3 Verify test passes

---

## Immediate Next Steps (Priority Order)

1. **Task 5**: Set up AgentCore Runtime prerequisites
   - Install AgentCore Starter Toolkit and Runtime SDK
   - Verify Bedrock model access
   - Create IAM execution role
   - Enable CloudWatch GenAI Observability

2. **Task 6**: Deploy test agent to AgentCore Runtime
   - Test agent locally
   - Build ARM64 Docker image
   - Deploy to AgentCore Runtime
   - Test invocation

3. **Task 7**: Set up CloudWatch monitoring
   - Enable GenAI Observability
   - Create dashboard
   - Configure alarms

4. **Task 8**: Complete deployment automation script testing
   - Test `deploy-agent-agentcore.ps1` with test agent
   - Verify end-to-end deployment
   - Document any issues

5. **Task 11-15**: Deploy coach companion
   - Create ECR repository
   - Build and push image
   - Deploy to AgentCore Runtime
   - Integration testing

6. **Task 16-19**: Production readiness
   - Security audit
   - Documentation
   - Production deployment

---

## Blockers and Issues

None currently.

---

## Notes

- All AWS resources should be tagged with:
  - `Project: Vitracka`
  - `Environment: dev/staging/production`
  - `ManagedBy: Manual` (until Terraform migration)
  - `CostCenter: Engineering`

- Image naming convention:
  - `vitracka/<agent-name>:<version>`
  - Use semantic versioning (v1.0.0)
  - Tag `latest` for current production version

- Agent naming convention:
  - `<agent-name>-<environment>`
  - Example: `coach-companion-prod`

- Always test in dev environment before production deployment

---

## Success Criteria

- ✅ Test agent deployed and responding
- ✅ Automated deployment script working
- ⏳ Monitoring and alerting configured (logs working, dashboard pending)
- ✅ Coach companion deployed to AgentCore Runtime
- ⏳ Load testing passed
- ⏳ Security audit completed
- ✅ Documentation complete (deployment guide, troubleshooting, quickstart)

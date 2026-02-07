# Vitracka - AI-Powered Weight Management Platform

## ⚠️ CRITICAL: AWS REGION REQUIREMENT ⚠️

**ALL AWS deployments MUST use `eu-west-1` (Europe - Ireland) ONLY.**

See [AWS_REGION_POLICY.md](./AWS_REGION_POLICY.md) for complete details.

---

## Project Overview

Vitracka is an AI-powered weight management platform that provides personalized coaching, meal planning, and progress tracking using AWS Bedrock AgentCore.

## Quick Start

### Prerequisites

- AWS CLI configured with credentials
- Python 3.12+
- Docker (for local testing)
- AgentCore CLI: `pip install bedrock-agentcore-starter-toolkit`

### Deploy Test Agent

```powershell
cd agents/test-agent
agentcore configure --entrypoint agent.py
# When prompted, enter region: eu-west-1
agentcore deploy
```

### Deploy Coach Companion (Production)

```powershell
cd agents/coach-companion
agentcore configure --entrypoint agent.py
# When prompted, enter region: eu-west-1
agentcore deploy
```

## Documentation

- [AWS Region Policy](./AWS_REGION_POLICY.md) - **READ THIS FIRST**
- [AgentCore Deployment Guide](./AGENTCORE_DEPLOYMENT_GUIDE.md)
- [AgentCore Quick Start](./AGENTCORE_QUICKSTART.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)

## Project Structure

```
vitracka/
├── agents/
│   ├── test-agent/          # Simple test agent for validation
│   └── coach-companion/     # Production coaching agent
├── mobile/                  # React Native mobile app
├── src/                     # Backend services
├── terraform/               # Infrastructure as Code
├── scripts/                 # Deployment and utility scripts
└── monitoring/              # CloudWatch dashboards and configs
```

## Architecture

- **Frontend**: React Native mobile app (iOS/Android)
- **Backend**: Node.js/TypeScript REST API
- **AI Agents**: AWS Bedrock AgentCore with Claude 3.5 Sonnet
- **Database**: PostgreSQL (RDS)
- **Infrastructure**: AWS (ECS Fargate, Lambda, S3, CloudWatch)
- **Region**: eu-west-1 (Europe - Ireland) **ONLY**

## Current Status

- ✅ Test agent deployed to AgentCore Runtime (eu-west-1)
- ✅ ECR repositories configured (eu-west-1)
- ✅ CloudWatch monitoring set up (eu-west-1)
- ⏳ Coach companion deployment in progress
- ⏳ Mobile app integration
- ⏳ Production deployment

## Development Workflow

1. Make changes to agent code
2. Test locally: `agentcore deploy --local`
3. Deploy to cloud: `agentcore deploy` (automatically uses eu-west-1)
4. Monitor: Check CloudWatch dashboard
5. Test: `agentcore invoke '{"prompt": "test"}'`

## Important Scripts

- `scripts/deploy-agent-agentcore.ps1` - Automated agent deployment
- `scripts/cleanup-non-eu-west-1.ps1` - Remove resources from wrong regions
- `scripts/create-dashboard.ps1` - Create CloudWatch monitoring dashboard
- `scripts/setup-agentcore-monitoring.ps1` - Configure monitoring and alarms

## Support

For issues or questions, refer to:
- [Spec Tasks](./.kiro/specs/agentcore-deployment/tasks.md)
- [Architecture Clarification](./.kiro/specs/agentcore-deployment/ARCHITECTURE_CLARIFICATION.md)

---

**Remember**: All AWS resources must be in **eu-west-1** only. See [AWS_REGION_POLICY.md](./AWS_REGION_POLICY.md).

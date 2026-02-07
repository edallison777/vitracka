# 🚀 START HERE - Vitracka Project

## ⚠️ BEFORE YOU DO ANYTHING ⚠️

### AWS Region Requirement

**ALL AWS deployments MUST use `eu-west-1` (Europe - Ireland) ONLY.**

This is **mandatory** and **non-negotiable**.

👉 **Read this first**: [AWS_REGION_POLICY.md](./AWS_REGION_POLICY.md)

---

## Quick Links

- [AWS Region Policy](./AWS_REGION_POLICY.md) ← **READ THIS FIRST**
- [Project README](./README.md)
- [AgentCore Deployment Guide](./AGENTCORE_DEPLOYMENT_GUIDE.md)
- [Deployment Tasks](./.kiro/specs/agentcore-deployment/tasks.md)

## Current Status (2026-02-07)

- ✅ All us-east-1 resources cleaned up
- ⏳ Test agent needs redeployment to eu-west-1
- ⏳ Coach companion deployment pending

## Next Steps

1. **Deploy test agent to eu-west-1**:
   ```powershell
   cd agents/test-agent
   agentcore configure --entrypoint agent.py
   # Enter: agent, eu-west-1, anthropic.claude-3-5-sonnet-20241022-v2:0
   agentcore deploy
   ```

2. **Verify deployment**:
   ```powershell
   agentcore status  # Should show "Region: eu-west-1"
   ```

3. **Continue with Task 9** (Monitoring Dashboard) from the spec

## Important Files

- `AWS_REGION_POLICY.md` - Region policy (CRITICAL)
- `README.md` - Project overview
- `.kiro/specs/agentcore-deployment/tasks.md` - Deployment tasks
- `scripts/deploy-agent-agentcore.ps1` - Automated deployment (eu-west-1 enforced)
- `scripts/cleanup-non-eu-west-1.ps1` - Remove resources from wrong regions

## Safety Features

All deployment scripts now enforce eu-west-1:
- `scripts/deploy-agent-agentcore.ps1` - Validates region, blocks non-eu-west-1
- `scripts/cleanup-non-eu-west-1.ps1` - Scans and removes resources from other regions

---

**Remember**: If you see ANY AWS resource in a region other than eu-west-1, stop and run the cleanup script immediately.

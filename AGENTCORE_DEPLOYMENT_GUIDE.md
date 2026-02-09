# ⚠️ CRITICAL: AgentCore Deployment Guide - READ THIS FIRST ⚠️

**Last Updated**: February 8, 2026  
**Status**: PRODUCTION-READY DEPLOYMENT PROCESS  
**Region**: eu-west-1 ONLY (MANDATORY)

---

## 🎯 Quick Reference

This guide contains **critical lessons learned** from deploying agents to AWS Bedrock AgentCore Runtime. Following this guide will save hours of troubleshooting.

### Successfully Deployed Agents
1. ✅ **test-agent** - `agent-q9QEgD3UFo` (eu-west-1)
2. ✅ **coach-companion** - `coach_companion-0ZUOP04U5z` (eu-west-1)

---

## 🚨 CRITICAL REQUIREMENTS

### 1. Region Requirement (MANDATORY)
**ALL deployments MUST use `eu-west-1` (Europe - Ireland) ONLY.**

This is a strict project requirement. See [AWS_REGION_POLICY.md](./AWS_REGION_POLICY.md).

### 2. Model Configuration (CRITICAL)
**In eu-west-1, you MUST use inference profiles, NOT direct model IDs.**

❌ **WRONG**: `anthropic.claude-3-5-sonnet-20241022-v2:0`  
❌ **WRONG**: `anthropic.claude-3-5-sonnet-20240620-v1:0`  
✅ **CORRECT**: `eu.anthropic.claude-3-5-sonnet-20240620-v1:0`

**Why**: eu-west-1 requires inference profiles for on-demand throughput. Direct model IDs will fail with:
```
ValidationException: Invocation of model ID ... with on-demand throughput isn't supported. 
Retry your request with the ID or ARN of an inference profile.
```

**How to find available inference profiles**:
```powershell
aws bedrock list-inference-profiles --region eu-west-1 --query "inferenceProfileSummaries[?contains(inferenceProfileName, 'Claude')].{Name:inferenceProfileName, Id:inferenceProfileId}" --output table
```

### 3. Configuration File Structure (CRITICAL)
**AgentCore requires ABSOLUTE PATHS in `.bedrock_agentcore.yaml`**

❌ **WRONG**:
```yaml
entrypoint: agent.py
source_path: agents/my-agent
```

✅ **CORRECT**:
```yaml
entrypoint: C:/Users/j_e_a/OneDrive/Projects/Vitracka-new/agents/my-agent/agent.py
source_path: C:\Users\j_e_a\OneDrive\Projects\Vitracka-new\agents\my-agent
```

**Why**: AgentCore packages the source directory and needs absolute paths to locate files correctly. Relative paths cause "entrypoint could not be found" errors.

### 4. Python PATH Issue (WINDOWS)
**The `agentcore` command requires Python Scripts directory in PATH**

If you get "agentcore: command not found", run:
```powershell
$PythonScriptsPath = "$env:APPDATA\Python\Python312\Scripts"
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$PythonScriptsPath*") {
    $NewPath = "$UserPath;$PythonScriptsPath"
    [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
}
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
```

**This adds the directory permanently to User PATH and updates the current session.**

---

## 📋 Step-by-Step Deployment Process

### Prerequisites
1. AWS CLI configured with credentials
2. AgentCore CLI installed: `pip install bedrock-agentcore-starter-toolkit`
3. Python Scripts directory in PATH (see above)
4. Region set to eu-west-1
5. **PowerShell Execution Policy** set to allow script execution (see below)

### PowerShell Execution Policy Setup

**Windows users must configure PowerShell to allow script execution.**

If you get "running scripts is disabled on this system" errors, run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**What this does**:
- Allows locally created scripts to run
- Requires downloaded scripts to be signed
- Only affects your user account (safe)
- Permanent setting (one-time setup)

**Alternative** (temporary, for single script):
```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\script-name.ps1
```

### Step 1: Create Agent Directory Structure
```
agents/
└── my-agent/
    ├── agent.py              # Main agent code with @app.entrypoint
    ├── requirements.txt      # Dependencies
    └── README.md            # Documentation
```

### Step 2: Write Agent Code

**CRITICAL**: Use the `@app.entrypoint` decorator pattern:

```python
from strands import Agent
from strands.models import BedrockModel
from bedrock_agentcore import BedrockAgentCoreApp
import os

# Create AgentCore app
app = BedrockAgentCoreApp()

def create_agent():
    """Create your agent with proper model configuration."""
    model = BedrockModel(
        # CRITICAL: Use EU inference profile, not direct model ID
        model_id=os.getenv("MODEL_ID", "eu.anthropic.claude-3-5-sonnet-20240620-v1:0"),
        region_name=os.getenv("AWS_REGION", "eu-west-1"),
        temperature=0.7,
        max_tokens=1024,
    )
    
    agent = Agent(
        model=model,
        system_prompt="Your system prompt here"
    )
    
    return agent

@app.entrypoint
def handler(event, context):
    """AgentCore entrypoint handler."""
    prompt = event.get("prompt", "Hello")
    agent = create_agent()
    response = agent(prompt)
    
    return {
        "response": response.message
    }

if __name__ == "__main__":
    import sys
    if '--local-test' in sys.argv:
        # Test locally
        test_event = {"prompt": "Test message"}
        result = handler(test_event, None)
        print(result)
    else:
        # Let AgentCore handle the runtime
        app.run()
```

### Step 3: Create requirements.txt

```txt
# Strands SDK for agent orchestration
strands-agents>=0.1.0

# AgentCore SDK
bedrock-agentcore>=0.1.0

# AWS SDK
boto3>=1.34.0
```

### Step 4: Configure Agent

**Navigate to agent directory first**:
```powershell
cd agents/my-agent
```

**Then configure** (AgentCore will create `.bedrock_agentcore.yaml`):
```powershell
agentcore configure --entrypoint agent.py --requirements-file requirements.txt --name my_agent --region eu-west-1 --deployment-type direct_code_deploy --non-interactive
```

**IMPORTANT**: 
- Agent names must use underscores, not hyphens: `my_agent` not `my-agent`
- Run from the agent directory so paths are set correctly

### Step 5: Verify Configuration

Check `.bedrock_agentcore.yaml` was created with ABSOLUTE paths:
```yaml
default_agent: agent
agents:
  agent:
    name: my_agent
    entrypoint: C:/Users/j_e_a/OneDrive/Projects/Vitracka-new/agents/my-agent/agent.py
    source_path: C:\Users\j_e_a\OneDrive\Projects\Vitracka-new\agents\my-agent
    deployment_type: direct_code_deploy
    runtime_type: PYTHON_3_12
    aws:
      region: eu-west-1  # MUST be eu-west-1
```

**If paths are relative, manually edit to absolute paths.**

### Step 6: Deploy

```powershell
# Still in agents/my-agent directory
agentcore deploy
```

**Expected output**:
- Dependencies will be built for Linux ARM64
- Package uploaded to S3
- Agent created/updated with ARN
- "Deployment completed successfully"

**Deployment takes 2-5 minutes** (longer on first deploy due to dependency building).

### Step 7: Verify Deployment

```powershell
agentcore status
```

**Look for**: `Ready - Agent deployed and endpoint available`

### Step 8: Test Agent

```powershell
agentcore invoke '{"prompt": "Hello, test message"}'
```

**Expected**: JSON response with agent's message.

---

## 🐛 Common Issues and Solutions

### Issue 1: "entrypoint could not be found"
**Symptom**: Deployment succeeds but agent fails to start  
**Cause**: Relative paths in `.bedrock_agentcore.yaml`  
**Solution**: Edit config file to use absolute paths (see Step 5)

### Issue 2: "Invalid model identifier"
**Symptom**: Agent invocation fails with ValidationException  
**Cause**: Using direct model ID instead of inference profile  
**Solution**: Change model_id to `eu.anthropic.claude-3-5-sonnet-20240620-v1:0`

### Issue 3: "agentcore: command not found"
**Symptom**: PowerShell can't find agentcore command  
**Cause**: Python Scripts directory not in PATH  
**Solution**: Run PATH fix script (see Section 4 above)

### Issue 4: "Invalid agent name"
**Symptom**: Configure fails with name validation error  
**Cause**: Agent name contains hyphens  
**Solution**: Use underscores: `my_agent` not `my-agent`

### Issue 5: "No requirements file found"
**Symptom**: Configure fails looking for requirements.txt  
**Cause**: File not in current directory or not specified  
**Solution**: Use `--requirements-file requirements.txt` flag

### Issue 6: "Region mismatch"
**Symptom**: Resources created in wrong region  
**Cause**: Not specifying region or using wrong region  
**Solution**: Always use `--region eu-west-1` and verify in config

---

## 📁 File Structure Reference

### Working Agent Structure (test-agent)
```
agents/test-agent/
├── .bedrock_agentcore/          # Auto-generated cache
│   └── agent/
│       ├── dependencies.hash
│       └── dependencies.zip
├── .bedrock_agentcore.yaml      # Configuration (absolute paths)
├── agent.py                     # Main code with @app.entrypoint
├── requirements.txt             # Dependencies
├── README.md                    # Documentation
└── app.py                       # Optional FastAPI wrapper
```

### Configuration File Template
```yaml
default_agent: agent
agents:
  agent:
    name: agent_name
    language: python
    node_version: '20'
    entrypoint: C:/Users/j_e_a/OneDrive/Projects/Vitracka-new/agents/agent-name/agent.py
    deployment_type: direct_code_deploy
    runtime_type: PYTHON_3_12
    platform: linux/arm64
    container_runtime: null
    source_path: C:\Users\j_e_a\OneDrive\Projects\Vitracka-new\agents\agent-name
    aws:
      execution_role: arn:aws:iam::732231126129:role/AmazonBedrockAgentCoreSDKRuntime-eu-west-1-xxxxx
      execution_role_auto_create: false
      account: '732231126129'
      region: eu-west-1
      ecr_repository: null
      ecr_auto_create: false
      s3_path: s3://bedrock-agentcore-codebuild-sources-732231126129-eu-west-1
      s3_auto_create: false
      network_configuration:
        network_mode: PUBLIC
        network_mode_config: null
      protocol_configuration:
        server_protocol: HTTP
      observability:
        enabled: true
      lifecycle_configuration:
        idle_runtime_session_timeout: null
        max_lifetime: null
    bedrock_agentcore:
      agent_id: agent-xxxxx
      agent_arn: arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/agent-xxxxx
      agent_session_id: null
    memory:
      mode: STM_ONLY
      memory_id: agent_mem-xxxxx
      memory_arn: arn:aws:bedrock-agentcore:eu-west-1:732231126129:memory/agent_mem-xxxxx
      memory_name: agent_mem
      event_expiry_days: 30
      first_invoke_memory_check_done: true
      was_created_by_toolkit: true
```

---

## 🔍 Verification Checklist

Before deploying a new agent, verify:

- [ ] Agent directory created in `agents/`
- [ ] `agent.py` has `@app.entrypoint` decorator
- [ ] `requirements.txt` includes strands-agents, bedrock-agentcore, boto3
- [ ] Model ID uses EU inference profile: `eu.anthropic.claude-3-5-sonnet-20240620-v1:0`
- [ ] Region set to `eu-west-1` in code
- [ ] Agent name uses underscores (not hyphens)
- [ ] Python Scripts directory in PATH
- [ ] Running from agent directory when configuring
- [ ] `.bedrock_agentcore.yaml` has absolute paths
- [ ] AWS credentials configured

---

## 📊 Monitoring and Logs

### View Agent Status
```powershell
cd agents/my-agent
agentcore status
```

### View Logs
```powershell
aws logs tail /aws/bedrock-agentcore/runtimes/<agent-id>-DEFAULT --log-stream-name-prefix "2026/02/08/[runtime-logs" --follow --region eu-west-1
```

### CloudWatch Dashboard
https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#gen-ai-observability/agent-core

### Cost Monitoring
```powershell
.\scripts\daily-cost-report.ps1
```

---

## 🔄 Redeployment Process

To update an existing agent:

1. **Modify code** in `agents/my-agent/agent.py`
2. **Navigate to directory**: `cd agents/my-agent`
3. **Deploy**: `agentcore deploy`
4. **Test**: `agentcore invoke '{"prompt": "test"}'`

**Note**: Configuration changes require `agentcore configure` again.

---

## 🗑️ Cleanup

To remove an agent:

```powershell
cd agents/my-agent
agentcore destroy
```

**This will delete**:
- Agent runtime
- Memory resource
- CloudWatch logs (after retention period)

**This will NOT delete**:
- IAM roles (shared across agents)
- S3 bucket (shared across agents)

---

## 💡 Best Practices

### 1. Agent Naming
- Use descriptive names: `coach_companion`, `test_agent`
- Use underscores, not hyphens
- Keep names under 48 characters
- Use lowercase

### 2. Model Configuration
- Always use environment variables for model_id
- Default to EU inference profile
- Set appropriate temperature (0.7 for creative, 0.1 for factual)
- Set max_tokens based on use case (512-2048)

### 3. Error Handling
- Wrap handler in try-except
- Return user-friendly error messages
- Log errors for debugging
- Never expose internal errors to users

### 4. Testing
- Test locally with `--local-test` flag before deploying
- Test with various input formats
- Test error scenarios
- Monitor logs after deployment

### 5. Cost Management
- Use STM_ONLY memory mode (cheaper)
- Set appropriate max_tokens
- Monitor invocation counts
- Use `agentcore destroy` when not needed

---

## 📚 Reference Documentation

### Official Docs
- [AWS Bedrock AgentCore](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-agentcore.html)
- [Strands SDK](https://github.com/awslabs/strands-agents)
- [AgentCore Starter Toolkit](https://pypi.org/project/bedrock-agentcore-starter-toolkit/)

### Project Docs
- [AWS_REGION_POLICY.md](./AWS_REGION_POLICY.md) - Region requirements
- [COACH_COMPANION_DEPLOYMENT_SUCCESS.md](./COACH_COMPANION_DEPLOYMENT_SUCCESS.md) - Deployment example
- [AGENTCORE_QUICKSTART.md](./AGENTCORE_QUICKSTART.md) - Quick start guide

---

## 🎓 Key Lessons Learned

1. **Absolute paths are required** - AgentCore cannot resolve relative paths correctly
2. **Inference profiles are mandatory in eu-west-1** - Direct model IDs fail
3. **PATH issues persist** - Must permanently add Python Scripts to User PATH
4. **Agent names matter** - Underscores only, no hyphens
5. **Directory context matters** - Run configure from agent directory
6. **@app.entrypoint is required** - AgentCore won't find handler without it
7. **Direct deployment is simpler** - No Docker/ECR needed
8. **First deployment is slow** - Dependencies must be built for ARM64

---

## ✅ Success Indicators

Your deployment is successful when:

1. `agentcore status` shows "Ready - Agent deployed and endpoint available"
2. `agentcore invoke` returns a proper response (not an error)
3. CloudWatch logs show successful invocations
4. Agent ARN is visible in AWS Console
5. Memory resource is ACTIVE
6. No error messages in deployment output

---

## 🆘 Getting Help

If you encounter issues not covered here:

1. Check CloudWatch logs for detailed errors
2. Verify all checklist items above
3. Compare your setup with working agents (test-agent, coach-companion)
4. Check AWS Bedrock service quotas
5. Verify IAM permissions

---

**This guide is based on real deployment experience from February 8, 2026.**  
**Following these steps exactly will result in successful deployments.**


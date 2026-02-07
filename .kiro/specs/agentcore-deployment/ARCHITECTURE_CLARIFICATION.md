# Architecture Clarification

## Corrected Architecture

The Vitracka AI agents are built using **Strands SDK**, not AWS Bedrock Agents directly. Here's the correct technology stack:

### Technology Stack

1. **Strands SDK** (Python)
   - Framework for building AI agents
   - Provides agent orchestration, tool calling, and conversation management
   - Used to create Coach Companion, Test Agent, and future agents

2. **AWS Bedrock** (Foundation Model)
   - Provides Claude 3.5 Sonnet as the LLM
   - Accessed via Strands SDK's BedrockModel integration
   - Handles natural language understanding and generation

3. **FastAPI** (HTTP Layer)
   - Wraps Strands agents as HTTP services
   - Exposes REST endpoints for agent invocation
   - Handles request/response serialization

4. **Docker** (Containerization)
   - Packages Python + Strands + FastAPI into containers
   - ARM64 images for cost-effective Graviton2 processors

5. **AWS ECS Fargate** (Container Orchestration)
   - Serverless container hosting
   - Auto-scaling based on load
   - Integrated with ALB for HTTP routing

6. **AWS ECR** (Container Registry)
   - Stores Docker images
   - Integrated with ECS for deployments

## What We're NOT Using

❌ **AWS Bedrock Agents** - This is a separate AWS service for building agents. We're not using this.

✅ **Strands SDK + AWS Bedrock (Claude)** - This is what we're using.

## Agent Architecture

```python
# agents/coach-companion/agent.py
from strands import Agent, tool
from strands.models import BedrockModel

class CoachCompanionAgent:
    def __init__(self):
        # Strands uses Bedrock for the LLM
        self.model = BedrockModel(
            model_id="us.anthropic.claude-3-5-sonnet-20241022-v2:0",
            region_name="us-east-1"
        )
        
        # Strands Agent with tools and system prompt
        self.agent = Agent(
            model=self.model,
            tools=[...],
            system_prompt="..."
        )
    
    def coach(self, message: str) -> str:
        # Strands handles the agent logic
        return self.agent(message)
```

```python
# agents/coach-companion/api.py
from fastapi import FastAPI
from agent import get_agent

app = FastAPI()

@app.post("/coach")
async def coach(request: CoachingRequest):
    agent = get_agent()
    response = agent.coach(request.message)
    return {"response": response}
```

## Deployment Flow

1. **Build**: Docker image with Python + Strands + FastAPI
2. **Push**: Image to AWS ECR
3. **Deploy**: ECS Fargate task running the container
4. **Expose**: Application Load Balancer routes HTTP to container
5. **Invoke**: Mobile app → Node.js backend → HTTP → FastAPI → Strands Agent → Bedrock Claude

## Why This Architecture?

### Advantages of Strands + ECS/Fargate

✅ **Full control** over agent logic and behavior
✅ **Flexible** - can use any Python libraries
✅ **Portable** - can run anywhere (local, ECS, Lambda, etc.)
✅ **Cost-effective** - pay only for container runtime
✅ **Familiar** - standard Docker/ECS deployment

### What AWS Bedrock Agents Would Provide

AWS Bedrock Agents is a managed service that:
- Provides pre-built agent orchestration
- Handles tool calling and memory
- Integrates with AWS services
- Charges per invocation

We chose Strands instead because:
- More flexibility in agent design
- Better integration with existing Python ecosystem
- More control over costs
- Easier local development and testing

## References

- [Strands SDK Documentation](https://docs.strands.ai/)
- [AWS Bedrock Models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [ECS Fargate Documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)

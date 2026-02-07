"""
Simple Test Agent for AgentCore Deployment Validation
This minimal agent tests the deployment pipeline before deploying production agents.
"""

from strands import Agent
from strands.models import BedrockModel
from bedrock_agentcore import BedrockAgentCoreApp
import os


# Create AgentCore app
app = BedrockAgentCoreApp()


def create_test_agent():
    """Create a simple test agent that echoes messages."""
    
    # Configure Bedrock model with inference profile
    # Use cross-region inference profile for Claude 3.5 Sonnet
    model = BedrockModel(
        model_id=os.getenv("MODEL_ID", "us.anthropic.claude-3-5-sonnet-20241022-v2:0"),
        region_name=os.getenv("AWS_REGION", "us-east-1"),
        temperature=0.7,
        max_tokens=512,
    )
    
    # Create simple agent
    agent = Agent(
        model=model,
        system_prompt="You are a friendly test agent. Respond with 'Hello from AgentCore!' followed by a brief, cheerful message."
    )
    
    return agent


@app.entrypoint
def handler(event, context):
    """AgentCore entrypoint handler."""
    # Extract prompt from event
    prompt = event.get("prompt", "Hello")
    
    # Create and invoke agent
    agent = create_test_agent()
    response = agent(prompt)
    
    # Return response in AgentCore format
    return {
        "response": response.message
    }


def test_agent_locally():
    """Test the agent locally before deployment."""
    print("Testing agent locally...")
    
    agent = create_test_agent()
    response = agent("Hello, test agent!")
    
    print(f"Agent response: {response.message}")
    print("✓ Local test passed!")


if __name__ == "__main__":
    # Only run local test if not in AgentCore Runtime
    import sys
    if '--local-test' in sys.argv:
        test_agent_locally()
    else:
        # Let AgentCore handle the runtime
        app.run()

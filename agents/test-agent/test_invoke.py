"""Test script to invoke the deployed AgentCore agent."""

import boto3
import json

# Agent details from deployment
AGENT_ARN = "arn:aws:bedrock-agentcore:us-east-1:732231126129:runtime/agent-QVq5tY47wq"
REGION = "us-east-1"

def test_agent_invocation():
    """Test invoking the deployed agent."""
    print("Testing deployed agent invocation...")
    print(f"Agent ARN: {AGENT_ARN}")
    print(f"Region: {REGION}\n")
    
    try:
        print("Invoking agent with bedrock-agentcore client...")
        client = boto3.client('bedrock-agentcore', region_name=REGION)
        
        # Use correct parameters: agentRuntimeArn and payload
        payload = json.dumps({'prompt': 'Hello from the deployed agent!'})
        
        response = client.invoke_agent_runtime(
            agentRuntimeArn=AGENT_ARN,
            payload=payload,
            contentType='application/json',
            accept='application/json'
        )
        
        print("\nRaw response:")
        print(json.dumps(response, indent=2, default=str))
        
        # Extract and parse the response payload
        if 'payload' in response:
            response_payload = response['payload'].read().decode('utf-8')
            print("\n📝 Agent output:")
            print(response_payload)
            
            try:
                parsed = json.loads(response_payload)
                print("\nParsed response:")
                print(json.dumps(parsed, indent=2))
            except:
                pass
        
        print("\n✓ Agent invocation successful!")
        return True
        
    except Exception as e:
        print(f"\n✗ Error invoking agent: {e}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_agent_invocation()
    exit(0 if success else 1)

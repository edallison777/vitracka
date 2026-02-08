#!/usr/bin/env python3
"""
Quick test to see the actual response format from AgentCore.
"""

import boto3
import json
import uuid

AGENT_ARN = "arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/coach_companion-0ZUOP04U5z"
REGION = "eu-west-1"

client = boto3.client('bedrock-agentcore', region_name=REGION)

# Prepare payload
payload = json.dumps({"prompt": "Hello, test message"}).encode('utf-8')

# Invoke agent
print("Invoking agent...")
response = client.invoke_agent_runtime(
    agentRuntimeArn=AGENT_ARN,
    runtimeSessionId=str(uuid.uuid4()),
    payload=payload
)

print("\n=== Response Structure ===")
print(f"Keys: {response.keys()}")
print(f"Content-Type: {response.get('contentType', 'N/A')}")
print(f"Response type: {type(response.get('response'))}")

print("\n=== Response Object ===")
response_obj = response.get('response')
print(f"Response object: {response_obj}")
print(f"Response dir: {dir(response_obj)}")

print("\n=== Attempting to read response ===")
try:
    # Try reading as stream
    content = response_obj.read()
    print(f"Read content (bytes): {content[:200]}")
    print(f"Decoded: {content.decode('utf-8')}")
except Exception as e:
    print(f"Error reading as stream: {e}")

print("\nDone!")

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Small load test for Coach Companion AgentCore agent (10 concurrent users).

Quick validation that the system can handle concurrent load.
"""

import sys
import io
import boto3
import json
import time
import uuid
import concurrent.futures
from datetime import datetime

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Configuration
AGENT_ARN = "arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/coach_companion-0ZUOP04U5z"
REGION = "eu-west-1"
NUM_CONCURRENT_USERS = 10

# Test prompts
TEST_PROMPTS = [
    "I need motivation",
    "How do I stay on track?",
    "I want to lose weight",
    "I'm feeling discouraged",
    "I lost 2 pounds!",
]

client = boto3.client('bedrock-agentcore', region_name=REGION)

def invoke_agent(prompt: str, session_id: str):
    """Invoke agent and return success, duration, error."""
    start_time = time.time()
    try:
        payload = json.dumps({"prompt": prompt}).encode('utf-8')
        response = client.invoke_agent_runtime(
            agentRuntimeArn=AGENT_ARN,
            runtimeSessionId=session_id,
            payload=payload
        )
        response_body = response['response'].read()
        response_data = json.loads(response_body.decode('utf-8'))
        
        full_response = ""
        if 'response' in response_data:
            for item in response_data['response'].get('content', []):
                if 'text' in item:
                    full_response += item['text']
        
        duration_ms = (time.time() - start_time) * 1000
        return True, duration_ms, ""
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        return False, duration_ms, str(e)

def simulate_user(user_id: int):
    """Simulate a single user."""
    session_id = str(uuid.uuid4())
    prompt = TEST_PROMPTS[user_id % len(TEST_PROMPTS)]
    success, duration, error = invoke_agent(prompt, session_id)
    return {"user_id": user_id, "success": success, "duration": duration, "error": error}

print("="*70)
print("SMALL LOAD TEST (10 concurrent users)")
print("="*70)
print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("\nRunning test...")

start_time = time.time()
results = []

with concurrent.futures.ThreadPoolExecutor(max_workers=NUM_CONCURRENT_USERS) as executor:
    futures = [executor.submit(simulate_user, i) for i in range(NUM_CONCURRENT_USERS)]
    for future in concurrent.futures.as_completed(futures):
        result = future.result()
        results.append(result)
        status = "✅" if result["success"] else "❌"
        print(f"  User {result['user_id']}: {status} ({result['duration']:.0f}ms)")

end_time = time.time()

# Calculate statistics
successful = sum(1 for r in results if r["success"])
failed = sum(1 for r in results if not r["success"])
durations = [r["duration"] for r in results if r["success"]]

print("\n" + "="*70)
print("RESULTS")
print("="*70)
print(f"Total Requests: {len(results)}")
print(f"Successful: {successful} ({successful/len(results)*100:.1f}%)")
print(f"Failed: {failed}")

if durations:
    print(f"\nResponse Times:")
    print(f"  Average: {sum(durations)/len(durations):.0f}ms")
    print(f"  Min: {min(durations):.0f}ms")
    print(f"  Max: {max(durations):.0f}ms")

print(f"\nTotal Duration: {end_time - start_time:.1f}s")
print("="*70)

if successful >= 9:  # 90% success rate
    print("\n✅ LOAD TEST PASSED")
    exit(0)
else:
    print("\n❌ LOAD TEST FAILED")
    exit(1)

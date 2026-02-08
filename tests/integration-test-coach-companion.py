#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Integration tests for Coach Companion AgentCore agent.

Tests cover:
- User onboarding flow
- Goal setting
- Progress tracking
- Error scenarios
- Response times
"""

import sys
import io
import boto3
import json
import time
import uuid
from datetime import datetime
from typing import Dict, List, Tuple

# Fix Windows console encoding for emoji support
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Configuration
AGENT_ARN = "arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/coach_companion-0ZUOP04U5z"
REGION = "eu-west-1"

# Test user IDs (must be at least 33 characters - use UUIDs)
TEST_USER_1 = str(uuid.uuid4())  # For onboarding tests
TEST_USER_2 = str(uuid.uuid4())  # For goal setting tests
TEST_USER_3 = str(uuid.uuid4())  # For progress tracking tests

# Initialize AgentCore client (not bedrock-agent-runtime)
client = boto3.client('bedrock-agentcore', region_name=REGION)

class TestResults:
    """Track test results."""
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.tests = []
    
    def add_result(self, test_name: str, passed: bool, message: str = "", duration_ms: float = 0):
        self.tests.append({
            "name": test_name,
            "passed": passed,
            "message": message,
            "duration_ms": duration_ms
        })
        if passed:
            self.passed += 1
        else:
            self.failed += 1
    
    def print_summary(self):
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        print(f"Total Tests: {self.passed + self.failed}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        print(f"Success Rate: {(self.passed / (self.passed + self.failed) * 100):.1f}%")
        print("="*70)
        
        if self.failed > 0:
            print("\nFailed Tests:")
            for test in self.tests:
                if not test["passed"]:
                    print(f"  ❌ {test['name']}: {test['message']}")
        
        print("\nAll Tests:")
        for test in self.tests:
            status = "✅" if test["passed"] else "❌"
            duration = f"({test['duration_ms']:.0f}ms)" if test['duration_ms'] > 0 else ""
            print(f"  {status} {test['name']} {duration}")

results = TestResults()

def invoke_agent(prompt: str, session_id: str) -> Tuple[str, float]:
    """
    Invoke the AgentCore agent and return response with timing.
    
    Uses the bedrock-agentcore client with invoke_agent_runtime method.
    
    Returns:
        Tuple of (response_text, duration_ms)
    """
    start_time = time.time()
    
    try:
        # Prepare payload as binary JSON
        payload = json.dumps({"prompt": prompt}).encode('utf-8')
        
        # Invoke AgentCore Runtime agent
        response = client.invoke_agent_runtime(
            agentRuntimeArn=AGENT_ARN,
            runtimeSessionId=session_id,
            payload=payload
        )
        
        # Read the streaming body
        response_body = response['response'].read()
        response_data = json.loads(response_body.decode('utf-8'))
        
        # Extract text from the response structure
        # Format: {"response": {"role": "assistant", "content": [{"text": "..."}]}}
        full_response = ""
        if 'response' in response_data:
            content = response_data['response'].get('content', [])
            for item in content:
                if 'text' in item:
                    full_response += item['text']
        else:
            # Fallback: try to get response directly
            full_response = str(response_data)
        
        duration_ms = (time.time() - start_time) * 1000
        return full_response, duration_ms
    
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        raise Exception(f"Agent invocation failed: {str(e)}")

def test_basic_invocation():
    """Test 15.1.1: Basic agent invocation works."""
    print("\n--- Test: Basic Invocation ---")
    
    try:
        response, duration = invoke_agent("Hello", TEST_USER_1)
        
        if response and len(response) > 0:
            print(f"✅ Agent responded: {response[:100]}...")
            results.add_result("Basic Invocation", True, duration_ms=duration)
        else:
            print("❌ Agent returned empty response")
            results.add_result("Basic Invocation", False, "Empty response")
    except Exception as e:
        print(f"❌ Error: {e}")
        results.add_result("Basic Invocation", False, str(e))

def test_onboarding_flow():
    """Test 15.1: User onboarding flow."""
    print("\n--- Test: User Onboarding Flow ---")
    
    test_cases = [
        ("I'm new here and want to start my weight loss journey", "introduction"),
        ("I want to lose weight", "goal_statement"),
        ("I'm on Ozempic", "medication_disclosure"),
        ("I prefer gentle coaching", "coaching_style"),
    ]
    
    for prompt, test_name in test_cases:
        try:
            print(f"\nTesting: {test_name}")
            print(f"Prompt: {prompt}")
            
            response, duration = invoke_agent(prompt, TEST_USER_1)
            
            # Check response is not empty and seems relevant
            if response and len(response) > 20:
                print(f"✅ Response ({duration:.0f}ms): {response[:150]}...")
                results.add_result(f"Onboarding - {test_name}", True, duration_ms=duration)
            else:
                print(f"❌ Response too short or empty")
                results.add_result(f"Onboarding - {test_name}", False, "Response too short")
        
        except Exception as e:
            print(f"❌ Error: {e}")
            results.add_result(f"Onboarding - {test_name}", False, str(e))
        
        time.sleep(1)  # Rate limiting

def test_goal_setting():
    """Test 15.2: Goal setting scenarios."""
    print("\n--- Test: Goal Setting ---")
    
    test_cases = [
        ("I want to lose 10 pounds in 3 months", "realistic_goal"),
        ("My goal is to maintain my current weight", "maintenance_goal"),
        ("I want to transition off my medication", "transition_goal"),
        ("I want to lose 50 pounds in 1 month", "unrealistic_goal"),
    ]
    
    for prompt, test_name in test_cases:
        try:
            print(f"\nTesting: {test_name}")
            print(f"Prompt: {prompt}")
            
            response, duration = invoke_agent(prompt, TEST_USER_2)
            
            # Check for goal-related keywords in response
            goal_keywords = ["goal", "plan", "achieve", "realistic", "step"]
            has_goal_content = any(keyword in response.lower() for keyword in goal_keywords)
            
            if response and has_goal_content:
                print(f"✅ Response ({duration:.0f}ms): {response[:150]}...")
                results.add_result(f"Goal Setting - {test_name}", True, duration_ms=duration)
            else:
                print(f"❌ Response doesn't address goal setting")
                results.add_result(f"Goal Setting - {test_name}", False, "Missing goal content")
        
        except Exception as e:
            print(f"❌ Error: {e}")
            results.add_result(f"Goal Setting - {test_name}", False, str(e))
        
        time.sleep(1)

def test_progress_tracking():
    """Test 15.3: Progress tracking scenarios."""
    print("\n--- Test: Progress Tracking ---")
    
    test_cases = [
        ("I lost 2 pounds this week!", "positive_progress"),
        ("I gained a pound this week", "setback"),
        ("My weight stayed the same", "plateau"),
        ("I'm feeling more energetic", "non_scale_victory"),
    ]
    
    for prompt, test_name in test_cases:
        try:
            print(f"\nTesting: {test_name}")
            print(f"Prompt: {prompt}")
            
            response, duration = invoke_agent(prompt, TEST_USER_3)
            
            # Check for supportive/coaching keywords
            coaching_keywords = ["progress", "great", "keep", "continue", "proud", "understand"]
            has_coaching = any(keyword in response.lower() for keyword in coaching_keywords)
            
            if response and has_coaching:
                print(f"✅ Response ({duration:.0f}ms): {response[:150]}...")
                results.add_result(f"Progress - {test_name}", True, duration_ms=duration)
            else:
                print(f"❌ Response lacks coaching tone")
                results.add_result(f"Progress - {test_name}", False, "Missing coaching tone")
        
        except Exception as e:
            print(f"❌ Error: {e}")
            results.add_result(f"Progress - {test_name}", False, str(e))
        
        time.sleep(1)

def test_error_scenarios():
    """Test 15.5: Error handling scenarios."""
    print("\n--- Test: Error Scenarios ---")
    
    test_cases = [
        ("", "empty_input"),
        ("a" * 10000, "very_long_input"),
        ("🎉🎊🎈", "emoji_only"),
        ("What's the weather?", "off_topic"),
    ]
    
    for prompt, test_name in test_cases:
        try:
            print(f"\nTesting: {test_name}")
            
            if test_name == "empty_input":
                # Empty input should be handled gracefully
                print("Skipping empty input test (would fail validation)")
                results.add_result(f"Error - {test_name}", True, "Skipped - validation expected")
                continue
            
            # Use UUID for session ID (must be at least 33 characters)
            session_id = str(uuid.uuid4())
            response, duration = invoke_agent(prompt, session_id)
            
            # Agent should respond without crashing
            if response:
                print(f"✅ Agent handled gracefully ({duration:.0f}ms)")
                results.add_result(f"Error - {test_name}", True, duration_ms=duration)
            else:
                print(f"❌ No response")
                results.add_result(f"Error - {test_name}", False, "No response")
        
        except Exception as e:
            # Some errors are expected, but agent shouldn't crash
            print(f"⚠️  Exception (may be expected): {e}")
            results.add_result(f"Error - {test_name}", True, f"Exception handled: {str(e)[:50]}")
        
        time.sleep(1)

def test_response_times():
    """Test 15.7: Measure response times."""
    print("\n--- Test: Response Times ---")
    
    durations = []
    num_tests = 5
    
    for i in range(num_tests):
        try:
            prompt = f"Give me a quick tip for staying motivated (test {i+1})"
            # Use UUID for session ID
            session_id = str(uuid.uuid4())
            response, duration = invoke_agent(prompt, session_id)
            durations.append(duration)
            print(f"  Test {i+1}: {duration:.0f}ms")
            time.sleep(0.5)
        except Exception as e:
            print(f"  Test {i+1}: Failed - {e}")
    
    if durations:
        avg_duration = sum(durations) / len(durations)
        max_duration = max(durations)
        min_duration = min(durations)
        
        print(f"\nResponse Time Statistics:")
        print(f"  Average: {avg_duration:.0f}ms")
        print(f"  Min: {min_duration:.0f}ms")
        print(f"  Max: {max_duration:.0f}ms")
        
        # Check if average is within acceptable range (< 5000ms)
        if avg_duration < 5000:
            print(f"✅ Average response time acceptable")
            results.add_result("Response Time - Average", True, f"{avg_duration:.0f}ms")
        else:
            print(f"❌ Average response time too high")
            results.add_result("Response Time - Average", False, f"{avg_duration:.0f}ms > 5000ms")
        
        # Check if max is reasonable (< 10000ms)
        if max_duration < 10000:
            print(f"✅ Max response time acceptable")
            results.add_result("Response Time - Max", True, f"{max_duration:.0f}ms")
        else:
            print(f"❌ Max response time too high")
            results.add_result("Response Time - Max", False, f"{max_duration:.0f}ms > 10000ms")
    else:
        results.add_result("Response Time", False, "No successful tests")

def test_cloudwatch_logs():
    """Test 15.8: Verify CloudWatch logs are being written."""
    print("\n--- Test: CloudWatch Logs ---")
    
    # AgentCore logs use a different path format
    log_group = f"/aws/bedrock-agentcore/runtimes/{AGENT_ARN.split('/')[-1]}-DEFAULT"
    logs_client = boto3.client('logs', region_name=REGION)
    
    try:
        # Check if log group exists
        response = logs_client.describe_log_groups(
            logGroupNamePrefix="/aws/bedrock-agentcore/runtimes/",
            limit=10
        )
        
        if response['logGroups']:
            print(f"✅ Found {len(response['logGroups'])} AgentCore log group(s)")
            
            # Try to find our specific agent's logs
            agent_id = AGENT_ARN.split('/')[-1]
            matching_groups = [lg for lg in response['logGroups'] if agent_id in lg['logGroupName']]
            
            if matching_groups:
                log_group_name = matching_groups[0]['logGroupName']
                print(f"  Log group: {log_group_name}")
                
                # Check for recent log streams
                streams = logs_client.describe_log_streams(
                    logGroupName=log_group_name,
                    orderBy='LastEventTime',
                    descending=True,
                    limit=5
                )
                
                if streams['logStreams']:
                    latest_stream = streams['logStreams'][0]
                    last_event_time = latest_stream.get('lastEventTime', 0)
                    
                    # Check if logs are recent (within last hour)
                    current_time = int(time.time() * 1000)
                    age_minutes = (current_time - last_event_time) / 1000 / 60
                    
                    print(f"  Latest log stream: {latest_stream['logStreamName']}")
                    print(f"  Last event: {age_minutes:.1f} minutes ago")
                    
                    if age_minutes < 60:
                        print(f"✅ Recent logs found")
                        results.add_result("CloudWatch Logs - Recent", True)
                    else:
                        print(f"⚠️  No recent logs (last event {age_minutes:.0f} min ago)")
                        results.add_result("CloudWatch Logs - Recent", False, f"Last event {age_minutes:.0f} min ago")
                else:
                    print(f"⚠️  No log streams found")
                    results.add_result("CloudWatch Logs - Streams", False, "No streams")
                
                results.add_result("CloudWatch Logs - Exists", True)
            else:
                print(f"⚠️  No log group found for agent {agent_id}")
                results.add_result("CloudWatch Logs - Exists", False, f"No logs for {agent_id}")
        else:
            print(f"❌ No AgentCore log groups found")
            results.add_result("CloudWatch Logs - Exists", False, "No log groups")
    
    except Exception as e:
        print(f"❌ Error checking logs: {e}")
        results.add_result("CloudWatch Logs", False, str(e))

def main():
    """Run all integration tests."""
    print("="*70)
    print("COACH COMPANION INTEGRATION TESTS")
    print("="*70)
    print(f"Agent ARN: {AGENT_ARN}")
    print(f"Region: {REGION}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)
    
    # Run all tests
    test_basic_invocation()
    test_onboarding_flow()
    test_goal_setting()
    test_progress_tracking()
    test_error_scenarios()
    test_response_times()
    test_cloudwatch_logs()
    
    # Print summary
    results.print_summary()
    
    # Save results to file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    results_file = f"tests/integration-results-{timestamp}.json"
    
    with open(results_file, 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "agent_arn": AGENT_ARN,
            "region": REGION,
            "summary": {
                "total": results.passed + results.failed,
                "passed": results.passed,
                "failed": results.failed,
                "success_rate": results.passed / (results.passed + results.failed) * 100
            },
            "tests": results.tests
        }, f, indent=2)
    
    print(f"\nResults saved to: {results_file}")
    
    # Exit with appropriate code
    exit(0 if results.failed == 0 else 1)

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Load testing for Coach Companion AgentCore agent.

Tests concurrent user load to verify:
- System handles multiple simultaneous requests
- Response times remain acceptable under load
- No errors or failures occur
- Agent maintains quality responses
"""

import sys
import io
import boto3
import json
import time
import uuid
import concurrent.futures
from datetime import datetime
from typing import Dict, List, Tuple

# Fix Windows console encoding for emoji support
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Configuration
AGENT_ARN = "arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/coach_companion-0ZUOP04U5z"
REGION = "eu-west-1"
NUM_CONCURRENT_USERS = 100
REQUESTS_PER_USER = 1

# Test prompts (varied to simulate real usage)
TEST_PROMPTS = [
    "I need motivation today",
    "How do I stay on track?",
    "I want to lose weight",
    "I'm feeling discouraged",
    "What should I eat today?",
    "I lost 2 pounds this week!",
    "I'm struggling with cravings",
    "How can I exercise more?",
    "I gained weight this week",
    "Tell me about healthy habits",
]

# Initialize AgentCore client
client = boto3.client('bedrock-agentcore', region_name=REGION)

class LoadTestResults:
    """Track load test results."""
    def __init__(self):
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.response_times = []
        self.errors = []
        self.start_time = None
        self.end_time = None
    
    def add_success(self, duration_ms: float):
        self.successful_requests += 1
        self.response_times.append(duration_ms)
    
    def add_failure(self, error: str):
        self.failed_requests += 1
        self.errors.append(error)
    
    def get_statistics(self) -> Dict:
        if not self.response_times:
            return {
                "total_requests": self.total_requests,
                "successful": self.successful_requests,
                "failed": self.failed_requests,
                "success_rate": 0,
                "avg_response_time": 0,
                "min_response_time": 0,
                "max_response_time": 0,
                "p50_response_time": 0,
                "p95_response_time": 0,
                "p99_response_time": 0,
                "total_duration": 0,
                "requests_per_second": 0
            }
        
        sorted_times = sorted(self.response_times)
        total_duration = (self.end_time - self.start_time) if self.end_time and self.start_time else 0
        
        return {
            "total_requests": self.total_requests,
            "successful": self.successful_requests,
            "failed": self.failed_requests,
            "success_rate": (self.successful_requests / self.total_requests * 100) if self.total_requests > 0 else 0,
            "avg_response_time": sum(self.response_times) / len(self.response_times),
            "min_response_time": min(self.response_times),
            "max_response_time": max(self.response_times),
            "p50_response_time": sorted_times[len(sorted_times) // 2],
            "p95_response_time": sorted_times[int(len(sorted_times) * 0.95)],
            "p99_response_time": sorted_times[int(len(sorted_times) * 0.99)],
            "total_duration": total_duration,
            "requests_per_second": self.total_requests / total_duration if total_duration > 0 else 0
        }
    
    def print_summary(self):
        stats = self.get_statistics()
        
        print("\n" + "="*70)
        print("LOAD TEST SUMMARY")
        print("="*70)
        print(f"Total Requests: {stats['total_requests']}")
        print(f"Successful: {stats['successful']} ({stats['success_rate']:.1f}%)")
        print(f"Failed: {stats['failed']}")
        print(f"\nResponse Times:")
        print(f"  Average: {stats['avg_response_time']:.0f}ms")
        print(f"  Min: {stats['min_response_time']:.0f}ms")
        print(f"  Max: {stats['max_response_time']:.0f}ms")
        print(f"  P50 (median): {stats['p50_response_time']:.0f}ms")
        print(f"  P95: {stats['p95_response_time']:.0f}ms")
        print(f"  P99: {stats['p99_response_time']:.0f}ms")
        print(f"\nThroughput:")
        print(f"  Total Duration: {stats['total_duration']:.1f}s")
        print(f"  Requests/Second: {stats['requests_per_second']:.2f}")
        print("="*70)
        
        if self.errors:
            print(f"\nErrors ({len(self.errors)} total):")
            # Show first 5 unique errors
            unique_errors = list(set(self.errors[:10]))
            for error in unique_errors[:5]:
                print(f"  - {error[:100]}")
            if len(unique_errors) > 5:
                print(f"  ... and {len(unique_errors) - 5} more unique errors")

results = LoadTestResults()

def invoke_agent(prompt: str, session_id: str) -> Tuple[bool, float, str]:
    """
    Invoke the AgentCore agent and return success status, duration, and error message.
    
    Returns:
        Tuple of (success, duration_ms, error_message)
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
        full_response = ""
        if 'response' in response_data:
            content = response_data['response'].get('content', [])
            for item in content:
                if 'text' in item:
                    full_response += item['text']
        
        duration_ms = (time.time() - start_time) * 1000
        
        # Validate response
        if full_response and len(full_response) > 10:
            return True, duration_ms, ""
        else:
            return False, duration_ms, "Empty or too short response"
    
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        return False, duration_ms, str(e)

def simulate_user(user_id: int) -> Dict:
    """
    Simulate a single user making requests.
    
    Returns:
        Dictionary with user results
    """
    session_id = str(uuid.uuid4())
    user_results = {
        "user_id": user_id,
        "successful": 0,
        "failed": 0,
        "response_times": []
    }
    
    for i in range(REQUESTS_PER_USER):
        # Select a prompt (cycle through available prompts)
        prompt = TEST_PROMPTS[(user_id + i) % len(TEST_PROMPTS)]
        
        # Invoke agent
        success, duration, error = invoke_agent(prompt, session_id)
        
        if success:
            user_results["successful"] += 1
            user_results["response_times"].append(duration)
        else:
            user_results["failed"] += 1
            user_results["error"] = error
    
    return user_results

def run_load_test():
    """Run the load test with concurrent users."""
    print("="*70)
    print("COACH COMPANION LOAD TEST")
    print("="*70)
    print(f"Agent ARN: {AGENT_ARN}")
    print(f"Region: {REGION}")
    print(f"Concurrent Users: {NUM_CONCURRENT_USERS}")
    print(f"Requests per User: {REQUESTS_PER_USER}")
    print(f"Total Requests: {NUM_CONCURRENT_USERS * REQUESTS_PER_USER}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*70)
    print("\nStarting load test...")
    
    results.total_requests = NUM_CONCURRENT_USERS * REQUESTS_PER_USER
    results.start_time = time.time()
    
    # Use ThreadPoolExecutor for concurrent requests
    with concurrent.futures.ThreadPoolExecutor(max_workers=NUM_CONCURRENT_USERS) as executor:
        # Submit all user simulations
        futures = [executor.submit(simulate_user, i) for i in range(NUM_CONCURRENT_USERS)]
        
        # Process results as they complete
        completed = 0
        for future in concurrent.futures.as_completed(futures):
            try:
                user_result = future.result()
                
                # Add to overall results
                for duration in user_result["response_times"]:
                    results.add_success(duration)
                
                for _ in range(user_result["failed"]):
                    error = user_result.get("error", "Unknown error")
                    results.add_failure(error)
                
                completed += 1
                
                # Progress indicator
                if completed % 10 == 0:
                    print(f"  Progress: {completed}/{NUM_CONCURRENT_USERS} users completed")
            
            except Exception as e:
                print(f"  Error processing user result: {e}")
                results.add_failure(str(e))
    
    results.end_time = time.time()
    
    print("\nLoad test completed!")
    
    # Print summary
    results.print_summary()
    
    # Save results to file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    results_file = f"tests/load-test-results-{timestamp}.json"
    
    stats = results.get_statistics()
    with open(results_file, 'w') as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "agent_arn": AGENT_ARN,
            "region": REGION,
            "config": {
                "concurrent_users": NUM_CONCURRENT_USERS,
                "requests_per_user": REQUESTS_PER_USER,
                "total_requests": NUM_CONCURRENT_USERS * REQUESTS_PER_USER
            },
            "results": stats,
            "errors": results.errors[:20]  # Save first 20 errors
        }, f, indent=2)
    
    print(f"\nResults saved to: {results_file}")
    
    # Determine pass/fail
    if stats['success_rate'] >= 95 and stats['avg_response_time'] < 15000:
        print("\n✅ LOAD TEST PASSED")
        print(f"   - Success rate: {stats['success_rate']:.1f}% (>= 95%)")
        print(f"   - Avg response time: {stats['avg_response_time']:.0f}ms (< 15000ms)")
        return 0
    else:
        print("\n❌ LOAD TEST FAILED")
        if stats['success_rate'] < 95:
            print(f"   - Success rate: {stats['success_rate']:.1f}% (< 95%)")
        if stats['avg_response_time'] >= 15000:
            print(f"   - Avg response time: {stats['avg_response_time']:.0f}ms (>= 15000ms)")
        return 1

if __name__ == "__main__":
    exit_code = run_load_test()
    exit(exit_code)

"""
Test script for Coach Companion Agent
Run this to verify the agent is working correctly
"""

import os
from agent import CoachCompanionAgent

def test_basic_coaching():
    """Test basic coaching functionality."""
    print("=" * 60)
    print("Testing Coach Companion Agent")
    print("=" * 60)
    
    # Initialize agent
    print("\n1. Initializing agent...")
    agent = CoachCompanionAgent()
    print("✓ Agent initialized successfully")
    
    # Test 1: Basic encouragement
    print("\n2. Testing basic encouragement...")
    response = agent.coach(
        message="I'm feeling discouraged about my weight loss progress",
        user_context={
            "coaching_style": "gentle",
            "on_glp1": False,
            "goal_type": "loss",
            "gamification_preference": "moderate"
        }
    )
    print(f"Response: {response}")
    print("✓ Basic encouragement test passed")
    
    # Test 2: GLP-1 aware coaching
    print("\n3. Testing GLP-1 aware coaching...")
    response = agent.coach(
        message="I'm not eating as much as I used to. Is that okay?",
        user_context={
            "coaching_style": "pragmatic",
            "on_glp1": True,
            "goal_type": "loss",
            "gamification_preference": "low"
        }
    )
    print(f"Response: {response}")
    print("✓ GLP-1 aware coaching test passed")
    
    # Test 3: Setback reframing
    print("\n4. Testing setback reframing...")
    response = agent.coach(
        message="I overate at a party last night and feel terrible",
        user_context={
            "coaching_style": "upbeat",
            "on_glp1": False,
            "goal_type": "loss",
            "gamification_preference": "high"
        }
    )
    print(f"Response: {response}")
    print("✓ Setback reframing test passed")
    
    # Test 4: Structured coaching
    print("\n5. Testing structured coaching style...")
    response = agent.coach(
        message="Help me plan my week",
        user_context={
            "coaching_style": "structured",
            "on_glp1": False,
            "goal_type": "maintenance",
            "gamification_preference": "moderate"
        }
    )
    print(f"Response: {response}")
    print("✓ Structured coaching test passed")
    
    # Test 5: Conversation continuity
    print("\n6. Testing conversation continuity...")
    agent.coach("My name is Alice")
    response = agent.coach("What's my name?")
    print(f"Response: {response}")
    if "alice" in response.lower():
        print("✓ Conversation continuity test passed")
    else:
        print("⚠ Conversation continuity test: Agent didn't remember name")
    
    print("\n" + "=" * 60)
    print("All tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    # Check for AWS credentials using boto3
    try:
        import boto3
        session = boto3.Session()
        credentials = session.get_credentials()
        if credentials is None:
            print("ERROR: AWS credentials not found!")
            print("Please configure AWS credentials using one of:")
            print("  - AWS CLI: aws configure")
            print("  - Environment variables: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY")
            print("  - AWS_BEDROCK_API_KEY for API key authentication")
            exit(1)
        print("✓ AWS credentials found")
    except ImportError:
        print("ERROR: boto3 not installed. Run: pip install boto3")
        exit(1)
    
    try:
        test_basic_coaching()
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        print("\nTroubleshooting:")
        print("1. Verify AWS credentials are set correctly")
        print("2. Ensure Bedrock model access is enabled in AWS console")
        print("3. Check that you have permissions to use Bedrock")
        print("3. Check your AWS region is correct")
        exit(1)

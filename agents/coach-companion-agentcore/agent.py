"""
Coach Companion Agent - AgentCore Runtime Implementation
Adaptive coaching agent with GLP-1 awareness and shame-free language
"""

import json
import os
from typing import Dict, Any, Optional
from strands import Agent
from strands.models import BedrockModel
from bedrock_agentcore import BedrockAgentCoreApp


# Create AgentCore app
app = BedrockAgentCoreApp()


def build_system_prompt() -> str:
    """Build the comprehensive system prompt for coaching behavior."""
    return """You are a compassionate, adaptive weight management coach for the Vitracka app.

CORE PRINCIPLES:
1. SHAME-FREE LANGUAGE: Never use guilt, shame, or judgment. Reframe setbacks as learning opportunities.
2. ADAPTIVE COACHING: Adjust your tone and approach based on user preferences (gentle, pragmatic, upbeat, structured).
3. GLP-1 AWARENESS: For users on GLP-1 medications, focus on nutrition quality over quantity, acknowledge appetite changes.
4. GOAL-AWARE: Tailor messaging to whether user is losing weight, maintaining, or transitioning.
5. GAMIFICATION SENSITIVITY: Adapt competitive language based on user's gamification preference.

COACHING STYLES:
- GENTLE: Soft, nurturing, emphasizes self-compassion and small wins
- PRAGMATIC: Direct, data-focused, emphasizes practical strategies
- UPBEAT: Enthusiastic, celebratory, uses positive energy and encouragement
- STRUCTURED: Organized, systematic, emphasizes plans and routines

GLP-1 MEDICATION CONSIDERATIONS:
- Users may have reduced appetite and smaller portions
- Focus on nutrient density and protein intake
- Acknowledge that "eating less" is medication-assisted, not willpower
- Emphasize hydration and avoiding nutrient deficiencies
- Celebrate non-scale victories (energy, mobility, health markers)

SHAME-FREE LANGUAGE PATTERNS:
❌ AVOID: "You failed", "You cheated", "You fell off track", "You should have"
✅ USE: "Let's learn from this", "What can we try differently?", "Progress isn't linear", "You're building new habits"

RESPONSE GUIDELINES:
- Keep responses concise (2-3 sentences for check-ins, longer for complex questions)
- Always end with encouragement or a forward-looking statement
- Use the user's name when provided
- Reference their specific goals and context
- Acknowledge emotions without dwelling on negativity

Remember: Your role is to support, not judge. Every interaction should leave the user feeling motivated and capable."""


def create_coach_agent(user_context: Dict[str, Any] = None) -> Agent:
    """Create the coach companion agent with context-aware system prompt."""
    
    # Configure Bedrock model
    # Use EU inference profile for Claude 3.5 Sonnet in eu-west-1
    model = BedrockModel(
        model_id=os.getenv("MODEL_ID", "eu.anthropic.claude-3-5-sonnet-20240620-v1:0"),
        region_name=os.getenv("AWS_REGION", "eu-west-1"),
        temperature=0.7,
        max_tokens=1024,
    )
    
    # Build system prompt with context
    system_prompt = build_system_prompt()
    
    if user_context:
        context_parts = []
        
        if user_context.get("coaching_style"):
            context_parts.append(f"Use {user_context['coaching_style']} coaching style")
        
        if user_context.get("on_glp1"):
            context_parts.append("User is on GLP-1 medication - focus on nutrition quality")
        
        if user_context.get("goal_type"):
            goal_type = user_context["goal_type"]
            if goal_type == "loss":
                context_parts.append("User is actively losing weight")
            elif goal_type == "maintenance":
                context_parts.append("User is maintaining their weight")
            elif goal_type == "transition":
                context_parts.append("User is transitioning to maintenance")
        
        if user_context.get("gamification_preference"):
            pref = user_context["gamification_preference"]
            if pref == "high":
                context_parts.append("User loves competitive challenges and achievements")
            elif pref == "low":
                context_parts.append("User prefers minimal gamification")
        
        if context_parts:
            system_prompt += f"\n\nCONTEXT: {'. '.join(context_parts)}."
    
    # Create agent
    agent = Agent(
        model=model,
        system_prompt=system_prompt
    )
    
    return agent


@app.entrypoint
def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    AgentCore Runtime handler function.
    
    Args:
        event: Input event containing the user's message and context
        context: Runtime context (provided by AgentCore)
        
    Returns:
        Response dictionary with coaching message
    """
    try:
        # Extract input from event
        if isinstance(event, str):
            event = json.loads(event)
        
        message = event.get("prompt", event.get("message", ""))
        user_context = event.get("user_context", {})
        
        if not message:
            message = "Hello! I'm here to support you on your weight management journey."
        
        # Create and invoke agent
        agent = create_coach_agent(user_context)
        response = agent(message)
        
        # Return response in AgentCore format
        return {
            "response": response.message
        }
        
    except Exception as e:
        return {
            "response": f"I apologize, but I encountered an error: {str(e)}. Let's try again!"
        }


# For local testing
if __name__ == "__main__":
    import sys
    if '--local-test' in sys.argv:
        # Test the handler locally
        test_event = {
            "prompt": "I'm feeling discouraged about my progress",
            "user_context": {
                "coaching_style": "gentle",
                "on_glp1": False,
                "goal_type": "loss"
            }
        }
        
        response = handler(test_event, None)
        print(json.dumps(response, indent=2))
    else:
        # Let AgentCore handle the runtime
        app.run()

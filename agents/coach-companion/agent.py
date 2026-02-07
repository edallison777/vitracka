"""
Coach Companion Agent - Strands Implementation
Adaptive coaching agent with GLP-1 awareness and shame-free language
"""

from strands import Agent, tool
from strands.models import BedrockModel
from typing import Dict, Any, Optional
import os


class CoachCompanionAgent:
    """
    AI-powered coaching agent that adapts to user preferences and context.
    Uses AWS Bedrock with Claude for natural, empathetic coaching.
    """
    
    def __init__(self):
        """Initialize the Coach Companion agent with Bedrock model."""
        # Configure Bedrock model using inference profile
        # Using Claude 3.5 Sonnet (already approved for API access)
        self.model = BedrockModel(
            model_id="us.anthropic.claude-3-5-sonnet-20241022-v2:0",  # Claude 3.5 Sonnet v2
            region_name=os.getenv("AWS_REGION", "us-east-1"),
            temperature=0.7,  # Balanced for empathetic yet consistent coaching
            max_tokens=2048,
        )
        
        # Create agent with coaching tools
        self.agent = Agent(
            model=self.model,
            tools=[self._get_user_context_tool()],
            system_prompt=self._build_system_prompt()
        )
    
    def _build_system_prompt(self) -> str:
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

    def _get_user_context_tool(self) -> callable:
        """Create a tool for accessing user context during conversations."""
        @tool
        def get_user_context(user_id: str) -> Dict[str, Any]:
            """Get user profile context for personalized coaching.
            
            Args:
                user_id: The user's unique identifier
                
            Returns:
                Dictionary containing user preferences and context
            """
            # This will be populated by the API layer
            # For now, return a placeholder that the agent can work with
            return {
                "coaching_style": "gentle",
                "on_glp1": False,
                "goal_type": "loss",
                "gamification_preference": "moderate"
            }
        
        return get_user_context
    
    def coach(
        self,
        message: str,
        user_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate a coaching response based on user message and context.
        
        Args:
            message: The user's message or question
            user_context: Optional context about the user (coaching style, GLP-1 status, etc.)
            
        Returns:
            Coaching response as a string
        """
        # Build context-aware prompt
        context_prompt = ""
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
                context_prompt = f"\n\nCONTEXT: {'. '.join(context_parts)}.\n\n"
        
        # Generate response using the agent
        full_prompt = f"{context_prompt}USER MESSAGE: {message}"
        response = self.agent(full_prompt)
        
        return response
    
    def reset_conversation(self):
        """Reset the conversation history for a new session."""
        # Create a new agent instance to clear history
        self.agent = Agent(
            model=self.model,
            tools=[self._get_user_context_tool()],
            system_prompt=self._build_system_prompt()
        )


# Singleton instance
_agent_instance = None

def get_agent() -> CoachCompanionAgent:
    """Get or create the singleton agent instance."""
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = CoachCompanionAgent()
    return _agent_instance

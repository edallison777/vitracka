"""
FastAPI service for Coach Companion Agent
Exposes the Strands agent via HTTP endpoints
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import uvicorn
import os
from agent import get_agent

# Initialize FastAPI app
app = FastAPI(
    title="Coach Companion Agent API",
    description="AI-powered adaptive coaching agent using Strands SDK",
    version="1.0.0"
)

# Request/Response models
class CoachingRequest(BaseModel):
    """Request model for coaching interactions."""
    message: str = Field(..., description="User's message or question")
    user_context: Optional[Dict[str, Any]] = Field(
        None,
        description="User context (coaching_style, on_glp1, goal_type, gamification_preference)"
    )
    session_id: Optional[str] = Field(None, description="Session ID for conversation continuity")

class CoachingResponse(BaseModel):
    """Response model for coaching interactions."""
    response: str = Field(..., description="Coach's response")
    session_id: Optional[str] = Field(None, description="Session ID")

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        service="coach-companion-agent",
        version="1.0.0"
    )


@app.post("/coach", response_model=CoachingResponse)
async def coach(request: CoachingRequest):
    """
    Generate a coaching response based on user message and context.
    
    Args:
        request: CoachingRequest with message and optional context
        
    Returns:
        CoachingResponse with the agent's response
        
    Raises:
        HTTPException: If agent fails to generate response
    """
    try:
        agent = get_agent()
        
        # Generate coaching response
        response = agent.coach(
            message=request.message,
            user_context=request.user_context
        )
        
        return CoachingResponse(
            response=response,
            session_id=request.session_id
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate coaching response: {str(e)}"
        )


@app.post("/reset")
async def reset_conversation(session_id: Optional[str] = None):
    """
    Reset conversation history for a new session.
    
    Args:
        session_id: Optional session ID to reset
        
    Returns:
        Success message
    """
    try:
        agent = get_agent()
        agent.reset_conversation()
        
        return {"status": "success", "message": "Conversation reset"}
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset conversation: {str(e)}"
        )


if __name__ == "__main__":
    # Run the service
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=port,
        reload=True  # Enable auto-reload during development
    )

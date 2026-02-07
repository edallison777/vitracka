"""
FastAPI service for Test Agent
Exposes the Strands test agent via HTTP endpoints
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import uvicorn
import os
from agent import create_test_agent

# Initialize FastAPI app
app = FastAPI(
    title="Test Agent API",
    description="Simple test agent for validating deployment pipeline",
    version="1.0.0"
)

# Request/Response models
class TestRequest(BaseModel):
    """Request model for test agent."""
    message: str = Field(..., description="Test message")

class TestResponse(BaseModel):
    """Response model for test agent."""
    response: str = Field(..., description="Agent's response")

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str


# Create agent instance
_agent = None

def get_agent():
    """Get or create the agent instance."""
    global _agent
    if _agent is None:
        _agent = create_test_agent()
    return _agent


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        service="test-agent",
        version="1.0.0"
    )


@app.get("/ping")
async def ping():
    """Simple ping endpoint for health checks."""
    return {"status": "ok"}


@app.post("/test", response_model=TestResponse)
async def test(request: TestRequest):
    """
    Test the agent with a message.
    
    Args:
        request: TestRequest with message
        
    Returns:
        TestResponse with the agent's response
    """
    try:
        agent = get_agent()
        response = agent(request.message)
        
        # Extract text from response - handle both string and dict formats
        if isinstance(response.message, str):
            response_text = response.message
        elif isinstance(response.message, dict):
            # Extract content from dict format
            response_text = response.message.get('content', [{}])[0].get('text', str(response.message))
        else:
            response_text = str(response.message)
        
        return TestResponse(response=response_text)
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate response: {str(e)}"
        )


if __name__ == "__main__":
    # Run the service
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )

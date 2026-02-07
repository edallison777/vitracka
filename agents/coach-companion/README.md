# Coach Companion Agent - Strands Implementation

AI-powered adaptive coaching agent using AWS Bedrock and Strands SDK.

## Features

- **Adaptive Coaching Styles**: Gentle, pragmatic, upbeat, and structured
- **GLP-1 Medication Awareness**: Specialized coaching for users on GLP-1 medications
- **Shame-Free Language**: Positive reframing and supportive messaging
- **Goal-Aware**: Tailored to weight loss, maintenance, or transition goals
- **Gamification Sensitivity**: Adjusts competitive language based on preferences

## Setup

### Prerequisites

- Python 3.11+
- AWS Bedrock access with Claude model enabled
- AWS credentials or Bedrock API key

### Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your AWS credentials
```

3. Enable Bedrock model access:
   - Open [AWS Bedrock Console](https://console.aws.amazon.com/bedrock)
   - Navigate to "Model access"
   - Enable "Claude 4 Sonnet" or your preferred model

### Running Locally

```bash
python api.py
```

The service will start on `http://localhost:8001`

### Running with Docker

```bash
docker build -t coach-agent .
docker run -p 8001:8001 \
  -e AWS_BEDROCK_API_KEY=your-key \
  -e AWS_REGION=us-east-1 \
  coach-agent
```

## API Endpoints

### POST /coach

Generate a coaching response.

**Request:**
```json
{
  "message": "I'm feeling discouraged about my progress",
  "user_context": {
    "coaching_style": "gentle",
    "on_glp1": false,
    "goal_type": "loss",
    "gamification_preference": "moderate"
  },
  "session_id": "user-123"
}
```

**Response:**
```json
{
  "response": "I understand feeling discouraged can be tough. Remember, progress isn't always linear...",
  "session_id": "user-123"
}
```

### POST /reset

Reset conversation history.

**Request:**
```json
{
  "session_id": "user-123"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "coach-companion-agent",
  "version": "1.0.0"
}
```

## Testing

Test the agent with curl:

```bash
# Health check
curl http://localhost:8001/health

# Coaching request
curl -X POST http://localhost:8001/coach \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I had a setback today",
    "user_context": {
      "coaching_style": "gentle",
      "on_glp1": false,
      "goal_type": "loss"
    }
  }'
```

## Architecture

```
┌─────────────────┐
│  Node.js API    │
│  (TypeScript)   │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  FastAPI        │
│  (Python)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Strands Agent  │
│  (AWS Bedrock)  │
└─────────────────┘
```

## Configuration

### Coaching Styles

- **gentle**: Soft, nurturing, emphasizes self-compassion
- **pragmatic**: Direct, data-focused, practical strategies
- **upbeat**: Enthusiastic, celebratory, positive energy
- **structured**: Organized, systematic, methodical

### GLP-1 Adaptations

When `on_glp1: true`, the agent:
- Focuses on nutrition quality over quantity
- Acknowledges appetite changes
- Emphasizes protein and nutrient density
- Celebrates non-scale victories

### Gamification Preferences

- **high**: Competitive language, challenges, achievements
- **moderate**: Balanced approach with some gamification
- **low**: Minimal competitive elements

## Troubleshooting

### "Access denied to model"
- Enable model access in Bedrock console
- Wait a few minutes for access to propagate

### "Invalid API key"
- Verify `AWS_BEDROCK_API_KEY` is set correctly
- Check if API key has expired (30-day limit)

### "Connection refused"
- Ensure the service is running on port 8001
- Check firewall settings

## Development

### Adding New Features

1. Update `agent.py` with new tools or prompts
2. Update `api.py` with new endpoints
3. Update the Node.js client in `src/clients/CoachCompanionClient.ts`
4. Test locally before deploying

### Monitoring

The service includes:
- Health check endpoint for monitoring
- Structured logging
- Error handling and reporting

## Production Deployment

See the main project's deployment documentation for deploying this service to AWS ECS/Fargate alongside the Node.js backend.

## License

Part of the Vitracka Weight Management System.

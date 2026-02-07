# Strands AI Integration Guide
## Vitracka Weight Management System

This guide explains how to set up and use the Strands AI-powered Coach Companion agent.

## Overview

We've integrated AWS Bedrock with Strands SDK to power the Coach Companion agent with real AI. The architecture uses:

- **Node.js/TypeScript**: Main API backend (existing)
- **Python/Strands**: AI agent microservice (new)
- **AWS Bedrock**: Claude 4 Sonnet LLM
- **FastAPI**: HTTP bridge between Node.js and Python

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Client (Mobile App)                    │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTPS
                         ▼
┌──────────────────────────────────────────────────────────┐
│              Node.js API (TypeScript)                     │
│  - Express server                                         │
│  - Authentication, database, business logic               │
│  - CoachCompanionClient (HTTP client)                     │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTP (internal)
                         ▼
┌──────────────────────────────────────────────────────────┐
│         Python Agent Service (FastAPI)                    │
│  - CoachCompanionAgent (Strands)                          │
│  - FastAPI endpoints                                      │
└────────────────────────┬─────────────────────────────────┘
                         │ AWS SDK
                         ▼
┌──────────────────────────────────────────────────────────┐
│              AWS Bedrock (Claude 4 Sonnet)                │
└──────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. AWS Bedrock Setup

**Option A: API Key (Quick Start - Development Only)**

1. Open [AWS Bedrock Console](https://console.aws.amazon.com/bedrock)
2. Navigate to "API keys" in the left sidebar
3. Click "Generate long-term API key"
4. Copy the key (shown only once!) and save it securely
5. Note: API keys expire in 30 days

**Option B: IAM Credentials (Production)**

1. Configure AWS CLI: `aws configure`
2. Or set environment variables:
   ```bash
   export AWS_ACCESS_KEY_ID=your-access-key
   export AWS_SECRET_ACCESS_KEY=your-secret-key
   export AWS_REGION=us-east-1
   ```

### 2. Enable Bedrock Model Access

1. Open [AWS Bedrock Console](https://console.aws.amazon.com/bedrock)
2. Click "Model access" in left sidebar
3. Click "Manage model access"
4. Enable "Claude 4 Sonnet" (anthropic.claude-sonnet-4-20250514-v1:0)
5. Wait 2-3 minutes for access to propagate

### 3. Install Python

- Python 3.11 or higher
- pip package manager

### 4. Install Node.js Dependencies

```bash
npm install
```

This will install the new `axios` dependency for HTTP communication.

## Setup Instructions

### Step 1: Configure Environment Variables

Update your `.env` file with AWS credentials:

```bash
# AI Agent Services
COACH_AGENT_URL=http://localhost:8001

# AWS Bedrock Configuration
AWS_REGION=us-east-1
AWS_BEDROCK_API_KEY=your-bedrock-api-key-here

# Or use IAM credentials instead:
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Step 2: Install Python Dependencies

```bash
cd agents/coach-companion
pip install -r requirements.txt
```

### Step 3: Test the Agent Locally

```bash
# Set AWS credentials
export AWS_BEDROCK_API_KEY=your-key
export AWS_REGION=us-east-1

# Run test script
python test_agent.py
```

You should see output like:
```
============================================================
Testing Coach Companion Agent
============================================================

1. Initializing agent...
✓ Agent initialized successfully

2. Testing basic encouragement...
Response: I understand feeling discouraged can be tough...
✓ Basic encouragement test passed

...

All tests completed!
```

### Step 4: Start the Agent Service

```bash
# In agents/coach-companion directory
python api.py
```

The service will start on `http://localhost:8001`

### Step 5: Start the Node.js Backend

In a separate terminal:

```bash
# In project root
npm run dev
```

### Step 6: Test the Integration

```bash
# Test agent health
curl http://localhost:8001/health

# Test coaching endpoint
curl -X POST http://localhost:8001/coach \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need some encouragement",
    "user_context": {
      "coaching_style": "gentle",
      "on_glp1": false,
      "goal_type": "loss"
    }
  }'
```

## Using Docker Compose (Recommended)

Run everything together with Docker Compose:

```bash
# Build and start all services
docker-compose up --build

# Services will be available at:
# - Node.js API: http://localhost:3000
# - Coach Agent: http://localhost:8001
# - PostgreSQL: localhost:5432
```

## Using the New Service in Code

### From TypeScript/Node.js

```typescript
import { CoachCompanionServiceV2 } from './services/CoachCompanionServiceV2';
import { UserSupportProfile } from './types';

const coachService = new CoachCompanionServiceV2();

// Generate coaching response
const profile: UserSupportProfile = {
  userId: 'user-123',
  coachingStyle: 'gentle',
  onGLP1Medication: false,
  goalType: 'loss',
  gamificationIntensity: 0.5
};

const response = await coachService.generateCoachingResponse(
  profile,
  'motivation_request',
  'I need some encouragement today'
);

console.log(response.content);
```

### Direct HTTP Call

```typescript
import { getCoachCompanionClient } from './clients/CoachCompanionClient';

const client = getCoachCompanionClient();

const response = await client.coach({
  message: 'I had a setback today',
  user_context: {
    coaching_style: 'upbeat',
    on_glp1: false,
    goal_type: 'loss',
    gamification_preference: 'high'
  }
});

console.log(response.response);
```

## Migration Strategy

### Phase 1: Parallel Running (Current)
- Old rule-based service: `CoachCompanionService.ts`
- New AI service: `CoachCompanionServiceV2.ts`
- Both available, can A/B test

### Phase 2: Gradual Rollout
- Route 10% of users to AI service
- Monitor performance and quality
- Gradually increase percentage

### Phase 3: Full Migration
- Switch all users to AI service
- Deprecate old rule-based service
- Remove old code

## Cost Considerations

### AWS Bedrock Pricing (Claude 4 Sonnet)

- **Input tokens**: ~$3 per million tokens
- **Output tokens**: ~$15 per million tokens

### Estimated Costs

**Assumptions:**
- Average coaching interaction: 200 input tokens, 150 output tokens
- Cost per interaction: ~$0.003 (0.3 cents)
- 1000 interactions/day: ~$3/day = $90/month

**Optimization Tips:**
1. Cache system prompts (reduces input tokens)
2. Use shorter prompts when possible
3. Implement rate limiting
4. Consider using Claude 3.5 Sonnet for lower costs

## Monitoring and Debugging

### Check Agent Health

```bash
curl http://localhost:8001/health
```

### View Agent Logs

```bash
# If running with Docker Compose
docker-compose logs -f coach-agent

# If running locally
# Logs will appear in the terminal where you ran `python api.py`
```

### Common Issues

**1. "Access denied to model"**
- Solution: Enable model access in Bedrock console
- Wait 2-3 minutes after enabling

**2. "Invalid API key"**
- Solution: Verify `AWS_BEDROCK_API_KEY` is set correctly
- Check if key has expired (30-day limit)

**3. "Connection refused"**
- Solution: Ensure agent service is running on port 8001
- Check `COACH_AGENT_URL` in Node.js `.env`

**4. Slow responses**
- Normal: LLM calls take 2-5 seconds
- Increase timeout if needed (currently 30s)

## Testing

### Unit Tests (Python)

```bash
cd agents/coach-companion
python test_agent.py
```

### Integration Tests (Node.js)

The existing property-based tests will need updates to work with non-deterministic AI responses. Consider:

1. Testing for response quality (encouragement, tone)
2. Testing for safety (no harmful content)
3. Testing for context awareness (GLP-1, coaching style)

## Production Deployment

### AWS ECS/Fargate

1. Build Docker image for agent service
2. Push to ECR
3. Create ECS task definition
4. Deploy alongside Node.js service
5. Configure internal networking

See `DEPLOYMENT_PLAN.md` for detailed instructions.

## Next Steps

1. **Test the integration** with the test script
2. **Try different coaching styles** and contexts
3. **Monitor costs** in AWS Billing dashboard
4. **Implement other agents** using the same pattern:
   - Safety Sentinel
   - Medical Boundaries
   - Progress Analyst
   - Nutrition Scout

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review agent logs
3. Test with the `test_agent.py` script
4. Verify AWS Bedrock access and credentials

## Additional Resources

- [Strands SDK Documentation](https://docs.strands.ai/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Claude Model Documentation](https://docs.anthropic.com/claude/docs)

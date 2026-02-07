# Quick Start: Strands AI Integration

## 5-Minute Setup

### 1. Get AWS Bedrock API Key
```bash
# Visit: https://console.aws.amazon.com/bedrock
# Click: API keys → Generate long-term API key
# Copy the key (shown only once!)
```

### 2. Enable Model Access
```bash
# Visit: https://console.aws.amazon.com/bedrock
# Click: Model access → Manage model access
# Enable: Claude 4 Sonnet
# Wait: 2-3 minutes
```

### 3. Set Environment Variables
```bash
export AWS_BEDROCK_API_KEY=your-key-here
export AWS_REGION=us-east-1
```

### 4. Install & Test
```bash
# Install Python dependencies
cd agents/coach-companion
pip install -r requirements.txt

# Test the agent
python test_agent.py

# Should see: "All tests completed!"
```

### 5. Run Everything
```bash
# Option A: Docker Compose (easiest)
docker-compose up

# Option B: Manual
# Terminal 1:
cd agents/coach-companion && python api.py

# Terminal 2:
npm run dev
```

## Test It Works

```bash
# Health check
curl http://localhost:8001/health

# Get coaching response
curl -X POST http://localhost:8001/coach \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need encouragement",
    "user_context": {
      "coaching_style": "gentle",
      "on_glp1": false,
      "goal_type": "loss"
    }
  }'
```

## Troubleshooting

**"Access denied to model"**
→ Enable model in Bedrock console, wait 2-3 minutes

**"Invalid API key"**
→ Check `AWS_BEDROCK_API_KEY` is set correctly

**"Connection refused"**
→ Ensure agent service is running on port 8001

## Cost Estimate

- Per interaction: ~$0.003 (0.3 cents)
- 1,000/day: ~$90/month
- 10,000/day: ~$900/month

## Full Documentation

- Setup: `STRANDS_INTEGRATION_GUIDE.md`
- Summary: `STRANDS_INTEGRATION_SUMMARY.md`
- Agent: `agents/coach-companion/README.md`

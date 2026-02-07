# Next Steps: AWS Bedrock Setup

## ✅ What's Done
- Python dependencies installed successfully
- Strands SDK ready to use
- Agent code written and ready
- Docker configuration complete

## ⏳ What You Need to Do Now

### Step 1: Get AWS Bedrock API Key (15 minutes)

**Option A: Quick Start with API Key (Recommended for Testing)**

1. Open your browser and go to: https://console.aws.amazon.com/bedrock
2. Sign in with your AWS account (Account: 732231126129)
3. In the left sidebar, click "API keys"
4. Click "Generate long-term API key"
5. **IMPORTANT**: Copy the key immediately (it's only shown once!)
6. Save it somewhere secure

**Option B: Use Existing AWS Credentials**
- You already have AWS CLI configured
- Can use existing credentials instead of API key
- Skip to Step 2

### Step 2: Enable Claude 4 Sonnet Model (5 minutes)

1. Still in Bedrock Console: https://console.aws.amazon.com/bedrock
2. Click "Model access" in the left sidebar
3. Click "Manage model access" button
4. Find "Claude 4 Sonnet" (anthropic.claude-sonnet-4-20250514-v1:0)
5. Check the box to enable it
6. Click "Save changes"
7. **Wait 2-3 minutes** for access to propagate

### Step 3: Configure Environment Variables (2 minutes)

Add to your `.env` file (already open):

```bash
# AWS Bedrock Configuration (add these lines)
AWS_BEDROCK_API_KEY=paste-your-key-here
AWS_REGION=us-east-1
```

**OR** if using AWS credentials (Option B):
```bash
# AWS credentials are already configured via AWS CLI
# Just add the region:
AWS_REGION=us-east-1
```

### Step 4: Test the Agent (5 minutes)

```bash
cd agents/coach-companion
python test_agent.py
```

**Expected Output:**
```
============================================================
Testing Coach Companion Agent
============================================================

1. Initializing agent...
✓ Agent initialized successfully

2. Testing basic encouragement...
Response: [AI-generated encouraging message]
✓ Basic encouragement test passed

...

All tests completed!
```

### Step 5: Start the Services (5 minutes)

**Option A: Docker Compose (Easiest)**
```bash
docker-compose up
```

**Option B: Manual (Two Terminals)**

Terminal 1 - Python Agent:
```bash
cd agents/coach-companion
python api.py
```

Terminal 2 - Node.js API:
```bash
npm run dev
```

### Step 6: Verify Integration (5 minutes)

Test the agent is working:

```bash
# Health check
curl http://localhost:8001/health

# Test coaching
curl -X POST http://localhost:8001/coach \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"I need encouragement\", \"user_context\": {\"coaching_style\": \"gentle\"}}"
```

## Troubleshooting

### "Access denied to model"
- Wait 2-3 minutes after enabling model access
- Refresh the Bedrock console to verify it's enabled
- Check you enabled the correct model (Claude 4 Sonnet)

### "Invalid API key"
- Verify you copied the entire key
- Check for extra spaces or line breaks
- Make sure it's set in `.env` file correctly

### "Module not found"
- Run: `pip install --user -r requirements.txt` again
- Verify you're in the `agents/coach-companion` directory

## Cost Estimate

- **Per test**: ~$0.003 (0.3 cents)
- **Testing today**: ~$0.05 (5 cents for ~15 tests)
- **Very affordable for development!**

## Ready to Continue?

Once you complete Steps 1-3 above, let me know and I'll help you test the integration!

**Current Status**: Waiting for AWS Bedrock API key configuration

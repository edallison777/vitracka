# Tomorrow's Checklist - January 20, 2026

## ✅ Testing Strands AI Integration

### Prerequisites Check
- [ ] Python 3.11+ installed (`python3 --version`)
- [ ] pip installed (`pip3 --version`)
- [ ] Node.js and npm installed
- [ ] Docker installed (if using docker-compose)

### Step 1: AWS Bedrock Setup (15 min)
- [ ] Visit [AWS Bedrock Console](https://console.aws.amazon.com/bedrock)
- [ ] Navigate to "API keys"
- [ ] Click "Generate long-term API key"
- [ ] Copy and save the key securely
- [ ] Navigate to "Model access"
- [ ] Click "Manage model access"
- [ ] Enable "Claude 4 Sonnet"
- [ ] Wait 2-3 minutes for access

### Step 2: Environment Configuration (2 min)
- [ ] Open `.env` file
- [ ] Add `AWS_BEDROCK_API_KEY=your-key-here`
- [ ] Add `AWS_REGION=us-east-1`
- [ ] Save the file

### Step 3: Install Python Dependencies (5 min)
```bash
cd agents/coach-companion
pip install -r requirements.txt
```
- [ ] Installation completed without errors
- [ ] Verify: `pip list | grep strands`

### Step 4: Test the Agent (5 min)
```bash
python test_agent.py
```
- [ ] Agent initialized successfully
- [ ] Basic encouragement test passed
- [ ] GLP-1 aware coaching test passed
- [ ] Setback reframing test passed
- [ ] Structured coaching test passed
- [ ] Conversation continuity test passed
- [ ] All tests completed message shown

### Step 5: Start Services (5 min)

**Option A: Docker Compose**
```bash
docker-compose up
```
- [ ] All services started
- [ ] No error messages
- [ ] Services accessible

**Option B: Manual**
Terminal 1:
```bash
cd agents/coach-companion
python api.py
```
- [ ] FastAPI service started on port 8001

Terminal 2:
```bash
npm run dev
```
- [ ] Node.js API started on port 3000

### Step 6: Verify Integration (5 min)

**Health Check:**
```bash
curl http://localhost:8001/health
```
- [ ] Returns `{"status":"healthy",...}`

**Coaching Test:**
```bash
curl -X POST http://localhost:8001/coach \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need some encouragement today",
    "user_context": {
      "coaching_style": "gentle",
      "on_glp1": false,
      "goal_type": "loss"
    }
  }'
```
- [ ] Returns AI-generated coaching response
- [ ] Response is natural and encouraging
- [ ] Response matches gentle coaching style

### Step 7: Test Different Scenarios (10 min)

**Test GLP-1 Awareness:**
```bash
curl -X POST http://localhost:8001/coach \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I am not eating as much. Is that okay?",
    "user_context": {
      "coaching_style": "pragmatic",
      "on_glp1": true,
      "goal_type": "loss"
    }
  }'
```
- [ ] Response mentions nutrition quality
- [ ] Response acknowledges medication effects

**Test Setback Reframing:**
```bash
curl -X POST http://localhost:8001/coach \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I overate at a party and feel terrible",
    "user_context": {
      "coaching_style": "upbeat",
      "on_glp1": false,
      "goal_type": "loss"
    }
  }'
```
- [ ] Response is positive and reframing
- [ ] No shame or guilt language
- [ ] Forward-looking encouragement

**Test Conversation Memory:**
```bash
# First message
curl -X POST http://localhost:8001/coach \
  -H "Content-Type: application/json" \
  -d '{
    "message": "My name is Alice",
    "user_context": {"coaching_style": "gentle"},
    "session_id": "test-123"
  }'

# Second message
curl -X POST http://localhost:8001/coach \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is my name?",
    "user_context": {"coaching_style": "gentle"},
    "session_id": "test-123"
  }'
```
- [ ] Agent remembers the name "Alice"

### Step 8: Monitor Costs (5 min)
- [ ] Visit [AWS Billing Dashboard](https://console.aws.amazon.com/billing/)
- [ ] Check Bedrock usage
- [ ] Verify costs are as expected (~$0.003 per interaction)

### Step 9: Document Results
- [ ] Note any issues encountered
- [ ] Record response quality
- [ ] Compare AI vs rule-based responses
- [ ] Decide on next steps

## Success Criteria

✅ All tests pass
✅ Agent responds with natural language
✅ Responses adapt to coaching styles
✅ GLP-1 awareness works correctly
✅ Setback reframing is shame-free
✅ Conversation memory works
✅ Response time < 5 seconds
✅ Costs are reasonable

## If Something Goes Wrong

### Agent won't start
→ Check `SESSION_RESUME_JAN20.md` troubleshooting section
→ Verify AWS credentials are set
→ Check Python dependencies installed

### Tests fail
→ Verify Bedrock model access enabled
→ Wait 2-3 minutes after enabling
→ Check API key hasn't expired

### Slow responses
→ Normal: 2-5 seconds for LLM calls
→ Check network connectivity
→ Verify AWS region is correct

### High costs
→ Each test costs ~$0.003
→ Monitor in AWS Billing dashboard
→ Implement caching if needed

## After Testing

### If Everything Works ✅
- [ ] Celebrate! 🎉
- [ ] Consider deploying to AWS
- [ ] Plan to migrate other agents
- [ ] Update tests for AI responses

### If Issues Found ⚠️
- [ ] Document the issues
- [ ] Check troubleshooting guide
- [ ] Review agent logs
- [ ] Ask for help if needed

## Next Steps After Testing

1. **Deploy to AWS** - Use existing Terraform and deployment scripts
2. **Migrate other agents** - Apply same pattern to Safety Sentinel, Medical Boundaries
3. **Continue features** - Implement eating plans, nutrition search
4. **Optimize costs** - Add caching, optimize prompts

## Time Estimate

- Setup: 15-20 minutes
- Testing: 15-20 minutes
- Verification: 10-15 minutes
- **Total: 40-55 minutes**

## Documentation References

- Quick start: `QUICK_START_STRANDS.md`
- Full guide: `STRANDS_INTEGRATION_GUIDE.md`
- Summary: `STRANDS_INTEGRATION_SUMMARY.md`
- Resume doc: `SESSION_RESUME_JAN20.md`
- Agent README: `agents/coach-companion/README.md`

---

**Good luck! You've got this! 🚀**

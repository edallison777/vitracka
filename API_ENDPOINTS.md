# AgentCore API Endpoints

**Project**: Vitracka AgentCore Deployment  
**Date**: February 8, 2026  
**Region**: eu-west-1

---

## Overview

This document describes the API endpoints for interacting with AgentCore agents. AgentCore agents are invoked via the **AWS Bedrock AgentCore API** using the `bedrock-agentcore` client (not `bedrock-agent-runtime`).

**CRITICAL**: AgentCore uses a different API than traditional Bedrock Agents:
- **Client**: `bedrock-agentcore` (not `bedrock-agent-runtime`)
- **Method**: `invoke_agent_runtime()` (not `invoke_agent()`)
- **Parameters**: Uses ARN and binary payload (not agent ID and text parameters)

---

## Authentication

All API calls require AWS IAM authentication using AWS Signature Version 4.

**Required Permissions**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock-agentcore:InvokeAgentRuntime"
      ],
      "Resource": "arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/*"
    }
  ]
}
```

---

## Base Configuration

**Region**: `eu-west-1`  
**Service**: `bedrock-agentcore`  
**Method**: `invoke_agent_runtime`

---

## Agents

### Test Agent

**Agent ID**: `agent-q9QEgD3UFo`  
**Agent ARN**: `arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/agent-q9QEgD3UFo`  
**Purpose**: Testing and validation

### Coach Companion

**Agent ID**: `coach_companion-0ZUOP04U5z`  
**Agent ARN**: `arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/coach_companion-0ZUOP04U5z`  
**Purpose**: Production AI coaching

**Note**: For AgentCore invocation, use the full ARN, not just the agent ID.

---

## API Endpoints

### 1. Invoke AgentCore Runtime

Sends a message to an AgentCore agent and receives a streaming response.

**Method**: `invoke_agent_runtime`  
**Client**: `bedrock-agentcore`

**Parameters**:
- `agentRuntimeArn` (required): The full agent ARN
- `runtimeSessionId` (required): Unique session identifier (use user ID or UUID)
- `payload` (required): Binary JSON payload (up to 100 MB)

**Payload Format**:
```json
{
  "prompt": "string"
}
```

**Response**:
```python
{
  "contentType": "text/event-stream" or "application/json",
  "response": <streaming iterator>
}
```

---

## SDK Examples

### Node.js / TypeScript

#### Installation
```bash
npm install @aws-sdk/client-bedrock-agentcore
```

#### Basic Invocation
```typescript
import { 
  BedrockAgentCoreClient, 
  InvokeAgentRuntimeCommand 
} from "@aws-sdk/client-bedrock-agentcore";

const client = new BedrockAgentCoreClient({ 
  region: "eu-west-1" 
});

async function invokeAgent(userMessage: string, userId: string) {
  // Prepare binary JSON payload
  const payload = Buffer.from(JSON.stringify({
    prompt: userMessage
  }), 'utf-8');

  const command = new InvokeAgentRuntimeCommand({
    agentRuntimeArn: "arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/coach_companion-0ZUOP04U5z",
    runtimeSessionId: userId,
    payload: payload
  });

  try {
    const response = await client.send(command);
    
    // Process streaming response
    let fullResponse = "";
    const contentType = response.contentType || "";
    
    if (contentType.includes("text/event-stream")) {
      // Handle streaming response
      for await (const chunk of response.response) {
        const text = new TextDecoder().decode(chunk);
        if (text.startsWith('data: ')) {
          fullResponse += text.substring(6);
        } else {
          fullResponse += text;
        }
      }
    } else if (contentType === "application/json") {
      // Handle JSON response
      const chunks = [];
      for await (const chunk of response.response) {
        chunks.push(chunk);
      }
      const jsonData = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
      fullResponse = jsonData.response || JSON.stringify(jsonData);
    }
    
    return fullResponse;
  } catch (error) {
    console.error("Error invoking agent:", error);
    throw error;
  }
}

// Usage
const response = await invokeAgent("I need motivation today", "user-123");
console.log(response);
```

#### With Error Handling
```typescript
async function invokeAgentSafe(
  userMessage: string, 
  userId: string
): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    const response = await invokeAgent(userMessage, userId);
    return { success: true, response };
  } catch (error) {
    if (error.name === "ThrottlingException") {
      return { 
        success: false, 
        error: "Too many requests. Please try again later." 
      };
    } else if (error.name === "ValidationException") {
      return { 
        success: false, 
        error: "Invalid request. Please check your input." 
      };
    } else {
      return { 
        success: false, 
        error: "An error occurred. Please try again." 
      };
    }
  }
}
```

### Python

#### Installation
```bash
pip install boto3
```

#### Basic Invocation
```python
import boto3
import json

# Use bedrock-agentcore client, not bedrock-agent-runtime
client = boto3.client('bedrock-agentcore', region_name='eu-west-1')

def invoke_agent(user_message: str, user_id: str) -> str:
    """Invoke AgentCore agent and return response."""
    try:
        # Prepare binary JSON payload
        payload = json.dumps({"prompt": user_message}).encode('utf-8')
        
        # Invoke agent runtime
        response = client.invoke_agent_runtime(
            agentRuntimeArn='arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/coach_companion-0ZUOP04U5z',
            runtimeSessionId=user_id,
            payload=payload
        )
        
        # Process streaming response
        full_response = ""
        content_type = response.get('contentType', '')
        
        if "text/event-stream" in content_type:
            # Handle streaming response
            for line in response['response'].iter_lines(chunk_size=10):
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        line_str = line_str[6:]
                    full_response += line_str
        
        elif content_type == "application/json":
            # Handle JSON response
            content = []
            for chunk in response.get('response', []):
                content.append(chunk.decode('utf-8'))
            response_data = json.loads(''.join(content))
            full_response = response_data.get('response', str(response_data))
        
        return full_response
    except Exception as e:
        print(f"Error invoking agent: {e}")
        raise

# Usage
response = invoke_agent("I need motivation today", "user-123")
print(response)
```

#### With Retry Logic
```python
import time
from botocore.exceptions import ClientError

def invoke_agent_with_retry(
    user_message: str, 
    user_id: str, 
    max_retries: int = 3
) -> dict:
    """Invoke agent with exponential backoff retry."""
    for attempt in range(max_retries):
        try:
            response = invoke_agent(user_message, user_id)
            return {"success": True, "response": response}
        except ClientError as e:
            error_code = e.response['Error']['Code']
            
            if error_code == 'ThrottlingException':
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff
                    time.sleep(wait_time)
                    continue
                else:
                    return {
                        "success": False,
                        "error": "Too many requests. Please try again later."
                    }
            elif error_code == 'ValidationException':
                return {
                    "success": False,
                    "error": "Invalid request. Please check your input."
                }
            else:
                return {
                    "success": False,
                    "error": f"Error: {str(e)}"
                }
    
    return {"success": False, "error": "Max retries exceeded"}
```

### CLI (AWS CLI)

#### Using AgentCore CLI (Recommended)
```bash
# Navigate to agent directory
cd agents/coach-companion-agentcore

# Invoke agent
agentcore invoke '{"prompt": "I need motivation today"}'
```

#### Using AWS CLI (boto3 method)
```bash
# Note: AWS CLI may not have direct support for bedrock-agentcore yet
# Use Python script or AgentCore CLI instead
python -c "
import boto3
import json

client = boto3.client('bedrock-agentcore', region_name='eu-west-1')
payload = json.dumps({'prompt': 'I need motivation today'}).encode('utf-8')

response = client.invoke_agent_runtime(
    agentRuntimeArn='arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/coach_companion-0ZUOP04U5z',
    runtimeSessionId='user-123',
    payload=payload
)

# Process response
content_type = response.get('contentType', '')
if 'text/event-stream' in content_type:
    for line in response['response'].iter_lines():
        if line:
            print(line.decode('utf-8'))
"
```

---

## Request/Response Examples

### Example 1: Simple Coaching Request

**Request (Python)**:
```python
import boto3
import json

client = boto3.client('bedrock-agentcore', region_name='eu-west-1')

payload = json.dumps({
    "prompt": "I'm feeling unmotivated today"
}).encode('utf-8')

response = client.invoke_agent_runtime(
    agentRuntimeArn='arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/coach_companion-0ZUOP04U5z',
    runtimeSessionId='user-123',
    payload=payload
)
```

**Response Processing**:
```python
full_response = ""
if "text/event-stream" in response.get('contentType', ''):
    for line in response['response'].iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith('data: '):
                line_str = line_str[6:]
            full_response += line_str

print(full_response)
# Output: "I've been there, and I know it's tough. Remember, every small step counts. 
#          What's one thing you can do today that would make you feel good?"
```

### Example 2: Goal Setting

**Request**:
```python
payload = json.dumps({
    "prompt": "I want to lose 10 pounds in 3 months"
}).encode('utf-8')

response = client.invoke_agent_runtime(
    agentRuntimeArn='arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/coach_companion-0ZUOP04U5z',
    runtimeSessionId='user-456',
    payload=payload
)
```

**Response**:
```
That's a great goal! Losing 10 pounds in 3 months is realistic and achievable - that's about 0.8 pounds per week. Let's break this down into smaller, manageable steps. What's your current approach to nutrition and exercise?
```

### Example 3: Progress Check

**Request**:
```python
payload = json.dumps({
    "prompt": "I lost 2 pounds this week!"
}).encode('utf-8')

response = client.invoke_agent_runtime(
    agentRuntimeArn='arn:aws:bedrock-agentcore:eu-west-1:732231126129:runtime/coach_companion-0ZUOP04U5z',
    runtimeSessionId='user-789',
    payload=payload
)
```

**Response**:
```
That's fantastic progress! You should be proud of yourself. Losing 2 pounds in a week shows real commitment. What strategies worked best for you this week?
```

---

## Error Handling

### Common Error Codes

| Error Code | Description | Recommended Action |
|------------|-------------|-------------------|
| `ThrottlingException` | Too many requests | Implement exponential backoff retry |
| `ValidationException` | Invalid request parameters | Check input format and parameters |
| `ResourceNotFoundException` | Agent not found | Verify agent ID and region |
| `AccessDeniedException` | Insufficient permissions | Check IAM permissions |
| `InternalServerException` | AWS service error | Retry with exponential backoff |
| `ServiceQuotaExceededException` | Quota exceeded | Request quota increase |

### Error Response Example

```json
{
  "Error": {
    "Code": "ThrottlingException",
    "Message": "Rate exceeded"
  },
  "ResponseMetadata": {
    "RequestId": "abc123",
    "HTTPStatusCode": 429
  }
}
```

### Retry Strategy

**Recommended Approach**:
1. Catch throttling exceptions
2. Implement exponential backoff (1s, 2s, 4s, 8s)
3. Maximum 5 retries
4. Log failures for monitoring

---

## Rate Limits

### Bedrock Service Quotas

**Default Limits** (per region, per account):
- **Invocations per minute**: 1000 (adjustable)
- **Concurrent invocations**: 100 (adjustable)
- **Tokens per minute**: 100,000 (adjustable)

**Check Current Quotas**:
```bash
aws service-quotas list-service-quotas \
  --service-code bedrock \
  --region eu-west-1
```

**Request Quota Increase**:
1. Go to AWS Service Quotas Console
2. Select Amazon Bedrock
3. Request quota increase
4. Provide justification

---

## Session Management

### Session IDs

**Purpose**: Maintain conversation context across multiple invocations

**Best Practices**:
- Use user ID as `runtimeSessionId` for consistency
- One session per user
- Sessions persist for 30 days (STM_ONLY mode)
- AgentCore manages session state automatically

**Note**: Unlike traditional Bedrock Agents, AgentCore doesn't have an explicit "end session" parameter. Sessions expire automatically after 30 days of inactivity.

---

## Monitoring API Usage

### CloudWatch Metrics

**Available Metrics**:
- `Invocations`: Total number of agent invocations
- `InvocationLatency`: Time taken for invocations
- `InvocationClientErrors`: Client-side errors (4xx)
- `InvocationServerErrors`: Server-side errors (5xx)
- `InputTokenCount`: Tokens in requests
- `OutputTokenCount`: Tokens in responses

### Viewing Metrics

```bash
# Get invocation count for last 24 hours
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock \
  --metric-name Invocations \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --region eu-west-1
```

---

## Testing

### Local Testing (AgentCore CLI)

```bash
# Navigate to agent directory
cd agents/coach-companion-agentcore

# Test with sample input
agentcore invoke '{"prompt": "Test message"}'

# Test with different inputs
agentcore invoke '{"prompt": "I need help with my goals"}'
agentcore invoke '{"prompt": "How do I stay motivated?"}'
```

### Integration Testing

```typescript
import { describe, it, expect } from '@jest/globals';

describe('AgentCore API', () => {
  it('should respond to coaching request', async () => {
    const response = await invokeAgent(
      "I need motivation",
      "test-user-123"
    );
    
    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(0);
  });

  it('should handle errors gracefully', async () => {
    const result = await invokeAgentSafe(
      "",  // Empty input
      "test-user-456"
    );
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

---

## Best Practices

### 1. Input Validation

```typescript
function validateInput(message: string): boolean {
  if (!message || message.trim().length === 0) {
    return false;
  }
  if (message.length > 10000) {  // Max input length
    return false;
  }
  return true;
}
```

### 2. Response Streaming

For better UX, process streaming responses in real-time:

```typescript
async function invokeAgentStreaming(
  userMessage: string,
  userId: string,
  onChunk: (chunk: string) => void
) {
  const response = await client.send(command);
  const decoder = new TextDecoder();
  
  for await (const event of response.completion) {
    if (event.chunk?.bytes) {
      const chunk = decoder.decode(event.chunk.bytes);
      onChunk(chunk);  // Call callback for each chunk
    }
  }
}
```

### 3. Timeout Handling

```typescript
const TIMEOUT_MS = 30000;  // 30 seconds

async function invokeAgentWithTimeout(
  userMessage: string,
  userId: string
): Promise<string> {
  return Promise.race([
    invokeAgent(userMessage, userId),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
    )
  ]);
}
```

### 4. Logging

```typescript
async function invokeAgentWithLogging(
  userMessage: string,
  userId: string
): Promise<string> {
  const startTime = Date.now();
  
  try {
    console.log(`[${userId}] Invoking agent with message: ${userMessage.substring(0, 50)}...`);
    
    const response = await invokeAgent(userMessage, userId);
    const duration = Date.now() - startTime;
    
    console.log(`[${userId}] Agent responded in ${duration}ms`);
    
    return response;
  } catch (error) {
    console.error(`[${userId}] Agent invocation failed:`, error);
    throw error;
  }
}
```

---

## Security Considerations

### 1. Input Sanitization

Always sanitize user input before sending to the agent:

```typescript
function sanitizeInput(input: string): string {
  // Remove potentially harmful content
  return input
    .trim()
    .replace(/<script>/gi, '')
    .replace(/javascript:/gi, '')
    .substring(0, 10000);  // Limit length
}
```

### 2. Rate Limiting

Implement client-side rate limiting:

```typescript
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number = 10;
  private readonly windowMs: number = 60000;  // 1 minute

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }
}
```

### 3. Session Validation

Validate session IDs to prevent unauthorized access:

```typescript
function isValidSessionId(sessionId: string, userId: string): boolean {
  // Ensure session ID matches authenticated user
  return sessionId === userId;
}
```

---

## Troubleshooting

### Issue: Agent Not Responding

**Symptoms**: Timeout or no response  
**Possible Causes**:
- Agent not deployed
- Wrong agent ID
- Network issues

**Solution**:
```bash
# Check agent status
cd agents/coach-companion-agentcore
agentcore status

# Check CloudWatch logs
aws logs tail /aws/bedrock-agentcore/runtimes/coach_companion-0ZUOP04U5z-DEFAULT --follow --region eu-west-1
```

### Issue: High Latency

**Symptoms**: Responses taking > 10 seconds  
**Possible Causes**:
- Cold start
- Large output tokens
- Model throttling

**Solution**:
- Monitor CloudWatch metrics
- Optimize prompt length
- Check for throttling errors

### Issue: Authentication Errors

**Symptoms**: `AccessDeniedException`  
**Possible Causes**:
- Missing IAM permissions
- Wrong region
- Expired credentials

**Solution**:
- Verify IAM role has `bedrock:InvokeAgent` permission
- Check AWS credentials are valid
- Ensure using correct region (eu-west-1)

---

## References

- [AWS Bedrock Agent Runtime API Reference](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_Operations_Agents_for_Amazon_Bedrock_Runtime.html)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Boto3 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [AGENTCORE_DEPLOYMENT_GUIDE.md](./AGENTCORE_DEPLOYMENT_GUIDE.md)

---

**API documentation complete as of February 8, 2026**

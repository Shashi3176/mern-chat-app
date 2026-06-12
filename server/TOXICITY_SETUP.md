# Toxicity Filtering Setup Guide

This guide walks you through setting up the Hugging Face toxicity filtering system.

## What You'll Need

- A Hugging Face account (free tier available)
- Basic familiarity with environment variables

## Step-by-Step Setup

### 1. Create a Hugging Face Account

Visit [huggingface.co](https://huggingface.co) and click "Sign Up" to create a free account.

![Hugging Face Sign Up](https://huggingface.co/front/assets/huggingface_logo.png)

The free tier includes:
- 30,000 tokens/month (approximately 600 requests/day)
- Access to thousands of models
- No credit card required

### 2. Get Your API Token

1. After signing in, go to [Settings → Access Tokens](https://huggingface.co/settings/tokens)
2. Click "New token"
3. Give it a name (e.g., "ChatApp Production")
4. Select role: **Read** (sufficient for inference API)
5. Click "Generate token"
6. Copy the token immediately - you won't see it again!

The token format is: `hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 3. Add to .env File

In your server directory, copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your token:

```env
HUGGINGFACE_API_TOKEN=hf_your_token_here
```

### 4. Configure Threshold and Fail Mode

**Threshold (0.1 - 0.9)**

Controls sensitivity. Higher values = less strict:
- `0.3` - Very strict, blocks borderline content
- `0.5` - Recommended default, balanced
- `0.7` - Relaxed, only blocks obvious toxicity

```env
TOXICITY_THRESHOLD=0.5
```

**Fail Mode**

What happens when the API is unavailable:
- `open` - Allow messages (fail open, user-friendly)
- `closed` - Block all messages (fail closed, strict moderation)

```env
TOXICITY_FAIL_MODE=open
```

### 5. Test the System

Start the server and verify it's working:

```bash
npm start
```

Check the health endpoint:

```bash
curl http://localhost:5000/api/health/toxicity
```

Expected response:
```json
{
  "status": "healthy",
  "model": "unitary/toxic-bert",
  "responseTime": "1200ms",
  "cacheStats": { "hits": 0, "misses": 0 }
}
```

Test the admin endpoint with a sample message:

```bash
curl -X POST http://localhost:5000/api/admin/test-toxicity \
  -H "Content-Type: application/json" \
  -H "x-admin-key: your-admin-key" \
  -d '{"message": "You are an idiot"}'
```

Expected response:
```json
{
  "message": "You are an idiot",
  "isToxic": true,
  "categories": ["insult"],
  "scores": { "insult": 0.95, "toxic": 0.82 },
  "threshold": 0.5,
  "wouldBlock": true,
  "confidence": 0.95
}
```

## Troubleshooting Common Issues

### Invalid API Token (401 Error)

**Symptoms**: Server logs show "HUGGINGFACE_API_TOKEN not configured" or API returns 401

**Solutions**:
1. Verify token starts with `hf_`
2. Check token wasn't truncated in .env file
3. Ensure no extra quotes or spaces around the token
4. Regenerate token if unsure

```bash
# Test token validity
curl -H "Authorization: Bearer hf_your_token" \
  https://huggingface.co/api/whoami
```

### Rate Limiting (429 Error)

**Symptoms**: Messages fail with "Service is busy" errors

**Solutions**:
1. Free tier limit: 30 requests/minute
2. Wait for the rate limit to reset (check `Retry-After` header)
3. Consider upgrading to a paid plan for higher limits
4. Cache helps reduce API calls

Upgrade options:
- **Pro** ($9/month): 1M tokens/month
- **Enterprise**: Custom limits

### Slow Responses

**Symptoms**: Messages take >3 seconds to send

**Possible causes**:
1. **Cold start**: First request after idle period takes 5-10 seconds
2. **Model loading**: Hugging Face spins down unused models
3. **Network latency**: Server location relative to Hugging Face infra

**Mitigations**:
- Cache is enabled by default (TTL: 1 hour)
- Consider upgrading for faster inference
- First message in a conversation will always be slower

### Model Loading Errors (503)

**Symptoms**: 503 "Service is starting up" responses

**What it means**: The model is spinning up on Hugging Face's servers

**Solutions**:
1. The system retries automatically (up to 2 times)
2. Wait 10-20 seconds and try again
3. Messages will be allowed through in `open` fail mode

## Next Steps

- [Tuning Guide](./TUNING_GUIDE.md) - Adjust sensitivity and categories
- [API Documentation](./API_DOCUMENTATION.md) - Admin endpoints
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Production checklist
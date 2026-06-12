# Toxicity Filtering Troubleshooting

## Common Issues

### Invalid API Token (401 Unauthorized)

**Symptoms:**
- Server logs: `[ToxicityChecker] HUGGINGFACE_API_TOKEN not configured`
- Health check shows: `"status": "down"`
- Test endpoint fails with `userMessage: "Service configuration error"`

**Solutions:**
1. Verify token in `.env`:
   ```bash
   grep HUGGINGFACE_API_TOKEN .env
   # Should start with hf_
   ```
2. Check for typos, extra quotes, or whitespace
3. Regenerate token at https://huggingface.co/settings/tokens
4. Ensure `.env` file is loaded (restart server after changes)

**Test token:**
```bash
curl -H "Authorization: Bearer hf_your_token" \
  https://huggingface.co/api/whoami
```

---

### Rate Limiting (429 Too Many Requests)

**Symptoms:**
- Messages blocked with "Service is busy"
- Server logs: `[ToxicityChecker] Rate limited (429)`
- Users see retry errors

**Limits:**
- Free tier: 30 requests/minute per API
- Pro tier: 1M tokens/month
- Enterprise: Custom

**Solutions:**
1. Wait for rate limit reset (check `Retry-After` header)
2. Monitor cache stats - higher cache = fewer API calls:
   ```bash
   curl http://localhost:5000/api/health/toxicity | jq .cacheStats
   ```
3. Consider upgrading at https://huggingface.co/pricing
4. Reduce message frequency in tests

---

### Slow Responses

**Symptoms:**
- Messages take >3 seconds to send
- Users report delays

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Cold start | First request after idle takes 5-10s. Consider sending periodic "ping" to keep warm. |
| Model loading (503) | System retries automatically. Wait 10-20 seconds for model to load. |
| Network latency | Server closer to US/EU has better performance. Hugging Face primarily serves from these regions. |
| Cache disabled | Enable cache: `TOXICITY_CACHE_ENABLED=true` |

---

### Model Loading Errors (503)

**Symptoms:**
- Health check: `"status": "degraded"` with `errorType: "model_loading"`
- Test messages return 503 with "Service is starting up"

**What happens:**
- The system retries automatically (up to 2 times)
- With `TOXICITY_FAIL_MODE=open`, messages are allowed through
- Model typically loads within 10-30 seconds

**Solutions:**
- Wait patiently - this is temporary
- Consider upgrading to Pro for faster inference
- Keep service warm with periodic health checks

---

## Health Check Diagnostics

Run the health check endpoint for diagnostics:

```bash
curl http://localhost:5000/api/health/toxicity | jq
```

### Status Meanings

| Status | Meaning | Action |
|--------|---------|--------|
| `healthy` | Service operational | ✅ No action needed |
| `degraded` | Model loading or slow responses | ⚠️ Wait, monitor |
| `down` | Authentication or configuration error | ❌ Fix configuration |

---

## Log Analysis

Check server logs for toxicity-related messages:

```bash
# Filter toxicity logs
npm start 2>&1 | grep -i toxicity

# Look for specific issues
npm start 2>&1 | grep -E "(rate_limit|circuit|error)"
```

Common log messages:
- `Cache HIT/MISS` - Normal operation, cache working
- `Circuit breaker OPENED` - Too many failures, protection active
- `Model loading (503)` - Model is spinning up
- `Rate limited (429)` - Need to slow down or upgrade

---

## Testing the System

### Test with a known toxic message:
```bash
curl -X POST http://localhost:5000/api/admin/test-toxicity \
  -H "x-admin-key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "You are a terrible person"}'
```

Expected: `"isToxic": true`

### Test with clean message:
```bash
curl -X POST http://localhost:5000/api/admin/test-toxicity \
  -H "x-admin-key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you?"}'
```

Expected: `"isToxic": false`

---

## Emergency Procedures

### Disable Toxicity Filter Temporarily:
```bash
# Remove or comment out the token
# HUGGINGFACE_API_TOKEN=

# Or set to empty
HUGGINGFACE_API_TOKEN=
```

Restart server. With `TOXICITY_FAIL_MODE=open`, messages will flow through.

### Block All Messages (strict mode):
```bash
TOXICITY_FAIL_MODE=closed
TOXICITY_THRESHOLD=1.0  # Effectively blocks nothing but API errors
```

### Clear Cache:
```bash
# Requires code change or restart - cache clears on restart
npm restart
```
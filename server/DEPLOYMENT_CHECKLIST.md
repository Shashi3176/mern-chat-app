# Toxicity Filtering Deployment Checklist

## Pre-Deployment

- [ ] Set `HUGGINGFACE_API_TOKEN` in production
- [ ] Set appropriate `TOXICITY_THRESHOLD` (default: 0.5 recommended)
- [ ] Configure `TOXICITY_FAIL_MODE` (open for user-friendly, closed for strict)
- [ ] Set `ADMIN_SECRET_KEY` for admin endpoint access
- [ ] Review and customize `TOXICITY_WHITELIST_PATH` phrases

## Verification

- [ ] Test health endpoint: `curl /api/health/toxicity`
- [ ] Test admin endpoint with sample messages
- [ ] Send test message through the app to verify blocking works
- [ ] Verify whitelist phrases are allowed through
- [ ] Check cache is enabled and working

## Monitoring

- [ ] Monitor error logs for toxicity-related errors
- [ ] Set up alerts for high error rate (>10%)
- [ ] Check cache hit rate >50% after warmup
- [ ] Monitor API quota usage (Hugging Face dashboard)
- [ ] Set up log retention (recommend 30 days)

## Production Settings

| Variable | Production Value | Notes |
|----------|-----------------|-------|
| `HUGGINGFACE_API_TOKEN` | Set | Required |
| `TOXICITY_THRESHOLD` | 0.5 | Adjust based on community |
| `TOXICITY_FAIL_MODE` | open | User-friendly on outages |
| `TOXICITY_CACHE_ENABLED` | true | Essential for performance |
| `TOXICITY_CACHE_TTL` | 3600 | 1 hour cache |
| `TOXICITY_CACHE_MAX_SIZE` | 1000 | Increase for high traffic |
| `TOXICITY_CIRCUIT_BREAKER_THRESHOLD` | 5 | Default OK |
| `TOXICITY_CIRCUIT_BREAKER_TIMEOUT` | 300000 | 5 minutes |
| `TOXICITY_RATE_LIMIT_MAX` | 30 | Free tier limit |
| `TOXICITY_ERROR_RATE_THRESHOLD` | 0.1 | Alert at 10% errors |
| `ADMIN_SECRET_KEY` | Set | Strong random value |

## Scaling Considerations

### If you hit rate limits:

- [ ] Upgrade to Hugging Face Pro ($9/month for 1M tokens)
- [ ] Increase `TOXICITY_CACHE_TTL` to reduce API calls
- [ ] Increase `TOXICITY_CACHE_MAX_SIZE` for larger cache
- [ ] Consider self-hosted model for high-volume applications

### Cache Optimization

After warmup period, check cache stats:
```bash
curl /api/health/toxicity | jq .cacheStats.hits
```

If hit rate <50%, consider:
- Higher TTL
- Larger cache size
- More common message patterns

## Incident Response

If toxicity filter is failing:

1. Check `HUGGINGFACE_API_TOKEN` is valid
2. Verify Hugging Face status at https://status.huggingface.co
3. Check server logs for rate limiting
4. Consider switching to `TOXICITY_FAIL_MODE=open` if not already

If you need to disable immediately:
1. Remove `HUGGINGFACE_API_TOKEN` from environment
2. Restart server
3. Messages will flow through (fail open)
# Toxicity Filtering Tuning Guide

## Threshold Configuration

The `TOXICITY_THRESHOLD` controls how strict the filter is. It's compared against the model's confidence score for each category.

### Threshold Values

| Threshold | Effect | Use Case |
|-----------|--------|----------|
| 0.3 | Very strict | High-moderation communities, children's apps |
| 0.4 | Strict | Professional platforms, formal discussions |
| 0.5 (default) | Balanced | Most applications (recommended) |
| 0.6 | Moderate | Allow more casual language |
| 0.7 | Relaxed | Adult communities, gaming chats |
| 0.8 | Very relaxed | Minimal filtering, catch only extreme cases |
| 0.9 | Lenient | Only block with very high confidence |

### How to Adjust

```bash
# Edit .env
TOXICITY_THRESHOLD=0.5
```

Restart the server for changes to take effect.

### Testing Your Threshold

Use the test endpoint to verify behavior:

```bash
curl -X POST http://localhost:5000/api/admin/test-toxicity \
  -H "x-admin-key: $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Your test message here"}'
```

## Category Filtering

The `TOXICITY_CATEGORIES` variable controls which toxicity categories trigger blocking.

### Available Categories

| Category | Description |
|----------|-------------|
| `toxic` | Generally toxic, rude, or disrespectful content |
| `severe_toxic` | Severely toxic content |
| `obscene` | Obscene language or vulgar expressions |
| `threat` | Threatening language or violence |
| `insult` | Insulting or offensive language |
| `identity_hate` | Hate speech targeting identity (race, religion, etc.) |

### Selecting Categories

```bash
# Block all categories (default)
TOXICITY_CATEGORIES=toxic,severe_toxic,obscene,threat,insult,identity_hate

# Block only severe categories
TOXICITY_CATEGORIES=severe_toxic,threat,identity_hate

# Block only insults and general toxicity
TOXICITY_CATEGORIES=toxic,insult
```

## Handling False Positives (Whitelist)

Use `TOXICITY_WHITELIST` to allow phrases that might be incorrectly flagged.

### Methods

**Method 1: JSON file (recommended)**

Edit `config/toxicityWhitelist.json`:
```json
[
  "this is killing me",
  "you're killing it",
  "that's sick",
  "bad ass",
  "hell of a job"
]
```

**Method 2: Environment variable**

```bash
TOXICITY_WHITELIST='["this is killing me", "you'"'"'re killing it"]'
```

### Guidelines

- Use complete phrases, not single words
- Phrases are matched as substrings (case-insensitive)
- Keep whitelist small to avoid abuse
- Monitor logs to identify patterns for whitelisting

## Checking Results

Monitor the toxicity logs to understand what's being blocked:

```bash
# Get recent blocked messages
curl -H "x-admin-key: $ADMIN_KEY" \
  http://localhost:5000/api/admin/toxicity-logs?limit=20

# Get statistics
curl -H "x-admin-key: $ADMIN_KEY" \
  http://localhost:5000/api/admin/toxicity-stats
```

## Performance Tuning

### Cache Settings

Increase cache settings for high-traffic applications:

```bash
TOXICITY_CACHE_TTL=7200      # 2 hours (default: 1 hour)
TOXICITY_CACHE_MAX_SIZE=5000 # Larger cache (default: 1000)
```

### Monitoring Cache Hit Rate

Aim for >50% cache hit rate:

```bash
curl http://localhost:5000/api/health/toxicity | jq .cacheStats
```

### Circuit Breaker

For unstable networks, adjust:

```bash
TOXICITY_CIRCUIT_BREAKER_THRESHOLD=3     # Open after 3 failures (default: 5)
TOXICITY_CIRCUIT_BREAKER_TIMEOUT=60000 # 1 minute timeout (default: 5 min)
```

## Fail Mode Selection

| Mode | Behavior When API Down | Recommendation |
|------|------------------------|----------------|
| `open` | Allow messages through | Development, user-friendly |
| `closed` | Block all messages | Strict moderation, production |

```bash
TOXICITY_FAIL_MODE=open  # Default: don't block good users on outages
```
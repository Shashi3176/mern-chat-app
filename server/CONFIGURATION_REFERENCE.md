# Toxicity Filtering Configuration Reference

## Environment Variables

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `HUGGINGFACE_API_TOKEN` | Hugging Face API token for inference | (required) | Format: `hf_...` |
| `TOXICITY_MODEL` | Hugging Face model to use | `unitary/toxic-bert` | Any Hugging Face text classification model |
| `TOXICITY_THRESHOLD` | Confidence threshold for blocking | `0.5` | `0.1` - `0.9` |
| `TOXICITY_FAIL_MODE` | Behavior when API fails | `open` | `open` (allow) or `closed` (block) |
| `TOXICITY_CACHE_ENABLED` | Enable response caching | `true` | `true` or `false` |
| `TOXICITY_CACHE_TTL` | Cache time-to-live in seconds | `3600` (1 hour) | Any positive integer |
| `TOXICITY_CACHE_MAX_SIZE` | Maximum cached entries | `1000` | Any positive integer |
| `TOXICITY_CATEGORIES` | Categories that trigger blocking | `toxic,severe_toxic,obscene,threat,insult,identity_hate` | Comma-separated list |
| `TOXICITY_WHITELIST_PATH` | Path to whitelist JSON file | `config/toxicityWhitelist.json` | Valid file path |
| `TOXICITY_WHITELIST` | Inline JSON whitelist array | (empty) | JSON array of strings |
| `TOXICITY_CIRCUIT_BREAKER_THRESHOLD` | Failures before circuit opens | `5` | Any positive integer |
| `TOXICITY_CIRCUIT_BREAKER_TIMEOUT` | Circuit open timeout in ms | `300000` (5 min) | Any positive integer |
| `TOXICITY_RATE_LIMIT_WINDOW` | Local rate limit window in ms | `60000` (1 min) | Any positive integer |
| `TOXICITY_RATE_LIMIT_MAX` | Max requests per window | `30` | Matches Hugging Face free tier |
| `TOXICITY_ERROR_RATE_THRESHOLD` | Alert threshold for errors | `0.1` (10%) | Any value 0-1 |
| `ADMIN_SECRET_KEY` | Secret key for admin endpoints | (required for admin) | Strong random string |

## Threshold Quick Reference

| Value | Strictness | Use Case |
|-------|------------|----------|
| 0.3 | Very strict | Children's apps, strict communities |
| 0.4 | Strict | Professional/professional platforms |
| 0.5 | Balanced | Default, most applications |
| 0.6 | Moderate | Casual communities |
| 0.7 | Relaxed | Gaming chats, adult communities |
| 0.8 | Lenient | Minimal filtering |

## Fail Mode Behavior

| Mode | API Available | API Error/Down | Circuit Open |
|------|---------------|----------------|--------------|
| `open` | Normal filtering | Messages allowed (logged) | Messages allowed |
| `closed` | Normal filtering | All messages blocked | All messages blocked |

## Category Reference

| Category | Description |
|----------|-------------|
| `toxic` | Generally toxic, rude, or disrespectful content |
| `severe_toxic` | Extremely toxic content |
| `obscene` | Obscene/vulgar language |
| `threat` | Threatening/violent language |
| `insult` | Insults and offensive language |
| `identity_hate` | Identity-based hate speech |

## Cache Best Practices

| Traffic Level | Suggested Cache Max Size | Suggested TTL |
|---------------|------------------------|---------------|
| Low (<1k msgs/day) | 1000 (default) | 3600 (1 hour) |
| Medium (1k-10k msgs/day) | 5000 | 7200 (2 hours) |
| High (>10k msgs/day) | 10000+ | 14400 (4 hours) |

Monitor cache hit rate via `/api/health/toxicity` - aim for >50%.
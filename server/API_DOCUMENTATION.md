# Anonymous Chat API Documentation

## Authentication

All endpoints except `/api/user/` and `/api/user/login` require authentication via `Authorization: Bearer <token>` header.

## Rate Limiting

All endpoints have rate limiting:
- **Anonymous endpoints**: 30 requests/minute
- **Message endpoints**: 30 requests/minute  
- **Room endpoints**: 60 requests/minute
- **User endpoints**: 100 requests/minute

Rate limit responses include `Retry-After` header.

## Room Management

### POST /api/rooms/public
Create a public chat room.

**Request Body:**
```json
{
  "roomName": "Optional room name",
  "topic": "Room topic",
  "maxParticipants": 50
}
```

**Success Response:** 201
```json
{
  "_id": "roomId",
  "roomType": "group",
  "status": "active",
  "topic": "Room topic",
  "participantCount": 1,
  "expiresAt": "ISO date"
}
```

**Error Responses:**
- 400: Missing required fields, maxParticipants out of range (2-100)
- 401: Not authenticated
- 429: Rate limit exceeded

---

### GET /api/rooms/public
List public rooms.

**Query Parameters:**
- `limit` (default: 50)
- `offset` (default: 0)
- `search` (optional) - searches roomName and topic

**Success Response:** 200
```json
[
  {
    "_id": "roomId",
    "roomName": "Room 1",
    "topic": "Topic",
    "participantCount": 5,
    "onlineCount": 3,
    "expiresAt": "ISO date"
  }
]
```

---

### POST /api/rooms/join
Join a room by ID.

**Request Body:**
```json
{ "roomId": "roomId" }
```

**Success Response:** 200
```json
{
  "_id": "roomId",
  "participantCount": 6,
  "status": "active"
}
```

**Error Responses:**
- 400: Missing roomId, invalid roomId format
- 403: Not a participant OR room at capacity
- 404: Room not found
- 410: Room expired or inactive
- 429: Rate limit exceeded

---

### POST /api/rooms/leave
Leave a room.

**Request Body:**
```json
{ "roomId": "roomId" }
```

**Success Response:** 200
```json
{ "message": "Left room successfully" }
```

**Error Responses:**
- 400: Missing roomId
- 404: Not a participant of this room

---

### GET /api/rooms/:roomId/participants
Get room participants.

**Success Response:** 200
```json
[
  {
    "user": { "_id": "userId", "anonymousName": { "name": "HappyTiger" } },
    "role": "admin",
    "joinedAt": "ISO date"
  }
]
```

---

### GET /api/rooms/:roomId/messages
Get room messages with pagination.

**Query Parameters:**
- `limit` (default: 100)
- `before` (ISO date) - get messages before this timestamp

**Success Response:** 200

---

## Matchmaking

### POST /api/matchmaking/random-chat
Request a random chat partner.

**Success Responses:**
- 200 - Added to queue: `{ "message": "Added to queue...", "queuePosition": 1 }`
- 200 - Already matched: `{ "message": "Already in queue...", "queuePosition": 1 }`
- 409 - Conflict: `{ "message": "You already have an active random chat", "roomId": "roomId" }`

---

### POST /api/matchmaking/random-chat/cancel
Cancel random chat request.

**Success Response:** 200
```json
{ "message": "Removed from queue" }
```

---

### GET /api/matchmaking/random-chat/status
Get current matchmaking status.

**Success Response:** 200
```json
{
  "status": "available" | "waiting" | "matched",
  "queuePosition": 1, // if waiting
  "roomId": "roomId", // if matched
  "expiresIn": 7200000 // milliseconds if matched
}
```

---

### POST /api/matchmaking/random-chat/next
Leave current chat and find new partner.

**Success Response:** 200
```json
{ "message": "Left current chat and joined queue...", "previousRoomId": "roomId" }
```

---

## Messages

### POST /api/message
Send a message.

**Request Body:**
```json
{
  "content": "Message text",
  "roomId": "roomId", // OR chatId
}
```

**Success Response:** 201
```json
{
  "_id": "messageId",
  "content": "Message text",
  "room": { "_id": "roomId", "roomName": "Room" },
  "sender": { "_id": "userId", "anonymousName": { "name": "HappyTiger" } }
}
```

**Error Responses:**
- 400: Missing content, empty content, content exceeds 5000 characters
- 403: Not a participant of room
- 410: Room expired or inactive
- 429: Rate limit exceeded

---

### GET /api/message/:chatId
Get messages for a chat (legacy endpoint).

## User Management

### POST /api/user/
Register new user.

**Request Body:**
```json
{ "email": "user@example.com", "password": "password123" }
```

**Success Response:** 201
```json
{
  "_id": "userId",
  "token": "jwt-token",
  "anonymousName": "HappyTiger"
}
```

**Error Responses:**
- 400: Missing fields, invalid email, password too short
- 400: Anonymous name pool exhausted
- 409: User already exists

---

### POST /api/user/login
Authenticate user.

---

## WebSocket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| setup | `{ _id: "userId" }` | Register socket for user |
| join room | `roomId` | Join socket room |
| leave room | `roomId` | Leave socket room |
| typing-room | `roomId` | Send typing indicator |
| stop-typing-room | `roomId` | Stop typing indicator |
| new message | message object | Send message |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| connected | - | Socket registered |
| random-chat-matched | `{ roomId, message }` | Match found |
| random-chat-cancelled | `{ message }` | Removed from queue |
| random-chat-partner-left | `{ roomId, message }` | Partner disconnected |
| room-expiration-warning | `{ roomId, expiresAt, message }` | Room expires soon |
| room-expired | `{ roomId, message }` | Room expired |
| room-participants-update | `{ roomId, participantCount }` | Room count changed |
| user-typing | `{ roomId, userId }` | User is typing |
| user-stop-typing | `{ roomId, userId }` | User stopped typing |
| message recieved | message object | New message received |

## Environment Variables

```bash
# Room Configuration
ROOM_EXPIRATION_HOURS=2          # Room lifetime in hours
ROOM_WARNING_MINUTES=5           # Warning before expiration
ROOM_MAX_PARTICIPANTS=50         # Maximum room capacity

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000        # 1 minute window
RATE_LIMIT_ANONYMOUS=30           # Requests per window
RATE_LIMIT_ROOMS=60
RATE_LIMIT_MESSAGES=60
RATE_LIMIT_USER=100

# Cleanup
EXPIRED_ROOMS_RETENTION_DAYS=30   # Days before deletion
QUEUE_STALE_THRESHOLD_MINUTES=5    # Stale queue entry age

# Security
PREVENT_NAME_SPOOFING=true       # Prevent client name changes
STRICT_ROOM_PRIVACY=true         # Enforce room access rules
LOGGING_ENABLED=true             # Enable event logging
LOG_LEVEL=info                   # Logging level

# Toxicity Checking (Hugging Face Inference API)
HUGGINGFACE_API_TOKEN=           # Required for toxicity filtering (starts with hf_)
TOXICITY_MODEL=unitary/toxic-bert # Hugging Face model to use
TOXICITY_THRESHOLD=0.5           # Confidence threshold (0.1-0.9)
TOXICITY_FAIL_MODE=open          # Behavior when API fails (open/closed)
TOXICITY_CACHE_ENABLED=true      # Enable response caching
TOXICITY_CACHE_TTL=3600          # Cache TTL in seconds (1 hour)
TOXICITY_CACHE_MAX_SIZE=1000     # Maximum cached entries
TOXICITY_CATEGORIES=toxic,severe_toxic,obscene,threat,insult,identity_hate # Blocked categories
TOXICITY_WHITELIST_PATH=config/toxicityWhitelist.json # Path to whitelist file
TOXICITY_WHITELIST=              # Inline JSON array of whitelisted phrases
TOXICITY_CIRCUIT_BREAKER_THRESHOLD=5    # Failures before circuit opens
TOXICITY_CIRCUIT_BREAKER_TIMEOUT=300000 # Circuit open time in ms (5 min)
TOXICITY_RATE_LIMIT_WINDOW=60000     # Local rate limit window in ms
TOXICITY_RATE_LIMIT_MAX=30             # Max requests in window
TOXICITY_ERROR_RATE_THRESHOLD=0.1      # Error rate alert threshold
```

## Content Moderation (Toxicity Filtering)

All messages longer than 3 characters are automatically checked for toxic content before being sent.

### POST /api/message

Send a message (with toxicity check).

**Request Body:**
```json
{
  "content": "Message text",
  "roomId": "roomId" // OR chatId (required)
}
```

**Success Response:** 201
```json
{
  "_id": "messageId",
  "content": "Message text",
  "room": { "_id": "roomId", "roomName": "Room" },
  "sender": { "_id": "userId", "anonymousName": { "name": "HappyTiger" } }
}
```

**New Error Responses:**
- 400: Missing content, empty content, content exceeds 5000 characters
- 400: **blocked=true** - Message blocked due to toxicity
  ```json
  {
    "success": false,
    "error": "This message violates our community guidelines and cannot be sent.",
    "blocked": true
  }
  ```
- 503: API error with `retryable=true` - Service unavailable but retry possible

### GET /api/health/toxicity

Check toxicity filtering service health.

**Success Response:** 200
```json
{
  "status": "healthy",
  "model": "unitary/toxic-bert",
  "responseTime": "1200ms",
  "cacheStats": { "hits": 42, "misses": 18 }
}
```

**Degraded Response:** 503
```json
{
  "status": "degraded",
  "model": "unitary/toxic-bert",
  "responseTime": "5000ms",
  "error": "Model is loading",
  "errorType": "model_loading"
}
```

## Admin Endpoints (Toxicity)

All admin endpoints require `x-admin-key` header.

### GET /api/admin/toxicity-logs

Get list of blocked toxic messages.

**Query Parameters:**
- `limit` (default: 50)
- `page` (default: 1)
- `userId` (optional) - Filter by user

**Success Response:** 200
```json
{
  "logs": [
    {
      "_id": "logId",
      "userId": "userId",
      "messageContent": "Blocked message text...",
      "detectedCategories": ["insult", "toxic"],
      "confidence": 0.95,
      "createdAt": "ISO date"
    }
  ],
  "pagination": { "total": 100, "page": 1, "pages": 2 }
}
```

### GET /api/admin/toxicity-stats

Get toxicity filtering statistics.

**Success Response:** 200
```json
{
  "totalMessagesChecked": 5000,
  "blockedMessages": 150,
  "blockRate": 3.0,
  "categoryBreakdown": {
    "toxic": 80,
    "insult": 45,
    "obscene": 25
  },
  "averageConfidence": 0.85
}
```

### POST /api/admin/test-toxicity

Test a message against the toxicity filter.

**Request Headers:**
```
x-admin-key: your-admin-key
Content-Type: application/json
```

**Request Body:**
```json
{ "message": "Test message text" }
```

**Success Response:** 200
```json
{
  "message": "Test message text",
  "isToxic": true,
  "categories": ["insult"],
  "scores": { "insult": 0.95, "toxic": 0.82 },
  "threshold": 0.5,
  "wouldBlock": true,
  "confidence": 0.95
}
```

**Error Response:** 400
```json
{ "error": "Message is required" }
```

## Performance Notes

### Expected Latency
- Cache hit: ~10ms
- API response: 1-3 seconds typical, up to 10 seconds on cold start
- First message after server restart is always slower (cold start)

### Cache Optimization
- Aim for cache hit rate >50% after warmup
- Monitor with: `curl /api/health/toxicity | jq .cacheStats`
- Higher TTL reduces API calls but may miss updated model behavior

### Rate Limits
- Free tier: 30 requests/minute
- Pro ($9/month): 1M tokens/month
- Enterprise: Custom limits
- Local rate limiting queues excess requests automatically

## Privacy & Compliance

### Data Flow
1. Message content sent to Hugging Face Inference API
2. API returns scores, content not stored by Hugging Face (transient processing)
3. Blocked messages logged locally in `toxicitylogs` collection
4. Cached results stored locally (SHA-256 hashed keys)

### Log Retention
- Blocked messages stored in database
- Recommendation: Implement 30-day retention policy
- Delete old logs: `DELETE FROM toxicitylogs WHERE createdAt < DATE_SUB(NOW(), INTERVAL 30 DAY)`

### GDPR Considerations
- User messages containing PII are sent to Hugging Face
- Consider your jurisdiction's data transfer requirements
- Blocked messages stored for moderation purposes
- Implement data export/deletion endpoints as required
- Whitelist can reduce false positives on benign phrases containing sensitive terms
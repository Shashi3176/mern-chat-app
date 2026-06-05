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
RATE_LIMIT_WINDOW_MS=60000       # 1 minute window
RATE_LIMIT_ANONYMOUS=30          # Requests per window
RATE_LIMIT_ROOMS=60
RATE_LIMIT_MESSAGES=60
RATE_LIMIT_USER=100

# Cleanup
EXPIRED_ROOMS_RETENTION_DAYS=30 # Days before deletion
QUEUE_STALE_THRESHOLD_MINUTES=5  # Stale queue entry age

# Security
PREVENT_NAME_SPOOFING=true       # Prevent client name changes
STRICT_ROOM_PRIVACY=true         # Enforce room access rules
LOGGING_ENABLED=true             # Enable event logging
LOG_LEVEL=info                   # Logging level
```
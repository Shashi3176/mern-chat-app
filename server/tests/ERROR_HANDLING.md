# Anonymous Chat Error Handling Guide

## HTTP Status Codes

| Scenario | Status Code | Description |
|----------|-------------|-------------|
| Room expired | 410 | Gone - Room has expired |
| Room not found | 404 | Not Found |
| Not a participant | 403 | Forbidden |
| Already in random chat | 409 | Conflict |
| Invalid ID format | 400 | Bad Request |
| Rate limit exceeded | 429 | Too Many Requests |
| Name pool exhausted | 400 | Bad Request |
| Room at capacity | 403 | Forbidden |
| Missing token | 401 | Unauthorized |

## Error Response Format

```json
{
  "message": "Human-readable error message",
  "success": false,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "errorCode": "OPTIONAL_ERROR_CODE"
}
```

## Error Scenarios

### 1. User tries to join an expired room
- **Endpoint**: POST /api/rooms/join
- **Validation**: Check `room.status === "active"` and `room.expiresAt > now`
- **Error**: 410 Gone - "Room has expired"
- **Graceful degradation**: Redirect to room list, suggest creating new room

### 2. User tries to send message to inactive room
- **Endpoint**: POST /api/message
- **Validation**: Verify participant status and room active status
- **Error**: 410 Gone - "Room is no longer active"
- **Graceful degradation**: Auto-rejoin queue if random chat, show "room ended" message

### 3. Matchmaking queue issues (user disconnects while waiting)
- **Handler**: `handleSocketDisconnect()` in matchmakingController.js
- **Behavior**: Removes user from queue, notifies partners if matched
- **Graceful degradation**: Clean queue on next request, track stale entries

### 4. Name pool exhaustion (all 1000 names taken)
- **Endpoint**: POST /api/user
- **Error**: 400 Bad Request - "Anonymous name pool is exhausted. All X names are in use."
- **Graceful degradation**: Auto-add more names, queue registration

### 5. User has multiple tabs open (concurrent sessions)
- **Handler**: `registerSocket()` - replaces previous session
- **Behavior**: Previous socket invalidated, new session takes precedence
- **Graceful degradation**: Notify old sessions, allow reconnection

### 6. WebSocket connection drops
- **Handler**: "disconnect" event in server.js
- **Behavior**: User marked inactive, room cleanup after 5 minutes
- **Graceful degradation**: Keep room active briefly for reconnection

### 7. User tries to join multiple random chats simultaneously
- **Endpoint**: POST /api/matchmaking/random-chat
- **Error**: 409 Conflict - "You already have an active random chat"
- **Graceful degradation**: Return existing room ID, suggest "next" endpoint

### 8. Room cleanup while users are active
- **Handler**: `closeExpiredRooms()` with warning at 5 minutes
- **Behavior**: Socket warning emitted, then room marked inactive
- **Graceful degradation**: Allow room activity to extend expiration

## Validation Middleware

Located in `server/middleware/validationMiddleware.js`:
- `validateRoomId` - validates ObjectId format
- `validateActiveRoom` - checks room exists and is active
- `validateParticipant` - verifies user participation
- `validateMessageContent` - validates message content

## Socket Events

| Event | Payload | Description |
|-------|---------|-------------|
| room-expiration-warning | {roomId, expiresAt} | Room expires in 5 minutes |
| room-expired | {roomId, message} | Room has expired |
| random-chat-matched | {roomId, message} | Match found |
| random-chat-cancelled | {message} | Removed from queue |
| random-chat-partner-left | {roomId, message} | Partner disconnected |

## Running Tests

```bash
npm run test
npm run test:watch
```

Test file: `server/tests/errorHandling.test.js`
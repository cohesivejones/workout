# Workout Coach API Documentation

Base URL: `/api/workout-coach`

All endpoints require authentication via secure HTTP-only cookie token.

## Endpoints

### POST /start

Initialize a new workout coach session.

**Authentication:** Required

**Request Body:** None

**Response:** 200 OK

```json
{
  "sessionId": "uuid-string",
  "message": "Session created"
}
```

**Errors:**

- `401` - Unauthorized (no valid auth token)
- `500` - Server error

---

### POST /respond

Submit user response (yes/no) for the current workout plan.

**Authentication:** Required

**Request Body:**

```json
{
  "sessionId": "uuid-string",
  "response": "yes" | "no"
}
```

**Response:** 200 OK

```json
{
  "message": "Response recorded"
}
```

**Errors:**

- `400` - Bad Request
  - Session ID is required
  - Response is required
  - Response must be "yes" or "no"
- `401` - Unauthorized (no valid auth token)
- `403` - Unauthorized (session belongs to different user)
- `404` - Session not found
- `500` - Server error

**Behavior:**

- `"yes"` - Records user acceptance of the current workout plan
- `"no"` - Records user rejection and increments regeneration count

---

### GET /stream/:sessionId

Server-Sent Events (SSE) stream for real-time workout generation updates.

**Authentication:** Required

**Parameters:**

- `sessionId` (path) - The session ID to stream events for

**Response Headers:**

- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

**Event Types:**

**Connected Event:**

```
data: {"type":"connected"}
```

**Keep-Alive Ping** (every 30 seconds):

```
data: {"type":"ping"}
```

**Errors:**

- `401` - Unauthorized (no valid auth token)
- `403` - Unauthorized (session belongs to different user)
- `404` - Session not found
- `500` - Server error

**Connection Management:**

- The connection is kept alive with periodic ping events
- Client should reconnect if connection is lost
- Server cleans up connection when client disconnects

---

## Workflow

### Typical Usage Flow:

1. **Start Session**

   ```
   POST /api/workout-coach/start
   → Returns sessionId
   ```

2. **Connect to Stream**

   ```
   GET /api/workout-coach/stream/{sessionId}
   → Receive real-time updates
   ```

3. **Generate Workout**
   - Server fetches user workout history (last 30 days)
   - OpenAI generates personalized workout
   - Workout sent via SSE stream

4. **User Responds**

   ```
   POST /api/workout-coach/respond
   {
     "sessionId": "...",
     "response": "yes" | "no"
   }
   ```

5. **If "no"**:
   - Regeneration count increments
   - New workout generated
   - Loop back to step 4

6. **If "yes"**:
   - Workout created in database
   - Session can be closed

### Multiple Regenerations:

Users can say "no" multiple times to regenerate workouts. Each "no" response:

- Increments the `regenerationCount`
- Triggers a new workout generation
- Maintains session state

### Security:

- All endpoints use existing `authenticateToken` middleware
- Sessions are tied to user IDs
- Users can only access their own sessions
- Session ownership verified on every request
- Sessions expire after 30 minutes of inactivity

### Session Management:

- Sessions stored in-memory (SessionStore)
- Automatic cleanup after 30 minutes
- Periodic cleanup every 5 minutes
- SSE connections cleaned up on disconnect

---

## Example Client Code

### Starting a Session:

```typescript
const response = await fetch('/api/workout-coach/start', {
  method: 'POST',
  credentials: 'include', // Include cookies
});

const { sessionId } = await response.json();
```

### Connecting to SSE Stream:

```typescript
const eventSource = new EventSource(`/api/workout-coach/stream/${sessionId}`, {
  withCredentials: true,
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'connected') {
    console.log('Connected to stream');
  } else if (data.type === 'workout') {
    // Handle workout data
    displayWorkout(data.workout);
  } else if (data.type === 'ping') {
    // Keep-alive ping, ignore or log
  }
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  eventSource.close();
};
```

### Submitting Response:

```typescript
async function respondToWorkout(sessionId: string, response: 'yes' | 'no') {
  await fetch('/api/workout-coach/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ sessionId, response }),
  });
}

// User clicks "Yes"
await respondToWorkout(sessionId, 'yes');

// User clicks "No"
await respondToWorkout(sessionId, 'no');
```

---

## Integration with LangGraph

The routes integrate with:

- **SessionStore** - In-memory session management
- **WorkoutCoachGraph** - LangGraph workflow for workout generation
- **OpenAI** - AI-powered workout generation
- **Database** - Workout history fetching and creation

The workflow uses a state machine pattern where:

- State stored in SessionStore
- User responses drive state transitions
- OpenAI generates workouts based on history
- Database operations handle persistence

# @antipopp/agno-client

Core stateful client library for Agno agents with streaming support.

## Installation

```bash
npm install @antipopp/agno-client
```

## Features

- ✅ **Stateful Management** - Manages messages, sessions, and configuration
- ✅ **Event-Driven** - Subscribe to real-time updates via EventEmitter
- ✅ **Streaming Support** - Real-time streaming of agent responses
- ✅ **Session Management** - Load and manage conversation sessions
- ✅ **Type-Safe** - Full TypeScript support with comprehensive types
- ✅ **Framework Agnostic** - Works with any JavaScript/TypeScript project

## Quick Start

```typescript
import { AgnoClient } from '@antipopp/agno-client';

// Create a client instance
const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'your-agent-id',
  authToken: 'optional-auth-token',
  userId: 'user-123', // Optional: Link sessions to a user
});

// Listen to message updates
client.on('message:update', (messages) => {
  console.log('New messages:', messages);
});

// Listen to errors
client.on('message:error', (error) => {
  console.error('Error:', error);
});

// Send a message
await client.sendMessage('Hello, agent!');

// Get current messages
const messages = client.getMessages();

// Clear chat
client.clearMessages();
```

## API Reference

### Constructor

```typescript
new AgnoClient(config: AgnoClientConfig)
```

**Config Options:**
- `endpoint` (string, required) - Base endpoint URL
- `authToken` (string, optional) - Authentication token
- `mode` ('agent' | 'team', optional) - Operation mode (default: 'agent')
- `agentId` (string, optional) - Agent ID (required if mode is 'agent')
- `teamId` (string, optional) - Team ID (required if mode is 'team')
- `dbId` (string, optional) - Database ID
- `sessionId` (string, optional) - Current session ID
- `userId` (string, optional) - User ID to link sessions to a specific user
- `headers` (Record<string, string>, optional) - Global custom headers for all API requests
- `params` (Record<string, string>, optional) - Global query parameters for all API requests

### Methods

#### `sendMessage(message, options?)`

Send a message to the agent/team.

```typescript
await client.sendMessage('Hello!');

// With FormData (for file uploads)
const formData = new FormData();
formData.append('message', 'Hello!');
formData.append('file', fileBlob);
await client.sendMessage(formData);

// With custom headers
await client.sendMessage('Hello!', {
  headers: { 'X-Custom-Header': 'value' }
});

// With query parameters
await client.sendMessage('Hello!', {
  params: { temperature: '0.7', max_tokens: '500' }
});

// With both headers and params
await client.sendMessage('Hello!', {
  headers: { 'X-Request-ID': '12345' },
  params: { debug: 'true' }
});
```

#### `getMessages()`

Get current messages.

```typescript
const messages: ChatMessage[] = client.getMessages();
```

#### `clearMessages()`

Clear all messages and reset session.

```typescript
client.clearMessages();
```

#### `loadSession(sessionId)`

Load a specific session.

```typescript
const messages = await client.loadSession('session-id');
```

#### `fetchSessions()`

Fetch all sessions for current agent/team.

```typescript
const sessions = await client.fetchSessions();
```

#### `initialize()`

Initialize client (check status and fetch agents/teams).

```typescript
const { agents, teams } = await client.initialize();
```

#### `updateConfig(updates)`

Update client configuration.

```typescript
client.updateConfig({
  agentId: 'new-agent-id',
  authToken: 'new-token',
  userId: 'user-456', // Update user ID
});
```

### Events

Subscribe to events using `client.on(event, handler)`:

- `message:update` - Emitted when messages are updated during streaming
- `message:complete` - Emitted when a message stream completes
- `message:error` - Emitted when an error occurs
- `session:loaded` - Emitted when a session is loaded
- `session:created` - Emitted when a new session is created
- `stream:start` - Emitted when streaming starts
- `stream:end` - Emitted when streaming ends
- `state:change` - Emitted when client state changes
- `config:change` - Emitted when configuration changes

```typescript
// Subscribe to events
client.on('message:update', (messages) => {
  console.log('Messages:', messages);
});

// Unsubscribe from events
const handler = (messages) => console.log(messages);
client.on('message:update', handler);
client.off('message:update', handler);
```

## Utilities

### Logger

The package includes a secure Logger utility for production-safe debugging:

```typescript
import { Logger } from '@antipopp/agno-client';

// Debug and info messages only log in development mode
Logger.debug('Debug message', { someData: 'value' });
Logger.info('Client initialized', { endpoint: 'http://localhost:7777' });

// Warnings and errors always log
Logger.warn('Connection issue detected');
Logger.error('Failed to send message', error);

// Sensitive data is automatically sanitized
Logger.debug('Config loaded', {
  endpoint: 'http://localhost:7777',
  authToken: 'secret-token'  // Will be logged as [REDACTED]
});
```

**Features:**
- **Automatic sanitization** - Sensitive fields (authToken, Authorization, token, password, apiKey) are automatically redacted
- **Environment-aware** - Debug/info logs only appear in development mode (NODE_ENV === 'development')
- **Always-on errors** - Warnings and errors always log, even in production
- **Production-safe** - Prevents accidental exposure of secrets in production logs

**Sanitized Fields:**
- `authToken`, `Authorization`, `token`, `password`, `apiKey` and any field containing these words (case-insensitive)

## Advanced Usage

### Session Management

```typescript
// Fetch all sessions
const sessions = await client.fetchSessions();

// Load a specific session
const messages = await client.loadSession(sessions[0].session_id);

// Current session ID
const sessionId = client.getConfig().sessionId;
```

### State Management

```typescript
// Get current state
const state = client.getState();
console.log(state.isStreaming);
console.log(state.isEndpointActive);
console.log(state.agents);
console.log(state.teams);
```

### Error Handling

```typescript
client.on('message:error', (error) => {
  console.error('Streaming error:', error);
});

try {
  await client.sendMessage('Hello!');
} catch (error) {
  console.error('Failed to send:', error);
}
```

### Custom Headers and Query Parameters

The client supports both global and per-request headers and query parameters.

#### Global Configuration

Set headers and params in the client config to apply them to all API requests:

```typescript
const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  agentId: 'agent-123',
  headers: {
    'X-API-Version': 'v2',
    'X-Client-ID': 'my-app'
  },
  params: {
    locale: 'en-US',
    environment: 'production'
  }
});
```

#### Per-Request Options

Override or add headers/params for specific requests:

```typescript
// Per-request overrides global settings
await client.sendMessage('Hello!', {
  headers: { 'X-Request-ID': '12345' },
  params: { temperature: '0.7' }
});

// All methods support headers and params
await client.loadSession('session-123', {
  params: { include_metadata: 'true' }
});

await client.fetchSessions({
  params: { limit: '50', status: 'active' }
});

await client.continueRun(tools, {
  headers: { 'X-Trace-ID': 'abc123' },
  params: { debug: 'true' }
});
```

#### Merge Behavior

**Headers:**
1. Global headers from `config.headers` (lowest precedence)
2. Per-request headers (overrides global)
3. Authorization header from `authToken` (highest precedence - always overrides)

**Query Parameters:**
1. Global params from `config.params` (lowest precedence)
2. Per-request params (highest precedence - overrides global)

```typescript
const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  agentId: 'agent-123',
  params: { version: 'v1', locale: 'en-US' }
});

// This request will have: version=v2 (overridden), locale=en-US (from global), debug=true (added)
await client.sendMessage('Hello!', {
  params: { version: 'v2', debug: 'true' }
});
```

#### Common Use Cases

**Headers:**
- Request tracking: `{ 'X-Request-ID': uuid() }`
- API versioning: `{ 'X-API-Version': 'v2' }`
- Client identification: `{ 'X-Client-ID': 'mobile-app' }`
- Custom auth: `{ 'X-Custom-Auth': 'token' }`

**Query Parameters:**
- Model configuration: `{ temperature: '0.7', max_tokens: '500' }`
- Feature flags: `{ enable_streaming: 'true' }`
- Locale/language: `{ locale: 'en-US', timezone: 'America/New_York' }`
- Debugging: `{ debug: 'true', trace_id: 'xyz' }`
- Pagination: `{ page: '1', limit: '50' }`

### Request Cancellation

Use the `cancelRun()` method to cancel ongoing streaming requests. This provides a complete cancellation flow that:
1. **Aborts the local fetch stream** - Immediate UI feedback
2. **Notifies the backend** - Stops LLM processing and saves compute costs

```typescript
// Start a streaming request
await client.sendMessage('Hello!');

// Cancel the request
await client.cancelRun();
```

**State Tracking:**

```typescript
// Check cancellation state
const state = client.getState();
console.log(state.isStreaming);    // true while streaming
console.log(state.isCancelling);   // true during cancellation
console.log(state.currentRunId);   // current run ID (if streaming)
```

**React Example:**

```typescript
import { useAgnoChat } from '@antipopp/agno-react';

function ChatComponent() {
  const { sendMessage, cancelRun, isStreaming, isCancelling } = useAgnoChat();

  const handleSend = async () => {
    await sendMessage('Hello!');
  };

  const handleCancel = async () => {
    await cancelRun();
  };

  return (
    <div>
      <button onClick={handleSend} disabled={isStreaming}>Send</button>
      <button onClick={handleCancel} disabled={!isStreaming || isCancelling}>
        {isCancelling ? 'Cancelling...' : 'Cancel'}
      </button>
    </div>
  );
}
```

**Use Cases:**
- **User cancellation** - Allow users to stop long-running requests via a "Stop" button
- **Component unmounting** - Cancel requests when user navigates away
- **Timeout handling** - Cancel requests that exceed a time limit

**Events:**
- `run:cancelled` - Emitted when cancellation completes (includes `runId` and `sessionId`)
- Cancelled messages have `cancelled: true` flag (distinct from errors)

## License

MIT

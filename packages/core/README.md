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

### Request Cancellation

Use `AbortController` to cancel ongoing requests. This is essential for preventing memory leaks when components unmount or users navigate away during streaming:

```typescript
const controller = new AbortController();

// Pass signal to sendMessage options
await client.sendMessage('Hello!', {
  signal: controller.signal
});

// Cancel the request (e.g., on component unmount)
controller.abort();
```

**React Example:**

```typescript
import { useEffect } from 'react';
import { AgnoClient } from '@antipopp/agno-client';

function ChatComponent() {
  const client = new AgnoClient(config);

  useEffect(() => {
    const controller = new AbortController();

    // Send message with abort signal
    client.sendMessage('Hello!', {
      signal: controller.signal
    });

    // Cleanup: cancel request on unmount
    return () => {
      controller.abort();
    };
  }, []);

  return <div>Chat</div>;
}
```

**Use Cases:**
- **Component unmounting** - Cancel requests when user navigates away
- **Request timeouts** - Implement custom timeout logic
- **User cancellation** - Allow users to cancel long-running requests
- **Preventing memory leaks** - Ensure streaming stops when components are destroyed

**Note:** Aborted requests will not trigger the `onError` callback - they complete silently.

## License

MIT

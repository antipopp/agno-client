# @antipopp/agno-react

React hooks for Agno client with full TypeScript support.

## Installation

```bash
npm install @antipopp/agno-react
```

This package includes `@antipopp/agno-client` and `@antipopp/agno-types` as dependencies.

## Features

- ✅ **Easy Integration** - Drop-in React hooks for Agno agents
- ✅ **Context Provider** - Manages client lifecycle automatically
- ✅ **Real-time Updates** - React state synced with streaming updates
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Familiar API** - Matches the original Agno React hooks design

## Quick Start

### 1. Wrap Your App with AgnoProvider

```tsx
import { AgnoProvider } from '@antipopp/agno-react';

function App() {
  return (
    <AgnoProvider
      config={{
        endpoint: 'http://localhost:7777',
        mode: 'agent',
        agentId: 'your-agent-id',
        userId: 'user-123', // Optional: Link sessions to a user
        headers: {          // Optional: Global headers for all requests
          'X-API-Version': 'v2'
        },
        params: {           // Optional: Global query params for all requests
          locale: 'en-US'
        }
      }}
    >
      <YourComponents />
    </AgnoProvider>
  );
}
```

### 2. Use Hooks in Your Components

```tsx
import { useAgnoChat, useAgnoActions } from '@antipopp/agno-react';

function ChatComponent() {
  const { messages, sendMessage, isStreaming, error } = useAgnoChat();
  const { initialize } = useAgnoActions();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleSend = async () => {
    await sendMessage('Hello, agent!');
  };

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>
          <strong>{msg.role}:</strong> {msg.content}
        </div>
      ))}
      {error && <div>Error: {error}</div>}
      <button onClick={handleSend} disabled={isStreaming}>
        {isStreaming ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
}
```

## API Reference

### AgnoProvider

Provider component that creates and manages an `AgnoClient` instance.

```tsx
<AgnoProvider config={config}>
  {children}
</AgnoProvider>
```

**Props:**
- `config` (AgnoClientConfig) - Client configuration
- `children` (ReactNode) - Child components

### useAgnoClient()

Access the underlying `AgnoClient` instance.

```tsx
const client = useAgnoClient();

// Use client methods directly
await client.sendMessage('Hello!');
```

### useAgnoChat()

Main hook for chat interactions.

```tsx
const {
  messages,        // ChatMessage[] - Current messages
  sendMessage,     // (message, options?) => Promise<void>
  clearMessages,   // () => void
  isStreaming,     // boolean - Is currently streaming
  error,           // string | undefined - Current error
  state,           // ClientState - Full client state
} = useAgnoChat();
```

**Methods:**

#### `sendMessage(message, options?)`

```tsx
// Send a text message
await sendMessage('Hello!');

// Send with FormData (for file uploads)
const formData = new FormData();
formData.append('message', 'Hello!');
formData.append('file', file);
await sendMessage(formData);

// Send with custom headers
await sendMessage('Hello!', {
  headers: { 'X-Custom': 'value' }
});

// Send with query parameters
await sendMessage('Hello!', {
  params: { temperature: '0.7', max_tokens: '500' }
});

// Send with both headers and params
await sendMessage('Hello!', {
  headers: { 'X-Request-ID': '12345' },
  params: { debug: 'true' }
});
```

#### `clearMessages()`

```tsx
clearMessages(); // Clears all messages and resets session
```

### useAgnoSession()

Hook for session management.

```tsx
const {
  sessions,          // SessionEntry[] - Available sessions
  currentSessionId,  // string | undefined - Current session ID
  loadSession,       // (sessionId) => Promise<ChatMessage[]>
  fetchSessions,     // () => Promise<SessionEntry[]>
  isLoading,         // boolean - Is loading session
  error,             // string | undefined - Current error
} = useAgnoSession();
```

**Example:**

```tsx
function SessionList() {
  const { sessions, loadSession, fetchSessions } = useAgnoSession();

  useEffect(() => {
    // Fetch sessions with optional query params
    fetchSessions({ params: { limit: '50', status: 'active' } });
  }, [fetchSessions]);

  const handleLoadSession = (sessionId: string) => {
    // Load session with optional params
    loadSession(sessionId, { params: { include_metadata: 'true' } });
  };

  return (
    <ul>
      {sessions.map((session) => (
        <li key={session.session_id}>
          <button onClick={() => handleLoadSession(session.session_id)}>
            {session.session_name}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

### useAgnoActions()

Hook for common actions and initialization.

```tsx
const {
  initialize,       // () => Promise<{ agents, teams }>
  checkStatus,      // () => Promise<boolean>
  fetchAgents,      // () => Promise<AgentDetails[]>
  fetchTeams,       // () => Promise<TeamDetails[]>
  updateConfig,     // (updates) => void
  isInitializing,   // boolean
  error,            // string | undefined
} = useAgnoActions();
```

**Example:**

```tsx
function InitComponent() {
  const { initialize, fetchAgents, updateConfig, isInitializing } = useAgnoActions();
  const { state } = useAgnoChat();

  useEffect(() => {
    // Initialize with optional params
    initialize({ params: { filter: 'active' } });
  }, [initialize]);

  const loadMoreAgents = () => {
    // Fetch agents with custom params
    fetchAgents({ params: { page: '2', limit: '20' } });
  };

  const switchAgent = (agentId: string) => {
    updateConfig({ agentId, mode: 'agent' });
  };

  if (isInitializing) return <div>Loading...</div>;

  return (
    <div>
      <h3>Agents</h3>
      {state.agents.map((agent) => (
        <button key={agent.id} onClick={() => switchAgent(agent.id)}>
          {agent.name}
        </button>
      ))}
      <button onClick={loadMoreAgents}>Load More</button>
    </div>
  );
}
```

## Complete Example

```tsx
import { useState, useEffect } from 'react';
import {
  AgnoProvider,
  useAgnoChat,
  useAgnoSession,
  useAgnoActions,
} from '@antipopp/agno-react';

function App() {
  return (
    <AgnoProvider
      config={{
        endpoint: 'http://localhost:7777',
        mode: 'agent',
        agentId: 'my-agent',
      }}
    >
      <ChatApp />
    </AgnoProvider>
  );
}

function ChatApp() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, isStreaming, error, clearMessages } = useAgnoChat();
  const { sessions, loadSession, fetchSessions } = useAgnoSession();
  const { initialize, state } = useAgnoActions();

  useEffect(() => {
    initialize().then(() => fetchSessions());
  }, [initialize, fetchSessions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    await sendMessage(input);
    setInput('');
  };

  return (
    <div>
      <aside>
        <h2>Sessions</h2>
        <button onClick={() => clearMessages()}>New Chat</button>
        <ul>
          {sessions.map((session) => (
            <li key={session.session_id}>
              <button onClick={() => loadSession(session.session_id)}>
                {session.session_name}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main>
        <div className="messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <strong>{msg.role}:</strong>
              <p>{msg.content}</p>
              {msg.tool_calls && (
                <details>
                  <summary>Tool Calls</summary>
                  <pre>{JSON.stringify(msg.tool_calls, null, 2)}</pre>
                </details>
              )}
            </div>
          ))}
          {error && <div className="error">Error: {error}</div>}
        </div>

        <form onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isStreaming}
          />
          <button type="submit" disabled={isStreaming}>
            {isStreaming ? 'Sending...' : 'Send'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;
```

## TypeScript

All hooks and components are fully typed. Import types as needed:

```typescript
import type {
  AgnoClientConfig,
  ChatMessage,
  SessionEntry,
  AgentDetails,
  TeamDetails,
} from '@antipopp/agno-react';
```

## License

MIT

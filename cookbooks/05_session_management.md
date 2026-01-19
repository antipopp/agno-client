# 5. Session Management

> **Prerequisites**: [01. Getting Started](./01_getting_started.md), [02. Configuration](./02_configuration.md), [03. Sending Messages](./03_sending_messages.md), [04. Handling Responses](./04_handling_responses.md)
> **Packages**: `@antipopp/agno-client`, `@antipopp/agno-react`

## Overview

This cookbook covers how to manage conversation sessions - listing past sessions, restoring conversation history, and deleting sessions.

## SessionEntry Structure

```typescript
interface SessionEntry {
  session_id: string;
  session_name: string;
  created_at: string; // ISO date string
}
```

## Core Client

### Fetching All Sessions

```typescript
import { AgnoClient, SessionEntry } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

async function listSessions() {
  const sessions: SessionEntry[] = await client.fetchSessions();

  console.log('Available sessions:');
  for (const session of sessions) {
    console.log(`- ${session.session_name} (${session.session_id})`);
    console.log(`  Created: ${session.created_at}`);
  }

  return sessions;
}
```

### Loading a Session

```typescript
import { AgnoClient, ChatMessage } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

async function loadSession(sessionId: string) {
  // Load session history - returns messages and updates client state
  const messages: ChatMessage[] = await client.loadSession(sessionId);

  console.log(`Loaded ${messages.length} messages`);

  // Client now has the session context
  // New messages will continue this conversation
  await client.sendMessage('Continue from where we left off');
}

// Listen for session events
client.on('session:loaded', (sessionId: string) => {
  console.log('Session loaded:', sessionId);
});
```

### Deleting a Session

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

async function deleteSession(sessionId: string) {
  await client.deleteSession(sessionId);
  console.log('Session deleted:', sessionId);

  // If the deleted session was the current session,
  // messages are automatically cleared
}
```

### Session Events

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

// New session created during a conversation
client.on('session:created', (session) => {
  console.log('New session started:', session.session_name);
  console.log('Session ID:', session.session_id);
});

// Session restored from history
client.on('session:loaded', (sessionId) => {
  console.log('Loaded session:', sessionId);
});

// Track sessions in state
client.on('state:change', (state) => {
  console.log('Total sessions:', state.sessions.length);
});
```

### Getting Current Session Info

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

// After some messages are sent...
await client.sendMessage('Hello');

// Get current session ID from config
const config = client.getConfig();
console.log('Current session:', config.sessionId);

// Get sessions list from state
const state = client.getState();
console.log('All sessions:', state.sessions);
```

## React

### Session List Component

```tsx
import { useAgnoSession } from '@antipopp/agno-react';
import { useEffect } from 'react';

function SessionList() {
  const { sessions, fetchSessions, loadSession, isLoading, error } = useAgnoSession();

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  if (isLoading) {
    return <div>Loading sessions...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="session-list">
      <h3>Past Conversations</h3>

      {sessions.length === 0 ? (
        <p>No previous sessions</p>
      ) : (
        <ul>
          {sessions.map((session) => (
            <li key={session.session_id}>
              <button onClick={() => loadSession(session.session_id)}>
                {session.session_name}
              </button>
              <small>{new Date(session.created_at).toLocaleDateString()}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Session Selector with Current Session Indicator

```tsx
import { useAgnoSession, useAgnoChat } from '@antipopp/agno-react';

function SessionSelector() {
  const { sessions, currentSessionId, loadSession, fetchSessions, isLoading } = useAgnoSession();
  const { clearMessages } = useAgnoChat();

  const handleNewSession = () => {
    clearMessages(); // Clears messages and sessionId
  };

  const handleSelectSession = async (sessionId: string) => {
    if (sessionId === currentSessionId) return;
    await loadSession(sessionId);
  };

  return (
    <div className="session-selector">
      <button onClick={handleNewSession}>
        + New Conversation
      </button>

      <select
        value={currentSessionId || ''}
        onChange={(e) => handleSelectSession(e.target.value)}
        disabled={isLoading}
      >
        <option value="">Select a session...</option>
        {sessions.map((session) => (
          <option key={session.session_id} value={session.session_id}>
            {session.session_name}
            {session.session_id === currentSessionId && ' (current)'}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### Delete Session with Confirmation

```tsx
import { useAgnoSession, useAgnoClient } from '@antipopp/agno-react';

function SessionManager() {
  const client = useAgnoClient();
  const { sessions, currentSessionId, fetchSessions } = useAgnoSession();

  const handleDelete = async (sessionId: string) => {
    const session = sessions.find(s => s.session_id === sessionId);
    const confirmed = window.confirm(
      `Delete "${session?.session_name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await client.deleteSession(sessionId);
      // Sessions list is automatically updated via state:change event
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  return (
    <div className="session-manager">
      {sessions.map((session) => (
        <div key={session.session_id} className="session-item">
          <span>{session.session_name}</span>
          <button
            onClick={() => handleDelete(session.session_id)}
            disabled={session.session_id === currentSessionId}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Complete Session Sidebar

```tsx
import { useAgnoSession, useAgnoChat } from '@antipopp/agno-react';
import { useEffect, useState } from 'react';

function SessionSidebar() {
  const {
    sessions,
    currentSessionId,
    loadSession,
    fetchSessions,
    isLoading,
    error
  } = useAgnoSession();
  const { clearMessages, isStreaming } = useAgnoChat();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const filteredSessions = sessions.filter(s =>
    s.session_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNewChat = () => {
    clearMessages();
  };

  const handleLoadSession = async (sessionId: string) => {
    if (isStreaming) return; // Don't switch while streaming
    await loadSession(sessionId);
  };

  return (
    <aside className="session-sidebar">
      <button
        onClick={handleNewChat}
        disabled={isStreaming}
        className="new-chat-btn"
      >
        + New Chat
      </button>

      <input
        type="search"
        placeholder="Search sessions..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {isLoading && <div className="loading">Loading...</div>}
      {error && <div className="error">{error}</div>}

      <ul className="session-list">
        {filteredSessions.map((session) => (
          <li
            key={session.session_id}
            className={session.session_id === currentSessionId ? 'active' : ''}
          >
            <button
              onClick={() => handleLoadSession(session.session_id)}
              disabled={isStreaming}
            >
              <span className="name">{session.session_name}</span>
              <span className="date">
                {new Date(session.created_at).toLocaleDateString()}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {filteredSessions.length === 0 && !isLoading && (
        <p className="empty">No sessions found</p>
      )}
    </aside>
  );
}
```

## Key Points

- **fetchSessions()** retrieves all sessions for the current agent/team
- **loadSession(sessionId)** restores conversation history and updates client state
- **deleteSession(sessionId)** removes a session; clears messages if it was current
- Sessions are automatically created when you send the first message
- The `session:created` event fires when a new session starts
- In React, `useAgnoSession()` provides reactive `sessions` and `currentSessionId`

## Next Steps

Continue to [06. React Basics](./06_react_basics.md) for a deeper dive into the React integration patterns.

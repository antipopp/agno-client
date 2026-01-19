# 12. State and Events

> **Prerequisites**: [01-05 Getting Started through Session Management](./01_getting_started.md)
> **Packages**: `@antipopp/agno-client`, `@antipopp/agno-react`

## Overview

This cookbook provides a comprehensive reference for the client's state management and event system. Understanding these is essential for building reactive applications.

## ClientState Structure

```typescript
interface ClientState {
  isStreaming: boolean;          // True while receiving a response
  isRefreshing: boolean;         // True while refreshing session data
  errorMessage?: string;         // Last error message
  isEndpointActive: boolean;     // True if endpoint health check passed
  agents: AgentDetails[];        // Available agents
  teams: TeamDetails[];          // Available teams
  sessions: SessionEntry[];      // Available sessions
  isPaused: boolean;             // True if run is paused (HITL)
  pausedRunId?: string;          // ID of the paused run
  toolsAwaitingExecution?: ToolCall[]; // Tools waiting for execution
}
```

## Core Client

### Reading State

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

// Get current state snapshot
const state = client.getState();

console.log('Streaming:', state.isStreaming);
console.log('Endpoint active:', state.isEndpointActive);
console.log('Available agents:', state.agents.length);
console.log('Sessions:', state.sessions.length);
console.log('Paused:', state.isPaused);

// Get configuration
const config = client.getConfig();
console.log('Current endpoint:', config.endpoint);
console.log('Mode:', config.mode);
console.log('Session ID:', config.sessionId);

// Get messages
const messages = client.getMessages();
console.log('Message count:', messages.length);
```

### Listening to State Changes

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

// Single listener for all state changes
client.on('state:change', (state) => {
  console.log('State updated:', state);
});
```

## Event Reference

### Message Events

```typescript
// Emitted on every message update during streaming
client.on('message:update', (messages: ChatMessage[]) => {
  const lastMessage = messages[messages.length - 1];
  console.log('Latest content:', lastMessage.content);
});

// Emitted when streaming completes
client.on('message:complete', (messages: ChatMessage[]) => {
  console.log('Final message count:', messages.length);
});

// Emitted after session refresh replaces messages
client.on('message:refreshed', (messages: ChatMessage[]) => {
  console.log('Messages refreshed from server');
});

// Emitted on error
client.on('message:error', (errorMessage: string) => {
  console.error('Message error:', errorMessage);
});
```

### Stream Events

```typescript
// Emitted when streaming begins
client.on('stream:start', () => {
  console.log('Streaming started');
});

// Emitted when streaming ends (success or error)
client.on('stream:end', () => {
  console.log('Streaming ended');
});
```

### Session Events

```typescript
// Emitted when a session is loaded
client.on('session:loaded', (sessionId: string) => {
  console.log('Loaded session:', sessionId);
});

// Emitted when a new session is created
client.on('session:created', (session: SessionEntry) => {
  console.log('New session:', session.session_name);
});
```

### Run Events (HITL)

```typescript
// Emitted when run pauses for tool execution
client.on('run:paused', (event: {
  runId?: string;
  sessionId?: string;
  tools: ToolCall[];
}) => {
  console.log('Run paused, awaiting tools:', event.tools);
});

// Emitted when paused run continues
client.on('run:continued', (event: { runId?: string }) => {
  console.log('Run continued:', event.runId);
});
```

### Configuration Events

```typescript
// Emitted when configuration changes
client.on('config:change', (config: AgnoClientConfig) => {
  console.log('Config updated:', config);
});
```

### UI Events (Generative UI)

```typescript
// Emitted when UI component should be rendered
client.on('ui:render', (event: { tools: ToolCall[]; runId?: string }) => {
  console.log('UI render requested for tools:', event.tools);
});

// Emitted when UI component data updates (streaming)
client.on('ui:update', (event: any) => {
  console.log('UI update:', event);
});

// Emitted when UI component is finalized
client.on('ui:complete', (event: any) => {
  console.log('UI complete:', event);
});
```

## Event Patterns

### One-Time Listener

```typescript
// Listen once, then auto-remove
const handler = (messages) => {
  console.log('First message update received');
  client.off('message:update', handler);
};
client.on('message:update', handler);
```

### Conditional Event Handling

```typescript
client.on('state:change', (state) => {
  // Handle streaming state change
  if (state.isStreaming) {
    showLoadingIndicator();
  } else {
    hideLoadingIndicator();
  }

  // Handle pause state
  if (state.isPaused && state.toolsAwaitingExecution) {
    showToolApprovalDialog(state.toolsAwaitingExecution);
  }

  // Handle errors
  if (state.errorMessage) {
    showErrorNotification(state.errorMessage);
  }
});
```

### Event Aggregation

```typescript
// Track multiple events for logging
const events: Array<{ type: string; timestamp: number; data: any }> = [];

const logEvent = (type: string, data: any) => {
  events.push({ type, timestamp: Date.now(), data });
};

client.on('stream:start', () => logEvent('stream:start', null));
client.on('stream:end', () => logEvent('stream:end', null));
client.on('message:update', (m) => logEvent('message:update', { count: m.length }));
client.on('message:error', (e) => logEvent('message:error', { error: e }));
client.on('run:paused', (e) => logEvent('run:paused', e));

// Export event log
function exportEvents() {
  return JSON.stringify(events, null, 2);
}
```

## React Integration

### Using State in Hooks

```tsx
import { useAgnoChat, useAgnoClient } from '@antipopp/agno-react';
import { useEffect, useState } from 'react';

function StatusIndicator() {
  const { state, isStreaming, isPaused, error } = useAgnoChat();

  return (
    <div className="status">
      {isStreaming && <span className="streaming">Typing...</span>}
      {isPaused && <span className="paused">Waiting for approval...</span>}
      {state.isRefreshing && <span className="refreshing">Loading...</span>}
      {error && <span className="error">{error}</span>}
      {state.isEndpointActive ? (
        <span className="online">Connected</span>
      ) : (
        <span className="offline">Disconnected</span>
      )}
    </div>
  );
}
```

### Custom Event Hooks

```tsx
import { useAgnoClient } from '@antipopp/agno-react';
import { useEffect, useState } from 'react';

// Custom hook for streaming progress
function useStreamingProgress() {
  const client = useAgnoClient();
  const [progress, setProgress] = useState<{
    isActive: boolean;
    startTime?: number;
    messageCount: number;
  }>({ isActive: false, messageCount: 0 });

  useEffect(() => {
    const handleStart = () => {
      setProgress({ isActive: true, startTime: Date.now(), messageCount: 0 });
    };

    const handleUpdate = (messages: ChatMessage[]) => {
      setProgress(prev => ({ ...prev, messageCount: messages.length }));
    };

    const handleEnd = () => {
      setProgress(prev => ({ ...prev, isActive: false }));
    };

    client.on('stream:start', handleStart);
    client.on('message:update', handleUpdate);
    client.on('stream:end', handleEnd);

    return () => {
      client.off('stream:start', handleStart);
      client.off('message:update', handleUpdate);
      client.off('stream:end', handleEnd);
    };
  }, [client]);

  return progress;
}
```

### Event-Driven UI Updates

```tsx
import { useAgnoClient } from '@antipopp/agno-react';
import { useEffect } from 'react';

function NotificationHandler() {
  const client = useAgnoClient();

  useEffect(() => {
    const handleError = (error: string) => {
      toast.error(error);
    };

    const handleSessionCreated = (session: SessionEntry) => {
      toast.success(`Started: ${session.session_name}`);
    };

    const handlePaused = () => {
      toast.info('Action required - please review pending tools');
    };

    client.on('message:error', handleError);
    client.on('session:created', handleSessionCreated);
    client.on('run:paused', handlePaused);

    return () => {
      client.off('message:error', handleError);
      client.off('session:created', handleSessionCreated);
      client.off('run:paused', handlePaused);
    };
  }, [client]);

  return null; // Renders nothing, just handles events
}
```

## State Machine Pattern

Model complex state transitions:

```typescript
type ChatState =
  | 'idle'
  | 'streaming'
  | 'paused'
  | 'error'
  | 'loading';

function getChatState(clientState: ClientState): ChatState {
  if (clientState.errorMessage) return 'error';
  if (clientState.isPaused) return 'paused';
  if (clientState.isStreaming) return 'streaming';
  if (clientState.isRefreshing) return 'loading';
  return 'idle';
}

// React hook
function useChatState() {
  const { state } = useAgnoChat();
  return getChatState(state);
}

// Usage
function ChatUI() {
  const chatState = useChatState();

  switch (chatState) {
    case 'streaming':
      return <StreamingIndicator />;
    case 'paused':
      return <ToolApprovalDialog />;
    case 'error':
      return <ErrorDisplay />;
    case 'loading':
      return <LoadingSpinner />;
    default:
      return <ChatInput />;
  }
}
```

## Key Points

- **getState()** returns a snapshot of current state
- **getConfig()** returns current configuration
- **getMessages()** returns current message list
- Events are emitted in real-time as state changes
- Use `on()` to subscribe and `off()` to unsubscribe
- In React, hooks automatically subscribe to relevant events
- `state:change` is the catch-all event for any state change
- Clean up event listeners in `useEffect` return functions

## Next Steps

Continue to [13. Custom Params & Headers](./13_custom_params_headers.md) to learn about customizing API requests.

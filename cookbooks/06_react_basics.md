# 6. React Basics

> **Prerequisites**: [01-05 Getting Started through Session Management](./01_getting_started.md)
> **Packages**: `@antipopp/agno-react`

## Overview

This cookbook provides a deep dive into the React integration, covering the provider pattern, all available hooks, and how they work together.

## Architecture Overview

```
<AgnoProvider config={...}>
  └── AgnoContext (provides AgnoClient instance)
      └── useAgnoClient()        # Direct client access
          ├── useAgnoChat()      # Message state & sending
          ├── useAgnoSession()   # Session management
          ├── useAgnoActions()   # Initialization & config
          └── useAgnoToolExecution()  # HITL tool execution
```

## AgnoProvider

The provider creates a single `AgnoClient` instance and makes it available to all child components.

```tsx
import { AgnoProvider } from '@antipopp/agno-react';

function App() {
  return (
    <AgnoProvider
      config={{
        endpoint: 'http://localhost:7777',
        mode: 'agent',
        agentId: 'my-agent',
        userId: 'user-123',
      }}
    >
      <YourApp />
    </AgnoProvider>
  );
}
```

### Dynamic Config Updates

When the config prop changes, updates are automatically synced to the client:

```tsx
import { AgnoProvider } from '@antipopp/agno-react';
import { useState, useEffect } from 'react';

function App() {
  const [user, setUser] = useState(null);

  // Config updates are synced automatically
  return (
    <AgnoProvider
      config={{
        endpoint: 'http://localhost:7777',
        mode: 'agent',
        agentId: 'support-agent',
        userId: user?.id, // Updates when user logs in
      }}
    >
      <Auth onLogin={setUser} />
      <Chat />
    </AgnoProvider>
  );
}
```

## useAgnoClient

Direct access to the underlying `AgnoClient` instance. Use this when you need low-level control or to listen to events directly.

```tsx
import { useAgnoClient } from '@antipopp/agno-react';
import { useEffect } from 'react';

function DebugPanel() {
  const client = useAgnoClient();

  useEffect(() => {
    // Listen to all state changes
    const handleStateChange = (state) => {
      console.log('State changed:', state);
    };

    client.on('state:change', handleStateChange);
    return () => client.off('state:change', handleStateChange);
  }, [client]);

  const handleExport = () => {
    const messages = client.getMessages();
    const config = client.getConfig();
    console.log({ messages, config });
  };

  return (
    <div>
      <button onClick={handleExport}>Export State</button>
    </div>
  );
}
```

## useAgnoChat

The primary hook for chat interactions. Provides message state and sending capabilities.

```tsx
import { useAgnoChat } from '@antipopp/agno-react';

function ChatComponent() {
  const {
    messages,       // ChatMessage[] - all messages in the conversation
    sendMessage,    // (message: string | FormData, options?) => Promise<void>
    clearMessages,  // () => void - clear all messages and start fresh
    isStreaming,    // boolean - true while receiving a response
    isRefreshing,   // boolean - true while refreshing session data
    isPaused,       // boolean - true if run is paused (HITL)
    error,          // string | undefined - last error message
    state,          // ClientState - full client state object
  } = useAgnoChat();

  return (
    <div>
      {/* Message list */}
      {messages.map((msg, i) => (
        <div key={i}>{msg.role}: {msg.content}</div>
      ))}

      {/* Loading states */}
      {isStreaming && <div>Typing...</div>}
      {isRefreshing && <div>Loading...</div>}
      {isPaused && <div>Waiting for tool execution...</div>}

      {/* Error display */}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

## useAgnoSession

Manages conversation sessions - listing, loading, and tracking the current session.

```tsx
import { useAgnoSession } from '@antipopp/agno-react';
import { useEffect } from 'react';

function SessionPanel() {
  const {
    sessions,          // SessionEntry[] - all sessions for current agent/team
    currentSessionId,  // string | undefined - active session ID
    loadSession,       // (sessionId: string, options?) => Promise<ChatMessage[]>
    fetchSessions,     // (options?) => Promise<SessionEntry[]>
    isLoading,         // boolean - true during fetch/load operations
    error,             // string | undefined - last error message
  } = useAgnoSession();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <div>
      <h3>Sessions ({sessions.length})</h3>
      {sessions.map((session) => (
        <button
          key={session.session_id}
          onClick={() => loadSession(session.session_id)}
          disabled={isLoading}
          className={session.session_id === currentSessionId ? 'active' : ''}
        >
          {session.session_name}
        </button>
      ))}
    </div>
  );
}
```

## useAgnoActions

Initialization and configuration actions.

```tsx
import { useAgnoActions } from '@antipopp/agno-react';
import { useEffect, useState } from 'react';

function AppInitializer({ children }) {
  const {
    initialize,      // (options?) => Promise<{ agents, teams }>
    checkStatus,     // (options?) => Promise<boolean>
    fetchAgents,     // (options?) => Promise<AgentDetails[]>
    fetchTeams,      // (options?) => Promise<TeamDetails[]>
    updateConfig,    // (updates: Partial<AgnoClientConfig>) => void
    isInitializing,  // boolean - true during initialize()
    error,           // string | undefined - last error message
  } = useAgnoActions();

  const [ready, setReady] = useState(false);

  useEffect(() => {
    initialize().then(({ agents, teams }) => {
      console.log('Available:', agents.length, 'agents,', teams.length, 'teams');
      setReady(true);
    });
  }, [initialize]);

  if (isInitializing) {
    return <div>Connecting...</div>;
  }

  if (error) {
    return <div>Connection error: {error}</div>;
  }

  if (!ready) {
    return null;
  }

  return children;
}
```

## useAgnoToolExecution

Handles frontend tool execution for Human-in-the-Loop (HITL) scenarios. See [08. Tool Execution Basics](./08_tool_execution_basics.md) for detailed coverage.

```tsx
import { useAgnoToolExecution } from '@antipopp/agno-react';

function ToolExecutor() {
  const {
    isPaused,           // boolean - run is paused waiting for tools
    isExecuting,        // boolean - tools are being executed
    pendingTools,       // ToolCall[] - tools awaiting execution
    executeAndContinue, // () => Promise<void> - execute and continue
    executeTools,       // (tools) => Promise<ToolCall[]> - execute without continuing
    continueWithResults,// (tools, options?) => Promise<void> - continue with results
    executionError,     // string | undefined - last execution error
  } = useAgnoToolExecution({
    // Tool handlers
    search_web: async (args) => {
      const results = await searchAPI(args.query);
      return { success: true, results };
    },
  });

  // ...
}
```

## Combining Hooks

Hooks can be combined in a single component:

```tsx
import {
  useAgnoChat,
  useAgnoSession,
  useAgnoActions,
  useAgnoToolExecution
} from '@antipopp/agno-react';

function ChatApp() {
  const { messages, sendMessage, isStreaming, clearMessages } = useAgnoChat();
  const { sessions, loadSession, fetchSessions } = useAgnoSession();
  const { initialize, updateConfig, isInitializing } = useAgnoActions();
  const { isPaused, pendingTools } = useAgnoToolExecution();

  // Combine state and functionality as needed
  const isLoading = isInitializing || isStreaming;

  return (
    <div className="chat-app">
      <Sidebar
        sessions={sessions}
        onLoadSession={loadSession}
        onNewChat={clearMessages}
      />
      <Main
        messages={messages}
        onSend={sendMessage}
        disabled={isLoading}
        isPaused={isPaused}
        pendingTools={pendingTools}
      />
    </div>
  );
}
```

## Component Composition Pattern

Split functionality across focused components:

```tsx
// App.tsx
function App() {
  return (
    <AgnoProvider config={config}>
      <AppInitializer>
        <div className="app-layout">
          <SessionSidebar />
          <ChatArea />
        </div>
      </AppInitializer>
    </AgnoProvider>
  );
}

// SessionSidebar.tsx - Only uses session hook
function SessionSidebar() {
  const { sessions, loadSession, currentSessionId } = useAgnoSession();
  const { clearMessages } = useAgnoChat();
  // ...
}

// ChatArea.tsx - Only uses chat hook
function ChatArea() {
  const { messages, sendMessage, isStreaming } = useAgnoChat();
  // ...
}

// ToolHandler.tsx - Only uses tool execution hook
function ToolHandler() {
  const { isPaused, pendingTools, executeAndContinue } = useAgnoToolExecution(handlers);
  // ...
}
```

## Key Points

- **AgnoProvider** must wrap all components that use Agno hooks
- **useAgnoClient()** gives direct access to the client for advanced use cases
- **useAgnoChat()** is the main hook for message state and sending
- **useAgnoSession()** manages session listing and loading
- **useAgnoActions()** handles initialization and configuration
- **useAgnoToolExecution()** enables frontend tool execution (HITL)
- Hooks subscribe to client events internally - state is always in sync
- Split functionality across focused components for cleaner code

## Next Steps

Continue to [07. React Chat UI](./07_react_chat_ui.md) to build a complete chat interface.

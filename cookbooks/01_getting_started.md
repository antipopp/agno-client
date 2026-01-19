# 1. Getting Started

> **Prerequisites**: None
> **Packages**: `@antipopp/agno-client`, `@antipopp/agno-react`

## Overview

This cookbook shows you how to install the Agno client libraries and send your first message to an agent. You'll learn the minimal setup required to get a working chat interaction.

## Installation

```bash
# Using npm
npm install @antipopp/agno-client @antipopp/agno-react

# Using pnpm
pnpm add @antipopp/agno-client @antipopp/agno-react

# Using yarn
yarn add @antipopp/agno-client @antipopp/agno-react
```

## Core Client

### Minimal Setup

```typescript
import { AgnoClient } from '@antipopp/agno-client';

// Create a client with minimal configuration
const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent-id',
});

// Send your first message
async function sendFirstMessage() {
  // Listen for message updates (streaming)
  client.on('message:update', (messages) => {
    console.log('Messages:', messages);
  });

  // Send a message
  await client.sendMessage('Hello, agent!');

  // Get all messages after completion
  const messages = client.getMessages();
  console.log('Final messages:', messages);
}

sendFirstMessage();
```

### Initialize with Auto-Discovery

If you don't know your agent ID, initialize the client to discover available agents:

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
});

async function discoverAndChat() {
  // Initialize fetches available agents/teams and auto-selects the first one
  const { agents, teams } = await client.initialize();

  console.log('Available agents:', agents.map(a => a.name));
  console.log('Available teams:', teams.map(t => t.name));

  // Now send a message (first agent is auto-selected)
  await client.sendMessage('Hello!');
}

discoverAndChat();
```

## React

### Minimal React Setup

```tsx
import { AgnoProvider, useAgnoChat, useAgnoActions } from '@antipopp/agno-react';

// Wrap your app with the provider
function App() {
  return (
    <AgnoProvider
      config={{
        endpoint: 'http://localhost:7777',
        mode: 'agent',
        agentId: 'my-agent-id',
      }}
    >
      <Chat />
    </AgnoProvider>
  );
}

// Simple chat component
function Chat() {
  const { messages, sendMessage, isStreaming } = useAgnoChat();
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const message = input;
    setInput('');
    await sendMessage(message);
  };

  return (
    <div>
      {/* Message list */}
      <div>
        {messages.map((msg, i) => (
          <div key={i}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
      </div>

      {/* Input form */}
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
    </div>
  );
}
```

### React with Auto-Discovery

```tsx
import { AgnoProvider, useAgnoChat, useAgnoActions } from '@antipopp/agno-react';
import { useEffect, useState } from 'react';

function App() {
  return (
    <AgnoProvider config={{ endpoint: 'http://localhost:7777' }}>
      <InitializedChat />
    </AgnoProvider>
  );
}

function InitializedChat() {
  const { initialize, isInitializing } = useAgnoActions();
  const { messages, sendMessage, isStreaming } = useAgnoChat();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initialize().then(() => setReady(true));
  }, [initialize]);

  if (isInitializing || !ready) {
    return <div>Connecting to agent...</div>;
  }

  // ... rest of chat UI
}
```

## Key Points

- **AgnoClient** is the core class that manages state, streaming, and API communication
- **AgnoProvider** creates a single client instance and makes it available to all child components
- The client emits events (`message:update`, `stream:start`, `stream:end`) for real-time updates
- **initialize()** discovers available agents/teams and auto-selects the first one
- Messages are streamed in real-time - no need to poll for updates

## Next Steps

Continue to [02. Configuration](./02_configuration.md) to learn about all available configuration options.

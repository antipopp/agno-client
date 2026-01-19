# 2. Configuration

> **Prerequisites**: [01. Getting Started](./01_getting_started.md)
> **Packages**: `@antipopp/agno-client`, `@antipopp/agno-react`

## Overview

This cookbook covers all configuration options for the Agno client. You'll learn how to configure endpoints, authentication, agent/team mode, user tracking, and more.

## AgnoClientConfig Reference

```typescript
interface AgnoClientConfig {
  endpoint: string;           // Required: Base API URL
  authToken?: string;         // Optional: Bearer token for authentication
  mode?: 'agent' | 'team';    // Optional: Mode of operation
  agentId?: string;           // Required if mode is 'agent'
  teamId?: string;            // Required if mode is 'team'
  dbId?: string;              // Optional: Database ID for multi-tenant setups
  sessionId?: string;         // Optional: Resume an existing session
  userId?: string;            // Optional: User ID for session tracking
  headers?: Record<string, string>;  // Optional: Global custom headers
  params?: Record<string, string>;   // Optional: Global query parameters
}
```

## Core Client

### Basic Configuration

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'support-agent',
});
```

### Full Configuration

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'https://api.example.com',
  authToken: 'Bearer your-api-token',
  mode: 'agent',
  agentId: 'support-agent',
  dbId: 'tenant-123',
  userId: 'user-456',
  headers: {
    'X-Custom-Header': 'value',
  },
  params: {
    version: 'v2',
  },
});
```

### Updating Configuration at Runtime

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
});

// Update configuration later
client.updateConfig({
  mode: 'agent',
  agentId: 'new-agent-id',
  userId: 'logged-in-user',
});

// Listen for config changes
client.on('config:change', (config) => {
  console.log('Config updated:', config);
});
```

### Switching Between Agent and Team Mode

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
});

// Start with an agent
client.updateConfig({
  mode: 'agent',
  agentId: 'my-agent',
});

// Switch to a team
client.updateConfig({
  mode: 'team',
  teamId: 'my-team',
});

// Get current configuration
const config = client.getConfig();
console.log('Current mode:', config.mode);
```

### User ID Tracking

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'support-agent',
  userId: 'user-123', // Links sessions to this user
});

// The user ID is automatically included in:
// - POST /agents/{id}/runs (when sending messages)
// - POST /agents/{id}/runs/{runId}/continue (when continuing paused runs)

// Update user ID after login
client.updateConfig({ userId: 'authenticated-user-456' });
```

## React

### Provider Configuration

```tsx
import { AgnoProvider } from '@antipopp/agno-react';

function App() {
  return (
    <AgnoProvider
      config={{
        endpoint: 'http://localhost:7777',
        mode: 'agent',
        agentId: 'support-agent',
        userId: currentUser?.id,
      }}
    >
      <YourApp />
    </AgnoProvider>
  );
}
```

### Dynamic Configuration Updates

```tsx
import { AgnoProvider, useAgnoActions } from '@antipopp/agno-react';
import { useState, useEffect } from 'react';

function App() {
  const [userId, setUserId] = useState<string>();

  // Config changes are automatically synced to the client
  return (
    <AgnoProvider
      config={{
        endpoint: 'http://localhost:7777',
        mode: 'agent',
        agentId: 'support-agent',
        userId: userId,
      }}
    >
      <LoginHandler onLogin={(id) => setUserId(id)} />
      <Chat />
    </AgnoProvider>
  );
}
```

### Using updateConfig Hook

```tsx
import { useAgnoActions } from '@antipopp/agno-react';

function AgentSelector({ agents }: { agents: AgentDetails[] }) {
  const { updateConfig } = useAgnoActions();

  const handleSelectAgent = (agentId: string) => {
    updateConfig({
      mode: 'agent',
      agentId,
    });
  };

  return (
    <select onChange={(e) => handleSelectAgent(e.target.value)}>
      {agents.map((agent) => (
        <option key={agent.id} value={agent.id}>
          {agent.name}
        </option>
      ))}
    </select>
  );
}
```

## Configuration Options Explained

### endpoint

The base URL of your Agno API server. Do not include trailing slashes or path segments.

```typescript
// Correct
endpoint: 'http://localhost:7777'
endpoint: 'https://api.myapp.com'

// Incorrect
endpoint: 'http://localhost:7777/'
endpoint: 'http://localhost:7777/v1'
```

### authToken

Bearer token for authenticated requests. The client automatically adds `Authorization: Bearer {token}` header.

```typescript
authToken: 'your-jwt-token'
```

### mode

Determines whether you're interacting with a single agent or a team of agents.

- `'agent'`: Requires `agentId` to be set
- `'team'`: Requires `teamId` to be set

### dbId

Database identifier for multi-tenant Agno deployments. Used when your Agno setup supports multiple isolated databases.

### sessionId

Pre-set a session ID to resume an existing conversation. Typically you'll let the client manage sessions automatically.

### userId

Links sessions to a specific user. Useful for:
- Tracking user-specific conversation history
- Multi-user applications
- Analytics and monitoring

### headers

Global custom headers included in all API requests. Useful for custom authentication schemes or tracking.

### params

Global query parameters appended to all API requests. Useful for API versioning or feature flags.

## Key Points

- Configuration can be set at initialization or updated at runtime with `updateConfig()`
- The client emits `config:change` events when configuration changes
- In React, pass config to `AgnoProvider` - changes are automatically synced
- Use `mode` with `agentId` or `teamId` to specify what you're chatting with
- `userId` is automatically included in API requests for user tracking

## Next Steps

Continue to [03. Sending Messages](./03_sending_messages.md) to learn about sending messages and handling streaming.

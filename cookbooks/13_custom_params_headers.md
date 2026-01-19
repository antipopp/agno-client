# 13. Custom Params & Headers

> **Prerequisites**: [01-05 Getting Started through Session Management](./01_getting_started.md)
> **Packages**: `@antipopp/agno-client`, `@antipopp/agno-react`

## Overview

This cookbook covers how to add custom query parameters and HTTP headers to API requests. This is useful for API versioning, feature flags, authentication, tracking, and passing custom data to your Agno backend.

## Configuration Options

```typescript
interface AgnoClientConfig {
  // ... other options
  headers?: Record<string, string>;  // Global custom headers
  params?: Record<string, string>;   // Global query parameters
}

// Per-request options
interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
}
```

## Core Client

### Global Headers

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
  headers: {
    'X-Custom-Header': 'custom-value',
    'X-Request-Source': 'web-app',
    'X-Client-Version': '1.0.0',
  },
});

// All requests now include these headers
await client.sendMessage('Hello');
```

### Global Query Parameters

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
  params: {
    api_version: 'v2',
    locale: 'en-US',
    environment: 'production',
  },
});

// Requests go to: /agents/{id}/runs?api_version=v2&locale=en-US&environment=production
await client.sendMessage('Hello');
```

### Per-Request Overrides

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
  params: { api_version: 'v2' }, // Global
});

// Override or add params for this request only
await client.sendMessage('Hello', {
  headers: {
    'X-Request-ID': crypto.randomUUID(),
  },
  params: {
    debug: 'true',        // Additional param
    api_version: 'v3',    // Overrides global 'v2'
  },
});

// Next request uses global params again
await client.sendMessage('Next message'); // api_version=v2
```

### Updating Configuration at Runtime

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

// Update headers after initialization
client.updateConfig({
  headers: {
    'Authorization': 'Bearer new-token',
    'X-Tenant-ID': 'tenant-123',
  },
});

// Update params
client.updateConfig({
  params: {
    feature_flag: 'new-feature-enabled',
  },
});
```

### All Methods Support Options

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

// sendMessage
await client.sendMessage('Hello', {
  params: { debug: 'true' },
  headers: { 'X-Request-ID': '123' },
});

// continueRun (HITL)
await client.continueRun(tools, {
  params: { trace_id: 'abc' },
});

// loadSession
await client.loadSession('session-id', {
  params: { include_metadata: 'true' },
});

// fetchSessions
await client.fetchSessions({
  params: { page: '1', limit: '50' },
});

// deleteSession
await client.deleteSession('session-id', {
  params: { permanent: 'true' },
});

// checkStatus
await client.checkStatus({
  params: { detailed: 'true' },
});

// initialize
await client.initialize({
  params: { include_inactive: 'true' },
});
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
        agentId: 'my-agent',
        headers: {
          'X-App-Name': 'MyApp',
          'X-Client-Version': '2.0.0',
        },
        params: {
          api_version: 'v2',
          environment: process.env.NODE_ENV,
        },
      }}
    >
      <Chat />
    </AgnoProvider>
  );
}
```

### Dynamic Config Updates

```tsx
import { AgnoProvider, useAgnoActions } from '@antipopp/agno-react';
import { useState, useEffect } from 'react';

function App() {
  const [authToken, setAuthToken] = useState<string>();

  // Headers update when auth changes
  return (
    <AgnoProvider
      config={{
        endpoint: 'http://localhost:7777',
        mode: 'agent',
        agentId: 'my-agent',
        authToken: authToken, // Uses Authorization header
        headers: authToken ? {
          'X-Authenticated': 'true',
        } : undefined,
      }}
    >
      <AuthHandler onToken={setAuthToken} />
      <Chat />
    </AgnoProvider>
  );
}
```

### Per-Request Options in Hooks

```tsx
import { useAgnoChat, useAgnoSession, useAgnoActions } from '@antipopp/agno-react';

function Chat() {
  const { sendMessage } = useAgnoChat();
  const { loadSession, fetchSessions } = useAgnoSession();
  const { initialize } = useAgnoActions();

  // Send with custom params
  const handleSend = async (message: string) => {
    await sendMessage(message, {
      headers: {
        'X-Request-ID': crypto.randomUUID(),
      },
      params: {
        temperature: '0.7',
        max_tokens: '1000',
      },
    });
  };

  // Load session with params
  const handleLoadSession = async (sessionId: string) => {
    await loadSession(sessionId, {
      params: {
        include_tool_results: 'true',
      },
    });
  };

  // Fetch sessions with pagination
  const handleFetchSessions = async () => {
    await fetchSessions({
      params: {
        page: '1',
        per_page: '20',
        sort: 'created_at:desc',
      },
    });
  };

  // Initialize with params
  useEffect(() => {
    initialize({
      params: {
        include_inactive_agents: 'true',
      },
    });
  }, [initialize]);

  return <ChatUI onSend={handleSend} />;
}
```

## Common Use Cases

### API Versioning

```typescript
const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
  params: {
    api_version: 'v2',
  },
});
```

### Feature Flags

```typescript
const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
  params: {
    enable_streaming: 'true',
    enable_tool_execution: 'true',
    beta_features: 'true',
  },
});
```

### Multi-Tenant Headers

```typescript
const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
  headers: {
    'X-Tenant-ID': 'tenant-123',
    'X-Workspace-ID': 'workspace-456',
  },
});
```

### Request Tracing

```typescript
const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

// Add trace ID to each request
async function sendTracedMessage(message: string) {
  await client.sendMessage(message, {
    headers: {
      'X-Request-ID': crypto.randomUUID(),
      'X-Correlation-ID': getCorrelationId(),
      'X-Trace-ID': getTraceId(),
    },
  });
}
```

### Debugging

```typescript
const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

// Enable debug mode for specific requests
await client.sendMessage('Test message', {
  params: {
    debug: 'true',
    verbose: 'true',
    log_level: 'debug',
  },
});
```

### Localization

```typescript
const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
  params: {
    locale: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
});
```

## Merge Behavior

Parameters and headers merge with the following precedence (highest to lowest):

1. Per-request options
2. Global config options
3. Built-in defaults (e.g., `Authorization` from `authToken`)

```typescript
const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  authToken: 'global-token', // Sets Authorization header
  headers: {
    'X-Global': 'value',
  },
  params: {
    version: 'v1',
    debug: 'false',
  },
});

await client.sendMessage('Hello', {
  headers: {
    'X-Request': 'specific', // Added
  },
  params: {
    debug: 'true',           // Overrides global 'false'
    trace: 'abc',            // Added
  },
});

// Final headers: Authorization, X-Global, X-Request
// Final params: version=v1, debug=true, trace=abc
```

## Key Points

- Global `headers` and `params` are set in `AgnoClientConfig`
- Per-request options override globals with the same key
- All client methods accept `{ headers?, params? }` options
- Use `updateConfig()` to change global settings at runtime
- In React, pass global config via `AgnoProvider`
- Hooks forward options to underlying client methods
- `authToken` automatically sets `Authorization` header

## Next Steps

Continue to [14. Media Handling](./14_media_handling.md) to learn about working with images, video, and audio.

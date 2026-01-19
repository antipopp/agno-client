# 16. Production Tips

> **Prerequisites**: All previous cookbooks
> **Packages**: `@antipopp/agno-client`, `@antipopp/agno-react`

## Overview

This cookbook covers best practices for deploying Agno client applications to production, including security, performance, monitoring, and operational considerations.

## Security

### Token Management

```typescript
// DON'T: Hardcode tokens
const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  authToken: 'hardcoded-token-bad', // Never do this
});

// DO: Use environment variables
const client = new AgnoClient({
  endpoint: process.env.NEXT_PUBLIC_AGNO_ENDPOINT!,
  authToken: process.env.AGNO_AUTH_TOKEN, // Server-side only
});

// DO: Fetch token dynamically
async function getSecureClient() {
  const tokenResponse = await fetch('/api/agno-token');
  const { token } = await tokenResponse.json();

  return new AgnoClient({
    endpoint: process.env.NEXT_PUBLIC_AGNO_ENDPOINT!,
    authToken: token,
  });
}
```

### Token Refresh Pattern

```tsx
import { AgnoProvider, useAgnoClient } from '@antipopp/agno-react';
import { useEffect, useState } from 'react';

function TokenRefreshProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState({
    endpoint: process.env.NEXT_PUBLIC_AGNO_ENDPOINT!,
    authToken: undefined as string | undefined,
  });

  // Fetch initial token
  useEffect(() => {
    fetchToken().then((token) => {
      setConfig((prev) => ({ ...prev, authToken: token }));
    });
  }, []);

  // Refresh token periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      const newToken = await fetchToken();
      setConfig((prev) => ({ ...prev, authToken: newToken }));
    }, 30 * 60 * 1000); // Every 30 minutes

    return () => clearInterval(interval);
  }, []);

  if (!config.authToken) {
    return <div>Authenticating...</div>;
  }

  return (
    <AgnoProvider config={config}>
      {children}
    </AgnoProvider>
  );
}
```

### Input Validation

```typescript
// Validate user input before sending
function sanitizeInput(input: string): string {
  // Remove potentially dangerous content
  return input
    .trim()
    .slice(0, 10000) // Limit length
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control chars
}

async function sendSafeMessage(client: AgnoClient, userInput: string) {
  const sanitized = sanitizeInput(userInput);

  if (!sanitized) {
    throw new Error('Invalid input');
  }

  await client.sendMessage(sanitized);
}
```

### HITL Tool Handler Security

```typescript
const handlers = {
  // DON'T: Execute arbitrary code
  run_code: async (args) => {
    eval(args.code); // Never do this!
  },

  // DO: Whitelist allowed operations
  navigate: async (args) => {
    const allowedUrls = ['/dashboard', '/settings', '/profile'];
    if (!allowedUrls.includes(args.path)) {
      return { error: 'Navigation not allowed' };
    }
    window.location.href = args.path;
    return { success: true };
  },

  // DO: Validate arguments
  fetch_data: async (args) => {
    const allowedEndpoints = ['users', 'products', 'orders'];
    if (!allowedEndpoints.includes(args.resource)) {
      return { error: 'Invalid resource' };
    }
    // Safe to proceed
    const data = await api.get(`/${args.resource}`);
    return data;
  },
};
```

## Performance

### Lazy Loading

```tsx
import { lazy, Suspense } from 'react';

// Lazy load heavy components
const GenerativeUIRenderer = lazy(() =>
  import('@antipopp/agno-react').then(m => ({ default: m.GenerativeUIRenderer }))
);

function ToolCallDisplay({ toolCall }: { toolCall: ToolCall }) {
  if ((toolCall as any).ui_component) {
    return (
      <Suspense fallback={<div>Loading visualization...</div>}>
        <GenerativeUIRenderer spec={(toolCall as any).ui_component} />
      </Suspense>
    );
  }

  return <pre>{toolCall.content}</pre>;
}
```

### Message Virtualization

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAgnoChat } from '@antipopp/agno-react';
import { useRef } from 'react';

function VirtualizedMessageList() {
  const { messages } = useAgnoChat();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated row height
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <Message message={messages[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Debounced Typing Indicator

```tsx
import { useAgnoChat } from '@antipopp/agno-react';
import { useMemo } from 'react';
import { debounce } from 'lodash';

function ChatInput() {
  const { sendMessage, isStreaming } = useAgnoChat();
  const [input, setInput] = useState('');

  // Debounce typing events for analytics
  const trackTyping = useMemo(
    () => debounce(() => analytics.track('user_typing'), 1000),
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    trackTyping();
  };

  // Clean up on unmount
  useEffect(() => {
    return () => trackTyping.cancel();
  }, [trackTyping]);

  return (
    <input value={input} onChange={handleChange} disabled={isStreaming} />
  );
}
```

### Memory Management

```typescript
import { AgnoClient } from '@antipopp/agno-client';

// Clean up resources when done
function cleanup(client: AgnoClient) {
  // Remove all event listeners
  client.removeAllListeners();

  // Clear messages if no longer needed
  client.clearMessages();
}

// React cleanup
function Chat() {
  const client = useAgnoClient();

  useEffect(() => {
    return () => {
      // Clear listeners on unmount
      client.removeAllListeners();
    };
  }, [client]);

  // ...
}
```

## Monitoring

### Error Tracking Integration

```typescript
import * as Sentry from '@sentry/browser';
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: process.env.NEXT_PUBLIC_AGNO_ENDPOINT!,
  mode: 'agent',
  agentId: 'my-agent',
});

// Track errors
client.on('message:error', (errorMessage) => {
  Sentry.captureException(new Error(errorMessage), {
    tags: {
      component: 'agno-client',
      sessionId: client.getConfig().sessionId,
    },
    extra: {
      messageCount: client.getMessages().length,
      state: client.getState(),
    },
  });
});
```

### Analytics Events

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({ /* ... */ });

// Track message events
client.on('stream:start', () => {
  analytics.track('message_sent', {
    sessionId: client.getConfig().sessionId,
    timestamp: Date.now(),
  });
});

client.on('stream:end', () => {
  analytics.track('message_received', {
    sessionId: client.getConfig().sessionId,
    timestamp: Date.now(),
  });
});

client.on('session:created', (session) => {
  analytics.track('session_started', {
    sessionId: session.session_id,
    sessionName: session.session_name,
  });
});

client.on('run:paused', (event) => {
  analytics.track('hitl_triggered', {
    toolCount: event.tools.length,
    tools: event.tools.map(t => t.tool_name),
  });
});
```

### Health Monitoring

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({ /* ... */ });

// Report health metrics
async function reportHealth() {
  const state = client.getState();

  const metrics = {
    timestamp: Date.now(),
    endpointActive: state.isEndpointActive,
    messageCount: client.getMessages().length,
    sessionCount: state.sessions.length,
    isStreaming: state.isStreaming,
    hasError: !!state.errorMessage,
  };

  await fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify(metrics),
  });
}

// Report every minute
setInterval(reportHealth, 60000);
```

## Operational Best Practices

### Environment Configuration

```typescript
// config.ts
export const config = {
  agno: {
    endpoint: process.env.NEXT_PUBLIC_AGNO_ENDPOINT!,
    mode: (process.env.NEXT_PUBLIC_AGNO_MODE || 'agent') as 'agent' | 'team',
    agentId: process.env.NEXT_PUBLIC_AGNO_AGENT_ID,
    teamId: process.env.NEXT_PUBLIC_AGNO_TEAM_ID,
  },
  features: {
    enableHitl: process.env.NEXT_PUBLIC_ENABLE_HITL === 'true',
    enableGenerativeUI: process.env.NEXT_PUBLIC_ENABLE_GENERATIVE_UI === 'true',
  },
};

// Validate on startup
function validateConfig() {
  if (!config.agno.endpoint) {
    throw new Error('NEXT_PUBLIC_AGNO_ENDPOINT is required');
  }

  if (config.agno.mode === 'agent' && !config.agno.agentId) {
    throw new Error('NEXT_PUBLIC_AGNO_AGENT_ID is required for agent mode');
  }

  if (config.agno.mode === 'team' && !config.agno.teamId) {
    throw new Error('NEXT_PUBLIC_AGNO_TEAM_ID is required for team mode');
  }
}

validateConfig();
```

### Graceful Degradation

```tsx
import { useAgnoChat, useAgnoActions } from '@antipopp/agno-react';
import { useEffect, useState } from 'react';

function ChatWithFallback() {
  const { state } = useAgnoChat();
  const { checkStatus } = useAgnoActions();
  const [connectionFailed, setConnectionFailed] = useState(false);

  useEffect(() => {
    checkStatus().then((isActive) => {
      if (!isActive) {
        setConnectionFailed(true);
      }
    });
  }, [checkStatus]);

  if (connectionFailed || !state.isEndpointActive) {
    return (
      <div className="fallback">
        <h2>Chat Unavailable</h2>
        <p>We're having trouble connecting to the chat service.</p>
        <ul>
          <li>Check our <a href="/faq">FAQ</a> for common questions</li>
          <li>Contact <a href="/support">support</a> for help</li>
        </ul>
      </div>
    );
  }

  return <Chat />;
}
```

### Rate Limiting (Client-Side)

```typescript
import { AgnoClient } from '@antipopp/agno-client';

class RateLimitedClient {
  private client: AgnoClient;
  private lastRequestTime: number = 0;
  private minInterval: number = 1000; // 1 second between requests

  constructor(config: AgnoClientConfig) {
    this.client = new AgnoClient(config);
  }

  async sendMessage(message: string): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
    await this.client.sendMessage(message);
  }

  // Proxy other methods...
  getMessages() { return this.client.getMessages(); }
  getState() { return this.client.getState(); }
  on(event: string, handler: Function) { this.client.on(event, handler as any); }
}
```

### Session Persistence

```typescript
// Save session ID to localStorage for resumption
function persistSession(client: AgnoClient) {
  client.on('session:created', (session) => {
    localStorage.setItem('agno_session_id', session.session_id);
  });

  client.on('session:loaded', (sessionId) => {
    localStorage.setItem('agno_session_id', sessionId);
  });
}

// Resume session on page load
async function resumeSession(client: AgnoClient) {
  const savedSessionId = localStorage.getItem('agno_session_id');

  if (savedSessionId) {
    try {
      await client.loadSession(savedSessionId);
      console.log('Session resumed');
    } catch (error) {
      console.warn('Could not resume session:', error);
      localStorage.removeItem('agno_session_id');
    }
  }
}
```

## Checklist

Before deploying to production:

- [ ] **Security**
  - [ ] Auth tokens are not hardcoded
  - [ ] User input is sanitized
  - [ ] HITL handlers validate arguments
  - [ ] HTTPS is used in production

- [ ] **Performance**
  - [ ] Heavy components are lazy loaded
  - [ ] Message lists are virtualized for long conversations
  - [ ] Memory leaks are prevented (cleanup listeners)

- [ ] **Monitoring**
  - [ ] Errors are tracked (Sentry, etc.)
  - [ ] Analytics events are instrumented
  - [ ] Health checks are in place

- [ ] **Operations**
  - [ ] Environment variables are configured
  - [ ] Fallback UI exists for connection failures
  - [ ] Rate limiting is implemented
  - [ ] Session persistence is handled

## Key Points

- Never hardcode authentication tokens
- Validate all user inputs and tool arguments
- Use lazy loading for heavy components like charts
- Virtualize long message lists
- Clean up event listeners on unmount
- Implement comprehensive error tracking
- Add analytics for key user actions
- Provide graceful degradation for failures
- Consider client-side rate limiting
- Persist sessions for page refreshes

## Conclusion

Congratulations! You've completed the Agno client cookbooks. You now have the knowledge to build production-ready applications with:

- Full chat functionality with streaming
- Session management and persistence
- Frontend tool execution (HITL)
- Rich generative UI components
- Proper error handling and recovery
- Production-grade security and monitoring

For more information, see the [main README](../README.md) and the [CLAUDE.md](../CLAUDE.md) architecture documentation.

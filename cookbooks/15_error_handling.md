# 15. Error Handling

> **Prerequisites**: [01-05 Getting Started through Session Management](./01_getting_started.md)
> **Packages**: `@antipopp/agno-client`, `@antipopp/agno-react`

## Overview

This cookbook covers error handling patterns, recovery strategies, and debugging techniques for Agno client applications.

## Error Types

The client can encounter several types of errors:

1. **Connection errors** - Network failures, endpoint unavailable
2. **Streaming errors** - Connection lost during streaming
3. **API errors** - Backend errors, invalid requests
4. **Tool execution errors** - Failed frontend tool handlers
5. **Configuration errors** - Invalid setup

## Core Client

### Basic Error Handling

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

// Listen for message errors
client.on('message:error', (errorMessage: string) => {
  console.error('Message error:', errorMessage);
});

// Try-catch for async operations
async function sendSafely(message: string) {
  try {
    await client.sendMessage(message);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Send failed:', error.message);
    }
  }
}
```

### Error State Monitoring

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

client.on('state:change', (state) => {
  if (state.errorMessage) {
    // Log error
    console.error('Error:', state.errorMessage);

    // Show notification
    showErrorNotification(state.errorMessage);
  }
});

// Check state directly
const state = client.getState();
if (state.errorMessage) {
  console.error('Current error:', state.errorMessage);
}
```

### Streaming Error Detection

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

client.on('message:update', (messages) => {
  const lastMessage = messages[messages.length - 1];

  if (lastMessage.streamingError) {
    console.error('Streaming failed for message');
    // The message content may be incomplete
  }
});

client.on('stream:end', () => {
  const state = client.getState();
  if (state.errorMessage) {
    console.error('Stream ended with error:', state.errorMessage);
  }
});
```

### Connection Health Check

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

async function checkConnection() {
  const isActive = await client.checkStatus();

  if (!isActive) {
    console.error('Endpoint is not reachable');
    return false;
  }

  console.log('Connection OK');
  return true;
}

// Periodic health check
setInterval(async () => {
  const wasActive = client.getState().isEndpointActive;
  const isActive = await client.checkStatus();

  if (wasActive && !isActive) {
    console.warn('Connection lost');
  } else if (!wasActive && isActive) {
    console.log('Connection restored');
  }
}, 30000); // Check every 30 seconds
```

### Retry Pattern

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

async function sendWithRetry(
  message: string,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await client.sendMessage(message);
      return true;
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`Failed after ${maxRetries} attempts`);
  return false;
}
```

## React

### Error State in Hooks

```tsx
import { useAgnoChat, useAgnoSession, useAgnoActions } from '@antipopp/agno-react';

function Chat() {
  const { error: chatError, messages } = useAgnoChat();
  const { error: sessionError } = useAgnoSession();
  const { error: actionsError } = useAgnoActions();

  // Aggregate errors
  const currentError = chatError || sessionError || actionsError;

  if (currentError) {
    return <ErrorDisplay error={currentError} />;
  }

  return <ChatUI messages={messages} />;
}

function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="error-banner" role="alert">
      <span className="error-icon">⚠️</span>
      <span className="error-message">{error}</span>
    </div>
  );
}
```

### Error Boundary Pattern

```tsx
import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ChatErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chat error:', error, errorInfo);
    // Log to error tracking service
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={this.handleRetry}>Try Again</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
function App() {
  return (
    <ChatErrorBoundary>
      <Chat />
    </ChatErrorBoundary>
  );
}
```

### Streaming Error Recovery

```tsx
import { useAgnoChat } from '@antipopp/agno-react';

function Chat() {
  const { messages, sendMessage, error, isStreaming, clearMessages } = useAgnoChat();

  // Find messages with streaming errors
  const hasStreamingError = messages.some(m => m.streamingError);
  const lastMessage = messages[messages.length - 1];
  const canRetry = lastMessage?.streamingError && !isStreaming;

  const handleRetry = async () => {
    // Get the user message that failed
    const userMessage = messages[messages.length - 2];
    if (userMessage?.role === 'user') {
      // Note: The client automatically handles retry cleanup
      await sendMessage(userMessage.content);
    }
  };

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i} className={msg.streamingError ? 'error' : ''}>
          {msg.content}
          {msg.streamingError && (
            <span className="error-indicator">Failed to complete</span>
          )}
        </div>
      ))}

      {canRetry && (
        <button onClick={handleRetry}>Retry Last Message</button>
      )}

      {error && (
        <div className="error-toast">{error}</div>
      )}
    </div>
  );
}
```

### Connection Status Component

```tsx
import { useAgnoChat, useAgnoActions } from '@antipopp/agno-react';
import { useState, useEffect } from 'react';

function ConnectionStatus() {
  const { state } = useAgnoChat();
  const { checkStatus } = useAgnoActions();
  const [checking, setChecking] = useState(false);

  const handleReconnect = async () => {
    setChecking(true);
    await checkStatus();
    setChecking(false);
  };

  // Periodic check
  useEffect(() => {
    const interval = setInterval(() => {
      if (!state.isStreaming) {
        checkStatus();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [checkStatus, state.isStreaming]);

  if (state.isEndpointActive) {
    return (
      <div className="status connected">
        <span className="dot green" />
        Connected
      </div>
    );
  }

  return (
    <div className="status disconnected">
      <span className="dot red" />
      Disconnected
      <button onClick={handleReconnect} disabled={checking}>
        {checking ? 'Checking...' : 'Reconnect'}
      </button>
    </div>
  );
}
```

### Form Validation Errors

```tsx
import { useAgnoChat } from '@antipopp/agno-react';
import { useState } from 'react';

function ChatInput() {
  const { sendMessage, isStreaming } = useAgnoChat();
  const [input, setInput] = useState('');
  const [validationError, setValidationError] = useState<string>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(undefined);

    // Validate input
    if (!input.trim()) {
      setValidationError('Message cannot be empty');
      return;
    }

    if (input.length > 10000) {
      setValidationError('Message is too long (max 10,000 characters)');
      return;
    }

    try {
      await sendMessage(input);
      setInput('');
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : 'Failed to send message'
      );
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {validationError && (
        <div className="validation-error">{validationError}</div>
      )}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isStreaming}
        aria-invalid={!!validationError}
      />
      <button type="submit" disabled={isStreaming}>
        Send
      </button>
    </form>
  );
}
```

## Debugging

### Enable Logging

```typescript
import { Logger } from '@antipopp/agno-client';

// The Logger utility provides debug output
// Check browser console for [AgnoClient] prefixed messages
```

### Debug Component

```tsx
import { useAgnoChat, useAgnoClient } from '@antipopp/agno-react';

function DebugPanel() {
  const client = useAgnoClient();
  const { messages, state } = useAgnoChat();

  const debugInfo = {
    config: client.getConfig(),
    state,
    messageCount: messages.length,
    lastMessage: messages[messages.length - 1],
  };

  return (
    <details className="debug-panel">
      <summary>Debug Info</summary>
      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
    </details>
  );
}
```

### Error Logging Service

```typescript
function logError(error: Error, context: Record<string, any>) {
  console.error('Error:', error.message, context);

  // Send to logging service
  fetch('/api/log-error', {
    method: 'POST',
    body: JSON.stringify({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    }),
  }).catch(console.error);
}

// Usage
client.on('message:error', (errorMessage) => {
  logError(new Error(errorMessage), {
    sessionId: client.getConfig().sessionId,
    messageCount: client.getMessages().length,
  });
});
```

## Key Points

- Listen to `message:error` for message-specific errors
- Check `state.errorMessage` for current error state
- `streamingError` on messages indicates incomplete responses
- Use `checkStatus()` for connection health checks
- Implement retry with exponential backoff
- Use Error Boundaries in React for unexpected errors
- Clean up error state when appropriate
- Log errors for debugging and monitoring

## Next Steps

Continue to [16. Production Tips](./16_production_tips.md) for security, performance, and deployment best practices.

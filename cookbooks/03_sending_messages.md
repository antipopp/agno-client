# 3. Sending Messages

> **Prerequisites**: [01. Getting Started](./01_getting_started.md), [02. Configuration](./02_configuration.md)
> **Packages**: `@antipopp/agno-client`, `@antipopp/agno-react`

## Overview

This cookbook covers how to send messages to agents and teams, handle streaming responses, and manage message state during a conversation.

## Core Client

### Basic Message Sending

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

// Simple message sending
async function sendMessage() {
  await client.sendMessage('What is the weather today?');
  const messages = client.getMessages();
  console.log('Response:', messages[messages.length - 1].content);
}
```

### Listening to Streaming Updates

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

// Listen for real-time streaming updates
client.on('message:update', (messages) => {
  const lastMessage = messages[messages.length - 1];
  console.log('Streaming content:', lastMessage.content);
});

// Listen for stream lifecycle events
client.on('stream:start', () => {
  console.log('Streaming started...');
});

client.on('stream:end', () => {
  console.log('Streaming complete.');
});

client.on('message:complete', (messages) => {
  console.log('Final messages:', messages);
});

await client.sendMessage('Tell me a story');
```

### Sending FormData with Files

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

// Send a message with file attachments
async function sendWithFiles(file: File) {
  const formData = new FormData();
  formData.append('message', 'Analyze this document');
  formData.append('file', file);

  await client.sendMessage(formData);
}

// Example usage with a file input
const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
fileInput.addEventListener('change', () => {
  if (fileInput.files?.[0]) {
    sendWithFiles(fileInput.files[0]);
  }
});
```

### Sending with Per-Request Options

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

// Send with custom headers and query params for this request only
await client.sendMessage('Hello', {
  headers: {
    'X-Request-ID': 'unique-request-123',
  },
  params: {
    debug: 'true',
    temperature: '0.7',
  },
});
```

### Checking Stream State

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

// Check if currently streaming before sending
async function safeSend(message: string) {
  const state = client.getState();

  if (state.isStreaming) {
    console.log('Please wait, still processing previous message...');
    return;
  }

  await client.sendMessage(message);
}
```

### Clearing Messages

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

// Start a new conversation
function startNewConversation() {
  client.clearMessages();
  // This also clears the current sessionId
}
```

## React

### Basic Chat Hook Usage

```tsx
import { useAgnoChat } from '@antipopp/agno-react';

function ChatInput() {
  const { sendMessage, isStreaming } = useAgnoChat();
  const [input, setInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const message = input;
    setInput('');

    try {
      await sendMessage(message);
    } catch (error) {
      console.error('Failed to send:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message..."
        disabled={isStreaming}
      />
      <button type="submit" disabled={isStreaming || !input.trim()}>
        {isStreaming ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
```

### Displaying Streaming Messages

```tsx
import { useAgnoChat } from '@antipopp/agno-react';

function MessageList() {
  const { messages, isStreaming } = useAgnoChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="message-list">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`message ${msg.role}`}
        >
          <strong>{msg.role === 'user' ? 'You' : 'Agent'}:</strong>
          <p>{msg.content}</p>

          {/* Show streaming indicator */}
          {isStreaming && index === messages.length - 1 && msg.role === 'agent' && (
            <span className="typing-indicator">...</span>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
```

### Sending with Files in React

```tsx
import { useAgnoChat } from '@antipopp/agno-react';

function FileUploadChat() {
  const { sendMessage, isStreaming } = useAgnoChat();
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStreaming) return;

    if (file) {
      const formData = new FormData();
      formData.append('message', message || 'Please analyze this file');
      formData.append('file', file);
      await sendMessage(formData);
      setFile(null);
    } else if (message.trim()) {
      await sendMessage(message);
    }

    setMessage('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
      />
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button type="submit" disabled={isStreaming}>
        Send
      </button>
    </form>
  );
}
```

### Sending with Per-Request Options

```tsx
import { useAgnoChat } from '@antipopp/agno-react';

function Chat() {
  const { sendMessage } = useAgnoChat();

  const handleSend = async (message: string) => {
    await sendMessage(message, {
      headers: {
        'X-Request-ID': crypto.randomUUID(),
      },
      params: {
        debug: 'true',
      },
    });
  };

  // ...
}
```

### Clearing and Starting New Conversations

```tsx
import { useAgnoChat } from '@antipopp/agno-react';

function ChatControls() {
  const { clearMessages, messages, isStreaming } = useAgnoChat();

  const handleNewChat = () => {
    if (isStreaming) return;
    clearMessages();
  };

  return (
    <div>
      <button
        onClick={handleNewChat}
        disabled={isStreaming || messages.length === 0}
      >
        New Conversation
      </button>
    </div>
  );
}
```

## Key Points

- `sendMessage()` accepts either a string or FormData for file uploads
- The client streams responses in real-time via `message:update` events
- Check `isStreaming` before sending to prevent concurrent requests
- Use `clearMessages()` to start a new conversation (also clears sessionId)
- Per-request `headers` and `params` can be passed as the second argument
- In React, `useAgnoChat()` provides reactive `messages` and `isStreaming` state

## Next Steps

Continue to [04. Handling Responses](./04_handling_responses.md) to learn about the structure of messages and how to handle tool calls and reasoning.

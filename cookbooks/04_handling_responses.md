# 4. Handling Responses

> **Prerequisites**: [01. Getting Started](./01_getting_started.md), [02. Configuration](./02_configuration.md), [03. Sending Messages](./03_sending_messages.md)
> **Packages**: `@antipopp/agno-client`, `@antipopp/agno-react`

## Overview

This cookbook explains the structure of chat messages and how to access different types of content including text, tool calls, reasoning steps, and media.

## ChatMessage Structure

```typescript
interface ChatMessage {
  role: 'user' | 'agent' | 'system' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  extra_data?: MessageExtraData;
  images?: ImageData[];
  videos?: VideoData[];
  audio?: AudioData[];
  response_audio?: ResponseAudioData;
  created_at: number;
  streamingError?: boolean;
}

interface ToolCall {
  role: 'user' | 'tool' | 'system' | 'assistant';
  content: string | null;
  tool_call_id: string;
  tool_name: string;
  tool_args: Record<string, string>;
  tool_call_error: boolean;
  metrics: { time: number };
  created_at: number;
  // HITL fields
  external_execution?: boolean;
  requires_confirmation?: boolean;
  result?: any;
}

interface MessageExtraData {
  reasoning_steps?: ReasoningSteps[];
  reasoning_messages?: ReasoningMessage[];
  references?: ReferenceData[];
}
```

## Core Client

### Accessing Message Content

```typescript
import { AgnoClient, ChatMessage } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

client.on('message:complete', (messages: ChatMessage[]) => {
  for (const msg of messages) {
    console.log(`[${msg.role}]: ${msg.content}`);

    // Check for tool calls
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      console.log('Tool calls:', msg.tool_calls.length);
    }

    // Check for reasoning
    if (msg.extra_data?.reasoning_steps) {
      console.log('Reasoning steps:', msg.extra_data.reasoning_steps.length);
    }
  }
});

await client.sendMessage('Search for the latest news');
```

### Processing Tool Calls

```typescript
import { AgnoClient, ToolCall } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

function processToolCalls(toolCalls: ToolCall[]) {
  for (const tool of toolCalls) {
    console.log(`Tool: ${tool.tool_name}`);
    console.log(`Arguments:`, tool.tool_args);
    console.log(`Result: ${tool.content}`);
    console.log(`Execution time: ${tool.metrics.time}ms`);

    if (tool.tool_call_error) {
      console.error('Tool call failed');
    }
  }
}

client.on('message:complete', (messages) => {
  const lastMessage = messages[messages.length - 1];

  if (lastMessage.tool_calls) {
    processToolCalls(lastMessage.tool_calls);
  }
});
```

### Handling Reasoning Steps

```typescript
import { AgnoClient } from '@antipopp/agno-client';
import type { ReasoningSteps } from '@antipopp/agno-types';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'reasoning-agent',
});

function displayReasoning(steps: ReasoningSteps[]) {
  for (const step of steps) {
    console.log(`--- ${step.title} ---`);
    console.log(`Action: ${step.action}`);
    console.log(`Reasoning: ${step.reasoning}`);
    console.log(`Result: ${step.result}`);
    if (step.confidence !== undefined) {
      console.log(`Confidence: ${step.confidence}`);
    }
    if (step.next_action) {
      console.log(`Next: ${step.next_action}`);
    }
    console.log('');
  }
}

client.on('message:complete', (messages) => {
  const lastMessage = messages[messages.length - 1];

  if (lastMessage.extra_data?.reasoning_steps) {
    displayReasoning(lastMessage.extra_data.reasoning_steps);
  }
});
```

### Checking for Streaming Errors

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
    console.error('Message had a streaming error');
    // Could show a retry button in UI
  }
});
```

## React

### Rendering Messages

```tsx
import { useAgnoChat } from '@antipopp/agno-react';
import type { ChatMessage } from '@antipopp/agno-types';

function MessageList() {
  const { messages } = useAgnoChat();

  return (
    <div className="message-list">
      {messages.map((msg, index) => (
        <Message key={index} message={msg} />
      ))}
    </div>
  );
}

function Message({ message }: { message: ChatMessage }) {
  return (
    <div className={`message ${message.role}`}>
      {/* Main content */}
      <div className="content">
        {message.role === 'user' ? 'You' : 'Agent'}: {message.content}
      </div>

      {/* Tool calls */}
      {message.tool_calls && message.tool_calls.length > 0 && (
        <ToolCallList toolCalls={message.tool_calls} />
      )}

      {/* Reasoning */}
      {message.extra_data?.reasoning_steps && (
        <ReasoningDisplay steps={message.extra_data.reasoning_steps} />
      )}

      {/* Error indicator */}
      {message.streamingError && (
        <div className="error">Failed to complete. Try again.</div>
      )}
    </div>
  );
}
```

### Rendering Tool Calls

```tsx
import type { ToolCall } from '@antipopp/agno-types';

function ToolCallList({ toolCalls }: { toolCalls: ToolCall[] }) {
  return (
    <div className="tool-calls">
      <h4>Tools Used:</h4>
      {toolCalls.map((tool) => (
        <div key={tool.tool_call_id} className="tool-call">
          <div className="tool-header">
            <strong>{tool.tool_name}</strong>
            <span className="time">{tool.metrics.time}ms</span>
          </div>

          {/* Arguments */}
          <details>
            <summary>Arguments</summary>
            <pre>{JSON.stringify(tool.tool_args, null, 2)}</pre>
          </details>

          {/* Result */}
          <div className="tool-result">
            {tool.tool_call_error ? (
              <span className="error">Error: {tool.content}</span>
            ) : (
              <span>{tool.content}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Rendering Reasoning Steps

```tsx
import type { ReasoningSteps } from '@antipopp/agno-types';

function ReasoningDisplay({ steps }: { steps: ReasoningSteps[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="reasoning">
      <button onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Hide' : 'Show'} Reasoning ({steps.length} steps)
      </button>

      {expanded && (
        <ol className="reasoning-steps">
          {steps.map((step, index) => (
            <li key={index} className="step">
              <h5>{step.title}</h5>
              {step.action && <p><strong>Action:</strong> {step.action}</p>}
              <p><strong>Reasoning:</strong> {step.reasoning}</p>
              <p><strong>Result:</strong> {step.result}</p>
              {step.confidence !== undefined && (
                <p><strong>Confidence:</strong> {(step.confidence * 100).toFixed(0)}%</p>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
```

### Complete Message Component

```tsx
import { useAgnoChat } from '@antipopp/agno-react';
import type { ChatMessage } from '@antipopp/agno-types';

function Chat() {
  const { messages, isStreaming } = useAgnoChat();

  return (
    <div className="chat">
      {messages.map((msg, i) => (
        <MessageBubble
          key={i}
          message={msg}
          isLastMessage={i === messages.length - 1}
          isStreaming={isStreaming}
        />
      ))}
    </div>
  );
}

function MessageBubble({
  message,
  isLastMessage,
  isStreaming,
}: {
  message: ChatMessage;
  isLastMessage: boolean;
  isStreaming: boolean;
}) {
  const isAgent = message.role === 'agent';
  const showTyping = isAgent && isLastMessage && isStreaming;

  return (
    <div className={`bubble ${message.role}`}>
      <div className="sender">
        {message.role === 'user' ? 'You' : 'Agent'}
      </div>

      <div className="content">
        {message.content}
        {showTyping && <span className="cursor">|</span>}
      </div>

      {/* Tool calls section */}
      {message.tool_calls && message.tool_calls.length > 0 && (
        <div className="tools">
          {message.tool_calls.map((tool) => (
            <div key={tool.tool_call_id} className="tool">
              <span className="icon">🔧</span>
              <span>{tool.tool_name}</span>
              {tool.tool_call_error && <span className="error">❌</span>}
            </div>
          ))}
        </div>
      )}

      {/* Timestamp */}
      <div className="timestamp">
        {new Date(message.created_at * 1000).toLocaleTimeString()}
      </div>
    </div>
  );
}
```

## Key Points

- **ChatMessage** contains `content`, `tool_calls`, `extra_data`, and media arrays
- **ToolCall** includes `tool_name`, `tool_args`, result in `content`, and timing `metrics`
- **ReasoningSteps** provide insight into the agent's decision-making process
- Check `streamingError` to detect failed messages and offer retry options
- `created_at` is a Unix timestamp (seconds) - multiply by 1000 for JavaScript Date

## Next Steps

Continue to [05. Session Management](./05_session_management.md) to learn about persisting and restoring conversations.

# @antipopp/agno-types

TypeScript type definitions for Agno client libraries.

## Installation

```bash
npm install @antipopp/agno-types
```

This package is automatically included when you install `@antipopp/agno-client` or `@antipopp/agno-react`.

## Usage

```typescript
import type {
  AgnoClientConfig,
  ChatMessage,
  ToolCall,
  SessionEntry,
  AgentDetails,
  TeamDetails,
  RunEvent,
} from '@antipopp/agno-types';
```

## Type Definitions

### Configuration

#### `AgnoClientConfig`

Client configuration options.

```typescript
interface AgnoClientConfig {
  endpoint: string;
  authToken?: string;
  mode?: 'agent' | 'team';
  agentId?: string;
  teamId?: string;
  dbId?: string;
  sessionId?: string;
}
```

### Messages

#### `ChatMessage`

Chat message structure.

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
```

#### `ToolCall`

Tool call information.

```typescript
interface ToolCall {
  role: 'user' | 'tool' | 'system' | 'assistant';
  content: string | null;
  tool_call_id: string;
  tool_name: string;
  tool_args: Record<string, string>;
  tool_call_error: boolean;
  metrics: ToolMetrics;
  created_at: number;
}
```

### API Types

#### `AgentDetails`

Agent configuration.

```typescript
interface AgentDetails {
  id: string;
  name?: string;
  description?: string;
  model?: Model;
  db_id?: string;
  storage?: boolean;
}
```

#### `TeamDetails`

Team configuration.

```typescript
interface TeamDetails {
  id: string;
  name?: string;
  description?: string;
  model?: Model;
  db_id?: string;
  storage?: boolean;
}
```

#### `SessionEntry`

Session information.

```typescript
interface SessionEntry {
  session_id: string;
  session_name: string;
  created_at: string | null;  // ISO 8601 timestamp string
  updated_at?: string | null;  // ISO 8601 timestamp string
}
```

### Events

#### `RunEvent`

Events emitted during an Agno agent run.

```typescript
enum RunEvent {
  RunStarted = 'RunStarted',
  RunContent = 'RunContent',
  RunCompleted = 'RunCompleted',
  RunError = 'RunError',
  ToolCallStarted = 'ToolCallStarted',
  ToolCallCompleted = 'ToolCallCompleted',
  ReasoningStarted = 'ReasoningStarted',
  ReasoningStep = 'ReasoningStep',
  ReasoningCompleted = 'ReasoningCompleted',
  // ... and more
}
```

## License

MIT

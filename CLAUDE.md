# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **pnpm monorepo** containing independent open-source client libraries for Agno agents. The project provides a framework-agnostic core library with a React adapter, following a layered architecture pattern.

### Package Structure

Three packages with clear dependency hierarchy:

1. **`@antipopp/agno-types`** (`packages/types/`) - Shared TypeScript types matching official Agno API
2. **`@antipopp/agno-client`** (`packages/core/`) - Core stateful client (depends on types)
3. **`@antipopp/agno-react`** (`packages/react/`) - React hooks adapter (depends on core + types)

Dependency flow: `types` ← `core` ← `react`

## Development Commands

### Essential Commands

```bash
# Install all dependencies (REQUIRED first step)
pnpm install

# Build all packages (builds in dependency order)
pnpm build

# Watch mode for development (runs in parallel)
pnpm dev

# Type checking across all packages
pnpm typecheck

# Clean all build artifacts and node_modules
pnpm clean
```

### Per-Package Development

```bash
# Build a specific package
pnpm --filter @antipopp/agno-types build
pnpm --filter @antipopp/agno-client build
pnpm --filter @antipopp/agno-react build

# Watch mode for specific package
cd packages/core && pnpm dev
```

### Important Notes

- **Always build in order**: types → core → react (or use `pnpm build` which handles this)
- **Workspace dependencies**: Packages use `workspace:*` protocol to reference each other
- **Build tool**: All packages use `tsup` for bundling (outputs CJS + ESM + types)

## Architecture Overview

### Core Library Architecture (`packages/core/`)

The core library uses a **modular, event-driven architecture** with clear separation of concerns:

```
AgnoClient (EventEmitter)
├── MessageStore      - Immutable message state management
├── ConfigManager     - Centralized configuration (endpoint, auth, mode, IDs)
├── SessionManager    - Fetch/convert session history from API
├── EventProcessor    - Process RunEvent types and update messages
└── StreamParser      - Parse incremental JSON from fetch streams
```

**Key architectural decisions:**

1. **EventEmitter pattern**: The `AgnoClient` extends `eventemitter3` to provide real-time updates without coupling to UI frameworks
2. **Stateful managers**: Each concern (messages, config, sessions) has its own manager class with focused responsibilities
3. **Event processing pipeline**: Raw streaming chunks → EventProcessor → MessageStore updates → emit events

**Event flow during streaming:**
```
fetch stream → StreamParser.parseBuffer() → RunResponse chunks
→ EventProcessor.processChunk() → MessageStore.updateLastMessage()
→ AgnoClient.emit('message:update') → React hooks update state
```

### React Adapter Architecture (`packages/react/`)

The React package wraps the core client with React-specific patterns:

```
<AgnoProvider>                    # Creates AgnoClient via useRef
└── AgnoContext                   # Provides client instance
    └── useAgnoClient()           # Access client directly
        ├── useAgnoChat()         # Message management + streaming
        ├── useAgnoSession()      # Session loading/management
        ├── useAgnoActions()      # Initialization + helpers
        └── useAgnoToolExecution() # Frontend tool execution (HITL)
```

**Key patterns:**

1. **Single client instance**: `AgnoProvider` uses `useRef` to create the client once and persist it across renders
2. **Event synchronization**: Hooks use `useEffect` to subscribe to client events and sync to React state
3. **Hook composition**: Each hook has a single responsibility and can be used independently

### Type System (`packages/types/`)

Types are organized by domain:

- `events.ts` - RunEvent enum and client event types
- `messages.ts` - ChatMessage, ToolCall, ReasoningSteps, media types
- `api.ts` - API response types (RunResponse, SessionEntry, AgentDetails, etc.)
- `config.ts` - Configuration and state types

**Important**: These types match the official Agno API specification. When updating types, ensure compatibility with the Agno backend.

## Critical Implementation Details

### Streaming Implementation

The streaming parser (`parsers/stream-parser.ts`) handles **incremental JSON parsing** from fetch streams:

- Accumulates partial JSON in a buffer
- Uses brace-counting to detect complete JSON objects
- Supports both legacy format (direct RunResponseContent) and new format (event/data structure)
- Automatically converts new format to legacy for compatibility

**Why this matters**: Standard `JSON.parse()` on a stream would fail with incomplete JSON. This parser is essential for real-time streaming.

### Tool Call Processing

Tool calls can arrive in two formats:
- Single `tool` object (new format)
- Array of `tools` (legacy format)

The `EventProcessor` merges tool calls by `tool_call_id` or falls back to `${tool_name}-${created_at}` as a unique identifier. This handles updates to the same tool call across multiple chunks.

### Session Conversion

The `SessionManager` converts the API's session format (with nested `message`/`response` structure) to the client's flat `ChatMessage[]` format. It also extracts tool calls from `reasoning_messages` if present.

### Frontend Tool Execution (HITL)

The library supports **Human-in-the-Loop (HITL)** frontend tool execution through the `useAgnoToolExecution` hook in the React package. This allows agents to delegate specific tools to the frontend for execution.

**⚠️ Important:** HITL is only supported for agents, not teams. Teams do not have a `/continue` endpoint in the AgentOS API.

**How it works:**

1. Agent calls a tool marked with `external_execution=True` on the backend
2. Backend emits `RunPaused` event with tools awaiting execution
3. Core client updates state (`isPaused: true`, stores `toolsAwaitingExecution`)
4. Client emits `run:paused` event with tool details
5. React hook (`useAgnoToolExecution`) listens to `run:paused` event
6. Hook executes tools using user-defined handlers
7. Hook calls `client.continueRun(toolResults)` to resume the agent (will throw error if mode is 'team')
8. Backend continues processing with the results

**Event flow for paused runs:**
```
Backend tool call → RunPaused event → AgnoClient state update
→ emit('run:paused', { tools }) → useAgnoToolExecution listens
→ execute handlers → client.continueRun() → POST /continue endpoint
→ RunContinued event → emit('run:continued') → state reset
```

**Key files:**
- `packages/react/src/hooks/useAgnoToolExecution.ts` - React hook for tool execution
- `packages/core/src/client.ts` - Core `continueRun()` method
- `packages/types/src/events.ts` - `RunPaused` and `RunContinued` events
- `FRONTEND_TOOL_EXECUTION.md` - Complete usage guide

**Auto-execution vs manual confirmation:**
- By default, `useAgnoToolExecution(handlers)` auto-executes tools immediately
- Set `useAgnoToolExecution(handlers, false)` to require manual approval
- Useful for sensitive operations (deletions, payments, etc.)

**Security considerations:**
- Only expose safe operations as frontend-executable tools
- Validate tool arguments before execution
- Always handle errors gracefully and return error objects
- Consider using manual confirmation for destructive operations

## User ID Tracking

The client libraries support linking sessions to specific users via the `userId` configuration parameter. This matches the official Agno API's `user_id` parameter.

**How it works:**

1. Set `userId` in the `AgnoClientConfig` (via constructor or `updateConfig()`)
2. The client automatically includes `user_id` in:
   - `POST /agents/{id}/runs` and `POST /teams/{id}/runs` (when sending messages)
   - `POST /agents/{id}/runs/{runId}/continue` and `POST /teams/{id}/runs/{runId}/continue` (when continuing paused runs)
3. Backend links the session to the specified user

**Usage:**

```typescript
// Core client
const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'agent-123',
  userId: 'user-456' // Links all sessions to this user
});

// Or update dynamically
client.updateConfig({ userId: 'user-789' });

// React
<AgnoProvider config={{ endpoint: '...', agentId: '...', userId: 'user-123' }}>
  {/* Your app */}
</AgnoProvider>
```

**Key files:**
- `packages/types/src/config.ts` - `AgnoClientConfig.userId` field
- `packages/core/src/managers/config-manager.ts` - `getUserId()` and `setUserId()` methods
- `packages/core/src/client.ts` - `sendMessage()` and `continueRun()` include `user_id` in FormData

## Type Safety and Official Types

All types in `@antipopp/agno-types` are based on the **official Agno API specification** provided by the Agno team. When making changes:

1. The types match the exact structure returned by Agno endpoints (e.g., `RunEvent` uses PascalCase like `'RunStarted'`, not snake_case)
2. Optional fields use `?:` only where the API may omit them
3. Enums use string literals matching the API exactly

If Agno's API changes, update `packages/types/` first, then propagate changes to core and react packages.

## Publishing Workflow

Packages are published independently to npm under the `@antipopp` scope:

```bash
# Build all packages first
pnpm build

# Publish in dependency order
cd packages/types && pnpm publish
cd ../core && pnpm publish
cd ../react && pnpm publish
```

Version updates should be coordinated across packages when breaking changes occur.

## Testing Against Agno

To test the client libraries:

1. Ensure an Agno endpoint is running (default: `http://localhost:7777`)
2. Get an agent ID or team ID from your Agno setup
3. Use the endpoint status check: `curl http://localhost:7777/v1/status`
4. Configure the client with the correct endpoint, mode, and entity ID

The client expects these Agno API endpoints:
- `GET /health` - Health check
- `GET /agents` - List agents
- `GET /teams` - List teams
- `POST /agents/{id}/runs` - Run agent (streaming)
- `POST /teams/{id}/runs` - Run team (streaming)
- `POST /agents/{id}/runs/{runId}/continue` - Continue paused agent run (HITL) - **Agent only**
- `GET /sessions?type={type}&component_id={id}&db_id={dbId}` - List sessions
- `GET /sessions/{id}/runs?type={type}&db_id={dbId}` - Get session
- `DELETE /sessions/{id}?db_id={dbId}` - Delete session (unified for both agents and teams)

**Important:** Teams do not support the `/continue` endpoint. HITL (Human-in-the-Loop) frontend tool execution is only available for agents.

## Working with Frontend Tool Execution

When implementing or debugging frontend tool execution:

1. **Backend setup**: Ensure tools are defined with `external_execution=True` in Python
2. **Event handling**: The core client automatically handles `RunPaused` and `RunContinued` events
3. **Hook integration**: Use `useAgnoToolExecution` in React components to define handlers
4. **Tool handlers**: Each handler receives `args: Record<string, any>` and returns a result
5. **Result format**: Results are automatically stringified to JSON
6. **Error handling**: Wrap execution in try/catch and return error objects
7. **Debugging**: Check browser console for `[useAgnoToolExecution]` logs

For complete implementation examples, see `FRONTEND_TOOL_EXECUTION.md`.

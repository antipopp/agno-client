# Run Cancellation Feature - PRD, Spec & Implementation Plan

## Overview

Add the ability to cancel an ongoing agent/team run from the client. This allows users to stop long-running operations and provides better control over streaming interactions.

## Motivation

Currently, once a run starts streaming, there's no way to cancel it from the client side. Users may want to:

- Stop a run that's taking too long
- Cancel when they realize they sent the wrong message
- Abort when navigating away from the chat interface
- Free up backend resources for cancelled requests

## Backend Support

The Agno backend supports run cancellation via:

```
POST /agents/{agent_id}/runs/{run_id}/cancel    # Cancel Agent Run
POST /teams/{team_id}/runs/{run_id}/cancel      # Cancel Team Run
```

### API Details

| Aspect | Details |
|--------|---------|
| **Method** | POST |
| **Path (Agent)** | `/agents/{agent_id}/runs/{run_id}/cancel` |
| **Path (Team)** | `/teams/{team_id}/runs/{run_id}/cancel` |
| **Request Body** | None |
| **Success Response** | 200 OK |
| **Error Codes** | 400, 401, 404, 422, 500 |
| **Behavior** | Graceful cancellation (may not be immediate) |

**Important**: Cancellation attempts to stop execution gracefully but may not be immediate for all operations. The client should handle this by cleaning up local state immediately while the backend finishes.

---

## Current State Analysis

### What Already Exists

| Component | Status | Location |
|-----------|--------|----------|
| `RunCancelled` event type | Defined | `packages/types/src/events.ts:18` |
| `TeamRunCancelled` event type | Defined | `packages/types/src/events.ts:26` |
| `TeamRunCancelled` handling | Implemented | `packages/core/src/client.ts:286-290` |
| `TeamRunCancelled` in EventProcessor | Implemented | `packages/core/src/processors/event-processor.ts:232` |
| `AbortSignal` in streamResponse | Supported | `packages/core/src/parsers/stream-parser.ts:156,189` |
| AbortError graceful handling | Implemented | `packages/core/src/parsers/stream-parser.ts:231-234` |
| `run_id` in RunResponse | Available | `packages/types/src/api.ts:221` |
| HITL pause/continue pattern | Implemented | `packages/core/src/client.ts:262-280,671-757` |

### What Is Missing

| Component | Status | Notes |
|-----------|--------|-------|
| `RunCancelled` handling (agent) | Not implemented | Only `TeamRunCancelled` is handled |
| `currentRunId` tracking | Not implemented | Run ID not stored during streaming |
| `AbortController` storage | Not implemented | No controller stored in client |
| `cancelRun()` method | Not implemented | No public method to cancel |
| `signal` in StreamOptions | Not defined | Type doesn't include signal |
| `run:cancelled` client event | Not defined | Not in ClientEvent type |
| React hook `cancelRun` | Not exposed | Not in useAgnoChat |

### Key Code Patterns to Follow

**HITL Pause State Pattern** (`packages/core/src/client.ts:262-280`):
```typescript
// When RunPaused event received:
this.state.isPaused = true;
this.state.pausedRunId = chunk.run_id;
this.emit('run:paused', { runId, sessionId, tools });
```

**Error Handling Pattern** (`packages/core/src/client.ts:283-307`):
```typescript
if (event === RunEvent.RunError || event === RunEvent.TeamRunError || event === RunEvent.TeamRunCancelled) {
  this.state.errorMessage = errorContent;
  this.messageStore.updateLastMessage((msg) => ({ ...msg, streamingError: true }));
  this.emit('message:error', errorContent);
  return;
}
```

**Stream Completion Pattern** (`packages/core/src/client.ts:209-220`):
```typescript
onComplete: async () => {
  this.state.isStreaming = false;
  this.emit('stream:end');
  this.emit('message:complete', this.messageStore.getMessages());
  this.emit('state:change', this.getState());
}
```

---

## Proposed Implementation

### Cancel Flow Diagram

```
User calls cancelRun()
    │
    ├──► 1. Validate: isStreaming && currentRunId exist
    │
    ├──► 2. Set state.isCancelling = true
    │
    ├──► 3. Abort local fetch stream (AbortController.abort())
    │         └── Provides immediate UI feedback
    │
    ├──► 4. POST /agents/{id}/runs/{run_id}/cancel
    │         └── Notify backend to stop processing
    │
    ├──► 5. Backend sends RunCancelled event (if stream still open)
    │
    ├──► 6. Client handles RunCancelled event:
    │         ├── Set isStreaming = false
    │         ├── Set isCancelling = false
    │         ├── Clear currentRunId
    │         └── Mark message as cancelled (not error)
    │
    └──► 7. Emit 'run:cancelled' event
              └── React hooks update UI
```

### Cancellation vs Error Distinction

Cancellation is **user-initiated** and should be handled differently from errors:

| Aspect | Error | Cancellation |
|--------|-------|--------------|
| Trigger | System/network failure | User action |
| Message state | `streamingError: true` | `cancelled: true` |
| UI treatment | Show error message | Show "Cancelled" indicator |
| Session | May be removed | Keep session |
| Retry | May auto-retry | User must re-send |

---

## API Design

### Core Client API

```typescript
// AgnoClient methods
class AgnoClient {
  // Get current run ID (if streaming)
  getCurrentRunId(): string | undefined;

  // Cancel the current run
  async cancelRun(options?: {
    headers?: Record<string, string>;
    params?: Record<string, string>;
  }): Promise<void>;
}

// State additions
interface ClientState {
  // ... existing fields
  currentRunId?: string;    // Active run ID during streaming
  isCancelling?: boolean;   // Cancel request in progress
}

// Event additions
type ClientEvent =
  | /* existing events */
  | 'run:cancelled';        // Emitted when run is cancelled

// StreamOptions additions
interface StreamOptions {
  // ... existing fields
  signal?: AbortSignal;     // For request cancellation
}
```

### React Hook API

```typescript
// useAgnoChat additions
function useAgnoChat() {
  return {
    // ... existing returns
    cancelRun: () => Promise<void>;  // Cancel current run
    isCancelling: boolean;           // Cancel in progress
    currentRunId: string | undefined; // Current run ID
  };
}
```

### Usage Examples

**Core Client:**
```typescript
const client = new AgnoClient({ endpoint, agentId });

// Send message
await client.sendMessage('Analyze this large dataset...');

// User clicks cancel
if (client.getState().isStreaming) {
  await client.cancelRun();
}

// Listen for cancellation
client.on('run:cancelled', ({ runId, sessionId }) => {
  console.log(`Run ${runId} was cancelled`);
});
```

**React:**
```typescript
function ChatComponent() {
  const {
    sendMessage,
    cancelRun,
    isStreaming,
    isCancelling
  } = useAgnoChat();

  return (
    <>
      <button onClick={() => sendMessage(input)} disabled={isStreaming}>
        Send
      </button>
      <button
        onClick={cancelRun}
        disabled={!isStreaming || isCancelling}
      >
        {isCancelling ? 'Cancelling...' : 'Cancel'}
      </button>
    </>
  );
}
```

---

## Implementation Steps

### Phase 1: Types Package (`packages/types/`)

**File: `packages/types/src/config.ts`**

```typescript
// Add to ClientState interface
export interface ClientState {
  // ... existing fields

  /**
   * Current active run ID (during streaming)
   */
  currentRunId?: string;

  /**
   * Whether a cancellation request is in progress
   */
  isCancelling?: boolean;
}

// Add to StreamOptions interface
export interface StreamOptions {
  // ... existing fields

  /**
   * AbortSignal for request cancellation
   */
  signal?: AbortSignal;
}
```

**File: `packages/types/src/events.ts`**

```typescript
// Add to ClientEvent type
export type ClientEvent =
  | /* existing events */
  | 'run:cancelled';  // Emitted when run is cancelled by user
```

**File: `packages/types/src/messages.ts`**

```typescript
// Add to ChatMessage interface
export interface ChatMessage {
  // ... existing fields

  /**
   * Whether this message was cancelled during streaming
   */
  cancelled?: boolean;
}
```

### Phase 2: Core Package (`packages/core/`)

**File: `packages/core/src/client.ts`**

1. **Add private fields:**
```typescript
export class AgnoClient extends EventEmitter {
  // ... existing fields
  private currentRunId?: string;
  private abortController?: AbortController;
```

2. **Update state initialization:**
```typescript
this.state = {
  // ... existing
  currentRunId: undefined,
  isCancelling: false,
};
```

3. **Track run ID in handleChunk:**
```typescript
private handleChunk(chunk: RunResponse, ...): void {
  const event = chunk.event as RunEvent;

  // Track current run ID from RunStarted events
  if (
    event === RunEvent.RunStarted ||
    event === RunEvent.TeamRunStarted
  ) {
    if (chunk.run_id) {
      this.currentRunId = chunk.run_id;
      this.state.currentRunId = chunk.run_id;
      this.emit('state:change', this.getState());
    }
  }

  // Handle RunCancelled event (agent) - ADD THIS
  if (event === RunEvent.RunCancelled) {
    this.handleRunCancelled(chunk);
    return;
  }

  // ... rest of existing handling
}
```

4. **Add handleRunCancelled method:**
```typescript
private handleRunCancelled(chunk: RunResponse): void {
  this.state.isStreaming = false;
  this.state.isCancelling = false;
  this.state.currentRunId = undefined;
  this.currentRunId = undefined;

  // Mark message as cancelled (distinct from error)
  this.messageStore.updateLastMessage((msg) => ({
    ...msg,
    cancelled: true,
  }));

  this.emit('run:cancelled', {
    runId: chunk.run_id,
    sessionId: chunk.session_id,
  });
  this.emit('stream:end');
  this.emit('message:update', this.messageStore.getMessages());
  this.emit('state:change', this.getState());
}
```

5. **Update sendMessage to use AbortController:**
```typescript
async sendMessage(
  message: string | FormData,
  options?: StreamOptions
): Promise<void> {
  // ... existing validation

  // Create new AbortController for this request
  this.abortController = new AbortController();

  // ... existing setup code

  try {
    await streamResponse({
      apiUrl: runUrl,
      headers,
      params,
      requestBody: formData,
      signal: options?.signal ?? this.abortController.signal,  // ADD signal
      onChunk: (chunk: RunResponse) => {
        this.handleChunk(chunk, newSessionId, formData.get('message') as string);
        // ... existing session ID handling
      },
      onError: (error) => {
        this.handleError(error, newSessionId);
      },
      onComplete: async () => {
        this.currentRunId = undefined;
        this.state.currentRunId = undefined;
        this.abortController = undefined;
        // ... rest of existing onComplete
      },
    });
  } catch (error) {
    // ... existing error handling
  }
}
```

6. **Add cancelRun method:**
```typescript
/**
 * Cancel the current running agent/team run.
 *
 * This will:
 * 1. Abort the local fetch stream (immediate)
 * 2. Notify the backend to stop processing
 * 3. Emit 'run:cancelled' event
 *
 * @param options - Optional request headers and query parameters
 * @throws Error if no run is currently streaming
 */
async cancelRun(options?: {
  headers?: Record<string, string>;
  params?: Record<string, string>;
}): Promise<void> {
  if (!this.state.isStreaming) {
    throw new Error('No active run to cancel');
  }

  if (!this.currentRunId) {
    throw new Error('No run ID available for cancellation');
  }

  this.state.isCancelling = true;
  this.emit('state:change', this.getState());

  // 1. Abort local stream immediately for instant UI feedback
  if (this.abortController) {
    this.abortController.abort();
    this.abortController = undefined;
  }

  // 2. Notify backend to stop processing
  const cancelUrl = this.configManager.getCancelUrl(this.currentRunId);
  if (!cancelUrl) {
    // Still cleanup local state even if no cancel URL
    this.handleLocalCancellation();
    return;
  }

  try {
    const headers = this.configManager.buildRequestHeaders(options?.headers);
    const params = this.configManager.buildQueryString(options?.params);

    const url = new URL(cancelUrl);
    if (params.toString()) {
      params.forEach((value, key) => url.searchParams.set(key, value));
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      Logger.warn(`[AgnoClient] Cancel request failed: ${response.status}`);
      // Still cleanup local state
    }
  } catch (error) {
    Logger.warn('[AgnoClient] Cancel request error:', error);
    // Still cleanup local state even on network error
  }

  // 3. Cleanup local state (in case backend didn't send RunCancelled event)
  this.handleLocalCancellation();
}

/**
 * Handle local cancellation cleanup
 */
private handleLocalCancellation(): void {
  const runId = this.currentRunId;
  const sessionId = this.configManager.getSessionId();

  this.state.isStreaming = false;
  this.state.isCancelling = false;
  this.state.currentRunId = undefined;
  this.currentRunId = undefined;

  this.messageStore.updateLastMessage((msg) => ({
    ...msg,
    cancelled: true,
  }));

  this.emit('run:cancelled', { runId, sessionId });
  this.emit('stream:end');
  this.emit('message:update', this.messageStore.getMessages());
  this.emit('state:change', this.getState());
}

/**
 * Get current run ID (if streaming)
 */
getCurrentRunId(): string | undefined {
  return this.currentRunId;
}
```

7. **Update continueRun similarly** (add AbortController and signal support).

**File: `packages/core/src/managers/config-manager.ts`**

Add method to build cancel URL:

```typescript
/**
 * Get the cancel URL for a run
 */
getCancelUrl(runId: string): string | null {
  const mode = this.getMode();
  const entityId = this.getCurrentEntityId();

  if (!entityId || !runId) {
    return null;
  }

  // POST /agents/{id}/runs/{runId}/cancel
  // POST /teams/{id}/runs/{runId}/cancel
  return `${this.config.endpoint}/${mode}s/${encodeURIComponent(entityId)}/runs/${encodeURIComponent(runId)}/cancel`;
}
```

**File: `packages/core/src/processors/event-processor.ts`**

Add `RunCancelled` to the switch statement:

```typescript
case RunEventEnum.RunCancelled:  // ADD THIS
case RunEventEnum.RunError:
case RunEventEnum.TeamRunError:
case RunEventEnum.TeamRunCancelled:
  updatedMessage.streamingError = true;
  break;
```

Note: Actually for `RunCancelled`, we might want to set `cancelled: true` instead of `streamingError: true`. But since the client handles `RunCancelled` before calling processChunk, this may not be reached. Consider the flow carefully.

### Phase 3: React Package (`packages/react/`)

**File: `packages/react/src/hooks/useAgnoChat.ts`**

```typescript
export function useAgnoChat() {
  const client = useAgnoClient();
  const [messages, setMessages] = useState<ChatMessage[]>(client.getMessages());
  const [state, setState] = useState<ClientState>(client.getState());
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    // ... existing handlers

    // Add cancelled handler
    const handleRunCancelled = (event: { runId?: string; sessionId?: string }) => {
      // Optionally handle cancellation specifically
      // State is already updated via state:change
    };

    // ... existing subscriptions
    client.on('run:cancelled', handleRunCancelled);

    return () => {
      // ... existing unsubscriptions
      client.off('run:cancelled', handleRunCancelled);
    };
  }, [client]);

  /**
   * Cancel the current run
   */
  const cancelRun = useCallback(async () => {
    try {
      await client.cancelRun();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    }
  }, [client]);

  return {
    messages,
    sendMessage,
    clearMessages,
    cancelRun,                              // ADD
    isStreaming: state.isStreaming,
    isRefreshing: state.isRefreshing,
    isPaused: state.isPaused,
    isCancelling: state.isCancelling,       // ADD
    currentRunId: state.currentRunId,       // ADD (optional)
    error,
    state,
  };
}
```

---

## Edge Cases & Error Handling

### Edge Cases to Handle

| Scenario | Handling |
|----------|----------|
| Cancel called when not streaming | Throw error: "No active run to cancel" |
| Cancel called without run ID | Throw error: "No run ID available" |
| Network error during cancel request | Log warning, still cleanup local state |
| Backend returns error on cancel | Log warning, still cleanup local state |
| Run completes while cancel in flight | `onComplete` runs, ignore cancel response |
| Multiple rapid cancel calls | Guard with `isCancelling` flag |
| Cancel during HITL pause | Should work - abort local, call cancel endpoint |
| Cancel for teams | Works same as agents (unlike HITL which is agent-only) |

### State Cleanup Guarantees

The implementation must ensure state is always cleaned up, even on errors:

```typescript
// Always cleanup, regardless of backend response
finally {
  this.state.isStreaming = false;
  this.state.isCancelling = false;
  this.state.currentRunId = undefined;
  this.currentRunId = undefined;
  this.abortController = undefined;
}
```

---

## Testing Plan

### Unit Tests

1. **cancelRun throws when not streaming**
2. **cancelRun throws when no run ID**
3. **cancelRun aborts AbortController**
4. **cancelRun calls cancel endpoint**
5. **cancelRun cleans up state on success**
6. **cancelRun cleans up state on network error**
7. **handleChunk tracks currentRunId on RunStarted**
8. **handleChunk handles RunCancelled event**
9. **React hook exposes cancelRun**
10. **React hook exposes isCancelling state**

### Integration Tests

1. **Full cancel flow: send message → cancel → verify state**
2. **Cancel during tool execution (HITL)**
3. **Cancel with custom headers/params**
4. **Rapid send/cancel cycles**
5. **Cancel after component unmount (no memory leaks)**

### Manual Testing

1. Start long-running agent task
2. Click cancel button mid-stream
3. Verify:
   - Stream stops immediately
   - UI shows cancelled state (not error)
   - Backend resources freed
   - Can start new message immediately

---

## Documentation Updates

### Files to Update

1. **`packages/core/README.md`** - Add cancelRun documentation
2. **`packages/react/README.md`** - Add React hook cancelRun docs
3. **`CLAUDE.md`** - Add cancellation to API endpoints list
4. **Root `README.md`** - Mention cancellation feature

### Example Documentation

```markdown
### Cancelling a Run

You can cancel an ongoing run at any time:

\`\`\`typescript
// Core client
if (client.getState().isStreaming) {
  await client.cancelRun();
}

// React hook
const { cancelRun, isStreaming, isCancelling } = useAgnoChat();

<button
  onClick={cancelRun}
  disabled={!isStreaming || isCancelling}
>
  Cancel
</button>
\`\`\`

Cancellation will:
1. Immediately abort the fetch stream (instant UI feedback)
2. Notify the backend to stop processing
3. Mark the message as cancelled (not an error)
4. Emit a 'run:cancelled' event
\`\`\`

---

## Implementation Checklist

### Types Package
- [ ] Add `currentRunId` to `ClientState`
- [ ] Add `isCancelling` to `ClientState`
- [ ] Add `signal` to `StreamOptions`
- [ ] Add `'run:cancelled'` to `ClientEvent`
- [ ] Add `cancelled` to `ChatMessage`

### Core Package
- [ ] Add `currentRunId` private field to `AgnoClient`
- [ ] Add `abortController` private field to `AgnoClient`
- [ ] Track run ID in `handleChunk` on `RunStarted`
- [ ] Handle `RunCancelled` event in `handleChunk`
- [ ] Add `handleRunCancelled` method
- [ ] Add `handleLocalCancellation` method
- [ ] Add `cancelRun` public method
- [ ] Add `getCurrentRunId` public method
- [ ] Update `sendMessage` to create/use AbortController
- [ ] Update `sendMessage` to pass signal to streamResponse
- [ ] Update `continueRun` similarly
- [ ] Add `getCancelUrl` to ConfigManager
- [ ] Add `RunCancelled` to EventProcessor switch (for completeness)

### React Package
- [ ] Add `cancelRun` to `useAgnoChat`
- [ ] Expose `isCancelling` from `useAgnoChat`
- [ ] Listen to `'run:cancelled'` event
- [ ] Update types export

### Documentation
- [ ] Update `packages/core/README.md`
- [ ] Update `packages/react/README.md`
- [ ] Update `CLAUDE.md` with cancel endpoint
- [ ] Update root `README.md`

### Testing
- [ ] Unit tests for cancelRun
- [ ] Unit tests for state tracking
- [ ] Integration tests
- [ ] Manual testing

---

## Design Decisions (Resolved)

1. **Team Cancel Endpoint**: Confirmed - both agents and teams support cancellation via `POST /{type}s/{id}/runs/{run_id}/cancel`

2. **Cancel Response Format**: Returns 200 OK on success with no specific payload to parse

3. **Partial Content**: Keep partial streamed content, marked as `cancelled: true` - allows users to see what was generated before cancellation

4. **Session Behavior**: Keep session after cancellation - the session is still valid and user can continue the conversation

5. **Graceful Cancellation**: Backend cancellation may not be immediate - client should cleanup local state immediately for responsive UI while backend finishes

## Future Considerations

1. **Retry After Cancel**: Consider adding a `retryLastMessage()` convenience method in a future iteration

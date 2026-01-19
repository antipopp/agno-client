# 8. Tool Execution Basics

> **Prerequisites**: [01-07 Getting Started through React Chat UI](./01_getting_started.md)
> **Packages**: `@antipopp/agno-client`, `@antipopp/agno-react`

## Overview

This cookbook introduces Human-in-the-Loop (HITL) frontend tool execution. HITL allows agents to delegate specific tools to the frontend for execution, enabling browser-based operations, user interactions, and client-side logic.

**Important:** HITL is only supported for **agents**, not teams. Teams do not have a `/continue` endpoint.

## How HITL Works

1. Agent calls a tool marked with `external_execution=True` on the backend
2. Backend emits `RunPaused` event with tools awaiting execution
3. Client receives the event and updates state (`isPaused: true`)
4. Frontend executes the tools using registered handlers
5. Frontend calls `continueRun(toolResults)` to resume the agent
6. Backend continues processing with the results

## Core Client

### Basic Tool Execution

```typescript
import { AgnoClient, ToolCall } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

// Listen for paused runs
client.on('run:paused', async (event) => {
  console.log('Run paused, tools awaiting execution:', event.tools);

  // Execute each tool
  const executedTools: ToolCall[] = await Promise.all(
    event.tools.map(async (tool) => {
      const result = await executeToolLocally(tool);
      return {
        ...tool,
        result: JSON.stringify(result),
      };
    })
  );

  // Continue the run with results
  await client.continueRun(executedTools);
});

client.on('run:continued', () => {
  console.log('Run resumed');
});

// Local tool execution
async function executeToolLocally(tool: ToolCall): Promise<any> {
  switch (tool.tool_name) {
    case 'get_current_url':
      return { url: window.location.href };

    case 'get_user_timezone':
      return { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };

    case 'show_notification':
      new Notification(tool.tool_args.title, { body: tool.tool_args.message });
      return { shown: true };

    default:
      return { error: `Unknown tool: ${tool.tool_name}` };
  }
}
```

### Checking Paused State

```typescript
import { AgnoClient } from '@antipopp/agno-client';

const client = new AgnoClient({
  endpoint: 'http://localhost:7777',
  mode: 'agent',
  agentId: 'my-agent',
});

// Check state at any time
const state = client.getState();
console.log('Is paused:', state.isPaused);
console.log('Paused run ID:', state.pausedRunId);
console.log('Tools awaiting:', state.toolsAwaitingExecution);
```

## React

### useAgnoToolExecution Hook

```tsx
import { useAgnoToolExecution, ToolHandler } from '@antipopp/agno-react';

function Chat() {
  // Define tool handlers
  const handlers: Record<string, ToolHandler> = {
    // Simple tool - returns data
    get_current_url: async () => {
      return { url: window.location.href };
    },

    // Tool with arguments
    navigate_to_page: async (args) => {
      window.location.href = args.url;
      return { navigated: true };
    },

    // Async tool
    fetch_local_storage: async (args) => {
      const value = localStorage.getItem(args.key);
      return { key: args.key, value };
    },
  };

  const {
    isPaused,           // Run is paused awaiting tool execution
    isExecuting,        // Tools are currently being executed
    pendingTools,       // Tools waiting to be executed
    executeAndContinue, // Execute all pending tools and continue
    executionError,     // Error from execution, if any
  } = useAgnoToolExecution(handlers, true); // true = auto-execute

  // With autoExecute=true (default), tools are executed automatically
  // when the run pauses - no manual intervention needed

  return (
    <div>
      {isPaused && <div>Processing tools...</div>}
      {isExecuting && <div>Executing...</div>}
      {executionError && <div>Error: {executionError}</div>}
    </div>
  );
}
```

### Manual Tool Execution

```tsx
import { useAgnoToolExecution } from '@antipopp/agno-react';

function Chat() {
  const handlers = {
    delete_file: async (args) => {
      // This will be executed manually, not automatically
      await fs.unlink(args.path);
      return { deleted: true };
    },
  };

  const {
    isPaused,
    pendingTools,
    executeAndContinue,
    isExecuting,
  } = useAgnoToolExecution(handlers, false); // false = manual execution

  // Show approval UI when paused
  if (isPaused && pendingTools.length > 0) {
    return (
      <div className="approval-dialog">
        <h3>Tools require approval</h3>
        <ul>
          {pendingTools.map((tool) => (
            <li key={tool.tool_call_id}>
              <strong>{tool.tool_name}</strong>
              <pre>{JSON.stringify(tool.tool_args, null, 2)}</pre>
            </li>
          ))}
        </ul>
        <button
          onClick={() => executeAndContinue()}
          disabled={isExecuting}
        >
          {isExecuting ? 'Executing...' : 'Approve & Execute'}
        </button>
      </div>
    );
  }

  return <ChatUI />;
}
```

### Common Tool Handler Patterns

```tsx
import { useAgnoToolExecution } from '@antipopp/agno-react';

function App() {
  const handlers = {
    // Browser information
    get_browser_info: async () => ({
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookiesEnabled: navigator.cookieEnabled,
    }),

    // Geolocation (requires permission)
    get_location: async () => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
          (err) => reject(new Error(err.message))
        );
      });
    },

    // Clipboard operations
    copy_to_clipboard: async (args) => {
      await navigator.clipboard.writeText(args.text);
      return { copied: true };
    },

    read_clipboard: async () => {
      const text = await navigator.clipboard.readText();
      return { text };
    },

    // Local storage
    set_local_storage: async (args) => {
      localStorage.setItem(args.key, args.value);
      return { success: true };
    },

    get_local_storage: async (args) => {
      return { value: localStorage.getItem(args.key) };
    },

    // DOM interaction
    get_element_text: async (args) => {
      const el = document.querySelector(args.selector);
      return { text: el?.textContent || null };
    },

    click_element: async (args) => {
      const el = document.querySelector(args.selector) as HTMLElement;
      el?.click();
      return { clicked: !!el };
    },

    // Form filling
    fill_form_field: async (args) => {
      const input = document.querySelector(args.selector) as HTMLInputElement;
      if (input) {
        input.value = args.value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return { filled: true };
      }
      return { filled: false, error: 'Element not found' };
    },

    // API calls from browser
    fetch_url: async (args) => {
      const response = await fetch(args.url, {
        method: args.method || 'GET',
        headers: args.headers || {},
        body: args.body,
      });
      return {
        status: response.status,
        data: await response.json(),
      };
    },
  };

  useAgnoToolExecution(handlers);

  return <Chat />;
}
```

### Error Handling in Tool Handlers

```tsx
import { useAgnoToolExecution } from '@antipopp/agno-react';

function App() {
  const handlers = {
    risky_operation: async (args) => {
      try {
        const result = await performRiskyOperation(args);
        return { success: true, result };
      } catch (error) {
        // Return error as result - don't throw
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },

    // Timeout wrapper
    slow_operation: async (args) => {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), 30000)
      );

      try {
        const result = await Promise.race([
          performSlowOperation(args),
          timeout,
        ]);
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  };

  const { executionError } = useAgnoToolExecution(handlers);

  if (executionError) {
    console.error('Tool execution failed:', executionError);
  }

  return <Chat />;
}
```

## ToolCall Structure

```typescript
interface ToolCall {
  tool_call_id: string;      // Unique identifier
  tool_name: string;         // Name of the tool to execute
  tool_args: Record<string, any>; // Arguments from the agent
  content: string | null;    // Result after execution
  result?: any;              // Alternative result field
  external_execution?: boolean; // Marked for frontend execution
  requires_confirmation?: boolean; // Needs user approval
  // ... other fields
}
```

## Backend Setup (Python/Agno)

To enable frontend tool execution, mark tools with `external_execution=True`:

```python
from agno import Agent, tool

@tool(external_execution=True)
def get_current_url() -> str:
    """Get the current page URL from the browser."""
    pass  # Executed on frontend

@tool(external_execution=True)
def show_notification(title: str, message: str) -> dict:
    """Show a browser notification to the user."""
    pass  # Executed on frontend

agent = Agent(
    tools=[get_current_url, show_notification],
    # ...
)
```

## Key Points

- **HITL is agent-only** - Teams do not support the continue endpoint
- Use `useAgnoToolExecution(handlers, autoExecute)` to register tool handlers
- `autoExecute=true` (default) executes tools immediately when run pauses
- `autoExecute=false` requires manual approval via `executeAndContinue()`
- Return results as objects - they're automatically JSON-stringified
- Always handle errors gracefully in tool handlers
- Tool handlers receive `args: Record<string, any>` from the agent

## Next Steps

Continue to [09. Tool Execution Advanced](./09_tool_execution_advanced.md) for global handlers, manual flows, and advanced patterns.

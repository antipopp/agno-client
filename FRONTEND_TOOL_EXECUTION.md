# Frontend Tool Execution (HITL)

This guide shows how to use the Human-in-the-Loop (HITL) frontend tool execution feature in the Agno Client.

## Overview

Frontend tool execution allows your Agno agents to delegate specific tools to the frontend application. This is useful for:

- **UI Automation**: Navigate pages, fill forms, click buttons
- **Browser APIs**: Geolocation, notifications, local storage
- **User Confirmation**: Show dialogs and get user approval
- **External Integrations**: Call APIs not accessible from the backend

## How It Works

1. Agent calls a tool marked with `external_execution=True` on the backend
2. The run **pauses** and emits a `RunPaused` event with tools awaiting execution
3. Frontend executes the tools using your custom handlers
4. Frontend calls `continueRun()` with tool results
5. Agent continues with the results

## Basic Example

### 1. Define Tool Handlers

```tsx
import { useAgnoToolExecution, ToolHandler } from '@antipopp/agno-react';

function ChatComponent() {
  // Define handlers for frontend-executable tools
  const toolHandlers: Record<string, ToolHandler> = {
    // Navigate to a page
    navigate_to_page: async (args: { url: string }) => {
      window.location.href = args.url;
      return { success: true, url: args.url };
    },

    // Fill a form field
    fill_form: async (args: { selector: string; value: string }) => {
      const element = document.querySelector(args.selector) as HTMLInputElement;
      if (element) {
        element.value = args.value;
        return { success: true, filled: args.value };
      }
      return { success: false, error: 'Element not found' };
    },

    // Click an element
    click_button: async (args: { selector: string }) => {
      const element = document.querySelector(args.selector);
      if (element) {
        (element as HTMLElement).click();
        return { success: true };
      }
      return { success: false, error: 'Button not found' };
    },

    // Get user location
    get_location: async () => {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            resolve({ error: error.message });
          }
        );
      });
    },

    // Show notification
    show_notification: async (args: { title: string; body: string }) => {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(args.title, { body: args.body });
          return { success: true };
        }
      }
      return { success: false, error: 'Notifications not supported' };
    },
  };

  // Auto-execute tools when the agent requests them
  const { isPaused, isExecuting, pendingTools, executionError } =
    useAgnoToolExecution(toolHandlers);

  const { messages, sendMessage, isStreaming } = useAgnoChat();

  return (
    <div>
      <div className="messages">
        {messages.map((msg, i) => (
          <Message key={i} {...msg} />
        ))}
      </div>

      {isPaused && (
        <div className="tool-execution-status">
          ⚙️ Executing {pendingTools.length} tools...
        </div>
      )}

      {executionError && (
        <div className="error">Tool execution failed: {executionError}</div>
      )}

      <input
        type="text"
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            sendMessage(e.currentTarget.value);
            e.currentTarget.value = '';
          }
        }}
        disabled={isStreaming || isPaused}
      />
    </div>
  );
}
```

## Manual Execution (User Confirmation)

For sensitive operations, you may want manual approval:

```tsx
function ChatWithConfirmation() {
  const toolHandlers: Record<string, ToolHandler> = {
    delete_data: async (args: { table: string; count: number }) => {
      // This will be executed only after user confirms
      await fetch('/api/delete', {
        method: 'POST',
        body: JSON.stringify(args),
      });
      return { deleted: args.count };
    },
  };

  // Disable auto-execution
  const {
    isPaused,
    pendingTools,
    executeAndContinue,
    continueWithResults,
  } = useAgnoToolExecution(toolHandlers, false); // autoExecute: false

  const handleApprove = async () => {
    await executeAndContinue();
  };

  const handleReject = async () => {
    // Continue with rejection results
    const rejectedTools = pendingTools.map(tool => ({
      ...tool,
      result: JSON.stringify({ rejected: true, reason: 'User declined' })
    }));
    await continueWithResults(rejectedTools);
  };

  return (
    <div>
      {/* ... messages ... */}

      {isPaused && (
        <div className="confirmation-dialog">
          <h3>Agent wants to execute:</h3>
          {pendingTools.map((tool, i) => (
            <div key={i}>
              <strong>{tool.tool_name}</strong>
              <pre>{JSON.stringify(tool.tool_args, null, 2)}</pre>
            </div>
          ))}
          <button onClick={handleApprove}>✅ Approve</button>
          <button onClick={handleReject}>❌ Reject</button>
        </div>
      )}
    </div>
  );
}
```

## Backend Setup (Python)

Define tools with `external_execution=True`:

```python
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.tools import tool

@tool(external_execution=True)
def navigate_to_page(url: str) -> str:
    """Navigate to a specific page in the browser.

    Args:
        url: The URL to navigate to

    Returns:
        str: Result from the frontend
    """
    # This function body won't execute - it's just for documentation
    return ""

@tool(external_execution=True)
def fill_form(selector: str, value: str) -> str:
    """Fill a form field in the browser.

    Args:
        selector: CSS selector for the form field
        value: Value to fill

    Returns:
        str: Result from the frontend
    """
    return ""

agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[navigate_to_page, fill_form],
    instructions=[
        "You can interact with the user's browser.",
        "Use navigate_to_page to navigate.",
        "Use fill_form to fill forms."
    ],
)
```

## Advanced: Custom Tool Result Processing

```tsx
function AdvancedToolExecution() {
  const toolHandlers: Record<string, ToolHandler> = {
    complex_operation: async (args) => {
      // Execute multiple steps
      const step1 = await doSomething(args);
      const step2 = await doSomethingElse(step1);

      return {
        success: true,
        steps: [step1, step2],
        timestamp: Date.now(),
      };
    },
  };

  const { executeTools, continueWithResults } = useAgnoToolExecution(
    toolHandlers,
    false
  );

  const handleCustomExecution = async (tools: ToolCall[]) => {
    // Execute tools manually
    const executedTools = await executeTools(tools);

    // Post-process results
    const processedTools = executedTools.map(tool => ({
      ...tool,
      result: JSON.stringify({
        ...JSON.parse(tool.result || '{}'),
        processed_at: new Date().toISOString(),
      }),
    }));

    // Continue with processed results
    await continueWithResults(processedTools);
  };

  // ... rest of component
}
```

## Hook API Reference

### `useAgnoToolExecution(handlers, autoExecute?)`

**Parameters:**
- `handlers`: Record of tool names to handler functions
- `autoExecute`: Whether to automatically execute tools (default: `true`)

**Returns:**
- `isPaused`: Whether the run is paused awaiting execution
- `isExecuting`: Whether tools are currently being executed
- `pendingTools`: Array of tools awaiting execution
- `executeAndContinue`: Execute all pending tools and continue the run
- `executeTools`: Execute specific tools without continuing (for manual processing)
- `continueWithResults`: Continue the run with manually provided tool results
- `executionError`: Error message if execution failed

## Tool Result Format

Tool results should be stringified JSON. The result can be:

```typescript
// Simple string
tool.result = "Operation completed successfully";

// JSON object (will be stringified)
tool.result = JSON.stringify({ success: true, data: {...} });

// Error
tool.result = JSON.stringify({ error: "Something went wrong" });
```

## Best Practices

1. **Error Handling**: Always catch errors in tool handlers and return error objects
2. **Validation**: Validate tool arguments before execution
3. **Security**: Only expose safe operations as frontend tools
4. **Feedback**: Show UI feedback when tools are executing (loading states)
5. **Logging**: Log tool executions for debugging

## Debugging

Enable debug logs:

```typescript
// The hook logs to console automatically
// Check browser console for:
// [useAgnoToolExecution] Run paused, tools: [...]
// [useAgnoToolExecution] Executing tool: tool_name
// [useAgnoToolExecution] Tool result: {...}
```

## Common Patterns

### Pattern 1: UI Automation
```typescript
const uiTools = {
  click: async (args) => { /* click element */ },
  type: async (args) => { /* type text */ },
  scroll: async (args) => { /* scroll page */ },
};
```

### Pattern 2: Browser APIs
```typescript
const browserTools = {
  get_location: async () => { /* geolocation */ },
  save_to_storage: async (args) => { /* localStorage */ },
  take_screenshot: async () => { /* capture screen */ },
};
```

### Pattern 3: User Interaction
```typescript
const interactionTools = {
  ask_confirmation: async (args) => { /* show dialog */ },
  get_user_input: async (args) => { /* prompt user */ },
  show_alert: async (args) => { /* display alert */ },
};
```

## API Compatibility

This implementation is compatible with Agno's HITL API:

- ✅ `external_execution=True` tools
- ✅ `requires_confirmation=True` tools
- ✅ `requires_user_input=True` tools
- ✅ Continue endpoint: `POST /agents/{id}/runs/{run_id}/continue`
- ✅ Tool result format: `tool.result` field

## Next Steps

1. Define your frontend-executable tools on the backend
2. Create corresponding handlers in your React component
3. Use `useAgnoToolExecution` hook to handle tool execution
4. Test the flow with your agent

For more examples, see the AGUI documentation on frontend tool execution.

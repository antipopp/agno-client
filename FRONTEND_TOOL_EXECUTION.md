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

### Pattern 4: React Router Navigation + Form Filling

This pattern is useful for AI-assisted form filling across different routes in a React Router application. It combines global tool handlers for navigation with page-specific handlers for form manipulation.

#### Architecture Overview

```
GlobalToolHandlers (navigation-aware)
├── Stores data in sessionStorage
├── Navigates using React Router (no page refresh)
└── Delegates to page-specific handler if already on page

Page Component (with react-hook-form)
├── Reads sessionStorage on mount
├── Applies data using form.reset()
├── Provides local handler for direct updates
└── Uses form.setValue() for field updates
```

#### Implementation

**1. Global Tool Handler with React Router Navigation:**

```tsx
// GlobalToolHandlers.tsx
import { type ReactNode, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ToolHandlerProvider, type ToolHandler } from '@antipopp/agno-react'

export function GlobalToolHandlers({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()

  const globalToolHandlers: Record<string, ToolHandler> = useMemo(
    () => ({
      fill_report_form: async (args: Record<string, any>) => {
        // Parse YAML args if needed (some agents send string format)
        let parsedArgs: any = args
        if (typeof args === 'string') {
          const pairs = (args as string).split(', ')
          parsedArgs = {}
          for (const pair of pairs) {
            const [key, ...valueParts] = pair.split(': ')
            parsedArgs[key.trim()] = valueParts.join(': ').trim()
          }
        }

        // Store data for the page to pick up
        sessionStorage.setItem('pendingReportData', JSON.stringify(parsedArgs))

        // Navigate using React Router (preserves app state)
        if (!location.pathname.includes('/reports/new')) {
          navigate('/reports/new')
          return { success: true, message: 'Navigating to report form...', navigated: true }
        }

        return { success: true, message: 'Form data ready to be applied', ...parsedArgs }
      },
    }),
    [navigate, location.pathname]
  )

  return <ToolHandlerProvider handlers={globalToolHandlers}>{children}</ToolHandlerProvider>
}
```

**2. Form Component with React Hook Form:**

```tsx
// NewReport.tsx
import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAgnoToolExecution, type ToolHandler } from '@antipopp/agno-react'

const formSchema = z.object({
  name: z.string().min(1, 'Report name is required'),
  description: z.string().optional(),
  category: z.enum(['financial', 'sales', 'marketing', 'customer', 'product']),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
})

type FormValues = z.infer<typeof formSchema>

export function NewReport() {
  const navigate = useNavigate()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      category: undefined,
      startDate: '',
      endDate: '',
    },
  })

  // Apply data from sessionStorage (set by global handler during navigation)
  useEffect(() => {
    const pendingData = sessionStorage.getItem('pendingReportData')
    if (pendingData) {
      try {
        const data = JSON.parse(pendingData)
        sessionStorage.removeItem('pendingReportData') // Clear to prevent re-application

        // Use form.reset() to apply all fields atomically
        form.reset({
          name: data.name || '',
          description: data.description || '',
          category: data.category || undefined,
          startDate: data.start_date || '',
          endDate: data.end_date || '',
        })
      } catch (error) {
        console.error('Failed to apply pending report data:', error)
      }
    }
  }, [form])

  // Local tool handler (overrides global when on this page)
  const toolHandlers: Record<string, ToolHandler> = useMemo(() => ({
    fill_report_form: async (args: Record<string, any>) => {
      try {
        // Use form.setValue() for individual field updates
        if (args.name) form.setValue('name', args.name)
        if (args.description) form.setValue('description', args.description)
        if (args.category) form.setValue('category', args.category)
        if (args.start_date) form.setValue('startDate', args.start_date)
        if (args.end_date) form.setValue('endDate', args.end_date)

        return {
          success: true,
          message: 'Form filled successfully',
          filled_fields: Object.keys(args),
        }
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to fill form' }
      }
    },
  }), [form])

  // Enable auto-execution
  const { isPaused, isExecuting, pendingTools } = useAgnoToolExecution(toolHandlers, true)

  const onSubmit = (_data: FormValues) => {
    navigate('/reports')
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Tool execution status indicator */}
      {(isPaused || isExecuting) && (
        <div className="execution-status">
          {isExecuting
            ? `AI is filling the form (${pendingTools.length} tool(s))...`
            : 'AI Assistant Ready'
          }
        </div>
      )}

      {/* Form fields using Controller */}
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <div>
            <label>Report Name</label>
            <input {...field} aria-invalid={fieldState.invalid} />
            {fieldState.error && <p>{fieldState.error.message}</p>}
          </div>
        )}
      />

      {/* ... other fields ... */}

      <button type="submit">Create Report</button>
    </form>
  )
}
```

**3. App Setup:**

```tsx
// main.tsx
import { BrowserRouter } from 'react-router-dom'
import { AgnoProvider } from '@antipopp/agno-react'
import { GlobalToolHandlers } from './components/GlobalToolHandlers'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <GlobalToolHandlers>
        <AgnoProvider config={{ endpoint: 'http://localhost:7777', mode: 'agent', agentId: 'my-agent' }}>
          <App />
        </AgnoProvider>
      </GlobalToolHandlers>
    </BrowserRouter>
  </StrictMode>
)
```

#### Why This Pattern Works

1. **No Page Refresh**: React Router's `navigate()` preserves chat context and app state
2. **React Strict Mode Safe**: `form.reset()` handles React 18's double-render correctly
3. **Handler Priority**: Page-specific handlers override global handlers when active
4. **Type Safety**: Zod schema provides runtime validation and TypeScript types
5. **Reliable State**: React Hook Form's internal state is resilient to re-renders

#### Key Differences from Basic Pattern

- **Global + Local Handlers**: Global handles navigation, local handles direct updates
- **SessionStorage Bridge**: Transfers data across route changes without URL params
- **React Hook Form**: More reliable than useState for complex forms
- **Form Methods**: Use `form.reset()` for bulk updates, `form.setValue()` for individual fields

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

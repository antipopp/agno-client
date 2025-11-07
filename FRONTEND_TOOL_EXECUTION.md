# Frontend Tool Execution & Generative UI

This guide shows how to use frontend tool execution (HITL - Human-in-the-Loop) and generative UI features in the Agno Client libraries.

---

## Table of Contents

1. [Frontend Tool Execution (HITL)](#frontend-tool-execution-hitl)
2. [Generative UI](#generative-ui)
3. [Advanced Patterns](#advanced-patterns)

---

# Frontend Tool Execution (HITL)

Frontend tool execution allows your Agno agents to delegate specific tools to the frontend application for execution.

## Use Cases

- **Browser APIs**: Geolocation, notifications, local storage
- **UI Automation**: Navigate pages, fill forms, interact with DOM
- **User Confirmation**: Show dialogs and get user approval before actions
- **External Integrations**: Call APIs not accessible from backend

## How It Works

1. Backend agent calls a tool marked with `external_execution=True`
2. Agent run **pauses** and emits a `RunPaused` event
3. Frontend receives the event with tools awaiting execution
4. Frontend executes tools using your custom handlers
5. Frontend calls `continueRun()` with results
6. Agent run continues with the results

## Basic Setup

### 1. Define Backend Tools (Python)

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
        Result from the frontend execution
    """
    # Function body won't execute - it's handled by frontend

@tool(external_execution=True)
def get_user_location() -> str:
    """Get the user's current location using browser geolocation API."""

agent = Agent(
    model=OpenAIChat(id="gpt-4o-mini"),
    tools=[navigate_to_page, get_user_location],
    instructions=["You can interact with the user's browser."],
)
```

### 2. Create Frontend Tool Handlers

```tsx
import { useAgnoToolExecution, type ToolHandler } from '@antipopp/agno-react';

function ChatComponent() {
  // Define handlers for frontend-executable tools
  const toolHandlers: Record<string, ToolHandler> = {
    navigate_to_page: async (args: { url: string }) => {
      window.location.href = args.url;
      return { success: true, url: args.url };
    },

    get_user_location: async () => {
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
  };

  // Auto-execute tools when agent requests them
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
        <div className="status">
          ⚙️ Executing {pendingTools.length} tool(s)...
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

For sensitive operations, disable auto-execution and require manual approval:

```tsx
function ChatWithConfirmation() {
  const toolHandlers: Record<string, ToolHandler> = {
    delete_data: async (args: { table: string; count: number }) => {
      // Only executes after user confirms
      await fetch('/api/delete', {
        method: 'POST',
        body: JSON.stringify(args),
      });
      return { deleted: args.count };
    },
  };

  // Set autoExecute to false
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
    const rejectedTools = pendingTools.map(tool => ({
      ...tool,
      content: JSON.stringify({ rejected: true, reason: 'User declined' })
    }));
    await continueWithResults(rejectedTools);
  };

  return (
    <div>
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

## Hook API Reference

### `useAgnoToolExecution(handlers, autoExecute?)`

**Parameters:**
- `handlers`: `Record<string, ToolHandler>` - Map of tool names to handler functions
- `autoExecute`: `boolean` - Whether to automatically execute tools (default: `true`)

**Returns:**
- `isPaused`: `boolean` - Whether the run is paused awaiting execution
- `isExecuting`: `boolean` - Whether tools are currently being executed
- `pendingTools`: `ToolCall[]` - Array of tools awaiting execution
- `executeAndContinue`: `() => Promise<void>` - Execute all pending tools and continue
- `executeTools`: `(tools: ToolCall[]) => Promise<ToolCall[]>` - Execute specific tools without continuing
- `continueWithResults`: `(tools: ToolCall[]) => Promise<void>` - Continue run with manually provided results
- `executionError`: `string | undefined` - Error message if execution failed

## Global Tool Handlers

Use `ToolHandlerProvider` to define handlers available across your entire app:

```tsx
import { ToolHandlerProvider, type ToolHandler } from '@antipopp/agno-react';

function App() {
  const globalHandlers: Record<string, ToolHandler> = {
    navigate_to_page: async (args) => { /* ... */ },
    show_notification: async (args) => { /* ... */ },
  };

  return (
    <ToolHandlerProvider handlers={globalHandlers}>
      <YourAppComponents />
    </ToolHandlerProvider>
  );
}
```

Local handlers (in `useAgnoToolExecution`) override global handlers when both define the same tool.

## Best Practices

1. **Error Handling**: Always wrap tool logic in try/catch and return error objects
   ```tsx
   try {
     const result = await doSomething(args);
     return { success: true, result };
   } catch (error) {
     return { success: false, error: error.message };
   }
   ```

2. **Validation**: Validate arguments before execution
   ```tsx
   if (!args.url || !args.url.startsWith('https://')) {
     return { error: 'Invalid URL' };
   }
   ```

3. **Security**: Only expose safe operations as frontend tools. Never trust user input blindly.

4. **User Feedback**: Show loading states when `isExecuting` is true

5. **Timeout Handling**: Add timeouts for long-running operations

---

# Generative UI

Generative UI allows your agent to return rich, interactive UI components (charts, cards, tables) instead of just text.

## Overview

- **Agent-Driven**: The agent decides what to visualize based on context
- **Interactive**: Users can interact with rendered components
- **Flexible**: Supports predefined components and custom renders
- **Persistent**: UI components survive page refreshes (except custom renders)

## Architecture

UI components are stored directly in the `tool_calls` array within chat messages:

```typescript
{
  role: 'agent',
  content: "Here's your revenue data...",
  tool_calls: [
    {
      tool_name: 'render_revenue_chart',
      tool_args: { period: 'monthly' },
      content: '{"revenue": [...]}'
      ui_component: {  // ← UI component attached here
        type: 'chart',
        component: 'BarChart',
        props: { data: [...], xKey: 'month', bars: [...] }
      }
    }
  ]
}
```

## Quick Start

### 1. Backend Tool Definition

```python
from agno.agent import Agent
from agno.tools import tool

@tool(external_execution=True)
def render_revenue_chart(period: str = "monthly"):
    """Render a revenue chart for the specified period."""
    return {"period": period}

agent = Agent(tools=[render_revenue_chart])
```

### 2. Frontend Tool Handler with UI

```tsx
import { resultWithBarChart, type ToolHandler } from '@antipopp/agno-react';

const toolHandlers: Record<string, ToolHandler> = {
  render_revenue_chart: async (args: { period: string }) => {
    // Fetch data
    const data = await fetchRevenueData(args.period);
    // Example: [
    //   { month: 'Jan', revenue: 45000, expenses: 32000 },
    //   { month: 'Feb', revenue: 52000, expenses: 34000 },
    // ]

    // Return data + UI specification
    return resultWithBarChart(
      data,
      'month', // x-axis key
      [
        { key: 'revenue', label: 'Revenue', color: 'hsl(var(--chart-1))' },
        { key: 'expenses', label: 'Expenses', color: 'hsl(var(--chart-2))' },
      ],
      {
        title: `Revenue vs Expenses - ${args.period}`,
        description: 'Monthly financial overview',
        layout: 'artifact', // Display in artifact container
      }
    );
  },
};

useAgnoToolExecution(toolHandlers);
```

### 3. Register UI Components (One-time Setup)

```tsx
import { registerGenerativeUIComponents } from '@/components/generative-ui';
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    registerGenerativeUIComponents();
  }, []);

  return <YourChatInterface />;
}
```

That's it! When the agent calls `render_revenue_chart`, the chart appears in the chat.

## Available UI Components

### Charts

Create charts using the `resultWith*` helpers or manual `create*` functions:

```tsx
import {
  resultWithBarChart,
  resultWithSmartChart,
  createBarChart,
  createLineChart,
  createPieChart,
  createAreaChart,
  createToolResult,
} from '@antipopp/agno-react';

// Option 1: Use resultWith* helper (returns ToolHandlerResult)
return resultWithBarChart(data, 'month', [
  { key: 'sales', label: 'Sales', color: '#8884d8' },
]);

// Option 2: Manually create chart + wrap in result
const chartSpec = createLineChart(data, 'date', [
  { key: 'value', label: 'Value', color: '#82ca9d' },
]);
return createToolResult(data, chartSpec);

// Option 3: Smart chart (auto-detects best type)
return resultWithSmartChart(data, {
  title: 'Sales Analysis',
  preferredType: 'line', // or let it auto-detect
});
```

#### Chart Types

- **Bar Chart**: `createBarChart(data, xKey, bars, options?)`
- **Line Chart**: `createLineChart(data, xKey, lines, options?)`
- **Pie Chart**: `createPieChart(data, dataKey, nameKey, options?)`
- **Area Chart**: `createAreaChart(data, xKey, areas, options?)`
- **Smart Chart**: `createSmartChart(data, options?)` - Auto-detects best type

### Card Grids

Display items as a responsive grid of cards:

```tsx
import { resultWithCardGrid, createCard } from '@antipopp/agno-react';

const cars = [
  createCard('car-1', 'Tesla Model 3', 'Electric sedan with autopilot', {
    image: 'https://example.com/tesla.jpg',
    metadata: {
      Price: '$89/day',
      Seats: '5',
      Type: 'Electric',
    },
    actions: [
      { label: 'Book Now', variant: 'default', onClick: 'book_car:car-1' },
      { label: 'Details', variant: 'outline', onClick: 'view_details:car-1' },
    ],
  }),
  // ... more cards
];

return resultWithCardGrid(cars, {
  title: 'Available Rental Cars',
  columns: { default: 1, md: 2, lg: 3 }, // Responsive columns
  variant: 'elevated', // or 'flat', 'outlined'
});
```

### Tables

Create sortable, filterable tables:

```tsx
import { resultWithTable, createColumn } from '@antipopp/agno-react';

const data = [
  { name: 'MacBook Pro', price: 2499, ram: '32GB', rating: 4.8 },
  { name: 'Dell XPS 15', price: 1899, ram: '32GB', rating: 4.6 },
];

const columns = [
  createColumn('name', 'Product', { sortable: true }),
  createColumn('price', 'Price', {
    sortable: true,
    cellType: 'number',
    format: { type: 'currency', currency: 'USD' },
  }),
  createColumn('ram', 'RAM'),
  createColumn('rating', 'Rating', {
    sortable: true,
    cellType: 'number',
  }),
];

return resultWithTable(data, columns, {
  title: 'Product Comparison',
  sortable: true,
});
```

## Tool Handler Result Format

Tool handlers can return three formats:

### 1. ToolHandlerResult (Recommended)

```tsx
import type { ToolHandlerResult } from '@antipopp/agno-react';

return {
  data: { revenue: 50000, expenses: 32000 }, // Sent back to agent
  ui: chartSpec, // UI component to render
};
```

### 2. Direct UI Spec

```tsx
// Just return the UI spec - data extracted from spec
return {
  type: 'chart',
  component: 'BarChart',
  props: { data: [...] },
};
```

### 3. Plain Data (Legacy)

```tsx
// No UI - just data as string or object
return { success: true, result: '...' };
```

## Layout Options

Control where UI components appear:

```tsx
{
  layout: 'inline',    // Appears directly in message flow
  // or
  layout: 'artifact',  // Appears in bordered artifact container (recommended for charts/tables)
}
```

## Custom Render Functions

For one-off complex UI, use custom render functions:

```tsx
return {
  data: myData,
  ui: {
    type: 'custom',
    render: () => (
      <div className="custom-dashboard">
        <h3>Custom Dashboard</h3>
        {/* Your custom JSX */}
      </div>
    ),
  },
};
```

**⚠️ Important:** Custom renders don't persist across page refreshes (not serializable). Use predefined components when possible.

## Complete Example

```tsx
// Backend (Python)
from agno.agent import Agent
from agno.tools import tool

@tool(external_execution=True)
def analyze_sales(period: str, visualization: str = "auto"):
    """Analyze sales data and visualize it."""
    return {"period": period, "visualization": visualization}

agent = Agent(tools=[analyze_sales])

// Frontend (React)
import {
  resultWithBarChart,
  resultWithTable,
  createColumn,
  type ToolHandler,
} from '@antipopp/agno-react';

const toolHandlers: Record<string, ToolHandler> = {
  analyze_sales: async (args: { period: string; visualization: string }) => {
    // Fetch sales data
    const data = await fetchSalesData(args.period);

    // Agent decides visualization type
    if (args.visualization === 'chart') {
      return resultWithBarChart(
        data,
        'month',
        [
          { key: 'sales', label: 'Sales', color: 'hsl(var(--chart-1))' },
          { key: 'target', label: 'Target', color: 'hsl(var(--chart-2))' },
        ],
        {
          title: `Sales Performance - ${args.period}`,
          description: 'Actual vs Target',
          layout: 'artifact',
        }
      );
    }

    // Default: table view
    return resultWithTable(
      data,
      [
        createColumn('month', 'Month', { sortable: true }),
        createColumn('sales', 'Sales', {
          sortable: true,
          cellType: 'number',
          format: { type: 'currency', currency: 'USD' },
        }),
        createColumn('target', 'Target', {
          sortable: true,
          cellType: 'number',
          format: { type: 'currency', currency: 'USD' },
        }),
      ],
      {
        title: `Sales Data - ${args.period}`,
        sortable: true,
        layout: 'artifact',
      }
    );
  },
};

function ChatInterface() {
  useAgnoToolExecution(toolHandlers);
  return <YourChatUI />;
}
```

## Best Practices

### 1. Let the Agent Decide

Give the agent parameters to choose the best visualization:

```python
@tool(external_execution=True)
def visualize(data_type: str, time_range: str):
    """
    Visualize data based on type.
    - 'trend': Use line chart for time-series
    - 'comparison': Use bar chart for categories
    - 'distribution': Use pie chart for proportions
    """
    return {"data_type": data_type, "time_range": time_range}
```

### 2. Use Smart Charts

When unsure, use `resultWithSmartChart` - it auto-detects the best chart type:

```tsx
return resultWithSmartChart(data, {
  title: 'Data Analysis',
  // Automatically chooses bar/line/pie based on data structure
});
```

### 3. Provide Context

Always include titles and descriptions:

```tsx
{
  title: 'Q1 Revenue Performance',
  description: 'Compared to Q1 2023',
}
```

### 4. Use Artifact Layout for Complex Visuals

Charts and tables look better in artifact containers:

```tsx
{
  layout: 'artifact', // Bordered container with shadow
}
```

### 5. Handle Errors Gracefully

```tsx
try {
  const data = await fetchData(args);
  return resultWithBarChart(data, 'x', [{ key: 'y' }]);
} catch (error) {
  return {
    data: { error: error.message },
    // No UI - agent will receive error data
  };
}
```

---

# Advanced Patterns

## Pattern 1: React Router Navigation + Form Filling

Combine navigation with form filling across routes without page refreshes:

```tsx
// Global handler (navigation-aware)
import { useNavigate, useLocation } from 'react-router-dom';

function GlobalToolHandlers({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const globalHandlers = {
    fill_report_form: async (args: Record<string, any>) => {
      // Store data for page to pick up
      sessionStorage.setItem('pendingReportData', JSON.stringify(args));

      // Navigate using React Router (no page refresh)
      if (!location.pathname.includes('/reports/new')) {
        navigate('/reports/new');
        return { success: true, navigated: true };
      }

      return { success: true, ...args };
    },
  };

  return <ToolHandlerProvider handlers={globalHandlers}>{children}</ToolHandlerProvider>;
}

// Form component (with react-hook-form)
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

function NewReportForm() {
  const form = useForm();

  // Apply data from sessionStorage on mount
  useEffect(() => {
    const pendingData = sessionStorage.getItem('pendingReportData');
    if (pendingData) {
      const data = JSON.parse(pendingData);
      sessionStorage.removeItem('pendingReportData');

      // Use form.reset() for bulk updates
      form.reset({
        name: data.name || '',
        description: data.description || '',
        category: data.category || undefined,
      });
    }
  }, [form]);

  // Local handler (overrides global when on this page)
  const toolHandlers = {
    fill_report_form: async (args) => {
      // Use form.setValue() for individual field updates
      if (args.name) form.setValue('name', args.name);
      if (args.description) form.setValue('description', args.description);
      return { success: true };
    },
  };

  useAgnoToolExecution(toolHandlers, true);

  return <form>{/* form fields */}</form>;
}
```

**Why this works:**
- React Router's `navigate()` preserves app state (no page refresh)
- SessionStorage bridges data across route changes
- Local handlers override global handlers when active
- React Hook Form provides reliable state management

## Pattern 2: Agent-Driven Chart Selection

```tsx
async function visualize_data(args: { query: string }) {
  const data = await fetchData(args);

  // Agent reasoning: "over time" → line chart
  if (args.query.includes('over time') || args.query.includes('trend')) {
    return resultWithSmartChart(data, {
      title: 'Trend Analysis',
      preferredType: 'line',
    });
  }

  // Agent reasoning: "breakdown" → pie chart
  if (args.query.includes('breakdown')) {
    const pieData = createPieChart(
      data,
      'value',
      'category',
      { title: 'Distribution' }
    );
    return createToolResult(data, pieData);
  }

  // Default: let smart chart decide
  return resultWithSmartChart(data, { title: args.query });
}
```

## Pattern 3: Multi-Step Tool Execution

```tsx
const toolHandlers = {
  complex_workflow: async (args) => {
    // Step 1: Fetch data
    const rawData = await fetchData(args);

    // Step 2: Process data
    const processed = processData(rawData);

    // Step 3: Create visualization
    return resultWithBarChart(processed, 'category', [
      { key: 'value', label: 'Result' },
    ]);
  },
};
```

## Pattern 4: Conditional Visualization

```tsx
const toolHandlers = {
  show_analysis: async (args: { format: 'chart' | 'table' | 'both' }) => {
    const data = await fetchData(args);

    if (args.format === 'chart') {
      return resultWithBarChart(data, 'x', [{ key: 'y' }]);
    }

    if (args.format === 'table') {
      return resultWithTable(data, [
        createColumn('x', 'X'),
        createColumn('y', 'Y'),
      ]);
    }

    // Format: 'both' - return data, agent can request both separately
    return { success: true, data };
  },
};
```

---

## API Reference

### Helper Functions

**Result Helpers (return `ToolHandlerResult`):**
- `resultWithBarChart(data, xKey, bars, options?)`
- `resultWithSmartChart(data, options?)`
- `resultWithCardGrid(cards, options?)`
- `resultWithTable(data, columns, options?)`

**Chart Creation Functions (return UI spec):**
- `createBarChart(data, xKey, bars, options?)`
- `createLineChart(data, xKey, lines, options?)`
- `createPieChart(data, dataKey, nameKey, options?)`
- `createAreaChart(data, xKey, areas, options?)`
- `createSmartChart(data, options?)`

**Other Helpers:**
- `createCard(id, title, description, options?)`
- `createColumn(key, label, options?)`
- `createToolResult(data, uiSpec)` - Wrap UI spec in result
- `getCustomRender(key)` - Retrieve custom render function

### TypeScript Types

```tsx
import type {
  UIComponentSpec,
  ChartComponentSpec,
  CardGridComponentSpec,
  TableComponentSpec,
  ToolHandlerResult,
  ChartHelperOptions,
  ToolHandler,
} from '@antipopp/agno-react';
```

---

## Troubleshooting

### Chart Not Appearing

1. Check `registerGenerativeUIComponents()` is called on app mount
2. Verify handler returns `ToolHandlerResult` with `ui` field
3. Check browser console for errors

### Type Errors

```tsx
// ✅ Correct
return resultWithBarChart(data, 'x', [{ key: 'y' }]);

// ❌ Wrong - missing data wrapper
return createBarChart(data, 'x', [{ key: 'y' }]);
```

### Custom Renders Lost on Refresh

Custom render functions can't be serialized. Use predefined components (`chart`, `card`, `table`) for persistent UI.

### Tool Not Executing

1. Verify backend tool has `external_execution=True`
2. Check tool name matches handler key exactly
3. Ensure `useAgnoToolExecution` is called in component
4. Check for JavaScript errors in handler function

---

## Examples

See `/examples/react-chat/src/tools/` for complete working examples:
- `exampleGenerativeTools.tsx` - Generative UI examples
- `exampleBrowserTools.tsx` - Browser API tools

---

## Next Steps

1. Define backend tools with `external_execution=True`
2. Create frontend handlers using `useAgnoToolExecution`
3. Use `resultWith*` helpers for generative UI
4. Test your tools with the agent

For questions or feedback, please file an issue on GitHub.

# 10. Generative UI: Charts

> **Prerequisites**: [08. Tool Execution Basics](./08_tool_execution_basics.md)
> **Packages**: `@antipopp/agno-react`

## Overview

Generative UI allows tool handlers to return rich UI components instead of just data. This cookbook focuses on creating charts (bar, line, pie, area) that render directly in the chat interface.

## Chart Helper Functions

The library provides helper functions to create chart specifications:

```typescript
import {
  createBarChart,
  createLineChart,
  createPieChart,
  createAreaChart,
  createSmartChart,
  createToolResult,
  resultWithBarChart,
  resultWithSmartChart,
} from '@antipopp/agno-react';
```

## ToolHandlerResult Format

Tool handlers can return:

1. **Plain data** - Just the result (backward compatible)
2. **ToolHandlerResult** - `{ data, ui }` with both data and UI spec
3. **UIComponentSpec** - Just a UI spec (data becomes the spec)

```typescript
// Format 1: Plain data
return { sales: 1000, growth: 5.2 };

// Format 2: Data + UI (recommended)
return {
  data: { sales: 1000, growth: 5.2 },
  ui: createBarChart(chartData, 'month', [{ key: 'sales' }]),
};

// Format 3: Just UI
return createBarChart(chartData, 'month', [{ key: 'sales' }]);
```

## Bar Charts

```tsx
import { useAgnoToolExecution, createBarChart, createToolResult } from '@antipopp/agno-react';

function App() {
  const handlers = {
    show_sales_data: async (args) => {
      const data = [
        { month: 'Jan', sales: 4000, returns: 240 },
        { month: 'Feb', sales: 3000, returns: 139 },
        { month: 'Mar', sales: 2000, returns: 980 },
        { month: 'Apr', sales: 2780, returns: 390 },
        { month: 'May', sales: 1890, returns: 480 },
        { month: 'Jun', sales: 2390, returns: 380 },
      ];

      const chart = createBarChart(
        data,
        'month', // X-axis key
        [
          { key: 'sales', label: 'Sales', color: '#8884d8' },
          { key: 'returns', label: 'Returns', color: '#82ca9d' },
        ],
        {
          title: 'Monthly Sales Report',
          description: 'Sales and returns by month',
          showLegend: true,
          showGrid: true,
          height: 400,
        }
      );

      return createToolResult(data, chart);
    },
  };

  useAgnoToolExecution(handlers);
  return <Chat />;
}
```

## Line Charts

```tsx
import { useAgnoToolExecution, createLineChart, createToolResult } from '@antipopp/agno-react';

function App() {
  const handlers = {
    show_trend_analysis: async (args) => {
      const data = [
        { date: '2024-01', users: 1000, sessions: 2400 },
        { date: '2024-02', users: 1500, sessions: 3600 },
        { date: '2024-03', users: 2000, sessions: 4800 },
        { date: '2024-04', users: 2500, sessions: 5200 },
        { date: '2024-05', users: 3200, sessions: 6100 },
      ];

      const chart = createLineChart(
        data,
        'date',
        [
          { key: 'users', label: 'Active Users', color: '#0088FE' },
          { key: 'sessions', label: 'Sessions', color: '#00C49F' },
        ],
        {
          title: 'User Growth Trend',
          layout: 'artifact', // Opens in modal/side panel
        }
      );

      return createToolResult(data, chart);
    },
  };

  useAgnoToolExecution(handlers);
  return <Chat />;
}
```

## Pie Charts

```tsx
import { useAgnoToolExecution, createPieChart, createToolResult } from '@antipopp/agno-react';

function App() {
  const handlers = {
    show_market_share: async (args) => {
      const data = [
        { name: 'Chrome', value: 65 },
        { name: 'Safari', value: 19 },
        { name: 'Firefox', value: 8 },
        { name: 'Edge', value: 5 },
        { name: 'Other', value: 3 },
      ];

      const chart = createPieChart(
        data,
        'value',  // Data key
        'name',   // Name key
        {
          title: 'Browser Market Share',
          showLabel: true,
          showLegend: true,
          height: 400,
        }
      );

      return createToolResult(data, chart);
    },
  };

  useAgnoToolExecution(handlers);
  return <Chat />;
}
```

## Area Charts

```tsx
import { useAgnoToolExecution, createAreaChart, createToolResult } from '@antipopp/agno-react';

function App() {
  const handlers = {
    show_revenue_breakdown: async (args) => {
      const data = [
        { month: 'Jan', product: 4000, services: 2400, support: 800 },
        { month: 'Feb', product: 3000, services: 1398, support: 900 },
        { month: 'Mar', product: 2000, services: 9800, support: 1200 },
        { month: 'Apr', product: 2780, services: 3908, support: 1100 },
        { month: 'May', product: 1890, services: 4800, support: 950 },
      ];

      const chart = createAreaChart(
        data,
        'month',
        [
          { key: 'product', label: 'Product Sales', color: '#8884d8' },
          { key: 'services', label: 'Services', color: '#82ca9d' },
          { key: 'support', label: 'Support', color: '#ffc658' },
        ],
        {
          title: 'Revenue Breakdown',
          showGrid: true,
        }
      );

      return createToolResult(data, chart);
    },
  };

  useAgnoToolExecution(handlers);
  return <Chat />;
}
```

## Smart Charts (Auto-Detection)

`createSmartChart` automatically chooses the best chart type based on data:

```tsx
import { useAgnoToolExecution, createSmartChart, resultWithSmartChart } from '@antipopp/agno-react';

function App() {
  const handlers = {
    visualize_data: async (args) => {
      // Fetch or generate data
      const data = await fetchData(args.query);

      // Smart chart auto-detects best visualization
      // - Pie chart for single value with categories
      // - Line chart for time-series data
      // - Bar chart for comparisons
      return resultWithSmartChart(data, {
        title: `Results for: ${args.query}`,
      });
    },

    show_analytics: async (args) => {
      const data = [
        { category: 'A', count: 100 },
        { category: 'B', count: 200 },
        { category: 'C', count: 150 },
      ];

      // With preferredType, you can override auto-detection
      const chart = createSmartChart(data, {
        title: 'Category Distribution',
        preferredType: 'bar', // Force bar chart
      });

      return { data, ui: chart };
    },
  };

  useAgnoToolExecution(handlers);
  return <Chat />;
}
```

## Quick Helpers

Shorthand functions for common patterns:

```tsx
import {
  useAgnoToolExecution,
  resultWithBarChart,
  resultWithSmartChart,
} from '@antipopp/agno-react';

function App() {
  const handlers = {
    quick_bar_chart: async (args) => {
      const data = await fetchSalesData();

      // One-liner for bar chart
      return resultWithBarChart(
        data,
        'month',
        [{ key: 'sales' }, { key: 'target' }],
        { title: 'Sales vs Target' }
      );
    },

    quick_smart_chart: async (args) => {
      const data = await fetchAnalytics(args.metric);

      // One-liner for smart chart
      return resultWithSmartChart(data, {
        title: args.metric,
        layout: 'artifact',
      });
    },
  };

  useAgnoToolExecution(handlers);
  return <Chat />;
}
```

## Chart Options Reference

```typescript
interface ChartHelperOptions {
  title?: string;        // Chart title
  description?: string;  // Description below title
  layout?: 'inline' | 'artifact'; // Display mode
  showLegend?: boolean;  // Show legend (default: true)
  showGrid?: boolean;    // Show grid lines (default: true)
  height?: number | string; // Chart height
  width?: number | string;  // Chart width
}
```

## Rendering Charts in Messages

Charts are automatically rendered when you use `GenerativeUIRenderer`:

```tsx
import { GenerativeUIRenderer } from '@antipopp/agno-react';
import type { ToolCall } from '@antipopp/agno-types';

function ToolCallDisplay({ toolCall }: { toolCall: ToolCall }) {
  // ui_component is attached by useAgnoToolExecution
  const uiSpec = (toolCall as any).ui_component;

  if (uiSpec) {
    return (
      <div className="tool-ui">
        <GenerativeUIRenderer spec={uiSpec} />
      </div>
    );
  }

  // Fallback to text result
  return (
    <div className="tool-result">
      <pre>{toolCall.content}</pre>
    </div>
  );
}
```

## Complete Example

```tsx
import {
  AgnoProvider,
  useAgnoChat,
  useAgnoToolExecution,
  GenerativeUIRenderer,
  createBarChart,
  createLineChart,
  createToolResult,
} from '@antipopp/agno-react';

function App() {
  return (
    <AgnoProvider config={{ endpoint: 'http://localhost:7777', mode: 'agent', agentId: 'analytics-agent' }}>
      <AnalyticsChat />
    </AgnoProvider>
  );
}

function AnalyticsChat() {
  const { messages, sendMessage, isStreaming } = useAgnoChat();

  const handlers = {
    get_revenue_chart: async (args) => {
      const data = await fetchRevenue(args.period);
      return createToolResult(
        data,
        createLineChart(data, 'date', [{ key: 'revenue', color: '#10b981' }], {
          title: `Revenue - ${args.period}`,
        })
      );
    },

    get_comparison_chart: async (args) => {
      const data = await fetchComparison(args.metrics);
      return createToolResult(
        data,
        createBarChart(data, 'category', args.metrics.map(m => ({ key: m })), {
          title: 'Metric Comparison',
          showLegend: true,
        })
      );
    },
  };

  useAgnoToolExecution(handlers);

  return (
    <div className="chat">
      {messages.map((msg, i) => (
        <div key={i} className={`message ${msg.role}`}>
          <p>{msg.content}</p>

          {msg.tool_calls?.map((tool) => (
            <div key={tool.tool_call_id} className="tool-output">
              {(tool as any).ui_component ? (
                <GenerativeUIRenderer spec={(tool as any).ui_component} />
              ) : (
                <pre>{tool.content}</pre>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

## Key Points

- Use `createToolResult(data, ui)` to return both data and UI
- `createBarChart`, `createLineChart`, `createPieChart`, `createAreaChart` create chart specs
- `createSmartChart` auto-detects the best chart type
- `resultWithBarChart` and `resultWithSmartChart` are quick one-liners
- Set `layout: 'artifact'` to open charts in a modal/side panel
- Use `GenerativeUIRenderer` to render UI specs in messages
- Charts use Recharts under the hood - all standard props are supported

## Next Steps

Continue to [11. Generative UI: Components](./11_generative_ui_components.md) for cards, tables, and custom components.

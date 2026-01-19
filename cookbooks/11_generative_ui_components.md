# 11. Generative UI: Components

> **Prerequisites**: [10. Generative UI: Charts](./10_generative_ui_charts.md)
> **Packages**: `@antipopp/agno-react`

## Overview

Beyond charts, Generative UI supports card grids, data tables, markdown content, and custom render functions. This cookbook covers all non-chart UI components.

## Component Helper Functions

```typescript
import {
  createCardGrid,
  createCard,
  createTable,
  createColumn,
  createMarkdown,
  createArtifact,
  createToolResult,
  resultWithCardGrid,
  resultWithTable,
} from '@antipopp/agno-react';
```

## Card Grids

Display data as cards with images, metadata, and actions:

```tsx
import {
  useAgnoToolExecution,
  createCardGrid,
  createCard,
  createToolResult,
} from '@antipopp/agno-react';

function App() {
  const handlers = {
    show_products: async (args) => {
      const products = await fetchProducts(args.category);

      const cards = products.map(product =>
        createCard(
          product.id,
          product.name,
          product.description,
          {
            image: product.imageUrl,
            metadata: {
              Price: `$${product.price}`,
              Rating: `${product.rating}/5`,
              Stock: product.inStock ? 'In Stock' : 'Out of Stock',
            },
            actions: [
              { label: 'View Details', variant: 'default', onClick: 'view-product' },
              { label: 'Add to Cart', variant: 'secondary', onClick: 'add-to-cart' },
            ],
          }
        )
      );

      const grid = createCardGrid(cards, {
        title: `${args.category} Products`,
        columns: { default: 1, md: 2, lg: 3 },
        variant: 'bordered',
      });

      return createToolResult(products, grid);
    },
  };

  useAgnoToolExecution(handlers);
  return <Chat />;
}
```

### Card Data Structure

```typescript
interface CardData {
  id: string;           // Unique identifier
  title: string;        // Card title
  description?: string; // Card description
  image?: string;       // Image URL
  metadata?: Record<string, any>; // Key-value pairs
  actions?: Array<{
    label: string;
    variant?: 'default' | 'secondary' | 'outline' | 'ghost';
    onClick?: string; // Event identifier
  }>;
}
```

### Quick Card Grid

```tsx
import { useAgnoToolExecution, resultWithCardGrid, createCard } from '@antipopp/agno-react';

function App() {
  const handlers = {
    show_team: async () => {
      const team = [
        createCard('1', 'Alice Chen', 'Engineering Lead', {
          image: '/avatars/alice.jpg',
          metadata: { Department: 'Engineering', Location: 'SF' },
        }),
        createCard('2', 'Bob Smith', 'Product Manager', {
          image: '/avatars/bob.jpg',
          metadata: { Department: 'Product', Location: 'NYC' },
        }),
        createCard('3', 'Carol Wu', 'Designer', {
          image: '/avatars/carol.jpg',
          metadata: { Department: 'Design', Location: 'LA' },
        }),
      ];

      return resultWithCardGrid(team, { title: 'Team Members' });
    },
  };

  useAgnoToolExecution(handlers);
  return <Chat />;
}
```

## Data Tables

Display tabular data with sorting, filtering, and pagination:

```tsx
import {
  useAgnoToolExecution,
  createTable,
  createColumn,
  createToolResult,
} from '@antipopp/agno-react';

function App() {
  const handlers = {
    show_orders: async (args) => {
      const orders = await fetchOrders(args.status);

      const columns = [
        createColumn('orderId', 'Order ID', { width: 120 }),
        createColumn('customer', 'Customer', { sortable: true }),
        createColumn('amount', 'Amount', {
          cellType: 'number',
          format: { type: 'currency', currency: 'USD' },
          sortable: true,
        }),
        createColumn('status', 'Status', { cellType: 'badge' }),
        createColumn('date', 'Date', {
          cellType: 'date',
          sortable: true,
        }),
      ];

      const table = createTable(orders, columns, {
        title: 'Recent Orders',
        sortable: true,
        filterable: true,
        pagination: { pageSize: 10, pageSizeOptions: [10, 25, 50] },
        density: 'comfortable',
      });

      return createToolResult(orders, table);
    },
  };

  useAgnoToolExecution(handlers);
  return <Chat />;
}
```

### Column Configuration

```typescript
interface TableColumn {
  key: string;       // Data key
  header: string;    // Display header
  width?: number | string;
  sortable?: boolean;
  cellType?: 'text' | 'number' | 'date' | 'badge' | 'link' | 'custom';
  format?: {
    type?: 'currency' | 'percent' | 'decimal';
    locale?: string;
    currency?: string;
  };
}
```

### Quick Table

```tsx
import { useAgnoToolExecution, resultWithTable, createColumn } from '@antipopp/agno-react';

function App() {
  const handlers = {
    show_metrics: async () => {
      const data = [
        { metric: 'Page Views', value: 12500, change: 5.2 },
        { metric: 'Unique Visitors', value: 8300, change: -2.1 },
        { metric: 'Bounce Rate', value: 42.5, change: -8.3 },
        { metric: 'Avg Session', value: 3.2, change: 12.5 },
      ];

      const columns = [
        createColumn('metric', 'Metric'),
        createColumn('value', 'Value', { cellType: 'number' }),
        createColumn('change', 'Change %', {
          cellType: 'number',
          format: { type: 'percent' },
        }),
      ];

      return resultWithTable(data, columns, { title: 'Site Metrics' });
    },
  };

  useAgnoToolExecution(handlers);
  return <Chat />;
}
```

## Markdown Content

Render rich markdown content:

```tsx
import { useAgnoToolExecution, createMarkdown, createToolResult } from '@antipopp/agno-react';

function App() {
  const handlers = {
    show_documentation: async (args) => {
      const content = `
# ${args.topic}

This is the documentation for **${args.topic}**.

## Installation

\`\`\`bash
npm install ${args.package}
\`\`\`

## Usage

\`\`\`typescript
import { something } from '${args.package}';

const result = something();
\`\`\`

## API Reference

| Method | Description |
|--------|-------------|
| \`init()\` | Initialize the library |
| \`run()\` | Execute the main function |

> **Note:** This is auto-generated documentation.
      `;

      const markdown = createMarkdown(content, {
        title: `Documentation: ${args.topic}`,
        syntaxHighlight: true,
        layout: 'artifact',
      });

      return createToolResult({ topic: args.topic }, markdown);
    },
  };

  useAgnoToolExecution(handlers);
  return <Chat />;
}
```

## Artifact Containers

Group multiple components together:

```tsx
import {
  useAgnoToolExecution,
  createArtifact,
  createBarChart,
  createTable,
  createMarkdown,
  createColumn,
  createToolResult,
} from '@antipopp/agno-react';

function App() {
  const handlers = {
    show_report: async (args) => {
      const salesData = await fetchSalesReport(args.period);

      const chart = createBarChart(
        salesData,
        'month',
        [{ key: 'revenue' }, { key: 'target' }],
        { title: 'Revenue vs Target' }
      );

      const table = createTable(
        salesData,
        [
          createColumn('month', 'Month'),
          createColumn('revenue', 'Revenue', { format: { type: 'currency' } }),
          createColumn('target', 'Target', { format: { type: 'currency' } }),
        ],
        { title: 'Detailed Breakdown' }
      );

      const summary = createMarkdown(`
## Summary

- **Total Revenue:** $${salesData.reduce((a, b) => a + b.revenue, 0).toLocaleString()}
- **Target Achievement:** ${((salesData.reduce((a, b) => a + b.revenue, 0) / salesData.reduce((a, b) => a + b.target, 0)) * 100).toFixed(1)}%
      `);

      const artifact = createArtifact([chart, table, summary], {
        title: `Sales Report - ${args.period}`,
        variant: 'elevated',
      });

      return createToolResult(salesData, artifact);
    },
  };

  useAgnoToolExecution(handlers);
  return <Chat />;
}
```

## Custom Render Functions

For advanced use cases, use custom render functions:

```tsx
import { useAgnoToolExecution, createToolResult } from '@antipopp/agno-react';
import type { CustomComponentSpec } from '@antipopp/agno-types';

function App() {
  const handlers = {
    show_interactive_widget: async (args) => {
      // Custom component with render function
      const customUI: CustomComponentSpec = {
        type: 'custom',
        renderKey: '', // Will be set automatically
        props: {
          initialValue: args.value,
          options: args.options,
        },
        // The render function - receives props and returns React node
        render: (props: any) => (
          <div className="custom-widget">
            <h3>Interactive Widget</h3>
            <select defaultValue={props.initialValue}>
              {props.options.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ),
      };

      return createToolResult(args, customUI as any);
    },
  };

  useAgnoToolExecution(handlers);
  return <Chat />;
}
```

### Accessing Custom Renders

Custom render functions are stored in a registry and accessed via `getCustomRender`:

```tsx
import { GenerativeUIRenderer, getCustomRender } from '@antipopp/agno-react';

function CustomComponentRenderer({ spec }: { spec: CustomComponentSpec }) {
  const renderFn = getCustomRender(spec.renderKey);

  if (!renderFn) {
    return <div>Custom component not found</div>;
  }

  return renderFn(spec.props || {});
}
```

## Layout Options

All components support `layout` option:

```tsx
// Inline - renders within the message
createBarChart(data, xKey, bars, { layout: 'inline' });

// Artifact - opens in modal or side panel
createTable(data, columns, { layout: 'artifact' });
```

## Complete Example with Mixed Components

```tsx
import {
  useAgnoToolExecution,
  createBarChart,
  createCardGrid,
  createCard,
  createTable,
  createColumn,
  createArtifact,
  createToolResult,
} from '@antipopp/agno-react';

function DashboardAgent() {
  const handlers = {
    show_dashboard: async (args) => {
      const [stats, topProducts, recentOrders] = await Promise.all([
        fetchStats(),
        fetchTopProducts(),
        fetchRecentOrders(),
      ]);

      // Stats as cards
      const statCards = [
        createCard('revenue', 'Revenue', `$${stats.revenue.toLocaleString()}`, {
          metadata: { Change: `+${stats.revenueChange}%` },
        }),
        createCard('orders', 'Orders', stats.orders.toString(), {
          metadata: { Change: `+${stats.ordersChange}%` },
        }),
        createCard('customers', 'Customers', stats.customers.toString(), {
          metadata: { Change: `+${stats.customersChange}%` },
        }),
      ];

      // Chart for trends
      const trendChart = createBarChart(
        stats.monthlyData,
        'month',
        [{ key: 'revenue', label: 'Revenue' }],
        { title: 'Monthly Revenue' }
      );

      // Table for recent orders
      const ordersTable = createTable(
        recentOrders,
        [
          createColumn('id', 'Order ID'),
          createColumn('customer', 'Customer'),
          createColumn('amount', 'Amount', { format: { type: 'currency' } }),
          createColumn('status', 'Status', { cellType: 'badge' }),
        ],
        { title: 'Recent Orders', pagination: { pageSize: 5 } }
      );

      // Combine into dashboard
      const dashboard = createArtifact([
        createCardGrid(statCards, { columns: { default: 1, md: 3 } }),
        trendChart,
        ordersTable,
      ], {
        title: 'Business Dashboard',
        variant: 'elevated',
      });

      return createToolResult({ stats, topProducts, recentOrders }, dashboard);
    },
  };

  useAgnoToolExecution(handlers);
  return <Chat />;
}
```

## Key Points

- `createCardGrid` displays data as visual cards with images and actions
- `createTable` creates sortable, filterable data tables
- `createMarkdown` renders rich text with syntax highlighting
- `createArtifact` groups multiple components together
- Custom render functions enable React components in tool results
- All components support `layout: 'inline' | 'artifact'`
- Use `createToolResult(data, ui)` to return both data for the agent and UI for display
- Quick helpers: `resultWithCardGrid`, `resultWithTable`

## Next Steps

Continue to [12. State and Events](./12_state_and_events.md) to understand the client's state management and event system.

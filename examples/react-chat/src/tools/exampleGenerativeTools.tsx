/**
 * Example Generative UI Tool Handlers
 *
 * These examples demonstrate how to use the generative UI system
 * to create interactive, visual responses from tool handlers.
 */

import {
  createTable,
  createColumn,
  resultWithSmartChart,
  resultWithCardGrid,
  resultWithBarChart,
  type ToolHandlerResult,
} from '@antipopp/agno-react';

/**
 * Example 1: Render a revenue chart
 * Backend fetches the data, frontend renders the chart
 */
export async function render_revenue_chart(args: Record<string, any>) {
  const { data, period = 'monthly', chartType = 'auto' } = args;

  if (!data || data.length === 0) {
    return {
      data: { error: 'No data provided' },
      ui: {
        type: 'markdown',
        props: { content: '**Error:** No data available to display' },
      },
    };
  }

  // Agent decides: line chart for trends, bar chart for comparisons
  if (chartType === 'line' || chartType === 'trend') {
    return resultWithSmartChart(data, {
      title: `Revenue Trend - ${period}`,
      description: 'Revenue and expenses over time',
      preferredType: 'line',
      layout: 'artifact',
    });
  }

  // Default to bar chart
  return resultWithBarChart(
    data,
    'month',
    [
      { key: 'revenue', label: 'Revenue', color: 'hsl(var(--chart-1))' },
      { key: 'expenses', label: 'Expenses', color: 'hsl(var(--chart-2))' },
    ],
    {
      title: `Revenue Comparison - ${period}`,
      description: 'Compare revenue vs expenses',
      layout: 'artifact',
      height: 400,
    }
  );
}

/**
 * Example 2: Render rental cars as a card grid
 * Backend fetches car data from MCP/database, frontend renders the cards
 */
export async function render_rental_cars(args: Record<string, any>) {
  const { data, location = 'Unknown' } = args;

  if (!data || data.length === 0) {
    return {
      data: { error: 'No cars found' },
      ui: {
        type: 'markdown',
        props: { content: '**No rental cars available** at this location.' },
      },
    };
  }

  // Transform backend data to card format
  // Backend might return: [{ id, name, description, price_per_day, type, seats, image_url }]
  const cards = data.map((car: any) => ({
    id: car.id || `car-${Math.random()}`,
    title: car.name || car.title || 'Unknown Car',
    description: car.description || '',
    image: car.image_url || car.image,
    metadata: {
      Price: car.price_per_day ? `$${car.price_per_day}/day` : car.price || 'N/A',
      Type: car.type || 'N/A',
      Seats: car.seats?.toString() || 'N/A',
      Available: car.available ? 'Yes' : 'No',
    },
    actions: [
      { label: 'Book Now', variant: 'default' as const, onClick: `book_car:${car.id}` },
      { label: 'Details', variant: 'outline' as const, onClick: `view_car:${car.id}` },
    ],
  }));

  return resultWithCardGrid(cards, {
    title: `Available Cars in ${location}`,
    description: `${cards.length} vehicle${cards.length !== 1 ? 's' : ''} available for rent`,
    columns: { default: 1, md: 2, lg: 3 },
    variant: 'elevated',
  });
}

/**
 * Example 3: Product comparison table
 * Backend fetches product data, frontend renders the comparison table
 */
export async function render_product_comparison(args: Record<string, any>) {
  const { data, category = 'products' } = args;

  if (!data || data.length === 0) {
    return {
      data: { error: 'No products provided' },
      ui: {
        type: 'markdown',
        props: { content: '**Error:** No product data available to compare' },
      },
    };
  }

  // Define columns based on the data structure
  const columns = [
    createColumn('name', 'Product', { width: '200px', sortable: true }),
    createColumn('price', 'Price', {
      sortable: true,
      cellType: 'number',
      format: { type: 'currency', currency: 'USD' },
    }),
    createColumn('cpu', 'Processor', { sortable: true }),
    createColumn('ram', 'RAM', { sortable: true }),
    createColumn('storage', 'Storage', { sortable: true }),
    createColumn('display', 'Display', { sortable: true }),
    createColumn('rating', 'Rating', { sortable: true, cellType: 'number' }),
  ];

  const tableSpec = createTable(data, columns, {
    title: `${category.charAt(0).toUpperCase() + category.slice(1)} Comparison`,
    description: `Compare specifications and prices for ${data.length} products`,
    sortable: true,
    density: 'comfortable',
    layout: 'artifact',
  });

  return {
    data,
    ui: tableSpec,
  } as ToolHandlerResult;
}

/**
 * Example 4: Custom dashboard
 * Backend fetches dashboard metrics, frontend renders as cards
 */
export async function render_dashboard(args: Record<string, any>) {
  const { data, userId } = args;

  if (!data) {
    return {
      data: { error: 'No dashboard data provided' },
      ui: {
        type: 'markdown',
        props: { content: '**Error:** No dashboard data available' },
      },
    };
  }

  // Transform backend metrics into card format
  const cards = [
    {
      id: 'sales',
      title: 'Total Sales',
      description: `$${(data.totalSales || 0).toLocaleString()}`,
      metadata: { Trend: data.salesTrend || 'N/A' },
    },
    {
      id: 'customers',
      title: 'New Customers',
      description: `${data.newCustomers || 0}`,
      metadata: { Trend: data.customerTrend || 'N/A' },
    },
    {
      id: 'projects',
      title: 'Active Projects',
      description: `${data.activeProjects || 0}`,
      metadata: { Status: data.projectStatus || 'N/A' },
    },
  ];

  return resultWithCardGrid(cards, {
    title: userId ? `Dashboard for ${userId}` : 'Dashboard Overview',
    description: 'Key metrics and insights',
    columns: { default: 1, md: 3 },
    variant: 'elevated',
  });
}

/**
 * Example 5: Smart chart with auto-detection
 * Backend provides data, frontend intelligently chooses the best visualization
 */
export async function render_visualization(args: Record<string, any>) {
  const { data, query = 'Data Visualization', chartType } = args;

  if (!data || data.length === 0) {
    return {
      data: { error: 'No data provided' },
      ui: {
        type: 'markdown',
        props: { content: '**Error:** No data available to visualize' },
      },
    };
  }

  // If chart type is explicitly requested, use it
  let preferredType: 'bar' | 'line' | 'pie' | undefined;
  if (chartType) {
    if (chartType === 'pie' || query.toLowerCase().includes('market share') || query.toLowerCase().includes('distribution')) {
      preferredType = 'pie';
    } else if (chartType === 'line' || query.toLowerCase().includes('trend') || query.toLowerCase().includes('over time')) {
      preferredType = 'line';
    } else if (chartType === 'bar' || query.toLowerCase().includes('comparison') || query.toLowerCase().includes('compare')) {
      preferredType = 'bar';
    }
  }

  // Smart chart auto-detects the best visualization based on data structure
  return resultWithSmartChart(data, {
    title: `${query}`,
    description: preferredType ? `${preferredType.charAt(0).toUpperCase() + preferredType.slice(1)} chart visualization` : 'Automatically selected visualization type',
    preferredType,
    layout: 'artifact',
  });
}

/**
 * Export all tool handlers as a map
 */
export const EXAMPLE_GENERATIVE_TOOLS = {
  render_revenue_chart,
  render_rental_cars,
  render_product_comparison,
  render_dashboard,
  render_visualization,
};

/**
 * ============================================================================
 * BACKEND TOOL DEFINITIONS (Python)
 * ============================================================================
 *
 * Copy these to your Agno agent Python file.
 *
 * CRITICAL ARCHITECTURE:
 * 1. Backend fetches REAL data (from MCP servers, databases, APIs, etc.)
 * 2. Backend passes the data to the frontend tool using external_execution=True
 * 3. Frontend receives the data and ONLY handles rendering/transformation to UI
 * 4. Frontend does NOT fetch data - it only renders what backend provides
 *
 * IMPORTANT: Tools marked with external_execution=True must have NO IMPLEMENTATION
 * on the backend. They should just use `pass` or raise NotImplementedError.
 * This causes the backend to emit a RunPaused event for frontend execution.
 *
 * CORRECT FLOW:
 * User asks question → Agent uses MCP/DB tools to fetch data →
 * Agent calls external_execution tool (backend emits RunPaused) →
 * Frontend executes tool and renders UI → Frontend sends results back →
 * Agent continues with response
 */

/**
 * ```python
 * from agno.tools import tool
 *
 * # Example: You might have MCP tools or other data sources
 * # from mcp import get_revenue_data, get_rental_cars_data, etc.
 *
 * @tool(external_execution=True)
 * def render_revenue_chart(data: list, period: str = "monthly", chartType: str = "auto"):
 *     """
 *     Render a revenue chart on the frontend.
 *     Backend must fetch the revenue data first and pass it here.
 *
 *     Args:
 *         data: List of revenue data objects with keys like 'month', 'revenue', 'expenses'
 *               Example: [{"month": "Jan", "revenue": 5000, "expenses": 3000}, ...]
 *         period: The time period for the chart (e.g., "monthly", "quarterly")
 *         chartType: The chart type ("auto", "line", "bar", "trend")
 *     """
 *     # ⚠️ CRITICAL: NO IMPLEMENTATION!
 *     # The tool declaration tells the agent this tool exists and what arguments it needs.
 *     # When the agent calls this tool, the backend will emit a RunPaused event.
 *     # The frontend will then execute the actual rendering logic.
 *     pass  # or: raise NotImplementedError("This tool executes on the frontend")
 *
 *
 * @tool(external_execution=True)
 * def render_rental_cars(data: list, location: str = "San Francisco"):
 *     """Render rental cars as a card grid on the frontend."""
 *     pass  # No implementation - executes on frontend
 *
 *
 * @tool(external_execution=True)
 * def render_product_comparison(data: list, category: str = "products"):
 *     """Render product comparison table on the frontend."""
 *     pass  # No implementation - executes on frontend
 *
 *
 * @tool(external_execution=True)
 * def render_dashboard(data: dict, userId: str = None):
 *     """Render a dashboard with key metrics on the frontend."""
 *     pass  # No implementation - executes on frontend
 *
 *
 * @tool(external_execution=True)
 * def render_visualization(data: list, query: str = "Data Visualization", chartType: str = None):
 *     """Render data visualization with smart chart type detection."""
 *     pass  # No implementation - executes on frontend
 *
 *
 * # ============================================================================
 * # EXAMPLE USAGE IN AGENT
 * # ============================================================================
 *
 * # Example with data fetching:
 * @tool()
 * def get_revenue_data(period: str = "monthly"):
 *     """Fetch revenue data from database or MCP server."""
 *     # This is a regular backend tool that fetches data
 *     # Could use MCP, database, API, etc.
 *     data = fetch_from_database(period)  # Your data source
 *     return data
 *
 * # Agent workflow:
 * # 1. User: "Show me monthly revenue"
 * # 2. Agent calls get_revenue_data() to fetch data
 * # 3. Agent calls render_revenue_chart(data=result) to render on frontend
 *
 * agent = Agent(
 *     tools=[
 *         # Regular backend tools for data fetching
 *         get_revenue_data,
 *
 *         # Frontend rendering tools (external_execution=True)
 *         render_revenue_chart,
 *         render_rental_cars,
 *         render_product_comparison,
 *         render_dashboard,
 *         render_visualization,
 *     ],
 *     show_tool_calls=True,
 *     markdown=True,
 * )
 * ```
 */

/**
 * Generative UI Type Definitions
 *
 * These types define the structure for agent-driven UI component generation.
 * The agent/backend can specify what UI components to render and how to configure them.
 */

/**
 * Base UI component specification
 */
export interface BaseUIComponentSpec {
  /** Layout preference: inline with message or in artifact container */
  layout?: 'inline' | 'artifact';
  /** Optional title for the component */
  title?: string;
  /** Optional description */
  description?: string;
}

/**
 * Chart series configuration
 */
export interface ChartSeries {
  /** Data key to plot */
  key: string;
  /** Display label */
  label?: string;
  /** Color (CSS color or theme variable) */
  color?: string;
  /** Chart-specific options (e.g., strokeWidth, fillOpacity) */
  options?: Record<string, any>;
}

/**
 * Chart component specification
 */
export interface ChartComponentSpec extends BaseUIComponentSpec {
  type: 'chart';
  /** Chart component name (e.g., 'BarChart', 'LineChart', 'PieChart') */
  component: 'BarChart' | 'LineChart' | 'PieChart' | 'AreaChart' | 'ComposedChart' | 'RadarChart' | 'ScatterChart' | string;
  /** Chart configuration */
  props: {
    /** Chart data array */
    data: any[];
    /** X-axis key */
    xKey?: string;
    /** Y-axis keys (for bar/line charts) */
    yKeys?: string[];
    /** Series configurations (bars, lines, areas, etc.) */
    series?: ChartSeries[];
    /** Bars configuration (for BarChart) */
    bars?: ChartSeries[];
    /** Lines configuration (for LineChart) */
    lines?: ChartSeries[];
    /** Areas configuration (for AreaChart) */
    areas?: ChartSeries[];
    /** Pie configuration (for PieChart) */
    pie?: {
      dataKey: string;
      nameKey?: string;
      label?: boolean;
    };
    /** Chart dimensions */
    width?: number | string;
    height?: number | string;
    /** Show legend */
    showLegend?: boolean;
    /** Show grid */
    showGrid?: boolean;
    /** Show tooltip */
    showTooltip?: boolean;
    /** Axis configurations */
    xAxis?: Record<string, any>;
    yAxis?: Record<string, any>;
    /** Additional Recharts props (escape hatch for advanced customization) */
    [key: string]: any;
  };
  /** Streaming mode: 'replace' replaces data, 'append' adds to existing data */
  streamMode?: 'replace' | 'append';
}

/**
 * Card data for grid layouts
 */
export interface CardData {
  /** Unique card identifier */
  id: string;
  /** Card title */
  title: string;
  /** Card description/content */
  description?: string;
  /** Image URL */
  image?: string;
  /** Metadata fields */
  metadata?: Record<string, any>;
  /** Action buttons */
  actions?: {
    label: string;
    variant?: 'default' | 'secondary' | 'outline' | 'ghost';
    onClick?: string; // Event name or action identifier
  }[];
}

/**
 * Card grid component specification
 */
export interface CardGridComponentSpec extends BaseUIComponentSpec {
  type: 'card-grid';
  props: {
    /** Array of cards to display */
    cards: CardData[];
    /** Grid columns (responsive) */
    columns?: {
      default?: number;
      sm?: number;
      md?: number;
      lg?: number;
      xl?: number;
    };
    /** Card variant */
    variant?: 'default' | 'bordered' | 'elevated';
  };
}

/**
 * Table column configuration
 */
export interface TableColumn {
  /** Column key in data */
  key: string;
  /** Display header */
  header: string;
  /** Column width */
  width?: number | string;
  /** Sortable */
  sortable?: boolean;
  /** Cell renderer type */
  cellType?: 'text' | 'number' | 'date' | 'badge' | 'link' | 'custom';
  /** Format options */
  format?: {
    /** Number format (e.g., 'currency', 'percent') */
    type?: 'currency' | 'percent' | 'decimal';
    /** Locale for formatting */
    locale?: string;
    /** Currency code (for currency format) */
    currency?: string;
  };
}

/**
 * Table component specification
 */
export interface TableComponentSpec extends BaseUIComponentSpec {
  type: 'table';
  props: {
    /** Table data rows */
    data: Record<string, any>[];
    /** Column configurations */
    columns: TableColumn[];
    /** Enable sorting */
    sortable?: boolean;
    /** Enable filtering */
    filterable?: boolean;
    /** Enable pagination */
    pagination?: {
      pageSize?: number;
      pageSizeOptions?: number[];
    };
    /** Table density */
    density?: 'comfortable' | 'compact';
  };
}

/**
 * Markdown component specification
 */
export interface MarkdownComponentSpec extends BaseUIComponentSpec {
  type: 'markdown';
  props: {
    /** Markdown content */
    content: string;
    /** Enable syntax highlighting */
    syntaxHighlight?: boolean;
  };
}

/**
 * Custom component specification (non-serializable)
 * Uses a render function that must be registered at runtime.
 */
export interface CustomComponentSpec extends BaseUIComponentSpec {
  type: 'custom';
  /** Unique key for looking up the render function */
  renderKey: string;
  /** Props passed to the custom render function */
  props?: Record<string, any>;
}

/**
 * Artifact container specification
 * Can contain multiple child components
 */
export interface ArtifactComponentSpec extends BaseUIComponentSpec {
  type: 'artifact';
  props: {
    /** Child components to render in the artifact */
    content: UIComponentSpec[];
    /** Artifact variant */
    variant?: 'default' | 'bordered' | 'elevated';
  };
}

/**
 * Union type for all UI component specifications
 */
export type UIComponentSpec =
  | ChartComponentSpec
  | CardGridComponentSpec
  | TableComponentSpec
  | MarkdownComponentSpec
  | CustomComponentSpec
  | ArtifactComponentSpec;

/**
 * Generative UI data stored in message extra_data
 */
export interface GenerativeUIData {
  /** Associated tool call ID */
  tool_call_id: string;
  /** UI component specification */
  spec: UIComponentSpec;
  /** Timestamp of when UI was generated */
  timestamp: number;
  /** Streaming state */
  streaming?: {
    /** Whether this UI is currently streaming */
    isStreaming: boolean;
    /** Last update timestamp */
    lastUpdate: number;
  };
}

/**
 * Tool handler result format for generative UI
 */
export interface ToolHandlerResult {
  /** Data to send back to the agent */
  data: any;
  /** UI component specification to render */
  ui?: UIComponentSpec;
}

/**
 * Custom render function type (stored in runtime registry, not serializable)
 */
export type CustomRenderFunction = (props: Record<string, any>) => any; // React.ReactNode in React context

/**
 * Helper type for tool handlers that can return various formats
 */
export type GenerativeToolHandlerReturn =
  | ToolHandlerResult  // New format: { data, ui }
  | UIComponentSpec    // Just UI spec (data = ui spec)
  | any;               // Legacy format: any data (backward compatible)

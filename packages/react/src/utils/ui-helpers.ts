/**
 * Helper utilities for creating UI component specifications
 *
 * These helpers make it easy to create common UI patterns without
 * manually constructing the full specification object.
 */

import type {
  ChartComponentSpec,
  CardGridComponentSpec,
  CardData,
  TableComponentSpec,
  TableColumn,
  MarkdownComponentSpec,
  ArtifactComponentSpec,
  UIComponentSpec,
  ToolHandlerResult,
} from '@antipopp/agno-types';

/**
 * Chart helper options
 */
export interface ChartHelperOptions {
  /** Chart title */
  title?: string;
  /** Chart description */
  description?: string;
  /** Layout preference */
  layout?: 'inline' | 'artifact';
  /** Show legend */
  showLegend?: boolean;
  /** Show grid */
  showGrid?: boolean;
  /** Chart height */
  height?: number | string;
  /** Chart width */
  width?: number | string;
}

/**
 * Create a bar chart specification
 */
export function createBarChart(
  data: any[],
  xKey: string,
  bars: Array<{ key: string; label?: string; color?: string }>,
  options?: ChartHelperOptions
): ChartComponentSpec {
  return {
    type: 'chart',
    component: 'BarChart',
    layout: options?.layout,
    title: options?.title,
    description: options?.description,
    props: {
      data,
      xKey,
      bars: bars.map(bar => ({
        key: bar.key,
        label: bar.label || bar.key,
        color: bar.color,
      })),
      showLegend: options?.showLegend ?? true,
      showGrid: options?.showGrid ?? true,
      height: options?.height,
      width: options?.width,
    },
  };
}

/**
 * Create a line chart specification
 */
export function createLineChart(
  data: any[],
  xKey: string,
  lines: Array<{ key: string; label?: string; color?: string }>,
  options?: ChartHelperOptions
): ChartComponentSpec {
  return {
    type: 'chart',
    component: 'LineChart',
    layout: options?.layout,
    title: options?.title,
    description: options?.description,
    props: {
      data,
      xKey,
      lines: lines.map(line => ({
        key: line.key,
        label: line.label || line.key,
        color: line.color,
      })),
      showLegend: options?.showLegend ?? true,
      showGrid: options?.showGrid ?? true,
      height: options?.height,
      width: options?.width,
    },
  };
}

/**
 * Create a pie chart specification
 */
export function createPieChart(
  data: any[],
  dataKey: string,
  nameKey: string,
  options?: ChartHelperOptions & { showLabel?: boolean }
): ChartComponentSpec {
  return {
    type: 'chart',
    component: 'PieChart',
    layout: options?.layout,
    title: options?.title,
    description: options?.description,
    props: {
      data,
      pie: {
        dataKey,
        nameKey,
        label: options?.showLabel ?? true,
      },
      showLegend: options?.showLegend ?? true,
      height: options?.height || 400,
      width: options?.width,
    },
  };
}

/**
 * Create an area chart specification
 */
export function createAreaChart(
  data: any[],
  xKey: string,
  areas: Array<{ key: string; label?: string; color?: string }>,
  options?: ChartHelperOptions
): ChartComponentSpec {
  return {
    type: 'chart',
    component: 'AreaChart',
    layout: options?.layout,
    title: options?.title,
    description: options?.description,
    props: {
      data,
      xKey,
      areas: areas.map(area => ({
        key: area.key,
        label: area.label || area.key,
        color: area.color,
      })),
      showLegend: options?.showLegend ?? true,
      showGrid: options?.showGrid ?? true,
      height: options?.height,
      width: options?.width,
    },
  };
}

/**
 * Card grid helper options
 */
export interface CardGridHelperOptions {
  title?: string;
  description?: string;
  layout?: 'inline' | 'artifact';
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  variant?: 'default' | 'bordered' | 'elevated';
}

/**
 * Create a card grid specification
 */
export function createCardGrid(
  cards: CardData[],
  options?: CardGridHelperOptions
): CardGridComponentSpec {
  return {
    type: 'card-grid',
    layout: options?.layout,
    title: options?.title,
    description: options?.description,
    props: {
      cards,
      columns: options?.columns || { default: 1, md: 2, lg: 3 },
      variant: options?.variant || 'default',
    },
  };
}

/**
 * Create a simple card
 */
export function createCard(
  id: string,
  title: string,
  description?: string,
  options?: {
    image?: string;
    metadata?: Record<string, any>;
    actions?: CardData['actions'];
  }
): CardData {
  return {
    id,
    title,
    description,
    image: options?.image,
    metadata: options?.metadata,
    actions: options?.actions,
  };
}

/**
 * Table helper options
 */
export interface TableHelperOptions {
  title?: string;
  description?: string;
  layout?: 'inline' | 'artifact';
  sortable?: boolean;
  filterable?: boolean;
  pagination?: {
    pageSize?: number;
    pageSizeOptions?: number[];
  };
  density?: 'comfortable' | 'compact';
}

/**
 * Create a table specification
 */
export function createTable(
  data: Record<string, any>[],
  columns: TableColumn[],
  options?: TableHelperOptions
): TableComponentSpec {
  return {
    type: 'table',
    layout: options?.layout,
    title: options?.title,
    description: options?.description,
    props: {
      data,
      columns,
      sortable: options?.sortable ?? true,
      filterable: options?.filterable,
      pagination: options?.pagination,
      density: options?.density || 'comfortable',
    },
  };
}

/**
 * Create a table column definition
 */
export function createColumn(
  key: string,
  header: string,
  options?: {
    width?: number | string;
    sortable?: boolean;
    cellType?: 'text' | 'number' | 'date' | 'badge' | 'link';
    format?: TableColumn['format'];
  }
): TableColumn {
  return {
    key,
    header,
    width: options?.width,
    sortable: options?.sortable,
    cellType: options?.cellType || 'text',
    format: options?.format,
  };
}

/**
 * Create a markdown specification
 */
export function createMarkdown(
  content: string,
  options?: {
    title?: string;
    description?: string;
    layout?: 'inline' | 'artifact';
    syntaxHighlight?: boolean;
  }
): MarkdownComponentSpec {
  return {
    type: 'markdown',
    layout: options?.layout,
    title: options?.title,
    description: options?.description,
    props: {
      content,
      syntaxHighlight: options?.syntaxHighlight ?? true,
    },
  };
}

/**
 * Create an artifact container with multiple child components
 */
export function createArtifact(
  content: UIComponentSpec[],
  options?: {
    title?: string;
    description?: string;
    variant?: 'default' | 'bordered' | 'elevated';
  }
): ArtifactComponentSpec {
  return {
    type: 'artifact',
    title: options?.title,
    description: options?.description,
    props: {
      content,
      variant: options?.variant || 'default',
    },
  };
}

/**
 * Smart chart creator - automatically chooses the best chart type based on data
 */
export function createSmartChart(
  data: any[],
  options?: {
    title?: string;
    description?: string;
    layout?: 'inline' | 'artifact';
    xKey?: string;
    yKeys?: string[];
    preferredType?: 'bar' | 'line' | 'area' | 'pie';
  }
): ChartComponentSpec {
  // If no data, return a default bar chart
  if (!data || data.length === 0) {
    return createBarChart([], '', [], options);
  }

  // Auto-detect keys if not provided
  const firstItem = data[0];
  const keys = Object.keys(firstItem);

  // Try to find suitable xKey (first string key or 'name', 'label', 'category', etc.)
  const xKey =
    options?.xKey ||
    keys.find(k =>
      ['name', 'label', 'category', 'date', 'time', 'month', 'year'].includes(k.toLowerCase())
    ) ||
    keys[0];

  // Get numeric keys for yKeys
  const numericKeys = keys.filter(k => k !== xKey && typeof firstItem[k] === 'number');
  const yKeys = options?.yKeys || numericKeys;

  // If only one value key and non-numeric xKey, consider pie chart
  if (
    (options?.preferredType === 'pie' || yKeys.length === 1) &&
    typeof firstItem[xKey] === 'string'
  ) {
    return createPieChart(data, yKeys[0], xKey, options);
  }

  // If xKey looks like a date/time, prefer line chart
  if (
    options?.preferredType === 'line' ||
    xKey.toLowerCase().includes('date') ||
    xKey.toLowerCase().includes('time') ||
    xKey.toLowerCase().includes('month') ||
    xKey.toLowerCase().includes('year')
  ) {
    return createLineChart(
      data,
      xKey,
      yKeys.map(key => ({ key })),
      options
    );
  }

  // Default to bar chart for comparisons
  return createBarChart(
    data,
    xKey,
    yKeys.map(key => ({ key })),
    options
  );
}

/**
 * Wrap data and UI into a ToolHandlerResult
 */
export function createToolResult(data: any, ui: UIComponentSpec): ToolHandlerResult {
  return { data, ui };
}

/**
 * Quick helper: create a tool result with a bar chart
 */
export function resultWithBarChart(
  data: any[],
  xKey: string,
  bars: Array<{ key: string; label?: string; color?: string }>,
  options?: ChartHelperOptions
): ToolHandlerResult {
  return createToolResult(data, createBarChart(data, xKey, bars, options));
}

/**
 * Quick helper: create a tool result with a smart chart
 */
export function resultWithSmartChart(
  data: any[],
  options?: Parameters<typeof createSmartChart>[1]
): ToolHandlerResult {
  return createToolResult(data, createSmartChart(data, options));
}

/**
 * Quick helper: create a tool result with a card grid
 */
export function resultWithCardGrid(
  cards: CardData[],
  options?: CardGridHelperOptions
): ToolHandlerResult {
  return createToolResult(cards, createCardGrid(cards, options));
}

/**
 * Quick helper: create a tool result with a table
 */
export function resultWithTable(
  data: Record<string, any>[],
  columns: TableColumn[],
  options?: TableHelperOptions
): ToolHandlerResult {
  return createToolResult(data, createTable(data, columns, options));
}

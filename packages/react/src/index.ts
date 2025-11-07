/**
 * @antipopp/agno-react
 * React hooks for Agno client
 */

// Context and Provider
export { AgnoProvider, useAgnoClient } from './context/AgnoContext';
export type { AgnoProviderProps } from './context/AgnoContext';
export { ToolHandlerProvider, useToolHandlers } from './context/ToolHandlerContext';
export type { ToolHandlerProviderProps, ToolHandlerContextValue } from './context/ToolHandlerContext';

// Generative UI Components
export { GenerativeUIRenderer } from './components/GenerativeUIRenderer';
export type { GenerativeUIRendererProps } from './components/GenerativeUIRenderer';
export {
  ComponentRegistry,
  getComponentRegistry,
  registerChartComponent,
  getChartComponent,
} from './utils/component-registry';
export type { ComponentRenderer } from './utils/component-registry';

// Generative UI Helpers
export {
  createBarChart,
  createLineChart,
  createPieChart,
  createAreaChart,
  createCardGrid,
  createCard,
  createTable,
  createColumn,
  createMarkdown,
  createArtifact,
  createSmartChart,
  createToolResult,
  resultWithBarChart,
  resultWithSmartChart,
  resultWithCardGrid,
  resultWithTable,
} from './utils/ui-helpers';
export type {
  ChartHelperOptions,
  CardGridHelperOptions,
  TableHelperOptions,
} from './utils/ui-helpers';

// Hooks
export { useAgnoChat } from './hooks/useAgnoChat';
export { useAgnoSession } from './hooks/useAgnoSession';
export { useAgnoActions } from './hooks/useAgnoActions';
export { useAgnoToolExecution, getCustomRender } from './hooks/useAgnoToolExecution';
export type { ToolHandler, ToolExecutionEvent } from './hooks/useAgnoToolExecution';

// Re-export types from dependencies
export type {
  AgnoClientConfig,
  ChatMessage,
  ToolCall,
  SessionEntry,
  AgentDetails,
  TeamDetails,
  ClientState,
  RunEvent,
  // Generative UI types
  UIComponentSpec,
  ChartComponentSpec,
  CardGridComponentSpec,
  TableComponentSpec,
  MarkdownComponentSpec,
  CustomComponentSpec,
  ArtifactComponentSpec,
  ToolHandlerResult,
  GenerativeUIData,
  ChartSeries,
  CardData,
  TableColumn,
} from '@antipopp/agno-types';

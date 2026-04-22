/**
 * @antipopp/agno-react
 * React hooks for Agno client
 */

// Re-export types from dependencies
export type {
  AgentDetails,
  AgnoClientConfig,
  ArtifactComponentSpec,
  CardData,
  CardGridComponentSpec,
  ChartComponentSpec,
  ChartSeries,
  ChatMessage,
  ClientState,
  CustomComponentSpec,
  GenerativeUIData,
  MarkdownComponentSpec,
  PaginationInfo,
  RunEvent,
  SessionEntry,
  SessionsListResponse,
  TableColumn,
  TableComponentSpec,
  TeamDetails,
  ToolCall,
  ToolHandlerResult,
  // Generative UI types
  UIComponentSpec,
} from "@antipopp/agno-types";
export type { GenerativeUIRendererProps } from "./components/GenerativeUIRenderer";
// Generative UI Components
export { GenerativeUIRenderer } from "./components/GenerativeUIRenderer";
export type { AgnoProviderProps } from "./context/AgnoContext";
// Context and Provider
export { AgnoProvider, useAgnoClient } from "./context/AgnoContext";
export type {
  ToolHandlerContextValue,
  ToolHandlerProviderProps,
} from "./context/ToolHandlerContext";
export {
  ToolHandlerProvider,
  useToolHandlers,
} from "./context/ToolHandlerContext";
export { useAgnoActions } from "./hooks/useAgnoActions";
// Hooks
export { useAgnoChat } from "./hooks/useAgnoChat";
export { useAgnoSession } from "./hooks/useAgnoSession";
export type {
  ToolExecutionEvent,
  ToolHandler,
  ToolHandlers,
} from "./hooks/useAgnoToolExecution";
export {
  clearCustomRenderRegistry,
  getCustomRender,
  useAgnoToolExecution,
} from "./hooks/useAgnoToolExecution";
export type { ComponentRenderer } from "./utils/component-registry";
export {
  ComponentRegistry,
  getChartComponent,
  getComponentRegistry,
  registerChartComponent,
} from "./utils/component-registry";
export type {
  CreateValidatedToolHandlerOptions,
  CreateValidatorFromSafeParseOptions,
  SafeParseResult,
  ToolArgsValidationFailure,
  ToolArgsValidationResult,
  ToolArgsValidationSuccess,
  ToolArgsValidator,
  ToolValidationError,
} from "./utils/tool-handler-validation";
export {
  createToolArgsValidatorFromSafeParse,
  createValidatedToolHandler,
} from "./utils/tool-handler-validation";
export type {
  CardGridHelperOptions,
  ChartHelperOptions,
  TableHelperOptions,
} from "./utils/ui-helpers";
// Generative UI Helpers
export {
  createAreaChart,
  createArtifact,
  createBarChart,
  createCard,
  createCardGrid,
  createColumn,
  createLineChart,
  createMarkdown,
  createPieChart,
  createSmartChart,
  createTable,
  createToolResult,
  resultWithBarChart,
  resultWithCardGrid,
  resultWithSmartChart,
  resultWithTable,
} from "./utils/ui-helpers";

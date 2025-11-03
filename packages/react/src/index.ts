/**
 * @antipopp/agno-react
 * React hooks for Agno client
 */

// Context and Provider
export { AgnoProvider, useAgnoClient } from './context/AgnoContext';
export type { AgnoProviderProps } from './context/AgnoContext';

// Hooks
export { useAgnoChat } from './hooks/useAgnoChat';
export { useAgnoSession } from './hooks/useAgnoSession';
export { useAgnoActions } from './hooks/useAgnoActions';
export { useAgnoToolExecution } from './hooks/useAgnoToolExecution';
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
} from '@antipopp/agno-types';

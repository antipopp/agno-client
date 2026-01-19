/**
 * Events emitted during an Agno agent run
 */
export enum RunEvent {
  RunStarted = 'RunStarted',
  RunContent = 'RunContent',
  RunCompleted = 'RunCompleted',
  RunError = 'RunError',
  RunOutput = 'RunOutput',
  UpdatingMemory = 'UpdatingMemory',
  ToolCallStarted = 'ToolCallStarted',
  ToolCallCompleted = 'ToolCallCompleted',
  MemoryUpdateStarted = 'MemoryUpdateStarted',
  MemoryUpdateCompleted = 'MemoryUpdateCompleted',
  ReasoningStarted = 'ReasoningStarted',
  ReasoningStep = 'ReasoningStep',
  ReasoningCompleted = 'ReasoningCompleted',
  RunCancelled = 'RunCancelled',
  RunPaused = 'RunPaused',
  RunContinued = 'RunContinued',
  // Team Events
  TeamRunStarted = 'TeamRunStarted',
  TeamRunContent = 'TeamRunContent',
  TeamRunCompleted = 'TeamRunCompleted',
  TeamRunError = 'TeamRunError',
  TeamRunCancelled = 'TeamRunCancelled',
  TeamToolCallStarted = 'TeamToolCallStarted',
  TeamToolCallCompleted = 'TeamToolCallCompleted',
  TeamReasoningStarted = 'TeamReasoningStarted',
  TeamReasoningStep = 'TeamReasoningStep',
  TeamReasoningCompleted = 'TeamReasoningCompleted',
  TeamMemoryUpdateStarted = 'TeamMemoryUpdateStarted',
  TeamMemoryUpdateCompleted = 'TeamMemoryUpdateCompleted',
  // Custom Events (user-defined events from tools)
  CustomEvent = 'CustomEvent',
}

/**
 * Events emitted by the AgnoClient
 */
export type ClientEvent =
  | 'message:update'
  | 'message:complete'
  | 'message:refreshed'
  | 'message:error'
  | 'session:loaded'
  | 'session:created'
  | 'stream:start'
  | 'stream:end'
  | 'state:change'
  | 'config:change'
  | 'custom:event';
  | 'run:paused'
  | 'run:continued'
  // Generative UI events
  | 'ui:update'       // Emitted when UI component data updates (streaming)
  | 'ui:complete'     // Emitted when UI component is finalized
  | 'ui:render';      // Emitted when a new UI component should be rendered

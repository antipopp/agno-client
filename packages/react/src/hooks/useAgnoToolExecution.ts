import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  ToolCall,
  UIComponentSpec,
  ToolHandlerResult,
  CustomRenderFunction
} from '@antipopp/agno-types';
import { useAgnoClient } from '../context/AgnoContext';
import { useToolHandlers } from '../context/ToolHandlerContext';

/**
 * Tool handler function type (now supports generative UI)
 */
export type ToolHandler = (args: Record<string, any>) => Promise<any>;

/**
 * Runtime registry for custom render functions (not serializable)
 * These are React components/functions that can't be stored in JSON
 */
const customRenderRegistry = new Map<string, CustomRenderFunction>();

/**
 * Store a custom render function and return its unique key
 */
function registerCustomRender(renderFn: CustomRenderFunction): string {
  const key = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  customRenderRegistry.set(key, renderFn);
  return key;
}

/**
 * Get a custom render function by key
 */
export function getCustomRender(key: string): CustomRenderFunction | undefined {
  return customRenderRegistry.get(key);
}

/**
 * Check if a value is a ToolHandlerResult with UI spec
 */
function isToolHandlerResult(value: any): value is ToolHandlerResult {
  return value && typeof value === 'object' && ('data' in value || 'ui' in value);
}

/**
 * Check if a value is a UIComponentSpec
 */
function isUIComponentSpec(value: any): value is UIComponentSpec {
  return value && typeof value === 'object' && 'type' in value;
}

/**
 * Process tool handler result and extract data/UI
 * Exported for use in session loading UI hydration
 */
export function processToolResult(result: any, _tool: ToolCall): {
  resultData: string;
  uiComponent?: any;
} {
  // Case 1: ToolHandlerResult with data and ui
  if (isToolHandlerResult(result)) {
    const { data, ui } = result;

    let uiComponent: any = undefined;
    if (ui) {
      // Handle custom render functions
      if (ui.type === 'custom' && typeof (ui as any).render === 'function') {
        const renderKey = registerCustomRender((ui as any).render);
        uiComponent = {
          ...ui,
          renderKey,
          render: undefined, // Don't store the function itself
        };
      } else {
        // Serializable UI spec
        uiComponent = ui;
      }
    }

    return {
      resultData: typeof data === 'string' ? data : JSON.stringify(data),
      uiComponent,
    };
  }

  // Case 2: Direct UI component spec (no separate data)
  if (isUIComponentSpec(result)) {
    let uiComponent: any;
    if (result.type === 'custom' && typeof (result as any).render === 'function') {
      const renderKey = registerCustomRender((result as any).render);
      uiComponent = {
        ...result,
        renderKey,
        render: undefined,
      };
    } else {
      uiComponent = result;
    }

    return {
      resultData: JSON.stringify(result),
      uiComponent,
    };
  }

  // Case 3: Legacy format - plain data (backward compatible)
  return {
    resultData: typeof result === 'string' ? result : JSON.stringify(result),
    uiComponent: undefined,
  };
}

/**
 * Tool execution event payload
 */
export interface ToolExecutionEvent {
  runId?: string;
  sessionId?: string;
  tools: ToolCall[];
}

/**
 * Hook for handling frontend tool execution (HITL)
 *
 * @param handlers - Map of tool names to handler functions (local handlers)
 * @param autoExecute - Whether to automatically execute tools when paused (default: true)
 *
 * @example
 * ```tsx
 * const toolHandlers = {
 *   navigate_to_page: async (args) => {
 *     window.location.href = args.url;
 *     return { success: true };
 *   },
 *   fill_form: async (args) => {
 *     document.querySelector(args.selector).value = args.value;
 *     return { filled: true };
 *   }
 * };
 *
 * const { isPaused, isExecuting, pendingTools } = useAgnoToolExecution(toolHandlers);
 * ```
 */
export function useAgnoToolExecution(
  handlers: Record<string, ToolHandler> = {},
  autoExecute: boolean = true
) {
  const client = useAgnoClient();
  const toolHandlerContext = useToolHandlers();

  // Merge global handlers with local handlers (local takes precedence)
  const mergedHandlers = useMemo(() => {
    const globalHandlers = toolHandlerContext?.handlers || {};
    return { ...globalHandlers, ...handlers };
  }, [toolHandlerContext?.handlers, handlers]);

  const [pendingTools, setPendingTools] = useState<ToolCall[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | undefined>();

  // Listen for run:paused events
  useEffect(() => {
    const handleRunPaused = (event: ToolExecutionEvent) => {
      setIsPaused(true);
      setPendingTools(event.tools);
      setExecutionError(undefined);
    };

    const handleRunContinued = () => {
      setIsPaused(false);
      setPendingTools([]);
      setIsExecuting(false);
      setExecutionError(undefined);
    };

    client.on('run:paused', handleRunPaused);
    client.on('run:continued', handleRunContinued);

    return () => {
      client.off('run:paused', handleRunPaused);
      client.off('run:continued', handleRunContinued);
    };
  }, [client]);

  /**
   * Execute all pending tools and continue the run
   */
  const executeAndContinue = useCallback(async () => {
    if (!isPaused || pendingTools.length === 0) {
      console.warn('[useAgnoToolExecution] Cannot execute: no pending tools');
      return;
    }

    setIsExecuting(true);
    setExecutionError(undefined);

    try {
      // Execute each tool
      const updatedTools = await Promise.all(
        pendingTools.map(async (tool) => {
          const handler = mergedHandlers[tool.tool_name];

          if (!handler) {
            return {
              ...tool,
              result: JSON.stringify({
                error: `No handler registered for ${tool.tool_name}`,
              }),
            };
          }

          try {
            const result = await handler(tool.tool_args);

            // Process result to extract data and UI components
            const { resultData, uiComponent } = processToolResult(result, tool);

            return {
              ...tool,
              result: resultData,
              ui_component: uiComponent,
            } as ToolCall;
          } catch (error) {
            return {
              ...tool,
              result: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            };
          }
        })
      );

      // Store UI components in the client's message store before continuing
      // This ensures the UI components are visible even if the backend doesn't echo them back
      const toolsWithUI = updatedTools.filter(t => (t as any).ui_component);
      if (toolsWithUI.length > 0) {
        // Emit a custom event with the UI data
        client.emit('ui:render', {
          tools: updatedTools,
          runId: client.getState().pausedRunId,
        });
      }

      // Add frontend-executed tool calls to the message before continuing
      // This ensures they appear in the UI and persist in the message
      client.addToolCallsToLastMessage(updatedTools);

      // Continue the run with results
      await client.continueRun(updatedTools);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setExecutionError(errorMessage);
      setIsExecuting(false);
      throw error;
    }
  }, [client, mergedHandlers, isPaused, pendingTools]);

  /**
   * Hydrate tool calls with UI when session loads
   */
  useEffect(() => {
    const handleSessionLoaded = async (_sessionId: string) => {
      const messages = client.getMessages();

      for (const message of messages) {
        if (!message.tool_calls) continue;

        for (const tool of message.tool_calls) {
          // Skip if already has UI
          if ((tool as any).ui_component) continue;

          const handler = mergedHandlers[tool.tool_name];
          if (!handler) continue;

          try {
            const result = await handler(tool.tool_args);
            const { uiComponent } = processToolResult(result, tool);

            if (uiComponent) {
              client.hydrateToolCallUI(tool.tool_call_id, uiComponent);
            }
          } catch (err) {
            console.error(`Failed to hydrate UI for ${tool.tool_name}:`, err);
          }
        }
      }
    };

    client.on('session:loaded', handleSessionLoaded);
    return () => {
      client.off('session:loaded', handleSessionLoaded);
    };
  }, [client, mergedHandlers]);

  /**
   * Execute tools manually (for user confirmation flows)
   * Returns the updated tools with results set
   */
  const executeTools = useCallback(
    async (tools: ToolCall[]): Promise<ToolCall[]> => {
      return Promise.all(
        tools.map(async (tool) => {
          const handler = mergedHandlers[tool.tool_name];
          if (!handler) return tool;

          try {
            const result = await handler(tool.tool_args);

            // Process result to extract data and UI components
            const { resultData, uiComponent } = processToolResult(result, tool);

            return {
              ...tool,
              result: resultData,
              ui_component: uiComponent,
            } as ToolCall;
          } catch (error) {
            return {
              ...tool,
              result: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            };
          }
        })
      );
    },
    [mergedHandlers]
  );

  /**
   * Manually continue the run with custom tool results
   */
  const continueWithResults = useCallback(
    async (tools: ToolCall[]) => {
      if (!isPaused) {
        throw new Error('No paused run to continue');
      }
      setIsExecuting(true);
      try {
        await client.continueRun(tools);
      } catch (error) {
        setIsExecuting(false);
        throw error;
      }
    },
    [client, isPaused]
  );

  // Auto-execute when paused (if enabled)
  useEffect(() => {
    if (autoExecute && isPaused && !isExecuting && pendingTools.length > 0) {
      executeAndContinue();
    }
  }, [autoExecute, isPaused, isExecuting, pendingTools.length, executeAndContinue]);

  return {
    /** Whether the run is currently paused awaiting tool execution */
    isPaused,
    /** Whether tools are currently being executed */
    isExecuting,
    /** Tools awaiting execution */
    pendingTools,
    /** Execute all pending tools and continue the run */
    executeAndContinue,
    /** Execute specific tools and return results without continuing */
    executeTools,
    /** Continue the run with manually provided tool results */
    continueWithResults,
    /** Error from tool execution, if any */
    executionError,
  };
}

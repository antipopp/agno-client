import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ToolCall } from '@antipopp/agno-types';
import { useAgnoClient } from '../context/AgnoContext';
import { useToolHandlers } from '../context/ToolHandlerContext';

/**
 * Tool handler function type
 */
export type ToolHandler = (args: Record<string, any>) => Promise<any>;

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
      console.log('[useAgnoToolExecution] Run paused event received');
      console.log('[useAgnoToolExecution] Event:', event);
      console.log('[useAgnoToolExecution] Tools:', event.tools);
      console.log('[useAgnoToolExecution] Number of tools:', event.tools?.length);
      event.tools?.forEach((tool, idx) => {
        console.log(`[useAgnoToolExecution] Tool ${idx}:`, {
          name: tool.tool_name,
          id: tool.tool_call_id,
          args_type: typeof tool.tool_args,
          args: tool.tool_args,
        });
      });
      setIsPaused(true);
      setPendingTools(event.tools);
      setExecutionError(undefined);
    };

    const handleRunContinued = () => {
      console.log('[useAgnoToolExecution] Run continued');
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
      console.log('[useAgnoToolExecution] Executing', pendingTools.length, 'tools');

      // Execute each tool
      const updatedTools = await Promise.all(
        pendingTools.map(async (tool) => {
          const handler = mergedHandlers[tool.tool_name];

          if (!handler) {
            console.warn(`[useAgnoToolExecution] No handler for tool: ${tool.tool_name}`);
            return {
              ...tool,
              result: JSON.stringify({
                error: `No handler registered for ${tool.tool_name}`,
              }),
            };
          }

          try {
            console.log(`[useAgnoToolExecution] Executing tool: ${tool.tool_name}`, tool.tool_args);
            const result = await handler(tool.tool_args);
            console.log(`[useAgnoToolExecution] Tool result:`, result);
            return {
              ...tool,
              result: typeof result === 'string' ? result : JSON.stringify(result),
            };
          } catch (error) {
            console.error(`[useAgnoToolExecution] Tool execution error:`, error);
            return {
              ...tool,
              result: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            };
          }
        })
      );

      // Continue the run with results
      console.log('[useAgnoToolExecution] Continuing run with results');
      await client.continueRun(updatedTools);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[useAgnoToolExecution] Failed to continue run:', errorMessage);
      setExecutionError(errorMessage);
      setIsExecuting(false);
      throw error;
    }
  }, [client, mergedHandlers, isPaused, pendingTools]);

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
            return {
              ...tool,
              result: typeof result === 'string' ? result : JSON.stringify(result),
            };
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
      console.log('[useAgnoToolExecution] Auto-executing tools');
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

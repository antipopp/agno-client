import type {
  CustomRenderFunction,
  ToolCall,
  ToolHandlerResult,
  UIComponentSpec,
} from "@antipopp/agno-types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAgnoClient } from "../context/AgnoContext";
import { useToolHandlers } from "../context/ToolHandlerContext";

/**
 * Tool handler function type (now supports generative UI)
 */
type MaybePromise<T> = T | Promise<T>;

export type ToolHandler<
  TArgs extends ToolCall["tool_args"] = ToolCall["tool_args"],
  TResult = unknown,
> = {
  bivarianceHack(args: TArgs): MaybePromise<TResult>;
}["bivarianceHack"];

export type ToolHandlers = Record<string, ToolHandler>;

interface ToolResultProcessing {
  resultData: string;
  uiComponent?: UIComponentSpec;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeToolArgs(rawArgs: unknown): Record<string, unknown> {
  if (isRecord(rawArgs)) {
    return rawArgs;
  }

  if (typeof rawArgs !== "string") {
    return {};
  }

  try {
    const parsed = JSON.parse(rawArgs);
    if (isRecord(parsed)) {
      return parsed;
    }
  } catch {
    // Fall through and preserve string payload as content.
  }

  return { content: rawArgs };
}

function getCustomRenderFunction(
  value: UIComponentSpec
): CustomRenderFunction | undefined {
  if (value.type !== "custom") {
    return undefined;
  }

  const maybeRender = (value as UIComponentSpec & { render?: unknown }).render;
  return typeof maybeRender === "function"
    ? (maybeRender as CustomRenderFunction)
    : undefined;
}

/**
 * Runtime registry for custom render functions (not serializable)
 * These are React components/functions that can't be stored in JSON
 *
 * Note: This is a module-level Map for runtime storage of React components.
 * Call clearCustomRenderRegistry() during cleanup to prevent memory leaks.
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

function toSerializableUIComponent(spec: UIComponentSpec): UIComponentSpec {
  const renderFn = getCustomRenderFunction(spec);
  if (!renderFn) {
    return spec;
  }

  const { render: _render, ...uiWithoutRender } = spec as UIComponentSpec & {
    render?: unknown;
  };
  return {
    ...uiWithoutRender,
    renderKey: registerCustomRender(renderFn),
  } as UIComponentSpec;
}

async function executeToolCall(
  tool: ToolCall,
  handlers: ToolHandlers
): Promise<ToolCall> {
  const handler = handlers[tool.tool_name];
  if (!handler) {
    return {
      ...tool,
      result: JSON.stringify({
        error: `No handler registered for ${tool.tool_name}`,
      }),
    };
  }

  try {
    const result = await handler(normalizeToolArgs(tool.tool_args));
    const { resultData, uiComponent } = processToolResult(result, tool);

    return {
      ...tool,
      result: resultData,
      ui_component: uiComponent,
    };
  } catch (error) {
    return {
      ...tool,
      result: JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
}

async function hydrateToolUIForSession(
  tools: ToolCall[],
  handlers: ToolHandlers,
  onHydrate: (toolCallId: string, uiComponent: UIComponentSpec) => void
): Promise<void> {
  for (const tool of tools) {
    if (tool.ui_component) {
      continue;
    }

    const handler = handlers[tool.tool_name];
    if (!handler) {
      continue;
    }

    try {
      const result = await handler(normalizeToolArgs(tool.tool_args));
      const { uiComponent } = processToolResult(result, tool);

      if (uiComponent) {
        onHydrate(tool.tool_call_id, uiComponent);
      }
    } catch (error) {
      console.error(`Failed to hydrate UI for ${tool.tool_name}:`, error);
    }
  }
}

/**
 * Get a custom render function by key
 */
export function getCustomRender(key: string): CustomRenderFunction | undefined {
  return customRenderRegistry.get(key);
}

/**
 * Clear all custom render functions from the registry.
 * Call this during cleanup (e.g., when AgnoProvider unmounts) to prevent memory leaks.
 */
export function clearCustomRenderRegistry(): void {
  customRenderRegistry.clear();
}

/**
 * Check if a value is a ToolHandlerResult with UI spec
 */
function isToolHandlerResult(value: unknown): value is ToolHandlerResult {
  return isRecord(value) && ("data" in value || "ui" in value);
}

/**
 * Check if a value is a UIComponentSpec
 */
function isUIComponentSpec(value: unknown): value is UIComponentSpec {
  return isRecord(value) && typeof value.type === "string";
}

/**
 * Process tool handler result and extract data/UI
 * Exported for use in session loading UI hydration
 */
export function processToolResult(
  result: unknown,
  _tool: ToolCall
): ToolResultProcessing {
  // Case 1: ToolHandlerResult with data and ui
  if (isToolHandlerResult(result)) {
    const { data, ui } = result;

    let uiComponent: UIComponentSpec | undefined;
    if (ui) {
      uiComponent = toSerializableUIComponent(ui);
    }

    return {
      resultData: typeof data === "string" ? data : JSON.stringify(data),
      uiComponent,
    };
  }

  // Case 2: Direct UI component spec (no separate data)
  if (isUIComponentSpec(result)) {
    const uiComponent = toSerializableUIComponent(result);

    return {
      resultData: JSON.stringify(result),
      uiComponent,
    };
  }

  // Case 3: Legacy format - plain data (backward compatible)
  return {
    resultData: typeof result === "string" ? result : JSON.stringify(result),
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
 * **Note:** HITL (Human-in-the-Loop) frontend tool execution is only supported for agents.
 * Teams do not support the continue endpoint. This hook will log a warning and no-op if used with team mode.
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
  handlers: ToolHandlers = {},
  autoExecute = true
) {
  const client = useAgnoClient();
  const toolHandlerContext = useToolHandlers();

  // Check if in team mode - teams don't support HITL
  const isTeamMode = client.getConfig().mode === "team";

  // Log warning once if in team mode
  useEffect(() => {
    if (isTeamMode) {
      console.warn(
        "[useAgnoToolExecution] HITL (Human-in-the-Loop) frontend tool execution is not supported for teams. " +
          "Only agents support the continue endpoint. This hook will not function in team mode."
      );
    }
  }, [isTeamMode]);

  // Merge global handlers with local handlers (local takes precedence)
  const mergedHandlers = useMemo(() => {
    const globalHandlers = toolHandlerContext?.handlers || {};
    return { ...globalHandlers, ...handlers };
  }, [toolHandlerContext?.handlers, handlers]);

  const [pendingTools, setPendingTools] = useState<ToolCall[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | undefined>();

  // Listen for run:paused events (only for agents, not teams)
  useEffect(() => {
    // Don't register listeners if in team mode
    if (isTeamMode) {
      return;
    }

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

    client.on("run:paused", handleRunPaused);
    client.on("run:continued", handleRunContinued);

    return () => {
      client.off("run:paused", handleRunPaused);
      client.off("run:continued", handleRunContinued);
    };
  }, [client, isTeamMode]);

  /**
   * Execute all pending tools and continue the run
   */
  const executeAndContinue = useCallback(async () => {
    if (!isPaused || pendingTools.length === 0) {
      console.warn("[useAgnoToolExecution] Cannot execute: no pending tools");
      return;
    }

    setIsExecuting(true);
    setExecutionError(undefined);

    try {
      const updatedTools = await Promise.all(
        pendingTools.map((tool) => executeToolCall(tool, mergedHandlers))
      );

      // Store UI components in the client's message store before continuing
      // This ensures the UI components are visible even if the backend doesn't echo them back
      const toolsWithUI = updatedTools.filter((tool) => tool.ui_component);
      if (toolsWithUI.length > 0) {
        // Emit a custom event with the UI data
        client.emit("ui:render", {
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
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setExecutionError(errorMessage);
      setIsExecuting(false);
      throw error;
    }
  }, [client, mergedHandlers, isPaused, pendingTools]);

  /**
   * Hydrate tool calls with UI when session loads
   */
  useEffect(() => {
    const handleSessionLoaded = (_sessionId: string) => {
      const tools = client
        .getMessages()
        .flatMap((message) => message.tool_calls || []);

      hydrateToolUIForSession(
        tools,
        mergedHandlers,
        (toolCallId, uiComponent) => {
          client.hydrateToolCallUI(toolCallId, uiComponent);
        }
      ).catch((error) => {
        console.error(
          "[useAgnoToolExecution] Failed to hydrate session UI:",
          error
        );
      });
    };

    client.on("session:loaded", handleSessionLoaded);
    return () => {
      client.off("session:loaded", handleSessionLoaded);
    };
  }, [client, mergedHandlers]);

  /**
   * Execute tools manually (for user confirmation flows)
   * Returns the updated tools with results set
   */
  const executeTools = useCallback(
    (tools: ToolCall[]): Promise<ToolCall[]> => {
      return Promise.all(
        tools.map((tool) => executeToolCall(tool, mergedHandlers))
      );
    },
    [mergedHandlers]
  );

  /**
   * Manually continue the run with custom tool results
   */
  const continueWithResults = useCallback(
    async (
      tools: ToolCall[],
      options?: {
        headers?: Record<string, string>;
        params?: Record<string, string>;
      }
    ) => {
      if (!isPaused) {
        throw new Error("No paused run to continue");
      }
      setIsExecuting(true);
      try {
        await client.continueRun(tools, options);
      } catch (error) {
        setIsExecuting(false);
        throw error;
      }
    },
    [client, isPaused]
  );

  // Auto-execute when paused (if enabled)
  useEffect(() => {
    if (
      autoExecute &&
      isPaused &&
      !isExecuting &&
      !executionError &&
      pendingTools.length > 0
    ) {
      executeAndContinue().catch(() => {
        // executionError state is already set by executeAndContinue
      });
    }
  }, [
    autoExecute,
    isPaused,
    isExecuting,
    executionError,
    pendingTools.length,
    executeAndContinue,
  ]);

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

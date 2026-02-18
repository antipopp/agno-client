import type { AgnoClientConfig, ToolCall } from "@antipopp/agno-types";
import { render, screen, waitFor } from "@testing-library/react";
import { useEffect, useMemo } from "react";
import { describe, expect, it, vi } from "vitest";
import { AgnoProvider, useAgnoClient } from "../../context/AgnoContext";
import {
  processToolResult,
  type ToolHandlers,
  useAgnoToolExecution,
} from "../../hooks/useAgnoToolExecution";
import { createValidatedToolHandler } from "../../utils/tool-handler-validation";

const defaultConfig: AgnoClientConfig = {
  endpoint: "http://localhost:7777",
  mode: "agent",
  agentId: "test-agent",
};

const teamConfig: AgnoClientConfig = {
  endpoint: "http://localhost:7777",
  mode: "team",
  teamId: "test-team",
};

// Test component for useAgnoToolExecution
const TestToolExecutionComponent = ({
  handlers = {},
  autoExecute = false,
}: {
  handlers?: ToolHandlers;
  autoExecute?: boolean;
}) => {
  const {
    isPaused,
    isExecuting,
    pendingTools,
    executeAndContinue,
    executionError,
  } = useAgnoToolExecution(handlers, autoExecute);

  return (
    <div>
      <div data-testid="is-paused">{isPaused ? "true" : "false"}</div>
      <div data-testid="is-executing">{isExecuting ? "true" : "false"}</div>
      <div data-testid="pending-tools">{JSON.stringify(pendingTools)}</div>
      <div data-testid="error">{executionError || "none"}</div>
      <button data-testid="execute" onClick={executeAndContinue} type="button">
        Execute
      </button>
    </div>
  );
};

const pausedTool: ToolCall = {
  role: "tool",
  content: null,
  tool_call_id: "tool-auto-1",
  tool_name: "test_tool",
  tool_args: {},
  tool_call_error: false,
  metrics: { time: 0 },
  created_at: 1_700_000_000,
};

const AutoExecuteFailureComponent = ({
  onContinueAttempt,
}: {
  onContinueAttempt: () => void;
}) => {
  const client = useAgnoClient();
  const handlers = useMemo(
    () => ({
      test_tool: vi.fn().mockResolvedValue({ ok: true }),
    }),
    []
  );
  const { isPaused, isExecuting, executionError } = useAgnoToolExecution(
    handlers,
    true
  );

  useEffect(() => {
    const continueSpy = vi
      .spyOn(client, "continueRun")
      .mockImplementation(() => {
        onContinueAttempt();
        return Promise.reject(new Error("Run is not paused"));
      });

    client.emit("run:paused", {
      runId: "run-auto-1",
      sessionId: "session-auto-1",
      tools: [pausedTool],
    });

    return () => {
      continueSpy.mockRestore();
    };
  }, [client, onContinueAttempt]);

  return (
    <div>
      <div data-testid="auto-is-paused">{isPaused ? "true" : "false"}</div>
      <div data-testid="auto-is-executing">
        {isExecuting ? "true" : "false"}
      </div>
      <div data-testid="auto-error">{executionError || "none"}</div>
    </div>
  );
};

describe("processToolResult", () => {
  const baseTool: ToolCall = {
    role: "tool",
    content: null,
    tool_call_id: "call-1",
    tool_name: "test_tool",
    tool_args: {},
    tool_call_error: false,
    metrics: { time: 0 },
    created_at: 1_700_000_000,
  };

  describe("legacy format (plain data)", () => {
    it("should return string result as-is", () => {
      const { resultData, uiComponent } = processToolResult(
        "plain string",
        baseTool
      );

      expect(resultData).toBe("plain string");
      expect(uiComponent).toBeUndefined();
    });

    it("should stringify object result", () => {
      const { resultData, uiComponent } = processToolResult(
        { key: "value" },
        baseTool
      );

      expect(resultData).toBe('{"key":"value"}');
      expect(uiComponent).toBeUndefined();
    });

    it("should stringify array result", () => {
      const { resultData, uiComponent } = processToolResult(
        [1, 2, 3],
        baseTool
      );

      expect(resultData).toBe("[1,2,3]");
      expect(uiComponent).toBeUndefined();
    });
  });

  describe("ToolHandlerResult format", () => {
    it("should extract data from result", () => {
      const result = {
        data: { success: true },
      };

      const { resultData, uiComponent } = processToolResult(result, baseTool);

      expect(resultData).toBe('{"success":true}');
      expect(uiComponent).toBeUndefined();
    });

    it("should extract string data from result", () => {
      const result = {
        data: "string data",
      };

      const { resultData } = processToolResult(result, baseTool);

      expect(resultData).toBe("string data");
    });

    it("should extract UI component from result", () => {
      const result = {
        data: { value: 42 },
        ui: {
          type: "chart",
          props: { data: [1, 2, 3] },
        },
      };

      const { resultData, uiComponent } = processToolResult(result, baseTool);

      expect(resultData).toBe('{"value":42}');
      expect(uiComponent).toEqual({
        type: "chart",
        props: { data: [1, 2, 3] },
      });
    });
  });

  describe("direct UIComponentSpec format", () => {
    it("should recognize UI component spec", () => {
      const result = {
        type: "card",
        props: { title: "Test" },
      };

      const { resultData, uiComponent } = processToolResult(result, baseTool);

      expect(uiComponent?.type).toBe("card");
      expect(resultData).toContain("card");
    });
  });

  describe("custom render functions", () => {
    it("should register custom render function and return key", () => {
      const result = {
        data: "rendered data",
        ui: {
          type: "custom",
          render: () => null, // React component
        },
      };

      const { uiComponent } = processToolResult(result, baseTool);

      expect(uiComponent?.type).toBe("custom");

      if (!(uiComponent && uiComponent.type === "custom")) {
        throw new Error("Expected custom UI component");
      }

      expect(uiComponent.renderKey).toBeDefined();
      expect("render" in uiComponent).toBe(false); // Function not stored
    });
  });
});

describe("useAgnoToolExecution", () => {
  describe("initial state", () => {
    it("should start not paused", () => {
      render(
        <AgnoProvider config={defaultConfig}>
          <TestToolExecutionComponent />
        </AgnoProvider>
      );

      expect(screen.getByTestId("is-paused").textContent).toBe("false");
    });

    it("should start not executing", () => {
      render(
        <AgnoProvider config={defaultConfig}>
          <TestToolExecutionComponent />
        </AgnoProvider>
      );

      expect(screen.getByTestId("is-executing").textContent).toBe("false");
    });

    it("should start with empty pending tools", () => {
      render(
        <AgnoProvider config={defaultConfig}>
          <TestToolExecutionComponent />
        </AgnoProvider>
      );

      expect(screen.getByTestId("pending-tools").textContent).toBe("[]");
    });

    it("should start with no error", () => {
      render(
        <AgnoProvider config={defaultConfig}>
          <TestToolExecutionComponent />
        </AgnoProvider>
      );

      expect(screen.getByTestId("error").textContent).toBe("none");
    });
  });

  describe("team mode warning", () => {
    it("should log warning in team mode", () => {
      const consoleSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);

      render(
        <AgnoProvider config={teamConfig}>
          <TestToolExecutionComponent />
        </AgnoProvider>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "HITL (Human-in-the-Loop) frontend tool execution is not supported for teams"
        )
      );

      consoleSpy.mockRestore();
    });
  });

  describe("handler registration", () => {
    it("should accept empty handlers", () => {
      render(
        <AgnoProvider config={defaultConfig}>
          <TestToolExecutionComponent handlers={{}} />
        </AgnoProvider>
      );

      // Should render without error
      expect(screen.getByTestId("is-paused")).toBeDefined();
    });

    it("should accept handlers map", () => {
      const handlers = {
        test_tool: vi.fn().mockResolvedValue("result"),
      };

      render(
        <AgnoProvider config={defaultConfig}>
          <TestToolExecutionComponent handlers={handlers} />
        </AgnoProvider>
      );

      // Should render without error
      expect(screen.getByTestId("is-paused")).toBeDefined();
    });

    it("should accept synchronous handlers", () => {
      const handlers = {
        test_tool: vi.fn().mockReturnValue({ success: true }),
      };

      render(
        <AgnoProvider config={defaultConfig}>
          <TestToolExecutionComponent handlers={handlers} />
        </AgnoProvider>
      );

      expect(screen.getByTestId("is-paused")).toBeDefined();
    });

    it("should accept validated tool handlers", () => {
      const handlers = {
        test_tool: createValidatedToolHandler(
          (args) => {
            if (typeof args.content !== "string") {
              return {
                success: false,
                message: "content must be a string",
              };
            }

            return {
              success: true,
              data: {
                content: args.content,
              },
            };
          },
          (args) => ({
            success: true,
            content: args.content,
          })
        ),
      } satisfies ToolHandlers;

      render(
        <AgnoProvider config={defaultConfig}>
          <TestToolExecutionComponent handlers={handlers} />
        </AgnoProvider>
      );

      expect(screen.getByTestId("is-paused")).toBeDefined();
    });
  });

  describe("auto-execute disabled", () => {
    it("should not auto-execute when autoExecute is false", () => {
      const handlers = {
        test_tool: vi.fn().mockResolvedValue("result"),
      };

      render(
        <AgnoProvider config={defaultConfig}>
          <TestToolExecutionComponent autoExecute={false} handlers={handlers} />
        </AgnoProvider>
      );

      // Handlers should not be called on mount
      expect(handlers.test_tool).not.toHaveBeenCalled();
    });
  });

  describe("auto-execute error handling", () => {
    it("should stop retrying after continueRun failure", async () => {
      let continueAttempts = 0;

      render(
        <AgnoProvider config={defaultConfig}>
          <AutoExecuteFailureComponent
            onContinueAttempt={() => {
              continueAttempts += 1;
            }}
          />
        </AgnoProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("auto-error").textContent).toBe(
          "Run is not paused"
        );
      });

      await new Promise((resolve) => setTimeout(resolve, 25));

      expect(continueAttempts).toBe(1);
      expect(screen.getByTestId("auto-is-paused").textContent).toBe("true");
      expect(screen.getByTestId("auto-is-executing").textContent).toBe("false");
    });
  });
});

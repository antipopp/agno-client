import type { AgnoClientConfig } from "@antipopp/agno-types";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { AgnoProvider } from "../../context/AgnoContext";
import { useAgnoActions } from "../../hooks/useAgnoActions";

const defaultConfig: AgnoClientConfig = {
  endpoint: "http://localhost:7777",
};

// Test component that captures hook result
const TestActionsComponent = ({
  onHookResult,
}: {
  onHookResult?: (result: ReturnType<typeof useAgnoActions>) => void;
}) => {
  const hookResult = useAgnoActions();

  React.useEffect(() => {
    onHookResult?.(hookResult);
  }, [hookResult, onHookResult]);

  return (
    <div>
      <div data-testid="initializing">
        {hookResult.isInitializing ? "true" : "false"}
      </div>
      <div data-testid="error">{hookResult.error || "none"}</div>
      <button
        data-testid="initialize"
        onClick={() => hookResult.initialize()}
        type="button"
      >
        Initialize
      </button>
      <button
        data-testid="check-status"
        onClick={() => hookResult.checkStatus()}
        type="button"
      >
        Check Status
      </button>
    </div>
  );
};

describe("useAgnoActions", () => {
  describe("initial state", () => {
    it("should start not initializing", () => {
      render(
        <AgnoProvider config={defaultConfig}>
          <TestActionsComponent />
        </AgnoProvider>
      );

      expect(screen.getByTestId("initializing").textContent).toBe("false");
    });

    it("should start with no error", () => {
      render(
        <AgnoProvider config={defaultConfig}>
          <TestActionsComponent />
        </AgnoProvider>
      );

      expect(screen.getByTestId("error").textContent).toBe("none");
    });
  });

  describe("hook interface", () => {
    it("should provide all expected methods and state", () => {
      let hookResult: ReturnType<typeof useAgnoActions> | null = null;

      const CaptureHook = () => {
        hookResult = useAgnoActions();
        return null;
      };

      render(
        <AgnoProvider config={defaultConfig}>
          <CaptureHook />
        </AgnoProvider>
      );

      expect(hookResult).not.toBeNull();

      if (!hookResult) {
        throw new Error("Expected hook result to be available");
      }

      const result = hookResult as ReturnType<typeof useAgnoActions>;

      expect(typeof result.initialize).toBe("function");
      expect(typeof result.checkStatus).toBe("function");
      expect(typeof result.fetchAgents).toBe("function");
      expect(typeof result.fetchTeams).toBe("function");
      expect(typeof result.getApprovalStatus).toBe("function");
      expect(typeof result.updateConfig).toBe("function");
      expect(typeof result.isInitializing).toBe("boolean");
      expect(result.error).toBeUndefined();
    });
  });

  describe("updateConfig", () => {
    it("should update client configuration", () => {
      let hookResult: ReturnType<typeof useAgnoActions> | null = null;

      const CaptureHook = () => {
        hookResult = useAgnoActions();
        return null;
      };

      render(
        <AgnoProvider config={defaultConfig}>
          <CaptureHook />
        </AgnoProvider>
      );

      if (!hookResult) {
        throw new Error("Expected hook result to be available");
      }

      const result = hookResult as ReturnType<typeof useAgnoActions>;

      // Should not throw when calling updateConfig
      expect(() => {
        result.updateConfig({ agentId: "new-agent" });
      }).not.toThrow();
    });
  });

  describe("function stability", () => {
    it("should return stable function references across renders", () => {
      const capturedFunctions: ReturnType<typeof useAgnoActions>[] = [];

      const CaptureHook = () => {
        const result = useAgnoActions();
        capturedFunctions.push(result);
        return null;
      };

      const { rerender } = render(
        <AgnoProvider config={defaultConfig}>
          <CaptureHook />
        </AgnoProvider>
      );

      rerender(
        <AgnoProvider config={defaultConfig}>
          <CaptureHook />
        </AgnoProvider>
      );

      expect(capturedFunctions.length).toBe(2);
      expect(capturedFunctions[0].initialize).toBe(
        capturedFunctions[1].initialize
      );
      expect(capturedFunctions[0].checkStatus).toBe(
        capturedFunctions[1].checkStatus
      );
      expect(capturedFunctions[0].fetchAgents).toBe(
        capturedFunctions[1].fetchAgents
      );
      expect(capturedFunctions[0].fetchTeams).toBe(
        capturedFunctions[1].fetchTeams
      );
      expect(capturedFunctions[0].getApprovalStatus).toBe(
        capturedFunctions[1].getApprovalStatus
      );
      expect(capturedFunctions[0].updateConfig).toBe(
        capturedFunctions[1].updateConfig
      );
    });
  });
});

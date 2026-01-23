import type { AgnoClientConfig } from "@antipopp/agno-types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgnoProvider } from "../../context/AgnoContext";
import { useAgnoSession } from "../../hooks/useAgnoSession";

const defaultConfig: AgnoClientConfig = {
  endpoint: "http://localhost:7777",
  mode: "agent",
  agentId: "test-agent",
};

// Test component
const TestSessionComponent = () => {
  const { sessions, currentSessionId, isLoading, error } = useAgnoSession();

  return (
    <div>
      <div data-testid="sessions">{JSON.stringify(sessions)}</div>
      <div data-testid="current-session">{currentSessionId || "none"}</div>
      <div data-testid="is-loading">{isLoading ? "true" : "false"}</div>
      <div data-testid="error">{error || "none"}</div>
    </div>
  );
};

describe("useAgnoSession", () => {
  describe("initial state", () => {
    it("should start with empty sessions", () => {
      render(
        <AgnoProvider config={defaultConfig}>
          <TestSessionComponent />
        </AgnoProvider>
      );

      expect(screen.getByTestId("sessions").textContent).toBe("[]");
    });

    it("should start with no current session", () => {
      render(
        <AgnoProvider config={defaultConfig}>
          <TestSessionComponent />
        </AgnoProvider>
      );

      expect(screen.getByTestId("current-session").textContent).toBe("none");
    });

    it("should start not loading", () => {
      render(
        <AgnoProvider config={defaultConfig}>
          <TestSessionComponent />
        </AgnoProvider>
      );

      expect(screen.getByTestId("is-loading").textContent).toBe("false");
    });

    it("should start with no error", () => {
      render(
        <AgnoProvider config={defaultConfig}>
          <TestSessionComponent />
        </AgnoProvider>
      );

      expect(screen.getByTestId("error").textContent).toBe("none");
    });
  });

  describe("hook interface", () => {
    it("should provide all expected methods and state", () => {
      let hookResult: ReturnType<typeof useAgnoSession> | null = null;

      const CaptureHook = () => {
        hookResult = useAgnoSession();
        return null;
      };

      render(
        <AgnoProvider config={defaultConfig}>
          <CaptureHook />
        </AgnoProvider>
      );

      expect(hookResult).not.toBeNull();
      expect(typeof hookResult!.sessions).toBe("object");
      expect(Array.isArray(hookResult!.sessions)).toBe(true);
      expect(hookResult!.currentSessionId).toBeUndefined();
      expect(typeof hookResult!.isLoading).toBe("boolean");
      expect(typeof hookResult!.fetchSessions).toBe("function");
      expect(typeof hookResult!.loadSession).toBe("function");
      expect(hookResult!.error).toBeUndefined();
    });
  });

  describe("function stability", () => {
    it("should return stable function references across renders", () => {
      const capturedFunctions: ReturnType<typeof useAgnoSession>[] = [];

      const CaptureHook = () => {
        const result = useAgnoSession();
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

      // At least 2 renders should have occurred
      expect(capturedFunctions.length).toBeGreaterThanOrEqual(2);
      // Compare first and last to ensure stability across all renders
      const first = capturedFunctions[0];
      const last = capturedFunctions.at(-1)!;
      expect(first.loadSession).toBe(last.loadSession);
      expect(first.fetchSessions).toBe(last.fetchSessions);
    });
  });
});

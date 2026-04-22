import type {
  AgnoClientConfig,
  SessionsListResponse,
} from "@antipopp/agno-types";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

      if (!hookResult) {
        throw new Error("Expected hook result to be available");
      }

      const result = hookResult as ReturnType<typeof useAgnoSession>;
      expect(typeof result.sessions).toBe("object");
      expect(Array.isArray(result.sessions)).toBe(true);
      expect(result.currentSessionId).toBeUndefined();
      expect(typeof result.isLoading).toBe("boolean");
      expect(typeof result.fetchSessions).toBe("function");
      expect(typeof result.loadSession).toBe("function");
      expect(result.error).toBeUndefined();
    });

    it("should return sessions metadata from fetchSessions", async () => {
      let hookResult: ReturnType<typeof useAgnoSession> | null = null;
      let response: SessionsListResponse | undefined;
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [
              {
                session_id: "session-1",
                session_name: "Test Session",
                created_at: "2024-01-01T00:00:00Z",
              },
              {
                session_id: "session-2",
                session_name: "Another Session",
                created_at: "2024-01-02T00:00:00Z",
              },
            ],
            meta: {
              page: 1,
              limit: 50,
              total_pages: 1,
              total_count: 2,
              search_time_ms: 5,
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
      );

      const CaptureHook = () => {
        hookResult = useAgnoSession();
        return null;
      };

      try {
        render(
          <AgnoProvider config={defaultConfig}>
            <CaptureHook />
          </AgnoProvider>
        );

        if (!hookResult) {
          throw new Error("Expected hook result to be available");
        }

        await act(async () => {
          response = await hookResult?.fetchSessions();
        });

        expect(response).toBeDefined();

        if (!response) {
          throw new Error("Expected fetch response to be available");
        }

        expect(response.data).toHaveLength(2);
        expect(response.meta.total_count).toBe(2);

        await waitFor(() => {
          expect(hookResult?.sessions).toHaveLength(2);
        });
      } finally {
        fetchSpy.mockRestore();
      }
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
      const last = capturedFunctions.at(-1);

      expect(first).toBeDefined();
      expect(last).toBeDefined();

      if (!(first && last)) {
        return;
      }

      expect(first.loadSession).toBe(last.loadSession);
      expect(first.fetchSessions).toBe(last.fetchSessions);
    });
  });
});

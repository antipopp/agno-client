import { describe, expect, expectTypeOf, it } from "vitest";
import type { AgnoClientConfig, ClientState, StreamOptions } from "../config";

describe("Config types", () => {
  describe("AgnoClientConfig", () => {
    it("should require endpoint", () => {
      const config: AgnoClientConfig = {
        endpoint: "http://localhost:7777",
      };
      expect(config.endpoint).toBe("http://localhost:7777");
    });

    it("should support agent mode configuration", () => {
      const config: AgnoClientConfig = {
        endpoint: "http://localhost:7777",
        mode: "agent",
        agentId: "agent-123",
        dbId: "db-456",
      };
      expect(config.mode).toBe("agent");
      expect(config.agentId).toBe("agent-123");
    });

    it("should support team mode configuration", () => {
      const config: AgnoClientConfig = {
        endpoint: "http://localhost:7777",
        mode: "team",
        teamId: "team-123",
      };
      expect(config.mode).toBe("team");
      expect(config.teamId).toBe("team-123");
    });

    it("should support authentication", () => {
      const config: AgnoClientConfig = {
        endpoint: "http://localhost:7777",
        authToken: "secret-token",
      };
      expect(config.authToken).toBe("secret-token");
    });

    it("should support custom headers", () => {
      const config: AgnoClientConfig = {
        endpoint: "http://localhost:7777",
        headers: {
          "X-Custom-Header": "value",
          "X-Another": "another-value",
        },
      };
      expect(config.headers?.["X-Custom-Header"]).toBe("value");
    });

    it("should support custom params", () => {
      const config: AgnoClientConfig = {
        endpoint: "http://localhost:7777",
        params: {
          version: "v2",
          locale: "en-US",
        },
      };
      expect(config.params?.version).toBe("v2");
    });

    it("should support userId for session linking", () => {
      const config: AgnoClientConfig = {
        endpoint: "http://localhost:7777",
        userId: "user-123",
      };
      expect(config.userId).toBe("user-123");
    });

    it("should support sessionId", () => {
      const config: AgnoClientConfig = {
        endpoint: "http://localhost:7777",
        sessionId: "session-456",
      };
      expect(config.sessionId).toBe("session-456");
    });
  });

  describe("ClientState", () => {
    it("should have correct structure", () => {
      const state: ClientState = {
        isStreaming: false,
        isRefreshing: false,
        isEndpointActive: true,
        agents: [],
        teams: [],
        sessions: [],
        isPaused: false,
      };
      expect(state.isStreaming).toBe(false);
      expect(state.agents).toEqual([]);
    });

    it("should support HITL state", () => {
      const state: ClientState = {
        isStreaming: false,
        isRefreshing: false,
        isEndpointActive: true,
        agents: [],
        teams: [],
        sessions: [],
        isPaused: true,
        pausedRunId: "run-123",
        toolsAwaitingExecution: [
          {
            role: "tool",
            content: null,
            tool_call_id: "call-123",
            tool_name: "get_input",
            tool_args: {},
            tool_call_error: false,
            metrics: { time: 0 },
            created_at: 1_700_000_000,
          },
        ],
      };
      expect(state.isPaused).toBe(true);
      expect(state.pausedRunId).toBe("run-123");
      expect(state.toolsAwaitingExecution).toHaveLength(1);
    });

    it("should support error message", () => {
      const state: ClientState = {
        isStreaming: false,
        isRefreshing: false,
        errorMessage: "Connection failed",
        isEndpointActive: false,
        agents: [],
        teams: [],
        sessions: [],
        isPaused: false,
      };
      expect(state.errorMessage).toBe("Connection failed");
    });
  });

  describe("StreamOptions", () => {
    it("should support custom headers", () => {
      const options: StreamOptions = {
        headers: {
          "X-Request-ID": "req-123",
        },
      };
      expect(options.headers?.["X-Request-ID"]).toBe("req-123");
    });

    it("should support custom params", () => {
      const options: StreamOptions = {
        params: {
          temperature: "0.7",
        },
      };
      expect(options.params?.temperature).toBe("0.7");
    });

    it("should support timeout", () => {
      const options: StreamOptions = {
        timeout: 30_000,
      };
      expect(options.timeout).toBe(30_000);
    });
  });

  describe("Type validation with expectTypeOf", () => {
    it("AgnoClientConfig.endpoint should be string", () => {
      expectTypeOf<AgnoClientConfig["endpoint"]>().toEqualTypeOf<string>();
    });

    it("AgnoClientConfig.mode should be optional union", () => {
      expectTypeOf<AgnoClientConfig["mode"]>().toEqualTypeOf<
        "agent" | "team" | undefined
      >();
    });

    it("ClientState.isStreaming should be boolean", () => {
      expectTypeOf<ClientState["isStreaming"]>().toEqualTypeOf<boolean>();
    });

    it("StreamOptions.timeout should be optional number", () => {
      expectTypeOf<StreamOptions["timeout"]>().toEqualTypeOf<
        number | undefined
      >();
    });
  });
});

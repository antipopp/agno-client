import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  AgentDetails,
  RunResponse,
  RunSchema,
  SessionEntry,
  SessionsListResponse,
  TeamDetails,
} from "../api";
import { RunEvent } from "../events";

describe("API types", () => {
  describe("AgentDetails", () => {
    it("should have required id property", () => {
      const agent: AgentDetails = {
        id: "agent-123",
      };
      expect(agent.id).toBe("agent-123");
    });

    it("should support all optional properties", () => {
      const agent: AgentDetails = {
        id: "agent-123",
        name: "My Agent",
        description: "A helpful agent",
        model: {
          name: "GPT-4",
          model: "gpt-4",
          provider: "openai",
        },
        db_id: "db-456",
        storage: true,
      };
      expect(agent.name).toBe("My Agent");
      expect(agent.model?.provider).toBe("openai");
    });
  });

  describe("TeamDetails", () => {
    it("should have required id property", () => {
      const team: TeamDetails = {
        id: "team-123",
      };
      expect(team.id).toBe("team-123");
    });

    it("should support all optional properties", () => {
      const team: TeamDetails = {
        id: "team-123",
        name: "My Team",
        description: "A collaborative team",
        model: {
          name: "Claude",
          model: "claude-3",
          provider: "anthropic",
        },
        db_id: "db-789",
        storage: true,
      };
      expect(team.name).toBe("My Team");
      expect(team.model?.model).toBe("claude-3");
    });
  });

  describe("SessionEntry", () => {
    it("should have required properties", () => {
      const session: SessionEntry = {
        session_id: "session-123",
        session_name: "Test Session",
        created_at: "2024-01-01T00:00:00Z",
      };
      expect(session.session_id).toBe("session-123");
      expect(session.session_name).toBe("Test Session");
    });

    it("should allow null created_at", () => {
      const session: SessionEntry = {
        session_id: "session-123",
        session_name: "Test Session",
        created_at: null,
      };
      expect(session.created_at).toBeNull();
    });
  });

  describe("RunResponse", () => {
    it("should have required event property", () => {
      const response: RunResponse = {
        event: RunEvent.RunStarted,
        content_type: "text/plain",
        created_at: 1_700_000_000,
      };
      expect(response.event).toBe(RunEvent.RunStarted);
    });

    it("should support streaming content", () => {
      const response: RunResponse = {
        event: RunEvent.RunContent,
        content: "Hello",
        content_type: "text/plain",
        run_id: "run-123",
        session_id: "session-456",
        created_at: 1_700_000_000,
      };
      expect(response.content).toBe("Hello");
      expect(response.run_id).toBe("run-123");
    });

    it("should support HITL pause fields", () => {
      const response: RunResponse = {
        event: RunEvent.RunPaused,
        content_type: "application/json",
        is_paused: true,
        tools_awaiting_external_execution: [
          {
            role: "tool",
            content: null,
            tool_call_id: "call-123",
            tool_name: "get_user_input",
            tool_args: {},
            tool_call_error: false,
            metrics: { time: 0 },
            created_at: 1_700_000_000,
            external_execution: true,
          },
        ],
        created_at: 1_700_000_000,
      };
      expect(response.is_paused).toBe(true);
      expect(response.tools_awaiting_external_execution).toHaveLength(1);
    });

    it("should support tool object (single tool format)", () => {
      const response: RunResponse = {
        event: RunEvent.ToolCallCompleted,
        content_type: "application/json",
        tool: {
          role: "tool",
          content: "Tool result",
          tool_call_id: "call-123",
          tool_name: "search",
          tool_args: { q: "test" },
          tool_call_error: false,
          metrics: { time: 100 },
          created_at: 1_700_000_000,
        },
        created_at: 1_700_000_000,
      };
      expect(response.tool?.tool_name).toBe("search");
    });
  });

  describe("RunSchema", () => {
    it("should have required run_id", () => {
      const run: RunSchema = {
        run_id: "run-123",
      };
      expect(run.run_id).toBe("run-123");
    });

    it("should support full run data", () => {
      const run: RunSchema = {
        run_id: "run-123",
        agent_id: "agent-456",
        user_id: "user-789",
        run_input: "Hello",
        content: "Hi there!",
        created_at: "2024-01-01T00:00:00Z",
        tools: [{ tool_name: "search" }],
        images: [],
        videos: [],
      };
      expect(run.agent_id).toBe("agent-456");
      expect(run.run_input).toBe("Hello");
      expect(run.tools).toHaveLength(1);
    });
  });

  describe("SessionsListResponse", () => {
    it("should have data and meta properties", () => {
      const response: SessionsListResponse = {
        data: [
          {
            session_id: "session-1",
            session_name: "Session 1",
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total_pages: 1,
          total_count: 1,
          search_time_ms: 5,
        },
      };
      expect(response.data).toHaveLength(1);
      expect(response.meta.total_count).toBe(1);
    });
  });

  describe("Type validation with expectTypeOf", () => {
    it("RunResponse.event should be RunEvent", () => {
      expectTypeOf<RunResponse["event"]>().toEqualTypeOf<RunEvent>();
    });

    it("SessionEntry.session_id should be string", () => {
      expectTypeOf<SessionEntry["session_id"]>().toEqualTypeOf<string>();
    });

    it("AgentDetails.id should be string", () => {
      expectTypeOf<AgentDetails["id"]>().toEqualTypeOf<string>();
    });
  });
});

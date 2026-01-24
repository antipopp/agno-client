import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgnoClient } from "../client";
import { server } from "./mocks/server";

describe("AgnoClient", () => {
  let client: AgnoClient;

  beforeEach(() => {
    client = new AgnoClient({
      endpoint: "http://localhost:7777",
      mode: "agent",
      agentId: "agent-1",
    });
  });

  describe("constructor", () => {
    it("should initialize with config", () => {
      const config = client.getConfig();
      expect(config.endpoint).toBe("http://localhost:7777");
      expect(config.mode).toBe("agent");
      expect(config.agentId).toBe("agent-1");
    });

    it("should initialize with default state", () => {
      const state = client.getState();
      expect(state.isStreaming).toBe(false);
      expect(state.isRefreshing).toBe(false);
      expect(state.isEndpointActive).toBe(false);
      expect(state.agents).toEqual([]);
      expect(state.teams).toEqual([]);
      expect(state.sessions).toEqual([]);
      expect(state.isPaused).toBe(false);
    });

    it("should start with empty messages", () => {
      expect(client.getMessages()).toEqual([]);
    });
  });

  describe("updateConfig", () => {
    it("should update configuration", () => {
      client.updateConfig({ agentId: "new-agent" });
      expect(client.getConfig().agentId).toBe("new-agent");
    });

    it("should emit config:change event", () => {
      const handler = vi.fn();
      client.on("config:change", handler);

      client.updateConfig({ agentId: "new-agent" });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ agentId: "new-agent" })
      );
    });
  });

  describe("clearMessages", () => {
    it("should clear all messages", () => {
      // Add some messages first via sendMessage
      client.clearMessages();
      expect(client.getMessages()).toEqual([]);
    });

    it("should clear session ID", () => {
      client.updateConfig({ sessionId: "session-123" });
      client.clearMessages();
      expect(client.getConfig().sessionId).toBeUndefined();
    });

    it("should emit message:update event", () => {
      const handler = vi.fn();
      client.on("message:update", handler);

      client.clearMessages();

      expect(handler).toHaveBeenCalledWith([]);
    });
  });

  describe("checkStatus", () => {
    it("should return true for healthy endpoint", async () => {
      const isActive = await client.checkStatus();
      expect(isActive).toBe(true);
      expect(client.getState().isEndpointActive).toBe(true);
    });

    it("should return false for unhealthy endpoint", async () => {
      server.use(
        http.get("http://localhost:7777/health", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const isActive = await client.checkStatus();
      expect(isActive).toBe(false);
      expect(client.getState().isEndpointActive).toBe(false);
    });

    it("should emit state:change event", async () => {
      const handler = vi.fn();
      client.on("state:change", handler);

      await client.checkStatus();

      expect(handler).toHaveBeenCalled();
    });
  });

  describe("fetchAgents", () => {
    it("should fetch and store agents", async () => {
      const agents = await client.fetchAgents();

      expect(agents).toHaveLength(2);
      expect(agents[0].id).toBe("agent-1");
      expect(client.getState().agents).toEqual(agents);
    });

    it("should throw on error", async () => {
      server.use(
        http.get("http://localhost:7777/agents", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      await expect(client.fetchAgents()).rejects.toThrow(
        "Failed to fetch agents"
      );
    });
  });

  describe("fetchTeams", () => {
    it("should fetch and store teams", async () => {
      const teams = await client.fetchTeams();

      expect(teams).toHaveLength(1);
      expect(teams[0].id).toBe("team-1");
      expect(client.getState().teams).toEqual(teams);
    });
  });

  describe("initialize", () => {
    it("should check status and fetch agents/teams", async () => {
      const result = await client.initialize();

      expect(result.agents).toHaveLength(2);
      expect(result.teams).toHaveLength(1);
    });

    it("should return empty arrays if endpoint is inactive", async () => {
      server.use(
        http.get("http://localhost:7777/health", () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const result = await client.initialize();

      expect(result.agents).toEqual([]);
      expect(result.teams).toEqual([]);
    });

    it("should auto-select first agent if none configured", async () => {
      const newClient = new AgnoClient({
        endpoint: "http://localhost:7777",
      });

      await newClient.initialize();

      expect(newClient.getConfig().agentId).toBe("agent-1");
      expect(newClient.getConfig().mode).toBe("agent");
    });
  });

  describe("fetchSessions", () => {
    it("should fetch sessions for current entity", async () => {
      const sessions = await client.fetchSessions();

      expect(sessions).toHaveLength(2);
      expect(sessions[0].session_id).toBe("session-1");
    });

    it("should throw if no entity configured", async () => {
      const newClient = new AgnoClient({
        endpoint: "http://localhost:7777",
      });

      await expect(newClient.fetchSessions()).rejects.toThrow(
        "Entity ID must be configured"
      );
    });
  });

  describe("loadSession", () => {
    it("should load session and set messages", async () => {
      const messages = await client.loadSession("session-1");

      expect(messages.length).toBeGreaterThan(0);
      expect(client.getMessages()).toEqual(messages);
      expect(client.getConfig().sessionId).toBe("session-1");
    });

    it("should emit session:loaded event", async () => {
      const handler = vi.fn();
      client.on("session:loaded", handler);

      await client.loadSession("session-1");

      expect(handler).toHaveBeenCalledWith("session-1");
    });
  });

  describe("deleteSession", () => {
    it("should delete session and remove from state", async () => {
      // First fetch sessions
      await client.fetchSessions();
      expect(client.getState().sessions).toHaveLength(2);

      // Delete one
      await client.deleteSession("session-1");

      expect(client.getState().sessions).toHaveLength(1);
      expect(client.getState().sessions[0].session_id).toBe("session-2");
    });

    it("should clear messages if deleting current session", async () => {
      await client.loadSession("session-1");
      expect(client.getMessages().length).toBeGreaterThan(0);

      await client.deleteSession("session-1");

      expect(client.getMessages()).toEqual([]);
    });
  });

  describe("sendMessage", () => {
    it("should throw if already streaming", async () => {
      // Start first message
      const promise1 = client.sendMessage("Hello");

      // Try to send another while streaming
      await expect(client.sendMessage("World")).rejects.toThrow(
        "Already streaming a message"
      );

      await promise1;
    });

    it("should throw if no entity selected", async () => {
      const newClient = new AgnoClient({
        endpoint: "http://localhost:7777",
      });

      await expect(newClient.sendMessage("Hello")).rejects.toThrow(
        "No agent or team selected"
      );
    });

    it("should add user and agent messages", async () => {
      await client.sendMessage("Hello");

      const messages = client.getMessages();
      expect(messages.length).toBeGreaterThanOrEqual(2);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toBe("Hello");
    });

    it("should emit stream:start and stream:end events", async () => {
      const startHandler = vi.fn();
      const endHandler = vi.fn();

      client.on("stream:start", startHandler);
      client.on("stream:end", endHandler);

      await client.sendMessage("Hello");

      expect(startHandler).toHaveBeenCalled();
      expect(endHandler).toHaveBeenCalled();
    });

    it("should emit message:update events during streaming", async () => {
      const handler = vi.fn();
      client.on("message:update", handler);

      await client.sendMessage("Hello");

      expect(handler).toHaveBeenCalled();
    });

    it("should emit message:complete when done", async () => {
      const handler = vi.fn();
      client.on("message:complete", handler);

      await client.sendMessage("Hello");

      expect(handler).toHaveBeenCalled();
    });

    it("should accept FormData", async () => {
      const formData = new FormData();
      formData.append("message", "Hello from FormData");

      await client.sendMessage(formData);

      expect(client.getMessages()[0].content).toBe("Hello from FormData");
    });
  });

  describe("cancelRun", () => {
    it("should throw if no active run", async () => {
      await expect(client.cancelRun()).rejects.toThrow(
        "No active or paused run to cancel"
      );
    });

    it("should cancel active run and reset state", async () => {
      const sendPromise = client.sendMessage("Hello");

      // Wait for the first message:update event, which indicates streaming has started
      // and currentRunId has been set from the RunStarted event
      await new Promise<void>((resolve) => {
        client.once("message:update", () => resolve());
      });

      expect(client.getState().isStreaming).toBe(true);

      await client.cancelRun();
      await sendPromise;

      // Verify state is reset after cancel
      const state = client.getState();
      expect(state.isStreaming).toBe(false);
      expect(state.isCancelling).toBe(false);
      expect(state.isPaused).toBe(false);
    });

    it("should set isCancelling to true during cancel request", async () => {
      const stateChanges: boolean[] = [];

      const sendPromise = client.sendMessage("Hello");

      await new Promise<void>((resolve) => {
        client.once("message:update", () => resolve());
      });

      // Track isCancelling state changes
      client.on("state:change", (state) => {
        stateChanges.push(state.isCancelling);
      });

      await client.cancelRun();
      await sendPromise;

      // First state:change should have isCancelling=true, last should have isCancelling=false
      expect(stateChanges[0]).toBe(true);
      expect(stateChanges.at(-1)).toBe(false);
    });

    it("should emit run:cancelled event with runId", async () => {
      const handler = vi.fn();
      client.on("run:cancelled", handler);

      const sendPromise = client.sendMessage("Hello");

      await new Promise<void>((resolve) => {
        client.once("message:update", () => resolve());
      });

      await client.cancelRun();
      await sendPromise;

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ runId: expect.any(String) })
      );
    });

    it("should reset isCancelling on error", async () => {
      // Override the cancel endpoint to return an error
      server.use(
        http.post(
          "http://localhost:7777/agents/:agentId/runs/:runId/cancel",
          () => {
            return new HttpResponse(null, { status: 500 });
          }
        )
      );

      const sendPromise = client.sendMessage("Hello");

      await new Promise<void>((resolve) => {
        client.once("message:update", () => resolve());
      });

      await expect(client.cancelRun()).rejects.toThrow("Error cancelling run");
      await sendPromise;

      // isCancelling should be reset to false even on error
      expect(client.getState().isCancelling).toBe(false);
    });
  });

  describe("continueRun", () => {
    it("should throw if in team mode", async () => {
      const teamClient = new AgnoClient({
        endpoint: "http://localhost:7777",
        mode: "team",
        teamId: "team-1",
      });

      await expect(
        teamClient.continueRun([
          {
            role: "tool",
            content: "result",
            tool_call_id: "call-1",
            tool_name: "test",
            tool_args: {},
            tool_call_error: false,
            metrics: { time: 100 },
            created_at: 1_700_000_000,
            result: "done",
          },
        ])
      ).rejects.toThrow(
        "HITL (Human-in-the-Loop) frontend tool execution is not supported for teams"
      );
    });

    it("should throw if no paused run", async () => {
      await expect(
        client.continueRun([
          {
            role: "tool",
            content: "result",
            tool_call_id: "call-1",
            tool_name: "test",
            tool_args: {},
            tool_call_error: false,
            metrics: { time: 100 },
            created_at: 1_700_000_000,
            result: "done",
          },
        ])
      ).rejects.toThrow("No paused run to continue");
    });
  });

  describe("addToolCallsToLastMessage", () => {
    it("should add tool calls to agent message", async () => {
      await client.sendMessage("Test");

      const toolCalls = [
        {
          role: "tool" as const,
          content: "Result",
          tool_call_id: "new-call",
          tool_name: "new_tool",
          tool_args: {},
          tool_call_error: false,
          metrics: { time: 50 },
          created_at: 1_700_000_000,
        },
      ];

      client.addToolCallsToLastMessage(toolCalls);

      const lastMessage = client.getMessages()[client.getMessages().length - 1];
      expect(
        lastMessage.tool_calls?.some((t) => t.tool_call_id === "new-call")
      ).toBe(true);
    });

    it("should not add duplicate tool calls", async () => {
      await client.sendMessage("Test");

      const toolCall = {
        role: "tool" as const,
        content: "Result",
        tool_call_id: "dup-call",
        tool_name: "tool",
        tool_args: {},
        tool_call_error: false,
        metrics: { time: 50 },
        created_at: 1_700_000_000,
      };

      client.addToolCallsToLastMessage([toolCall]);
      client.addToolCallsToLastMessage([toolCall]);

      const lastMessage = client.getMessages()[client.getMessages().length - 1];
      const dupCalls = lastMessage.tool_calls?.filter(
        (t) => t.tool_call_id === "dup-call"
      );
      expect(dupCalls?.length).toBe(1);
    });
  });

  describe("hydrateToolCallUI", () => {
    it("should add UI component to existing tool call", async () => {
      await client.sendMessage("Test");

      // Add a tool call first
      const toolCall = {
        role: "tool" as const,
        content: "Result",
        tool_call_id: "ui-call",
        tool_name: "ui_tool",
        tool_args: {},
        tool_call_error: false,
        metrics: { time: 50 },
        created_at: 1_700_000_000,
      };
      client.addToolCallsToLastMessage([toolCall]);

      // Hydrate with UI
      const uiSpec = { type: "chart", data: { values: [1, 2, 3] } };
      client.hydrateToolCallUI("ui-call", uiSpec);

      const lastMessage = client.getMessages()[client.getMessages().length - 1];
      const hydratedCall = lastMessage.tool_calls?.find(
        (t) => t.tool_call_id === "ui-call"
      );
      expect((hydratedCall as any)?.ui_component).toEqual(uiSpec);
    });
  });

  describe("event emission", () => {
    it("should support multiple event listeners", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      client.on("state:change", handler1);
      client.on("state:change", handler2);

      client.clearMessages();

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it("should support removing event listeners", () => {
      const handler = vi.fn();

      client.on("state:change", handler);
      client.off("state:change", handler);

      client.clearMessages();

      expect(handler).not.toHaveBeenCalled();
    });
  });
});

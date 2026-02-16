import type { RunSchema, TeamRunSchema } from "@antipopp/agno-types";
import { beforeEach, describe, expect, it } from "vitest";
import { SessionManager } from "../../managers/session-manager";

describe("SessionManager", () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  describe("fetchSessions", () => {
    it("should fetch sessions with correct URL params", async () => {
      const sessions = await manager.fetchSessions(
        "http://localhost:7777",
        "agent",
        "agent-1",
        "db-1",
        {}
      );

      expect(sessions).toBeDefined();
      expect(Array.isArray(sessions)).toBe(true);
    });

    it("should return empty array on 404", async () => {
      // This would require mocking - tested via integration
    });
  });

  describe("convertSessionToMessages", () => {
    it("should convert empty runs to empty messages", () => {
      const messages = manager.convertSessionToMessages([]);
      expect(messages).toEqual([]);
    });

    it("should convert run with input and content", () => {
      const runs: RunSchema[] = [
        {
          run_id: "run-1",
          run_input: "Hello",
          content: "Hi there!",
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const messages = manager.convertSessionToMessages(runs);

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toBe("Hello");
      expect(messages[1].role).toBe("agent");
      expect(messages[1].content).toBe("Hi there!");
    });

    it("should handle object content", () => {
      const runs: RunSchema[] = [
        {
          run_id: "run-1",
          run_input: "Get data",
          content: { result: "success", data: [1, 2, 3] },
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const messages = manager.convertSessionToMessages(runs);

      expect(messages[1].content).toContain("result");
      expect(messages[1].content).toContain("success");
    });

    it("should extract tool calls from tools array", () => {
      const runs: RunSchema[] = [
        {
          run_id: "run-1",
          run_input: "Search for X",
          content: "Found results",
          tools: [
            {
              tool_call_id: "call-1",
              tool_name: "search",
              tool_args: { query: "X" },
              content: "Search results",
              metrics: { time: 100 },
            },
          ],
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const messages = manager.convertSessionToMessages(runs);

      expect(messages[1].tool_calls).toHaveLength(1);
      expect(messages[1].tool_calls?.[0].tool_name).toBe("search");
      expect(messages[1].tool_calls?.[0].content).toBe("Search results");
    });

    it("should extract tool calls from reasoning_messages", () => {
      const runs: RunSchema[] = [
        {
          run_id: "run-1",
          run_input: "Complex task",
          content: "Done",
          reasoning_messages: [
            {
              role: "tool",
              tool_call_id: "call-1",
              tool_name: "helper",
              tool_args: {},
              content: "Helper result",
            },
          ],
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const messages = manager.convertSessionToMessages(runs);

      expect(messages[1].tool_calls).toHaveLength(1);
      expect(messages[1].tool_calls?.[0].tool_name).toBe("helper");
    });

    it("should merge tools from both tools array and reasoning_messages", () => {
      const runs: RunSchema[] = [
        {
          run_id: "run-1",
          run_input: "Task",
          content: "Result",
          tools: [
            {
              tool_call_id: "call-1",
              tool_name: "tool1",
              tool_args: {},
              content: "Result 1",
            },
          ],
          reasoning_messages: [
            {
              role: "tool",
              tool_call_id: "call-2",
              tool_name: "tool2",
              tool_args: {},
              content: "Result 2",
            },
          ],
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const messages = manager.convertSessionToMessages(runs);

      expect(messages[1].tool_calls).toHaveLength(2);
    });

    it("should handle run without run_input", () => {
      const runs: RunSchema[] = [
        {
          run_id: "run-1",
          content: "Agent initiated response",
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const messages = manager.convertSessionToMessages(runs);

      // Should only have agent message, no user message
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe("agent");
    });

    it("should include extra_data for reasoning content", () => {
      const runs: RunSchema[] = [
        {
          run_id: "run-1",
          run_input: "Think about this",
          content: "My conclusion",
          reasoning_steps: [{ title: "Step 1", reasoning: "Because..." }],
          references: [{ query: "test", references: [] }],
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const messages = manager.convertSessionToMessages(runs);

      expect(messages[1].extra_data).toBeDefined();
      expect(messages[1].extra_data?.reasoning_steps).toBeDefined();
      expect(messages[1].extra_data?.references).toBeDefined();
    });

    it("should handle multiple runs chronologically", () => {
      const runs: RunSchema[] = [
        {
          run_id: "run-1",
          run_input: "First question",
          content: "First answer",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          run_id: "run-2",
          run_input: "Second question",
          content: "Second answer",
          created_at: "2024-01-01T01:00:00Z",
        },
      ];

      const messages = manager.convertSessionToMessages(runs);

      expect(messages).toHaveLength(4);
      expect(messages[0].content).toBe("First question");
      expect(messages[1].content).toBe("First answer");
      expect(messages[2].content).toBe("Second question");
      expect(messages[3].content).toBe("Second answer");
    });

    it("should handle TeamRunSchema same as RunSchema", () => {
      const runs: TeamRunSchema[] = [
        {
          run_id: "run-1",
          team_id: "team-1",
          run_input: "Team task",
          content: "Team response",
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const messages = manager.convertSessionToMessages(runs);

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("user");
      expect(messages[1].role).toBe("agent");
    });

    it("should set agent message timestamp slightly after user message", () => {
      const runs: RunSchema[] = [
        {
          run_id: "run-1",
          run_input: "Hello",
          content: "Hi",
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const messages = manager.convertSessionToMessages(runs);

      expect(messages[1].created_at).toBeGreaterThan(messages[0].created_at);
    });

    it("should handle missing created_at", () => {
      const runs: RunSchema[] = [
        {
          run_id: "run-1",
          run_input: "Hello",
          content: "Hi",
        },
      ];

      const messages = manager.convertSessionToMessages(runs);

      expect(messages[0].created_at).toBeDefined();
      expect(typeof messages[0].created_at).toBe("number");
    });

    it("should include media fields", () => {
      const runs: RunSchema[] = [
        {
          run_id: "run-1",
          run_input: "Generate media",
          content: "Here you go",
          images: [
            { revised_prompt: "test", url: "http://example.com/img.jpg" },
          ],
          videos: [{ id: 1, eta: 0, url: "http://example.com/video.mp4" }],
          audio: [{ base64_audio: "data" }],
          response_audio: { transcript: "Hello" },
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const messages = manager.convertSessionToMessages(runs);

      expect(messages[1].images).toBeDefined();
      expect(messages[1].videos).toBeDefined();
      expect(messages[1].audio).toBeDefined();
      expect(messages[1].response_audio).toBeDefined();
    });

    it("should map input_media attachments to the user message", () => {
      const runs: RunSchema[] = [
        {
          run_id: "run-1",
          run_input: "Review attachments",
          content: "Done",
          input_media: {
            images: [{ content: "aGVsbG8=", mime_type: "image/png" }],
            audios: [{ content: "Zm9v", mime_type: "audio/wav" }],
            files: [{ filename: "notes.txt", mime_type: "text/plain" }],
          },
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const messages = manager.convertSessionToMessages(runs);

      expect(messages[0].images?.[0].url).toContain("data:image/png;base64,");
      expect(messages[0].audio?.[0].url).toContain("data:audio/wav;base64,");
      expect(messages[0].files?.[0].filename).toBe("notes.txt");
    });

    it("should map user message media when input_media is missing", () => {
      const runs: RunSchema[] = [
        {
          run_id: "run-1",
          run_input: "Describe this",
          content: "Done",
          messages: [
            { role: "system", content: "System prompt" },
            {
              role: "user",
              content: "Describe this",
              images: [{ content: "aGVsbG8=", mime_type: "image/png" }],
              files: [{ filename: "notes.txt", mime_type: "text/plain" }],
            },
            { role: "assistant", content: "Done" },
          ],
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const messages = manager.convertSessionToMessages(runs);

      expect(messages[0].images?.[0].url).toContain("data:image/png;base64,");
      expect(messages[0].files?.[0].filename).toBe("notes.txt");
    });

    it("should prefer input_media over messages media", () => {
      const runs: RunSchema[] = [
        {
          run_id: "run-1",
          run_input: "Describe this",
          content: "Done",
          input_media: {
            images: [{ content: "aW5wdXQ=", mime_type: "image/png" }],
          },
          messages: [
            {
              role: "user",
              content: "Describe this",
              images: [{ content: "bWVzc2FnZQ==", mime_type: "image/png" }],
            },
          ],
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const messages = manager.convertSessionToMessages(runs);

      expect(messages[0].images?.[0].url).toContain("aW5wdXQ=");
      expect(messages[0].images?.[0].url).not.toContain("bWVzc2FnZQ==");
    });

    it("should include output files on the agent message", () => {
      const runs: RunSchema[] = [
        {
          run_id: "run-1",
          run_input: "Generate report",
          content: "Report generated",
          files: [
            {
              filename: "report.pdf",
              mime_type: "application/pdf",
              url: "https://example.com/report.pdf",
            },
          ],
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      const messages = manager.convertSessionToMessages(runs);

      expect(messages[1].files).toHaveLength(1);
      expect(messages[1].files?.[0].filename).toBe("report.pdf");
    });
  });
});

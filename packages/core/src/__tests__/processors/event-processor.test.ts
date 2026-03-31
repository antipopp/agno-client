import type { ChatMessage, RunResponse, ToolCall } from "@antipopp/agno-types";
import { RunEvent } from "@antipopp/agno-types";
import { beforeEach, describe, expect, it } from "vitest";
import {
  EventProcessor,
  processChunkToolCalls,
  processToolCall,
} from "../../processors/event-processor";

describe("processToolCall", () => {
  it("should add new tool call to empty array", () => {
    const toolCall: ToolCall = {
      role: "tool",
      content: "Result",
      tool_call_id: "call-1",
      tool_name: "search",
      tool_args: { query: "test" },
      tool_call_error: false,
      metrics: { time: 100 },
      created_at: 1_700_000_000,
    };

    const result = processToolCall(toolCall, []);

    expect(result).toHaveLength(1);
    expect(result[0].tool_name).toBe("search");
  });

  it("should merge tool call with existing by tool_call_id", () => {
    const existing: ToolCall[] = [
      {
        role: "tool",
        content: null,
        tool_call_id: "call-1",
        tool_name: "search",
        tool_args: { query: "test" },
        tool_call_error: false,
        metrics: { time: 0 },
        created_at: 1_700_000_000,
      },
    ];

    const update: ToolCall = {
      role: "tool",
      content: "Search results",
      tool_call_id: "call-1",
      tool_name: "search",
      tool_args: { query: "test" },
      tool_call_error: false,
      metrics: { time: 150 },
      created_at: 1_700_000_000,
    };

    const result = processToolCall(update, existing);

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("Search results");
    expect(result[0].metrics.time).toBe(150);
  });

  it("should add tool call if no matching tool_call_id", () => {
    const existing: ToolCall[] = [
      {
        role: "tool",
        content: "First",
        tool_call_id: "call-1",
        tool_name: "tool1",
        tool_args: {},
        tool_call_error: false,
        metrics: { time: 100 },
        created_at: 1_700_000_000,
      },
    ];

    const newCall: ToolCall = {
      role: "tool",
      content: "Second",
      tool_call_id: "call-2",
      tool_name: "tool2",
      tool_args: {},
      tool_call_error: false,
      metrics: { time: 100 },
      created_at: 1_700_000_001,
    };

    const result = processToolCall(newCall, existing);

    expect(result).toHaveLength(2);
  });

  describe("HITL field preservation", () => {
    it("should preserve result when existing tool has external_execution: true", () => {
      const existing: ToolCall[] = [
        {
          role: "tool",
          content: null,
          tool_call_id: "call-1",
          tool_name: "frontend_tool",
          tool_args: {},
          tool_call_error: false,
          metrics: { time: 100 },
          created_at: 1_700_000_000,
          external_execution: true,
          result: "frontend-computed-result",
        },
      ];

      const incoming: ToolCall = {
        role: "tool",
        content: "backend echo",
        tool_call_id: "call-1",
        tool_name: "frontend_tool",
        tool_args: {},
        tool_call_error: false,
        metrics: { time: 200 },
        created_at: 1_700_000_000,
        result: "backend-result",
      };

      const result = processToolCall(incoming, existing);

      expect(result).toHaveLength(1);
      expect(result[0].result).toBe("frontend-computed-result");
    });

    it("should preserve ui_component when incoming chunk lacks it", () => {
      const uiSpec = {
        type: "markdown" as const,
        props: { content: "# Chart placeholder" },
      };
      const existing: ToolCall[] = [
        {
          role: "tool",
          content: null,
          tool_call_id: "call-1",
          tool_name: "ui_tool",
          tool_args: {},
          tool_call_error: false,
          metrics: { time: 100 },
          created_at: 1_700_000_000,
          ui_component: uiSpec,
        },
      ];

      const incoming: ToolCall = {
        role: "tool",
        content: "updated",
        tool_call_id: "call-1",
        tool_name: "ui_tool",
        tool_args: {},
        tool_call_error: false,
        metrics: { time: 200 },
        created_at: 1_700_000_000,
      };

      const result = processToolCall(incoming, existing);

      expect(result).toHaveLength(1);
      expect(result[0].ui_component).toEqual(uiSpec);
    });

    it("should still update result for non-external tools", () => {
      const existing: ToolCall[] = [
        {
          role: "tool",
          content: null,
          tool_call_id: "call-1",
          tool_name: "backend_tool",
          tool_args: {},
          tool_call_error: false,
          metrics: { time: 100 },
          created_at: 1_700_000_000,
          result: "old-result",
        },
      ];

      const incoming: ToolCall = {
        role: "tool",
        content: "updated",
        tool_call_id: "call-1",
        tool_name: "backend_tool",
        tool_args: {},
        tool_call_error: false,
        metrics: { time: 200 },
        created_at: 1_700_000_000,
        result: "new-result",
      };

      const result = processToolCall(incoming, existing);

      expect(result).toHaveLength(1);
      expect(result[0].result).toBe("new-result");
    });

    it("should preserve ui_component even when incoming explicitly sets undefined", () => {
      const uiSpec = {
        type: "markdown" as const,
        props: { content: "Form placeholder" },
      };
      const existing: ToolCall[] = [
        {
          role: "tool",
          content: null,
          tool_call_id: "call-1",
          tool_name: "ui_tool",
          tool_args: {},
          tool_call_error: false,
          metrics: { time: 100 },
          created_at: 1_700_000_000,
          ui_component: uiSpec,
        },
      ];

      const incoming: ToolCall = {
        role: "tool",
        content: "updated",
        tool_call_id: "call-1",
        tool_name: "ui_tool",
        tool_args: {},
        tool_call_error: false,
        metrics: { time: 200 },
        created_at: 1_700_000_000,
        ui_component: undefined,
      };

      const result = processToolCall(incoming, existing);

      expect(result).toHaveLength(1);
      expect(result[0].ui_component).toEqual(uiSpec);
    });
  });

  it("should fall back to name-timestamp ID matching", () => {
    const existing: ToolCall[] = [
      {
        role: "tool",
        content: null,
        tool_call_id: "",
        tool_name: "search",
        tool_args: { q: "test" },
        tool_call_error: false,
        metrics: { time: 0 },
        created_at: 1_700_000_000,
      },
    ];

    const update: ToolCall = {
      role: "tool",
      content: "Updated",
      tool_call_id: "",
      tool_name: "search",
      tool_args: { q: "test" },
      tool_call_error: false,
      metrics: { time: 100 },
      created_at: 1_700_000_000,
    };

    const result = processToolCall(update, existing);

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("Updated");
  });
});

describe("processChunkToolCalls", () => {
  it("should process single tool from chunk", () => {
    const chunk: RunResponse = {
      event: RunEvent.ToolCallCompleted,
      content_type: "application/json",
      tool: {
        role: "tool",
        content: "Result",
        tool_call_id: "call-1",
        tool_name: "search",
        tool_args: {},
        tool_call_error: false,
        metrics: { time: 100 },
        created_at: 1_700_000_000,
      },
      created_at: 1_700_000_000,
    };

    const result = processChunkToolCalls(chunk, []);

    expect(result).toHaveLength(1);
    expect(result[0].tool_name).toBe("search");
  });

  it("should process tools array from chunk", () => {
    const chunk: RunResponse = {
      event: RunEvent.ToolCallCompleted,
      content_type: "application/json",
      tools: [
        {
          role: "tool",
          content: "Result 1",
          tool_call_id: "call-1",
          tool_name: "tool1",
          tool_args: {},
          tool_call_error: false,
          metrics: { time: 100 },
          created_at: 1_700_000_000,
        },
        {
          role: "tool",
          content: "Result 2",
          tool_call_id: "call-2",
          tool_name: "tool2",
          tool_args: {},
          tool_call_error: false,
          metrics: { time: 100 },
          created_at: 1_700_000_000,
        },
      ],
      created_at: 1_700_000_000,
    };

    const result = processChunkToolCalls(chunk, []);

    expect(result).toHaveLength(2);
  });

  it("should merge with existing tool calls", () => {
    const existing: ToolCall[] = [
      {
        role: "tool",
        content: null,
        tool_call_id: "call-1",
        tool_name: "search",
        tool_args: {},
        tool_call_error: false,
        metrics: { time: 0 },
        created_at: 1_700_000_000,
      },
    ];

    const chunk: RunResponse = {
      event: RunEvent.ToolCallCompleted,
      content_type: "application/json",
      tool: {
        role: "tool",
        content: "Updated result",
        tool_call_id: "call-1",
        tool_name: "search",
        tool_args: {},
        tool_call_error: false,
        metrics: { time: 150 },
        created_at: 1_700_000_000,
      },
      created_at: 1_700_000_000,
    };

    const result = processChunkToolCalls(chunk, existing);

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("Updated result");
  });
});

describe("EventProcessor", () => {
  let processor: EventProcessor;
  let baseMessage: ChatMessage;

  beforeEach(() => {
    processor = new EventProcessor();
    baseMessage = {
      role: "agent",
      content: "",
      tool_calls: [],
      created_at: 1_700_000_000,
    };
  });

  describe("processChunk", () => {
    it("should return undefined if no last message", () => {
      const chunk: RunResponse = {
        event: RunEvent.RunContent,
        content: "Hello",
        content_type: "text/plain",
        created_at: 1_700_000_000,
      };

      const result = processor.processChunk(chunk, undefined);

      expect(result).toBeUndefined();
    });

    it("should return message unchanged if role is not agent", () => {
      const userMessage: ChatMessage = {
        role: "user",
        content: "Hello",
        created_at: 1_700_000_000,
      };

      const chunk: RunResponse = {
        event: RunEvent.RunContent,
        content: "Response",
        content_type: "text/plain",
        created_at: 1_700_000_000,
      };

      const result = processor.processChunk(chunk, userMessage);

      expect(result).toEqual(userMessage);
    });

    describe("RunContent event", () => {
      it("should append string content incrementally", () => {
        const chunk1: RunResponse = {
          event: RunEvent.RunContent,
          content: "Hello",
          content_type: "text/plain",
          created_at: 1_700_000_000,
        };

        const result1 = processor.processChunk(chunk1, baseMessage);
        expect(result1?.content).toBe("Hello");

        if (!result1) {
          throw new Error("Expected RunContent to produce an updated message");
        }

        const chunk2: RunResponse = {
          event: RunEvent.RunContent,
          content: "Hello, World!",
          content_type: "text/plain",
          created_at: 1_700_000_000,
        };

        const result2 = processor.processChunk(chunk2, result1);
        expect(result2?.content).toBe("Hello, World!");
      });

      it("should handle object content as JSON markdown", () => {
        const chunk: RunResponse = {
          event: RunEvent.RunContent,
          content: { key: "value" },
          content_type: "application/json",
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, baseMessage);

        expect(result?.content).toContain("```json");
        expect(result?.content).toContain('"key": "value"');
      });

      it("should update tool_calls from chunk", () => {
        const chunk: RunResponse = {
          event: RunEvent.RunContent,
          content: "Working...",
          content_type: "text/plain",
          tool: {
            role: "tool",
            content: "Tool result",
            tool_call_id: "call-1",
            tool_name: "search",
            tool_args: {},
            tool_call_error: false,
            metrics: { time: 100 },
            created_at: 1_700_000_000,
          },
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, baseMessage);

        expect(result?.tool_calls).toHaveLength(1);
        expect(result?.tool_calls?.[0].tool_name).toBe("search");
      });

      it("should update extra_data with reasoning_steps", () => {
        const chunk: RunResponse = {
          event: RunEvent.RunContent,
          content: "Thinking...",
          content_type: "text/plain",
          extra_data: {
            reasoning_steps: [
              { title: "Step 1", result: "Done", reasoning: "Because" },
            ],
          },
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, baseMessage);

        expect(result?.extra_data?.reasoning_steps).toHaveLength(1);
      });

      it("should update extra_data with followups", () => {
        const chunk: RunResponse = {
          event: RunEvent.RunContent,
          content: "Thinking...",
          content_type: "text/plain",
          followups: ["Ask another question"],
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, baseMessage);

        expect(result?.extra_data?.followups).toEqual(["Ask another question"]);
      });

      it("should update images, videos, and audio", () => {
        const chunk: RunResponse = {
          event: RunEvent.RunContent,
          content: "Media content",
          content_type: "text/plain",
          images: [
            { revised_prompt: "test", url: "http://example.com/img.jpg" },
          ],
          videos: [{ id: 1, eta: 0, url: "http://example.com/video.mp4" }],
          audio: [{ base64_audio: "base64data" }],
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, baseMessage);

        expect(result?.images).toHaveLength(1);
        expect(result?.videos).toHaveLength(1);
        expect(result?.audio).toHaveLength(1);
      });

      it("should handle singular image payloads and files", () => {
        const chunk: RunResponse = {
          event: RunEvent.RunContent,
          content: "Media content",
          content_type: "text/plain",
          image: { url: "http://example.com/img-single.jpg" },
          files: [
            {
              filename: "report.pdf",
              mime_type: "application/pdf",
            },
          ],
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, baseMessage);

        expect(result?.images).toHaveLength(1);
        expect(result?.images?.[0].url).toBe(
          "http://example.com/img-single.jpg"
        );
        expect(result?.files).toHaveLength(1);
        expect(result?.files?.[0].filename).toBe("report.pdf");
      });
    });

    describe("TeamRunContent event", () => {
      it("should process team content same as agent content", () => {
        const chunk: RunResponse = {
          event: RunEvent.TeamRunContent,
          content: "Team response",
          content_type: "text/plain",
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, baseMessage);

        expect(result?.content).toBe("Team response");
      });
    });

    describe("ToolCallStarted/Completed events", () => {
      it("should add tool call on ToolCallStarted", () => {
        const chunk: RunResponse = {
          event: RunEvent.ToolCallStarted,
          content_type: "application/json",
          tool: {
            role: "tool",
            content: null,
            tool_call_id: "call-1",
            tool_name: "search",
            tool_args: { query: "test" },
            tool_call_error: false,
            metrics: { time: 0 },
            created_at: 1_700_000_000,
          },
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, baseMessage);

        expect(result?.tool_calls).toHaveLength(1);
      });

      it("should update tool call on ToolCallCompleted", () => {
        const startedMessage: ChatMessage = {
          ...baseMessage,
          tool_calls: [
            {
              role: "tool",
              content: null,
              tool_call_id: "call-1",
              tool_name: "search",
              tool_args: { query: "test" },
              tool_call_error: false,
              metrics: { time: 0 },
              created_at: 1_700_000_000,
            },
          ],
        };

        const chunk: RunResponse = {
          event: RunEvent.ToolCallCompleted,
          content_type: "application/json",
          tool: {
            role: "tool",
            content: "Search results",
            tool_call_id: "call-1",
            tool_name: "search",
            tool_args: { query: "test" },
            tool_call_error: false,
            metrics: { time: 150 },
            created_at: 1_700_000_000,
          },
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, startedMessage);

        expect(result?.tool_calls).toHaveLength(1);
        expect(result?.tool_calls?.[0].content).toBe("Search results");
      });
    });

    describe("ReasoningStep event", () => {
      it("should accumulate reasoning steps", () => {
        const messageWithStep: ChatMessage = {
          ...baseMessage,
          extra_data: {
            reasoning_steps: [
              { title: "Step 1", result: "Done", reasoning: "First" },
            ],
          },
        };

        const chunk: RunResponse = {
          event: RunEvent.ReasoningStep,
          content_type: "application/json",
          extra_data: {
            reasoning_steps: [
              { title: "Step 2", result: "Done", reasoning: "Second" },
            ],
          },
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, messageWithStep);

        expect(result?.extra_data?.reasoning_steps).toHaveLength(2);
      });
    });

    describe("RunCompleted event", () => {
      it("should set final content", () => {
        const partialMessage: ChatMessage = {
          ...baseMessage,
          content: "Partial...",
        };

        const chunk: RunResponse = {
          event: RunEvent.RunCompleted,
          content: "Final complete response",
          content_type: "text/plain",
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, partialMessage);

        expect(result?.content).toBe("Final complete response");
      });

      it("should stringify object content", () => {
        const chunk: RunResponse = {
          event: RunEvent.RunCompleted,
          content: { result: "success", data: [1, 2, 3] },
          content_type: "application/json",
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, baseMessage);

        expect(result?.content).toContain("result");
        expect(result?.content).toContain("success");
      });

      it("should retain files and singular image on completion", () => {
        const chunk: RunResponse = {
          event: RunEvent.RunCompleted,
          content: "Final complete response",
          content_type: "text/plain",
          image: { url: "http://example.com/final.jpg" },
          files: [{ filename: "summary.txt", mime_type: "text/plain" }],
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, baseMessage);

        expect(result?.images?.[0].url).toBe("http://example.com/final.jpg");
        expect(result?.files?.[0].filename).toBe("summary.txt");
      });

      it("should preserve followups from prior events on completion", () => {
        const messageWithFollowups: ChatMessage = {
          ...baseMessage,
          extra_data: {
            followups: ["Ask for a summary"],
          },
        };

        const chunk: RunResponse = {
          event: RunEvent.RunCompleted,
          content: "Final complete response",
          content_type: "text/plain",
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, messageWithFollowups);

        expect(result?.extra_data?.followups).toEqual(["Ask for a summary"]);
      });
    });

    describe("FollowupsCompleted event", () => {
      it("should store followups on the last message", () => {
        const chunk: RunResponse = {
          event: RunEvent.FollowupsCompleted,
          content_type: "application/json",
          followups: ["Ask for more detail", "Show examples"],
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, baseMessage);

        expect(result?.extra_data?.followups).toEqual([
          "Ask for more detail",
          "Show examples",
        ]);
      });

      it("should handle team followups events", () => {
        const chunk: RunResponse = {
          event: RunEvent.TeamFollowupsCompleted,
          content_type: "application/json",
          followups: ["Delegate the next step"],
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, baseMessage);

        expect(result?.extra_data?.followups).toEqual([
          "Delegate the next step",
        ]);
      });
    });

    describe("RunError event", () => {
      it("should set streamingError flag", () => {
        const chunk: RunResponse = {
          event: RunEvent.RunError,
          content: "Something went wrong",
          content_type: "text/plain",
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, baseMessage);

        expect(result?.streamingError).toBe(true);
      });
    });

    describe("TeamRunError event", () => {
      it("should set streamingError flag", () => {
        const chunk: RunResponse = {
          event: RunEvent.TeamRunError,
          content: "Team error",
          content_type: "text/plain",
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, baseMessage);

        expect(result?.streamingError).toBe(true);
      });
    });

    describe("RunPaused event", () => {
      it("should not modify message (handled at client level)", () => {
        const chunk: RunResponse = {
          event: RunEvent.RunPaused,
          content_type: "application/json",
          is_paused: true,
          tools_awaiting_external_execution: [],
          created_at: 1_700_000_000,
        };

        const result = processor.processChunk(chunk, baseMessage);

        expect(result).toEqual(baseMessage);
      });
    });
  });

  describe("reset", () => {
    it("should clear accumulated content state", () => {
      // First process some content
      const chunk1: RunResponse = {
        event: RunEvent.RunContent,
        content: "Hello",
        content_type: "text/plain",
        created_at: 1_700_000_000,
      };
      processor.processChunk(chunk1, baseMessage);

      // Reset
      processor.reset();

      // Process new content - should start fresh
      const chunk2: RunResponse = {
        event: RunEvent.RunContent,
        content: "World",
        content_type: "text/plain",
        created_at: 1_700_000_000,
      };
      const result = processor.processChunk(chunk2, baseMessage);

      expect(result?.content).toBe("World");
    });
  });
});

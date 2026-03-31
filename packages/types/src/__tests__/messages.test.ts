import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  ChatMessage,
  MessageExtraData,
  ReasoningSteps,
  ToolCall,
} from "../messages";

describe("Message types", () => {
  describe("ChatMessage", () => {
    it("should allow valid user message", () => {
      const message: ChatMessage = {
        role: "user",
        content: "Hello, world!",
        created_at: 1_700_000_000,
      };
      expect(message.role).toBe("user");
      expect(message.content).toBe("Hello, world!");
    });

    it("should allow valid agent message with tool_calls", () => {
      const message: ChatMessage = {
        role: "agent",
        content: "Here is the result",
        tool_calls: [
          {
            role: "tool",
            content: "Tool output",
            tool_call_id: "call-123",
            tool_name: "search",
            tool_args: { query: "test" },
            tool_call_error: false,
            metrics: { time: 100 },
            created_at: 1_700_000_001,
          },
        ],
        created_at: 1_700_000_000,
      };
      expect(message.tool_calls).toHaveLength(1);
      expect(message.tool_calls?.[0].tool_name).toBe("search");
    });

    it("should allow message with extra_data", () => {
      const message: ChatMessage = {
        role: "agent",
        content: "Result with reasoning",
        extra_data: {
          reasoning_steps: [
            {
              title: "Step 1",
              result: "Success",
              reasoning: "Because...",
            },
          ],
        },
        created_at: 1_700_000_000,
      };
      expect(message.extra_data?.reasoning_steps).toHaveLength(1);
    });

    it("should support all role types", () => {
      const roles: ChatMessage["role"][] = ["user", "agent", "system", "tool"];
      for (const role of roles) {
        const message: ChatMessage = {
          role,
          content: "Test",
          created_at: 1_700_000_000,
        };
        expect(message.role).toBe(role);
      }
    });
  });

  describe("ToolCall", () => {
    it("should have required properties", () => {
      const toolCall: ToolCall = {
        role: "tool",
        content: "Result",
        tool_call_id: "id-123",
        tool_name: "get_weather",
        tool_args: { city: "NYC" },
        tool_call_error: false,
        metrics: { time: 50 },
        created_at: 1_700_000_000,
      };
      expect(toolCall.tool_name).toBe("get_weather");
      expect(toolCall.tool_args.city).toBe("NYC");
    });

    it("should support HITL fields", () => {
      const toolCall: ToolCall = {
        role: "tool",
        content: null,
        tool_call_id: "id-123",
        tool_name: "confirm_action",
        tool_args: { action: "delete" },
        tool_call_error: false,
        metrics: { time: 0 },
        created_at: 1_700_000_000,
        external_execution: true,
        requires_confirmation: true,
        requires_user_input: false,
        confirmed: false,
        approval_id: "approval-123",
        result: undefined,
      };
      expect(toolCall.external_execution).toBe(true);
      expect(toolCall.requires_confirmation).toBe(true);
      expect(toolCall.approval_id).toBe("approval-123");
    });
  });

  describe("ReasoningSteps", () => {
    it("should have required properties", () => {
      const step: ReasoningSteps = {
        title: "Analyze Input",
        result: "Input is valid",
        reasoning: "The input matches expected format",
      };
      expect(step.title).toBe("Analyze Input");
      expect(step.reasoning).toBe("The input matches expected format");
    });

    it("should support optional properties", () => {
      const step: ReasoningSteps = {
        title: "Decision Step",
        action: "Call API",
        result: "API returned success",
        reasoning: "Based on user request",
        confidence: 0.95,
        next_action: "Format response",
      };
      expect(step.action).toBe("Call API");
      expect(step.confidence).toBe(0.95);
      expect(step.next_action).toBe("Format response");
    });
  });

  describe("MessageExtraData", () => {
    it("should support reasoning_steps array", () => {
      const extraData: MessageExtraData = {
        reasoning_steps: [
          { title: "Step 1", result: "Done", reasoning: "Because" },
          { title: "Step 2", result: "Done", reasoning: "Because" },
        ],
      };
      expect(extraData.reasoning_steps).toHaveLength(2);
    });

    it("should support references array", () => {
      const extraData: MessageExtraData = {
        references: [
          {
            query: "search query",
            references: [
              {
                content: "Reference content",
                meta_data: { chunk: 1, chunk_size: 100 },
                name: "doc.pdf",
              },
            ],
            time: 50,
          },
        ],
      };
      expect(extraData.references).toHaveLength(1);
      expect(extraData.references?.[0].references[0].name).toBe("doc.pdf");
    });

    it("should support followups array", () => {
      const extraData: MessageExtraData = {
        followups: ["Ask for more detail", "Show examples"],
      };

      expect(extraData.followups).toHaveLength(2);
      expect(extraData.followups?.[0]).toBe("Ask for more detail");
    });
  });

  describe("Type validation with expectTypeOf", () => {
    it("ChatMessage.role should be a union type", () => {
      expectTypeOf<ChatMessage["role"]>().toEqualTypeOf<
        "user" | "agent" | "system" | "tool"
      >();
    });

    it("ChatMessage.content should be string", () => {
      expectTypeOf<ChatMessage["content"]>().toEqualTypeOf<string>();
    });

    it("ToolCall.tool_args should be Record<string, unknown>", () => {
      expectTypeOf<ToolCall["tool_args"]>().toEqualTypeOf<
        Record<string, unknown>
      >();
    });

    it("ChatMessage.tool_calls should be optional array of ToolCall", () => {
      expectTypeOf<ChatMessage["tool_calls"]>().toEqualTypeOf<
        ToolCall[] | undefined
      >();
    });
  });
});

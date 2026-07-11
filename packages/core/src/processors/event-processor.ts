import type {
  ChatMessage,
  RunEvent,
  RunResponse,
  RunResponseContent,
  ToolCall,
} from "@antipopp/agno-types";
import { RunEvent as RunEventEnum } from "@antipopp/agno-types";
import { getJsonMarkdown } from "../utils/json-markdown";

/**
 * Processes a new tool call and adds/updates it in the message
 */
export function processToolCall(
  toolCall: ToolCall,
  prevToolCalls: ToolCall[] = []
): ToolCall[] {
  const toolCallId =
    toolCall.tool_call_id || `${toolCall.tool_name}-${toolCall.created_at}`;

  const existingToolCallIndex = prevToolCalls.findIndex(
    (tc) =>
      (tc.tool_call_id && tc.tool_call_id === toolCall.tool_call_id) ||
      (!tc.tool_call_id &&
        toolCall.tool_name &&
        toolCall.created_at &&
        `${tc.tool_name}-${tc.created_at}` === toolCallId)
  );

  if (existingToolCallIndex >= 0) {
    const updatedToolCalls = [...prevToolCalls];
    const existing = updatedToolCalls[existingToolCallIndex];
    const merged = { ...existing, ...toolCall };

    // Preserve frontend execution results — the backend may echo
    // the tool call with its own result, but the frontend result
    // (set during HITL execution) takes precedence.
    if (existing.external_execution && existing.result !== undefined) {
      merged.result = existing.result;
    }

    // Preserve ui_component — this is a frontend-only field.
    if (existing.ui_component !== undefined && !toolCall.ui_component) {
      merged.ui_component = existing.ui_component;
    }

    updatedToolCalls[existingToolCallIndex] = merged;
    return updatedToolCalls;
  }
  return [...prevToolCalls, toolCall];
}

/**
 * Processes tool calls from a chunk
 */
export function processChunkToolCalls(
  chunk: RunResponseContent | RunResponse,
  existingToolCalls: ToolCall[] = []
): ToolCall[] {
  let updatedToolCalls = [...existingToolCalls];

  if (chunk.tool) {
    updatedToolCalls = processToolCall(chunk.tool, updatedToolCalls);
  }

  if (chunk.tools && chunk.tools.length > 0) {
    for (const toolCall of chunk.tools) {
      updatedToolCalls = processToolCall(toolCall, updatedToolCalls);
    }
  }

  return updatedToolCalls;
}

/**
 * Event processor that handles different RunEvent types
 */
export class EventProcessor {
  private lastContent = "";

  private appendRunContent(
    chunk: RunResponse,
    updatedMessage: ChatMessage
  ): void {
    if (typeof chunk.content === "string") {
      const uniqueContent = chunk.content.replace(this.lastContent, "");
      updatedMessage.content =
        (updatedMessage.content as string) + uniqueContent;
      this.lastContent = chunk.content;
      return;
    }

    if (typeof chunk.content !== "string" && chunk.content !== null) {
      const jsonBlock = getJsonMarkdown(chunk.content);
      updatedMessage.content = (updatedMessage.content as string) + jsonBlock;
      this.lastContent = jsonBlock;
    }
  }

  private applyRunContentFields(
    chunk: RunResponse,
    lastMessage: ChatMessage,
    updatedMessage: ChatMessage
  ): void {
    this.appendRunContent(chunk, updatedMessage);

    updatedMessage.tool_calls = processChunkToolCalls(
      chunk,
      lastMessage.tool_calls
    );

    if (chunk.extra_data?.reasoning_steps) {
      updatedMessage.extra_data = {
        ...updatedMessage.extra_data,
        reasoning_steps: chunk.extra_data.reasoning_steps,
      };
    }

    if (chunk.extra_data?.references) {
      updatedMessage.extra_data = {
        ...updatedMessage.extra_data,
        references: chunk.extra_data.references,
      };
    }

    updatedMessage.created_at = chunk.created_at ?? lastMessage.created_at;

    if (chunk.images) {
      updatedMessage.images = chunk.images;
    }

    if (chunk.image) {
      const existingImages = updatedMessage.images ?? lastMessage.images ?? [];
      const hasImage = existingImages.some((image) => {
        if (image.id && chunk.image?.id) {
          return image.id === chunk.image.id;
        }

        return image.url === chunk.image?.url;
      });

      if (!hasImage) {
        updatedMessage.images = [...existingImages, chunk.image];
      }
    }

    if (chunk.videos) {
      updatedMessage.videos = chunk.videos;
    }
    if (chunk.audio) {
      updatedMessage.audio = chunk.audio;
    }
    if (chunk.files) {
      updatedMessage.files = chunk.files;
    }

    if (
      chunk.response_audio?.transcript &&
      typeof chunk.response_audio.transcript === "string"
    ) {
      updatedMessage.response_audio = {
        ...updatedMessage.response_audio,
        transcript:
          (updatedMessage.response_audio?.transcript || "") +
          chunk.response_audio.transcript,
      };
    }
  }

  private applyCompletedFields(
    chunk: RunResponse,
    lastMessage: ChatMessage,
    updatedMessage: ChatMessage
  ): void {
    let updatedContent: string;
    if (typeof chunk.content === "string") {
      updatedContent = chunk.content;
    } else {
      try {
        updatedContent = JSON.stringify(chunk.content);
      } catch {
        updatedContent = "Error parsing response";
      }
    }

    updatedMessage.content = updatedContent;
    updatedMessage.tool_calls = processChunkToolCalls(
      chunk,
      lastMessage.tool_calls
    );
    const completedImages =
      chunk.images ?? (chunk.image ? [chunk.image] : undefined);

    updatedMessage.images = completedImages ?? lastMessage.images;
    updatedMessage.videos = chunk.videos ?? lastMessage.videos;
    updatedMessage.audio = chunk.audio ?? lastMessage.audio;
    updatedMessage.files = chunk.files ?? lastMessage.files;
    updatedMessage.response_audio = chunk.response_audio;
    updatedMessage.created_at = chunk.created_at ?? lastMessage.created_at;
    updatedMessage.extra_data = {
      reasoning_steps:
        chunk.extra_data?.reasoning_steps ??
        lastMessage.extra_data?.reasoning_steps,
      references:
        chunk.extra_data?.references ?? lastMessage.extra_data?.references,
    };
  }

  private appendReasoningSteps(
    chunk: RunResponse,
    lastMessage: ChatMessage,
    updatedMessage: ChatMessage
  ): void {
    const existingSteps = lastMessage.extra_data?.reasoning_steps ?? [];
    const incomingSteps = chunk.extra_data?.reasoning_steps ?? [];
    updatedMessage.extra_data = {
      ...updatedMessage.extra_data,
      reasoning_steps: [...existingSteps, ...incomingSteps],
    };
  }

  /**
   * Process a chunk and update the last message
   */
  processChunk(
    chunk: RunResponse,
    lastMessage: ChatMessage | undefined
  ): ChatMessage | undefined {
    if (lastMessage?.role !== "agent") {
      return lastMessage;
    }

    const event = chunk.event as RunEvent;
    const updatedMessage = { ...lastMessage };

    switch (event) {
      case RunEventEnum.RunStarted:
      case RunEventEnum.TeamRunStarted:
      case RunEventEnum.ReasoningStarted:
      case RunEventEnum.TeamReasoningStarted:
        // These events are handled at the client level for session management
        break;

      case RunEventEnum.ToolCallStarted:
      case RunEventEnum.TeamToolCallStarted:
      case RunEventEnum.ToolCallCompleted:
      case RunEventEnum.TeamToolCallCompleted:
        updatedMessage.tool_calls = processChunkToolCalls(
          chunk,
          lastMessage.tool_calls
        );
        break;

      case RunEventEnum.RunContent:
      case RunEventEnum.TeamRunContent:
        this.applyRunContentFields(chunk, lastMessage, updatedMessage);
        break;

      case RunEventEnum.ReasoningStep:
      case RunEventEnum.TeamReasoningStep: {
        this.appendReasoningSteps(chunk, lastMessage, updatedMessage);
        break;
      }

      case RunEventEnum.ReasoningCompleted:
      case RunEventEnum.TeamReasoningCompleted:
        if (chunk.extra_data?.reasoning_steps) {
          updatedMessage.extra_data = {
            ...updatedMessage.extra_data,
            reasoning_steps: chunk.extra_data.reasoning_steps,
          };
        }
        break;

      case RunEventEnum.RunCompleted:
      case RunEventEnum.TeamRunCompleted: {
        this.applyCompletedFields(chunk, lastMessage, updatedMessage);
        break;
      }

      case RunEventEnum.UpdatingMemory:
      case RunEventEnum.TeamMemoryUpdateStarted:
      case RunEventEnum.TeamMemoryUpdateCompleted:
        // No-op for now
        break;

      case RunEventEnum.RunPaused:
        // Run paused for HITL - handled at client level
        // Don't update the message, just let the client emit run:paused event
        break;

      case RunEventEnum.RunError:
      case RunEventEnum.TeamRunError:
      case RunEventEnum.TeamRunCancelled:
        updatedMessage.streamingError = true;
        break;

      default:
        break;
    }

    return updatedMessage;
  }

  /**
   * Reset the processor state (e.g., between messages)
   */
  reset() {
    this.lastContent = "";
  }
}

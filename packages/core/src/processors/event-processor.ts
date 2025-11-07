import type {
  RunEvent,
  RunResponse,
  RunResponseContent,
  ChatMessage,
  ToolCall,
} from '@antipopp/agno-types';
import { RunEvent as RunEventEnum } from '@antipopp/agno-types';
import { getJsonMarkdown } from '../utils/json-markdown';

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
    updatedToolCalls[existingToolCallIndex] = {
      ...updatedToolCalls[existingToolCallIndex],
      ...toolCall,
    };
    return updatedToolCalls;
  } else {
    return [...prevToolCalls, toolCall];
  }
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
  private lastContent = '';

  /**
   * Process a chunk and update the last message
   */
  processChunk(
    chunk: RunResponse,
    lastMessage: ChatMessage | undefined
  ): ChatMessage | undefined {
    if (!lastMessage || lastMessage.role !== 'agent') {
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
        if (typeof chunk.content === 'string') {
          const uniqueContent = chunk.content.replace(this.lastContent, '');
          updatedMessage.content =
            (updatedMessage.content as string) + uniqueContent;
          this.lastContent = chunk.content;
        } else if (
          typeof chunk.content !== 'string' &&
          chunk.content !== null
        ) {
          const jsonBlock = getJsonMarkdown(chunk.content);
          updatedMessage.content = (updatedMessage.content as string) + jsonBlock;
          this.lastContent = jsonBlock;
        }

        // Handle tool calls streaming
        updatedMessage.tool_calls = processChunkToolCalls(
          chunk,
          lastMessage.tool_calls
        );

        // Handle extra data
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

        // Handle generative UI data (streaming updates)
        if (chunk.extra_data?.generated_ui) {
          const existingUI = updatedMessage.extra_data?.generated_ui ?? [];
          const incomingUI = chunk.extra_data.generated_ui;

          // Merge UI data by tool_call_id
          const mergedUI = [...existingUI];
          for (const uiData of incomingUI) {
            const existingIndex = mergedUI.findIndex(
              (ui: any) => ui.tool_call_id === uiData.tool_call_id
            );
            if (existingIndex >= 0) {
              // Update existing UI data
              mergedUI[existingIndex] = {
                ...mergedUI[existingIndex],
                ...uiData,
              };
            } else {
              // Add new UI data
              mergedUI.push(uiData);
            }
          }

          updatedMessage.extra_data = {
            ...updatedMessage.extra_data,
            generated_ui: mergedUI,
          };
        }

        updatedMessage.created_at = chunk.created_at ?? lastMessage.created_at;

        if (chunk.images) {
          updatedMessage.images = chunk.images;
        }
        if (chunk.videos) {
          updatedMessage.videos = chunk.videos;
        }
        if (chunk.audio) {
          updatedMessage.audio = chunk.audio;
        }

        // Handle response audio transcript
        if (
          chunk.response_audio?.transcript &&
          typeof chunk.response_audio.transcript === 'string'
        ) {
          const transcript = chunk.response_audio.transcript;
          updatedMessage.response_audio = {
            ...updatedMessage.response_audio,
            transcript:
              (updatedMessage.response_audio?.transcript || '') + transcript,
          };
        }
        break;

      case RunEventEnum.ReasoningStep:
      case RunEventEnum.TeamReasoningStep:
        const existingSteps = lastMessage.extra_data?.reasoning_steps ?? [];
        const incomingSteps = chunk.extra_data?.reasoning_steps ?? [];
        updatedMessage.extra_data = {
          ...updatedMessage.extra_data,
          reasoning_steps: [...existingSteps, ...incomingSteps],
        };
        break;

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
      case RunEventEnum.TeamRunCompleted:
        let updatedContent: string;
        if (typeof chunk.content === 'string') {
          updatedContent = chunk.content;
        } else {
          try {
            updatedContent = JSON.stringify(chunk.content);
          } catch {
            updatedContent = 'Error parsing response';
          }
        }

        updatedMessage.content = updatedContent;
        updatedMessage.tool_calls = processChunkToolCalls(
          chunk,
          lastMessage.tool_calls
        );
        updatedMessage.images = chunk.images ?? lastMessage.images;
        updatedMessage.videos = chunk.videos ?? lastMessage.videos;
        updatedMessage.response_audio = chunk.response_audio;
        updatedMessage.created_at = chunk.created_at ?? lastMessage.created_at;
        updatedMessage.extra_data = {
          reasoning_steps:
            chunk.extra_data?.reasoning_steps ??
            lastMessage.extra_data?.reasoning_steps,
          references:
            chunk.extra_data?.references ?? lastMessage.extra_data?.references,
          generated_ui:
            chunk.extra_data?.generated_ui ?? lastMessage.extra_data?.generated_ui,
        };
        break;

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
    }

    return updatedMessage;
  }

  /**
   * Reset the processor state (e.g., between messages)
   */
  reset() {
    this.lastContent = '';
  }
}

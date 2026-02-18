import type { UIComponentSpec } from "./ui";

/**
 * Tool call metrics
 */
export interface ToolMetrics {
  time: number;
}

/**
 * Tool call information
 */
export interface ToolCall {
  role: "user" | "tool" | "system" | "assistant";
  content: string | null;
  tool_call_id: string;
  tool_name: string;
  tool_args: Record<string, unknown>;
  tool_call_error: boolean;
  metrics: ToolMetrics;
  created_at: number;
  // HITL fields
  external_execution?: boolean;
  requires_confirmation?: boolean;
  requires_user_input?: boolean;
  confirmed?: boolean;
  result?: unknown;
  // Generative UI field (serializable component spec only)
  ui_component?: UIComponentSpec;
}

/**
 * Reasoning step message
 */
export interface ReasoningMessage {
  role: "user" | "tool" | "system" | "assistant";
  content: string | null;
  tool_call_id?: string;
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  tool_call_error?: boolean;
  metrics?: ToolMetrics;
  created_at?: number;
}

/**
 * Structured reasoning step
 */
export interface ReasoningSteps {
  title: string;
  action?: string;
  result: string;
  reasoning: string;
  confidence?: number;
  next_action?: string;
}

/**
 * Image data
 */
export interface ImageData {
  url: string;
  revised_prompt?: string;
  original_prompt?: string;
  alt_text?: string;
  id?: string;
  mime_type?: string;
  format?: string;
}

/**
 * File attachment data
 */
export interface FileData {
  id?: string;
  url?: string;
  filename?: string;
  name?: string;
  mime_type?: string;
  format?: string;
  size?: number;
}

/**
 * Video data
 */
export interface VideoData {
  url?: string;
  id?: number | string;
  eta?: number | string;
  mime_type?: string;
  format?: string;
  original_prompt?: string;
  revised_prompt?: string;
  width?: number;
  height?: number;
  fps?: number;
  duration?: number;
}

/**
 * Audio data
 */
export interface AudioData {
  base64_audio?: string;
  mime_type?: string;
  url?: string;
  id?: string | number;
  content?: string;
  channels?: number;
  sample_rate?: number;
  format?: string;
  duration?: number;
}

/**
 * Response audio data
 */
export interface ResponseAudioData {
  id?: string;
  content?: string;
  transcript?: string;
  channels?: number;
  sample_rate?: number;
}

/**
 * Reference data item
 */
export interface Reference {
  content: string;
  meta_data: {
    chunk: number;
    chunk_size: number;
  };
  name: string;
}

/**
 * Reference data with query
 */
export interface ReferenceData {
  query: string;
  references: Reference[];
  time?: number;
}

/**
 * Extra data in messages (reasoning, references, etc.)
 */
export interface MessageExtraData {
  reasoning_steps?: ReasoningSteps[];
  reasoning_messages?: ReasoningMessage[];
  references?: ReferenceData[];
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  role: "user" | "agent" | "system" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  extra_data?: MessageExtraData;
  images?: ImageData[];
  videos?: VideoData[];
  audio?: AudioData[];
  files?: FileData[];
  response_audio?: ResponseAudioData;
  created_at: number;
  streamingError?: boolean;
}

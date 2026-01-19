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
  role: 'user' | 'tool' | 'system' | 'assistant';
  content: string | null;
  tool_call_id: string;
  tool_name: string;
  tool_args: Record<string, string>;
  tool_call_error: boolean;
  metrics: ToolMetrics;
  created_at: number;
  // HITL fields
  external_execution?: boolean;
  requires_confirmation?: boolean;
  requires_user_input?: boolean;
  confirmed?: boolean;
  result?: any;
  // Generative UI field (serializable component spec only)
  ui_component?: any; // UIComponentSpec - imported dynamically to avoid circular deps
}

/**
 * Reasoning step message
 */
export interface ReasoningMessage {
  role: 'user' | 'tool' | 'system' | 'assistant';
  content: string | null;
  tool_call_id?: string;
  tool_name?: string;
  tool_args?: Record<string, string>;
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
  revised_prompt: string;
  url: string;
}

/**
 * Video data
 */
export interface VideoData {
  id: number;
  eta: number;
  url: string;
}

/**
 * Audio data
 */
export interface AudioData {
  base64_audio?: string;
  mime_type?: string;
  url?: string;
  id?: string;
  content?: string;
  channels?: number;
  sample_rate?: number;
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
  role: 'user' | 'agent' | 'system' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  extra_data?: MessageExtraData;
  images?: ImageData[];
  videos?: VideoData[];
  audio?: AudioData[];
  response_audio?: ResponseAudioData;
  created_at: number;
  streamingError?: boolean;
  /**
   * Whether this message was cancelled during streaming
   */
  cancelled?: boolean;
}

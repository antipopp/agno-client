/**
 * Client configuration options
 */
export interface AgnoClientConfig {
  /**
   * Base endpoint URL (e.g., 'http://localhost:7777')
   */
  endpoint: string;

  /**
   * Optional authentication token
   */
  authToken?: string;

  /**
   * Mode: 'agent' or 'team'
   */
  mode?: "agent" | "team";

  /**
   * Agent ID (required if mode is 'agent')
   */
  agentId?: string;

  /**
   * Team ID (required if mode is 'team')
   */
  teamId?: string;

  /**
   * Database ID
   */
  dbId?: string;

  /**
   * Current session ID
   */
  sessionId?: string;

  /**
   * User ID to link the session to a specific user
   */
  userId?: string;

  /**
   * Global custom headers to include in all API requests.
   * These headers are applied before per-request headers.
   * Note: Authorization header from authToken will override any Authorization header set here.
   */
  headers?: Record<string, string>;

  /**
   * Global query parameters to append to all API requests.
   * These parameters are applied before per-request parameters.
   * Per-request parameters will override global parameters with the same key.
   */
  params?: Record<string, string>;

  /**
   * Global dependencies passed to run endpoints.
   * These dependencies are merged with per-request dependencies,
   * and per-request dependencies override global dependencies by key.
   */
  dependencies?: Record<string, unknown>;
}

/**
 * Message run options
 */
export interface SendMessageOptions {
  /**
   * Custom headers to include in the request
   */
  headers?: Record<string, string>;

  /**
   * Custom query parameters to append to the request URL
   */
  params?: Record<string, string>;

  /**
   * Per-request dependencies passed to run endpoints.
   * These dependencies are merged with global dependencies from config,
   * and per-request dependencies override global dependencies by key.
   */
  dependencies?: Record<string, unknown>;

  /**
   * Files to upload with the message.
   * Files are appended to multipart form data using the `files` field.
   */
  files?: Array<File | Blob>;
}

/**
 * Streaming options
 */
export interface StreamOptions {
  /**
   * Custom headers to include in the request
   */
  headers?: Record<string, string>;

  /**
   * Custom query parameters to append to the request URL
   */
  params?: Record<string, string>;

  /**
   * Per-request dependencies passed to run endpoints
   */
  dependencies?: Record<string, unknown>;

  /**
   * Files to upload with the message
   */
  files?: Array<File | Blob>;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;
}

/**
 * Client state
 */
export interface ClientState {
  /**
   * Whether a stream is currently active
   */
  isStreaming: boolean;

  /**
   * Whether a session refresh is in progress
   */
  isRefreshing: boolean;

  /**
   * Whether a run is currently being cancelled
   */
  isCancelling: boolean;

  /**
   * Current error message (if any)
   */
  errorMessage?: string;

  /**
   * Whether the endpoint is active/reachable
   */
  isEndpointActive: boolean;

  /**
   * Available agents
   */
  agents: import("./api").AgentDetails[];

  /**
   * Available teams
   */
  teams: import("./api").TeamDetails[];

  /**
   * Available sessions
   */
  sessions: import("./api").SessionEntry[];

  /**
   * Whether the run is paused (HITL)
   */
  isPaused: boolean;

  /**
   * Current paused run ID
   */
  pausedRunId?: string;

  /**
   * Current run ID
   */
  currentRunId?: string;

  /**
   * Tools awaiting external execution
   */
  toolsAwaitingExecution?: import("./messages").ToolCall[];
}

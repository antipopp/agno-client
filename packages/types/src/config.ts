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
  mode?: 'agent' | 'team';

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
  agents: import('./api').AgentDetails[];

  /**
   * Available teams
   */
  teams: import('./api').TeamDetails[];

  /**
   * Available sessions
   */
  sessions: import('./api').SessionEntry[];

  /**
   * Whether the run is paused (HITL)
   */
  isPaused: boolean;

  /**
   * Current paused run ID
   */
  pausedRunId?: string;

  /**
   * Tools awaiting external execution
   */
  toolsAwaitingExecution?: import('./messages').ToolCall[];

  /**
   * Current active run ID (during streaming)
   */
  currentRunId?: string;

  /**
   * Whether a cancellation request is in progress
   */
  isCancelling?: boolean;
}

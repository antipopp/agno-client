import type {
  AgentDetails,
  AgnoClientConfig,
  ChatMessage,
  ClientState,
  RunResponse,
  SessionEntry,
  TeamDetails,
  ToolCall,
} from "@antipopp/agno-types";
import { RunEvent } from "@antipopp/agno-types";
import EventEmitter from "eventemitter3";
import { ConfigManager } from "./managers/config-manager";
import { SessionManager } from "./managers/session-manager";
import { streamResponse } from "./parsers/stream-parser";
import { EventProcessor } from "./processors/event-processor";
import { MessageStore } from "./stores/message-store";
import { Logger } from "./utils/logger";

/**
 * Safely converts a Unix timestamp to ISO string with validation
 */
function toSafeISOString(timestamp: number | undefined): string {
  const now = Date.now();
  const ts = timestamp ? timestamp * 1000 : now;

  // Validate timestamp is reasonable (between 2000 and 2100)
  const MIN_TIMESTAMP = 946_684_800_000; // 2000-01-01
  const MAX_TIMESTAMP = 4_102_444_800_000; // 2100-01-01

  if (ts < MIN_TIMESTAMP || ts > MAX_TIMESTAMP || !Number.isFinite(ts)) {
    Logger.warn(`Invalid timestamp: ${timestamp}, using current time`);
    return new Date(now).toISOString();
  }

  return new Date(ts).toISOString();
}

/**
 * Main Agno client class
 * Provides stateful management of agent/team interactions with streaming support
 */
export class AgnoClient extends EventEmitter {
  private readonly messageStore: MessageStore;
  private readonly configManager: ConfigManager;
  private readonly sessionManager: SessionManager;
  private readonly eventProcessor: EventProcessor;
  private readonly state: ClientState;
  private readonly pendingUISpecs: Map<string, any>; // toolCallId -> UIComponentSpec
  private runCompletedSuccessfully = false;

  constructor(config: AgnoClientConfig) {
    super();
    this.messageStore = new MessageStore();
    this.configManager = new ConfigManager(config);
    this.sessionManager = new SessionManager();
    this.eventProcessor = new EventProcessor();
    this.pendingUISpecs = new Map();
    this.state = {
      isStreaming: false,
      isRefreshing: false,
      isEndpointActive: false,
      agents: [],
      teams: [],
      sessions: [],
      isPaused: false,
      pausedRunId: undefined,
      toolsAwaitingExecution: undefined,
    };
  }

  /**
   * Get current messages
   */
  getMessages(): ChatMessage[] {
    return this.messageStore.getMessages();
  }

  /**
   * Get current configuration
   */
  getConfig(): AgnoClientConfig {
    return this.configManager.getConfig();
  }

  /**
   * Get current state
   */
  getState(): ClientState {
    return { ...this.state };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AgnoClientConfig>): void {
    this.configManager.updateConfig(updates);
    this.emit("config:change", this.configManager.getConfig());
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.messageStore.clear();
    this.configManager.setSessionId(undefined);
    this.pendingUISpecs.clear(); // Clear any pending UI specs to prevent memory leaks
    this.emit("message:update", this.messageStore.getMessages());
    this.emit("state:change", this.getState());
  }

  /**
   * Send a message to the agent/team (streaming)
   */
  async sendMessage(
    message: string | FormData,
    options?: {
      headers?: Record<string, string>;
      params?: Record<string, string>;
    }
  ): Promise<void> {
    if (this.state.isStreaming) {
      throw new Error("Already streaming a message");
    }

    // Reset completion flag for new message
    this.runCompletedSuccessfully = false;

    const runUrl = this.configManager.getRunUrl();
    if (!runUrl) {
      throw new Error("No agent or team selected");
    }

    this.state.isStreaming = true;
    this.state.errorMessage = undefined;
    this.emit("stream:start");
    this.emit("state:change", this.getState());

    const formData = message instanceof FormData ? message : new FormData();
    if (typeof message === "string") {
      formData.append("message", message);
    }

    // Remove previous error messages if retrying
    const lastMessage = this.messageStore.getLastMessage();
    if (lastMessage?.streamingError) {
      const secondLast =
        this.messageStore.getMessages()[
          this.messageStore.getMessages().length - 2
        ];
      if (secondLast?.role === "user") {
        this.messageStore.removeLastMessages(2);
      }
    }

    // Add user message
    this.messageStore.addMessage({
      role: "user",
      content: formData.get("message") as string,
      created_at: Math.floor(Date.now() / 1000),
    });

    // Add placeholder agent message
    this.messageStore.addMessage({
      role: "agent",
      content: "",
      tool_calls: [],
      streamingError: false,
      created_at: Math.floor(Date.now() / 1000) + 1,
    });

    this.emit("message:update", this.messageStore.getMessages());
    this.eventProcessor.reset();

    let newSessionId = this.configManager.getSessionId();

    try {
      formData.append("stream", "true");
      formData.append("session_id", newSessionId ?? "");

      // Add user_id if configured
      const userId = this.configManager.getUserId();
      if (userId) {
        formData.append("user_id", userId);
      }

      const headers = this.configManager.buildRequestHeaders(options?.headers);
      const params = this.configManager.buildQueryString(options?.params);

      await streamResponse({
        apiUrl: runUrl,
        headers,
        params,
        requestBody: formData,
        onChunk: (chunk: RunResponse) => {
          this.handleChunk(
            chunk,
            newSessionId,
            formData.get("message") as string
          );

          if (
            (chunk.event === RunEvent.RunStarted ||
              chunk.event === RunEvent.TeamRunStarted ||
              chunk.event === RunEvent.ReasoningStarted ||
              chunk.event === RunEvent.TeamReasoningStarted) &&
            chunk.session_id
          ) {
            newSessionId = chunk.session_id;
            this.configManager.setSessionId(chunk.session_id);
          }
        },
        onError: (error) => {
          this.handleError(error, newSessionId);
        },
        onComplete: async () => {
          this.state.isStreaming = false;
          this.emit("stream:end");
          this.emit("message:complete", this.messageStore.getMessages());
          this.emit("state:change", this.getState());

          // Trigger refresh if run completed successfully
          if (this.runCompletedSuccessfully) {
            this.runCompletedSuccessfully = false;
            await this.refreshSessionMessages();
          }
        },
      });
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        newSessionId
      );
    }
  }

  /**
   * Handle streaming chunk
   */
  private handleChunk(
    chunk: RunResponse,
    currentSessionId: string | undefined,
    messageContent: string
  ): void {
    const event = chunk.event as RunEvent;

    // Handle session creation
    if (
      (event === RunEvent.RunStarted ||
        event === RunEvent.TeamRunStarted ||
        event === RunEvent.ReasoningStarted ||
        event === RunEvent.TeamReasoningStarted) &&
      chunk.session_id &&
      (!currentSessionId || currentSessionId !== chunk.session_id)
    ) {
      const sessionData: SessionEntry = {
        session_id: chunk.session_id,
        session_name: messageContent,
        created_at: toSafeISOString(chunk.created_at),
      };

      const sessionExists = this.state.sessions.some(
        (s) => s.session_id === chunk.session_id
      );

      if (!sessionExists) {
        this.state.sessions = [sessionData, ...this.state.sessions];
        this.emit("session:created", sessionData);
      }
    }

    // Handle pause for HITL
    if (event === RunEvent.RunPaused) {
      this.state.isStreaming = false;
      this.state.isPaused = true;
      this.state.pausedRunId = chunk.run_id;
      this.state.toolsAwaitingExecution =
        chunk.tools_awaiting_external_execution ||
        chunk.tools_requiring_confirmation ||
        chunk.tools_requiring_user_input ||
        chunk.tools ||
        [];

      this.emit("run:paused", {
        runId: chunk.run_id,
        sessionId: chunk.session_id,
        tools: this.state.toolsAwaitingExecution,
      });
      this.emit("state:change", this.getState());
      return;
    }

    // Handle errors
    if (
      event === RunEvent.RunError ||
      event === RunEvent.TeamRunError ||
      event === RunEvent.TeamRunCancelled
    ) {
      const errorContent =
        (chunk.content as string) ||
        (event === RunEvent.TeamRunCancelled
          ? "Run cancelled"
          : "Error during run");

      this.state.errorMessage = errorContent;
      this.messageStore.updateLastMessage((msg) => ({
        ...msg,
        streamingError: true,
      }));

      // Remove the session if it was just created
      if (chunk.session_id) {
        this.state.sessions = this.state.sessions.filter(
          (s) => s.session_id !== chunk.session_id
        );
      }

      this.emit("message:error", errorContent);
      return;
    }

    // Process the chunk and update message
    this.messageStore.updateLastMessage((lastMessage) => {
      const updated = this.eventProcessor.processChunk(chunk, lastMessage);
      return updated || lastMessage;
    });

    // Apply any pending UI specs to newly arrived tool calls
    this.applyPendingUISpecs();

    // Track if run completed successfully for post-stream refresh
    if (
      event === RunEvent.RunCompleted ||
      event === RunEvent.TeamRunCompleted
    ) {
      this.runCompletedSuccessfully = true;
    }

    this.emit("message:update", this.messageStore.getMessages());
  }

  /**
   * Handle error
   */
  private handleError(error: Error, sessionId: string | undefined): void {
    this.state.isStreaming = false;
    this.state.errorMessage = error.message;

    this.messageStore.updateLastMessage((msg) => ({
      ...msg,
      streamingError: true,
    }));

    if (sessionId) {
      this.state.sessions = this.state.sessions.filter(
        (s) => s.session_id !== sessionId
      );
    }

    this.emit("message:error", error.message);
    this.emit("stream:end");
    this.emit("state:change", this.getState());
  }

  /**
   * Refresh messages from the session API after run completion.
   * Replaces streamed messages with authoritative session data.
   * Preserves client-side properties like ui_component that aren't stored on the server.
   * @private
   */
  private async refreshSessionMessages(): Promise<void> {
    const sessionId = this.configManager.getSessionId();
    if (!sessionId) {
      Logger.debug("[AgnoClient] Cannot refresh: no session ID");
      return;
    }

    this.state.isRefreshing = true;
    this.emit("state:change", this.getState());

    try {
      // Preserve ui_component properties from existing tool calls before refresh
      // The API doesn't store these - they're added client-side during HITL execution
      const existingUIComponents = new Map<string, any>();
      for (const message of this.messageStore.getMessages()) {
        if (message.tool_calls) {
          for (const toolCall of message.tool_calls) {
            if ((toolCall as any).ui_component) {
              existingUIComponents.set(
                toolCall.tool_call_id,
                (toolCall as any).ui_component
              );
            }
          }
        }
      }

      const config = this.configManager.getConfig();
      const entityType = this.configManager.getMode();
      const dbId = this.configManager.getDbId() || "";
      const userId = this.configManager.getUserId();
      const headers = this.configManager.buildRequestHeaders();

      const params = this.configManager.buildQueryString();

      const response = await this.sessionManager.fetchSession(
        config.endpoint,
        entityType,
        sessionId,
        dbId,
        headers,
        userId,
        params
      );

      const messages = this.sessionManager.convertSessionToMessages(response);

      // Re-apply preserved ui_component properties to matching tool calls
      if (existingUIComponents.size > 0) {
        for (const message of messages) {
          if (message.tool_calls) {
            for (let i = 0; i < message.tool_calls.length; i++) {
              const toolCall = message.tool_calls[i];
              const uiComponent = existingUIComponents.get(
                toolCall.tool_call_id
              );
              if (uiComponent) {
                (message.tool_calls[i] as any).ui_component = uiComponent;
              }
            }
          }
        }
      }

      this.messageStore.setMessages(messages);

      Logger.debug(
        "[AgnoClient] Session refreshed:",
        `${messages.length} messages`
      );

      this.emit("message:refreshed", messages);
      this.emit("message:update", messages);
    } catch (error) {
      Logger.error("[AgnoClient] Failed to refresh session:", error);
      this.emit(
        "message:error",
        `Session refresh failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      this.state.isRefreshing = false;
      this.emit("state:change", this.getState());
    }
  }

  /**
   * Load a session
   */
  async loadSession(
    sessionId: string,
    options?: { params?: Record<string, string> }
  ): Promise<ChatMessage[]> {
    Logger.debug("[AgnoClient] loadSession called with sessionId:", sessionId);
    const config = this.configManager.getConfig();
    const entityType = this.configManager.getMode();
    const dbId = this.configManager.getDbId() || "";
    const userId = this.configManager.getUserId();
    Logger.debug("[AgnoClient] Loading session with:", {
      entityType,
      dbId,
      userId,
    });

    const headers = this.configManager.buildRequestHeaders();
    const params = this.configManager.buildQueryString(options?.params);
    const response = await this.sessionManager.fetchSession(
      config.endpoint,
      entityType,
      sessionId,
      dbId,
      headers,
      userId,
      params
    );

    const messages = this.sessionManager.convertSessionToMessages(response);
    Logger.debug(
      "[AgnoClient] Setting messages to store:",
      `${messages.length} messages`
    );
    this.messageStore.setMessages(messages);
    this.configManager.setSessionId(sessionId);

    Logger.debug("[AgnoClient] Emitting events...");
    this.emit("session:loaded", sessionId);
    this.emit("message:update", this.messageStore.getMessages());
    this.emit("state:change", this.getState());
    Logger.debug("[AgnoClient] Events emitted, returning messages");

    return messages;
  }

  /**
   * Fetch all sessions
   */
  async fetchSessions(options?: {
    params?: Record<string, string>;
  }): Promise<SessionEntry[]> {
    const config = this.configManager.getConfig();
    const entityType = this.configManager.getMode();
    const entityId = this.configManager.getCurrentEntityId();
    const dbId = this.configManager.getDbId() || "";

    if (!entityId) {
      throw new Error("Entity ID must be configured");
    }

    const headers = this.configManager.buildRequestHeaders();
    const params = this.configManager.buildQueryString(options?.params);
    const sessions = await this.sessionManager.fetchSessions(
      config.endpoint,
      entityType,
      entityId,
      dbId,
      headers,
      params
    );

    this.state.sessions = sessions;
    this.emit("state:change", this.getState());

    return sessions;
  }

  /**
   * Delete a session
   */
  async deleteSession(
    sessionId: string,
    options?: { params?: Record<string, string> }
  ): Promise<void> {
    const config = this.configManager.getConfig();
    const dbId = this.configManager.getDbId() || "";

    const headers = this.configManager.buildRequestHeaders();
    const params = this.configManager.buildQueryString(options?.params);
    await this.sessionManager.deleteSession(
      config.endpoint,
      sessionId,
      dbId,
      headers,
      params
    );

    // Remove from state
    this.state.sessions = this.state.sessions.filter(
      (s) => s.session_id !== sessionId
    );

    // Clear messages if this was the current session
    if (this.configManager.getSessionId() === sessionId) {
      this.clearMessages();
    }

    this.emit("state:change", this.getState());
  }

  /**
   * Add tool calls to the last message
   * Used by frontend execution to add tool calls that were executed locally
   */
  addToolCallsToLastMessage(toolCalls: ToolCall[]): void {
    const lastMessage = this.messageStore.getLastMessage();
    if (!lastMessage || lastMessage.role !== "agent") {
      return;
    }

    const existingToolCalls = lastMessage.tool_calls || [];
    const existingIds = new Set(existingToolCalls.map((t) => t.tool_call_id));

    // Only add tool calls that don't already exist
    const newToolCalls = toolCalls.filter(
      (t) => !existingIds.has(t.tool_call_id)
    );

    if (newToolCalls.length > 0) {
      this.messageStore.updateLastMessage((msg) => ({
        ...msg,
        tool_calls: [...existingToolCalls, ...newToolCalls],
      }));

      this.emit("message:update", this.messageStore.getMessages());
    }
  }

  /**
   * Hydrate a specific tool call with its UI component
   * If tool call doesn't exist yet, stores UI spec as pending
   */
  hydrateToolCallUI(toolCallId: string, uiSpec: any): void {
    // Find the message containing this tool call and update it
    const messages = this.messageStore.getMessages();

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];

      if (message.tool_calls) {
        const toolIndex = message.tool_calls.findIndex(
          (t) => t.tool_call_id === toolCallId
        );

        if (toolIndex !== -1) {
          // Update this specific message
          this.messageStore.updateMessage(i, (msg) => {
            const updatedToolCalls = [...(msg.tool_calls || [])];
            updatedToolCalls[toolIndex] = {
              ...updatedToolCalls[toolIndex],
              ui_component: uiSpec,
            };

            return {
              ...msg,
              tool_calls: updatedToolCalls,
            };
          });

          // Remove from pending if it was there
          this.pendingUISpecs.delete(toolCallId);

          // Emit event to sync with React state
          this.emit("message:update", this.messageStore.getMessages());
          return;
        }
      }
    }

    // Tool call not found yet - store UI spec as pending
    this.pendingUISpecs.set(toolCallId, uiSpec);
  }

  /**
   * Apply any pending UI specs to tool calls that have just been added
   * Called after message updates to attach UI to newly arrived tool calls
   * Batches all updates to emit only one message:update event
   */
  private applyPendingUISpecs(): void {
    if (this.pendingUISpecs.size === 0) {
      return;
    }

    const messages = this.messageStore.getMessages();
    const updatedMessages: { index: number; message: ChatMessage }[] = [];

    // Collect all updates first (batching)
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];

      if (message.tool_calls) {
        let messageUpdated = false;
        const updatedToolCalls = [...message.tool_calls];

        for (let j = 0; j < updatedToolCalls.length; j++) {
          const toolCall = updatedToolCalls[j];
          const pendingUI = this.pendingUISpecs.get(toolCall.tool_call_id);

          if (pendingUI && !(toolCall as any).ui_component) {
            updatedToolCalls[j] = {
              ...updatedToolCalls[j],
              ui_component: pendingUI,
            };

            this.pendingUISpecs.delete(toolCall.tool_call_id);
            messageUpdated = true;
          }
        }

        if (messageUpdated) {
          updatedMessages.push({
            index: i,
            message: {
              ...message,
              tool_calls: updatedToolCalls,
            },
          });
        }
      }
    }

    // Apply all updates at once
    if (updatedMessages.length > 0) {
      updatedMessages.forEach(({ index, message }) => {
        this.messageStore.updateMessage(index, () => message);
      });

      this.emit("message:update", this.messageStore.getMessages());
    }
  }

  /**
   * Continue a paused run with tool execution results.
   *
   * **Note:** HITL (Human-in-the-Loop) frontend tool execution is only supported for agents.
   * Teams do not support the continue endpoint.
   *
   * @param tools - Array of tool calls with execution results
   * @param options - Optional request headers and query parameters
   * @throws Error if no paused run exists
   * @throws Error if called with team mode (teams don't support HITL)
   */
  async continueRun(
    tools: ToolCall[],
    options?: {
      headers?: Record<string, string>;
      params?: Record<string, string>;
    }
  ): Promise<void> {
    // Validate that we're not in team mode (teams don't support continue endpoint)
    if (this.configManager.getMode() === "team") {
      throw new Error(
        "HITL (Human-in-the-Loop) frontend tool execution is not supported for teams. " +
          "Only agents support the continue endpoint."
      );
    }

    if (!(this.state.isPaused && this.state.pausedRunId)) {
      throw new Error("No paused run to continue");
    }

    const runUrl = this.configManager.getRunUrl();
    if (!runUrl) {
      throw new Error("No agent or team selected");
    }

    // Build continue URL: POST /agents/{id}/runs/{run_id}/continue
    const continueUrl = `${runUrl}/${this.state.pausedRunId}/continue`;

    this.state.isPaused = false;
    this.state.isStreaming = true;
    this.emit("run:continued", { runId: this.state.pausedRunId });
    this.emit("state:change", this.getState());

    // Clean tools before sending to backend (remove UI-specific fields)
    const cleanedTools = tools.map((tool) => {
      const { ui_component, ...backendTool } = tool as any;
      return backendTool;
    });

    const formData = new FormData();
    formData.append("tools", JSON.stringify(cleanedTools));
    formData.append("stream", "true");

    const currentSessionId = this.configManager.getSessionId();
    if (currentSessionId) {
      formData.append("session_id", currentSessionId);
    }

    // Add user_id if configured
    const userId = this.configManager.getUserId();
    if (userId) {
      formData.append("user_id", userId);
    }

    const headers = this.configManager.buildRequestHeaders(options?.headers);
    const params = this.configManager.buildQueryString(options?.params);

    try {
      await streamResponse({
        apiUrl: continueUrl,
        headers,
        params,
        requestBody: formData,
        onChunk: (chunk: RunResponse) => {
          this.handleChunk(chunk, currentSessionId, "");
        },
        onError: (error) => {
          this.handleError(error, currentSessionId);
        },
        onComplete: async () => {
          this.state.isStreaming = false;
          this.state.pausedRunId = undefined;
          this.state.toolsAwaitingExecution = undefined;
          this.emit("stream:end");
          this.emit("message:complete", this.messageStore.getMessages());
          this.emit("state:change", this.getState());

          // Trigger refresh if run completed successfully
          if (this.runCompletedSuccessfully) {
            this.runCompletedSuccessfully = false;
            await this.refreshSessionMessages();
          }
        },
      });
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        currentSessionId
      );
    }
  }

  /**
   * Check endpoint status
   */
  async checkStatus(options?: {
    params?: Record<string, string>;
  }): Promise<boolean> {
    try {
      const headers = this.configManager.buildRequestHeaders();
      const params = this.configManager.buildQueryString(options?.params);
      const url = new URL(`${this.configManager.getEndpoint()}/health`);
      if (params.toString()) {
        params.forEach((value, key) => {
          url.searchParams.set(key, value);
        });
      }
      const response = await fetch(url.toString(), { headers });
      const isActive = response.ok;
      this.state.isEndpointActive = isActive;
      this.emit("state:change", this.getState());
      return isActive;
    } catch {
      this.state.isEndpointActive = false;
      this.emit("state:change", this.getState());
      return false;
    }
  }

  /**
   * Fetch agents from endpoint
   */
  async fetchAgents(options?: {
    params?: Record<string, string>;
  }): Promise<AgentDetails[]> {
    const headers = this.configManager.buildRequestHeaders();
    const params = this.configManager.buildQueryString(options?.params);
    const url = new URL(`${this.configManager.getEndpoint()}/agents`);
    if (params.toString()) {
      params.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
    }
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error("Failed to fetch agents");
    }

    const agents: AgentDetails[] = await response.json();
    this.state.agents = agents;
    this.emit("state:change", this.getState());

    return agents;
  }

  /**
   * Fetch teams from endpoint
   */
  async fetchTeams(options?: {
    params?: Record<string, string>;
  }): Promise<TeamDetails[]> {
    const headers = this.configManager.buildRequestHeaders();
    const params = this.configManager.buildQueryString(options?.params);
    const url = new URL(`${this.configManager.getEndpoint()}/teams`);
    if (params.toString()) {
      params.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
    }
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error("Failed to fetch teams");
    }

    const teams: TeamDetails[] = await response.json();
    this.state.teams = teams;
    this.emit("state:change", this.getState());

    return teams;
  }

  /**
   * Initialize client (check status and fetch agents/teams)
   * Automatically selects the first available agent or team if none is configured
   */
  async initialize(options?: { params?: Record<string, string> }): Promise<{
    agents: AgentDetails[];
    teams: TeamDetails[];
  }> {
    const isActive = await this.checkStatus(options);
    if (!isActive) {
      return { agents: [], teams: [] };
    }

    const [agents, teams] = await Promise.all([
      this.fetchAgents(options),
      this.fetchTeams(options),
    ]);

    // Auto-select first available agent or team if none is configured
    const currentConfig = this.configManager.getConfig();
    const hasAgentConfigured = currentConfig.agentId;
    const hasTeamConfigured = currentConfig.teamId;

    if (!(hasAgentConfigured || hasTeamConfigured)) {
      if (agents.length > 0) {
        // Select first agent
        const firstAgent = agents[0];
        this.configManager.updateConfig({
          mode: "agent",
          agentId: firstAgent.id,
          dbId: firstAgent.db_id || undefined,
        });
        this.emit("config:change", this.configManager.getConfig());
      } else if (teams.length > 0) {
        // Select first team if no agents available
        const firstTeam = teams[0];
        this.configManager.updateConfig({
          mode: "team",
          teamId: firstTeam.id,
          dbId: firstTeam.db_id || undefined,
        });
        this.emit("config:change", this.configManager.getConfig());
      }
    }

    return { agents, teams };
  }

  /**
   * Dispose of the client and clean up all resources.
   * Call this method when the client is no longer needed to prevent memory leaks.
   * After calling dispose(), the client instance should not be reused.
   */
  dispose(): void {
    // Remove all event listeners
    this.removeAllListeners();

    // Clear message store
    this.messageStore.clear();

    // Clear pending UI specs
    this.pendingUISpecs.clear();

    // Reset event processor
    this.eventProcessor.reset();

    // Reset state
    this.state.isStreaming = false;
    this.state.isRefreshing = false;
    this.state.isEndpointActive = false;
    this.state.agents = [];
    this.state.teams = [];
    this.state.sessions = [];
    this.state.isPaused = false;
    this.state.pausedRunId = undefined;
    this.state.toolsAwaitingExecution = undefined;
    this.state.errorMessage = undefined;
  }
}

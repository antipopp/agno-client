import type {
  AgentDetails,
  AgentOSInfo,
  AgnoClientConfig,
  AudioData,
  ChatMessage,
  ClientState,
  ContinueRunOptions,
  FileData,
  ImageData,
  RunResponse,
  SendMessageOptions,
  SessionEntry,
  SessionsListResponse,
  TeamDetails,
  ToolCall,
  UIComponentSpec,
  VideoData,
} from "@antipopp/agno-types";
import { RunEvent } from "@antipopp/agno-types";
import EventEmitter from "eventemitter3";
import { ConfigManager } from "./managers/config-manager";
import { SessionManager } from "./managers/session-manager";
import {
  StreamResponseHttpError,
  streamResponse,
} from "./parsers/stream-parser";
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

function getFileName(file: Blob | File, index: number): string {
  if ("name" in file && typeof file.name === "string" && file.name) {
    return file.name;
  }

  return `file-${index}`;
}

function getFileFormat(mimeType: string | undefined): string | undefined {
  if (!mimeType) {
    return undefined;
  }

  const [, subtype] = mimeType.split("/");
  if (!subtype) {
    return undefined;
  }

  return subtype.split(";")[0]?.trim().toLowerCase() || undefined;
}

function createPreviewUrl(file: Blob): string | undefined {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return undefined;
  }

  try {
    return URL.createObjectURL(file);
  } catch {
    return undefined;
  }
}

interface MessageMediaPayload {
  images?: ImageData[];
  videos?: VideoData[];
  audio?: AudioData[];
  files?: FileData[];
  objectUrls: string[];
}

function buildMessageMediaPayload(
  files: Array<Blob | File>
): MessageMediaPayload {
  const images: ImageData[] = [];
  const videos: VideoData[] = [];
  const audio: AudioData[] = [];
  const fileAttachments: FileData[] = [];
  const objectUrls: string[] = [];

  files.forEach((file, index) => {
    const filename = getFileName(file, index);
    const mimeType = file.type || "application/octet-stream";
    const format = getFileFormat(mimeType);
    const previewUrl = createPreviewUrl(file);

    if (previewUrl) {
      objectUrls.push(previewUrl);
    }

    if (mimeType.startsWith("image/") && previewUrl) {
      images.push({
        url: previewUrl,
        mime_type: mimeType,
        format,
      });
      return;
    }

    if (mimeType.startsWith("video/")) {
      videos.push({
        url: previewUrl,
        id: filename,
        mime_type: mimeType,
        format,
      });
      return;
    }

    if (mimeType.startsWith("audio/")) {
      audio.push({
        url: previewUrl,
        id: filename,
        mime_type: mimeType,
        format,
      });
      return;
    }

    fileAttachments.push({
      filename,
      name: filename,
      mime_type: mimeType,
      format,
      size: file.size,
      url: previewUrl,
    });
  });

  return {
    images: images.length > 0 ? images : undefined,
    videos: videos.length > 0 ? videos : undefined,
    audio: audio.length > 0 ? audio : undefined,
    files: fileAttachments.length > 0 ? fileAttachments : undefined,
    objectUrls,
  };
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
  private readonly pendingUISpecs: Map<string, UIComponentSpec>; // toolCallId -> UIComponentSpec
  private readonly localAttachmentUrls: Set<string>;
  private runCompletedSuccessfully = false;
  private currentRunId: string | undefined;
  private currentAbortController: AbortController | null = null;

  constructor(config: AgnoClientConfig) {
    super();
    this.messageStore = new MessageStore();
    this.configManager = new ConfigManager(config);
    this.sessionManager = new SessionManager();
    this.eventProcessor = new EventProcessor();
    this.pendingUISpecs = new Map();
    this.localAttachmentUrls = new Set();
    this.state = {
      isStreaming: false,
      isRefreshing: false,
      isCancelling: false,
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
    this.revokeAttachmentUrlsFromMessages(this.messageStore.getMessages());
    this.localAttachmentUrls.clear();
    this.messageStore.clear();
    this.configManager.setSessionId(undefined);
    this.pendingUISpecs.clear(); // Clear any pending UI specs to prevent memory leaks
    this.emit("message:update", this.messageStore.getMessages());
    this.emit("state:change", this.getState());
  }

  /**
   * Cancel an active or paused run
   */
  async cancelRun(): Promise<void> {
    if (!(this.state.isStreaming || this.state.isPaused)) {
      throw new Error("No active or paused run to cancel");
    }

    // Get the run ID - either from paused state or current active run
    const runId = this.state.pausedRunId || this.currentRunId;

    // Abort the active fetch stream so it doesn't hang
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }

    this.state.isCancelling = true;
    this.emit("state:change", this.getState());

    const cancelErrorMessage = runId
      ? await this.requestBackendCancel(runId)
      : this.logMissingRunIdForCancel();

    // Always clean up client state — the stream is already aborted
    this.state.isStreaming = false;
    this.state.isPaused = false;
    this.state.isCancelling = false;
    this.state.pausedRunId = undefined;
    this.state.toolsAwaitingExecution = undefined;
    this.currentRunId = undefined;

    if (cancelErrorMessage) {
      this.state.errorMessage = cancelErrorMessage;
      this.emit("message:error", cancelErrorMessage);
    }

    this.emit("run:cancelled", { runId });
    this.emit("state:change", this.getState());
  }

  private logMissingRunIdForCancel(): undefined {
    Logger.warn(
      "[AgnoClient] No run ID available, skipping backend cancel request"
    );
    return undefined;
  }

  private async requestBackendCancel(
    runId: string
  ): Promise<string | undefined> {
    const runUrl = this.configManager.getRunUrl();
    if (!runUrl) {
      const message =
        "Run cancelled locally, but backend cancel could not be sent: no agent or team selected";
      Logger.warn(`[AgnoClient] ${message}`);
      return message;
    }

    const cancelUrl = new URL(`${runUrl}/${runId}/cancel`);
    const sessionId = this.configManager.getSessionId();
    if (sessionId) {
      cancelUrl.searchParams.set("session_id", sessionId);
    }
    const headers = this.configManager.buildRequestHeaders();

    try {
      const response = await fetch(cancelUrl.toString(), {
        method: "POST",
        headers,
      });

      if (response.ok) {
        return undefined;
      }

      if (response.status === 401 || response.status === 403) {
        const message = `Run cancelled locally, but backend cancel was rejected (${response.status})`;
        Logger.warn(`[AgnoClient] ${message}`);
        return message;
      }

      Logger.warn(
        `[AgnoClient] Backend cancel returned ${response.status} — run may have already completed`
      );
      return undefined;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const message = `Run cancelled locally, but backend cancel failed: ${reason}`;

      Logger.warn(`[AgnoClient] ${message}`);
      return message;
    }
  }

  /**
   * Abort the active stream without calling the backend cancel endpoint.
   * Since streamResponse handles AbortError by returning silently
   * (no onComplete/onError called), state cleanup is done here.
   */
  abortStream(): void {
    if (!this.state.isStreaming) {
      return;
    }

    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }

    this.state.isStreaming = false;
    this.currentRunId = undefined;
    this.emit("stream:end");
    this.emit("state:change", this.getState());
  }

  /**
   * Send a message to the agent/team (streaming)
   */
  async sendMessage(
    message: string | FormData,
    options?: SendMessageOptions
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

    // Add file uploads (per-request)
    if (options?.files) {
      options.files.forEach((file, index) => {
        formData.append("files", file, getFileName(file, index));
      });
    }

    const requestFiles = formData
      .getAll("files")
      .filter((entry): entry is File => typeof entry !== "string");

    const userMessageMedia = buildMessageMediaPayload(requestFiles);
    this.trackAttachmentUrls(userMessageMedia.objectUrls);
    const userMessageContent = String(formData.get("message") ?? "");

    // Remove previous error messages if retrying
    const lastMessage = this.messageStore.getLastMessage();
    if (lastMessage?.streamingError) {
      const secondLast =
        this.messageStore.getMessages()[
          this.messageStore.getMessages().length - 2
        ];
      if (secondLast?.role === "user") {
        this.revokeAttachmentUrlsFromMessages([secondLast, lastMessage]);
        this.messageStore.removeLastMessages(2);
      }
    }

    // Add user message
    this.messageStore.addMessage({
      role: "user",
      content: userMessageContent,
      images: userMessageMedia.images,
      videos: userMessageMedia.videos,
      audio: userMessageMedia.audio,
      files: userMessageMedia.files,
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
      formData.set("stream", "true");
      formData.set("session_id", newSessionId ?? "");

      // Add user_id if configured
      const userId = this.configManager.getUserId();
      if (userId) {
        formData.set("user_id", userId);
      }

      // Add dependencies (merged global + per-request)
      const dependencies = this.configManager.buildDependencies(
        options?.dependencies
      );
      if (dependencies) {
        formData.set("dependencies", JSON.stringify(dependencies));
      }
      if (options?.background) {
        formData.set("background", "true");
      }
      if (options?.factoryInput) {
        formData.set("factory_input", JSON.stringify(options.factoryInput));
      }

      const headers = this.configManager.buildRequestHeaders(options?.headers);
      const params = this.configManager.buildQueryString(options?.params);

      this.currentAbortController = new AbortController();

      await streamResponse({
        apiUrl: runUrl,
        headers,
        params,
        requestBody: formData,
        signal: this.currentAbortController.signal,
        onChunk: (chunk: RunResponse) => {
          this.handleChunk(chunk, newSessionId, userMessageContent);

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
          this.currentAbortController = null;
          this.handleError(error, newSessionId);
        },
        onComplete: async () => {
          this.currentAbortController = null;
          this.state.isStreaming = false;
          this.currentRunId = undefined;
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
      this.currentAbortController = null;
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

    // Track run ID when run starts
    if (
      (event === RunEvent.RunStarted || event === RunEvent.TeamRunStarted) &&
      chunk.run_id
    ) {
      this.currentRunId = chunk.run_id;
    }

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
    const isPausedEvent =
      event === RunEvent.RunPaused || event === RunEvent.TeamRunPaused;
    if (isPausedEvent) {
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

  private trackAttachmentUrls(urls: string[]): void {
    for (const url of urls) {
      this.localAttachmentUrls.add(url);
    }
  }

  private collectAttachmentUrls(message: ChatMessage): string[] {
    const imageUrls = message.images?.map((image) => image.url) ?? [];
    const videoUrls =
      message.videos
        ?.map((video) => video.url)
        .filter((url): url is string => Boolean(url)) ?? [];
    const audioUrls =
      message.audio
        ?.map((audio) => audio.url)
        .filter((url): url is string => Boolean(url)) ?? [];
    const fileUrls =
      message.files
        ?.map((file) => file.url)
        .filter((url): url is string => Boolean(url)) ?? [];

    return [...imageUrls, ...videoUrls, ...audioUrls, ...fileUrls];
  }

  private revokeAttachmentUrls(urls: string[]): void {
    if (
      typeof URL === "undefined" ||
      typeof URL.revokeObjectURL !== "function"
    ) {
      return;
    }

    for (const url of urls) {
      if (!this.localAttachmentUrls.has(url)) {
        continue;
      }

      URL.revokeObjectURL(url);
      this.localAttachmentUrls.delete(url);
    }
  }

  private revokeAttachmentUrlsFromMessages(
    messages: Array<ChatMessage | undefined>
  ): void {
    const urls: string[] = [];

    for (const message of messages) {
      if (!message) {
        continue;
      }

      urls.push(...this.collectAttachmentUrls(message));
    }

    this.revokeAttachmentUrls(urls);
  }

  private collectExistingUIComponents(): Map<string, UIComponentSpec> {
    const existingUIComponents = new Map<string, UIComponentSpec>();

    for (const message of this.messageStore.getMessages()) {
      if (!message.tool_calls) {
        continue;
      }

      for (const toolCall of message.tool_calls) {
        if (toolCall.ui_component) {
          existingUIComponents.set(
            toolCall.tool_call_id,
            toolCall.ui_component
          );
        }
      }
    }

    return existingUIComponents;
  }

  private restoreUIComponents(
    messages: ChatMessage[],
    uiComponents: Map<string, UIComponentSpec>
  ): void {
    if (uiComponents.size === 0) {
      return;
    }

    for (const message of messages) {
      if (!message.tool_calls) {
        continue;
      }

      for (const toolCall of message.tool_calls) {
        const uiComponent = uiComponents.get(toolCall.tool_call_id);
        if (uiComponent) {
          toolCall.ui_component = uiComponent;
        }
      }
    }
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

    // Guard: Don't start refresh if a new stream is already active
    if (this.state.isStreaming) {
      Logger.debug("[AgnoClient] Skipping refresh: stream is active");
      return;
    }

    this.state.isRefreshing = true;
    this.emit("state:change", this.getState());

    try {
      // Preserve ui_component properties from existing tool calls before refresh
      // The API doesn't store these - they're added client-side during HITL execution
      const existingUIComponents = this.collectExistingUIComponents();

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

      // Guard: Re-check after async fetch — a new stream may have started
      if (this.state.isStreaming) {
        Logger.debug(
          "[AgnoClient] Aborting refresh: stream started during fetch"
        );
        return; // finally block still cleans up isRefreshing
      }

      const messages = this.sessionManager.convertSessionToMessages(response);

      // Re-apply preserved ui_component properties to matching tool calls
      this.restoreUIComponents(messages, existingUIComponents);

      this.revokeAttachmentUrlsFromMessages(this.messageStore.getMessages());
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
    this.revokeAttachmentUrlsFromMessages(this.messageStore.getMessages());
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
  }): Promise<SessionsListResponse> {
    const config = this.configManager.getConfig();
    const entityType = this.configManager.getMode();
    const entityId = this.configManager.getCurrentEntityId();
    const dbId = this.configManager.getDbId() || "";

    if (!entityId) {
      throw new Error("Entity ID must be configured");
    }

    const headers = this.configManager.buildRequestHeaders();
    const params = this.configManager.buildQueryString(options?.params);
    const response = await this.sessionManager.fetchSessions(
      config.endpoint,
      entityType,
      entityId,
      dbId,
      headers,
      params
    );

    this.state.sessions = response.data;
    this.emit("state:change", this.getState());

    return response;
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
    if (lastMessage?.role !== "agent") {
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
  hydrateToolCallUI(toolCallId: string, uiSpec: UIComponentSpec): void {
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

          if (pendingUI && !toolCall.ui_component) {
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
      for (const { index, message } of updatedMessages) {
        this.messageStore.updateMessage(index, () => message);
      }

      this.emit("message:update", this.messageStore.getMessages());
    }
  }

  /** Continue, regenerate, or fork an agent or team run. */
  async continueRun(
    tools: ToolCall[] = [],
    options?: ContinueRunOptions
  ): Promise<void> {
    const targetRunId = options?.runId || this.state.pausedRunId;
    if (!targetRunId) {
      throw new Error("No run ID to continue");
    }

    const runUrl = this.configManager.getRunUrl();
    if (!runUrl) {
      throw new Error("No agent or team selected");
    }

    const pausedRunId = targetRunId;

    // Build continue URL: POST /agents/{id}/runs/{run_id}/continue
    const continueUrl = `${runUrl}/${pausedRunId}/continue`;

    this.state.isStreaming = true;
    this.state.errorMessage = undefined;
    this.emit("state:change", this.getState());

    let hasContinued = false;
    let streamError: Error | undefined;

    const markRunContinued = (runId?: string): void => {
      if (hasContinued) {
        return;
      }

      hasContinued = true;
      this.state.isPaused = false;
      this.state.toolsAwaitingExecution = undefined;

      this.emit("run:continued", { runId: runId || pausedRunId });
      this.emit("state:change", this.getState());
    };

    const handleContinueError = (error: Error): void => {
      streamError = error;
      this.state.isStreaming = false;
      this.state.errorMessage = error.message;

      const isConflictError =
        error instanceof StreamResponseHttpError && error.status === 409;

      // If continue request was not accepted (or explicitly rejected with 409),
      // preserve paused state and pending tools so callers can retry.
      if (isConflictError || !hasContinued) {
        this.state.isPaused = true;
      } else {
        // Continue was acknowledged and failed afterwards. Treat as a streaming error.
        this.state.isPaused = false;
        this.state.pausedRunId = undefined;
        this.state.toolsAwaitingExecution = undefined;
        this.messageStore.updateLastMessage((msg) => ({
          ...msg,
          streamingError: true,
        }));
      }

      this.emit("message:error", error.message);
      this.emit("stream:end");
      this.emit("state:change", this.getState());
    };

    // Clean tools before sending to backend (remove UI-specific fields)
    const cleanedTools = tools.map(
      ({ ui_component: _uiComponent, ...tool }) => {
        return tool;
      }
    );

    const formData = new FormData();
    if (this.configManager.getMode() === "team") {
      if (options?.requirements) {
        formData.append("requirements", JSON.stringify(options.requirements));
      }
    } else if (cleanedTools.length > 0) {
      formData.append("tools", JSON.stringify(cleanedTools));
    }
    formData.append("stream", "true");
    if (options?.input !== undefined) {
      formData.append("input", options.input);
    }
    if (options?.continueFrom !== undefined) {
      formData.append("continue_from", String(options.continueFrom));
    }
    if (options?.fork) {
      formData.append("fork", "true");
    }
    if (options?.regenerate) {
      formData.append("regenerate", "true");
    }
    if (options?.replaceOriginal !== undefined) {
      formData.append("replace_original", String(options.replaceOriginal));
    }
    if (options?.additionalInstructions !== undefined) {
      formData.append(
        "additional_instructions",
        options.additionalInstructions
      );
    }
    if (options?.background) {
      formData.append("background", "true");
    }

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

    this.currentAbortController = new AbortController();

    await streamResponse({
      apiUrl: continueUrl,
      headers,
      params,
      requestBody: formData,
      signal: this.currentAbortController.signal,
      onChunk: (chunk: RunResponse) => {
        const event = chunk.event as RunEvent;

        // Continue endpoint may emit RunContent directly without RunContinued.
        if (
          !hasContinued &&
          event !== RunEvent.RunPaused &&
          event !== RunEvent.TeamRunPaused
        ) {
          markRunContinued(chunk.run_id);
        }

        this.handleChunk(chunk, currentSessionId, "");
      },
      onError: (error) => {
        this.currentAbortController = null;
        handleContinueError(error);
      },
      onComplete: async () => {
        this.currentAbortController = null;

        // If no explicit continuation event was sent, but stream completed
        // without errors and without pausing again, treat it as continued.
        if (!(hasContinued || this.state.isPaused)) {
          markRunContinued(pausedRunId);
        }

        this.state.isStreaming = false;

        // Preserve paused run context when a run pauses again during continue.
        if (!this.state.isPaused) {
          this.state.pausedRunId = undefined;
          this.state.toolsAwaitingExecution = undefined;
        }

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

    if (streamError) {
      throw streamError;
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

  /** Discover AgentOS version, authentication, and MCP capabilities. */
  async fetchInfo(options?: {
    params?: Record<string, string>;
  }): Promise<AgentOSInfo> {
    const headers = this.configManager.buildRequestHeaders();
    const params = this.configManager.buildQueryString(options?.params);
    const url = new URL(`${this.configManager.getEndpoint()}/info`);
    params.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error("Failed to fetch AgentOS info");
    }
    return response.json() as Promise<AgentOSInfo>;
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
    // Abort any active stream
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }

    // Remove all event listeners
    this.removeAllListeners();

    // Clear message store
    this.revokeAttachmentUrlsFromMessages(this.messageStore.getMessages());
    this.localAttachmentUrls.clear();
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

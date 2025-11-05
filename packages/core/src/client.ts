import EventEmitter from 'eventemitter3';
import type {
  AgnoClientConfig,
  ChatMessage,
  RunResponse,
  SessionEntry,
  AgentDetails,
  TeamDetails,
  ClientState,
  ToolCall,
} from '@antipopp/agno-types';
import { RunEvent } from '@antipopp/agno-types';
import { MessageStore } from './stores/message-store';
import { ConfigManager } from './managers/config-manager';
import { SessionManager } from './managers/session-manager';
import { EventProcessor } from './processors/event-processor';
import { streamResponse } from './parsers/stream-parser';
import { Logger } from './utils/logger';

/**
 * Safely converts a Unix timestamp to ISO string with validation
 */
function toSafeISOString(timestamp: number | undefined): string {
  const now = Date.now();
  const ts = timestamp ? timestamp * 1000 : now;

  // Validate timestamp is reasonable (between 2000 and 2100)
  const MIN_TIMESTAMP = 946684800000; // 2000-01-01
  const MAX_TIMESTAMP = 4102444800000; // 2100-01-01

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
  private messageStore: MessageStore;
  private configManager: ConfigManager;
  private sessionManager: SessionManager;
  private eventProcessor: EventProcessor;
  private state: ClientState;

  constructor(config: AgnoClientConfig) {
    super();
    this.messageStore = new MessageStore();
    this.configManager = new ConfigManager(config);
    this.sessionManager = new SessionManager();
    this.eventProcessor = new EventProcessor();
    this.state = {
      isStreaming: false,
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
    this.emit('config:change', this.configManager.getConfig());
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.messageStore.clear();
    this.configManager.setSessionId(undefined);
    this.emit('message:update', this.messageStore.getMessages());
    this.emit('state:change', this.getState());
  }

  /**
   * Send a message to the agent/team (streaming)
   */
  async sendMessage(
    message: string | FormData,
    options?: { headers?: Record<string, string> }
  ): Promise<void> {
    if (this.state.isStreaming) {
      throw new Error('Already streaming a message');
    }

    const runUrl = this.configManager.getRunUrl();
    if (!runUrl) {
      throw new Error('No agent or team selected');
    }

    this.state.isStreaming = true;
    this.state.errorMessage = undefined;
    this.emit('stream:start');
    this.emit('state:change', this.getState());

    const formData = message instanceof FormData ? message : new FormData();
    if (typeof message === 'string') {
      formData.append('message', message);
    }

    // Remove previous error messages if retrying
    const lastMessage = this.messageStore.getLastMessage();
    if (lastMessage?.streamingError) {
      const secondLast = this.messageStore.getMessages()[
        this.messageStore.getMessages().length - 2
      ];
      if (secondLast?.role === 'user') {
        this.messageStore.removeLastMessages(2);
      }
    }

    // Add user message
    this.messageStore.addMessage({
      role: 'user',
      content: formData.get('message') as string,
      created_at: Math.floor(Date.now() / 1000),
    });

    // Add placeholder agent message
    this.messageStore.addMessage({
      role: 'agent',
      content: '',
      tool_calls: [],
      streamingError: false,
      created_at: Math.floor(Date.now() / 1000) + 1,
    });

    this.emit('message:update', this.messageStore.getMessages());
    this.eventProcessor.reset();

    let newSessionId = this.configManager.getSessionId();

    try {
      formData.append('stream', 'true');
      formData.append('session_id', newSessionId ?? '');

      const headers: Record<string, string> = { ...options?.headers };
      const authToken = this.configManager.getAuthToken();
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      await streamResponse({
        apiUrl: runUrl,
        headers,
        requestBody: formData,
        onChunk: (chunk: RunResponse) => {
          this.handleChunk(chunk, newSessionId, formData.get('message') as string);

          if (
            chunk.event === RunEvent.RunStarted ||
            chunk.event === RunEvent.TeamRunStarted ||
            chunk.event === RunEvent.ReasoningStarted ||
            chunk.event === RunEvent.TeamReasoningStarted
          ) {
            if (chunk.session_id) {
              newSessionId = chunk.session_id;
              this.configManager.setSessionId(chunk.session_id);
            }
          }
        },
        onError: (error) => {
          this.handleError(error, newSessionId);
        },
        onComplete: () => {
          this.state.isStreaming = false;
          this.emit('stream:end');
          this.emit('message:complete', this.messageStore.getMessages());
          this.emit('state:change', this.getState());
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
  private handleChunk(chunk: RunResponse, currentSessionId: string | undefined, messageContent: string): void {
    const event = chunk.event as RunEvent;

    // Handle session creation
    if (
      event === RunEvent.RunStarted ||
      event === RunEvent.TeamRunStarted ||
      event === RunEvent.ReasoningStarted ||
      event === RunEvent.TeamReasoningStarted
    ) {
      if (chunk.session_id && (!currentSessionId || currentSessionId !== chunk.session_id)) {
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
          this.emit('session:created', sessionData);
        }
      }
    }

    // Handle pause for HITL
    if (event === RunEvent.RunPaused) {
      console.log('[AgnoClient] RunPaused event detected');
      console.log('[AgnoClient] Chunk:', chunk);
      console.log('[AgnoClient] tools_awaiting_external_execution:', chunk.tools_awaiting_external_execution);
      console.log('[AgnoClient] tools_requiring_confirmation:', chunk.tools_requiring_confirmation);
      console.log('[AgnoClient] tools_requiring_user_input:', chunk.tools_requiring_user_input);
      console.log('[AgnoClient] tools:', chunk.tools);

      this.state.isStreaming = false;
      this.state.isPaused = true;
      this.state.pausedRunId = chunk.run_id;
      this.state.toolsAwaitingExecution =
        chunk.tools_awaiting_external_execution ||
        chunk.tools_requiring_confirmation ||
        chunk.tools_requiring_user_input ||
        chunk.tools ||
        [];

      console.log('[AgnoClient] toolsAwaitingExecution:', this.state.toolsAwaitingExecution);
      console.log('[AgnoClient] Emitting run:paused event');

      this.emit('run:paused', {
        runId: chunk.run_id,
        sessionId: chunk.session_id,
        tools: this.state.toolsAwaitingExecution,
      });
      this.emit('state:change', this.getState());
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
        (event === RunEvent.TeamRunCancelled ? 'Run cancelled' : 'Error during run');

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

      this.emit('message:error', errorContent);
      return;
    }

    // Process the chunk and update message
    this.messageStore.updateLastMessage((lastMessage) => {
      const updated = this.eventProcessor.processChunk(chunk, lastMessage);
      return updated || lastMessage;
    });

    this.emit('message:update', this.messageStore.getMessages());
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

    this.emit('message:error', error.message);
    this.emit('stream:end');
    this.emit('state:change', this.getState());
  }

  /**
   * Load a session
   */
  async loadSession(sessionId: string): Promise<ChatMessage[]> {
    Logger.debug('[AgnoClient] loadSession called with sessionId:', sessionId);
    const config = this.configManager.getConfig();
    const entityType = this.configManager.getMode();
    const dbId = this.configManager.getDbId() || '';
    Logger.debug('[AgnoClient] Loading session with:', { entityType, dbId });

    const response = await this.sessionManager.fetchSession(
      config.endpoint,
      entityType,
      sessionId,
      dbId,
      config.authToken
    );

    const messages = this.sessionManager.convertSessionToMessages(response);
    Logger.debug('[AgnoClient] Setting messages to store:', `${messages.length} messages`);
    this.messageStore.setMessages(messages);
    this.configManager.setSessionId(sessionId);

    Logger.debug('[AgnoClient] Emitting events...');
    this.emit('session:loaded', sessionId);
    this.emit('message:update', this.messageStore.getMessages());
    this.emit('state:change', this.getState());
    Logger.debug('[AgnoClient] Events emitted, returning messages');

    return messages;
  }

  /**
   * Fetch all sessions
   */
  async fetchSessions(): Promise<SessionEntry[]> {
    const config = this.configManager.getConfig();
    const entityType = this.configManager.getMode();
    const entityId = this.configManager.getCurrentEntityId();
    const dbId = this.configManager.getDbId() || '';

    if (!entityId) {
      throw new Error('Entity ID must be configured');
    }

    const sessions = await this.sessionManager.fetchSessions(
      config.endpoint,
      entityType,
      entityId,
      dbId,
      config.authToken
    );

    this.state.sessions = sessions;
    this.emit('state:change', this.getState());

    return sessions;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const config = this.configManager.getConfig();
    const dbId = this.configManager.getDbId() || '';

    await this.sessionManager.deleteSession(
      config.endpoint,
      sessionId,
      dbId,
      config.authToken
    );

    // Remove from state
    this.state.sessions = this.state.sessions.filter(
      (s) => s.session_id !== sessionId
    );

    // Clear messages if this was the current session
    if (this.configManager.getSessionId() === sessionId) {
      this.clearMessages();
    }

    this.emit('state:change', this.getState());
  }

  /**
   * Delete a team session
   */
  async deleteTeamSession(teamId: string, sessionId: string): Promise<void> {
    const config = this.configManager.getConfig();

    await this.sessionManager.deleteTeamSession(
      config.endpoint,
      teamId,
      sessionId,
      config.authToken
    );

    // Remove from state
    this.state.sessions = this.state.sessions.filter(
      (s) => s.session_id !== sessionId
    );

    // Clear messages if this was the current session
    if (this.configManager.getSessionId() === sessionId) {
      this.clearMessages();
    }

    this.emit('state:change', this.getState());
  }

  /**
   * Continue a paused run after executing external tools
   */
  async continueRun(
    tools: ToolCall[],
    options?: { headers?: Record<string, string> }
  ): Promise<void> {
    if (!this.state.isPaused || !this.state.pausedRunId) {
      throw new Error('No paused run to continue');
    }

    const runUrl = this.configManager.getRunUrl();
    if (!runUrl) {
      throw new Error('No agent or team selected');
    }

    // Build continue URL: POST /agents/{id}/runs/{run_id}/continue
    const continueUrl = `${runUrl}/${this.state.pausedRunId}/continue`;

    this.state.isPaused = false;
    this.state.isStreaming = true;
    this.emit('run:continued', { runId: this.state.pausedRunId });
    this.emit('state:change', this.getState());

    const formData = new FormData();
    formData.append('tools', JSON.stringify(tools));
    formData.append('stream', 'true');

    const currentSessionId = this.configManager.getSessionId();
    if (currentSessionId) {
      formData.append('session_id', currentSessionId);
    }

    const headers: Record<string, string> = { ...options?.headers };
    const authToken = this.configManager.getAuthToken();
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
      await streamResponse({
        apiUrl: continueUrl,
        headers,
        requestBody: formData,
        onChunk: (chunk: RunResponse) => {
          this.handleChunk(chunk, currentSessionId, '');
        },
        onError: (error) => {
          this.handleError(error, currentSessionId);
        },
        onComplete: () => {
          this.state.isStreaming = false;
          this.state.pausedRunId = undefined;
          this.state.toolsAwaitingExecution = undefined;
          this.emit('stream:end');
          this.emit('message:complete', this.messageStore.getMessages());
          this.emit('state:change', this.getState());
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
  async checkStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.configManager.getEndpoint()}/health`);
      const isActive = response.ok;
      this.state.isEndpointActive = isActive;
      this.emit('state:change', this.getState());
      return isActive;
    } catch {
      this.state.isEndpointActive = false;
      this.emit('state:change', this.getState());
      return false;
    }
  }

  /**
   * Fetch agents from endpoint
   */
  async fetchAgents(): Promise<AgentDetails[]> {
    const config = this.configManager.getConfig();
    const headers: Record<string, string> = {};
    if (config.authToken) {
      headers['Authorization'] = `Bearer ${config.authToken}`;
    }

    const response = await fetch(`${config.endpoint}/agents`, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch agents');
    }

    const agents: AgentDetails[] = await response.json();
    this.state.agents = agents;
    this.emit('state:change', this.getState());

    return agents;
  }

  /**
   * Fetch teams from endpoint
   */
  async fetchTeams(): Promise<TeamDetails[]> {
    const config = this.configManager.getConfig();
    const headers: Record<string, string> = {};
    if (config.authToken) {
      headers['Authorization'] = `Bearer ${config.authToken}`;
    }

    const response = await fetch(`${config.endpoint}/teams`, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch teams');
    }

    const teams: TeamDetails[] = await response.json();
    this.state.teams = teams;
    this.emit('state:change', this.getState());

    return teams;
  }

  /**
   * Initialize client (check status and fetch agents/teams)
   * Automatically selects the first available agent or team if none is configured
   */
  async initialize(): Promise<{
    agents: AgentDetails[];
    teams: TeamDetails[];
  }> {
    const isActive = await this.checkStatus();
    if (!isActive) {
      return { agents: [], teams: [] };
    }

    const [agents, teams] = await Promise.all([
      this.fetchAgents(),
      this.fetchTeams(),
    ]);

    // Auto-select first available agent or team if none is configured
    const currentConfig = this.configManager.getConfig();
    const hasAgentConfigured = currentConfig.agentId;
    const hasTeamConfigured = currentConfig.teamId;

    if (!hasAgentConfigured && !hasTeamConfigured) {
      if (agents.length > 0) {
        // Select first agent
        const firstAgent = agents[0];
        this.configManager.updateConfig({
          mode: 'agent',
          agentId: firstAgent.id,
          dbId: firstAgent.db_id || undefined,
        });
        this.emit('config:change', this.configManager.getConfig());
      } else if (teams.length > 0) {
        // Select first team if no agents available
        const firstTeam = teams[0];
        this.configManager.updateConfig({
          mode: 'team',
          teamId: firstTeam.id,
          dbId: firstTeam.db_id || undefined,
        });
        this.emit('config:change', this.configManager.getConfig());
      }
    }

    return { agents, teams };
  }
}

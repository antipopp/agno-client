import type { AgnoClientConfig } from '@antipopp/agno-types';

/**
 * Manages client configuration
 */
export class ConfigManager {
  private config: AgnoClientConfig;

  constructor(initialConfig: AgnoClientConfig) {
    this.config = { ...initialConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): AgnoClientConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AgnoClientConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Helper to update a single field immutably
   */
  private updateField<K extends keyof AgnoClientConfig>(
    key: K,
    value: AgnoClientConfig[K]
  ): void {
    this.config = { ...this.config, [key]: value };
  }

  /**
   * Get endpoint URL
   */
  getEndpoint(): string {
    return this.config.endpoint;
  }

  /**
   * Set endpoint URL
   */
  setEndpoint(endpoint: string): void {
    this.updateField('endpoint', endpoint);
  }

  /**
   * Get auth token
   */
  getAuthToken(): string | undefined {
    return this.config.authToken;
  }

  /**
   * Set auth token
   */
  setAuthToken(token: string | undefined): void {
    this.updateField('authToken', token);
  }

  /**
   * Get mode (agent or team)
   */
  getMode(): 'agent' | 'team' {
    return this.config.mode || 'agent';
  }

  /**
   * Set mode
   */
  setMode(mode: 'agent' | 'team'): void {
    this.updateField('mode', mode);
  }

  /**
   * Get agent ID
   */
  getAgentId(): string | undefined {
    return this.config.agentId;
  }

  /**
   * Set agent ID
   */
  setAgentId(agentId: string | undefined): void {
    this.updateField('agentId', agentId);
  }

  /**
   * Get team ID
   */
  getTeamId(): string | undefined {
    return this.config.teamId;
  }

  /**
   * Set team ID
   */
  setTeamId(teamId: string | undefined): void {
    this.updateField('teamId', teamId);
  }

  /**
   * Get database ID
   */
  getDbId(): string | undefined {
    return this.config.dbId;
  }

  /**
   * Set database ID
   */
  setDbId(dbId: string | undefined): void {
    this.updateField('dbId', dbId);
  }

  /**
   * Get session ID
   */
  getSessionId(): string | undefined {
    return this.config.sessionId;
  }

  /**
   * Set session ID
   */
  setSessionId(sessionId: string | undefined): void {
    this.updateField('sessionId', sessionId);
  }

  /**
   * Get user ID
   */
  getUserId(): string | undefined {
    return this.config.userId;
  }

  /**
   * Set user ID
   */
  setUserId(userId: string | undefined): void {
    this.updateField('userId', userId);
  }

  /**
   * Get current entity ID (agent or team based on mode)
   */
  getCurrentEntityId(): string | undefined {
    return this.getMode() === 'agent' ? this.getAgentId() : this.getTeamId();
  }

  /**
   * Construct the run URL based on current config
   */
  getRunUrl(): string | null {
    const mode = this.getMode();
    const endpoint = this.getEndpoint();
    const entityId = this.getCurrentEntityId();

    if (!entityId) return null;

    // Encode entity ID to prevent path traversal and handle special characters
    const encodedEntityId = encodeURIComponent(entityId);

    if (mode === 'team') {
      return `${endpoint}/teams/${encodedEntityId}/runs`;
    } else {
      return `${endpoint}/agents/${encodedEntityId}/runs`;
    }
  }
}

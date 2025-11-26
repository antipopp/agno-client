import type {
  SessionEntry,
  SessionsListResponse,
  ChatMessage,
  RunSchema,
  TeamRunSchema,
  ToolCall,
} from '@antipopp/agno-types';

/**
 * Manages session operations
 */
export class SessionManager {
  /**
   * Fetch all sessions for an entity
   */
  async fetchSessions(
    endpoint: string,
    entityType: 'agent' | 'team',
    entityId: string,
    dbId: string,
    authToken?: string
  ): Promise<SessionEntry[]> {
    const url = new URL(`${endpoint}/sessions`);
    url.searchParams.set('type', entityType);
    url.searchParams.set('component_id', entityId);
    url.searchParams.set('db_id', dbId);

    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch sessions: ${response.statusText}`);
    }

    const data: SessionsListResponse = await response.json();
    return data.data ?? [];
  }

  /**
   * Fetch a specific session's runs
   * Returns an array of RunSchema directly (not wrapped in { data, meta })
   */
  async fetchSession(
    endpoint: string,
    entityType: 'agent' | 'team',
    sessionId: string,
    dbId: string,
    authToken?: string
  ): Promise<Array<RunSchema | TeamRunSchema>> {
    const url = new URL(`${endpoint}/sessions/${sessionId}/runs`);
    url.searchParams.set('type', entityType);
    if (dbId) {
      url.searchParams.set('db_id', dbId);
    }

    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Delete a session
   */
  async deleteSession(
    endpoint: string,
    sessionId: string,
    dbId: string,
    authToken?: string
  ): Promise<void> {
    const url = new URL(`${endpoint}/sessions/${sessionId}`);
    if (dbId) {
      url.searchParams.set('db_id', dbId);
    }

    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to delete session: ${response.statusText}`);
    }
  }


  /**
   * Convert session runs array to chat messages
   */
  convertSessionToMessages(
    runs: Array<RunSchema | TeamRunSchema>
  ): ChatMessage[] {
    const messages = this.convertRunsToMessages(runs);
    return messages;
  }

  /**
   * Convert RunSchema[] to ChatMessage[]
   * Each run represents a user input + agent response pair
   */
  private convertRunsToMessages(
    runs: Array<RunSchema | TeamRunSchema>
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];

    for (const run of runs) {
      // Parse created_at timestamp
      const timestamp = run.created_at
        ? new Date(run.created_at).getTime() / 1000
        : Math.floor(Date.now() / 1000);

      // Add user message (from run_input)
      if (run.run_input) {
        messages.push({
          role: 'user',
          content: run.run_input,
          created_at: timestamp,
        });
      }

      // Extract tool calls from tools array
      const toolCalls: ToolCall[] = [];

      if (run.tools && Array.isArray(run.tools)) {
        for (const tool of run.tools) {
          const toolObj = tool as Record<string, unknown>;
          const toolCall = {
            role: 'tool' as const,
            content: (toolObj.content as string) ?? '',
            tool_call_id: (toolObj.tool_call_id as string) ?? '',
            tool_name: (toolObj.tool_name as string) ?? '',
            tool_args: (toolObj.tool_args as Record<string, string>) ?? {},
            tool_call_error: (toolObj.tool_call_error as boolean) ?? false,
            metrics: (toolObj.metrics as { time: number }) ?? { time: 0 },
            created_at: timestamp,
          };

          toolCalls.push(toolCall);
        }
      }

      // Extract additional tool calls from reasoning_messages
      if (run.reasoning_messages && Array.isArray(run.reasoning_messages)) {
        for (const msg of run.reasoning_messages) {
          const reasoningMsg = msg as Record<string, unknown>;
          if (reasoningMsg.role === 'tool') {
            toolCalls.push({
              role: 'tool',
              content: (reasoningMsg.content as string) ?? '',
              tool_call_id: (reasoningMsg.tool_call_id as string) ?? '',
              tool_name: (reasoningMsg.tool_name as string) ?? '',
              tool_args: (reasoningMsg.tool_args as Record<string, string>) ?? {},
              tool_call_error: (reasoningMsg.tool_call_error as boolean) ?? false,
              metrics: (reasoningMsg.metrics as { time: number }) ?? { time: 0 },
              created_at: (reasoningMsg.created_at as number) ?? timestamp,
            });
          }
        }
      }

      // Convert content to string if it's an object
      let contentStr = '';
      if (typeof run.content === 'string') {
        contentStr = run.content;
      } else if (run.content && typeof run.content === 'object') {
        contentStr = JSON.stringify(run.content);
      }

      // Build extra_data if there's any reasoning/reference content
      // Cast to any to avoid type issues with generic Record<string, unknown> from API
      const extraData =
        run.reasoning_messages || run.reasoning_steps || run.references
          ? ({
              reasoning_messages: run.reasoning_messages,
              reasoning_steps: run.reasoning_steps,
              references: run.references,
            } as any)
          : undefined;

      // Add agent response message
      messages.push({
        role: 'agent',
        content: contentStr,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        extra_data: extraData,
        images: run.images as any,
        videos: run.videos as any,
        audio: run.audio as any,
        response_audio: run.response_audio as any,
        created_at: timestamp + 1, // Agent response is slightly after user message
      });
    }

    return messages;
  }
}

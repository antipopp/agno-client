import type {
  AudioData,
  ChatMessage,
  ImageData,
  MessageExtraData,
  ResponseAudioData,
  RunSchema,
  SessionEntry,
  SessionsListResponse,
  TeamRunSchema,
  ToolCall,
  ToolMetrics,
  VideoData,
} from "@antipopp/agno-types";

/**
 * Manages session operations
 */
export class SessionManager {
  /**
   * Fetch all sessions for an entity
   */
  async fetchSessions(
    endpoint: string,
    entityType: "agent" | "team",
    entityId: string,
    dbId: string,
    headers: Record<string, string>,
    params?: URLSearchParams
  ): Promise<SessionEntry[]> {
    const url = new URL(`${endpoint}/sessions`);
    url.searchParams.set("type", entityType);
    url.searchParams.set("component_id", entityId);
    url.searchParams.set("db_id", dbId);

    // Merge additional params if provided
    if (params) {
      params.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
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
    entityType: "agent" | "team",
    sessionId: string,
    dbId: string,
    headers: Record<string, string>,
    userId?: string,
    params?: URLSearchParams
  ): Promise<Array<RunSchema | TeamRunSchema>> {
    const url = new URL(`${endpoint}/sessions/${sessionId}/runs`);
    url.searchParams.set("type", entityType);
    if (dbId) {
      url.searchParams.set("db_id", dbId);
    }
    if (userId) {
      url.searchParams.set("user_id", userId);
    }

    // Merge additional params if provided
    if (params) {
      params.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
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
    headers: Record<string, string>,
    params?: URLSearchParams
  ): Promise<void> {
    const url = new URL(`${endpoint}/sessions/${sessionId}`);
    if (dbId) {
      url.searchParams.set("db_id", dbId);
    }

    // Merge additional params if provided
    if (params) {
      params.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: "DELETE",
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
      const timestamp = this.getRunTimestamp(run);

      if (run.run_input) {
        messages.push(this.buildUserMessage(run.run_input, timestamp));
      }

      const toolCalls = this.extractToolCalls(run, timestamp);

      messages.push({
        role: "agent",
        content: this.normalizeRunContent(run.content),
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        extra_data: this.buildExtraData(run),
        images: run.images as ImageData[] | undefined,
        videos: run.videos as VideoData[] | undefined,
        audio: run.audio as AudioData[] | undefined,
        response_audio: run.response_audio as ResponseAudioData | undefined,
        created_at: timestamp + 1, // Agent response is slightly after user message
      });
    }

    return messages;
  }

  private getRunTimestamp(run: RunSchema | TeamRunSchema): number {
    return run.created_at
      ? new Date(run.created_at).getTime() / 1000
      : Math.floor(Date.now() / 1000);
  }

  private buildUserMessage(content: string, createdAt: number): ChatMessage {
    return {
      role: "user",
      content,
      created_at: createdAt,
    };
  }

  private normalizeRunContent(content: RunSchema["content"]): string {
    if (typeof content === "string") {
      return content;
    }

    if (content && typeof content === "object") {
      return JSON.stringify(content);
    }

    return "";
  }

  private buildToolCall(
    rawTool: Record<string, unknown>,
    fallbackTimestamp: number
  ): ToolCall {
    return {
      role: "tool",
      content: (rawTool.content as string) ?? "",
      tool_call_id: (rawTool.tool_call_id as string) ?? "",
      tool_name: (rawTool.tool_name as string) ?? "",
      tool_args: (rawTool.tool_args as Record<string, string>) ?? {},
      tool_call_error: (rawTool.tool_call_error as boolean) ?? false,
      metrics: (rawTool.metrics as ToolMetrics) ?? { time: 0 },
      created_at: (rawTool.created_at as number) ?? fallbackTimestamp,
    };
  }

  private extractToolCalls(
    run: RunSchema | TeamRunSchema,
    timestamp: number
  ): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    if (run.tools && Array.isArray(run.tools)) {
      for (const tool of run.tools) {
        toolCalls.push(this.buildToolCall(tool, timestamp));
      }
    }

    if (run.reasoning_messages && Array.isArray(run.reasoning_messages)) {
      for (const message of run.reasoning_messages) {
        if (message.role === "tool") {
          toolCalls.push(this.buildToolCall(message, timestamp));
        }
      }
    }

    return toolCalls;
  }

  private buildExtraData(
    run: RunSchema | TeamRunSchema
  ): MessageExtraData | undefined {
    if (!(run.reasoning_messages || run.reasoning_steps || run.references)) {
      return undefined;
    }

    return {
      reasoning_messages:
        run.reasoning_messages as MessageExtraData["reasoning_messages"],
      reasoning_steps:
        run.reasoning_steps as MessageExtraData["reasoning_steps"],
      references: run.references as MessageExtraData["references"],
    };
  }
}

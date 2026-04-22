import type {
  AudioData,
  ChatMessage,
  FileData,
  ImageData,
  MessageExtraData,
  PaginationInfo,
  RunSchema,
  SessionsListResponse,
  TeamRunSchema,
  ToolCall,
  ToolMetrics,
  VideoData,
} from "@antipopp/agno-types";

type MessageMedia = Pick<ChatMessage, "images" | "videos" | "audio" | "files">;

const EMPTY_PAGINATION_INFO: PaginationInfo = {
  page: 1,
  limit: 0,
  total_pages: 0,
  total_count: 0,
  search_time_ms: 0,
};

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
  ): Promise<SessionsListResponse> {
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
        return {
          data: [],
          meta: EMPTY_PAGINATION_INFO,
        };
      }
      throw new Error(`Failed to fetch sessions: ${response.statusText}`);
    }

    const data: SessionsListResponse = await response.json();
    return {
      data: data.data ?? [],
      meta: data.meta ?? EMPTY_PAGINATION_INFO,
    };
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
      const inputMedia = this.mergeInputMedia(
        this.extractInputMedia(run.input_media),
        this.extractInputMediaFromMessages(run.messages)
      );

      if (run.run_input || this.hasAnyMedia(inputMedia)) {
        messages.push(
          this.buildUserMessage(run.run_input ?? "", timestamp, inputMedia)
        );
      }

      const toolCalls = this.extractToolCalls(run, timestamp);

      messages.push({
        role: "agent",
        content: this.normalizeRunContent(run.content),
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        extra_data: this.buildExtraData(run),
        images: this.normalizeImages(run.images),
        videos: this.normalizeVideos(run.videos),
        audio: this.normalizeAudio(run.audio),
        files: this.normalizeFiles(run.files),
        response_audio: run.response_audio ?? undefined,
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

  private buildUserMessage(
    content: string,
    createdAt: number,
    media?: MessageMedia
  ): ChatMessage {
    return {
      role: "user",
      content,
      images: media?.images,
      videos: media?.videos,
      audio: media?.audio,
      files: media?.files,
      created_at: createdAt,
    };
  }

  private hasAnyMedia(media: MessageMedia): boolean {
    return Boolean(
      (media.images && media.images.length > 0) ||
        (media.videos && media.videos.length > 0) ||
        (media.audio && media.audio.length > 0) ||
        (media.files && media.files.length > 0)
    );
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  private getStringValue(
    record: Record<string, unknown>,
    key: string
  ): string | undefined {
    const value = record[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }

  private getNumberOrStringValue(
    record: Record<string, unknown>,
    key: string
  ): number | string | undefined {
    const value = record[key];
    return typeof value === "number" || typeof value === "string"
      ? value
      : undefined;
  }

  private buildDataUrl(
    content: string,
    mimeType: string | undefined,
    fallbackMimeType: string
  ): string {
    const safeMimeType = mimeType || fallbackMimeType;
    return `data:${safeMimeType};base64,${content}`;
  }

  private normalizeImage(item: unknown): ImageData | undefined {
    if (!this.isRecord(item)) {
      return undefined;
    }

    const mimeType = this.getStringValue(item, "mime_type");
    const content = this.getStringValue(item, "content");
    const url =
      this.getStringValue(item, "url") ||
      (content ? this.buildDataUrl(content, mimeType, "image/png") : undefined);

    if (!url) {
      return undefined;
    }

    return {
      url,
      revised_prompt: this.getStringValue(item, "revised_prompt"),
      original_prompt: this.getStringValue(item, "original_prompt"),
      alt_text: this.getStringValue(item, "alt_text"),
      id: this.getStringValue(item, "id"),
      mime_type: mimeType,
      format: this.getStringValue(item, "format"),
    };
  }

  private normalizeVideo(item: unknown): VideoData | undefined {
    if (!this.isRecord(item)) {
      return undefined;
    }

    const mimeType = this.getStringValue(item, "mime_type");
    const content = this.getStringValue(item, "content");
    const url =
      this.getStringValue(item, "url") ||
      (content ? this.buildDataUrl(content, mimeType, "video/mp4") : undefined);

    const normalized: VideoData = {
      url,
      id: this.getNumberOrStringValue(item, "id"),
      eta: this.getNumberOrStringValue(item, "eta"),
      mime_type: mimeType,
      format: this.getStringValue(item, "format"),
      original_prompt: this.getStringValue(item, "original_prompt"),
      revised_prompt: this.getStringValue(item, "revised_prompt"),
      width:
        typeof item.width === "number" ? (item.width as number) : undefined,
      height:
        typeof item.height === "number" ? (item.height as number) : undefined,
      fps: typeof item.fps === "number" ? (item.fps as number) : undefined,
      duration:
        typeof item.duration === "number"
          ? (item.duration as number)
          : undefined,
    };

    if (
      normalized.url ||
      normalized.id !== undefined ||
      normalized.eta !== undefined
    ) {
      return normalized;
    }

    return undefined;
  }

  private normalizeAudioEntry(item: unknown): AudioData | undefined {
    if (!this.isRecord(item)) {
      return undefined;
    }

    const mimeType = this.getStringValue(item, "mime_type");
    const content = this.getStringValue(item, "content");
    const url =
      this.getStringValue(item, "url") ||
      (content ? this.buildDataUrl(content, mimeType, "audio/wav") : undefined);

    const normalized: AudioData = {
      base64_audio: this.getStringValue(item, "base64_audio"),
      mime_type: mimeType,
      url,
      id: this.getNumberOrStringValue(item, "id"),
      content,
      channels:
        typeof item.channels === "number"
          ? (item.channels as number)
          : undefined,
      sample_rate:
        typeof item.sample_rate === "number"
          ? (item.sample_rate as number)
          : undefined,
      format: this.getStringValue(item, "format"),
      duration:
        typeof item.duration === "number"
          ? (item.duration as number)
          : undefined,
    };

    if (
      normalized.url ||
      normalized.base64_audio ||
      normalized.content ||
      normalized.id !== undefined
    ) {
      return normalized;
    }

    return undefined;
  }

  private normalizeFileEntry(item: unknown): FileData | undefined {
    if (!this.isRecord(item)) {
      return undefined;
    }

    const normalized: FileData = {
      id: this.getStringValue(item, "id"),
      url: this.getStringValue(item, "url"),
      filename: this.getStringValue(item, "filename"),
      name: this.getStringValue(item, "name"),
      mime_type: this.getStringValue(item, "mime_type"),
      format: this.getStringValue(item, "format"),
      size: typeof item.size === "number" ? (item.size as number) : undefined,
    };

    if (
      normalized.url ||
      normalized.filename ||
      normalized.name ||
      normalized.id
    ) {
      return normalized;
    }

    return undefined;
  }

  private normalizeArray<T>(
    value: unknown,
    normalizer: (item: unknown) => T | undefined
  ): T[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }

    const items = value
      .map((item) => normalizer(item))
      .filter((item): item is T => item !== undefined);

    return items.length > 0 ? items : undefined;
  }

  private normalizeImages(value: unknown): ImageData[] | undefined {
    return this.normalizeArray(value, (item) => this.normalizeImage(item));
  }

  private normalizeVideos(value: unknown): VideoData[] | undefined {
    return this.normalizeArray(value, (item) => this.normalizeVideo(item));
  }

  private normalizeAudio(value: unknown): AudioData[] | undefined {
    return this.normalizeArray(value, (item) => this.normalizeAudioEntry(item));
  }

  private normalizeFiles(value: unknown): FileData[] | undefined {
    return this.normalizeArray(value, (item) => this.normalizeFileEntry(item));
  }

  private extractInputMedia(inputMedia: unknown): MessageMedia {
    if (!this.isRecord(inputMedia)) {
      return {};
    }

    return {
      images: this.normalizeImages(inputMedia.images),
      videos: this.normalizeVideos(inputMedia.videos),
      audio: this.normalizeAudio(inputMedia.audios ?? inputMedia.audio),
      files: this.normalizeFiles(inputMedia.files),
    };
  }

  private extractInputMediaFromMessages(messages: unknown): MessageMedia {
    if (!Array.isArray(messages)) {
      return {};
    }

    for (const message of messages) {
      if (!this.isRecord(message)) {
        continue;
      }

      if (this.getStringValue(message, "role") !== "user") {
        continue;
      }

      const media: MessageMedia = {
        images: this.normalizeImages(message.images ?? message.image),
        videos: this.normalizeVideos(message.videos ?? message.video),
        audio: this.normalizeAudio(message.audios ?? message.audio),
        files: this.normalizeFiles(message.files),
      };

      if (this.hasAnyMedia(media)) {
        return media;
      }
    }

    return {};
  }

  private mergeInputMedia(
    primary: MessageMedia,
    fallback: MessageMedia
  ): MessageMedia {
    return {
      images: primary.images ?? fallback.images,
      videos: primary.videos ?? fallback.videos,
      audio: primary.audio ?? fallback.audio,
      files: primary.files ?? fallback.files,
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
      tool_args: (rawTool.tool_args as Record<string, unknown>) ?? {},
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

import type { RunResponseContent } from "@antipopp/agno-types";

export class StreamResponseHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "StreamResponseHttpError";
    this.status = status;
  }
}

/**
 * Detects if the incoming data is in the legacy format (direct RunResponseContent)
 */
function isLegacyFormat(data: RunResponseContent): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "event" in data &&
    !("data" in data) &&
    typeof data.event === "string"
  );
}

interface NewFormatData {
  event: string;
  data: string | Record<string, unknown>;
}

type LegacyEventFormat = RunResponseContent & { event: string };

interface JsonSlice {
  startIndex: number;
  endIndex: number;
}

interface JsonParserState {
  braceCount: number;
  inString: boolean;
  escapeNext: boolean;
}

/**
 * Converts new format to legacy format for compatibility
 */
function convertNewFormatToLegacy(
  newFormatData: NewFormatData
): LegacyEventFormat {
  const { event, data } = newFormatData;

  let parsedData: Record<string, unknown>;
  if (typeof data === "string") {
    try {
      parsedData = JSON.parse(data);
    } catch {
      parsedData = {};
    }
  } else {
    parsedData = data;
  }

  return {
    event,
    ...parsedData,
  } as LegacyEventFormat;
}

/**
 * Processes a single JSON chunk
 */
function processChunk(
  chunk: RunResponseContent,
  onChunk: (chunk: RunResponseContent) => void
) {
  onChunk(chunk);
}

function updateJsonParserState(char: string, state: JsonParserState): boolean {
  if (state.inString) {
    if (state.escapeNext) {
      state.escapeNext = false;
      return false;
    }

    if (char === "\\") {
      state.escapeNext = true;
      return false;
    }

    if (char === '"') {
      state.inString = false;
    }

    return false;
  }

  if (char === '"') {
    state.inString = true;
    return false;
  }

  if (char === "{") {
    state.braceCount++;
    return false;
  }

  if (char !== "}") {
    return false;
  }

  state.braceCount--;
  return state.braceCount === 0;
}

function findJsonSlice(
  buffer: string,
  fromIndex: number
): JsonSlice | undefined {
  const startIndex = buffer.indexOf("{", fromIndex);
  if (startIndex === -1) {
    return undefined;
  }

  const parserState: JsonParserState = {
    braceCount: 0,
    inString: false,
    escapeNext: false,
  };

  for (let i = startIndex; i < buffer.length; i++) {
    const isJsonComplete = updateJsonParserState(buffer[i], parserState);
    if (isJsonComplete) {
      return { startIndex, endIndex: i };
    }
  }

  return undefined;
}

function logChunkParseError(
  error: unknown,
  jsonString: string,
  position: number
): void {
  if (
    typeof process === "undefined" ||
    process.env?.NODE_ENV !== "development"
  ) {
    return;
  }

  console.error("Failed to parse JSON chunk:", {
    error,
    chunk: jsonString.slice(0, 100) + (jsonString.length > 100 ? "..." : ""),
    position,
  });
}

function processJsonSlice(
  jsonString: string,
  startIndex: number,
  onChunk: (chunk: RunResponseContent) => void
): boolean {
  try {
    const parsed = JSON.parse(jsonString);

    if (isLegacyFormat(parsed)) {
      processChunk(parsed, onChunk);
    } else {
      processChunk(convertNewFormatToLegacy(parsed), onChunk);
    }

    return true;
  } catch (error) {
    logChunkParseError(error, jsonString, startIndex);

    if (jsonString.length > 10_000) {
      throw new Error(
        `Failed to parse large JSON chunk at position ${startIndex}`
      );
    }

    return false;
  }
}

/**
 * Parses a string buffer to extract complete JSON objects
 * Handles incremental streaming with partial JSON accumulation
 */
export function parseBuffer(
  buffer: string,
  onChunk: (chunk: RunResponseContent) => void
): string {
  let searchIndex = 0;
  let remainingBuffer = buffer;

  while (true) {
    const jsonSlice = findJsonSlice(remainingBuffer, searchIndex);
    if (!jsonSlice) {
      break;
    }

    const jsonString = remainingBuffer.slice(
      jsonSlice.startIndex,
      jsonSlice.endIndex + 1
    );

    const parsed = processJsonSlice(jsonString, jsonSlice.startIndex, onChunk);
    if (!parsed) {
      searchIndex = jsonSlice.startIndex + 1;
      continue;
    }

    remainingBuffer = remainingBuffer.slice(jsonSlice.endIndex + 1).trim();
    searchIndex = 0;
  }

  return remainingBuffer;
}

function buildRequestHeaders(
  headers: Record<string, string>,
  requestBody: FormData | Record<string, unknown>
): Record<string, string> {
  return {
    ...(!(requestBody instanceof FormData) && {
      "Content-Type": "application/json",
    }),
    ...headers,
  };
}

async function buildErrorMessage(response: Response): Promise<string> {
  const defaultMessage = `HTTP ${response.status}: ${response.statusText}`;
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return defaultMessage;
  }

  try {
    const errorData = (await response.json()) as {
      detail?: string;
      message?: string;
    };
    return errorData.detail || errorData.message || defaultMessage;
  } catch {
    return defaultMessage;
  }
}

async function consumeResponseStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: RunResponseContent) => void,
  onComplete: () => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      parseBuffer(buffer, onChunk);
      onComplete();
      return;
    }

    buffer += decoder.decode(value, { stream: true });
    buffer = parseBuffer(buffer, onChunk);
  }
}

/**
 * Streams a response from the API and processes JSON chunks
 */
export async function streamResponse(options: {
  apiUrl: string;
  headers?: Record<string, string>;
  params?: URLSearchParams;
  requestBody: FormData | Record<string, unknown>;
  onChunk: (chunk: RunResponseContent) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
  signal?: AbortSignal;
}): Promise<void> {
  const {
    apiUrl,
    headers = {},
    params,
    requestBody,
    onChunk,
    onError,
    onComplete,
    signal,
  } = options;

  // Append query parameters to URL if provided
  const finalUrl = params?.toString()
    ? `${apiUrl}?${params.toString()}`
    : apiUrl;

  try {
    const response = await fetch(finalUrl, {
      method: "POST",
      headers: buildRequestHeaders(headers, requestBody),
      body:
        requestBody instanceof FormData
          ? requestBody
          : JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errorMessage = await buildErrorMessage(response);
      throw new StreamResponseHttpError(response.status, errorMessage);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    await consumeResponseStream(response.body, onChunk, onComplete);
  } catch (error) {
    // Handle abort gracefully without calling onError
    if (error instanceof Error && error.name === "AbortError") {
      return;
    }

    if (error instanceof Error) {
      onError(error);
      return;
    }

    if (typeof error === "object" && error !== null && "detail" in error) {
      onError(new Error(String(error.detail)));
    } else {
      onError(new Error(String(error)));
    }
  }
}

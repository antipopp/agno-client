import type { RunResponseContent } from '@antipopp/agno-types';

/**
 * Detects if the incoming data is in the legacy format (direct RunResponseContent)
 */
function isLegacyFormat(data: RunResponseContent): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    'event' in data &&
    !('data' in data) &&
    typeof data.event === 'string'
  );
}

interface NewFormatData {
  event: string;
  data: string | Record<string, unknown>;
}

type LegacyEventFormat = RunResponseContent & { event: string };

/**
 * Converts new format to legacy format for compatibility
 */
function convertNewFormatToLegacy(
  newFormatData: NewFormatData
): LegacyEventFormat {
  const { event, data } = newFormatData;

  let parsedData: Record<string, unknown>;
  if (typeof data === 'string') {
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

/**
 * Parses a string buffer to extract complete JSON objects
 * Handles incremental streaming with partial JSON accumulation
 */
export function parseBuffer(
  buffer: string,
  onChunk: (chunk: RunResponseContent) => void
): string {
  let currentIndex = 0;
  let jsonStartIndex = buffer.indexOf('{', currentIndex);

  while (jsonStartIndex !== -1 && jsonStartIndex < buffer.length) {
    let braceCount = 0;
    let inString = false;
    let escapeNext = false;
    let jsonEndIndex = -1;
    let i = jsonStartIndex;

    for (; i < buffer.length; i++) {
      const char = buffer[i];

      if (inString) {
        if (escapeNext) {
          escapeNext = false;
        } else if (char === '\\') {
          escapeNext = true;
        } else if (char === '"') {
          inString = false;
        }
      } else {
        if (char === '"') {
          inString = true;
        } else if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            jsonEndIndex = i;
            break;
          }
        }
      }
    }

    if (jsonEndIndex !== -1) {
      const jsonString = buffer.slice(jsonStartIndex, jsonEndIndex + 1);

      try {
        const parsed = JSON.parse(jsonString);

        if (isLegacyFormat(parsed)) {
          processChunk(parsed, onChunk);
        } else {
          const legacyChunk = convertNewFormatToLegacy(parsed);
          processChunk(legacyChunk, onChunk);
        }
      } catch (error) {
        // Log parse errors in development mode for debugging
        if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
          console.error('Failed to parse JSON chunk:', {
            error,
            chunk: jsonString.substring(0, 100) + (jsonString.length > 100 ? '...' : ''),
            position: jsonStartIndex,
          });
        }

        // Throw error for very large unparseable chunks (indicates real problem)
        if (jsonString.length > 10000) {
          throw new Error(`Failed to parse large JSON chunk at position ${jsonStartIndex}`);
        }

        jsonStartIndex = buffer.indexOf('{', jsonStartIndex + 1);
        continue;
      }

      currentIndex = jsonEndIndex + 1;
      buffer = buffer.slice(currentIndex).trim();
      currentIndex = 0;
      jsonStartIndex = buffer.indexOf('{', currentIndex);
    } else {
      break;
    }
  }

  return buffer;
}

/**
 * Streams a response from the API and processes JSON chunks
 */
export async function streamResponse(options: {
  apiUrl: string;
  headers?: Record<string, string>;
  requestBody: FormData | Record<string, unknown>;
  onChunk: (chunk: RunResponseContent) => void;
  onError: (error: Error) => void;
  onComplete: () => void;
  signal?: AbortSignal;
}): Promise<void> {
  const {
    apiUrl,
    headers = {},
    requestBody,
    onChunk,
    onError,
    onComplete,
    signal,
  } = options;

  let buffer = '';

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        ...(!(requestBody instanceof FormData) && {
          'Content-Type': 'application/json',
        }),
        ...headers,
      },
      body:
        requestBody instanceof FormData
          ? requestBody
          : JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // Fallback to status text if JSON parsing fails
        }
      }

      throw new Error(errorMessage);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const processStream = async (): Promise<void> => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          buffer = parseBuffer(buffer, onChunk);
          onComplete();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        buffer = parseBuffer(buffer, onChunk);
      }
    };

    await processStream();
  } catch (error) {
    // Handle abort gracefully without calling onError
    if (error instanceof Error && error.name === 'AbortError') {
      return;
    }

    if (typeof error === 'object' && error !== null && 'detail' in error) {
      onError(new Error(String(error.detail)));
    } else {
      onError(new Error(String(error)));
    }
  }
}

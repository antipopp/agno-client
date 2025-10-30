/**
 * Logger utility with sensitive data sanitization
 * Only logs in development mode to prevent auth token exposure
 */

const SENSITIVE_KEYS = ['authToken', 'Authorization', 'token', 'password', 'apiKey'];

/**
 * Sanitize an object by redacting sensitive fields
 */
function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some((sensitiveKey) =>
      key.toLowerCase().includes(sensitiveKey.toLowerCase())
    )) {
      sanitized[key] = value ? '[REDACTED]' : undefined;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Check if we're in development mode
 */
function isDevelopment(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
}

/**
 * Logger class with sanitization and environment-aware logging
 */
export class Logger {
  /**
   * Log debug information (only in development)
   */
  static debug(message: string, data?: unknown): void {
    if (isDevelopment()) {
      const sanitized = data ? sanitizeObject(data) : undefined;
      console.debug(`[DEBUG] ${message}`, sanitized || '');
    }
  }

  /**
   * Log informational messages (only in development)
   */
  static info(message: string, data?: unknown): void {
    if (isDevelopment()) {
      const sanitized = data ? sanitizeObject(data) : undefined;
      console.info(`[INFO] ${message}`, sanitized || '');
    }
  }

  /**
   * Log warnings (always logs)
   */
  static warn(message: string, data?: unknown): void {
    const sanitized = data ? sanitizeObject(data) : undefined;
    console.warn(`[WARN] ${message}`, sanitized || '');
  }

  /**
   * Log errors (always logs)
   */
  static error(message: string, data?: unknown): void {
    const sanitized = data ? sanitizeObject(data) : undefined;
    console.error(`[ERROR] ${message}`, sanitized || '');
  }
}

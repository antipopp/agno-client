import { afterEach, describe, expect, it, vi } from "vitest";
import { Logger } from "../../utils/logger";

describe("Logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should redact nested sensitive fields including empty values", () => {
    // Given
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    // When
    Logger.warn("Request failed", {
      accessToken: "",
      headers: { authorization: "Bearer private-token" },
      password: "secret",
    });

    // Then
    expect(warn).toHaveBeenCalledWith("[WARN] Request failed", {
      accessToken: "[REDACTED]",
      headers: { authorization: "[REDACTED]" },
      password: "[REDACTED]",
    });
  });
});

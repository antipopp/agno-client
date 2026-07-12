import { describe, expect, it } from "vitest";
import { getJsonMarkdown } from "../../utils/json-markdown";

describe("getJsonMarkdown", () => {
  it("should return the fallback when serialization produces no JSON", () => {
    // Given
    const content = undefined;

    // When
    const result = getJsonMarkdown(content);

    // Then
    expect(result).toBe("```\nError formatting JSON\n```");
  });

  it("should return the fallback when serialization throws", () => {
    // Given
    const content = BigInt(1);

    // When
    const result = getJsonMarkdown(content);

    // Then
    expect(result).toBe("```\nError formatting JSON\n```");
  });
});

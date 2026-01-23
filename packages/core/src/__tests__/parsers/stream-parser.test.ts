import { describe, expect, it, vi } from "vitest";
import { parseBuffer } from "../../parsers/stream-parser";

describe("parseBuffer", () => {
  describe("basic JSON parsing", () => {
    it("should parse a single complete JSON object", () => {
      const onChunk = vi.fn();
      const buffer =
        '{"event":"RunStarted","content_type":"text/plain","created_at":1700000000}';

      const remaining = parseBuffer(buffer, onChunk);

      expect(onChunk).toHaveBeenCalledTimes(1);
      expect(onChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "RunStarted",
          content_type: "text/plain",
        })
      );
      expect(remaining).toBe("");
    });

    it("should parse multiple JSON objects", () => {
      const onChunk = vi.fn();
      const buffer = `{"event":"RunStarted","created_at":1}{"event":"RunContent","content":"Hello","created_at":2}`;

      const remaining = parseBuffer(buffer, onChunk);

      expect(onChunk).toHaveBeenCalledTimes(2);
      expect(onChunk).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ event: "RunStarted" })
      );
      expect(onChunk).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ event: "RunContent", content: "Hello" })
      );
      expect(remaining).toBe("");
    });

    it("should return incomplete JSON as remaining buffer", () => {
      const onChunk = vi.fn();
      const buffer = '{"event":"RunStarted","created_at":1}{"event":"RunCont';

      const remaining = parseBuffer(buffer, onChunk);

      expect(onChunk).toHaveBeenCalledTimes(1);
      expect(remaining).toBe('{"event":"RunCont');
    });

    it("should handle whitespace between JSON objects", () => {
      const onChunk = vi.fn();
      const buffer =
        '  {"event":"A","created_at":1}  {"event":"B","created_at":2}  ';

      const remaining = parseBuffer(buffer, onChunk);

      expect(onChunk).toHaveBeenCalledTimes(2);
      expect(remaining).toBe("");
    });
  });

  describe("brace counting", () => {
    it("should handle nested objects", () => {
      const onChunk = vi.fn();
      const buffer =
        '{"event":"RunContent","content":{"nested":{"deep":"value"}},"created_at":1}';

      const remaining = parseBuffer(buffer, onChunk);

      expect(onChunk).toHaveBeenCalledTimes(1);
      expect(onChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          content: { nested: { deep: "value" } },
        })
      );
      expect(remaining).toBe("");
    });

    it("should handle arrays with objects", () => {
      const onChunk = vi.fn();
      const buffer =
        '{"event":"Test","tools":[{"name":"a"},{"name":"b"}],"created_at":1}';

      parseBuffer(buffer, onChunk);

      expect(onChunk).toHaveBeenCalledTimes(1);
      expect(onChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [{ name: "a" }, { name: "b" }],
        })
      );
    });
  });

  describe("escaped quotes", () => {
    it("should handle escaped quotes in strings", () => {
      const onChunk = vi.fn();
      const buffer =
        '{"event":"Test","content":"He said \\"hello\\"","created_at":1}';

      parseBuffer(buffer, onChunk);

      expect(onChunk).toHaveBeenCalledTimes(1);
      expect(onChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'He said "hello"',
        })
      );
    });

    it("should handle escaped backslashes", () => {
      const onChunk = vi.fn();
      const buffer =
        '{"event":"Test","content":"path\\\\to\\\\file","created_at":1}';

      parseBuffer(buffer, onChunk);

      expect(onChunk).toHaveBeenCalledTimes(1);
      expect(onChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "path\\to\\file",
        })
      );
    });

    it("should handle braces inside strings", () => {
      const onChunk = vi.fn();
      const buffer =
        '{"event":"Test","content":"function() { return {}; }","created_at":1}';

      parseBuffer(buffer, onChunk);

      expect(onChunk).toHaveBeenCalledTimes(1);
      expect(onChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "function() { return {}; }",
        })
      );
    });
  });

  describe("format conversion", () => {
    it("should handle legacy format (direct event field)", () => {
      const onChunk = vi.fn();
      const buffer =
        '{"event":"RunStarted","content_type":"text/plain","created_at":1}';

      parseBuffer(buffer, onChunk);

      expect(onChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "RunStarted",
        })
      );
    });

    it("should convert new format (event + data) to legacy format", () => {
      const onChunk = vi.fn();
      const buffer =
        '{"event":"RunContent","data":{"content":"Hello","content_type":"text/plain"}}';

      parseBuffer(buffer, onChunk);

      expect(onChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "RunContent",
          content: "Hello",
          content_type: "text/plain",
        })
      );
    });

    it("should handle new format with stringified data", () => {
      const onChunk = vi.fn();
      const dataStr = JSON.stringify({
        content: "World",
        content_type: "text/plain",
      });
      const buffer = `{"event":"RunContent","data":${JSON.stringify(dataStr)}}`;

      parseBuffer(buffer, onChunk);

      expect(onChunk).toHaveBeenCalledWith(
        expect.objectContaining({
          event: "RunContent",
          content: "World",
        })
      );
    });
  });

  describe("error handling", () => {
    it("should skip malformed JSON and continue parsing", () => {
      const onChunk = vi.fn();
      const buffer = '{invalid json}{"event":"Valid","created_at":1}';

      parseBuffer(buffer, onChunk);

      expect(onChunk).toHaveBeenCalledTimes(1);
      expect(onChunk).toHaveBeenCalledWith(
        expect.objectContaining({ event: "Valid" })
      );
    });

    it("should handle empty buffer", () => {
      const onChunk = vi.fn();
      const remaining = parseBuffer("", onChunk);

      expect(onChunk).not.toHaveBeenCalled();
      expect(remaining).toBe("");
    });

    it("should handle buffer with no JSON", () => {
      const onChunk = vi.fn();
      const remaining = parseBuffer("just some text", onChunk);

      expect(onChunk).not.toHaveBeenCalled();
      expect(remaining).toBe("just some text");
    });
  });

  describe("incremental streaming", () => {
    it("should accumulate partial JSON across calls", () => {
      const onChunk = vi.fn();

      // First call - partial JSON
      let remaining = parseBuffer('{"event":"Run', onChunk);
      expect(remaining).toBe('{"event":"Run');
      expect(onChunk).not.toHaveBeenCalled();

      // Second call - complete the JSON
      remaining = parseBuffer(`${remaining}Started","created_at":1}`, onChunk);
      expect(remaining).toBe("");
      expect(onChunk).toHaveBeenCalledTimes(1);
    });

    it("should handle streaming content updates", () => {
      const onChunk = vi.fn();

      parseBuffer(
        '{"event":"RunContent","content":"Hel","created_at":1}',
        onChunk
      );
      parseBuffer(
        '{"event":"RunContent","content":"Hello","created_at":1}',
        onChunk
      );
      parseBuffer(
        '{"event":"RunContent","content":"Hello, World!","created_at":1}',
        onChunk
      );

      expect(onChunk).toHaveBeenCalledTimes(3);
    });
  });
});

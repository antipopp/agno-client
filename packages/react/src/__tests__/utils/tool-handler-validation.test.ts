import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  createToolArgsValidatorFromSafeParse,
  createValidatedToolHandler,
  type ToolArgsValidator,
  type ToolValidationError,
} from "../../utils/tool-handler-validation";

interface FillReportArgs {
  name: string;
  category?: "financial" | "sales";
}

describe("createValidatedToolHandler", () => {
  it("should execute handler when validation succeeds", async () => {
    const validator: ToolArgsValidator<FillReportArgs> = (args) => {
      if (typeof args.name !== "string") {
        return {
          success: false,
          message: "name is required",
        };
      }

      return {
        success: true,
        data: {
          name: args.name,
          category:
            args.category === "financial" || args.category === "sales"
              ? args.category
              : undefined,
        },
      };
    };

    const handler = vi.fn((args: FillReportArgs) => {
      return {
        success: true,
        greeting: `Hello ${args.name}`,
      };
    });

    const wrapped = createValidatedToolHandler(validator, handler);
    const result = await wrapped({ name: "Alex", category: "financial" });

    expect(handler).toHaveBeenCalledWith({
      name: "Alex",
      category: "financial",
    });
    expect(result).toEqual({
      success: true,
      greeting: "Hello Alex",
    });
  });

  it("should support async validators", async () => {
    const validator: ToolArgsValidator<{ id: string }> = async (args) => {
      await Promise.resolve();

      if (typeof args.id !== "string") {
        return {
          success: false,
          message: "id must be a string",
        };
      }

      return {
        success: true,
        data: {
          id: args.id,
        },
      };
    };

    const handler = vi.fn((args: { id: string }) => ({
      ok: true,
      id: args.id,
    }));
    const wrapped = createValidatedToolHandler(validator, handler);

    const result = await wrapped({ id: "123" });

    expect(handler).toHaveBeenCalledWith({ id: "123" });
    expect(result).toEqual({ ok: true, id: "123" });
  });

  it("should return a default validation error payload", async () => {
    const validator: ToolArgsValidator<{ url: string }, string[]> = () => ({
      success: false,
      message: "invalid input",
      issues: ["url must be https"],
    });

    const handler = vi.fn();
    const wrapped = createValidatedToolHandler(validator, handler);
    const result = await wrapped({ url: "http://example.com" });

    expect(handler).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      code: "INVALID_TOOL_ARGS",
      error: "invalid input",
      issues: ["url must be https"],
    } satisfies ToolValidationError<string[]>);
  });

  it("should use custom validation error mapping when provided", async () => {
    const validator: ToolArgsValidator<
      { id: string },
      { issue: string }
    > = () => ({
      success: false,
      message: "bad id",
      issues: { issue: "id must be uuid" },
    });

    const handler = vi.fn();
    const wrapped = createValidatedToolHandler(validator, handler, {
      mapValidationError: (failure, args) => ({
        ok: false,
        reason: failure.message ?? "unknown",
        details: failure.issues,
        raw: args,
      }),
    });

    const result = await wrapped({ id: 42 });

    expect(handler).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      reason: "bad id",
      details: { issue: "id must be uuid" },
      raw: { id: 42 },
    });
  });

  it("should convert thrown validator errors to validation payloads", async () => {
    const validator: ToolArgsValidator<{ id: string }> = () => {
      throw new Error("validator exploded");
    };

    const handler = vi.fn();
    const wrapped = createValidatedToolHandler(validator, handler);
    const result = await wrapped({ id: "123" });

    expect(handler).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: false,
      code: "INVALID_TOOL_ARGS",
      error: "validator exploded",
    });
  });

  it("should infer handler argument types from validator", async () => {
    const validator: ToolArgsValidator<{ url: string }> = (args) => {
      if (typeof args.url !== "string") {
        return {
          success: false,
          message: "url is required",
        };
      }

      return {
        success: true,
        data: {
          url: args.url,
        },
      };
    };

    const wrapped = createValidatedToolHandler(validator, (args) => {
      expectTypeOf(args).toEqualTypeOf<{ url: string }>();
      return { ok: true, url: args.url };
    });

    const result = await wrapped({ url: "/reports" });
    expect(result).toEqual({ ok: true, url: "/reports" });
  });
});

describe("createToolArgsValidatorFromSafeParse", () => {
  it("should adapt successful safeParse results", async () => {
    const validator = createToolArgsValidatorFromSafeParse((args) => {
      if (typeof args.name === "string") {
        return {
          success: true,
          data: {
            name: args.name,
          },
        };
      }

      return {
        success: false,
        error: { field: "name" },
      };
    });

    const result = await validator({ name: "Sam" });
    expect(result).toEqual({
      success: true,
      data: { name: "Sam" },
    });
  });

  it("should adapt failed safeParse results", async () => {
    const validator = createToolArgsValidatorFromSafeParse(
      () => ({
        success: false,
        error: { field: "name" },
      }),
      {
        getErrorMessage: () => "Invalid name",
      }
    );

    const result = await validator({});
    expect(result).toEqual({
      success: false,
      message: "Invalid name",
      issues: { field: "name" },
    });
  });

  it("should support async safeParse adapters", async () => {
    const validator = createToolArgsValidatorFromSafeParse(async (args) => {
      await Promise.resolve();

      if (typeof args.token === "string") {
        return {
          success: true,
          data: {
            token: args.token,
          },
        };
      }

      return {
        success: false,
        error: "token missing",
      };
    });

    const result = await validator({ token: "abc" });
    expect(result).toEqual({
      success: true,
      data: { token: "abc" },
    });
  });
});

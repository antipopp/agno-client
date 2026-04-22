import type { ToolHandler } from "../hooks/useAgnoToolExecution";

type MaybePromise<T> = T | Promise<T>;

export interface ToolArgsValidationSuccess<TArgs> {
  success: true;
  data: TArgs;
}

export interface ToolArgsValidationFailure<TIssues = unknown> {
  success: false;
  message?: string;
  issues?: TIssues;
}

export type ToolArgsValidationResult<TArgs, TIssues = unknown> =
  | ToolArgsValidationSuccess<TArgs>
  | ToolArgsValidationFailure<TIssues>;

export type ToolArgsValidator<TArgs, TIssues = unknown> = (
  args: Record<string, unknown>
) => MaybePromise<ToolArgsValidationResult<TArgs, TIssues>>;

export interface ToolValidationError<TIssues = unknown> {
  success: false;
  code: "INVALID_TOOL_ARGS";
  error: string;
  issues?: TIssues;
}

export interface CreateValidatedToolHandlerOptions<
  TIssues = unknown,
  TValidationError = ToolValidationError<TIssues>,
> {
  errorMessage?: string;
  mapValidationError?: (
    failure: ToolArgsValidationFailure<TIssues>,
    args: Record<string, unknown>
  ) => TValidationError;
}

export type SafeParseResult<TArgs, TIssues = unknown> =
  | {
      success: true;
      data: TArgs;
    }
  | {
      success: false;
      error: TIssues;
    };

export interface CreateValidatorFromSafeParseOptions<TIssues = unknown> {
  getErrorMessage?: (issues: TIssues) => string;
}

function toDefaultValidationError<TIssues>(
  failure: ToolArgsValidationFailure<TIssues>,
  options?: CreateValidatedToolHandlerOptions<TIssues, unknown>
): ToolValidationError<TIssues> {
  return {
    success: false,
    code: "INVALID_TOOL_ARGS",
    error: failure.message ?? options?.errorMessage ?? "Invalid tool arguments",
    ...(failure.issues === undefined ? {} : { issues: failure.issues }),
  };
}

/**
 * Create a ToolArgsValidator from libraries that expose safeParse-like APIs.
 *
 * This is validator-agnostic and works with Zod, Valibot, ArkType adapters, etc.
 */
export function createToolArgsValidatorFromSafeParse<TArgs, TIssues = unknown>(
  safeParse: (
    args: Record<string, unknown>
  ) => MaybePromise<SafeParseResult<TArgs, TIssues>>,
  options?: CreateValidatorFromSafeParseOptions<TIssues>
): ToolArgsValidator<TArgs, TIssues> {
  return async (args) => {
    const parsed = await safeParse(args);

    if (parsed.success) {
      return {
        success: true,
        data: parsed.data,
      };
    }

    return {
      success: false,
      message: options?.getErrorMessage?.(parsed.error),
      issues: parsed.error,
    };
  };
}

/**
 * Wrap a tool handler with runtime argument validation.
 */
export function createValidatedToolHandler<
  TArgs,
  TResult = unknown,
  TIssues = unknown,
  TValidationError = ToolValidationError<TIssues>,
>(
  validator: ToolArgsValidator<TArgs, TIssues>,
  handler: (args: TArgs) => MaybePromise<TResult>,
  options?: CreateValidatedToolHandlerOptions<TIssues, TValidationError>
): ToolHandler<
  Record<string, unknown>,
  TResult | TValidationError | ToolValidationError<TIssues>
> {
  return async (args) => {
    let validationResult: ToolArgsValidationResult<TArgs, TIssues>;

    try {
      validationResult = await validator(args);
    } catch (error) {
      const thrownFailure: ToolArgsValidationFailure<TIssues> = {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Tool arguments validation threw an unexpected error",
      };

      if (options?.mapValidationError) {
        return options.mapValidationError(thrownFailure, args);
      }

      return toDefaultValidationError(thrownFailure, options);
    }

    if (!validationResult.success) {
      if (options?.mapValidationError) {
        return options.mapValidationError(validationResult, args);
      }

      return toDefaultValidationError(validationResult, options);
    }

    return handler(validationResult.data);
  };
}

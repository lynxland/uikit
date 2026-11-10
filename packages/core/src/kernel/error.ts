/**
 * Failure channel — a closed set carried by a real Error subclass.
 * Cancellation is neither a failure nor a result; adapters let AbortError
 * pass through untouched.
 */

export type ApiErrorKind = "network" | "auth" | "forbidden" | "not-found" | "server" | "decode";

export interface ApiErrorOptions {
  status?: number;
  detail?: string;
  message?: string;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly detail?: string;
  override readonly cause?: unknown;

  constructor(kind: ApiErrorKind, options: ApiErrorOptions = {}) {
    super(options.message ?? options.detail ?? kind);
    this.name = "ApiError";
    this.kind = kind;
    if (options.status !== undefined) this.status = options.status;
    if (options.detail !== undefined) this.detail = options.detail;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Network and server failures are retryable; auth/forbidden/not-found/decode are not. */
export function isRetryable(error: ApiError): boolean {
  return error.kind === "network" || error.kind === "server";
}

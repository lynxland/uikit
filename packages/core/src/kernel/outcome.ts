/**
 * Result channel. Expected domain rejections are values, not exceptions.
 * Failures (network/auth/server/decode) travel through `ApiError`.
 */
export type Outcome<P = unknown> =
  | { status: "ok"; payload: P }
  | {
      status: "rejected";
      code?: string;
      message: string;
      fieldErrors?: Record<string, string>;
    }
  | { status: "conflict"; message: string };

/** Historical name for the same result channel. */
export type CommandResult<P = unknown> = Outcome<P>;

export function ok<P>(payload: P): Outcome<P> {
  return { status: "ok", payload };
}

export function rejected(
  message: string,
  options: { code?: string; fieldErrors?: Record<string, string> } = {},
): Outcome<never> {
  return {
    status: "rejected",
    message,
    ...(options.code !== undefined ? { code: options.code } : {}),
    ...(options.fieldErrors !== undefined ? { fieldErrors: options.fieldErrors } : {}),
  };
}

export function conflict(message: string): Outcome<never> {
  return { status: "conflict", message };
}

import { ApiError } from "../kernel";

/**
 * Single source for Response-status -> ApiError and URL assembly.
 * Every adapter family uses this module; error currency does not fork by
 * transport shape.
 */

export type QueryParams = Record<string, string | number | boolean | readonly string[] | undefined>;

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export function extractErrorMessage(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const record = body as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;
  const error = record.error;
  if (typeof error === "object" && error !== null) {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

export function statusToApiError(status: number, body?: unknown): ApiError {
  const extracted = extractErrorMessage(body);
  const detail = extracted ?? (typeof body === "string" && body !== "" ? body : undefined);
  if (status === 401) {
    return new ApiError("auth", { status, ...(detail !== undefined ? { detail } : {}) });
  }
  if (status === 403) {
    return new ApiError("forbidden", { status, ...(detail !== undefined ? { detail } : {}) });
  }
  if (status === 404) {
    return new ApiError("not-found", { status, ...(detail !== undefined ? { detail } : {}) });
  }
  return new ApiError("server", {
    status,
    ...(detail !== undefined ? { detail, message: detail } : {}),
  });
}

/** Repeated-key URL assembly; undefined values are skipped. */
export function buildUrl(baseUrl: string | undefined, path: string, params?: QueryParams): string {
  const url = baseUrl !== undefined ? `${baseUrl}${path}` : path;
  if (params === undefined) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item));
    } else {
      search.append(key, String(value));
    }
  }
  const query = search.toString();
  return query === "" ? url : `${url}?${query}`;
}

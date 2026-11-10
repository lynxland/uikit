import type {
  CollectionPage,
  CollectionReader,
  CollectionRequest,
  CollectionWindow,
  RecordReader,
  Scope,
} from "../kernel";
import { ApiError, isApiError } from "../kernel";
import { buildUrl, type FetchLike, type QueryParams, statusToApiError } from "./api-error";

/**
 * REST-over-fetch adapter family. All three factories share one fetch/abort/
 * error/envelope core; `fetch` injection is the auth/401 boundary.
 */

interface RestBaseOptions {
  baseUrl?: string;
  /** Dynamic headers; called once per request. */
  headers?: () => Record<string, string>;
  fetch?: FetchLike;
}

export interface RestCollectionOptions extends RestBaseOptions {
  path: (ctx: Scope) => string;
  /** Body -> rows (default: body array, else body.rows). */
  envelope?: (body: unknown) => unknown[];
  /** Request -> query params (server-side filtering dialect). */
  params?: (request: CollectionRequest, ctx: Scope) => QueryParams;
  total?: (body: unknown) => number | undefined;
  nextCursor?: (body: unknown) => string | undefined;
  /** "null": 404 -> empty page (collection gone) instead of a failure. */
  notFound?: "null";
}

export interface RestRecordOptions<ID = string> extends RestBaseOptions {
  path: (id: ID, ctx: Scope) => string;
  envelope?: (body: unknown) => unknown;
  params?: (id: ID, ctx: Scope) => QueryParams;
  /** "null": 404 -> null (empty record) instead of a failure. */
  notFound?: "null";
}

export interface RestFetchAllOptions extends RestBaseOptions {
  path: (ctx: Scope) => string;
  envelope?: (body: unknown) => unknown[];
  /** Whole-list fetch: query is irrelevant to the server, so params take ctx only. */
  params?: (ctx: Scope) => QueryParams;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

function parseJson(text: string): unknown {
  try {
    return text === "" ? undefined : (JSON.parse(text) as unknown);
  } catch {
    return undefined;
  }
}

async function requestJson(
  base: RestBaseOptions,
  url: string,
  signal: AbortSignal | undefined,
): Promise<unknown> {
  const doFetch: FetchLike = base.fetch ?? ((input, init) => globalThis.fetch(input, init));

  const init: RequestInit = {
    ...(signal !== undefined ? { signal } : {}),
    ...(base.headers !== undefined ? { headers: base.headers() } : {}),
  };

  let response: Response;
  try {
    response = await doFetch(url, init);
  } catch (cause) {
    // Cancellation is not a failure; let AbortError pass through untouched.
    if (isAbortError(cause) || signal?.aborted === true) throw cause;
    throw new ApiError("network", { cause });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const body = parseJson(text);
    throw statusToApiError(response.status, body !== undefined ? body : text || undefined);
  }

  if (response.status === 204) return undefined;
  let text: string;
  try {
    text = await response.text();
  } catch (cause) {
    if (isAbortError(cause) || signal?.aborted === true) throw cause;
    throw new ApiError("network", { cause });
  }
  if (text.trim() === "") return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("decode", { detail: `response is not JSON (${url})` });
  }
}

function defaultEnvelope(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const rows = (body as { rows?: unknown } | null | undefined)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function compactRows<T>(rows: unknown[]): readonly T[] {
  return rows.filter((row): row is T => row !== undefined && row !== null);
}

function defaultTotal(body: unknown): number | undefined {
  const total = (body as { total?: unknown } | null | undefined)?.total;
  return typeof total === "number" ? total : undefined;
}

function defaultNextCursor(body: unknown): string | undefined {
  const next = (body as { nextCursor?: unknown } | null | undefined)?.nextCursor;
  return typeof next === "string" ? next : undefined;
}

function emptyPage<T>(window: CollectionWindow): CollectionPage<T> {
  if (window.kind === "offset") {
    return {
      rows: [],
      paging: { kind: "offset", total: 0, offset: window.offset, size: window.size },
    };
  }
  if (window.kind === "all") {
    return { rows: [], paging: { kind: "all", total: 0 } };
  }
  return { rows: [], paging: { kind: "cursor" } };
}

function pageOf<T>(
  request: CollectionRequest,
  rows: readonly T[],
  total: number | undefined,
  nextCursor: string | undefined,
): CollectionPage<T> {
  const window = request.window;
  if (window.kind === "offset") {
    return {
      rows,
      paging: {
        kind: "offset",
        total: total ?? window.offset + rows.length,
        offset: window.offset,
        size: window.size,
      },
    };
  }
  if (window.kind === "all") {
    return { rows, paging: { kind: "all", total: total ?? rows.length } };
  }
  return {
    rows,
    paging: {
      kind: "cursor",
      ...(nextCursor !== undefined ? { nextCursor } : {}),
      ...(total !== undefined ? { total } : {}),
    },
  };
}

export function restCollection<T>(options: RestCollectionOptions): CollectionReader<T> {
  const envelope = options.envelope ?? defaultEnvelope;
  const totalOf = options.total ?? defaultTotal;
  const nextCursorOf = options.nextCursor ?? defaultNextCursor;

  return {
    async read(
      request: CollectionRequest,
      ctx: Scope,
      signal?: AbortSignal,
    ): Promise<CollectionPage<T>> {
      const url = buildUrl(options.baseUrl, options.path(ctx), options.params?.(request, ctx));
      try {
        const body = await requestJson(options, url, signal);
        const rows = compactRows<T>(envelope(body));
        return pageOf(request, rows, totalOf(body), nextCursorOf(body));
      } catch (error) {
        if (options.notFound === "null" && isApiError(error) && error.kind === "not-found") {
          return emptyPage<T>(request.window);
        }
        throw error;
      }
    },
  };
}

export function restRecord<T, ID = string>(options: RestRecordOptions<ID>): RecordReader<T, ID> {
  const unwrap = options.envelope ?? ((body: unknown) => body);

  return {
    async read(id: ID, ctx: Scope, signal?: AbortSignal): Promise<T | null> {
      const url = buildUrl(options.baseUrl, options.path(id, ctx), options.params?.(id, ctx));
      try {
        const body = await requestJson(options, url, signal);
        return body === undefined || body === null ? null : (unwrap(body) as T);
      } catch (error) {
        if (options.notFound === "null" && isApiError(error) && error.kind === "not-found") {
          return null;
        }
        throw error;
      }
    },
  };
}

export function restFetchAll<T>(
  options: RestFetchAllOptions,
): (ctx: Scope, signal?: AbortSignal) => Promise<readonly T[]> {
  const envelope = options.envelope ?? defaultEnvelope;

  return async (ctx: Scope, signal?: AbortSignal): Promise<readonly T[]> => {
    const url = buildUrl(options.baseUrl, options.path(ctx), options.params?.(ctx));
    const body = await requestJson(options, url, signal);
    return compactRows<T>(envelope(body));
  };
}

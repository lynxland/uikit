import type { Cursor, FrameSource, StreamSource } from "../kernel";
import { ApiError, isApiError } from "../kernel";
import { type FetchLike, statusToApiError } from "./api-error";

/**
 * Stream transports (NDJSON / SSE). Pure async iterables; no Effect.
 *
 * NDJSON: body end is a transport interruption unless a frame-level `isEnded`
 * predicate says otherwise. SSE: a named end event is the only clean end.
 */

type UrlBuilder = string | ((cursor: Cursor | null) => string);

function buildUrl(url: UrlBuilder, cursor: Cursor | null): string {
  if (typeof url === "function") return url(cursor);
  if (cursor === null) return url;
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}cursor=${encodeURIComponent(cursor)}`;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

async function fetchResponse(
  url: string,
  init: RequestInit,
  fetchImpl: FetchLike,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch (cause) {
    if (isAbortError(cause)) throw cause;
    throw new ApiError("network", { cause });
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let body: unknown;
    try {
      body = text === "" ? undefined : (JSON.parse(text) as unknown);
    } catch {
      body = text;
    }
    throw statusToApiError(response.status, body);
  }
  return response;
}

function releaseReader(reader: ReadableStreamDefaultReader<Uint8Array>): void {
  try {
    reader.releaseLock();
  } catch {
    // Stream already errored/closed.
  }
}

async function cancelReader(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
  try {
    await reader.cancel();
  } catch {
    releaseReader(reader);
  }
}

function decodeFrame<Input, F>(decode: (input: Input) => F, input: Input): F {
  try {
    return decode(input);
  } catch (cause) {
    if (isApiError(cause)) throw cause;
    throw new ApiError("decode", { detail: "failed to decode stream frame", cause });
  }
}

// ============ NDJSON ============

export interface NdjsonTransportOptions<F> {
  url: UrlBuilder;
  /** Default JSON.parse; ticket/base64/protojson decoding belongs to the consumer. */
  decode?: (line: string) => F;
  fetchImpl?: FetchLike;
  headers?: Record<string, string>;
  /** Body ended and last frame matches => closeReason "ended"; default false. */
  isEnded?: (lastFrame: F) => boolean;
}

export function ndjsonTransport<F>(options: NdjsonTransportOptions<F>): StreamSource<F> {
  const decode = options.decode ?? ((line: string) => JSON.parse(line) as F);
  const fetchImpl: FetchLike = options.fetchImpl ?? ((url, init) => globalThis.fetch(url, init));

  return {
    open(cursor: Cursor | null, signal: AbortSignal): FrameSource<F> {
      let closeReason: FrameSource<F>["closeReason"] = "transport";

      return {
        get closeReason() {
          return closeReason;
        },
        async *[Symbol.asyncIterator](): AsyncIterator<F> {
          const response = await fetchResponse(
            buildUrl(options.url, cursor),
            {
              ...(options.headers !== undefined ? { headers: options.headers } : {}),
              signal,
            },
            fetchImpl,
          );
          if (response.body === null) {
            throw new ApiError("network", { detail: "ndjson response has no body" });
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let lastFrame: F | undefined;

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              let newline = buffer.indexOf("\n");
              while (newline >= 0) {
                const line = buffer.slice(0, newline).trim();
                buffer = buffer.slice(newline + 1);
                if (line !== "") {
                  lastFrame = decodeFrame(decode, line);
                  yield lastFrame;
                }
                newline = buffer.indexOf("\n");
              }
            }
            const tail = (buffer + decoder.decode()).trim();
            if (tail !== "") {
              lastFrame = decodeFrame(decode, tail);
              yield lastFrame;
            }
          } finally {
            await cancelReader(reader);
          }

          if (lastFrame !== undefined && options.isEnded?.(lastFrame) === true) {
            closeReason = "ended";
            return;
          }
          throw new ApiError("network", {
            detail: "ndjson body ended without an end frame",
          });
        },
      };
    },
  };
}

// ============ SSE ============

export interface SseMessage {
  event: string;
  data: string;
  /** Last `id:` field — SSE's native resume cursor. */
  id?: string;
}

export interface SseTransportOptions<F> {
  url: UrlBuilder;
  decode?: (message: SseMessage) => F;
  fetchImpl?: FetchLike;
  headers?: Record<string, string>;
  /** Reaching this named event means closeReason "ended". */
  endEvent?: string;
}

export function sseTransport<F>(options: SseTransportOptions<F>): StreamSource<F> {
  const decode = options.decode ?? ((message: SseMessage) => JSON.parse(message.data) as F);
  const fetchImpl: FetchLike = options.fetchImpl ?? ((url, init) => globalThis.fetch(url, init));

  return {
    open(cursor: Cursor | null, signal: AbortSignal): FrameSource<F> {
      let closeReason: FrameSource<F>["closeReason"] = "transport";

      return {
        get closeReason() {
          return closeReason;
        },
        async *[Symbol.asyncIterator](): AsyncIterator<F> {
          const response = await fetchResponse(
            buildUrl(options.url, cursor),
            {
              headers: { Accept: "text/event-stream", ...options.headers },
              signal,
            },
            fetchImpl,
          );
          if (response.body === null) {
            throw new ApiError("network", { detail: "sse response has no body" });
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let ended = false;

          const dispatch = (block: string, out: F[]): void => {
            const message: SseMessage = { event: "message", data: "" };
            const dataLines: string[] = [];
            for (const rawLine of block.split("\n")) {
              const line = rawLine.replace(/\r$/, "");
              if (line === "" || line.startsWith(":")) continue;
              const colon = line.indexOf(":");
              const field = colon < 0 ? line : line.slice(0, colon);
              let value = colon < 0 ? "" : line.slice(colon + 1);
              if (value.startsWith(" ")) value = value.slice(1);
              if (field === "data") dataLines.push(value);
              else if (field === "event") message.event = value;
              else if (field === "id") message.id = value;
            }
            if (options.endEvent !== undefined && message.event === options.endEvent) {
              ended = true;
              return;
            }
            if (dataLines.length === 0) return;
            message.data = dataLines.join("\n");
            out.push(decodeFrame(decode, message));
          };

          const emitBlocks = (chunk: string, final: boolean): F[] => {
            buffer += chunk;
            buffer = buffer.replace(/\r\n/g, "\n");
            const frames: F[] = [];
            let boundary = buffer.indexOf("\n\n");
            while (boundary >= 0 && !ended) {
              dispatch(buffer.slice(0, boundary), frames);
              buffer = buffer.slice(boundary + 2);
              boundary = buffer.indexOf("\n\n");
            }
            if (final && !ended && buffer.trim() !== "") {
              dispatch(buffer, frames);
              buffer = "";
            }
            return frames;
          };

          try {
            while (!ended) {
              const { done, value } = await reader.read();
              if (done) {
                for (const frame of emitBlocks(decoder.decode(), true)) yield frame;
                break;
              }
              for (const frame of emitBlocks(decoder.decode(value, { stream: true }), false)) {
                yield frame;
              }
            }
          } finally {
            await cancelReader(reader);
          }

          if (ended) {
            closeReason = "ended";
            return;
          }
          throw new ApiError("network", {
            detail: "sse stream closed without an end event",
          });
        },
      };
    },
  };
}

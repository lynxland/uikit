import type { ApiError } from "./error";
import type { Cursor, Scope } from "./types";

/**
 * Stream — cursor-positioned frame delivery, not pub/sub.
 */

export interface FrameSource<F> {
  [Symbol.asyncIterator](): AsyncIterator<F>;
  /** Terminal triage reported by the transport after normal iterator completion. */
  readonly closeReason: "ended" | "gapped" | "auth" | "transport";
}

export interface StreamSource<F> {
  open(cursor: Cursor | null, signal: AbortSignal): FrameSource<F>;
  beforeReconnect?(): void | Promise<void>;
}

/** Parameterized stream factory; params/ctx are bound by useStream. */
export type StreamFactory<P, F> = (params: P, ctx: Scope) => StreamSource<F>;

export interface StreamPolicy {
  /** Sliding ring-buffer capacity; oldest frames are dropped. */
  buffer: number;
  pauseable?: boolean;
  retry?: { backoffMs: readonly number[] };
}

export type StreamStatus =
  | "idle"
  | "live"
  | "reconnecting"
  | "paused"
  | "gapped"
  | "stalled"
  | "ended"
  | "error";

export interface StreamHandle<F> {
  readonly frames: readonly F[];
  readonly status: StreamStatus;
  readonly error: ApiError | null;
  readonly resyncs: number;
  pause(): void;
  resume(): void;
  restart(): void;
  resync(anchor?: Cursor | null): void;
  clear(): void;
  subscribeFrames(listener: () => void): () => void;
  getFrames(): readonly F[];
}

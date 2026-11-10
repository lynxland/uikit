import type {
  Cursor,
  FrameSource,
  StreamHandle,
  StreamPolicy,
  StreamSource,
  StreamStatus,
} from "../kernel";
import { ApiError, isApiError, isRetryable } from "../kernel";

/**
 * Pure-TS stream engine (no Effect).
 *
 * Backoff is driven by an explicit index: each delivered frame resets the
 * budget, each interruption advances it. The frame buffer is a sliding ring.
 * Terminal triage consumes FrameSource.closeReason; auth/terminal errors stop
 * the engine, transport interruptions reconnect until the budget is exhausted.
 */

export interface StreamState {
  readonly status: StreamStatus;
  readonly error: ApiError | null;
  readonly resyncs: number;
}

export interface StreamEngine<F> extends StreamHandle<F> {
  start(): void;
  stop(): void;
  onFrame(callback: (frame: F) => void): () => void;
  subscribeStatus(listener: () => void): () => void;
  getState(): StreamState;
}

export interface StreamEngineOptions<F> {
  source: StreamSource<F>;
  /** Initial anchor; null/undefined = live tail. */
  cursor?: Cursor | null;
  /** Frame -> resume cursor. */
  getCursor?: (frame: F) => Cursor | undefined;
  policy?: StreamPolicy;
  onFrame?: (frame: F) => void;
  /** Default true. */
  autoStart?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

export function createSubscriptionEngine<F>(options: StreamEngineOptions<F>): StreamEngine<F> {
  const source = options.source;
  const policy = options.policy;
  const backoffMs = policy?.retry?.backoffMs ?? [];
  const capacity = Math.max(1, Math.floor(policy?.buffer ?? 200));

  let state: StreamState = { status: "idle", error: null, resyncs: 0 };
  let frames: F[] = [];
  let framesCache: ReadonlyArray<F> | null = null;
  const statusListeners = new Set<() => void>();
  const frameListeners = new Set<() => void>();
  const frameCallbacks = new Set<(frame: F) => void>();

  let generation = 0;
  let running = false;
  let attempt = 0;
  let cursor: Cursor | null = options.cursor ?? null;
  let controller: AbortController | null = null;

  function patchState(next: StreamState): void {
    if (
      state.status === next.status &&
      state.error === next.error &&
      state.resyncs === next.resyncs
    ) {
      return;
    }
    state = next;
    for (const listener of statusListeners) listener();
  }

  function patchStatus(status: StreamStatus, error: ApiError | null): void {
    patchState({ status, error, resyncs: state.resyncs });
  }

  function appendFrame(frame: F): void {
    frames.push(frame);
    if (frames.length > capacity) frames.splice(0, frames.length - capacity);
    framesCache = null;
    for (const listener of frameListeners) listener();
  }

  function deliver(frame: F): void {
    const next = options.getCursor?.(frame);
    if (next !== undefined) cursor = next;
    attempt = 0; // frame delivery proves the connection healthy
    options.onFrame?.(frame);
    for (const callback of frameCallbacks) callback(frame);
  }

  function triageClose(reason: FrameSource<F>["closeReason"]): void {
    running = false;
    if (reason === "ended") {
      patchStatus("ended", null);
    } else if (reason === "gapped") {
      patchStatus("gapped", null);
    } else if (reason === "auth") {
      patchStatus("error", new ApiError("auth"));
    } else {
      patchStatus("error", new ApiError("network"));
    }
  }

  /** true = terminal state; false = retryable interruption. */
  function triageFailure(error: unknown): boolean {
    if (isApiError(error) && !isRetryable(error)) {
      running = false;
      patchStatus("error", error);
      return true;
    }
    return false;
  }

  async function drive(gen: number): Promise<void> {
    while (gen === generation) {
      const connection = new AbortController();
      controller = connection;
      patchStatus("reconnecting", null);

      let opened: FrameSource<F> | null = null;
      let completed = false;
      let failure: unknown;

      try {
        opened = source.open(cursor, connection.signal);
        if (gen !== generation) return;
        patchStatus("live", null);
        for await (const frame of opened) {
          if (gen !== generation) return;
          deliver(frame);
          appendFrame(frame);
        }
        completed = true;
      } catch (error) {
        failure = error;
      }

      if (gen !== generation) return;
      if (controller === connection) controller = null;

      if (completed) {
        triageClose(opened?.closeReason ?? "transport");
        return;
      }

      // Our own takeover aborts the connection; it is not a transport failure.
      if (connection.signal.aborted && isAbortError(failure)) return;
      if (triageFailure(failure)) return;

      if (attempt >= backoffMs.length) {
        running = false;
        patchStatus("stalled", null);
        return;
      }

      const wait = backoffMs[attempt] ?? 0;
      attempt += 1;
      patchStatus("reconnecting", null);
      await sleep(wait);
      if (gen !== generation) return;

      if (source.beforeReconnect !== undefined) {
        try {
          await source.beforeReconnect();
        } catch {
          // A failed refresh does not block re-open; an auth error will surface.
        }
      }
      if (gen !== generation) return;
    }
  }

  function takeover(): number {
    generation += 1;
    controller?.abort();
    controller = null;
    return generation;
  }

  function start(): void {
    if (running) return;
    running = true;
    attempt = 0;
    void drive(takeover());
  }

  if (options.autoStart !== false) start();

  return {
    get frames() {
      if (framesCache === null) framesCache = [...frames];
      return framesCache;
    },
    get status() {
      return state.status;
    },
    get error() {
      return state.error;
    },
    get resyncs() {
      return state.resyncs;
    },

    start,
    stop() {
      running = false;
      takeover();
      patchStatus("ended", null);
    },
    pause() {
      if (policy?.pauseable === false || !running) return;
      running = false;
      takeover();
      patchStatus("paused", null);
    },
    resume() {
      if (running) return;
      start();
    },
    restart() {
      running = true;
      attempt = 0;
      void drive(takeover());
    },
    resync(anchor) {
      frames = [];
      framesCache = null;
      for (const listener of frameListeners) listener();
      cursor = anchor === undefined ? null : anchor;
      patchState({
        status: state.status,
        error: null,
        resyncs: state.resyncs + 1,
      });
      running = true;
      attempt = 0;
      void drive(takeover());
    },
    clear() {
      frames = [];
      framesCache = null;
      for (const listener of frameListeners) listener();
    },

    onFrame(callback) {
      frameCallbacks.add(callback);
      return () => {
        frameCallbacks.delete(callback);
      };
    },
    subscribeStatus(listener) {
      statusListeners.add(listener);
      return () => {
        statusListeners.delete(listener);
      };
    },
    getState() {
      return state;
    },
    subscribeFrames(listener) {
      frameListeners.add(listener);
      return () => {
        frameListeners.delete(listener);
      };
    },
    getFrames() {
      if (framesCache === null) framesCache = [...frames];
      return framesCache;
    },
  };
}

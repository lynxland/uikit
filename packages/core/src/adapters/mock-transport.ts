import type { ApiError, Cursor, FrameSource, StreamSource } from "../kernel";

/**
 * In-memory StreamSource for tests/demos.
 *
 * Command controls act on the current (most recent) connection. Controls sent
 * to a connection already aborted by the engine are dropped, mirroring the
 * reality that frames emitted between reconnects are lost.
 */

export interface MockTransportHandle<F> {
  emit(frame: F): void;
  interrupt(): void;
  close(reason: FrameSource<F>["closeReason"]): void;
  gap(): void;
  end(): void;
  /** The next open throws this ApiError (auth/terminal failure tests). */
  failNext(error: ApiError): void;
  readonly opens: ReadonlyArray<{ cursor: Cursor | null }>;
}

export interface MockTransportOptions<F> {
  auto?: {
    intervalMs: number;
    frame: (seq: number) => F;
    startSeq?: number;
    /** Resume sequence from a cursor; default parseInt. */
    seqOfCursor?: (cursor: Cursor) => number;
  };
}

type MockStep<F> =
  | { kind: "frame"; frame: F }
  | { kind: "close"; reason: FrameSource<F>["closeReason"] }
  | { kind: "fail"; error: unknown };

export type MockTransport<F> = StreamSource<F> & MockTransportHandle<F>;

export function mockTransport<F>(options: MockTransportOptions<F> = {}): MockTransport<F> {
  const opens: { cursor: Cursor | null }[] = [];
  const failures: ApiError[] = [];

  interface Connection {
    alive: boolean;
    reason: FrameSource<F>["closeReason"];
    steps: MockStep<F>[];
    waiters: Array<() => void>;
    timer: ReturnType<typeof setInterval> | null;
    detach(): void;
  }

  let active: Connection | null = null;

  function post(connection: Connection, step: MockStep<F>): void {
    connection.steps.push(step);
    connection.waiters.shift()?.();
  }

  function send(step: MockStep<F>): void {
    if (active?.alive === true) post(active, step);
  }

  const handle: MockTransportHandle<F> = {
    emit: (frame) => send({ kind: "frame", frame }),
    interrupt: () => send({ kind: "fail", error: new TypeError("mock: connection reset") }),
    close: (reason) => send({ kind: "close", reason }),
    gap: () => handle.close("gapped"),
    end: () => handle.close("ended"),
    failNext: (error) => {
      failures.push(error);
    },
    get opens() {
      return opens;
    },
  };

  return {
    ...handle,
    open(cursor: Cursor | null, signal: AbortSignal): FrameSource<F> {
      opens.push({ cursor });
      const failure = failures.shift();
      if (failure !== undefined) throw failure;

      const connection: Connection = {
        alive: true,
        reason: "transport",
        steps: [],
        waiters: [],
        timer: null,
        detach() {
          connection.alive = false;
          if (connection.timer !== null) clearInterval(connection.timer);
          signal.removeEventListener("abort", abort);
          for (const wake of connection.waiters.splice(0)) wake();
        },
      };
      active = connection;

      const abort = (): void => {
        if (!connection.alive) return;
        connection.detach();
        post(connection, {
          kind: "fail",
          error: new DOMException("mock: aborted", "AbortError"),
        });
      };
      signal.addEventListener("abort", abort, { once: true });

      const auto = options.auto;
      if (auto !== undefined) {
        const seqOfCursor = auto.seqOfCursor ?? ((value: Cursor) => Number.parseInt(value, 10));
        let seq = cursor === null ? (auto.startSeq ?? 0) : seqOfCursor(cursor) + 1;
        connection.timer = setInterval(() => {
          if (connection.alive) send({ kind: "frame", frame: auto.frame(seq) });
          seq += 1;
        }, auto.intervalMs);
      }

      const iterator: AsyncIterator<F> = {
        async next(): Promise<IteratorResult<F>> {
          while (connection.steps.length === 0 && connection.alive) {
            await new Promise<void>((resolve) => {
              connection.waiters.push(resolve);
            });
          }
          const step = connection.steps.shift();
          if (step === undefined) return { done: true, value: undefined };
          if (step.kind === "frame") return { done: false, value: step.frame };
          connection.detach();
          if (step.kind === "close") {
            connection.reason = step.reason;
            return { done: true, value: undefined };
          }
          throw step.error;
        },
        async return(): Promise<IteratorResult<F>> {
          connection.detach();
          return { done: true, value: undefined };
        },
      };

      return {
        [Symbol.asyncIterator]: () => iterator,
        get closeReason() {
          return connection.reason;
        },
      };
    },
  };
}

/** Convenience numeric stream: seq is both frame and cursor. */
export function mockSeqTransport(
  options: { intervalMs?: number; startSeq?: number } = {},
): MockTransport<number> {
  return mockTransport<number>({
    ...(options.intervalMs !== undefined
      ? {
          auto: {
            intervalMs: options.intervalMs,
            frame: (seq: number) => seq,
            startSeq: options.startSeq ?? 0,
          },
        }
      : {}),
  });
}

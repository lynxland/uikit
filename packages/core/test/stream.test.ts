import { describe, expect, it } from "vitest";
import {
  createSubscriptionEngine,
  mockSeqTransport,
  mockTransport,
  ndjsonTransport,
  type StreamEngine,
  sseTransport,
} from "../src/adapters";
import type { FrameSource, StreamSource, StreamStatus } from "../src/kernel";
import { ApiError } from "../src/kernel";

async function waitForStatus<F>(
  engine: StreamEngine<F>,
  status: StreamStatus,
  timeoutMs = 3000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (engine.status !== status) {
    if (Date.now() > deadline) {
      throw new Error(`waitForStatus("${status}") timed out at "${engine.status}"`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

async function waitForOpens(
  source: { opens: ReadonlyArray<{ cursor: string | null }> },
  count: number,
  timeoutMs = 3000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (source.opens.length < count) {
    if (Date.now() > deadline) {
      throw new Error(`waitForOpens(${count}) timed out at ${source.opens.length}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

describe("stream engine: frames and ring buffer", () => {
  it("starts idle, then live; ring buffer drops oldest frames", async () => {
    const source = mockTransport<number>();
    const engine = createSubscriptionEngine<number>({
      source,
      autoStart: false,
      policy: { buffer: 3 },
    });
    expect(engine.status).toBe("idle");
    expect(source.opens).toHaveLength(0);

    engine.start();
    await waitForStatus(engine, "live");
    source.emit(1);
    source.emit(2);
    source.emit(3);
    source.emit(4);
    source.emit(5);
    await settle();

    expect(engine.getFrames()).toEqual([3, 4, 5]);
    expect(engine.frames).toBe(engine.getFrames());
    engine.stop();
  });

  it("delivers onFrame callbacks and clears frames", async () => {
    const source = mockTransport<number>();
    const seen: number[] = [];
    const engine = createSubscriptionEngine<number>({
      source,
      onFrame: (frame) => seen.push(frame),
    });
    const off = engine.onFrame((frame) => seen.push(frame * 10));
    await waitForStatus(engine, "live");
    source.emit(7);
    await settle();
    off();
    source.emit(8);
    await settle();

    expect(seen).toEqual([7, 70, 8]);
    engine.clear();
    expect(engine.getFrames()).toEqual([]);
    engine.stop();
  });
});

describe("stream engine: terminal triage", () => {
  it("maps closeReason ended/gapped/auth/transport", async () => {
    const endedSource = mockTransport<number>();
    const ended = createSubscriptionEngine({ source: endedSource });
    await waitForStatus(ended, "live");
    endedSource.emit(1);
    endedSource.end();
    await waitForStatus(ended, "ended");
    expect(ended.getFrames()).toEqual([1]);
    ended.stop();

    const gappedSource = mockTransport<number>();
    const gapped = createSubscriptionEngine({ source: gappedSource });
    await waitForStatus(gapped, "live");
    gappedSource.gap();
    await waitForStatus(gapped, "gapped");
    gapped.stop();

    const authSource = mockTransport<number>();
    const auth = createSubscriptionEngine({ source: authSource });
    await waitForStatus(auth, "live");
    authSource.close("auth");
    await waitForStatus(auth, "error");
    expect(auth.error).toBeInstanceOf(ApiError);
    expect(auth.error?.kind).toBe("auth");
    auth.stop();

    const transportSource = mockTransport<number>();
    const transport = createSubscriptionEngine({ source: transportSource });
    await waitForStatus(transport, "live");
    transportSource.close("transport");
    await waitForStatus(transport, "error");
    expect(transport.error?.kind).toBe("network");
    transport.stop();
  });

  it("treats non-retryable open errors as terminal and retryable ones as backoff", async () => {
    const authSource = mockTransport<number>();
    authSource.failNext(new ApiError("auth"));
    const auth = createSubscriptionEngine({ source: authSource });
    await waitForStatus(auth, "error");
    expect(auth.error?.kind).toBe("auth");
    auth.stop();

    const retrySource = mockTransport<number>();
    retrySource.failNext(new ApiError("server", { status: 503 }));
    const retry = createSubscriptionEngine({
      source: retrySource,
      policy: { buffer: 10, retry: { backoffMs: [10] } },
    });
    await waitForStatus(retry, "live");
    expect(retrySource.opens).toHaveLength(2);
    retry.stop();
  });

  it("exhausts the backoff budget into stalled; restart resets it", async () => {
    let healthy = false;
    let opens = 0;
    const source: StreamSource<number> = {
      open() {
        opens += 1;
        if (!healthy) throw new ApiError("network");
        throw new ApiError("auth");
      },
    };
    const engine = createSubscriptionEngine<number>({
      source,
      policy: { buffer: 10, retry: { backoffMs: [5, 5] } },
    });
    await waitForStatus(engine, "stalled");
    expect(opens).toBe(3);

    healthy = true;
    engine.restart();
    await waitForStatus(engine, "error");
    expect(engine.error?.kind).toBe("auth");
    expect(opens).toBe(4);
  });
});

describe("stream engine: pause/resume/resync", () => {
  it("pause aborts without treating it as a transport failure; resume reopens from cursor", async () => {
    const source = mockTransport<number>();
    const engine = createSubscriptionEngine<number>({
      source,
      getCursor: (frame) => String(frame),
      policy: { buffer: 10 },
    });
    await waitForStatus(engine, "live");
    source.emit(7);
    await settle();

    engine.pause();
    expect(engine.status).toBe("paused");
    source.emit(8);
    await settle();
    expect(engine.getFrames()).toEqual([7]);

    engine.resume();
    await waitForOpens(source, 2);
    expect(source.opens[1]).toEqual({ cursor: "7" });
    await waitForStatus(engine, "live");
    engine.stop();
  });

  it("resync clears the buffer, increments resyncs and reopens at the anchor", async () => {
    const source = mockTransport<number>();
    const engine = createSubscriptionEngine<number>({
      source,
      getCursor: (frame) => String(frame),
      policy: { buffer: 10 },
    });
    await waitForStatus(engine, "live");
    source.emit(1);
    source.emit(2);
    await settle();
    expect(engine.getFrames()).toEqual([1, 2]);

    engine.resync("anchor");
    expect(engine.getFrames()).toEqual([]);
    expect(engine.resyncs).toBe(1);
    await waitForOpens(source, 2);
    expect(source.opens[1]).toEqual({ cursor: "anchor" });
    await waitForStatus(engine, "live");

    source.emit(3);
    await settle();
    expect(engine.getFrames()).toEqual([3]);
    engine.stop();
  });

  it("stops cleanly and ignores late connection activity", async () => {
    const source = mockSeqTransport({ intervalMs: 200, startSeq: 100 });
    const engine = createSubscriptionEngine<number>({
      source,
      getCursor: (frame) => String(frame),
      policy: { buffer: 100 },
    });
    await waitForStatus(engine, "live");
    await settle();
    engine.pause();
    const frozen = engine.getFrames().length;
    await settle();
    expect(engine.getFrames()).toHaveLength(frozen);

    engine.stop();
    expect(engine.status).toBe("ended");
  });
});

describe("stream transports", () => {
  function chunkedResponse(chunks: readonly string[], status = 200): Response {
    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
          controller.close();
        },
      }),
      { status },
    );
  }

  it("ndjson splits chunks and reports ended via isEnded", async () => {
    const transport = ndjsonTransport<{ state: string }>({
      url: "https://x.test/logs",
      fetchImpl: async () => chunkedResponse(['{"state":"running"}\n{"state":', '"done"}\n']),
      isEnded: (frame) => frame.state === "done",
    });

    const frames: { state: string }[] = [];
    const source = transport.open(null, new AbortController().signal);
    for await (const frame of source) frames.push(frame);
    expect(frames).toEqual([{ state: "running" }, { state: "done" }]);
    expect(source.closeReason).toBe("ended");
  });

  it("ndjson without an end frame throws a retryable network ApiError", async () => {
    const transport = ndjsonTransport<{ n: number }>({
      url: "https://x.test/logs",
      fetchImpl: async () => chunkedResponse(['{"n":1}\n']),
    });
    const iterator = transport.open(null, new AbortController().signal)[Symbol.asyncIterator]();
    expect(await iterator.next()).toEqual({ done: false, value: { n: 1 } });
    await expect(iterator.next()).rejects.toMatchObject({ kind: "network" });
  });

  it("maps HTTP failures to ApiError and SSE end events to ended", async () => {
    const unauthorized = ndjsonTransport({
      url: "https://x.test/logs",
      fetchImpl: async () => new Response("nope", { status: 401 }),
    });
    await expect(async () => {
      for await (const _ of unauthorized.open(null, new AbortController().signal)) void _;
    }).rejects.toMatchObject({ kind: "auth" });

    const sse = sseTransport<{ value: number }>({
      url: "https://x.test/events",
      fetchImpl: async () => chunkedResponse(['data: {"value":1}\n\n', "event: end\n\n"]),
      endEvent: "end",
    });
    const frames: { value: number }[] = [];
    const source: FrameSource<{ value: number }> = sse.open(null, new AbortController().signal);
    for await (const frame of source) frames.push(frame);
    expect(frames).toEqual([{ value: 1 }]);
    expect(source.closeReason).toBe("ended");
  });
});

import {
  collectionKey,
  collectionSource,
  invalidate,
  mockCollection,
  mockTransport,
  type Scope,
  sourceName,
} from "@lynxland/uikit-core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ScopeProvider, useInvalidateOnFrame, useStream } from "../src/index";

function createClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function wrapper(client: QueryClient, scope: Scope = {}) {
  // biome-ignore lint/correctness/noComponentHookFactories: test-only wrapper factory
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ScopeProvider value={scope}>{children}</ScopeProvider>
      </QueryClientProvider>
    );
  };
}

describe("useStream", () => {
  it("moves through live/paused/ended and buffers frames", async () => {
    const transport = mockTransport<number>();
    const client = createClient();

    const { result } = renderHook(() => useStream(transport, { cursor: null }), {
      wrapper: wrapper(client),
    });

    expect(result.current.status).toBe("live");
    expect(transport.opens).toHaveLength(1);

    act(() => transport.emit(1));
    await waitFor(() => expect(result.current.frames).toEqual([1]));

    act(() => result.current.pause());
    expect(result.current.status).toBe("paused");

    act(() => result.current.resume());
    await waitFor(() => expect(result.current.status).toBe("live"));

    act(() => transport.emit(2));
    await waitFor(() => expect(result.current.frames).toEqual([1, 2]));

    act(() => result.current.resync("2"));
    await waitFor(() => expect(result.current.resyncs).toBe(1));
    expect(result.current.frames).toEqual([]);
    await waitFor(() => expect(result.current.status).toBe("live"));

    act(() => transport.emit(3));
    await waitFor(() => expect(result.current.frames).toEqual([3]));

    act(() => result.current.clear());
    expect(result.current.frames).toEqual([]);

    act(() => result.current.stop());
    expect(result.current.status).toBe("ended");
  });

  it("stays idle in standby (cursor undefined) until started", async () => {
    const transport = mockTransport<number>();
    const client = createClient();

    const { result } = renderHook(() => useStream(transport), { wrapper: wrapper(client) });

    expect(result.current.status).toBe("idle");
    expect(transport.opens).toHaveLength(0);

    act(() => result.current.start());
    await waitFor(() => expect(result.current.status).toBe("live"));
    expect(transport.opens).toHaveLength(1);
  });

  it("binds factory params and the resolved scope", async () => {
    const transport = mockTransport<number>();
    const seen: Array<{ params: unknown; scope: Scope }> = [];
    const client = createClient();

    renderHook(
      () =>
        useStream(
          (params: { channel: string }, scope) => {
            seen.push({ params, scope });
            return transport;
          },
          { params: { channel: "logs" }, cursor: null },
        ),
      { wrapper: wrapper(client, { projectId: "p1" }) },
    );

    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    expect(seen[0]).toEqual({ params: { channel: "logs" }, scope: { projectId: "p1" } });
  });
});

describe("useInvalidateOnFrame", () => {
  it("applies effects on matching frames", async () => {
    const transport = mockTransport<number>();
    const client = createClient();
    const scope = { projectId: "p1" };
    const mock = mockCollection([{ id: "1", name: "alpha" }]);
    const source = collectionSource<{ id: string; name: string }>({
      name: "widgets",
      scope: ["projectId"],
      read: mock.collection.read,
    });
    const request = { window: { kind: "offset" as const, size: 10, offset: 0 } };
    const key = collectionKey(source, request, scope);
    client.setQueryData(key, {
      rows: [{ id: "1", name: "alpha" }],
      paging: { kind: "offset", total: 1, offset: 0, size: 10 },
    });

    renderHook(
      () => {
        const stream = useStream(transport, { cursor: null });
        useInvalidateOnFrame(stream, [invalidate(sourceName("widgets"))], { scope });
        return stream;
      },
      { wrapper: wrapper(client) },
    );

    await waitFor(() => expect(transport.opens).toHaveLength(1));
    act(() => transport.emit(1));

    await waitFor(() => expect(client.getQueryState(key)?.isInvalidated).toBe(true));
  });

  it("filters frames and coalesces a trailing throttle window", async () => {
    const transport = mockTransport<{ kind: string }>();
    const client = createClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    renderHook(
      () => {
        const stream = useStream(transport, { cursor: null });
        useInvalidateOnFrame(stream, [invalidate(sourceName("widgets"))], {
          filter: (frame) => frame.kind === "changed",
          throttleMs: 20,
        });
        return stream;
      },
      { wrapper: wrapper(client) },
    );

    await waitFor(() => expect(transport.opens).toHaveLength(1));
    act(() => {
      transport.emit({ kind: "ignored" });
      transport.emit({ kind: "changed" });
      transport.emit({ kind: "changed" });
    });

    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(1));
  });
});

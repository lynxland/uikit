import {
  ApiError,
  type CollectionRequest,
  collectionKey,
  collectionSource,
  lookupSource,
  mockCollection,
  recordSource,
  type Scope,
} from "@lynxland/uikit-core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ScopeProvider, useCollection, useLookup, useRecord } from "../src/index";

interface Widget {
  id: string;
  name: string;
}

const WIDGETS: Widget[] = [
  { id: "1", name: "alpha" },
  { id: "2", name: "beta" },
];

const OFFSET_PAGE: CollectionRequest = {
  window: { kind: "offset", size: 10, offset: 0 },
};

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

describe("useCollection", () => {
  it("goes loading -> success and exposes rows/total", async () => {
    const mock = mockCollection(WIDGETS);
    const source = collectionSource<Widget>({ name: "widgets", read: mock.collection.read });
    const client = createClient();

    const { result } = renderHook(() => useCollection(source, OFFSET_PAGE, { retry: false }), {
      wrapper: wrapper(client),
    });

    expect(result.current.status).toBe("loading");
    expect(result.current.rows).toEqual([]);

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.rows).toEqual(WIDGETS);
    expect(result.current.total).toBe(2);
    expect(result.current.error).toBeNull();
    expect(result.current.emptyReason).toBeUndefined();
  });

  it("projects the query-key scope to declared keys only", async () => {
    const mock = mockCollection(WIDGETS);
    const source = collectionSource<Widget>({
      name: "widgets",
      scope: ["projectId"],
      read: mock.collection.read,
    });
    const client = createClient();

    const { result } = renderHook(() => useCollection(source, OFFSET_PAGE), {
      wrapper: wrapper(client, { projectId: "p1", appId: "ignored" }),
    });

    await waitFor(() => expect(result.current.status).toBe("success"));

    const keys = client
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey);
    expect(keys).toHaveLength(1);
    expect(keys[0]).toEqual(collectionKey(source, OFFSET_PAGE, { projectId: "p1" }));
    expect(keys[0]?.[2]).toEqual({ projectId: "p1" });
  });

  it("distinguishes an empty source from an empty filter result", async () => {
    const emptyMock = mockCollection<Widget>([]);
    const emptySource = collectionSource<Widget>({
      name: "empty-widgets",
      read: emptyMock.collection.read,
    });
    const client = createClient();

    const first = renderHook(() => useCollection(emptySource, OFFSET_PAGE), {
      wrapper: wrapper(client),
    });
    await waitFor(() => expect(first.result.current.status).toBe("empty"));
    expect(first.result.current.emptyReason).toBe("source");

    const filteredMock = mockCollection(WIDGETS);
    const filteredSource = collectionSource<Widget>({
      name: "filtered-widgets",
      read: filteredMock.collection.read,
    });
    const filteredRequest: CollectionRequest = {
      where: { field: "name", op: "eq", value: "does-not-exist" },
      window: { kind: "offset", size: 10, offset: 0 },
    };
    const second = renderHook(() => useCollection(filteredSource, filteredRequest), {
      wrapper: wrapper(client),
    });
    await waitFor(() => expect(second.result.current.status).toBe("empty"));
    expect(second.result.current.emptyReason).toBe("filter");
  });

  it("stays idle (and does not fetch) while a declared scope is incomplete", async () => {
    let reads = 0;
    const mock = mockCollection(WIDGETS);
    const source = collectionSource<Widget>({
      name: "scoped-widgets",
      scope: ["projectId"],
      read: (request, ctx, signal) => {
        reads += 1;
        return mock.collection.read(request, ctx, signal);
      },
    });
    const client = createClient();

    const { result } = renderHook(() => useCollection(source, OFFSET_PAGE), {
      wrapper: wrapper(client, {}),
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.rows).toEqual([]);
    expect(reads).toBe(0);
    expect(client.getQueryCache().getAll()[0]?.state.fetchStatus).toBe("idle");
  });

  it("reports ApiError failures", async () => {
    const mock = mockCollection(WIDGETS);
    mock.handle.failNext(new ApiError("server", { status: 500 }));
    const source = collectionSource<Widget>({ name: "boom-widgets", read: mock.collection.read });
    const client = createClient();

    const { result } = renderHook(() => useCollection(source, OFFSET_PAGE, { retry: false }), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error?.kind).toBe("server");
    expect(result.current.rows).toEqual([]);
  });
});

describe("useRecord", () => {
  it("is idle for an undefined id and does not fetch", async () => {
    let reads = 0;
    const mock = mockCollection(WIDGETS);
    const source = recordSource<Widget>({
      name: "widget",
      read: (id, ctx, signal) => {
        reads += 1;
        return mock.record.read(id, ctx, signal);
      },
    });
    const client = createClient();

    const { result } = renderHook(() => useRecord(source, undefined), {
      wrapper: wrapper(client),
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.data).toBeUndefined();
    expect(reads).toBe(0);
    expect(client.getQueryCache().getAll()[0]?.state.fetchStatus).toBe("idle");
  });

  it("maps a missing record (null) to empty", async () => {
    const mock = mockCollection(WIDGETS);
    const source = recordSource<Widget>({ name: "widget", read: mock.record.read });
    const client = createClient();

    const { result } = renderHook(() => useRecord(source, "missing"), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.status).toBe("empty"));
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  });

  it("loads an existing record", async () => {
    const mock = mockCollection(WIDGETS);
    const source = recordSource<Widget>({ name: "widget", read: mock.record.read });
    const client = createClient();

    const { result } = renderHook(() => useRecord(source, "2"), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.data).toEqual(WIDGETS[1]);
  });
});

describe("useLookup", () => {
  it("exposes byId and missingIds", async () => {
    const mock = mockCollection(WIDGETS);
    const source = lookupSource<Widget>({ name: "widget-lookup", read: mock.lookup.read });
    const client = createClient();

    const { result } = renderHook(() => useLookup(source, ["1", "2", "3"]), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect([...result.current.byId.keys()]).toEqual(["1", "2"]);
    expect(result.current.missingIds).toEqual(["3"]);
    expect(result.current.rows).toHaveLength(2);
  });

  it("supports an explicit row -> id key", async () => {
    const rows = [
      { uuid: "a", name: "A" },
      { uuid: "b", name: "B" },
    ];
    const source = lookupSource<{ uuid: string; name: string }, string>({
      name: "uuid-lookup",
      // The source itself can carry the projection; options.key still overrides.
      key: (row) => row.uuid,
      read: async (ids) => rows.filter((row) => ids.includes(row.uuid)),
    });
    const client = createClient();

    const { result } = renderHook(
      () => useLookup(source, ["a", "b", "c"], { key: (row) => row.uuid }),
      { wrapper: wrapper(client) },
    );

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.byId.get("a")?.name).toBe("A");
    expect(result.current.missingIds).toEqual(["c"]);
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  clientCollection,
  mockCollection,
  mockFetchAll,
  restCollection,
  restFetchAll,
  restRecord,
} from "../src/adapters";
import type { CollectionPage, CollectionRequest } from "../src/kernel";
import { ApiError, isApiError } from "../src/kernel";

interface Widget {
  id: string;
  name: string;
  status: string;
  replicas: number;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const OFFSET_REQUEST: CollectionRequest = {
  window: { kind: "offset", size: 20, offset: 0 },
};

describe("restCollection", () => {
  it("flattens envelopes, compacts rows and reports offset paging", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse(200, { rows: [{ id: "a" }, null, { id: "b" }], total: 7 }),
    );
    const collection = restCollection<Widget>({
      path: () => "/v1/widgets",
      fetch: fetchMock,
    });

    const page = await collection.read(OFFSET_REQUEST, { projectId: "p1" });
    expect(page).toEqual({
      rows: [{ id: "a" }, { id: "b" }],
      paging: { kind: "offset", total: 7, offset: 0, size: 20 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("extracts total/nextCursor for cursor paging", async () => {
    const collection = restCollection<Widget>({
      path: () => "/v1/widgets",
      fetch: vi.fn(async () =>
        jsonResponse(200, {
          rows: [{ id: "w1" }],
          total: 9,
          nextCursor: "token-2",
        }),
      ),
    });
    await expect(
      collection.read({ window: { kind: "cursor", size: 1, cursor: "token-1" } }, {}),
    ).resolves.toEqual({
      rows: [{ id: "w1" }],
      paging: { kind: "cursor", nextCursor: "token-2", total: 9 },
    });
  });

  it("builds path/params from ctx and request with repeated keys", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse(200, []));
    const collection = restCollection<Widget>({
      baseUrl: "https://api.test",
      path: (ctx) => `/v1/projects/${ctx.projectId}/widgets`,
      params: (request, ctx) => ({
        size: request.window.size,
        status: (request.where as { value?: string } | undefined)?.value,
        tag: ["a", "b"],
        project: ctx.projectId,
      }),
      fetch: fetchMock,
    });

    await collection.read(
      {
        where: { field: "status", op: "eq", value: "running" },
        window: { kind: "cursor", size: 8 },
      },
      { projectId: "p1" },
    );

    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain("https://api.test/v1/projects/p1/widgets");
    expect(url).toContain("size=8");
    expect(url).toContain("status=running");
    expect(url).toContain("tag=a");
    expect(url).toContain("tag=b");
    expect(url).toContain("project=p1");
  });

  it("maps 404 to an empty page only with notFound:null; other statuses are ApiError", async () => {
    const gone = restCollection<Widget>({
      path: () => "/gone",
      notFound: "null",
      fetch: vi.fn(async () => jsonResponse(404, {})),
    });
    expect(await gone.read(OFFSET_REQUEST, {})).toEqual({
      rows: [],
      paging: { kind: "offset", total: 0, offset: 0, size: 20 },
    });

    const missing = restCollection<Widget>({
      path: () => "/gone",
      fetch: vi.fn(async () => jsonResponse(404, {})),
    });
    const notFound = await missing.read(OFFSET_REQUEST, {}).then(
      () => null,
      (error: unknown) => error,
    );
    expect(isApiError(notFound)).toBe(true);
    expect(notFound).toBeInstanceOf(ApiError);
    expect((notFound as ApiError).kind).toBe("not-found");

    const cases: ReadonlyArray<[number, unknown, ApiError["kind"]]> = [
      [401, undefined, "auth"],
      [403, {}, "forbidden"],
      [503, { message: "maintenance" }, "server"],
    ];
    for (const [status, body, kind] of cases) {
      const source = restCollection<Widget>({
        path: () => "/x",
        fetch: vi.fn(async () => jsonResponse(status, body)),
      });
      const error = await source.read(OFFSET_REQUEST, {}).then(
        () => null,
        (caught: unknown) => caught,
      );
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).kind).toBe(kind);
    }
  });

  it("normalizes network/decode errors and passes AbortError through", async () => {
    const offline = restCollection<Widget>({
      path: () => "/x",
      fetch: vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    });
    const network = await offline.read(OFFSET_REQUEST, {}).then(
      () => null,
      (error: unknown) => error,
    );
    expect(network).toBeInstanceOf(ApiError);
    expect((network as ApiError).kind).toBe("network");
    expect((network as ApiError).cause).toBeInstanceOf(TypeError);

    const notJson = restCollection<Widget>({
      path: () => "/x",
      fetch: vi.fn(async () => new Response("<html>", { status: 200 })),
    });
    await expect(notJson.read(OFFSET_REQUEST, {})).rejects.toMatchObject({
      kind: "decode",
    });

    const abort = new Error("aborted");
    abort.name = "AbortError";
    const aborted = restCollection<Widget>({
      path: () => "/x",
      fetch: vi.fn(async () => {
        throw abort;
      }),
    });
    await expect(aborted.read(OFFSET_REQUEST, {})).rejects.toBe(abort);
  });
});

describe("restRecord and restFetchAll", () => {
  it("unwraps records and turns 404 into null only when requested", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { item: { id: "w1" } }))
      .mockResolvedValueOnce(jsonResponse(404, {}));
    const record = restRecord<Widget>({
      path: (id, ctx) => `/v1/projects/${ctx.projectId}/widgets/${id}`,
      envelope: (body) => (body as { item: unknown }).item,
      notFound: "null",
      fetch: fetchMock,
    });

    await expect(record.read("w1", { projectId: "p1" })).resolves.toEqual({ id: "w1" });
    await expect(record.read("gone", { projectId: "p1" })).resolves.toBeNull();
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/v1/projects/p1/widgets/w1");

    const strict = restRecord<Widget>({
      path: (id) => `/widgets/${id}`,
      fetch: vi.fn(async () => jsonResponse(404, {})),
    });
    await expect(strict.read("gone", {})).rejects.toMatchObject({ kind: "not-found" });
  });

  it("restFetchAll shares the envelope/error core and composes with clientCollection", async () => {
    const fetchAll = restFetchAll<Widget>({
      path: (ctx) => `/v1/projects/${ctx.projectId}/widgets`,
      params: (ctx) => ({ limit: 200, project: ctx.projectId }),
      fetch: vi.fn(async () =>
        jsonResponse(200, {
          rows: [
            { id: "w1", name: "web-1", status: "running", replicas: 2 },
            { id: "w2", name: "api-1", status: "stopped", replicas: 1 },
          ],
        }),
      ),
    });
    const collection = clientCollection({ fetchAll });

    const page = await collection.read(
      { where: { field: "status", op: "eq", value: "running" }, window: { kind: "all" } },
      { projectId: "p1" },
    );
    expect(page.rows).toEqual([{ id: "w1", name: "web-1", status: "running", replicas: 2 }]);
    expect(page.paging).toEqual({ kind: "all", total: 1 });
  });
});

describe("clientCollection", () => {
  const rows: Widget[] = [
    { id: "w1", name: "web-1", status: "running", replicas: 3 },
    { id: "w2", name: "api-1", status: "stopped", replicas: 1 },
    { id: "w3", name: "web-2", status: "running", replicas: 2 },
    { id: "w4", name: "web-3", status: "running", replicas: 4 },
  ];

  it("evaluates offset, synthetic cursor and all windows locally", async () => {
    const collection = clientCollection({ fetchAll: mockFetchAll(rows) });

    const offset = await collection.read(
      {
        where: { field: "status", op: "eq", value: "running" },
        order: [{ field: "replicas", dir: "desc" }],
        window: { kind: "offset", size: 2, offset: 0 },
      },
      {},
    );
    expect(offset.rows.map((row) => row.id)).toEqual(["w4", "w1"]);
    expect(offset.paging).toEqual({ kind: "offset", total: 3, offset: 0, size: 2 });

    const cursor = await collection.read(
      { order: [{ field: "id", dir: "asc" }], window: { kind: "cursor", size: 2 } },
      {},
    );
    expect(cursor.paging).toEqual({ kind: "cursor", nextCursor: "c2" });

    const all = await collection.read({ window: { kind: "all" } }, {});
    expect(all.rows).toHaveLength(4);
    expect(all.paging).toEqual({ kind: "all", total: 4 });
  });

  it("applies a bounded fetch cap before evaluation", async () => {
    const collection = clientCollection({
      fetchAll: mockFetchAll(rows),
      limit: 2,
    });
    const page = await collection.read({ window: { kind: "all" } }, {});
    expect(page.rows.map((row) => row.id)).toEqual(["w1", "w2"]);
    expect(page.paging).toEqual({ kind: "all", total: 2 });
  });
});

describe("mockCollection / mockFetchAll", () => {
  const rows: Widget[] = [
    { id: "w1", name: "web-1", status: "running", replicas: 3 },
    { id: "w2", name: "api-1", status: "stopped", replicas: 1 },
    { id: "w3", name: "web-2", status: "running", replicas: 2 },
  ];

  it("supports offset and keyset dialects", async () => {
    const offset = mockCollection(rows, { dialect: "offset" });
    const page: CollectionPage<Widget> = await offset.collection.read(
      { window: { kind: "offset", size: 2, offset: 1 } },
      {},
    );
    expect(page.rows.map((row) => row.id)).toEqual(["w2", "w3"]);
    expect(page.paging).toEqual({ kind: "offset", total: 3, offset: 1, size: 2 });

    const keyset = mockCollection(rows, { dialect: "keyset" });
    const first = await keyset.collection.read({ window: { kind: "cursor", size: 2 } }, {});
    expect(first.paging).toEqual({ kind: "cursor", nextCursor: "c2" });
    const second = await keyset.collection.read(
      { window: { kind: "cursor", size: 2, cursor: "c2" } },
      {},
    );
    expect(second.rows.map((row) => row.id)).toEqual(["w3"]);
    expect(second.paging).toEqual({ kind: "cursor" });
  });

  it("serves record/lookup, supports failure injection and row replacement", async () => {
    const mock = mockCollection(rows);
    await expect(mock.record.read("w1", {})).resolves.toEqual(rows[0]);
    await expect(mock.record.read("missing", {})).resolves.toBeNull();
    await expect(mock.lookup.read(["w2", "missing", "w2", "w1"], {})).resolves.toEqual([
      rows[1],
      rows[0],
    ]);

    mock.handle.failNext(new ApiError("server", { status: 500 }));
    await expect(mock.collection.read(OFFSET_REQUEST, {})).rejects.toMatchObject({
      kind: "server",
      status: 500,
    });

    mock.handle.replaceRows([{ id: "w9", name: "new", status: "running", replicas: 1 }]);
    expect(mock.handle.count).toBe(1);
    await expect(mock.record.read("w1", {})).resolves.toBeNull();
  });

  it("mockFetchAll is callable and exposes handle methods", async () => {
    const fetchAll = mockFetchAll(rows);
    expect(await fetchAll({})).toHaveLength(3);
    fetchAll.replaceRows([]);
    expect(fetchAll.count).toBe(0);
    fetchAll.failNext(new ApiError("network"));
    await expect(fetchAll({})).rejects.toMatchObject({ kind: "network" });
  });
});

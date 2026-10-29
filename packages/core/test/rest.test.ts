import { describe, expect, it, vi } from "vitest";
import type { ApiError } from "../src/kernel";
import { isApiError } from "../src/kernel";
import { restCollection, restRecord } from "../src/adapters/rest";

// M4 REST 适配工厂：fetch 注入（bring-your-own-fetch 主干）、信封展平、
// 404 空态、错误收敛（Response 状态 → ApiError 封闭集）。

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const Q = { window: { size: 20 } } as const;

describe("restCollection", () => {
  it("默认信封：body 直收（数组）或 body.rows；undefined/null 行过滤内置", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, [{ id: "a" }, undefined, null, { id: "b" }]))
      .mockResolvedValueOnce(
        jsonResponse(200, { rows: [{ id: "c" }, null, { id: "d" }], total: 2 }),
      );
    const collection = restCollection<{ id: string }>({
      path: () => "/v1/things",
      fetch: fetchMock,
    });

    const one = await collection(Q, {});
    expect(one.rows).toEqual([{ id: "a" }, { id: "b" }]);
    const two = await collection(Q, {});
    expect(two.rows).toEqual([{ id: "c" }, { id: "d" }]);
    expect(two.total).toBe(2);
  });

  it("path 回调收 ctx（scope 组 URL）；params 回调组 query 串（repeated key 方言）", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    const collection = restCollection<{ id: string }>({
      baseUrl: "https://api.example.com",
      path: (ctx) => `/v1/projects/${ctx.projectId}/things`,
      params: (query) => ({
        size: query.window.size,
        status: (query.predicate as { field: string; op: string; value: string } | undefined)
          ?.value,
        tag: ["a", "b"],
      }),
      fetch: fetchMock,
    });
    await collection(
      { predicate: { field: "status", op: "eq", value: "running" }, window: { size: 8 } },
      { projectId: "p1" },
    );
    const url = fetchMock.mock.calls[0]?.[0] as string;
    expect(url).toContain("https://api.example.com/v1/projects/p1/things");
    expect(url).toContain("size=8");
    expect(url).toContain("status=running");
    expect(url).toContain("tag=a");
    expect(url).toContain("tag=b");
  });

  it("信封/total/nextCursor 方言覆写（snake_case 键名）", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        items: [{ id: "x" }],
        total_count: 57,
        next_page_token: "tok-2",
      }),
    );
    const collection = restCollection<{ id: string }>({
      path: () => "/things",
      envelope: (body) => (body as { items: unknown[] }).items,
      total: (body) => (body as { total_count: number }).total_count,
      nextCursor: (body) => (body as { next_page_token: string }).next_page_token,
      fetch: fetchMock,
    });
    const segment = await collection(Q, {});
    expect(segment).toEqual({ rows: [{ id: "x" }], total: 57, nextCursor: "tok-2" });
  });

  it("错误收敛：401→auth / 403→forbidden / 5xx→server（含 body message 提取）", async () => {
    const cases: ReadonlyArray<[number, unknown, ApiError["kind"]]> = [
      [401, undefined, "auth"],
      [403, undefined, "forbidden"],
      [503, { message: "maintenance" }, "server"],
    ];
    for (const [status, body, kind] of cases) {
      const collection = restCollection({ path: () => "/x", fetch: vi.fn().mockResolvedValue(jsonResponse(status, body)) });
      const error = (await collection(Q, {}).then(
        () => null,
        (e: unknown) => e,
      )) as ApiError;
      expect(isApiError(error)).toBe(true);
      expect(error.kind).toBe(kind);
      if (kind === "server") {
        expect(error).toMatchObject({ kind: "server", status, message: "maintenance" });
      }
    }
  });

  it("网络断层 → ApiError.network；abort 放行原样", async () => {
    const collection = restCollection({
      path: () => "/x",
      fetch: vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    });
    await expect(collection(Q, {})).rejects.toMatchObject({ kind: "network" });

    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    const aborting = restCollection({
      path: () => "/x",
      fetch: vi.fn().mockRejectedValue(abortError),
    });
    const thrown = await aborting(Q, {}).then(
      () => null,
      (e: unknown) => e,
    );
    expect(thrown).toBe(abortError); // 取消不是失败——原样出界
    expect(isApiError(thrown)).toBe(false);
  });

  it("notFound: 'null' 吞 404 为空段", async () => {
    const collection = restCollection({
      path: () => "/gone",
      notFound: "null",
      fetch: vi.fn().mockResolvedValue(jsonResponse(404, {})),
    });
    await expect(collection(Q, {})).resolves.toEqual({ rows: [] });
  });

  it("2xx 非 JSON → ApiError.decode", async () => {
    const collection = restCollection({
      path: () => "/x",
      fetch: vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })),
    });
    await expect(collection(Q, {})).rejects.toMatchObject({ kind: "decode" });
  });
});

describe("restRecord（与 restCollection 同构）", () => {
  it("path 回调收 (id, ctx)；信封展平；notFound 吞 404 为 null", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { item: { id: "a1", name: "App" } }))
      .mockResolvedValueOnce(jsonResponse(404, {}));
    const record = restRecord<{ id: string; name: string }>({
      path: (id, ctx) => `/v1/projects/${ctx.projectId}/things/${id}`,
      envelope: (body) => (body as { item: unknown }).item,
      notFound: "null",
      fetch: fetchMock,
    });
    await expect(record("a1", { projectId: "p1" })).resolves.toEqual({ id: "a1", name: "App" });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/v1/projects/p1/things/a1");
    await expect(record("gone", { projectId: "p1" })).resolves.toBeNull();
  });

  it("未开 notFound 时 404 走失败通道（ApiError.not-found）", async () => {
    const record = restRecord({
      path: (id) => `/things/${id}`,
      fetch: vi.fn().mockResolvedValue(jsonResponse(404, {})),
    });
    await expect(record("gone", {})).rejects.toMatchObject({ kind: "not-found" });
  });

  it("headers 回调每次请求调用（会话/scope 头注入位）", async () => {
    // Response 体单次可读——每次调用产新实例
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse(200, { id: "a" }));
    const headers = vi.fn(() => ({ "X-Project": "p1" }));
    const record = restRecord({ path: (id) => `/t/${id}`, headers, fetch: fetchMock });
    await record("a", {});
    await record("a", {});
    expect(headers).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ headers: { "X-Project": "p1" } });
  });
});

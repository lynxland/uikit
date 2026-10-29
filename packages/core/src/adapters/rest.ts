import type { ApiError, CollectionQuery, ResourceScope, Segment } from "../kernel";
import { isApiError } from "../kernel";
import { buildUrl, statusToApiError, type QueryParams } from "./api-error";

/**
 * rest 工厂（M4）—— REST-over-fetch 适配器原语：path 组装 / 信封展平 /
 * 404 空态 / 错误收敛（Response 状态 → ApiError 封闭集，与 http 管线单源）。
 *
 * 零 Effect（bring-your-own-fetch 是主干——fleetly 全程未用 createHttp 的实证：
 * clientCollection + 裸 fetch 才是常态，本工厂补上"适配器本身"的原语缺位）。
 * path 用回调（(ctx) => string）：fan-out/动态 query/条件段零歧义全覆盖，
 * 模板插值糖后置（retro §7-4 裁决）。
 */

/** fetch 注入点：缺省 globalThis.fetch（测试/自定义管线注入同形）。 */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

interface RestBaseOptions {
  baseUrl?: string;
  /** 动态头（会话/scope 头注入）；每次请求调用 */
  headers?: () => Record<string, string>;
  fetch?: FetchLike;
}

export interface RestCollectionOptions<T> extends RestBaseOptions {
  path: (ctx: ResourceScope) => string;
  /** 响应体 → 行数组（信封键展平）；缺省 body 直收（数组）或 body.rows。undefined/null 行过滤内置 */
  envelope?: (body: unknown) => unknown[];
  /** 谓词/窗口 → query 参数（服务端过滤方言）；缺省不附加 */
  params?: (query: CollectionQuery, ctx: ResourceScope) => QueryParams;
  total?: (body: unknown) => number | undefined;
  nextCursor?: (body: unknown) => string | undefined;
  /** "null"：404 → 空段（集合消失的空态而非失败） */
  notFound?: "null";
}

export interface RestRecordOptions<T> extends RestBaseOptions {
  path: (id: string, ctx: ResourceScope) => string;
  /** 响应体 → 记录；缺省 body 直收（信封键展平：body.item 等在此声明） */
  envelope?: (body: unknown) => unknown;
  params?: (id: string, ctx: ResourceScope) => QueryParams;
  /** "null"：404 → null（详情页空态——消费方 4 处手写 404 分支的机制替代） */
  notFound?: "null";
}

async function requestJson(base: RestBaseOptions, url: string, signal?: AbortSignal): Promise<unknown> {
  const doFetch: FetchLike = base.fetch ?? ((u, init) => globalThis.fetch(u, init));
  let response: Response;
  try {
    response = await doFetch(url, {
      ...(signal !== undefined ? { signal } : {}),
      ...(base.headers !== undefined ? { headers: base.headers() } : {}),
    });
  } catch (cause) {
    // abort 是取消不是失败（TanStack 取消语义原样放行）
    if (cause instanceof Error && cause.name === "AbortError") throw cause;
    throw { kind: "network", ...(cause !== undefined ? { cause } : {}) } satisfies ApiError;
  }
  if (!response.ok) {
    const body = await response
      .text()
      .then((text) => {
        try {
          return text === "" ? undefined : (JSON.parse(text) as unknown);
        } catch {
          return undefined;
        }
      })
      .catch(() => undefined);
    throw statusToApiError(response.status, body);
  }
  return response.json().catch(() => {
    throw { kind: "decode", detail: `response is not JSON (${url})` } satisfies ApiError;
  });
}

function defaultEnvelope(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const rows = (body as { rows?: unknown } | null | undefined)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function defaultTotal(body: unknown): number | undefined {
  const total = (body as { total?: unknown } | null | undefined)?.total;
  return typeof total === "number" ? total : undefined;
}

function defaultNextCursor(body: unknown): string | undefined {
  const next = (body as { nextCursor?: unknown } | null | undefined)?.nextCursor;
  return typeof next === "string" ? next : undefined;
}

/**
 * restCollection —— collection 适配器工厂（defineResource 的 collection 槽位直收）。
 * Segment 字段：rows 经 envelope；total/nextCursor 有默认抽取（body.total /
 * body.nextCursor），方言键名经同名选项覆写。
 */
export function restCollection<T>(
  options: RestCollectionOptions<T>,
): (query: CollectionQuery, ctx: ResourceScope, signal?: AbortSignal) => Promise<Segment<T>> {
  const envelope = options.envelope ?? defaultEnvelope;
  const totalOf = options.total ?? defaultTotal;
  const nextCursorOf = options.nextCursor ?? defaultNextCursor;
  return async (query, ctx, signal) => {
    const url = buildUrl(options.baseUrl, options.path(ctx), options.params?.(query, ctx));
    try {
      const body = await requestJson(options, url, signal);
      const rows = envelope(body).filter((row): row is T => row !== undefined && row !== null);
      const segment: Segment<T> = { rows };
      const total = totalOf(body);
      if (total !== undefined) segment.total = total;
      const nextCursor = nextCursorOf(body);
      if (nextCursor !== undefined) segment.nextCursor = nextCursor;
      return segment;
    } catch (error) {
      if (options.notFound === "null" && isApiError(error) && error.kind === "not-found") {
        return { rows: [] };
      }
      throw error;
    }
  };
}

/**
 * restRecord —— record 适配器工厂（与 restCollection 同构）。
 * notFound: "null" 时返回 Promise<T | null>——资源类型声明为 Resource<T | null> 即空态直出。
 */
export function restRecord<T>(
  options: RestRecordOptions<T>,
): (id: string, ctx: ResourceScope, signal?: AbortSignal) => Promise<T | null> {
  const unwrap = options.envelope ?? ((body: unknown) => body);
  return async (id, ctx, signal) => {
    const url = buildUrl(options.baseUrl, options.path(id, ctx), options.params?.(id, ctx));
    try {
      const body = await requestJson(options, url, signal);
      return unwrap(body) as T;
    } catch (error) {
      if (options.notFound === "null" && isApiError(error) && error.kind === "not-found") {
        return null;
      }
      throw error;
    }
  };
}

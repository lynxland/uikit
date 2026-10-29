import type { ApiError } from "../kernel";

/**
 * Response 状态 → ApiError 封闭集的收敛单源（M4）。
 * http 管线（Effect 缝）与 rest 工厂（裸 fetch 主干）共用——错误货币不因
 * 取数形态分叉。
 */

/** URL 组装参数值。undefined = 省略该键（buildUrl 跳过）——条件参数的常态形态。 */
export type QueryParams = Record<
  string,
  string | number | boolean | ReadonlyArray<string> | undefined
>;

export function extractErrorMessage(body: unknown): string | undefined {
  if (typeof body === "object" && body !== null) {
    const record = body as Record<string, unknown>;
    if (typeof record.message === "string") return record.message;
    if (typeof record.error === "object" && record.error !== null) {
      const inner = (record.error as Record<string, unknown>).message;
      if (typeof inner === "string") return inner;
    }
  }
  return undefined;
}

export function statusToApiError(status: number, body?: unknown): ApiError {
  if (status === 401) return { kind: "auth" };
  if (status === 403) return { kind: "forbidden" };
  if (status === 404) return { kind: "not-found" };
  const message = extractErrorMessage(body);
  return { kind: "server", status, ...(message !== undefined ? { message } : {}) };
}

/** URL 组装（repeated key=a&key=b——gateway 方言；undefined 值跳过）。 */
export function buildUrl(baseUrl: string | undefined, path: string, params?: QueryParams): string {
  const url = baseUrl ? `${baseUrl}${path}` : path;
  if (!params) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, item); // repeated key=a&key=b
    } else {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
}

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  type ApiError,
  advance,
  type CollectionQuery,
  type CommandsRecord,
  type Order,
  type Predicate,
  type QueryWindow,
  type Resource,
  type ResourceScope,
  type Segment,
  type SubsRecord,
  scoped,
} from "../kernel";
import type { FlatPatch, QuerySearchSchema } from "../schema";
import { batchQueryOptions, collectionQueryOptions, recordQueryOptions } from "./options";
import { scopeReady, useContextScope } from "./scope";

/**
 * 读模型分层（M1）：
 * - **data 层** `useCollectionData` —— 零 URL、rows 直出（伴读消费点：壳层组件、
 *   表单下拉、统计条……不再手写三件套或解包 `.data?.rows`）；
 * - **URL 绑定层** `useCollection` —— data 层之上的装配（search 解码 + 写入契约
 *   setter），语义与既有形态不变。
 * scope 缺省链两层同构：显式传入 > （资源声明了 scope 键时）ResourceScopeProvider
 * context > 无 scope。未就绪自动停用（fail-safe）同构。
 */

/** window: "all" 的归一形态——整取方言（clientCollection）下的全量行访问。 */
const ALL_WINDOW: QueryWindow = { size: Number.MAX_SAFE_INTEGER };
const DEFAULT_DATA_SIZE = 20;

const EMPTY_ROWS: ReadonlyArray<never> = [];

export interface CollectionHandle<T> {
  rows: ReadonlyArray<T>;
  segment: Segment<T> | undefined;
  /** 当前解码后的完整查询（URL + schema 默认值即真相） */
  query: CollectionQuery;
  status: "loading" | "empty" | "error" | "success";
  error: ApiError | null;
  total: number | undefined;
  isFetching: boolean;
  refetch: () => void;
  /** replace + 回第一页 */
  setPredicate(predicate: Predicate | null): void;
  /** replace + 回第一页（keyset 游标与方向耦合） */
  setOrder(order: ReadonlyArray<Order> | null): void;
  /** push —— 历史即分页栈 */
  setWindow(window: QueryWindow): void;
  /** 游标推进；返回 false = 不可算（keyset prev 走浏览器历史） */
  next(): boolean;
  prev(): boolean;
  reset(): void;
  /** 逃生舱：直接打 URL 补丁（含消费方自定义参数） */
  searchPatch(patch: FlatPatch, options?: { replace?: boolean }): void;
}

export interface UseCollectionOptions {
  /** 调用方路由 id（Route.id——search 解码锚定活跃 match；pathless 布局下与 fullPath 不同形） */
  from: string;
  /** collectionQuerySchema 的返回值（与路由 validateSearch 共用同一实例） */
  search: QuerySearchSchema;
  scope?: ResourceScope;
  query?: {
    staleTime?: number;
    refetchInterval?: number | false;
    enabled?: boolean;
    retry?: boolean | number;
    /** 默认 true：翻页/过滤过渡不闪 loading */
    keepPrevious?: boolean;
  };
}

// ============ data 层核心（useCollectionData / useCollection 共用） ============

export interface UseCollectionDataOptions {
  scope?: ResourceScope;
  predicate?: Predicate;
  order?: ReadonlyArray<Order>;
  /** 窗口尺寸速记（与 window 二选一；均缺省 20） */
  size?: number;
  /**
   * 查询窗口。`"all"` = 整取方言的全量行访问（归一为超大 size 窗口——
   * clientCollection 天然支持；服务端方言慎用）。
   */
  window?: QueryWindow | "all";
  staleTime?: number;
  refetchInterval?: number | false;
  enabled?: boolean;
  retry?: boolean | number;
  /** 默认 true：过渡不闪 loading（与 URL 层同律） */
  keepPrevious?: boolean;
}

/** data 层句柄：URL 层句柄的无 setter 前缀（rows 直出，伴读消费形态）。 */
export interface CollectionDataHandle<T> {
  rows: ReadonlyArray<T>;
  segment: Segment<T> | undefined;
  /** 生效查询（options 组装的最终形；queryKey 由它单源派生） */
  query: CollectionQuery;
  status: "loading" | "empty" | "error" | "success";
  error: ApiError | null;
  total: number | undefined;
  isFetching: boolean;
  refetch: () => void;
}

function statusOf<T>(isPending: boolean, isError: boolean, rows: ReadonlyArray<T>) {
  return isPending ? "loading" : isError ? "error" : rows.length === 0 ? "empty" : "success";
}

function useCollectionDataCore<T, ID, C extends CommandsRecord<ID>, S extends SubsRecord>(
  resource: Resource<T, ID, C, S>,
  scope: ResourceScope | undefined,
  query: CollectionQuery,
  engine: {
    staleTime?: number;
    refetchInterval?: number | false;
    enabled?: boolean;
    retry?: boolean | number;
    keepPrevious?: boolean;
  },
): CollectionDataHandle<T> {
  const target = scope ? scoped(resource, scope) : resource;
  // 未就绪自动停用（fail-safe）：资源声明的 scope 键缺值时不启用——
  // 消费方不再需要逐页 enabled 守卫，也堵住"未就绪空段"污染无 scope 键。
  const ready = scopeReady(resource, scope);
  const enabled = ready ? engine.enabled : false;
  const result = useQuery<Segment<T>, ApiError>({
    ...collectionQueryOptions(target, query, {
      ...(engine.staleTime !== undefined ? { staleTime: engine.staleTime } : {}),
      ...(engine.refetchInterval !== undefined ? { refetchInterval: engine.refetchInterval } : {}),
      ...(engine.retry !== undefined ? { retry: engine.retry } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
    }),
    ...(engine.keepPrevious !== false ? { placeholderData: keepPreviousData } : {}),
  });

  const rows = result.data?.rows ?? EMPTY_ROWS;
  return {
    rows,
    segment: result.data,
    query,
    status: statusOf(result.isPending, result.isError, rows),
    error: result.error ?? null,
    total: result.data?.total,
    isFetching: result.isFetching,
    refetch: () => void result.refetch(),
  };
}

/**
 * useCollectionData —— collection Query 的 data 层绑定（零 URL）。
 *
 * 伴读消费的标准形态：壳层组件 / 表单下拉 / 统计条直接 rows 直出——
 * 不进 URL、不受列表页 q/page/cursor 影响（读原语与 URL 视图绑定解耦）。
 * 整取方言的全量行访问用 `window: "all"`。
 */
export function useCollectionData<T, ID, C extends CommandsRecord<ID>, S extends SubsRecord>(
  resource: Resource<T, ID, C, S>,
  options: UseCollectionDataOptions = {},
): CollectionDataHandle<T> {
  const contextScope = useContextScope();
  const scope = options.scope ?? (resource.scope?.length ? contextScope : undefined);
  const window =
    options.window === "all" ? ALL_WINDOW : (options.window ?? { size: options.size ?? DEFAULT_DATA_SIZE });
  const query: CollectionQuery = {
    ...(options.predicate ? { predicate: options.predicate } : {}),
    ...(options.order ? { order: options.order } : {}),
    window,
  };
  return useCollectionDataCore(resource, scope, query, options);
}

// ============ URL 绑定层（data 层之上的装配） ============

/**
 * useCollection —— collection Query ↔ URL ↔ Table 的绑定。
 *
 * 写入契约（design.md §2.1.1）：
 * - 一切 setter 走函数式 search（对象字面量会静默 strip 消费方自定义参数）；
 * - 翻页 = push（历史栈即分页栈）；谓词/排序变化 = replace + 清游标回第一页；
 * - 绑定不在渲染期 navigate。
 */
export function useCollection<T, ID, C extends CommandsRecord<ID>, S extends SubsRecord>(
  resource: Resource<T, ID, C, S>,
  options: UseCollectionOptions,
): CollectionHandle<T> {
  // from 是调用方路由的 id（useSearch 按路由 id 找活跃 match；pathless
  // 布局下 Route.fullPath 与 id 不同形——fleetly 试点实咬，契约 = Route.id）。
  const rawSearch = useSearch({ from: options.from as never, strict: false }) as unknown as Record<
    string,
    unknown
  >;
  // navigate 不带 from：TanStack Router 的 navigate({to:"."}) 把 from 当路径
  // 模板解析（pathless 段不在路径里），而 useSearch 的 from 是路由 id——两个
  // hook 的 from 语义不同。demo 顶层路由 id==path 掩盖了差异；嵌套/带参/
  // pathless 路由下带 from 的 "." 解析会产出 "_shell/..." 假路径。不带 from
  // 时 "." 对当前 match 的真实路径解析，全形态正确（写入契约 §2.1.1 不变：
  // setter 只在事件期调用，不在渲染期）。
  const navigate = useNavigate() as unknown as (opts: {
    to: string;
    search: (prev: Record<string, unknown>) => Record<string, unknown>;
    replace?: boolean;
  }) => Promise<void>;

  const contextScope = useContextScope();
  const scope = options.scope ?? (resource.scope?.length ? contextScope : undefined);
  const query = options.search.decode(rawSearch);

  const data = useCollectionDataCore(resource, scope, query, {
    ...(options.query?.staleTime !== undefined ? { staleTime: options.query.staleTime } : {}),
    ...(options.query?.refetchInterval !== undefined
      ? { refetchInterval: options.query.refetchInterval }
      : {}),
    ...(options.query?.retry !== undefined ? { retry: options.query.retry } : {}),
    ...(options.query?.enabled !== undefined ? { enabled: options.query.enabled } : {}),
    ...(options.query?.keepPrevious !== undefined ? { keepPrevious: options.query.keepPrevious } : {}),
  });

  const searchPatch = (patch: FlatPatch, navOptions?: { replace?: boolean }) => {
    void navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({ ...prev, ...patch }),
      replace: navOptions?.replace ?? false,
    });
  };

  const setPredicate = (predicate: Predicate | null) => {
    searchPatch(options.search.patch({ predicate: predicate ?? null }), { replace: true });
  };
  const setOrder = (order: ReadonlyArray<Order> | null) => {
    searchPatch(options.search.patch({ order: order ?? null }), { replace: true });
  };
  const setWindow = (window: QueryWindow) => {
    searchPatch(options.search.patch({ window }), { replace: false });
  };
  const next = (): boolean => {
    const segment = data.segment;
    if (!segment) return false;
    const w = advance(query.window, segment, "next");
    if (!w) return false;
    setWindow(w);
    return true;
  };
  const prev = (): boolean => {
    const segment = data.segment;
    if (!segment) return false;
    const w = advance(query.window, segment, "prev");
    if (!w) return false;
    setWindow(w);
    return true;
  };
  const reset = () => {
    // 全清补丁由 schema 单源（namespace 形态下键带前缀——手写键清单会漏）
    searchPatch(options.search.resetPatch(), { replace: true });
  };

  return {
    ...data,
    setPredicate,
    setOrder,
    setWindow,
    next,
    prev,
    reset,
    searchPatch,
  };
}

export interface RecordHandle<T> {
  data: T | undefined;
  status: "loading" | "error" | "success";
  error: ApiError | null;
  refetch: () => void;
}

export function useRecord<T, ID, C extends CommandsRecord<ID>, S extends SubsRecord>(
  resource: Resource<T, ID, C, S>,
  options: {
    id: ID | undefined;
    scope?: ResourceScope;
    /** M1 扩齐：refetchInterval（providers-view 30s 轮询不再落回裸 useQuery）/
     *  enabled / retry / staleTime */
    query?: {
      staleTime?: number;
      refetchInterval?: number | false;
      enabled?: boolean;
      retry?: boolean | number;
    };
  },
): RecordHandle<T> {
  const contextScope = useContextScope();
  const scope = options.scope ?? (resource.scope?.length ? contextScope : undefined);
  const target = scope ? scoped(resource, scope) : resource;
  const result = useQuery<T, ApiError>({
    ...recordQueryOptions(target, options.id, {
      ...(options.query?.staleTime !== undefined ? { staleTime: options.query.staleTime } : {}),
      ...(options.query?.refetchInterval !== undefined
        ? { refetchInterval: options.query.refetchInterval }
        : {}),
      ...(options.query?.retry !== undefined ? { retry: options.query.retry } : {}),
      ...(options.query?.enabled !== undefined ? { enabled: options.query.enabled } : {}),
    }),
    ...(scopeReady(resource, scope) ? {} : { enabled: false }),
  });
  return {
    data: result.data,
    status: result.isPending ? "loading" : result.isError ? "error" : "success",
    error: result.error ?? null,
    refetch: () => void result.refetch(),
  };
}

export interface BatchHandle<T, ID> {
  rows: ReadonlyArray<T>;
  byId: ReadonlyMap<ID, T>;
  status: "loading" | "error" | "success";
}

export function useBatch<T, ID, C extends CommandsRecord<ID>, S extends SubsRecord>(
  resource: Resource<T, ID, C, S>,
  ids: ReadonlyArray<ID>,
  options: { scope?: ResourceScope; query?: { staleTime?: number } } = {},
): BatchHandle<T, ID> {
  const contextScope = useContextScope();
  const scope = options.scope ?? (resource.scope?.length ? contextScope : undefined);
  const target = scope ? scoped(resource, scope) : resource;
  const result = useQuery<ReadonlyArray<T>, ApiError>({
    ...batchQueryOptions(target, ids, {
      ...(options.query?.staleTime !== undefined ? { staleTime: options.query.staleTime } : {}),
    }),
    ...(scopeReady(resource, scope) ? {} : { enabled: false }),
  });
  const rows = result.data ?? EMPTY_ROWS;
  const byId = new Map(
    rows.map((row) => [target.getId ? target.getId(row) : (row as unknown as { id: ID }).id, row]),
  );
  return {
    rows,
    byId,
    status: result.isPending ? "loading" : result.isError ? "error" : "success",
  };
}

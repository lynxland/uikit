import type {
  CommandsRecord,
  QuerySelector,
  Resource,
  ResourceScope,
  SubsRecord,
} from "./resource";
import { scopeOf } from "./resource";
import type { CollectionQuery } from "./types";

// ============ 查询键（queryKey 单源；失效选择器在此匹配） ============

/** 键形：[kind, resourceName, scope, scopeKeys, ...detail]——前缀与 predicate 失效都依赖此结构。
 *  scopeKeys = 资源声明的 scope 键集（spec.scope）：selectorMatches 的投影轴（M2）。
 *  旧形键（无 scopeKeys 段）在匹配侧宽容降级（键全集相等）。 */
export type QueryKind = "collection" | "record" | "batch";

function canonicalScope(scope: ResourceScope): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(scope).sort()) {
    const value = scope[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/** 键内嵌的声明键集（拷贝防消费方改写 spec 数组；未声明 = 空数组）。 */
function declaredScopeKeys(resource: {
  scope?: ReadonlyArray<string>;
}): readonly string[] {
  return [...(resource.scope ?? [])];
}

function normPredicate(p: CollectionQuery["predicate"]): unknown {
  return p ?? null;
}

function normWindow(w: CollectionQuery["window"]): unknown {
  return { size: w.size, cursor: w.cursor ?? null, offset: w.range?.offset ?? null };
}

export function collectionKey<T, ID, C extends CommandsRecord<ID>, S extends SubsRecord>(
  resource: Resource<T, ID, C, S>,
  query: CollectionQuery,
): readonly unknown[] {
  return [
    "collection",
    resource.name,
    canonicalScope(scopeOf(resource)),
    declaredScopeKeys(resource),
    normPredicate(query.predicate),
    query.order ?? null,
    normWindow(query.window),
  ];
}

export function recordKey<T, ID, C extends CommandsRecord<ID>, S extends SubsRecord>(
  resource: Resource<T, ID, C, S>,
  id: ID,
): readonly unknown[] {
  return [
    "record",
    resource.name,
    canonicalScope(scopeOf(resource)),
    declaredScopeKeys(resource),
    id,
  ];
}

export function batchKey<T, ID, C extends CommandsRecord<ID>, S extends SubsRecord>(
  resource: Resource<T, ID, C, S>,
  ids: ReadonlyArray<ID>,
): readonly unknown[] {
  const unique = [...new Set(ids)];
  return ["batch", resource.name, canonicalScope(scopeOf(resource)), declaredScopeKeys(resource), unique];
}

// ============ 失效匹配（scope 交运算在此） ============

const QUERY_KINDS = new Set(["collection", "record", "batch"]);

export function isKindedQueryKey(key: readonly unknown[]): boolean {
  return typeof key[0] === "string" && QUERY_KINDS.has(key[0]);
}

/** 两侧出现过的（有值）键全集上逐键相等——未声明 scope 键资源的缺省投影轴
 *  （与旧整对象全等语义等价，undefined 安全）。 */
function scopeEquals(keyScope: unknown, commandScope: ResourceScope): boolean {
  const a = canonicalScope((keyScope ?? {}) as ResourceScope);
  const b = canonicalScope(commandScope);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/**
 * selector 匹配（M2 投影匹配为唯一语义）：
 * - selector 默认与命令执行的 ctx scope 相交（project A 的命令不清 project B 的缓存）；
 * - 相交的比较轴 = **读键所属资源声明的 scope 键集**（键内嵌第 4 段）——在该键集上
 *   逐键相等即命中，命令 scope 携带声明外的多余键不影响匹配（失效成本不对称：
 *   过宽 = 多一次 refetch 廉价 / 漏失效 = bug）；
 * - 读资源未声明 scope 键（含旧形键）时，轴 = 两侧出现过的键全集（等价旧全等）；
 * - allScopes: true 显式逃逸。
 */
export function selectorMatches(
  selector: QuerySelector,
  key: readonly unknown[],
  commandScope: ResourceScope,
): boolean {
  const [kind, name, keyScope, keyScopeKeys] = key;
  if (selector.kind !== undefined && selector.kind !== kind) return false;
  if (selector.resource !== name) return false;
  if (!selector.allScopes) {
    if (Array.isArray(keyScopeKeys) && keyScopeKeys.length > 0) {
      const declared = keyScopeKeys as readonly string[];
      const record = (keyScope ?? {}) as Record<string, string | undefined>;
      for (const scopeKey of declared) {
        if (record[scopeKey] !== (commandScope[scopeKey] ?? undefined)) return false;
      }
    } else if (!scopeEquals(keyScope, commandScope)) {
      return false;
    }
  }
  if (selector.kind === "record" && selector.id !== undefined) {
    // 新形键 id 在第 5 段（scopeKeys 之后）；旧形键回退第 4 段
    const idIndex = Array.isArray(keyScopeKeys) ? 4 : 3;
    if (key[idIndex] !== selector.id) return false;
  }
  return true;
}

/** 绑定层把 invalidates 声明编译成 TanStack Query 的 predicate 过滤器。 */
export function invalidationPredicate(
  selectors: ReadonlyArray<QuerySelector>,
  commandScope: ResourceScope,
): (query: { queryKey: readonly unknown[] }) => boolean {
  return (query) =>
    isKindedQueryKey(query.queryKey) &&
    selectors.some((s) => selectorMatches(s, query.queryKey, commandScope));
}

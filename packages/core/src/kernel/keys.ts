import type { SourceName } from "./source";
import type { CollectionRequest, QueryKind, Scope } from "./types";

/**
 * Query-key shape: [kind, source.name, keyScope, ...detail].
 *
 * keyScope is projected to the source's declared scope keys only; extra
 * values carried by a command scope must not fragment read keys.
 */

export function canonicalScope(scope: Scope | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (scope === undefined) return out;
  for (const key of Object.keys(scope).sort()) {
    const value = scope[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function scopeProjection(
  declared: readonly string[] | undefined,
  scope: Scope,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (declared === undefined) return out;
  for (const key of [...new Set(declared)].sort()) {
    const value = scope[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

interface NamedSource {
  readonly name: SourceName;
  readonly scope?: readonly string[];
}

function windowDetail(window: CollectionRequest["window"]): unknown {
  if (window.kind === "cursor") {
    return { kind: "cursor", size: window.size, cursor: window.cursor ?? null };
  }
  if (window.kind === "offset") {
    return { kind: "offset", size: window.size, offset: window.offset };
  }
  return { kind: "all", size: window.size ?? null };
}

export function collectionKey(
  source: NamedSource,
  request: CollectionRequest,
  scope: Scope = {},
): readonly unknown[] {
  return [
    "collection",
    source.name,
    scopeProjection(source.scope, scope),
    request.where ?? null,
    request.order ?? null,
    windowDetail(request.window),
  ];
}

export function recordKey(source: NamedSource, id: unknown, scope: Scope = {}): readonly unknown[] {
  return ["record", source.name, scopeProjection(source.scope, scope), id];
}

export function lookupKey(
  source: NamedSource,
  ids: readonly unknown[],
  scope: Scope = {},
): readonly unknown[] {
  return ["lookup", source.name, scopeProjection(source.scope, scope), [...new Set(ids)]];
}

/** Declaration lookup used by invalidation: either one axis list or a per-source map. */
export type ScopeAxes = readonly string[] | Readonly<Record<string, readonly string[] | undefined>>;

export interface QuerySelector {
  source: SourceName;
  kind?: QueryKind;
  id?: unknown;
  /** Explicit cross-scope invalidation. */
  allScopes?: boolean;
  /** Optional declared keys when no `ScopeAxes` argument is supplied. */
  scope?: readonly string[];
}

const QUERY_KINDS: ReadonlySet<QueryKind> = new Set(["collection", "record", "lookup"]);

export function isKindedQueryKey(key: readonly unknown[]): boolean {
  return typeof key[0] === "string" && QUERY_KINDS.has(key[0] as QueryKind);
}

function resolveAxes(
  selector: QuerySelector,
  axes: ScopeAxes | undefined,
): readonly string[] | undefined {
  if (axes === undefined) return selector.scope;
  if (Array.isArray(axes)) return axes;
  // A per-source map that does not declare this source must not silently
  // match every scope; fall back to the key's own scope projection.
  return (axes as Readonly<Record<string, readonly string[] | undefined>>)[selector.source];
}

function keyScopeMatches(keyScope: unknown, commandScope: Scope): boolean {
  const record = (keyScope ?? {}) as Scope;
  for (const scopeKey of Object.keys(record)) {
    if (record[scopeKey] !== commandScope[scopeKey]) return false;
  }
  return true;
}

/**
 * Selector matching with scope projection:
 * - axes supplied (array or per-source map): compare only the declared keys;
 *   extra command-scope values never block a match.
 * - no axes supplied: compare the keyScope keys carried by the key itself
 *   (over-broad is cheap; missed invalidation is a bug).
 * - `allScopes: true` bypasses the scope check explicitly.
 */
export function selectorMatches(
  selector: QuerySelector,
  key: readonly unknown[],
  commandScope: Scope,
  axes?: ScopeAxes,
): boolean {
  const [kind, name, keyScope] = key;
  if (selector.kind !== undefined && selector.kind !== kind) return false;
  if (selector.source !== name) return false;

  if (!selector.allScopes) {
    const declared = resolveAxes(selector, axes);
    if (declared !== undefined) {
      const record = (keyScope ?? {}) as Scope;
      for (const scopeKey of declared) {
        if (record[scopeKey] !== commandScope[scopeKey]) return false;
      }
    } else if (!keyScopeMatches(keyScope, commandScope)) {
      return false;
    }
  }

  if (selector.kind === "record" && selector.id !== undefined) {
    if (key[3] !== selector.id) return false;
  }
  return true;
}

/** Compile effect selectors into a TanStack Query predicate. */
export function invalidationPredicate(
  selectors: readonly QuerySelector[],
  commandScope: Scope,
  axes?: ScopeAxes,
): (query: { queryKey: readonly unknown[] }) => boolean {
  return (query) =>
    isKindedQueryKey(query.queryKey) &&
    selectors.some((selector) => selectorMatches(selector, query.queryKey, commandScope, axes));
}

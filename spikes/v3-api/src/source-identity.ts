import type {
  CollectionPage,
  CollectionRequest,
  Scope,
} from "./contracts.js";

export type SourceName = string & { readonly __sourceName?: unique symbol };

export interface CollectionSource<T> {
  readonly name: SourceName;
  readonly scope?: readonly string[];
  read(
    request: CollectionRequest,
    ctx: Scope,
    signal?: AbortSignal,
  ): Promise<CollectionPage<T>>;
}

export interface RecordSource<T, ID = string> {
  readonly name: SourceName;
  readonly scope?: readonly string[];
  read(id: ID, ctx: Scope, signal?: AbortSignal): Promise<T | null>;
}

export interface LookupSource<T, ID = string> {
  readonly name: SourceName;
  readonly scope?: readonly string[];
  read(ids: readonly ID[], ctx: Scope, signal?: AbortSignal): Promise<readonly T[]>;
}

export function sourceName(value: string): SourceName {
  if (!/^[a-z][a-z0-9-]*$/.test(value)) {
    throw new Error(`source name "${value}" must be kebab-case`);
  }
  return value as SourceName;
}

export function collectionSource<T>(spec: CollectionSource<T>): CollectionSource<T> {
  return { ...spec, name: sourceName(spec.name) };
}

export function recordSource<T, ID = string>(
  spec: RecordSource<T, ID>,
): RecordSource<T, ID> {
  return { ...spec, name: sourceName(spec.name) };
}

export function lookupSource<T, ID = string>(
  spec: LookupSource<T, ID>,
): LookupSource<T, ID> {
  return { ...spec, name: sourceName(spec.name) };
}

export interface Command<I, O = unknown> {
  run: (input: I, ctx: Scope) => Promise<O>;
  readonly effects?: readonly Effect[];
}

export type Effect =
  | {
      type: "invalidate";
      entity: SourceName;
      kind?: "collection" | "record" | "lookup";
      id?: unknown;
      allScopes?: true;
    }
  | { type: "invalidateKey"; key: readonly unknown[] };

export interface EntitySpec<T, ID = string> {
  readonly name: SourceName;
  readonly key?: (row: T) => ID;
  readonly scope?: readonly string[];
  readonly collection?: Omit<CollectionSource<T>, "name" | "scope">;
  readonly record?: Omit<RecordSource<T, ID>, "name" | "scope">;
  readonly lookup?: Omit<LookupSource<T, ID>, "name" | "scope">;
  readonly commands?: Record<string, Command<any, any>>;
  readonly streams?: Record<string, unknown>;
}

export interface Entity<T, ID = string> {
  readonly name: SourceName;
  readonly key?: (row: T) => ID;
  readonly scope?: readonly string[];
  readonly collection?: CollectionSource<T>;
  readonly record?: RecordSource<T, ID>;
  readonly lookup?: LookupSource<T, ID>;
  readonly commands?: Record<string, Command<any, any>>;
  readonly streams?: Record<string, unknown>;
}

export function defineEntity<T, ID = string>(spec: EntitySpec<T, ID>): Entity<T, ID> {
  const name = sourceName(spec.name);
  const collection = spec.collection
    ? collectionSource({ ...spec.collection, name, scope: spec.scope })
    : undefined;
  const record = spec.record
    ? recordSource({ ...spec.record, name, scope: spec.scope })
    : undefined;
  const lookup = spec.lookup
    ? lookupSource({ ...spec.lookup, name, scope: spec.scope })
    : undefined;
  return {
    name,
    ...(spec.key ? { key: spec.key } : {}),
    ...(spec.scope ? { scope: spec.scope } : {}),
    ...(collection ? { collection } : {}),
    ...(record ? { record } : {}),
    ...(lookup ? { lookup } : {}),
    ...(spec.commands ? { commands: spec.commands } : {}),
    ...(spec.streams ? { streams: spec.streams } : {}),
  };
}

/** Query key shape: [kind, source.name, canonicalScope, ...detail]. */
export function canonicalScope(scope: Scope | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!scope) return out;
  for (const key of Object.keys(scope).sort()) {
    const value = scope[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/** Cache partition axis = declared scope keys only. Extra scope values are ignored. */
function keyScope(
  declared: readonly string[] | undefined,
  scope: Scope,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of declared ?? []) {
    const value = scope[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function windowKey(window: CollectionRequest["window"]): unknown {
  if (window.kind === "cursor") {
    return { kind: "cursor", size: window.size, cursor: window.cursor ?? null };
  }
  if (window.kind === "offset") {
    return { kind: "offset", size: window.size, offset: window.offset };
  }
  return { kind: "all", size: window.size ?? null };
}

export function collectionKey(
  source: CollectionSource<unknown>,
  request: CollectionRequest,
  scope: Scope = {},
): readonly unknown[] {
  return [
    "collection",
    source.name,
    keyScope(source.scope, scope),
    request.where ?? null,
    request.order ?? null,
    windowKey(request.window),
  ];
}

export function recordKey(
  source: RecordSource<unknown, unknown>,
  id: unknown,
  scope: Scope = {},
): readonly unknown[] {
  return ["record", source.name, keyScope(source.scope, scope), id];
}

export function lookupKey(
  source: LookupSource<unknown, unknown>,
  ids: readonly unknown[],
  scope: Scope = {},
): readonly unknown[] {
  return ["lookup", source.name, keyScope(source.scope, scope), [...new Set(ids)]];
}

export interface QuerySelector {
  source: SourceName;
  kind?: "collection" | "record" | "lookup";
  id?: unknown;
  allScopes?: boolean;
}

export function selectorMatches(
  selector: QuerySelector,
  key: readonly unknown[],
  commandScope: Scope,
  declaredScopeKeys: Readonly<Record<string, readonly string[]>>,
): boolean {
  const [kind, name, keyScope] = key;
  if (selector.kind !== undefined && selector.kind !== kind) return false;
  if (selector.source !== name) return false;
  if (!selector.allScopes) {
    const declared = declaredScopeKeys[selector.source] ?? [];
    const keyRecord = (keyScope ?? {}) as Record<string, string | undefined>;
    if (declared.length > 0) {
      for (const scopeKey of declared) {
        if (keyRecord[scopeKey] !== (commandScope[scopeKey] ?? undefined)) return false;
      }
    } else {
      const a = canonicalScope(keyRecord);
      const b = canonicalScope(commandScope);
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const scopeKey of keys) {
        if (a[scopeKey] !== b[scopeKey]) return false;
      }
    }
  }
  if (selector.kind === "record" && selector.id !== undefined) {
    if (key[3] !== selector.id) return false;
  }
  return true;
}

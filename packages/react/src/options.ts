import type {
  CollectionPage,
  CollectionRequest,
  CollectionSource,
  LookupSource,
  RecordSource,
  Scope,
} from "@lynxland/uikit-core";
import { collectionKey, lookupKey, recordKey } from "@lynxland/uikit-core";

/**
 * Query-options factories (design.md §5.1).
 *
 * These are the single source for query keys: every key comes from core
 * `collectionKey` / `recordKey` / `lookupKey`. They are usable from hooks and
 * from route loaders (`ensureQueryData`) without duplicating key shapes.
 */

export interface QueryEngineOptions {
  staleTime?: number;
  refetchInterval?: number | false;
  enabled?: boolean;
  retry?: boolean | number;
}

export interface CollectionQueryOptions extends QueryEngineOptions {
  /** Resolved by the binding: options.scope > provider (only when declared) > {}. */
  scope?: Scope;
  /** Map to TanStack `placeholderData: keepPreviousData`. */
  keepPrevious?: boolean;
}

export type RecordQueryOptions = Omit<CollectionQueryOptions, "keepPrevious">;

/**
 * Lookup options.
 *
 * `key` is the row -> id projection needed to build `byId` / `missingIds`.
 * `LookupSource.key` is the primary declaration; this option overrides it for
 * ad-hoc sources. The binding falls back to `row.id` when neither is present.
 */
export interface LookupQueryOptions<T = unknown, ID = unknown> {
  scope?: Scope;
  staleTime?: number;
  enabled?: boolean;
  retry?: boolean | number;
  key?: (row: T) => ID;
}

export interface CollectionQueryConfig<T> {
  readonly queryKey: readonly unknown[];
  queryFn(context: { signal: AbortSignal }): Promise<CollectionPage<T>>;
  readonly staleTime?: number;
  readonly refetchInterval?: number | false;
  readonly enabled?: boolean;
  readonly retry?: boolean | number;
}

export interface RecordQueryConfig<T> {
  readonly queryKey: readonly unknown[];
  queryFn(context: { signal: AbortSignal }): Promise<T | null>;
  readonly staleTime?: number;
  readonly refetchInterval?: number | false;
  readonly enabled?: boolean;
  readonly retry?: boolean | number;
}

export interface LookupQueryConfig<T> {
  readonly queryKey: readonly unknown[];
  queryFn(context: { signal: AbortSignal }): Promise<readonly T[]>;
  readonly staleTime?: number;
  readonly enabled?: boolean;
  readonly retry?: boolean | number;
}

function engineOptions(options: QueryEngineOptions | undefined): QueryEngineOptions {
  if (options === undefined) return {};
  return {
    ...(options.staleTime !== undefined ? { staleTime: options.staleTime } : {}),
    ...(options.refetchInterval !== undefined ? { refetchInterval: options.refetchInterval } : {}),
    ...(options.enabled !== undefined ? { enabled: options.enabled } : {}),
    ...(options.retry !== undefined ? { retry: options.retry } : {}),
  };
}

export function collectionQueryOptions<T>(
  source: CollectionSource<T>,
  request: CollectionRequest,
  options: CollectionQueryOptions = {},
): CollectionQueryConfig<T> {
  const scope = options.scope ?? {};
  return {
    queryKey: collectionKey(source, request, scope),
    queryFn: ({ signal }) => source.read(request, scope, signal),
    ...engineOptions(options),
  };
}

export function recordQueryOptions<T, ID = string>(
  source: RecordSource<T, ID>,
  id: ID | undefined,
  options: RecordQueryOptions = {},
): RecordQueryConfig<T> {
  const scope = options.scope ?? {};
  if (id === undefined) {
    return {
      queryKey: recordKey(source, undefined, scope),
      // Never called: `enabled` is forced off for an undefined id.
      queryFn: async () => null,
      ...engineOptions(options),
      enabled: false,
    };
  }
  return {
    queryKey: recordKey(source, id, scope),
    queryFn: ({ signal }) => source.read(id, scope, signal),
    ...engineOptions(options),
  };
}

export function lookupQueryOptions<T, ID = string>(
  source: LookupSource<T, ID>,
  ids: readonly ID[],
  options: Omit<LookupQueryOptions<T, ID>, "key"> = {},
): LookupQueryConfig<T> {
  const scope = options.scope ?? {};
  return {
    queryKey: lookupKey(source, ids, scope),
    queryFn: ({ signal }) => source.read(ids, scope, signal),
    ...engineOptions(options),
  };
}

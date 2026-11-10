import type {
  ApiError,
  CollectionPage,
  CollectionRequest,
  CollectionSource,
  LookupSource,
  RecordSource,
} from "@lynxland/uikit-core";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { CollectionQueryOptions, LookupQueryOptions, RecordQueryOptions } from "./options";
import { collectionQueryOptions, lookupQueryOptions, recordQueryOptions } from "./options";
import { resolveScope, scopeReady, useScope } from "./scope";

/**
 * Data bindings (design.md §5.1). No Router, no URL, no setters.
 *
 * `status` is the UI state machine, not the engine's raw state:
 * idle / loading / empty / error / success.
 */

export type CollectionStatus = "idle" | "loading" | "empty" | "error" | "success";
export type RecordStatus = "idle" | "empty" | "loading" | "error" | "success";
export type LookupStatus = "idle" | "loading" | "error" | "success";
export type EmptyReason = "source" | "filter";

export interface CollectionHandle<T> {
  readonly rows: readonly T[];
  readonly page: CollectionPage<T> | undefined;
  readonly request: CollectionRequest;
  readonly status: CollectionStatus;
  /** Why `status === "empty"`: the source itself is empty, or the filter narrowed it away. */
  readonly emptyReason: EmptyReason | undefined;
  readonly error: ApiError | null;
  readonly total: number | undefined;
  readonly isFetching: boolean;
  refetch(): void;
}

export interface RecordHandle<T> {
  readonly data: T | undefined;
  readonly status: RecordStatus;
  readonly error: ApiError | null;
  readonly isFetching: boolean;
  refetch(): void;
}

export interface LookupHandle<T, ID> {
  readonly rows: readonly T[];
  readonly byId: ReadonlyMap<ID, T>;
  /** Requested ids the source did not resolve (deleted / no access / missing). */
  readonly missingIds: readonly ID[];
  readonly status: LookupStatus;
  readonly error: ApiError | null;
  readonly isFetching: boolean;
  refetch(): void;
}

const EMPTY_ROWS: readonly never[] = [];

function collectionTotal<T>(page: CollectionPage<T> | undefined): number | undefined {
  if (page === undefined) return undefined;
  return page.paging.total;
}

function emptyReasonOf(request: CollectionRequest): EmptyReason {
  return request.where !== undefined ? "filter" : "source";
}

function collectionStatusOf(
  ready: boolean,
  enabled: boolean,
  isPending: boolean,
  isError: boolean,
  rows: readonly unknown[],
): CollectionStatus {
  if (!ready) return "idle";
  if (!enabled && isPending) return "idle";
  if (isError) return "error";
  if (isPending) return "loading";
  return rows.length === 0 ? "empty" : "success";
}

function recordStatusOf(
  ready: boolean,
  enabled: boolean,
  isPending: boolean,
  isError: boolean,
  data: unknown,
): RecordStatus {
  if (!ready) return "idle";
  if (!enabled && isPending) return "idle";
  if (isError) return "error";
  if (isPending) return "loading";
  return data === undefined || data === null ? "empty" : "success";
}

export function useCollection<T>(
  source: CollectionSource<T>,
  request: CollectionRequest,
  options: CollectionQueryOptions = {},
): CollectionHandle<T> {
  const provider = useScope();
  const scope = resolveScope(options.scope, provider, source.scope);
  const ready = scopeReady(source.scope, scope);
  const enabled = ready && (options.enabled ?? true);

  const result = useQuery({
    ...collectionQueryOptions(source, request, {
      ...(options.staleTime !== undefined ? { staleTime: options.staleTime } : {}),
      ...(options.refetchInterval !== undefined
        ? { refetchInterval: options.refetchInterval }
        : {}),
      ...(options.retry !== undefined ? { retry: options.retry } : {}),
      scope,
      enabled,
    }),
    ...(options.keepPrevious === true ? { placeholderData: keepPreviousData } : {}),
  });

  const rows = ready ? (result.data?.rows ?? EMPTY_ROWS) : EMPTY_ROWS;
  const status = collectionStatusOf(ready, enabled, result.isPending, result.isError, rows);
  const page = ready ? result.data : undefined;

  const refetch = useCallback(() => {
    void result.refetch();
  }, [result.refetch]);

  return {
    rows,
    page,
    request,
    status,
    emptyReason: status === "empty" ? emptyReasonOf(request) : undefined,
    error: status === "idle" ? null : ((result.error as ApiError | null | undefined) ?? null),
    total: collectionTotal(page),
    isFetching: result.isFetching,
    refetch,
  };
}

export function useRecord<T, ID = string>(
  source: RecordSource<T, ID>,
  id: ID | undefined,
  options: RecordQueryOptions = {},
): RecordHandle<T> {
  const provider = useScope();
  const scope = resolveScope(options.scope, provider, source.scope);
  const ready = scopeReady(source.scope, scope);
  const enabled = id !== undefined && ready && (options.enabled ?? true);

  const result = useQuery({
    ...recordQueryOptions(source, id, {
      ...(options.staleTime !== undefined ? { staleTime: options.staleTime } : {}),
      ...(options.refetchInterval !== undefined
        ? { refetchInterval: options.refetchInterval }
        : {}),
      ...(options.retry !== undefined ? { retry: options.retry } : {}),
      scope,
      enabled,
    }),
    enabled,
  });

  const data = ready && id !== undefined ? (result.data ?? undefined) : undefined;
  const refetch = useCallback(() => {
    void result.refetch();
  }, [result.refetch]);

  const status: RecordStatus =
    id === undefined
      ? "idle"
      : recordStatusOf(ready, enabled, result.isPending, result.isError, result.data);

  return {
    data,
    status,
    error: status === "idle" ? null : ((result.error as ApiError | null | undefined) ?? null),
    isFetching: result.isFetching,
    refetch,
  };
}

export function useLookup<T, ID = string>(
  source: LookupSource<T, ID>,
  ids: readonly ID[],
  options: LookupQueryOptions<T, ID> = {},
): LookupHandle<T, ID> {
  const provider = useScope();
  const scope = resolveScope(options.scope, provider, source.scope);
  const ready = scopeReady(source.scope, scope);
  const empty = ids.length === 0;
  const enabled = ready && !empty && (options.enabled ?? true);

  const result = useQuery({
    ...lookupQueryOptions(source, ids, {
      ...(options.staleTime !== undefined ? { staleTime: options.staleTime } : {}),
      ...(options.retry !== undefined ? { retry: options.retry } : {}),
      scope,
      enabled,
    }),
    enabled,
  });

  const rows = ready ? (result.data ?? EMPTY_ROWS) : EMPTY_ROWS;
  const key = source.key ?? options.key;
  const status: LookupStatus = !ready
    ? "idle"
    : empty
      ? "success"
      : !enabled && result.isPending
        ? "idle"
        : result.isError
          ? "error"
          : result.isPending
            ? "loading"
            : "success";

  const byId = useMemo<ReadonlyMap<ID, T>>(() => {
    const map = new Map<ID, T>();
    for (const row of rows) {
      const rowId = key !== undefined ? key(row) : (row as unknown as { id?: ID }).id;
      if (rowId !== undefined) map.set(rowId, row);
    }
    return map;
  }, [rows, key]);

  const missingIds = useMemo<readonly ID[]>(() => {
    if (status !== "success") return [];
    const missing: ID[] = [];
    const seen = new Set<ID>();
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      if (!byId.has(id)) missing.push(id);
    }
    return missing;
  }, [status, ids, byId]);

  const refetch = useCallback(() => {
    void result.refetch();
  }, [result.refetch]);

  return {
    rows,
    byId,
    missingIds,
    status,
    error: status === "idle" ? null : ((result.error as ApiError | null | undefined) ?? null),
    isFetching: result.isFetching,
    refetch,
  };
}

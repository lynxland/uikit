import type {
  CollectionSearch,
  CollectionSource,
  CollectionState,
  FilterValue,
  FlatPatch,
  Scope,
  Sort,
} from "@lynxland/uikit-core";
import { useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import type { CollectionHandle } from "../bindings";
import { useCollection } from "../bindings";
import type { CollectionQueryOptions } from "../options";

/**
 * URL bindings — the only place `@tanstack/react-router` is imported.
 *
 * `useSearchState` reads the entire search object and decodes only the keys the
 * `CollectionSearch` owns, so page-local params (tabs, detail ids) pass through.
 * All writes are functional and happen in callbacks, never during render.
 */

export interface SearchStateHandle<S> {
  readonly state: S;
  set(next: S, options?: { history?: "replace" | "push" }): void;
  patch(part: Partial<S>, options?: { history?: "replace" | "push" }): void;
  reset(): void;
}

interface FunctionalNavigateOptions {
  to: ".";
  search: (prev: Record<string, unknown>) => Record<string, unknown>;
  replace?: boolean;
}

type FunctionalNavigate = (options: FunctionalNavigateOptions) => Promise<void> | void;

function useFunctionalNavigate(): FunctionalNavigate {
  const navigate = useNavigate();
  return useCallback<FunctionalNavigate>(
    (options) => {
      void (navigate as unknown as FunctionalNavigate)(options);
    },
    [navigate],
  );
}

export function useSearchState<S extends CollectionState>(
  search: CollectionSearch<S>,
  options: { from: string },
): SearchStateHandle<S> {
  const rawSearch = useSearch({
    from: options.from as never,
    strict: false,
  }) as unknown as Record<string, unknown>;
  const navigate = useFunctionalNavigate();

  const state = useMemo(() => search.decode(rawSearch), [search, rawSearch]);

  const write = useCallback(
    (patch: FlatPatch, history: "replace" | "push") => {
      navigate({
        to: ".",
        search: (prev) => ({ ...prev, ...patch }),
        replace: history === "replace",
      });
    },
    [navigate],
  );

  const set = useCallback(
    (next: S, opts?: { history?: "replace" | "push" }) => {
      // `set` replaces the whole owned state: clear keys that are not present
      // in `next` (a filter must not survive an explicit state replacement).
      write({ ...search.reset(), ...search.encode(next) }, opts?.history ?? "replace");
    },
    [write, search],
  );

  const patch = useCallback(
    (part: Partial<S>, opts?: { history?: "replace" | "push" }) => {
      write(search.patch(part), opts?.history ?? "replace");
    },
    [write, search],
  );

  const reset = useCallback(() => {
    write(search.reset(), "replace");
  }, [write, search]);

  return { state, set, patch, reset };
}

export interface PagerModel {
  readonly mode: "cursor" | "offset" | "all";
  readonly canPrev: boolean;
  readonly canNext: boolean;
  readonly pageSize: number;
  prev(): void;
  next(): void;
  setPageSize(size: number): void;
}

export interface CollectionPageHandle<T> extends CollectionHandle<T> {
  /** Decoded URL state (q/filters/sort/page/size) used to build the request. */
  readonly state: CollectionState;
  readonly pager: PagerModel;
  setState(next: CollectionState, options?: { history?: "replace" | "push" }): void;
  patchState(part: Partial<CollectionState>, options?: { history?: "replace" | "push" }): void;
  setFilters(filters: readonly FilterValue[], options?: { history?: "replace" | "push" }): void;
  setSort(sort: readonly Sort[] | null, options?: { history?: "replace" | "push" }): void;
  reset(): void;
}

export interface UseCollectionPageOptions {
  search: CollectionSearch;
  from: string;
  scope?: Scope;
  query?: CollectionQueryOptions;
}

/**
 * Page-level composition: data binding + URL state + pager.
 *
 * Cursor `prev()` delegates to browser history (`router.history.back()`) and is
 * disabled when there is no previous entry (a deep-linked `?cursor=...` URL has
 * none). Offset `prev()` is computed locally. Changing page size returns offset
 * pages to the first page and keeps the cursor anchor in cursor mode.
 */
export function useCollectionPage<T>(
  source: CollectionSource<T>,
  options: UseCollectionPageOptions,
): CollectionPageHandle<T> {
  const {
    state,
    set: setSearch,
    patch: patchSearch,
    reset: resetSearch,
  } = useSearchState(options.search, { from: options.from });

  const request = useMemo(() => options.search.toRequest(state), [options.search, state]);

  const data = useCollection(source, request, {
    ...options.query,
    ...(options.scope !== undefined ? { scope: options.scope } : {}),
  });

  const router = useRouter();

  const setState = useCallback(
    (next: CollectionState, opts?: { history?: "replace" | "push" }) => {
      setSearch(next, opts);
    },
    [setSearch],
  );

  const patchState = useCallback(
    (part: Partial<CollectionState>, opts?: { history?: "replace" | "push" }) => {
      patchSearch(part, opts);
    },
    [patchSearch],
  );

  const setFilters = useCallback(
    (filters: readonly FilterValue[], opts?: { history?: "replace" | "push" }) => {
      patchSearch({ filters }, { history: opts?.history ?? "replace" });
    },
    [patchSearch],
  );

  const setSort = useCallback(
    (sort: readonly Sort[] | null, opts?: { history?: "replace" | "push" }) => {
      patchSearch(
        { sort: sort ?? undefined },
        {
          history: opts?.history ?? "replace",
        },
      );
    },
    [patchSearch],
  );

  const reset = useCallback(() => {
    resetSearch();
  }, [resetSearch]);

  const mode = request.window.kind;
  const pageSize =
    request.window.kind === "all"
      ? (state.size ?? options.search.defaults.size ?? 20)
      : request.window.size;

  const offset = request.window.kind === "offset" ? request.window.offset : 0;
  const total =
    data.page?.paging.kind === "offset"
      ? data.page.paging.total
      : data.page?.paging.kind === "all"
        ? data.page.paging.total
        : undefined;

  const cursor = state.page?.kind === "cursor" ? state.page.cursor : undefined;
  const hasCursorHistory = cursor !== undefined && router.history.canGoBack();

  const canPrev = mode === "offset" ? offset > 0 : mode === "cursor" ? hasCursorHistory : false;
  const canNext =
    mode === "offset"
      ? total !== undefined && offset + pageSize < total
      : mode === "cursor"
        ? data.page?.paging.kind === "cursor" && data.page.paging.nextCursor !== undefined
        : false;

  const prev = useCallback(() => {
    if (mode === "offset" && offset > 0) {
      patchSearch(
        { page: { kind: "offset", offset: Math.max(0, offset - pageSize) } },
        { history: "push" },
      );
      return;
    }
    if (mode === "cursor" && hasCursorHistory) {
      router.history.back();
    }
  }, [mode, offset, pageSize, patchSearch, hasCursorHistory, router]);

  const next = useCallback(() => {
    if (mode === "offset" && total !== undefined && offset + pageSize < total) {
      patchSearch({ page: { kind: "offset", offset: offset + pageSize } }, { history: "push" });
      return;
    }
    if (mode === "cursor" && data.page?.paging.kind === "cursor") {
      const nextCursor = data.page.paging.nextCursor;
      if (nextCursor !== undefined) {
        patchSearch(
          { page: { kind: "cursor", cursor: nextCursor } },
          {
            history: "push",
          },
        );
      }
    }
  }, [mode, total, offset, pageSize, data.page, patchSearch]);

  const setPageSize = useCallback(
    (size: number) => {
      if (mode === "offset") {
        patchSearch(
          { size, page: { kind: "offset", offset: 0 } },
          {
            history: "replace",
          },
        );
        return;
      }
      // cursor/all: keep the anchor (or live tail); only the window size changes.
      patchSearch({ size }, { history: "replace" });
    },
    [mode, patchSearch],
  );

  const pager = useMemo<PagerModel>(
    () => ({ mode, canPrev, canNext, pageSize, prev, next, setPageSize }),
    [mode, canPrev, canNext, pageSize, prev, next, setPageSize],
  );

  return {
    ...data,
    state,
    pager,
    setState,
    patchState,
    setFilters,
    setSort,
    reset,
  };
}

// ============ generic URL params ============

export interface EnumSearchOptions<T extends string> {
  from: string;
  /** URL key, for example "tab" or "status". */
  key: string;
  values: readonly T[];
  /** Omitted from the URL when selected. Defaults to values[0]. */
  defaultValue?: T;
  history?: "replace" | "push";
}

export interface EnumSearchHandle<T extends string> {
  value: T;
  setValue: (value: T) => void;
}

/**
 * Typed enum search param for tabs/status/env selectors. It reads/writes one
 * key through TanStack Router without hand-writing `validateSearch` +
 * functional navigate casts at every route.
 */
export function useEnumSearch<T extends string>(
  options: EnumSearchOptions<T>,
): EnumSearchHandle<T> {
  const raw = useSearch({ from: options.from as never, strict: false }) as unknown as Record<
    string,
    unknown
  >;
  const navigate = useNavigate();
  const fallback = options.defaultValue ?? options.values[0];
  const candidate = raw[options.key];
  const value =
    typeof candidate === "string" && (options.values as readonly string[]).includes(candidate)
      ? (candidate as T)
      : (fallback as T);

  const setValue = useCallback(
    (next: T) => {
      void (navigate as unknown as FunctionalNavigate)({
        to: ".",
        search: (prev) => {
          const copy = { ...prev };
          if (next === fallback) delete copy[options.key];
          else copy[options.key] = next;
          return copy;
        },
        replace: (options.history ?? "replace") === "replace",
      });
    },
    [navigate, options.key, options.history, fallback],
  );

  return { value, setValue };
}

export interface TabParamOptions<T extends string = string> {
  from: string;
  key?: string;
  /** Allowed values; when omitted the URL value is accepted as-is. */
  values?: readonly T[];
  /** Omitted from the URL when selected. Defaults to `values[0]`. */
  defaultValue?: T;
  history?: "replace" | "push";
}

/**
 * Convenience wrapper for the common `?tab=` case.
 *
 * Pass `values` to validate/normalize URL input without hand-written
 * `.some(...) ? value : "general"` casts in every route:
 *
 * ```ts
 * const tab = useTabParam({
 *   from: Route.id,
 *   values: ["general", "logs"] as const,
 *   defaultValue: "general",
 * });
 * tab.value; // "general" | "logs"
 * ```
 */
export function useTabParam<T extends string = string>(
  options: TabParamOptions<T>,
): EnumSearchHandle<T> {
  const key = options.key ?? "tab";
  const fallback = options.defaultValue ?? options.values?.[0] ?? ("" as T);
  const raw = useSearch({ from: options.from as never, strict: false }) as unknown as Record<
    string,
    unknown
  >;
  const navigate = useNavigate();
  const candidate = raw[key];
  const value =
    typeof candidate === "string" &&
    (options.values === undefined || (options.values as readonly string[]).includes(candidate))
      ? (candidate as T)
      : (fallback as T);

  const setValue = useCallback(
    (next: T) => {
      void (navigate as unknown as FunctionalNavigate)({
        to: ".",
        search: (prev) => {
          const copy = { ...prev };
          if (next === fallback) delete copy[key];
          else copy[key] = next;
          return copy;
        },
        replace: (options.history ?? "replace") === "replace",
      });
    },
    [navigate, key, options.history, fallback],
  );

  return { value, setValue };
}

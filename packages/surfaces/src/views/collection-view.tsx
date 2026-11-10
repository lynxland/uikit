import type { ApiError, FilterValue, Sort } from "@lynxland/uikit-core";
import type { CollectionHandle } from "@lynxland/uikit-react";
import { type ReactNode, useEffect, useRef } from "react";
import { useUiAdapter } from "../adapter";
import {
  AsyncState,
  type AsyncStateProps,
  type AsyncStatus,
  type Column,
  DataTable,
  FilterBar,
  Pager,
  type PagerPaging,
  type RowSelection,
} from "../controls";
import type { FilterField } from "../fields";
import { cx } from "../values/classes";

/**
 * Collection view (design.md §6.2). Translates a `CollectionHandle` into
 * controlled control props: AsyncState × FilterBar × DataTable × Pager.
 *
 * It never imports Router, never assumes setters on the binding handle and
 * never renders the page shell (h1/width/header stay in chrome).
 */

/** Controlled filter state owned by the page (usually URL-backed). */
export interface CollectionFilterState {
  text?: string;
  filters?: readonly FilterValue[];
}

/** Filter-bar write-back; the page decides where the state lives. */
export interface CollectionFilterChange {
  text: string;
  filters: readonly FilterValue[];
}

/**
 * Structural pager contract. A router `PagerModel` is assignable without
 * surfaces importing the router package.
 */
export interface PagerControls {
  readonly mode: "cursor" | "offset" | "all";
  readonly canPrev: boolean;
  readonly canNext: boolean;
  readonly pageSize: number;
  prev(): void;
  next(): void;
  setPageSize(size: number): void;
}

export interface CollectionViewProps<T extends object> {
  list: CollectionHandle<T>;
  columns: readonly Column<T>[];
  /** Row id accessor; derived from `row.id` (then row index) when omitted. */
  getRowId?: (row: T) => string;
  filters?: readonly FilterField[];
  filterState?: CollectionFilterState;
  onFilterChange?: (next: CollectionFilterChange) => void;
  sort?: readonly Sort[];
  onSortChange?: (sort: readonly Sort[]) => void;
  toolbar?: ReactNode;
  tabs?: ReactNode;
  selection?: RowSelection<T>;
  onRowClick?: (row: T) => void;
  empty?: AsyncStateProps["empty"];
  /** Overrides the derived pager entirely. */
  pager?: ReactNode;
  /** Derived pager controls (typically `collectionPage.pager`). */
  pagerModel?: PagerControls;
  describeError?: (error: ApiError) => string;
  errorTitle?: string;
  className?: string;
}

function asyncStatus(status: CollectionHandle<unknown>["status"]): AsyncStatus {
  return status === "idle" ? "loading" : status;
}

function defaultRowId(row: unknown, index: number): string {
  if (typeof row === "object" && row !== null) {
    const candidate = (row as { id?: unknown }).id;
    if (typeof candidate === "string" || typeof candidate === "number") {
      return String(candidate);
    }
  }
  return String(index);
}

function pagingOf<T extends object>(list: CollectionHandle<T>, pager: PagerControls): PagerPaging {
  const page = list.page?.paging;
  if (pager.mode === "offset") {
    const offset = page?.kind === "offset" ? page.offset : 0;
    const total = page?.kind === "offset" ? page.total : (list.total ?? list.rows.length);
    return { kind: "offset", offset, size: pager.pageSize, total };
  }
  if (pager.mode === "all") {
    const total = page?.kind === "all" ? page.total : (list.total ?? list.rows.length);
    return { kind: "all", total };
  }
  const total = page?.kind === "cursor" ? page.total : list.total;
  return {
    kind: "cursor",
    ...(total !== undefined ? { total } : {}),
    ...(pager.canNext ? { nextCursor: "__next__" } : {}),
  };
}

export function CollectionView<T extends object>({
  list,
  columns,
  getRowId,
  filters,
  filterState,
  onFilterChange,
  sort,
  onSortChange,
  toolbar,
  tabs,
  selection,
  onRowClick,
  empty,
  pager,
  pagerModel,
  describeError,
  errorTitle,
  className,
}: CollectionViewProps<T>) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;

  const rowIds = new Map<T, string>();
  list.rows.forEach((row, index) => {
    rowIds.set(row, defaultRowId(row, index));
  });
  const rowId = getRowId ?? ((row: T) => rowIds.get(row) ?? defaultRowId(row, 0));

  const status = asyncStatus(list.status);
  const showFilterBar = filters !== undefined || filterState !== undefined;
  const text = filterState?.text ?? "";
  const activeFilters = filterState?.filters ?? [];

  // FilterBar's clear-all emits a filter change and a text change in the same
  // event. Keep the first value pending so the second callback does not
  // resurrect the cleared filters.
  const pendingFilters = useRef<readonly FilterValue[] | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the pending patch whenever the controlled value changes
  useEffect(() => {
    pendingFilters.current = null;
  }, [filterState?.filters, filterState?.text]);

  const changeFilters = (next: readonly FilterValue[]) => {
    pendingFilters.current = next;
    onFilterChange?.({ text, filters: next });
  };
  const changeText = (nextText: string) => {
    const nextFilters = pendingFilters.current ?? activeFilters;
    pendingFilters.current = null;
    onFilterChange?.({ text: nextText, filters: nextFilters });
  };

  const filterBar = showFilterBar ? (
    <FilterBar
      fields={filters ?? []}
      value={activeFilters}
      onChange={changeFilters}
      {...(filterState !== undefined ? { text: { value: text, onChange: changeText } } : {})}
    />
  ) : null;

  const pagerNode =
    pager !== undefined ? (
      pager
    ) : pagerModel !== undefined ? (
      <Pager
        paging={pagingOf(list, pagerModel)}
        onPrev={pagerModel.prev}
        onNext={pagerModel.next}
        onPageSizeChange={pagerModel.setPageSize}
        pageSize={pagerModel.pageSize}
        canPrev={pagerModel.canPrev}
        canNext={pagerModel.canNext}
        rowCount={list.rows.length}
      />
    ) : null;
  const pagerVisible =
    pagerNode !== null &&
    (pager !== undefined
      ? true
      : pagerModel?.mode !== "all" && status !== "loading" && status !== "error");

  return (
    <div className={merge("ui-collection-view", className)} data-testid="collection-view">
      {tabs !== undefined ? <div className="ui-collection-view__tabs">{tabs}</div> : null}
      {toolbar !== undefined || filterBar !== null ? (
        <div className="ui-collection-view__toolbar">
          {toolbar !== undefined ? (
            <div className="ui-collection-view__actions">{toolbar}</div>
          ) : null}
          {filterBar !== null ? (
            <div className="ui-collection-view__filters">{filterBar}</div>
          ) : null}
        </div>
      ) : null}
      <AsyncState
        status={status}
        error={list.error}
        onRetry={list.refetch}
        {...(empty !== undefined ? { empty } : {})}
        {...(describeError !== undefined ? { describeError } : {})}
        {...(errorTitle !== undefined ? { errorTitle } : {})}
      >
        <DataTable<T>
          rows={list.rows}
          columns={columns}
          getRowId={rowId}
          sorting={sort}
          onSortingChange={onSortChange}
          {...(selection !== undefined ? { selection } : {})}
          {...(onRowClick !== undefined ? { onRowClick } : {})}
        />
      </AsyncState>
      {pagerVisible ? <div className="ui-collection-view__pager">{pagerNode}</div> : null}
    </div>
  );
}

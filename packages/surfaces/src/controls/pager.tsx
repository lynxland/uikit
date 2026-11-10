import type { CollectionPage } from "@lynxland/uikit-core";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";

/** Discriminated paging union from the core collection result. */
export type PagerPaging = CollectionPage<unknown>["paging"];

export interface PagerLabels {
  previous: string;
  next: string;
  pageSize: string;
  pageSizeOption: (size: number) => string;
  offset: (info: { start: number; end: number; total: number }) => string;
  page: (page: number, pageCount: number) => string;
  cursor: (info: { count: number | undefined; total: number | undefined }) => string;
  empty: string;
}

const DEFAULT_LABELS: PagerLabels = {
  previous: "Previous page",
  next: "Next page",
  pageSize: "Page size",
  pageSizeOption: (size) => `${size} / page`,
  offset: ({ start, end, total }) =>
    total === 0 ? "No rows" : `Showing ${start}–${end} of ${total}`,
  page: (page, pageCount) => `Page ${page} / ${pageCount}`,
  cursor: ({ count, total }) =>
    total !== undefined
      ? `${total} total`
      : count !== undefined
        ? `${count} row${count === 1 ? "" : "s"}`
        : "Cursor paging",
  empty: "No rows",
};

export interface PagerProps {
  paging: PagerPaging;
  onPrev: () => void;
  onNext: () => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: readonly number[];
  /** Required for cursor paging when a page-size selector is shown. */
  pageSize?: number;
  /** Actual rendered row count on this page (summary text); falls back to the window size. */
  rowCount?: number;
  /** Explicit overrides; cursor paging cannot infer "has previous" from a next cursor. */
  canPrev?: boolean;
  canNext?: boolean;
  labels?: Partial<PagerLabels>;
  className?: string;
}

/**
 * One pager for cursor/offset/all modes. It receives only the paging result and
 * callbacks — no Router, no history and no binding handle. `all` renders
 * nothing by design.
 */
export function Pager({
  paging,
  onPrev,
  onNext,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  pageSize,
  rowCount,
  canPrev,
  canNext,
  labels,
  className,
}: PagerProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const t = { ...DEFAULT_LABELS, ...labels };

  if (paging.kind === "all") return null;

  const size = paging.kind === "offset" ? paging.size : (pageSize ?? pageSizeOptions[0] ?? 20);
  const options = pageSizeOptions.includes(size) ? pageSizeOptions : [size, ...pageSizeOptions];
  const pageSizeSelector =
    onPageSizeChange !== undefined ? (
      <ui.Select
        value={String(size)}
        options={options.map((option) => ({
          value: String(option),
          label: t.pageSizeOption(option),
        }))}
        aria-label={t.pageSize}
        onValueChange={(next) => {
          const parsed = Number(next);
          if (Number.isFinite(parsed) && parsed > 0) onPageSizeChange(parsed);
        }}
      />
    ) : null;

  if (paging.kind === "offset") {
    const pageCount = Math.max(1, Math.ceil(paging.total / paging.size));
    const page = Math.floor(paging.offset / paging.size) + 1;
    const count = rowCount ?? Math.min(paging.size, Math.max(0, paging.total - paging.offset));
    const start = count === 0 ? 0 : paging.offset + 1;
    const end = paging.offset + count;
    const hasPrev = canPrev ?? paging.offset > 0;
    const hasNext = canNext ?? paging.offset + paging.size < paging.total;

    return (
      <div className={merge("ui-pager", className)} data-testid="pager" data-mode="offset">
        <div className="ui-pager__summary">
          {paging.total === 0 ? t.empty : t.offset({ start, end, total: paging.total })}
        </div>
        <div className="ui-pager__controls">
          {pageSizeSelector}
          <span className="ui-pager__page">{t.page(page, pageCount)}</span>
          <div className="ui-pager__buttons">
            <ui.Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t.previous}
              disabled={!hasPrev}
              onClick={onPrev}
            >
              <ui.icons.ChevronLeft size={14} aria-hidden="true" />
            </ui.Button>
            <ui.Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t.next}
              disabled={!hasNext}
              onClick={onNext}
            >
              <ui.icons.ChevronRight size={14} aria-hidden="true" />
            </ui.Button>
          </div>
        </div>
      </div>
    );
  }

  const hasNext = canNext ?? paging.nextCursor !== undefined;
  const hasPrev = canPrev ?? false;

  return (
    <div className={merge("ui-pager", className)} data-testid="pager" data-mode="cursor">
      <div className="ui-pager__summary">
        {rowCount === 0 && paging.total === undefined
          ? t.empty
          : t.cursor({ count: rowCount, total: paging.total })}
      </div>
      <div className="ui-pager__controls">
        {pageSizeSelector}
        <div className="ui-pager__buttons">
          <ui.Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t.previous}
            disabled={!hasPrev}
            onClick={onPrev}
          >
            <ui.icons.ChevronLeft size={14} aria-hidden="true" />
          </ui.Button>
          <ui.Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t.next}
            disabled={!hasNext}
            onClick={onNext}
          >
            <ui.icons.ChevronRight size={14} aria-hidden="true" />
          </ui.Button>
        </div>
      </div>
    </div>
  );
}

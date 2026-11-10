import { cx } from "./classes";

export interface DiffEntry {
  /** Field path in the page's own vocabulary (for example `spec.replicas`). */
  path: string;
  /** Old value; absent means the entry was added. */
  old?: string;
  /** New value; absent means the entry was removed. */
  new?: string;
}

export interface ChangedSpans {
  prefix: string;
  oldCore: string;
  newCore: string;
  suffix: string;
}

/**
 * Trims common prefix/suffix without an LCS dependency. It covers the common
 * "one value changed" case; callers with multi-hunk diffs should pass a
 * pre-rendered node as the entry value.
 */
export function splitChanged(oldValue: string, newValue: string): ChangedSpans {
  let start = 0;
  while (
    start < oldValue.length &&
    start < newValue.length &&
    oldValue[start] === newValue[start]
  ) {
    start += 1;
  }
  let end = 0;
  while (
    end < oldValue.length - start &&
    end < newValue.length - start &&
    oldValue[oldValue.length - 1 - end] === newValue[newValue.length - 1 - end]
  ) {
    end += 1;
  }
  return {
    prefix: oldValue.slice(0, start),
    oldCore: oldValue.slice(start, oldValue.length - end),
    newCore: newValue.slice(start, newValue.length - end),
    suffix: newValue.slice(newValue.length - end),
  };
}

export interface DiffViewProps {
  entries: readonly DiffEntry[];
  emptyLabel?: string;
  className?: string;
}

export function DiffView({ entries, emptyLabel = "No differences", className }: DiffViewProps) {
  if (entries.length === 0) {
    return <p className={cx("ui-diff ui-diff--empty", className)}>{emptyLabel}</p>;
  }

  return (
    <div className={cx("ui-diff", className)} data-testid="diff-view">
      <div className="ui-diff__head" aria-hidden="true">
        <span>Field</span>
        <span>From</span>
        <span>To</span>
      </div>
      <ul className="ui-diff__list">
        {entries.map((entry) => {
          const added = entry.old === undefined;
          const removed = entry.new === undefined;
          const changed = !added && !removed && entry.old !== entry.new;
          const spans = changed ? splitChanged(entry.old ?? "", entry.new ?? "") : null;
          return (
            <li key={entry.path} className="ui-diff__row" data-diff-path={entry.path}>
              <span className="ui-diff__path" title={entry.path}>
                {entry.path}
              </span>
              <span
                className="ui-diff__value ui-diff__old"
                data-state={removed ? "removed" : added ? "absent" : "present"}
                title={entry.old}
              >
                {entry.old ?? "—"}
              </span>
              <span
                className="ui-diff__value ui-diff__new"
                data-state={added ? "added" : removed ? "absent" : "present"}
                title={entry.new}
              >
                {entry.new ?? "—"}
              </span>
              {spans !== null ? (
                <span className="ui-diff__spans">
                  <span className="ui-diff__prefix">{spans.prefix}</span>
                  <span className="ui-diff__removed">{spans.oldCore}</span>
                  <span className="ui-diff__added">{spans.newCore}</span>
                  <span className="ui-diff__suffix">{spans.suffix}</span>
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

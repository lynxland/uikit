import { useLookup } from "@lynxland/uikit-react";
import type { ReactNode } from "react";
import { cx } from "../values/classes";
import type { FieldReference } from "./types";

export interface ReferenceValueProps {
  reference: FieldReference;
  /** One or more ids; multi-value references join with `separator`. */
  ids: readonly string[];
  separator?: string;
  /** Rendered per unresolved id (deleted row, no access, …). Defaults to the raw id. */
  fallback?: (id: string) => ReactNode;
  className?: string;
}

/**
 * Lookup-backed reference display. `useLookup` fetches only the ids in the
 * current rows; unresolved ids deliberately fall back to the raw id (the
 * handle exposes them as `missingIds`; the view decides the wording).
 */
export function ReferenceValue({
  reference,
  ids,
  separator = ", ",
  fallback,
  className,
}: ReferenceValueProps) {
  const lookup = useLookup(reference.source, ids);
  const occurrences = new Map<string, number>();
  return (
    <span className={cx("ui-reference-value", className)} data-status={lookup.status}>
      {ids.map((id, index) => {
        const occurrence = occurrences.get(id) ?? 0;
        occurrences.set(id, occurrence + 1);
        const row = lookup.byId.get(id);
        const content =
          row === undefined
            ? (fallback?.(id) ?? <code className="ui-reference-value__id">{id}</code>)
            : reference.getLabel(row);
        return (
          <span key={`${id}:${occurrence}`} className="ui-reference-value__item">
            {index > 0 ? <span className="ui-reference-value__separator">{separator}</span> : null}
            {content}
          </span>
        );
      })}
    </span>
  );
}

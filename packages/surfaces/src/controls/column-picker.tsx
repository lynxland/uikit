import type { ReactNode } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";
import type { ColumnVisibility } from "./data-table";

/**
 * One toggleable table column. `hideable: false` keeps the column visible and
 * renders its checkbox disabled, so required columns (name/actions) cannot be
 * hidden by accident.
 */
export interface ColumnPickerColumn {
  id: string;
  label: ReactNode;
  hideable?: boolean;
}

export interface ColumnPickerProps {
  columns: readonly ColumnPickerColumn[];
  /** Same map as `DataTable.columnVisibility`; absent keys are visible. */
  visibility: ColumnVisibility;
  onVisibilityChange: (visibility: ColumnVisibility) => void;
  /** Trigger text; defaults to "Columns". */
  triggerLabel?: ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
  "aria-label"?: string;
}

/**
 * Controlled column-visibility menu for `DataTable` (or a hand-built table).
 * It owns no state and renders no data: the caller keeps the visibility map,
 * exactly like `DataTable`'s controlled `columnVisibility` prop. Checkbox
 * items keep the menu open while toggling.
 */
export function ColumnPicker({
  columns,
  visibility,
  onVisibilityChange,
  triggerLabel = "Columns",
  align = "start",
  className,
  "aria-label": ariaLabel = "Column visibility",
}: ColumnPickerProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;

  return (
    <ui.Menu
      align={align}
      aria-label={ariaLabel}
      trigger={
        <ui.Button
          type="button"
          variant="outline"
          size="sm"
          className={merge("ui-column-picker", className)}
          data-testid="columns-picker"
        >
          {triggerLabel}
        </ui.Button>
      }
      items={columns.map((column) => {
        const hideable = column.hideable !== false;
        const checked = hideable ? visibility[column.id] !== false : true;
        return {
          kind: "checkbox",
          label: column.label,
          checked,
          disabled: !hideable,
          testId: `column-toggle-${column.id}`,
          onCheckedChange: (next: boolean) => {
            if (!hideable) return;
            onVisibilityChange({ ...visibility, [column.id]: next });
          },
        };
      })}
    />
  );
}

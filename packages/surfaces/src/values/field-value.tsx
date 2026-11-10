import type { ReactNode } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "./classes";
import type { FieldValueDescriptor } from "./field-shape";
import { RelativeTime } from "./relative-time";

export interface BooleanLabels {
  true: ReactNode;
  false: ReactNode;
}

export interface FieldValueProps<T> {
  field: FieldValueDescriptor<T>;
  row: T;
  emptyLabel?: ReactNode;
  booleanLabels?: BooleanLabels;
  /**
   * Reference rendering escape hatch. Values cannot import data bindings, so
   * the lookup-backed renderer (`ReferenceValue`) is injected by fields/views.
   * When omitted, the raw id is rendered below.
   */
  renderReference?: (id: string, field: FieldValueDescriptor<T>) => ReactNode;
  className?: string;
}

/**
 * Default by-kind rendering for a single field value. List/detail slots
 * (`field.list.render` / `field.detail.render`) are honoured by the caller
 * (DataTable/FieldGrid), not here, so this stays a pure value view.
 */
export function FieldValue<T>({
  field,
  row,
  emptyLabel = "—",
  booleanLabels = { true: "Yes", false: "No" },
  renderReference,
  className,
}: FieldValueProps<T>) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const value = (row as unknown as Record<string, unknown>)[field.name];

  if (field.kind === "boolean") {
    return (
      <span
        className={merge("ui-field-value", "ui-field-value--boolean", className)}
        data-kind="boolean"
        data-value={value === true ? "true" : "false"}
      >
        {value === true ? booleanLabels.true : booleanLabels.false}
      </span>
    );
  }

  if (value === undefined || value === null || value === "") {
    return (
      <span
        className={merge("ui-field-value", "ui-field-value--empty", className)}
        data-kind={field.kind}
      >
        {emptyLabel}
      </span>
    );
  }

  switch (field.kind) {
    case "datetime":
      return <RelativeTime value={String(value)} className={merge("ui-field-value", className)} />;
    case "enum": {
      const raw = String(value);
      const option = field.options?.find((candidate) => candidate.value === raw);
      return (
        <span
          className={merge("ui-field-value", "ui-field-value--enum", className)}
          data-kind="enum"
        >
          <ui.Badge tone="neutral" variant="soft">
            {option?.label ?? raw}
          </ui.Badge>
        </span>
      );
    }
    case "reference": {
      const id = String(value);
      return (
        <span
          className={merge("ui-field-value", "ui-field-value--reference", className)}
          data-kind="reference"
        >
          {renderReference !== undefined ? (
            renderReference(id, field)
          ) : (
            <code className="ui-field-value__id">{id}</code>
          )}
        </span>
      );
    }
    case "number":
      return (
        <span
          className={merge("ui-field-value", "ui-field-value--number", className)}
          data-kind="number"
        >
          {String(value)}
        </span>
      );
    default:
      return (
        <span
          className={merge("ui-field-value", "ui-field-value--text", className)}
          data-kind="text"
        >
          {String(value)}
        </span>
      );
  }
}

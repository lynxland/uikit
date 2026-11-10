import type { FilterFieldDef } from "@lynxland/uikit-core";
import {
  type Column,
  type ColumnAlign,
  type FieldView,
  type FilterField,
  humanizeFieldName,
} from "@lynxland/uikit-surfaces";

/**
 * Pure adapters from field declarations to table/filter control props.
 *
 * `FieldView` is the list/detail axis; `Column` is the presentation contract.
 * Keeping the mapping here means preset pages never learn about TanStack Table
 * and consumers can use either input shape.
 */

function alignOf(field: { kind: FieldView<unknown>["kind"] }): ColumnAlign | undefined {
  if (field.kind === "number") return "end";
  if (field.kind === "boolean") return "center";
  return undefined;
}

export function columnFromField<Row extends object>(field: FieldView<Row>): Column<Row> {
  const list = field.list;
  const align = alignOf(field);
  return {
    id: field.name,
    header: field.label ?? humanizeFieldName(field.name),
    accessor: (row) => row[field.name],
    ...(list?.render !== undefined ? { cell: list.render } : {}),
    ...(list?.width !== undefined ? { width: list.width } : {}),
    ...(list?.hidden !== undefined ? { hidden: list.hidden } : {}),
    ...(list?.sortable === true ? { sortField: field.name, enableSorting: true } : {}),
    ...(align !== undefined ? { align } : {}),
  };
}

export function columnsFromFields<Row extends object>(
  fields: readonly FieldView<Row>[],
): Column<Row>[] {
  return fields.map((field) => columnFromField(field));
}

type FieldFilterKind = NonNullable<NonNullable<FieldView<unknown>["list"]>["filter"]>;

function filterKindOf(filter: FieldFilterKind): FilterField["kind"] {
  // "fuzzy" is presentation language for a contains-style text input; the
  // wire-level filter kinds are text/exact/enum/datetime.
  return filter === "fuzzy" ? "text" : filter;
}

/** Derive filter controls from `FieldView.list.filter` declarations. */
export function filterFieldsOf<Row>(fields: readonly FieldView<Row>[]): FilterField[] {
  const out: FilterField[] = [];
  for (const field of fields) {
    const filter = field.list?.filter;
    if (filter === undefined) continue;
    const kind = filterKindOf(filter);
    out.push({
      field: field.name,
      kind,
      label: field.label ?? humanizeFieldName(field.name),
      ...(kind === "text" ? { op: "contains" as const } : {}),
      ...(kind === "exact" ? { op: "eq" as const } : {}),
      ...(kind === "enum" && field.options !== undefined ? { options: field.options } : {}),
    });
  }
  return out;
}

/**
 * Map a `CollectionSearch.spec.filters` declaration to filter controls.
 * `kind` is optional in the search spec; infer enum from options, text for
 * contains and exact otherwise.
 */
export function filterFieldsFromSpec(defs: readonly FilterFieldDef[]): FilterField[] {
  return defs.map((def) => ({
    field: def.field,
    kind:
      def.kind ?? (def.options !== undefined ? "enum" : def.op === "contains" ? "text" : "exact"),
    ...(def.label !== undefined ? { label: def.label } : {}),
    ...(def.op !== undefined ? { op: def.op } : {}),
    ...(def.options !== undefined ? { options: def.options } : {}),
  }));
}

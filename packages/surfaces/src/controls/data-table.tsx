import type { Sort } from "@lynxland/uikit-core";
import { flexRender, type RowData } from "@tanstack/react-table";
import { type LegacyColumnDef, useLegacyTable } from "@tanstack/react-table/legacy";
import { type HTMLAttributes, type ReactNode, useMemo, useState } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";

export type ColumnAlign = "start" | "center" | "end";

/**
 * Public column declaration. Deliberately smaller than TanStack's `ColumnDef`:
 * preset pages describe id/header/accessor/cell + sort field, and DataTable
 * maps it to TanStack internally. `accessor`/`cell` are plain row functions, so
 * they stay usable without table generics.
 */
export interface Column<Row> {
  id?: string;
  header?: ReactNode;
  accessor?: (row: Row) => unknown;
  cell?: (row: Row) => ReactNode;
  /** Sort-state field name; presence makes the header a sort control. */
  sortField?: string;
  enableSorting?: boolean;
  width?: string;
  align?: ColumnAlign;
  /** Initial visibility when no controlled state is provided. */
  hidden?: boolean;
  /** false keeps the column out of view-option toggles (actions/id columns). */
  enableHiding?: boolean;
  className?: string;
}

/** Controlled row selection; the page owns the selected id set and batch actions. */
export interface RowSelection<Row> {
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string, row: Row) => void;
  onToggleAll: (ids: readonly string[]) => void;
  isRowSelectable?: (row: Row) => boolean;
}

export type ColumnVisibility = Readonly<Record<string, boolean>>;

export interface DataTableClassNames {
  root?: string;
  table?: string;
  header?: string;
  body?: string;
  row?: string;
  headCell?: string;
  cell?: string;
}

export interface DataTableProps<Row extends RowData> {
  rows: readonly Row[];
  columns: readonly Column<Row>[];
  getRowId: (row: Row) => string;
  sorting?: readonly Sort[];
  onSortingChange?: (sorting: readonly Sort[]) => void;
  selection?: RowSelection<Row>;
  columnVisibility?: ColumnVisibility;
  onColumnVisibilityChange?: (visibility: ColumnVisibility) => void;
  onRowClick?: (row: Row) => void;
  /** Extra row attributes/test ids; does not replace the built-in activation. */
  getRowProps?: (row: Row, index: number) => HTMLAttributes<HTMLTableRowElement>;
  empty?: ReactNode;
  caption?: ReactNode;
  "aria-label"?: string;
  className?: string;
  classNames?: DataTableClassNames;
}

function initialVisibility<Row>(columns: readonly Column<Row>[]): Record<string, boolean> {
  const state: Record<string, boolean> = {};
  columns.forEach((column, index) => {
    if (column.hidden === true) {
      state[column.id ?? column.sortField ?? `column-${index}`] = false;
    }
  });
  return state;
}

function defaultCell(value: unknown): ReactNode {
  if (value === undefined || value === null || value === "")
    return <span className="ui-muted">—</span>;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function toggleSorting(sorting: readonly Sort[] | undefined, field: string): readonly Sort[] {
  const current = sorting?.find((entry) => entry.field === field);
  const others = (sorting ?? []).filter((entry) => entry.field !== field);
  if (current === undefined) return [...others, { field, dir: "asc" }];
  if (current.dir === "asc") return [...others, { field, dir: "desc" }];
  return others;
}

/**
 * Controlled data table. Rows, sorting, selection and column visibility are
 * all caller-owned; the table never fetches, never touches Router and never
 * receives a CollectionHandle. TanStack Table is used internally for the row
 * model + visibility plumbing.
 */
export function DataTable<Row extends RowData>({
  rows,
  columns,
  getRowId,
  sorting,
  onSortingChange,
  selection,
  columnVisibility,
  onColumnVisibilityChange,
  onRowClick,
  getRowProps,
  empty,
  caption,
  "aria-label": ariaLabel,
  className,
  classNames,
}: DataTableProps<Row>) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const [internalVisibility, setInternalVisibility] = useState<Record<string, boolean>>(() =>
    initialVisibility(columns),
  );
  const visibility = columnVisibility ?? internalVisibility;

  const columnById = useMemo(() => {
    const map = new Map<string, Column<Row>>();
    columns.forEach((column, index) => {
      map.set(column.id ?? column.sortField ?? `column-${index}`, column);
    });
    return map;
  }, [columns]);

  const tanstackColumns = useMemo<LegacyColumnDef<Row>[]>(
    () =>
      columns.map((column, index) => {
        const id = column.id ?? column.sortField ?? `column-${index}`;
        const accessor = column.accessor;
        return {
          id,
          accessorFn: (row: Row) =>
            accessor !== undefined ? accessor(row) : (row as Record<string, unknown>)[id],
          header: () => column.header ?? id,
          enableHiding: column.enableHiding ?? true,
        } satisfies LegacyColumnDef<Row>;
      }),
    [columns],
  );

  const data = useMemo(() => [...rows], [rows]);

  const table = useLegacyTable<Row>({
    data,
    columns: tanstackColumns,
    getRowId,
    state: { columnVisibility: { ...visibility } },
    onColumnVisibilityChange: (updater) => {
      const next = typeof updater === "function" ? updater({ ...visibility }) : updater;
      onColumnVisibilityChange?.(next);
      if (columnVisibility === undefined) setInternalVisibility(next);
    },
  });

  const visibleHeaders = table.getHeaderGroups()[0]?.headers ?? [];
  const modelRows = table.getRowModel().rows;
  const selectableRows = selection
    ? rows.filter((row) => selection.isRowSelectable?.(row) ?? true)
    : [];
  const selectableIds = selectableRows.map(getRowId);
  const selectedCount = selectableIds.filter(
    (id) => selection?.selectedIds.has(id) ?? false,
  ).length;
  const allSelected = selectableIds.length > 0 && selectedCount === selectableIds.length;
  const someSelected = selectedCount > 0 && !allSelected;
  const columnCount = visibleHeaders.length + (selection !== undefined ? 1 : 0);

  return (
    <div className={merge("ui-table-wrap", className, classNames?.root)}>
      <ui.Table.Root
        className={merge("ui-table", classNames?.table)}
        {...(ariaLabel !== undefined ? { "aria-label": ariaLabel } : {})}
      >
        {caption !== undefined ? <ui.Table.Caption>{caption}</ui.Table.Caption> : null}
        <ui.Table.Header className={classNames?.header}>
          <ui.Table.Row>
            {selection !== undefined ? (
              <ui.Table.Head className="ui-table__select-head" scope="col">
                <ui.Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  disabled={selectableIds.length === 0}
                  aria-label="Select all rows"
                  onCheckedChange={() => selection.onToggleAll(selectableIds)}
                />
              </ui.Table.Head>
            ) : null}
            {visibleHeaders.map((header) => {
              const column = columnById.get(header.column.id);
              const sortField = column?.sortField;
              const sortable =
                sortField !== undefined &&
                column?.enableSorting !== false &&
                onSortingChange !== undefined;
              const active =
                sortField !== undefined && sorting?.some((entry) => entry.field === sortField);
              const direction = sorting?.find((entry) => entry.field === sortField)?.dir;
              return (
                <ui.Table.Head
                  key={header.id}
                  scope="col"
                  className={merge(
                    "ui-table__head-cell",
                    column?.align !== undefined && `ui-table__cell--${column.align}`,
                    classNames?.headCell,
                    column?.className,
                  )}
                  style={column?.width !== undefined ? { width: column.width } : undefined}
                  aria-sort={
                    active ? (direction === "asc" ? "ascending" : "descending") : undefined
                  }
                >
                  {header.isPlaceholder ? null : sortable ? (
                    <ui.Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ui-table__sort"
                      onClick={() => onSortingChange?.(toggleSorting(sorting, sortField))}
                      data-sorted={direction ?? "none"}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {direction === "asc" ? (
                        <ui.icons.ChevronUp size={12} aria-hidden="true" />
                      ) : direction === "desc" ? (
                        <ui.icons.ChevronDown size={12} aria-hidden="true" />
                      ) : null}
                    </ui.Button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </ui.Table.Head>
              );
            })}
          </ui.Table.Row>
        </ui.Table.Header>
        <ui.Table.Body className={classNames?.body}>
          {modelRows.length === 0 ? (
            <ui.Table.Row className="ui-table__empty-row">
              <ui.Table.Cell colSpan={Math.max(columnCount, 1)} className="ui-table__empty">
                {empty ?? "No rows"}
              </ui.Table.Cell>
            </ui.Table.Row>
          ) : (
            modelRows.map((row, rowIndex) => {
              const original = row.original as Row;
              const rowId = row.id;
              const selected = selection?.selectedIds.has(rowId) ?? false;
              const selectable = selection?.isRowSelectable?.(original) ?? true;
              const extra = getRowProps?.(original, rowIndex) ?? {};
              const {
                className: extraClassName,
                onClick: extraOnClick,
                onKeyDown: extraOnKeyDown,
                ...rowAttributes
              } = extra;
              const activate = (event: { target: EventTarget | null }) => {
                const target = event.target as HTMLElement | null;
                if (
                  target !== null &&
                  target.closest("button, a, input, label, select, textarea") !== null
                ) {
                  return;
                }
                onRowClick?.(original);
              };
              return (
                <ui.Table.Row
                  {...rowAttributes}
                  key={rowId}
                  tabIndex={onRowClick !== undefined ? 0 : rowAttributes.tabIndex}
                  className={merge(
                    "ui-table__row",
                    onRowClick !== undefined && "ui-table__row--clickable",
                    selected && "ui-table__row--selected",
                    classNames?.row,
                    extraClassName,
                  )}
                  data-state={selected ? "selected" : undefined}
                  onClick={
                    onRowClick !== undefined
                      ? (event) => {
                          extraOnClick?.(event);
                          if (event.defaultPrevented) return;
                          activate(event);
                        }
                      : extraOnClick
                  }
                  onKeyDown={
                    onRowClick !== undefined
                      ? (event) => {
                          extraOnKeyDown?.(event);
                          if (event.defaultPrevented) return;
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            activate(event);
                          }
                        }
                      : extraOnKeyDown
                  }
                >
                  {selection !== undefined ? (
                    <ui.Table.Cell
                      className="ui-table__select-cell"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <ui.Checkbox
                        checked={selected}
                        disabled={!selectable}
                        aria-label={`Select row ${rowId}`}
                        onCheckedChange={() => selection.onToggle(rowId, original)}
                      />
                    </ui.Table.Cell>
                  ) : null}
                  {row.getVisibleCells().map((cell) => {
                    const column = columnById.get(cell.column.id);
                    return (
                      <ui.Table.Cell
                        key={cell.id}
                        className={merge(
                          "ui-table__cell",
                          column?.align !== undefined && `ui-table__cell--${column.align}`,
                          classNames?.cell,
                          column?.className,
                        )}
                      >
                        {column?.cell !== undefined
                          ? column.cell(original)
                          : column?.accessor !== undefined
                            ? defaultCell(column.accessor(original))
                            : defaultCell(cell.getValue())}
                      </ui.Table.Cell>
                    );
                  })}
                </ui.Table.Row>
              );
            })
          )}
        </ui.Table.Body>
      </ui.Table.Root>
    </div>
  );
}

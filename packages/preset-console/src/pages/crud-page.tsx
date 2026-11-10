import type {
  ApiError,
  CollectionSearch,
  CollectionSource,
  Command,
  Scope,
} from "@lynxland/uikit-core";
import type { CollectionQueryOptions } from "@lynxland/uikit-react";
import { type CommandEntity, useCommand, useCommandForm } from "@lynxland/uikit-react";
import {
  type Column,
  type CrudFields,
  type DialogProps,
  type FieldInput,
  type FilterField,
  FormView,
  type PageLayoutProps,
  useUiAdapter,
} from "@lynxland/uikit-surfaces";
import { type ReactNode, useState } from "react";
import { columnsFromFields } from "../columns";
import { CollectionPage } from "./collection-page";

/**
 * Default CRUD page (design.md §6.4): CollectionPage + create/edit/delete
 * hosts. Commands and input types stay explicit; the page only composes the
 * default dialog/drawer interactions and row actions.
 */

export interface CrudCreateConfig<Row, CreateInput extends object> {
  command: Command<CreateInput, Row>;
  host?: "dialog" | "drawer" | "page";
  title?: string;
  defaults?: Partial<CreateInput>;
}

export interface CrudUpdateConfig<Row, UpdateInput extends object> {
  command: Command<UpdateInput, Row>;
  host?: "dialog" | "drawer" | "page";
  title?: string;
  toInput?: (row: Row) => Partial<UpdateInput>;
}

export type CrudPageHostRequest<Row> = { mode: "create" } | { mode: "edit"; row: Row };

export interface CrudDeleteConfig<Row, DeleteInput> {
  command: Command<DeleteInput, unknown>;
  title?: string;
  /** Default: `getRowId(row)` (the design's safe default). */
  toInput?: (row: Row) => DeleteInput;
}

export interface CrudPageProps<
  Row extends object,
  CreateInput extends object,
  UpdateInput extends object = CreateInput,
  DeleteInput = unknown,
> {
  source: CollectionSource<Row>;
  search: CollectionSearch;
  from: string;
  columns?: readonly Column<Row>[];
  fields: CrudFields<Row, CreateInput, UpdateInput>;
  filters?: readonly FilterField[];
  create?: CrudCreateConfig<Row, CreateInput>;
  update?: CrudUpdateConfig<Row, UpdateInput>;
  delete?: CrudDeleteConfig<Row, DeleteInput>;
  getRowId: (row: Row) => string;
  empty?: ReactNode;
  errors?: { describe?: (error: ApiError) => string };
  /** Required when create/update use `host: "page"`; typically navigate to a FormPage route. */
  onPageHost?: (request: CrudPageHostRequest<Row>) => void;
  scope?: Scope;
  query?: CollectionQueryOptions;
  title?: string;
  description?: string;
  actions?: ReactNode;
  width?: PageLayoutProps["width"];
  breadcrumb?: ReactNode;
  className?: string;
}

type CrudHostProps = DialogProps & { host: "dialog" | "drawer" };

function CrudHost({ host, ...rest }: CrudHostProps) {
  const ui = useUiAdapter();
  return host === "drawer" ? <ui.Drawer {...rest} /> : <ui.Dialog {...rest} />;
}

interface CreateCrudDialogProps<Row, CreateInput extends object> {
  host: "dialog" | "drawer";
  command: Command<CreateInput, Row>;
  title: string;
  fields: readonly FieldInput<CreateInput>[];
  defaults?: Partial<CreateInput>;
  entity: CommandEntity;
  scope?: Scope;
  onClose: () => void;
}

function CreateCrudDialog<Row, CreateInput extends object>({
  host,
  command,
  title,
  fields,
  defaults,
  entity,
  scope,
  onClose,
}: CreateCrudDialogProps<Row, CreateInput>) {
  const form = useCommandForm(
    command,
    {
      fields,
      ...(defaults !== undefined ? { defaultValues: defaults } : {}),
    },
    {
      entity,
      ...(scope !== undefined ? { scope } : {}),
      onSettled: (result) => {
        if (result?.status === "ok") onClose();
      },
    },
  );

  return (
    <CrudHost
      host={host}
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
    >
      <FormView form={form} fields={fields} submitLabel="Create" cancel={onClose} />
    </CrudHost>
  );
}

interface UpdateCrudDialogProps<Row, UpdateInput extends object> {
  host: "dialog" | "drawer";
  command: Command<UpdateInput, Row>;
  title: string;
  fields: readonly FieldInput<UpdateInput>[];
  defaults: Partial<UpdateInput>;
  rowId: string;
  entity: CommandEntity;
  scope?: Scope;
  onClose: () => void;
}

function UpdateCrudDialog<Row, UpdateInput extends object>({
  host,
  command,
  title,
  fields,
  defaults,
  rowId,
  entity,
  scope,
  onClose,
}: UpdateCrudDialogProps<Row, UpdateInput>) {
  const form = useCommandForm(
    command,
    { fields, defaultValues: defaults },
    {
      entity,
      id: rowId,
      ...(scope !== undefined ? { scope } : {}),
      onSettled: (result) => {
        if (result?.status === "ok") onClose();
      },
    },
  );

  return (
    <CrudHost
      host={host}
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
    >
      <FormView form={form} fields={fields} submitLabel="Save" cancel={onClose} />
    </CrudHost>
  );
}

interface DeleteCrudDialogProps<Row, DeleteInput> {
  command: Command<DeleteInput, unknown>;
  title: string;
  row: Row;
  toInput?: (row: Row) => DeleteInput;
  getRowId: (row: Row) => string;
  entity: CommandEntity;
  scope?: Scope;
  onClose: () => void;
}

function DeleteCrudDialog<Row, DeleteInput>({
  command,
  title,
  row,
  toInput,
  getRowId,
  entity,
  scope,
  onClose,
}: DeleteCrudDialogProps<Row, DeleteInput>) {
  const ui = useUiAdapter();
  const rowId = getRowId(row);
  const input = toInput !== undefined ? toInput(row) : (rowId as unknown as DeleteInput);
  const handle = useCommand(command, {
    entity,
    id: rowId,
    ...(scope !== undefined ? { scope } : {}),
    onSettled: (result) => {
      if (result?.status === "ok") onClose();
    },
  });
  const rejected =
    handle.result !== null && handle.result.status !== "ok" ? handle.result.message : null;
  const message = handle.failure?.message ?? rejected;

  return (
    <CrudHost
      host="dialog"
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      description="This action cannot be undone."
      footer={
        <>
          <ui.Button type="button" variant="ghost" disabled={handle.pending} onClick={onClose}>
            Cancel
          </ui.Button>
          <ui.Button
            type="button"
            variant="destructive"
            loading={handle.pending}
            disabled={handle.pending}
            onClick={() => handle.mutate(input)}
          >
            Delete
          </ui.Button>
        </>
      }
    >
      {message !== null ? (
        <p role="alert" data-testid="crud-delete-error">
          {message}
        </p>
      ) : null}
    </CrudHost>
  );
}

export function CrudPage<
  Row extends object,
  CreateInput extends object,
  UpdateInput extends object = CreateInput,
  DeleteInput = unknown,
>({
  source,
  search,
  from,
  columns,
  fields,
  filters,
  create,
  update,
  delete: remove,
  getRowId,
  empty,
  errors,
  onPageHost,
  scope,
  query,
  title,
  description,
  actions,
  width,
  breadcrumb,
  className,
}: CrudPageProps<Row, CreateInput, UpdateInput, DeleteInput>) {
  const ui = useUiAdapter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const baseColumns = columns ?? columnsFromFields(fields.view);
  const tableColumns: readonly Column<Row>[] =
    update === undefined && remove === undefined
      ? baseColumns
      : [
          ...baseColumns,
          {
            id: "__actions",
            header: "Actions",
            width: "1%",
            enableHiding: false,
            cell: (row: Row) => (
              <div className="ui-crud-page__row-actions">
                {update !== undefined ? (
                  <ui.Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (update.host === "page") {
                        if (onPageHost === undefined) {
                          throw new Error(
                            '@lynxland/uikit-preset-console CrudPage: update.host="page" requires onPageHost.',
                          );
                        }
                        onPageHost({ mode: "edit", row });
                        return;
                      }
                      setEditing(row);
                    }}
                  >
                    Edit
                  </ui.Button>
                ) : null}
                {remove !== undefined ? (
                  <ui.Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleting(row)}
                  >
                    Delete
                  </ui.Button>
                ) : null}
              </div>
            ),
          },
        ];

  const pageActions =
    actions === undefined && create === undefined ? undefined : (
      <>
        {actions}
        {create !== undefined ? (
          <ui.Button
            type="button"
            onClick={() => {
              if (create.host === "page") {
                if (onPageHost === undefined) {
                  throw new Error(
                    '@lynxland/uikit-preset-console CrudPage: create.host="page" requires onPageHost.',
                  );
                }
                onPageHost({ mode: "create" });
                return;
              }
              setCreateOpen(true);
            }}
          >
            New
          </ui.Button>
        ) : null}
      </>
    );

  const defaultsForUpdate = (row: Row): Partial<UpdateInput> =>
    update?.toInput?.(row) ??
    fields.toUpdateInput?.(row) ??
    (row as unknown as Partial<UpdateInput>);
  const resolvedFilters = filters ?? fields.filters;

  return (
    <>
      <CollectionPage<Row>
        {...(title !== undefined ? { title } : {})}
        {...(description !== undefined ? { description } : {})}
        source={source}
        search={search}
        from={from}
        columns={tableColumns}
        {...(resolvedFilters !== undefined ? { filters: resolvedFilters } : {})}
        {...(pageActions !== undefined ? { actions: pageActions } : {})}
        getRowId={getRowId}
        {...(empty !== undefined ? { empty } : {})}
        {...(errors?.describe !== undefined ? { describeError: errors.describe } : {})}
        {...(scope !== undefined ? { scope } : {})}
        {...(query !== undefined ? { query } : {})}
        {...(width !== undefined ? { width } : {})}
        {...(breadcrumb !== undefined ? { breadcrumb } : {})}
        {...(className !== undefined ? { className } : {})}
      />

      {createOpen && create !== undefined ? (
        <CreateCrudDialog<Row, CreateInput>
          host={create.host === "drawer" ? "drawer" : "dialog"}
          command={create.command}
          title={create.title ?? "Create"}
          fields={fields.create}
          defaults={create.defaults ?? fields.createDefaults}
          entity={source}
          {...(scope !== undefined ? { scope } : {})}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}

      {editing !== null && update !== undefined ? (
        <UpdateCrudDialog<Row, UpdateInput>
          key={getRowId(editing)}
          host={update.host === "drawer" ? "drawer" : "dialog"}
          command={update.command}
          title={update.title ?? "Edit"}
          fields={fields.update}
          defaults={defaultsForUpdate(editing)}
          rowId={getRowId(editing)}
          entity={source}
          {...(scope !== undefined ? { scope } : {})}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {deleting !== null && remove !== undefined ? (
        <DeleteCrudDialog<Row, DeleteInput>
          key={getRowId(deleting)}
          command={remove.command}
          title={remove.title ?? "Delete"}
          row={deleting}
          {...(remove.toInput !== undefined ? { toInput: remove.toInput } : {})}
          getRowId={getRowId}
          entity={source}
          {...(scope !== undefined ? { scope } : {})}
          onClose={() => setDeleting(null)}
        />
      ) : null}
    </>
  );
}

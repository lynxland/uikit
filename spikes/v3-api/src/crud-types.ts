import type { ReactNode } from "react";
import type { CollectionSource, Command, LookupSource } from "./source-identity.js";
import type { CollectionSearch, FilterFieldDef } from "./url-serializer.js";

export type FieldKind =
  | "text"
  | "number"
  | "boolean"
  | "datetime"
  | "enum"
  | "reference";

export interface FieldReference<Row = unknown> {
  source: LookupSource<Row, string>;
  getLabel: (row: Row) => string;
  getValue: (row: Row) => string;
}

export interface FieldView<Row> {
  name: keyof Row & string;
  kind: FieldKind;
  label?: string;
  list?: {
    sortable?: boolean;
    filter?: "fuzzy" | "exact" | "enum" | "datetime";
    hidden?: boolean;
    width?: string;
    render?: (row: Row) => ReactNode;
  };
  detail?: {
    section?: string;
    monospace?: boolean;
    render?: (row: Row) => ReactNode;
  };
  options?: ReadonlyArray<{ value: string; label: string }>;
  reference?: FieldReference<any>;
}

export interface FieldInput<Input> {
  name: keyof Input & string;
  kind: FieldKind;
  label?: string;
  placeholder?: string;
  required?: boolean | string;
  input?: (args: {
    name: keyof Input & string;
    field: FieldInput<Input>;
  }) => ReactNode;
  options?: ReadonlyArray<{ value: string; label: string }>;
  reference?: FieldReference<any>;
}

export interface FilterField {
  field: string;
  label?: string;
  kind: "text" | "exact" | "enum" | "datetime";
  op?: FilterFieldDef["op"];
  options?: ReadonlyArray<{ value: string; label: string }>;
  as?: "input" | "select" | "tabs" | "range" | "presets";
}

export interface CrudFields<Row, CreateInput, UpdateInput = CreateInput> {
  view: readonly FieldView<Row>[];
  create: readonly FieldInput<CreateInput>[];
  update: readonly FieldInput<UpdateInput>[];
  filters?: readonly FilterField[];
  createDefaults?: Partial<CreateInput>;
  toUpdateInput?: (row: Row) => Partial<UpdateInput>;
}

export function crudFields<Row, CreateInput, UpdateInput = CreateInput>(
  spec: CrudFields<Row, CreateInput, UpdateInput>,
): CrudFields<Row, CreateInput, UpdateInput> {
  return spec;
}

export interface Column<Row> {
  id?: string;
  header?: ReactNode;
  accessor?: (row: Row) => unknown;
  cell?: (row: Row) => ReactNode;
}

export interface CrudPageProps<
  Row,
  CreateInput,
  UpdateInput = CreateInput,
  DeleteInput = string,
> {
  source: CollectionSource<Row>;
  search: CollectionSearch;
  from: string;
  columns: readonly Column<Row>[];
  filters?: readonly FilterField[];
  fields: CrudFields<Row, CreateInput, UpdateInput>;
  create?: {
    command: Command<CreateInput, Row>;
    host?: "dialog" | "drawer";
    title?: string;
    defaults?: Partial<CreateInput>;
  };
  update?: {
    command: Command<UpdateInput, Row>;
    host?: "dialog" | "drawer";
    title?: string;
    toInput?: (row: Row) => Partial<UpdateInput>;
  };
  delete?: {
    command: Command<DeleteInput, unknown>;
    title?: string;
    toInput?: (row: Row) => DeleteInput;
  };
  getRowId: (row: Row) => string;
  empty?: ReactNode;
  errors?: { describe?: (error: unknown) => string };
}

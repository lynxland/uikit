/**
 * Field declarations (design.md §6.5).
 *
 * Three separate types — `FieldView` (list/detail), `FieldInput` (form input,
 * independent of Row) and `FilterField` (filter controls). None of them fetch
 * data, derive URL schemas or embed an Entity/Resource.
 */
import type { Operator, Scope, SourceName, StandardSchemaV1 } from "@lynxland/uikit-core";
import type { ReactNode } from "react";
import type { FieldKind, FieldOption } from "../values/field-shape";

export type { FieldKind, FieldOption } from "../values/field-shape";

/**
 * Structural read-only source used for reference display.
 *
 * It is `LookupSource` without `key` — keeping the property out avoids a
 * contravariant `key(row)` breaking assignability when the concrete row type
 * differs from the erased reference row.
 */
export interface ReferenceSource<Row = unknown, Id = string> {
  readonly name: SourceName;
  readonly scope?: readonly string[];
  read(ids: readonly Id[], ctx: Scope, signal?: AbortSignal): Promise<readonly Row[]>;
}

/**
 * Reference display config. `getLabel`/`getValue` use method signatures so a
 * concrete `(row: Widget) => string` stays assignable while the declaration
 * itself stays `any`-free.
 */
export interface FieldReference {
  source: ReferenceSource<unknown, string>;
  getLabel(row: unknown): string;
  getValue(row: unknown): string;
}

export interface FieldView<T> {
  name: keyof T & string;
  kind: FieldKind;
  label?: string;
  list?: {
    sortable?: boolean;
    filter?: "fuzzy" | "exact" | "enum" | "datetime";
    hidden?: boolean;
    width?: string;
    render?: (row: T) => ReactNode;
  };
  detail?: {
    section?: string;
    monospace?: boolean;
    render?: (row: T) => ReactNode;
  };
  /** enum labels */
  options?: readonly FieldOption[];
  /** reference read config; actual fetching lives in `ReferenceValue`/`ReferenceInput`. */
  reference?: FieldReference;
}

/**
 * Minimal field API surface exposed to custom input slots. `state.value` is
 * intentionally `unknown` (the form owns the precise type); use
 * `form.state.values[name]` for typed reads. `handleChange` is a method
 * signature so TanStack's `Updater`-typed handler stays assignable.
 */
export interface FieldApiLike {
  readonly state: {
    readonly value: unknown;
    readonly meta: { readonly errors: readonly unknown[] };
  };
  handleChange(value: unknown): void;
}

/**
 * Minimal form API surface consumed by `FieldInput` custom render slots and
 * `FieldInputs`. `CommandFormApi<I>` (and any TanStack Form API) is assignable
 * to it; controls never import the bindings package.
 */
export interface FieldFormApi<I extends object> {
  readonly state: { readonly values: I };
  Field(props: {
    name: keyof I & string;
    children: (field: FieldApiLike) => ReactNode;
  }): ReactNode | Promise<ReactNode>;
}

export interface FieldInputSlotArgs<I extends object> {
  form: FieldFormApi<I>;
  name: keyof I & string;
  field: FieldInput<I>;
}

/**
 * Extra wiring passed to the `FieldInputs.renderInput` slot. The slot already
 * has the current value/setter so reference pickers do not need a nested
 * `form.Field` subscription.
 */
export interface FieldInputRenderArgs<I extends object> extends FieldInputSlotArgs<I> {
  id: string;
  value: unknown;
  setValue: (value: unknown) => void;
  error?: string;
}

export interface FieldInput<I extends object> {
  name: keyof I & string;
  kind: FieldKind;
  label?: string;
  placeholder?: string;
  /** Convenience validation; complex rules belong to a Standard Schema on the form. */
  required?: boolean | string;
  /**
   * Declared but not rendered by `FieldInputs`. The value still lives in the
   * form/defaultValues and is submitted; useful for hidden foreign keys.
   */
  hidden?: boolean;
  /** Custom control for this field (wins over the default kind renderer). */
  input?: (args: FieldInputSlotArgs<I>) => ReactNode;
  options?: readonly FieldOption[];
  reference?: FieldReference;
}

export interface DatetimePreset {
  label: string;
  from(now: Date): string;
  to?(now: Date): string;
}

export interface FilterField {
  field: string;
  label?: string;
  kind: "text" | "exact" | "enum" | "datetime";
  op?: Operator;
  options?: readonly FieldOption[];
  as?: "input" | "select" | "tabs" | "range" | "presets";
  presets?: readonly DatetimePreset[];
}

export interface CrudFields<
  Row,
  CreateInput extends object,
  UpdateInput extends object = CreateInput,
> {
  view: readonly FieldView<Row>[];
  create: readonly FieldInput<CreateInput>[];
  update: readonly FieldInput<UpdateInput>[];
  filters?: readonly FilterField[];
  createDefaults?: Partial<CreateInput>;
  toUpdateInput?: (row: Row) => Partial<UpdateInput>;
}

/** Optional convenience layer for the common CRUD case; identity at runtime. */
export function crudFields<
  Row,
  CreateInput extends object,
  UpdateInput extends object = CreateInput,
>(spec: CrudFields<Row, CreateInput, UpdateInput>): CrudFields<Row, CreateInput, UpdateInput> {
  return spec;
}

/** Compact form spec for `useCommandForm`-style bindings. */
export interface FieldFormSpec<I extends object> {
  schema?: StandardSchemaV1<I>;
  fields: readonly FieldInput<I>[];
  defaultValues?: Partial<I>;
}

/** Human label fallback for a field name (`createdAt` → `Created At`). */
export function humanizeFieldName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

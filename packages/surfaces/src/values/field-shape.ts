/** Shared field vocabulary used by values and field declarations. */
export type FieldKind = "text" | "number" | "boolean" | "datetime" | "enum" | "reference";

export interface FieldOption {
  value: string;
  label: string;
}

/** Minimal shape a value view needs; `FieldView<T>` satisfies it structurally. */
export interface FieldValueDescriptor<T> {
  name: keyof T & string;
  kind: FieldKind;
  label?: string;
  options?: readonly FieldOption[];
}

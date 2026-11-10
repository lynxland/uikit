import { type ReactNode, useId } from "react";
import { useUiAdapter } from "../adapter";
import {
  type FieldApiLike,
  type FieldFormApi,
  type FieldInput,
  type FieldInputRenderArgs,
  humanizeFieldName,
} from "../fields/types";
import { cx } from "../values/classes";

export interface FieldInputsClassNames {
  root?: string;
  field?: string;
  error?: string;
}

export interface FieldInputsProps<I extends object> {
  form: FieldFormApi<I>;
  fields: readonly FieldInput<I>[];
  /**
   * Slot for kinds that need external wiring (references). `field.input` wins
   * over this; built-in text/number/boolean/enum/datetime kinds keep their
   * default adapters.
   */
  renderInput?: (args: FieldInputRenderArgs<I>) => ReactNode;
  className?: string;
  classNames?: FieldInputsClassNames;
}

const REQUIRED_VALIDATORS = new Map<string, (input: { value: unknown }) => string | undefined>();

function requiredValidator(message: string): (input: { value: unknown }) => string | undefined {
  let validator = REQUIRED_VALIDATORS.get(message);
  if (validator === undefined) {
    validator = ({ value }) =>
      value === undefined || value === null || String(value).trim() === "" ? message : undefined;
    // Stable identity: a fresh function per render makes TanStack Form reset
    // field validation state (the submit error disappears on the next render).
    REQUIRED_VALIDATORS.set(message, validator);
  }
  return validator;
}

function errorText(errors: readonly unknown[]): string | undefined {
  const messages: string[] = [];
  for (const error of errors) {
    const message =
      typeof error === "string"
        ? error
        : error !== null &&
            typeof error === "object" &&
            "message" in error &&
            typeof error.message === "string"
          ? error.message
          : undefined;
    if (message !== undefined && !messages.includes(message)) messages.push(message);
  }
  return messages.length > 0 ? messages.join("; ") : undefined;
}

function localInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function datetimeInputValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "";
  if (value instanceof Date) return localInputValue(value);
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return value.slice(0, 16);
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) return localInputValue(parsed);
  }
  return String(value);
}

interface FieldRowProps<I extends object> {
  form: FieldFormApi<I>;
  field: FieldInput<I>;
  api: FieldApiLike;
  slot: ((args: FieldInputRenderArgs<I>) => ReactNode) | undefined;
  classNames: FieldInputsClassNames | undefined;
}

function FieldRow<I extends object>({ form, field, api, slot, classNames }: FieldRowProps<I>) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const id = useId();
  const label = field.label ?? humanizeFieldName(field.name);
  const error = errorText(api.state.meta.errors);
  const required = field.required !== undefined && field.required !== false;

  const setValue = (value: unknown) => api.handleChange(value);
  let control: ReactNode;

  if (field.input !== undefined) {
    control = field.input({ form, name: field.name, field });
  } else if (field.kind === "reference") {
    control =
      slot !== undefined ? (
        slot({
          form,
          name: field.name,
          field,
          id,
          value: api.state.value,
          setValue,
          ...(error !== undefined ? { error } : {}),
        })
      ) : (
        <ui.Input
          id={id}
          value={
            api.state.value === undefined || api.state.value === null ? "" : String(api.state.value)
          }
          placeholder={field.placeholder}
          onChange={(event) => setValue(event.target.value)}
        />
      );
  } else {
    switch (field.kind) {
      case "number":
        control = (
          <ui.Input
            id={id}
            type="number"
            value={
              typeof api.state.value === "number"
                ? api.state.value
                : api.state.value === undefined || api.state.value === null
                  ? ""
                  : String(api.state.value)
            }
            placeholder={field.placeholder}
            onChange={(event) => {
              const parsed = event.target.valueAsNumber;
              setValue(Number.isNaN(parsed) ? undefined : parsed);
            }}
          />
        );
        break;
      case "boolean":
        control = (
          <ui.Checkbox
            id={id}
            checked={api.state.value === true}
            onCheckedChange={(checked) => setValue(checked === true)}
          />
        );
        break;
      case "enum":
        control = (
          <ui.Select
            id={id}
            value={
              api.state.value === undefined || api.state.value === null
                ? ""
                : String(api.state.value)
            }
            options={field.options ?? []}
            placeholder={field.placeholder ?? "Select…"}
            onValueChange={(next) => setValue(next)}
          />
        );
        break;
      case "datetime":
        control = (
          <ui.DateTimeInput
            id={id}
            value={datetimeInputValue(api.state.value)}
            onChange={(next) => setValue(next === "" ? undefined : next)}
          />
        );
        break;
      default:
        control = (
          <ui.Input
            id={id}
            type="text"
            value={
              api.state.value === undefined || api.state.value === null
                ? ""
                : String(api.state.value)
            }
            placeholder={field.placeholder}
            onChange={(event) => setValue(event.target.value)}
          />
        );
    }
  }

  return (
    <div className={merge("ui-field-input", classNames?.field)} data-field={field.name}>
      <ui.Field
        label={label}
        required={required}
        htmlFor={id}
        {...(error !== undefined
          ? { error: <span className={classNames?.error}>{error}</span> }
          : {})}
      >
        {control}
      </ui.Field>
    </div>
  );
}

/**
 * Controlled form input grid driven by `FieldInput<I>[]`. The form engine is
 * supplied by the caller (TanStack Form API; `CommandFormApi<I>` matches);
 * this component never knows the row type and never fetches.
 */
export function FieldInputs<I extends object>({
  form,
  fields,
  renderInput,
  className,
  classNames,
}: FieldInputsProps<I>) {
  const Field = form.Field as unknown as React.ComponentType<{
    name: string;
    validators?: unknown;
    children: (api: FieldApiLike) => ReactNode;
  }>;

  return (
    <div className={cx("ui-field-inputs", className, classNames?.root)}>
      {fields
        .filter((field) => field.hidden !== true)
        .map((field) => {
          const validators = field.required
            ? {
                onChange: requiredValidator(field.required === true ? "Required" : field.required),
                onSubmit: requiredValidator(field.required === true ? "Required" : field.required),
              }
            : undefined;
          return (
            <Field key={field.name} name={field.name} validators={validators}>
              {(api) => (
                <FieldRow<I>
                  form={form}
                  field={field}
                  api={api}
                  slot={renderInput}
                  classNames={classNames}
                />
              )}
            </Field>
          );
        })}
    </div>
  );
}

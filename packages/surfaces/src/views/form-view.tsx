import type { CommandFormHandle } from "@lynxland/uikit-react";
import type { ReactNode } from "react";
import { useUiAdapter } from "../adapter";
import { FieldInputs, Form } from "../controls";
import type { FieldInput, FieldInputRenderArgs } from "../fields";
import { cx } from "../values/classes";

/**
 * Form view (design.md §6.2). Consumes an existing `CommandFormHandle`
 * (`useCommandForm`); it never creates a form engine and never owns a
 * dialog/drawer host.
 */

export interface FormViewProps<I extends object, O> {
  form: CommandFormHandle<I, O>;
  fields: readonly FieldInput<I>[];
  submitLabel?: string;
  cancel?: () => void;
  /** Slot for kinds that need external wiring (reference pickers). */
  renderInput?: (args: FieldInputRenderArgs<I>) => ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Rendered next to the form-level result/error box (e.g. a reload action). */
  resultAction?: ReactNode;
  className?: string;
}

export function FormView<I extends object, O>({
  form,
  fields,
  submitLabel,
  cancel,
  renderInput,
  title,
  description,
  resultAction,
  className,
}: FormViewProps<I, O>) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  // Field errors for declared fields render inline through the form engine's
  // error map; surface the remaining (server-only) fields in a compact summary.
  const fieldNames = new Set<string>(fields.map((field) => field.name));
  const orphanFieldErrors = Object.entries(form.fieldErrors).filter(
    ([field]) => !fieldNames.has(field),
  );

  const errorNode =
    form.error !== null || resultAction !== undefined ? (
      <span className="ui-form-view__error-row">
        {form.error !== null ? <span>{form.error}</span> : null}
        {resultAction}
      </span>
    ) : undefined;

  return (
    <div className={merge("ui-form-view", className)} data-testid="form-view">
      {title !== undefined || description !== undefined ? (
        <header className="ui-form-view__header">
          {title !== undefined ? <h2 className="ui-form-view__title">{title}</h2> : null}
          {description !== undefined ? (
            <p className="ui-form-view__description">{description}</p>
          ) : null}
        </header>
      ) : null}
      <Form
        form={form.form}
        submitting={form.submitting}
        result={form.result}
        {...(errorNode !== undefined ? { error: errorNode } : {})}
        {...(submitLabel !== undefined ? { submitLabel } : {})}
        {...(cancel !== undefined ? { onCancel: cancel } : {})}
      >
        {orphanFieldErrors.length > 0 ? (
          <ul
            className="ui-form-view__field-errors"
            data-testid="form-field-errors"
            aria-live="polite"
          >
            {orphanFieldErrors.map(([field, message]) => (
              <li key={field} data-field={field}>
                <span className="ui-form-view__field-name">{field}</span>
                <span>{message}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <FieldInputs
          form={form.form}
          fields={fields}
          {...(renderInput !== undefined ? { renderInput } : {})}
        />
      </Form>
    </div>
  );
}

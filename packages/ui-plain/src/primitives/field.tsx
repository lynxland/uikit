import type { FieldProps } from "@lynxland/uikit-surfaces/adapter";

/**
 * Label + control + one message slot (error wins over description). The
 * caller owns the control id and passes it as `htmlFor`; this keeps the
 * primitive agnostic about which input implementation is inside.
 */
export function Field({
  label,
  description,
  error,
  required = false,
  htmlFor,
  children,
}: FieldProps) {
  const message = error ?? description;
  return (
    <div className="ui-plain-field" data-slot="field">
      {label !== undefined ? (
        <label
          htmlFor={htmlFor}
          className={
            error ? "ui-plain-field-label ui-plain-field-label--error" : "ui-plain-field-label"
          }
        >
          {label}
          {required ? (
            <span className="ui-plain-field-required" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {message !== undefined && message !== null && message !== "" ? (
        <p
          className={
            error
              ? "ui-plain-field-message ui-plain-field-message--error"
              : "ui-plain-field-message"
          }
          data-slot={error ? "field-error" : "field-description"}
          role={error ? "alert" : undefined}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

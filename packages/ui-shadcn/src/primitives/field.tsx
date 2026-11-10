import type { FieldProps } from "@lynxland/uikit-surfaces/adapter";
import { cx } from "./cx";

/**
 * Label + description/error + control wrapper. Plain HTML: the caller owns the
 * control (and its `id`), the field only owns layout, label association and
 * message text.
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
    <div className="flex flex-col gap-1.5" data-slot="field">
      {label !== undefined ? (
        <label
          htmlFor={htmlFor}
          className={cx(
            "text-sm font-medium leading-none text-[var(--foreground)]",
            error ? "text-[var(--destructive)]" : undefined,
          )}
        >
          {label}
          {required ? (
            <span className="ml-0.5 text-[var(--destructive)]" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {message !== undefined && message !== null && message !== "" ? (
        <p
          className={cx(
            "text-xs leading-relaxed",
            error ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]",
          )}
          data-slot={error ? "field-error" : "field-description"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

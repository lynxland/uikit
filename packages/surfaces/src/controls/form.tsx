import type { Outcome } from "@lynxland/uikit-core";
import type { ReactNode } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";

export interface FormSubmitHandle {
  handleSubmit?: () => void | Promise<void>;
  /** `CommandFormHandle.submit` compatibility. */
  submit?: () => void | Promise<void>;
}

export interface FormProps {
  /** Submit callback; the shell calls preventDefault and then this. */
  onSubmit?: () => void | Promise<void>;
  /** Alternate submit source (for example a `CommandFormHandle`/TanStack form). */
  form?: FormSubmitHandle;
  submitting?: boolean;
  /** Form-level error node (validation summary, command failure, …). */
  error?: ReactNode;
  /** Rejected/conflict result is rendered as an error box when `error` is absent. */
  result?: Outcome<unknown> | null;
  /** Replaces the default submit/cancel footer entirely. */
  footer?: ReactNode;
  submitLabel?: string;
  submittingLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  children: ReactNode;
  className?: string;
  id?: string;
}

function resultMessage(result: Outcome<unknown>): ReactNode {
  if (result.status === "ok") return null;
  if (result.status === "rejected") {
    return (
      <>
        {result.code !== undefined ? <span className="ui-form__code">[{result.code}] </span> : null}
        {result.message}
      </>
    );
  }
  return result.message;
}

/**
 * Submit shell only: renders the form element, error box, footer and pending
 * state. It does not create a form engine and never owns field values.
 */
export function Form({
  onSubmit,
  form,
  submitting = false,
  error,
  result = null,
  footer,
  submitLabel = "Save",
  submittingLabel = "Saving…",
  cancelLabel = "Cancel",
  onCancel,
  children,
  className,
  id,
}: FormProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const resultError = result !== null ? resultMessage(result) : null;
  const errorNode = error ?? resultError;

  return (
    <form
      id={id}
      className={merge("ui-form", className)}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting) return;
        if (onSubmit !== undefined) {
          void onSubmit();
          return;
        }
        if (form?.handleSubmit !== undefined) {
          void form.handleSubmit();
          return;
        }
        if (form?.submit !== undefined) void form.submit();
      }}
    >
      <div className="ui-form__body">{children}</div>
      {errorNode !== null && errorNode !== undefined ? (
        <div className="ui-form__error" role="alert" data-testid="form-error">
          {errorNode}
        </div>
      ) : null}
      {footer !== undefined ? (
        <div className="ui-form__footer">{footer}</div>
      ) : (
        <div className="ui-form__footer ui-form__footer--default">
          {onCancel !== undefined ? (
            <ui.Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
              {cancelLabel}
            </ui.Button>
          ) : null}
          <ui.Button type="submit" loading={submitting} disabled={submitting}>
            {submitting ? submittingLabel : submitLabel}
          </ui.Button>
        </div>
      )}
    </form>
  );
}

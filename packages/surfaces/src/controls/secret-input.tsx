import { useState } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";
import { CopyButton } from "../values/copy-button";
import { InputGroup } from "./input-group";

export interface SecretInputProps {
  value: string;
  /** Called with the underlying value, never the masked display string. */
  onChange?: (value: string) => void;
  /** Visible/accessibility label, for example "Password". */
  label?: string;
  /** Mask by default; set false for a plain revealable input. */
  masked?: boolean;
  defaultRevealed?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  inputClassName?: string;
  /** Test id applied to the input element. */
  testId?: string;
  "aria-label"?: string;
}

/**
 * Credential-oriented input: masked value with reveal and copy affordances in
 * a shared `InputGroup` frame. `onChange` always receives the real value; the
 * masked presentation never overwrites the draft.
 *
 * Read-only masked values render dots as the input value (so the secret never
 * leaks into the DOM). Editable masked values use `type="password"` and keep
 * the real draft in the controlled value.
 */
export function SecretInput({
  value,
  onChange,
  label,
  masked = true,
  defaultRevealed = false,
  readOnly = false,
  disabled = false,
  invalid = false,
  placeholder,
  id,
  className,
  inputClassName,
  testId,
  "aria-label": ariaLabel,
}: SecretInputProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const [revealed, setRevealed] = useState(defaultRevealed);
  const visible = !masked || revealed;
  const name = ariaLabel ?? label ?? "secret";
  const displayValue = !visible && readOnly ? "•".repeat(Math.max(value.length, 12)) : value;
  const hiddenEditable = !visible && !readOnly;

  return (
    <InputGroup
      className={merge("ui-secret-input", className)}
      disabled={disabled}
      invalid={invalid}
      endAddon={
        <>
          {masked ? (
            <ui.Button
              type="button"
              variant="ghost"
              size="icon"
              className="ui-secret-input__reveal"
              aria-label={visible ? `Hide ${name}` : `Reveal ${name}`}
              aria-pressed={visible}
              onClick={() => setRevealed((current) => !current)}
            >
              {visible ? (
                <ui.icons.EyeOff size={14} aria-hidden="true" />
              ) : (
                <ui.icons.Eye size={14} aria-hidden="true" />
              )}
            </ui.Button>
          ) : null}
          <CopyButton value={value} label={`Copy ${name}`} />
        </>
      }
    >
      <ui.Input
        id={id}
        variant="bare"
        className={merge("ui-secret-input__control", inputClassName)}
        type={hiddenEditable ? "password" : "text"}
        value={displayValue}
        readOnly={readOnly}
        disabled={disabled}
        aria-invalid={invalid ? true : undefined}
        placeholder={placeholder}
        aria-label={name}
        data-testid={testId}
        data-masked={!visible ? "true" : undefined}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </InputGroup>
  );
}

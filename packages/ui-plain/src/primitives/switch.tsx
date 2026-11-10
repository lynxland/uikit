import type { SwitchProps } from "@lynxland/uikit-surfaces/adapter";

/**
 * Switch built on a native button with `role="switch"`. Enter/Space and focus
 * come from the button; the thumb is a decorative span.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  id,
  "aria-label": ariaLabel,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-label={ariaLabel}
      aria-checked={checked}
      disabled={disabled}
      data-state={checked ? "checked" : "unchecked"}
      data-disabled={disabled || undefined}
      className="ui-plain-switch"
      onClick={() => onCheckedChange?.(!checked)}
    >
      <span className="ui-plain-switch-thumb" aria-hidden="true" />
    </button>
  );
}

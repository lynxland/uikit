import type { CheckboxProps } from "@lynxland/uikit-surfaces/adapter";
import { forwardRef, useEffect, useRef } from "react";

/**
 * Tri-state native checkbox. The contract collapses `checked` +
 * `indeterminate` into one value; the DOM splits them, so the indeterminate
 * flag is synced imperatively. Clicking an indeterminate checkbox produces
 * `true` (native browser behaviour), matching the adapter contract.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { checked, onCheckedChange, disabled = false, id, "aria-label": ariaLabel },
  forwardedRef,
) {
  const innerRef = useRef<HTMLInputElement | null>(null);

  const assignRef = (node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  useEffect(() => {
    if (innerRef.current !== null) {
      innerRef.current.indeterminate = checked === "indeterminate";
    }
  }, [checked]);

  return (
    <input
      ref={assignRef}
      type="checkbox"
      id={id}
      aria-label={ariaLabel}
      aria-checked={checked === "indeterminate" ? "mixed" : checked}
      checked={checked === true}
      disabled={disabled}
      data-disabled={disabled || undefined}
      data-state={checked === "indeterminate" ? "indeterminate" : checked ? "checked" : "unchecked"}
      className="ui-plain-checkbox"
      onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
    />
  );
});

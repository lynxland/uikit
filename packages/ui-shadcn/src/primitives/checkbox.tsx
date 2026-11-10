import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import type { CheckboxProps } from "@lynxland/uikit-surfaces/adapter";
import { cx } from "./cx";
import { Check } from "./icons";

/**
 * Tri-state checkbox: `checked` is `boolean | "indeterminate"`. Base UI splits
 * those into `checked` plus `indeterminate`; the public contract stays single
 * valued.
 */
export function Checkbox({
  checked,
  onCheckedChange,
  disabled = false,
  id,
  "aria-label": ariaLabel,
}: CheckboxProps) {
  const indeterminate = checked === "indeterminate";
  return (
    <BaseCheckbox.Root
      id={id}
      aria-label={ariaLabel}
      checked={checked === true}
      indeterminate={indeterminate}
      disabled={disabled}
      onCheckedChange={(next) => onCheckedChange?.(next)}
      className={cx(
        "inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-[var(--input)] bg-[var(--background)] text-[var(--primary-foreground)] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] data-[checked]:border-[var(--primary)] data-[checked]:bg-[var(--primary)] data-[indeterminate]:border-[var(--primary)] data-[indeterminate]:bg-[var(--primary)] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
      )}
    >
      <BaseCheckbox.Indicator className="flex size-3.5 items-center justify-center text-current">
        {indeterminate ? (
          <span className="h-0.5 w-2 rounded-full bg-current" aria-hidden="true" />
        ) : (
          <Check size={12} />
        )}
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}

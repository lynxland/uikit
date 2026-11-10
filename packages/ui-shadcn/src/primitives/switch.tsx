import { Switch as BaseSwitch } from "@base-ui/react/switch";
import type { SwitchProps } from "@lynxland/uikit-surfaces/adapter";
import { cx } from "./cx";

export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  id,
  "aria-label": ariaLabel,
}: SwitchProps) {
  return (
    <BaseSwitch.Root
      id={id}
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      onCheckedChange={(next) => onCheckedChange?.(next)}
      className={cx(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-[var(--input)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] data-[checked]:bg-[var(--primary)] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
      )}
    >
      <BaseSwitch.Thumb
        className={cx(
          "pointer-events-none block size-4 rounded-full bg-[var(--background)] shadow-sm ring-0 transition-transform",
          "data-[checked]:translate-x-4",
        )}
      />
    </BaseSwitch.Root>
  );
}

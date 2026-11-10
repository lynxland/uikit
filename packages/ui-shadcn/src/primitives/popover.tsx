import { Popover as BasePopover } from "@base-ui/react/popover";
import type { PopoverProps } from "@lynxland/uikit-surfaces/adapter";
import { cx } from "./cx";

/**
 * Controlled popover. The trigger is rendered *as* the trigger element via
 * Base UI's `render` prop, so callers can pass a Button without nesting a
 * button inside a button.
 */
export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  align = "center",
  side = "bottom",
}: PopoverProps) {
  return (
    <BasePopover.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <BasePopover.Trigger render={trigger} />
      <BasePopover.Portal>
        <BasePopover.Positioner side={side} align={align} sideOffset={6}>
          <BasePopover.Popup
            className={cx(
              "z-50 w-72 rounded-md border border-[var(--border)] bg-[var(--popover)] p-4 text-[var(--popover-foreground)] shadow-md outline-none",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            )}
          >
            {children}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}

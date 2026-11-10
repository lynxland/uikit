import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { TooltipProps } from "@lynxland/uikit-surfaces/adapter";
import { cloneElement, type ReactElement, useId } from "react";

/**
 * Hover/focus tooltip. Base UI owns the portal, collision-aware positioning,
 * delay, Escape handling and focus semantics; the trigger is rendered *as* the
 * passed element so icon buttons never get a nested `<button>`.
 */
export function Tooltip({
  trigger,
  content,
  side = "top",
  align = "center",
  delay = 600,
  disabled = false,
}: TooltipProps) {
  const tooltipId = useId();
  const triggerProps = trigger.props as { "aria-describedby"?: string };
  const describedBy = [triggerProps["aria-describedby"], tooltipId].filter(Boolean).join(" ");
  const describedTrigger = cloneElement(trigger as ReactElement<{ "aria-describedby"?: string }>, {
    "aria-describedby": describedBy,
  });

  return (
    <BaseTooltip.Provider delay={delay}>
      <BaseTooltip.Root disabled={disabled}>
        <BaseTooltip.Trigger render={describedTrigger} delay={delay} />
        <BaseTooltip.Portal>
          <BaseTooltip.Positioner side={side} align={align} sideOffset={6} className="z-50">
            <BaseTooltip.Popup
              id={tooltipId}
              role="tooltip"
              className={
                "max-w-64 rounded-md border border-[var(--border)] bg-[var(--popover)] px-2 py-1 text-xs leading-snug text-[var(--popover-foreground)] shadow-md outline-none " +
                "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
              }
            >
              {content}
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  );
}

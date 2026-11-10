import type { PopoverProps } from "@lynxland/uikit-surfaces/adapter";
import {
  cloneElement,
  type ReactElement,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useId,
  useRef,
} from "react";
import { cx } from "./cx";

interface TriggerElementProps {
  onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
  "aria-haspopup"?: "dialog";
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
}

/**
 * Controlled, non-portalled popover.
 *
 * Limits (on purpose): the panel is absolutely positioned inside the trigger's
 * containing block, so it can clip inside `overflow: hidden` ancestors and it
 * does not flip when it would leave the viewport. It closes on Escape, on a
 * pointer press outside the root, and when the trigger is activated again.
 * Focus trapping/restoration is the Dialog's job, not the Popover's.
 *
 * The trigger is *rendered as-is* via `cloneElement`; the adapter adds ARIA
 * attributes and composes `onClick`, so no extra button is nested.
 */
export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  align = "center",
  side = "bottom",
}: PopoverProps) {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const panelId = useId();
  const triggerProps = trigger.props as TriggerElementProps;

  const wiredTrigger = cloneElement(trigger as ReactElement<TriggerElementProps>, {
    "aria-haspopup": "dialog",
    "aria-expanded": open,
    "aria-controls": open ? panelId : undefined,
    onClick: (event: ReactMouseEvent<HTMLElement>) => {
      triggerProps.onClick?.(event);
      if (!event.defaultPrevented) {
        onOpenChange(!open);
      }
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root !== null && event.target instanceof Node && !root.contains(event.target)) {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, onOpenChange]);

  return (
    <span ref={rootRef} className="ui-plain-popover-root" data-slot="popover">
      {wiredTrigger}
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-modal="false"
          className={cx("ui-plain-popover-panel", `ui-plain-popover-panel--${side}`)}
          data-align={align}
          data-side={side}
          data-slot="popover-panel"
        >
          {children}
        </div>
      ) : null}
    </span>
  );
}

import type { TooltipProps } from "@lynxland/uikit-surfaces/adapter";
import {
  cloneElement,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cx } from "./cx";

interface TriggerProps {
  "aria-describedby"?: string;
  onPointerEnter?: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave?: (event: PointerEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * Dependency-free tooltip fallback.
 *
 * The trigger keeps its own accessible name (`aria-label`/text); the tooltip is
 * an additional description wired through `aria-describedby`. Visibility is
 * driven by pointer/focus handlers and a `hidden` attribute, so it stays out
 * of the accessibility tree and out of the tab order while closed. There is no
 * portal or collision detection; the caller positions it with
 * `side`/`align` CSS.
 */
export function Tooltip({
  trigger,
  content,
  side = "top",
  align = "center",
  delay = 0,
  disabled = false,
}: TooltipProps): ReactNode {
  const id = useId();
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelTimer = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const show = () => {
    if (disabled) return;
    cancelTimer();
    if (delay <= 0) {
      setOpen(true);
      return;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      setOpen(true);
    }, delay);
  };

  const hide = () => {
    cancelTimer();
    setOpen(false);
  };

  const triggerProps = trigger.props as TriggerProps;
  const describedBy = [triggerProps["aria-describedby"], id].filter(Boolean).join(" ");

  const element = cloneElement(trigger as ReactElement<TriggerProps>, {
    "aria-describedby": describedBy,
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      triggerProps.onPointerEnter?.(event);
      show();
    },
    onPointerLeave: (event: PointerEvent<HTMLElement>) => {
      triggerProps.onPointerLeave?.(event);
      hide();
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      triggerProps.onFocus?.(event);
      show();
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      triggerProps.onBlur?.(event);
      hide();
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      triggerProps.onKeyDown?.(event);
      if (event.key === "Escape") hide();
    },
  });

  return (
    <span className="ui-plain-tooltip-anchor" data-side={side} data-align={align}>
      {element}
      <span
        id={id}
        role="tooltip"
        hidden={!open || disabled}
        className={cx("ui-plain-tooltip", `ui-plain-tooltip--${side}`)}
      >
        {content}
      </span>
    </span>
  );
}

import type { ReactNode } from "react";
import { cx } from "./classes";

export type SeparatorOrientation = "horizontal" | "vertical";

export interface SeparatorProps {
  orientation?: SeparatorOrientation;
  /**
   * Decorative separators are hidden from assistive technology (default).
   * Set `false` to expose `role="separator"` with an orientation.
   */
  decorative?: boolean;
  /** Optional centered label for a horizontal separator. */
  label?: ReactNode;
  className?: string;
}

/**
 * Semantic visual divider. Pure layout: no data, no adapter primitive. Use
 * `decorative={false}` only when the separation itself carries meaning.
 */
export function Separator({
  orientation = "horizontal",
  decorative = true,
  label,
  className,
}: SeparatorProps) {
  const labeled = orientation === "horizontal" && label !== undefined;
  const semantics =
    decorative === true
      ? ({ "aria-hidden": true } as const)
      : ({ role: "separator", "aria-orientation": orientation } as const);

  if (labeled) {
    return (
      <div className={cx("ui-separator", "ui-separator--labeled", className)} {...semantics}>
        <span className="ui-separator__line" aria-hidden="true" />
        <span className="ui-separator__label">{label}</span>
        <span className="ui-separator__line" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={cx("ui-separator", `ui-separator--${orientation}`, className)} {...semantics} />
  );
}

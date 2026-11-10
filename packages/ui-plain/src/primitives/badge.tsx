import type { BadgeProps } from "@lynxland/uikit-surfaces/adapter";
import { cx } from "./cx";

export function Badge({ children, tone = "neutral", variant = "soft" }: BadgeProps) {
  return (
    <span
      className={cx("ui-plain-badge", `ui-plain-badge--${variant}`)}
      data-tone={tone}
      data-variant={variant}
    >
      {children}
    </span>
  );
}

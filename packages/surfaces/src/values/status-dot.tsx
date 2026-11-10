import { cx } from "./classes";
import type { StatusTone } from "./status-badge";

export interface StatusDotProps {
  /** Semantic tone; map entity statuses to tones at the call site. */
  tone: StatusTone;
  /** Screen-reader description; decorative when omitted. */
  label?: string;
  /** Explicit accessible name; wins over `label`. */
  "aria-label"?: string;
  /** Add a soft ping ring for live/attention states. */
  pulse?: boolean;
  className?: string;
}

/**
 * Pure status dot (design.md §6.1) — token colours, no data knowledge.
 *
 * Without `label`/`aria-label` the dot is decorative (`aria-hidden`), so it can
 * sit next to visible status text. With a label it becomes an `img` with an
 * accessible name for compact rows and headers.
 */
export function StatusDot({
  tone,
  label,
  "aria-label": ariaLabel,
  pulse = false,
  className,
}: StatusDotProps) {
  const accessibleName = ariaLabel ?? label;
  return (
    <span
      className={cx("ui-status-dot", pulse && "ui-status-dot--pulse", className)}
      data-tone={tone}
      {...(accessibleName !== undefined
        ? { role: "img", "aria-label": accessibleName }
        : { "aria-hidden": true })}
    />
  );
}

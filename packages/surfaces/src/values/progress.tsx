import type { CSSProperties, ReactNode } from "react";
import { cx } from "./classes";

export type ProgressTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface ProgressProps {
  /** Current value between 0 and `max`. Ignored when `indeterminate`. */
  value?: number;
  /** Upper bound; defaults to 100. */
  max?: number;
  tone?: ProgressTone;
  /** Render an animated bar without a numeric value. */
  indeterminate?: boolean;
  /** Visible label above the track (the value is announced separately). */
  label?: ReactNode;
  /** Accessible name when no visible label is provided. */
  "aria-label"?: string;
  className?: string;
}

/**
 * Determinate/indeterminate progress bar (design.md §6.1). Pure presentation:
 * clamping, ARIA value attributes and token colours only.
 */
export function Progress({
  value = 0,
  max = 100,
  tone = "neutral",
  indeterminate = false,
  label,
  "aria-label": ariaLabel,
  className,
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(safeMax, Math.max(0, Number.isFinite(value) ? value : 0));
  const percent = (clamped / safeMax) * 100;
  const style: CSSProperties | undefined = indeterminate
    ? undefined
    : ({ "--ui-progress-value": `${percent}%` } as CSSProperties);

  return (
    <div className={cx("ui-progress", className)} data-tone={tone}>
      {label !== undefined ? <div className="ui-progress__label">{label}</div> : null}
      <div
        className={cx("ui-progress__track", indeterminate && "ui-progress__track--indeterminate")}
        role="progressbar"
        data-tone={tone}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        {...(indeterminate
          ? { "aria-valuetext": "Loading" }
          : { "aria-valuenow": Number(clamped.toFixed(2)) })}
        data-testid="progress"
        style={style}
      >
        <div className="ui-progress__indicator" />
      </div>
    </div>
  );
}

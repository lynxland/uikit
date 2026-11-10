import type { ReactNode } from "react";
import { cx } from "./classes";

/** Semantic alert tone; maps to the status token family. */
export type AlertTone = "info" | "success" | "warning" | "danger";

export interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  description?: ReactNode;
  /** Optional leading glyph; the caller chooses the icon library. */
  icon?: ReactNode;
  /** Optional trailing action (dismiss/retry/link). */
  action?: ReactNode;
  /**
   * Announce through `role="alert"` only for urgent, newly-inserted messages.
   * Static informational banners omit the role so they are not re-read.
   */
  live?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * Tone-aware inline banner (design.md §6.1). It owns only presentation; the
 * page decides whether the message is live, dismissible, or actionable.
 */
export function Alert({
  tone = "info",
  title,
  description,
  icon,
  action,
  live = false,
  className,
  children,
}: AlertProps) {
  const body = description ?? children;
  return (
    <div
      className={cx("ui-alert", className)}
      data-tone={tone}
      data-testid="alert"
      {...(live ? { role: "alert" as const } : {})}
    >
      {icon !== undefined ? (
        <span className="ui-alert__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div className="ui-alert__body">
        {title !== undefined ? <div className="ui-alert__title">{title}</div> : null}
        {body !== undefined ? <div className="ui-alert__description">{body}</div> : null}
      </div>
      {action !== undefined ? <div className="ui-alert__action">{action}</div> : null}
    </div>
  );
}

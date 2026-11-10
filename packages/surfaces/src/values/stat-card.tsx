import type { ReactNode } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "./classes";

export type StatTone = "default" | "success" | "warning" | "danger";

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  tone?: StatTone;
  hint?: ReactNode;
  /** Optional leading icon (usually a 16–20px glyph). */
  icon?: ReactNode;
  /** Optional top-right actions; kept outside the `href` anchor. */
  actions?: ReactNode;
  /**
   * Renders the card body as a plain anchor. Surfaces never imports Router;
   * Router-aware callers can pass a URL or wrap the card themselves.
   */
  href?: string;
  /** Optional footer region below the value/hint. */
  footer?: ReactNode;
  className?: string;
  /** Class for the value element (type scale/density escape). */
  valueClassName?: string;
}

function StatCardBody({
  label,
  value,
  tone,
  hint,
  icon,
  actions,
  href,
  footer,
  valueClassName,
}: Omit<StatCardProps, "className">) {
  const hasIcon = icon !== undefined;
  const hasActions = actions !== undefined;
  const content = (
    <>
      <div className={cx("ui-stat-card__header", hasActions && "ui-stat-card__header--actions")}>
        {hasIcon ? (
          <span className="ui-stat-card__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <div className="ui-stat-card__label">{label}</div>
      </div>
      <div className={cx("ui-stat-card__value", valueClassName)} data-tone={tone}>
        {value}
      </div>
      {hint !== undefined ? <div className="ui-stat-card__hint">{hint}</div> : null}
      {footer !== undefined ? <div className="ui-stat-card__footer">{footer}</div> : null}
    </>
  );

  return (
    <div className="ui-stat-card__content" data-actions={hasActions || undefined}>
      {hasActions ? <div className="ui-stat-card__actions">{actions}</div> : null}
      {href !== undefined ? (
        <a className="ui-stat-card__link" href={href}>
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}

/**
 * Dashboard statistic card: label + value + optional hint/footer. Formatting
 * stays with the page. `href` renders the body as an anchor without importing
 * Router, so link routing remains the application's decision.
 */
export function StatCard({
  label,
  value,
  tone = "default",
  hint,
  icon,
  actions,
  href,
  footer,
  className,
  valueClassName,
}: StatCardProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;

  return (
    <ui.Card className={merge("ui-stat-card", `ui-stat-card--${tone}`, className)}>
      <StatCardBody
        label={label}
        value={value}
        tone={tone}
        {...(hint !== undefined ? { hint } : {})}
        {...(icon !== undefined ? { icon } : {})}
        {...(actions !== undefined ? { actions } : {})}
        {...(href !== undefined ? { href } : {})}
        {...(footer !== undefined ? { footer } : {})}
        {...(valueClassName !== undefined ? { valueClassName } : {})}
      />
    </ui.Card>
  );
}

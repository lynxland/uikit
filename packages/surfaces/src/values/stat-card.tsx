import type { ReactNode } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "./classes";

export type StatTone = "default" | "success" | "warning" | "danger";

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  tone?: StatTone;
  hint?: ReactNode;
  className?: string;
}

/** Dashboard statistic card: label + value + optional hint. Formatting stays with the page. */
export function StatCard({ label, value, tone = "default", hint, className }: StatCardProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  return (
    <ui.Card className={merge("ui-stat-card", `ui-stat-card--${tone}`, className)}>
      <div className="ui-stat-card__label">{label}</div>
      <div className="ui-stat-card__value" data-tone={tone}>
        {value}
      </div>
      {hint !== undefined ? <div className="ui-stat-card__hint">{hint}</div> : null}
    </ui.Card>
  );
}

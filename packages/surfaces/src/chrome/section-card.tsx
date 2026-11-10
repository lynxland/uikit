import type { ReactNode } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";

/**
 * Pure section container: title/description/actions + arbitrary children.
 * Used by settings-style pages and detail sections; no data access.
 */

export interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function SectionCard({
  title,
  description,
  actions,
  className,
  children,
}: SectionCardProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;

  return (
    <ui.Card
      className={merge("ui-section-card", className)}
      {...(title !== undefined ? { title } : {})}
      {...(description !== undefined ? { description } : {})}
      {...(actions !== undefined ? { actions } : {})}
    >
      <div className="ui-section-card__body">{children}</div>
    </ui.Card>
  );
}

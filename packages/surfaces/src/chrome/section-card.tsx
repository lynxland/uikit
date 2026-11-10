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
  /** Draw a full-width rule under the header. */
  headerDivider?: boolean;
  footer?: ReactNode;
  /** Class for the card content region (padding/layout escapes). */
  bodyClassName?: string;
  className?: string;
  children: ReactNode;
}

export function SectionCard({
  title,
  description,
  actions,
  headerDivider,
  footer,
  bodyClassName,
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
      {...(headerDivider !== undefined ? { headerDivider } : {})}
      {...(footer !== undefined ? { footer } : {})}
      {...(bodyClassName !== undefined ? { bodyClassName } : {})}
    >
      <div className="ui-section-card__body">{children}</div>
    </ui.Card>
  );
}

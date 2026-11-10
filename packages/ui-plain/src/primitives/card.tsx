import type { CardProps } from "@lynxland/uikit-surfaces/adapter";
import { cx } from "./cx";

export function Card({
  children,
  title,
  description,
  actions,
  headerDivider = false,
  footer,
  bodyClassName,
  className,
}: CardProps) {
  const hasHeader = title !== undefined || description !== undefined || actions !== undefined;
  return (
    <div className={cx("ui-plain-card", className)} data-slot="card">
      {hasHeader ? (
        <div
          className={cx("ui-plain-card-header", headerDivider && "ui-plain-card-header--divider")}
          data-slot="card-header"
          data-divider={headerDivider || undefined}
        >
          <div className="ui-plain-card-heading">
            {title !== undefined ? (
              <h3 className="ui-plain-card-title" data-slot="card-title">
                {title}
              </h3>
            ) : null}
            {description !== undefined ? (
              <p className="ui-plain-card-description" data-slot="card-description">
                {description}
              </p>
            ) : null}
          </div>
          {actions !== undefined ? (
            <div className="ui-plain-card-actions" data-slot="card-actions">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      <div
        className={cx(
          "ui-plain-card-content",
          hasHeader && !headerDivider && "ui-plain-card-content--with-header",
          bodyClassName,
        )}
        data-slot="card-content"
      >
        {children}
      </div>
      {footer !== undefined ? (
        <div className="ui-plain-card-footer" data-slot="card-footer">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

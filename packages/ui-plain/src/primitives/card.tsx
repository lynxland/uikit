import type { CardProps } from "@lynxland/uikit-surfaces/adapter";
import { cx } from "./cx";

export function Card({ children, title, description, actions, className }: CardProps) {
  const hasHeader = title !== undefined || description !== undefined || actions !== undefined;
  return (
    <div className={cx("ui-plain-card", className)} data-slot="card">
      {hasHeader ? (
        <div className="ui-plain-card-header" data-slot="card-header">
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
        className={cx("ui-plain-card-content", hasHeader && "ui-plain-card-content--with-header")}
        data-slot="card-content"
      >
        {children}
      </div>
    </div>
  );
}

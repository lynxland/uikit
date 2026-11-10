import type { CardProps } from "@lynxland/uikit-surfaces/adapter";
import { cx } from "./cx";

export function Card({ children, title, description, actions, className }: CardProps) {
  const hasHeader = title !== undefined || description !== undefined || actions !== undefined;
  return (
    <div
      className={cx(
        "rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-sm",
        className,
      )}
      data-slot="card"
    >
      {hasHeader ? (
        <div className="flex items-start justify-between gap-4 p-6" data-slot="card-header">
          <div className="flex min-w-0 flex-col gap-1.5">
            {title !== undefined ? (
              <h3
                className="text-base font-semibold leading-none tracking-tight"
                data-slot="card-title"
              >
                {title}
              </h3>
            ) : null}
            {description !== undefined ? (
              <p className="text-sm text-[var(--muted-foreground)]" data-slot="card-description">
                {description}
              </p>
            ) : null}
          </div>
          {actions !== undefined ? (
            <div className="flex shrink-0 items-center gap-2" data-slot="card-actions">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className={cx("p-6", hasHeader && "pt-0")} data-slot="card-content">
        {children}
      </div>
    </div>
  );
}

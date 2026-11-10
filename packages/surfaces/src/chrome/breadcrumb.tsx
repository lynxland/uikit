import type { ReactNode } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";

export interface BreadcrumbItem {
  label: ReactNode;
  /** Plain anchor fallback. Router consumers should pass `render` instead. */
  href?: string;
  /** Custom link element (for example TanStack Router's `<Link>`). */
  render?: ReactNode;
}

export interface BreadcrumbProps {
  items: readonly BreadcrumbItem[];
  separator?: ReactNode;
  className?: string;
  "aria-label"?: string;
}

/**
 * Chrome breadcrumb. It is Router-agnostic: use `href` for plain anchors or
 * pass a Router `<Link>` through `render`. The last item is the current page.
 */
export function Breadcrumb({
  items,
  separator = "/",
  className,
  "aria-label": ariaLabel = "Breadcrumb",
}: BreadcrumbProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;

  return (
    <nav aria-label={ariaLabel} className={merge("ui-breadcrumb", className)}>
      <ol className="ui-breadcrumb__list">
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li
              key={typeof item.label === "string" ? item.label : index}
              className="ui-breadcrumb__item"
              data-current={current ? "true" : undefined}
            >
              {index > 0 ? (
                <span className="ui-breadcrumb__separator" aria-hidden="true">
                  {separator}
                </span>
              ) : null}
              {item.render !== undefined ? (
                item.render
              ) : item.href !== undefined ? (
                <a className="ui-breadcrumb__link" href={item.href}>
                  {item.label}
                </a>
              ) : (
                <span
                  className="ui-breadcrumb__current"
                  {...(current ? { "aria-current": "page" as const } : {})}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

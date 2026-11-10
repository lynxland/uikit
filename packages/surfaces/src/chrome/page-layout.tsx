import type { ReactNode } from "react";
import { useUiAdapter } from "../adapter";
import { Tabs } from "../controls";
import { cx } from "../values/classes";

/**
 * Page layout (design.md §6.3) — the only layer allowed to render `h1`.
 * It never fetches data; breadcrumb/backLink/tabs are ReactNode/controlled
 * slots wired to Router by the application.
 */

export interface PageLayoutTab {
  value: string;
  label: ReactNode;
}

export interface PageLayoutProps {
  title?: ReactNode;
  description?: ReactNode;
  breadcrumb?: ReactNode;
  backLink?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  tabs?: readonly PageLayoutTab[];
  currentTab?: string;
  onTabChange?: (value: string) => void;
  lead?: ReactNode;
  width?: "flow" | "narrow" | "wide";
  className?: string;
  children: ReactNode;
}

const NOOP = () => {};

export function PageLayout({
  title,
  description,
  breadcrumb,
  backLink,
  icon,
  actions,
  tabs,
  currentTab,
  onTabChange,
  lead,
  width = "wide",
  className,
  children,
}: PageLayoutProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const showHeader =
    title !== undefined || description !== undefined || icon !== undefined || actions !== undefined;
  const activeTab = currentTab ?? tabs?.[0]?.value ?? "";

  return (
    <div
      className={merge("ui-page-layout", `ui-page-layout--${width}`, className)}
      data-testid="page-layout"
      data-width={width}
    >
      {breadcrumb !== undefined || backLink !== undefined ? (
        <div className="ui-page-layout__nav">
          {backLink !== undefined ? <div className="ui-page-layout__back">{backLink}</div> : null}
          {breadcrumb !== undefined ? (
            <div className="ui-page-layout__breadcrumb">{breadcrumb}</div>
          ) : null}
        </div>
      ) : null}
      {showHeader ? (
        <header className="ui-page-layout__header">
          {icon !== undefined ? <div className="ui-page-layout__icon">{icon}</div> : null}
          <div className="ui-page-layout__heading">
            {title !== undefined ? <h1 className="ui-page-layout__title">{title}</h1> : null}
            {description !== undefined ? (
              <p className="ui-page-layout__description">{description}</p>
            ) : null}
          </div>
          {actions !== undefined ? <div className="ui-page-layout__actions">{actions}</div> : null}
        </header>
      ) : null}
      {lead !== undefined ? <div className="ui-page-layout__lead">{lead}</div> : null}
      {tabs !== undefined && tabs.length > 0 ? (
        <Tabs
          className="ui-page-layout__tabs"
          items={tabs.map((tab) => ({ value: tab.value, label: tab.label }))}
          value={activeTab}
          onChange={onTabChange ?? NOOP}
          variant="underline"
          aria-label="Sections"
        />
      ) : null}
      <div className="ui-page-layout__body">{children}</div>
    </div>
  );
}

import { type ReactNode, useEffect, useState } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";

/**
 * Application shell (design.md §6.3): sidebar navigation + main region, owning
 * the full-height chain. Navigation data is a plain prop; `renderLink` /
 * `isActive` let the app wire Router/Link without chrome importing it.
 */

export interface AppShellNavItem {
  label: ReactNode;
  to: string;
  icon?: ReactNode;
  /** Trailing count/status badge (e.g. service count). */
  badge?: ReactNode;
  /** Nested items; renders a collapsible group. */
  children?: readonly AppShellNavItem[];
  /** When true, a child path is not considered active for this item. */
  exact?: boolean;
}

export interface AppShellNavSection {
  label: ReactNode;
  items: readonly AppShellNavItem[];
}

export interface AppShellProps {
  /** Convenience brand node; ignored when `sidebarHeader` is provided. */
  brand?: ReactNode;
  /** Full sidebar header slot (team switcher, brand, workspace picker, …). */
  sidebarHeader?: ReactNode;
  nav: readonly AppShellNavSection[];
  renderLink?: (item: AppShellNavItem) => ReactNode;
  /** Explicit override; when omitted, `activePath` is matched longest-prefix. */
  isActive?: (item: AppShellNavItem) => boolean;
  /** Router-agnostic pathname used for the default active-item matching. */
  activePath?: string;
  /** Full sidebar footer slot (user menu, theme toggle, version, …). */
  sidebarFooter?: ReactNode;
  /** Main-content header slot; sits above `<main>` (global search/actions). */
  header?: ReactNode;
  /** Show the built-in sidebar collapse toggle in the main header. */
  collapsible?: boolean;
  /** Controlled collapsed state. */
  collapsed?: boolean;
  /** Uncontrolled initial collapsed state. */
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  "aria-label"?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Longest-prefix active item for a data-driven nav. `/widgets` stays active on
 * `/widgets/:id`, while `/widgets/keyset` wins over `/widgets` on its own
 * route. `exact: true` opts an item out of child-path matching.
 */
function itemMatches(item: AppShellNavItem, pathname: string): boolean {
  return item.to === "/"
    ? pathname === "/"
    : pathname === item.to || (item.exact !== true && pathname.startsWith(`${item.to}/`));
}

function findDeep(items: readonly AppShellNavItem[], pathname: string, best: AppShellNavItem | undefined): AppShellNavItem | undefined {
  let current = best;
  for (const item of items) {
    if (itemMatches(item, pathname) && (current === undefined || item.to.length > current.to.length)) {
      current = item;
    }
    if (item.children !== undefined) current = findDeep(item.children, pathname, current);
  }
  return current;
}

export function findActiveNavItem(
  nav: readonly AppShellNavSection[],
  pathname: string,
): AppShellNavItem | undefined {
  let best: AppShellNavItem | undefined;
  for (const section of nav) best = findDeep(section.items, pathname, best);
  return best;
}

function containsActive(item: AppShellNavItem, active: AppShellNavItem | undefined): boolean {
  if (active === undefined) return false;
  if (item === active) return true;
  return item.children?.some((child) => containsActive(child, active)) ?? false;
}

interface SidebarNavItemProps {
  item: AppShellNavItem;
  activeItem: AppShellNavItem | undefined;
  renderLink?: (item: AppShellNavItem) => ReactNode;
  isActive?: (item: AppShellNavItem) => boolean;
  depth?: number;
}

function SidebarNavItem({
  item,
  activeItem,
  renderLink,
  isActive,
  depth = 0,
}: SidebarNavItemProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const active = isActive !== undefined ? isActive(item) : activeItem === item;
  const hasChildren = item.children !== undefined && item.children.length > 0;
  const [open, setOpen] = useState(() => containsActive(item, activeItem));

  useEffect(() => {
    if (containsActive(item, activeItem)) setOpen(true);
  }, [activeItem, item]);

  if (hasChildren) {
    return (
      <li className="ui-app-shell__item" data-group="true">
        <button
          type="button"
          className="ui-app-shell__link ui-app-shell__group-trigger"
          aria-expanded={open}
          data-active={containsActive(item, activeItem) ? "true" : undefined}
          data-depth={depth > 0 ? depth : undefined}
          onClick={() => setOpen((current) => !current)}
        >
          {item.icon !== undefined ? <span className="ui-app-shell__icon">{item.icon}</span> : null}
          <span className="ui-app-shell__label">{item.label}</span>
          {item.badge !== undefined ? <span className="ui-app-shell__badge">{item.badge}</span> : null}
          <ui.icons.ChevronDown
            className={merge("ui-app-shell__chevron", open && "ui-app-shell__chevron--open")}
          />
        </button>
        {open ? (
          <ul className="ui-app-shell__sublist">
            {item.children?.map((child) => (
              <SidebarNavItem
                key={child.to}
                item={child}
                activeItem={activeItem}
                renderLink={renderLink}
                isActive={isActive}
                depth={depth + 1}
              />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  return (
    <li className="ui-app-shell__item" data-depth={depth > 0 ? depth : undefined}>
      {renderLink !== undefined ? (
        <span
          className="ui-app-shell__link"
          data-active={active ? "true" : undefined}
          data-depth={depth > 0 ? depth : undefined}
          data-testid="app-shell-custom-link"
        >
          {item.icon !== undefined ? <span className="ui-app-shell__icon">{item.icon}</span> : null}
          <span className="ui-app-shell__label">{renderLink(item)}</span>
          {item.badge !== undefined ? <span className="ui-app-shell__badge">{item.badge}</span> : null}
        </span>
      ) : (
        <a
          className="ui-app-shell__link"
          href={item.to}
          data-active={active ? "true" : undefined}
          data-depth={depth > 0 ? depth : undefined}
          {...(active ? { "aria-current": "page" as const } : {})}
        >
          {item.icon !== undefined ? (
            <span className="ui-app-shell__icon">{item.icon}</span>
          ) : null}
          <span className="ui-app-shell__label">{item.label}</span>
          {item.badge !== undefined ? <span className="ui-app-shell__badge">{item.badge}</span> : null}
        </a>
      )}
    </li>
  );
}

export function AppShell({
  brand,
  sidebarHeader,
  nav,
  renderLink,
  isActive,
  activePath,
  sidebarFooter,
  header,
  collapsible = false,
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  "aria-label": ariaLabel = "Main",
  className,
  children,
}: AppShellProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const activeItem = activePath !== undefined ? findActiveNavItem(nav, activePath) : undefined;
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(defaultCollapsed);
  const isCollapsed = collapsed ?? uncontrolledCollapsed;

  const toggleCollapsed = (): void => {
    const next = !isCollapsed;
    if (collapsed === undefined) setUncontrolledCollapsed(next);
    onCollapsedChange?.(next);
  };

  const headerNode = sidebarHeader ?? brand;
  const showMainHeader = header !== undefined || collapsible;

  return (
    <div
      className={merge("ui-app-shell", className)}
      data-testid="app-shell"
      data-collapsed={isCollapsed ? "true" : undefined}
    >
      <aside className="ui-app-shell__sidebar">
        {headerNode !== undefined ? (
          <div className="ui-app-shell__sidebar-header">{headerNode}</div>
        ) : null}
        <nav className="ui-app-shell__nav" aria-label={ariaLabel}>
          {nav.map((section) => (
            <div
              className="ui-app-shell__section"
              key={
                section.items[0]?.to ??
                (typeof section.label === "string" ? section.label : "section")
              }
            >
              <div className="ui-app-shell__section-label">{section.label}</div>
              <ul className="ui-app-shell__list">
                {section.items.map((item) => (
                  <SidebarNavItem
                    key={item.to}
                    item={item}
                    activeItem={activeItem}
                    renderLink={renderLink}
                    isActive={isActive}
                  />
                ))}
              </ul>
            </div>
          ))}
        </nav>
        {sidebarFooter !== undefined ? (
          <div className="ui-app-shell__footer">{sidebarFooter}</div>
        ) : null}
      </aside>
      <div className="ui-app-shell__content">
        {showMainHeader ? (
          <header className="ui-app-shell__header">
            {collapsible ? (
              <ui.Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!isCollapsed}
                data-testid="sidebar-toggle"
                onClick={toggleCollapsed}
              >
                {isCollapsed ? <ui.icons.ChevronRight /> : <ui.icons.ChevronLeft />}
              </ui.Button>
            ) : null}
            {header !== undefined ? <div className="ui-app-shell__header-content">{header}</div> : null}
          </header>
        ) : null}
        <main className="ui-app-shell__main">{children}</main>
      </div>
    </div>
  );
}

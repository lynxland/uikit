import {
  type CSSProperties,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";

/**
 * Application shell (design.md §6.3): sidebar navigation + main region, owning
 * the full-height chain. Navigation data is a plain prop; `renderLink` /
 * `isActive` let the app wire Router/Link without chrome importing it.
 *
 * Shell variants:
 * - `plain` (default): edge-to-edge sidebar with a right border.
 * - `floating`: inset rounded sidebar panel with an 8px margin and ring.
 *
 * On narrow screens the sidebar becomes an overlay drawer, so it never
 * competes with the page content for horizontal space.
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

export type AppShellVariant = "plain" | "floating";
export type AppShellCollapsedMode = "hide" | "icon";

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
  /** Optional localStorage persistence for uncontrolled collapsed state. */
  storageKey?: string;
  /** Shell chrome: plain edge-to-edge or a floating rounded sidebar panel. */
  variant?: AppShellVariant;
  /** Sidebar width as a CSS length; default `14rem`. */
  sidebarWidth?: string;
  /** Collapsed presentation: hide the sidebar or keep a tooltip icon rail. */
  collapsedMode?: AppShellCollapsedMode;
  /** Controlled mobile navigation drawer. */
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
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

function findDeep(
  items: readonly AppShellNavItem[],
  pathname: string,
  best: AppShellNavItem | undefined,
): AppShellNavItem | undefined {
  let current = best;
  for (const item of items) {
    if (
      itemMatches(item, pathname) &&
      (current === undefined || item.to.length > current.to.length)
    ) {
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

function readStoredCollapsed(storageKey: string | undefined, fallback: boolean): boolean {
  if (storageKey === undefined || typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch {
    // localStorage can be unavailable (privacy mode); keep the caller default.
  }
  return fallback;
}

interface SidebarNavItemProps {
  item: AppShellNavItem;
  activeItem: AppShellNavItem | undefined;
  renderLink?: (item: AppShellNavItem) => ReactNode;
  isActive?: (item: AppShellNavItem) => boolean;
  depth?: number;
  /** Icon rail: hide labels visually, keep them accessible, add tooltips. */
  iconRail?: boolean;
}

function SidebarNavItem({
  item,
  activeItem,
  renderLink,
  isActive,
  depth = 0,
  iconRail = false,
}: SidebarNavItemProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const active = isActive !== undefined ? isActive(item) : activeItem === item;
  const hasChildren = item.children !== undefined && item.children.length > 0;
  const [open, setOpen] = useState(() => containsActive(item, activeItem));

  useEffect(() => {
    if (containsActive(item, activeItem)) setOpen(true);
  }, [activeItem, item]);

  const withTooltip = (node: ReactElement): ReactNode =>
    iconRail ? <ui.Tooltip content={item.label} side="right" delay={150} trigger={node} /> : node;

  if (hasChildren) {
    const trigger = (
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
        {item.badge !== undefined ? (
          <span className="ui-app-shell__badge">{item.badge}</span>
        ) : null}
        <ui.icons.ChevronDown
          className={merge("ui-app-shell__chevron", open && "ui-app-shell__chevron--open")}
        />
      </button>
    );

    return (
      <li className="ui-app-shell__item" data-group="true">
        {withTooltip(trigger)}
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
                iconRail={iconRail}
              />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  const body = (
    <>
      {item.icon !== undefined ? <span className="ui-app-shell__icon">{item.icon}</span> : null}
      <span className="ui-app-shell__label">{item.label}</span>
      {item.badge !== undefined ? <span className="ui-app-shell__badge">{item.badge}</span> : null}
    </>
  );

  if (renderLink !== undefined) {
    const custom = renderLink(item);
    const customTrigger =
      iconRail && isValidElement(custom) ? (
        <ui.Tooltip
          content={item.label}
          side="right"
          delay={150}
          trigger={custom as ReactElement}
        />
      ) : (
        custom
      );
    return (
      <li className="ui-app-shell__item" data-depth={depth > 0 ? depth : undefined}>
        <span
          className="ui-app-shell__link ui-app-shell__link--custom"
          data-active={active ? "true" : undefined}
          data-depth={depth > 0 ? depth : undefined}
          data-testid="app-shell-custom-link"
        >
          {item.icon !== undefined ? <span className="ui-app-shell__icon">{item.icon}</span> : null}
          <span className="ui-app-shell__label">{customTrigger}</span>
          {item.badge !== undefined ? (
            <span className="ui-app-shell__badge">{item.badge}</span>
          ) : null}
        </span>
      </li>
    );
  }

  return (
    <li className="ui-app-shell__item" data-depth={depth > 0 ? depth : undefined}>
      {withTooltip(
        <a
          className="ui-app-shell__link"
          href={item.to}
          data-active={active ? "true" : undefined}
          data-depth={depth > 0 ? depth : undefined}
          {...(active ? { "aria-current": "page" as const } : {})}
        >
          {body}
        </a>,
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
  storageKey,
  variant = "plain",
  sidebarWidth,
  collapsedMode = "hide",
  mobileOpen,
  onMobileOpenChange,
  "aria-label": ariaLabel = "Main",
  className,
  children,
}: AppShellProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const activeItem = activePath !== undefined ? findActiveNavItem(nav, activePath) : undefined;
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(() =>
    readStoredCollapsed(storageKey, defaultCollapsed),
  );
  const isCollapsed = collapsed ?? uncontrolledCollapsed;
  const desktopIconRail = isCollapsed && collapsedMode === "icon";

  const [uncontrolledMobileOpen, setUncontrolledMobileOpen] = useState(false);
  const isMobileOpen = mobileOpen ?? uncontrolledMobileOpen;
  const mobilePanelRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const closeMobile = useCallback((): void => {
    if (mobileOpen === undefined) setUncontrolledMobileOpen(false);
    onMobileOpenChange?.(false);
  }, [mobileOpen, onMobileOpenChange]);

  useEffect(() => {
    if (storageKey === undefined) return;
    try {
      window.localStorage.setItem(storageKey, String(isCollapsed));
    } catch {
      // Persistence is best-effort; controlled state is unaffected.
    }
  }, [isCollapsed, storageKey]);

  useEffect(() => {
    if (!isMobileOpen) return;
    const panel = mobilePanelRef.current;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobile();
        return;
      }
      if (event.key !== "Tab" || panel === null) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => !node.hidden);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (first === undefined || last === undefined) return;
      if (!panel.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [closeMobile, isMobileOpen]);

  useEffect(() => {
    if (!isMobileOpen || typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const media = window.matchMedia("(min-width: 768px)");
    const handleChange = (): void => {
      if (media.matches) closeMobile();
    };
    media.addEventListener("change", handleChange);
    handleChange();
    return () => media.removeEventListener("change", handleChange);
  }, [closeMobile, isMobileOpen]);

  const previousActivePath = useRef(activePath);
  useEffect(() => {
    if (previousActivePath.current === activePath) return;
    previousActivePath.current = activePath;
    closeMobile();
  }, [activePath, closeMobile]);

  const toggleCollapsed = (): void => {
    const next = !isCollapsed;
    if (collapsed === undefined) setUncontrolledCollapsed(next);
    onCollapsedChange?.(next);
  };

  const headerNode = sidebarHeader ?? brand;
  const showMainHeader = header !== undefined || collapsible;

  const sidebarContent = (iconRail: boolean): ReactNode => (
    <>
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
                  iconRail={iconRail}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>
      {sidebarFooter !== undefined ? (
        <div className="ui-app-shell__footer">{sidebarFooter}</div>
      ) : null}
    </>
  );

  const style: CSSProperties | undefined =
    sidebarWidth !== undefined
      ? ({ "--ui-app-shell-sidebar-width": sidebarWidth } as CSSProperties)
      : undefined;

  return (
    <div
      className={merge(
        "ui-app-shell",
        variant === "floating" && "ui-app-shell--floating",
        className,
      )}
      style={style}
      data-testid="app-shell"
      data-variant={variant}
      data-collapsed={isCollapsed ? "true" : undefined}
      data-collapsed-mode={collapsedMode}
      data-mobile-open={isMobileOpen ? "true" : undefined}
    >
      <aside className="ui-app-shell__sidebar">{sidebarContent(desktopIconRail)}</aside>
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
            {header !== undefined ? (
              <div className="ui-app-shell__header-content">{header}</div>
            ) : null}
          </header>
        ) : null}
        <main className="ui-app-shell__main">{children}</main>
      </div>

      {isMobileOpen ? (
        <div className="ui-app-shell__mobile">
          <div
            className="ui-app-shell__mobile-backdrop"
            aria-hidden="true"
            data-testid="app-shell-mobile-backdrop"
            onClick={closeMobile}
          />
          <aside
            ref={mobilePanelRef}
            className="ui-app-shell__mobile-panel"
            role="dialog"
            aria-modal="true"
            aria-label={`${ariaLabel} navigation`}
            tabIndex={-1}
            data-testid="app-shell-mobile-nav"
          >
            <ui.Button
              type="button"
              variant="ghost"
              size="icon"
              className="ui-app-shell__mobile-close"
              aria-label="Close navigation"
              onClick={closeMobile}
            >
              <ui.icons.X />
            </ui.Button>
            {sidebarContent(false)}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

import {
  AppShell,
  EmptyState,
  findActiveNavItem,
  PageLayout,
  RouteErrorBoundary,
  Separator,
  useUiAdapter,
} from "@lynxland/uikit-surfaces";
import {
  createRootRoute,
  type ErrorComponentProps,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { Menu, PanelLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { CommandPaletteProvider } from "@/components/command-palette";
import { DokploySidebarFooter, DokploySidebarHeader } from "@/components/dokploy-sidebar";
import { DokployCard } from "@/components/page-card";
import { ShellBreadcrumb } from "@/components/shell-breadcrumb";
import { isExternalNav, nav } from "@/lib/nav";

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: RootError,
  notFoundComponent: RootNotFound,
});

function ServerTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const time = now.toISOString().slice(11, 19);
  return (
    <div
      className="hidden shrink-0 items-center gap-2 text-xs text-muted-foreground md:flex"
      data-testid="server-time"
    >
      <span>
        Server Time: <span className="font-mono tabular-nums text-foreground">{time}</span> UTC
      </span>
      <span aria-hidden="true" className="text-muted-foreground/50">
        |
      </span>
      <span className="font-mono tabular-nums">UTC+00:00</span>
    </div>
  );
}

function RootLayout() {
  const ui = useUiAdapter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const activeItem = findActiveNavItem(nav, pathname);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <CommandPaletteProvider>
      <AppShell
        className="dokploy-shell"
        variant="floating"
        sidebarWidth="16rem"
        collapsedMode="icon"
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        sidebarHeader={<DokploySidebarHeader />}
        sidebarFooter={<DokploySidebarFooter />}
        nav={nav}
        renderLink={(item) =>
          isExternalNav(item.to) ? (
            <a href={item.to} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate">
              {item.label}
            </a>
          ) : (
            <Link
              to={item.to as never}
              aria-current={item === activeItem ? "page" : undefined}
              className="min-w-0 flex-1 truncate"
            >
              {item.label}
            </Link>
          )
        }
        activePath={pathname}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        header={
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex shrink-0 md:hidden">
              <ui.Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Open navigation"
                aria-expanded={mobileOpen}
                data-testid="mobile-menu-toggle"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={16} aria-hidden="true" />
              </ui.Button>
            </div>
            <div className="hidden shrink-0 md:flex">
              <ui.Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                data-testid="sidebar-toggle"
                onClick={() => setCollapsed((current) => !current)}
              >
                <PanelLeft size={16} aria-hidden="true" />
              </ui.Button>
            </div>
            <Separator orientation="vertical" className="h-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <ShellBreadcrumb />
            </div>
            <ServerTime />
          </div>
        }
      >
        <Outlet />
      </AppShell>
    </CommandPaletteProvider>
  );
}

function RootError({ error, reset }: ErrorComponentProps) {
  return <RouteErrorBoundary error={error} reset={reset} />;
}

function RootNotFound() {
  const ui = useUiAdapter();
  return (
    <DokployCard>
      <PageLayout width="flow" title="Page not found">
        <EmptyState
          title="Page not found"
          description="This route does not exist in the Dokploy clone."
          action={
            <ui.Button asChild variant="outline" size="sm">
              <Link to="/dashboard/home">Back to home</Link>
            </ui.Button>
          }
        />
      </PageLayout>
    </DokployCard>
  );
}

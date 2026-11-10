import { useCollection } from "@lynxland/uikit-react";
import { useUiAdapter } from "@lynxland/uikit-surfaces";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Folder, Globe, X } from "lucide-react";
import type { ReactNode } from "react";
import {
  environmentId,
  environmentOf,
  environmentsFor,
  projectsEntity,
  type Service,
  servicesEntity,
} from "@/lib/dokploy";
import { navDestinations } from "@/lib/nav";
import { BrandMark } from "./brand-mark";

function labelForPath(pathname: string): string {
  const destination = navDestinations.find((item) => item.to === pathname);
  if (destination !== undefined) return destination.label;
  const leaf = pathname.split("/").filter(Boolean).at(-1) ?? "Dashboard";
  return leaf.charAt(0).toUpperCase() + leaf.slice(1).replace(/-/g, " ");
}

interface CrumbMenuProps {
  label: ReactNode;
  items: readonly { label: string; onSelect: () => void }[];
  ariaLabel: string;
  icon?: ReactNode;
  testId?: string;
}

function CrumbMenu({ label, items, ariaLabel, icon, testId }: CrumbMenuProps) {
  const ui = useUiAdapter();
  return (
    <ui.Menu
      aria-label={ariaLabel}
      align="start"
      side="bottom"
      trigger={
        <ui.Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 max-w-64 gap-1.5 px-1.5 text-xs font-normal text-muted-foreground hover:text-foreground"
          aria-label={ariaLabel}
          {...(testId !== undefined ? { "data-testid": testId } : {})}
        >
          {icon}
          <span className="truncate">{label}</span>
          <ChevronDown size={12} className="shrink-0 opacity-70" aria-hidden="true" />
        </ui.Button>
      }
      items={items}
    />
  );
}

function CrumbText({ children, current = false }: { children: ReactNode; current?: boolean }) {
  return (
    <span className={current ? "ui-breadcrumb__current" : "ui-breadcrumb__link"}>{children}</span>
  );
}

function ServiceIcon({ kind }: { kind: Service["kind"] }) {
  switch (kind) {
    case "postgres":
      return <BrandMark provider="postgresql" className="size-3.5 shrink-0 text-[#4169e1]" />;
    case "redis":
      return <BrandMark provider="redis" className="size-3.5 shrink-0 text-[#dc382d]" />;
    case "compose":
      return <BrandMark provider="docker" className="size-3.5 shrink-0 text-sky-400" />;
    default:
      return <Globe size={14} className="shrink-0" aria-hidden="true" />;
  }
}

function serviceTarget(service: Service): { to: string; params: Record<string, string> } {
  const base = "/dashboard/project/$projectId/environment/$environmentId/services";
  const params = {
    projectId: service.projectId,
    environmentId: service.environmentId,
  };
  if (service.kind === "postgres") {
    return {
      to: `${base}/postgres/$serviceId`,
      params: { ...params, serviceId: service.id },
    };
  }
  if (service.kind === "redis") {
    return {
      to: `${base}/redis/$serviceId`,
      params: { ...params, serviceId: service.id },
    };
  }
  if (service.kind === "compose") {
    return {
      to: `${base}/compose/$serviceId`,
      params: { ...params, serviceId: service.id },
    };
  }
  return {
    to: `${base}/application/$applicationId`,
    params: { ...params, applicationId: service.id },
  };
}

/**
 * Shell-owned breadcrumb. Projects/environments/services are dropdowns, as in
 * the official Dokploy header; the root header is still the single renderer.
 */
export function ShellBreadcrumb() {
  const ui = useUiAdapter();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const projects = useCollection(projectsEntity.collection!, { window: { kind: "all" } });
  const services = useCollection(servicesEntity.collection!, { window: { kind: "all" } });

  const segments = pathname.split("/").filter(Boolean);

  if (pathname.startsWith("/dashboard/project/") && segments.length >= 5) {
    const projectId = segments[2] ?? "";
    const envId = segments[4] ?? "";
    const appId = segments[7];
    const project = projects.rows.find((item) => item.id === projectId);
    const projectName = project?.name ?? projectId;
    const environment = environmentOf(envId);
    const environmentName = environment ? environment.name : envId;
    const app = appId !== undefined ? services.rows.find((item) => item.id === appId) : undefined;
    const envServices = services.rows.filter(
      (item) => item.projectId === projectId && item.environmentId === envId,
    );

    return (
      <nav aria-label="Breadcrumb" className="ui-breadcrumb min-w-0">
        <ol className="ui-breadcrumb__list min-w-0">
          <li className="ui-breadcrumb__item min-w-0">
            <CrumbMenu
              ariaLabel="Switch project"
              label={projectName}
              icon={<Folder size={14} className="shrink-0" aria-hidden="true" />}
              testId="breadcrumb-project"
              items={projects.rows.map((item) => ({
                label: item.name,
                onSelect: () => {
                  void navigate({
                    to: "/dashboard/project/$projectId/environment/$environmentId",
                    params: {
                      projectId: item.id,
                      environmentId: environmentId(item.id, "production"),
                    },
                  });
                },
              }))}
            />
          </li>
          <li className="ui-breadcrumb__item min-w-0">
            <CrumbMenu
              ariaLabel="Switch environment"
              label={environmentName}
              testId="breadcrumb-environment"
              items={environmentsFor(projectId).map((item) => ({
                label: item.name.charAt(0).toUpperCase() + item.name.slice(1),
                onSelect: () => {
                  void navigate({
                    to: "/dashboard/project/$projectId/environment/$environmentId",
                    params: { projectId, environmentId: item.id },
                  });
                },
              }))}
            />
          </li>
          {appId !== undefined ? (
            <li className="ui-breadcrumb__item min-w-0">
              {app !== undefined ? (
                <CrumbMenu
                  ariaLabel="Switch service"
                  label={app.name}
                  icon={<ServiceIcon kind={app.kind} />}
                  testId="breadcrumb-service"
                  items={envServices.map((item) => ({
                    label: item.name,
                    onSelect: () => {
                      const target = serviceTarget(item);
                      void navigate({ to: target.to as never, params: target.params as never });
                    },
                  }))}
                />
              ) : (
                <CrumbText current>{appId === "new" ? "New application" : appId}</CrumbText>
              )}
              <ui.Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-0.5 size-6 text-muted-foreground"
                aria-label="Close service"
                onClick={() => {
                  void navigate({
                    to: "/dashboard/project/$projectId/environment/$environmentId",
                    params: { projectId, environmentId: envId },
                  });
                }}
                data-testid="breadcrumb-close-service"
              >
                <X size={13} aria-hidden="true" />
              </ui.Button>
            </li>
          ) : null}
        </ol>
      </nav>
    );
  }

  if (pathname.startsWith("/dashboard/settings/")) {
    return (
      <nav aria-label="Breadcrumb" className="ui-breadcrumb">
        <ol className="ui-breadcrumb__list">
          <li className="ui-breadcrumb__item">
            <span className="ui-breadcrumb__current">{labelForPath(pathname)}</span>
          </li>
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="ui-breadcrumb">
      <ol className="ui-breadcrumb__list">
        <li className="ui-breadcrumb__item">
          <span className="ui-breadcrumb__current">{labelForPath(pathname)}</span>
        </li>
      </ol>
    </nav>
  );
}

import { useCollection, useRecord } from "@lynxland/uikit-react";
import {
  CommandMenu,
  CopyButton,
  EmptyState,
  ErrorState,
  LoadingState,
  PageLayout,
  RelativeTime,
  StatusDot,
  useSelection,
  useUiAdapter,
} from "@lynxland/uikit-surfaces";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, FolderInput, Globe, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { DokployCard } from "@/components/page-card";
import {
  environmentOf,
  environmentsFor,
  projectsEntity,
  type Service,
  serversEntity,
  servicesEntity,
} from "@/lib/dokploy";
import { CreateApplicationDialog } from "./forms";
import { serviceStatusTone } from "./shared";

type ServiceSort =
  | "lastDeploy-desc"
  | "createdAt-desc"
  | "createdAt-asc"
  | "name-asc"
  | "name-desc"
  | "type-asc";

type ServiceTypeFilter = "all" | "application" | "database" | "compose";

const SORT_OPTIONS = [
  { value: "lastDeploy-desc", label: "Recently deployed" },
  { value: "createdAt-desc", label: "Newest first" },
  { value: "createdAt-asc", label: "Oldest first" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "type-asc", label: "Type (A-Z)" },
] as const;

const TYPE_OPTIONS = [
  { value: "all", label: "Select types..." },
  { value: "application", label: "Applications" },
  { value: "database", label: "Databases" },
  { value: "compose", label: "Compose" },
] as const;

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function kindIcon(service: Service) {
  switch (service.kind) {
    case "application":
      return <Globe size={20} aria-hidden />;
    case "postgres":
      return <BrandMark provider="postgresql" className="size-5 text-[#4169e1]" />;
    case "redis":
      return <BrandMark provider="redis" className="size-5 text-[#dc382d]" />;
    case "compose":
      return <BrandMark provider="docker" className="size-5 text-sky-400" />;
  }
}

function sortServices(services: readonly Service[], sort: ServiceSort): Service[] {
  return [...services].sort((a, b) => {
    switch (sort) {
      case "createdAt-desc":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "createdAt-asc":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "type-asc":
        return a.kind.localeCompare(b.kind);
      default:
        return (
          new Date(b.lastDeployAt ?? b.createdAt).getTime() -
          new Date(a.lastDeployAt ?? a.createdAt).getTime()
        );
    }
  });
}

function serviceTarget(service: Service): { to: string; params: Record<string, string> } {
  const base = "/dashboard/project/$projectId/environment/$environmentId/services";
  const params = {
    projectId: service.projectId,
    environmentId: service.environmentId,
  };
  if (service.kind === "postgres") {
    return { to: `${base}/postgres/$serviceId`, params: { ...params, serviceId: service.id } };
  }
  if (service.kind === "redis") {
    return { to: `${base}/redis/$serviceId`, params: { ...params, serviceId: service.id } };
  }
  if (service.kind === "compose") {
    return { to: `${base}/compose/$serviceId`, params: { ...params, serviceId: service.id } };
  }
  return {
    to: `${base}/application/$applicationId`,
    params: { ...params, applicationId: service.id },
  };
}

function ServiceCard({
  service,
  selected,
  onToggle,
}: {
  service: Service;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const ui = useUiAdapter();
  const navigate = useNavigate();
  const target = serviceTarget(service);
  const open = () => {
    void navigate({ to: target.to as never, params: target.params as never });
  };

  return (
    <article
      className={`group relative flex min-h-[7.25rem] flex-col rounded-xl border bg-transparent p-4 text-left transition-colors ${
        selected
          ? "border-[var(--ring)] bg-[var(--border)]/30"
          : "border-[var(--border)] hover:bg-[var(--border)]/30"
      }`}
      data-testid={`service-card-${service.id}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      }}
      onClick={(event) => {
        if (event.target instanceof HTMLElement && event.target.closest("[data-checkbox]")) return;
        open();
      }}
    >
      <StatusDot
        tone={serviceStatusTone(service.status)}
        label={`Status: ${service.status}`}
        className="absolute -right-1 -top-1 ring-2 ring-[var(--background)] [--ui-status-dot-size:0.625rem]"
      />
      <div className="flex items-start gap-3">
        <div className="pt-0.5 opacity-0 transition-opacity group-hover:opacity-100" data-checkbox>
          <ui.Checkbox
            checked={selected}
            onCheckedChange={() => onToggle(service.id)}
            aria-label={`Select ${service.name}`}
          />
        </div>
        <Link
          to={target.to as never}
          params={target.params as never}
          className="min-w-0 flex-1 truncate text-sm font-medium leading-tight hover:text-primary"
          data-testid={`service-open-${service.id}`}
        >
          {service.name}
        </Link>
        <span className="shrink-0 text-muted-foreground">{kindIcon(service)}</span>
      </div>

      <div className="mt-auto flex items-center gap-1 pt-4 text-xs text-muted-foreground">
        <span>
          Created <RelativeTime locale="en" format="distance" value={service.createdAt} />
        </span>
      </div>
    </article>
  );
}

export function DokployProjectEnvironmentPage({
  projectId,
  environmentId,
}: {
  projectId: string;
  environmentId: string;
}) {
  const ui = useUiAdapter();
  const navigate = useNavigate();
  const project = useRecord(projectsEntity.record!, projectId);
  const environment = environmentOf(environmentId);
  const services = useCollection(servicesEntity.collection!, {
    where: {
      all: [
        { field: "projectId", op: "eq", value: projectId },
        { field: "environmentId", op: "eq", value: environmentId },
      ],
    },
    window: { kind: "all" },
  });
  const servers = useCollection(serversEntity.collection!, { window: { kind: "all" } });

  const [createOpen, setCreateOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [environmentOpen, setEnvironmentOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ServiceSort>("lastDeploy-desc");
  const [typeFilter, setTypeFilter] = useState<ServiceTypeFilter>("all");
  const [serverFilter, setServerFilter] = useState("all");

  const environments = environmentsFor(projectId);
  const filtered = useMemo(() => {
    const matches = services.rows.filter((service) => {
      const matchesQuery =
        query.trim() === "" ||
        `${service.name} ${service.description}`.toLowerCase().includes(query.trim().toLowerCase());
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "database"
          ? service.kind === "postgres" || service.kind === "redis"
          : service.kind === typeFilter);
      const matchesServer = serverFilter === "all" || service.serverId === serverFilter;
      return matchesQuery && matchesType && matchesServer;
    });
    return sortServices(matches, sort);
  }, [services.rows, query, sort, typeFilter, serverFilter]);

  const selection = useSelection<string>({
    ids: filtered.map((service) => service.id),
  });

  const pending = services.status === "loading" || services.status === "idle";

  if (project.status === "loading" || project.status === "idle") {
    return (
      <DokployCard>
        <PageLayout width="flow" title="Project">
          <LoadingState rows={4} label="Loading project" />
        </PageLayout>
      </DokployCard>
    );
  }

  if (project.status === "error") {
    return (
      <DokployCard>
        <PageLayout width="flow" title="Project">
          <ErrorState error={project.error} onRetry={project.refetch} />
        </PageLayout>
      </DokployCard>
    );
  }

  if (
    project.data === undefined ||
    environment === undefined ||
    environment.projectId !== projectId
  ) {
    return (
      <DokployCard>
        <PageLayout width="flow" title="Environment not found">
          <EmptyState
            title="Environment not found"
            description={`No environment exists with id ${environmentId} in project ${projectId}.`}
            action={
              <ui.Button asChild variant="outline" size="sm">
                <Link to="/dashboard/projects">Back to projects</Link>
              </ui.Button>
            }
          />
        </PageLayout>
      </DokployCard>
    );
  }

  const row = project.data;

  return (
    <DokployCard>
      <PageLayout
        width="flow"
        titleSize="lg"
        headerDivider
        icon={<FolderInput className="size-5 text-muted-foreground" aria-hidden />}
        title={
          <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate">{row.name}</span>
            <span className="text-muted-foreground">/</span>
            <CommandMenu
              open={switcherOpen}
              onOpenChange={setSwitcherOpen}
              aria-label="Switch environment"
              placeholder="Search environments…"
              emptyText="No environments found."
              align="start"
              trigger={
                <ui.Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-1 text-base font-medium text-muted-foreground hover:text-foreground"
                  data-testid="environment-switcher"
                >
                  {environment.name}
                  <ChevronDown size={13} aria-hidden />
                </ui.Button>
              }
              items={environments.map((item) => ({
                id: item.id,
                label: titleCase(item.name),
                keywords: [item.branch, item.id],
                checked: item.id === environment.id,
                onSelect: () => {
                  void navigate({
                    to: "/dashboard/project/$projectId/environment/$environmentId",
                    params: { projectId, environmentId: item.id },
                  });
                },
              }))}
            />
            <CopyButton value={row.id} label="Copy project id" size="icon" />
          </span>
        }
        description={`${titleCase(environment.name)} environment`}
        actions={
          <>
            <ui.Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEnvironmentOpen(true)}
            >
              Project Environment
            </ui.Button>
            <ui.Button
              type="button"
              size="sm"
              onClick={() => setCreateOpen(true)}
              data-testid="create-application"
            >
              <Plus size={13} aria-hidden /> Create Service
            </ui.Button>
          </>
        }
      >
        <div className="flex flex-col items-stretch gap-3 xl:flex-row xl:items-center">
          <div className="flex shrink-0 items-center gap-2">
            <ui.Checkbox
              checked={
                selection.allSelected ? true : selection.someSelected ? "indeterminate" : false
              }
              onCheckedChange={(checked) => {
                if (checked === true) selection.selectAll();
                else selection.clear();
              }}
              aria-label="Select all services"
            />
            <span className="text-xs text-muted-foreground">Select All</span>
            <ui.Menu
              aria-label="Bulk actions"
              align="start"
              trigger={
                <ui.Button type="button" size="sm" variant="outline" className="ml-2">
                  Bulk Actions
                </ui.Button>
              }
              items={[
                {
                  label: "Select all visible",
                  onSelect: () => selection.selectAll(),
                },
                {
                  label: "Clear selection",
                  disabled: selection.selected.size === 0,
                  onSelect: () => selection.clear(),
                },
                {
                  label:
                    selection.selected.size === 0
                      ? "Delete selected (select services)"
                      : `Delete ${selection.selected.size} selected (demo)`,
                  disabled: true,
                  separator: true,
                },
              ]}
            />
          </div>

          <div className="relative min-w-0 flex-1">
            <ui.Input
              aria-label="Filter services"
              className="w-full pr-9"
              value={query}
              placeholder="Filter services..."
              onChange={(event) => setQuery(event.target.value)}
              data-testid="service-search"
            />
            <Search
              className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
          </div>

          <div className="grid shrink-0 grid-cols-3 gap-2">
            <ui.Select
              aria-label="Sort services"
              className="w-full min-w-32"
              value={sort}
              options={SORT_OPTIONS.map((item) => ({ ...item }))}
              onValueChange={(value) => setSort(value as ServiceSort)}
            />
            <ui.Select
              aria-label="Filter by type"
              className="w-full min-w-32"
              value={typeFilter}
              options={TYPE_OPTIONS.map((item) => ({ ...item }))}
              onValueChange={(value) => setTypeFilter(value as ServiceTypeFilter)}
            />
            <ui.Select
              aria-label="Filter by server"
              className="w-full min-w-32"
              value={serverFilter}
              options={[
                { value: "all", label: "All servers" },
                ...servers.rows.map((server) => ({ value: server.id, label: server.name })),
              ]}
              onValueChange={setServerFilter}
            />
          </div>
        </div>

        {services.status === "error" ? (
          <ErrorState error={services.error} onRetry={services.refetch} />
        ) : pending ? (
          <LoadingState rows={5} label="Loading services" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No services found"
            description="Create a service in this environment or adjust the filters."
            action={
              <ui.Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={13} aria-hidden /> Create Service
              </ui.Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                selected={selection.isSelected(service.id)}
                onToggle={selection.toggle}
              />
            ))}
          </div>
        )}
      </PageLayout>

      <ui.Dialog
        open={environmentOpen}
        onOpenChange={setEnvironmentOpen}
        title="Project Environment"
        description={`${row.name} / ${environment.name}`}
        size="sm"
        footer={
          <ui.Button type="button" variant="outline" onClick={() => setEnvironmentOpen(false)}>
            Close
          </ui.Button>
        }
      >
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Branch</dt>
            <dd className="font-mono text-xs">{environment.branch}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Services</dt>
            <dd>{services.rows.length}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Environment ID</dt>
            <dd className="font-mono text-xs">{environment.id}</dd>
          </div>
        </dl>
      </ui.Dialog>

      {createOpen ? (
        <CreateApplicationDialog
          open
          onOpenChange={setCreateOpen}
          projectId={projectId}
          environmentId={environmentId}
          servers={servers.rows}
          onCreated={(service) => {
            void navigate({
              to: "/dashboard/project/$projectId/environment/$environmentId/services/application/$applicationId",
              params: {
                projectId,
                environmentId,
                applicationId: service.id,
              },
            });
          }}
        />
      ) : null}
    </DokployCard>
  );
}

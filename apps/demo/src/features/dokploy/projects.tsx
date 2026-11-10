import { useCollection } from "@lynxland/uikit-react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageLayout,
  RelativeTime,
  useUiAdapter,
} from "@lynxland/uikit-surfaces";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowUpDown, Folder, MoreHorizontal, Plus, Search, Tags } from "lucide-react";
import { useMemo, useState } from "react";
import { DokployCard } from "@/components/page-card";
import {
  deleteProject,
  environmentId,
  type Project,
  projectsEntity,
  servicesEntity,
} from "@/lib/dokploy";
import { CreateProjectDialog } from "./forms";
import { DeleteCommandDialog } from "./shared";

export const PROJECT_SORT_OPTIONS = [
  { value: "createdAt-desc", label: "Newest first" },
  { value: "createdAt-asc", label: "Oldest first" },
  { value: "name-asc", label: "Name (A-Z)" },
  { value: "name-desc", label: "Name (Z-A)" },
  { value: "services-desc", label: "Most services" },
  { value: "services-asc", label: "Least services" },
] as const;

export type ProjectSort = (typeof PROJECT_SORT_OPTIONS)[number]["value"];

export function DokployProjectsPage({ from }: { from: string }) {
  const ui = useUiAdapter();
  const navigate = useNavigate();
  const search = useSearch({ from: from as never, strict: false }) as {
    q?: string;
    tag?: string;
    sort?: ProjectSort;
  };

  const projects = useCollection(projectsEntity.collection!, { window: { kind: "all" } });
  const services = useCollection(servicesEntity.collection!, { window: { kind: "all" } });

  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const query = search.q ?? "";
  const tag = search.tag ?? "";
  const sort = search.sort ?? "createdAt-desc";

  const tags = useMemo(
    () => Array.from(new Set(projects.rows.flatMap((project) => project.tags))).sort(),
    [projects.rows],
  );

  const patchSearch = (patch: Record<string, string | undefined>) => {
    void navigate({
      to: ".",
      search: (previous: Record<string, unknown>) => ({ ...previous, ...patch }),
      replace: true,
    });
  };

  const serviceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const service of services.rows) {
      counts.set(service.projectId, (counts.get(service.projectId) ?? 0) + 1);
    }
    return counts;
  }, [services.rows]);

  const filtered = useMemo(() => {
    const matches = projects.rows.filter((project) => {
      const haystack = `${project.name} ${project.description}`.toLowerCase();
      const matchesQuery = query.trim() === "" || haystack.includes(query.trim().toLowerCase());
      const matchesTag = tag === "" || project.tags.includes(tag);
      return matchesQuery && matchesTag;
    });

    const [field, direction] = sort.split("-");
    return [...matches].sort((a, b) => {
      let comparison = 0;
      if (field === "name") comparison = a.name.localeCompare(b.name);
      else if (field === "services") {
        comparison = (serviceCounts.get(a.id) ?? 0) - (serviceCounts.get(b.id) ?? 0);
      } else {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return direction === "asc" ? comparison : -comparison;
    });
  }, [projects.rows, query, tag, sort, serviceCounts]);

  const loading = projects.status === "loading" || projects.status === "idle";

  return (
    <DokployCard>
      <PageLayout
        width="flow"
        titleSize="lg"
        headerDivider
        icon={<Folder className="size-5 text-muted-foreground" aria-hidden />}
        title="Projects"
        description="Create and manage your projects"
        actions={
          <ui.Button type="button" onClick={() => setCreateOpen(true)} data-testid="create-project">
            <Plus size={14} aria-hidden /> Create Project
          </ui.Button>
        }
      >
        {projects.status === "error" ? (
          <ErrorState error={projects.error} onRetry={projects.refetch} />
        ) : (
          <>
            <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <ui.Input
                  aria-label="Search projects"
                  className="w-full pr-9"
                  value={query}
                  placeholder="Filter projects..."
                  onChange={(event) => patchSearch({ q: event.target.value || undefined })}
                  data-testid="project-search"
                />
                <Search
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ui.Menu
                  aria-label="Filter by tag"
                  align="start"
                  trigger={
                    <ui.Button
                      type="button"
                      variant="outline"
                      className="h-9 gap-1.5"
                      aria-label="Filter by tag"
                      data-testid="project-tag-filter"
                    >
                      <Tags size={14} aria-hidden />
                      Tags
                    </ui.Button>
                  }
                  items={[
                    {
                      kind: "radio",
                      label: "All tags",
                      checked: tag === "",
                      onCheckedChange: () => patchSearch({ tag: undefined }),
                    },
                    ...tags.map((item) => ({
                      kind: "radio" as const,
                      label: item,
                      checked: tag === item,
                      onCheckedChange: () => patchSearch({ tag: item }),
                    })),
                  ]}
                />
                <div className="inline-flex items-center gap-2 text-muted-foreground">
                  <ArrowUpDown size={14} aria-hidden />
                  <ui.Select
                    aria-label="Sort projects"
                    className="w-40"
                    value={sort}
                    options={PROJECT_SORT_OPTIONS.map((item) => ({ ...item }))}
                    onValueChange={(value) =>
                      patchSearch({ sort: value === "createdAt-desc" ? undefined : value })
                    }
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <LoadingState rows={4} label="Loading projects" />
            ) : filtered.length === 0 ? (
              <div className="flex min-h-[50vh] flex-col items-center justify-center">
                <EmptyState
                  icon={<Folder className="size-8" aria-hidden />}
                  title="No projects found"
                  description="Adjust the search or tag filter."
                  action={
                    <ui.Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        patchSearch({
                          q: undefined,
                          tag: undefined,
                          sort: undefined,
                        })
                      }
                    >
                      Clear filters
                    </ui.Button>
                  }
                />
              </div>
            ) : (
              <div
                className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
                data-testid="project-grid"
              >
                {filtered.map((project) => {
                  const targetEnvironmentId = environmentId(project.id, "production");
                  const count = serviceCounts.get(project.id) ?? 0;
                  return (
                    <article
                      key={project.id}
                      className="group relative flex h-full min-h-[8.5rem] w-full flex-col rounded-xl border border-[var(--border)] bg-transparent p-4 transition-colors hover:bg-[var(--border)]/30"
                      data-testid={`project-card-${project.id}`}
                    >
                      <div className="flex items-start gap-2">
                        <Folder
                          size={16}
                          className="mt-0.5 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <Link
                          to="/dashboard/project/$projectId/environment/$environmentId"
                          params={{
                            projectId: project.id,
                            environmentId: targetEnvironmentId,
                          }}
                          className="min-w-0 flex-1 truncate text-sm font-medium leading-tight hover:text-primary"
                          data-testid={`project-open-${project.id}`}
                        >
                          {project.name}
                        </Link>
                        <ui.Menu
                          aria-label={`Actions for ${project.name}`}
                          align="end"
                          trigger={
                            <ui.Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="-mr-1 -mt-1 size-7 shrink-0"
                              aria-label={`Actions for ${project.name}`}
                              data-testid={`project-actions-${project.id}`}
                            >
                              <MoreHorizontal size={15} aria-hidden />
                            </ui.Button>
                          }
                          items={[
                            {
                              label: "Open project",
                              onSelect: () =>
                                void navigate({
                                  to: "/dashboard/project/$projectId/environment/$environmentId",
                                  params: {
                                    projectId: project.id,
                                    environmentId: targetEnvironmentId,
                                  },
                                }),
                            },
                            {
                              label: "New application",
                              onSelect: () =>
                                void navigate({
                                  to: "/dashboard/project/$projectId/environment/$environmentId/services/application/new",
                                  params: {
                                    projectId: project.id,
                                    environmentId: targetEnvironmentId,
                                  },
                                }),
                            },
                            {
                              label: "Delete project",
                              danger: true,
                              separator: true,
                              onSelect: () => setDeleting(project),
                            },
                          ]}
                        />
                      </div>

                      <p className="mt-2 line-clamp-2 min-h-9 text-sm text-muted-foreground">
                        {project.description}
                      </p>

                      <div className="mt-auto flex items-center justify-between gap-2 pt-5 text-xs text-muted-foreground">
                        <span>
                          Created{" "}
                          <RelativeTime locale="en" format="distance" value={project.createdAt} />
                        </span>
                        <span>
                          {count} {count === 1 ? "service" : "services"}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </PageLayout>

      {createOpen ? <CreateProjectDialog open onOpenChange={setCreateOpen} /> : null}

      {deleting !== null ? (
        <DeleteCommandDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleting(null);
          }}
          title={`Delete ${deleting.name}?`}
          description="This removes its environments, services, deployments, domains and environment variables. This cannot be undone."
          command={deleteProject}
          input={deleting.id}
          entity={projectsEntity.collection}
          entityId={deleting.id}
          confirmLabel="Delete project"
          confirmTestId="confirm-delete-project"
          onDeleted={() => setDeleting(null)}
        />
      ) : null}
    </DokployCard>
  );
}

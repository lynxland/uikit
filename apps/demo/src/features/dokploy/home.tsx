import { useCollection } from "@lynxland/uikit-react";
import {
  ErrorState,
  LoadingState,
  PageLayout,
  RelativeTime,
  StatCard,
  StatusDot,
  type StatusTone,
  useUiAdapter,
} from "@lynxland/uikit-surfaces";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Rocket, Server } from "lucide-react";
import { DokployCard } from "@/components/page-card";
import {
  type Deployment,
  deploymentsEntity,
  projectsEntity,
  serviceOf,
  servicesEntity,
} from "@/lib/dokploy";
import { DEPLOYMENT_STATUS_TONES } from "./shared";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function HomeStat({
  label,
  value,
  delta,
  to,
}: {
  label: string;
  value: string | number;
  delta: string;
  to?: string;
}) {
  return (
    <StatCard
      label={<span className="uppercase tracking-wider">{label}</span>}
      value={value}
      hint={delta}
      {...(to !== undefined ? { href: to } : {})}
      className="h-full min-h-[140px]"
    />
  );
}

function StatusListCard({
  items,
}: {
  items: readonly { label: string; count: number | string; tone: StatusTone }[];
}) {
  return (
    <div className="flex min-h-[140px] flex-col gap-3 rounded-xl border border-[var(--border)] bg-background p-5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">Status</span>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5 text-sm">
            <StatusDot tone={item.tone} />
            <span className="w-8 font-semibold tabular-nums">{item.count}</span>
            <span className="text-muted-foreground">{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function statusLabel(status: Deployment["status"]): string {
  switch (status) {
    case "success":
      return "done";
    case "failed":
      return "error";
    default:
      return status;
  }
}

function RecentDeploymentRow({
  deployment,
  projectName,
}: {
  deployment: Deployment;
  projectName: string;
}) {
  const service = serviceOf(deployment.serviceId);
  const content = (
    <>
      <StatusDot
        tone={DEPLOYMENT_STATUS_TONES[deployment.status] ?? "neutral"}
        label={statusLabel(deployment.status)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm">{deployment.serviceName}</span>
        <span className="truncate text-xs text-muted-foreground">
          {projectName} · {deployment.environment}
        </span>
      </div>
      <span className="hidden w-36 items-center justify-end gap-1.5 truncate text-xs text-muted-foreground lg:flex">
        <Server className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{deployment.server}</span>
      </span>
      <span className="hidden w-20 text-right text-xs text-muted-foreground sm:inline">
        {statusLabel(deployment.status)}
      </span>
      <span className="hidden w-24 text-right text-xs text-muted-foreground md:inline">
        <RelativeTime locale="en" format="distance" value={deployment.startedAt} />
      </span>
      <span className="text-xs text-muted-foreground">logs →</span>
    </>
  );

  if (service?.kind !== "application") {
    return <div className="flex items-center gap-4 px-5 py-3.5">{content}</div>;
  }

  return (
    <Link
      to="/dashboard/project/$projectId/environment/$environmentId/services/application/$applicationId"
      params={{
        projectId: deployment.projectId,
        environmentId: service.environmentId,
        applicationId: service.id,
      }}
      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40"
      data-testid={`recent-deployment-${deployment.id}`}
    >
      {content}
    </Link>
  );
}

export function DokployHomePage() {
  const ui = useUiAdapter();
  const projects = useCollection(projectsEntity.collection!, { window: { kind: "all" } });
  const services = useCollection(servicesEntity.collection!, { window: { kind: "all" } });
  const deployments = useCollection(deploymentsEntity.collection!, {
    window: { kind: "all" },
    order: [{ field: "startedAt", dir: "desc" }],
  });

  const pending =
    projects.status === "idle" ||
    projects.status === "loading" ||
    services.status === "idle" ||
    services.status === "loading" ||
    deployments.status === "idle" ||
    deployments.status === "loading";

  const error = [projects, services, deployments].find((item) => item.status === "error");

  const applications = services.rows.filter((service) => service.kind === "application");
  const compose = services.rows.filter((service) => service.kind === "compose");
  const databases = services.rows.filter(
    (service) => service.kind === "postgres" || service.kind === "redis",
  );
  const status = {
    running: services.rows.filter((service) => service.status === "running").length,
    error: services.rows.filter((service) => service.status === "error").length,
    idle: services.rows.filter(
      (service) => service.status !== "running" && service.status !== "error",
    ).length,
  };

  const now = Date.now();
  const lastWeek = deployments.rows.filter(
    (deployment) => new Date(deployment.startedAt).getTime() >= now - WEEK_MS,
  ).length;
  const priorWeek = deployments.rows.filter((deployment) => {
    const at = new Date(deployment.startedAt).getTime();
    return at < now - WEEK_MS && at >= now - 2 * WEEK_MS;
  }).length;
  const deployDelta =
    priorWeek > 0
      ? `${lastWeek - priorWeek >= 0 ? "+" : ""}${Math.round(((lastWeek - priorWeek) / priorWeek) * 100)}% vs prev 7d`
      : lastWeek > 0
        ? "no prior data"
        : "no activity yet";

  const recent = deployments.rows.slice(0, 10);
  const stat = (value: number): string | number => (pending ? "…" : value);

  return (
    <DokployCard>
      <PageLayout
        width="flow"
        className="gap-6"
        titleSize="xl"
        title="Welcome back"
        actions={
          <ui.Button asChild className="w-fit">
            <Link to="/dashboard/projects">
              Go to projects <ArrowRight className="size-4" aria-hidden />
            </Link>
          </ui.Button>
        }
      >
        {error !== undefined ? (
          <ErrorState
            error={error.error}
            onRetry={() => {
              projects.refetch();
              services.refetch();
              deployments.refetch();
            }}
          />
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HomeStat
            label="Projects"
            value={stat(projects.rows.length)}
            delta={`${projects.rows.length * 2} environments`}
            to="/dashboard/projects"
          />
          <HomeStat
            label="Services"
            value={stat(services.rows.length)}
            delta={`${applications.length} apps · ${compose.length} compose · ${databases.length} db`}
          />
          <HomeStat label="Deploys / 7d" value={stat(lastWeek)} delta={deployDelta} />
          <StatusListCard
            items={[
              {
                label: "running",
                count: stat(status.running),
                tone: "success",
              },
              {
                label: "errored",
                count: stat(status.error),
                tone: "danger",
              },
              {
                label: "idle",
                count: stat(status.idle),
                tone: "neutral",
              },
            ]}
          />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-background">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Rocket className="size-4 text-muted-foreground" aria-hidden />
              <h2 className="text-sm font-semibold">Recent deployments</h2>
            </div>
            <Link
              to="/dashboard/deployments"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              view all →
            </Link>
          </div>
          {pending ? (
            <LoadingState rows={4} label="Loading recent deployments" />
          ) : recent.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-10 text-center text-sm text-muted-foreground">
              <Rocket className="size-8 opacity-40" aria-hidden />
              <span>No deployments yet.</span>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]" data-testid="recent-deployments">
              {recent.map((deployment) => (
                <li key={deployment.id}>
                  <RecentDeploymentRow
                    deployment={deployment}
                    projectName={
                      projects.rows.find((item) => item.id === deployment.projectId)?.name ??
                      deployment.projectId
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </PageLayout>
    </DokployCard>
  );
}

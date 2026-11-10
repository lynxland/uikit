import { CollectionPage } from "@lynxland/uikit-preset-console";
import { type Column, RelativeTime, StatusBadge, useUiAdapter } from "@lynxland/uikit-surfaces";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { DokployCard } from "@/components/page-card";
import { type Deployment, deploymentsEntity, deploymentsSearch, serviceOf } from "@/lib/dokploy";
import { DEPLOYMENT_STATUS_TONES, DeploymentLogDrawer, formatDuration } from "./shared";

export function DokployDeploymentsPage({ from }: { from: string }) {
  const ui = useUiAdapter();
  const [logs, setLogs] = useState<Deployment | null>(null);

  const columns: readonly Column<Deployment>[] = [
    {
      id: "status",
      header: "Status",
      accessor: (row) => row.status,
      cell: (row) => <StatusBadge status={row.status} map={DEPLOYMENT_STATUS_TONES} />,
      sortField: "status",
    },
    {
      id: "deployment",
      header: "Deployment",
      accessor: (row) => row.id,
      cell: (row) => (
        <div className="min-w-0">
          <div className="font-mono text-xs">{row.id}</div>
          <div className="truncate text-[11px] text-muted-foreground">{row.environment}</div>
        </div>
      ),
    },
    {
      id: "service",
      header: "Service",
      accessor: (row) => row.serviceName,
      cell: (row) => {
        const service = serviceOf(row.serviceId);
        if (service?.kind !== "application") {
          return <span className="text-sm">{row.serviceName}</span>;
        }
        return (
          <Link
            to="/dashboard/project/$projectId/environment/$environmentId/services/application/$applicationId"
            params={{
              projectId: row.projectId,
              environmentId: service.environmentId,
              applicationId: service.id,
            }}
            className="text-sm font-medium hover:text-primary"
          >
            {row.serviceName}
          </Link>
        );
      },
      sortField: "serviceName",
    },
    {
      id: "commit",
      header: "Commit",
      accessor: (row) => row.commit,
      cell: (row) => (
        <div className="max-w-72 min-w-0">
          <div className="font-mono text-xs">{row.commit}</div>
          <div className="truncate text-[11px] text-muted-foreground">{row.commitMessage}</div>
        </div>
      ),
    },
    {
      id: "trigger",
      header: "Trigger",
      accessor: (row) => row.trigger,
      cell: (row) => <span className="text-xs capitalize">{row.trigger}</span>,
    },
    {
      id: "startedAt",
      header: "Started",
      accessor: (row) => row.startedAt,
      sortField: "startedAt",
      cell: (row) => (
        <RelativeTime locale="en" numeric="always" format="long" value={row.startedAt} />
      ),
    },
    {
      id: "duration",
      header: "Duration",
      accessor: (row) => row.durationMs ?? 0,
      cell: (row) => <span className="font-mono text-xs">{formatDuration(row.durationMs)}</span>,
      align: "end",
    },
    {
      id: "logs",
      header: "",
      enableHiding: false,
      cell: (row) => (
        <ui.Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setLogs(row)}
          data-testid={`deploy-row-logs-${row.id}`}
        >
          Logs
        </ui.Button>
      ),
    },
  ];

  return (
    <DokployCard>
      <CollectionPage<Deployment>
        title="Deployments"
        description="Global deployment history across every project. Status and paging live in the URL; the Logs action opens the streamed drawer."
        from={from}
        width="flow"
        source={deploymentsEntity.collection!}
        search={deploymentsSearch}
        columns={columns}
        getRowId={(row) => row.id}
        onRowClick={setLogs}
        empty={{
          title: "No deployments match",
          description: "Clear the status filter or trigger a deploy from a service.",
        }}
      />

      {logs !== null ? (
        <DeploymentLogDrawer deployment={logs} onClose={() => setLogs(null)} />
      ) : null}
    </DokployCard>
  );
}

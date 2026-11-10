import { useRecord } from "@lynxland/uikit-react";
import {
  CopyButton,
  ErrorState,
  LoadingState,
  StatusDot,
  useUiAdapter,
} from "@lynxland/uikit-surfaces";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Globe, Pencil, RefreshCw, Square, Terminal, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { DokployCard } from "@/components/page-card";
import { deleteService, environmentOf, type Service, servicesEntity } from "@/lib/dokploy";
import { EnvironmentTab, LogsTab, MonitoringTab } from "./application-detail";
import { appNameFor, DeleteCommandDialog, DeployButton, serviceStatusTone } from "./shared";

export type ServiceTab = "general" | "environment" | "logs" | "monitoring" | "backups" | "advanced";

export function serviceTabs(
  kind: Service["kind"],
): readonly { value: ServiceTab; label: string }[] {
  const shared: { value: ServiceTab; label: string }[] = [
    { value: "general", label: "General" },
    { value: "environment", label: "Environment" },
    { value: "logs", label: "Logs" },
    { value: "monitoring", label: "Monitoring" },
  ];
  if (kind === "postgres" || kind === "redis") {
    return [
      ...shared,
      { value: "backups", label: "Backups" },
      { value: "advanced", label: "Advanced" },
    ];
  }
  return [...shared, { value: "advanced", label: "Advanced" }];
}

export function serviceTabValidator(kind: Service["kind"]) {
  return (search: Record<string, unknown>): { tab?: ServiceTab } => {
    const tab = search.tab;
    if (typeof tab !== "string") return {};
    return serviceTabs(kind).some((item) => item.value === tab) ? { tab: tab as ServiceTab } : {};
  };
}

function Panel({
  title,
  description,
  actions,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="dokploy-panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {description !== undefined ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions !== undefined ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function kindIcon(kind: Service["kind"]) {
  switch (kind) {
    case "postgres":
      return <BrandMark provider="postgresql" className="size-5 text-[#4169e1]" />;
    case "redis":
      return <BrandMark provider="redis" className="size-5 text-[#dc382d]" />;
    case "compose":
      return <BrandMark provider="docker" className="size-5 text-sky-400" />;
    default:
      return <Globe size={18} aria-hidden />;
  }
}

function serviceHost(service: Service): string {
  return `${service.name}-${service.id.slice(-6)}`;
}

function internalPort(service: Service): number {
  return service.kind === "redis" ? 6379 : 5432;
}

function CredentialField({
  label,
  value,
  masked = false,
  secret = false,
  monospace = true,
  testId,
}: {
  label: string;
  value: string;
  masked?: boolean;
  secret?: boolean;
  monospace?: boolean;
  testId?: string;
}) {
  const ui = useUiAdapter();
  const [revealed, setRevealed] = useState(!secret);
  const shown = revealed ? value : "••••••••••••••••";
  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-xs font-medium">{label}</div>
      <div className="flex min-w-0 items-center gap-1.5">
        <ui.Input
          aria-label={label}
          readOnly
          value={shown}
          className={monospace ? "font-mono text-xs" : undefined}
          data-testid={testId}
        />
        {masked ? (
          <ui.Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 shrink-0"
            aria-label={revealed ? `Hide ${label}` : `Reveal ${label}`}
            onClick={() => setRevealed((current) => !current)}
          >
            {revealed ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
          </ui.Button>
        ) : null}
        <CopyButton value={value} label={`Copy ${label}`} size="icon" className="size-8 shrink-0" />
      </div>
    </div>
  );
}

function CredentialsCard({ service }: { service: Service }) {
  const isRedis = service.kind === "redis";
  const user = isRedis ? "default" : service.name.replace(/[^a-z0-9_]/gi, "_");
  const database = user;
  const password = `dokploy_${service.kind}_${service.id.slice(-8)}`;
  const port = internalPort(service);
  const host = serviceHost(service);
  const internalUrl = `postgresql://${user}:${password}@${host}:${port}/${database}`;

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Internal Credentials">
        <div className="grid gap-4 md:grid-cols-2">
          <CredentialField label="User" value={user} monospace={false} />
          <CredentialField label="Database Name" value={database} monospace={false} />
          <CredentialField
            label="Password"
            value={password}
            masked
            secret
            testId="internal-password"
          />
          <CredentialField label="Internal Port (Container)" value={String(port)} />
          <CredentialField label="Internal Host" value={host} monospace={false} />
          <CredentialField
            label="Internal Connection URL"
            value={isRedis ? `redis://default:${password}@${host}:${port}` : internalUrl}
            masked
            secret
          />
        </div>
      </Panel>

      <Panel
        title="External Credentials"
        description="In order to make the database reachable through the internet, you must set a port and ensure that the port is not being used by another application or database"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <CredentialField label="External Port (Internet)" value="5432" />
          <CredentialField label="External Host" value="31.220.107.5" monospace={false} />
          <CredentialField
            label="External Connection URL"
            value={`postgresql://${user}:${password}@31.220.107.5:5432/${database}`}
            masked
            secret
          />
        </div>
      </Panel>
    </div>
  );
}

function ComposeCard({ service }: { service: Service }) {
  return (
    <Panel
      title="Compose File"
      description={`/etc/dokploy/compose/${service.name}/docker-compose.yml`}
    >
      <pre className="overflow-auto rounded-lg border border-[var(--border)] bg-black/20 p-4 font-mono text-xs leading-relaxed text-foreground/90">
        {`services:
  app:
    image: ghcr.io/${service.projectId.replace("proj-", "")}/${service.name}:latest
    restart: unless-stopped
    ports:
      - "80:3000"
    environment:
      NODE_ENV: production`}
      </pre>
    </Panel>
  );
}

function GeneralTab({ service }: { service: Service }) {
  const ui = useUiAdapter();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Deploy Settings">
        <div className="flex flex-wrap items-center gap-2">
          <DeployButton service={service} variant="default" />
          <ui.Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setMessage("Reload is a demo placeholder.")}
          >
            <RefreshCw size={12} aria-hidden /> Reload
          </ui.Button>
          <ui.Button
            type="button"
            size="sm"
            variant="outline"
            className="border-[var(--status-danger)]/30 text-[var(--status-danger)] hover:bg-[var(--status-danger)]/10 hover:text-[var(--status-danger)]"
            onClick={() => setMessage("Stop is a demo placeholder.")}
          >
            <Square size={12} aria-hidden /> Stop
          </ui.Button>
          <ui.Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setMessage("Open terminal is a demo placeholder.")}
          >
            <Terminal size={12} aria-hidden /> Open Terminal
          </ui.Button>
        </div>
        {message !== null ? (
          <p role="status" className="mt-3 text-xs text-muted-foreground">
            {message}
          </p>
        ) : null}
      </Panel>

      {service.kind === "compose" ? (
        <ComposeCard service={service} />
      ) : (
        <CredentialsCard service={service} />
      )}
    </div>
  );
}

function BackupsTab({ service }: { service: Service }) {
  return (
    <Panel
      title="Backups"
      description={`Scheduled logical backups for ${service.name}.`}
      actions={
        <button
          type="button"
          className="inline-flex h-8 items-center rounded-md border border-[var(--border)] px-3 text-xs"
        >
          Create Backup
        </button>
      }
    >
      <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-muted-foreground">
        No backups yet. Create a backup now or configure a schedule.
      </div>
    </Panel>
  );
}

function AdvancedTab({ service }: { service: Service }) {
  return (
    <Panel title="Advanced" description="Runtime overrides and danger-zone operations.">
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li>
          Service id: <span className="font-mono text-foreground">{service.id}</span>
        </li>
        <li>
          Server: <span className="font-mono text-foreground">{service.serverId}</span>
        </li>
        <li>
          Status: <span className="text-foreground">{service.status}</span>
        </li>
      </ul>
    </Panel>
  );
}

export function DokployServiceDetailPage({
  projectId,
  environmentId,
  serviceId,
  tab,
  onTabChange,
}: {
  projectId: string;
  environmentId: string;
  serviceId: string;
  tab: ServiceTab;
  onTabChange: (tab: ServiceTab) => void;
}) {
  const ui = useUiAdapter();
  const navigate = useNavigate();
  const service = useRecord(servicesEntity.record!, serviceId);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (service.status === "loading" || service.status === "idle") {
    return (
      <DokployCard>
        <div className="p-6">
          <LoadingState rows={5} label="Loading service" />
        </div>
      </DokployCard>
    );
  }

  if (service.status === "error") {
    return (
      <DokployCard>
        <div className="p-6">
          <ErrorState error={service.error} onRetry={service.refetch} />
        </div>
      </DokployCard>
    );
  }

  const row = service.data;
  if (row === undefined) {
    return (
      <DokployCard>
        <div className="p-6 text-sm text-muted-foreground">Service not found.</div>
      </DokployCard>
    );
  }

  const tabs = serviceTabs(row.kind);
  const activeTab = tabs.some((item) => item.value === tab) ? tab : "general";
  const environment = environmentOf(environmentId);

  return (
    <DokployCard>
      <div className="flex flex-col">
        <header className="flex flex-wrap items-start justify-between gap-4 p-6 pb-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="relative inline-flex size-8 shrink-0 items-center justify-center">
              {kindIcon(row.kind)}
              <StatusDot
                tone={serviceStatusTone(row.status)}
                label={`Status: ${row.status}`}
                className="absolute -left-1.5 top-1/2 -translate-y-1/2 ring-2 ring-[var(--background)] [--ui-status-dot-size:0.625rem]"
              />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold leading-tight">{row.name}</h1>
              <p className="mt-1 truncate text-sm text-muted-foreground">{appNameFor(row)}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="rounded-full bg-[var(--foreground)] px-3 py-1 text-xs font-medium text-[var(--background)]">
              Dokploy Server
            </span>
            <div className="flex items-center gap-1">
              <ui.Tooltip
                content="Edit service"
                trigger={
                  <ui.Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    aria-label="Edit service"
                    onClick={() => undefined}
                  >
                    <Pencil size={14} aria-hidden />
                  </ui.Button>
                }
              />
              <ui.Tooltip
                content="Delete service"
                trigger={
                  <ui.Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    aria-label="Delete service"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 size={14} aria-hidden />
                  </ui.Button>
                }
              />
            </div>
          </div>
        </header>

        <div className="border-t border-[var(--border)] px-6 py-4">
          <ui.Tabs
            aria-label="Service sections"
            variant="segmented"
            items={tabs.map((item) => ({ value: item.value, label: item.label }))}
            value={activeTab}
            onValueChange={(value) => onTabChange(value as ServiceTab)}
          />
        </div>

        <div className="px-6 pb-8 pt-2">
          {activeTab === "general" ? <GeneralTab service={row} /> : null}
          {activeTab === "environment" ? <EnvironmentTab service={row} /> : null}
          {activeTab === "logs" ? <LogsTab key={row.id} service={row} /> : null}
          {activeTab === "monitoring" ? <MonitoringTab service={row} /> : null}
          {activeTab === "backups" ? <BackupsTab service={row} /> : null}
          {activeTab === "advanced" ? <AdvancedTab service={row} /> : null}
        </div>
      </div>

      <DeleteCommandDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${row.name}?`}
        description="The service and its data are removed. This cannot be undone."
        command={deleteService}
        input={{ serviceId: row.id }}
        entity={servicesEntity.collection}
        entityId={row.id}
        confirmLabel="Delete service"
        confirmTestId="confirm-delete-service"
        onDeleted={() => {
          void navigate({
            to: "/dashboard/project/$projectId/environment/$environmentId",
            params: { projectId, environmentId: environment?.id ?? environmentId },
          });
        }}
      />
    </DokployCard>
  );
}

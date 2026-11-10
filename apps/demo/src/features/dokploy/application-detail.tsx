import { useCollection, useRecord, useStream } from "@lynxland/uikit-react";
import {
  CopyButton,
  EmptyState,
  ErrorState,
  LoadingState,
  MetricChart,
  type MetricSeries,
  RelativeTime,
  useStreamFrames,
  useStreamState,
  useUiAdapter,
} from "@lynxland/uikit-surfaces";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CircleAlert,
  Columns3,
  Container,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileCode,
  GitBranch,
  Globe,
  Hammer,
  Link2,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  Search,
  Server as ServerIcon,
  Settings,
  Square,
  Terminal,
  Trash2,
  Upload,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { DokployCard } from "@/components/page-card";
import {
  applicationMetrics,
  createDeploymentLogSource,
  type Deployment,
  type DeploymentLogFrame,
  type Domain,
  deleteService,
  deploymentsEntity,
  domainsEntity,
  environmentOf,
  envVarsEntity,
  projectsEntity,
  type Service,
  serverOf,
  serversEntity,
  servicesEntity,
} from "@/lib/dokploy";
import { EditApplicationDrawer } from "./forms";
import {
  appNameFor,
  DeleteCommandDialog,
  DeployButton,
  DeploymentLogDrawer,
  deploymentStatusLabel,
  formatDuration,
  SERVICE_STATUS_DOT,
} from "./shared";

export type ApplicationTab =
  | "general"
  | "environment"
  | "domains"
  | "deployments"
  | "preview-deployments"
  | "schedules"
  | "volume-backups"
  | "logs"
  | "patches"
  | "monitoring"
  | "advanced";

export const APPLICATION_TABS: readonly { value: ApplicationTab; label: string }[] = [
  { value: "general", label: "General" },
  { value: "environment", label: "Environment" },
  { value: "domains", label: "Domains" },
  { value: "deployments", label: "Deployments" },
  { value: "preview-deployments", label: "Preview Deployments" },
  { value: "schedules", label: "Schedules" },
  { value: "volume-backups", label: "Volume Backups" },
  { value: "logs", label: "Logs" },
  { value: "patches", label: "Patches" },
  { value: "monitoring", label: "Monitoring" },
  { value: "advanced", label: "Advanced" },
];

function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`dokploy-panel p-6 ${className ?? ""}`}>
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

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] py-1.5 last:border-b-0">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right text-xs">{children}</dd>
    </div>
  );
}

function FieldLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
      <span>{children}</span>
      {hint}
    </div>
  );
}

function GeneralTab({ service }: { service: Service }) {
  const ui = useUiAdapter();
  const detail = service.application;
  const [autoDeploy, setAutoDeploy] = useState(detail?.autoDeploy ?? true);
  const [cleanCache, setCleanCache] = useState(false);
  const [submodules, setSubmodules] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>(detail?.provider ?? "github");
  const [repo, setRepo] = useState(
    detail === undefined
      ? ""
      : detail.repo.includes("://")
        ? detail.repo
        : `https://github.com/${detail.repo}.git`,
  );
  const [branch, setBranch] = useState(detail?.branch ?? "main");
  const [buildPath, setBuildPath] = useState(detail?.buildPath ?? "/");
  const [watchPath, setWatchPath] = useState("");
  const [watchPaths, setWatchPaths] = useState<string[]>([...(detail?.watchPaths ?? [])]);

  if (detail === undefined) return null;

  const providerTabs = [
    {
      value: "github",
      label: (
        <span className="inline-flex items-center gap-1.5">
          <BrandMark provider="github" className="size-3.5" />
          GitHub
        </span>
      ),
    },
    {
      value: "gitlab",
      label: (
        <span className="inline-flex items-center gap-1.5">
          <BrandMark provider="gitlab" className="size-3.5" />
          GitLab
        </span>
      ),
    },
    {
      value: "bitbucket",
      label: (
        <span className="inline-flex items-center gap-1.5">
          <BrandMark provider="bitbucket" className="size-3.5" />
          Bitbucket
        </span>
      ),
    },
    {
      value: "gitea",
      label: (
        <span className="inline-flex items-center gap-1.5">
          <BrandMark provider="gitea" className="size-3.5" />
          Gitea
        </span>
      ),
    },
    {
      value: "docker",
      label: (
        <span className="inline-flex items-center gap-1.5">
          <Container size={14} />
          Docker
        </span>
      ),
    },
    {
      value: "git",
      label: (
        <span className="inline-flex items-center gap-1.5">
          <GitBranch size={14} />
          Git
        </span>
      ),
    },
    {
      value: "drop",
      label: (
        <span className="inline-flex items-center gap-1.5">
          <Upload size={14} />
          Drop
        </span>
      ),
    },
  ];

  const server = serverOf(service.serverId);

  return (
    <div className="flex flex-col gap-4">
      <Panel title="Deploy Settings">
        <div className="flex flex-wrap items-center gap-2">
          <DeployButton service={service} variant="default" size="sm" />
          <ui.Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setMessage("Reload requested locally — no server command was issued.")}
          >
            <RefreshCw size={13} aria-hidden /> Reload
          </ui.Button>
          <ui.Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setMessage("Rebuild requested locally — no server command was issued.")}
          >
            <Hammer size={13} aria-hidden /> Rebuild
          </ui.Button>
          <ui.Button
            type="button"
            size="sm"
            variant="outline"
            className="border-[var(--status-danger)]/30 bg-[var(--status-danger)]/10 text-[var(--status-danger)] hover:bg-[var(--status-danger)]/20 hover:text-[var(--status-danger)]"
            onClick={() => setMessage("Stop requested locally — no server command was issued.")}
          >
            <Square size={12} aria-hidden /> Stop
          </ui.Button>
          <ui.Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setMessage("Terminal is a placeholder in this demo clone.")}
          >
            <Terminal size={13} aria-hidden /> Open Terminal
          </ui.Button>
          <span className="ml-2 inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm">
            <span>Autodeploy</span>
            <ui.Switch
              checked={autoDeploy}
              onCheckedChange={setAutoDeploy}
              aria-label="Autodeploy"
            />
          </span>
          <span className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-1.5 text-sm">
            <span>Clean Cache</span>
            <ui.Switch
              checked={cleanCache}
              onCheckedChange={setCleanCache}
              aria-label="Clean Cache"
            />
          </span>
        </div>
        {message !== null ? (
          <p role="status" className="mt-3 text-xs text-muted-foreground">
            {message}
          </p>
        ) : null}
      </Panel>

      <Panel
        title="Provider"
        description="Select the source of your code"
        actions={<GitBranch size={18} className="text-muted-foreground" aria-hidden />}
      >
        <ui.Tabs
          aria-label="Git provider"
          variant="underline"
          items={providerTabs}
          value={provider}
          onValueChange={setProvider}
        />

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(12rem,1fr)]">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <FieldLabel>Repository URL</FieldLabel>
              <a
                href={`https://${repo}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <GitBranch size={12} aria-hidden /> View Repository
              </a>
            </div>
            <ui.Input
              aria-label="Repository URL"
              value={repo}
              onChange={(event) => setRepo(event.target.value)}
            />
          </div>
          <div>
            <FieldLabel>SSH Key</FieldLabel>
            <div className="flex items-center gap-2">
              <ui.Select
                aria-label="SSH key"
                value="none"
                onValueChange={() => undefined}
                options={[
                  { value: "none", label: "Select a key" },
                  { value: "hetzer", label: "hetzer" },
                ]}
              />
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-[var(--border)] text-muted-foreground">
                <Link2 size={14} aria-hidden />
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Branch</FieldLabel>
            <ui.Input
              aria-label="Branch"
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Build Path</FieldLabel>
            <ui.Input
              aria-label="Build Path"
              value={buildPath}
              onChange={(event) => setBuildPath(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4">
          <FieldLabel
            hint={
              <span
                className="text-muted-foreground"
                title="Only changes under these paths trigger a deploy"
              >
                <CircleAlert size={12} aria-hidden />
              </span>
            }
          >
            Watch Paths
          </FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <ui.Input
              aria-label="Watch Paths"
              className="flex-1"
              value={watchPath}
              placeholder="Enter a path to watch (e.g., src/**, dist/*.js)"
              onChange={(event) => setWatchPath(event.target.value)}
            />
            <ui.Button
              type="button"
              variant="secondary"
              onClick={() => {
                const next = watchPath.trim();
                if (next === "" || watchPaths.includes(next)) return;
                setWatchPaths((current) => [...current, next]);
                setWatchPath("");
              }}
            >
              Add
            </ui.Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {watchPaths.map((item) => (
              <span
                key={item}
                className="rounded-md border border-[var(--border)] px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <ui.Switch
            checked={submodules}
            onCheckedChange={setSubmodules}
            aria-label="Enable Submodules"
          />
          <span>Enable Submodules</span>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Build" description="How the image is produced on the server.">
          <dl>
            <InfoRow label="Build type">
              <span className="capitalize">{detail.buildType}</span>
            </InfoRow>
            <InfoRow label="Build path">
              <span className="font-mono">{detail.buildPath}</span>
            </InfoRow>
            <InfoRow label="Dockerfile">
              <span className="font-mono">{detail.dockerfile}</span>
            </InfoRow>
            <InfoRow label="Command">
              <span className="font-mono">{detail.command || "—"}</span>
            </InfoRow>
          </dl>
        </Panel>
        <Panel title="Runtime" description="Container limits and health checks.">
          <dl>
            <InfoRow label="Container port">
              <span className="font-mono">{detail.port}</span>
            </InfoRow>
            <InfoRow label="Runtime">
              <span className="capitalize">{detail.runtime}</span>
            </InfoRow>
            <InfoRow label="Replicas">
              <span className="font-mono">{detail.replicas}</span>
            </InfoRow>
            <InfoRow label="Health check">
              <span className="font-mono">{detail.healthcheckPath}</span>
            </InfoRow>
          </dl>
        </Panel>
        <Panel title="Server" description="Where the containers are scheduled.">
          <dl>
            <InfoRow label="Server">
              <span className="inline-flex items-center gap-1">
                <ServerIcon size={12} /> {server?.name ?? service.serverId}
              </span>
            </InfoRow>
            <InfoRow label="Region">{server?.region ?? "—"}</InfoRow>
            <InfoRow label="Host">
              <span className="font-mono">{server?.host ?? "—"}</span>
            </InfoRow>
            <InfoRow label="Last deploy">
              {service.lastDeployAt !== undefined ? (
                <RelativeTime
                  locale="en"
                  numeric="always"
                  format="long"
                  value={service.lastDeployAt}
                />
              ) : (
                "never"
              )}
            </InfoRow>
          </dl>
        </Panel>
      </div>
    </div>
  );
}

function maskEnv(content: string): string {
  return content
    .split("\n")
    .map((line) => "•".repeat(line.length))
    .join("\n");
}

export function EnvironmentTab({ service }: { service: Service }) {
  const ui = useUiAdapter();
  const envVars = useCollection(envVarsEntity.collection!, {
    where: { field: "serviceId", op: "eq", value: service.id },
    window: { kind: "all" },
    order: [{ field: "key", dir: "asc" }],
  });
  const [revealed, setRevealed] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  const initial = useMemo(
    () => envVars.rows.map((row) => `${row.key}=${row.value}`).join("\n"),
    [envVars.rows],
  );
  const content = draft ?? initial;
  const visible = revealed ? content : maskEnv(content);
  const lineCount = Math.max(visible.split("\n").length, 1);
  const numbers = Array.from({ length: lineCount }, (_, index) => String(index + 1)).join("\n");

  useEffect(() => {
    setSaved(false);
  }, [content]);

  return (
    <Panel
      title="Environment Settings"
      description="You can add environment variables to your resource."
      actions={
        <ui.Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={revealed ? "Hide environment variables" : "Reveal environment variables"}
          data-testid="env-reveal"
          onClick={() => setRevealed((current) => !current)}
        >
          {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
        </ui.Button>
      }
    >
      <div className="dokploy-editor">
        <div ref={gutterRef} className="dokploy-editor__gutter" aria-hidden="true">
          {numbers}
        </div>
        <textarea
          className="dokploy-editor__textarea"
          aria-label="Environment variables"
          value={visible}
          readOnly={!revealed}
          spellCheck={false}
          onChange={(event) => {
            setDraft(event.target.value);
            setSaved(false);
          }}
          onScroll={(event) => {
            if (gutterRef.current !== null) {
              gutterRef.current.scrollTop = event.currentTarget.scrollTop;
            }
          }}
        />
      </div>
      <div className="mt-3 flex items-center justify-end gap-3">
        {saved ? (
          <span role="status" className="text-xs text-muted-foreground">
            Saved locally — no command was issued.
          </span>
        ) : null}
        <ui.Button
          type="button"
          size="sm"
          onClick={() => {
            setDraft(content);
            setSaved(true);
          }}
          data-testid="env-save"
        >
          Save
        </ui.Button>
      </div>
    </Panel>
  );
}

function DomainBadge({ children, tone }: { children: ReactNode; tone?: "warning" | "success" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] ${
        tone === "warning"
          ? "border-[var(--status-warning)]/35 text-[var(--status-warning)]"
          : "border-[var(--border)] text-muted-foreground"
      }`}
    >
      {children}
    </span>
  );
}

function DomainsTab({ service }: { service: Service }) {
  const ui = useUiAdapter();
  const domains = useCollection(domainsEntity.collection!, {
    where: { field: "serviceId", op: "eq", value: service.id },
    window: { kind: "all" },
    order: [{ field: "host", dir: "asc" }],
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <Panel
        title="Domains"
        description="Domains are used to access to the application"
        actions={
          <>
            <ui.Button
              type="button"
              size="icon"
              variant="outline"
              className="size-8"
              aria-label="Domain columns"
              onClick={() => setNotice("Column settings are a demo placeholder.")}
            >
              <Columns3 size={14} aria-hidden />
            </ui.Button>
            <ui.Button
              type="button"
              size="sm"
              onClick={() => setAddOpen(true)}
              data-testid="add-domain"
            >
              <Globe size={13} aria-hidden /> Add Domain
            </ui.Button>
          </>
        }
      >
        {domains.status === "loading" || domains.status === "idle" ? (
          <LoadingState rows={2} label="Loading domains" />
        ) : domains.rows.length === 0 ? (
          <EmptyState
            title="No domains"
            description="Attach a domain to route public traffic to this service."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {domains.rows.map((domain) => (
              <DomainCard key={domain.id} domain={domain} onNotice={setNotice} />
            ))}
          </div>
        )}
        {notice !== null ? (
          <p role="status" className="mt-4 text-xs text-muted-foreground">
            {notice}
          </p>
        ) : null}
      </Panel>

      <ui.Dialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Domain"
        description="Domain creation is a placeholder in the strict demo clone."
        size="sm"
        footer={
          <ui.Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
            Close
          </ui.Button>
        }
      >
        <p className="text-sm text-muted-foreground">
          The official dialog asks for host, path, port, HTTPS and certificate provider. No domain
          command is wired in this demo.
        </p>
      </ui.Dialog>
    </>
  );
}

function DomainCard({ domain, onNotice }: { domain: Domain; onNotice: (value: string) => void }) {
  const ui = useUiAdapter();
  return (
    <article className="rounded-xl border border-[var(--border)] p-4">
      <div className="flex items-center gap-1">
        <a
          href={`https://${domain.host}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-[var(--accent)]"
          aria-label={`Open ${domain.host}`}
        >
          <Globe size={14} />
        </a>
        <ui.Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label={`Edit ${domain.host}`}
          onClick={() => onNotice(`Editing ${domain.host} is a placeholder in this clone.`)}
        >
          <Pencil size={13} />
        </ui.Button>
        <CopyButton
          value={domain.host}
          label={`Copy ${domain.host}`}
          size="icon"
          className="size-7"
        />
        <ui.Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${domain.host}`}
          onClick={() => onNotice(`Deleting ${domain.host} is a placeholder in this clone.`)}
        >
          <Trash2 size={13} />
        </ui.Button>
      </div>

      <a
        href={`https://${domain.host}`}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
      >
        {domain.host}
        <ExternalLink size={12} aria-hidden />
      </a>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <DomainBadge>Path: {domain.path}</DomainBadge>
        <DomainBadge>Port: {domain.port}</DomainBadge>
        {domain.https ? <DomainBadge>HTTPS</DomainBadge> : null}
        <DomainBadge>
          Cert: {domain.certificate === "active" ? "letsencrypt" : domain.certificate}
        </DomainBadge>
        <DomainBadge tone="warning">
          <RefreshCw size={10} aria-hidden /> Validate DNS
        </DomainBadge>
      </div>
    </article>
  );
}

function DeploymentsTab({
  service,
  onOpenLogs,
}: {
  service: Service;
  onOpenLogs: (deployment: Deployment) => void;
}) {
  const ui = useUiAdapter();
  const deployments = useCollection(deploymentsEntity.collection!, {
    where: { field: "serviceId", op: "eq", value: service.id },
    window: { kind: "all" },
    order: [{ field: "startedAt", dir: "desc" }],
  });
  const [message, setMessage] = useState<string | null>(null);
  const webhookUrl = useMemo(
    () => `${typeof window === "undefined" ? "" : window.location.origin}/api/deploy/${service.id}`,
    [service.id],
  );
  const rows = deployments.rows.slice(0, 10);

  return (
    <Panel
      title="Deployments"
      description="See the last 10 deployments for this application"
      actions={
        <>
          <ui.Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setMessage("Clear deployments is a local placeholder.")}
          >
            Clear deployments <Wrench size={13} aria-hidden />
          </ui.Button>
          <ui.Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setMessage("Kill build is a local placeholder.")}
          >
            Kill Build <Square size={12} aria-hidden />
          </ui.Button>
          <ui.Button
            type="button"
            size="sm"
            variant="outline"
            className="border-[var(--status-danger)]/30 text-[var(--status-danger)] hover:bg-[var(--status-danger)]/10 hover:text-[var(--status-danger)]"
            onClick={() => setMessage("Cancel queues is a local placeholder.")}
          >
            Cancel Queues <CircleAlert size={13} aria-hidden />
          </ui.Button>
          <ui.Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setMessage("Rollback settings are a local placeholder.")}
          >
            Configure Rollbacks <Settings size={13} aria-hidden />
          </ui.Button>
        </>
      }
    >
      <div className="space-y-1 text-sm">
        <p>
          If you want to re-deploy this application use this URL in the config of your git provider
          or docker
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium">Webhook URL:</span>
          <span className="inline-flex min-w-0 flex-1 items-center gap-1">
            <ui.Input
              aria-label="Webhook URL"
              readOnly
              value={webhookUrl}
              className="h-8 max-w-2xl font-mono text-xs"
            />
            <CopyButton value={webhookUrl} label="Copy webhook URL" size="icon" />
            <ui.Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Regenerate webhook URL"
              onClick={() => setMessage("Webhook tokens cannot be regenerated in this demo.")}
            >
              <RefreshCw size={13} aria-hidden />
            </ui.Button>
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="No deployments yet"
            description="Deploy this application to create the first deployment."
          />
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-2">
          {rows.map((deployment, index) => (
            <article
              key={deployment.id}
              className="flex flex-wrap items-start gap-3 rounded-xl border border-[var(--border)] p-4"
              data-testid={`deployment-row-${deployment.id}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>
                    {index + 1}. {deploymentStatusLabel(deployment.status)}
                  </span>
                  <span
                    className={`size-2 rounded-full ${
                      deployment.status === "success"
                        ? "bg-[var(--status-success)]"
                        : deployment.status === "failed"
                          ? "bg-[var(--status-danger)]"
                          : "bg-[var(--status-warning)]"
                    }`}
                    aria-hidden
                  />
                </div>
                <div className="mt-1 truncate text-sm text-muted-foreground">
                  {deployment.commitMessage}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  Commit: <span className="font-mono">{deployment.commit}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <RelativeTime
                    locale="en"
                    numeric="always"
                    format="long"
                    value={deployment.startedAt}
                  />
                  <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-1.5 py-0.5">
                    <Pause size={10} aria-hidden /> {formatDuration(deployment.durationMs)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ui.Button
                    type="button"
                    size="sm"
                    onClick={() => onOpenLogs(deployment)}
                    data-testid={`deployment-logs-${deployment.id}`}
                  >
                    View
                  </ui.Button>
                  <ui.Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-[var(--status-danger)]/30 bg-[var(--status-danger)]/10 text-[var(--status-danger)] hover:bg-[var(--status-danger)]/20 hover:text-[var(--status-danger)]"
                    onClick={() => setMessage("Removing deployments is a local placeholder.")}
                  >
                    Delete <Trash2 size={12} aria-hidden />
                  </ui.Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {message !== null ? (
        <p role="status" className="mt-3 text-xs text-muted-foreground">
          {message}
        </p>
      ) : null}
    </Panel>
  );
}

export function LogsTab({ service }: { service: Service }) {
  const ui = useUiAdapter();
  const [source] = useState(() => createDeploymentLogSource(service.id));
  const stream = useStream(source, {
    cursor: null,
    policy: { buffer: 500, pauseable: true, retry: { backoffMs: [300, 900] } },
  });
  const frames = useStreamFrames(stream);
  const state = useStreamState(stream);
  const [query, setQuery] = useState("");
  const [native, setNative] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const paused = state.status === "paused";
  const appName = appNameFor(service);
  const visible = frames.slice(-100).filter((frame) => {
    if (query.trim() === "") return true;
    return `${frame.level} ${frame.msg}`.toLowerCase().includes(query.trim().toLowerCase());
  });

  const text = visible.map((frame) => `${frame.ts} ${frame.level} ${frame.msg}`).join("\n");

  const copy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard !== undefined) {
      void navigator.clipboard.writeText(text);
      setMessage("Copied visible log lines.");
    }
  };

  const download = () => {
    if (typeof URL.createObjectURL !== "function") return;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${service.name}-logs.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel title="Logs" description="Watch the logs of the application in real time">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <FieldLabel>Select a container to view logs</FieldLabel>
          <ui.Select
            aria-label="Select a container"
            value={service.id}
            onValueChange={() => undefined}
            options={[
              {
                value: service.id,
                label: `${appName} (${service.id}) running Up 7 minutes`,
              },
            ]}
          />
        </div>
        <div className="flex items-center gap-2 pb-1 text-sm">
          <span>Native</span>
          <ui.Switch checked={native} onCheckedChange={setNative} aria-label="Native" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex overflow-hidden rounded-md border border-[var(--border)] text-xs">
          <span className="bg-[var(--background)] px-2 py-1.5 text-muted-foreground">Limit to</span>
          <span className="border-l border-[var(--border)] px-2 py-1.5">100 lines</span>
        </span>
        <span className="inline-flex overflow-hidden rounded-md border border-[var(--border)] text-xs">
          <span className="bg-[var(--background)] px-2 py-1.5 text-muted-foreground">
            Time range
          </span>
          <span className="border-l border-[var(--border)] px-2 py-1.5">All time</span>
        </span>
        <span className="inline-flex overflow-hidden rounded-md border border-[var(--border)] text-xs">
          <span className="bg-[var(--background)] px-2 py-1.5 text-muted-foreground">Log type</span>
          <span className="border-l border-[var(--border)] px-2 py-1.5">All</span>
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ui.Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => (paused ? stream.resume() : stream.pause())}
            data-testid="log-pause"
          >
            {paused ? <Play size={12} aria-hidden /> : <Pause size={12} aria-hidden />}
            {paused ? "Resume" : "Pause"}
          </ui.Button>
          <ui.Button type="button" size="sm" variant="secondary" onClick={copy}>
            <Copy size={12} aria-hidden /> Copy
          </ui.Button>
          <ui.Button type="button" size="sm" variant="secondary" onClick={download}>
            <Download size={12} aria-hidden /> Download logs
          </ui.Button>
          <ui.Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setMessage("AI log analysis is a placeholder.")}
          >
            AI
          </ui.Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-56">
          <ui.Input
            aria-label="Search logs"
            className="w-full pr-9"
            value={query}
            placeholder="Search logs..."
            onChange={(event) => setQuery(event.target.value)}
          />
          <Search
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        </div>
      </div>

      <div
        className="mt-3 max-h-[26rem] min-h-[20rem] overflow-auto rounded-md border border-[var(--border)] bg-black/20 font-mono text-xs"
        role="log"
        aria-label="Application log lines"
        data-testid="log-viewer"
      >
        {visible.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground">Waiting for frames…</p>
        ) : (
          visible.map((frame, index) => (
            <LogLine key={`${frame.ts}-${index}`} frame={frame} index={index} />
          ))
        )}
      </div>

      {message !== null ? (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {message}
        </p>
      ) : null}
    </Panel>
  );
}

function logTimestamp(ts: string): string {
  const date = new Date(ts);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = String(date.getUTCFullYear()).slice(-2);
  const hours = date.getUTCHours();
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const suffix = hours >= 12 ? "PM" : "AM";
  const time = `${String(hour12).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}:${String(date.getUTCSeconds()).padStart(2, "0")} ${suffix}`;
  return `${month}/${day}/${year}, ${time}`;
}

function LogLine({ frame, index }: { frame: DeploymentLogFrame; index: number }) {
  const levelClass =
    frame.level === "error"
      ? "bg-[var(--status-danger)]/15 text-[var(--status-danger)]"
      : frame.level === "warn"
        ? "bg-[var(--status-warning)]/15 text-[var(--status-warning)]"
        : "bg-[var(--status-info)]/15 text-[var(--status-info)]";
  return (
    <div
      className={`flex items-start gap-2 px-2 py-1 ${index % 2 === 0 ? "bg-transparent" : "bg-[var(--foreground)]/[0.04]"}`}
      data-line={index}
    >
      <span className="shrink-0 rounded-sm bg-black/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
        {logTimestamp(frame.ts)}
      </span>
      <span className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] uppercase ${levelClass}`}>
        {frame.level}
      </span>
      <span className="min-w-0 whitespace-pre-wrap break-words text-foreground/90">
        {frame.msg}
      </span>
    </div>
  );
}

function formatBytes(value: number): string {
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(2)} GiB`;
  if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(2)} MiB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${value.toFixed(0)} B`;
}

function latest(series: readonly MetricSeries[]): number {
  return series
    .map((item) => item.points.at(-1)?.v ?? 0)
    .reduce((sum, value) => sum + (value ?? 0), 0);
}

function MetricPanel({
  title,
  used,
  percent,
  series,
  formatValue,
}: {
  title: string;
  used: string;
  percent?: number;
  series: readonly MetricSeries[];
  formatValue: (value: number) => string;
}) {
  return (
    <section className="dokploy-panel p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-1 text-xs text-muted-foreground">{used}</div>
      {percent !== undefined ? (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--muted)]">
          <div
            className="h-full rounded-full bg-[var(--foreground)]/40"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
      ) : null}
      <div className="mt-3">
        <MetricChart
          series={series}
          height={150}
          formatValue={formatValue}
          ariaLabel={`${title} chart`}
        />
      </div>
    </section>
  );
}

export function MonitoringTab({ service }: { service: Service }) {
  const metrics = useMemo(() => applicationMetrics(service.id), [service.id]);
  const cpu = metrics.cpu[0]?.points.at(-1)?.v ?? 0;
  const memory = latest(metrics.memory);
  const blockRead = metrics.blockIo[0]?.points.at(-1)?.v ?? 0;
  const blockWrite = metrics.blockIo[1]?.points.at(-1)?.v ?? 0;
  const networkIn = metrics.network[0]?.points.at(-1)?.v ?? 0;
  const networkOut = metrics.network[1]?.points.at(-1)?.v ?? 0;
  const memoryLimit = 15.62 * 1024 ** 3;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Monitoring</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Watch the usage of your server in the current app
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MetricPanel
          title="CPU Usage"
          used={`Used: ${cpu.toFixed(2)}%`}
          percent={cpu}
          series={metrics.cpu}
          formatValue={(value) => `${value.toFixed(0)}%`}
        />
        <MetricPanel
          title="Memory Usage"
          used={`Used: ${formatBytes(memory)} / Limit: ${(memoryLimit / 1024 ** 3).toFixed(2)}GiB`}
          percent={(memory / memoryLimit) * 100}
          series={metrics.memory}
          formatValue={formatBytes}
        />
        <MetricPanel
          title="Block I/O"
          used={`Read: ${formatBytes(blockRead)} / Write: ${formatBytes(blockWrite)}`}
          series={metrics.blockIo}
          formatValue={formatBytes}
        />
        <MetricPanel
          title="Network I/O"
          used={`In MB: ${(networkIn / 1024 ** 2).toFixed(2)} / Out MB: ${(networkOut / 1024 ** 2).toFixed(2)}`}
          series={metrics.network}
          formatValue={(value) => `${(value / 1024 ** 2).toFixed(1)} MB`}
        />
      </div>
    </div>
  );
}

function AdvancedTab({ service }: { service: Service }) {
  const ui = useUiAdapter();
  const detail = service.application;
  const [command, setCommand] = useState(detail?.command ?? "");
  const [args, setArgs] = useState(detail?.args ?? "");
  const [ports, setPorts] = useState<{ internal: string; published: string }[]>([
    { internal: String(detail?.port ?? 3000), published: "80" },
  ]);
  const [internalPort, setInternalPort] = useState(String(detail?.port ?? 3000));
  const [publishedPort, setPublishedPort] = useState("443");
  const [volumes, setVolumes] = useState<{ name: string; mount: string }[]>([
    { name: "app-data", mount: "/data" },
  ]);
  const [volumeName, setVolumeName] = useState("uploads");
  const [volumeMount, setVolumeMount] = useState("/app/uploads");
  const [network, setNetwork] = useState("dokploy-network");
  const [networks, setNetworks] = useState<string[]>(["dokploy-network"]);
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Command & arguments" description="Override the image entrypoint.">
        <div className="space-y-3">
          <ui.Field label="Command" htmlFor="advanced-command">
            <ui.Input
              id="advanced-command"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="node dist/server.js"
            />
          </ui.Field>
          <ui.Field label="Arguments" htmlFor="advanced-args">
            <ui.Textarea
              id="advanced-args"
              rows={3}
              value={args}
              onChange={(event) => setArgs(event.target.value)}
              placeholder="--max-old-space-size=1536"
            />
          </ui.Field>
          <ui.Button type="button" size="sm" onClick={() => setSaved("command")}>
            Save command
          </ui.Button>
        </div>
      </Panel>

      <Panel title="Ports" description="Internal container port → published host port.">
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <ui.Field label="Internal" htmlFor="port-internal">
              <ui.Input
                id="port-internal"
                type="number"
                value={internalPort}
                onChange={(event) => setInternalPort(event.target.value)}
                className="w-28"
              />
            </ui.Field>
            <ui.Field label="Published" htmlFor="port-published">
              <ui.Input
                id="port-published"
                type="number"
                value={publishedPort}
                onChange={(event) => setPublishedPort(event.target.value)}
                className="w-28"
              />
            </ui.Field>
            <ui.Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setPorts((current) => [
                  ...current,
                  { internal: internalPort, published: publishedPort },
                ]);
                setSaved("ports");
              }}
            >
              Add port
            </ui.Button>
          </div>
          <ul className="divide-y divide-border rounded border border-[var(--border)] text-xs">
            {ports.map((port, index) => (
              <li
                key={`${port.internal}-${port.published}-${index}`}
                className="flex justify-between p-2"
              >
                <span className="font-mono">{port.internal}</span>
                <span className="text-muted-foreground">→ {port.published}</span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel title="Volumes" description="Persistent mounts survive redeploys.">
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <ui.Field label="Volume" htmlFor="volume-name">
              <ui.Input
                id="volume-name"
                value={volumeName}
                onChange={(event) => setVolumeName(event.target.value)}
              />
            </ui.Field>
            <ui.Field label="Mount path" htmlFor="volume-mount">
              <ui.Input
                id="volume-mount"
                value={volumeMount}
                onChange={(event) => setVolumeMount(event.target.value)}
              />
            </ui.Field>
            <ui.Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setVolumes((current) => [...current, { name: volumeName, mount: volumeMount }]);
                setSaved("volumes");
              }}
            >
              Attach
            </ui.Button>
          </div>
          <ul className="divide-y divide-border rounded border border-[var(--border)] text-xs">
            {volumes.map((volume) => (
              <li key={`${volume.name}-${volume.mount}`} className="flex justify-between p-2">
                <span className="font-mono">{volume.name}</span>
                <span className="text-muted-foreground">{volume.mount}</span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel title="Networks" description="Attach the service to Docker networks.">
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <ui.Field label="Network" htmlFor="network-select">
              <ui.Select
                aria-label="Network"
                value={network}
                options={[
                  { value: "dokploy-network", label: "dokploy-network" },
                  { value: "traefik-public", label: "traefik-public" },
                  { value: "internal", label: "internal" },
                ]}
                onValueChange={setNetwork}
              />
            </ui.Field>
            <ui.Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setNetworks((current) =>
                  current.includes(network) ? current : [...current, network],
                );
                setSaved("networks");
              }}
            >
              Attach
            </ui.Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {networks.map((item) => (
              <ui.Badge key={item} tone="info" variant="outline">
                {item}
              </ui.Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            <Database size={12} className="inline" /> Advanced edits are local-only in this demo;
            they are controlled forms, not bindings.
          </p>
        </div>
      </Panel>

      {saved !== null ? (
        <p role="status" className="text-xs text-muted-foreground" data-testid="advanced-saved">
          Saved {saved} locally — no command was issued.
        </p>
      ) : null}
    </div>
  );
}

function PlaceholderTab({ label }: { label: string }) {
  return (
    <Panel title={label} description="This tab is an honest placeholder in the strict clone.">
      <EmptyState
        icon={<FileCode className="size-8" aria-hidden />}
        title={`${label} is not implemented`}
        description="The route exists so the tab bar matches the official application screen. No hidden API or fake data is wired here."
      />
    </Panel>
  );
}

export function DokployApplicationDetailPage({
  projectId,
  environmentId,
  appId,
  tab,
  onTabChange,
}: {
  projectId: string;
  environmentId: string;
  appId: string;
  tab: ApplicationTab;
  onTabChange: (tab: ApplicationTab) => void;
}) {
  const ui = useUiAdapter();
  const navigate = useNavigate();
  const application = useRecord(servicesEntity.record!, appId);
  const project = useRecord(projectsEntity.record!, projectId);
  const servers = useCollection(serversEntity.collection!, { window: { kind: "all" } });
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [logDeployment, setLogDeployment] = useState<Deployment | null>(null);

  if (application.status === "loading" || application.status === "idle") {
    return (
      <DokployCard>
        <div className="p-6">
          <LoadingState rows={5} label="Loading application" />
        </div>
      </DokployCard>
    );
  }

  if (application.status === "error") {
    return (
      <DokployCard>
        <div className="p-6">
          <ErrorState error={application.error} onRetry={application.refetch} />
        </div>
      </DokployCard>
    );
  }

  const service = application.data;
  if (service === undefined) {
    return (
      <DokployCard>
        <div className="p-6">
          <EmptyState
            title="Application not found"
            description={`No service exists with id ${appId}. It may have been deleted.`}
            action={
              <ui.Button asChild variant="outline" size="sm">
                <Link
                  to="/dashboard/project/$projectId/environment/$environmentId"
                  params={{ projectId, environmentId }}
                >
                  Back to environment
                </Link>
              </ui.Button>
            }
          />
        </div>
      </DokployCard>
    );
  }

  if (service.kind !== "application" || service.application === undefined) {
    return (
      <DokployCard>
        <div className="p-6">
          <EmptyState
            title="Not an application"
            description={`${service.name} is a ${service.kind} service. This detail page only handles applications.`}
            action={
              <ui.Button asChild variant="outline" size="sm">
                <Link
                  to="/dashboard/project/$projectId/environment/$environmentId"
                  params={{ projectId, environmentId }}
                >
                  Back to environment
                </Link>
              </ui.Button>
            }
          />
        </div>
      </DokployCard>
    );
  }

  const environment = environmentOf(environmentId);
  const environmentName = environment?.name ?? "production";
  const projectName = project.data?.name ?? projectId;
  const appName = appNameFor(service);

  return (
    <DokployCard>
      <div className="flex flex-col">
        <header className="flex flex-wrap items-start justify-between gap-4 p-6 pb-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="relative inline-flex size-8 shrink-0 items-center justify-center">
              <Globe size={22} aria-hidden />
              <span
                className={`absolute -left-1.5 top-1/2 size-2.5 -translate-y-1/2 rounded-full ring-2 ring-[var(--background)] ${
                  SERVICE_STATUS_DOT[service.status] ?? SERVICE_STATUS_DOT.idle
                }`}
                title={service.status}
                role="img"
                aria-label={`Status: ${service.status}`}
              />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold leading-tight">{service.name}</h1>
              <p className="mt-1 truncate text-sm text-muted-foreground">{appName}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="rounded-full bg-[var(--foreground)] px-3 py-1 text-xs font-medium text-[var(--background)]">
              Dokploy Server
            </span>
            <div className="flex items-center gap-1">
              <ui.Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7"
                aria-label="Edit application"
                data-testid="edit-application"
                onClick={() => setEditOpen(true)}
              >
                <Pencil size={14} aria-hidden />
              </ui.Button>
              <ui.Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 text-muted-foreground hover:text-destructive"
                aria-label="Delete application"
                data-testid="delete-application"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 size={14} aria-hidden />
              </ui.Button>
            </div>
          </div>
        </header>

        <div className="border-t border-[var(--border)] px-6 py-4">
          <div className="dokploy-tabs">
            <ui.Tabs
              aria-label="Application sections"
              variant="pills"
              items={APPLICATION_TABS.map((item) => ({ value: item.value, label: item.label }))}
              value={tab}
              onValueChange={(value) => onTabChange(value as ApplicationTab)}
            />
          </div>
        </div>

        <div className="px-6 pb-8 pt-2">
          {tab === "general" ? <GeneralTab service={service} /> : null}
          {tab === "environment" ? <EnvironmentTab service={service} /> : null}
          {tab === "domains" ? <DomainsTab service={service} /> : null}
          {tab === "deployments" ? (
            <DeploymentsTab service={service} onOpenLogs={setLogDeployment} />
          ) : null}
          {tab === "preview-deployments" ? <PlaceholderTab label="Preview Deployments" /> : null}
          {tab === "schedules" ? <PlaceholderTab label="Schedules" /> : null}
          {tab === "volume-backups" ? <PlaceholderTab label="Volume Backups" /> : null}
          {tab === "logs" ? <LogsTab key={service.id} service={service} /> : null}
          {tab === "patches" ? <PlaceholderTab label="Patches" /> : null}
          {tab === "monitoring" ? <MonitoringTab service={service} /> : null}
          {tab === "advanced" ? <AdvancedTab service={service} /> : null}
        </div>
      </div>

      {editOpen ? (
        <EditApplicationDrawer
          service={service}
          servers={servers.rows}
          onClose={() => setEditOpen(false)}
        />
      ) : null}

      <DeleteCommandDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${service.name}?`}
        description="The application and its deployment history, domains and variables are removed. This cannot be undone."
        command={deleteService}
        input={{ serviceId: service.id }}
        entity={servicesEntity.collection}
        entityId={service.id}
        confirmLabel="Delete application"
        confirmTestId="confirm-delete-application"
        onDeleted={() => {
          void navigate({
            to: "/dashboard/project/$projectId/environment/$environmentId",
            params: { projectId, environmentId },
          });
        }}
      />

      {logDeployment !== null ? (
        <DeploymentLogDrawer deployment={logDeployment} onClose={() => setLogDeployment(null)} />
      ) : null}

      <span className="sr-only">
        {projectName} / {environmentName} / {service.name}
      </span>
    </DokployCard>
  );
}

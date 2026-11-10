import { Alert, PageLayout, useUiAdapter } from "@lynxland/uikit-surfaces";
import {
  ArrowUpDown,
  Check,
  ChevronRight,
  CircleAlert,
  Clock,
  Copy,
  FileCode,
  Folder,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { DokployCard } from "@/components/page-card";
import { notify } from "@/lib/feedback";

const TRAEFIK_FILE = `providers:
  swarm:
    exposedByDefault: false
    watch: false
  docker:
    exposedByDefault: false
    watch: true
    network: dokploy-network
  file:
    directory: /etc/dokploy/traefik/dynamic
    watch: true
entryPoints:
  web:
    address: :80
  websecure:
    address: :443
  http3:
    advertisedPort: 443
  http:
    tls:
      certResolver: letsencrypt
api:
  insecure: true
certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@dokploy.com
      storage: /etc/dokploy/traefik/dynamic/acme.json
      httpChallenge:
        entryPoint: web`;

export function DokployTraefikPage() {
  const [selected, setSelected] = useState("traefik.yml");
  const [unlocked, setUnlocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const lines = TRAEFIK_FILE.split("\n");

  return (
    <DokployCard>
      <PageLayout
        width="flow"
        titleSize="lg"
        headerDivider
        title="Traefik File System"
        description="Manage all the files and directories in `/etc/dokploy/traefik`."
      >
        <Alert tone="warning" icon={<CircleAlert size={15} aria-hidden />}>
          Adding invalid configuration to existing files, can break your Traefik instance,
          preventing access to your applications.
        </Alert>

        <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <div className="rounded-xl border border-[var(--border)] p-2">
            <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm">
              <ChevronRight size={12} className="text-muted-foreground" aria-hidden />
              <Folder size={14} className="text-muted-foreground" aria-hidden />
              dynamic
            </div>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md bg-[var(--foreground)]/8 px-2 py-1.5 pl-7 text-sm"
              onClick={() => setSelected("traefik.yml")}
            >
              <FileCode size={14} className="text-muted-foreground" aria-hidden />
              traefik.yml
            </button>
          </div>

          <div className="min-w-0">
            <div className="mb-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium">Traefik config</h2>
                  <p className="text-xs text-muted-foreground">/etc/dokploy/traefik/{selected}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] px-3 text-xs"
                    onClick={() => {
                      void navigator.clipboard?.writeText(TRAEFIK_FILE);
                      setCopied(true);
                    }}
                  >
                    {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-8 items-center rounded-md bg-[var(--foreground)] px-3 text-xs font-medium text-[var(--background)]"
                    onClick={() => setUnlocked((current) => !current)}
                  >
                    {unlocked ? "Lock" : "Unlock"}
                  </button>
                </div>
              </div>
            </div>
            <div className="dokploy-editor">
              <div className="dokploy-editor__gutter" aria-hidden="true">
                {lines.map((_, index) => String(index + 1)).join("\n")}
              </div>
              <textarea
                className="dokploy-editor__textarea"
                aria-label="Traefik configuration"
                readOnly={!unlocked}
                defaultValue={TRAEFIK_FILE}
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      </PageLayout>
    </DokployCard>
  );
}

const CONTAINERS = [
  {
    name: "tools-storage-l7bops-minio-1",
    state: "Running",
    status: "Up 41 Minutes",
    image: "quay.io/minio/minio:latest",
  },
  {
    name: "metrics-etl-dj7suy-etl-1",
    state: "Running",
    status: "Up 41 Minutes",
    image: "busybox",
  },
  {
    name: "shop-worker-s6nxwq-worker-1",
    state: "Running",
    status: "Up 41 Minutes",
    image: "busybox",
  },
  {
    name: "tools-automation-7mnpwb.1.wdqq3bkqv0awrzjgxlle5qyj",
    state: "Running",
    status: "Up 44 Minutes",
    image: "n8nio/n8n:latest",
  },
  {
    name: "shop-web-w7dfk6.1.rybnmwz2l3imcxwjwrbtzotun",
    state: "Running",
    status: "Up 45 Minutes",
    image: "shop-web-w7dfk6:latest",
  },
  {
    name: "status-uptime-dq1zxb.1.xn7ir01nww0o2d2uvg7q60wx",
    state: "Running",
    status: "Up 46 Minutes (Healthy)",
    image: "louislam/uptime-kuma:1",
  },
  {
    name: "metrics-dashboard-p3ccr4.1.pbk4rdv3yeytxvsa5enhmqi8b",
    state: "Running",
    status: "Up 47 Minutes",
    image: "grafana/grafana:latest",
  },
  {
    name: "tools-db-oypaxp.1.bn33cfnlealc949tcurrae5im",
    state: "Running",
    status: "Up 47 Minutes",
    image: "mysql:8",
  },
  {
    name: "metrics-db-cl2n6m.1.k4p4l8go8fvx9ht0x9llsstz",
    state: "Running",
    status: "Up 47 Minutes",
    image: "postgres:16",
  },
] as const;

export function DokployDockerPage() {
  const ui = useUiAdapter();
  const [query, setQuery] = useState("");
  const rows = CONTAINERS.filter((row) =>
    `${row.name} ${row.image}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <DokployCard>
      <PageLayout
        width="flow"
        titleSize="lg"
        headerDivider
        title="Docker Containers"
        description="See all the containers of your dokploy server"
        actions={
          <ui.Button type="button" size="sm" variant="outline">
            Columns
          </ui.Button>
        }
      >
        <div className="flex items-center gap-3">
          <div className="relative w-full max-w-80">
            <ui.Input
              aria-label="Filter containers"
              placeholder="Filter by name..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[54rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-muted-foreground">
                {["Name", "State", "Status", "Image"].map((label) => (
                  <th key={label} className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      {label} <ArrowUpDown size={11} aria-hidden />
                    </span>
                  </th>
                ))}
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className="border-b border-[var(--border)] last:border-b-0">
                  <td className="px-4 py-3 font-mono text-xs">{row.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-[var(--foreground)] px-2 py-0.5 text-[11px] font-medium text-[var(--background)]">
                      {row.state}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{row.status}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.image}</td>
                  <td className="px-4 py-3">
                    <ui.Tooltip
                      content={`Actions for ${row.name}`}
                      trigger={
                        <button
                          type="button"
                          aria-label={`Actions for ${row.name}`}
                          className="inline-flex size-7 items-center justify-center rounded-md hover:bg-[var(--border)]"
                        >
                          <MoreHorizontal size={14} aria-hidden />
                        </button>
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageLayout>
    </DokployCard>
  );
}

export function DokployRequestsPage() {
  const ui = useUiAdapter();
  const [schedule, setSchedule] = useState("0 0 * * *");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("Jul 03, 2026 - Jul 06, 2026");

  return (
    <DokployCard className="mx-auto w-full max-w-[70rem]">
      <PageLayout
        width="flow"
        titleSize="lg"
        headerDivider
        title="Requests"
        description="See all the incoming requests that pass trough Traefik"
      >
        <Alert tone="warning" icon={<CircleAlert size={15} aria-hidden />}>
          When you activate, you need to reload traefik to apply the changes, you can reload traefik
          in Settings
        </Alert>

        <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-[var(--border)] p-4">
          <ui.Field label="Log Cleanup Schedule" htmlFor="requests-schedule">
            <ui.Input
              id="requests-schedule"
              value={schedule}
              onChange={(event) => setSchedule(event.target.value)}
              className="w-52 font-mono"
            />
          </ui.Field>
          <div className="flex flex-wrap items-center gap-2">
            <ui.Button type="button" size="sm" variant="secondary">
              Update Schedule
            </ui.Button>
            <ui.Button type="button" size="sm">
              Deactivate
            </ui.Button>
            <ui.Button type="button" size="sm" variant="secondary">
              Reset to Last 3 Days
            </ui.Button>
            <ui.Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setRange((current) =>
                  current.startsWith("Jul 03")
                    ? "Jul 06, 2026 - Jul 09, 2026"
                    : "Jul 03, 2026 - Jul 06, 2026",
                )
              }
            >
              {range}
            </ui.Button>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-80">
            <ui.Input
              aria-label="Filter by hostname"
              placeholder="Filter by hostname..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ui.Button type="button" size="sm" variant="secondary">
              Status
            </ui.Button>
            <ui.Button type="button" size="sm" variant="secondary">
              Columns
            </ui.Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[50rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Level</th>
                <th className="px-4 py-3 font-medium">
                  <span className="inline-flex items-center gap-1">
                    Message <ArrowUpDown size={11} aria-hidden />
                  </span>
                </th>
                <th className="px-4 py-3 font-medium">
                  <span className="inline-flex items-center gap-1">
                    Time <ArrowUpDown size={11} aria-hidden />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="px-4 py-16 text-center text-sm text-muted-foreground">
                  {query.trim() === "" ? "No requests yet." : `No requests match “${query}”.`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </PageLayout>
    </DokployCard>
  );
}

const SCHEDULES = [
  { id: "sch-frontend", name: "frontend", cron: "0 0 * * *", disabled: true },
  { id: "sch-test", name: "test", cron: "0 0 * * *", disabled: true },
] as const;

export function DokploySchedulesPage() {
  const ui = useUiAdapter();
  const [schedules, setSchedules] = useState<readonly (typeof SCHEDULES)[number][]>(SCHEDULES);

  return (
    <DokployCard fill={false} innerClassName="min-h-[25rem]">
      <PageLayout
        width="flow"
        titleSize="lg"
        headerDivider
        title="Scheduled Tasks"
        description="Schedule tasks to run automatically at specified intervals."
        actions={
          <ui.Button type="button" size="sm" onClick={() => notify.placeholder("Add Schedule")}>
            <Plus size={13} aria-hidden /> Add Schedule
          </ui.Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {schedules.map((schedule) => (
            <article
              key={schedule.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-4"
            >
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)]">
                <Clock size={14} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{schedule.name}</span>
                  <span className="rounded-full bg-[var(--foreground)]/8 px-2 py-0.5 text-[11px] text-muted-foreground">
                    Disabled
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  Cron:
                  <span className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono">
                    {schedule.cron}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <ui.Tooltip
                  content={`Delete ${schedule.name}`}
                  trigger={
                    <ui.Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      aria-label={`Delete ${schedule.name}`}
                      onClick={() =>
                        setSchedules((current) => current.filter((item) => item.id !== schedule.id))
                      }
                    >
                      <Trash2 size={13} aria-hidden />
                    </ui.Button>
                  }
                />
                <ui.Tooltip
                  content={`Run ${schedule.name}`}
                  trigger={
                    <ui.Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      aria-label={`Run ${schedule.name}`}
                      onClick={() => notify.placeholder(`Running ${schedule.name}`)}
                    >
                      <Play size={13} aria-hidden />
                    </ui.Button>
                  }
                />
                <ui.Tooltip
                  content={`Edit ${schedule.name}`}
                  trigger={
                    <ui.Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      aria-label={`Edit ${schedule.name}`}
                      onClick={() => notify.placeholder(`Editing ${schedule.name}`)}
                    >
                      <Pencil size={13} aria-hidden />
                    </ui.Button>
                  }
                />
              </div>
            </article>
          ))}
        </div>
      </PageLayout>
    </DokployCard>
  );
}

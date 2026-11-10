import {
  Alert,
  CodeEditor,
  ColumnPicker,
  type ColumnPickerColumn,
  type ColumnVisibility,
  DateRangePicker,
  type DateRangePreset,
  type DateRangeValue,
  FileTree,
  type FileTreeItem,
  PageLayout,
  useUiAdapter,
} from "@lynxland/uikit-surfaces";
import {
  ArrowUpDown,
  Check,
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

const TRAEFIK_TREE: readonly FileTreeItem[] = [
  {
    id: "dynamic",
    label: "dynamic",
    type: "directory",
    children: [{ id: "traefik.yml", label: "traefik.yml", type: "file" }],
  },
];

export function DokployTraefikPage() {
  const [selected, setSelected] = useState("traefik.yml");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(["dynamic"]));
  const [unlocked, setUnlocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState(TRAEFIK_FILE);

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
            <FileTree
              items={TRAEFIK_TREE}
              expanded={expanded}
              onExpandedChange={setExpanded}
              selected={selected}
              onSelect={(id, item) => {
                if (item.type === "file") setSelected(id);
              }}
              folderIcon={<Folder size={14} aria-hidden />}
              fileIcon={<FileCode size={14} aria-hidden />}
              aria-label="Traefik files"
            />
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
                      void navigator.clipboard?.writeText(config);
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
            <CodeEditor
              value={config}
              onChange={setConfig}
              language="yaml"
              readOnly={!unlocked}
              minHeight="22rem"
              aria-label="Traefik configuration"
            />
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

const DOCKER_COLUMNS: readonly ColumnPickerColumn[] = [
  { id: "name", label: "Name", hideable: false },
  { id: "state", label: "State" },
  { id: "status", label: "Status" },
  { id: "image", label: "Image" },
];

export function DokployDockerPage() {
  const ui = useUiAdapter();
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<ColumnVisibility>({});
  const show = (id: string) => visibility[id] !== false;
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
          <ColumnPicker
            columns={DOCKER_COLUMNS}
            visibility={visibility}
            onVisibilityChange={setVisibility}
          />
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
                {show("name") ? (
                  <th className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      Name <ArrowUpDown size={11} aria-hidden />
                    </span>
                  </th>
                ) : null}
                {show("state") ? (
                  <th className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      State <ArrowUpDown size={11} aria-hidden />
                    </span>
                  </th>
                ) : null}
                {show("status") ? (
                  <th className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      Status <ArrowUpDown size={11} aria-hidden />
                    </span>
                  </th>
                ) : null}
                {show("image") ? (
                  <th className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      Image <ArrowUpDown size={11} aria-hidden />
                    </span>
                  </th>
                ) : null}
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className="border-b border-[var(--border)] last:border-b-0">
                  {show("name") ? (
                    <td className="px-4 py-3 font-mono text-xs">{row.name}</td>
                  ) : null}
                  {show("state") ? (
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-[var(--foreground)] px-2 py-0.5 text-[11px] font-medium text-[var(--background)]">
                        {row.state}
                      </span>
                    </td>
                  ) : null}
                  {show("status") ? <td className="px-4 py-3 text-xs">{row.status}</td> : null}
                  {show("image") ? (
                    <td className="px-4 py-3 font-mono text-xs">{row.image}</td>
                  ) : null}
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

const REQUEST_COLUMNS: readonly ColumnPickerColumn[] = [
  { id: "level", label: "Level" },
  { id: "message", label: "Message", hideable: false },
  { id: "time", label: "Time" },
];

const REQUEST_RANGE_PRESETS: readonly DateRangePreset[] = [
  { label: "Last 3 days", start: "2026-07-03", end: "2026-07-06" },
  { label: "Last 7 days", start: "2026-07-01", end: "2026-07-08" },
  { label: "Last 30 days", start: "2026-06-08", end: "2026-07-08" },
];

export function DokployRequestsPage() {
  const ui = useUiAdapter();
  const [schedule, setSchedule] = useState("0 0 * * *");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<DateRangeValue>({
    start: "2026-07-03",
    end: "2026-07-06",
  });
  const [visibility, setVisibility] = useState<ColumnVisibility>({});
  const show = (id: string) => visibility[id] !== false;
  const columnCount = REQUEST_COLUMNS.filter((column) => show(column.id)).length;

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
              variant="secondary"
              onClick={() => setRange({ start: "2026-07-03", end: "2026-07-06" })}
            >
              Reset to Last 3 Days
            </ui.Button>
            <DateRangePicker
              start={range.start}
              end={range.end}
              onChange={setRange}
              presets={REQUEST_RANGE_PRESETS}
              align="end"
            />
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
            <ColumnPicker
              columns={REQUEST_COLUMNS}
              visibility={visibility}
              onVisibilityChange={setVisibility}
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[50rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-muted-foreground">
                {show("level") ? <th className="px-4 py-3 font-medium">Level</th> : null}
                {show("message") ? (
                  <th className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      Message <ArrowUpDown size={11} aria-hidden />
                    </span>
                  </th>
                ) : null}
                {show("time") ? (
                  <th className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      Time <ArrowUpDown size={11} aria-hidden />
                    </span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={Math.max(columnCount, 1)}
                  className="px-4 py-16 text-center text-sm text-muted-foreground"
                >
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

import {
  MetricChart,
  type MetricSeries,
  PageLayout,
  Progress,
  useUiAdapter,
} from "@lynxland/uikit-surfaces";
import { RefreshCw } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { DokployCard } from "@/components/page-card";
import { notify } from "@/lib/feedback";

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;
const STEPS = 40;
const STEP_MS = 30_000;
const END = Math.floor(Date.now() / STEP_MS) * STEP_MS;
const MEMORY_LIMIT = 15.62 * GIB;
const DISK_LIMIT = 192.69 * GIB;
const DOCKER_TOTAL = 21.95;
const CPU_COLOR = "#3b82f6";
const MEMORY_COLOR = "#ec4899";
const DISK_COLOR = "#f59e0b";

const DOCKER_SEGMENTS = [
  { label: "Build Cache", value: 13, color: "#a855f7" },
  { label: "Containers", value: 15, color: "#ec4899" },
  { label: "Images", value: 60, color: "#3b82f6" },
  { label: "Volumes", value: 12, color: "#f59e0b" },
] as const;

interface SeriesShape {
  base: number;
  amplitude: number;
  spike?: number;
  spikeFrom?: number;
  spikeTo?: number;
  color?: string;
}

/**
 * Deterministic server telemetry. The demo has no metrics API, so the shape is
 * generated from a stable seed: a mostly flat baseline with one burst near the
 * end, matching the official server-monitoring capture without inventing a
 * network request.
 */
function chartSeries(key: string, label: string, shape: SeriesShape): MetricSeries {
  const { base, amplitude, spike = 0, spikeFrom = STEPS, spikeTo = STEPS } = shape;
  const points = Array.from({ length: STEPS }, (_, index) => {
    const wave = Math.sin(index / 3.7 + key.length) * amplitude;
    const noise = (((index * 37 + key.length * 13) % 9) - 4) * (amplitude / 6);
    const rising = index >= spikeFrom ? Math.min(1, (index - spikeFrom + 1) / 2) : 0;
    const falling = index > spikeTo ? Math.max(0, 1 - (index - spikeTo) / 3) : 1;
    const burst = index >= spikeFrom ? spike * rising * falling : 0;
    return {
      t: END - (STEPS - 1 - index) * STEP_MS,
      v: Math.max(0, base + wave + noise + burst),
    };
  });
  return {
    key,
    label,
    points,
    ...(shape.color !== undefined ? { color: shape.color } : {}),
  };
}

function latest(series: MetricSeries): number {
  return series.points.at(-1)?.v ?? 0;
}

function formatGib(value: number): string {
  return `${(value / GIB).toFixed(2)} GiB`;
}

function formatGibShort(value: number): string {
  return (value / GIB).toFixed(2);
}

function formatMib(value: number): string {
  return (value / MIB).toFixed(1);
}

function useServerMetrics() {
  return useMemo(() => {
    const cpu = [
      chartSeries("server-cpu", "CPU Usage", {
        base: 7,
        amplitude: 4,
        spike: 58,
        spikeFrom: 26,
        spikeTo: 34,
        color: CPU_COLOR,
      }),
    ];
    const memory = [
      chartSeries("server-memory", "Memory (GiB)", {
        base: 5.5 * GIB,
        amplitude: 0.12 * GIB,
        spike: 0.5 * GIB,
        spikeFrom: 31,
        spikeTo: 35,
        color: MEMORY_COLOR,
      }),
    ];
    const disk = [
      chartSeries("server-disk", "Disk (GiB)", {
        base: 31.62 * GIB,
        amplitude: 0.25 * GIB,
        spike: 68 * GIB,
        spikeFrom: 32,
        spikeTo: 35,
        color: DISK_COLOR,
      }),
    ];
    const blockIo = [
      chartSeries("server-block-read", "Read", {
        base: 6 * MIB,
        amplitude: 2 * MIB,
        spike: 28 * MIB,
        spikeFrom: 27,
        spikeTo: 34,
        color: "#14b8a6",
      }),
      chartSeries("server-block-write", "Write", {
        base: 3 * MIB,
        amplitude: 1.4 * MIB,
        spike: 18 * MIB,
        spikeFrom: 28,
        spikeTo: 35,
        color: "#8b5cf6",
      }),
    ];
    const network = [
      chartSeries("server-network-in", "Ingress", {
        base: 16 * MIB,
        amplitude: 5 * MIB,
        spike: 64 * MIB,
        spikeFrom: 27,
        spikeTo: 34,
        color: "#22c55e",
      }),
      chartSeries("server-network-out", "Egress", {
        base: 9 * MIB,
        amplitude: 3 * MIB,
        spike: 40 * MIB,
        spikeFrom: 28,
        spikeTo: 35,
        color: "#38bdf8",
      }),
    ];
    return { cpu, memory, disk, blockIo, network };
  }, []);
}

function MonitoringCard({
  title,
  detail,
  percent,
  action,
  children,
}: {
  title: string;
  detail?: string;
  percent?: number;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="dokploy-panel p-5" data-testid="monitoring-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {detail !== undefined ? (
            <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
          ) : null}
        </div>
        {action}
      </div>
      {percent !== undefined ? (
        <Progress className="mt-3" value={percent} aria-label={`${title} usage`} />
      ) : null}
      {children}
    </section>
  );
}

function DockerDonut() {
  let offset = 0;
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-3">
      <div className="relative inline-flex" data-testid="docker-disk-donut">
        <svg
          viewBox="0 0 42 42"
          className="size-40"
          role="img"
          aria-label={`Docker disk usage: ${DOCKER_TOTAL} GB`}
        >
          <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--border)" strokeWidth="5" />
          <g transform="rotate(-90 21 21)">
            {DOCKER_SEGMENTS.map((segment) => {
              const dashOffset = -offset;
              offset += segment.value;
              return (
                <circle
                  key={segment.label}
                  cx="21"
                  cy="21"
                  r="15.9155"
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="5"
                  pathLength={100}
                  strokeDasharray={`${segment.value} ${100 - segment.value}`}
                  strokeDashoffset={dashOffset}
                />
              );
            })}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-semibold">{DOCKER_TOTAL} GB</span>
          <span className="text-[11px] text-muted-foreground">Docker Usage</span>
        </div>
      </div>
      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
        {DOCKER_SEGMENTS.map((segment) => (
          <li key={segment.label} className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: segment.color }}
              aria-hidden
            />
            {segment.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DokployMonitoringPage() {
  const ui = useUiAdapter();
  const metrics = useServerMetrics();
  const cpu = latest(metrics.cpu[0]!);
  const memory = latest(metrics.memory[0]!);
  const disk = latest(metrics.disk[0]!);
  const read = latest(metrics.blockIo[0]!);
  const write = latest(metrics.blockIo[1]!);
  const ingress = latest(metrics.network[0]!);
  const egress = latest(metrics.network[1]!);

  return (
    <DokployCard>
      <PageLayout
        width="flow"
        titleSize="lg"
        title="Monitoring"
        description="Watch the usage of your server in the current app"
      >
        <div className="grid gap-4 lg:grid-cols-2" data-testid="monitoring-page">
          <MonitoringCard title="CPU Usage" detail={`Used: ${cpu.toFixed(2)}%`} percent={cpu}>
            <div className="mt-3" data-testid="monitoring-chart">
              <MetricChart
                series={metrics.cpu}
                height={150}
                formatValue={(value) => value.toFixed(0)}
                unit="%"
                ariaLabel="Server CPU usage chart"
                showYAxis
                area
                domain={[0, 100]}
                thresholds={[80]}
              />
            </div>
          </MonitoringCard>

          <MonitoringCard
            title="Memory Usage"
            detail={`Used: ${formatGib(memory)} / Limit: ${formatGib(MEMORY_LIMIT)}`}
            percent={(memory / MEMORY_LIMIT) * 100}
          >
            <div className="mt-3" data-testid="monitoring-chart">
              <MetricChart
                series={metrics.memory}
                height={150}
                formatValue={formatGibShort}
                unit="GB"
                ariaLabel="Server memory usage chart"
                showYAxis
                area
                domain={[0, MEMORY_LIMIT]}
                thresholds={[MEMORY_LIMIT * 0.8]}
              />
            </div>
          </MonitoringCard>

          <MonitoringCard
            title="Disk Space"
            detail={`Used: ${formatGib(disk)} / Limit: ${formatGib(DISK_LIMIT)}`}
            percent={(disk / DISK_LIMIT) * 100}
          >
            <div className="mt-3" data-testid="monitoring-chart">
              <MetricChart
                series={metrics.disk}
                height={150}
                formatValue={formatGibShort}
                unit="GB"
                ariaLabel="Server disk space chart"
                showYAxis
                area
                domain={[0, DISK_LIMIT]}
                thresholds={[DISK_LIMIT * 0.8]}
              />
            </div>
          </MonitoringCard>

          <MonitoringCard
            title="Docker Disk Usage"
            detail={`Total: ${DOCKER_TOTAL} GB`}
            action={
              <ui.Tooltip
                content="Refresh Docker usage"
                trigger={
                  <ui.Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7 text-muted-foreground"
                    aria-label="Refresh Docker usage"
                    onClick={() => notify.placeholder("Refreshing Docker usage")}
                  >
                    <RefreshCw size={13} aria-hidden />
                  </ui.Button>
                }
              />
            }
          >
            <DockerDonut />
          </MonitoringCard>

          <MonitoringCard
            title="Block I/O"
            detail={`Read: ${formatMib(read)} MB/s / Write: ${formatMib(write)} MB/s`}
          >
            <div className="mt-3" data-testid="monitoring-chart">
              <MetricChart
                series={metrics.blockIo}
                height={150}
                formatValue={formatMib}
                unit="MB/s"
                ariaLabel="Server block I/O chart"
                showYAxis
              />
            </div>
          </MonitoringCard>

          <MonitoringCard
            title="Network I/O"
            detail={`In: ${formatMib(ingress)} MB/s / Out: ${formatMib(egress)} MB/s`}
          >
            <div className="mt-3" data-testid="monitoring-chart">
              <MetricChart
                series={metrics.network}
                height={150}
                formatValue={formatMib}
                unit="MB/s"
                ariaLabel="Server network I/O chart"
                showYAxis
              />
            </div>
          </MonitoringCard>
        </div>
      </PageLayout>
    </DokployCard>
  );
}

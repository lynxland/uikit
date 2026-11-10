import { type ReactNode, useMemo } from "react";
import { cx } from "./classes";

export interface MetricPoint {
  /** Milliseconds since epoch. */
  t: number;
  /** null marks a gap; the line breaks instead of interpolating. */
  v: number | null;
}

export interface MetricSeries {
  /** Stable identity across refreshes (also drives the colour index). */
  key: string;
  label?: string;
  points: readonly MetricPoint[];
}

export interface MetricChartProps {
  series: readonly MetricSeries[];
  height?: number;
  formatValue?: (value: number) => string;
  formatTick?: (t: number) => string;
  /** Escape hatch: a consumer-provided chart (for example recharts) replaces the SVG. */
  chart?: ReactNode;
  empty?: ReactNode;
  ariaLabel?: string;
  className?: string;
}

interface Segment {
  points: ReadonlyArray<readonly [number, number]>;
}

interface Geometry {
  segments: ReadonlyArray<{
    key: string;
    label: string;
    colorIndex: number;
    segments: readonly Segment[];
  }>;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

const DEFAULT_HEIGHT = 200;
const PAD_X = 4;
const PAD_Y = 6;
const WIDTH = 100;

function buildGeometry(series: readonly MetricSeries[]): Geometry | null {
  const timestamps: number[] = [];
  const values: number[] = [];
  for (const item of series) {
    for (const point of item.points) {
      if (!Number.isFinite(point.t)) continue;
      timestamps.push(point.t);
      if (point.v !== null && Number.isFinite(point.v)) values.push(point.v);
    }
  }
  if (timestamps.length === 0 || values.length === 0) return null;

  const xMin = Math.min(...timestamps);
  const xMax = Math.max(...timestamps);
  const yMin = Math.min(0, ...values);
  const yMax = Math.max(0, ...values);
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;

  const projectX = (t: number) => PAD_X + ((t - xMin) / xSpan) * (WIDTH - PAD_X * 2);
  const projectY = (v: number) => {
    const normalized = (v - yMin) / ySpan;
    return 100 - PAD_Y - normalized * (100 - PAD_Y * 2);
  };

  const built = series.map((item, index) => {
    const segments: Segment[] = [];
    let current: Array<readonly [number, number]> = [];
    for (const point of item.points) {
      if (point.v === null || !Number.isFinite(point.v) || !Number.isFinite(point.t)) {
        if (current.length > 0) {
          segments.push({ points: current });
          current = [];
        }
        continue;
      }
      current.push([projectX(point.t), projectY(point.v)]);
    }
    if (current.length > 0) segments.push({ points: current });
    return {
      key: item.key,
      label: item.label ?? item.key,
      colorIndex: index,
      segments,
    };
  });

  return { segments: built, xMin, xMax, yMin, yMax };
}

/**
 * Lightweight multi-series line chart. No charting dependency: an inline SVG
 * with CSS-variable colours (`--chart-1..N`) keeps surfaces installable
 * anywhere. Consumers who want recharts pass it through the `chart` slot.
 */
export function MetricChart({
  series,
  height = DEFAULT_HEIGHT,
  formatValue,
  formatTick,
  chart,
  empty,
  ariaLabel,
  className,
}: MetricChartProps) {
  const geometry = useMemo(() => buildGeometry(series), [series]);
  const formatNumber = formatValue ?? ((value: number) => String(value));
  const formatTime = formatTick ?? ((t: number) => new Date(t).toTimeString().slice(0, 5));

  if (chart !== undefined) {
    return <div className={cx("ui-metric-chart", className)}>{chart}</div>;
  }

  if (geometry === null) {
    return (
      <div
        className={cx("ui-metric-chart ui-metric-chart--empty", className)}
        data-testid="metric-chart-empty"
      >
        {empty ?? "No samples in window"}
      </div>
    );
  }

  return (
    <div className={cx("ui-metric-chart", className)} data-testid="metric-chart">
      <svg
        className="ui-metric-chart__plot"
        viewBox={`0 0 ${WIDTH} 100`}
        preserveAspectRatio="none"
        style={{ height }}
        role="img"
        aria-label={ariaLabel ?? "Metric chart"}
      >
        <line
          className="ui-metric-chart__axis"
          x1={PAD_X}
          x2={WIDTH - PAD_X}
          y1={100 - PAD_Y}
          y2={100 - PAD_Y}
        />
        {geometry.segments.map((item) =>
          item.segments.map((segment) => (
            <polyline
              key={`${item.key}-${segment.points[0]?.join(",") ?? "segment"}`}
              className="ui-metric-chart__line"
              points={segment.points.map(([x, y]) => `${x},${y}`).join(" ")}
              style={{ stroke: `var(--chart-${(item.colorIndex % 5) + 1}, var(--ui-accent))` }}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          )),
        )}
      </svg>
      <div className="ui-metric-chart__legend">
        {geometry.segments.map((item) => {
          const last = series[item.colorIndex]?.points.filter((p) => p.v !== null).at(-1);
          return (
            <span key={item.key} className="ui-metric-chart__legend-item">
              <span
                className="ui-metric-chart__swatch"
                style={{
                  background: `var(--chart-${(item.colorIndex % 5) + 1}, var(--ui-accent))`,
                }}
              />
              {item.label}
              {last?.v !== undefined && last.v !== null ? (
                <b className="ui-metric-chart__last">{formatNumber(last.v)}</b>
              ) : null}
            </span>
          );
        })}
      </div>
      <div className="ui-metric-chart__axis-labels" aria-hidden="true">
        <span>{formatTime(geometry.xMin)}</span>
        <span>{formatTime(geometry.xMax)}</span>
      </div>
      <span className="ui-sr-only">
        Range {formatNumber(geometry.yMin)} to {formatNumber(geometry.yMax)}
      </span>
    </div>
  );
}

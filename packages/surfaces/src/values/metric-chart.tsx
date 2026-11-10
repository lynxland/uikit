import { type ReactNode, type PointerEvent as ReactPointerEvent, useMemo, useState } from "react";
import { cx } from "./classes";

export interface MetricPoint {
  /** Milliseconds since epoch. */
  t: number;
  /** null marks a gap; the line breaks instead of interpolating. */
  v: number | null;
}

export interface MetricSeries {
  /** Stable identity across refreshes; drives the default colour via a key hash. */
  key: string;
  label?: string;
  points: readonly MetricPoint[];
  /** Explicit CSS colour. Wins over the stable key-derived palette. */
  color?: string;
  /** Per-series value formatter; falls back to the chart `formatValue`. */
  formatValue?: (value: number) => string;
}

export interface MetricChartProps {
  series: readonly MetricSeries[];
  height?: number;
  formatValue?: (value: number) => string;
  formatTick?: (t: number) => string;
  /** Legend is on by default for compatibility; set false for a bare chart. */
  showLegend?: boolean;
  /** Draw min/mid/max labels on the left. */
  showYAxis?: boolean;
  /** Fill the area under each line. */
  area?: boolean;
  /** Pointer hover readout with a vertical guide. Default true. */
  tooltip?: boolean;
  /** Appended to formatted values (legend, y-axis, readout, summary). */
  unit?: string;
  /** Horizontal reference lines (for example 80 for an 80% threshold). */
  thresholds?: readonly number[];
  /** Explicit y domain; otherwise data and thresholds are included. */
  domain?: readonly [number, number];
  /** Escape hatch: a consumer-provided chart (for example recharts) replaces the SVG. */
  chart?: ReactNode;
  empty?: ReactNode;
  ariaLabel?: string;
  className?: string;
}

interface Segment {
  points: ReadonlyArray<readonly [number, number]>;
}

interface SeriesGeometry {
  key: string;
  label: string;
  color: string;
  segments: readonly Segment[];
  lastValue: number | null;
  minValue: number;
  maxValue: number;
}

interface Geometry {
  series: ReadonlyArray<SeriesGeometry>;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

interface HoverState {
  ratio: number;
  t: number;
}

const DEFAULT_HEIGHT = 200;
const PAD_X = 4;
const PAD_Y = 6;
const WIDTH = 100;
const PALETTE_SIZE = 5;

/**
 * Deterministic key hash. Reordering the `series` array must not change a
 * series colour; only its key (or an explicit `color`) does.
 */
function hashKey(key: string): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableColor(key: string): string {
  return `var(--ui-chart-${(hashKey(key) % PALETTE_SIZE) + 1}, var(--ui-accent))`;
}

/**
 * Assign palette slots in key order and probe past collisions, so two series
 * in the same chart differ when the palette has room, while reordering the
 * array still produces identical colours.
 */
function assignColors(series: readonly MetricSeries[]): ReadonlyMap<string, string> {
  const colors = new Map<string, string>();
  const used = new Set<number>();
  const ordered = [...series].sort((left, right) =>
    left.key < right.key ? -1 : left.key > right.key ? 1 : 0,
  );
  for (const item of ordered) {
    if (item.color !== undefined) {
      colors.set(item.key, item.color);
      continue;
    }
    const start = hashKey(item.key) % PALETTE_SIZE;
    for (let offset = 0; offset < PALETTE_SIZE; offset += 1) {
      const slot = (start + offset) % PALETTE_SIZE;
      if (!used.has(slot)) {
        used.add(slot);
        colors.set(item.key, `var(--ui-chart-${slot + 1}, var(--ui-accent))`);
        break;
      }
    }
    if (!colors.has(item.key)) colors.set(item.key, stableColor(item.key));
  }
  return colors;
}

function buildGeometry(
  series: readonly MetricSeries[],
  thresholds: readonly number[],
  domain: readonly [number, number] | undefined,
): Geometry | null {
  const timestamps: number[] = [];
  const values: number[] = [];
  for (const item of series) {
    for (const point of item.points) {
      if (!Number.isFinite(point.t)) continue;
      timestamps.push(point.t);
      if (point.v !== null && Number.isFinite(point.v)) values.push(point.v);
    }
  }
  for (const threshold of thresholds) {
    if (Number.isFinite(threshold)) values.push(threshold);
  }
  if (timestamps.length === 0 || values.length === 0) return null;

  const xMin = Math.min(...timestamps);
  const xMax = Math.max(...timestamps);
  const yMin = domain !== undefined ? Math.min(domain[0], domain[1]) : Math.min(0, ...values);
  const yMax = domain !== undefined ? Math.max(domain[0], domain[1]) : Math.max(0, ...values);
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;
  const colors = assignColors(series);

  const projectX = (t: number) => PAD_X + ((t - xMin) / xSpan) * (WIDTH - PAD_X * 2);
  const projectY = (v: number) => {
    const normalized = (v - yMin) / ySpan;
    return 100 - PAD_Y - normalized * (100 - PAD_Y * 2);
  };

  const built = series.map((item) => {
    const segments: Segment[] = [];
    let current: Array<readonly [number, number]> = [];
    let lastValue: number | null = null;
    let minValue = Number.POSITIVE_INFINITY;
    let maxValue = Number.NEGATIVE_INFINITY;
    for (const point of item.points) {
      if (point.v === null || !Number.isFinite(point.v) || !Number.isFinite(point.t)) {
        if (current.length > 0) {
          segments.push({ points: current });
          current = [];
        }
        continue;
      }
      lastValue = point.v;
      minValue = Math.min(minValue, point.v);
      maxValue = Math.max(maxValue, point.v);
      current.push([projectX(point.t), projectY(point.v)]);
    }
    if (current.length > 0) segments.push({ points: current });
    return {
      key: item.key,
      label: item.label ?? item.key,
      color: colors.get(item.key) ?? stableColor(item.key),
      segments,
      lastValue,
      minValue: Number.isFinite(minValue) ? minValue : 0,
      maxValue: Number.isFinite(maxValue) ? maxValue : 0,
    };
  });

  return { series: built, xMin, xMax, yMin, yMax };
}

function projectYValue(value: number, geometry: Geometry): number {
  const span = geometry.yMax - geometry.yMin || 1;
  return 100 - PAD_Y - ((value - geometry.yMin) / span) * (100 - PAD_Y * 2);
}

function nearestPoint(series: MetricSeries, t: number): MetricPoint | null {
  let best: MetricPoint | null = null;
  let distance = Number.POSITIVE_INFINITY;
  for (const point of series.points) {
    if (point.v === null || !Number.isFinite(point.v) || !Number.isFinite(point.t)) continue;
    const next = Math.abs(point.t - t);
    if (next < distance) {
      distance = next;
      best = point;
    }
  }
  return best;
}

/**
 * Lightweight multi-series line/area chart. No charting dependency: an inline
 * SVG with CSS-variable colours (`--ui-chart-1..N`) keeps surfaces installable
 * anywhere. Series colours hash from `series.key` (or an explicit
 * `series.color`), so reordering the array never recolours a line. Consumers
 * who want recharts/donuts pass one through the `chart` slot.
 */
export function MetricChart({
  series,
  height = DEFAULT_HEIGHT,
  formatValue,
  formatTick,
  showLegend = true,
  showYAxis = false,
  area = false,
  tooltip = true,
  unit,
  thresholds = [],
  domain,
  chart,
  empty,
  ariaLabel,
  className,
}: MetricChartProps) {
  const geometry = useMemo(
    () => buildGeometry(series, thresholds, domain),
    [series, thresholds, domain],
  );
  const [hover, setHover] = useState<HoverState | null>(null);
  const formatTime = formatTick ?? ((t: number) => new Date(t).toTimeString().slice(0, 5));

  const formatNumber = (value: number, item?: MetricSeries): string => {
    const formatter = item?.formatValue ?? formatValue;
    const text = formatter !== undefined ? formatter(value) : String(value);
    return unit !== undefined ? `${text}${unit}` : text;
  };

  const summaryLabel =
    ariaLabel ??
    `${series.length} metric ${series.length === 1 ? "series" : "series"}, ${formatTime(
      geometry?.xMin ?? 0,
    )} to ${formatTime(geometry?.xMax ?? 0)}`;

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

  const yTicks = Array.from(
    new Set([geometry.yMin, (geometry.yMin + geometry.yMax) / 2, geometry.yMax]),
  );
  const tickPosition = (value: number) => {
    const span = geometry.yMax - geometry.yMin || 1;
    return PAD_Y + (1 - (value - geometry.yMin) / span) * (100 - PAD_Y * 2);
  };
  const hoverX = hover !== null ? PAD_X + hover.ratio * (WIDTH - PAD_X * 2) : 0;
  const hoverPoints =
    hover !== null
      ? series
          .map((item) => {
            const point = nearestPoint(item, hover.t);
            if (point === null) return null;
            return { series: item, point };
          })
          .filter((entry): entry is { series: MetricSeries; point: MetricPoint } => entry !== null)
      : [];

  const handlePointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!tooltip) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setHover({ ratio, t: geometry.xMin + ratio * (geometry.xMax - geometry.xMin) });
  };

  return (
    <div className={cx("ui-metric-chart", className)} data-testid="metric-chart">
      <div className="ui-metric-chart__body">
        {showYAxis ? (
          <div
            className="ui-metric-chart__y-axis"
            style={{ height }}
            aria-hidden="true"
            data-testid="metric-chart-y-axis"
          >
            {yTicks.map((value) => (
              <span
                key={`tick-${value}`}
                className="ui-metric-chart__y-tick"
                style={{ top: `${tickPosition(value)}%` }}
              >
                {formatNumber(value)}
              </span>
            ))}
          </div>
        ) : null}
        <div className="ui-metric-chart__canvas">
          <svg
            className="ui-metric-chart__plot"
            viewBox={`0 0 ${WIDTH} 100`}
            preserveAspectRatio="none"
            style={{ height }}
            role="img"
            aria-label={summaryLabel}
            onPointerMove={handlePointer}
            onPointerLeave={() => setHover(null)}
          >
            <line
              className="ui-metric-chart__axis"
              x1={PAD_X}
              x2={WIDTH - PAD_X}
              y1={100 - PAD_Y}
              y2={100 - PAD_Y}
            />
            {thresholds
              .filter((threshold) => Number.isFinite(threshold))
              .map((threshold) => (
                <line
                  key={`threshold-${threshold}`}
                  className="ui-metric-chart__threshold"
                  x1={PAD_X}
                  x2={WIDTH - PAD_X}
                  y1={projectYValue(threshold, geometry)}
                  y2={projectYValue(threshold, geometry)}
                  data-value={threshold}
                />
              ))}
            {geometry.series.map((item) =>
              item.segments.map((segment) => {
                const first = segment.points[0];
                const last = segment.points.at(-1);
                const areaPoints =
                  area && first !== undefined && last !== undefined
                    ? `${first[0]},${100 - PAD_Y} ${segment.points
                        .map(([x, y]) => `${x},${y}`)
                        .join(" ")} ${last[0]},${100 - PAD_Y}`
                    : null;
                return (
                  <g key={`${item.key}-${segment.points[0]?.join(",") ?? "segment"}`}>
                    {areaPoints !== null ? (
                      <polygon
                        className="ui-metric-chart__area"
                        points={areaPoints}
                        style={{ fill: item.color }}
                        data-series-key={item.key}
                      />
                    ) : null}
                    <polyline
                      className="ui-metric-chart__line"
                      points={segment.points.map(([x, y]) => `${x},${y}`).join(" ")}
                      style={{ stroke: item.color }}
                      fill="none"
                      vectorEffect="non-scaling-stroke"
                      data-series-key={item.key}
                    />
                  </g>
                );
              }),
            )}
            {hover !== null ? (
              <line
                className="ui-metric-chart__hover-line"
                x1={hoverX}
                x2={hoverX}
                y1={PAD_Y}
                y2={100 - PAD_Y}
              />
            ) : null}
            {hover !== null
              ? hoverPoints.map(({ series: item, point }) => (
                  <circle
                    key={`hover-${item.key}`}
                    className="ui-metric-chart__hover-dot"
                    cx={
                      PAD_X +
                      ((point.t - geometry.xMin) / (geometry.xMax - geometry.xMin || 1)) *
                        (WIDTH - PAD_X * 2)
                    }
                    cy={projectYValue(point.v ?? geometry.yMin, geometry)}
                    r={1.4}
                    style={{ fill: item.color }}
                    vectorEffect="non-scaling-stroke"
                  />
                ))
              : null}
            <rect x={0} y={0} width={WIDTH} height={100} fill="transparent" pointerEvents="all" />
          </svg>
          {tooltip && hover !== null ? (
            <div
              className="ui-metric-chart__tooltip"
              style={{ left: `${Math.min(94, Math.max(6, hover.ratio * 100))}%` }}
              data-testid="metric-chart-tooltip"
            >
              <span className="ui-metric-chart__tooltip-time">{formatTime(hover.t)}</span>
              {hoverPoints.map(({ series: item, point }) => (
                <span key={item.key} className="ui-metric-chart__tooltip-row">
                  <span
                    className="ui-metric-chart__swatch"
                    style={{ background: item.color }}
                    aria-hidden="true"
                  />
                  {item.label ?? item.key}
                  <b>{formatNumber(point.v ?? 0, item)}</b>
                </span>
              ))}
            </div>
          ) : null}
          <div className="ui-metric-chart__axis-labels" aria-hidden="true">
            <span>{formatTime(geometry.xMin)}</span>
            <span>{formatTime(geometry.xMax)}</span>
          </div>
        </div>
      </div>
      {showLegend ? (
        <div className="ui-metric-chart__legend">
          {geometry.series.map((item, index) => {
            const source = series[index];
            return (
              <span key={item.key} className="ui-metric-chart__legend-item">
                <span
                  className="ui-metric-chart__swatch"
                  style={{ background: item.color }}
                  aria-hidden="true"
                />
                {item.label}
                {item.lastValue !== null ? (
                  <b className="ui-metric-chart__last">{formatNumber(item.lastValue, source)}</b>
                ) : null}
              </span>
            );
          })}
        </div>
      ) : null}
      <span className="ui-sr-only">
        Range {formatNumber(geometry.yMin)} to {formatNumber(geometry.yMax)}
      </span>
      <table className="ui-sr-only" data-testid="metric-chart-summary">
        <caption>{`${summaryLabel} summary`}</caption>
        <thead>
          <tr>
            <th scope="col">Series</th>
            <th scope="col">Latest</th>
            <th scope="col">Min</th>
            <th scope="col">Max</th>
          </tr>
        </thead>
        <tbody>
          {geometry.series.map((item, index) => {
            const source = series[index];
            return (
              <tr key={item.key}>
                <th scope="row">{item.label}</th>
                <td>{item.lastValue !== null ? formatNumber(item.lastValue, source) : "—"}</td>
                <td>{formatNumber(item.minValue, source)}</td>
                <td>{formatNumber(item.maxValue, source)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import { type ReactNode, useEffect, useState } from "react";
import { cx } from "./classes";

export type RelativeTimeNumeric = "always" | "auto";
export type RelativeTimeStyle = "long" | "short" | "narrow";
/**
 * `distance` mimics date-fns `formatDistance` English wording ("about 1 hour
 * ago"), intentionally bounded to the thresholds documented in docs/SKILL.md.
 */
export type RelativeTimeFormat = RelativeTimeStyle | "distance";

export interface RelativeTimeProps {
  value: string | number | Date;
  /** Injectable clock for deterministic tests / SSR. */
  now?: Date | number;
  locale?: string;
  numeric?: RelativeTimeNumeric;
  /** Intl style, or `distance` for date-fns-like approximate wording. */
  format?: RelativeTimeFormat;
  /** Re-render cadence; 0 disables the timer. Ignored when `now` is injected. */
  refreshMs?: number;
  timeZone?: string;
  fallback?: ReactNode;
  className?: string;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

function toMillis(value: string | number | Date): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return new Date(value).getTime();
}

function relativeUnit(diff: number): { value: number; unit: Intl.RelativeTimeFormatUnit } {
  const magnitude = Math.abs(diff);
  if (magnitude < MINUTE) return { value: Math.round(diff / SECOND), unit: "second" };
  if (magnitude < HOUR) return { value: Math.round(diff / MINUTE), unit: "minute" };
  if (magnitude < DAY) return { value: Math.round(diff / HOUR), unit: "hour" };
  if (magnitude < MONTH) return { value: Math.round(diff / DAY), unit: "day" };
  if (magnitude < YEAR) return { value: Math.round(diff / MONTH), unit: "month" };
  return { value: Math.round(diff / YEAR), unit: "year" };
}

/**
 * date-fns-compatible English distance wording. Thresholds are deliberately
 * bounded (1 min / 45 min / 90 min / 24 h / 42 h / 30 d / 60 d / 12/18
 * months); the caller can still use `format="long"` when exact pluralisation
 * matters.
 */
function formatDistance(diff: number): string {
  const past = diff <= 0;
  const minutes = Math.floor(Math.abs(diff) / MINUTE);
  let phrase: string;

  if (minutes < 1) {
    phrase = "less than a minute";
  } else if (minutes < 45) {
    phrase = `${minutes} minute${minutes === 1 ? "" : "s"}`;
  } else if (minutes < 90) {
    phrase = "about 1 hour";
  } else if (minutes < 1440) {
    phrase = `about ${Math.round(minutes / 60)} hours`;
  } else if (minutes < 2520) {
    phrase = "1 day";
  } else if (minutes < 43200) {
    const days = Math.round(minutes / 1440);
    phrase = `${days} days`;
  } else if (minutes < 86400) {
    phrase = "about 1 month";
  } else {
    const months = Math.floor(Math.abs(diff) / MONTH);
    if (months < 12) {
      phrase = `${months} months`;
    } else if (months < 18) {
      phrase = "about 1 year";
    } else {
      const years = Math.round(months / 12);
      phrase = `${years} years`;
    }
  }

  return past ? `${phrase} ago` : `in ${phrase}`;
}

/**
 * `Intl.RelativeTimeFormat` based relative label (or date-fns-like distance
 * wording). `now` is injectable so tests and server rendering are
 * deterministic; the DOM interval only updates the label, never the value.
 */
export function formatRelativeTime(
  value: string | number | Date,
  now: Date | number = Date.now(),
  locale?: string,
  numeric: RelativeTimeNumeric = "auto",
  format: RelativeTimeFormat = "short",
): string | null {
  const target = toMillis(value);
  const reference = toMillis(now);
  if (!Number.isFinite(target) || !Number.isFinite(reference)) return null;
  if (format === "distance") return formatDistance(target - reference);
  const { value: amount, unit } = relativeUnit(target - reference);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric, style: format });
  return formatter.format(amount, unit);
}

export function RelativeTime({
  value,
  now,
  locale,
  numeric = "auto",
  format = "short",
  refreshMs = 30_000,
  timeZone,
  fallback,
  className,
}: RelativeTimeProps) {
  const [tick, setTick] = useState(() => Date.now());
  const injected = now !== undefined;

  useEffect(() => {
    if (injected || refreshMs <= 0) return;
    const timer = setInterval(() => setTick(Date.now()), refreshMs);
    return () => clearInterval(timer);
  }, [injected, refreshMs]);

  const reference = injected ? toMillis(now) : tick;
  const target = toMillis(value);
  if (!Number.isFinite(target)) {
    return <span className={cx("ui-relative-time", className)}>{fallback ?? "—"}</span>;
  }

  const label = formatRelativeTime(target, reference, locale, numeric, format) ?? "—";
  const absolute = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "medium",
    ...(timeZone !== undefined ? { timeZone } : {}),
  }).format(new Date(target));

  return (
    <time
      className={cx("ui-relative-time", className)}
      dateTime={new Date(target).toISOString()}
      title={absolute}
    >
      {label}
    </time>
  );
}

import { useUiAdapter } from "../adapter";
import { cx } from "./classes";

/** Semantic status tone vocabulary shared by adapter badges and value views. */
export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

const DEFAULT_STATUS_TONES: Readonly<Record<string, StatusTone>> = {
  active: "success",
  healthy: "success",
  ok: "success",
  ready: "success",
  running: "success",
  succeeded: "success",
  success: "success",
  degraded: "warning",
  pending: "warning",
  provisioning: "warning",
  warning: "warning",
  critical: "danger",
  down: "danger",
  error: "danger",
  failed: "danger",
  failure: "danger",
  info: "info",
  stopped: "neutral",
};

/**
 * Pure status → tone mapping. Entity-specific maps are injected at the call
 * site; this default table only knows generic health words.
 */
export function statusTone(status: string, map?: Readonly<Record<string, StatusTone>>): StatusTone {
  const key = status.trim().toLowerCase();
  return map?.[status] ?? map?.[key] ?? DEFAULT_STATUS_TONES[key] ?? "neutral";
}

export interface StatusBadgeProps {
  status: string;
  /** Overrides the default mapping (merged over the generic table). */
  map?: Readonly<Record<string, StatusTone>>;
  /** Explicit tone wins over both maps. */
  tone?: StatusTone;
  label?: string;
  variant?: "solid" | "soft" | "outline";
  className?: string;
}

export function StatusBadge({
  status,
  map,
  tone,
  label,
  variant = "soft",
  className,
}: StatusBadgeProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  return (
    <span className={merge("ui-status-badge", className)} data-status={status}>
      <ui.Badge tone={tone ?? statusTone(status, map)} variant={variant}>
        {label ?? status.replaceAll("_", " ")}
      </ui.Badge>
    </span>
  );
}

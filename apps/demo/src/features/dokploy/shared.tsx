import type { Command } from "@lynxland/uikit-core";
import { type CommandEntity, useCommand, useStream } from "@lynxland/uikit-react";
import { LogViewer, Progress, type StatusTone, useUiAdapter } from "@lynxland/uikit-surfaces";
import { Rocket } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
  createDeploymentLogSource,
  type Deployment,
  type DeploymentLogFrame,
  deployService,
  type Service,
  servicesEntity,
} from "@/lib/dokploy";

export const SERVICE_STATUS_TONES: Readonly<Record<string, StatusTone>> = {
  running: "success",
  deploying: "warning",
  idle: "neutral",
  stopped: "neutral",
  error: "danger",
};

/** Semantic tone for the dot used by service cards and detail headers. */
export function serviceStatusTone(status: string): StatusTone {
  return SERVICE_STATUS_TONES[status] ?? "neutral";
}

export const DEPLOYMENT_STATUS_TONES: Readonly<Record<string, StatusTone>> = {
  success: "success",
  failed: "danger",
  running: "info",
  queued: "warning",
  cancelled: "neutral",
};

export const SERVER_STATUS_TONES: Readonly<Record<string, StatusTone>> = {
  online: "success",
  offline: "danger",
  maintenance: "warning",
};

export const CERTIFICATE_TONES: Readonly<Record<string, StatusTone>> = {
  active: "success",
  pending: "warning",
  expired: "danger",
  none: "neutral",
};

export function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
}

/** Dokploy containers get a stable generated name such as `shop-web-w7dfk6`. */
export function appNameFor(service: Service): string {
  let hash = 2166136261;
  for (let index = 0; index < service.id.length; index += 1) {
    hash ^= service.id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  let value = Math.abs(hash);
  for (let index = 0; index < 6; index += 1) {
    suffix += alphabet[value % alphabet.length];
    value = Math.floor(value / alphabet.length);
  }
  const slug = service.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug}-${suffix}`;
}

export function deploymentStatusLabel(status: Deployment["status"]): string {
  switch (status) {
    case "success":
      return "Done";
    case "failed":
      return "Error";
    case "running":
      return "Running";
    case "queued":
      return "Queued";
    case "cancelled":
      return "Cancelled";
  }
}

export function formatLogLine(frame: DeploymentLogFrame): string {
  return `${frame.ts.slice(11, 19)}  ${frame.level.toUpperCase().padEnd(5)} ${frame.msg}`;
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  confirmTestId?: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  children?: ReactNode;
}

/** Destructive confirmation shell; the caller owns the command + error text. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  confirmTestId,
  pending = false,
  error = null,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const ui = useUiAdapter();
  return (
    <ui.Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <ui.Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </ui.Button>
          <ui.Button
            type="button"
            variant="destructive"
            loading={pending}
            disabled={pending}
            onClick={onConfirm}
            {...(confirmTestId !== undefined ? { "data-testid": confirmTestId } : {})}
          >
            {confirmLabel}
          </ui.Button>
        </>
      }
    >
      {children}
      {error !== null ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </ui.Dialog>
  );
}

export interface DeleteCommandDialogProps<Input> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  command: Command<Input, unknown>;
  input: Input;
  entity?: CommandEntity;
  entityId?: unknown;
  onDeleted?: () => void;
  confirmLabel?: string;
  confirmTestId?: string;
}

/**
 * Confirmation + mutation in one host. Every destructive action in the slice
 * goes through this component so pending/error semantics stay identical.
 */
export function DeleteCommandDialog<Input>({
  open,
  onOpenChange,
  title,
  description,
  command,
  input,
  entity,
  entityId,
  onDeleted,
  confirmLabel,
  confirmTestId,
}: DeleteCommandDialogProps<Input>) {
  const handle = useCommand(command, {
    ...(entity !== undefined ? { entity } : {}),
    ...(entityId !== undefined ? { id: entityId } : {}),
    onSettled: (result) => {
      if (result?.status !== "ok") return;
      onDeleted?.();
      onOpenChange(false);
    },
  });

  const error =
    handle.failure?.message ??
    (handle.result !== null && handle.result.status !== "ok" ? handle.result.message : null);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      {...(confirmLabel !== undefined ? { confirmLabel } : {})}
      {...(confirmTestId !== undefined ? { confirmTestId } : {})}
      pending={handle.pending}
      error={error}
      onConfirm={() => handle.mutate(input)}
    />
  );
}

export function DeployButton({
  service,
  size = "sm",
  variant = "secondary",
}: {
  service: Service;
  size?: "sm" | "md" | "lg" | "icon";
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
}) {
  const ui = useUiAdapter();
  const deploy = useCommand(deployService, {
    entity: servicesEntity.collection,
    id: service.id,
  });
  const message =
    deploy.failure?.message ??
    (deploy.result !== null && deploy.result.status !== "ok" ? deploy.result.message : null);

  return (
    <span className="inline-flex min-w-0 flex-col gap-1">
      <ui.Button
        type="button"
        size={size}
        variant={variant}
        loading={deploy.pending}
        disabled={deploy.pending || service.status === "deploying"}
        onClick={() => deploy.mutate(service.id)}
        data-testid={`deploy-${service.id}`}
      >
        {!deploy.pending ? <Rocket size={12} aria-hidden /> : null}
        {deploy.pending ? "Deploying…" : "Deploy"}
      </ui.Button>
      {message !== null ? (
        <span role="alert" className="text-[11px] text-destructive">
          {message}
        </span>
      ) : null}
    </span>
  );
}

/** Live deployment logs in a drawer; opens for one deployment and stops on close. */
export function DeploymentLogDrawer({
  deployment,
  onClose,
}: {
  deployment: Deployment;
  onClose: () => void;
}) {
  const ui = useUiAdapter();
  const [source] = useState(() => createDeploymentLogSource(deployment.id));
  const stream = useStream(source, {
    cursor: null,
    policy: { buffer: 400, pauseable: true },
  });

  return (
    <ui.Drawer
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={`Logs · ${deployment.serviceName}`}
      description={`${deployment.id} · ${deployment.commit} · ${deployment.environment}`}
      size="xl"
    >
      <LogViewer<DeploymentLogFrame>
        stream={stream}
        title={`${deployment.id} deployment logs`}
        formatLine={formatLogLine}
        height={420}
        downloadFileName={`${deployment.id}-logs.txt`}
      />
    </ui.Drawer>
  );
}

export function UsageBar({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: string;
}) {
  const tone = value >= 85 ? "danger" : value >= 65 ? "warning" : "success";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono text-foreground">{detail ?? `${value}%`}</span>
      </div>
      <Progress value={value} tone={tone} aria-label={label} />
    </div>
  );
}

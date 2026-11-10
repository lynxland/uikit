import type { ApiError } from "@lynxland/uikit-core";
import type { ReactNode } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "./classes";

export function describeApiError(error: ApiError): string {
  switch (error.kind) {
    case "network":
      return "Network unreachable. Check your connection and retry.";
    case "auth":
      return "Session expired. Sign in again to continue.";
    case "forbidden":
      return "You do not have access to this resource.";
    case "not-found":
      return "Resource not found.";
    case "decode":
      return `Unexpected response format${error.detail !== undefined ? ` (${error.detail})` : ""}.`;
    case "server":
      return `Server error${error.status !== undefined ? ` ${error.status}` : ""}${
        error.message !== "" ? `: ${error.message}` : ""
      }.`;
  }
}

export interface LoadingStateProps {
  rows?: number;
  label?: string;
  className?: string;
}

const skeletonKeys = (rows: number): string[] =>
  Array.from({ length: Math.max(0, rows) }, (_, index) => `ui-skeleton-${index}`);

export function LoadingState({ rows = 5, label = "Loading", className }: LoadingStateProps) {
  return (
    <div
      className={cx("ui-state ui-state--loading", className)}
      role="status"
      aria-busy="true"
      aria-label={label}
      data-testid="loading-state"
    >
      {skeletonKeys(rows).map((key) => (
        <span key={key} className="ui-skeleton" />
      ))}
    </div>
  );
}

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cx("ui-state ui-state--empty", className)} data-testid="empty-state">
      {icon !== undefined ? <div className="ui-state__icon">{icon}</div> : null}
      <div className="ui-state__title">{title}</div>
      {description !== undefined ? (
        <div className="ui-state__description">{description}</div>
      ) : null}
      {action !== undefined ? <div className="ui-state__action">{action}</div> : null}
    </div>
  );
}

export interface ErrorStateProps {
  error: ApiError | null;
  onRetry?: () => void;
  describeError?: (error: ApiError) => string;
  title?: string;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  error,
  onRetry,
  describeError,
  title = "Something went wrong",
  retryLabel = "Retry",
  className,
}: ErrorStateProps) {
  const ui = useUiAdapter();
  const message =
    error === null ? "The request failed." : (describeError ?? describeApiError)(error);

  return (
    <div
      className={cx("ui-state ui-state--error", className)}
      role="alert"
      data-testid="error-state"
      data-error-kind={error?.kind}
    >
      <div className="ui-state__title">{title}</div>
      <div className="ui-state__description">{message}</div>
      {onRetry !== undefined ? (
        <ui.Button variant="outline" size="sm" type="button" onClick={onRetry}>
          {retryLabel}
        </ui.Button>
      ) : null}
    </div>
  );
}

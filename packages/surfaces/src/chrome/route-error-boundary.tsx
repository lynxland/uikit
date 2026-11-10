import { isApiError } from "@lynxland/uikit-core";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";
import { describeApiError } from "../values/states";

/**
 * Page-level error boundary (design.md §6.3). `error` as a prop covers router
 * `errorComponent` usage; the class boundary covers render-time throws.
 * Retry can run an app-provided `reset`/`onRetry`; no Router import.
 */

export interface RouteErrorBoundaryProps {
  children?: ReactNode;
  /** Injected error (router errorComponent / loader failures). */
  error?: unknown;
  /** Router reset (re-run loaders / re-render). */
  reset?: () => void;
  /** Extra recovery hook; runs after `reset` and clears the local boundary. */
  onRetry?: () => void;
  title?: ReactNode;
  retryLabel?: ReactNode;
  describe?: (error: unknown) => string;
  /** Fully custom fallback; receives the current error and retry callback. */
  fallback?: (error: unknown, retry: () => void) => ReactNode;
  className?: string;
}

interface RouteErrorBoundaryState {
  error: unknown;
  hasError: boolean;
}

export function describeUnknownError(error: unknown): string {
  if (isApiError(error)) return describeApiError(error);
  if (error instanceof Error) return error.message;
  return String(error);
}

interface ErrorFallbackProps {
  error: unknown;
  retry: () => void;
  title?: ReactNode;
  retryLabel?: ReactNode;
  describe?: (error: unknown) => string;
  className?: string;
}

function ErrorFallback({
  error,
  retry,
  title = "This page failed to load",
  retryLabel = "Retry",
  describe,
  className,
}: ErrorFallbackProps) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  return (
    <div
      className={merge("ui-error-boundary", className)}
      role="alert"
      data-testid="route-error-boundary"
    >
      <div className="ui-error-boundary__title">{title}</div>
      <div className="ui-error-boundary__description">
        {(describe ?? describeUnknownError)(error)}
      </div>
      <ui.Button type="button" variant="outline" size="sm" onClick={retry}>
        {retryLabel}
      </ui.Button>
    </div>
  );
}

export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  override state: RouteErrorBoundaryState = { error: null, hasError: false };

  static getDerivedStateFromError(error: unknown): RouteErrorBoundaryState {
    return { error, hasError: true };
  }

  override componentDidCatch(_error: unknown, _info: ErrorInfo): void {
    // Intentionally empty: rendering/reporting policy belongs to the app.
  }

  private readonly retry = () => {
    this.props.reset?.();
    this.setState({ error: null, hasError: false });
    this.props.onRetry?.();
  };

  override render(): ReactNode {
    const error =
      this.props.error !== undefined && this.props.error !== null
        ? this.props.error
        : this.state.hasError
          ? this.state.error
          : undefined;

    if (error === undefined) return this.props.children ?? null;

    if (this.props.fallback !== undefined) {
      return this.props.fallback(error, this.retry);
    }

    return (
      <ErrorFallback
        error={error}
        retry={this.retry}
        {...(this.props.title !== undefined ? { title: this.props.title } : {})}
        {...(this.props.retryLabel !== undefined ? { retryLabel: this.props.retryLabel } : {})}
        {...(this.props.describe !== undefined ? { describe: this.props.describe } : {})}
        {...(this.props.className !== undefined ? { className: this.props.className } : {})}
      />
    );
  }
}

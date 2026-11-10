import { ApiError } from "@lynxland/uikit-core";
import { isValidElement, type ReactNode } from "react";
import { cx } from "../values/classes";
import {
  EmptyState,
  type EmptyStateProps,
  ErrorState,
  LoadingState,
  type LoadingStateProps,
} from "../values/states";

export type AsyncStatus = "idle" | "loading" | "empty" | "error" | "success";

export interface AsyncStateProps {
  /** Binding status (`idle` is presented as loading; it never fetches here). */
  status: AsyncStatus;
  error?: ApiError | null;
  onRetry?: () => void;
  /** Structured empty state or a fully custom node. */
  empty?: ReactNode | EmptyStateProps;
  loading?: ReactNode;
  loadingRows?: LoadingStateProps["rows"];
  errorTitle?: string;
  describeError?: (error: ApiError) => string;
  children: ReactNode;
  className?: string;
}

function isEmptyStateProps(value: ReactNode | EmptyStateProps): value is EmptyStateProps {
  return (
    typeof value === "object" &&
    value !== null &&
    !isValidElement(value) &&
    !Array.isArray(value) &&
    "title" in value
  );
}

/**
 * Four-state presentation switch: loading / empty / error / success. It never
 * fetches, retries or owns data; `onRetry` is a caller-supplied callback.
 */
export function AsyncState({
  status,
  error,
  onRetry,
  empty,
  loading,
  loadingRows,
  errorTitle,
  describeError,
  children,
  className,
}: AsyncStateProps) {
  let content: ReactNode;
  if (status === "success") {
    content = children;
  } else if (status === "error") {
    content = (
      <ErrorState
        error={error ?? new ApiError("server", { message: "The request failed." })}
        {...(onRetry !== undefined ? { onRetry } : {})}
        {...(errorTitle !== undefined ? { title: errorTitle } : {})}
        {...(describeError !== undefined ? { describeError } : {})}
      />
    );
  } else if (status === "empty") {
    content =
      empty === undefined ? (
        <EmptyState title="No results" />
      ) : isEmptyStateProps(empty) ? (
        <EmptyState {...empty} />
      ) : (
        empty
      );
  } else {
    content = loading ?? <LoadingState rows={loadingRows} />;
  }

  return (
    <div className={cx("ui-async-state", className)} data-status={status} data-testid="async-state">
      {content}
    </div>
  );
}

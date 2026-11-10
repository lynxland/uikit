import type { ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";
import { StatusBadge } from "../values/status-badge";
import {
  lastFrames,
  STREAM_STATUS_TONES,
  type StreamViewSource,
  useStreamFrames,
  useStreamState,
} from "./stream";

/**
 * Bounded log viewer over a stream binding (design.md §6.2). Following,
 * pause/resume, clear and (optional) download are view-local interactions;
 * the frame ring itself stays owned by the engine/binding.
 */

export interface LogViewerProps<F> {
  stream: StreamViewSource<F>;
  formatLine?: (frame: F, index: number) => string;
  /** Rich line renderer; rendered inside the line wrapper and takes precedence over `formatLine`. */
  renderLine?: (frame: F, index: number) => ReactNode;
  /** Extra controls rendered as a full-width row between the header and the log body. */
  toolbar?: ReactNode;
  /** Hide the built-in header and toolbar; the caller owns follow/pause controls. */
  hideHeader?: boolean;
  /** Render cap: only the newest N frames are shown (default 500). */
  limit?: number;
  height?: number;
  wrap?: boolean;
  title?: ReactNode;
  emptyText?: ReactNode;
  /** When set, renders a download button using this file name. */
  downloadFileName?: string;
  className?: string;
}

export function LogViewer<F>({
  stream,
  formatLine,
  renderLine,
  toolbar,
  hideHeader = false,
  limit = 500,
  height = 420,
  wrap = true,
  title = "Log stream",
  emptyText = "Waiting for frames…",
  downloadFileName,
  className,
}: LogViewerProps<F>) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const frames = useStreamFrames(stream);
  const state = useStreamState(stream);
  const visible = lastFrames(frames, limit);
  const offset = frames.length - visible.length;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [following, setFollowing] = useState(true);

  // biome-ignore lint/correctness/useExhaustiveDependencies: new frames must re-pin the view while following
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (element !== null && following) element.scrollTop = element.scrollHeight;
  }, [frames, following]);

  const paused = state.status === "paused";
  const format = formatLine ?? ((frame: F) => String(frame));

  const download = () => {
    if (downloadFileName === undefined || typeof URL.createObjectURL !== "function") return;
    const text = visible.map((frame, index) => format(frame, offset + index)).join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = downloadFileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={merge("ui-log-viewer", hideHeader && "ui-log-viewer--no-header", className)}
      data-testid="log-viewer"
    >
      {hideHeader ? null : (
        <div className="ui-log-viewer__header">
          <div className="ui-log-viewer__heading">
            <span className="ui-log-viewer__title">{title}</span>
            <span data-testid="log-status">
              <StatusBadge status={state.status} map={STREAM_STATUS_TONES} />
            </span>
            <span className="ui-log-viewer__count" data-testid="log-count">
              {visible.length} / {frames.length} lines
            </span>
          </div>
          <div className="ui-log-viewer__controls">
            <ui.Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFollowing((current) => !current)}
              aria-pressed={following}
              data-testid="log-follow"
            >
              {following ? "Following" : "Follow"}
            </ui.Button>
            <ui.Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => (paused ? stream.resume() : stream.pause())}
              data-testid="log-pause"
            >
              {paused ? "Resume" : "Pause"}
            </ui.Button>
            {downloadFileName !== undefined ? (
              <ui.Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={download}
                data-testid="log-download"
              >
                Download
              </ui.Button>
            ) : null}
            <ui.Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => stream.clear()}
              data-testid="log-clear"
            >
              Clear
            </ui.Button>
          </div>
        </div>
      )}
      {!hideHeader && toolbar !== undefined ? (
        <div className="ui-log-viewer__toolbar" data-testid="log-toolbar">
          {toolbar}
        </div>
      ) : null}
      <div
        ref={containerRef}
        className={merge("ui-log-viewer__body", !wrap && "ui-log-viewer__body--nowrap")}
        role="log"
        aria-label="Log lines"
        style={{ height }}
        onScroll={(event) => {
          const element = event.currentTarget;
          setFollowing(element.scrollHeight - element.scrollTop - element.clientHeight < 48);
        }}
      >
        {visible.length === 0 ? (
          <p className="ui-log-viewer__empty">{emptyText}</p>
        ) : (
          visible.map((frame, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: log lines are append-only; position is their identity
            <div key={offset + index} className="ui-log-viewer__line" data-line={offset + index}>
              {renderLine !== undefined
                ? renderLine(frame, offset + index)
                : format(frame, offset + index)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

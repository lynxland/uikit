import type { StreamStatus } from "@lynxland/uikit-core";
import type { ReactNode } from "react";
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
 * Event feed over a stream binding (design.md §6.2). Newest first, optional
 * backlog prefix merged by caller-supplied key, bounded frame window, gap
 * banner and pause/resume/clear controls. No business entity names.
 */

export interface EventFeedProps<F> {
  stream: StreamViewSource<F>;
  /** Static backlog rows (oldest → newest); merged with live frames. */
  backlog?: readonly F[];
  /** Dedupe key (cursor/id composition is the caller's job). */
  getKey?: (frame: F) => string | number;
  render?: (frame: F) => ReactNode;
  /** Live-frame render cap (newest N, default 200). */
  limit?: number;
  title?: ReactNode;
  emptyText?: ReactNode;
  /** Slot shown in the gap banner (page-owned resync orchestration). */
  resyncAction?: ReactNode;
  statusLabels?: Partial<Record<StreamStatus, string>>;
  className?: string;
}

export const EVENT_FEED_DEFAULT_LABELS: Readonly<Record<"gapped" | "stalled" | "paused", string>> =
  {
    gapped: "Retention gap — re-anchor the backlog to continue.",
    stalled: "Reconnect budget exhausted — retry or switch to polling.",
    paused: "Paused — frames buffer from the cursor on resume.",
  };

export function EventFeed<F>({
  stream,
  backlog,
  getKey,
  render,
  limit = 200,
  title = "Events",
  emptyText = "No events yet",
  resyncAction,
  statusLabels,
  className,
}: EventFeedProps<F>) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const frames = useStreamFrames(stream);
  const state = useStreamState(stream);
  const visible = lastFrames(frames, limit);

  let merged: F[];
  if (getKey !== undefined) {
    const byKey = new Map<string | number, F>();
    for (const row of backlog ?? []) byKey.set(getKey(row), row);
    for (const frame of visible) byKey.set(getKey(frame), frame);
    merged = [...byKey.values()];
  } else {
    merged = [...(backlog ?? []), ...visible];
  }
  const rows = [...merged].reverse();

  const rowRender = render ?? ((frame: F) => String(frame));
  const statusLabel = statusLabels?.[state.status] ?? state.status;
  const showGap = state.status === "gapped" || state.status === "stalled";
  const paused = state.status === "paused";

  return (
    <div className={merge("ui-event-feed", className)} data-testid="event-feed">
      <div className="ui-event-feed__header">
        <div className="ui-event-feed__heading">
          <span className="ui-event-feed__title">{title}</span>
          <span data-testid="event-feed-status">
            <StatusBadge
              status={state.status}
              map={STREAM_STATUS_TONES}
              {...(statusLabel !== state.status ? { label: statusLabel } : {})}
            />
          </span>
          {state.resyncs > 0 ? (
            <span className="ui-event-feed__resync" data-testid="event-feed-resync">
              re-synced ×{state.resyncs}
            </span>
          ) : null}
          {paused ? (
            <span className="ui-event-feed__paused" data-testid="event-feed-paused">
              {EVENT_FEED_DEFAULT_LABELS.paused}
            </span>
          ) : null}
        </div>
        <div className="ui-event-feed__controls">
          <ui.Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => (paused ? stream.resume() : stream.pause())}
            data-testid="event-feed-pause"
          >
            {paused ? "Resume" : "Pause"}
          </ui.Button>
          <ui.Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => stream.clear()}
            data-testid="event-feed-clear"
          >
            Clear
          </ui.Button>
          <span className="ui-event-feed__count" data-testid="event-feed-count">
            {rows.length} events
          </span>
        </div>
      </div>
      {showGap ? (
        <div className="ui-event-feed__gap" role="status" data-testid="event-feed-gap">
          <span>
            {state.status === "gapped"
              ? EVENT_FEED_DEFAULT_LABELS.gapped
              : EVENT_FEED_DEFAULT_LABELS.stalled}
          </span>
          {resyncAction}
        </div>
      ) : null}
      <ul className="ui-event-feed__list" aria-label="Events">
        {rows.length === 0 ? (
          <li className="ui-event-feed__empty">{emptyText}</li>
        ) : (
          rows.map((frame, index) => (
            <li
              key={getKey !== undefined ? getKey(frame) : `row-${index}`}
              className="ui-event-feed__item"
            >
              {rowRender(frame)}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
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
 * Stage timeline over a stream binding (design.md §6.2). The page declares a
 * stage catalog and projects frames via `onStage`; frames unrelated to the
 * timeline return `undefined` and are skipped.
 */

export type StageEventStatus = "active" | "done" | "failed";

export interface StageEvent {
  /** Catalog key; unknown keys are appended after the declared stages. */
  key: string;
  status: StageEventStatus;
  /** Event timestamp (ISO); arrival time is used when absent. */
  at?: string;
  note?: ReactNode;
}

export interface StageTimelineStep {
  key: string;
  label: ReactNode;
}

export interface StageTimelineProps<F> {
  stream: StreamViewSource<F>;
  /** Stage catalog; declaration order is render order. */
  stages: readonly StageTimelineStep[];
  /** Frame projection; `undefined` means "unrelated to this timeline". */
  onStage: (frame: F) => StageEvent | undefined;
  /** Live-frame render cap (default 500). */
  limit?: number;
  /** Elapsed-time refresh for active stages (ms; 0 disables the tick). */
  tickMs?: number;
  title?: ReactNode;
  emptyText?: ReactNode;
  className?: string;
}

interface StageState {
  status: StageEventStatus;
  startedAt: number;
  endedAt: number | null;
  note?: ReactNode;
}

function formatElapsed(ms: number): string {
  const safe = Math.max(0, ms);
  const seconds = Math.floor(safe / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export function StageTimeline<F>({
  stream,
  stages,
  onStage,
  limit = 500,
  tickMs = 1000,
  title = "Stages",
  emptyText = "No stages",
  className,
}: StageTimelineProps<F>) {
  const ui = useUiAdapter();
  const merge = ui.cx ?? cx;
  const frames = useStreamFrames(stream);
  const state = useStreamState(stream);
  const visible = lastFrames(frames, limit);

  const fold = useMemo(() => {
    const byKey = new Map<string, StageState>();
    for (const frame of visible) {
      const event = onStage(frame);
      if (event === undefined) continue;
      const at = event.at !== undefined ? Date.parse(event.at) : Date.now();
      if (!Number.isFinite(at)) continue;
      const previous = byKey.get(event.key);
      if (previous === undefined) {
        byKey.set(event.key, {
          status: event.status,
          startedAt: at,
          endedAt: event.status === "active" ? null : at,
          ...(event.note !== undefined ? { note: event.note } : {}),
        });
        continue;
      }
      byKey.set(event.key, {
        status: event.status,
        startedAt: previous.startedAt,
        endedAt: event.status === "active" ? null : at,
        ...(event.note !== undefined
          ? { note: event.note }
          : previous.note !== undefined
            ? { note: previous.note }
            : {}),
      });
    }
    return byKey;
  }, [visible, onStage]);

  const rows = useMemo(() => {
    const ordered: StageTimelineStep[] = [...stages];
    for (const key of fold.keys()) {
      if (!stages.some((stage) => stage.key === key)) ordered.push({ key, label: key });
    }
    return ordered.map((definition) => ({ definition, state: fold.get(definition.key) }));
  }, [stages, fold]);

  const hasActive = rows.some((row) => row.state?.status === "active");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!hasActive || tickMs <= 0) return;
    const timer = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(timer);
  }, [hasActive, tickMs]);

  const paused = state.status === "paused";

  return (
    <div className={merge("ui-stage-timeline", className)} data-testid="stage-timeline">
      <div className="ui-stage-timeline__header">
        <div className="ui-stage-timeline__heading">
          <span className="ui-stage-timeline__title">{title}</span>
          <span data-testid="stage-timeline-status">
            <StatusBadge status={state.status} map={STREAM_STATUS_TONES} />
          </span>
        </div>
        <div className="ui-stage-timeline__controls">
          <ui.Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => (paused ? stream.resume() : stream.pause())}
            data-testid="stage-timeline-pause"
          >
            {paused ? "Resume" : "Pause"}
          </ui.Button>
          <ui.Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => stream.clear()}
            data-testid="stage-timeline-clear"
          >
            Clear
          </ui.Button>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="ui-stage-timeline__empty">{emptyText}</p>
      ) : (
        <ol className="ui-stage-timeline__list" aria-label="Stages">
          {rows.map(({ definition, state: stage }) => {
            const status = stage?.status ?? "pending";
            const elapsed =
              stage === undefined
                ? null
                : stage.endedAt !== null
                  ? formatElapsed(stage.endedAt - stage.startedAt)
                  : formatElapsed(now - stage.startedAt);
            return (
              <li
                key={definition.key}
                className="ui-stage-timeline__item"
                data-stage={definition.key}
                data-stage-status={status}
              >
                <span className="ui-stage-timeline__marker" aria-hidden="true">
                  {status === "done" ? (
                    <ui.icons.Check size={12} />
                  ) : status === "failed" ? (
                    <ui.icons.X size={12} />
                  ) : status === "active" ? (
                    <ui.icons.Loader size={12} />
                  ) : (
                    <span className="ui-stage-timeline__dot" />
                  )}
                </span>
                <div className="ui-stage-timeline__content">
                  <span className="ui-stage-timeline__label">{definition.label}</span>
                  {stage?.note !== undefined ? (
                    <span className="ui-stage-timeline__note">{stage.note}</span>
                  ) : null}
                </div>
                {elapsed !== null ? (
                  <span className="ui-stage-timeline__elapsed" data-stage-elapsed={definition.key}>
                    {elapsed}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

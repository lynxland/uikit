import type { StreamHandle, StreamState, StreamStatus } from "@lynxland/uikit-core";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { StatusTone } from "../values/status-badge";

/**
 * A stream binding plus the optional live-state channel exposed by
 * `StreamEngine`. Views accept a plain `StreamHandle`; when the engine's
 * `subscribeStatus`/`getState` pair is present the header reacts to status
 * changes without waiting for the next frame.
 */
export interface StreamViewSource<F> extends StreamHandle<F> {
  subscribeStatus?(listener: () => void): () => void;
  getState?(): StreamState;
}

export const STREAM_STATUS_TONES: Readonly<Record<StreamStatus, StatusTone>> = {
  idle: "neutral",
  live: "success",
  reconnecting: "warning",
  paused: "info",
  gapped: "warning",
  stalled: "warning",
  ended: "neutral",
  error: "danger",
};

const NOOP_UNSUBSCRIBE = () => {};

/** Subscribe to the frame ring buffer (the engine caches its snapshot). */
export function useStreamFrames<F>(stream: StreamViewSource<F>): readonly F[] {
  const subscribeFrames = stream.subscribeFrames;
  const getFrames = stream.getFrames;
  const subscribe = useCallback(
    (listener: () => void) => subscribeFrames.call(stream, listener),
    [stream, subscribeFrames],
  );
  const getSnapshot = useCallback(() => getFrames.call(stream), [stream, getFrames]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Subscribe to status/resync state when the engine provides it. */
export function useStreamState<F>(stream: StreamViewSource<F>): StreamState {
  const subscribeStatus = stream.subscribeStatus;
  const getState = stream.getState;

  // Fallback snapshot for plain handles: cached between renders so
  // `useSyncExternalStore` never sees a fresh object identity.
  const fallback = useMemo<StreamState>(
    () => ({ status: stream.status, error: stream.error, resyncs: stream.resyncs }),
    [stream.status, stream.error, stream.resyncs],
  );

  const subscribe = useCallback(
    (listener: () => void) =>
      subscribeStatus === undefined ? NOOP_UNSUBSCRIBE : subscribeStatus.call(stream, listener),
    [stream, subscribeStatus],
  );

  const getSnapshot = useCallback(
    () => (getState === undefined ? fallback : getState.call(stream)),
    [fallback, getState, stream],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Last-N window used by the bounded stream views. */
export function lastFrames<F>(frames: readonly F[], limit: number): readonly F[] {
  const size = Math.max(1, Math.floor(limit));
  return frames.length <= size ? frames : frames.slice(frames.length - size);
}

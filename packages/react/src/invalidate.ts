import type { Effect, Scope, StreamHandle } from "@lynxland/uikit-core";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { applyEffects } from "./command";

/**
 * Reactive invalidation (design.md §5.4): frames arrive -> apply core `Effect[]`.
 *
 * This is a composition hook, not a new primitive. `StreamEngine` (returned by
 * `useStream`) exposes `onFrame`, so a bounded ring buffer never hides dropped
 * frames; plain `StreamHandle`s fall back to diffing the frame buffer.
 * Throttling is trailing: one invalidation per window.
 */

export interface UseInvalidateOnFrameOptions<F> {
  /** Only invalidation-worthy frames (e.g. `deleted`). */
  filter?: (frame: F) => boolean;
  /** Trailing coalescing window in ms; 0 = every matching frame. */
  throttleMs?: number;
  /** Scope used to match invalidate effects (defaults to {}). */
  scope?: Scope;
}

export type FrameStream<F> = Pick<StreamHandle<F>, "subscribeFrames" | "getFrames"> & {
  /** Present on `StreamEngine` (the value returned by `useStream`). */
  onFrame?(callback: (frame: F) => void): () => void;
};

export function useInvalidateOnFrame<F>(
  stream: FrameStream<F>,
  effects: readonly Effect[],
  options: UseInvalidateOnFrameOptions<F> = {},
): void {
  const queryClient = useQueryClient();
  const subscribe = stream.subscribeFrames;
  const getFrames = stream.getFrames;
  const onFrame = stream.onFrame;

  const latest = useRef({ effects, options });
  latest.current = { effects, options };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending = false;

    const flush = (): void => {
      timer = null;
      if (!pending) return;
      pending = false;
      applyEffects(queryClient, latest.current.effects, latest.current.options.scope ?? {});
    };

    const ingest = (): void => {
      const throttle = latest.current.options.throttleMs ?? 0;
      if (throttle <= 0) {
        applyEffects(queryClient, latest.current.effects, latest.current.options.scope ?? {});
        return;
      }
      pending = true;
      if (timer === null) timer = setTimeout(flush, throttle);
    };

    const matches = (frame: F): boolean => {
      const filter = latest.current.options.filter;
      return filter === undefined || filter(frame);
    };

    let unsubscribe: () => void;

    if (onFrame !== undefined) {
      // Preferred path (StreamEngine): frames are pushed, so a bounded ring
      // buffer never hides frames that were dropped before the next read.
      unsubscribe = onFrame((frame) => {
        if (matches(frame)) ingest();
      });
    } else {
      let last = getFrames().length;
      unsubscribe = subscribe(() => {
        const frames = getFrames();
        if (frames.length < last) last = 0; // resync/clear resets the buffer
        for (let index = last; index < frames.length; index += 1) {
          const frame = frames[index];
          if (frame === undefined) continue;
          if (matches(frame)) ingest();
        }
        last = frames.length;
      });
    }

    return () => {
      unsubscribe();
      if (timer !== null) clearTimeout(timer);
      timer = null;
      pending = false;
    };
  }, [queryClient, subscribe, getFrames, onFrame]);
}

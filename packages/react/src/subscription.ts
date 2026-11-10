import type {
  Cursor,
  Scope,
  StreamEngine,
  StreamFactory,
  StreamPolicy,
  StreamSource,
} from "@lynxland/uikit-core";
import { canonicalScope, createSubscriptionEngine } from "@lynxland/uikit-core";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useScope } from "./scope";

/**
 * Stream binding (design.md §5.4).
 *
 * Core owns the engine (pure TS); React only wires status/frames into
 * `useSyncExternalStore` and keeps the engine lifecycle in an effect.
 *
 * Cursor semantics:
 * - `undefined` — standby (idle until started/anchored);
 * - `null` — live tail (starts by default);
 * - string — resume from that anchor.
 */

export interface UseStreamOptions<F, P = unknown> {
  params?: P;
  scope?: Scope;
  policy?: StreamPolicy;
  cursor?: Cursor | null;
  getCursor?: (frame: F) => Cursor | undefined;
  onFrame?: (frame: F) => void;
  /** Default: cursor !== undefined (null = live tail starts immediately). */
  autoStart?: boolean;
}

export type StreamBinding<F> = StreamEngine<F>;

function stableKey(value: unknown): string {
  try {
    const encoded = JSON.stringify(value);
    return encoded ?? String(value);
  } catch {
    return String(value);
  }
}

export function useStream<F>(
  source: StreamSource<F>,
  options?: UseStreamOptions<F>,
): StreamBinding<F>;
export function useStream<P, F>(
  source: StreamFactory<P, F>,
  options: UseStreamOptions<F, P> & { params: P },
): StreamBinding<F>;
export function useStream<P, F>(
  source: StreamSource<F> | StreamFactory<P, F>,
  options: UseStreamOptions<F, P> = {},
): StreamBinding<F> {
  const provider = useScope();
  // Streams have no declared scope keys; the provider is adopted unconditionally.
  const scope = options.scope ?? provider;

  const paramsKey = stableKey(options.params ?? null);
  const scopeKey = stableKey(canonicalScope(scope));
  const cursorKey =
    options.cursor === undefined
      ? "\u0000standby"
      : options.cursor === null
        ? "\u0000live"
        : options.cursor;
  const policyKey = stableKey(options.policy ?? null);

  const onFrameRef = useRef(options.onFrame);
  onFrameRef.current = options.onFrame;
  const getCursorRef = useRef(options.getCursor);
  getCursorRef.current = options.getCursor;
  const policyRef = useRef(options.policy);
  policyRef.current = options.policy;

  // Stable factory invocation: identity changes of the factory rebuild the
  // stream by design; params/scope are anchored by their serialized values.
  // biome-ignore lint/correctness/useExhaustiveDependencies: params/scope are anchored by their serialized keys
  const resolved = useMemo<StreamSource<F>>(() => {
    if (typeof source === "function") {
      return (source as StreamFactory<P, F>)(options.params as P, scope);
    }
    return source;
  }, [source, paramsKey, scopeKey]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: cursor/policy are anchored by their serialized keys
  const engine = useMemo<StreamEngine<F>>(
    () =>
      createSubscriptionEngine<F>({
        source: resolved,
        cursor: options.cursor ?? null,
        getCursor: (frame) => getCursorRef.current?.(frame),
        ...(policyRef.current !== undefined ? { policy: policyRef.current } : {}),
        onFrame: (frame) => onFrameRef.current?.(frame),
        // Lifecycle is driven below so standby never opens a connection.
        autoStart: false,
      }),
    [resolved, cursorKey, policyKey],
  );

  const shouldStart = options.autoStart ?? options.cursor !== undefined;

  useEffect(() => {
    if (shouldStart) engine.start();
    return () => {
      engine.stop();
    };
  }, [engine, shouldStart]);

  // Re-render on status and frame changes; the engine itself carries the
  // current getters, so callers always read live values after a re-render.
  useSyncExternalStore(engine.subscribeStatus, engine.getState, engine.getState);
  useSyncExternalStore(engine.subscribeFrames, engine.getFrames, engine.getFrames);

  return engine;
}

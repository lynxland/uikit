import type { Outcome } from "./outcome";
import type { SourceName } from "./source";
import type { Scope } from "./types";

export type Effect =
  | {
      type: "invalidate";
      entity: SourceName;
      kind?: "collection" | "record" | "lookup";
      id?: unknown;
      /** Explicit cross-scope invalidation; default intersects with command scope. */
      allScopes?: true;
    }
  | { type: "invalidateKey"; key: readonly unknown[] };

export interface Command<I, O = unknown> {
  /**
   * A function property (not a method signature): method parameters are
   * bivariant and would let `Command<UpdateInput>` silently assign to
   * `Command<CreateInput>`.
   */
  run: (input: I, ctx: Scope) => Promise<Outcome<O>>;
  /** Domain-level judgement of protocol states (delete already gone -> ok). */
  treatAs?: Partial<Record<"not-found" | "forbidden", Outcome<O>>>;
  /** Pure data; the binding applies effects. Not a hidden cache policy. */
  effects?: readonly Effect[];
}

export type AnyCommand = Command<any, any>;

/** Convenience constructors for the two Effect variants. */
export function invalidate(
  entity: SourceName,
  options: {
    kind?: "collection" | "record" | "lookup";
    id?: unknown;
    allScopes?: true;
  } = {},
): Effect {
  return {
    type: "invalidate",
    entity,
    ...(options.kind !== undefined ? { kind: options.kind } : {}),
    ...(options.id !== undefined ? { id: options.id } : {}),
    ...(options.allScopes === true ? { allScopes: true } : {}),
  };
}

export function invalidateKey(key: readonly unknown[]): Effect {
  return { type: "invalidateKey", key };
}

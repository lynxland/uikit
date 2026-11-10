import type { CollectionPage, CollectionReader, CollectionRequest, Scope } from "../kernel";
import { evaluateQuery } from "../kernel";

export { decodeClientCursor, encodeClientCursor, evaluateQuery } from "../kernel";

export interface ClientCollectionOptions<T> {
  /** Whole-list fetch (context-scoped). The adapter never pretends it is unbounded. */
  fetchAll: (ctx: Scope, signal?: AbortSignal) => Promise<readonly T[]>;
  /** Client-side cap applied before evaluation. */
  limit?: number;
}

/**
 * Client-evaluated collection: fetch all (bounded), evaluate predicate/order/
 * window locally, and synthesize opaque cursor tokens containing offsets.
 * `window.kind: "all"` returns every fetched row.
 */
export function clientCollection<T>(options: ClientCollectionOptions<T>): CollectionReader<T> {
  return {
    async read(
      request: CollectionRequest,
      ctx: Scope,
      signal?: AbortSignal,
    ): Promise<CollectionPage<T>> {
      const fetched = await options.fetchAll(ctx, signal);
      const rows =
        options.limit !== undefined
          ? fetched.slice(0, Math.max(0, Math.floor(options.limit)))
          : fetched;
      return evaluateQuery(request, rows);
    },
  };
}

import type {
  ApiError,
  CollectionPage,
  CollectionReader,
  CollectionRequest,
  LookupReader,
  RecordReader,
  Scope,
} from "../kernel";
import { decodeClientCursor, encodeClientCursor, evaluateQuery } from "../kernel";

/**
 * In-memory adapters for tests and demos: latency/failure injection plus
 * both paging dialects.
 */

export interface MockHandle<T> {
  rows(): readonly T[];
  replaceRows(rows: readonly T[]): void;
  /** The next collection/record/lookup call rejects with this error. */
  failNext(error: ApiError): void;
  readonly count: number;
}

export type MockDialect = "offset" | "keyset";

export interface MockCollectionOptions {
  dialect?: MockDialect;
  latencyMs?: number;
}

export interface MockCollection<T> {
  collection: CollectionReader<T>;
  record: RecordReader<T>;
  lookup: LookupReader<T>;
  handle: MockHandle<T>;
}

class MockStore<T> {
  private store: T[];
  private failures: ApiError[] = [];

  constructor(rows: readonly T[]) {
    this.store = [...rows];
  }

  rows(): readonly T[] {
    return [...this.store];
  }

  replaceRows(rows: readonly T[]): void {
    this.store = [...rows];
  }

  failNext(error: ApiError): void {
    this.failures.push(error);
  }

  takeFailure(): ApiError | undefined {
    return this.failures.shift();
  }

  get count(): number {
    return this.store.length;
  }
}

function delay(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw new DOMException("Aborted", "AbortError");
  }
}

interface FailureQueue {
  takeFailure(): ApiError | undefined;
}

async function withFailure<T>(
  store: FailureQueue,
  latencyMs: number,
  signal: AbortSignal | undefined,
  work: () => Promise<T>,
): Promise<T> {
  throwIfAborted(signal);
  const failure = store.takeFailure();
  if (failure !== undefined) throw failure;
  await delay(latencyMs);
  throwIfAborted(signal);
  return work();
}

function pageOf<T>(
  request: CollectionRequest,
  rows: readonly T[],
  dialect: MockDialect,
): CollectionPage<T> {
  const window = request.window;
  if (window.kind === "all") {
    return { rows, paging: { kind: "all", total: rows.length } };
  }

  const offset =
    window.kind === "offset"
      ? Math.max(0, window.offset)
      : window.cursor !== undefined
        ? (decodeClientCursor(window.cursor) ?? 0)
        : 0;
  const size = Math.max(0, window.size);
  const pageRows = rows.slice(offset, offset + size);

  if (dialect === "offset") {
    return {
      rows: pageRows,
      paging: { kind: "offset", total: rows.length, offset, size },
    };
  }

  const next = offset + size;
  return {
    rows: pageRows,
    paging: {
      kind: "cursor",
      ...(next < rows.length ? { nextCursor: encodeClientCursor(next) } : {}),
    },
  };
}

export function mockCollection<T extends { id: string }>(
  initialRows: readonly T[],
  options: MockCollectionOptions = {},
): MockCollection<T> {
  const store = new MockStore(initialRows);
  const dialect = options.dialect ?? "offset";
  const latencyMs = options.latencyMs ?? 0;

  return {
    collection: {
      async read(
        request: CollectionRequest,
        _ctx: Scope,
        signal?: AbortSignal,
      ): Promise<CollectionPage<T>> {
        return withFailure(store, latencyMs, signal, async () => {
          // Server-side filter/sort simulation, then dialect-specific slicing.
          const filtered = evaluateQuery(
            { ...request, window: { kind: "all" } },
            store.rows(),
          ).rows;
          return pageOf(request, filtered, dialect);
        });
      },
    },
    record: {
      async read(id: string, _ctx: Scope, signal?: AbortSignal): Promise<T | null> {
        return withFailure(store, latencyMs, signal, async () => {
          return store.rows().find((row) => row.id === id) ?? null;
        });
      },
    },
    lookup: {
      async read(ids: readonly string[], _ctx: Scope, signal?: AbortSignal): Promise<readonly T[]> {
        return withFailure(store, latencyMs, signal, async () => {
          const byId = new Map(store.rows().map((row) => [row.id, row]));
          const seen = new Set<string>();
          const out: T[] = [];
          for (const id of ids) {
            const row = byId.get(id);
            if (row !== undefined && !seen.has(id)) {
              seen.add(id);
              out.push(row);
            }
          }
          return out;
        });
      },
    },
    handle: {
      rows: () => store.rows(),
      replaceRows: (rows) => store.replaceRows(rows),
      failNext: (error) => store.failNext(error),
      get count() {
        return store.count;
      },
    },
  };
}

export interface MockFetchAll<T> {
  (ctx: Scope, signal?: AbortSignal): Promise<readonly T[]>;
  rows(): readonly T[];
  replaceRows(rows: readonly T[]): void;
  failNext(error: ApiError): void;
  readonly count: number;
}

/** Whole-list mock source for `clientCollection`. */
export function mockFetchAll<T>(
  initialRows: readonly T[],
  options: { latencyMs?: number } = {},
): MockFetchAll<T> {
  const store = new MockStore(initialRows);
  const latencyMs = options.latencyMs ?? 0;

  const fetchAll = async (_ctx: Scope, signal?: AbortSignal): Promise<readonly T[]> =>
    withFailure(store, latencyMs, signal, async () => store.rows());

  const withHandle = Object.assign(fetchAll, {
    rows: () => store.rows(),
    replaceRows: (rows: readonly T[]) => store.replaceRows(rows),
    failNext: (error: ApiError) => store.failNext(error),
  }) as MockFetchAll<T>;

  Object.defineProperty(withHandle, "count", {
    get: () => store.count,
    enumerable: true,
  });
  return withHandle;
}

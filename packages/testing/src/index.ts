import type {
  CollectionRequest,
  CollectionSearch,
  CollectionSearchSchema,
  CollectionSource,
  CollectionState,
  Command,
  Effect,
  LookupSource,
  MockHandle,
  MockTransport,
  MockTransportOptions,
  Outcome,
  RecordSource,
  Scope,
  StandardSchemaV1,
} from "@lynxland/uikit-core";
import {
  collectionSource,
  lookupSource,
  mockCollection,
  mockTransport,
  parseSearch,
  recordSource,
  sourceName,
  stringifySearch,
} from "@lynxland/uikit-core";
import {
  type CollectionHandle,
  type CollectionQueryOptions,
  ScopeProvider,
  useCollection,
} from "@lynxland/uikit-react";
import {
  type SearchStateHandle,
  useSearchState,
} from "@lynxland/uikit-react/router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  type RouteComponent,
  RouterProvider,
} from "@tanstack/react-router";
import { type RenderResult, render } from "@testing-library/react";
import { createElement, type ReactNode } from "react";

/**
 * @lynxland/uikit-testing
 *
 * Harness for v3 bindings: memory router + QueryClient + ScopeProvider, plus
 * capability-shaped mocks (source/command/stream). No Resource, no aliases.
 */

export type SearchSchemaInput =
  | CollectionSearch
  | CollectionSearchSchema
  | StandardSchemaV1<unknown, unknown>;

export interface TestRouteSpec {
  path: string;
  component?: RouteComponent;
  searchSchema?: SearchSchemaInput;
}

export type TestInitial =
  | string
  | {
      path?: string;
      search?: Record<string, unknown>;
    };

export interface CreateTestRouterOptions {
  routes: readonly TestRouteSpec[];
  initial?: TestInitial;
  parseSearch?: (search: string) => Record<string, unknown>;
  stringifySearch?: (search: Record<string, unknown>) => string;
}

export function isCollectionSearch(value: unknown): value is CollectionSearch {
  return (
    typeof value === "object" &&
    value !== null &&
    "schema" in value &&
    "serializer" in value &&
    "decode" in value &&
    "toRequest" in value
  );
}

export function normalizeSearchSchema(
  value: SearchSchemaInput | undefined,
): CollectionSearchSchema | StandardSchemaV1<unknown, unknown> | undefined {
  if (value === undefined) return undefined;
  if (isCollectionSearch(value)) return value.schema;
  return value;
}

function serializerOf(
  value: SearchSchemaInput | undefined,
  overrides: Pick<CreateTestRouterOptions, "parseSearch" | "stringifySearch">,
): Pick<CreateTestRouterOptions, "parseSearch" | "stringifySearch"> {
  const collection = isCollectionSearch(value) ? value : undefined;
  const parse = overrides.parseSearch ?? collection?.serializer.parseSearch ?? parseSearch;
  const stringify =
    overrides.stringifySearch ?? collection?.serializer.stringifySearch ?? stringifySearch;
  return { parseSearch: parse, stringifySearch: stringify };
}

function initialEntry(initial: TestInitial | undefined, routes: readonly TestRouteSpec[]): string {
  if (typeof initial === "string") return initial;
  const path = initial?.path ?? routes[0]?.path ?? "/";
  const search = initial?.search;
  if (search === undefined) return path;
  return `${path}${stringifySearch(search)}`;
}

/**
 * Memory router for tests. The route tree is flat (all routes are children of
 * a root layout with `<Outlet />`); search params always use the core
 * repeated-key serializer so URLs behave like production routes.
 */
export function createTestRouter(options: CreateTestRouterOptions) {
  const rootRoute = createRootRoute({ component: Outlet });
  const children = options.routes.map((spec) => {
    const schema = normalizeSearchSchema(spec.searchSchema);
    return createRoute({
      getParentRoute: () => rootRoute,
      path: spec.path,
      ...(spec.component !== undefined ? { component: spec.component } : {}),
      ...(schema !== undefined ? { validateSearch: schema as never } : {}),
    });
  });
  const routeTree = rootRoute.addChildren(children);
  const serializer = serializerOf(options.routes[0]?.searchSchema, options);

  return createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries: [initialEntry(options.initial, options.routes)],
    }),
    defaultPreload: false,
    parseSearch: serializer.parseSearch ?? parseSearch,
    stringifySearch: serializer.stringifySearch ?? stringifySearch,
  });
}

export interface RenderWithKitOptions {
  /** Route path (default "/"). */
  path?: string;
  /**
   * Initial search. Flat URL keys are stringified directly; when `searchSchema`
   * is a `CollectionSearch` and the object contains state-shaped keys
   * (`filters`/state `page`/object `sort`), it is encoded first.
   */
  search?: Record<string, unknown>;
  searchSchema?: SearchSchemaInput;
  scope?: Scope;
  queryClient?: QueryClient;
}

export type KitRenderResult = RenderResult & {
  router: ReturnType<typeof createTestRouter>;
  queryClient: QueryClient;
  /** Parsed/validated location search (assert values, not the raw query string). */
  getSearch(): Record<string, unknown>;
};

function encodeSearchInput(
  search: Record<string, unknown>,
  schema: SearchSchemaInput | undefined,
): Record<string, unknown> {
  if (schema === undefined || !isCollectionSearch(schema)) return search;
  const page = search.page;
  const filters = search.filters;
  const sort = search.sort;
  const stateLike =
    (page !== null && typeof page === "object") ||
    (Array.isArray(filters) && filters.some((filter) => typeof filter === "object")) ||
    (Array.isArray(sort) && sort.some((entry) => typeof entry === "object"));
  return stateLike ? schema.encode(search as never) : search;
}

export function renderWithKit(ui: ReactNode, options: RenderWithKitOptions = {}): KitRenderResult {
  const queryClient =
    options.queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

  const path = options.path ?? "/";
  const search =
    options.search === undefined
      ? undefined
      : encodeSearchInput(options.search, options.searchSchema);
  const query = search === undefined || path.includes("?") ? "" : stringifySearch(search);
  const router = createTestRouter({
    routes: [
      {
        path,
        component: () => ui,
        ...(options.searchSchema !== undefined ? { searchSchema: options.searchSchema } : {}),
      },
    ],
    initial: `${path}${query}`,
  });

  const result = render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        ScopeProvider,
        { value: options.scope ?? {} },
        createElement(RouterProvider, { router }),
      ),
    ),
  );

  return {
    ...result,
    router,
    queryClient,
    getSearch(): Record<string, unknown> {
      const raw: unknown = router.state.location.search;
      if (typeof raw === "string") return parseSearch(raw);
      if (typeof raw === "object" && raw !== null) return raw as Record<string, unknown>;
      return {};
    },
  };
}

// ============ binding probes ============

export interface RenderCollectionOptions {
  path?: string;
  scope?: Scope;
  query?: CollectionQueryOptions;
}

export type RenderCollectionResult<T> = KitRenderResult & {
  readonly handle: CollectionHandle<T>;
};

/**
 * Render a `useCollection` probe without a Router/URL. The returned `handle`
 * getter always reads the latest render, so tests can `waitFor` status changes.
 */
export function renderCollection<T>(
  source: CollectionSource<T>,
  request: CollectionRequest,
  options: RenderCollectionOptions = {},
): RenderCollectionResult<T> {
  let handle: CollectionHandle<T> | undefined;
  function Probe() {
    handle = useCollection(source, request, {
      ...options.query,
      ...(options.scope !== undefined ? { scope: options.scope } : {}),
    });
    return null;
  }

  const result = renderWithKit(createElement(Probe), {
    ...(options.path !== undefined ? { path: options.path } : {}),
  });

  return {
    ...result,
    get handle(): CollectionHandle<T> {
      if (handle === undefined) {
        throw new Error("renderCollection: useCollection has not rendered yet");
      }
      return handle;
    },
  };
}

export interface RenderSearchStateOptions {
  path?: string;
}

export type RenderSearchStateResult<S> = KitRenderResult & {
  readonly handle: SearchStateHandle<S>;
};

/**
 * Render a `useSearchState` probe on a real memory router. `initial` accepts a
 * state object (encoded with the search codec) or a query string / URL suffix.
 */
export function renderSearchState<S extends CollectionState>(
  search: CollectionSearch<S>,
  initial?: S | string,
  options: RenderSearchStateOptions = {},
): RenderSearchStateResult<S> {
  const path = options.path ?? "/";
  let handle: SearchStateHandle<S> | undefined;
  function Probe() {
    handle = useSearchState(search, { from: path });
    return null;
  }

  let initialSearch: Record<string, unknown> | undefined;
  if (typeof initial === "string") {
    const query = initial.startsWith("?") ? initial.slice(1) : initial;
    if (query !== "") initialSearch = parseSearch(query);
  } else if (initial !== undefined) {
    initialSearch = search.encode(initial);
  }

  const result = renderWithKit(createElement(Probe), {
    path,
    searchSchema: search,
    ...(initialSearch !== undefined ? { search: initialSearch } : {}),
  });

  return {
    ...result,
    get handle(): SearchStateHandle<S> {
      if (handle === undefined) {
        throw new Error("renderSearchState: useSearchState has not rendered yet");
      }
      return handle;
    },
  };
}

// ============ capability mocks ============

export interface MockSourceOptions {
  scope?: readonly string[];
  dialect?: "offset" | "keyset";
  latencyMs?: number;
}

export interface MockSource<T extends { id: string }> {
  readonly name: ReturnType<typeof sourceName>;
  readonly scope?: readonly string[];
  readonly collection: CollectionSource<T>;
  readonly record: RecordSource<T>;
  readonly lookup: LookupSource<T>;
  readonly handle: MockHandle<T>;
}

/** A named source trio (collection/record/lookup) backed by core `mockCollection`. */
export function mockSource<T extends { id: string }>(
  name: string,
  rows: readonly T[],
  options: MockSourceOptions = {},
): MockSource<T> {
  const mock = mockCollection(rows, {
    ...(options.dialect !== undefined ? { dialect: options.dialect } : {}),
    ...(options.latencyMs !== undefined ? { latencyMs: options.latencyMs } : {}),
  });
  const scope = options.scope;
  const named = { name, ...(scope !== undefined ? { scope } : {}) };
  return {
    name: sourceName(name),
    ...(scope !== undefined ? { scope } : {}),
    collection: collectionSource({ ...named, read: mock.collection.read }),
    record: recordSource({ ...named, read: mock.record.read }),
    lookup: lookupSource({ ...named, read: mock.lookup.read }),
    handle: mock.handle,
  };
}

export type MockCommandHandler<I, O> = (input: I, scope: Scope) => Outcome<O> | Promise<Outcome<O>>;

export interface MockCommandCall<I> {
  readonly input: I;
  readonly scope: Scope;
}

export interface MockCommandOptions<I, O> {
  effects?: readonly Effect[];
  treatAs?: Command<I, O>["treatAs"];
}

export interface MockCommand<I, O> extends Command<I, O> {
  readonly calls: readonly MockCommandCall<I>[];
  reset(): void;
  /** The next run throws this value (failure-channel tests). */
  failNext(error: unknown): void;
}

/** A core `Command` with call recording and failure injection. */
export function mockCommand<I, O>(
  handler: MockCommandHandler<I, O>,
  options: MockCommandOptions<I, O> = {},
): MockCommand<I, O> {
  const calls: MockCommandCall<I>[] = [];
  const failures: unknown[] = [];

  const command: Command<I, O> = {
    async run(input, scope) {
      calls.push({ input, scope });
      const failure = failures.shift();
      if (failure !== undefined) throw failure;
      return handler(input, scope);
    },
    ...(options.effects !== undefined ? { effects: options.effects } : {}),
    ...(options.treatAs !== undefined ? { treatAs: options.treatAs } : {}),
  };

  return Object.assign(command, {
    calls,
    reset(): void {
      calls.length = 0;
      failures.length = 0;
    },
    failNext(error: unknown): void {
      failures.push(error);
    },
  });
}

/** Core in-memory StreamSource (frame emit/interrupt/gap/end controls). */
export function mockStream<F>(options: MockTransportOptions<F> = {}): MockTransport<F> {
  return mockTransport(options);
}

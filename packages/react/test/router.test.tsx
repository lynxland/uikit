import {
  type CollectionSearch,
  collectionSearch,
  collectionSource,
  mockCollection,
  parseSearch,
} from "@lynxland/uikit-core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useCollectionPage, useEnumSearch, useSearchState, useTabParam } from "../src/router/index";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = Array.from({ length: 100 }, (_, index) => ({
  id: String(index),
  name: `row-${index}`,
}));

function createClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function buildTestRouter(search: CollectionSearch, initial: string, component: () => ReactNode) {
  const rootRoute = createRootRoute();
  const route = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    validateSearch: search.schema,
    component,
  });
  const routeTree = rootRoute.addChildren([route]);
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initial] }),
    defaultPreload: false,
    parseSearch: search.serializer.parseSearch,
    stringifySearch: search.serializer.stringifySearch,
  });
}

type TestRouter = ReturnType<typeof buildTestRouter>;

function renderRouteHook<T>(
  useHook: () => T,
  options: { search: CollectionSearch; initial: string; client: QueryClient },
): { get(): T; router: TestRouter } {
  let value: T | undefined;
  // biome-ignore lint/correctness/noComponentHookFactories: test-only probe component
  function Probe() {
    value = useHook();
    return <div data-testid="probe" />;
  }

  const router = buildTestRouter(options.search, options.initial, Probe);
  render(
    <QueryClientProvider client={options.client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return {
    get(): T {
      if (value === undefined) throw new Error("route hook has not rendered yet");
      return value;
    },
    router,
  };
}

function paramsOf(router: TestRouter): Record<string, unknown> {
  const search: unknown = router.state.location.search;
  if (typeof search === "string") return parseSearch(search);
  if (typeof search === "object" && search !== null) return search as Record<string, unknown>;
  return {};
}

describe("useSearchState", () => {
  it("reads only its own keys and roundtrips through the URL", async () => {
    const search = collectionSearch({ text: ["name"], defaultSize: 20 });
    const client = createClient();
    const harness = renderRouteHook(() => useSearchState(search, { from: "/" }), {
      search,
      initial: "/?q=hello&filter=status:eq:active&tab=details",
      client,
    });

    await waitFor(() => expect(harness.get().state.q).toBe("hello"));
    expect(harness.get().state.filters).toEqual([{ field: "status", op: "eq", value: "active" }]);

    const patch = harness.get().patch;
    act(() => harness.get().patch({ q: "world" }));
    await waitFor(() => expect(paramsOf(harness.router).q).toBe("world"));
    expect(paramsOf(harness.router).tab).toBe("details");
    expect(paramsOf(harness.router).filter).toEqual("status:eq:active");
    expect(harness.get().patch).toBe(patch);

    act(() => harness.get().set({ q: "next", page: { kind: "offset", offset: 20 } }));
    await waitFor(() => expect(paramsOf(harness.router).page).toBe("2"));
    expect(paramsOf(harness.router).q).toBe("next");
    expect(paramsOf(harness.router).filter).toBeUndefined();

    act(() => harness.get().reset());
    await waitFor(() => expect(paramsOf(harness.router).q).toBeUndefined());
    expect(paramsOf(harness.router).tab).toBe("details");
    expect(harness.get().state.q).toBeUndefined();
  });
});

describe("useEnumSearch / useTabParam", () => {
  it("reads/writes enum params and removes the default from the URL", async () => {
    const search = collectionSearch({});
    const harness = renderRouteHook(
      () =>
        useEnumSearch({
          from: "/",
          key: "tab",
          values: ["general", "logs"] as const,
          defaultValue: "general",
        }),
      { search, initial: "/", client: createClient() },
    );

    await waitFor(() => expect(harness.get().value).toBe("general"));
    act(() => harness.get().setValue("logs"));
    await waitFor(() => expect(paramsOf(harness.router).tab).toBe("logs"));
    act(() => harness.get().setValue("general"));
    await waitFor(() => expect(paramsOf(harness.router).tab).toBeUndefined());
  });

  it("provides a tab convenience wrapper", async () => {
    const search = collectionSearch({});
    const harness = renderRouteHook(() => useTabParam({ from: "/", defaultValue: "overview" }), {
      search,
      initial: "/?tab=maintenance",
      client: createClient(),
    });
    await waitFor(() => expect(harness.get().value).toBe("maintenance"));
    act(() => harness.get().setValue("overview"));
    await waitFor(() => expect(paramsOf(harness.router).tab).toBeUndefined());
  });
});

describe("useCollectionPage", () => {
  it("paginates in offset mode and returns to the first page on page-size change", async () => {
    const search = collectionSearch({ defaultSize: 10 });
    const mock = mockCollection(ROWS, { dialect: "offset" });
    const source = collectionSource<Row>({ name: "widgets", read: mock.collection.read });
    const client = createClient();
    const harness = renderRouteHook(() => useCollectionPage(source, { search, from: "/" }), {
      search,
      initial: "/?page=3&size=10",
      client,
    });

    await waitFor(() => expect(harness.get().status).toBe("success"));
    const handle = harness.get();
    expect(handle.state.page).toEqual({ kind: "offset", offset: 20 });
    expect(handle.request.window.kind).toBe("offset");
    expect(handle.request.window.size).toBe(10);
    expect(handle.pager.mode).toBe("offset");
    expect(handle.pager.pageSize).toBe(10);
    expect(handle.pager.canPrev).toBe(true);
    expect(handle.pager.canNext).toBe(true);
    expect(handle.rows.map((row) => row.id)).toEqual([
      "20",
      "21",
      "22",
      "23",
      "24",
      "25",
      "26",
      "27",
      "28",
      "29",
    ]);

    const before = harness.router.history.length;
    act(() => harness.get().pager.prev());
    await waitFor(() => expect(paramsOf(harness.router).page).toBe("2"));
    await waitFor(() => expect(harness.get().pager.canNext).toBe(true));
    expect(harness.get().rows.map((row) => row.id)).toEqual([
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "19",
    ]);

    act(() => harness.get().pager.next());
    await waitFor(() => expect(paramsOf(harness.router).page).toBe("3"));
    expect(harness.router.history.length).toBe(before + 2);

    act(() => harness.get().pager.setPageSize(20));
    await waitFor(() => expect(harness.get().pager.pageSize).toBe(20));
    expect(paramsOf(harness.router).page).toBeUndefined();
    expect(paramsOf(harness.router).size).toBe("20");
    expect(harness.get().rows).toHaveLength(20);

    const filteredLength = harness.router.history.length;
    act(() => harness.get().setFilters([{ field: "name", op: "contains", value: "1" }]));
    await waitFor(() => expect(paramsOf(harness.router).filter).toBe("name:contains:1"));
    expect(harness.router.history.length).toBe(filteredLength);
  });

  it("keeps offset mode on the first page when defaultPage declares offset", async () => {
    const search = collectionSearch({
      defaultSize: 10,
      defaultPage: { kind: "offset", offset: 0 },
    });
    const mock = mockCollection(ROWS, { dialect: "offset" });
    const source = collectionSource<Row>({ name: "widgets", read: mock.collection.read });
    const client = createClient();
    const harness = renderRouteHook(() => useCollectionPage(source, { search, from: "/" }), {
      search,
      initial: "/",
      client,
    });

    await waitFor(() => expect(harness.get().status).toBe("success"));
    expect(harness.get().pager.mode).toBe("offset");
    expect(harness.get().pager.canPrev).toBe(false);
    expect(harness.get().pager.canNext).toBe(true);
    expect(harness.get().rows.map((row) => row.id)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ]);

    act(() => harness.get().pager.next());
    await waitFor(() => expect(paramsOf(harness.router).page).toBe("2"));
    expect(harness.get().pager.mode).toBe("offset");
    expect(harness.get().pager.canPrev).toBe(true);

    act(() => harness.get().pager.prev());
    await waitFor(() => expect(paramsOf(harness.router).page).toBeUndefined());
    expect(harness.get().pager.mode).toBe("offset");
    expect(harness.get().pager.canPrev).toBe(false);
  });

  it("uses history for cursor prev and disables it on a deep link", async () => {
    const search = collectionSearch({ defaultSize: 10 });
    const mock = mockCollection(ROWS, { dialect: "keyset" });
    const source = collectionSource<Row>({ name: "widgets", read: mock.collection.read });
    const client = createClient();
    const harness = renderRouteHook(() => useCollectionPage(source, { search, from: "/" }), {
      search,
      initial: "/?cursor=c0&size=10",
      client,
    });

    await waitFor(() => expect(harness.get().status).toBe("success"));
    expect(harness.get().pager.mode).toBe("cursor");
    expect(harness.get().pager.canNext).toBe(true);
    // Deep-linked cursor: there is no previous history entry.
    expect(harness.get().pager.canPrev).toBe(false);

    act(() => harness.get().pager.next());
    await waitFor(() => expect(paramsOf(harness.router).cursor).toBe("ca"));
    expect(harness.get().pager.canPrev).toBe(true);

    act(() => harness.get().pager.prev());
    await waitFor(() => expect(paramsOf(harness.router).cursor).toBe("c0"));
    expect(harness.get().pager.canPrev).toBe(false);

    act(() => harness.get().pager.setPageSize(20));
    await waitFor(() => expect(paramsOf(harness.router).size).toBe("20"));
    expect(paramsOf(harness.router).cursor).toBe("c0");
    expect(harness.get().pager.pageSize).toBe(20);
  });
});

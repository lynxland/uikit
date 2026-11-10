import { collectionSearch, ok, type Scope } from "@lynxland/uikit-core";
import { useCollection } from "@lynxland/uikit-react";
import { useSearchState } from "@lynxland/uikit-react/router";
import { QueryClient } from "@tanstack/react-query";
import { act, cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  createTestRouter,
  mockCommand,
  mockSource,
  mockStream,
  renderCollection,
  renderSearchState,
  renderWithKit,
} from "../src/index";

afterEach(cleanup);

interface Widget {
  id: string;
  name: string;
}

const ROWS: Widget[] = [
  { id: "1", name: "alpha" },
  { id: "2", name: "beta" },
];

describe("createTestRouter", () => {
  it("builds a memory router with validated search", async () => {
    const search = collectionSearch({ text: ["name"] });
    const router = createTestRouter({
      routes: [{ path: "/", searchSchema: search }],
      initial: "/?q=hello&tab=details",
    });

    await router.load();

    expect(router.state.location.pathname).toBe("/");
    expect(router.state.location.search).toMatchObject({ q: "hello", tab: "details" });
  });

  it("accepts an object initial (path + search) for convenience", async () => {
    const router = createTestRouter({
      routes: [{ path: "/widgets" }],
      initial: { path: "/widgets", search: { q: "web" } },
    });

    await router.load();

    expect(router.state.location.pathname).toBe("/widgets");
    expect(router.state.location.search).toMatchObject({ q: "web" });
  });
});

describe("renderWithKit", () => {
  it("wires QueryClient + ScopeProvider + RouterProvider", async () => {
    const search = collectionSearch({ text: ["name"] });
    const source = mockSource("widgets", ROWS, { scope: ["projectId"] });
    const scope: Scope = { projectId: "p1" };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // biome-ignore lint/correctness/noComponentHookFactories: test-only page component
    function Page() {
      const { state } = useSearchState(search, { from: "/" });
      const list = useCollection(source.collection, search.toRequest(state));
      return (
        <div>
          {list.status}:{list.rows.length}
        </div>
      );
    }

    const kit = renderWithKit(<Page />, {
      path: "/",
      search: { q: "alpha" },
      searchSchema: search,
      scope,
      queryClient,
    });

    expect(kit.queryClient).toBe(queryClient);
    expect(kit.router.state.location.pathname).toBe("/");
    expect(await screen.findByText("success:1")).toBeTruthy();
    expect(kit.getSearch()).toMatchObject({ q: "alpha" });
    expect(kit.router.state.location.search).toMatchObject({ q: "alpha" });
  });
});

describe("binding probes", () => {
  it("renderCollection exposes the live collection handle without a router", async () => {
    const source = mockSource("widgets", ROWS);
    const kit = renderCollection(source.collection, {
      window: { kind: "offset", size: 10, offset: 0 },
    });

    await waitFor(() => expect(kit.handle.status).toBe("success"));
    expect(kit.handle.rows).toHaveLength(2);
  });

  it("renderSearchState roundtrips state and URL writes", async () => {
    const search = collectionSearch({ text: ["name"] });
    const kit = renderSearchState(search, { q: "alpha" });

    await waitFor(() => expect(kit.handle.state.q).toBe("alpha"));
    act(() => kit.handle.patch({ q: "beta" }));
    await waitFor(() => expect(kit.getSearch().q).toBe("beta"));
  });
});

describe("mocks", () => {
  it("mockCommand records calls and returns outcomes", async () => {
    const command = mockCommand<{ name: string }, Widget>(
      async (input) => ok({ id: "1", name: input.name }),
      { effects: [] },
    );

    const outcome = await command.run({ name: "alpha" }, { projectId: "p1" });

    expect(outcome).toEqual({ status: "ok", payload: { id: "1", name: "alpha" } });
    expect(command.calls).toHaveLength(1);
    expect(command.calls[0]?.scope).toEqual({ projectId: "p1" });
  });

  it("mockStream exposes the core transport controls", async () => {
    const stream = mockStream<number>();
    const iterator = stream.open(null, new AbortController().signal)[Symbol.asyncIterator]();

    stream.emit(7);
    await expect(iterator.next()).resolves.toEqual({ done: false, value: 7 });

    stream.end();
    await expect(iterator.next()).resolves.toEqual({ done: true, value: undefined });
  });
});

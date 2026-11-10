import {
  ApiError,
  type CollectionPage,
  type Command,
  collectionKey,
  collectionSource,
  conflict,
  defineEntity,
  invalidate,
  mockCollection,
  ok,
  recordKey,
  recordSource,
  rejected,
  type Scope,
  type StandardSchemaV1,
  sourceName,
} from "@lynxland/uikit-core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { type CommandEntity, ScopeProvider, useCommand, useCommandForm } from "../src/index";

interface Widget {
  id: string;
  name: string;
}

interface CreateWidget {
  name: string;
}

const PAGE: CollectionPage<Widget> = {
  rows: [{ id: "1", name: "alpha" }],
  paging: { kind: "offset", total: 1, offset: 0, size: 10 },
};

function createClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function wrapper(client: QueryClient, scope: Scope = {}) {
  // biome-ignore lint/correctness/noComponentHookFactories: test-only wrapper factory
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ScopeProvider value={scope}>{children}</ScopeProvider>
      </QueryClientProvider>
    );
  };
}

describe("useCommand", () => {
  it("applies declared effects on ok", async () => {
    const mock = mockCollection<Widget>(PAGE.rows);
    const source = collectionSource<Widget>({ name: "widgets", read: mock.collection.read });
    const client = createClient();
    const scope = { projectId: "p1" };
    const request = { window: { kind: "offset" as const, size: 10, offset: 0 } };
    const key = collectionKey(source, request, scope);
    client.setQueryData(key, PAGE);

    const command: Command<CreateWidget, Widget> = {
      run: async (input) => ok({ id: "2", name: input.name }),
      effects: [invalidate(sourceName("widgets"))],
    };
    const onSettled = vi.fn();

    const { result } = renderHook(() => useCommand(command, { scope, onSettled }), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      result.current.mutate({ name: "beta" });
    });
    await waitFor(() => expect(result.current.pending).toBe(false));

    expect(result.current.result).toEqual({ status: "ok", payload: { id: "2", name: "beta" } });
    expect(result.current.ready).toBe(true);
    expect(onSettled).toHaveBeenCalledWith(
      { status: "ok", payload: { id: "2", name: "beta" } },
      null,
    );
    expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  });

  it("treats a thrown not-found as the declared outcome", async () => {
    const client = createClient();
    const command: Command<{ id: string }, { deleted: boolean }> = {
      run: async () => {
        throw new ApiError("not-found");
      },
      treatAs: { "not-found": ok({ deleted: true }) },
    };

    const { result } = renderHook(() => useCommand(command), { wrapper: wrapper(client) });

    await act(async () => {
      result.current.mutate({ id: "1" });
    });
    await waitFor(() => expect(result.current.pending).toBe(false));

    expect(result.current.result).toEqual({ status: "ok", payload: { deleted: true } });
    expect(result.current.failure).toBeNull();
  });

  it("remaps a rejected outcome with code not-found", async () => {
    const client = createClient();
    const command: Command<{ id: string }, { deleted: boolean }> = {
      run: async () => rejected("gone", { code: "not-found" }),
      treatAs: { "not-found": ok({ deleted: true }) },
    };

    const { result } = renderHook(() => useCommand(command), { wrapper: wrapper(client) });

    await act(async () => {
      result.current.mutate({ id: "1" });
    });
    await waitFor(() => expect(result.current.pending).toBe(false));

    expect(result.current.result).toEqual({ status: "ok", payload: { deleted: true } });
  });

  it("does not invalidate when effects is explicitly []", async () => {
    const mock = mockCollection<Widget>(PAGE.rows);
    const source = collectionSource<Widget>({ name: "widgets", read: mock.collection.read });
    const client = createClient();
    const scope = { projectId: "p1" };
    const request = { window: { kind: "offset" as const, size: 10, offset: 0 } };
    const key = collectionKey(source, request, scope);
    client.setQueryData(key, PAGE);

    const entity: CommandEntity = {
      name: sourceName("widgets"),
      scope: ["projectId"],
    };
    const command: Command<CreateWidget, Widget> = {
      run: async (input) => ok({ id: "2", name: input.name }),
      effects: [invalidate(sourceName("widgets"))],
    };
    const onSettled = vi.fn();

    const { result } = renderHook(
      () => useCommand(command, { scope, entity, effects: [], onSettled }),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      result.current.mutate({ name: "beta" });
    });
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(client.getQueryState(key)?.isInvalidated).toBe(false);
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it("invalidates the entity collection and record by default", async () => {
    const mock = mockCollection<Widget>(PAGE.rows);
    const source = collectionSource<Widget>({
      name: "widgets",
      scope: ["projectId"],
      read: mock.collection.read,
    });
    const record = recordSource<Widget>({
      name: "widgets",
      scope: ["projectId"],
      read: mock.record.read,
    });
    const entity = defineEntity<Widget>({
      name: "widgets",
      scope: ["projectId"],
      collection: { read: source.read },
      record: { read: record.read },
    });
    const client = createClient();
    const scope = { projectId: "p1" };
    const request = { window: { kind: "offset" as const, size: 10, offset: 0 } };
    const collectionQueryKey = collectionKey(source, request, scope);
    const recordQueryKey = recordKey(record, "1", scope);
    client.setQueryData(collectionQueryKey, PAGE);
    client.setQueryData(recordQueryKey, { id: "1", name: "alpha" });

    const command: Command<{ id: string; name: string }, Widget> = {
      run: async (input) => ok({ id: input.id, name: input.name }),
    };

    const { result } = renderHook(
      () =>
        useCommand(command, {
          scope,
          entity,
          id: (input: { id: string; name: string }) => input.id,
        }),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      result.current.mutate({ id: "1", name: "renamed" });
    });
    await waitFor(() => expect(result.current.pending).toBe(false));

    expect(client.getQueryState(collectionQueryKey)?.isInvalidated).toBe(true);
    expect(client.getQueryState(recordQueryKey)?.isInvalidated).toBe(true);
  });

  it("does not apply effects for a rejected result", async () => {
    const mock = mockCollection<Widget>(PAGE.rows);
    const source = collectionSource<Widget>({ name: "widgets", read: mock.collection.read });
    const client = createClient();
    const scope = { projectId: "p1" };
    const request = { window: { kind: "offset" as const, size: 10, offset: 0 } };
    const key = collectionKey(source, request, scope);
    client.setQueryData(key, PAGE);

    const command: Command<CreateWidget, Widget> = {
      run: async () => rejected("invalid", { fieldErrors: { name: "required" } }),
      effects: [invalidate(sourceName("widgets"))],
    };

    const { result } = renderHook(() => useCommand(command, { scope }), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      result.current.mutate({ name: "" });
    });
    await waitFor(() => expect(result.current.pending).toBe(false));

    expect(result.current.result?.status).toBe("rejected");
    expect(client.getQueryState(key)?.isInvalidated).toBe(false);
  });

  it("is not ready when declared scope keys are missing, and mutate throws", async () => {
    const client = createClient();
    const entity: CommandEntity = { name: sourceName("widgets"), scope: ["projectId"] };
    const command: Command<CreateWidget, Widget> = {
      run: async (input) => ok({ id: "1", name: input.name }),
    };

    const { result } = renderHook(() => useCommand(command, { entity }), {
      wrapper: wrapper(client, {}),
    });

    expect(result.current.ready).toBe(false);
    expect(() => result.current.mutate({ name: "x" })).toThrow(/not ready/);
    await expect(result.current.mutateAsync({ name: "x" })).rejects.toThrow(/not ready/);
  });

  it("is ready when the provider supplies the declared keys", () => {
    const client = createClient();
    const entity: CommandEntity = { name: sourceName("widgets"), scope: ["projectId"] };
    const command: Command<CreateWidget, Widget> = {
      run: async (input) => ok({ id: "1", name: input.name }),
    };

    const { result } = renderHook(() => useCommand(command, { entity }), {
      wrapper: wrapper(client, { projectId: "p1" }),
    });

    expect(result.current.ready).toBe(true);
  });
});

describe("useCommandForm", () => {
  const fields = [{ name: "name" as const }];

  it("maps a rejected outcome to form-level and field errors", async () => {
    const client = createClient();
    const command: Command<CreateWidget, Widget> = {
      run: async () => rejected("invalid widget", { fieldErrors: { name: "Name is required" } }),
    };

    const { result } = renderHook(
      () => useCommandForm(command, { fields, defaultValues: { name: "" } }),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await result.current.run({ name: "" });
    });

    await waitFor(() => expect(result.current.error).toBe("invalid widget"));
    expect(result.current.fieldErrors).toEqual({ name: "Name is required" });
    expect(result.current.reveal).toBeUndefined();
  });

  it("maps conflict to a form-level message", async () => {
    const client = createClient();
    const command: Command<CreateWidget, Widget> = {
      run: async () => conflict("name already exists"),
    };

    const { result } = renderHook(() => useCommandForm(command, { fields }), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.run({ name: "dup" });
    });

    await waitFor(() => expect(result.current.error).toBe("name already exists"));
    expect(result.current.fieldErrors).toEqual({});
  });

  it("reveals the ok payload", async () => {
    const client = createClient();
    const command: Command<CreateWidget, { token: string }> = {
      run: async () => ok({ token: "one-shot" }),
    };

    const { result } = renderHook(() => useCommandForm(command, { fields }), {
      wrapper: wrapper(client),
    });

    await act(async () => {
      await result.current.run({ name: "beta" });
    });

    await waitFor(() => expect(result.current.reveal).toEqual({ token: "one-shot" }));
    expect(result.current.error).toBeNull();
  });

  it("validates via a Standard Schema before running the command", async () => {
    const client = createClient();
    const run = vi.fn(async (input: CreateWidget) => ok({ id: "1", name: input.name }));
    const schema = {
      "~standard": {
        version: 1 as const,
        vendor: "test",
        validate: (value: CreateWidget) =>
          value.name.trim() === ""
            ? { issues: [{ message: "Name is required", path: ["name"] }] }
            : { value },
      },
    } as unknown as StandardSchemaV1<CreateWidget>;

    const { result } = renderHook(
      () => useCommandForm({ run }, { schema, fields, defaultValues: { name: "" } }),
      { wrapper: wrapper(client) },
    );

    await act(async () => {
      await result.current.run({ name: "  " });
    });

    expect(run).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.error).toBe("Name is required"));
    expect(result.current.fieldErrors).toEqual({ name: "Name is required" });

    await act(async () => {
      await result.current.run({ name: "ok" });
    });
    expect(run).toHaveBeenCalledWith({ name: "ok" }, {});
    await waitFor(() => expect(result.current.error).toBeNull());
  });
});

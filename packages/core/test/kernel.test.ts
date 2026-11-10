import { describe, expect, it } from "vitest";
import type { Command } from "../src/kernel";
import {
  ApiError,
  advance,
  collectionKey,
  collectionSource,
  defineEntity,
  evalPredicate,
  evaluateQuery,
  invalidate,
  invalidateKey,
  invalidationPredicate,
  isApiError,
  isRetryable,
  lookupKey,
  lookupSource,
  orderEquals,
  recordKey,
  recordSource,
  selectorMatches,
  textPredicate,
} from "../src/kernel";

interface Widget {
  id: string;
  name: string;
  status: string;
  replicas: number;
}

const readCollection = async () => ({
  rows: [] as Widget[],
  paging: { kind: "offset" as const, total: 0, offset: 0, size: 20 },
});

describe("source identity and entity grouping", () => {
  it("bare sources carry public name/scope; invalid names fail fast", () => {
    const source = collectionSource<Widget>({
      name: "widgets",
      scope: ["projectId"],
      read: readCollection,
    });
    expect(source.name).toBe("widgets");
    expect(source.scope).toEqual(["projectId"]);
    expect(() => collectionSource<Widget>({ name: "Widgets", read: readCollection })).toThrow(
      /kebab-case/,
    );

    const record = recordSource<Widget>({ name: "widgets", read: async () => null });
    expect(record.scope).toBeUndefined();
    const lookup = lookupSource<Widget>({ name: "owners", read: async () => [] });
    expect(lookup.name).toBe("owners");
  });

  it("defineEntity attaches name/scope to internal capabilities", () => {
    const entity = defineEntity<Widget>({
      name: "widgets",
      key: (row) => row.id,
      scope: ["projectId"],
      collection: { read: readCollection },
      record: { read: async () => null },
      lookup: { read: async () => [] },
    });

    expect(entity.name).toBe("widgets");
    expect(entity.collection?.name).toBe("widgets");
    expect(entity.collection?.scope).toEqual(["projectId"]);
    expect(entity.record?.name).toBe("widgets");
    expect(entity.lookup?.name).toBe("widgets");
    expect(entity.key?.({ id: "w1" } as Widget)).toBe("w1");
    // The entity key is also the lookup row -> id projection.
    expect(entity.lookup?.key?.({ id: "w2" } as Widget)).toBe("w2");
  });

  it("query keys project keyScope to declared scope keys only", () => {
    const source = collectionSource<Widget>({
      name: "widgets",
      scope: ["projectId"],
      read: readCollection,
    });
    const request = {
      where: { field: "status", op: "eq" as const, value: "running" },
      order: [{ field: "name", dir: "asc" as const }],
      window: { kind: "offset" as const, size: 20, offset: 20 },
    };

    expect(collectionKey(source, request, { projectId: "p1", appId: "ignored" })).toEqual([
      "collection",
      "widgets",
      { projectId: "p1" },
      request.where,
      request.order,
      { kind: "offset", size: 20, offset: 20 },
    ]);

    const record = recordSource<Widget>({
      name: "widgets",
      scope: ["projectId"],
      read: async () => null,
    });
    expect(recordKey(record, "w1", { projectId: "p1", appId: "x" })).toEqual([
      "record",
      "widgets",
      { projectId: "p1" },
      "w1",
    ]);

    const lookup = lookupSource<Widget>({ name: "owners", read: async () => [] });
    expect(lookupKey(lookup, ["o1", "o1", "o2"], { appId: "x" })).toEqual([
      "lookup",
      "owners",
      {},
      ["o1", "o2"],
    ]);
  });
});

describe("invalidation matching", () => {
  const source = collectionSource<Widget>({
    name: "widgets",
    scope: ["projectId"],
    read: readCollection,
  });

  const key = collectionKey(
    source,
    { window: { kind: "offset", size: 20, offset: 0 } },
    {
      projectId: "p1",
    },
  );

  it("matches declared axes only and supports allScopes", () => {
    expect(
      selectorMatches(
        { source: "widgets" },
        key,
        { projectId: "p1", appId: "a1" },
        {
          widgets: ["projectId"],
        },
      ),
    ).toBe(true);
    expect(
      selectorMatches(
        { source: "widgets" },
        key,
        { projectId: "p2" },
        {
          widgets: ["projectId"],
        },
      ),
    ).toBe(false);
    expect(selectorMatches({ source: "widgets", allScopes: true }, key, { projectId: "p2" })).toBe(
      true,
    );
    expect(selectorMatches({ source: "other" }, key, { projectId: "p1" })).toBe(false);
    // Without an explicit axes argument, keyScope itself is the projection axis.
    expect(selectorMatches({ source: "widgets" }, key, { projectId: "p1", appId: "a1" })).toBe(
      true,
    );
    // A per-source axes map that does not declare this source falls back to the
    // key scope instead of matching every scope.
    expect(
      selectorMatches({ source: "widgets" }, key, { projectId: "p2" }, { other: ["projectId"] }),
    ).toBe(false);
  });

  it("filters by kind and record id; invalidationPredicate ignores non-kit keys", () => {
    const record = recordKey(
      recordSource<Widget>({
        name: "widgets",
        scope: ["projectId"],
        read: async () => null,
      }),
      "w1",
      { projectId: "p1" },
    );
    expect(
      selectorMatches({ source: "widgets", kind: "record", id: "w1" }, record, {
        projectId: "p1",
      }),
    ).toBe(true);
    expect(
      selectorMatches({ source: "widgets", kind: "record", id: "w2" }, record, {
        projectId: "p1",
      }),
    ).toBe(false);
    expect(selectorMatches({ source: "widgets", kind: "collection" }, record, {})).toBe(false);

    const predicate = invalidationPredicate(
      [{ source: "widgets" }],
      { projectId: "p1" },
      { widgets: ["projectId"] },
    );
    expect(predicate({ queryKey: key })).toBe(true);
    expect(predicate({ queryKey: ["unrelated", "widgets"] })).toBe(false);
  });
});

describe("Command typing", () => {
  it("keeps command input types invariant via the run function property", () => {
    const createCommand: Command<{ name: string }, string> = {
      run: async (input) => ({ status: "ok", payload: input.name }),
    };
    const updateCommand: Command<{ id: string; name: string }, string> = {
      run: async (input) => ({ status: "ok", payload: input.name }),
    };

    // @ts-expect-error a command requiring UpdateInput cannot accept CreateInput
    const narrowing: Command<{ name: string }, string> = updateCommand;
    void narrowing;
    void createCommand;
  });
});

describe("ApiError", () => {
  it("is an Error subclass with a closed kind and retry classification", () => {
    const error = new ApiError("server", { status: 503, detail: "maintenance" });
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.name).toBe("ApiError");
    expect(error.kind).toBe("server");
    expect(error.status).toBe(503);
    expect(error.detail).toBe("maintenance");
    expect(error.message).toBe("maintenance");
    expect(isApiError(error)).toBe(true);
    expect(isApiError({ kind: "network" })).toBe(false);
    expect(isRetryable(error)).toBe(true);
    expect(isRetryable(new ApiError("network"))).toBe(true);
    expect(isRetryable(new ApiError("auth"))).toBe(false);
    expect(isRetryable(new ApiError("decode", { detail: "bad" }))).toBe(false);
  });

  it("constructs explicit invalidation effects", () => {
    expect(invalidate("widgets", { kind: "collection" })).toEqual({
      type: "invalidate",
      entity: "widgets",
      kind: "collection",
    });
    expect(invalidate("widgets", { kind: "record", id: "w1", allScopes: true })).toEqual({
      type: "invalidate",
      entity: "widgets",
      kind: "record",
      id: "w1",
      allScopes: true,
    });
    expect(invalidateKey(["collection", "widgets"])).toEqual({
      type: "invalidateKey",
      key: ["collection", "widgets"],
    });
  });
});

describe("pure algebra", () => {
  const rows: Widget[] = [
    { id: "w1", name: "web-1", status: "running", replicas: 3 },
    { id: "w2", name: "api-1", status: "stopped", replicas: 1 },
    { id: "w3", name: "web-2", status: "running", replicas: 2 },
  ];

  it("evaluates predicates and text search", () => {
    expect(evalPredicate({ field: "status", op: "eq", value: "running" }, rows[0])).toBe(true);
    expect(evalPredicate({ field: "replicas", op: "gte", value: 2 }, rows[1])).toBe(false);
    expect(
      evalPredicate(
        {
          any: [
            { field: "name", op: "contains", value: "WEB" },
            { field: "id", op: "in", value: ["x"] },
          ],
        },
        rows[0],
      ),
    ).toBe(true);
    expect(evalPredicate(undefined, rows[0])).toBe(true);
    expect(textPredicate(["name", "id"], " web ")).toEqual({
      any: [
        { field: "name", op: "contains", value: "web" },
        { field: "id", op: "contains", value: "web" },
      ],
    });
    expect(textPredicate(["name"], "  ")).toBeUndefined();
  });

  it("evaluates offset, cursor and all windows", () => {
    const filtered = evaluateQuery(
      {
        where: { field: "status", op: "eq", value: "running" },
        order: [{ field: "replicas", dir: "desc" }],
        window: { kind: "offset", size: 1, offset: 0 },
      },
      rows,
    );
    expect(filtered.rows).toEqual([rows[0]]);
    expect(filtered.paging).toEqual({ kind: "offset", total: 2, offset: 0, size: 1 });

    const first = evaluateQuery(
      { order: [{ field: "id", dir: "asc" }], window: { kind: "cursor", size: 2 } },
      rows,
    );
    expect(first.rows.map((row) => row.id)).toEqual(["w1", "w2"]);
    expect(first.paging).toEqual({ kind: "cursor", nextCursor: "c2" });

    const second = evaluateQuery(
      { order: [{ field: "id", dir: "asc" }], window: { kind: "cursor", size: 2, cursor: "c2" } },
      rows,
    );
    expect(second.rows.map((row) => row.id)).toEqual(["w3"]);
    expect(second.paging).toEqual({ kind: "cursor" });

    const all = evaluateQuery({ window: { kind: "all" } }, rows);
    expect(all.rows).toHaveLength(3);
    expect(all.paging).toEqual({ kind: "all", total: 3 });
  });

  it("advances offset/cursor windows and compares order", () => {
    const offsetPage = {
      rows: [],
      paging: { kind: "offset" as const, total: 5, offset: 0, size: 2 },
    };
    expect(advance({ kind: "offset", size: 2, offset: 0 }, offsetPage, "next")).toEqual({
      kind: "offset",
      size: 2,
      offset: 2,
    });
    expect(advance({ kind: "offset", size: 2, offset: 2 }, offsetPage, "prev")).toEqual({
      kind: "offset",
      size: 2,
      offset: 0,
    });
    expect(advance({ kind: "offset", size: 2, offset: 4 }, offsetPage, "next")).toBeNull();

    const cursorPage = { rows: [], paging: { kind: "cursor" as const, nextCursor: "c4" } };
    expect(advance({ kind: "cursor", size: 2, cursor: "c2" }, cursorPage, "next")).toEqual({
      kind: "cursor",
      size: 2,
      cursor: "c4",
    });
    expect(advance({ kind: "cursor", size: 2, cursor: "c2" }, cursorPage, "prev")).toEqual({
      kind: "cursor",
      size: 2,
      cursor: "c0",
    });
    expect(
      advance({ kind: "cursor", size: 2, cursor: "server-token" }, cursorPage, "prev"),
    ).toBeNull();
    expect(
      advance({ kind: "all" }, { rows: [], paging: { kind: "all", total: 0 } }, "next"),
    ).toBeNull();

    expect(orderEquals([{ field: "id", dir: "asc" }], [{ field: "id", dir: "asc" }])).toBe(true);
    expect(orderEquals([{ field: "id", dir: "asc" }], [{ field: "id", dir: "desc" }])).toBe(false);
    expect(orderEquals(undefined, undefined)).toBe(true);
  });
});

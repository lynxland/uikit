import { describe, expect, it } from "vitest";
import {
  type CollectionState,
  collectionSearch,
  combineSearch,
  eqFilter,
  filterLeaves,
  filterValues,
  parseSearch,
  predicateOf,
  stringifySearch,
} from "../src/schema";

describe("collectionSearch URL codec", () => {
  const search = collectionSearch({
    text: ["name", "id"],
    filters: [{ field: "status", op: "eq" }],
    defaultSize: 20,
    defaultSort: [{ field: "createdAt", dir: "desc" }],
    namespace: "widgets",
  });

  it("roundtrips repeated keys, namespace and unknown params", () => {
    const state: CollectionState = {
      q: "web",
      filters: [
        { field: "status", op: "in", value: ["running", "degraded"] },
        { field: "replicas", op: "gte", value: "2" },
      ],
      sort: [{ field: "name", dir: "asc" }],
      page: { kind: "offset", offset: 20 },
      size: 10,
    };

    const encoded = search.encode(state);
    const query = search.stringifySearch({ ...encoded, tab: "settings" });
    expect(query.startsWith("?")).toBe(true);
    expect(query).toContain("widgets.filter=status%3Ain%3Arunning%2Cdegraded");
    expect(query).toContain("widgets.filter=replicas%3Agte%3A2");

    const parsed = search.parseSearch(query);
    expect(parsed.tab).toBe("settings");
    expect(parsed["widgets.filter"]).toEqual(["status:in:running,degraded", "replicas:gte:2"]);
    expect(search.decode(parsed)).toEqual(state);
  });

  it("empty params serialize to an empty string; parse accepts a leading ?", () => {
    expect(stringifySearch({})).toBe("");
    expect(parseSearch("?q=x&filter=a%3Aeq%3A1")).toEqual({
      q: "x",
      filter: "a:eq:1",
    });
    expect(parseSearch("q=x&q=y")).toEqual({ q: ["x", "y"] });
    expect(search.serializer.parseSearch(search.serializer.stringifySearch({ tab: "x" }))).toEqual({
      tab: "x",
    });
  });

  it("decode normalizes scalar/array and drops dirty entries", () => {
    const state = search.decode({
      "widgets.q": "  ",
      "widgets.filter": "status:eq:running",
      "widgets.sort": ["bad", "name:desc"],
      "widgets.page": "2",
      "widgets.size": "10",
      tab: "kept",
    });
    expect(state).toEqual({
      filters: [{ field: "status", op: "eq", value: "running" }],
      sort: [{ field: "name", dir: "desc" }],
      page: { kind: "offset", offset: 10 },
      size: 10,
    });
  });

  it("schema validate is passthrough and idempotent", () => {
    const once = search.schema["~standard"].validate({
      "widgets.q": "web",
      "widgets.filter": "status:eq:running",
      "widgets.page": 1,
      "widgets.size": 20,
      tab: "settings",
      custom: { deep: true },
    });
    expect(once.value).toEqual({
      "widgets.q": "web",
      "widgets.filter": ["status:eq:running"],
      tab: "settings",
      custom: { deep: true },
    });
    expect(search.schema["~standard"].validate(once.value)).toEqual(once);
    expect(search.schema.keys).toContain("widgets.q");
  });

  it("patch clears paging on filter/sort/query changes; reset clears every owned key", () => {
    const patch = search.patch({
      filters: [{ field: "status", op: "eq", value: "running" }],
    });
    expect(patch).toEqual({
      "widgets.filter": ["status:eq:running"],
      "widgets.cursor": undefined,
      "widgets.page": undefined,
    });
    expect("widgets.cursor" in patch).toBe(true);

    expect(search.patch({ q: "" })).toMatchObject({
      "widgets.q": undefined,
      "widgets.cursor": undefined,
      "widgets.page": undefined,
    });
    expect(search.patch({ page: { kind: "all" } })).toMatchObject({
      "widgets.page": "all",
      "widgets.cursor": undefined,
    });
    expect(search.reset()).toEqual({
      "widgets.q": undefined,
      "widgets.filter": undefined,
      "widgets.sort": undefined,
      "widgets.cursor": undefined,
      "widgets.page": undefined,
      "widgets.size": undefined,
    });
  });

  it("maps state to request and encodes all-pages state", () => {
    const request = search.toRequest({
      q: "web",
      filters: [{ field: "status", op: "eq", value: "running" }],
      sort: [{ field: "name", dir: "asc" }],
      page: { kind: "offset", offset: 40 },
      size: 20,
    });
    expect(request).toEqual({
      where: {
        all: [
          {
            any: [
              { field: "name", op: "contains", value: "web" },
              { field: "id", op: "contains", value: "web" },
            ],
          },
          { field: "status", op: "eq", value: "running" },
        ],
      },
      order: [{ field: "name", dir: "asc" }],
      window: { kind: "offset", size: 20, offset: 40 },
    });

    // No explicit sort -> defaultSort is applied.
    expect(search.toRequest({}).order).toEqual([{ field: "createdAt", dir: "desc" }]);

    // No page in the URL: cursor is the fallback unless a default page is declared.
    expect(search.toRequest({}).window).toEqual({ kind: "cursor", size: 20 });
    const offsetSearch = collectionSearch({
      defaultPage: { kind: "offset", offset: 0 },
      defaultSize: 20,
    });
    expect(offsetSearch.defaults.page).toEqual({ kind: "offset", offset: 0 });
    expect(offsetSearch.toRequest({}).window).toEqual({ kind: "offset", size: 20, offset: 0 });
    expect(
      offsetSearch.toRequest({ page: { kind: "offset", offset: 0 }, size: 20 }).window,
    ).toEqual({ kind: "offset", size: 20, offset: 0 });

    const all = search.toRequest({ page: { kind: "all" }, size: 12 });
    expect(all.window).toEqual({ kind: "all", size: 12 });
    expect(search.encode({ page: { kind: "all" } })).toEqual({ "widgets.page": "all" });
    expect(search.decode({ "widgets.page": "all" })).toEqual({ page: { kind: "all" } });
  });
});

describe("combineSearch", () => {
  it("composes namespaced schemas, preserves passthrough keys and detects owned collisions", () => {
    const tasks = collectionSearch({ namespace: "tasks", text: ["title"] });
    const users = collectionSearch({ namespace: "users", text: ["name"] });
    const combined = combineSearch(tasks.schema, users.schema);
    expect(combined({ "tasks.q": "a", "users.q": "b", tab: "list" })).toEqual({
      "tasks.q": "a",
      "users.q": "b",
      tab: "list",
    });

    const duplicate = combineSearch(
      collectionSearch({ text: ["name"] }).schema,
      collectionSearch({ text: ["title"] }).schema,
    );
    expect(() => duplicate({ q: "x" })).toThrow(/duplicate key "q"/);
    expect(() =>
      combineSearch(
        (input) => ({ x: input }),
        (input) => ({ x: input }),
      )({}),
    ).toThrow(/duplicate key "x"/);
  });
});

describe("filter helpers", () => {
  const tree = {
    all: [
      eqFilter("status", "running"),
      { any: [{ field: "name", op: "contains" as const, value: "web" }] },
      { field: "ids", op: "in" as const, value: ["a", "b"] },
    ],
  };

  it("flattens leaves and projects single values", () => {
    expect(filterLeaves(tree)).toHaveLength(3);
    expect(filterLeaves(null)).toEqual([]);
    expect(filterValues(tree)).toEqual({ status: "running", name: "web" });
  });

  it("builds canonical predicates", () => {
    expect(predicateOf([])).toBeNull();
    expect(predicateOf([eqFilter("status", "running")])).toEqual(eqFilter("status", "running"));
    expect(predicateOf([eqFilter("a", 1), eqFilter("b", 2)])).toEqual({
      all: [eqFilter("a", 1), eqFilter("b", 2)],
    });
  });
});

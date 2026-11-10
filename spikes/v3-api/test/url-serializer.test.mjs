import test from "node:test";
import assert from "node:assert/strict";

import {
  collectionSearch,
  parseSearch,
  stringifySearch,
} from "../dist/url-serializer.js";

test("url serializer: repeated-key roundtrip with namespace + unknown key", () => {
  const search = collectionSearch({
    text: ["name", "id"],
    defaultSize: 20,
    defaultSort: [{ field: "createdAt", dir: "desc" }],
    namespace: "widgets",
  });

  const state = {
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
  const parsed = search.parseSearch(query);
  const decoded = search.decode(parsed);

  assert.match(query, /widgets\.filter=status%3Ain%3Arunning%2Cdegraded/);
  assert.match(query, /widgets\.filter=replicas%3Agte%3A2/);
  assert.equal(parsed.tab, "settings");
  assert.deepEqual(decoded, state);
});

test("url serializer: patch clears cursor/page on filter change", () => {
  const search = collectionSearch({ text: ["name"], namespace: "tasks" });
  const patch = search.patch({
    filters: [{ field: "status", op: "eq", value: "running" }],
  });

  assert.deepEqual(patch, {
    "tasks.filter": ["status:eq:running"],
    "tasks.cursor": undefined,
    "tasks.page": undefined,
  });
});

test("url serializer: toRequest maps q + filters to predicate tree", () => {
  const search = collectionSearch({
    text: ["name", "id"],
    filters: [{ field: "status", op: "eq" }],
    defaultSize: 20,
  });

  const request = search.toRequest({
    q: "web",
    filters: [
      { field: "status", op: "eq", value: "running" },
      { field: "replicas", op: "gte", value: "2" },
    ],
    sort: [{ field: "name", dir: "asc" }],
    page: { kind: "offset", offset: 40 },
    size: 20,
  });

  assert.deepEqual(request, {
    where: {
      all: [
        {
          any: [
            { field: "name", op: "contains", value: "web" },
            { field: "id", op: "contains", value: "web" },
          ],
        },
        { field: "status", op: "eq", value: "running" },
        { field: "replicas", op: "gte", value: "2" },
      ],
    },
    order: [{ field: "name", dir: "asc" }],
    window: { kind: "offset", size: 20, offset: 40 },
  });
});

test("url serializer: unknown keys survive parse/stringify", () => {
  const params = { tab: "settings", "tasks.q": "web", "tasks.filter": ["a:eq:1"] };
  const parsed = parseSearch(stringifySearch(params));
  // A one-element array is indistinguishable from a scalar in repeated-key URLs;
  // decode() normalizes both via toArray.
  assert.deepEqual(parsed, { tab: "settings", "tasks.q": "web", "tasks.filter": "a:eq:1" });
});

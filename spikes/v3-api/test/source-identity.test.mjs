import test from "node:test";
import assert from "node:assert/strict";

import {
  collectionKey,
  collectionSource,
  defineEntity,
  lookupKey,
  lookupSource,
  recordKey,
  recordSource,
  selectorMatches,
} from "../dist/source-identity.js";

const read = async () => ({
  rows: [],
  paging: { kind: "offset", total: 0, offset: 0, size: 20 },
});

test("source identity: bare source carries name/scope and stable key", () => {
  const source = collectionSource({ name: "widgets", scope: ["projectId"], read });
  assert.equal(source.name, "widgets");
  assert.deepEqual(source.scope, ["projectId"]);

  const key = collectionKey(
    source,
    {
      where: { field: "status", op: "eq", value: "running" },
      order: [{ field: "name", dir: "asc" }],
      window: { kind: "offset", size: 20, offset: 20 },
    },
    { projectId: "p1", appId: "ignored" },
  );

  assert.deepEqual(key, [
    "collection",
    "widgets",
    { projectId: "p1" },
    { field: "status", op: "eq", value: "running" },
    [{ field: "name", dir: "asc" }],
    { kind: "offset", size: 20, offset: 20 },
  ]);
});

test("source identity: defineEntity attaches name/scope, bare source still works", () => {
  const entity = defineEntity({
    name: "widgets",
    scope: ["projectId"],
    collection: { read },
  });
  assert.equal(entity.name, "widgets");
  assert.equal(entity.collection?.name, "widgets");
  assert.deepEqual(entity.collection?.scope, ["projectId"]);

  const bare = collectionSource({ name: "logs", read });
  assert.equal(bare.name, "logs");
  assert.equal(bare.scope, undefined);
});

test("source identity: scope projection matches declared keys only", () => {
  const source = collectionSource({ name: "widgets", scope: ["projectId"], read });
  const key = collectionKey(
    source,
    { window: { kind: "offset", size: 20, offset: 0 } },
    { projectId: "p1" },
  );

  assert.equal(
    selectorMatches({ source: "widgets" }, key, { projectId: "p1", appId: "a1" }, {
      widgets: ["projectId"],
    }),
    true,
  );
  assert.equal(
    selectorMatches({ source: "widgets" }, key, { projectId: "p2" }, {
      widgets: ["projectId"],
    }),
    false,
  );
  assert.equal(
    selectorMatches({ source: "widgets", allScopes: true }, key, { projectId: "p2" }, {
      widgets: ["projectId"],
    }),
    true,
  );
});

test("source identity: record/lookup keys and lookup id dedupe", () => {
  const record = recordSource({
    name: "widgets",
    scope: ["projectId"],
    read: async () => null,
  });
  assert.deepEqual(recordKey(record, "w1", { projectId: "p1" }), [
    "record",
    "widgets",
    { projectId: "p1" },
    "w1",
  ]);

  const lookup = lookupSource({ name: "owners", read: async () => [] });
  assert.deepEqual(lookupKey(lookup, ["o1", "o1", "o2"]), [
    "lookup",
    "owners",
    {},
    ["o1", "o2"],
  ]);
});

test("source identity: invalid names fail fast", () => {
  assert.throws(() => collectionSource({ name: "Widgets", read }), /kebab-case/);
});

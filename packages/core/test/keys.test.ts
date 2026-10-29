import { describe, expect, it } from "vitest";
import { clientCollection } from "../src/adapters";
import {
  batchKey,
  collectionKey,
  defineResource,
  invalidationPredicate,
  recordKey,
  scoped,
  selectorMatches,
} from "../src/kernel";

const apps = defineResource({
  name: "apps",
  getId: (r: { id: string }) => r.id,
  collection: clientCollection(async () => []),
});

describe("查询键", () => {
  it("键形为 [kind, name, scope, scopeKeys, ...detail]", () => {
    const key = collectionKey(apps, { window: { size: 20 } });
    expect(key[0]).toBe("collection");
    expect(key[1]).toBe("apps");
    expect(key[3]).toEqual([]); // 未声明 scope 键 = 空数组段
  });

  it("scoped 嵌入 scope 段（canonical 排序）", () => {
    const key = collectionKey(scoped(apps, { projectId: "p1", env: undefined }), {
      window: { size: 20 },
    });
    expect(key[2]).toEqual({ projectId: "p1" });
    expect(recordKey(scoped(apps, { projectId: "p1" }), "a1")[4]).toBe("a1");
    expect(batchKey(apps, ["b", "a", "b"])[4]).toEqual(["b", "a"]); // 去重保序
  });

  it("声明的 scope 键集嵌入第 4 段", () => {
    const appHooks = defineResource({
      name: "app-hooks",
      scope: ["projectId", "appId"],
      collection: clientCollection(async () => []),
    });
    expect(collectionKey(appHooks, { window: { size: 20 } })[3]).toEqual([
      "projectId",
      "appId",
    ]);
  });
});

describe("失效矩阵（selector 投影匹配 + scope 交运算）", () => {
  const appsA = scoped(apps, { projectId: "A" });
  const appsB = scoped(apps, { projectId: "B" });

  const key = (resource: typeof apps, id?: string) =>
    id === undefined ? collectionKey(resource, { window: { size: 20 } }) : recordKey(resource, id);

  it("同资源同 scope 命中；跨 scope 默认不命中（交运算）", () => {
    expect(selectorMatches({ resource: "apps" }, key(appsA), { projectId: "A" })).toBe(true);
    expect(selectorMatches({ resource: "apps" }, key(appsB), { projectId: "A" })).toBe(false);
  });

  it("allScopes 显式逃逸", () => {
    expect(
      selectorMatches({ resource: "apps", allScopes: true }, key(appsB), { projectId: "A" }),
    ).toBe(true);
  });

  it("kind 与 record id 过滤；batch 键被 batch selector 覆盖", () => {
    expect(
      selectorMatches({ resource: "apps", kind: "collection" }, recordKey(appsA, "x"), {}),
    ).toBe(false);
    expect(
      selectorMatches({ resource: "apps", kind: "record", id: "x" }, recordKey(appsA, "x"), {
        projectId: "A",
      }),
    ).toBe(true);
    expect(selectorMatches({ resource: "apps" }, batchKey(appsA, ["x"]), { projectId: "A" })).toBe(
      true,
    );
  });

  it("invalidationPredicate 过滤非 kit 键", () => {
    const pred = invalidationPredicate([{ resource: "apps" }], {});
    expect(pred({ queryKey: ["collection", "apps", {}, [], null, null, {}] })).toBe(true);
    expect(pred({ queryKey: ["users"] })).toBe(false);
  });
});

describe("M2 投影匹配（读资源声明的 scope 键集 = 比较轴）", () => {
  // fleetly 实咬形态：app-hook 读键声明 [projectId, appId]，
  // 三写动词工厂命令的 scope 携带两个键（M2 前整对象全等 miss → 写后不刷新）
  const appHooks = defineResource({
    name: "app-hooks",
    scope: ["projectId", "appId"],
    collection: clientCollection(async () => []),
  });
  const hookKey = recordKey(
    scoped(appHooks, { projectId: "p1", appId: "a1" }),
    "current",
  );

  it("命令 scope 在声明键集上逐键相等即命中——携带声明外的多余键不阻断", () => {
    // 多余键（env）：声明轴外，不参与比较（过宽 = 廉价 refetch 的裁决方向）
    expect(
      selectorMatches({ resource: "app-hooks" }, hookKey, {
        projectId: "p1",
        appId: "a1",
        env: "prod",
      }),
    ).toBe(true);
  });

  it("声明键上值不等即 miss（漏失效方向保持诚实）", () => {
    expect(
      selectorMatches({ resource: "app-hooks" }, hookKey, {
        projectId: "p1",
        appId: "a2",
      }),
    ).toBe(false);
    expect(
      selectorMatches({ resource: "app-hooks" }, hookKey, { projectId: "p1" }),
    ).toBe(false);
  });

  it("宽读键（声明粗粒度）被窄命令 scope 命中——细粒度 scope 不阻断粗粒度读", () => {
    const projects = defineResource({
      name: "projects",
      scope: ["projectId"],
      collection: clientCollection(async () => []),
    });
    const listKey = collectionKey(scoped(projects, { projectId: "p1" }), {
      window: { size: 20 },
    });
    // 命令 scope 带appId（细），读键声明轴只有 projectId（粗）→ 投影后相等
    expect(
      selectorMatches({ resource: "projects" }, listKey, {
        projectId: "p1",
        appId: "a1",
      }),
    ).toBe(true);
  });

  it("读资源未声明 scope 键：轴 = 两侧出现过的键全集（等价旧全等语义）", () => {
    const bare = scoped(apps, { projectId: "p1" }); // apps 未声明 scope
    const bareKey = collectionKey(bare, { window: { size: 20 } });
    expect(selectorMatches({ resource: "apps" }, bareKey, { projectId: "p1" })).toBe(true);
    // 命令 scope 多一个键 → 全集不等 → miss（未声明资源保持既有行为）
    expect(
      selectorMatches({ resource: "apps" }, bareKey, { projectId: "p1", env: "x" }),
    ).toBe(false);
  });

  it("旧形键（无 scopeKeys 段）宽容降级：键全集相等匹配，id 回退第 4 段", () => {
    // 迁移期手工 setQueryData 的旧形键（record id 在第 4 段）
    const legacyKey = ["record", "apps", { projectId: "p1" }, "a1"];
    expect(
      selectorMatches({ resource: "apps", kind: "record", id: "a1" }, legacyKey, {
        projectId: "p1",
      }),
    ).toBe(true);
    expect(
      selectorMatches({ resource: "apps", kind: "record", id: "other" }, legacyKey, {
        projectId: "p1",
      }),
    ).toBe(false);
  });
});

// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { ResourceScope } from "../src/kernel";
import { defineResource, scoped } from "../src/kernel";
import { useCommand } from "../src/react/command";
import { collectionQueryOptions } from "../src/react/options";

// M2 命令-失效 scope 同源（钩子级）：descriptor.scopeOf 派生的 effectiveScope
// 同一份喂 run(ctx) 与失效匹配——零手传 scope 下写后读面刷新（fleetly 实咬形态）。

afterEach(cleanup);

const ok = <P,>(payload: P) => ({ status: "ok" as const, payload });

let observedCtx: ResourceScope | undefined;

const appHooks = defineResource({
  name: "app-hooks",
  scope: ["projectId", "appId"],
  collection: async () => ({ rows: [{ id: "current", title: "hook" }] }),
  commands: {
    update: {
      // 工厂命令身份从闭包迁入派生声明（M2 机制形态）
      scopeOf: (input: { projectId: string; appId: string; title: string }) => ({
        projectId: input.projectId,
        appId: input.appId,
      }),
      run: async (input: { projectId: string; appId: string; title: string }, ctx: ResourceScope) => {
        observedCtx = ctx;
        return ok(input.title);
      },
    },
  },
});

function Harness() {
  const cmd = useCommand(appHooks.commands.update);
  return (
    <button
      type="button"
      onClick={() =>
        void cmd.mutateAsync({ projectId: "p1", appId: "a1", title: "renamed" })
      }
    >
      run
    </button>
  );
}

const withClient =
  (client: QueryClient) =>
  (ui: ReactNode): ReactNode => <QueryClientProvider client={client}>{ui}</QueryClientProvider>;

describe("useCommand × scopeOf（M2 同源）", () => {
  it("零手传 scope：scopeOf(input) 喂 run(ctx)，同一份驱动失效命中声明资源的读键", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // 读面缓存：声明 ["projectId","appId"] 的 app-hooks 记录（fleetly git-hook 形态）
    const target = scoped(appHooks, { projectId: "p1", appId: "a1" });
    await client.fetchQuery(
      collectionQueryOptions(target, {
        predicate: { field: "id", op: "eq", value: "current" },
        window: { size: 20 },
      }),
    );
    const readKey = collectionQueryOptions(target, {
      predicate: { field: "id", op: "eq", value: "current" },
      window: { size: 20 },
    }).queryKey;
    expect(client.getQueryState(readKey)?.isInvalidated).toBe(false);

    render(withClient(client)(<Harness />));
    fireEvent.click(screen.getByRole("button", { name: "run" }));

    await waitFor(() => {
      expect(observedCtx).toEqual({ projectId: "p1", appId: "a1" });
      // 投影匹配：旧整对象全等下此键不可达（缺省 scope {} 不携带身份）
      expect(client.getQueryState(readKey)?.isInvalidated).toBe(true);
    });
  });

  it("他 scope 的读键不被失效（投影轴上值不等即 miss）", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const other = scoped(appHooks, { projectId: "p1", appId: "a2" });
    await client.fetchQuery(collectionQueryOptions(other, { window: { size: 20 } }));
    const otherKey = collectionQueryOptions(other, { window: { size: 20 } }).queryKey;

    render(withClient(client)(<Harness />));
    fireEvent.click(screen.getByRole("button", { name: "run" }));

    await waitFor(() => expect(observedCtx).toEqual({ projectId: "p1", appId: "a1" }));
    expect(client.getQueryState(otherKey)?.isInvalidated).toBe(false);
  });
});

/**
 * M2 类型执法（编译期——tsc 即断言，typecheck 门禁覆盖）：
 * descriptor 声明了 scope 键（defineResource 字面量 __scopeKeys）时，
 * 显式传入的 scope 必须覆盖全部声明键；省略走 scopeOf/context 解析链不报错。
 */
export function scopeCompletenessTypeFixture() {
  const declared = defineResource({
    name: "declared-res",
    scope: ["projectId", "appId"],
    commands: { save: { run: async () => ok(1) } },
  });
  // 完整：通过
  useCommand(declared.commands.save, { scope: { projectId: "p1", appId: "a1" } });
  // 省略：通过（scopeOf / ResourceScopeProvider 链是既有契约）
  useCommand(declared.commands.save);
  // @ts-expect-error 声明 ["projectId","appId"] 而显式 scope 缺 appId → 编译红
  useCommand(declared.commands.save, { scope: { projectId: "p1" } });
  // @ts-expect-error 显式空 scope 同样缺键 → 编译红
  useCommand(declared.commands.save, { scope: {} });
  // 未声明 scope 键的 descriptor：任意 ResourceScope 照旧
  const undeclared = defineResource({
    name: "undeclared-res",
    commands: { save: { run: async () => ok(1) } },
  });
  useCommand(undeclared.commands.save, { scope: { anything: "x" } });
}

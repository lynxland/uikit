import {
  clientCollection,
  mockCollection,
  mockFetchAll,
  restFetchAll,
} from "@lynx-go/uikit-core/adapters";
import type { CommandResult } from "@lynx-go/uikit-core/kernel";
import { defineResource } from "@lynx-go/uikit-core/kernel";
import { collectionQuerySchema } from "@lynx-go/uikit-core/schema";
import type { Owner, Widget } from "./mock-data";
import { OWNERS, WIDGETS } from "./mock-data";
import { demoRestFetch, type Schedule, type Task } from "./rest-demo";

export type { Schedule, Task };

// ============ 资源（适配器作者视角：mock 驱动，双方言对照） ============

const ownersMock = mockCollection(OWNERS, { dialect: "offset", latencyMs: 80 });

export const ownersResource = defineResource({
  name: "owners",
  getId: (row: Owner) => row.id,
  collection: ownersMock.collection,
  record: ownersMock.record,
  batch: ownersMock.batch,
});

/** fleetly 方言：整取 + 客户端求值（clientCollection 伪造游标） */
const widgetsFetchAll = mockFetchAll(WIDGETS, { latencyMs: 100 });
export const widgetsClient = defineResource({
  name: "widgets",
  getId: (row: Widget) => row.id,
  collection: clientCollection(widgetsFetchAll),
  record: (id: string) => {
    const widget = widgetsFetchAll.rows().find((w) => w.id === id);
    if (!widget)
      throw { kind: "not-found" } satisfies import("@lynx-go/uikit-core/kernel").ApiError;
    return Promise.resolve(widget);
  },
  batch: (ids) => Promise.resolve(widgetsFetchAll.rows().filter((w) => ids.includes(w.id))),
  commands: {
    create: {
      run: (input: { name: string; status: Widget["status"]; replicas: number }) => {
        if (input.name === "reject-me") {
          // message-first 拒绝演示（后端只有 code/message 的真实形态）
          return Promise.resolve({
            status: "rejected",
            code: "E_DEMO",
            message: "Name rejected by server (demo)",
          } satisfies CommandResult<Widget>);
        }
        const widget: Widget = {
          id: `widget-${Date.now().toString(36)}`,
          createdAt: new Date().toISOString(),
          owner: OWNERS[0]!.id,
          ...input,
          replicas: Number(input.replicas),
        };
        widgetsFetchAll.replaceRows([widget, ...widgetsFetchAll.rows()]);
        return Promise.resolve({ status: "ok", payload: widget } satisfies CommandResult<Widget>);
      },
      // 缺省 invalidates → 同资源全部查询失效（defineResource 注入 __resource）
    },
    update: {
      run: (input: {
        id: string;
        name: string;
        status: Widget["status"];
        replicas: number;
        owner: string;
      }) => {
        const rows = widgetsFetchAll.rows();
        const widget = rows.find((w) => w.id === input.id);
        if (!widget) {
          return Promise.resolve({
            status: "rejected",
            code: "E_NOT_FOUND",
            message: "Widget no longer exists (demo)",
          } satisfies CommandResult<Widget>);
        }
        const next: Widget = { ...widget, ...input, replicas: Number(input.replicas) };
        widgetsFetchAll.replaceRows(rows.map((w) => (w.id === input.id ? next : w)));
        return Promise.resolve({ status: "ok", payload: next } satisfies CommandResult<Widget>);
      },
    },
    delete: {
      run: (id: string) => {
        widgetsFetchAll.replaceRows(widgetsFetchAll.rows().filter((w) => w.id !== id));
        return Promise.resolve({ status: "ok", payload: null } satisfies CommandResult<null>);
      },
      // 幂等删除演示：delete 已删（404）→ treatAs 覆写为 ok
      treatAs: { "not-found": { status: "ok", payload: null } },
    },
  },
});
/** 四态演示：失败注入句柄（demo 专属，消费方代码） */
export const widgetsFailureHandle = widgetsFetchAll;

/** torchwood 方言：keyset 无 total（空尾页停发令牌） */
const widgetsKeysetMock = mockCollection(WIDGETS, { dialect: "keyset", latencyMs: 120 });
export const widgetsKeyset = defineResource({
  name: "widgets-keyset",
  getId: (row: Widget) => row.id,
  collection: widgetsKeysetMock.collection,
});

// ============ scope 单源配方（ResourceScopeProvider + 未就绪停用，§12.10-③） ============

export interface ScopedWidget {
  id: string;
  name: string;
  project: string;
}

const SCOPED_ROWS: ScopedWidget[] = [
  ...Array.from({ length: 3 }, (_, i) => ({
    id: `alpha-${i + 1}`,
    name: `Alpha widget ${i + 1}`,
    project: "proj-alpha",
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `beta-${i + 1}`,
    name: `Beta widget ${i + 1}`,
    project: "proj-beta",
  })),
];

/**
 * 声明 scope 键的资源：绑定在 Provider 值缺键时自动停用（enabled: false）
 * ——未就绪查询不启用，页面不再逐处写 enabled 守卫；适配器的空段守卫退居防御。
 */
export const scopedWidgets = defineResource({
  name: "scoped-widgets",
  getId: (row: ScopedWidget) => row.id,
  scope: ["projectId"],
  collection: async (_q, ctx) => {
    if (ctx.projectId == null) return { rows: [] }; // 防御：未就绪停用外的兜底
    await new Promise((r) => setTimeout(r, 120));
    const rows = SCOPED_ROWS.filter((row) => row.project === ctx.projectId);
    return { rows, total: rows.length };
  },
});

export const scopedWidgetsSearch = collectionQuerySchema({ defaultSize: 8 });

// ============ identity（useCan 门控演示：record Query + 纯谓词，fail-closed） ============

export interface Identity {
  id: string;
  name: string;
  role: "admin" | "viewer";
}

const identityMock = mockCollection<Identity>([{ id: "me", name: "Ada Lovelace", role: "admin" }], {
  latencyMs: 120,
});

export const identityResource = defineResource({
  name: "identity",
  getId: (row) => row.id,
  record: identityMock.record,
});

/** demo 数据源开关：切换当前身份角色（消费方代码，配合 record 失效） */
export function toggleIdentityRole(): "admin" | "viewer" {
  const current = identityMock.handle.rows()[0]!;
  const next = current.role === "admin" ? "viewer" : "admin";
  identityMock.handle.replaceRows([{ ...current, role: next }]);
  return next;
}

// ============ namespace 配方（M1：多集合同路由各持各键） ============
// M4 第二形态活文档（2026-10-30 换装）：clientCollection(restFetchAll(...))——
// REST 整取 + 客户端求值（fleetly 19 个 kit 资源文件的标准消费形）。tasks 走
// 默认信封 body.rows；schedules 演示 envelope 方言覆写 + params 取数上限。

export const tasksResource = defineResource({
  name: "tasks",
  getId: (row: Task) => row.id,
  collection: clientCollection(
    restFetchAll<Task>({ path: () => "/v1/tasks", fetch: demoRestFetch }),
  ),
});

export const schedulesResource = defineResource({
  name: "schedules",
  getId: (row: Schedule) => row.id,
  collection: clientCollection(
    restFetchAll<Schedule>({
      path: () => "/v1/schedules",
      envelope: (body) => (body as { schedules: unknown[] }).schedules,
      params: () => ({ limit: 100 }),
      fetch: demoRestFetch,
    }),
  ),
});

/** 双集合同路由：namespace 显式开启——URL 键 tasks.q / schedules.q 并存互不携带 */
export const tasksSearch = collectionQuerySchema({
  namespace: "tasks",
  text: ["title", "id"],
  filters: [
    {
      field: "priority",
      op: "eq",
      label: "Priority",
      options: [
        { value: "high", label: "High" },
        { value: "low", label: "Low" },
      ],
    },
  ],
  defaultSize: 5,
});

export const schedulesSearch = collectionQuerySchema({
  namespace: "schedules",
  text: ["name", "id"],
  defaultSize: 5,
});

// ============ search schema（路由与绑定共用同一实例） ============

export const widgetsSearch = collectionQuerySchema({
  text: ["name", "id"],
  filters: [
    {
      field: "status",
      op: "eq",
      label: "Status",
      options: [
        { value: "running", label: "Running" },
        { value: "stopped", label: "Stopped" },
        { value: "degraded", label: "Degraded" },
      ],
    },
  ],
  defaultSize: 8,
  defaultOrder: [{ field: "createdAt", dir: "desc" }],
});

export const widgetsKeysetSearch = collectionQuerySchema({
  text: ["name"],
  defaultSize: 8,
  defaultOrder: [{ field: "name", dir: "asc" }],
});

export const ownersSearch = collectionQuerySchema({
  text: ["name"],
  filters: [
    {
      field: "owner",
      op: "eq",
      label: "Owner",
      options: OWNERS.map((owner) => ({ value: owner.id, label: owner.name })),
    },
  ],
  defaultSize: 8,
});

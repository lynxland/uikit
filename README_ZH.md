# @lynxland/uikit

面向数据密集 console UI 的、有观点但可逐层退出的工具包——**Query / Command / Stream**
三种数据能力，经显式 React 绑定、UI 无关的 surfaces、可替换的 UI adapter 和默认可运行的
console preset 组合起来。

[English](README.md) · [设计规范](docs/design.md) · [设计理念](docs/philosophy.md) · [API 手册](docs/SKILL.md)

> **v3 · `3.0.0` · greenfield cutover。** v3 **不向后兼容**：
> `Resource`、`FieldDef`、`Page`、`*Panel`、`TablePage`、`useCollectionData`、`useBatch`、
> `useSubscription` 已删除，没有别名，也没有运行时兼容层。
> 消费方迁移见[执行计划](docs/migrations/v3-execution-plan.md)；
> v2 历史归档在 [docs/design-history.md](docs/design-history.md)。

## 为什么

一个 console 页面需要三种**数据能力**和少量**呈现层**，都不需要重造引擎：

| 能力 | 角色 |
|---|---|
| **Query** | 缓存读：collection / record / lookup |
| **Command** | 具名写：返回 `Outcome` 结果分支 + 显式失效效果 |
| **Stream** | 按游标定位的**帧流**——backlog → follow、断档重同步、退避/轮询 |

**Entity** 只是 key/scope/失效的可选分组，不是第四原语。

呈现层按依赖单向分层，每一层都可替换：

```
Value → Control → View → Chrome → Page Composition
```

- **Control** 只收受控 props：不取数、不碰 Router、不读 `window.history`。
- **View** 把绑定句柄翻译成控件 props；不渲染 `h1`。
- **Chrome** 拥有页壳，是唯一的 `h1` 所有者。
- **Preset 页面**是薄组合；**Page Template** 是可复制/可生成的特殊页面骨架。

## 包

| 包 | 角色 |
|---|---|
| `@lynxland/uikit-core` | 无头 kernel / URL schema / REST-client-mock-stream adapters。**零 React、零 Effect。** |
| `@lynxland/uikit-react` | 数据/命令/流绑定；URL 只住在 `/router`。 |
| `@lynxland/uikit-surfaces` | values/controls/views/chrome/fields + `UiAdapter` contract。 |
| `@lynxland/uikit-ui-shadcn` | 默认 UI adapter：Base UI + shadcn 基元与语义 token。 |
| `@lynxland/uikit-ui-plain` | 可选最小 adapter，证明契约可替换。 |
| `@lynxland/uikit-preset-console` | 默认可运行页面：Collection / Record / Form / CRUD / Settings / Wizard / Events。 |
| `@lynxland/uikit-testing` | `renderWithKit`、`createTestRouter`、按能力 mock。 |
| `@lynxland/uikit` | 一键安装 meta；转发 console preset。 |

根包是私有的 `@lynxland/uikit-workspace`；`packages/meta` 才拥有公开的
`@lynxland/uikit` 名字。

## 快速开始

```bash
pnpm add @lynxland/uikit @tanstack/react-query @tanstack/react-router \
  @tanstack/react-form @tanstack/react-table
```

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { PresetProvider } from "@lynxland/uikit";
import "@lynxland/uikit/preset.css";

const queryClient = new QueryClient();
const router = createRouter({ routeTree });

createRoot(root).render(
  <QueryClientProvider client={queryClient}>
    <PresetProvider>
      <RouterProvider router={router} />
    </PresetProvider>
  </QueryClientProvider>,
);
```

带 URL、过滤、排序、分页、四态与行操作的列表页：

```tsx
<CrudPage
  title="Widgets"
  source={widgets}
  search={widgetsSearch}
  from="/widgets"
  fields={widgetFields}
  filters={widgetFilters}
  create={{ command: createWidget, host: "dialog" }}
  update={{ command: updateWidget, host: "drawer", toInput: (row) => ({ ...row }) }}
  delete={{ command: deleteWidget }}
  getRowId={(row) => row.id}
/>
```

也可以退一层，用同样的零件手装：

```tsx
const page = useCollectionPage(widgets, { search: widgetsSearch, from: "/widgets" });
return (
  <PageLayout title="Widgets">
    <CollectionView
      list={page}
      columns={columns}
      filters={filterFields}
      filterState={{ text: page.state.q ?? "", filters: page.state.filters ?? [] }}
      onFilterChange={({ text, filters }) => page.patchState({ q: text, filters })}
      sort={page.state.sort}
      onSortChange={(sort) => page.setSort(sort.length ? sort : null)}
      pagerModel={page.pager}
    />
  </PageLayout>
);
```

## 原则

- **TanStack 原生。** Router / Query / Table / Form 是引擎；uikit 只做绑定。
- **两条轴不许互相镜像。** 数据能力不是 UI 家族。
- **URL 是可选策略。** 数据绑定不 import Router；URL 绑定住在
  `@lynxland/uikit-react/router`。
- **失败 ≠ 结果。** `ApiError` 走失败通道；`Outcome` 走返回值。
- **流是帧，不是事件。** 帧带游标，可续订、可重同步，不是不透明 pub/sub。
- **无隐藏协议。** 没有 `__resource` / `__scopeKeys` / `__id`；失效是显式 `Effect[]`。
- **开箱即用归 preset。** core 保持无头；每一层都能退出。

## 开发

```bash
pnpm install
pnpm check        # layer-check + doc-check + typecheck + size-check + tests + v3 spike
pnpm --filter demo dev
pnpm --filter demo e2e
```

demo 是严格复刻的 Dokploy UI，路由在 `/dashboard/*`（home / projects /
environments / application、database、compose 详情 / deployments / Traefik /
Docker / Requests / Schedules / settings），只用 v3 包实现。
保真记录与剩余缺口见
[docs/audits/2026-11-08-dokploy-dogfood.md](docs/audits/2026-11-08-dokploy-dogfood.md)。

仓库结构与分层不变量见 [AGENTS.md](AGENTS.md)；规范见 [docs/design.md](docs/design.md)；
当前 API 见 [docs/SKILL.md](docs/SKILL.md)；版本矩阵见 [docs/versions.md](docs/versions.md)。

## License

MIT — 见 [LICENSE](LICENSE)。贡献见 [CONTRIBUTING.md](CONTRIBUTING.md)；
社区准则见 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)；安全问题见 [SECURITY.md](SECURITY.md)。

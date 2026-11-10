# @lynxland/uikit v3 — 页面作者手册

> **版本**：`3.0.0`（v3 greenfield cutover）
> **规范**：[docs/design.md](design.md) · **理念**：[docs/philosophy.md](philosophy.md)
> **历史**：[docs/design-history.md](design-history.md)（v2 只作证据，不是 API）
>
> v3 不向后兼容：`Resource` / `FieldDef` / `Page` / `*Panel` / `TablePage` /
> `useCollectionData` / `useBatch` / `useSubscription` 已删除，没有别名。
> 旧代码用 [v3-execution-plan](migrations/v3-execution-plan.md) 的 codemod 改消费方。

## 1. 心智模型

两条轴，不许混：

| 数据能力 | 角色 |
|---|---|
| **Query** | 缓存读：collection / record / lookup |
| **Command** | 具名写：`Outcome` 结果 + `Effect[]` 失效 |
| **Stream** | 游标定位的帧流：backlog → follow → resync |

| 呈现层（L5–L7） | 角色 |
|---|---|
| **Value** | 纯展示：StatusBadge / StatusDot / RelativeTime / StatCard / states |
| **Control** | 受控 props：DataTable / FilterBar / Pager / Tabs / Form |
| **View** | 绑定句柄 → 控件 props：CollectionView / RecordView / FormView |
| **Chrome** | 页壳：PageLayout / AppShell / SectionCard（唯一 h1 所有者） |
| **Page Composition** | preset 页面、Page Template、脚手架 |

**Entity 只是可选分组**，不是第四原语。裸 `CollectionSource` 完全可用。

## 2. 安装与启动

默认一键（meta → preset → surfaces + ui-shadcn）：

```bash
pnpm add @lynxland/uikit @tanstack/react-query @tanstack/react-router \
  @tanstack/react-form @tanstack/react-table
```

应用根：

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { PresetProvider } from "@lynxland/uikit";
import "@lynxland/uikit/preset.css"; // surfaces.css + shadcn tokens.css

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

按层使用（不装 preset）：

```bash
pnpm add @lynxland/uikit-core @lynxland/uikit-react @lynxland/uikit-surfaces @lynxland/uikit-ui-shadcn
```

- `@lynxland/uikit-core`：零 React、零 Effect；根 / `kernel` / `schema` / `adapters`。
- `@lynxland/uikit-react`：数据/命令/流绑定；`/router` 才有 URL。
- `@lynxland/uikit-surfaces`：values/controls/views/chrome/fields + `UiAdapter` contract。
- `@lynxland/uikit-ui-shadcn`：Base UI + shadcn 默认 adapter + `/tokens.css`。
- `@lynxland/uikit-preset-console`：默认可运行页面。
- `@lynxland/uikit`：meta，只转发 preset + 少量 core 类型。

## 3. Core：source / entity / command / stream

### 3.1 裸 source

```ts
import { collectionSource, recordSource, lookupSource } from "@lynxland/uikit-core";

export const widgets = collectionSource<Widget>({
  name: "widgets",                 // kebab-case；进 query key
  scope: ["projectId"],            // 声明的 scope 键（可选）
  async read(request, ctx, signal) {
    return api.listWidgets(request, ctx.projectId, signal);
  },
});

export const widget = recordSource<Widget>({
  name: "widgets",
  scope: ["projectId"],
  async read(id, ctx, signal) {
    return api.getWidget(id, ctx.projectId, signal); // null = empty
  },
});

export const owners = lookupSource<Owner>({
  name: "owners",
  key: (owner) => owner.id,        // byId / missingIds 的行 → id 投影
  async read(ids, ctx, signal) {
    return api.getOwners(ids, signal);
  },
});
```

### 3.2 Entity（可选）

```ts
import { defineEntity } from "@lynxland/uikit-core";

export const widgetEntity = defineEntity<Widget>({
  name: "widgets",
  key: (row) => row.id,
  scope: ["projectId"],
  collection: { read: widgets.read },
  record: { read: widget.read },
  lookup: { read: owners.read },
  commands: { create, update, remove },
});
```

`defineEntity` 只把 `name`/`scope` 附加到能力上，没有 `__resource`/`__scopeKeys`。

### 3.3 Request / Page / Window

```ts
type CollectionWindow =
  | { kind: "cursor"; size: number; cursor?: string }
  | { kind: "offset"; size: number; offset: number }
  | { kind: "all"; size?: number };

interface CollectionRequest {
  where?: Predicate;
  order?: readonly Sort[];
  window: CollectionWindow;
}

interface CollectionPage<T> {
  rows: readonly T[];
  paging:
    | { kind: "cursor"; nextCursor?: string; total?: number }
    | { kind: "offset"; total: number; offset: number; size: number }
    | { kind: "all"; total: number };
}
```

### 3.4 Command / Outcome / Effect

```ts
import { ok, rejected, conflict, invalidate } from "@lynxland/uikit-core";

const createWidget: Command<CreateWidget, Widget> = {
  // 必须是函数属性，不能写方法签名（方法参数 bivariant，会破坏 Input 类型）
  run: async (input, ctx) => {
    const row = await api.createWidget(input, ctx.projectId);
    return ok(row);
  },
  effects: [invalidate("widgets")],
  // 协议层 not-found/forbidden 的领域语义：
  treatAs: { "not-found": ok(undefined as never) },
};
```

- `ApiError`（`network` / `auth` / `forbidden` / `not-found` / `server` / `decode`）走失败通道。
- `Outcome`（`ok` / `rejected` / `conflict`）走返回值；预期内拒绝不是异常。
- `effects` 是纯数据；绑定层应用。`effects: []` 表示不失效。

### 3.5 Stream

```ts
const stream: StreamSource<LogEvent> = {
  open(cursor, signal) {
    return ndjsonTransport({ url: "/api/logs", cursor, signal });
  },
  beforeReconnect() { /* refresh token, etc. */ },
};
```

`StreamStatus`：`idle` / `live` / `reconnecting` / `paused` / `gapped` / `stalled` /
`ended` / `error`。流是帧流，不是 pub/sub。

### 3.6 URL schema：`collectionSearch`

```ts
import { collectionSearch } from "@lynxland/uikit-core";

export const widgetsSearch = collectionSearch({
  text: ["name", "id"],             // q → OR of contains
  filters: [
    { field: "status", op: "eq" },
    { field: "owner", op: "in" },
  ],
  defaultSize: 20,
  defaultSort: [{ field: "createdAt", dir: "desc" }],
  // offset 分页必须声明；否则 URL 无 page 时按 cursor 解释
  defaultPage: { kind: "offset", offset: 0 },
  namespace: "widgets",             // 多集合同路由：widgets.q / widgets.filter
});

// TanStack Router
validateSearch: widgetsSearch.schema,
parseSearch: widgetsSearch.serializer.parseSearch,
stringifySearch: widgetsSearch.serializer.stringifySearch,
```

- `schema` 是 Standard Schema，`validateSearch` 直收。
- `encode` / `decode` / `patch` / `reset` / `toRequest`。
- repeated key：`filter=a:eq:1&filter=b:in:x,y`；`stringifySearch` 返回前导 `?`。
- 单元素数组 parse 后是 scalar；`decode` 用 `toArray` 归一。
- `patch({ filters })` 会清 `cursor` / `page`。
- 默认分页模式：`defaultPage`；`decode` 不把默认值写回 state。

### 3.7 adapters

```ts
import {
  restCollection, restRecord, restFetchAll,
  clientCollection, mockCollection,
  mockTransport, ndjsonTransport, sseTransport,
} from "@lynxland/uikit-core";
```

- `restCollection({ url, fetch? })` / `restRecord` / `restFetchAll`。
- `clientCollection({ fetchAll })`：整取 + 本地求值 + 伪造 cursor。
- `mockCollection(rows, { dialect: "offset" | "keyset" })`。
- `mockTransport` / `ndjsonTransport` / `sseTransport`：纯 TS async iterables。
- 没有 `createHttp`；鉴权/401 用注入的 `fetch` 解决。

## 4. React 绑定

### 4.1 Scope

```tsx
<ScopeProvider value={{ projectId }}>
  <App />
</ScopeProvider>
```

- 绑定 scope 优先级：`options.scope` > `ScopeProvider`（source 声明了 scope 时）> `{}`。
- 声明的 scope 键缺失 → `status: "idle"` / 不请求；命令 `ready: false`。
- 跨 scope 失效必须显式 `invalidate("widgets", { allScopes: true })`。

### 4.2 数据

```ts
const list = useCollection(widgets, {
  where: { field: "status", op: "eq", value: "running" },
  window: { kind: "offset", size: 20, offset: 0 },
}, { scope, staleTime: 5_000, keepPrevious: true });

list.status;      // idle | loading | empty | error | success
list.emptyReason; // source | filter
list.rows; list.page; list.total; list.refetch();

const record = useRecord(widget, id, { scope }); // id undefined -> idle
const lookup = useLookup(owners, ids, { scope }); // byId / missingIds
```

- `useCollection` **没有 setter**、不读 URL、不 import Router。
- Query key 由 core `collectionKey` / `recordKey` / `lookupKey` 单源生成。
- Key 只投影 source 声明的 scope 键；命令 scope 里的多余键不会污染读键。

### 4.3 命令

```ts
const create = useCommand(createWidget, {
  entity: widgetEntity,          // 默认失效同 Entity
  scope: { projectId },
  onSettled: (result, failure) => { /* ... */ },
});

create.mutate(input);
await create.mutateAsync(input);
create.result; create.failure; create.pending; create.ready;
```

- `treatAs` 把协议 `not-found`/`forbidden` 映射成领域结果。
- `effects` 优先级：`options.effects` > `command.effects` > Entity 默认失效。
- `effects: []` 显式不失效。
- 未就绪时 `mutate` 抛开发期错误，不静默 no-op。

### 4.4 表单

```ts
const form = useCommandForm(createWidget, {
  schema,                         // 任意 Standard Schema
  fields: createFields,           // FieldInput<CreateInput>[]
  defaultValues: { replicas: 1 },
}, { entity: widgetEntity, scope });

form.form; form.submitting; form.error; form.fieldErrors;
form.reveal;  // ok payload，一次性；不进 query cache
form.submit(); form.run(input); form.reset();
```

### 4.5 流

```ts
const stream = useStream(logStream, {
  cursor: null,                   // undefined = standby；null = live tail；string = anchor
  getCursor: (frame) => frame.cursor,
  onFrame: (frame) => { /* ... */ },
  policy: { buffer: 500, retry: { backoffMs: [500, 1000, 2000] } },
});

stream.status; stream.frames; stream.error; stream.resyncs;
stream.start(); stream.pause(); stream.resume(); stream.restart();
stream.resync(anchor); stream.clear();
```

实时失效是组合：

```ts
useInvalidateOnFrame(stream, [invalidate("widgets")], {
  filter: (frame) => frame.type === "widget.updated",
  throttleMs: 250,
});
```

### 4.6 URL / Router（`@lynxland/uikit-react/router`）

```ts
import { useCollectionPage, useEnumSearch, useSearchState, useTabParam } from "@lynxland/uikit-react/router";

const page = useCollectionPage(widgets, {
  search: widgetsSearch,
  from: "/widgets",
  scope,
});

page.state;        // decoded CollectionState（q/filters/sort/page/size）
page.rows; page.status; page.pager;
page.patchState({ q: "web" });
page.setFilters([...]);
page.setSort([{ field: "name", dir: "asc" }]);
page.reset();
```

- 只有这个子路径 import `@tanstack/react-router`。
- 写入律：自由过滤/排序 replace；翻页/离散 tab push；详情 tab replace。
- `PagerModel`：offset 本地算 prev/next；cursor prev 走 `router.history.back()`，
  深链 cursor 历史为空时 prev 不可用。
- offset 分页的 schema 必须声明 `defaultPage: { kind:"offset", offset:0 }`。
- `useEnumSearch({ from, key, values, defaultValue })` / `useTabParam({ from })`
  处理 tab/status/env 等单键 URL 参数，默认值不写入 URL。

## 5. Surfaces：UI 无关的呈现层

### 5.1 UiAdapter

```tsx
import { UiAdapterProvider } from "@lynxland/uikit-surfaces/adapter";
import { shadcnAdapter } from "@lynxland/uikit-ui-shadcn";

<UiAdapterProvider adapter={shadcnAdapter}>
  <App />
</UiAdapterProvider>
```

契约：`Button` / `Input` / `Textarea` / `Select` / `Checkbox` / `DateTimeInput` /
`Switch` / `Field` / `Popover` / `Menu` / `Tooltip` / `Tabs` / `Dialog` / `Drawer` /
`Badge` / `Card` / `Table` slots / `icons` / 可选 `cx`。`Button asChild` 可把
Router `<Link>` 渲染成按钮；`Tooltip` 的 `trigger` 同样按元素渲染，不嵌套按钮。
`Tabs` 的 variant 为 `underline | pills | filter | segmented`。具体 UI 库的
compound API 不泄漏到 surfaces。

- 默认：`@lynxland/uikit-ui-shadcn`（Base UI 1.9 + shadcn）。
- 参考最小实现：`@lynxland/uikit-ui-plain`（无 Tailwind/Base UI）。
- 自定义：实现 `UiAdapter`，不必 fork surfaces。

**Light/Dark**：`@lynxland/uikit-ui-shadcn/tokens.css` 提供 `:root` 亮色与 `.dark`
覆盖。`@lynxland/uikit-surfaces` 提供 `ThemeProvider` / `useTheme` / `ThemeToggle`，
统一处理 class、localStorage 与默认值；SSR/静态 HTML 可用 `themeScript()` 在首屏前
注入，避免闪白。

### 5.2 Controls（全部受控）

```tsx
<DataTable
  rows={rows}
  columns={columns}                // Column<Row>：id/header/accessor/cell/sortField
  getRowId={(row) => row.id}
  sorting={sort}
  onSortingChange={setSort}
  selection={selection}
  onRowClick={openDetail}
  getRowProps={(row) => ({ "data-testid": `row-${row.id}` })}
/>

<FilterBar
  fields={filterFields}
  value={state.filters ?? []}
  onChange={(filters) => patch({ filters })}
  text={{ value: state.q ?? "", onChange: (q) => patch({ q }) }}
/>

<Pager
  paging={page.paging}
  onPrev={...}
  onNext={...}
  onPageSizeChange={...}
/>

<AsyncState status={list.status} error={list.error} onRetry={list.refetch}>
  <DataTable ... />
</AsyncState>
```

- 控件不取数、不 import Router、不调用 setter、不读 `window.history`。
- `DataTable` 可以渲染静态数组；`onRowClick` 同时支持 Enter/Space 键盘激活；
  `getRowProps` 可加 `data-testid`/ARIA/行级属性。`FilterBar` 没有完整本地 Draft 镜像。
- 一个受控 `Tabs` 覆盖模块/详情/过滤三种形态。
- `RelativeTime` 默认 `Intl` short（`2 min. ago`）；`format="long"` 输出
  `2 minutes ago`，`numeric="always"` 可避免 “yesterday” 之类的自动措辞。

### 5.3 Views

```tsx
<CollectionView
  list={page}
  columns={columns}
  filters={filterFields}
  filterState={{ text: page.state.q ?? "", filters: page.state.filters ?? [] }}
  onFilterChange={({ text, filters }) => page.patchState({ q: text, filters })}
  sort={page.state.sort}
  onSortChange={(sort) => page.setSort(sort.length ? sort : null)}
  pagerModel={page.pager}
  onRowClick={openDetail}
/>

<RecordView
  record={record}
  title={(row) => row.name}
  meta={(row) => <StatusBadge status={row.status} />}
  tabs={[{ key: "overview", label: "Overview", render: (row) => <FieldGrid ... /> }]}
  activeTab={tab}
  onTabChange={setTab}
/>

<FormView form={form} fields={createFields} submitLabel="Create" />
```

- View 不渲染 h1/页宽/页头。
- `RecordView` tab 懒渲染；`FormView` 消费 `useCommandForm` 句柄，不创建表单。
- `LogViewer` / `EventFeed` / `StageTimeline` 消费 `StreamHandle`。

### 5.4 Chrome

```tsx
<PageLayout
  title="Widgets"
  description="..."
  actions={<Button>New</Button>}
  tabs={moduleTabs}
  currentTab={tab}
  onTabChange={setTab}
  breadcrumb={
    <Breadcrumb
      items={[
        { label: "Widgets", render: <Link to="/widgets">Widgets</Link> },
        { label: "Widget" },
      ]}
    />
  }
  tabsVariant="segmented" // underline | pills | filter | segmented
  titleSize="lg" // sm 18 / md 20 / lg 24 / xl 30
  headerDivider
  width="wide" // flow | narrow | wide | content(53rem)
  maxWidth="53rem" // optional CSS length override
>
  <CollectionView ... />
</PageLayout>
```

```tsx
<AppShell
  sidebarHeader={<TeamSwitcher />}
  sidebarFooter={<UserMenu />}
  nav={nav}
  activePath={pathname}
  header={<GlobalActions />}
  collapsible
  variant="plain" // plain | floating
  sidebarWidth="16rem"
  collapsedMode="icon" // hide | icon
  storageKey="app.sidebar.collapsed"
  mobileOpen={mobileOpen}
  onMobileOpenChange={setMobileOpen}
>
  <Outlet />
</AppShell>
```

`AppShellNavItem` 支持 `icon`、`badge`、`children`（嵌套可折叠分组）；`activePath`
用 `findActiveNavItem()` 做最长前缀匹配，`exact: true` 可关闭子路径匹配。

- `PageLayout` 是唯一 h1 所有者；应用可换成自己的壳。
- **宽度规则**：`wide` = 72rem（列表/详情/日志/事件等数据页，默认）；
  `narrow` = 48rem（表单/设置等阅读型页面）；`content` = 53rem（设置卡片内文）；
  `flow` = 不设 max-width（真正的边缘到边缘页面）。
  preset 的 `FormPage`/`SettingsPage` 默认 `narrow`，其余默认 `wide`。
  demo 的 Dokploy clone 统一用 `flow` 作为页面卡基线（卡片自身控制边距），
  设置页用 `width="content"`（不再套 `max-w-[53rem]`）；不要把
  `wide`/`narrow` 和 `flow` 混在同一个页面卡里
  （见 `docs/audits/2026-11-10-dokploy-core-gaps.md` §6.2）。
- `titleSize` 控制 h1（18/20/24/30px），`headerDivider` 提供页头下通栏分隔线。
  窄屏 ≤640px 时页头换行，actions 落到标题下方，h1 始终可见。
- `AppShell` 只管导航/高度链；用 `renderLink` / `activePath` 接 Router，不 import Router。
  侧边栏有 `sidebarHeader` / `sidebarFooter` 两个完整插槽（团队切换器、用户菜单等），
  主内容区有 `header` 插槽；`collapsible` + `collapsed`/`defaultCollapsed`/`onCollapsedChange`
  提供内置收起按钮与受控状态。`variant="floating"` + `sidebarWidth` 负责浮层几何；
  `collapsedMode="icon"` 渲染带 Tooltip 的 3.5rem 图标轨；`mobileOpen` /
  `onMobileOpenChange` 控制 <768px 的 overlay drawer。sidebar 颜色走
  `--ui-sidebar*` token。
- `Breadcrumb` / `SectionCard` / `ScopeSwitcher` / `Stepper` / `RouteErrorBoundary` 同层。

### 5.5 字段三拆

```ts
const viewFields: FieldView<Widget>[] = [
  { name: "name", kind: "text" },
  { name: "status", kind: "enum", options: [...] },
  { name: "owner", kind: "reference", reference: { source: owners, getLabel: (o) => o.name, getValue: (o) => o.id } },
];

const createFields: FieldInput<CreateWidget>[] = [
  { name: "name", kind: "text", required: true },
  { name: "replicas", kind: "number" },
];

const filterFields: FilterField[] = [
  { field: "status", kind: "enum", options: [...] },
  { field: "createdAt", kind: "datetime", as: "range" },
];

const fields = crudFields<Widget, CreateWidget, UpdateWidget>({
  view: viewFields,
  create: createFields,
  update: updateFields,
  filters: filterFields,
  createDefaults: { replicas: 1 },
  toUpdateInput: (row) => ({ id: row.id, name: row.name, status: row.status }),
});
```

- `FieldView<Row>` 只列表/详情；`FieldInput<Input>` 只表单；`FilterField` 只过滤。
- `Input` 类型独立于 Row；Row → Input 必须显式 `toUpdateInput`。
- `ReferenceValue` / `ReferenceInput` 在 `fields/` 里用 `useLookup`；控件层不取数。

## 6. Preset 页面

```tsx
import {
  CollectionPage, RecordPage, FormPage, CrudPage,
  SettingsPage, WizardPage, EventsPage,
} from "@lynxland/uikit-preset-console";
```

| 页面 | 组合 | 退出方式 |
|---|---|---|
| `CollectionPage` | PageLayout + CollectionView + useCollectionPage | 手装同三件 |
| `RecordPage` | PageLayout + RecordView + useRecord | 手装同三件 |
| `FormPage` | PageLayout + FormView + useCommandForm | 手装同三件 |
| `CrudPage` | CollectionPage + create/edit/delete + CrudFields | CollectionView + 自己接命令 |
| `SettingsPage` | PageLayout + SectionCard × n + PreferenceItem | 手装 |
| `WizardPage` | PageLayout + Stepper + step slots | 手装 |
| `EventsPage` | backlog useCollection × useStream × EventFeed | 手装 |

叠加宿主（preset 导出）：`CommandDialog` / `CommandDrawer`（打开时跑 command form，ok 自动关闭）
与 `ConfirmCommandDialog`（bare command 的确认/危险操作）。

示例：一个带 URL/过滤/分页/CRUD 的列表页：

```tsx
<CrudPage
  title="Widgets"
  source={widgets}
  search={widgetsSearch}
  from="/widgets"
  fields={widgetFields}
  filters={widgetFilterFields}
  create={{ command: createWidget, host: "dialog" }}
  update={{ command: updateWidget, host: "drawer", toInput: (row) => ({ ...row }) }}
  delete={{ command: deleteWidget }}
  getRowId={(row) => row.id}
/>
```

- preset 允许调用官方 binding，但不实现业务/协议/错误映射。
- 每个 part 都是 ReactNode/函数槽；可以逐层退出。
- `CrudPage` 的 `CreateInput`/`UpdateInput`/`DeleteInput` 独立；不要 `any`。
- **新增/编辑三种 host**：
  - `host: "dialog"` / `"drawer"`：CrudPage 内置宿主；
  - `host: "page"`：CrudPage 调用 `onPageHost({ mode, row? })`，由应用导航到
    `FormPage` 路由（`/widgets/new`、`/widgets/:id/edit`）。preset 不内嵌 Router 约定。

## 7. 测试

```ts
import { renderWithKit, mockSource, mockCommand, mockStream } from "@lynxland/uikit-testing";

const source = mockSource("widgets", rows, { scope: ["projectId"] });
const kit = renderWithKit(<Page />, {
  path: "/widgets",
  search: { q: "web" },
  searchSchema: widgetsSearch,
  scope: { projectId: "p1" },
});
```

- `renderWithKit`：QueryClient + Router + ScopeProvider。
- `createTestRouter`：memory router + 真实 `parseSearch/stringifySearch`。
- `renderCollection(source, request)`：无 Router 的数据绑定测试。
- `renderSearchState(search, initial)`：URL 绑定测试。
- `mockSource` / `mockCommand` / `mockStream`：按能力 mock，不按 Resource。

## 8. 自定义 UI 设计

1. 新建 `@scope/uikit-ui-*` 或应用内 `adapter.tsx`，实现 `UiAdapter`。
2. 用 `UiAdapterProvider` 注入；页面/控件代码不变。
3. token 用 CSS 变量（shadcn 语义名 + `--status-*` + `--chart-*`）或你自己的命名；
   surfaces 的 `--ui-*` 有 fallback，不强制 Tailwind。
4. 不要 fork `ui-shadcn`；不要 import 消费方 `@/components/ui/*` 到 surfaces。

## 9. v2 → v3 映射（消费方 codemod）

| v2 | v3 |
|---|---|
| `defineResource` | `defineEntity`（或裸 source） |
| `useCollectionData` | `useCollection` |
| `useCollection`（页面） | `useCollectionPage` |
| `useBatch` | `useLookup` |
| `useSubscription` | `useStream` |
| `ListPage` / `ListPanel` | `CollectionView` / preset `CollectionPage` |
| `TablePage` / `TablePanel` | preset `CrudPage` / `CollectionPage` |
| `DetailPage` / `DetailPanel` | `RecordView` / preset `RecordPage` |
| `FormDialog` / `FormDrawer` / `FormPage` | `Dialog`/`Drawer`/`PageLayout` + `FormView` |
| `FieldDef` / `specOf` | `FieldView`/`FieldInput`/`FilterField` + 显式 `collectionSearch` |
| `Page` + `ListPage` | `PageLayout` + `CollectionView` |
| `Pagination` + `KeysetPagination` | `Pager` |

**不保留** deprecated 包装、双 API、运行时兼容层；codemod 只改消费方源码。

## 10. 反模式

- 在 `surfaces/controls` 里 `useQuery` / `useNavigate` / 读 `window.history`。
- 在 View 里渲染 `h1`/页宽/页头（壳归 Chrome/preset）。
- 在公开类型里放 `__resource` / `__scopeKeys` / `__id`。
- 用 `FieldDef<T>` 同时驱动 Row/Input/URL；v3 三拆。
- 用命令 scope 里多余的 key 生成读键；只投影 source 声明的 scope。
- 把 cursor 分页和 offset 分页混在同一个 URL schema 而不声明 `defaultPage`。
- 给 `Command.run` 写方法签名（参数 bivariant，破坏 Input 类型）。
- 为 v2 名字写 alias；v3 直接删除，codemod 改消费方。
- 把 `Resource` 当第四原语；它不存在，用 Entity 或裸能力。

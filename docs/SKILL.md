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
| **Value** | 纯展示：StatusBadge / StatusDot / Avatar / Separator / Alert / Progress / Toast / Kbd / RelativeTime / StatCard / states |
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
- `useEnumSearch({ from, key, values, defaultValue })` / `useTabParam({ from, values, defaultValue })`
  处理 tab/status/env 等单键 URL 参数，默认值不写入 URL。传 `values` 时
  `useTabParam` 会把未知 URL 值归一化为 `defaultValue`，返回类型收窄为
  `EnumSearchHandle<T>`，路由包装层不再手写 `.some(...) ? value : "general"`。

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
`Tabs` 的 variant 为 `underline | pills | filter | segmented`。`Popover` 的
`className` 只作用于内容面板（宽度/padding 逃生口），不作用于 trigger。
`Input`/`Textarea` 的 `variant` 为 `default | bare`：`bare` 去掉自身边框/
背景/焦点环，由 `InputGroup` 提供统一外框。
`Select` 的 `size` 为 `sm | md | lg`（trigger 高度），`className` 作用于
trigger，`contentClassName` 作用于选项弹层（ui-plain 的原生 select 把
`contentClassName` 落到 `<select>`，浏览器拥有弹层）。`Menu` 的 item
`kind` 为 `item | checkbox | radio | separator | label | submenu`；
`checked`/`onCheckedChange` 是受控状态，submenu 用 `items` 嵌套；旧的
`separator: true` 仍是“在此项前画分隔线”的 v3 简写，与 `kind:"separator"`
并存但不引入别名层。Menu item 可选 `testId` 落到渲染项（`data-testid`），
用于列开关等稳定测试选择器。`Dialog`/`Drawer` 的 `size` 为
`sm | md | lg | xl | fullscreen`，`className` 只作用于弹层/面板。`Card`
的 `headerDivider`/`footer`/`bodyClassName` 提供分节线、页脚和内容区逃生口。
具体 UI 库的 compound API 不泄漏到 surfaces。

- 默认：`@lynxland/uikit-ui-shadcn`（Base UI 1.9 + shadcn）。
- 参考最小实现：`@lynxland/uikit-ui-plain`（无 Tailwind/Base UI）。
- 自定义：实现 `UiAdapter`，不必 fork surfaces。

**Light/Dark**：`@lynxland/uikit-ui-shadcn/tokens.css` 提供 `:root` 亮色与 `.dark`
覆盖。`@lynxland/uikit-surfaces` 提供 `ThemeProvider` / `useTheme` / `ThemeToggle`，
统一处理 class、localStorage 与默认值；`Theme` 为 `light | dark | system`，
`resolvedTheme` 是解析后的 `light | dark`。`system` 会监听
`prefers-color-scheme`；`toggle()` 会把当前解析结果取反并显式存成 light/dark
（不是 system）。SSR/静态 HTML 可用 `themeScript()` 在首屏前注入，脚本同样
会用 `matchMedia` 解析 `system`，避免闪白。

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
- `CommandPalette`（Dialog）与 `CommandMenu`（Popover）共用 headless
  `useCommandList`：query 过滤、active index、ArrowUp/Down、Home/End、Enter、
  Escape、scroll-into-view 只实现一次。item 支持
  `id/label/group/icon/keywords/checked/disabled/shortcut/onSelect`；两者都只
  接收受控 `open/onOpenChange`，且不 import Router。
- `Kbd` 只负责快捷键显示（`keys` 或 `shortcut="mod+k"`，Mac=⌘、其它=Ctrl）；
  `useHotkey` 只负责 window 监听（`mod/ctrl/meta/alt/shift`、`enabled`，
  默认忽略 input/textarea/select/contenteditable）。
- `RelativeTime` 默认 `Intl` short（`2 min. ago`）；`format="long"` 输出
  `2 minutes ago`，`numeric="always"` 可避免 “yesterday” 之类的自动措辞。
  `format="distance"` 使用 date-fns 风格的英文近似措辞（如
  `less than a minute ago` / `1 minute ago` / `about 1 hour ago` /
  `about 3 hours ago` / `1 day ago` / `3 days ago` / `about 1 month ago` /
  `3 months ago` / `about 1 year ago` / `2 years ago`）。阈值有意固定为
  30 秒→分钟、45 分钟→小时、90 分钟→1 小时、24 小时→天、42 小时→1 天、
  30 天→月、60 天→1 月、12/18 个月→年；需要精确复数/本地化时继续用
  `format="long"`。
- `Avatar`（`src`/`alt`/`fallback`/`size`/`status`）失败时回退到首字母；
  `Separator`（`orientation`/`decorative`/`label`）是无数据、无 adapter 的纯值。
- `useSelection<ID>({ ids, selected?, defaultSelected?, onSelectedChange? })`
  提供 `selected/isSelected/toggle/selectAll/clear/allSelected/someSelected`，
  用于卡片/自定义列表；`ids` 是当前可见范围，`DataTable` 的行选择仍走自己的
  `selection` props。

**数据展示控件**：

```tsx
<ColumnPicker
  columns={[
    { id: "name", label: "Name", hideable: false },
    { id: "image", label: "Image" },
  ]}
  visibility={visibility}
  onVisibilityChange={setVisibility}
/>

<FileTree
  items={items} // { id, label, type: "file" | "directory", icon?, children? }
  expanded={expanded}
  onExpandedChange={setExpanded}
  selected={selected}
  onSelect={(id, item) => item.type === "file" && setSelected(id)}
  folderIcon={<FolderIcon />}
  fileIcon={<FileIcon />}
  aria-label="Traefik files"
/>

<DateRangePicker
  start={range.start} // YYYY-MM-DD
  end={range.end}
  onChange={({ start, end }) => setRange({ start, end })}
  presets={[{ label: "Last 7 days", start: "2026-07-01", end: "2026-07-08" }]}
/>
```

- `ColumnPicker` 与 `DataTable.columnVisibility` 同形；缺省 key 视为可见，
  `hideable:false` 的列渲染为 checked + disabled。菜单用 adapter checkbox
  item，所以勾选后菜单保持打开。
- `FileTree` 完全受控（`expanded`/`selected`）；键盘为 ArrowUp/Down、
  Home/End、ArrowRight 展开/进入首子项、ArrowLeft 收起/回父项、Enter/Space
  选择。控件输出 `role="tree"`/`treeitem`/`group` 与 `aria-level`/
  `aria-expanded`/`aria-selected`，图标可用 props 或 item `icon` 覆盖。
- `DateRangePicker` 只用 `YYYY-MM-DD` 字符串和 adapter `Input type="date"`，
  不引入日历依赖；presets 是纯数据，选择后关闭面板。

**LogViewer 富行与工具栏**：

```tsx
<LogViewer
  stream={stream}
  limit={100}
  formatLine={formatLogLine} // download / plain fallback
  renderLine={(frame, index) => <LogLine frame={frame} index={index} />}
  toolbar={<LogToolbar />} // header 与日志体之间的整行插槽
  downloadFileName="api-logs.txt"
/>
```

- `renderLine` 在视图提供的行外壳内渲染任意 React（彩色级别、时间戳），
  `data-line` 仍由视图输出；`formatLine` 继续负责下载文本。
- `toolbar` 不替换内置 follow/pause/download/clear；header 可见时四者仍工作。
  `hideHeader` 隐藏 header + toolbar，调用方自己渲染工具栏并接管 pause/follow。

**凭据、编辑器与指标图**（受控值组件/控件）：

```tsx
<InputGroup endAddon={<CopyButton value={url} label="Copy connection URL" />}>
  <ui.Input variant="bare" readOnly value={url} aria-label="Connection URL" />
</InputGroup>

<SecretInput
  label="Password"
  value={password}
  onChange={setPassword} // 永远收到真实值，不是圆点
  masked
/>

<CodeEditor
  value={env}
  onChange={setEnv}
  language="properties" // text | properties | yaml | json | shell | compose
  masked={!revealed}
  minHeight="22rem"
  aria-label="Environment variables"
/>

<MetricChart
  series={series} // series[].key 决定稳定颜色；series[].color 可覆盖
  showYAxis
  area
  unit="%"
  thresholds={[80]}
  formatValue={(value) => value.toFixed(0)}
/>
```

- `InputGroup` 的 `startAddon`/`endAddon` 放前缀、按钮；`disabled`/`invalid`
  同时写到 group 状态和最内层控件。`SecretInput` = `InputGroup` + 遮罩 +
  reveal/copy；只读遮罩显示圆点，可编辑遮罩用 `type=password` 且保留 draft。
- `CodeEditor` 是 textarea + 行号 gutter 的零依赖实现；`language` 只是元数据，
  不内置语法引擎。遮罩用 aria-hidden 圆点覆盖层（textarea 文本透明），
  因此 reveal/hide 不重置 draft；需要 CodeMirror/Monaco 时用 `render` 逃生口。
- `MetricChart` 颜色由 `series.key` 稳定推导（同图内会避让冲突），
  `showYAxis/area/tooltip/unit/thresholds/series.formatValue` 都是可选增强；
  SVG 下方始终有 sr-only 表格摘要，`chart` 仍可替换为 Recharts/donut。

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
- `SectionCard` 透传 `headerDivider`（标题下通栏分隔线）、`footer` 与
  `bodyClassName` 到 adapter `Card`；页面内重复的 raw `<section>` 卡片头应改用
  `SectionCard headerDivider`，不要再手写 `<h2>` + border 的卡片头。

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
- `FieldInput.hidden` 让 `FieldInputs` 跳过渲染，但值仍留在
  `defaultValues`/form state 并随提交发送（隐藏外键等）。
- `Input` 类型独立于 Row；Row → Input 必须显式 `toUpdateInput`。
- `ReferenceValue` / `ReferenceInput` 在 `fields/` 里用 `useLookup`；控件层不取数。

### 5.6 反馈与命令面

```tsx
import {
  Alert,
  CommandMenu,
  CommandPalette,
  Kbd,
  Progress,
  ToastProvider,
  toast,
  useHotkey,
  useToast,
} from "@lynxland/uikit-surfaces";

<ToastProvider>
  <App />
</ToastProvider>

toast.success("Server domain saved.");
toast.error("Deploy failed", { description: "The build exited with code 1." });
const t = useToast(); // same imperative API for components

<Alert tone="warning" title="Invalid config" live>
  Invalid Traefik configuration can break routing.
</Alert>

<Progress value={62} tone="warning" label="CPU usage" aria-label="CPU usage" />

<CommandPalette
  open={open}
  onOpenChange={setOpen}
  items={[
    { id: "settings", label: "Settings", group: "Home", keywords: ["preferences"], onSelect: openSettings },
  ]}
/>

<CommandMenu
  open={envOpen}
  onOpenChange={setEnvOpen}
  trigger={<Button>production</Button>}
  items={environments.map((env) => ({
    id: env.id,
    label: env.name,
    checked: env.id === currentId,
    onSelect: () => selectEnvironment(env.id),
  }))}
/>

<Kbd shortcut="mod+k" />
useHotkey({ key: "k", mod: true, handler: () => setOpen((value) => !value) });
```

- `toast.success/error/info(message, { description, icon, action, duration, id })`
  是模块级队列；`ToastProvider` 渲染 `aria-live="polite"` viewport，支持关闭、
  自动消失、hover/focus 暂停与栈上限。`PresetProvider` 默认安装它。
- `Alert` 的 `tone` 为 `info | success | warning | danger`；静态横幅默认不带
  `role`，只有新插入的紧急消息传 `live` 才用 `role="alert"`。
- `Progress` 支持 `value/max/tone/indeterminate/label/aria-label`；`label`
  是可见标签，`aria-label` 是无可见标签时的名称。
- **命名**：`CommandPalette`/`CommandMenu` 是 UI 面板；preset 的
  `CommandDialog` 是数据命令（mutation）宿主，两者不是同一概念。

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

- `SettingsSection` 支持 `items`（label/control 行）或自由 `content`；两者同时
  出现时 `content` 优先。设置页的 form grid/danger zone/invitation/provider
  行直接放进 `content`，不需要 fork `SettingsPage`。
- `FormPage.cancel` 是页头插槽（通常是 Router `Link`）；`onCancel` 是
  `FormView` 底部的取消回调，两者可以同时使用。

叠加宿主（preset 导出）：`CommandDialog` / `CommandDrawer`（打开时跑 command form，ok 自动关闭）
与 `ConfirmCommandDialog`（bare command 的确认/危险操作）。`PresetProvider` 还会安装
surfaces 的 `ToastProvider`，因此 preset 消费方默认有 `toast.*` viewport。

**命名区分**：preset `CommandDialog` 是“执行数据命令”，surfaces
`CommandPalette`/`CommandMenu` 是“搜索/跳转/选择”；不要互相替代。

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

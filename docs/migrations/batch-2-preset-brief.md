# Batch 2c preset-console brief

> 前置：surfaces core + views/chrome 完成；ui-shadcn 完成。
> 目标：`@lynxland/uikit-preset-console` 提供默认可运行页面，薄组合、可逐层退出。
> 规范：`docs/design.md` §6.4；包结构见 §7.1。

## 包结构

```
packages/preset-console/src/
  pages/
    collection-page.tsx
    record-page.tsx
    form-page.tsx
    crud-page.tsx
    settings-page.tsx
    wizard-page.tsx
    events-page.tsx
  provider.tsx          PresetProvider（UiAdapterProvider + shadcnAdapter）
  columns.ts            FieldView[] -> Column[] / filterFieldsOf 等纯函数
  index.ts              pages + provider + types
```

preset 允许调用官方 binding（`useCollectionPage`/`useRecord`/`useCommand`/
`useCommandForm`/`useStream`），但**不写 fetch/协议/错误映射**，不内嵌业务实体名。

## 通用规则

- 页面是 composition root：`PageLayout + View + binding`。
- 每个页面都提供 `className`/`slots` 逃生舱；不要求 fork 整页。
- 默认 `PresetProvider` 安装 `shadcnAdapter`；应用可换成自己的 adapter。
- `CrudPage` 之外的页面只做薄配置；不要做 v2 `TablePage` 的一锅端。
- 所有页面不渲染第二个 `h1`（PageLayout 唯一）。
- 删除 v2 `ListPage`/`TablePage`/`DetailPage`/`FormPage`/`FormPanel` 名称的旧语义；
  v3 `CollectionPage`/`RecordPage`/`FormPage`/`CrudPage` 是新组合。

## CollectionPage

```tsx
<CollectionPage
  title="Widgets"
  description="..."
  source={widgets.collection}
  search={widgetsSearch}
  from="/widgets"
  fields={viewFields}          // 或 columns={columns}
  filters={filterFields}
  scope={scope}
  query={{ staleTime: 5_000 }}
  actions={<Button>New</Button>}
  toolbar={<ExportButton />}
  tabs={moduleTabs}
  currentTab={tab}
  onTabChange={...}
  empty={{ title: "No widgets" }}
  onRowClick={(row) => navigate(...)}
  width="wide"
/>
```

- `useCollectionPage(source, { search, from, scope, query })`；`CollectionView` 接
  `list` + `pagerModel` + 受控 filter/sort 回调。
- `fields` 通过 `columns.ts` 转成 `Column[]`；`FieldView.list.sortable` → `sortField`。
- `filters` 缺省用 `search.spec.filters` 或 `filterFieldsOf(fields)`。
- 无 `columns`/`fields` 时给出清晰开发期错误。
- `tabs` 只是受控渲染；URL 接线由 `currentTab`/`onTabChange` 的调用方负责；
  demo 用 `useSearchState` 或 `useSearch/useNavigate`。

## RecordPage

```tsx
<RecordPage
  title={(row) => row.name}
  source={widgets.record}
  id={id}
  fields={viewFields}
  tabs={[{ key: "overview", label: "Overview", render: (row) => <.../> }]}
  actions={(row) => <.../>}
  backLink={<Link to="/widgets">Back</Link>}
  scope={scope}
  from="/widgets/$id"
/>
```

- `useRecord(source, id, { scope, query })`；`RecordView`。
- 默认 tab 从 URL 读（`from` + `useSearch`/`useNavigate` replace），也允许受控
  `activeTab`/`onTabChange` 覆盖。
- 默认无 h1；title 是 hero 内容。

## FormPage

```tsx
<FormPage
  title="New widget"
  command={createWidget}
  fields={createFields}
  defaultValues={{ status: "running" }}
  onSuccess={(row) => navigate({ to: "/widgets/$id", params: { id: row.id } })}
  cancel={<Link to="/widgets">Cancel</Link>}
/>
```

- `useCommandForm(command, { schema, fields, defaultValues }, { scope, entity, onSettled })`。
- `FormView` 接句柄 + fields。
- 成功后 `onSuccess(reveal)`；失败/拒绝由 FormView 显示。

## CrudPage

按 design §6.4 的类型面：

```ts
interface CrudPageProps<Row, CreateInput extends object, UpdateInput extends object = CreateInput, DeleteInput = unknown> {
  source: CollectionSource<Row>;
  search: CollectionSearch<CollectionState>;
  from: string;
  columns?: readonly Column<Row>[];
  fields: CrudFields<Row, CreateInput, UpdateInput>;
  filters?: readonly FilterField[];
  create?: { command: Command<CreateInput, Row>; host?: "dialog" | "drawer" | "page"; title?: string; defaults?: Partial<CreateInput> };
  update?: { command: Command<UpdateInput, Row>; host?: "dialog" | "drawer" | "page"; title?: string; toInput?: (row: Row) => Partial<UpdateInput> };
  onPageHost?: (request: { mode: "create" } | { mode: "edit"; row: Row }) => void;
  delete?: { command: Command<DeleteInput, unknown>; title?: string; toInput?: (row: Row) => DeleteInput };
  getRowId: (row: Row) => string;
  empty?: ReactNode;
  errors?: { describe?: (error: ApiError) => string };
  scope?: Scope;
  query?: CollectionQueryOptions;
  title?: string;
  description?: string;
  actions?: ReactNode;
  width?: "flow" | "narrow" | "wide";
}
```

- 组合 `CollectionPage` + create/edit/delete 默认动作。
- create/update 用 `useCommandForm`；delete 用 `useCommand`。
- host `dialog`/`drawer` 从 `useUiAdapter()` 取 `Dialog`/`Drawer`；表单用 `FormView`。
- 默认 delete input = `getRowId(row)`；默认 update input 必须显式 `toInput` 才安全。
- 字段集三拆：`fields.view/create/update`；`createDefaults`/`toUpdateInput`。
- 行内动作用 `Button` 变体；编辑/删除标题可配置。
- 成功后关闭 host；`useCommand` 默认失效同 Entity/source（显式传 `entity` 或 `effects`）。

## SettingsPage / WizardPage / EventsPage

- `SettingsPage`：`PageLayout` + `SectionCard × n` + `usePreference`；section 项受控。
- `WizardPage`：`PageLayout` + `Stepper` + `FormView`/等待步；步骤受控。
- `EventsPage`：backlog `useCollection` 定锚 × `useStream` 续订 × `EventFeed`；
  cursor 从 backlog 末帧/`getCursor` 派生；页面只组合，不写协议。

## provider

```tsx
export function PresetProvider({ children, adapter = shadcnAdapter }: {
  children: ReactNode;
  adapter?: UiAdapter;
}): ReactNode
```

- 安装 `UiAdapterProvider`；不安装 QueryClient/Router/Scope（应用负责）。
- 导出 `shadcnAdapter` 以便应用自定义 provider。

## 测试

- `PresetProvider` 渲染 + adapter 注入。
- `CollectionPage`：mock source + memory router + QueryClient；四态、过滤/排序写 URL、
  pager offset 第一页（`defaultPage`）、row click。
- `RecordPage`：id undefined -> idle；tab URL replace；字段渲染。
- `FormPage`：成功 reveal/onSuccess；rejected/conflict 显示。
- `CrudPage`：create dialog 打开/提交关闭/失效；edit 预填；delete 确认。
- `EventsPage`/Stream：backlog + live frame。
- 至少一个测试文件，`vitest run` 绿。

## 门禁

- `pnpm exec tsc -p packages/preset-console/tsconfig.json --noEmit`
- `pnpm --filter @lynxland/uikit-preset-console test`
- `node scripts/layer-check.mjs`
- `pnpm exec biome check packages/preset-console/src packages/preset-console/test`
- 不直接 import Base UI/Radix/Tailwind；不 import `@lynxland/uikit-react/router` 之外的 Router？
  preset 允许 Router（页面级 URL 接线），但只能通过 `@lynxland/uikit-react/router` 或
  `@tanstack/react-router`；不要在 surfaces 内写 Router。

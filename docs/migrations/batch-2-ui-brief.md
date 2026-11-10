# Batch 2 UI brief（surfaces / ui-shadcn / preset）

> 前置：Batch 1 core/react/testing 完成并有新包导出。
> 目标：把 v2 registry 的 UI 拆成 surfaces / ui-shadcn / preset-console，
> 默认 Base UI + shadcn，不保留 v2 Page/Panel/FieldDef。

## 包

```
packages/surfaces        @lynxland/uikit-surfaces
  src/values/            StatusBadge/RelativeTime/CopyButton/SecretReveal/DiffView/JsonField/StatCard/MetricChart/states
  src/controls/          DataTable/FilterBar/Pager/Tabs/Form/FieldInputs/FieldGrid/AsyncState
  src/views/             CollectionView/RecordView/FormView/LogViewer/EventFeed/StageTimeline
  src/chrome/            PageLayout/AppShell/SectionCard/ScopeSwitcher/Stepper/RouteErrorBoundary
  src/fields/            FieldView/FieldInput/FilterField/CrudFields
  src/adapter.ts         UiAdapter 类型 + UiAdapterProvider
  src/surfaces.css       语义结构类 + CSS 变量

packages/ui-shadcn      @lynxland/uikit-ui-shadcn
  src/primitives/        Base UI + shadcn 基元
  src/tokens/tokens.css  shadcn 语义变量 + --status-* + --chart-*
  src/adapter.ts         shadcnAdapter

packages/ui-plain       @lynxland/uikit-ui-plain（可选）
packages/preset-console @lynxland/uikit-preset-console
  src/pages/             CollectionPage/RecordPage/FormPage/CrudPage/SettingsPage/WizardPage/EventsPage
  src/index.ts
```

## 迁移映射

| v2 | v3 |
|---|---|
| `registry/values/*` | `surfaces/src/values/*`（field-def → fields） |
| `registry/query/data-table/filter-bar/pagination/keyset-pagination` | `surfaces/src/controls/*` |
| `registry/query/list-panel/detail-panel/field-grid/reference-select` | `surfaces/src/views|controls/*` |
| `registry/query/list-page/table-page/detail-page` | `preset-console/src/pages/*`（薄组合） |
| `registry/command/form/fields` | `surfaces/src/controls/*` |
| `registry/command/form-dialog/form-drawer/form-page/form-panel` | 删除/改编为 preset Page Template 或 Dialog 组合 |
| `registry/command/delete-button/confirm-dialog` | `surfaces/src/patterns` 或 controls |
| `registry/subscription/*` | `surfaces/src/views/*` |
| `registry/shell/*` | `surfaces/src/chrome/*` |

## 硬约束

- Controls 不拿 `CollectionHandle`，不 import Router/Query，不读 `window.history`。
- Views 不渲染 h1/页宽/页头；Chrome/preset 才拥有。
- 删除 `Page`/`ListPage`/`ListPanel`/`TablePage`/`TablePanel`/`DetailPage`/`DetailPanel`/
  `FormPage`/`FormPanel`/`FormDialog`/`FormDrawer`/`FieldDef`/`specOf`。
- `DataTable` 收 `rows/columns/sorting/onSortingChange/selection/...`。
- `FilterBar` 收 `fields/value/onChange`；无本地完整 Draft。
- `Pager` 收 `PagerModel`；不碰 `window.history`。
- `Tabs` 一个受控控件；模块/详情/过滤只是 variant/调用点。
- `CrudPage` 按 `CrudPageProps<Row, CreateInput, UpdateInput, DeleteInput>` 类型面。
- UI adapter 是受控 wrapper；Base UI compound API 不泄漏到 surfaces。
- `surfaces.css` + `tokens.css`；Tailwind 扫描要求写进 README/doctor。
- `ui-shadcn` 不 import `@radix-ui/*`；复杂基元用 Base UI。
- 不保留 v2 alias/旧块；registry 只作为生成清单。

## 验收

- `pnpm --filter @lynxland/uikit-surfaces typecheck`
- `pnpm --filter @lynxland/uikit-ui-shadcn typecheck`
- `pnpm --filter @lynxland/uikit-preset-console typecheck`
- demo 至少一个列表/详情/表单页走 preset + ui-shadcn。
- 换 `ui-plain`/自定义 adapter 不改页面代码。
- a11y：Dialog/Drawer/Select/Tabs 键盘/Esc/焦点用例。

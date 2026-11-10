# Batch 2b surfaces brief（views / chrome）

> 前置：Batch 2a 的 `adapter.ts`、`values/`、`controls/`、`fields/` 已完成。
> 目标：补 `packages/surfaces/src/views/**` 与 `chrome/**`，并把 `index.ts` 补全。
> 规范：`docs/design.md` §6.2 / §6.3；完整包结构见 `docs/migrations/batch-2-ui-brief.md`。

## 视图（views/）

视图把绑定句柄翻译成控件 props；可 import `@lynxland/uikit-react` 的句柄类型，
**禁止 import Router/URL**，不渲染 `h1`/页头/页宽。

### CollectionView

```tsx
<CollectionView
  list={list}                  // CollectionHandle<T>
  columns={columns}
  filters={filterFields}
  toolbar={<Button>Export</Button>}
  selection={selection}
  empty={{ title, description, action }}
  tabs={<Tabs .../>}           // 可选槽
  pager={<Pager .../>}         // 可选覆盖；缺省从 list.page.paging 派生
/>
```

- 组合 `AsyncState + FilterBar + DataTable + Pager`；四态由 `list.status`。
- 过滤/排序写回通过 `onFiltersChange` / `onSortChange` / `onTextChange` 回调，
  或接收一个受控 `state` + `onStateChange`；**不要**假设 `CollectionHandle` 有 setter
  （v3 的 `useCollection` 没有 setter）。页面用 `useCollectionPage` 的 setter 接线。
- 分页从 `list.page?.paging.kind` 派生；允许 `pager` 槽覆盖。
- 不渲染页头/h1/宽度/衬垫。

### RecordView

```tsx
<RecordView
  record={record}              // RecordHandle<T>
  title={(row) => row.name}
  meta={(row) => <StatusBadge .../>}
  actions={(row) => <DeleteButton .../>}
  fields={viewFields}          // 无 tabs 时 FieldGrid
  tabs={[{ key, label, render: (row) => <.../> }]}
  activeTab={tab}
  onTabChange={setTab}
  describeError ...
/>
```

- `tabs[].render(row)` 懒渲染；不要提前创建 `content: ReactNode`。
- hero 可用 `h2`/`div`；**不渲染 h1**（页头归 Chrome）。
- loading/error/empty 用 values 的 states；empty 可选。

### FormView

```tsx
<FormView
  form={form}                  // useCommandForm 的句柄
  fields={inputFields}
  submitLabel="Save"
  cancel={close}
  resultAction={<ReloadButton />}
/>
```

- 消费 `CommandFormHandle`；不创建表单、不弹窗。
- rejected/conflict/fieldErrors 显示在表单级/字段级。
- `FormDialog`/`FormDrawer` 不在 surfaces；它们是 preset Page Template。

### Stream views

- `LogViewer`、`EventFeed`、`StageTimeline` 消费 `StreamHandle`/`StreamEngine`。
- 帧订阅在视图内用 `subscribeFrames/getFrames`；跟随/暂停/下载/清空是视图交互。
- 不 import Router；不写业务实体名。

## 壳（chrome/）

**规则：唯一 h1 所有者。** 视图不画壳；Chrome 可以。

### PageLayout

```tsx
<PageLayout
  title="Widgets"
  description="..."
  breadcrumb={<...>}
  backLink={<a ...>Back</a>}   // 不要 `backTo` + Router
  icon={BoxIcon}
  actions={<Button>New</Button>}
  tabs={moduleTabs}
  currentTab={tab}
  onTabChange={setTab}
  lead={<FiringBanner />}
  width="flow" | "narrow" | "wide"
>
  {children}
</PageLayout>
```

- 只有它渲染 `h1`；不取数；tabs 受控。
- `breadcrumb`/`backLink` 是 ReactNode，由应用接 Router；Chrome 不 import Router。
- 宽度三档；无页头时不渲染 header。

### AppShell

```tsx
<AppShell
  sidebarHeader={<TeamSwitcher />}     // 完整插槽：品牌/团队切换器
  sidebarFooter={<UserMenu />}         // 完整插槽：用户菜单/主题
  nav={navSections}
  renderLink={(item) => <a href={item.to}>{item.label}</a>} // 可选；缺省 <a>
  activePath={pathname}                // 最长前缀 active
  header={<GlobalActions />}           // 主内容区顶部
  collapsible                          // 内置收起按钮
  collapsed={collapsed}                // 可选受控
  onCollapsedChange={setCollapsed}
>
  {children}
</AppShell>
```

- 只管导航/高度链/主区；不取业务数据；**不 import Router**。
- `nav` 是数据 prop；`renderLink`/`activePath`（或 `isActive`）让应用接 Router/Link。
- `sidebarHeader`/`sidebarFooter`/`header` 是完整 ReactNode 插槽；`collapsible`
  提供内置收起，受控状态走 `collapsed`/`onCollapsedChange`。
- 高度链自持 `100dvh`。

### 其他

- `Breadcrumb`：`items` + `separator`；最后一项 `aria-current="page"`，Router 链接用 `render` 传入。
- `SectionCard`：标题/描述/actions/children，纯展示。
- `ScopeSwitcher`：受控 `items/value/onChange`，不读全局 scope。
- `Stepper`：受控 `steps/current/onChange`，支持 vertical/horizontal。
- `RouteErrorBoundary`：React error boundary，接 `error`/`reset`/`onRetry`，不 import Router。

## CSS / 测试

- 复用 `surfaces.css` 的 `ui-*` 语义类；新增 view/chrome 结构类，不写 Tailwind。
- 测试用 `test/test-adapter.tsx`；覆盖 CollectionView 四态/过滤回调/分页槽、
  RecordView tabs 懒渲染、FormView 错误、PageLayout 唯一 h1、AppShell 导航、
  Stepper/ScopeSwitcher 受控。
- 只 import `@lynxland/uikit-react` 的类型/数据 hook（views 允许）；chrome 不取数。

## 门禁

- `pnpm --filter @lynxland/uikit-surfaces typecheck`
- `pnpm --filter @lynxland/uikit-surfaces test`
- `node scripts/layer-check.mjs`
- 不 import Router/effect/具体 UI 库/Tailwind；公开类型无 `any`。

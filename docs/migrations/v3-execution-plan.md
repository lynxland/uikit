# v3 Cutover 执行计划（无向后兼容）

> 立场：[`docs/philosophy.md`](../philosophy.md)  
> 规范：[`docs/design.md`](../design.md)  
> 证据：[概念审计](../audits/2026-11-07-conceptual-audit.md)  
> 决策：[ADR 0001](../adr/0001-two-axis-architecture.md)
>
> **原则：直接替换、同批删除、不做双 API、不做运行时兼容层。**
> uikit 仍在 dogfooding；v2 是可删除原型。回滚单位是 git branch，不是运行时 fallback。

## Batch 0：文档与决策（已完成）

- [x] 归档 draft-2 → `docs/design-history.md`
- [x] 新增 `docs/philosophy.md`
- [x] 新增 v3 规范 `docs/design.md`
- [x] 新增概念审计 `docs/audits/2026-11-07-conceptual-audit.md`
- [x] 新增 ADR 0001
- [x] 更新 AGENTS / README / README_ZH / llms / SKILL 的版本边界
- [x] 新增 `scripts/doc-check.mjs` 并挂入 `pnpm check`
- [x] 运行时代码零改动；`pnpm check` 全绿
- [x] 明确：Batch 1 起不写兼容层

## Batch 1：core greenfield（已完成，2026-11-08）

> 实际交付与最初清单的偏差：`kernel/resource.ts` 改为 `kernel/source.ts` +
> `kernel/entity.ts`；`FilterFieldDef` 保留为 `collectionSearch` 的过滤字段声明
> （旧 `FieldDef`/`specOf` 已删除）；`toRequest(state)` 的文本字段白名单来自
> `collectionSearch` spec，不再额外传 fields；`collectionSearch` 新增
> `defaultPage` 解决 offset 第一页与 cursor 的歧义。

- [x] `packages/core`（`@lynxland/uikit-core`）：kernel/schema/adapters，无 React、无 Effect。
- [x] `packages/react`（`@lynxland/uikit-react`）：bindings + `/router`。
- [x] `packages/testing`（`@lynxland/uikit-testing`）：harness + capability mocks。
- [x] 根包改名 `@lynxland/uikit-workspace`；root scripts、`layer-check` 路径更新。
- [x] 删除旧 `packages/core/src/react`、`src/testing` 与 core 的 React 出口。
- [x] 删除 v2 `Resource` / `ResourceSpec` / `AttachedCommands` / `CommandDescriptor`
      的 `__resource`/`__scopeKeys`/`__id` / `legacyKeys` / `scopeOf`。
- [x] `Command.run` 写成函数属性（防 bivariant），只留 `run`/`treatAs`/`effects`。
- [x] 查询键只依赖 source 公开 `name`/`scope`；scope 只投影声明的键。
- [x] `ApiError` 是 `Error` 子类；`isApiError`/`isRetryable` 保留。
- [x] `collectionSearch(spec)`：Standard Schema + `schema`/`serializer`/`encode`/`decode`/
      `toRequest`/`patch`/`reset`；repeated-key URL；前导 `?`；未知键 passthrough；
      单元素数组归一；`defaultPage`。
- [x] `combineSearch` 检测重复键；`filterLeaves`/`filterValues`/`predicateOf`/`eqFilter`。
- [x] rest/client/mock 统一输出 `CollectionPage`；`statusToApiError` 返回 `ApiError`。
- [x] 删除 `createHttp` 公开面；`createSubscriptionEngine` 为纯 TS 状态机。
- [x] `useCollection`/`useRecord`/`useLookup` 数据绑定；零 Router、零 setter。
- [x] `useCommand`/`useCommandForm`：scope 解析、`treatAs`、`Effect[]` 应用、`ready`。
- [x] `useStream`：`StreamSource | StreamFactory`，cursor 三态，`useSyncExternalStore`。
- [x] `useInvalidateOnFrame`：帧到达应用 `Effect[]`，trailing throttle，卸载取消。
- [x] `@lynxland/uikit-react/router`：`useSearchState` / `useCollectionPage` / `PagerModel`。
- [x] 删除 `useCollectionData` / `useBatch` / `useSubscription` 旧名。
- [x] testing：`renderWithKit` / `createTestRouter` / `renderCollection` /
      `renderSearchState` / `mockSource` / `mockCommand` / `mockStream`。
- [x] 旧契约测试删除；新增 scope 投影、serializer、effects、stream、ApiError 测试。
- [x] 版本升 `3.0.0`；不写 deprecated 注释/别名。
- [x] `pnpm check` 全绿（core 44 / react 31 / testing 7 tests；spike 10）。
- [x] 冻结的 v2 `apps/demo` 暂从根 `typecheck`/`build` 排除，单列 `typecheck:demo`；
      Batch 2/3 重写 demo 后恢复。

## Batch 2：UI greenfield（分包 + 直接删除旧目录；2026-11-08 基本完成）

- [x] 删除 v2 目录语义：`registry/{values,query,command,subscription,shell}`（已删除）。
- [x] 新建 `packages/surfaces`（`@lynxland/uikit-surfaces`）：
      `values/`、`controls/`、`views/`、`chrome/`、`fields/` + `UiAdapter` contract/provider。
- [x] 新建 `packages/ui-shadcn`（`@lynxland/uikit-ui-shadcn`）：
      Base UI + shadcn 基元 + tokens + `shadcnAdapter`；controls/views 不 import 消费方 `@/components/ui/*`。
      **不提供 Radix 兼容层**；复杂基元直接用 Base UI。
- [x] 新建 `packages/ui-plain`（可选最小 UI adapter，24 tests）。
- [x] 新建 `packages/preset-console`：默认 `PageLayout/AppShell/CollectionView/RecordView/FormView`
      + `CollectionPage/RecordPage/FormPage/CrudPage` + 默认 `FieldView/FieldInput/CrudFields`。
- [x] 新建 `packages/meta`（`@lynxland/uikit`）一键转发 preset。
- [x] `uikit init` / `uikit eject surfaces|preset-console`（`@lynxland/uikit-cli`）。
- [x] 删除 devtool tokenMap/profile；`uikit doctor` 校验运行时依赖/UI adapter/CSS 接线。
- [x] `registry/` 删除；copy-owned 由 CLI `eject` 直接拷包源码。
- [x] `DataTable`：`rows/columns/getRowId/sorting/onSortingChange/selection/...`。
- [x] `FilterBar`：`fields/value/onChange`；删除本地完整 Draft 镜像。
- [x] `Pagination` + `KeysetPagination` → `Pager`（`paging.kind`）；删除 `window.history`。
- [x] `Tabs`：一个受控控件覆盖模块/详情/过滤三种皮。
- [x] `AsyncState`：四态切换。
- [x] `Form`：提交壳；`FormView`：消费 `useCommandForm` 句柄。
- [x] `FieldView<Row>` / `FieldInput<Input>` / `FilterField`；`CrudFields` 可选。
- [x] `CollectionView` / `RecordView` / `FormView`：零页头、零 h1。
- [x] `PageLayout`：preset 默认 Chrome；唯一 h1 所有者；应用可替换为自己的壳。
- [ ] **删除** `Page`/`ListPage`/`ListPanel`/`TablePage`/`TablePanel`/`DetailPage`/
      `DetailPanel`/`FormPage`/`FormPanel`/`FormDialog`/`FormDrawer`/`FieldDef`。
- [x] token 切标准语义名（shadcn + `--status-*`/`--chart-*`）；devtool token profiles 删除。
- [x] `registry.json` 随 v2 目录删除；不再维护第二份清单。
- [x] `layer-check` 增 controls/views/chrome 规则。

> 已交付：surfaces（values/controls/views/chrome/fields + adapter，72 tests）、
> ui-shadcn（Base UI 1.9 + tokens，24 tests）、preset-console（7 pages，30 tests）、
> meta（只转发 preset + 少量 core 类型）。`layer-check` 已覆盖 surfaces/ui-shadcn/
> preset/meta；controls 仍零数据/零 Router。
>
> Batch 2 已收口；Batch 4 的 CLI/changesets/release/publint 也已完成。
> 剩余：净房安装冒烟、fleetly/torchwood 外部仓同批迁移。

## Batch 3：demo + 两个 console 同批迁移（demo 已完成；外部仓待迁移）

- [x] **demo** 全量重写：默认 `@lynxland/uikit-preset-console` + `packages/ui-shadcn`；
      `apps/demo` 已用 v3 页面/绑定/adapter，25 个 Playwright 用例通过。
- [x] demo 对照面：collections 手装 `CollectionView`、records URL tabs、CRUD、scope、events/logs。
- [ ] **fleetly**（外部仓）：默认 `@lynxland/uikit-preset-console`；`PageFrame`/`ModulePage` 可作为应用 Chrome
      替换 `PageLayout`；内容换 `CollectionView`/`RecordView`/`FormView`；
      `useCollectionPage` 替换旧 `useCollection`。
- [ ] **torchwood**（外部仓）：默认 `@lynxland/uikit-preset-console`；`PageCard`/`PageHeader` 可作为应用 Chrome；
      keyset 列表换 `CollectionView`+`Pager`；表单换 `FormView`+`useCommandForm`。
- [ ] 两个消费方与 uikit 同一批 PR/分支；不发布中间兼容版本。
- [ ] 两个消费方同批删除 `@radix-ui/*`，改用 `@lynxland/uikit-ui-shadcn`（Base UI）；
      重新生成 shadcn 组件；不做 Radix/Base UI 双实现。
- [ ] Base UI 迁移检查：
      - inventory 两仓 `@radix-ui/*` 与 `radix-ui` 导入；
      - `asChild`/`Slot` → Base UI `render`；
      - Dialog/Drawer/Select/Tabs/Popover/Tooltip 的焦点/Esc/键盘行为回归；
      - 功能测试 + e2e a11y 用例；
      - app-owned 的 Avatar/DropdownMenu/ScrollArea/Switch/Label/Separator 等
        要么同批迁移，要么明确留作应用私有（不混入 `ui-shadcn`）。
- [ ] 验收：
      - 页面 LOC 下降或持平；
      - `init` 后列表页 < 30 行；列表→详情→编辑→删除主路径无手写数据接线；
      - 换 UI adapter 不改页面代码；
      - 无 `any` 进入表单 Input；
      - 后退/前进/深链行为不回归；
      - 控件零 `useQuery`/`useNavigate`/`window.history`；
      - `useCollection` 不再 import Router。

## Batch 4：收口

- [x] 删除所有旧导出、旧 registry 项、旧文档段落。
- [x] `SKILL.md` 重写为 v3 API；v2 版本归档/删除。
- [x] `README`/`llms` 以 v3 为唯一入口。
- [x] `pnpm check` + `doc-check` 全绿。
- [x] 根包改名 `@lynxland/uikit-workspace`（private），`packages/meta` 发布 `@lynxland/uikit`。
- [x] 补齐开源发布件：`LICENSE`、`CONTRIBUTING.md`、`SECURITY.md`、
      `CODE_OF_CONDUCT.md`、CI workflow。
- [x] issue/PR 模板、release workflow。
- [x] changesets fixed group（core/react/surfaces/preset/meta）+ 独立版本 UI adapter/testing/cli。
- [x] 每包 `exports`/`files`/`peerDependencies` 审计 + `publint`（`pnpm audit:packages`）。
- [x] `attw`：源码分发（exports 指向 `.ts`）不适用，当前以 `publint` + 严格 tsc 代替；
      待引入 dist 构建后再跑 attw。
- [ ] 净房安装冒烟（pack + 临时消费方 install/typecheck）。
- [x] 浏览器/React/Node/TanStack/Base UI 版本支持矩阵成文（`docs/versions.md`）。

## 一次性 codemod（不是兼容层）

| 旧 | 新 |
|---|---|
| `defineResource` | `defineEntity`（或裸 source） |
| `useCollectionData` | `useCollection` |
| `useCollection`（页面） | `useCollectionPage` |
| `useBatch` | `useLookup` |
| `useSubscription` | `useStream` |
| `ListPage`/`ListPanel` | `CollectionView` |
| `Page` + `ListPage` | `PageLayout` + `CollectionView` |
| `TablePage`/`TablePanel` | `CrudPage` template（人工） |
| `DetailPage`/`DetailPanel` | `RecordView`/`RecordPage` |
| `FormDialog`/`FormDrawer`/`FormPage` | `Dialog`/`Drawer`/`PageLayout` + `FormView` |
| `FieldDef`/`specOf` | `FieldView`/`FieldInput`/`FilterField` + 显式 `collectionSearch`（人工） |

只自动改机械面；Row/Input 拆分、CRUD 页面模板、字段语义必须人工判断。
codemod 跑完即删除旧名，不生成 deprecated 包装。

## 已接受推荐裁决

1. URL serializer：repeated key。
2. Effect：core 零 Effect；订阅引擎纯 TS。
3. `Command`：保留，不改名 `Action`。
4. 默认 preset：npm + eject（同一 preset 不混用）。
5. 第三方 preset/UI adapter contract：跟 core semver；包版本可独立。
6. Pagination：判别联合。
7. meta 包 export：只 preset。
8. Base UI 迁移：uikit-rendered first；app-owned Radix 同批或私有。
9. `PageLayout`：preset Chrome（可被应用替换）。
10. `templates/`：默认 docs/scaffold；preset 页面才是默认可运行组合。

## 完成定义

- [x] `init` 后一个只读列表页 ≤ 30 行（`packages/cli/templates/console/src/uikit-starter.tsx`）。
- [x] 列表→详情→编辑→删除主路径无手写数据接线（demo CRUD e2e）。
- [x] 换 UI adapter 不改页面代码；ui-shadcn/ui-plain 同契约，demo 用 preset。
- [x] 静态数组可渲染 DataTable；纯命令/纯流页面不需要 Entity。
- [x] 表单 Input 类型独立于 Row，无 `any`。
- [x] URL 后退/前进后 FilterBar/Pager/Tabs 全部从 state 重建（demo e2e）。
- [x] `layer-check` 拦住控件取数/控件碰 Router/视图碰 Chrome/控件 import 消费方 ui 基元。
- [x] preset stable 项有 demo 真实消费者；registry 已删除，copy-owned 由 CLI eject。
- [x] `docs/SKILL.md` 与 `docs/design.md` 无矛盾；doc-check 通过。
- [x] 仓库中不存在 v2 旧导出、旧别名、旧 Page/Panel/FieldDef（registry/devtool 已删除）。

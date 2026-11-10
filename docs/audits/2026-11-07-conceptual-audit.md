# @lynxland/uikit 概念与抽象层级审计（2026-11-07）

> 审计对象：仓库当前工作区（core 0.6.0 + registry 40 个块 + demo + 两份真实消费方
> `fleetly/console`、`torchwood/console`）。
>
> 审计目标不是“再找几个 API 瑕疵”，而是回答一个问题：
> **为什么功能已经很多，uikit 仍然不像一个可用的抽象？**
>
> 结论先行：**不是功能不够，而是层级轴用错了。**
> 旧设计把“数据能力”当成“UI 家族”，把“页面模板”当成“基础组件”，把“一份字段声明”
> 当成“三个不同模型”，最后再用一批补丁去弥合这些错位。补丁越多，概念越乱。

---

## 0. 结论摘要

| # | 结论 | 直接后果 |
|---|---|---|
| 1 | UI 五族按 Query/Command/Subscription/Resource/Shell 分族，而不是按“呈现面”分层 | `table-panel` 反向依赖 `form-dialog`/`delete-button`；`detail-page` 住在 query 族；`field-def` 住在 values 族却依赖 Resource 与 URL schema。族不是层，依赖图不可能干净 |
| 2 | `Page`/`*Page`/`*Panel` 把“页面配方”做成了运行时组件 | 4 个 Page + 4 个 Panel + 5 个 Form 变体；`Page ∘ Panel` 组合糖互相套；实际消费方全部绕开，自己写 `PageFrame`/`PageCard` |
| 3 | `Resource` 被当成“第四个原语”，实际是一个可选分组 + 五个隐藏协议 | 5 个泛型参数、`__resource`/`__scopeKeys`/`__id` 泄漏到公开类型；纯命令/纯流资源要靠“例外”解释 |
| 4 | URL 绑定焊死在读原语上 | `useCollection` 同时做取数、解码 URL、写历史、提供 setter；为了绕开它又造了 `useCollectionData`，再为了图表又教用户直接 `useQuery(collectionQueryOptions(...))`——同一件事三条读法 |
| 5 | `FieldDef` 同时承担 Row、Command Input、URL schema、列表/表单/详情三视角 | `CommandForm<T>` 收 `FieldDef<T>` 但命令 Input 是 `any`；`defaultValues` 返回 `Record<string, unknown>`；“全链路类型安全”在表单边界破功 |
| 6 | UI 控件绑死 `CollectionHandle`，而不是受控 props | `DataTable` 不能渲染静态数组；`FilterBar` 自己维护一份 URL 草稿；`KeysetPagination` 直接调 `window.history.back()` |
| 7 | “单源”只存在于 demo，未进入生产 | `specOf`/`FieldDef`/`TablePage`/`TablePanel`/`FormDialog`/`FieldGrid` 在两个真实 console 中 **0 引用**；40 个块生产只用 12 个 |
| 8 | 设计文档把规范、裁决、迁移日志混写在一个 1294 行文件里 | `SKILL.md` 与设计正文互相矛盾；README 还写 0.3.x；llms.txt 说只有 Query 线完成。Agent 无法判断哪句是当前事实 |

一句话：
**旧 uikit 的抽象不是“层次太少”，而是“层次没有被命名，也没有被依赖方向约束”。**

---

## 1. 审计方法与证据边界

- 通读 `packages/core/src/{kernel,schema,adapters,react,testing}`、`registry/**`、`apps/demo`。
- 对两份真实消费方做全仓引用统计：
  - `fleetly/console/src`
  - `torchwood/console/src`
- 统计口径：按组件/hook 名字 grep 文件数；对“新抽象”另按 import 路径复核（避免注释误计）。
- 代码可运行：`pnpm check` 当前全绿（layer-check / typecheck / size-check / 148 单测 / devtool 15 测试）。
  **类型检查和测试通过，不能证明抽象层次正确**——这是本次审计最重要的方法论前提。

---

## 2. 八个根因

### R1. 用“数据能力”给 UI 分族（轴错位）

旧设计 §6.1 说分族轴是“消费哪个绑定的输出，与数据层类型学同构”：

| 族 | 声称消费 |
|---|---|
| values | 纯值 |
| query | `useCollection`/`useRecord`/`useBatch` |
| command | `useCommand`/`useCommandForm` |
| subscription | `useSubscription` |
| shell | 无 |

但真实依赖是：

- `registry/query/table-panel.tsx:10-18` 导入 `DeleteButton`、`FormDialog`、`FormDrawer`（command 族）。
- `registry/query/table-page.tsx:4-6` 导入 `Page`（shell 族）与 `TablePanel`。
- `registry/command/form-page.tsx:4-5` 反向导入 `Page`（shell 族）。
- `registry/query/detail-page.tsx:1-5` 导入 `Page`。
- `registry/values/field-def.ts:1-2` 导入 `Resource` 与 `FilterFieldDef/QuerySchemaSpec`（数据层 + URL 层）。
- `registry/query/reference-select.tsx:1-4` 直接导入 `collectionQueryOptions` 和 `useQuery`，绕开绑定。

**族名是数据能力，组件却按呈现面组合。** 所以族与族之间必然互相 import，
`layer-check` 也只能对 registry 整体放行，无法表达“谁可以依赖谁”。

### R2. 页面配方被做成了运行时组件（层级僭越）

旧设计自己写过：

> “页面模式只存在于文档与 demo，不存在于框架类型系统。”（`docs/design-history.md:572`）

但 registry 实际交付：

- `Page`（`shell/page.tsx`）
- `ListPage` / `ListPanel`
- `TablePage` / `TablePanel`
- `DetailPage` / `DetailPanel`
- `FormPage` / `FormPanel` / `FormDialog` / `FormDrawer` / `Form`
- `FieldGrid`

其中 `ListPage = Page ∘ ListPanel`、`TablePage = Page ∘ TablePanel`、
`DetailPage = Page ∘ DetailPanel`、`FormPage = Page ∘ FormPanel`。
这些“组合糖”每个只做一层透传，却新增一个公开名字、一套 props、一个注册项。
删除它们，复杂度不会消失到调用方——因为真正的工作在 Panel 里；
它们是典型的**浅模块**（接口几乎和实现一样大）。

更严重的是，“页面模式不存在于类型系统”这句话在 `TablePageProps`、
`DetailPageProps`、`FormPageProps` 出现的那一刻就已经不成立。

### R3. `Resource` 是 god object，不是第四原语

`packages/core/src/kernel/resource.ts` 的 `ResourceSpec` 同时承担：

| 职责 | 字段 |
|---|---|
| 身份 | `name` |
| 行主键 | `getId` |
| 作用域声明 | `scope` |
| 缓存失效桥 | `legacyKeys` |
| 读能力 | `collection` / `record` / `batch` |
| 写能力 | `commands` |
| 流能力 | `subscriptions` |

`CommandDescriptor` 又叠加：

| 职责 | 字段 |
|---|---|
| 领域执行 | `run` |
| scope 派生 | `scopeOf` |
| 跨资源失效 | `invalidates` |
| 存量键桥 | `legacyKeys` |
| 协议状态仲裁 | `treatAs` |
| 资源归属（内部） | `__resource` |
| scope 采纳（内部） | `__scopeKeys` |
| ID 类型锚（内部） | `__id` |

结果：

- `Resource<T, ID, C, S, ScopeKeys>` 需要 **5 个泛型参数**；消费方为了取一个 query key，
  被迫写 `Parameters<typeof collectionQueryOptions>[0]` 这种类型体操（SKILL 自己也承认，
  见 `docs/SKILL.md:272-280`）。
- 纯命令资源、纯流资源、裸 Transport 都要用“三原语各自可选”的例外句来解释，
  说明 `Resource` 并不是三原语的公共上位概念，只是一个便利分组。
- `__resource`/`__scopeKeys` 由 `defineResource` 注入，再被 `useCommand`/`useSubscription`
  读取——这是**隐藏协议**，不是公开契约。

### R4. URL 绑定焊死在读原语上（同一条缝被焊了两次）

`packages/core/src/react/bindings.ts:2` 直接 import `useNavigate/useSearch`；
`useCollection` 同时做：

1. 解码 URL；
2. 跑 Query；
3. 计算 `status: loading/empty/error/success`；
4. 提供 `setPredicate/setOrder/setWindow/next/prev/reset/searchPatch`；
5. 维护 keepPreviousData。

为了绕开 URL，又造了 `useCollectionData`（`bindings.ts:163`）；
为了图表/自定义查询，SKILL 又教用户直接
`useQuery(collectionQueryOptions(...))`（`docs/SKILL.md:165-171`）。

于是同一个“读集合”有三条路径：

| 路径 | 适用 | 问题 |
|---|---|---|
| `useCollection` | 列表页 | 绑死 Router，不能用在不带路由的场景 |
| `useCollectionData` | 伴读/统计 | 名字像“底层”，实际是另一条公开路径 |
| `useQuery(collectionQueryOptions)` | 图表/自定义 | 用户要自己解包 `.data?.rows`、自己算四态 |

M1 retro 已经发现“URL 绑定是可选层，不是读原语的属性”
（`docs/2026-10-27-fleetly-adoption-retro.md:38-48`），但落地方案是**再加一个 hook**，
而不是把 seam 切开。这是“补丁层”而非“机制层”的典型。

### R5. `FieldDef` 把三个不同模型焊成一份声明

`registry/values/field-def.ts` 的 `FieldDef<T>` 同时是：

- 列表列配置（`list.sortable/filter/cell/...`）；
- 表单输入配置（`form.required/input/...`）；
- 详情展示配置（`detail.section/render/...`）；
- URL schema 的来源（`specOf(fields)` 派生 `QuerySchemaSpec`）；
- 引用解析配置（`kind: "reference"` 内嵌 `Resource`）。

但 `T` 是**行类型**，不是**表单输入类型**。于是：

- `CommandForm<T, Payload>` 收 `CommandDescriptor<any, Payload, any>` 和
  `FieldDef<T>[]`（`registry/command/form.tsx:85-93`），注释直接承认
  “Input 与字段子集的一致性做尽力执法不做运行时校验”。
- `defaultValues(fields)` 返回 `Record<string, unknown>`（`field-def.ts:163`）。
- `useCommandForm` 的 Input 是 `any`（`registry/command/form.tsx:137`）。
- `create` 场景的输入通常不包含 `id/createdAt`，但字段基座按行类型线程化。

更细的裂缝：

- `specOf` 只派生 `fuzzy`/`exact`/`enum`，**不派生 `datetime` 过滤**
  （`field-def.ts:136-149`）；但 `FilterBar` 又直接按 `FieldDef.list.filter` 渲染
  datetime 控件。于是 URL schema 与过滤 UI 的真实字段集不一致。
- 同一份过滤语义存在至少五套表示：
  1. `FieldDef.list.filter`（UI 形态）
  2. `QuerySchemaSpec.filters`（URL schema 声明）
  3. `Predicate`（查询语言）
  4. `filterLeaves/filterValues`（读回投影）
  5. `FilterBar` 内部 `Draft`（本地表单态）
- `reference` kind 内嵌 `Resource`，让 values 族（本应纯值）依赖数据层。

“一份声明驱动三视角”在 demo 里看起来很漂亮；在生产里，它只能适用于
“行类型 = 输入类型 = 展示类型”的理想实体。两个 console 的真实实体大多不是这样。

### R6. UI 控件绑死 `CollectionHandle`，而不是受控 props

| 控件 | 现状 | 后果 |
|---|---|---|
| `DataTable` | `list: CollectionHandle<T>`，内部调 `list.setOrder` | 不能渲染静态数组；不能接非 kit 数据源 |
| `FilterBar` | `list` + `fields`，内部 `useState` 草稿 | URL 后退/前进时文本草稿不同步（初始值只算一次，`filter-bar.tsx:76-93`） |
| `Pagination` | `list` | 不能复用 offset 分页器 |
| `KeysetPagination` | `list` + `window.history.back()` | 组件直接碰浏览器历史；SSR/测试/非路由环境不可用 |
| `ReferenceSelect` | 直接 `useQuery(collectionQueryOptions(...))` | 绕开 scope/未就绪停用；选中值不在搜索结果时不显示当前 label |

控件是“受控渲染”层，却拿着“数据绑定句柄”并反向调用它。这使控件无法测试、
无法复用、无法在非路由页面使用，也让 URL 语义从数据层漏到表现层。

### R7. “URL 即真相”没有被 URL 感知组件遵守

- `FilterBar` 的 `Draft` 只在挂载时从 `list.query.predicate` 初始化一次；
  `back/forward`、外部 `setPredicate`、模块 tab 切换后都不会同步。
- `KeysetPagination` 的 Prev 在 `advance()` 返回 null 时直接 `window.history.back()`，
  把“历史栈 = 分页栈”这个页面策略塞进组件。
- `Pagination` 的页大小变更 `setWindow({size})` 不清 offset/page，页语义随 size 变化。
- `useCollection` 读取整个 location 的 search（`strict:false`），再靠 schema 自己的
  namespace/透传规则过滤；这是 M1 “URL 键串页”问题的根，最后用 `useCollectionData`
  绕开，而不是把“本页 schema 解码”作为唯一边界。

### R8. 设计过程缺少“真实消费者采纳”门

旧设计 §6.2 说“demo 是永久第二消费者；真实第二消费者出现才升格”
（`docs/design-history.md:566`）。但 H/I 两批的新抽象，实际是 **demo 第一消费者**：

| 抽象 | demo 引用 | fleetly | torchwood |
|---|---:|---:|---:|
| `TablePage` | 3 文件 | 0 | 0 |
| `TablePanel` | 3 文件 | 0 | 0 |
| `FieldDef` | 5 文件 | 0 | 0 |
| `FormDialog` | 2 文件 | 0 | 0 |
| `FormDrawer` | 0 | 0 | 0 |
| `FormPage` | 2 文件 | 0 | 0 |
| `DetailPage` | 2 文件 | 0 | 0 |
| `FieldGrid` | 3 文件 | 0 | 0 |
| `Page`（kit 的） | 有 | 0 | 0 |

而真实生产使用集中在旧一代：

| 块（按 `@/components/kit/...` import 路径统计） | fleetly 文件数 | torchwood 文件数 |
|---|---:|---:|
| `query/list-page` | 15 | 16 |
| `query/data-table` | 14 | 16 |
| `query/keyset-pagination` | 1 | 16 |
| `query/pagination` | 14 | 0 |
| `query/filter-bar` | 14 | 0 |
| `command/form` | 5 | 2 |
| `command/fields` | 5 | 1 |
| `values/metric-chart` | 3 | 1 |
| `values/stat-card` | 0 | 2 |
| `subscription/event-feed` | 1 | 1 |
| `subscription/log-viewer` | 1 | 0 |
| `shell/app-shell` | 1 | 0 |

> 统计为引用文件数（同文件多次引用只计一次）；新抽象按 import 路径复核为 0。
> hook 引用面（不是块）：`useCollection` 70/37 文件、`useCollectionData` 31/15、
> `useRecord` 32/17、`useCommand` 38/45、`useCommandForm` 8/4、`useSubscription` 6/4；
> `useBatch` 在两仓均为 0 文件（外键解析更多直接走 `useQuery(collectionQueryOptions)`）。

这不是“消费方保守”，而是**抽象没有解决他们的真实页面形状**：
两个 console 都已经各自长出了 `PageFrame`/`PageHeader`/`PageCard` 与
`ListCard`/`ResourceListPage`。这些才是生产验证过的 `PageLayout` 与
`CollectionView` 原型。uikit 没有把它们收上来，反而另起了一套 `Page ∘ Panel`
组合糖。

---

## 3. 逐项证据（按严重度）

### F1. 层与族混为一谈（P0）

- `docs/design-history.md:533-541`：五族表。
- `registry/query/table-panel.tsx:10-18`：query 族 import command 族。
- `registry/command/form-page.tsx:4-5`：command 族 import shell 族。
- `registry/values/field-def.ts:1-2`：values 族 import 数据层与 URL 层。
- `scripts/layer-check.mjs:48-65`：registry 只做“允许前缀”白名单，
  没有“controls 不得 import views/patterns”“controls 不得 import bindings”这类层级规则。

**判定**：族是分发/目录标签，不是依赖层。当前设计把目录标签当成了架构。

### F2. Page/Panel 组合爆炸（P0）

- `registry/shell/page.tsx`：`Page` 有 title/description/actions/tabs/lead/width/className。
- `registry/query/list-page.tsx` + `list-panel.tsx`：Page ∘ ListPanel。
- `registry/query/table-page.tsx` + `table-panel.tsx`：Page ∘ TablePanel。
- `registry/query/detail-page.tsx` + `detail-panel.tsx`：Page ∘ DetailPanel。
- `registry/command/form-page.tsx` + `form-panel.tsx` + `form.tsx` + `form-dialog.tsx` + `form-drawer.tsx`：
  5 个 Form 形态。
- 两个 Page 同时渲染 `h1`：`shell/page.tsx:58` 与 `query/detail-panel.tsx:88`；
  `DetailPage` 通过不传 title 规避，但 API 允许双 h1。

**判定**：页面模板不是组件；它们是配方。把它们做成运行时组件，必然出现
“Page 套 Panel 是标准形态”与“Page 与 CRUD 页块互斥”这种自相矛盾的规则。

### F3. `Resource` 的隐藏协议（P0）

- `kernel/resource.ts:30`：`__id?: ID`。
- `kernel/resource.ts:46`：`__resource?: ResourceName`。
- `kernel/resource.ts:52`：`__scopeKeys?: ReadonlyArray<string>`。
- `kernel/resource.ts:66-74`：`AttachedCommands` 再注入一遍。
- `react/command.ts:93-100`：`useCommand` 从 `descriptor.__scopeKeys` / `descriptor.scopeOf`
  推断 context 是否采纳，再执行失效。
- `react/subscription.ts:72-76`：用“有没有 policy 字段”做 descriptor/transport 运行时判别。

**判定**：公开类型里出现 `__` 字段，说明契约没有想清楚；用“policy 是否存在”做判别，
说明两个概念没有被分开建模。

### F4. 三条读路径（P0）

- `react/bindings.ts:2`：`useCollection` import Router。
- `react/bindings.ts:163`：`useCollectionData` 作为绕行路径。
- `docs/SKILL.md:165-171`：图表直接 `useQuery(collectionQueryOptions(...))`。
- `registry/query/reference-select.tsx:39-46`：ReferenceSelect 又走一条。

**判定**：`useCollection` 不是“collection 的绑定”，而是“collection + URL + 分页 + setter”
的页面级组合。数据读取原语没有被单独命名。

### F5. `FieldDef` 类型不诚实（P0）

- `values/field-def.ts:87-98`：`name: keyof T & string`。
- `command/form.tsx:85-93`：`CommandDescriptor<any, Payload, any>` + `FieldDef<T>[]`。
- `command/form.tsx:124-133`：`initial` 是 `Record<string, unknown>`。
- `command/form.tsx:137`：`useCommandForm<any, Payload, any, ...>`。
- `values/field-def.ts:136-149`：`specOf` 不含 datetime。
- `values/field-def.ts:104-110`：`ReferenceFieldDef` 内嵌 `Resource`。

**判定**：这是本仓库最大的类型安全缺口，也是“字段基座”在真实消费方零采纳的根因。
真实业务里 Row 与 Create/Update Input 很少同形。

### F6. 控件反向依赖绑定（P0）

- `query/data-table.tsx:59-68`：`list: CollectionHandle<T>`，`getRowId` 之外还拿 `list.query`/`setOrder`。
- `query/filter-bar.tsx:38-44`：`list` + `fields`。
- `query/pagination.tsx:10-13`：`list`。
- `query/keyset-pagination.tsx:39-44`：`list`，并在 86 行调用 `window.history.back()`。
- `query/reference-select.tsx:14-21`：`Resource` + 直接 `useQuery`。

**判定**：控件无法作为受控组件使用；所有页面都被迫采用 kit 的 handle 形状。
这与“拷贝制、消费方拥有代码”的分发哲学冲突——拷贝后仍然只能按 kit 的
数据形状使用。

### F7. URL 草稿与 URL 真相分叉（P1）

- `registry/query/filter-bar.tsx:76-93`：`useState(() => ...)` 只初始化一次。
- `filter-bar.tsx:96-115`：`apply` 先 `setDraft` 再 `list.setPredicate`。
- `filter-bar.tsx:139`：`onBlur={() => apply(draft)}`。
- `keyset-pagination.tsx:86`：`window.history.back()`。

**判定**：URL 后退/前进、外部 setter、模块 tab 切换都不会同步文本草稿；
“URL 即真相”只在数据层成立，在控件层不成立。

### F8. 40 个块，生产只用 12 个（P0）

- `registry/registry.json`：40 个 item；`values/query/command/subscription/shell` 五族。
- 生产引用统计见 §R8。
- `TablePage`/`TablePanel`/`FieldDef`/`FormDialog`/`FormDrawer`/`FormPage`/`DetailPage`/`FieldGrid`
  在两份真实 console 中全部 0 引用；其中 `FormDrawer` 连 demo 都不用。

**判定**：registry 的“产品面”远大于“验证面”。这不是文档问题，是路线问题：
新抽象没有经过真实页面形状的验收就被固化。

### F9. Effect 是实现细节，却被当成架构层（P1）

- `rg 'from "effect' packages/core/src`：只命中 `adapters/http.ts` 与
  `adapters/subscription.ts` 两个文件。
- `schema` 目录零 Effect import；`codec.ts` 是手写解析器。
- `docs/design-history.md:493-497` 与 `AGENTS.md` 仍称 “Effect Schema 单源”。
- `packages/core/package.json:57-59`：`effect` 是硬 dependency。
- retro M9 决定 `ApiError` 类化（`docs/2026-10-27-fleetly-adoption-retro.md:110-115`），
  当前代码仍是 plain object（`kernel/types.ts:60-66`）。

**判定**：Effect 没有“赚回”它作为架构层的概念成本。它可以是订阅引擎内部实现，
也可以是可选适配器，但不应该成为全库叙事与硬依赖。

### F10. 文档不是单一事实源（P0）

| 文档 | 声明 | 与现状冲突 |
|---|---|---|
| `docs/design-history.md:3` | 版本 draft-2，日期 2026-10-23 | 文件已含 2026-11-07 的 I 批裁决 |
| `docs/SKILL.md:54-55` | Page 是唯一壳，`*Page` 是 Page∘Panel 组合糖 | 同文件 155-157 说 Page 与 CRUD 页块互斥、双壳是反模式 |
| `docs/SKILL.md:156-157` | Page 套 ListPage 是反模式 | 两个真实 console 每天都在 `PageFrame` 里套 kit `ListPage` |
| `README.md:176` | Pre-1.0 (`0.3.x`) | `packages/core/package.json` 是 0.6.0 |
| `docs/llms.txt:23-25` | 只有 Query 线完成，Command/Subscription 待落地 | 代码/设计已完成到 0.6.0 全量 |
| `AGENTS.md:3` | 设计依据 draft-2 | 当前工作区已是 0.6.0 + H/I 批 |

**判定**：Agent-first 的库，文档漂移就是产品缺陷。当前文档会让 Agent
同时学到互相矛盾的规则（“Page 套 CRUD 页块是反模式” vs “Page 套 Panel 是标准形态”）。

### F11. 公开面过大且泄漏内部（P1）

- `packages/core/src` 公开导出约 **164** 个名字（`rg '^export (type|interface|function|const|class)'`）。
- “名词预算 = 4”是一句营销话术，实际公开类型包括
  `CollectionQuery/Predicate/Order/QueryWindow/Segment/Cursor/CommandDescriptor/CommandResult/ApiError/Transport/FrameSource/SubscriptionDescriptor/SubscriptionPolicy/SubscriptionStatus/SubscriptionHandle/Resource/ResourceSpec/ResourceScope/ResourceName/QuerySelector/FieldKey/Operator/...`
- `Resource` 5 个泛型参数；`CommandDescriptor` 3 个；`AttachmentCommands` 再包一层。
- `SubscriptionHandle` 在 `kernel/types.ts:303` 与 `adapters/subscription.ts:45` 重复定义。

**判定**：名词预算应该按“层级”分配，而不是按“总数”压缩。把不同层级的概念
硬压成 4 个名字，反而制造了 god object 和隐藏协议。

### F12. Scope 有至少五套机制（P1）

- `ResourceSpec.scope` 声明键。
- `scoped(resource, values)` 注入值。
- `ResourceScopeProvider` context 注入。
- `useCollection/useRecord/useBatch` 的 `options.scope`。
- `useCommand` 的 `options.scope` / `descriptor.scopeOf` / `__scopeKeys` 采纳链。
- `useSubscription` 的 `options.scope` / `__scopeKeys`。
- `scopeReady` 自动停用。

**判定**：同一个“当前项目”概念有声明、注入、采纳、守卫、失效匹配五套路径。
fleetly 的 half-scope 陷阱（`docs/design-history.md:1163`）不是使用错误，是机制过多。

### F13. `Subscription` 命名与 descriptor 双形态（P1）

- `react/subscription.ts:68-76`：`Transport | SubscriptionDescriptor`，运行时按 `policy` 判别。
- `kernel/types.ts:303` 与 `adapters/subscription.ts:45`：两个 `SubscriptionHandle`。
- `react/subscription.ts:43`：未启动状态用 `"reconnecting"`，语义误导（应为 `idle`）。
- SKILL 自己把 refine 的 `useSubscription` 列为“最危险的同名不同义”
  （`docs/SKILL.md:305`），却保留了这个名字。

**判定**：订阅不是 pub/sub；它是“带游标的帧流”。名字应该体现 Stream/Feed，
而不是继续和 refine 撞名。

### F14. “tab” 有三个不同概念，三套实现（P1）

- `shell/page.tsx:65-89`：Page tabs（push）。
- `query/table-panel.tsx:85-152`：FilterTabs（push，谓词写入）。
- `query/detail-panel.tsx:96-120`：Detail tabs（replace）。
- 三套手写 markup/键盘/aria；没有共享的受控 `Tabs` 控件。

**判定**：tab 是呈现控件；“模块 tab / 过滤 tab / 详情 tab”是使用场景，
不是三个类型。应在控件层统一，写入律由调用点决定。

### F15. 分页是两个组件 + 一个历史栈技巧（P1）

- `query/pagination.tsx`：offset/total。
- `query/keyset-pagination.tsx`：cursor/nextCursor。
- `kernel/algebra.ts:119-144`：`advance` 对 keyset prev 返回 null。
- `keyset-pagination.tsx:86`：用 `window.history.back()` 补足。

**判定**：分页策略没有被建模；`QueryWindow` 同时允许 cursor 和 range，
真实能力却是二选一。应该用判别联合或显式 `PagingStrategy`。

---

## 4. 旧设计中的自我矛盾清单

| # | 矛盾 | 位置 |
|---|---|---|
| 1 | “页面模式只存在于文档与 demo，不存在于框架类型系统” vs 交付 `TablePage`/`DetailPage`/`FormPage` 类型 | `design-history.md:572` vs `626` |
| 2 | “Page 是唯一供壳者，双壳结构上不可能” vs `ListPage` 在无 header 时直渲染 Panel，实际可被 PageFrame 再套 | `design-history.md:633-635` vs `registry/query/list-page.tsx:40-54` |
| 3 | “Page 与 CRUD 页块互斥不嵌套” vs “Page 套 Panel 是标准形态” | `SKILL.md:156-157` vs `design-history.md:635` |
| 4 | “Effect Schema 单源” vs schema 目录零 Effect import、手写 codec | `design-history.md:493-497` vs `schema/codec.ts` |
| 5 | “名词预算 4” vs 164 个公开导出、5 泛型 `Resource` | `design-history.md:87` vs `packages/core/src` |
| 6 | “demo 是永久第二消费者” vs H/I 抽象只有 demo 一个消费者 | `design-history.md:566` vs §R8 统计 |
| 7 | “失败/结果两分，ApiError 封闭集” vs M9 决定类化但代码仍是 plain object | `design-history.md:220-245` vs `kernel/types.ts:60-66` |
| 8 | “TanStack 原生，不在引擎上再包一层” vs `CollectionHandle` 重造 status/setter/分页 | `design-history.md:17` vs `react/bindings.ts:37-60` |

这些矛盾不是笔误，而是**同一个文件同时承担“规范”和“历史日志”**的必然结果。
每次批次追加都让上一条规范失效，但旧句子没有退场。

---

## 5. 生产采纳对照：抽象与真实页面形状

### 5.1 fleetly 已经长出的真实层

| fleetly 本地件 | 实际职责 | 对应目标层 |
|---|---|---|
| `components/domain/page-frame.tsx` | 页面壳：宽度/衬垫/页头/面包屑 | Chrome / `PageLayout` |
| `components/domain/module-page.tsx` | PageFrame + PageTabs + lead | Chrome + Pattern |
| `components/domain/page-header.tsx` | 标题/描述/图标/返回/动作 | Chrome |
| `components/domain/list-page.tsx` | `ListCard = 壳内列表模块`；`ListPage = PageFrame + ListCard` | View + Pattern |
| `components/domain/data-table.tsx` | 受控 rows/columns/loading/error/sorting/pagination | Control |
| `components/kit/query/filter-bar.tsx` | schema.spec 驱动的过滤条 | Control |
| `components/kit/query/list-page.tsx` | 被本地改造为“壳内模块配方”，删除页头/容器 | View |

### 5.2 torchwood 已经长出的真实层

| torchwood 本地件 | 实际职责 | 对应目标层 |
|---|---|---|
| `components/PageHeader.tsx` | 标题/描述/图标/返回/动作 | Chrome |
| `components/PageCard.tsx` | 卡片式页面壳 | Chrome |
| `components/list/ResourceListPage.tsx` | 工具栏 + 选择 + 四态 + 分页 + 表格 | View |
| `components/list/DataTable.tsx` | 受控表格（选择/排序/行动作） | Control |
| `components/list/ListToolbar.tsx` | 搜索/过滤/动作/选择条/分页 | Control |
| `components/resource/shared.tsx` | `FormPageWrapper` / `DetailPageWrapper` / `DetailGrid` | Pattern + Control |
| `components/kit/query/list-page.tsx` | 上游 ListPage 的本地适配（去页头） | View |

### 5.3 结论

真实抽象已经存在，只是没有被 uikit 命名：

- **Chrome**：PageFrame / PageHeader / PageCard / ModulePage
- **View**：ListCard / ResourceListPage / KitListPage
- **Control**：DataTable / ListToolbar / FilterBar / Pagination
- **Pattern**：ListPage = Chrome + View；FormPageWrapper = Chrome + Form

uikit 应该把这些层收上来并命名，而不是继续发明 `Page ∘ Panel` 组合糖。

---

## 6. 重新设计必须回答的 8 个问题

1. **数据能力与呈现面是否是两条轴？**
   是。Query/Command/Stream 是能力；Value/Collection/Record/Form/Stream/Chrome/Pattern 是呈现面。
   不应让 UI 五族镜像数据原语。
2. **`Resource` 是否原语？**
   不是。它是可选的 Entity 分组，用于 query key、scope、失效目标；裸 source/action/stream 必须可用。
3. **URL 是不是读原语的属性？**
   不是。数据绑定（无 Router）与 URL 绑定（Router 子路径）必须分开；
   `useCollection` 应回到“数据读取”，`useCollectionPage` 才是页面级糖。
4. **页面模板是不是组件？**
   不是。`Page`/`*Page` 不应是核心 registry 的稳定组件；它们应是
   `PageLayout + View` 的配方/脚手架（可 fork，不承诺 API）。
5. **字段声明能否同时驱动 Row/Input/URL/三视角？**
   只能在显式类型参数下作为可选便利层；核心模型必须拆成
   `FieldView<Row>` / `FieldInput<Input>` / `FilterField`。
6. **控件是否应该拿绑定句柄？**
   不应该。控件是受控 props；View 才拿句柄并把句柄翻译成控件 props。
7. **Effect 是否是架构层？**
   不是。它是两个适配器文件的实现细节；应降为可选或移除。
8. **如何防止再次过度生产？**
   抽象进入 core/registry 前必须有真实消费者证据；demo 只是冒烟，不是第二消费者。
   registry 项应有 `stable/pilot/recipe` 状态。

---

## 7. 建议的验收标准（给下一版设计）

- `pnpm layer-check` 能机械表达并执法：
  - controls 不 import bindings/views/patterns/chrome；
  - controls 无 `useQuery`/`useNavigate`/`window.history`；
  - views 不 import chrome；chrome 不 import data；
  - patterns 才能同时 import 多层。
- 一个只读列表页可在 30 行内写成：
  `PageLayout + CollectionView + useCollection`（或配方生成）。
- 一个静态数组可以不经 Resource 直接渲染 `DataTable`。
- 一个表单的 Input 类型可以与 Row 类型不同，且不需要 `any`。
- 一个 URL 后退/前进后，`FilterBar`、分页、tab 全部从 URL 重建，不保留旧草稿。
- 一个纯命令页面不需要构造 Resource。
- 一个纯流页面不需要构造 Resource。
- registry 中每个 `stable` 项至少有一个真实 console 页面引用；
  `pilot` 项明确标记；`recipe` 项不导出为稳定组件。
- 文档检查通过：README 版本 = package.json；SKILL 不再出现与 design 相反的规则；
  `design.md` 只含规范，历史在 `design-history.md`/`docs/adr`。

---

## 8. 附：本次统计口径

- 生产引用统计命令示例：
  ```bash
  for p in TablePage TablePanel FieldDef FormDialog FormDrawer FormPage DetailPage FieldGrid; do
    printf '%-12s fleetly=%s torchwood=%s\n' "$p" \
      "$(rg -l "\b$p\b" /path/fleetly/console/src | wc -l)" \
      "$(rg -l "\b$p\b" /path/torchwood/console/src | wc -l)"
  done
  ```
- `registry.json` 当前 40 项：values 11 / query 12 / command 8 / subscription 3 / shell 6。
- core 公开导出约 164 个名字；`pnpm check` 当前全绿（148 单测 + 15 devtool 测试）。
- 审计日期：2026-11-07。旧设计全文已归档为 `docs/design-history.md`。

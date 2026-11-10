# @lynxland/uikit 设计 v3

- **版本**：v3.0（greenfield 概念重写）
- **日期**：2026-11-07
- **状态**：**v3 已落地（3.0.0，2026-11-08）**。Batch 1–3 已把 core/react/testing、
  surfaces/ui-shadcn/ui-plain/preset/meta 与 demo 切到本文规范；v2 代码删除，
  **不保留向后兼容层、不保留旧 API 别名、不做双 API 过渡**。
  Batch 4 已收口：CLI `init/eject/doctor`、changesets、release/CI、issue/PR 模板、
  `publint` 审计、版本矩阵；剩余净房安装冒烟与外部仓（fleetly/torchwood）迁移。
- **设计立场**：[`docs/philosophy.md`](./philosophy.md)
- **取代**：draft-2 已归档为 [`docs/design-history.md`](./design-history.md)。
  **代码/注释中所有 `design.md §N`（尤其 §2/§3/§5/§6/§12/§13/§14）都是 draft-2 旧编号，
  指 `design-history.md`；本文件的 § 编号是 v3 新编号。**
- **证据**：[`docs/audits/2026-11-07-conceptual-audit.md`](./audits/2026-11-07-conceptual-audit.md)。
- **一句话**：
  **数据面三能力（Query / Command / Stream）→ 绑定 → 受控控件 → 视图 → 页面组合（Page Composition）；
  壳由 preset/应用提供，内容归 kit。**

> **TL;DR**：旧 uikit 不是功能少，而是把“数据能力”当成了“UI 家族”，把“页面模板”
> 做成了“运行时组件”，把“可选分组” `Resource` 当成了“第四原语”，把“URL 策略”
> 焊进了“读原语”。v3 用两条轴（能力/呈现）+ 七层依赖把这些问题结构消除；
> **开箱即用归 preset，自定义归每层退出，UI 适配归 UI adapter，页面模板归 docs/scaffold。**

## 阅读路径

| 你是 | 先读 | 再读 |
|---|---|---|
| 第一次了解 | [`philosophy.md`](./philosophy.md) → §0 结论 → §1 两条轴 | §2 七层 / §3 术语表 |
| 页面作者 | §6 呈现面 → §5.2 URL 绑定 | §9 反模式 |
| 适配器作者 | §4 数据面 | §5 绑定面 |
| 维护者/评审 | §2 依赖规则 → §7 质量门 | §8 迁移 → 审计文档 |
| 只想看“删什么” | §8 Batch 4 收口 | 附录 A 映射表 |

## 目录

- [0. 先读：这次重写解决什么](#0-先读这次重写解决什么)
- [1. 两条轴](#1-两条轴)
- [2. 七层模型](#2-七层模型)
- [3. 术语表](#3-术语表层级定义禁止)
- [4. 数据面（L2–L3）](#4-数据面l2l3)
- [5. 绑定面（L4）](#5-绑定面l4)
- [6. 呈现面（L5–L7）](#6-呈现面l5l7)
- [7. 分发、文档与质量门](#7-分发文档与质量门)
- [8. Cutover 路线（无向后兼容）](#8-cutover-路线无向后兼容)
- [9. 反模式与幻觉诱饵](#9-反模式与幻觉诱饵)
- [10. 裁决与开放问题](#10-裁决与开放问题)
- [附录 A：当前 → 目标映射](#附录-a当前--目标映射)
- [附录 B：一句话记忆](#附录-b一句话记忆)

---

## 0. 先读：这次重写解决什么

旧设计不是“缺功能”，而是四个层级错位：

1. **UI 按数据原语分族**（values/query/command/subscription/shell），
   导致 query 族 import command 族、values 族 import 数据层。
2. **页面模板被做成组件**（`ListPage`/`TablePage`/`DetailPage`/`FormPage`
   及对应 Panel），导致 Page/Panel 组合爆炸与双壳。
3. **`Resource` 被当成第四原语**，实际是可选分组；隐藏的
   `__resource`/`__scopeKeys`/`__id` 与 5 个泛型参数是 god object 的症状。
4. **字段声明同时承担 Row/Input/URL/三视角**，导致表单边界 `any` 化。

v3 不增加新的“元概念层”。它做三件事：

- **命名层级**：把数据能力、绑定、控件、视图、壳、页面模板分开。
- **约束依赖**：层与层之间只允许单向依赖，机械可查。
- **收缩公开面**：能用页面模板/脚手架解决的，不做成稳定组件。

**本文不追求“只有 4 个名词”。** 旧设计的“名词预算 = 4”把不同层级的概念
硬压成同一层，反而制造了 god object。v3 的规则是：
**每个名字只属于一个层级；层级内的名字可以多，跨层不许混。**

### 0.1 现状与目标的对照（先看这张表，避免把目标 API 当成现状）

| 能力/层 | 当前 0.6（v2） | v3 目标 |
|---|---|---|
| 读绑定 | `useCollection`（绑 URL）+ `useCollectionData`（无 URL） | `useCollection`（无 URL）+ `useCollectionPage`（URL 糖） |
| 单记录/外键 | `useRecord` / `useBatch` | `useRecord` / `useLookup` |
| 写绑定 | `useCommand` / `useCommandForm` | 同左；effects/scope 出 descriptor |
| 流绑定 | `useSubscription` | `useStream` |
| 分组 | `Resource`（5 泛型 + `__` 内部字段） | `Entity`（2 泛型，无隐藏字段） |
| 页面壳 | `Page` / `PageFrame`（消费方） | `PageLayout`（可选 Chrome）/ 应用壳 |
| 列表内容 | `ListPage` + `ListPanel` | `CollectionView` |
| 详情内容 | `DetailPage` + `DetailPanel` | `RecordView` |
| 表单内容 | `Form` / `CommandForm` / `FormPanel` | `Form` + `FormView` |
| 字段 | `FieldDef<T>` 三视角 | `FieldView<Row>` + `FieldInput<Input>` + `FilterField` |
| 控件 | `DataTable list` / `FilterBar list` / `Pagination`+`KeysetPagination` | 受控 props / `Pager` |
| 页面模板 | `*Page` 组合糖（运行时组件） | preset 薄页面（可运行）+ Page Template（可 fork） |
| UI 适配 | token profile 正则重写 + 消费方 ui 基元 | UI adapter contract + token contract + `classNames` 槽 |
| 分发 | core npm + 40 块 registry | core npm + preset/UI adapter + registry 块 |
| Effect | 硬依赖（2 文件使用） | 可选适配器/移除（待裁决） |

### 0.2 五个稳定层 + Page Template（不是五个包名）

| 层 | 内容 | 稳定性 | 谁拥有 |
|---|---|---|---|
| **Core** | kernel / schema / adapters（无 React） | semver（1.0 后） | uikit 维护 |
| **React** | bindings + `/router`（数据/命令/流/URL） | semver（1.0 后） | uikit 维护 |
| **Surfaces** | values / controls / views / chrome / fields + `UiAdapter` contract | semver（1.0 后） | uikit 维护 |
| **Preset** | 默认 PageLayout/AppShell/CollectionView/RecordView/FormView/默认字段/CRUD/动作 | 可独立演进；copy-owned 或独立包 | uikit 维护默认 preset，第三方可 fork |
| **UI Adapter** | Button/Input/Select/Dialog/Drawer/Tabs/Card 等视觉基元 + token | 小 contract，可独立演进 | uikit 维护默认 UI adapter，第三方可实现 |
| **Page Template** | 页面模板/脚手架/`templates/` | 不承诺 API | docs/scaffold/消费方 |

**开箱即用 = preset；可定制 = 每层可退出；适配不同 UI = UI adapter；开源 = core 稳定 + preset/UI adapter 可替换。**

- 只用 core：headless，自己组合 UI。
- 用 core + react + surfaces：自己写页面/壳/页面模板。
- 用 preset：默认页面/壳/字段/动作直接可用。
- 换 UI adapter：保留 preset/surfaces，只换视觉基元与 token。
- fork preset/Page Template：copy-owned，消费方拥有代码。

---

## 1. 两条轴

### 1.1 能力轴（数据面）

Console 对后端做的事，穷尽为三种**能力**：

| 能力 | 语义 | 例子 |
|---|---|---|
| **Query** | 参数化、可缓存的读 | 列表、详情、外键解析、时序点 |
| **Command** | 有副作用、可结构化拒绝的写 | create / update / delete / cordon / rotate / cancel |
| **Stream** | 按游标定位的帧递送 | 日志、事件、部署阶段、变更流 |

三种能力是**正交的**，可以独立使用：

- 只读页面不需要 Command；
- 纯命令页面（登录/登出）不需要 Query；
- 纯流页面（日志）不需要 Entity；
- 一个实体可以只实现其中一两种能力。

### 1.2 呈现轴（UI 面）

UI 不按能力分族。UI 按**呈现什么**分层：

| 层 | 回答的问题 | 例子 |
|---|---|---|
| **Value** | 一个值怎么显示？ | StatusBadge、RelativeTime、FieldValue、DiffView |
| **Collection** | 一组行怎么显示？ | DataTable、FilterBar、Pager、CollectionView |
| **Record** | 一条记录怎么显示？ | RecordView、FieldGrid |
| **Form** | 一次写怎么输入？ | Form、FieldInputs、FormView |
| **Stream** | 一帧流怎么显示？ | LogViewer、EventFeed、StageTimeline |
| **Chrome** | 页面骨架是什么？ | PageLayout、AppShell、SectionCard |
| **Page Composition** | 一整页怎么组合？ | CollectionPage、CrudPage、SettingsPage |

**两条轴不许互相镜像。** 旧设计的错误就是把 UI 五族做成
Query/Command/Subscription/Resource/Shell 的镜像。

### 1.3 Preset 与 UI Adapter 是分发/适配轴

Preset 和 UI Adapter 不是新的数据/呈现层，而是**分发与适配轴**：

- **Preset** 把 L4–L7 的默认组合打包成“开箱即用”的页面套件；
- **UI Adapter** 把 L5 Controls 依赖的视觉基元与 token 打包成“可替换皮肤”。

```
Core（能力/绑定/适配器）
  └─ Preset（默认 controls/views/chrome/pages + 默认字段/CRUD）
       └─ UI Adapter（默认 primitives/tokens；可替换）
```

- 一个 preset 可以选择一个 UI adapter；也可以 preset 内置 UI adapter。
- 第三方可以只实现 UI adapter，不 fork preset；也可以 fork preset，不换 UI adapter。
- core 不依赖 preset，也不依赖 UI adapter；preset 依赖 core + UI adapter contract。

---

## 2. 七层模型

```
┌────────────────────────────────────────────────────────────┐
│ L7  App / Page Composition     页面模板、脚手架、可 fork 的整页组合  │  消费方或 uikit init/docs
├────────────────────────────────────────────────────────────┤
│ L6  Chrome              PageLayout / AppShell / SectionCard │  可选；不取数
├────────────────────────────────────────────────────────────┤
│ L5  Views               CollectionView / RecordView / ...    │  消费绑定句柄
│      └─ Controls        DataTable / FilterBar / Form / ...   │  受控 props；不取数
│      └─ Values          StatusBadge / RelativeTime / ...     │  纯值；零数据知识
├────────────────────────────────────────────────────────────┤
│ L4  Bindings            useCollection / useCommand / ...      │  React + TanStack
│      └─ URL bindings    useCollectionPage / useSearchState    │  可选；react-router 子路径
├────────────────────────────────────────────────────────────┤
│ L3  Adapters            rest / clientCollection / mock / ...  │  零 React
├────────────────────────────────────────────────────────────┤
│ L2  Contracts           Source / Command / Stream / Outcome   │  kernel；零依赖
└────────────────────────────────────────────────────────────┘

分发/适配轴（不参与依赖层级）：
  Preset  = 默认 L4–L7 组合 + 默认字段/CRUD/动作（开箱即用）
  UI Adapter    = L5 依赖的视觉基元 + token（适配不同 UI 设计）
  Page Template  = 页面模板/脚手架（不承诺 API）
```

### 2.1 依赖规则

| 层 | 允许依赖 | 禁止 |
|---|---|---|
| L2 Contracts | 无（零运行时依赖） | React、TanStack、Effect、DOM |
| L3 Adapters | L2 | React、Router、UI |
| L4 Bindings | L2、L3、React、TanStack Query/Form | UI、Router（URL 绑定除外） |
| L4 URL bindings | L4、React Router | UI |
| L5 Values | L2（仅类型） | 一切取数、Router、UI 基元以外的数据层 |
| L5 Controls | L5 Values、L2 类型 | 取数、Router、URL、绑定句柄 |
| L5 Views | L5 Controls/Values、L4 类型 | Router、URL、Chrome |
| L6 Chrome | L5 Values/Controls（可选） | 取数、URL、绑定 |
| L7 Page Composition | 任意下层 | 被下层反向 import |

**机械执法**（替换当前 `layer-check` 的 registry 白名单）：

1. `packages/surfaces/src/controls/**` 禁 import `@lynxland/uikit-react`、
   `@tanstack/react-router`、`@tanstack/react-query`、`useQuery`、`useNavigate`、
   `window.history`、绑定句柄。
2. `packages/surfaces/src/values/**` 禁 import 任何 data/form/stream 目录。
3. `packages/surfaces/src/views/**` 禁 import `packages/surfaces/src/chrome/**`。
4. `packages/surfaces/src/chrome/**` 禁 import views/controls 的取数面。
5. 只有 `packages/preset-console/src/pages/**` 与 `docs/page-templates/**` 可以同时 import 多层。
6. `packages/react/src/**` 禁 import Router；URL 绑定住在 `packages/react/src/router/**`。
7. `packages/surfaces/**` 禁 import 任何具体 UI 库（只依赖 `UiAdapter` contract）；
   `packages/ui-shadcn/**` 才能 import `@base-ui/react`。

### 2.2 为什么是七层而不是五族

五族是**分发目录**，不是依赖层。一个组件属于哪一族，取决于它“消费哪个绑定”；
但一个 `CollectionView` 可能同时需要 `DataTable`、`FilterBar`、`Pager`、`AsyncState`，
这些控件属于不同的呈现面；一个 `CrudPage` 页面组合又需要 Collection + Form + Chrome。
按数据能力分族，必然跨族 import；按呈现层分，依赖图才是 DAG。

**规则：族名只用于 registry 分发与 import 路径，不用于解释架构。**
架构解释一律用 L2–L7。

---

## 3. 术语表（层级、定义、禁止）

| 术语 | 层 | 定义 | 不要混淆 |
|---|---|---|---|
| **Query** | L2 能力 | 参数化、可缓存的读 | 不是 URL 状态；不是 UI 家族 |
| **Command** | L2 能力 | 有副作用、可结构化拒绝的写 | 不是键盘命令面板 |
| **Stream** | L2 能力 | 按游标定位的帧流 | 不是 pub/sub；不是 React state |
| **Source** | L2 契约 | 一个读能力的实现（Collection/Record/Lookup） | 不是 Resource |
| **Entity** | L2 分组（可选） | 命名的一组能力 + key/scope | **不是第四原语**；不是路由注册 |
| **Resource** | 已删除 | v2 的旧名；v3 中不存在（用 Entity 或裸能力） | 不是 react-admin `<Resource>`；不是第四原语 |
| **CollectionState** | L2/L4 | URL 可序列化的查询状态（q/filters/sort/page/size） | 不是 `CollectionRequest` |
| **CollectionRequest** | L2 | 后端中立的查询请求（where/order/window） | 不是 URL 状态 |
| **CollectionPage** | L2 | 结果（rows + paging） | 不是 UI 的 Page |
| **Outcome** | L2 | 命令结果分支（ok/rejected/conflict） | 不是失败通道 |
| **ApiError** | L2 | 失败通道封闭集 | 不是 Outcome |
| **Binding** | L4 | 把契约接到 React/TanStack 的 hook | 不是 UI |
| **Surfaces** | L5（包） | 与 UI 库无关的 values/controls/views/chrome/fields 集合 | 不是 UI adapter；不是 preset |
| **UI Adapter** | 适配轴 | 视觉基元 + token 的 contract/实现（Base UI + shadcn 默认） | 不是 Theme；不是完整组件库 |
| **Control** | L5 | 受控呈现组件；不取数、不碰 Router | 不是 View |
| **View** | L5 | 消费绑定句柄、组合控件的呈现层 | 不是 Page |
| **Chrome** | L6 | 页面壳（h1/宽度/衬垫/页头） | 不是内容块 |
| **Page Composition** | L7 | 页面组合（preset 页面 + Page Template）；可 fork；不承诺 API | 不是稳定组件 |
| **FieldView** | L5 | 行字段的列表/详情呈现声明 | 不是 FieldInput |
| **FieldInput** | L5 | 表单输入声明（Input 类型独立） | 不是 FieldView |
| **FilterField** | L5 | 过滤控件声明 | 不是 Predicate |
| **Page** | L6/L7 | 页面壳或页面组合 | **不是核心内容组件** |
| **Block / 块** | 分发 | registry 的一个拷贝单元 | 不是层级 |

**命名政策**：

- 契约 = 是什么（`CollectionSource`、`StreamSource`）。
- 绑定 = use + 能力（`useCollection`、`useCommand`、`useStream`）。
- 控件 = 呈现什么（`DataTable`、`FilterBar`、`Pager`、`Tabs`）。
- 视图 = 绑定句柄的呈现（`CollectionView`、`RecordView`、`FormView`）。
- 壳 = Layout/Shell（`PageLayout`、`AppShell`）。
- 页面模板 = 特殊页面组合（Page Template），只存在于 `templates/` 或文档；
  preset 页面（`CollectionPage`/`CrudPage`）是默认可运行组合，不在 core。
- UI 适配 = `UI Adapter`（不是 `Skin`/`Theme`）；实现包用 `ui-*` 前缀。
- 包 = `core` / `react` / `surfaces` / `preset-*` / `ui-*`；不按“数据原语”拆包。
- **禁止**在公开类型里出现 `__resource`/`__scopeKeys`/`__id` 这类内部字段。
- **禁止**用 `policy` 字段是否存在来判别两个概念。

---

## 4. 数据面（L2–L3）

### 4.1 三个读能力

```ts
export type Scope = Readonly<Record<string, string | undefined>>;
export type Cursor = string;
/** 查询键/失效目标的稳定标识；由 source/entity 显式提供，不靠闭包嗅探。 */
export type SourceName = string & { readonly __sourceName?: unique symbol };

export interface CollectionSource<T> {
  readonly name: SourceName;
  /** 声明参与 scope 分区/自动停用的键；不是运行时注入协议 */
  readonly scope?: readonly string[];
  read(
    request: CollectionRequest,
    ctx: Scope,
    signal?: AbortSignal,
  ): Promise<CollectionPage<T>>;
}

export interface RecordSource<T, ID = string> {
  readonly name: SourceName;
  readonly scope?: readonly string[];
  /** null = 记录不存在（empty 态）；not-found 失败由适配器选择 throw */
  read(id: ID, ctx: Scope, signal?: AbortSignal): Promise<T | null>;
}

/** 外键解析；旧名 useBatch/BatchSource 停用。 */
export interface LookupSource<T, ID = string> {
  readonly name: SourceName;
  readonly scope?: readonly string[];
  /** 行 → id 投影，供 byId/missingIds；省略时绑定回退到 row.id。 */
  readonly key?: (row: T) => ID;
  read(ids: readonly ID[], ctx: Scope, signal?: AbortSignal): Promise<readonly T[]>;
}

/** 裸 source 工厂：name/scope 显式，绑定层据此生成 query key。 */
export function collectionSource<T>(spec: CollectionSource<T>): CollectionSource<T>;
export function recordSource<T, ID>(spec: RecordSource<T, ID>): RecordSource<T, ID>;
export function lookupSource<T, ID>(spec: LookupSource<T, ID>): LookupSource<T, ID>;
```

三个能力彼此独立。`defineEntity` 只是可选的组合糖；它把 `name`/`scope`
附加到内部 capability 上，**不是隐藏协议**：

```ts
export interface EntitySpec<T, ID = string> {
  readonly name: SourceName;
  readonly key?: (row: T) => ID;
  readonly scope?: readonly string[];
  readonly collection?: Omit<CollectionSource<T>, "name" | "scope">;
  readonly record?: Omit<RecordSource<T, ID>, "name" | "scope">;
  readonly lookup?: Omit<LookupSource<T, ID>, "name" | "scope">;
  readonly commands?: Record<string, Command<any, any>>;
  readonly streams?: Record<string, StreamSource<any>>;
}

export interface Entity<T, ID = string> {
  readonly name: SourceName;
  readonly key?: (row: T) => ID;
  readonly scope?: readonly string[];
  readonly collection?: CollectionSource<T>;
  readonly record?: RecordSource<T, ID>;
  readonly lookup?: LookupSource<T, ID>;
  readonly commands?: Record<string, Command<any, any>>;
  readonly streams?: Record<string, StreamSource<any>>;
}

export function defineEntity<T, ID>(spec: EntitySpec<T, ID>): Entity<T, ID>;
```

`defineResource` 在 v3 中**直接删除**（不是 alias）；旧消费方由同批 codemod 改成
`defineEntity` 或裸能力。

**规则**：

- 一个页面可以只用裸 `CollectionSource`，不必造 Entity；绑定读 `source.name` +
  `source.scope` 生成 query key。
- 一个 Entity 可以没有 `collection`/`record`/`lookup`/`commands`/`streams` 中的任意项。
- Entity 的 `name` 只用于 query key 与诊断；不生成路由，不注册页面。
- `Entity.name` 与内部 source 的 `name` 必须一致（`defineEntity` 负责附加/校验）；
  query key 永远只认 source 的公开 `name`/`scope`。
- 不再有 `__resource`/`__scopeKeys`/`__id`/`legacyKeys`；需要这些信息的绑定
  从 Entity 的公开字段或调用点选项读取。

### 4.2 `CollectionState` 与 `CollectionRequest` 分开

**URL 状态**是用户可分享的视图状态；**请求**是后端中立的查询意图。
两者形状不同，不能共用一个类型。

```ts
export type FilterValue =
  | { field: string; op: "eq" | "ne" | "contains" | "in" | "gt" | "lt" | "gte" | "lte" | "exists";
      value: string | number | boolean | readonly string[] };

export type Sort = { field: string; dir: "asc" | "desc" };

export type PageState =
  | { kind: "cursor"; cursor?: Cursor }
  | { kind: "offset"; offset: number }
  | { kind: "all" };

export interface CollectionState {
  q?: string;
  filters?: readonly FilterValue[];
  sort?: readonly Sort[];
  page?: PageState;
  size?: number;
}

export type CollectionWindow =
  | { kind: "cursor"; size: number; cursor?: Cursor }
  | { kind: "offset"; size: number; offset: number }
  | { kind: "all"; size?: number };

export interface CollectionRequest {
  where?: Predicate;
  order?: readonly Sort[];
  window: CollectionWindow;
}

export interface CollectionPage<T> {
  rows: readonly T[];
  paging:
    | { kind: "cursor"; nextCursor?: Cursor; total?: number }
    | { kind: "offset"; total: number; offset: number; size: number }
    | { kind: "all"; total: number };
}
```

**URL schema 只负责 `CollectionState`**：

```ts
const search = collectionSearch({
  text: ["name", "id"],              // q 的字段白名单
  filters: [                          // URL 可序列化的过滤字段
    { field: "status", op: "in", options: [...] },
    { field: "createdAt", op: "gte", kind: "datetime" },
  ],
  defaultSize: 20,
  defaultSort: [{ field: "createdAt", dir: "desc" }],
  defaultPage: { kind: "offset", offset: 0 }, // offset 分页必须显式声明；否则 URL 无 page 时按 cursor
  namespace: "widgets",              // 可选：多集合同路由时 URL 键带 widgets. 前缀
});

// search.schema   → Standard Schema（validateSearch 直收）
// search.encode(state) / decode(params) / patch(part) / reset()
// search.toRequest(state) → CollectionRequest
// search.serializer → { parseSearch, stringifySearch }（可选，见下）
```

**规则**：

- URL 只承载 `CollectionState`；不承载任意 `Predicate` 树。
  OR 不在 URL 里表达；需要 OR 的页面用自定义参数或本地状态。
- `Predicate` 仍是**请求侧**的树；`FilterValue` 是**状态侧**的叶子。
  `toRequest` 负责把叶子组装成 AND（文本 `q` 组装成 OR），并映射到 `CollectionWindow`。
- `toRequest` 是纯函数；适配器只接收 `CollectionRequest`，不知道 URL 键。
- **默认分页模式必须显式**：URL 没有 `page`/`cursor` 时，`toRequest` 默认按
  `cursor`；offset 分页的 schema 必须声明 `defaultPage: { kind: "offset", offset: 0 }`，
  否则第一页会被误判为 cursor 模式（`pager.mode` 漂移）。`decode` 不把默认值写回
  state，默认值只由 `toRequest` 应用。
- `CollectionState` 的默认值 + URL = 真相；UI 从 state 派生，不另存一份完整查询。
- 过滤控件用 `FilterField[]` 渲染；`FilterField` 可由 schema 或字段视图派生，
  但只有一份运行时来源。
- **namespace**：多集合同路由时显式开启；URL 键带扁平前缀（`widgets.q` /
  `widgets.page`），各 schema 只读自己的前缀，其他键 passthrough。
- **URL 数组序列化必须显式定案**：
  - 方案 A（推荐）：`collectionSearch.serializer` 提供 repeated-key 解析/序列化
    （`filter=a:eq:1&filter=b:in:x,y`），消费者挂到 Router 的
    `parseSearch/stringifySearch`；未知键仍走默认 JSON。
  - 方案 B：接受 TanStack 默认 JSON 数组（`filter=%5B%22...%22%5D`），
    文档写明；不假装是 repeated key。
  - **单元素数组的方言**：repeated-key 的 `filter=a:eq:1` 在 parse 后是 scalar，
    不是 `["a:eq:1"]`；`decode` 必须 `toArray` 归一（spike 已实证）。
  - **serializer 合约**：`stringifySearch` 返回带前导 `?` 的字符串（空结果返回 `""`），
    与 TanStack Router 默认 serializer 一致；`parseSearch` 接受前导 `?`。
  - 不能两套并存；v3 一次定死。

### 4.3 命令与结果

```ts
export type Outcome<P = unknown> =
  | { status: "ok"; payload: P }
  | { status: "rejected"; code?: string; message: string; fieldErrors?: Record<string, string> }
  | { status: "conflict"; message: string };

export interface Command<I, O = unknown> {
  /** 必须写成函数属性，不写方法签名——方法参数是 bivariant，
   *  会让 `Command<UpdateInput>` 静默赋给 `Command<CreateInput>`。 */
  run: (input: I, ctx: Scope) => Promise<Outcome<O>>;
  /** 命令作者裁决协议层状态的领域语义（delete 已删 → ok 等） */
  treatAs?: Partial<Record<"not-found" | "forbidden", Outcome<O>>>;
  /** 纯数据的效果声明；绑定负责应用。不是隐藏的缓存实现 */
  effects?: readonly Effect[];
}
```

**命令只声明效果，不执行缓存策略。** 失效是**效果（Effect）**，由 Command 或绑定声明：

```ts
export type Effect =
  | {
      type: "invalidate";
      entity: SourceName;
      kind?: "collection" | "record" | "lookup";
      id?: unknown;
      /** 显式跨 scope 失效；缺省与命令 ctx scope 相交 */
      allScopes?: true;
    }
  | { type: "invalidateKey"; key: readonly unknown[] };

export interface CommandOptions<I, O> {
  scope?: Scope | ((input: I) => Scope);
  /** 绑定到 Entity 时缺省失效同 Entity；显式 [] 表示不失效 */
  effects?: readonly Effect[];
  /** 只有绑定提供 entity 时才有缺省 effect；裸命令默认不失效 */
  entity?: Entity<any, any>;
  onSettled?: (result: Outcome<O> | null, failure: ApiError | null) => void;
}
```

- `scopeOf` 从 Command 移到 `CommandOptions.scope`（绑定层解析）。
- `legacyKeys` 变成显式 `{ type: "invalidateKey", key }`，不再藏在 descriptor 里。
- `treatAs` 留在 Command：它是领域语义，不是缓存策略。
- `run` 的 `ctx` 就是绑定解析出的同一份 scope；失效匹配用同一份。
- 命令绑定执行顺序：`run` → `ok` → 应用 effects → `onSettled`。
- 失效效果是数据，可单测；不需要 QueryClient 就能断言。

### 4.4 流

```ts
export interface FrameSource<F> {
  [Symbol.asyncIterator](): AsyncIterator<F>;
  readonly closeReason: "ended" | "gapped" | "auth" | "transport";
}

export interface StreamSource<F> {
  open(cursor: Cursor | null, signal: AbortSignal): FrameSource<F>;
  beforeReconnect?(): void | Promise<void>;
}

export type StreamFactory<P, F> = (params: P, ctx: Scope) => StreamSource<F>;

export interface StreamPolicy {
  buffer: number;
  pauseable?: boolean;
  retry?: { backoffMs: readonly number[] };
}

export type StreamStatus =
  | "idle"        // 未启动/待命（新增，替代误导性的 reconnecting）
  | "live"
  | "reconnecting"
  | "paused"
  | "gapped"
  | "stalled"
  | "ended"
  | "error";

export interface StreamHandle<F> {
  readonly frames: readonly F[];
  readonly status: StreamStatus;
  readonly error: ApiError | null;
  readonly resyncs: number;
  pause(): void;
  resume(): void;
  restart(): void;
  resync(anchor?: Cursor | null): void;
  clear(): void;
  subscribeFrames(listener: () => void): () => void;
  getFrames(): readonly F[];
}
```

**规则**：

- 删掉 `SubscriptionDescriptor` 与 `Subscription` 名词。参数化用 `StreamFactory`：
  ```ts
  const stream = useStream(
    (params: { dbId: string; collId: string }, ctx) => makeWsTransport(params, ctx),
    { params: { dbId, collId }, cursor: null, policy },
  );
  ```
- 运行时判别只允许 `typeof source === "function"`（factory）或 object（source），
  不再用“有没有 policy 字段”。
- `policy` 是绑定选项，不是 source 的字段；source 只负责 I/O。
- `idle` 是合法状态；未启动不再伪装成 `reconnecting`。
- `closeReason` 与终态分诊保留；`ended` ≠ 断流。
- `beforeReconnect` 保留；`restart`/`resync` 语义保留。

### 4.5 失败与错误

```ts
export class ApiError extends Error {
  readonly kind: "network" | "auth" | "forbidden" | "not-found" | "server" | "decode";
  readonly status?: number;
  readonly detail?: string;
  readonly cause?: unknown;
}

export function isRetryable(error: ApiError): boolean {
  return error.kind === "network" || error.kind === "server";
}
```

- 失败是 typed failure，走 reject/throw；结果是 `Outcome`，走返回值。
- `ApiError` 必须是 `Error` 子类（retro M9 的裁决），这样通用 Error UI、
  TanStack 默认渲染、`instanceof Error` 都成立。
- 取消（abort/interrupt）既不是失败也不是结果；边界吞掉。
- 网络断层是 `ApiError.network`，不是 defect；defect 只留程序错误。

### 4.6 适配器

- **一个 REST 适配器族**：`restCollection` / `restRecord` / `restFetchAll` /
  `clientCollection` / `mockCollection` / `mockFetchAll`。
- `fetch` 注入点是鉴权/401 闭环/axios 桥的唯一边界；错误体解析归
  `statusToApiError` 单源。
- **`clientCollection`**：`clientCollection({ fetchAll, limit? })` 在整取后本地求值
  `CollectionRequest`（filter/order/window），伪造 cursor；`window.kind:"all"` 直出全量。
  取数上限是适配器常量/参数，不假装全量。
- **rest 族**：`restCollection`/`restRecord`/`restFetchAll` 共用
  fetch/abort/error/envelope 核心；`restRecord({ notFound: "null" })` 把 404 变 `null`
  （empty 态），其余 404 走失败通道。`restFetchAll` 无 notFound 选项（404 是父资源消失）。
- **`createHttp` 降级**：它是“可选 HTTP 管线”，不是主路径。若保留，必须
  复用 rest 的错误收敛与 fetch 注入；不再作为第二套公开适配器。
- **Effect 降为可选**：订阅引擎可以用 Effect 实现，也可以纯 TS；`effect`
  不应是 core 的硬依赖。v3 推荐：
  - core 零 `effect`；
  - 若保留 Effect 引擎，放 `@lynxland/uikit-core/effect` 可选子路径。
- 适配器不导出 React、不导出 UI。

---

## 5. 绑定面（L4）

### 5.1 数据绑定（无 Router）

`@lynxland/uikit-react` 只导出数据/命令/流绑定，**禁止 import Router**。

```ts
export interface CollectionHandle<T> {
  readonly rows: readonly T[];
  readonly page: CollectionPage<T> | undefined;
  readonly request: CollectionRequest;
  readonly status: "idle" | "loading" | "empty" | "error" | "success";
  /** 空态原因：源空 or 过滤空（UI 文案分流） */
  readonly emptyReason?: "source" | "filter";
  readonly error: ApiError | null;
  readonly total: number | undefined;
  readonly isFetching: boolean;
  refetch(): void;
}

export interface RecordHandle<T> {
  readonly data: T | undefined;
  readonly status: "idle" | "loading" | "empty" | "error" | "success";
  readonly error: ApiError | null;
  readonly isFetching: boolean;
  refetch(): void;
}

export interface LookupHandle<T, ID> {
  readonly rows: readonly T[];
  readonly byId: ReadonlyMap<ID, T>;
  /** 请求里未解析到的 id（删除/无权限/不存在） */
  readonly missingIds: readonly ID[];
  readonly status: "idle" | "loading" | "error" | "success";
  readonly error: ApiError | null;
}

export function useCollection<T>(
  source: CollectionSource<T>,
  request: CollectionRequest,
  options?: CollectionQueryOptions,
): CollectionHandle<T>;

export function useRecord<T, ID>(
  source: RecordSource<T, ID>,
  id: ID | undefined,
  options?: RecordQueryOptions,
): RecordHandle<T>;

export function useLookup<T, ID>(
  source: LookupSource<T, ID>,
  ids: readonly ID[],
  options?: LookupQueryOptions,
): LookupHandle<T, ID>;

export interface CollectionQueryOptions {
  scope?: Scope;
  staleTime?: number;
  refetchInterval?: number | false;
  enabled?: boolean;
  retry?: boolean | number;
  keepPrevious?: boolean;
}

export type RecordQueryOptions = Omit<CollectionQueryOptions, "keepPrevious">;
export type LookupQueryOptions<T, ID> =
  Pick<CollectionQueryOptions, "scope" | "staleTime" | "retry"> & {
    /** 覆盖 source.key 的行 → id 投影。 */
    key?: (row: T) => ID;
  };
```

- `useCollection` **不返回 setter**，不读 URL，不 import Router。
- 旧 `useCollectionData` 的语义就是新的 `useCollection`；旧名**直接删除**，
  不做 alias（同批 codemod 替换）。
- `useRecord`/`useLookup` 同样只做数据。
- `RecordSource.read` 返回 `null` = 记录不存在（`status:"empty"`）；
  适配器若要把 404 当失败，则 throw `ApiError`，不返回 null。
  `useRecord` 的 `id` 为 `undefined` = `status:"idle"` / 不请求。
- `LookupSource` 返回部分行时，`byId` 缺失的 id 进 `missingIds`；
  外键显示回退到裸 id 由页面/`ReferenceValue` 决定。
- `status` 的四态由绑定统一计算；`empty` 来自 `rows.length === 0`，
  并暴露 `emptyReason`（`source` / `filter`）供页面区分文案。
- `queryOptions` 工厂保留：`collectionQueryOptions(source, request, options)`、
  `recordQueryOptions`、`lookupQueryOptions`；key 单源。
- **query key 形状**：`[kind, source.name, canonicalScope, ...detail]`：
  - `canonicalScope` = **只取 source.scope 声明的键**，按 key 排序、丢 undefined；
    命令 scope 里多出来的键（如 appId）不进入读键，避免同一资源因无关 scope 碎片化；
  - `kind` = `collection` / `record` / `lookup`；
  - `detail` = 规范化后的 request（predicate/order/window）或 record id / lookup ids；
  - 不手拼键；测试从 `collectionQueryOptions(...).queryKey` 单源取。
- **scope 未就绪**：`useCollection` 返回 `status:"idle"` 且不发请求；
  `useRecord`/`useLookup` 同理。
- `useCollection` 的句柄引用稳定性是契约：`rows/status/error` 只在数据/状态变化时变；
  `pager`/setter 必须 `useCallback`/`useMemo` 稳定。
  `refetch`/setter 必须 `useCallback` 稳定（旧设计承诺但未做到）。

### 5.2 URL 绑定（可选，Router 子路径）

`@lynxland/uikit-react/router`（只有这个子路径 import Router）：

```ts
export interface SearchStateHandle<S> {
  readonly state: S;
  set(next: S, options?: { history?: "replace" | "push" }): void;
  patch(part: Partial<S>, options?: { history?: "replace" | "push" }): void;
  reset(): void;
}

export function useSearchState<S>(
  search: CollectionSearch<S>,
  options: { from: string },
): SearchStateHandle<S>;

/** 页面级组合糖：数据绑定 + URL 绑定；旧 useCollection 的行为住在这里。 */
export function useCollectionPage<T>(
  source: CollectionSource<T>,
  options: {
    search: CollectionSearch<CollectionState>;
    from: string;
    scope?: Scope;
    query?: CollectionQueryOptions;
  },
): CollectionPageHandle<T>;

export interface PagerModel {
  readonly mode: "cursor" | "offset" | "all";
  readonly canPrev: boolean;
  readonly canNext: boolean;
  readonly pageSize: number;
  prev(): void;
  next(): void;
  setPageSize(size: number): void;
}

export interface CollectionPageHandle<T> extends CollectionHandle<T> {
  readonly pager: PagerModel;
  setState(next: CollectionState, options?: { history?: "replace" | "push" }): void;
  patchState(part: Partial<CollectionState>, options?: { history?: "replace" | "push" }): void;
  setFilters(filters: readonly FilterValue[], options?: { history?: "replace" | "push" }): void;
  setSort(sort: readonly Sort[] | null, options?: { history?: "replace" | "push" }): void;
  reset(): void;
}
```

- `useCollectionPage` 返回 `CollectionHandle` + `pager` + 页面 setter；这是唯一把 URL
  写入契约与数据绑定组合起来的官方入口。
- **Pager 规则**：
  - offset：`canPrev = offset > 0`，`prev()` 回上一 offset；`canNext` 由 `total` 判断。
  - cursor：`canNext = nextCursor != null`；`canPrev = 非首页`。
    `prev()` 委托浏览器历史（`router.history.back()`）——这是 URL 绑定层的策略，
    不是控件策略；深链进入带 cursor 的 URL 时历史为空，prev 退化不可用（成文）。
  - `all`：不渲染 pager。
  - `setPageSize`：offset 模式回第一页；cursor 模式保留游标（同一锚点取新 size）。
- `Pager` 控件只收 `PagerModel`/callbacks；不 import Router、不读 `window.history`。
- 写入律：
  - 自由过滤（渐进收窄）= `replace`；
  - 翻页、离散互斥 tab = `push`；
  - 详情切面 tab = `replace`；
  - 缺省 tab 不写 URL。
- 所有 setter 走函数式 search；不在渲染期 navigate。
- `useSearchState` 是通用的：页面自定义参数（tab 等）也可以用它，不必绑 Collection。
- 单键枚举参数用 `useEnumSearch({ from, key, values, defaultValue })` 或
  `useTabParam({ from, values, defaultValue })`：`values` 校验 URL 输入并把
  未知值归一化为 `defaultValue`，返回 `EnumSearchHandle<T>`；默认值不写入 URL。

### 5.3 命令绑定

```ts
export interface CommandHandle<I, O> {
  mutate(input: I): void;
  mutateAsync(input: I): Promise<Outcome<O>>;
  readonly result: Outcome<O> | null;
  readonly failure: ApiError | null;
  readonly pending: boolean;
  /** scope/权限等前置条件就绪；未就绪时 mutate 抛开发期错误，预设禁用按钮 */
  readonly ready: boolean;
  reset(): void;
}

export function useCommand<I, O>(
  command: Command<I, O>,
  options?: CommandOptions<I, O> & { entity?: Entity<any, any> },
): CommandHandle<I, O>;
```

- `useCommand` 负责：解析 scope、执行 `run`、ok 后应用 effects、把结果/失败两分。
- 绑定到 Entity 时，缺省 effect = 失效同 Entity；显式 `effects: []` 表示不失效。
- 声明了 scope 键但值未就绪：`ready=false`；`mutate` 抛开发期错误（不静默 no-op），
  预设页面禁用动作按钮。
- effects 在 `run` 返回 ok 后同步触发；`onSettled` 在 effects 编排后调用。
- `useCommandForm` 保留，但表单类型参数独立：

```ts
export interface FormSpec<I extends object> {
  schema?: StandardSchemaV1<I>;
  fields: readonly FieldInput<I>[];
  defaultValues?: Partial<I>;
}

export function useCommandForm<I extends object, O>(
  command: Command<I, O>,
  spec: FormSpec<I>,
  options?: CommandOptions<I, O>,
): CommandFormHandle<I, O>;
```

- 表单校验用 Standard Schema（Zod/Valibot/Effect Schema 均可），不再用
  `required: boolean` 作为唯一校验机制。
- `FormSpec` 的 `I` 是**输入类型**，与行类型 `T` 无关。
- `reveal` 仍是 `Outcome.ok.payload` 的一次性语义；不进 Query 缓存。

### 5.4 流绑定

```ts
export function useStream<F>(
  source: StreamSource<F> | StreamFactory<any, F>,
  options?: {
    params?: unknown;
    scope?: Scope;
    policy?: StreamPolicy;
    cursor?: Cursor | null;
    getCursor?: (frame: F) => Cursor | undefined;
    onFrame?: (frame: F) => void;
    autoStart?: boolean;
  },
): StreamHandle<F>;
```

- 旧 `useSubscription` **直接删除**，不做 alias；同批 codemod 改为 `useStream`。
- `undefined` cursor = idle/待命；`null` = 活尾立即开；值 = 从锚点续订。
- `resync(anchor)` 原地重锚；换 cursor prop = 重建流。
- 页面级只订阅状态；帧消费视图（LogViewer/EventFeed）自己订阅帧存储。
- 实时失效是组合，不是原语：
  `useInvalidateOnFrame(stream, effects, { filter?, throttleMs? })`——帧到达后应用
  `Effect[]`（与 useCommand 同一 `Effect` 类型）；热流用 trailing throttle。

### 5.5 Scope

**一个 Scope 概念，三条明确规则**：

1. **声明**：Entity/`CollectionSource` 可声明 `scope: readonly string[]`；
   声明只用于 query key 分区与“未就绪自动停用”。
2. **值**：应用根挂 `ScopeProvider`；绑定可用 `options.scope` 显式覆盖。
3. **同源**：一次绑定解析出的 scope 同时用于读 key、命令 ctx、失效匹配；
   不再有 `scopeOf` + `__scopeKeys` + 隐式 context 采纳链。

```ts
export function ScopeProvider(props: { value: Scope; children: ReactNode }): ReactNode;
export function useScope(): Scope;
export function scopeReady(
  declared: readonly string[] | undefined,
  scope: Scope | undefined,
): boolean;
```

- 显式 scope 优先于 context。
- 资源声明了 scope 键而值未就绪 → 查询自动 `enabled: false`；命令不自动执行。
- 跨 scope 失效必须显式 `{ type: "invalidate", entity, allScopes: true }`（Effect 变体），
  不能靠“恰好没传 scope”实现。
- 不再有 `__scopeKeys`；是否需要 context 由“是否声明了 scope 键”这个公开事实决定。

### 5.6 测试契约

- `@lynxland/uikit-testing` 提供 `renderWithKit` / `createTestRouter`。
- 新增：
  - `renderCollection(source, request)`：无 Router 的数据绑定测试；
  - `renderSearchState(search, initial)`：URL 绑定测试；
  - `mockSource` / `mockCommand` / `mockStream`：按能力而不是按 Resource 造 mock。
- 测试面与运行面同契约级别维护；`/testing` 的严格 tsc 必须可用。

---

## 6. 呈现面（L5–L7）

### 6.1 控件（L5 Controls）

**规则：控件只收受控 props；不取数、不 import Router、不调用绑定 setter。**

#### DataTable

```tsx
<DataTable
  rows={rows}
  columns={columns}
  getRowId={(row) => row.id}
  sorting={sort}
  onSortingChange={setSort}
  selection={selection}
  columnVisibility={visibility}
  onColumnVisibilityChange={setVisibility}
  onRowClick={openDetail}
/>
```

- `DataTable` 不认识 `CollectionHandle`；静态数组也能渲染。
- 排序/过滤/分页状态由调用方给；表内只保留列可见性等瞬态（可受控）。
- 行选择仍是受控 `RowSelection`；批量动作编排归页面。

#### FilterBar

```tsx
<FilterBar
  fields={filterFields}
  value={state.filters ?? []}
  onChange={(filters) => setState({ ...state, filters })}
  text={{ value: state.q ?? "", onChange: (q) => setState({ ...state, q }) }}
/>
```

- `FilterBar` 不读 `list`；没有本地 `Draft` 镜像。
- 输入文本可以有一个瞬态 draft，但必须在 `value` 变化时同步（或使用
  `useDeferredValue`/受控输入），不得只在挂载时初始化。
- `FilterField` 是唯一过滤声明：

```ts
export interface FilterField {
  field: string;
  label?: string;
  kind: "text" | "exact" | "enum" | "datetime";
  op?: Operator;
  options?: readonly { value: string; label: string }[];
  as?: "input" | "select" | "tabs" | "range" | "presets";
  presets?: readonly DatetimePreset[];
}
```

- `FilterBar` 不推导 schema；schema 由页面显式定义。可由 `filterFieldsOf(view)`
  纯函数辅助，但不是唯一来源。

#### Pager

```tsx
<Pager
  paging={page.paging}
  onNext={() => ...}
  onPrev={() => ...}
  onPageSizeChange={(size) => ...}
/>
```

- `Pager` 不调用 `window.history`；prev 的“历史栈”策略由页面/`useCollectionPage` 决定。
- `Pager` 内部按 `paging.kind` 渲染 cursor/offset/all 三种形态；
  不再有 `Pagination` + `KeysetPagination` 两个公开控件。
- 空尾页仍渲染分页栏；Prev 在首页禁用。
- 页大小切换保留游标/位置语义，由 `useCollectionPage` 实现。

#### ColumnPicker / FileTree / DateRangePicker

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
  items={[
    {
      id: "dynamic",
      label: "dynamic",
      type: "directory",
      children: [{ id: "traefik.yml", label: "traefik.yml", type: "file" }],
    },
  ]}
  expanded={expanded}
  onExpandedChange={setExpanded}
  selected={selected}
  onSelect={(id, item) => item.type === "file" && setSelected(id)}
  folderIcon={<FolderIcon />}
  fileIcon={<FileIcon />}
  aria-label="Traefik files"
/>

<DateRangePicker
  start={range.start}
  end={range.end}
  onChange={setRange}
  presets={[{ label: "Last 7 days", start: "2026-07-01", end: "2026-07-08" }]}
/>
```

- `ColumnPicker` 复用 adapter `Menu` 的 checkbox item；`visibility` 与
  `DataTable.columnVisibility` 同形（缺省 key = 可见），`hideable: false`
  渲染为 checked + disabled。它不拥有状态，也不取数。
- `FileTree` 是受控树：`expanded`/`selected` 由调用方持有；键盘遵循
  WAI-ARIA tree（ArrowUp/Down、Home/End、ArrowRight 展开/首子项、ArrowLeft
  收起/父项、Enter/Space 选择），`aria-level`/`aria-expanded`/`aria-selected`
  与嵌套 `role="group"` 由控件输出。图标默认是内置 SVG，可用
  `folderIcon`/`fileIcon` 或 item `icon` 覆盖。
- `DateRangePicker` 只处理日期字符串（`YYYY-MM-DD`），不引入日历库；
  两个 `Input type="date"` + 可选 presets，通过 adapter `Popover` 承载，
  `onChange` 始终收到 `{ start?, end? }`。

#### Tabs

```tsx
<Tabs
  items={tabs}
  value={current}
  onChange={onChange}
  variant="underline" | "pills" | "filter" | "segmented"
/>
```

- 一个受控 Tabs 控件覆盖模块 tab、详情 tab、过滤分片 tab、全宽分段 tab。
- 写入律（push/replace）由调用点决定；Tabs 不 import Router。
- 键盘/aria 在一个地方实现。

#### CommandPalette / CommandMenu

```tsx
<CommandPalette open={open} onOpenChange={setOpen} items={items} />
<CommandMenu open={open} onOpenChange={setOpen} trigger={<Button>Env</Button>} items={items} />
```

- 两者共用 headless `useCommandList`：query 过滤、active index、
  ArrowUp/Down、Home/End、Enter、Escape、scroll-into-view。
- item 支持 `id/label/group/icon/keywords/checked/disabled/shortcut/onSelect`；
  `CommandMenu` 使用 adapter Popover，`CommandPalette` 使用 adapter Dialog。
- 不新增 adapter `Command` 基元；`Command` 名字属于数据写原语。
- 选择动作由调用方 `onSelect` 完成，控件不 import Router。

#### InputGroup / SecretInput

```tsx
<InputGroup endAddon={<CopyButton value={url} label="Copy connection URL" />}>
  <ui.Input variant="bare" readOnly value={url} aria-label="Connection URL" />
</InputGroup>

<SecretInput label="Password" value={password} onChange={setPassword} masked />
```

- adapter 的 `Input`/`Textarea` 增加 `variant="default" | "bare"`；`bare` 去掉自身
  边框/背景/焦点环，由 `InputGroup` 统一提供外框、focus-within ring、invalid 与
  disabled 状态。`InputGroup` 本身不取数、不碰 Router。
- `InputGroup` 收单个 input/textarea + `startAddon`/`endAddon`；`disabled`/`invalid`
  同时写 group 状态与直接控件（`data-*`、`aria-disabled`、`aria-invalid`）。
- `SecretInput` 是受控值（`value`/`onChange` 收真实值）+ reveal + `CopyButton`；
  只读遮罩显示圆点，可编辑遮罩用 `type=password`，reveal 不重置 draft。
  表格/详情展示仍用 `SecretValue`，一次性命令结果用 `SecretReveal`。

#### CodeEditor

```tsx
<CodeEditor
  value={env}
  onChange={setEnv}
  language="properties" // text | properties | yaml | json | shell | compose
  lineNumbers
  wrap={false}
  masked={!revealed}
  minHeight="22rem"
  aria-label="Environment variables"
/>
```

- surfaces 自带的零依赖实现：textarea + 行号 gutter（滚动同步），`language`
  只是元数据，不内置语法引擎；`render({ value, onChange, language, … })`
  是 CodeMirror/Monaco 的可选逃生口。
- `masked` 不修改 `value`：textarea 文本透明 + aria-hidden 圆点覆盖层，
  reveal/hide 只切展示；`onMaskedChange` 存在时渲染内置 reveal 按钮，
  否则由消费方控制（例如页面 header 的 reveal action）。
- `lineNumbers` 默认 true，`wrap` 默认 false（保证 gutter/遮罩行对齐）；
  `readOnly`、`placeholder`、`minHeight`、`className` 与控制台编辑器共用。

#### AsyncState

```tsx
<AsyncState
  status={list.status}
  error={list.error}
  onRetry={list.refetch}
  empty={{ title, description, action }}
>
  <DataTable ... />
</AsyncState>
```

- `LoadingState` / `EmptyState` / `ErrorState` 仍可作为值视图单独用。
- `AsyncState` 只做四态切换；不取数。

#### Form / FieldInputs

```tsx
<Form form={form} submitting={form.submitting} result={form.result} onCancel={close}>
  <FieldInputs form={form.form} fields={inputFields} />
</Form>
```

- `Form` 是提交壳（submit/error box/footer）；不创建表单。
- `FieldInputs` 按 `FieldInput<I>[]` 渲染；不接收 Row 类型。
- `TextField`/`SelectField`/`DateTimeInput`/`CheckboxField`/`ReferenceInput` 是控件；
  日期时间由 UI adapter 自绘，不依赖浏览器原生 `datetime-local` 弹窗。
- `ReferenceInput` 接受 `LookupSource` 或 `options` 回调，不内嵌 Resource。

#### Values

- `StatusBadge`、`StatusDot`（tone + 可选无障碍标签 + pulse）、`Alert`
  （info/success/warning/danger + 可选 title/description/icon/action + `live`）、
  `Progress`（value/max/tone/indeterminate/label）、`RelativeTime`、`Kbd`、
  `CopyButton`、`SecretReveal`、`DiffView`、`JsonField`、`StatCard`、`MetricChart`、
  `CodeEditor`、`FieldValue`、`LoadingState`/`EmptyState`/`ErrorState`。
- `MetricChart` 的 series 颜色由 `series.key` 稳定推导（同图内避让冲突），
  `series.color` 显式覆盖；增强项为 `showLegend`（默认 true）、`showYAxis`、
  `area`、`tooltip`（pointer 竖线 + readout）、`unit`、`thresholds`、`domain`、
  `series.formatValue`。SVG 下方始终输出 sr-only 表格摘要；`chart` 仍可替换为
  Recharts/donut，surfaces 不新增图表依赖。
- `ToastProvider` / `useToast` / 命令式 `toast.*` 是 surfaces 级反馈队列：
  viewport 用 `aria-live`，支持关闭、duration、hover/focus 暂停与栈上限；
  不需要 adapter toast 基元。`PresetProvider` 默认安装 viewport。
- `useHotkey` 只管 window 键盘监听（mod/ctrl/meta、editable 保护），不碰 Router。
- 值视图只依赖 L2 类型或纯 props；不 import 数据层、Router、绑定。

### 6.2 视图（L5 Views）

视图是“绑定句柄 → 控件 props”的翻译层。它们可以 import 绑定句柄类型，
但不能 import Router/URL，也不能渲染页面壳。

#### CollectionView

```tsx
<CollectionView
  list={list}
  columns={columns}
  filters={filterFields}
  toolbar={<Button>Export</Button>}
  selection={selection}
  empty={{ title: "No widgets", action: <ResetFilters /> }}
/>
```

职责：

- 组合 `AsyncState` + `FilterBar` + `DataTable` + `Pager` + 可选 tabs 槽。
- 处理 `list.status` 四态。
- 不渲染 h1、不提供宽度/衬垫、不 import Router。
- 页面级动作（导出、失败注入）通过 `toolbar`/`actions` 槽注入。
- 分页策略从 `list.page.paging.kind` 派生；页面可覆盖 `pager` 槽。

#### RecordView

```tsx
<RecordView
  record={record}
  title={(row) => row.name}
  meta={(row) => <StatusBadge status={row.status} />}
  actions={(row) => <DeleteButton ... />}
  tabs={[
    { key: "overview", label: "Overview", render: (row) => <FieldGrid fields={viewFields} row={row} /> },
  ]}
  activeTab={tab}
  onTabChange={setTab}
/>
```

- `tabs[].render` 接收 row，**懒渲染**；不要提前创建 `content: ReactNode` 导致
  页面到处 `record.data?` 判空。
- `RecordView` 不渲染 `h1`；页头归 Chrome。hero 可以用 `h2`/`div`。
- `FieldGrid` 是控件，可独立用于任意详情区块。

#### FormView

```tsx
<FormView
  form={form}
  fields={inputFields}
  submitLabel="Save"
  resultAction={<ReloadButton />}
/>
```

- `FormView` 消费 `useCommandForm` 的句柄；不创建表单、不弹窗。
- `FormDialog`/`FormDrawer` 是页面模板（Page Template），不是视图；它们组合
  `Dialog`/`Drawer` + `FormView`。
- `FormDialog` 的 `values` 预填、`key` 重挂、关闭即卸载属于模式层。

#### Stream views

- `LogViewer`、`EventFeed`、`StageTimeline` 是视图；消费 `StreamHandle`。
- 帧订阅在视图内完成（`subscribeFrames/getFrames`），页面级只读状态。
- `LogViewer` 的跟随/暂停/下载/清空是视图内交互；虚拟滚动是视图内实现。
- `LogViewer` 的行有两个逃生口：`formatLine(frame,index): string` 用于纯文本
  和下载，`renderLine(frame,index): ReactNode` 用于彩色级别/时间戳等富行；
  行外壳与 `data-line` 仍由视图提供。`toolbar` 是 header 与日志体之间的
  整行插槽（内置 follow/pause/download/clear 不受影响）；`hideHeader` 隐藏
  整个 header + toolbar，此时调用方自己渲染工具栏并负责 pause/follow。
  `limit` 在过滤/渲染前截取最新 N 帧，下载使用同一窗口和 `formatLine`。

### 6.3 壳（L6 Chrome）

```tsx
<PageLayout
  title="Widgets"
  description="..."
  breadcrumb={<Breadcrumb items={[{ label: "Widgets", render: <Link to="/widgets">Widgets</Link> }, { label: "Widget" }]} />}
  backLink={<Link to="/widgets">Back</Link>}
  icon={BoxIcon}
  actions={<Button>New</Button>}
  tabs={moduleTabs}
  currentTab={tab}
  onTabChange={setTab}
  tabsVariant="underline" | "pills" | "filter" | "segmented"
  titleSize="sm" | "md" | "lg" | "xl"
  headerDivider
  lead={<FiringBanner />}
  width="flow" | "narrow" | "wide" | "content"
  maxWidth="53rem"
>
  <CollectionView ... />
</PageLayout>
```

**规则**：

- `PageLayout` 是唯一渲染 `h1` 的层（或应用自有壳）。视图不渲染 h1。
- `PageLayout` 不取数；`title` 由页面/页面模板传入。
- **宽度四档**：`wide` = 72rem（列表/详情/日志/事件等数据页，默认）；
  `narrow` = 48rem（表单/设置等阅读型页面）；`content` = 53rem（设置卡片内文）；
  `flow` = 不设 max-width。`maxWidth` 可覆盖任意预设。
  preset 的 `FormPage`/`SettingsPage` 默认 `narrow`，其余默认 `wide`；
  同一应用不要混用 `flow` 造成宽度漂移。
- `titleSize` 映射 18/20/24/30px（默认 `md` = 20px）；`headerDivider` 在页头下
  渲染通栏分隔线；`tabsVariant` 决定 tab 外观，默认 `underline`。
  窄屏（≤640px）页头允许换行，actions 移到标题下方，h1 不再被挤成零宽。
- `PageLayout` 的 `tabs` 只是受控渲染；URL 接线归页面或 `useSearchState`。
- `PageLayout` 可选；**kit 不强制消费方使用**。fleetly 的 `PageFrame`、
  torchwood 的 `PageCard` 可以保留，只要它们遵守“唯一 h1/唯一页头”的规则。
- `AppShell` 只管导航/高度链/Outlet；不取业务数据。
  - `sidebarHeader` / `sidebarFooter` 是完整插槽（团队切换器、用户菜单等）；
  - `header` 是主内容区顶部插槽（全局搜索/动作）；
  - nav item 支持 `icon`/`badge`/`children`（嵌套可折叠分组）；
  - `activePath` + `findActiveNavItem()` 做最长前缀 active 匹配；
  - `collapsible` + `collapsed`/`defaultCollapsed`/`onCollapsedChange` 提供内置收起；
  - `variant="plain" | "floating"`（floating = 8px inset 圆角 sidebar 面板）、
    `sidebarWidth`（CSS 长度，经 `--ui-app-shell-sidebar-width`）、
    `collapsedMode="hide" | "icon"`（icon = 3.5rem 图标轨 + Tooltip）、
    `storageKey`（localStorage 持久化未受控 collapsed）；
  - `mobileOpen` / `onMobileOpenChange` 控制窄屏抽屉；<768px 时 sidebar 变为
    overlay drawer（backdrop + Escape + focus trap），不再压缩成 11rem。
  - 颜色/边框走 `--ui-sidebar` / `--ui-sidebar-fg` / `--ui-sidebar-border` /
    `--ui-sidebar-accent`；adapter 必须提供这组 token（surfaces 提供 fallback）。
- `Breadcrumb`、`SectionCard`、`ScopeSwitcher`、`Stepper`、`RouteErrorBoundary` 归 Chrome/App 面。
  `SectionCard` 把 `headerDivider`/`footer`/`bodyClassName` 透传给 adapter `Card`；
  设置页/详情页的 section 卡片统一用它，不再手写“标题区 + border-b + 内容区”模板。

```tsx
<AppShell
  sidebarHeader={<TeamSwitcher />}
  sidebarFooter={<UserMenu />}
  nav={nav}
  activePath={pathname}
  header={<GlobalActions />}
  collapsible
  collapsed={collapsed}
  onCollapsedChange={setCollapsed}
>
  <Outlet />
</AppShell>
```

### 6.4 页面组合（L7 Page Composition / Preset）

> **命名说明**：`Recipe` → **Page Template（页面模板）**；L7 `Pattern` → **Page Composition（页面组合）**。
> `Preset` = 可安装的默认页面/组件；`Page Template` = 可复制/可生成的特殊页面骨架；
> `Page Composition` = 这两者的上层分类。名字直接说“是什么”，不用“配方/模式”这类隐喻。

页面组合分两档，**开箱即用归 preset，不归 core**：

#### A. Preset 页面（默认可运行，薄组合）

这些是真实组件，放在 `packages/preset-console/src/pages/`，
由 `PageLayout + View + 官方 binding` 组成。它们是**页面级 composition root**：
允许调用 `useCollectionPage`/`useRecord`/`useCommandForm`/`useStream`，
但不实现业务规则、不内嵌实体名、不自己写 fetch。
它们是“开箱即用”的默认路径，但可以被 View/Control/headless 逐层替换。

| Preset 页面 | 组合 | 退出方式 |
|---|---|---|
| `CollectionPage` | `PageLayout` + `CollectionView` + `useCollectionPage` | 用 `PageLayout + CollectionView` 手装 |
| `RecordPage` | `PageLayout` + `RecordView` + `useRecord` | 用 `PageLayout + RecordView` 手装 |
| `FormPage` | `PageLayout` + `FormView` + `useCommandForm` | 用 `PageLayout + FormView` 手装 |
| `CrudPage` | `CollectionPage` + create/edit/delete 默认动作 + `CrudFields` | 用 `CollectionView` + 自己接命令 |
| `SettingsPage` | `PageLayout` + `SectionCard × n` + `usePreference` | 手装 |
| `WizardPage` | `PageLayout` + `Stepper` + `FormView`/Stream 等待步 | 手装 |
| `EventsPage` | backlog `useCollection` 定锚 × `useStream` 续订 × `EventFeed` | 手装 |

`PresetProvider` 同时安装 surfaces 的 `ToastProvider`（`toast.*` viewport），
这是反馈壳而不是数据 provider；QueryClient/Router/Scope 仍由应用拥有。

**`CrudPage` 的类型面（补充）**：不要再用 v2 `CommandDescriptor<any>` + `FieldDef<T>`。

```ts
interface CrudPageProps<Row, CreateInput, UpdateInput = CreateInput, DeleteInput = unknown> {
  source: CollectionSource<Row>;
  search: CollectionSearch<CollectionState>;
  from: string;
  columns: readonly Column<Row>[];
  filters?: readonly FilterField[];
  fields: CrudFields<Row, CreateInput, UpdateInput>;
  create?: {
    command: Command<CreateInput, Row>;
    host?: "dialog" | "drawer" | "page";
    title?: string;
    defaults?: Partial<CreateInput>;
  };
  update?: {
    command: Command<UpdateInput, Row>;
    host?: "dialog" | "drawer" | "page";
    title?: string;
    toInput?: (row: Row) => Partial<UpdateInput>;
  };
  delete?: {
    command: Command<DeleteInput, unknown>;
    title?: string;
    toInput?: (row: Row) => DeleteInput;
  };
  getRowId: (row: Row) => string;
  empty?: ReactNode;
  errors?: { describe?: (error: ApiError) => string };
  /** Required when a host is "page"; navigate to a FormPage route. */
  onPageHost?: (
    request: { mode: "create" } | { mode: "edit"; row: Row },
  ) => void;
}

// CrudFields 见 §6.5（view/create/update/filters + createDefaults/toUpdateInput）
```

**三种 host 一次定死**：

- `dialog` / `drawer`：CrudPage 内置宿主；
- `page`：CrudPage 调 `onPageHost`，应用导航到 `FormPage` 路由
  （`/widgets/new`、`/widgets/:id/edit`）；preset 不内嵌路由约定。

- create/update/delete 的 Input 类型独立；`toInput` 显式做 Row → Input。
- 默认 delete input = `getRowId(row)`；默认 update input = row 本身（需显式 `toInput` 才安全）。
- 字段集不同（创建有 password、更新没有）是常态，不强行 `FieldDef<T>`。
- `CrudPage` 只组合默认 dialog/drawer 与 `CrudFields`；不内嵌业务规则。

**Preset 页面的约束**：

- 只做组合与默认值；不实现业务、不内嵌实体名。
- **允许调用官方 binding**（`useCollectionPage`/`useRecord`/`useCommandForm`/`useStream`），
  因为它是页面级 composition root；但不得自己写 fetch/协议/错误映射。
- 所有 part 都是 ReactNode/函数槽；可以替换任意一段。
- 允许薄配置（`source`/`search`/`from`/`columns`/`filters`/`crud`/`host`/`pageSize` 等），
  但不允许 v2 `TablePage` 那种“列+过滤+分页+四态+CRUD+弹窗+动作”一锅端。
- 可以被消费方 copy/fork；`preset` 与 `Page Template` 的边界是“是否默认可运行”。

#### B. Page Template（文档/脚手架/可 fork）

- `docs/page-templates/*.md`：手装步骤 + 代码。
- `uikit init` / `docs/page-templates/**`：生成或复制到消费方。
- 适用于 preset 不覆盖的特殊页面；不承诺 API。

**为什么不是 `TablePage` 2.0？**

| v2 `TablePage` | v3 preset `CollectionPage`/`CrudPage` |
|---|---|
| 在 registry 核心，和 DataTable/FieldDef 同级 | 在 preset 层，core 不含页面 |
| 同时拥有列/过滤/分页/四态/CRUD/弹窗/动作 | 只组合 `PageLayout + CollectionView + useCollectionPage` |
| `FieldDef<T>` 同时驱动 Row/Input/URL | `FieldView<Row>`/`FieldInput<Input>`/`FilterField` 三拆 |
| 无法逐层退出，改一点要 fork 整页 | L0→L1→L2→L3→L4→L5→L6 逐层退出 |
| 页壳/数据/字段/CRUD 焊死 | 壳可换、View 可换、字段可换、CRUD 可换 |

**禁止**把 preset 页面放进 core 的 stable 导出；core 只认 View/Control/headless。
preset 页面是“有观点的默认值”，不是“框架的页面类型系统”。

### 6.5 字段模型

**拆成三个类型，不再用一份 `FieldDef<T>` 焊死。**

```ts
export interface FieldView<T> {
  name: keyof T & string;
  kind: "text" | "number" | "boolean" | "datetime" | "enum" | "reference";
  label?: string;
  list?: {
    sortable?: boolean;
    filter?: "fuzzy" | "exact" | "enum" | "datetime";
    hidden?: boolean;
    width?: string;
    render?: (row: T) => ReactNode;
  };
  detail?: {
    section?: string;
    monospace?: boolean;
    render?: (row: T) => ReactNode;
  };
  options?: readonly { value: string; label: string }[]; // enum
  /** reference 的读取配置（type-only；由 ReferenceValue 用 useLookup 执行） */
  reference?: {
    source: LookupSource<any, any>;
    getLabel: (row: any) => string;
    getValue: (row: any) => string;
  };
}

export interface FieldInput<I> {
  name: keyof I & string;
  kind: "text" | "number" | "boolean" | "datetime" | "enum" | "reference";
  label?: string;
  placeholder?: string;
  required?: boolean | string;
  input?: (args: { form: FormApi<I>; name: keyof I & string; field: FieldInput<I> }) => ReactNode;
  options?: readonly { value: string; label: string }[];
  reference?: { source: LookupSource<any, any>; getLabel: (row: any) => string; getValue: (row: any) => string };
}

export interface FilterField {
  field: string;
  label?: string;
  kind: "text" | "exact" | "enum" | "datetime";
  op?: Operator;
  options?: readonly { value: string; label: string }[];
  as?: "input" | "select" | "tabs" | "range" | "presets";
  presets?: readonly DatetimePreset[];
}
```

可选便利层（用于 80% 的 CRUD）：

```ts
export interface CrudFields<Row, CreateInput, UpdateInput = CreateInput> {
  view: readonly FieldView<Row>[];
  create: readonly FieldInput<CreateInput>[];
  update: readonly FieldInput<UpdateInput>[];
  filters?: readonly FilterField[];
  createDefaults?: Partial<CreateInput>;
  toUpdateInput?: (row: Row) => Partial<UpdateInput>;
}

export function crudFields<Row, CreateInput, UpdateInput = CreateInput>(
  spec: CrudFields<Row, CreateInput, UpdateInput>,
): CrudFields<Row, CreateInput, UpdateInput>;
```

**规则**：

- `FieldView` 只管列表/详情，不 import 数据层；`reference` 的解析组件在
  `ReferenceValue` 中按 `lookup` 注入，不内嵌 Resource。
- `FieldInput` 只管表单，`I` 是输入类型，可以与 Row 不同。
- `FilterField` 只管过滤控件；URL schema 显式声明，不靠 `specOf` 反向推导。
- 表单初值类型是 `Partial<CreateInput>` / `Partial<UpdateInput>`，不是
  `Record<string, unknown>`；Row → Input 用显式 `toUpdateInput`。
- 动态 schema 表单（torchwood documents）用自定义 `FormView` + `FieldInput[]`
  的生成逻辑；核心不假设字段集静态。
- `required` 只是快捷校验；复杂校验用 Standard Schema。

### 6.6 控件/视图/壳的 props 原则

1. **控件不拿绑定句柄**；拿 `rows/columns/value/onChange`。
2. **视图拿绑定句柄**；负责把句柄翻译成控件 props。
3. **壳不拿数据**；拿 `title/actions/tabs/children`。
4. **所有 part 都是 ReactNode 槽**；结构性逃生舱保留。
5. **不要为了“减少 props”隐藏数据获取**；隐藏取数会让测试和复用变难。
6. **不要造 `*Panel` 作为 `*Page` 的另一半**；Panel 是 View，Page 是 preset/Page Template。
7. **一个页面只有一个 h1 所有者**：preset `PageLayout` 或应用自有壳。
8. **一个页面只有一个页头**；core View 不渲染 title/description/actions 页头。
9. **定制 API 统一四件套**：
   - `className` + `classNames`（关键 part 的类名槽）；
   - `render`/`asChild`（替换节点/组合自定义组件）；
   - ReactNode/函数槽（替换区域）；
   - `data-*` 状态属性（供 CSS 选择器/测试）。
   不要求消费者 fork 整个组件才能改一处样式/结构。

---

## 7. 分发、文档与质量门

### 7.1 包与目录

**目标：5 个运行时分包 + 1 个可选 UI adapter + 2 个工具包 + 1 个 meta 包。**

```
packages/
  core/                @lynxland/uikit-core
    src/kernel/        L2 契约（零依赖、零 React）
    src/schema/        CollectionState URL codec（纯 TS + Standard Schema）
    src/adapters/      L3 REST/client/mock/transport（零 React）
    exports:           .  /kernel  /schema  /adapters

  react/               @lynxland/uikit-react
    src/               L4 数据/命令/流绑定（禁 Router）
    src/router/        L4 URL 绑定（useSearchState/useCollectionPage）
    exports:           .  /router

  surfaces/            @lynxland/uikit-surfaces
    src/values/        纯值视图
    src/controls/      DataTable/FilterBar/Pager/Tabs/Form/FieldInputs/ColumnPicker/FileTree/DateRangePicker/...
    src/views/         CollectionView/RecordView/FormView/LogViewer/EventFeed/...
    src/chrome/        PageLayout/AppShell/SectionCard/...
    src/fields/        FieldView/FieldInput/FilterField/CrudFields
    src/adapter.ts     UiAdapter 类型 + UiAdapterProvider
    src/surfaces.css   语义结构类 + CSS 变量（无 Tailwind 依赖）
    exports:           .  /surfaces.css

  ui-shadcn/           @lynxland/uikit-ui-shadcn
    src/primitives/    Base UI + shadcn 基元
    src/tokens/        tokens.css（shadcn 语义名 + --status-* + --chart-*）
    src/adapter.ts     shadcnAdapter（实现 surfaces 的 UiAdapter）
    exports:           .  /tokens.css

  preset-console/      @lynxland/uikit-preset-console
    src/pages/         CollectionPage/RecordPage/FormPage/CrudPage...
    src/index.ts       默认 preset（surfaces + ui-shadcn + 默认 fields/CRUD/actions）
    exports:           .

  testing/             @lynxland/uikit-testing
  cli/                 @lynxland/uikit-cli
  meta/                @lynxland/uikit（meta：一键安装/转发 preset）
    exports:           .  /preset.css（surfaces.css + shadcn tokens）
  ui-plain/            @lynxland/uikit-ui-plain（可选最小 UI adapter）

apps/demo
```

**依赖方向**：

```
core (零 React)
  ↑
react (peer: React/TanStack)
  ↑
surfaces (deps: core + react; peer: React)
  ↑                         ↑
preset-console (deps: surfaces + ui-shadcn)
  ↑
@lynxland/uikit (meta, optional)

ui-shadcn / ui-plain (peer: React; type-only import surfaces.UiAdapter)
```

**依赖矩阵**：

| 包 | dependencies | peerDependencies | React? | UI? |
|---|---|---|---|---|
| `@lynxland/uikit-core` | 无 | 无 | 否 | 否 |
| `@lynxland/uikit-react` | core | react, tanstack query/form/router | 是 | 否 |
| `@lynxland/uikit-surfaces` | core, react | react | 是 | 仅 contract |
| `@lynxland/uikit-ui-shadcn` | — | react, `@base-ui/react`, surfaces（type-only） | 是 | 是 |
| `@lynxland/uikit-ui-plain` | — | react, surfaces（type-only） | 是 | 是 |
| `@lynxland/uikit-preset-console` | core, react, surfaces, ui-shadcn | react | 是 | 是 |
| `@lynxland/uikit-testing` | core, react | react, `@testing-library/react` | 是 | 否 |
| `@lynxland/uikit-cli` | — | node | 否 | 否 |
| `@lynxland/uikit` (meta) | core, react, surfaces, preset-console | react | 是 | 是 |

**为什么这样分**：

- `core` 保持无 React：服务端/脚本/非 React 消费方可以只用契约与适配器。
- `react` 只依赖 TanStack/React：不带 UI、不带 preset。
- `surfaces` 是**与 UI 库无关的呈现层**：values/controls/views/chrome/fields；
  只依赖 `UiAdapter` contract，不 import 任何具体 UI 库。
- `ui-shadcn` 只做视觉基元 + token：实现 `UiAdapter`，可被任何 preset 复用，也可单独替换。
- `preset-console` 是开箱即用层：依赖 surfaces + ui-shadcn，提供默认页面/字段/CRUD/动作。
- `testing`/`cli` 是可选工具，不进入运行时依赖链。
- `@lynxland/uikit` meta 只做一键入口；高级用户直接 import 子包，避免“meta 包变成 god package”。

**根包名 / meta 包**：

- 当前根 `package.json` 名是 `@lynxland/uikit`（private）。v3 要发布同名 meta 包，
  所以根包改名 **`@lynxland/uikit-workspace`**（private）。
- `packages/meta` 才是 `@lynxland/uikit`（public，一键入口）。
- 这是分包时必须先做的冲突消解；否则 meta 包无法发布。

**eject / copy-owned 矩阵**：

| 包 | 安装 | eject/copy-owned | 说明 |
|---|---|---|---|
| core / react | ✓ | ✗ | 运行时契约/绑定，保持 npm |
| surfaces | ✓ | ✓ | 可拷进消费方，import 改本地 |
| ui-shadcn / ui-plain | ✓ | ✗ | UI adapter 用 npm 或自定义包；不 eject 默认 adapter |
| preset-console | ✓ | ✓ | 默认页面/字段/CRUD 可拷 |
| testing / cli | ✓ | ✗ | 工具保持 npm |

- eject surfaces/preset 后，import 改成消费方本地路径；`ui-shadcn` 仍是依赖。
- 自定义 UI 设计：实现一个新的 `ui-*` 包或本地 adapter 模块，不 fork 默认 `ui-shadcn`。
- copy-owned 由 `@lynxland/uikit-cli eject surfaces|preset-console` 直接拷贝包源码；
  不再维护 `registry/` 第二份清单。

**为什么 core 不再拆 kernel/schema/adapters**：

- 三者都是零 React、体量小、共同构成“无头数据面”；拆成三包只会增加安装矩阵。
- 用子路径 `/kernel`、`/schema`、`/adapters` 已能按需引入。
- 触发再拆的条件：出现只想要 kernel 契约、连 schema/adapters 都不想装的服务端消费者。
  在此之前，`core` 是“适当的包”，不是 god package。

**为什么 router 不单独成包**：

- `@lynxland/uikit-react/router` 是可选子路径，`@tanstack/react-router` 是可选 peer；
  不装 Router 的消费者不会进入这条路径。
- 单独成包会多一个版本对齐点，收益小于成本。

**为什么 testing/cli 单独成包**：

- `testing` 依赖 `@testing-library/react`；不能强塞给运行时。
- `cli` 是 Node 工具，不进前端 bundle。

**版本策略**：

- **fixed group**：core/react/surfaces/preset-console 同版本发布，避免组合矩阵。
- **独立版本**：`ui-shadcn`/`ui-plain`（跟 Base UI/shadcn 演进）、`testing`、`cli`；
  它们用 peer range 对齐 core/surfaces contract。
- `@lynxland/uikit` meta 跟 preset 同版本。
- core 1.0 后遵守 semver；preset 可独立 minor/major，但 contract 版本跟 core。
- 不再有“所有代码都在 core”的包；core 只保留 headless 层。

**导出建议**：

- `@lynxland/uikit-core` 根：契约 + schema + adapters（无 React）。
- `@lynxland/uikit-core/kernel`、`/schema`、`/adapters`：显式子路径。
- `@lynxland/uikit-react`：数据/命令/流绑定；`/router`：URL 绑定。
- `@lynxland/uikit-surfaces`：values/controls/views/chrome/fields + `UiAdapter` 类型 + `/surfaces.css`。
- `@lynxland/uikit-ui-shadcn`：默认 UI adapter；`/tokens.css`。
- `@lynxland/uikit-preset-console`：默认 preset。
- `@lynxland/uikit-testing`、`@lynxland/uikit-cli`。
- `@lynxland/uikit`：meta 一键入口；不承载实现。
- 旧 `@lynxland/uikit-core` 根导出 React hooks **同步删除**；不做兼容转发。

### 7.2 UI adapter contract：适配不同 UI 设计

> **命名说明**：不用 `Skin` / `Theme` / `Foundation`。
> `Skin` 太像“纯视觉皮肤”；`Theme` 只覆盖 token；`Foundation` 与 Base UI 混淆。
> **UI Adapter** 准确表达它的角色：把 uikit 的 surfaces 适配到某个 UI 库/设计系统，
> 由第三方实现，包含 primitives + tokens + 受控行为。

**问题**：当前 registry 块 import 消费方 `@/components/ui/*`（Button/Card/Badge/Input…），
两家消费方的基元方言与版本不一致；`devtool` 只能靠 profile 做 token 类名重写，
这是“分发适配器”在替“组件契约”擦屁股。v3 一步到位统一到 **Base UI + shadcn**，
不再维护 Radix 默认分支。

**v3 规则**：

1. **UI adapter = 视觉基元 + token，不是完整组件库**。Control/View 只依赖 UI adapter contract，
   不 import 消费方 `@/components/ui/*`。
2. **UI adapter contract 最小面**（受控 wrapper，不是原始 UI 库 API）：
   ```ts
   interface UiAdapter {
     Button: Component<ButtonProps>;
     Input: Component<InputProps>;
     Textarea: Component<TextareaProps>;
     Select: Component<SelectProps>;
     Checkbox: Component<CheckboxProps>;
     DateTimeInput: Component<DateTimeInputProps>;
     Switch: Component<SwitchProps>;
     Field: Component<FieldProps>;
     Popover: Component<PopoverProps>;
     Menu: Component<MenuProps>;
     Tooltip: Component<TooltipProps>;
     Tabs: Component<TabsProps>;
     Dialog: Component<DialogProps>;
     Drawer: Component<DrawerProps>;
     Badge: Component<BadgeProps>;
     Card: Component<CardProps>;
     Table: { Root; Header; Body; Row; Head; Cell; Caption };
     icons: { ChevronDown; ChevronLeft; ChevronRight; ChevronUp; Check; X;
              Search; Copy; Eye; EyeOff; MoreHorizontal; Loader };
     cx?: (...values) => string;
   }
   ```
   | 基元 | 受控 props（最小） | 说明 |
   |---|---|---|
   | Button | `variant/size/disabled/loading/onClick/children` | 受控按钮 |
   | Input / Textarea | `value/onChange/placeholder/type/disabled/variant` | 原生控件语义；`variant="bare"` 供 InputGroup 去边框 |
   | Select | `value/onValueChange/options/placeholder/disabled/size/className/contentClassName` | 不暴露 Base UI compound API；`size` 映射 trigger 高度，`className` 只作用 trigger、`contentClassName` 只作用弹层 |
   | Checkbox | `checked/onCheckedChange/disabled` | `boolean \| "indeterminate"` |
   | DateTimeInput | `value/onChange/disabled/min/max` | 值用 `YYYY-MM-DDTHH:mm`；adapter 自绘 picker，不依赖原生弹窗 |
   | Switch | `checked/onCheckedChange/disabled` | 受控 |
   | Field | `label/description/error/required/htmlFor` | label/说明/错误包装 |
   | Popover | `open/onOpenChange/trigger/children/className` | trigger 作为元素渲染，不嵌套 button；className 只作用于内容面板 |
   | Menu | `trigger/items/align/side` | item `kind` 为 `item \| checkbox \| radio \| separator \| label \| submenu`；`checked/onCheckedChange` 受控，submenu 用 `items`；`separator: true` 是“前置分隔线”的 v3 简写，不是 alias 层 |
   | Tooltip | `trigger/content/side/align/delay/disabled` | trigger 作为元素渲染；不替代 `aria-label` |
   | Dialog / Drawer | `open/onOpenChange/title/description/footer/children/size/className` | `size` 为 `sm \| md \| lg \| xl \| fullscreen`；className 只作用于弹层/面板，不碰 backdrop；内部处理 portal/focus/esc |
   | Tabs | `items/value/onValueChange/variant` | 受控、键盘/a11y 内置 |
   | Badge / Card / Table | `tone/variant/children/className` | Card 另有 `headerDivider/footer/bodyClassName`；简单展示 |
   | icons | 12 个受控 SVG | 不强制 lucide/具体图标库 |

   - 具体类型可以按 UI 库调整，但**名字/语义**固定；不把 Base UI 的
     `Root/Trigger/Portal` 直接泄漏给 surfaces。
   - `UiAdapter` 类型与 `UiAdapterProvider` 住在 `@lynxland/uikit-surfaces`；
     具体实现住在 `@lynxland/uikit-ui-shadcn`（导出 `shadcnAdapter`）。
   - 不要求 UI adapter 提供业务组件（DataTable/FilterBar/Form 由 uikit surfaces 提供）。
3. **Token contract**：
   - 标准语义变量：`--background` / `--foreground` / `--card` / `--muted` /
     `--muted-foreground` / `--border` / `--primary` / `--destructive`；
   - Chrome rail：`--ui-sidebar` / `--ui-sidebar-fg` / `--ui-sidebar-border` /
     `--ui-sidebar-accent`（light/dark 都必须定义；surfaces 提供 fallback）；
   - 状态/图表扩展：`--status-neutral` / `--status-success` / `--status-warning` /
     `--status-danger` / `--status-info` / `--chart-1..N`；
   - 删除 kit 私有方言（`text-muted` / `bg-panel` / `border-line` / `text-fg` / `text-err`）。
4. **默认 UI adapter = Base UI + shadcn**（一步到位）。shadcn 当前基础是 Base UI；
   fleetly/torchwood 的 Radix 依赖同批迁移，不保留 Radix 默认分支。第三方 UI adapter 可以是
   Mantine、Ant Design、纯 HTML、消费者自有设计系统。
   - `ui-shadcn` 的复杂基元（Dialog/Drawer/Select/Tabs/Tooltip/Popover）用 Base UI；
     简单基元（Button/Input/Card/Badge/Skeleton）保持普通 shadcn 结构。
   - **不提供 Radix 兼容层**：消费方同批删除 `@radix-ui/*` 依赖，重生成 shadcn 组件，
     改 import 到 `@lynxland/uikit-ui-shadcn`；Radix 仅作为第三方/过渡 adapter 存在。
   - 这是一次性 cutover，不做“Radix/Base UI 双实现”。
5. **UI adapter 基元规则**：
   - 受控 props（`value`/`onChange`/`open`/`onOpenChange`），不拥有业务状态；
   - 转发 `ref`/ARIA/键盘行为；包装第三方库时不破坏可访问性；
   - 提供 `render`/`asChild` 或等价逃生口（可选但推荐）；
   - 不 import 数据层/绑定层；不写 fetch/错误映射；
   - 复杂基元（Dialog/Drawer/Tabs）由 UI adapter 负责行为，uikit 只负责组合。
6. **逐实例覆盖**：Control/View 提供 `className`/`classNames`/`styles` 槽；
   不允许只能 fork 整个块才能改一个间距。
7. **Tailwind 不是 core 契约**：Tailwind 只是默认 UI adapter/preset 的样式实现。
   `plain` UI adapter 可以用 CSS Modules/vanilla CSS；Control/View 不得硬编码颜色字面量，
   结构 class 必须可被 `classNames` 槽覆盖。
   **Light/Dark**：`ui-shadcn/tokens.css` 同时提供 `:root` 亮色与 `.dark` 覆盖；
   surfaces Chrome 提供 `ThemeProvider` / `useTheme` / `ThemeToggle`（class + storage +
   `themeScript()` 首屏脚本）。主题切换是应用策略，不是 core 原语。
8. **v2 devtool/token profile 已删除**；copy-owned 改由 `uikit eject` 负责。
   `doctor` 只校验 UI adapter contract 是否齐全、token 变量是否定义。
9. **`StatusBadge`/`StatusDot`/`StatCard` 的 `tone`** 映射到 `ok/warn/err/neutral`
   语义 token，不再用 `tone` 字符串直接拼 class。
10. **Surface styles contract（补充）**：
    - `@lynxland/uikit-surfaces` 导出 **`surfaces.css`**：语义结构类 + CSS 变量，
      不依赖 Tailwind；这是 surfaces 的默认布局/间距/状态样式。
    - `@lynxland/uikit-ui-shadcn` 导出 `tokens.css`（shadcn 语义变量）与 primitives。
    - `@lynxland/uikit-preset-console` 同时引入 `surfaces.css` + `tokens.css`。
    - surfaces 的所有组件都接受 `className`/`classNames` 槽；`surfaces.css` 的类可被覆盖。
    - 如果消费方用 Tailwind 且安装了 npm 包，需要把 `@lynxland/uikit-surfaces/src`
      （以及 `ui-shadcn` 的源码）加入 Tailwind 的 `@source`/content 扫描；`doctor` 负责检测。
    - `ui-plain`/自定义 UI adapter 可以不使用 Tailwind，只提供 primitives/tokens；
      surfaces.css 仍然是默认结构样式。

### 7.3 Preset：开箱即用层

**Preset = 默认 L4–L7 组合 + 默认 fields/CRUD/actions + 默认 UI adapter 选择。**

一个 console preset 至少包含：

- `PageLayout` / `AppShell`（默认 Chrome）；
- `CollectionView` / `RecordView` / `FormView`（默认 Views）；
- `CollectionPage` / `RecordPage` / `FormPage` / `CrudPage`（默认页面）；
- `FieldView` / `FieldInput` / `FilterField` / `CrudFields`（默认字段/过滤/CRUD）；
- 默认 UI adapter（Base UI + shadcn）与 token；
- `uikit init` 的 console starter；
  可选 `uikit eject preset-console` 把页面/字段/CRUD 拷成 copy-owned；
  UI adapter 不 eject（用 npm 或自定义 `ui-*` 包）。

**约束**：

- preset 页面是 composition root：可以调用官方 binding，但不实现业务、不内嵌实体名、
  不自己写 fetch/协议/错误映射。
- 每个 preset 组件都必须是“薄组合”：删除它，消费方可以用下层 View/Control 手装。
- preset 不能成为新的 `TablePage` god component；允许的配置面只到
  `source`/`search`/`from`/`columns`/`filters`/`crud`/`host`/`pageSize`/`slots`。
- preset 默认以 npm 包分发（便于升级）；提供 `eject` 拷进消费方仓，
  之后走 `diff` 升级。同一 preset 不混用 install + eject，
  但 core 同时支持两种消费方式。
- 第三方可以发布自己的 preset（如 `antd-admin`、`mantine-console`），
  只要满足 core contracts + UI adapter contract。

**第三方扩展**：

- 第三方可以发布 `@scope/uikit-preset-*` / `@scope/uikit-ui-*`；
  core 只依赖 contract，不依赖具体 preset/UI adapter。
- preset/UI adapter 的 contract 版本跟 core semver；1.0 后破坏性变更走 major。
- core 与默认 preset 不含业务实体名/业务枚举/业务文案；业务扩展留在消费方。
- 默认 preset/UI adapter 是 MIT；第三方可以自由 fork/替换。

**开箱即用形态（示意）**：

```tsx
// widgets.ts
export const widgets = defineEntity({
  name: "widgets",
  key: (row) => row.id,
  scope: ["projectId"],
  collection: restCollection({ path: (ctx) => `/v1/projects/${ctx.projectId}/widgets` }),
  commands: {
    create: { run: createWidget, effects: [invalidate("widgets")] },
    update: { run: updateWidget, effects: [invalidate("widgets")] },
    delete: { run: deleteWidget, effects: [invalidate("widgets")] },
  },
});
export const widgetsSearch = collectionSearch({ text: ["name", "id"], defaultSize: 20 });

// routes/widgets.tsx
function WidgetsPage() {
  return (
    <CollectionPage
      source={widgets.collection}
      search={widgetsSearch}
      from={Route.id}
      columns={widgetColumns}
      filters={widgetFilters}
      crud={{ create: widgets.commands.create, update: widgets.commands.update, delete: widgets.commands.delete }}
    />
  );
}
```

**渐进退出（progressive disclosure）**：

| 级别 | 用法 | 适用 |
|---|---|---|
| L0 | `<CollectionPage source search from columns />` | 80% 标准 CRUD 页面 |
| L1 | `<PageLayout><CollectionView list ... /></PageLayout>` | 换壳/换页面结构 |
| L2 | `<PageLayout><FilterBar/><DataTable/><Pager/></PageLayout>` | 换控件/自定义布局 |
| L3 | `useCollectionPage(...) + 自绘 UI` | 换呈现/特殊交互 |
| L4 | `useCollection(...) + 自写 URL adapter` | 非 Router/特殊状态 |
| L5 | 实现 `CollectionSource/Command/StreamSource` | 换后端/协议 |
| L6 | 换 UI adapter / primitives / token | 换 UI 设计系统 |

每一级都必须可用，且**不要求先 fork 上一级**。这就是“开箱即用 + 可定制”的分层。

**开箱即用验收**：

- 新项目 `init` 后，能用 < 30 行代码跑出一个列表页（含 URL/四态/分页/过滤）。
- 列表→详情→编辑→删除的主路径无需手写数据接线。
- 换一个 UI adapter（不改页面代码）后，视觉基元整体变化。
- 删除 preset 页面、改用 `PageLayout + CollectionView` 后，页面行为不回归。

### 7.4 文档架构

| 文件 | 职责 | 禁止 |
|---|---|---|
| `docs/philosophy.md` | 设计理念/取舍判据/竞品定位 | 不写具体 API 细节 |
| `docs/design.md` | 当前规范（本文） | 不写日期化迁移日志 |
| `docs/design-history.md` | draft-2 及历史裁决 | 不作为当前事实源 |
| `docs/audits/*.md` | 审计证据 | 不作为规范 |
| `docs/page-templates/*.md` | 页面模板（可复制代码） | 不承诺 API |
| `docs/api/*.md` | API reference（可由源码生成） | 不写设计理由 |
| `docs/adr/*.md` | 单条决策记录（日期/背景/取舍） | 不写多主题 |
| `docs/migrations/*.md` | 批次迁移日志（旧 §12） | 不混入规范 |
| `docs/SKILL.md` | Agent 操作手册（当前 API + 迁移提示） | 不写与 design 相反的规则 |
| `AGENTS.md` | 仓库工作流/质量门 | 不重复设计摘要 |
| `README`/`llms.txt` | 入口/地图/状态 | 不写详细设计 |

**文档检查（已进 `pnpm check` / `scripts/doc-check.mjs`）**：

- `README` 的版本号 = `packages/core/package.json` 的 version。
- `docs/design.md` 有版本/日期/状态行。
- `docs/SKILL.md` 顶部有“当前 API 版本 + design v3 指针”。
- 禁止在 SKILL 出现已删除规则（如“Page 与 CRUD 页块互斥”）；
  可用一个小的规则清单测试。
- 所有 docs 内部链接存在。

### 7.5 质量门

1. **layer-check**：按 §2.1 的层级规则执法；registry 不再整体放行。
   - `surfaces` 禁 import 具体 UI 库；`ui-shadcn` 禁 import `@radix-ui/*`（默认 adapter 用 Base UI）。
2. **typecheck**：core 保持 `noUnusedLocals/noUnusedParameters`；控件不得用 `any`
   接收命令 Input；`CrudPage` 的 create/update/delete Input 类型必须独立。
3. **unit**：kernel 纯函数全覆盖；URL codec 往返；Effect 应用矩阵；
   Scope 投影；Stream 终态分诊；Lookup。
4. **e2e**：URL 前进/后退/深链；四态；过滤/tab/分页；表单三态；
   stream gapped/resync；a11y（Tabs/DataTable/LogViewer）。
5. **registry status gate**：`stable` 项必须有真实消费者引用；
   `pilot` 项在 demo/一个真实页面；`template` 不进入 stable 导出。
6. **size**：`/adapters` 预算；core/react/surfaces/preset 分包预算；UI adapter 独立预算；
   不再有 effect 子路径预算。
7. **doc-check**：见 §7.4。
8. **preset 验收**：`init` 后列表页 < 30 行；列表→详情→编辑→删除主路径无手写数据接线；
   换 UI adapter 不改页面代码；拆 preset 页面后行为不回归。
9. **样式门**：Tailwind 消费方必须通过 `@source`/content 扫描 surfaces + ui-shadcn；
   `doctor` 检测；`ui-plain` 作为非 Tailwind 验证。
10. **Base UI a11y**：Dialog/Drawer/Select/Tabs 的焦点/Esc/键盘/ARIA 回归；
    e2e 至少要覆盖 Tab 退出、Esc 关闭、方向键选择。
11. **不引入**词表冻结、截图基线、登记制等重治理。

### 7.6 开源发布就绪（补充）

复审后已补 `LICENSE`（MIT）、`CONTRIBUTING.md`、`SECURITY.md`；
v3 公开发布前还需补齐：

- `CODE_OF_CONDUCT.md`。
- `.github/`：issue/PR 模板、CI（typecheck/test/lint/build/e2e/publint/attw）、release workflow。
- changesets 配置 + fixed group；`pnpm publish` 流程（npm 不解析 pnpm catalog）。
- 每个包 `exports`/`files`/`peerDependencies`/`publishConfig` 审计；净房安装冒烟。
- API reference 生成（从 `packages/*` 的公开导出）；`llms.txt`/`SKILL.md` 随包分发。
- 浏览器/React/Node/TanStack 支持矩阵；Base UI + shadcn 版本范围。
- 安全策略：`npm audit`/Dependabot；发布 provenance（可选）。
- 代码行为准则：无业务实体名/业务枚举/业务文案进入 core/preset。
- 发布前跑 `pnpm check` + `pnpm --filter demo e2e` + `publint` + 净房 install。
- 1.0 之前允许 breaking；1.0 之后 core/react/surfaces 按 semver，preset/UI adapter
  按独立版本 + contract 兼容窗。

---

## 8. Cutover 路线（无向后兼容）

> **原则：直接替换、同批删除、不做双 API、不做运行时兼容层。**
> uikit 仍在 dogfooding；v2 是可删除原型。回滚单位是 git branch，不是运行时 fallback。

### Batch 0：文档与决策（本次）

- 归档 draft-2 → `docs/design-history.md`。
- 新增 `philosophy.md` / `design.md` / 审计 / ADR / cutover 计划。
- 更新 `AGENTS.md`/`README`/`llms.txt`/`SKILL.md` 的版本边界。
- **运行时代码不动**；但明确：下一批直接重写，不写兼容层。

### Batch 1：core greenfield（直接删除旧实现）

1. **重写 `packages/core/src/kernel`**：
   - 新类型：`CollectionSource`/`RecordSource`/`LookupSource`/`Entity`/
     `CollectionState`/`CollectionRequest`/`CollectionPage`/`CollectionWindow`/
     `Command`/`Outcome`/`Effect`/`StreamSource`/`StreamHandle`/`ApiError` class。
   - 删除 `Resource`、`ResourceSpec`、`CommandDescriptor` 的 `__` 字段、
     `legacyKeys`、`scopeOf`、`AttachedCommands`、`SubscriptionDescriptor`。
   - 查询键工厂只依赖 `Entity.name`/`scope` 与公开类型。
2. **重写 `schema`**：
   - `collectionSearch(spec)` 只产出 `CollectionState` 的 Standard Schema + codec；
   - `toRequest(state)` 纯函数；不再从 `FieldDef`/`specOf` 反向推导。
3. **重写 `adapters`**：
   - rest/client/mock 统一输出 `CollectionPage`；
   - `ApiError` 实例；一条错误收敛；
   - `createHttp` 删除（或并入 rest 的 fetch 注入）；Effect 默认移除。
4. **重写 `react`**：
   - `useCollection`（数据）/ `useRecord` / `useLookup` / `useCommand` /
     `useCommandForm` / `useStream`；
   - **不 import Router**；不导出 `useCollectionData`/`useBatch`/`useSubscription`。
5. **新建 `react-router`**：
   - `useSearchState` / `useCollectionPage`；URL 写入契约只在这里。
6. **重写 `testing`**：按能力 mock（source/command/stream），不再按 Resource。
7. **测试同批重写**：删除旧契约测试，新增 source/command/stream/URL/effects 测试。
8. **破坏性变更直接落地**：版本号升 major（v3.0.0）；不写 deprecated 注释。

### Batch 2：registry greenfield（直接删除旧目录）

- 删除 v2 `registry/{values,query,command,subscription,shell}` 与 `scripts/devtool.*`。
- copy-owned 改由 `@lynxland/uikit-cli eject` 直接拷包源码，不再维护 registry 分层：
  - `values/`：纯值视图；
  - `controls/`：DataTable/FilterBar/Pager/Tabs/Form/FieldInputs/FieldGrid/AsyncState；
  - `views/`：CollectionView/RecordView/FormView/LogViewer/EventFeed/StageTimeline；
  - `chrome/`：PageLayout/AppShell/SectionCard/ScopeSwitcher/Stepper/RouteErrorBoundary；
  - `templates/`：Page Template（不承诺 API）。
- 新建 `packages/surfaces`（`@lynxland/uikit-surfaces`）：
  values/controls/views/chrome/fields + `UiAdapter` contract/provider。
- 新建 `packages/ui-shadcn`（`@lynxland/uikit-ui-shadcn`）：
  Base UI + shadcn 基元；`shadcnAdapter`；token contract
  （`--background`/`--card`/`--border`/`--status-*`/`--chart-*`）。
- 新建 `packages/ui-plain`（可选最小 UI adapter）。
- 新建 `packages/preset-console`（`@lynxland/uikit-preset-console`）：
  `pages/`（CollectionPage/RecordPage/FormPage/CrudPage/SettingsPage/WizardPage/EventsPage）
  + 默认 `surfaces`/`ui-shadcn` 组合 + 默认 fields/CRUD/actions。
- 新建 `packages/meta`（`@lynxland/uikit`）一键转发 preset。
- 删除 `Page`/`ListPage`/`ListPanel`/`TablePage`/`TablePanel`/`DetailPage`/`DetailPanel`/
  `FormPage`/`FormPanel`/`FormDialog`/`FormDrawer`/`FieldDef`/`specOf`。
- `DataTable`/`FilterBar`/`Pager`/`Tabs` 一次改成受控 props；**不保留 `list` props**。
- token 一次切到标准语义名；`devtool` token profiles 已删除。
- `registry.json`/preset 清单重生成；stable/pilot/template 一次标定。

### Batch 3：demo + 两个 console 同批迁移

- **demo**：全量重写为新 API，直接使用 `@lynxland/uikit-preset-console` 默认页面 + 默认 UI adapter；
  另留一个“换 UI adapter/拆 preset”对照页，作为开箱即用与可定制性的活文档。
- **fleetly**：默认采用 `@lynxland/uikit-preset-console` 的视图/页面；`PageFrame`/`ModulePage`
  可以保留为应用 Chrome（替换 preset PageLayout），内容换成 `CollectionView`/`RecordView`/`FormView`；
  `useCollectionPage` 替换旧 `useCollection`。
- **torchwood**：默认采用 `preset/console`；`PageCard`/`PageHeader` 可保留为应用 Chrome；
  keyset 列表换 `CollectionView` + `Pager`；表单换 `FormView` + `useCommandForm`。
- 两个消费方与 uikit 同一批 PR/分支；不发布中间兼容版本。
- 第一方应用保持“优先 preset 默认，必要时替换 Chrome/UI adapter”的 dogfooding 姿态；
  不把 fleetly/torchwood 的业务词汇带进 core/preset。
- 验收：
  - 页面 LOC 下降或持平；
  - 无 `any` 进入表单 Input；
  - 后退/前进/深链行为不回归；
  - 控件零 `useQuery`/`useNavigate`/`window.history`；
  - `useCollection` 不再 import Router。

### Batch 4：收口

- 删除所有旧导出、旧 registry 项、旧文档段落。
- `SKILL.md` 重写为 v3 API；v2 版本归档到 `docs/design-history.md` 或删除。
- `README`/`llms` 以 v3 为唯一入口。
- `pnpm check` 全绿；`doc-check` 确认无 v2 矛盾。

### 一次性 codemod（不是兼容层）

codemod 只用于**改写消费方源码**，不保留旧 API：

| 旧 | 新 |
|---|---|
| `defineResource` | `defineEntity`（或裸 source） |
| `useCollectionData` | `useCollection` |
| `useCollection`（页面） | `useCollectionPage` |
| `useBatch` | `useLookup` |
| `useSubscription` | `useStream` |
| `ListPage`/`ListPanel` | `CollectionView` |
| `Page` + `ListPage` | `PageLayout` + `CollectionView` |
| `TablePage`/`TablePanel` | preset `CrudPage` 或 Page Template 手装（人工） |
| `DetailPage`/`DetailPanel` | `RecordView`/`RecordPage` |
| `FormDialog`/`FormDrawer`/`FormPage` | `Dialog`/`Drawer`/`PageLayout` + `FormView` |
| `FieldDef`/`specOf` | `FieldView`/`FieldInput`/`FilterField` + 显式 `collectionSearch`（人工） |

**只自动改机械面**；Row/Input 拆分、CRUD 页面模板、字段语义必须人工判断。
codemod 跑完即删除旧名，不生成 deprecated 包装。

---

## 9. 反模式与幻觉诱饵

### 9.1 反模式

1. **按数据能力给 UI 分族**（query/command/subscription 族）——UI 按呈现面分层。
2. **把 preset 页面放进 core，或做成 `TablePage` 式 god component**——preset 页面是薄组合；
   core 只认 View/Control/headless；特殊页面归 Page Template。
3. **给控件传 `CollectionHandle`**——控件收受控 props；View 才拿句柄。
4. **在控件里 `useQuery`/`useNavigate`/`window.history`**——控件零数据/零路由。
5. **用 `FieldDef<T>` 同时驱动 Row 和 Input**——拆 `FieldView<Row>`/`FieldInput<Input>`。
6. **用 `specOf(fields)` 反向生成 URL schema**——schema 显式声明；过滤控件读 `FilterField[]`。
7. **把 `Resource` 当第四原语**——它是可选 Entity 分组。
8. **在公开类型里放 `__resource`/`__scopeKeys`/`__id`**——隐藏协议不是契约。
9. **用“有没有 policy”判别 descriptor/transport**——用 factory/object 类型判别，或分开 API。
10. **把 `Subscription` 当 pub/sub**——它是带游标的 Stream。
11. **在页面层缓存一份 URL 状态**（FilterBar Draft）——从 state 派生；仅允许瞬态输入 draft。
12. **用 `window.history.back()` 实现 keyset prev**——分页策略归页面/`useCollectionPage`。
13. **在 registry 块里写页容器类**（`mx-auto`/`p-6`）——壳归 Chrome。
14. **给页面套两个壳**（`PageFrame` + `Page` + `ListPage` header）——一个 h1/一个页头。
15. **在 UI adapter 里做 token 类名重写**——用 UI adapter contract；不要第三套方言。
16. **用 demo 当第二消费者**——demo 是冒烟，不是采纳证据。
17. **在 core 硬依赖 Effect**——Effect 是可选实现细节。
18. **声称 “Effect Schema 单源” 但写手写 parser**——文档必须描述事实。
19. **只做 headless、没有 preset**——开箱即用不成立；preset 是产品的一部分。
20. **只支持一种 UI 库/一套 token 方言**——第三方与不同设计系统需要 UI adapter seam。
21. **用 regex 重写消费方 token 类名**——这是分发适配器在替 UI adapter contract 擦屁股。

### 9.2 幻觉诱饵（训练数据 → 正确姿势）

| 你可能想写的 | 正确姿势 |
|---|---|
| react-admin `<Resource name list create>` | `Entity` 只分组能力；路由自己写 |
| refine `useSubscription(channel, params, onEvent)` | `useStream(source/factory, { cursor, getCursor, onFrame })` 返回流句柄 |
| refine `useTable` / `pagination.current` | `useCollectionPage` 的 state + `CollectionView` |
| dataProvider `{pagination, sort, filter}` | `CollectionState` → `CollectionRequest`（显式转换） |
| Zod `validateSearch`（旧习惯） | `collectionSearch(...).schema`（Standard Schema；内部纯 TS codec） |
| `<TablePage fields crud>` | `CollectionView` + 页面级 CRUD 页面模板（或 scaffold 生成） |
| `<FormDialog command fields>` | `Dialog` + `FormView` + `useCommandForm`（页面模板） |
| `<Page title>` + `<ListPage title>` | 一个 `PageLayout` + 一个 `CollectionView` |
| `FieldDef<T>` 驱动三视角 | `FieldView<Row>` + `FieldInput<Input>` + `FilterField` |
| `list.setOrder` inside DataTable | `DataTable sorting/onSortingChange`；View 接线 |
| `window.history.back()` in pager | 页面/`useCollectionPage` 决定 prev |
| `Resource` 的 `invalidates` | `Effect[]` + `useCommand` 应用 |
| `scopeOf` on command | `CommandOptions.scope`（绑定层） |
| `ApiError` 是 plain object | `class ApiError extends Error` |
| `useSubscription` 是 pub/sub | `Stream` 是游标帧流 |

---

## 10. 裁决与开放问题

### 10.1 已裁决（v3 默认）

1. **两条轴**：数据能力 ≠ UI 呈现层。
2. **`Resource` 删除**：v3 不存在兼容别名；用 `Entity`（可选分组）或裸能力。
3. **URL 绑定分离**：`useCollection` 数据；`useCollectionPage` 页面糖。
4. **页面分层**：core 不含页面；preset 提供薄的可运行页面
   （`CollectionPage`/`RecordPage`/`FormPage`/`CrudPage`）；Page Template 提供特殊页面组合。
   `PageLayout` 在 preset；`CollectionView`/`RecordView`/`FormView` 是 View。
5. **字段三拆**：`FieldView`/`FieldInput`/`FilterField`；`CrudFields` 可选。
6. **控件受控**：`DataTable`/`FilterBar`/`Pager`/`Tabs` 不拿绑定句柄。
7. **Stream 正名**：`useSubscription` → `useStream`；`StreamStatus` 增 `idle`。
8. **ApiError 类化**。
9. **token 单源**：标准语义名 + 状态色；devtool token profiles 已删除。
10. **registry status**：`stable` 需真实消费者；`pilot`/`template` 明确标记。
11. **无向后兼容**：旧 API 直接删除；codemod 只改源码，不留 deprecated 包装。
12. **开箱即用归 preset**：core 不含页面；preset 提供默认可运行的页面/壳/字段/CRUD。
13. **UI 适配归 UI adapter**：Control/View 只依赖 UI adapter contract + token contract；
    不 import 消费方 ui 基元，不做 token 类名重写。
14. **明确偏好但可退出**：默认 URL 真相/流一等/失败结果两分/字段基座；
    每层都有逃生舱（progressive disclosure）。

**非目标（延续旧设计的持证拒签项）**：

- 不造路由抽象层/页面注册表/CRUD 路由生成；TanStack 文件路由是真相。
- 不做 undo/乐观更新（默认同步等待；重启条件 = 真实消费者需求）。
- 不做完整 i18n 语言包（messages 通道 + 消费方词条）。
- 不做后端 adapter 动物园（自有后端；第三方 REST 方言用 rest 工厂注入点）。
- 不做“组件数量竞赛”；stable 面按真实消费者收缩。

### 10.2 已裁决（接受推荐）

1. **URL serializer = A**：`collectionSearch.serializer` 输出 repeated key
   （`filter=a:eq:1&filter=b:in:x,y`），挂 Router 的 `parseSearch/stringifySearch`。
   未知键仍走默认序列化。
2. **Effect = core 零 Effect**：订阅引擎纯 TS；未来如需，放
   `@lynxland/uikit-core/effect` 可选子路径。
3. **`Command` 保留**：不改名 `Action`；CQRS 语义清楚。
4. **默认 preset = npm 包 + `eject`**：`@lynxland/uikit-preset-console` 默认安装，
   `uikit eject preset-console` 后 copy-owned；同一 preset 不混用 install + eject。
5. **契约版本 = 跟 core semver**：第三方 preset/UI adapter 的 contract 跟 core；
   `ui-shadcn`/`ui-plain` 包版本可独立，core/react/surfaces/preset 走 fixed group。
6. **Pagination = 判别联合**：`CollectionWindow` / `CollectionPage`，不用
   `QueryWindow` + `Segment` 可选字段。
7. **meta 包 = 只转发 preset**：`@lynxland/uikit` 只 re-export `preset-console`
   + 必要的 core/react 类型；高级用户走子包。
8. **Base UI 迁移 = uikit-rendered first**：先迁 uikit surfaces/ui-shadcn；
   app-owned Radix（Avatar/DropdownMenu/ScrollArea/Switch 等）同批迁移或明确私有，
   不混入 `ui-shadcn`。

### 10.3 Cutover 完成的定义

- `docs/SKILL.md` 只描述 v3 API，且与 `docs/design.md` 无矛盾。
- `registry.json`/preset 的 stable 项全部有真实消费者引用。
- 两个 console 至少各有一个页面使用 preset 默认页面（或 `PageLayout + View` 手装）。
- `init` 后一个列表页 < 30 行；列表→详情→编辑→删除主路径无手写数据接线。
- 换一个 UI adapter 不改页面代码；拆 preset 页面后行为不回归。
- `pnpm layer-check` 能拦住“控件取数/控件碰 Router/视图碰 Chrome/控件 import 消费方 ui 基元”。
- 一个静态数组可以渲染 `DataTable`；一个纯命令页面不需要 Entity；
  一个纯流页面不需要 Entity；一个表单 Input 不需要 `any`。
- `README`/`llms.txt` 版本与包版本一致。

---

## 附录 A：当前 → 目标映射

| 当前 | 目标 | 处理 |
|---|---|---|
| `Resource` / `defineResource` | `Entity` / `defineEntity` | **删除旧名**；codemod |
| `collection/record/batch` | `CollectionSource/RecordSource/LookupSource` | 重命名 + 类型收窄 |
| `useCollection`（URL） | `useCollectionPage` | 旧名改为页面糖；数据语义归新 `useCollection` |
| `useCollectionData` | `useCollection`（数据） | **删除旧名**；codemod |
| `useRecord` / `useBatch` | `useRecord` / `useLookup` | **删除 `useBatch`**；codemod |
| `useCommand` | `useCommand` | 保留；effects/scope 出 descriptor |
| `useCommandForm` | `useCommandForm` | 保留；`FormSpec<I>` |
| `useSubscription` | `useStream` | **删除旧名**；codemod |
| `SubscriptionDescriptor` | `StreamFactory` | **删除 descriptor union** |
| `CommandDescriptor.invalidates/legacyKeys/scopeOf` | `CommandOptions.effects/scope` | 迁出 |
| `ApiError` plain object | `class ApiError extends Error` | 类化 |
| `QueryWindow` + `Segment` | `CollectionWindow` + `CollectionPage` | 判别联合 |
| `FieldDef<T>` | `FieldView<Row>` + `FieldInput<Input>` + `FilterField` | 三拆 |
| `specOf` | 显式 `collectionSearch` + `FilterField[]` | 删除 |
| `DataTable list` | `DataTable rows/columns/sorting/...` | 受控化 |
| `FilterBar list/fields` | `FilterBar fields/value/onChange` | 受控化 |
| `Pagination` + `KeysetPagination` | `Pager` | 合并 |
| `Page` | `PageLayout` | 可选 Chrome |
| `ListPage` / `ListPanel` | `CollectionView` | View |
| `TablePage` / `TablePanel` | `CrudCollectionPage` 页面模板 | Page Composition |
| `DetailPage` / `DetailPanel` | `RecordView` + `RecordPage` 页面模板 | View/Page Composition |
| `FormPage` / `FormPanel` / `Form` | `FormView` + `Form` 控件 | View/Control |
| `FormDialog` / `FormDrawer` | `Dialog`/`Drawer` + `FormView` 页面模板 | Page Composition |
| `values/` 族 | `values/`（纯值） | 拆出 model/controls |
| `query/` 族 | `controls/` + `views/` | 按呈现层拆 |
| `command/` 族 | `controls/` + `views/` + `templates/` | 按呈现层拆 |
| `subscription/` 族 | `views/` | 重命名 |
| `shell/` 族 | `chrome/` | 重命名 |
| `createHttp` | 可选 `fetch` 增强器 | 降级 |
| `effect` 硬依赖 | 已移除（订阅引擎纯 TS） | 完成 |
| token profiles | UI adapter contract + token contract | 删除 token 重写 |
| `registry/query` 等五族 | `surfaces/` + `preset-console` + `ui-*` | 已删除；CLI eject 拷源码 |
| 无 preset | `@lynxland/uikit-preset-console` 默认页面/壳/字段/CRUD | 新增（开箱即用） |
| 无 UI adapter 抽象 | `packages/ui-shadcn` 默认 + UI adapter contract | 新增（UI 适配） |

## 附录 B：一句话记忆

> **数据面：Query / Command / Stream 是能力，Entity 是可选分组。**
> **呈现面：Value / Control / View / Chrome 是层，Preset 是默认组合，Page Template 是可复制/可生成的特殊页面骨架。**
> **URL 是可选策略，不是读原语的属性。**
> **开箱即用归 preset，UI 适配归 UI adapter，壳可替换，页面模板可 fork。**

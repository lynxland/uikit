# ADR 0001：两条轴、七层模型（v3 架构重写）

- **状态**：Accepted（greenfield cutover；无向后兼容）
- **日期**：2026-11-07
- **取代**：draft-2（归档于 [docs/design-history.md](../design-history.md)）
- **证据**：[概念审计](../audits/2026-11-07-conceptual-audit.md)
- **规范**：[docs/design.md](../design.md)

## 背景

v2 在功能上已经覆盖 Query/Command/Subscription 与 40 个 registry 块，`pnpm check` 全绿，
但真实消费方（fleetly/torchwood）只使用了 12 个块；H/I 两批的
`TablePage`/`TablePanel`/`FieldDef`/`FormDialog`/`FieldGrid` 在生产中 **0 引用**。
审计确认根因不是实现 bug，而是四个层级错位：

1. UI 五族按数据原语分族，导致跨族反向依赖；
2. 页面模板被做成运行时组件（Page/Panel 组合爆炸）；
3. `Resource` 被当成第四原语，实际是可选分组 + 隐藏协议；
4. `FieldDef` 同时承担 Row/Input/URL/三视角，表单边界退化为 `any`。

## 决策

采用**两条轴 + 七层模型**：

- **能力轴（数据面）**：Query / Command / Stream；`Entity` 是可选的命名分组，
  不是第四原语。裸 Source/Command/StreamSource 必须可独立使用。
- **呈现轴（UI 面）**：Value → Control → View → Chrome → Page Composition。
  - Control 收受控 props，不取数、不碰 Router；
  - View 消费绑定句柄，不画页壳；
  - Chrome 拥有 h1/页宽/页头；
  - Page Composition 是页面组合/页面模板，不是稳定组件 API。
- **开箱即用归 preset**：preset 提供默认可运行的
  `PageLayout/AppShell/CollectionView/RecordView/FormView`
  与 `CollectionPage/RecordPage/FormPage/CrudPage`；它们是薄组合，
  可逐层退出到 View/Control/headless。
- **UI 适配归 UI adapter**：Control/View 只依赖 UI adapter contract（Button/Input/Select/
  Dialog/Drawer/Tabs/Card/Table 等）+ token contract；默认 UI adapter =
  **Base UI + shadcn**（一步到位，无 Radix 兼容层），第三方可换 Mantine/Ant/纯 HTML。
- **明确偏好但可退出**：默认 URL 真相、流一等、失败/结果两分、字段基座、
  CRUD dialog；每层都有逃生舱（progressive disclosure）。
- **URL 是可选策略**：数据绑定不 import Router；URL 绑定住在 `react-router` 子路径；
  `useCollectionPage` 是页面级组合糖。
- **效果显式**：缓存失效是 `Effect[]`，不是 Command 的隐藏字段；scope 在绑定层解析。
- **流正名**：`Subscription` → `Stream`；`useSubscription` → `useStream`。
- **字段三拆**：`FieldView<Row>` / `FieldInput<Input>` / `FilterField`。
- **文档单一事实源**：design（规范）/ design-history（历史）/ SKILL（当前 API）/
  audits（证据）/ page-templates（页面模板）/ adr（决策）/ migrations（批次日志）。

## 后果

### 正面

- 依赖图成为 DAG，layer-check 可以真正执法“控件零数据/零路由”“视图不画壳”。
- 一个静态数组可以渲染 DataTable；一个纯命令页面/纯流页面不需要 Entity。
- 表单 Input 类型与 Row 类型解耦，消除 `any` 与 `Record<string, unknown>`。
- 默认 preset 提供开箱即用页面；fleetly 的 `PageFrame`、torchwood 的
  `PageCard/PageHeader` 仍可作为应用 Chrome 替换默认 `PageLayout`。
- UI adapter contract 让同一套 Control/View 适配不同 UI 设计，不再靠 token 类名重写。
- registry/preset 的 stable 面收缩到真实使用过的项，减少维护与文档负担。

### 负面/成本

- 这是一次 **greenfield cutover**：`useCollection` 语义、`Resource`、`FieldDef`、
  `Page`/`*Page`、`useSubscription` 都会**直接删除**，不保留别名/双 API。
- uikit 与两个消费方必须同批迁移；中间不发布兼容版本。
- 需要新增 `react-router` 子路径、控件受控化、Effect 可选化等工程工作。
- v2 文档只作历史证据；`SKILL.md` 在 cutover 后重写为 v3，不维护双版本。

## 拒绝的替代方案

| 方案 | 拒绝理由 |
|---|---|
| 继续在 v2 上打补丁（再加 hook/再加 lint） | 审计显示症状同根：层级轴错位；补丁会继续增加概念税 |
| 保留五族，只重命名 | 族是分发目录，不是依赖层；重命名不改变跨族依赖 |
| 保留 Page/Panel 组合糖，只统一 props | 页面模板不是组件；组合糖是浅模块，无法消除双壳/双 h1 |
| 保留 FieldDef 三视角，只加泛型 | Row/Input/URL 是三个模型；加泛型只会把 `any` 藏得更深 |
| 把 UI 做成 headless-only，完全不管页面 | 消费方需要开箱即用的默认页面；完全 headless 无法统一 UX |
| 把 preset 页面放进 core 作为稳定组件 | core 应保持能力契约；preset 是 opinionated 默认值，必须可 fork/退出 |
| 只支持一种 UI 库（如 shadcn） | 第三方与不同设计系统需要 UI adapter seam；锁死 UI 违背开源定位 |

## Cutover

见 [design.md §8](../design.md) 与 [cutover plan](../migrations/v3-execution-plan.md)。关键门：

- Batch 0：文档/决策（本次）——运行时代码不动。
- Batch 1：core greenfield（直接删除旧 kernel/schema/adapters/react 形态）。
- Batch 2：registry greenfield（直接删除旧 Page/Panel/FieldDef 目录语义）。
- Batch 3：demo + fleetly + torchwood 同批迁移；不发布中间兼容版本。
- Batch 4：删除旧导出/旧文档；SKILL 重写为 v3。

**没有“兼容层”阶段**：codemod 只改消费方源码，不改 uikit 公开面。

## 已接受推荐裁决

1. URL serializer：repeated key。
2. Effect：core 零 Effect；订阅引擎纯 TS。
3. `Command`：保留，不改名 `Action`。
4. 默认 preset：npm 包 + `eject`（同一 preset 不混用 install + eject）。
5. 第三方 preset/UI adapter 契约：跟 core semver；包版本可独立。
6. Pagination：判别联合。
7. meta 包 export：只 preset。
8. Base UI 迁移：uikit-rendered first；app-owned Radix 同批或私有。

`Resource` 删除、无向后兼容、preset 开箱即用、UI adapter = Base UI + shadcn、
`ui-shadcn` 独立版本已裁决，不在开放项内。

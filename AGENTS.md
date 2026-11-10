# AGENTS.md — @lynxland/uikit 开发指南

> 面向在本仓库工作的 AI agent 与人类贡献者。
> **当前规范**见 [docs/design.md](docs/design.md)（v3，2026-11-07）；设计立场见
> [docs/philosophy.md](docs/philosophy.md)；旧 draft-2 已归档为
> [docs/design-history.md](docs/design-history.md)，只作历史证据，不是当前事实源。
> 概念审计见 [docs/audits/2026-11-07-conceptual-audit.md](docs/audits/2026-11-07-conceptual-audit.md)。
>
> **重要**：v3 是 **greenfield cutover，不向后兼容**。Batch 1 已完成：
> `packages/core` / `packages/react` / `packages/testing` 已是 `3.0.0` 的 v3 形态
> （零 Effect、无 React 的 core；Router 只在 `react/router`）。
> `apps/demo` 已切到 v3；v2 `registry/**` / devtool 已删除，copy-owned 走
> `@lynxland/uikit-cli eject`。
> 从本文件生效起：不得新增 v2 形态的 Page/Panel/FieldDef 抽象，
> 不得写 deprecated 别名/双 API/运行时兼容层；旧 API 由同批 codemod 改消费方后删除。

## 仓库结构

```
packages/core            @lynxland/uikit-core         kernel/schema/adapters（无 React）
packages/react           @lynxland/uikit-react        data/command/stream 绑定 + /router
packages/surfaces        @lynxland/uikit-surfaces     values/controls/views/chrome/fields + UiAdapter contract
packages/ui-shadcn       @lynxland/uikit-ui-shadcn    Base UI + shadcn 基元/token（默认 UI adapter）
packages/ui-plain        @lynxland/uikit-ui-plain     无 Tailwind 的最小 adapter（契约验证/自定义参考）
packages/preset-console  @lynxland/uikit-preset-console 默认页面/视图/壳/字段/CRUD
packages/testing         @lynxland/uikit-testing      测试 harness
packages/cli             @lynxland/uikit-cli          init/eject/doctor（Node 工具）
packages/meta            @lynxland/uikit              一键安装 meta（转发 preset）
spikes/v3-api            v3 API spikes（URL serializer / source identity / CrudPage 类型；常驻回归 pnpm spike:v3）
apps/demo                活文档 + `/dashboard/*` 严格 Dokploy clone；mock collection/command/stream 驱动
docs/                    philosophy.md（理念）/ design.md（规范）/ design-history.md（归档）/ SKILL.md / audits / migrations / adr
```

**分发**：v3 不再有 `registry/` 五族目录；copy-owned 由
`@lynxland/uikit-cli eject surfaces|preset-console` 拷源码，UI adapter 保持 npm。
目标分层与依赖规则见 design.md §2 与 §7。

## 分层不变量（目标规则；`pnpm layer-check` 分阶段落地）

1. **两条轴不许混**：数据能力（Query/Command/Stream）≠ UI 呈现层
   （Value/Control/View/Chrome/Page Composition）。
2. **依赖单向**：L2 contracts ← L3 adapters ← L4 bindings ← L5 controls/views
   ← L6 chrome ← L7 page composition；禁止反向 import。
3. **控件零数据/零路由**：`packages/surfaces/src/controls/**` 禁 `useQuery`、
   `useNavigate`、`window.history`、绑定句柄；控件只收受控 props。
4. **视图不画壳**：`packages/surfaces/src/views/**` 不渲染 h1/页头/页宽；
   壳归 `surfaces/src/chrome` 或应用。
5. **URL 绑定可选**：`packages/react/src` 禁 Router；`packages/react/src/router/`
   才做 search 编解码与写入。
6. **无隐藏协议**：公开类型禁 `__resource`/`__scopeKeys`/`__id`；缓存效果是显式 `Effect[]`。
7. **kernel 零运行时依赖、零 React**；`react`/`surfaces` 禁 Effect；
   Effect 只允许住在可选适配器子路径（目标：core 不硬依赖）。
8. **surfaces 不 import 具体 UI 库**：只依赖 `UiAdapter` contract；`ui-shadcn` 实现它。
9. **块不含业务实体名、不自带数据获取**（只消费绑定输出或受控 props）。

## 常用命令

```
pnpm check          # layer-check + doc-check + typecheck + size-check + test + v3 spike（提交前必绿）
pnpm spike:v3       # v3 API spikes（URL serializer / source identity / CrudPage 类型）
pnpm --filter demo dev   # demo 起 5173
pnpm --filter demo e2e   # Playwright（URL 即真相的行为验收）
pnpm --filter @lynxland/uikit-cli build
node packages/cli/bin/uikit.mjs init --to <consumer-root>
node packages/cli/bin/uikit.mjs eject surfaces|preset-console --to <consumer-root> [--force]
cd <consumer-root> && node /path/to/uikit/packages/cli/bin/uikit.mjs doctor
```

## 关键约定（速查；完整规则以 design.md §1–§6 为准）

- **两条轴**：数据面三能力 Query / Command / Stream；呈现面五层
  Value / Control / View / Chrome / Page Composition。`Entity` 只是可选分组（`Resource` 已删除），
  不是第四原语。
- **开箱即用归 preset**：`@lynxland/uikit-preset-console` 提供默认可运行的页面/视图/壳/字段/CRUD；
  core 不含页面。preset 是薄组合，必须可逐层退出到 View/Control/headless。
- **UI 适配归 UI adapter**：`packages/ui-*` 提供 Button/Input/Select/Dialog/Tabs/Card/Table 等基元 +
  token contract；控件只依赖 UI adapter，不 import 消费方 `@/components/ui/*`，不做 token 类名重写。
- **明确偏好但可退出**：默认 URL 真相、流一等、失败/结果两分、字段基座、CRUD dialog；
  每一层都要有逃生舱（progressive disclosure）。
- **URL 是可选策略**：数据绑定（`useCollection` 等）不碰 Router；URL 绑定住在
  `react-router` 子路径（`useCollectionPage` / `useSearchState`）。
- **壳归 preset/应用**：`PageLayout` 或消费方自有壳唯一拥有 h1/页宽/页头；
  core View 不画壳；preset 页面（`CollectionPage` 等）是薄组合，可被
  `PageLayout + View` 手装替换；它们不是 core 稳定组件。
- **控件受控**：DataTable/FilterBar/Pager/Tabs 收 rows/columns/value/onChange；
  不拿 `CollectionHandle`，不取数、不碰 Router/URL。
- **字段三拆**：`FieldView<Row>`（列表/详情）、`FieldInput<Input>`（表单）、
  `FilterField`（过滤控件）。`FieldDef<T>` 的“一份声明驱动三视角”只是可选便利层，
  不得让 Input 退化成 `any`，也不得用 `specOf` 反向生成唯一 URL schema。
- **失败/结果两分**：`ApiError`（Error 子类，封闭 kind）走失败通道；
  `Outcome/CommandResult` 走返回值。预期内拒绝不是异常。
- **效果显式**：缓存失效是 `Effect[]`（invalidate/invalidateKey），不是
  CommandDescriptor 的隐藏字段；scope 在绑定层解析，读写失效同源。
- **流正名**：`Stream`（游标帧流），不是 pub/sub；`useSubscription` 旧名已删除
  （无别名）。
- **文档单一事实源**：`design.md` 规范；`design-history.md` 历史；`SKILL.md` 当前 API；
  `audits/` 证据；`page-templates/` 页面模板；`adr/` 单条决策；`migrations/` 批次日志。
- 反模式与幻觉诱饵见 design.md §9（旧 §13/§14 已归档）。

## 已知事项

- **文档漂移是本仓库的头号历史缺陷**：README/llms/SKILL 曾长期与代码/design 不一致。
  改 API 时同批更新 `docs/design.md`、`docs/SKILL.md`、README/llms 的状态行；
  v3 cutover 期在 PR 描述里注明“v2 删除 / v3 替换”，不得新增兼容层。
- pnpm 12.9.1：workspace yaml 需含 `minimumReleaseAgeExclude` 段，否则首次 catalog 解析报误导性错误。
- DataTable 暂走 `@tanstack/react-table/legacy`（双 console 现行用法）；迁 v9 原生 features 是块内改动。
- Table v9 / router plugin 1.168；v3 core **已移除 Effect**，订阅引擎为纯 TS。
- demo 的 Tailwind v4 扫描：`apps/demo/src/styles.css` 显式声明
  `@source "../../../packages/ui-shadcn/src"` 与
  `@source "../../../packages/surfaces/src"`（相对该文件三层到仓库根）；
  动 styles.css 位置时注意。
- v2 `registry/**` / `scripts/devtool.*` 已删除；copy-owned 由 `@lynxland/uikit-cli` 的
  `eject` 负责，UI adapter 保持 npm。changesets/release 仍是 Batch 4 收口项。
- Effect v4 的历史陷阱（Schedule 无 resettable、`runIntoQueue` 完成语义）已归档；
  v3 不再使用 Effect，这两条随实现退役。

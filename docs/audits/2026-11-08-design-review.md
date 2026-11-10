# v3 设计复审（2026-11-08）

> 复审对象：[`docs/design.md`](../design.md) / [`docs/philosophy.md`](../philosophy.md) /
> 包拆分 / Base UI + shadcn 迁移 / 开源发布面。
>
> 结论：**方向稳定，但还有 10 类需要修正或补充的洞。**
> 其中 10 类已在本次复审中补进设计；8 个策略项已按推荐裁决（见 §4）。

---

## 0. 复审方法

- 对照真实消费方（fleetly / torchwood）的页面形状与依赖。
- 对照 v2 代码与 v3 目标 API，找“概念上说了、实现上无法落地”的洞。
- 对照包拆分 / Base UI / 开源发布面，找“结构上说了、工程上缺件”的洞。
- 检查文档内部一致性（命名、层级、包名、路径、状态）。
- `pnpm check` 当前全绿；本次只改文档 + demo 文案，不改运行时逻辑。

---

## 1. 已修正的 P0/P1（本次已补进 design.md）

### 1.1 Source 没有稳定标识 → 裸 source 无法生成 query key（P0）

**问题**：v3 说“可以只用裸 `CollectionSource`，不必造 Entity”，但
`CollectionSource` 只有 `read`，没有 `name`/`scope`；`useCollection(source, request)`
无法生成稳定 query key，也无法做 scope 分区/自动停用。

**修正**：
- 新增 `SourceName` branded type。
- `CollectionSource`/`RecordSource`/`LookupSource` 都带公开 `name` + 可选 `scope`。
- 新增 `collectionSource({ name, scope, read })` 等工厂。
- `defineEntity` 的 spec 接收 `Omit<Source, "name"|"scope">`，由 `defineEntity`
  附加/校验 `name`/`scope`；query key 只认 source 的公开字段。
- `Effect.entity` 类型改为 `SourceName`，不再用裸 `string`。

### 1.2 Record/Lookup 的 not-found / missing 语义没定（P0）

**问题**：`RecordSource.read` 返回 `T | null`，但 `RecordHandle` 没有 `empty` 状态；
`LookupSource` 缺失 id 时行为没写；`useRecord` 的 `id: undefined` 状态没写。

**修正**：
- `RecordHandle` 状态扩展为 `idle | loading | empty | error | success`；
  `null` = empty，适配器若要把 404 当失败则 throw `ApiError`。
- `useRecord` 的 `id` 为 `undefined` = idle / 不请求。
- `LookupHandle` 增加 `missingIds`；`byId` 缺失回退由页面/`ReferenceValue` 决定。
- `CollectionHandle` 增加 `emptyReason: "source" | "filter"`。

### 1.3 URL 数组序列化 / namespace 没定（P0）

**问题**：
- v2 的 `filter`/`sort` 是数组，TanStack 默认 JSON 编码成 `%5B%22...%22%5D`；
  v3 文档说 repeated key，但未定序列化机制。
- 多集合同路由的 `namespace` 在 v2 存在，v3 设计漏了。

**修正**：
- `collectionSearch` 增加 `namespace`；URL 键带扁平前缀，各 schema 只读自己的前缀。
- 明确给出 A/B 两个方案：
  - A（推荐）：`collectionSearch.serializer` 提供 repeated-key 的
    `parseSearch/stringifySearch`，挂 Router；
  - B：接受 TanStack 默认 JSON 数组并写明。
  - 不能两套并存；v3 一次定死（待裁决，见 §4）。
- `combineSearch` 保留，并要求重复键检测。

### 1.4 Cursor 分页的 prev 策略没定（P1）

**问题**：v3 说控件不碰 `window.history`，但 cursor prev 不能本地算；
`useCollectionPage` 的 prev 策略没写。

**修正**：
- 新增 `PagerModel { mode, canPrev, canNext, pageSize, prev, next, setPageSize }`。
- offset：prev = 上一 offset；cursor：prev = URL 绑定层 `router.history.back()`；
  all：无 pager。
- `Pager` 控件只收 `PagerModel`，不 import Router/不碰 `window.history`。
- 深链 cursor 的历史为空 → prev 退化不可用，成文。
- 页大小：offset 回第一页；cursor 保留锚点。

### 1.5 缺少 Surface styles contract（P1）

**问题**：
- 说“Tailwind 不是 core 契约”，但 surfaces 的布局/间距/状态样式没着落；
- `UiAdapter` 只覆盖 primitives + tokens，不覆盖 CollectionView/DataTable 等结构样式；
- npm 安装 surfaces 时，消费方 Tailwind 需要扫描源码，否则类名不生效。

**修正**：
- `@lynxland/uikit-surfaces` 导出 `surfaces.css`：语义结构类 + CSS 变量，不依赖 Tailwind。
- `@lynxland/uikit-ui-shadcn` 导出 `tokens.css` + primitives。
- `preset-console` 同时引入两者；所有 surface 组件接受 `className`/`classNames`。
- Tailwind 消费方需把 `@lynxland/uikit-surfaces/src` 加 `@source`/content；`doctor` 检测。
- `ui-plain`/自定义 adapter 可不使用 Tailwind。

### 1.6 `CrudPage` 的类型面仍是 v2 味道（P1）

**问题**：v3 反复说“不要 `Command<any>` + `FieldDef<T>`”，但 preset `CrudPage` 没有具体类型面，
很容易回退到 v2 `TablePage`。

**修正**：
- 新增 `CrudPageProps<Row, CreateInput, UpdateInput, DeleteInput>` 与
  `CrudFields<Row, CreateInput, UpdateInput>`。
- create/update/delete 的 Input 独立；`toInput(row)` 显式映射。
- 默认 delete input = `getRowId(row)`；update 默认不猜，必须 `toInput`。
- create/update 字段集可不同，不强行一份 `FieldDef<T>`。

### 1.7 包拆分 / 根包名 / eject 矩阵没说透（P1）

**问题**：
- 根 `package.json` 当前名就是 `@lynxland/uikit`（private），但 meta 包也要叫这个名字；
- `ui-shadcn` 既说 npm 又说 eject，preset 的 import 会指向哪一份？
- fixed group 把 UI adapter 也锁死，但 UI adapter 需要跟 Base UI/shadcn 演进。

**修正**：
- 根包改名 `@lynxland/uikit-workspace`（private）；`packages/meta` 才是 `@lynxland/uikit`。
- eject 矩阵：
  - core/react 只 npm；
  - surfaces / preset-console 可 npm 或 eject；
  - ui-shadcn / ui-plain 只 npm（或第三方自定义 `ui-*` 包），不 eject 默认 adapter；
  - testing/cli 只 npm。
- 版本：
  - fixed group = core/react/surfaces/preset-console；
  - 独立版本 = ui-shadcn/ui-plain（跟 Base UI/shadcn）、testing、cli；
  - meta 跟 preset 同版本。

### 1.8 UI Adapter contract 太“原始”（P1）

**问题**：`Dialog: Component<DialogProps>` 这种写法可能把 Base UI 的
`Root/Trigger/Portal` 直接泄漏给 surfaces；`Select`/`Tabs` 的 controlled API 也没定。

**修正**：
- 明确 UI adapter 是 **受控 wrapper**，不是原始 UI 库 API。
- 给出 Button/Input/Select/Checkbox/Dialog/Drawer/Tabs/Badge/Card/Skeleton 的最小 props 表。
- Dialog/Drawer 内部负责 portal/focus/Esc；Select/Tabs 不暴露 compound API。
- `UiAdapter` 类型 + Provider 在 surfaces；`shadcnAdapter` 在 ui-shadcn。
- 增加 surface styles contract（见 1.5）。

### 1.9 命名收口（已修正）

- `Skin` → **UI Adapter**；`@lynxland/uikit-ui-shadcn`。
- `Recipe` → **Page Template（页面模板）**；`patterns/` → `templates/`；
  `docs/recipes/` → `docs/page-templates/`；`status: recipe` → `status: template`。
- L7 `Pattern` → **Page Composition（页面组合）**，避免“Pattern/Recipe”两个抽象词。
- Demo 的 `Recipes` 导航、`wizard recipe`、`Dashboard recipe` → `Examples`/`example`。

### 1.10 开源发布件缺失（P1）

复审前仓库没有 `LICENSE`、`CONTRIBUTING.md`、`SECURITY.md`、`.github/` CI/模板；
`package.json` 有 MIT 声明但没有 LICENSE 文件。作为开源项目，这是必须补的。

**修正**：本次已补 `LICENSE` / `CONTRIBUTING.md` / `SECURITY.md`；
design §7.6 与 execution plan Batch 4 仍列 `.github/` CI/模板、CODE_OF_CONDUCT、
changesets/release workflow、publint/净房冒烟。

---

## 2. 仍需补充的 P2（建议但不阻塞）

### 2.1 文档长度

`docs/design.md` 已 ~1700 行；虽然规范/历史/审计已分开，但 design 仍可再拆：
`design/core.md` / `design/ui.md` / `design/packages.md` / `design/migration.md`。
1.0 前建议拆一次；现在不阻塞。

### 2.2 UI Adapter 的 Popover/Tooltip

FilterBar 的多选 popover、DataTable 的 view-options 可能用 Popover；当前 contract 标为可选。
建议 v3 首发就纳入 `Popover`（受控 open/onOpenChange/anchor/children），避免 surfaces 自绘遮罩。

### 2.3 Surface CSS 的 Tailwind 扫描

如果 `ui-shadcn` 的 primitives 用 Tailwind，消费方必须把 npm 包源码加入 `@source`/content；
`doctor` 应检查这一点。`ui-plain` 应该完全不依赖 Tailwind，作为“非 Tailwind 设计系统”的验证。

### 2.4 Base UI 迁移范围

两个 console 的 `@radix-ui/*` 不止 uikit adapter 用到的那些：
Avatar/DropdownMenu/ScrollArea/Switch/Label/Separator/Slot 等可能是 app-owned。
建议：
- uikit `ui-shadcn` 只覆盖 contract 内的 primitives；
- app-owned Radix 组件同批迁移到 Base UI，或明确保留为应用私有（不进 uikit）；
- 增加焦点/Esc/键盘/e2e a11y 回归。

### 2.5 `Page Template` 与 `Preset` 的边界

已定义：
- Preset = 可安装的默认页面/组件；
- Page Template = 可复制/可生成的特殊页面骨架。
建议在 `devtool` 文案中也用这两个词，避免“模板/配方/示例”混用。

### 2.6 `@lynxland/uikit` meta 包的 export 面

meta 只 re-export preset，还是也 re-export core/react/surfaces？
建议：
- `@lynxland/uikit` 只 re-export `preset-console` + 必要的 core/react 类型；
- 不 re-export 所有东西，避免 meta 变成新的 god package。
- 高级用户走子包。

### 2.7 版本矩阵

`@base-ui/react`、`@tanstack/*`、React、Tailwind 的支持矩阵要成文；
`ui-shadcn` 独立版本时，peer range 与 surfaces contract 的兼容窗要明确。

### 2.8 `effect` 去留

仍开放。建议 core 零 Effect；订阅引擎纯 TS；如保留放 `@lynxland/uikit-core/effect` 子路径。
在决定前，Batch 1 不要把 Effect 带进新 core。

### 2.9 URL serializer 方案

仍开放 A（repeated key） vs B（JSON 数组）。建议 A，但需要确认 TanStack Router
的 `parseSearch/stringifySearch` 接入形态；先写一个 spike 再定。

### 2.10 包名/术语一致性

- `surfaces` 是设计术语，不是所有人都懂；但它是 L5/L6 的准确总称。
- `ui-shadcn` 是 adapter 包，不是“又一个 UI 库”。
- 建议 README 用一句话解释：`surfaces = UI 组件；ui-shadcn = 皮肤/基元适配`。

---

## 3. 风险登记（按影响排序）

| 风险 | 影响 | 缓解 |
|---|---|---|
| Base UI 迁移面大于 uikit（app-owned Radix） | 一次性 cutover 可能拖大 | 先 inventory；uikit adapter 与 app-owned 分开；同批迁移或明确私有 |
| `surfaces` 的 CSS/Tailwind 扫描 | 消费方样式不生效 | `surfaces.css` + `@source` 文档 + doctor 检查 |
| `UiAdapter` contract 设计不足 | 第三方 UI 适配困难 | 受控 wrapper 表 + ui-plain 作为第二实现验证 |
| `CrudPage` 回到 god component | 重演 v2 | 强制 `CrudPageProps` 类型面 + 逐层退出 + 真实消费者验收 |
| 包数量/版本矩阵 | 发布与安装复杂 | fixed group + 独立 UI adapter + meta |
| URL serializer 未定 | 深链/数组行为不一致 | spike 后一次定死 A/B |
| 开源发布件缺失 | 不能真正开源 | Batch 4 清单 + CI/release |

---

## 4. 已接受的推荐裁决

1. **URL serializer = A**：repeated key。
2. **Effect = core 零 Effect**；订阅引擎纯 TS。
3. **`Command` 保留**，不改名 `Action`。
4. **默认 preset = npm + eject**。
5. **第三方 preset/UI adapter contract 跟 core semver**；包版本可独立。
6. **Pagination = 判别联合**。
7. **meta 包只转发 preset**。
8. **Base UI 迁移 = uikit-rendered first**；app-owned Radix 同批或私有。

已定：`ui-shadcn`/`ui-plain` 可独立版本；默认 UI adapter = Base UI + shadcn；
`Page Template` / `Page Composition` / `UI Adapter` 命名；无向后兼容。

下一步：三个 API spike（URL serializer / source identity / CrudPage 类型面）。

---

## 4.1 Spike 结果（2026-11-08）

三个 spike 已落地在 `spikes/v3-api/`，`pnpm spike:v3` 全绿（10 tests）：

1. **URL serializer**
   - repeated key + namespace + unknown key 往返通过；
   - TanStack Router `parseSearch/stringifySearch` 集成通过（`buildLocation` 产出 repeated key）；
   - 发现：`stringifySearch` 必须返回带前导 `?` 的字符串；单元素数组 parse 后是 scalar，
     `decode` 必须 `toArray` 归一。已回写 design §4.2。
2. **Source identity**
   - `collectionSource({ name, scope, read })` + `defineEntity` 可用；
   - 发现：query key 的 scope 必须**只投影声明的 scope 键**，否则命令 scope 里的 appId
     会污染读键（spike 首跑失败并修正）。已回写 design §5.1。
3. **CrudPage typing**
   - `FieldView<Row>` / `FieldInput<CreateInput>` / `FieldInput<UpdateInput>` 三拆通过；
   - 发现：`Command.run` 必须是函数属性，不能是方法签名（方法参数 bivariant 会让
     `Command<UpdateInput>` 静默赋给 `Command<CreateInput>`）。已回写 design §4.3。

未覆盖：TanStack Router 的完整 navigate/mount 行为、React 渲染、Base UI wrapper、
包拆分/发布机制——这些进 Batch 1/2。

## 5. 本次复审的产出

- 更新 `docs/design.md`：source 标识、record/lookup 语义、URL namespace/serializer、
  PagerModel、surface styles、CrudPage 类型面、UI adapter wrapper、包/版本/eject、
  开源发布清单。
- 更新 `docs/philosophy.md`、`docs/adr/0001...`、`docs/migrations/v3-execution-plan.md`。
- 更新 README/AGENTS/SKILL/llms 的命名与包名。
- Demo 文案 `Recipes` → `Examples`，`recipe` → `example`。
- 新增 `LICENSE` / `CONTRIBUTING.md` / `SECURITY.md`。
- 新增 `spikes/v3-api/`（URL serializer / source identity / CrudPage 类型）并挂入 `pnpm check`。
- `pnpm check` 全绿。

下一批建议：先做 **URL serializer + source identity + CrudPage 类型面** 的 API spike，
再开 Batch 1 重写；这三处是后面所有页面/表单/包结构的地基。

---

## 6. 实施结果（2026-11-08）

- **Batch 1**：`core` / `react` / `testing` 全部 greenfield 重写为 `3.0.0`；
  core 零 React/Effect，Router 只在 `react/router`。
  - core 44 tests；react 31；testing 7（含 `renderCollection` / `renderSearchState`）。
  - 修复两个 spike 暴露的接口：`LookupSource.key`、`collectionSearch.defaultPage`。
- **Batch 2**：`surfaces`（values/controls/views/chrome/fields + `UiAdapter`）、
  `ui-shadcn`（Base UI 1.9）、`ui-plain`（无 Tailwind 参考 adapter）、
  `preset-console`（7 pages）、`meta`（`@lynxland/uikit`）。
  - surfaces 72 tests；ui-shadcn 24；ui-plain 24；preset 30。
  - `PageLayout` 唯一 h1；controls 零数据/零 Router；views 零 h1。
- **Batch 3 demo**：`apps/demo` 全量切到 v3 preset/surfaces/ui-shadcn；
  URL/CRUD/detail/edit/scope/events/logs/wizard/settings 全部可运行；
  Playwright **25 tests** 通过；`pnpm check` 已重新纳入 demo typecheck。
- **文档**：`docs/SKILL.md` / README / README_ZH / llms 全部切到 v3；
  `docs/page-templates/` 提供 Collection/CRUD/Record/Form/Events/Custom adapter 六份模板；
  `CODE_OF_CONDUCT.md` + `.github/workflows/ci.yml` 已补。
- **剩余（Batch 4）**：`@lynxland/uikit-cli` 的 init/eject/doctor、v2 `registry/**` 删除与
  v3 copy manifest、changesets/release workflow、fleetly/torchwood 外部仓同批迁移。

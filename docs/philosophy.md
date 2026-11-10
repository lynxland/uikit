# @lynxland/uikit 设计理念

- **日期**：2026-11-07
- **状态**：v3 设计立场（dogfooding 阶段；允许破坏性重构，不考虑向后兼容）
- **规范**：[docs/design.md](./design.md)
- **证据**：[概念审计](./audits/2026-11-07-conceptual-audit.md)

> 这不是“功能清单”，而是做取舍时使用的判据。  
> 当两个方案都“能实现”时，用这里的顺序裁决。

---

## 0. 一句话立场

**uikit 是一个 opinionated console toolkit：headless 能力契约 + 默认 preset + 可替换 UI adapter + copy-owned views/page-templates。**

它不是通用 Admin 框架，也不是“无观点的组件库”。  
它比 refine/react-admin 更进一步的地方，不是功能更多，而是：

1. **有明确偏好**：数据密集、URL 真相、流/帧一等、失败/结果两分、类型诚实。
2. **开箱即用**：preset 直接给可运行的列表/详情/表单/流页面。
3. **每层可退出**：从 preset 页面逐层降到 View / Control / headless binding / adapter。
4. **适配不同 UI**：UI adapter contract 把行为与视觉基元分开，不靠 token 类名重写。
5. **对第三方开放**：core 契约稳定；preset 可 fork；UI adapter 可替换；业务实不出现在 core。

四句话展开：

1. **数据能力归数据面**：Query / Command / Stream 是可组合的能力，不决定 UI 长什么样。
2. **呈现归呈现面**：Value / Control / View / Chrome，依赖只向下。
3. **开箱即用归 preset**：默认页面/壳/字段/动作是 opinionated 的组合，不是 core 契约。
4. **UI 适配归 UI adapter**：控件只依赖 UI adapter contract；默认是 Base UI + shadcn，第三方可换 Radix、Mantine、Ant Design、纯 HTML。

**我们的明确偏好（默认 preset 体现，不写进 core 契约）**：

- 数据密集 console 优先，不是通用 CMS/电商后台。
- 页面级查询状态 **URL 即真相**；翻页 push、自由过滤 replace。
- **流/帧一等**：游标续订、断档重锚、退避/暂停/终止是内置语义，不是 pub/sub 回调。
- **失败/结果两分**：预期内拒绝是返回值，不是异常。
- **显式效果**：缓存失效是数据声明，不藏在命令 descriptor 里。
- **字段基座**：列表/详情/表单默认由字段声明派生，槽覆盖。
- **CRUD 默认 dialog**（也支持 drawer/page）；默认同步等待，不做 undo/乐观更新。
- **类型诚实**：Row / Input / URL State 分离；不靠 `any` 换开发速度。

---

## 1. 十四条设计原则

### P1. 两条轴，不许互相镜像

- **能力轴**：Query（读）/ Command（写）/ Stream（听）。
- **呈现轴**：Value（值）→ Control（受控控件）→ View（绑定视图）→ Chrome（壳）→ Page Composition（页面组合）。

旧 uikit 把 UI 五族做成 Query/Command/Subscription/Resource/Shell 的镜像，
结果 query 族 import command 族、values 族 import 数据层。**族是分发目录，不是层。**

### P2. 深模块，不要 god object

一个模块的接口应当远小于它的实现。用“删除测试”判断：

- 删除 `ListPanel` 后复杂度不会消失到调用方——它是浅透传。
- 删除 `Resource` 后，query key/失效/scope 的复杂度会重新出现——它有一个真实的 seam，
  但接口太大（5 个泛型 + 7 个职责 + `__` 内部字段）。正确做法是**拆能力**，
  不是继续给 god object 加字段。

**规则**：新增一个公开名词前，先证明它不是既有能力的别名、不是透传包装、
不是页面模板的运行时化。

### P3. 组合优于配置；preset 可以做薄配置

- **core/controls/views 是组合**：页面是 React 组合，控件是受控 props。
- **preset 可以薄配置**：`CollectionPage`/`CrudPage` 允许声明 `fields`/`crud`/`host` 等，
  但它只做“组合 + 默认值”，不实现业务、不取数、不藏页面框架。
- 配置只用于**声明数据形状/默认组合**（FieldView/FieldInput/FilterField/Page 页面模板参数），
  不用于声明整页行为或业务规则。

**反例**：v2 `TablePage` 同时配置列、过滤、分页、四态、CRUD、弹窗宿主、动作槽，
并且把数据读取/URL/字段/表单焊在一起——这已经是页面框架，不是组件。

**正例**：v3 `CollectionPage` 是 preset 里的薄组合：
`PageLayout` + `CollectionView` + `useCollectionPage` + 可选 CRUD 槽。
它可以被 `CollectionView` / `PageLayout + DataTable` / 纯 headless 逐层替换。

### P4. 显式 seam，不要隐藏协议

- 不允许 `__resource` / `__scopeKeys` / `__id` 进入公开类型。
- 不允许用“有没有 policy 字段”判别 descriptor 与 transport。
- 缓存失效是显式 `Effect[]`；scope 是显式绑定选项；错误是 `ApiError` 类。
- 如果一个信息需要靠约定/注入/运行时嗅探才能拿到，它就不是契约。

### P5. 壳默认由 preset 提供，可被应用替换

- **core/View 不渲染** `h1`、页宽、页头、页面衬垫。
- **preset 提供默认 `PageLayout`/`AppShell`**，让开箱即用页面完整可运行。
- **应用可替换**：fleetly 的 `PageFrame`、torchwood 的 `PageCard` 可以继续用；
  只要遵守“一个页面一个 h1/一个页头”的规则。
- 一个页面只有一个 h1 / 一个页头；View 和 Chrome 不争同一个职责。

**理由**：fleetly 与 torchwood 已经各自长出了页面壳。v3 不强行统一它们，
但 preset 必须提供一个默认壳，否则“开箱即用”不成立。统一 UX 优先统一
“内容视图 + 默认页面模板”，壳可以替换。

### P6. URL 是策略，不是原语

- 数据绑定不 import Router；`useCollection` 只读数据。
- URL 绑定住在 `react-router` 子路径；`useCollectionPage` 是页面级组合糖。
- “URL + 默认值即真相”是页面策略，不是 Query 的属性。
- 控件不碰 `window.history`；分页 prev 的历史栈策略归页面/组合糖。

### P7. 类型是契约，不是装饰

- Row、Command Input、CollectionState 是三个模型；不许用一份 `FieldDef<T>` 假装它们相同。
- 表单 Input 必须是独立类型；`any` / `Record<string, unknown>` 不允许出现在公开表单边界。
- 查询键、失效目标、scope 键用 branded/nominal 类型或单源工厂，不手拼字符串。
- 类型安全不是“编译能过”，而是“错误写法编译不过”。

### P8. 拷贝制 UI + UI adapter 适配；不搞类名重写魔法

- 无头核心 npm 源码分发；UI 单元 copy-owned。
- **UI adapter contract**：Button/Input/Select/Checkbox/Dialog/Drawer/Tabs/Badge/Card 等
  由 UI adapter 提供；第一方默认 UI adapter = **Base UI + shadcn**（一步到位；现网 Radix 同批迁移），第三方可替换。
- **Token contract**：统一语义变量（`--background`/`--card`/`--muted-foreground`/
  `--border` + `--status-*`/`--chart-*`）；不靠 `devtool` profile 重写 token 类名。
- **逐实例覆盖四件套**：`className`/`classNames`、`render`/`asChild`、ReactNode/函数槽、
  `data-*` 状态属性；不要求 fork 整个块才能改一个间距/结构。
- 适配不同 UI 设计不靠“重写源码”，靠 UI adapter + token + 槽位 + render 组合。
- 拷贝后代码归消费方；不承诺“上游升级自动 merge”。`diff` 只做提示，不做 AST 魔法。

### P9. 采纳先于抽象

- demo 是冒烟测试，不是第二消费者。
- 新抽象进入 `stable` 前，必须有真实 console 页面引用；只有 demo 的进 `pilot`。
- 只有文档/示例的进 `template`，不导出为稳定 API。
- 删除“为了对称/为了完整/为了竞品有”的组件；组件数量不是 KPI。

### P10. 借用引擎，不重造引擎；只在 seam 上变薄

- TanStack Query/Table/Form/Router 是引擎；uikit 只做绑定与呈现。
- 不在引擎上再包一层同名抽象（`useTable`、`useForm`、`routerProvider` 之类）。
- 绑定层的价值是：统一契约、统一错误/结果、统一 URL 策略、统一 UI 词汇。
- 引擎能做的（缓存、去重、分页状态机、表单校验）不重写。

### P11. 开箱即用是 preset，不是 core

- **core** 只提供能力契约、绑定、适配器；不含页面/壳/CRUD 页面模板。
- **preset** 是 opinionated 的完整组合：PageLayout + AppShell + CollectionView +
  RecordView + FormView + 默认字段/CRUD/动作 + 默认 UI adapter。
- preset 页面是 **composition root**：可以调用官方 binding，但不实现业务、不自己写 fetch。
- preset 必须能“一键起一个 console 页面”，否则不叫开箱即用。
- preset 的每个部分都必须可被单独替换/拷贝/退出（progressive disclosure）。

### P12. 明确偏好，但每层可退出

默认值是有观点的：

- URL 即真相（页面级查询状态）；
- 列表 tab 切换 push、自由过滤 replace；
- 失败/结果两分；
- 流/帧一等，断档/退避/重锚内置；
- 字段基座默认渲染 + 槽覆盖；
- CRUD 默认 dialog 宿主。

但每一层都要有逃生舱：

| 层 | 默认 | 退出方式 |
|---|---|---|
| 页面 | `CollectionPage`/`CrudPage` | 用 `PageLayout + CollectionView` 手装 |
| 视图 | `CollectionView` | 用 `PageLayout + DataTable/FilterBar/Pager` 手装 |
| 控件 | `DataTable`/`FilterBar`/`Pager` | 用 headless `useCollection` + 自绘 UI |
| 绑定 | `useCollectionPage` | 用 `useCollection` + 自定义 URL adapter |
| 适配 | rest factories | 实现 `CollectionSource`/`Command`/`StreamSource` |
| 皮肤 | 默认 UI adapter | 换 UI adapter / 换 primitives / 纯 HTML |

### P13. UI 适配是 UI adapter seam，不是 token 重写

- **行为/可访问性**归 Control/View；**视觉基元**归 UI Adapter；**主题值**归 Token。
- 不允许 `devtool copy` 靠正则重写 `text-muted` → `text-muted-foreground` 来适配 UI。
- 不允许块直接 import 消费方 `@/components/ui/button` 这类未声明契约。
- UI adapter contract 是小接口（约 10 个基元），不是完整组件库；第三方只需实现这层。
- 默认 UI adapter 是 **Base UI + shadcn**（shadcn 当前基础）；Radix 仅作为第三方/过渡 adapter，不是默认。其他 UI adapter 可以是 Mantine、Ant Design、纯 HTML。
- 同一套 Control/View 可以在不同 UI adapter 下复用；只换 UI adapter + token。
- **Tailwind 不是 core 契约**：它只是默认 UI adapter/preset 的样式实现；`plain` UI adapter 可用
  CSS Modules/vanilla CSS。Control/View 不硬编码颜色字面量，结构 class 可覆盖。

### P14. 开源契约分层：core 稳定，preset 可 fork，Page Template 不承诺

- **core**（`@lynxland/uikit-core`）：kernel/schema/adapters；**无 React**。
- **react**（`@lynxland/uikit-react`）：数据/命令/流绑定 + `/router` URL 绑定。
- **surfaces**（`@lynxland/uikit-surfaces`）：values/controls/views/chrome/fields + `UiAdapter` contract。
- **preset**（如 `@lynxland/uikit-preset-console`）：默认页面/壳/字段/动作；copy-owned 或
  独立包；升级走 `diff`/migration，不承诺运行时兼容。
- **UI adapter**（如 `@lynxland/uikit-ui-shadcn`）：Base UI + shadcn 基元/token；可第三方实现。
- **Page Template**（docs/page-templates）：页面模板/脚手架；不承诺 API。
- core 不含任何业务实体名/业务枚举/业务文案；fleetly/torchwood 的领域知识留在消费方。
- dogfooding/pre-1.0 允许 breaking；1.0 后 core/react/surfaces 契约稳定，
  preset/UI adapter 可独立演进。

---

## 2. 竞品调研（2026-11 核对）

> 目的不是“抄功能”，而是确认 uikit 应该占据哪个生态位。

### 2.1 react-admin

**架构**：`<Admin dataProvider>` + `<Resource name list create edit show>`；
`Resource` 同时注册路由、菜单、权限动作；CRUD 页面由 `List/Edit/Create/Show` 提供；
数据层是 9 个方法的 `dataProvider`。

**优点**：
- 开箱即用的完整 CRUD；50+ data provider；生态成熟。
- 页面模板与权限/菜单/路由一体，适合“标准后台”。

**代价**：
- UI 锁 Material UI（或用 shadcn-admin-kit/ra-core 绕开）。
- `<Resource>` 是路由注册 + 数据 + UI 的 god component；页面类型系统很强。
- 数据契约是 `getList({pagination, sort, filter})`，不覆盖流/帧/游标续订。

**对 uikit 的启示**：
- 采纳“能力契约”的思想，但**拒绝 Resource 作为路由注册中心**。
- 采纳“列表/详情/表单页面模式”，但**拒绝把它们做成核心组件**；页面模板归 docs/scaffold。
- 数据契约要比 dataProvider 更薄、更类型化，并覆盖 Stream。

### 2.2 refine

**架构**：`<Refine dataProvider routerProvider resources>` + 大量 hooks
（`useList/useTable/useForm/useShow`）+ provider 群（auth/access/notification/i18n/live/audit）。

**优点**：
- headless，UI 自由；TanStack Query 底座；hooks 覆盖广；SSR/多路由。
- 生态位清晰：CRUD-heavy internal tools。

**代价**：
- 概念多（provider 动物园），学习曲线高；resource 仍带路由语义。
- hooks 与 UI 集成层较厚；同一能力有多个 hook 变体。
- 不提供“数据密集 console”的流/帧/断档/退避语义。

**对 uikit 的启示**：
- 采纳“headless + 引擎借用”；**拒绝 provider 动物园**。
- 能力契约应收敛为 Source/Command/Stream 三个，不按 provider 类型扩张。
- 不提供 `useTable/useForm` 这类引擎同名包装；只提供 `useCollection/useCommand/useStream`。

### 2.3 shadcn-admin-kit

**架构**：react-admin 的 `ra-core` + shadcn/ui + React Router；
`<Admin dataProvider>` + `<Resource>`；组件通过 shadcn registry 拷贝。

**优点**：
- copy-owned UI + 成熟数据层；组件齐全；主题自由。
- 证明了“registry 分发 + 后台组件”可行。

**代价**：
- 仍是 admin CRUD 优先；页面模板/Resource/路由仍是一体。
- 50+ 组件、guessers、optimistic/undo 等“全套后台”假设；
  对数据密集 console（日志/事件/部署阶段/自定义动作）不是核心。
- 组件数量与配置面容易膨胀。

**对 uikit 的启示**：
- 采纳 copy-owned registry + token 主题化；**拒绝组件数量竞赛**。
- 采纳“页面模式”，但用 `PageLayout + View` 组合，不用 `<Resource list create>` 注册。
- stable 面按真实 console 需求收缩。

### 2.4 TanStack（Query / Table / Form / Router）

**立场**：headless、类型安全、组合式；“own your code, not your framework”；
Table 明确“state coordinator + controlled state + own markup”；
Form/Query 都是无渲染状态机。

**对 uikit 的启示**：
- **绑定，不重造**。uikit 的 `CollectionHandle` 只应做“引擎结果 → UI 需要的四态/分页信息”的薄翻译，
  不应重造缓存/分页/表单状态机。
- 受控状态是正确方向：Table 的 sorting/pagination、Form 的 values/errors 都应可提升到 URL/页面。
- 类型安全要靠“引擎类型 + 单源工厂”，不是靠更多 any/泛型体操。

### 2.5 Base UI / React Aria（行为/可访问性层）

**立场**：unstyled/headless；组件负责行为、键盘、ARIA、焦点管理；
样式与 DOM 归消费方；composable APIs。

**对 uikit 的启示**：
- Control 层应该拥有**行为与可访问性**，但不拥有数据。
- 小控件（Checkbox/Select/Tabs/Dialog）应原生元素化或依赖一个明确的 headless 基元，
  不要在每个消费方写桥。
- “受控 + 组合”比“配置 + 黑盒”更符合可访问性与可测试性。

### 2.6 竞品定位矩阵

| | 数据契约 | 页面组合 | UI 分发 | 流/帧 | 类型安全 | 主要风险 |
|---|---|---|---|---|---|---|
| react-admin | dataProvider（9 方法） | Resource + List/Edit/Show | MUI / kit | 弱（EE realtime） | 中 | 页面框架耦合、UI 锁定 |
| refine | dataProvider + providers | hooks + 页面 | 多 UI | live provider（pub/sub） | 中 | provider 动物园、概念多 |
| shadcn-admin-kit | ra-core | Resource + 页面 | registry 拷贝 | 弱 | 中 | admin CRUD 假设、组件膨胀 |
| TanStack | 各引擎自有 | 无 | 无 | Query 无 | 强 | 需要自己组合 |
| Base UI/React Aria | 无 | 无 | 无 | 无 | 强 | 只管行为，不管数据 |
| **uikit v3** | **Source/Command/Stream** | **preset 页面 + View + Page Template** | **core npm + preset/UI adapter + registry 拷贝** | **一等（游标帧流）** | **强（Row/Input/State 分离）** | **必须克制：偏好要明确，但不能变成封闭 admin 框架** |

**生态位结论**：

> uikit 不跟 react-admin/refine 比“谁的后台功能多”，  
> 而是做 **“有明确偏好的 console toolkit”**：
>
> - **core**：比 admin 框架更薄、更类型化、更懂流；
> - **preset**：比纯 TanStack 更懂 console 页面模式，开箱即用；
> - **UI adapter**：比 shadcn 模板更容易适配不同 UI 设计；
> - **Page Templates**：比封闭框架更容易 fork/退出。

这就是“比 refine/react-admin 更进一步”的具体含义：  
**不是功能更多，而是默认更好、层更薄、退出更容易、开放性更强。**

具体六点：

1. **默认更懂 console**：URL 真相、流/帧、断档重锚、失败/结果两分，不是通用 CRUD 假设。
2. **类型更硬**：Row / Input / State 三模型分离；资源名/查询键/效果都有类型/单源。
3. **层更薄**：core 不含页面；preset 页面是薄组合；没有 `Resource` 路由 god object。
4. **退出更容易**：preset → View → Control → headless → adapter → UI adapter，逐层可退。
5. **UI 更可换**：UI adapter contract + token，不锁 MUI/Radix/Base UI，不做类名重写。
6. **开放更彻底**：core 契约稳定；preset/UI adapter 可第三方发布；Page Template 可 fork；MIT。

---

## 3. 设计张力的裁决

### 3.1 开箱即用 vs 可控

- **开箱即用**放在 preset：`CollectionPage`/`CrudPage`/`RecordPage`/`FormPage`
  是真实可运行组件，不是“文档里让你手抄的页面模板”。
- **可控**放在 Control/View/Headless：控件受控、View 只翻译句柄、Chrome 可替换、
  绑定可直接用。
- 不用“一个组件既开箱即用又完全可控”来骗自己；两者分层，但**默认路径必须短**。
- preset 组件是薄组合，不是 v2 `TablePage` 那种“字段+CRUD+页面框架”一锅端。

### 3.2 一份字段声明 vs 类型诚实

- 80% 的 CRUD 可以用 `CrudFields<Row, Input>` 便利层。
- 但核心模型必须是 `FieldView<Row>` / `FieldInput<Input>` / `FilterField` 三拆。
- `FieldDef<T>` 的“一份声明驱动三视角”只在 Row≈Input 时成立；不能作为核心契约。

### 3.3 URL 真相 vs 本地瞬态

- URL 是页面级查询状态的真相；控件不另存完整副本。
- 允许瞬态输入 draft（搜索框、未提交的文本），但必须随 value 同步；
  不能只在挂载时初始化。
- 本地状态只用于“表内瞬态”（列可见性、弹窗开关、选择态）和“未提交草稿”。

### 3.4 拷贝制 vs 升级

- 拷贝制的核心价值是“消费方拥有代码”，不是“上游能自动升级”。
- 升级靠 `diff` 提示 + 人工判断；不做 AST 重写/自动 merge。
- 上游吸收本地扩展后，消费方删除副本；这是流程，不是运行时兼容层。
- preset/UI adapter 可以是 npm 包（版本化）或 registry 拷贝；两种都支持，
  但**同一层不混用**：选择了 copy-owned，就不承诺自动升级。

### 3.5 Effect vs 简单

- Effect 只在它赚回成本时使用。当前只有 2 个文件用 Effect，
  schema 是手写 parser；这不构成“架构层”。
- v3 默认**core 零 Effect**；如果需要，放可选子路径，并单独预算。
- 取消/重试/退避可以用普通 TS 状态机表达；不要为了“统一”把简单逻辑 Effect 化。

### 3.6 兼容 vs 重写

- dogfooding/pre-1.0 阶段，**不保留向后兼容层**。
- 旧 API 直接删除；消费方与 uikit 同批迁移。
- 不写 `@deprecated` 别名、不做双 API、不做 codemod 以外兼容。
- 迁移成本一次性支付，换取概念干净；这是本阶段的明确取舍。
- **1.0 之后**：core 契约遵循 semver；preset/UI adapter 可独立演进；
  Page Template 不承诺 API。公开稳定性和“dogfooding 期激进重构”不矛盾，分层即可。

### 3.7 偏好 vs 开放

- 默认值必须有偏好，否则“开箱即用”不成立。
- 偏好只放在 preset 默认值/默认 UI adapter/默认页面模板，不写进 core 契约。
- 第三方可以：
  - 只用 core，不用 preset；
  - 用 preset 但换 UI adapter；
  - fork preset/registry 块；
  - 实现自己的 `CollectionSource`/`Command`/`StreamSource`；
  - 发布第三方 preset/UI adapter。
- open source 的开放性是“每层可替换”，不是“所有层都中性”。

---

## 4. 评审问题清单（设计/PR 用）

1. 这个新名词属于哪条轴、哪一层？能否用既有能力组合出来？
2. 这个模块的接口是否比实现小？删除它，复杂度会消失还是转移？
3. 它是否让 Control 取数/碰 Router？是否让 View 画壳？
4. 它是否把 Row/Input/URL State 混成一个类型？
5. 它是否引入了隐藏协议（`__` 字段/运行时嗅探/隐式 context）？
6. 它是否只有 demo 消费者？有没有真实 console 页面？
7. 它是否重造了 TanStack 已有的状态机？
8. 它是否增加了 token/primitive 方言？能否用标准语义 token？
9. 它是否可以用页面模板/脚手架解决，而不必进入 stable API？
10. 删除它，消费方会变简单还是变复杂？如果只是“少写几行”，它可能不该是抽象。

---

## 5. 一句话记忆

> **能力是能力，呈现是呈现；开箱归 preset，壳可替换；控件受控，类型诚实；  
> 不为对称造名词，不为 demo 升 stable，不为兼容留双 API。**

---

## 6. 调研来源（2026-11 核对）

- react-admin Architecture / Resource / Data Provider：
  - <https://marmelab.com/react-admin/Architecture.html>
  - <https://marmelab.com/react-admin/Resource.html>
  - <https://marmelab.com/react-admin/DataProviderWriting.html>
- refine v5 文档（Data Provider / Router Provider / Refine component）：
  - <https://refine.dev/core/docs/data/data-provider>
  - <https://refine.dev/core/docs/routing/router-provider>
  - <https://refine.dev/core/docs/core/refine-component>
- shadcn-admin-kit：
  - <https://github.com/marmelab/shadcn-admin-kit>
  - <https://marmelab.com/shadcn-admin-kit>
- TanStack Table V9（headless / controlled state / TanStack Store）：
  - <https://tanstack.com/blog/announcing-tanstack-table-v9>
  - <https://tanstack.com/table/latest/docs/guide/tables>
  - <https://tanstack.com/table/latest/docs/framework/react/guide/table-state>
  - <https://tanstack.com/table/latest/docs/overview>
- Base UI（headless / accessible / composable）：
  - <https://base-ui.com/react/overview/about>
  - <https://base-ui.com/react/overview/accessibility>
  - <https://base-ui.com/react/handbook/composition>
- React Aria（behavior/accessibility 与 styling 分离）：
  - <https://react-aria.adobe.com/why>
- shadcn registry / CLI：
  - <https://ui.shadcn.com/docs/registry>
  - <https://ui.shadcn.com/docs/registry/api-reference>

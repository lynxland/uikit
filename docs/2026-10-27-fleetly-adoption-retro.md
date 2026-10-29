# fleetly 采纳复盘：摩擦实录与下沉提案

| 状态 | 日期 | 关联 |
|---|---|---|
| 提案（待逐项裁决后进 design.md 批次） | 2026-10-27 | fleetly `74e4aac4..b5a677bb`（uikit 全量换装 31 commits + 1 runbook docs）+ 三轮现网走查 |

来源：fleetly console 自旧 `@lynx-go/ui-kit@0.1.1` 全量换装 `@lynx-go/uikit-core@0.3.1` + registry 拷贝制块（四批：底座/列表族 14 域/写面 ~74 mutation 位/订阅族与观测面），随后三轮现网走查修复（壳高度、双主题、统一 Layout）。本文是**摩擦清单 → 下沉提案**，作为 uikit 后续批次的需求真源；每项经裁决后按实施批组推进，落地形态以 design.md 对应批次节回写为准。

## 0. 口径与证据

fleetly 侧统计（2026-10-27 复盘 grep 实测）：

| 摩擦信号 | 实测 |
|---|---|
| kit 层伴读钩子（`useXxx` 包装 useQuery+collectionQueryOptions+scoped+固定窗） | **21 个导出**（19 个 kit 资源伴读同构 + 2 个 metrics 序列钩子） |
| 多 tab 路由手写合并 validateSearch | **8 个路由** |
| data-table `renderExtraRow` 本地扩展消费点 | 4 文件（tasks runs / users 设密 / github repos / nodes 错误行） |
| record fetch 手写 `status === 404 → null` | 4 处 |
| 消费面 `.data?.rows ?? []` 解包 | 38 处 |
| 宿主路由 `routeId={Route.id}` props 线程 | 18 处 |
| `new Error(describeApiError(...))` 错误形转换 | 4 处 |
| readonly rows 边界 `[...x]` 展开 | 3 处 |

双消费方对照：torchwood（批 A–D/§12.9）同类摩擦以批注形式引用；不确定处标「待核对」。

## 1. 运转良好面（明确不动）

- **devtool 拷贝制闭环**：vendored 头（来源版本+适配清单+手工步骤交接单）+ profile 恒等化后零映射拷贝——两消费方一致好评的机制。
- **labels / describeError / resultAction 注入面**：块不持业务词，fleetly 全程零改块文案。
- **逃生舱哲学**：块全 part ReactNode + renderExtraRow 型本地扩展点——回流通道（selection 先例）被证明顺畅。
- **treatAs / legacyKeys 写失效桥**：批2 写面命令化时把存量 react-query 键失效接得干净（读面换轨后桥语义变化见 A3 修正）。
- **transport 可测性**：全微任务驱动零真实计时器的契约测试模式在两个消费方成立。
- **offset/keyset 双方言**：fleetly 整取方言全程只用 offset 面，无摩擦。

## 2. 下沉提案 A

### A1. 伴读读数 API（`useCollectionData` / `useRecord` 扩容）——重复量最大项

**摩擦**：`useCollection` 绑 URL search（经 `useSearch(strict:false)` 解整个 location 的共享键 q/page/cursor），壳层组件与表单下拉误收它页写入的键（R1 实咬：项目目录窗口被列表页 cursor 污染）。于是所有非列表读面手写三件套 `useQuery + collectionQueryOptions(scoped(...), 固定窗, {refetchInterval})` 再包伴读钩子——**19 个同构钩子、38 处 `.data?.rows` 解包**。另：`useRecord` options 只有 `staleTime`（bindings.ts:198），无 `refetchInterval/enabled`——providers-view 为 30s 轮询被迫落回裸 useQuery；clientCollection 方言全量取数但句柄只暴露当前窗 `rows`（有 `total` 计数、无全量行），backups 页「N healthy」全量统计因此退场。
**下沉形态**：
1. react 层新增 `useCollectionData(resource, {scope?, size?, refetchInterval?, enabled?, retry?})` —— 不绑 URL、固定窗、**返回 rows 直出**（含 `status/error/isFetching/refetch`，Segment 不外泄）；
2. `useRecord` options 扩 `query: {refetchInterval, enabled}`；
3. clientCollection 方言句柄补全量行访问（`useCollectionData` 加 `fullWindow` 选项或句柄暴露源行）。
**验收**：fleetly 19 个伴读钩子收缩为直接消费；38 处解包归零；providers-view 轮询回归 useRecord。
**影响面**：torchwood 同样受益——其 routes/components 仍有 **26 个文件**的裸 useQuery 面（§12.9 遗留 legacy 列表轨 + 伴读未收编部分），伴读 API 落地后其存量面可按同形态收敛。

### A2. Transport 工厂（`createTransport`）——订阅族三件套

**摩擦**：logsTransport/eventsTransport 各手写一遍：push→pull 桥（buffer+notify 唤醒 async generator）、seq 跨重连单调计数（transport 闭包）、closeReason 挂载——含一个真 bug：`Object.assign` 把 closeReason getter 取成静态值，须 `Object.defineProperty` 活 getter（测试抓出）。终态分诊（ended/auth/network）每方言一份。torchwood wsTransport 同款手写（§12.4）。
**下沉形态**：adapters 层 `createTransport<F>({open, close, classify})` 工厂——消费方只写「开流（收 push 回调与 signal）→ 逐帧 emit → 收口时返回终态分类」三个回调；桥、seq 信封（EventFrame）、closeReason 活 getter、cursor 透传单源。SSE/NDJSON/WS 三个参考实现随工厂落地。
**验收**：fleetly 两 transport 收缩为 ~30 行方言回调；getter bug 类别消亡。

### A3. 命令失效 scope 相等律——本次唯一 bug 级语义坑

**摩擦实录（两个独立教训，须分开表述）**：
1. **selector 与读键 scope 全等才匹配**：git hook 三写动词走 `appTabCommands(projectId, appId)` 工厂（appId 闭包、不进 scope），`useCommand` 缺省 scope `{}` 与读面 record 键 `["record","app-hook",{projectId,appId},"current"]` 不相交——写后读面不刷新（app-settings 测试实咬）。修法=消费方逐处显式传 scope。kernel `selectorMatches` 是 `JSON.stringify` 全等比较（keys.ts:83），无子集/部分匹配。
2. **legacyKeys 只救仍持旧键的消费方**：config 详情读面 kit 化后键形从 `["resources","config",pid,name]` 变 `["record","config-detail",...]`，批2 埋的 legacy 桥打的是已不存在的旧键——读面换轨后必须给写动词补 `invalidates` selector（panels 测试实咬）。
**下沉形态**：①kernel 文档显式契约化「命令 scope ⊇ 读键 scope 且全等」；②类型/lint 护栏：descriptor 声明 scope 键（`__scopeKeys` 在）而 `useCommand` 未传 scope 时编译期告警；③「工厂闭包命令」配方进 SKILL.md（含『闭包 id 不进 scope 的后果』反例）。
**验收**：fleetly 两处测试锚转绿无需逐处手传 scope（或至少编译期可见）。

### A4. 多 tab search 合并（`mergeSearch`）——8 路由同构

**摩擦**：`toSearchSchema()` 的 normalize 丢未知键（tab 被吃），ModulePage 路由全部手写 `validateSearch: (input) => ({...tabParse(input), ...schema.toSearchSchema()["~standard"].validate(input).value})` + 函数式 tab 切换保 q/分页。
**下沉形态**：schema 层 `mergeSearch(tab: StandardSchema, query: QuerySearchSchema)` 组合器（或 `toSearchSchema({passthrough: true})`）；tab 函数式切换示例随 SKILL.md。
**验收**：fleetly 8 路由合并体收缩为一行。

### A5. data-table `renderExtraRow` 回流

4 消费点（跨行展开/披露行），本地扩展形态成熟（展开态归页面、块只渲染行）。与 selection 槽同通道回流上游。

### A6. ListPage/detail-page shell-agnostic 化 + `tabs` 槽

**摩擦**：块自带 `max-w-5xl + p-6` 容器与消费方 Layout 体系冲突，fleetly 三轮走查实锤链：列表过窄（用户反馈）→ 流体本地改 → 与 PageFrame 三档宽度不一致（又反馈）→ 最终消费方统一 Layout 裁决（主内容宽度唯一=流体全宽列）。§12.10-⑤ shell-agnostic 提案的实证升级。另：backups 迁移时 PageTabs 只能塞 toolbar 槽（位次凑合）。
**下沉形态**：块缺省不持宽度/衬垫（消费方 Layout 持有），或 `container={false}` 形态；header 与 toolbar 之间官方 `tabs` 槽。
**验收**：demo 同步改（demo 自持容器）；fleetly 三个本地扩展退役。

### A7. AppShell 上游化（`h-screen` + slot 族）

**摩擦**：demo 靠 `html/body/#root{height:100%}` 撑 `h-full`，消费方无此规则 → 侧栏塌成内容高（现网走查「菜单下方缺口」）。fleetly 本地扩展：根 `h-screen overflow-hidden`、NavItem `icon?/disabled?`、NavSection `zone?` 分界、`header?/footer?/topbar?` 槽、`<md` Sheet 移动抽屉（MobileNav）。
**下沉形态**：`h-screen`（demo 等价无损）与 slot 族/icon/disabled/zone 回流上游；移动抽屉列为开放问题（上游化与否待裁）。

### A8. 主题 CSS 资产（`theme-dark.css` / `theme-light.css` / `shadcn-compat.css`）

**摩擦**：采纳 demo 视觉时消费方手抄整张 token 表（~40 行 oklch）；纯暗裁决被用户打回要双主题后，又手写亮色派生套 + shadcn 别名层（@theme inline 同值异名映射，36 基元零改动换肤的前提）——累计 ~200 行消费方持有。注：MetricChart 直读 `var(--chart-N)` 是 shadcn 命名，compat 层必须含 chart 别名（fleetly 已含）。
**下沉形态**：uikit 导出三份 CSS：暗（demo 原生）、亮（同族派生：近白底/白 panel/浅灰线、accent 与状态色压深、chart 调暗）、shadcn-compat（demo 词汇→shadcn 词汇别名）。消费方三行 import。**扩展位注明**：消费方自有 token（fleetly 的 `--status-*` 微底族、`--brand-gradient`）不在 demo 词表——compat 文档须写明「自定义 token 由消费方追加」，避免误以为全量接管。
**开放**：亮色档是否进 demo 走查（建议进，否则亮套无视觉回归面）。

### A9. ResultBox 独立导出

保壳换面的复杂表单（DeploySheet 五源）不能迁 Form 内芯，本地复制了 CommandResultBox（rejected 带 code 前缀 / conflict message-first / resultAction 槽）。torchwood documents 批同款先例（§12.5-⑧ resultAction 的回流即源于此）。拆出 form.tsx 内的 ResultBox 为独立导出。

### A10. 错误显示帮手（`toastOnSettled` + `toDisplayError`）

**摩擦**：①toast 单源 helper 每消费方一份（fleetly kit/toast.ts 与 torchwood errors.ts 旁路同构）；②kernel ApiError 是对象非 Error——进通用错误 UI 渲染 `[object Object]`，4 处手写 `new Error(describeApiError(...))` 转换、3 处 readonly rows 边界展开。
**下沉形态**：core 导出 `toastOnSettled(onOk?)`（结果/失败通道文案注入形）；`toDisplayError(e: ApiError): Error`（或 states 块 ErrorState 文档化「勿喂裸对象 UI」）。**边界注**：`runCommandMapped` 在 fleetly/torchwood 各持一份（fetch/axios 错误体提取各异）——body 薄（~20 行），默认不下沉；若将来下沉则参数化「错误体提取」回调。

### A11. LogViewer 虚拟滚动回流

fleetly 本地实现（@tanstack/react-virtual、measureElement 动态测高、overscan 24、跟随改 scrollToIndex(end)；192 帧 50 行 DOM 实测）。上游源注释本就标「虚拟滚动后置」——直接回流，含跟随语义回归测试。

### A12. 块内小控件原生元素化

**摩擦**：块假设 `@/components/ui/select` 是原生包装（demo 方言），fleetly（Radix compound）撞后写 native-select 桥；0.3.1 上游 data-table 的 selection 用 Base UI 形态 Checkbox（indeterminate/onChange），fleetly 再写 checkbox 桥。keyset-pagination 0.3 已示范原生 select 解耦方言。
**下沉形态**：filter-bar/pagination 的 Select 与 data-table 的 Checkbox 改原生元素（或 `@/kit` 友好的无基元形态），消费方桥退役。
**影响面**：torchwood 批 A 裁决 7 曾以 radix 直接待 KeysetPagination——上游化后该裁决面消失。

## 3. 上游小修 B

- **B1** `/testing` 出口源码 noUnusedLocals 违例（消费方严格 tsc 下不可用）；修复后顺手导出 `createTestRouter`（fleetly/panels.test 内联最小路由包装、torchwood TestRouter 各写一份）。
- **B2** devtool `--dir` 缺省自动探测 `src/components` 布局（fleetly 首拷落错至 `console/components/`）。
- **B3** `clientCollection` fetch 签名 `(ctx, signal)` 文档钉死（fleetly 首版写成 `(query, ctx)` 即错）；`useRecord` options 表（见 A1）。
- **B4**（低优先）`legacyKeys(scope)` 拿不到 input id——per-id 桥只能宽前缀；候选：签名扩 `(scope, input)`。
- **B5** SKILL.md 四则修正：①「bring-your-own-fetch 是主干」——fleetly 全程未用 createHttp（自有 401 闭环资产），clientCollection+裸 fetch 才是常态路径，createHttp 定位为可选件；②「何时不套 useSubscription」——无游标终态快照流（deployment wait）套引擎净 LOC≈0 且错误分诊语义冲突（fleetly 实证保持先例）；③「块采纳地图」——values 族（status-badge/relative-time/copy-button…）与 states 四态、成熟消费方既有 domain 件（fleetly 的 StatusBadge/EmptyState/ErrorState）重叠，fleetly 选择保留 domain 件致两套四态词汇并存——新消费方按「有既有模板层则块按需」指引；④「消费方守卫建议」——fleetly 落了两条消费侧守卫（features/routes 禁裸 useMutation、禁退役 catalog import 复活），可作为采纳指南的守卫配方推荐。

## 4. 留消费方 C（不沉，记录边界）

- **统一 Layout/页面宽度裁决**（A6 的另一半，本就是消费方职责）；亮色派生具体色值（品牌决策，A8 给默认档）。
- **routeId props 显式线程**（18 处）：考虑过 `useCurrentRouteId()` 语境钩子，否决——显式传参保证 from 与宿主路由一致（多路由复用 feature 时语境钩子会静默错位），保持显式；SKILL.md 加一句说明即可。
- readonly rows 边界的 `[...x]` 展开（A10 若做 toDisplayError 顺带文档提示，不强制）。
- 业务语义（E_EVENTS_GONE 补档回退、OCC resultAction 的 reload 编排、审批/披露行文案）。
- IAB/浏览器走查坑（合成事件不穿透受控组件）——进 SKILL 浏览器验证节，与库无关。

## 5. 实施批组建议

| 批组 | 内容 | 理由 |
|---|---|---|
| **F1（高优先）** | A1 A2 A3 A4 + B1 B3 | 重复量最大（19 钩子/8 路由/2 transport）+ 唯一 bug 级语义（A3）+ 测试基建 |
| **F2（契约批）** | A5 A6 A7 A8 + B2 | 块形态/视觉契约变更，需 demo 走查同步（A8 亮档进 demo） |
| **F3（顺手批）** | A9 A10 A11 A12 + B4 B5 | 独立小件 |

**回流序**（每批）：uikit 发版 → fleetly 升 core 版本 + `devtool diff --all --check` 对照 → 本地扩展重落（renderExtraRow/容器/h-screen 三处随对应项退役）→ 门禁 + 现网走查。建议 fleetly CI 增设 `devtool diff --all --check` 漂移门（升版防线，目前零防线）。

## 6. 开放问题（待裁决）

1. `useCollectionData` 返回形状：rows 直出（本文提案）vs 保留 Segment 字段兼容——直出则 38 处解包归零，但与 useCollection 句柄不对称。
2. A3 护栏强度：编译期类型约束（强，可能误伤合法的 allScopes 用法）vs lint 规则（弱但可豁免）。
3. A7 移动抽屉是否上游化（demo 桌面-only，上游化后需 demo 响应式走查）。
4. A8 亮色档进 demo 与否（建议进：亮套需要视觉回归面）。
5. A6 shell-agnostic 的默认值取向：块默认裸 + demo 自持容器（推荐）， vs `container` prop 双形态。

---

### 修订记录

- v1（2026-10-27 初稿 → 复审后本文）：修正三处初稿口径——合并路由 14→**8**（实测）；「句柄无 total」修正为「**total 计数在、全量行不可达**」（CollectionHandle 有 total 字段）；legacyKeys 语义精确化为**两条独立教训**（scope 全等匹配 + 旧键桥随读面换轨失效，初稿混为一条）。复审新增：A1 并入 useRecord options 缺口与全量行缺口、A10 错误形转换（4 处实测）、§1 运转良好面、§4 routeId 显式线程裁决、B5 SKILL 三则、§5 CI 漂移门建议、§6 开放问题五则。
- v2（同日深审）：commit 数 33→**31**（+1 docs=32，实测）；A1 影响面以 torchwood **26 文件裸 useQuery 面**坐实（替换原「待核对」）；A8 补消费方自定义 token 扩展位（status 微底/brand-gradient 不属 demo 词表）；A10 补 runCommandMapped 跨仓各一份的边界注（薄、默认不下沉）；B5 ③并入 states 四态与两套四态并存的实证、扩为四则（+消费方守卫配方）。深审否决项：谓词→服务端参数映射配方（torchwood §12.2-3 已在 design.md，仅缺 SKILL 索引——不另立项）。

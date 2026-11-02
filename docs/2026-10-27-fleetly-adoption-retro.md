# fleetly 采纳复盘：机制缺口清单

| 状态 | 日期 | 关联 |
|---|---|---|
| v3（机制重审版）提案——待逐项裁决后进 design.md 批次 | 2026-10-27 | fleetly `74e4aac4..b5a677bb`（uikit 全量换装 31 commits + 1 docs）+ 三轮现网走查 |

来源：fleetly console 自旧 `@lynxland/ui-kit@0.1.1` 全量换装 `@lynxland/uikit-core@0.3.1` + registry 拷贝制块（四批：底座 / 列表族 14 域 / 写面 ~74 mutation 位 / 订阅族与观测面），随后三轮现网走查修复。**v3 重审立场**：v1/v2 的 A1-A12 提案近半是症状层补丁（加第二个钩子、加合并器、加文档+lint、加转换帮手——都在机制缺口外围绕行）；本文按「机制上补全缺口」重构为 M1-M10，原 A/B 项全部映射归位，并补入 v1/v2 漏检的两个机制缺口（M4、M8）与一项「既有机制未用足」（M5 附注）。

## 0. 重审结论摘要

| v1/v2 提案 | 重审归位 |
|---|---|
| A1 伴读 API | → **M1 读模型分层**（伴读钩子/解包/全量行/共享键妥协四处症状同根） |
| A3 scope 相等律 | → **M2 命令-失效 scope 同源**（文档+lint 是补丁；同源+投影匹配+类型执法是机制） |
| A4 mergeSearch | → **M3 编解码无损**（合并器是给有损 normalize 打的补丁） |
| （漏检） | + **M4 REST 适配工厂**（24 资源文件手写样板） |
| A2 Transport 工厂 | → **M5**（并附「SubscriptionDescriptor 既有机制未用足」实证） |
| A8 主题 CSS 三份导出 | → **M6 token 单源**（三份手维护导出物本身会造新漂移面；dogfood 执法） |
| A6+A7+A12 块容器/高度/基元 | → **M7 块自足性契约**（三个隐式宿主假设显式化 + registry lint 执法） |
| （漏检） | + **M8 vendored 漂移执法**（本地扩展机读化 + CI 门 + 吸收退役流程） |
| A10 错误帮手 | → **M9 错误货币统一**（toDisplayError 转换是补丁；类化是机制） |
| B1 /testing | → **M10 测试契约** |
| A5 renderExtraRow / A11 虚拟化 / A9 ResultBox / toastOnSettled | → §3 能力补全与糖（非补丁，保留） |
| B2/B3/B4/B5 | → §4 小修与指南 |

fleetly 侧统计（grep 实测，症状证据）：伴读钩子 19 个同构（kit 层 21 个 use 导出）、`.data?.rows` 解包 38 处、合并 validateSearch 8 路由、renderExtraRow 4 消费点、404→null 手写 4 处、toApiError 收敛样板 18 文件（kit 资源文件 30 个）、`new Error(describeApiError(...))` 转换 4 处、routeId 线程 18 处、readonly 边界展开 3 处、nonce 重挂 1 处。torchwood 侧 routes/components 仍有 26 文件裸 useQuery 面。

## 1. 运转良好面（明确不动）

- **devtool 拷贝制闭环**：vendored 头（来源版本+适配清单+手工步骤交接单）+ profile 机制。
- **labels / describeError / resultAction 注入面**：块不持业务词，两消费方零改块文案。
- **逃生舱哲学**：块全 part ReactNode——selection/renderExtraRow 型扩展点存在本身即是机制（回流通道被证明顺畅）。
- **treatAs / legacyKeys 写失效桥**（批2 写面接得干净；读面换轨语义见 M2）。
- **transport 微任务测试模式**、**offset/keyset 双方言**（fleetly 整取方言全程只用 offset 面，无摩擦）。

## 2. 机制缺口 M1-M10

### M1. 读模型分层：URL 绑定是可选层，不是读原语的属性

**症状**（四处同根）：①`useCollection` 绑 URL search，经 `useSearch(strict:false)` 读整个 location 的共享键（q/page/cursor）——壳层组件与表单下拉误收它页键（R1 实咬：项目目录窗口被列表页 cursor 污染）→ 19 个伴读钩子手写三件套绕行 + 38 处 `.data?.rows` 解包；②**URL 查询命名空间是路由级全局**——多集合同路由必互踩，fleetly「q 跨 tab 持久是接受语义」是给该缺口打的语义补丁（8 路由手写合并体是另一半）；③`useRecord` 无 `refetchInterval/enabled`（options 仅 staleTime，bindings.ts:198）——providers-view 为 30s 轮询落回裸 useQuery；④clientCollection 整取方言下句柄只有当前窗 rows（total 计数有、全量行不可达）——backups 页全量统计退场。
**根因**：读原语把「取数」与「URL 视图绑定」焊死在一个 API；且 schema 编解码键无归属命名空间。
**机制补全**：
1. 拆两层：data 层 `useCollectionData(resource, {scope?, window?, refetchInterval?, enabled?, retry?})` 零 URL、rows 直出；URL 层是 data 层之上的绑定器（现 useCollection 语义不变）。`useRecord` options 扩齐同族 query 面；
2. `collectionQuerySchema` 增 `namespace?` 选项——编解码键带归属前缀（如 `tasks.q` 或 `t.q`），多集合同路由各持各键，共享/独立成为**显式选择**而非妥协；
3. data 层暴露 `fullRows`（clientCollection 方言的全量行）或 `window: "all"`。
**消灭**：19 伴读钩子、38 解包、8 合并体（配合 M3）、backups 统计退场、providers-view 裸 useQuery。torchwood 26 文件裸 useQuery 面可按同形态收敛。
**验收**：fleetly 伴读面收缩为 useCollectionData 直消费；双列表路由（tasks/schedules 等）切 namespace 后 tab 互不携带对方 q。
**落地形态**（2026-10-29，F1 批）：useCollectionData/useRecord 扩齐/window:"all"（retro M1.3 二选一取后者）/namespace 均落地——demo /collections 双列表 + 伴读统计为活文档；细节见 design.md §12.11。

### M2. 命令-失效 scope 同源：三份真源收敛为一份

**症状**：git hook 三写动词经 `appTabCommands(projectId, appId)` 工厂（id 在闭包不进 scope），`useCommand` 缺省 scope `{}` 与读键 `["record","app-hook",{projectId,appId},"current"]` **整对象 JSON 全等不匹配**（keys.ts:83 `selectorMatches`）——写后读面不刷新（app-settings 测试实咬），消费方逐处手传 scope 补丁。config 详情读面 kit 化换轨后，批2 的 legacyKeys 桥打向已不存在的旧键（panels 测试实咬）——又要补 `invalidates` selector。
**根因**：失效匹配的 scope 是调用点手工拼装的**第三份真源**（resource.scopeKeys 声明是第二份、读键内嵌是第一份）；匹配语义用整对象全等而非按声明键投影。
**机制补全**：
1. descriptor 增 `scopeOf?: (input) => ResourceScope`（工厂命令把身份从闭包迁入 input 或声明派生）；引擎 `effectiveScope = options.scope ?? descriptor.scopeOf?.(input) ?? {}`——同一份 scope 既喂 `run(ctx)` 又喂失效匹配；
2. `selectorMatches` 按**声明的 scope 键投影**比较（命令 scope 在读键声明的键集上逐键相等即匹配），整对象全等降为严格模式选项；
3. 类型执法：descriptor 声明了 scope 键（`__scopeKeys` 在）而调用未获得完整 scope 时编译红。
**消灭**：手传 scope 补丁类别、「工厂闭包命令需配方文档」的需求（降为普通用法）、读面换轨后桥失效的踩坑面（投影匹配下 invalidates 自动命中）。
**验收**：fleetly 两处测试锚在零手传 scope 下绿。
**落地形态**（2026-10-29，F1 批）：scopeOf + mutationFn 内同源解析 + 投影匹配（键形增 scopeKeys 段）+ 「传了就必须完整」类型执法落地；context 采纳位次在 scopeOf 后（0.2.1 契约不破）；见 design.md §12.11。

### M3. search 编解码无损：normalize 不再吞未知键

**症状**：`toSearchSchema()` 的 normalize 丢未知键——ModulePage 的 tab 键被静默删除，8 路由手写合并形态救回。
**根因**：normalize 把「本 schema 不认识的键」当成「不存在的键」——有损编解码。
**机制补全**：normalize 缺省 passthrough（未知键原样保留），严格丢弃作为显式选项。mergeSearch 组合器不再需要（8 处合并体退役）；tab 切换函数式 navigate 是 TanStack 语义，SKILL.md 一句带过。
**验收**：ModulePage 路由 `validateSearch: tabSearch` + `querySearch` 双 schema 并存直挂（或 M1 namespace 形态），零手写合并。
**落地形态**（2026-10-29，F1 批）：normalize 缺省 passthrough + 显式 unknownKeys:"drop"；根因面实证（TanStack spread-merge vs search.strict 从零重建）与 demo 双 schema 组合形态见 design.md §12.11。

### M4. REST 适配工厂：最常见取数形态没有库级原语

**症状**：fleetly 30 个 kit 资源文件各自手写「组 URL + 信封键展平 + undefined 行过滤 + toApiError 收敛」（18 文件含 toApiError 样板；kit/http.ts 的 fetchRows/qs 是消费方自制微工厂）；record 面另有 4 处手写 404→null 分支。
**根因**：REST-over-fetch 是两消费方最常见取数形态，库只给了 clientCollection（求值方言）与 createHttp（可选管线），**适配器本身**（path/信封/空态）无原语。
**机制补全**：adapters 增 `restCollection({path: (ctx) => string, envelope, params?, notFound?})` 与 `restRecord` 同构（`notFound: "null"` 选项吞 4 处 404 分支；错误收敛内置）。抽象度克制：path 回调起步，模板插值糖后置。
**消灭**：kit/http.ts 与逐资源 fetch 样板（预计 fleetly kit 层 −40% 行数）。
**验收**：fleetly 三域试点改造后样板归零。
**落地形态**（2026-10-29，F1 批）：restCollection/restRecord 落地（零 Effect、fetch 注入、notFound:"null"、错误收敛抽 api-error.ts 单源与 http 管线共用）；见 design.md §12.11。第二形态（2026-10-30，回流清偿批）：`restFetchAll`——整取方言 fetchAll 工厂，clientCollection 直挂（fleetly 19 个整取 kit 文件的铺开件，b4ff15ad 方言边界挂账的清偿）；params (ctx) 签名/无 notFound 两裁决见 design.md §12.13。

### M5. 订阅参数化用足 + Transport 工厂横切单源

**症状**：①logsTransport/eventsTransport 各手写 push→pull 桥（buffer+notify 唤醒 generator）、seq 跨重连计数、closeReason 挂载——含真 bug 类别（`Object.assign` 把 getter 取成静态值，须 defineProperty，测试抓出）；②logs 页用 **nonce 重挂 transport 实例**实现「Run 定格后重启」（logs.tsx:79-81）——而 kernel 早有 `SubscriptionDescriptor { open(params, ctx): Transport }`（resource.ts:48）参数化机制，未用足。
**根因**：帧订阅的三个横切无工厂单源；参数化流的第一形态（descriptor）在文档/示例中缺位，消费方自然落进「transport 实例 + 重挂」补丁形态。
**机制补全**：
1. adapters 增 `createTransport<F>({open, emit, classify})` 工厂——桥/seq 信封/活 getter 单源，消费方只写「开流→逐帧→收口分类」回调；SSE/NDJSON/WS 三参考实现随工厂落地；
2. 帧信封 EventFrame（seq/at/payload）进 kernel 为唯一信封（EventFeed/LogViewer 行键统一）；
3. SKILL.md 钉「参数化流一律 descriptor 形态；nonce 重挂是反模式」——fleetly logs 页改 descriptor 即零新 API。
**验收**：fleetly 两 transport 收缩为方言回调；logs 页 nonce 退役。

### M6. token 单源：demo 消费包导出物（dogfood 执法，非 codegen）

**症状**：采纳 demo 视觉时消费方整表手抄 token（~40 行 oklch）；纯暗裁决被用户打回后补写亮色派生 + shadcn 别名层（累计 ~200 行消费方持有）。v1 曾提案「导出三份 CSS」——三份手维护导出物会造**第四份漂移面**，本身是补丁。
**根因**：token 表是 demo 私产（apps/demo/src/styles.css 手维护），包与 demo 无单源关系。
**机制补全**：token 单源文件移入包内成为导出物（dark/light/shadcn-compat 三产物），**demo 改为 import 包导出物**——dogfood 即执法（导出物与 demo 永远一致，无需生成步骤）。亮档随之获得回归面（demo 增主题切换器）。消费方自定义 token（fleetly 的 `--status-*` 微底/`--brand-gradient`）在 compat 文档写明扩展位。MetricChart 直读 `var(--chart-N)` 属 shadcn 命名，compat 必含 chart 别名。
**消灭**：消费方手抄表/手写派生/手写别名层。

### M7. 块自足性契约：三个隐式宿主假设显式化 + registry lint 执法

**症状**：①demo 靠 `html/body/#root{height:100%}` 撑 h-full，消费方无此规则 → 侧栏塌成内容高（现网「菜单下方缺口」）；②块自带 `max-w-5xl + p-6` 容器与消费方 Layout 冲突 → fleetly 三轮走查（过窄→流体改→与 PageFrame 不一致→统一 Layout 裁决）；③块假设 `@/components/ui/select` 是原生包装、0.3.1 data-table 的 selection 用 Base UI 形态 Checkbox——fleetly（Radix 宿主）写两个桥（native-select/checkbox）。另：backups 迁移时 PageTabs 只能塞 toolbar 槽（位次凑合）。
**根因**：块对宿主环境持有三个**隐式假设**（高度链/容器职责/基元方言），demo 的全局 CSS 与自有基元遮蔽了假设——换宿主即塌。
**机制补全**：宿主契约三则显式化——①AppShell 自持 `h-dvh` 高度链；②registry 块**零容器类**（顶层宽度/衬垫归宿主 Layout；demo 自持容器；header/toolbar 之间加官方 `tabs` 槽）；③块内小控件**原生元素化**（checkbox/select 不依赖宿主基元——keyset-pagination 0.3 先例推广）。**执法**：uikit 仓内 registry lint（layer-check 同文化）扫块源：禁顶层 `max-w-*`/容器衬垫类、禁小控件从 `@/components/ui` 导入。slot 族（icon/disabled/zone/header/footer/topbar/移动抽屉）随批回流。
**消灭**：fleetly 三处本地扩展（h-screen/容器改/tabs 槽凑合）与两个基元桥。

### M8. vendored 漂移执法：本地扩展机读化 + 消费方 CI 门 + 吸收退役

**症状**：拷贝制的升级防线是空的——本地扩展（renderExtraRow/容器/h-screen）散在 vendor 头注释里不可机读；`devtool diff --all --check` 存在但零消费方在跑（fleetly 升版零防线）。
**根因**：拷贝制模型只有「拷」的机制，没有「持有期间漂移检测」与「上游吸收后退役」的闭环。
**机制补全**：①devtool 拷贝时生成机读 manifest（如 `kit/extensions.json`：块名/本地扩展清单/上游版本）；②`devtool diff --all --check` 读 manifest 语义化报告（哪些差异=已登记本地扩展，哪些=未登记漂移）；③消费方 CI 增设该门（fleetly 先行）；④上游吸收某扩展后 manifest 条目转 `adopted`，本地副本删除由 diff --check 执法。
**消灭**：升级零防线；本地扩展的口头记忆依赖。

### M9. 错误货币统一：ApiError 类化

**症状**：kernel ApiError 是值对象非 Error——任何期望 Error 的通用 UI（domain ErrorState、TanStack 默认渲染）收到对象即 `[object Object]`，fleetly 4 处 `new Error(describeApiError(...))` 转换补丁 + 3 处 readonly 边界展开。
**根因**：错误货币有两种形态（kernel 封闭集值对象 vs ECMA Error），边界转换落到消费方。
**机制补全**：`class ApiError extends Error`（kind 判别封闭集保持——「失败=typed failure」立场不变，增 Error 兼容）；`instanceof Error` 全域天然成立。toastOnSettled 保留为糖（§3），toDisplayError 类帮手不再需要。
**开放**：design.md 的值对象立场是否松动为「typed failure 且 Error 兼容」——需显式裁决记录。

### M10. 测试契约：harness 属于库

**症状**：`/testing` 出口源码 noUnusedLocals 违例（消费方严格 tsc 不可用）；两消费方各写一份内联最小路由包装（fleetly panels.test / torchwood TestRouter）。
**机制补全**：修复违例 + 导出 `createTestRouter`/`renderWithKit` + SKILL.md 测试配方节——测试面与运行面同契约级别维护（CI 里 /testing 的编译纳入消费方严格度矩阵）。
**落地形态**（2026-10-29，F1 批）：违例修复 + createTestRouter 导出 + core tsconfig 常驻 noUnusedLocals/noUnusedParameters（严格度矩阵的前置拦截形态）+ SKILL 测试配方节；见 design.md §12.11。

## 3. 能力补全与糖（非补丁，保留项）

| 项 | 归属 | 说明 |
|---|---|---|
| data-table `renderExtraRow` | 回流上游 | 4 消费点成熟形态；与 selection 同通道 |
| LogViewer 虚拟滚动 | 回流上游 | react-virtual/measureElement/scrollToIndex 跟随；192 帧 50 行 DOM 实证 |
| ResultBox 独立导出 | form 块拆出 | 保壳表单复用结果盒（torchwood documents 先例） |
| `toastOnSettled(onOk?)` | core 糖 | 结果/失败通道文案注入形（M9 后 Error 兼容，糖更薄） |
| `useRecord` options 扩容 | M1 组成部分 | refetchInterval/enabled 随读模型分层落 |

## 4. 小修与指南（非机制层）

- devtool `--dir` 缺省自动探测 `src/components` 布局（首拷落错目录实咬）。
- `clientCollection` fetch 签名 `(ctx, signal)` 文档钉死；SKILL.md 修正三则：bring-your-own-fetch 是主干（fleetly 全程未用 createHttp；clientCollection+裸 fetch 才是常态，M4 落地后原语补齐）、何时不套 useSubscription（无游标终态快照流——deployment wait 保持先例）、块采纳地图（values/states 族与成熟消费方既有 domain 件重叠——fleetly 保留 domain 件致两套四态词汇并存，过渡边界写明）。
- `legacyKeys(scope)` 拿不到 input id（低优先；M2 落地后桥需求本身收缩）。
- 消费方守卫配方（禁裸 useMutation/禁退役面复活）进采纳指南。

## 5. 留消费方边界（不沉）

- 统一 Layout/页面宽度裁决（M7 的另一半，宿主职责）；亮色派生具体色值（M6 给默认档，品牌微调归消费方）。
- **routeId 显式线程**（18 处）：否决语境钩子——多路由复用 feature 时会静默错位，保持显式。
- **ScopeProvider 显式传 scope**：与 routeId 同理保持显式（uikit 已有 Provider 形态，fleetly 选择不用——记录为风格分叉，不升级为库变更）。
- 业务语义（E_EVENTS_GONE 补档回退、OCC reload 编排、审批/披露文案）；IAB 走查坑（进 SKILL 浏览器验证节）。

## 6. 实施批组（按机制依赖序重排）

| 批组 | 内容 | 依赖与理由 |
|---|---|---|
| **F1 数据面机制** | M1 M2 M3 M4 + M10 | kernel/schema/adapters 核心变更；消灭量最大（19 钩子/38 解包/8 合并体/24 文件样板/2 bug 类） |
| **F2 订阅与错误** | M5 M9 | 独立于 F1；M9 需 design.md 立场裁决先行 |
| **F3 块契约与资产** | M6 M7 + §3 能力补全随批（renderExtraRow/虚拟化/ResultBox/tabs 槽） | M7 的 demo 容器改造与 M6 token 单源同批（demo styles.css 一次动刀）；亮档进 demo |
| **F4 漂移执法** | M8 + §4 小修 | 依赖 F3 的本地扩展清单定型（ extensions.json 登记的是最终扩展面） |

**回流序**（每批）：uikit 发版 → fleetly 升 core + `devtool diff --all --check`（F4 后由 CI 门执法）→ 本地扩展随对应机制退役（F1 后伴读钩子/合并体退役；F3 后 h-screen/容器/桥退役）→ 门禁 + 现网走查。

## 7. 裁决记录（2026-10-27，用户六项全裁）

1. **M1 namespace**：缺省 **off**（存量 URL 零变化），多集合同路由显式传 namespace 开启；键形 = **扁平前缀**（`tasks.q`）——URL 可读可分享、TanStack 序列化为普通字符串键；嵌套对象会 JSON 编码成丑长 URL（否决）。
2. **M2 匹配语义**：**投影匹配为唯一语义**（命令 scope 在读键声明的键集上逐键相等即命中），不保留整对象全等严格模式——失效成本不对称（过宽=多一次 refetch 廉价 / 漏失效=bug），全等模式无真实用例支撑，单一语义免分叉。
3. **M9 错误形态**：**ApiError 类化**（`class ApiError extends Error`，kind 判别封闭集保持）；design.md 补记立场裁决「typed failure 且 Error 兼容」——值对象初衷是封闭集可判别而非拒绝 Error 兼容。
4. **M4 path 形态**：**回调起步**（`(ctx) => string`），模板插值糖后置——真实变体（fan-out/动态 query/条件段）回调零歧义全覆盖，与现有 fetcher 签名同构迁移零重写；模板需 Template Literal Types 深水区且仍需逃生回调两套并存。
5. **M6 亮档**：**进 demo（带切换器）**——亮套若无消费方则永久漂移；demo 消费包导出物是 M6 的执法机制，亮档不进则不在 dogfood 链；demo 升级双主题走查场对 M7 块契约验证亦有收益。
6. **M7 lint 强度**：**三类宿主假设全扫**（顶层容器类 / 小控件基元导入 / 高度链依赖）——三类皆实咬过；规则限定「顶层容器节点」防误伤块内合理 padding；layer-check 先例证明仓内 lint 文化可行。

### 修订记录

- v1（2026-10-27 初稿）：A1-A12 症状清单 + B1-B5 小修 + F1-F3 批组。
- v2（同日深审）：口径修正（合并路由 14→8；句柄 total 计数在/全量行不可达；legacyKeys 双教训拆分）；新增 useRecord 缺口、错误形转换、运转良好面、routeId 裁决、CI 门建议、torchwood 26 文件坐实。
- **v4（裁决落档）**：§7 六项开放问题经用户裁定全部采纳推荐项（namespace off+扁平前缀 / 投影匹配唯一 / ApiError 类化 / path 回调 / 亮档进 demo / lint 三类全扫）——转裁决记录，开放问题清零。
- **v3（机制重审）**：立场修正——v1/v2 近半提案本身是补丁，重构为 M1-M10 机制缺口（映射表见 §0）。新增漏检机制：**M4 REST 适配工厂**（24 资源文件样板）、**M8 vendored 漂移执法**（manifest+CI 门+吸收退役）。补「既有机制未用足」实证：SubscriptionDescriptor 参数化形态（logs nonce 重挂反模式）。原 A1/A3/A4/A8/A10 升格为 M1/M2/M3/M6/M9 机制形态（伴读 API→读模型分层+namespace；scope 文档+lint→同源+投影匹配+类型执法；mergeSearch→无损 normalize；三份 CSS 导出→demo 消费包导出物；错误帮手→ApiError 类化）。A5/A9/A11/toastOnSettled 降级为能力补全/糖（§3）。批组按机制依赖序重排为 F1-F4。

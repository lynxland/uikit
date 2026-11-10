# Batch 1 implementation brief

> 目标：v3 core greenfield + 分包。**不写兼容层**。
> 规范：`docs/design.md`；spike 参考：`spikes/v3-api/`。
> 当前 v2 registry/demo 冻结，不在本批重写；它们不被 `pnpm -r typecheck` 检查。

## 包边界

- `packages/core`（`@lynxland/uikit-core`）：kernel / schema / adapters。**零 React、零 Effect。**
- `packages/react`（`@lynxland/uikit-react`）：数据/命令/流绑定 + `/router` URL 绑定。
- `packages/testing`（`@lynxland/uikit-testing`）：renderWithKit / createTestRouter。
- 不再从 core 根导出 React；不再有 `src/react`、`src/testing`。

## Core 必须提供

### kernel

- `Scope`、`Cursor`、`Operator`、`FieldValue`、`Predicate`、`Sort`。
- `CollectionWindow` 判别联合、`CollectionRequest`、`CollectionPage`。
- `Outcome` / `CommandResult` alias。
- `ApiError` class（`extends Error`，`kind` 封闭集）+ `isApiError` / `isRetryable`。
- `SourceName`、`CollectionSource`、`RecordSource`、`LookupSource`；
  `collectionSource` / `recordSource` / `lookupSource` 工厂。
- `Entity` / `defineEntity`（attach name/scope；无 `__` 字段）。
- `Command`（`run` 必须是函数属性，不是方法签名）、`Effect`。
- `StreamSource` / `StreamFactory` / `StreamPolicy` / `StreamStatus`（含 `idle`）/ `StreamHandle` / `FrameSource`。
- query key：`canonicalScope`、`collectionKey`、`recordKey`、`lookupKey`；
  key 形 `[kind, source.name, keyScope, ...detail]`；`keyScope` 只投影 source.scope 声明的键。
- `selectorMatches`、`invalidationPredicate`（scope 投影 + `allScopes`）。
- 纯代数：`evalPredicate`、`textPredicate`、`evaluateQuery`（clientCollection）、`advance`。

### schema

- `collectionSearch(spec)`：`encode` / `decode` / `toRequest` / `patch` / `reset` /
  `parseSearch` / `stringifySearch`；namespace；unknown keys passthrough；
  repeated-key serializer（带前导 `?`）。
- `FilterValue` / `CollectionState`；`FilterFieldDef`。
- `combineSearch`（重复键检测）。
- `filterLeaves` / `filterValues` / `predicateOf` / `eqFilter`。

### adapters

- `restCollection` / `restRecord` / `restFetchAll`（fetch 注入、abort 放行、
  envelope/total/nextCursor、404 `notFound:"null"` 仅 record/collection）。
- `clientCollection`（整取 + 本地求值 + 伪造 cursor；支持 `window.kind:"all"`）。
- `mockCollection` / `mockFetchAll`（延迟/失败注入/双方言）。
- `mockTransport` / `ndjsonTransport` / `sseTransport`（纯 TS，无 Effect）。
- `createSubscriptionEngine`（纯 TS 状态机；退避索引、环形 buffer、resync）。
- `api-error.ts`：Response → `ApiError` 单源；`buildUrl`。
- **不实现/不导出 `createHttp`**。

### tests

- 删除引用 v2 `Resource`/`ResourceSpec`/`FieldDef`/`effect` 的旧测试。
- 新增：source/entity key、scope 投影、serializer 往返、rest/mock、stream 状态机、
  ApiError、clientCollection。

## React 必须提供

- `useCollection(source, request, options)` 数据层（无 Router、无 setter）。
- `useRecord(source, id, options)`、`useLookup(source, ids, options)`。
- `useCommand(command, options)`、`useCommandForm(command, spec, options)`。
- `useStream(sourceOrFactory, options)`。
- `ScopeProvider` / `useScope` / `scopeReady`。
- `collectionQueryOptions` / `recordQueryOptions` / `lookupQueryOptions`。
- `useInvalidateOnFrame`。
- `/router` 子路径：`useSearchState`、`useCollectionPage`、`PagerModel`。
- 不导出 `useCollectionData` / `useBatch` / `useSubscription`。
- 不 import `effect`；除 `/router` 外不 import Router。

## Testing

- `renderWithKit` / `createTestRouter`，适配新的 `CollectionSearch` 类型。
- 提供 `mockSource` / `mockCommand` / `mockStream` 或等价能力 mock。

## 约束

- 不改 `registry/**`、`apps/demo/**`（冻结 v2）。
- 不写 deprecated alias、双 API、运行时兼容层。
- 公开类型不能出现 `__resource` / `__scopeKeys` / `__id`。
- `pnpm -r typecheck`、`pnpm test`、`pnpm layer-check`、`pnpm spike:v3` 必须绿。
- 包版本统一 `3.0.0`；core 无 `effect` dependency。

## 文件所有权

- Scaffold agent：root `package.json` / `pnpm-workspace.yaml` / `scripts/layer-check.mjs` /
  `packages/core/package.json` / `packages/react/package.json` / `packages/testing/package.json` /
  tsconfig 文件。
- Core agent：`packages/core/src/**`、`packages/core/test/**`。
- React agent：`packages/react/src/**`、`packages/react/test/**`。
- Testing agent：`packages/testing/src/**`、`packages/testing/test/**`。
- 不要并发编辑同一文件。

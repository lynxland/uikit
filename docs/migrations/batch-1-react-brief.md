# Batch 1 React/testing brief

> 依赖：`packages/core` 已完成 v3 greenfield（source identity + schema + adapters）。
> 规范：`docs/design.md` §5；spike：`spikes/v3-api`。
> 包：`packages/react`（`@lynxland/uikit-react`）、`packages/testing`（`@lynxland/uikit-testing`）。

## React 文件

```
packages/react/src/
  scope.tsx        ScopeProvider / useScope / scopeReady
  options.ts       collectionQueryOptions / recordQueryOptions / lookupQueryOptions
  bindings.ts      useCollection / useRecord / useLookup
  command.ts       useCommand / useCommandForm / invalidateAfterCommand
  subscription.ts  useStream / createSubscriptionEngine wiring
  invalidate.ts    useInvalidateOnFrame
  preferences.ts   usePreference（工具）
  permissions.ts   useCan / permissionState（工具）
  router/index.ts  useSearchState / useCollectionPage / PagerModel
  index.ts         export 数据/命令/流/工具；不导出 router
```

`package.json` exports:
- `.` → `src/index.ts`
- `./router` → `src/router/index.ts`

## 数据绑定

```ts
useCollection(source, request, options?) : CollectionHandle<T>
useRecord(source, id, options?)        : RecordHandle<T>
useLookup(source, ids, options?)       : LookupHandle<T, ID>
```

- 不 import Router、不返回 setter。
- `scope` 解析：options.scope ?? ScopeProvider（仅 source.scope 声明时）?? {}；
  source.scope 未就绪 → status `idle` / enabled false。
- `queryKey` 必须走 core 的 `collectionKey`/`recordKey`/`lookupKey` 单源。
- `CollectionHandle.status` = idle/loading/empty/error/success；
  `emptyReason` = source/filter。
- `RecordHandle.status` 包含 idle/empty；`id === undefined` → idle。
- `LookupHandle` 包含 missingIds。
- keepPrevious → placeholderData；queryOptions 透传 staleTime/refetchInterval/retry/enabled。
- 句柄 setter 不需要；`refetch` 稳定。

## 命令绑定

```ts
useCommand(command, { scope?, entity?, effects?, onSettled? }) : CommandHandle
useCommandForm(command, { schema?, fields, defaultValues?, ... }, options?) : CommandFormHandle
```

- `Command` 来自 core；`run` 是函数属性。
- scope 解析链：options.scope > descriptor.scopeOf?（如果仍保留在 core；没有则跳过）>
  ScopeProvider（仅 descriptor 有 `__scopeKeys` 的旧机制已删除；v3 用 entity/source scope 或 binding scope）> {}。
  **v3 不再有 `__scopeKeys`；命令的 scope 由 binding 选项/Entity scope 决定。**
- effective scope 同时喂 run(ctx) 和 effects/invalidation。
- ok 后应用 effects：显式 effects 优先；绑定 entity 时缺省 invalidate same entity；
  `effects: []` 表示不失效。
- `ready`：声明的 scope 未就绪时为 false；`mutate` 在未就绪时抛开发期错误。
- `useCommandForm`：
  - `FormSpec<I> { schema?, fields: FieldInput<I>[], defaultValues?: Partial<I> }`
  - rejected → form-level `{ form, fields }`；conflict → form-level message；
  - reveal = ok payload；
  - `submitting` = pending/form.isSubmitting。
- `invalidateAfterCommand(queryClient, descriptor, scope)` 单源：effects + legacyKeys 不再有；
  只走 Effect。

## 流绑定

```ts
useStream(sourceOrFactory, {
  params?, scope?, policy?, cursor?, getCursor?, onFrame?, autoStart?
}) : StreamHandle<F>
```

- core `createSubscriptionEngine` 纯 TS；React 只做 `useSyncExternalStore` 状态接线 + 帧存储。
- cursor: undefined = idle/待命；null = 活尾；value = 锚点。
- 不导出 `useSubscription`。
- `useInvalidateOnFrame(stream, effects, { filter?, throttleMs? })`：帧到达应用 Effect[]；
  卸载取消未射窗口。

## Router 子路径

```ts
useSearchState(search, { from }) : { state, set, patch, reset }
useCollectionPage(source, { search, from, scope?, query? }) : CollectionPageHandle<T>
```

- 只有这里 import `@tanstack/react-router`。
- `useSearch` 读整个 search；`search.decode` 只读自己的键；函数式 navigate。
- `PagerModel`：mode/canPrev/canNext/pageSize/prev/next/setPageSize。
  - offset prev/next 本地算；
  - cursor prev = `router.history.back()`（仅非首页）；
  - 深链 cursor 历史为空 → prev 不可用，成文。
- pageSize：offset 回第一页；cursor 保锚点。
- `useCollectionPage` 返回 CollectionHandle + pager + setState/patchState/setFilters/setSort/reset。
- setter 稳定（useCallback）；渲染期不 navigate。
- 写入律：过滤/排序 replace；翻页/离散 tab push；详情 tab replace。

## Testing 包

```ts
createTestRouter({ routes: [{ path, component, searchSchema? }], initial? })
renderWithKit(ui, { path, search, searchSchema, scope, queryClient })
```

- `searchSchema` 用 core 的 `CollectionSearch`（或任何 Standard Schema），
  通过 parseSearch/stringifySearch 与真实 URL 同路归一。
- 三 Provider：QueryClient + Router + ScopeProvider。
- 适配新的 `CollectionSearch` 类型（不再是 v2 `QuerySearchSchema`）。
- 提供 `mockSource` / `mockCommand` / `mockStream`（可从 core adapters 组合，或 testing 自带）。
- 严格 tsc 可用（noUnusedLocals/noUnusedParameters）。

## 约束

- 不 import effect；除 `src/router/**` 外不 import Router。
- 不写 v2 alias（useCollectionData/useBatch/useSubscription）。
- 不编辑 `packages/core/**`；core 已由另一代理重写。
- 不编辑 registry/demo。
- 测试：`pnpm --filter @lynxland/uikit-react typecheck` 和 `pnpm --filter @lynxland/uikit-react test`；
  testing 同理。若 package scripts 未就绪，用 root `pnpm exec tsc -p packages/react/tsconfig.json --noEmit`。

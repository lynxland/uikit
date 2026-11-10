# v3 API spikes

Standalone, throwaway TypeScript spikes for the three v3 foundations:

1. **URL serializer** — repeated-key `filter`/`sort`, namespace, unknown keys,
   defaults, patch/reset, `toRequest`.
2. **Source identity** — `collectionSource({ name, scope, read })`,
   `defineEntity`, query key shape, scope projection, invalidation matching.
3. **CrudPage typing** — `Row` / `CreateInput` / `UpdateInput` / `DeleteInput`
   separated; `FieldView` / `FieldInput` / `CrudFields`.

## Run

From the repo root:

```bash
pnpm exec tsc -p spikes/v3-api/tsconfig.json --noEmit
pnpm exec tsc -p spikes/v3-api/tsconfig.build.json
node --test spikes/v3-api/test/*.test.mjs
```

## Findings

### 1. URL serializer

- Repeated-key serialization works: `filter=a:eq:1&filter=b:in:x,y`.
- Namespace works: `widgets.q` / `widgets.filter`; unknown keys (`tab`) survive.
- **One-element array ambiguity**: a single repeated key parses as a scalar.
  `decode` must normalize scalar/array with a `toArray` helper. This is now
  documented in design §4.2.
- **Leading `?` contract**: TanStack Router's `stringifySearch` must return a
  `?`-prefixed string (or `""`), and `parseSearch` receives the leading `?`.
  The spike initially returned no `?` and the router produced `/widgetswidgets...`.
- `patch({ filters })` must explicitly clear `cursor`/`page` (as v2 learned).
- `toRequest` can map `q` to OR-of-contains and filters to AND leaves.
- **TanStack Router integration works** with `parseSearch` / `stringifySearch`:
  initial location parses repeated keys; `router.buildLocation` emits repeated
  keys and preserves unknown `tab`. (`router.navigate` in a memory router without
  mounted routes is a separate concern; use `buildLocation` for serializer tests.)

### 2. Source identity

- Bare source needs `name` + optional `scope`; otherwise no stable query key.
- `defineEntity` can attach name/scope to internal capabilities; no hidden protocol.
- Query key shape `[kind, name, keyScope, ...detail]` works.
- **Key scope must be projected to declared keys only.** The first spike test
  failed because an extra `appId` in the command scope leaked into the read key;
  fix = `keyScope(source.scope, values)`. This validates the projection design.
- `selectorMatches` projection works; `allScopes` escape works.

### 3. CrudPage typing

- `FieldView<Row>` / `FieldInput<CreateInput>` / `FieldInput<UpdateInput>` separate
  is viable; wrong field names and wrong defaults are compile errors.
- `CrudFields<Row, CreateInput, UpdateInput>` with separate create/update arrays
  is necessary for real edit forms.
- **`Command.run` must be a function property, not a method signature.**
  Method parameters are bivariant; `Command<UpdateInput>` silently assigns to
  `Command<CreateInput>`. Changing `run` to `run: (input, ctx) => ...` makes the
  wrong command a compile error. This is now in design §4.3.
- `CrudPageProps<Row, CreateInput, UpdateInput, DeleteInput>` type-checks with
  `toInput(row)` for update/delete.

## What this does not prove

- TanStack Router's exact `parseSearch`/`stringifySearch` wiring; need a small
  router integration test next.
- React rendering / UI adapter provider behavior.
- Base UI wrapper APIs.
- Package split/publish mechanics.

These are Batch 1/2 work after the API shape is confirmed.

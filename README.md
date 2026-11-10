# @lynxland/uikit

Opinionated, headless-first toolkit for data-dense console UIs — **Query / Command / Stream**
data capabilities composed through explicit React bindings, UI-agnostic surfaces, a replaceable
UI adapter and a runnable console preset.

[简体中文](README_ZH.md) · [Design](docs/design.md) · [Philosophy](docs/philosophy.md) · [API guide](docs/SKILL.md)

> **v3 · `3.0.0` · greenfield cutover.** v3 is intentionally **not backward compatible**:
> `Resource`, `FieldDef`, `Page`, `*Panel`, `TablePage`, `useCollectionData`, `useBatch` and
> `useSubscription` are deleted, with no aliases or runtime compatibility layers.
> See the [execution plan](docs/migrations/v3-execution-plan.md) for the consumer codemod.
> v2 history is archived in [docs/design-history.md](docs/design-history.md).

## Why

A console page needs three **data capabilities** and a small number of **presentation layers**.
None of them needs a new engine:

| Capability | Role |
|---|---|
| **Query** | Cached reads: collections, records, lookups |
| **Command** | Named writes returning `Outcome` branches, with explicit invalidation effects |
| **Stream** | Cursor-positioned **frames** — backlog → follow, resync after gaps, backoff/polling |

**Entity** is an optional grouping for keys/scope/invalidation. It is not a fourth primitive.

Presentation is layered so every part can be replaced:

```
Value → Control → View → Chrome → Page Composition
```

- **Controls** are controlled props only: no fetching, no Router, no `window.history`.
- **Views** translate binding handles into control props; they never render `h1`.
- **Chrome** owns the page shell and is the only `h1` owner.
- **Preset pages** are thin compositions; **Page Templates** are copyable special pages.

## Packages

| Package | Role |
|---|---|
| `@lynxland/uikit-core` | Headless kernel / URL schema / REST-client-mock-stream adapters. **Zero React, zero Effect.** |
| `@lynxland/uikit-react` | Data / command / stream bindings. URL lives only in `/router`. |
| `@lynxland/uikit-surfaces` | Values, controls, views, chrome, fields + the `UiAdapter` contract. |
| `@lynxland/uikit-ui-shadcn` | Default UI adapter: Base UI + shadcn primitives and semantic tokens. |
| `@lynxland/uikit-ui-plain` | Optional minimal adapter proving the contract is replaceable. |
| `@lynxland/uikit-preset-console` | Default runnable pages: Collection / Record / Form / CRUD / Settings / Wizard / Events. |
| `@lynxland/uikit-testing` | `renderWithKit`, `createTestRouter`, capability-shaped mocks. |
| `@lynxland/uikit` | One-install meta entry; forwards the console preset. |

The root package is the private workspace `@lynxland/uikit-workspace`; `packages/meta` owns
the public `@lynxland/uikit` name.

## Quick start

```bash
pnpm add @lynxland/uikit @tanstack/react-query @tanstack/react-router \
  @tanstack/react-form @tanstack/react-table
```

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { PresetProvider } from "@lynxland/uikit";
import "@lynxland/uikit/preset.css";

const queryClient = new QueryClient();
const router = createRouter({ routeTree });

createRoot(root).render(
  <QueryClientProvider client={queryClient}>
    <PresetProvider>
      <RouterProvider router={router} />
    </PresetProvider>
  </QueryClientProvider>,
);
```

A URL-backed list page with filtering, sorting, paging, empty/error states and row actions:

```tsx
<CrudPage
  title="Widgets"
  source={widgets}
  search={widgetsSearch}
  from="/widgets"
  fields={widgetFields}
  filters={widgetFilters}
  create={{ command: createWidget, host: "dialog" }}
  update={{ command: updateWidget, host: "drawer", toInput: (row) => ({ ...row }) }}
  delete={{ command: deleteWidget }}
  getRowId={(row) => row.id}
/>
```

Or drop one layer and hand-wire the same parts:

```tsx
const page = useCollectionPage(widgets, { search: widgetsSearch, from: "/widgets" });
return (
  <PageLayout title="Widgets">
    <CollectionView
      list={page}
      columns={columns}
      filters={filterFields}
      filterState={{ text: page.state.q ?? "", filters: page.state.filters ?? [] }}
      onFilterChange={({ text, filters }) => page.patchState({ q: text, filters })}
      sort={page.state.sort}
      onSortChange={(sort) => page.setSort(sort.length ? sort : null)}
      pagerModel={page.pager}
    />
  </PageLayout>
);
```

## Principles

- **TanStack native.** Router, Query, Table and Form are the engines; uikit binds them.
- **Two axes, never mirrored.** Data capabilities are not UI families.
- **URL is an optional policy.** Data bindings never import Router; URL binding lives in
  `@lynxland/uikit-react/router`.
- **Failure ≠ result.** `ApiError` is the failure channel; `Outcome` is the result channel.
- **Frames, not events.** Streams deliver cursor-positioned frames, not opaque pub/sub.
- **No hidden protocol.** No `__resource` / `__scopeKeys` / `__id`; effects are explicit `Effect[]`.
- **Out-of-the-box belongs to the preset.** Core stays headless; every layer can be exited.

## Development

```bash
pnpm install
pnpm check        # layer-check + doc-check + typecheck + size-check + tests + v3 spike
pnpm --filter demo dev
pnpm --filter demo e2e
```

The demo is a strict Dokploy UI clone at `/dashboard/*` (home, projects,
environments, application/database/compose details, deployments, Traefik,
Docker, Requests, Schedules and settings), built only from the v3 packages.
Fidelity notes and remaining gaps live in
[docs/audits/2026-11-08-dokploy-dogfood.md](docs/audits/2026-11-08-dokploy-dogfood.md).

See [AGENTS.md](AGENTS.md) for the repo map and layer invariants,
[docs/design.md](docs/design.md) for the normative architecture,
[docs/SKILL.md](docs/SKILL.md) for the current API guide, and
[docs/versions.md](docs/versions.md) for the supported version matrix.

## License

MIT — see [LICENSE](LICENSE). Contributions follow [CONTRIBUTING.md](CONTRIBUTING.md);
community expectations follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md);
security reports follow [SECURITY.md](SECURITY.md).

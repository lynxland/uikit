## What changed

<!-- One paragraph. Link the issue/spec if there is one. -->

## Layer / package

- [ ] core (kernel/schema/adapters)
- [ ] react bindings or `/router`
- [ ] surfaces (values/controls/views/chrome/fields)
- [ ] UI adapter (ui-shadcn/ui-plain/custom)
- [ ] preset-console pages
- [ ] CLI / tooling
- [ ] docs / tests only

## v3 checklist

- [ ] No v2 aliases, dual APIs, or compatibility layers.
- [ ] Controls stay controlled (no `useQuery`/`useNavigate`/`window.history`).
- [ ] Views do not render `h1`; `PageLayout`/app shell owns the page header.
- [ ] `surfaces` does not import a concrete UI library; UI adapter contract updated if needed.
- [ ] `react` does not import Router outside `src/router/**`.
- [ ] Form Input types stay separate from Row; no `any` at public boundaries.
- [ ] `docs/design.md`, `docs/SKILL.md`, README/llms updated when public API changes.
- [ ] `pnpm check` is green.
- [ ] If a package/export changed: `exports`/`files`/`peerDependencies` updated.

## Verification

```text
pnpm check
pnpm --filter demo e2e   # when behavior/URLs change
```

## Screenshots / notes

<!-- Optional. -->

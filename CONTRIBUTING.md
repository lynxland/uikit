# Contributing to @lynxland/uikit

## Before you start

- Read [`docs/philosophy.md`](docs/philosophy.md) and [`docs/design.md`](docs/design.md).
- v3 is a **greenfield cutover with no backward compatibility**: do not add
  deprecated aliases, dual APIs, or runtime compatibility layers.
- The repo is still dogfooding; breaking changes are expected before 1.0.

## Development

```bash
pnpm install
pnpm check       # layer-check + doc-check + typecheck + size-check + unit + devtool + v3 spike
pnpm --filter demo dev
pnpm --filter demo e2e
```

## What to update with a change

| Change | Also update |
|---|---|
| Public API / types | `docs/design.md`, `docs/SKILL.md`, README/llms status |
| New package / export | `docs/design.md §7`, `AGENTS.md`, package `exports`/`files` |
| Page pattern | `docs/page-templates/`, demo |
| Decision with trade-offs | `docs/adr/` |
| Migration / breaking batch | `docs/migrations/` |
| Concept/term change | `docs/philosophy.md`, glossary in `docs/design.md`, doc-check |

## PR checklist

- [ ] `pnpm check` is green.
- [ ] No v2 compatibility shims/aliases.
- [ ] New abstraction has a real consumer (not demo-only) or is marked `pilot`/`template`.
- [ ] Controls are controlled; no `useQuery`/`useNavigate`/`window.history` in controls.
- [ ] Views do not render page headers/h1.
- [ ] Forms keep Row/Input types separate; no `any` at public form boundaries.
- [ ] UI adapter changes do not leak Base UI compound APIs into surfaces.
- [ ] Docs and links are updated; `doc-check` passes.

## Code style

- TypeScript strict; no `any` in public contracts.
- Named exports; no default exports.
- Keep `kernel` zero-dependency and zero-React.
- Keep `react` free of Router imports (URL binding lives in `react/src/router`).
- Keep `surfaces` free of concrete UI library imports.
- Prefer composition and slots over page-level configuration.

## Reporting

Use GitHub issues with a minimal reproduction, package versions, and the exact
command/output. For security issues, do not open a public issue; see
[`SECURITY.md`](SECURITY.md).

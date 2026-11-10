# Supported versions

The repo is tested on the versions below. Packages declare peer ranges; the
default preset/adapter is intentionally close to the TanStack/Base UI current
line.

| Area | Supported | Tested in this repo |
|---|---|---|
| Node.js | 20+ (CLI/tooling); 18 may work for headless core | 22.22.1 |
| pnpm | 10+ | 12.9.1 |
| React | 19+ | 19.3.x |
| `@tanstack/react-query` | 5.100+ | 5.104.x |
| `@tanstack/react-router` | 1.120+ | 1.170.x |
| `@tanstack/react-form` | 1.30+ | 1.33.x |
| `@tanstack/react-table` | 9.0+ | 9.3.x |
| `@base-ui/react` (ui-shadcn) | 1.9+ | 1.9.0 |
| Tailwind CSS (ui-shadcn) | 4.x | 4.3.x |
| TypeScript | 5.8+ | 5.9.x |

## Browser baseline

- Evergreen Chrome / Edge / Firefox / Safari, last two versions.
- `Intl.RelativeTimeFormat`, `Intl.DateTimeFormat`, `AbortController`,
  `URLSearchParams`, `ResizeObserver` are assumed.
- `ui-shadcn` uses Base UI focus/portal primitives; `ui-plain` is a minimal
  fallback without portal/focus-trap guarantees.

## Notes

- These are **peer ranges**, not bundled dependencies. `@lynxland/uikit-core`
  has zero runtime dependencies; `@lynxland/uikit-react` peers on React and
  TanStack; `ui-shadcn` peers on React/Base UI.
- TanStack Router is optional for data-only usage: it is only imported by
  `@lynxland/uikit-react/router`.
- Forms are optional at the composition level, but the current
  `@lynxland/uikit-react` root re-exports `useCommandForm`, so
  `@tanstack/react-form` is a root peer. A future subpath split can relax this.
- The version matrix is checked manually each release; add a changeset when a
  peer range changes.

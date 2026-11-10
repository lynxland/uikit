# Dokploy dogfooding — friction, gaps, and core fixes

> Date: 2026-11-08 (updated 2026-11-10)
> Reference: `~/workspace/paas/dokploy` (read-only; information architecture only)
> Visual source: official interface screenshots at
> `/home/qiulin/artifacts/dokploy-ui/*.webp`
> Demo: `apps/demo/src/features/dokploy/**`, routes under `/dashboard/*`
> Detailed build log: [`apps/demo/DOKPLOY_DOGFOOD.md`](../../apps/demo/DOKPLOY_DOGFOOD.md)

## 1. What was cloned

The old demo was removed. The app is now a Dokploy-only UI clone using
`core` / `react` / `surfaces` / `preset-console` / `ui-shadcn` plus
`lucide-react`. `/` redirects to `/dashboard/home`; there are no `/dokploy/*`
aliases.

| Route | Screen |
|---|---|
| `/dashboard/home` | Welcome, projects/services/deploys/status stats, recent deployments |
| `/dashboard/projects` | Compact project cards, URL search/tag/sort, create/delete/action menu |
| `/dashboard/project/$projectId/environment/$environmentId` | Project + environment switcher, one service-card grid, bulk actions, create service |
| `/dashboard/project/.../services/application/$applicationId` | General / Environment / Domains / Deployments / Preview / Schedules / Volume Backups / Logs / Patches / Monitoring / Advanced |
| `/dashboard/project/.../services/postgres|redis|compose/$serviceId` | Database/compose header, credentials, environment, logs, monitoring, backups, advanced |
| `/dashboard/deployments` | Global deployment table, URL status filter, pagination, streamed logs |
| `/dashboard/traefik` | Traefik file tree + configuration editor + warning |
| `/dashboard/docker` | Container table with filter, state/status/image columns |
| `/dashboard/requests` | Log cleanup schedule, date range, request table empty state |
| `/dashboard/schedules` | Scheduled task cards, cron, add/delete/run actions |
| `/dashboard/settings/servers` | Remote server cards, add/remove |
| `/dashboard/settings/web-server` | Server domain/HTTPS/certificate + web-server actions |
| `/dashboard/settings/ssh-keys` | SSH key rows, add placeholder |
| `/dashboard/settings/git-providers` | Brand provider buttons + connection rows + toggles |
| `/dashboard/settings/users` | Members table + invitations empty state |
| `/dashboard/settings/notifications` | Notification channel rows + add placeholder |
| `/dashboard/settings/profile` | Account/organization/profile + theme |
| `/dashboard/overview`, `/monitoring`, `/settings/sessions`, `/settings/deployments`, `/settings/audit-logs`, `/settings/ai`, `/settings/tags` | Honest placeholders (no fake data) |

## 2. Shell and visual treatment

- Floating 16rem sidebar rail (`8px` margin, rounded panel), 4rem header,
  16px main padding; page cards use the official `bg-sidebar p-2.5` outer rail
  + inner `bg-background` surface.
- Sidebar brand with the Dokploy mark, Enterprise badge, organization switcher
  and notification bell; Update Available card, account menu (theme switch
  inside), version line.
- Home/Settings/Extra groups in official order; title-case labels; filled
  rounded active item; no left rail.
- Header: collapse toggle, single shell-owned breadcrumb (project/environment/
  service dropdowns), right-aligned UTC server time. No duplicate page
  breadcrumb.
- App-level command palette on ⌘K/Ctrl+K (the official header has no visible
  search icon).
- Dark theme remains the default; brand marks are inlined for GitHub/GitLab/
  Bitbucket/Gitea/Slack.

## 3. What worked without friction

- Mutating entities with explicit `Effect[]` stayed honest and local.
- `useCollection` gave loading/empty/error states without a second async state
  machine.
- `useStream` + `LogViewer` worked for application and deployment logs
  (backlog × live, pause/clear/follow/download).
- `PageLayout` as the only `h1`, `SectionCard`, `StatusBadge`, `StatCard`,
  `MetricChart`, `RelativeTime`, `CopyButton`, Tabs, DataTable and the shadcn
  adapter carried Dokploy density without a second design system.
- `AppShell` sidebar slots, nested nav, active-path matching and collapse were
  sufficient for the official chrome.
- `useTabParam` / `useEnumSearch` handled URL-backed tabs and filters.

## 4. Friction and resolution

| # | Friction | Resolution |
|---|---|---|
| 1 | Nav icons in `.ts` data broke Vite; nav data with JSX needs `.tsx` | Documented; demo uses `nav.tsx` |
| 2 | `AppShell.renderLink` dropped icon/badge and forced consumers to copy private markup | **Fixed**: AppShell renders icon/badge around custom links |
| 3 | No `asChild`/router-aware Button; real `<Link>` inside Button is invalid | **Fixed**: `ButtonProps.asChild` in all adapters |
| 4 | No DropdownMenu primitive; card actions were inline | **Fixed**: `Menu` primitive in ui-shadcn/plain |
| 5 | `SecretReveal` is one-shot; no row-level masked secret | **Fixed**: `SecretValue` value primitive |
| 6 | `DataTable.onRowClick` mouse-only | **Fixed**: keyboard Enter/Space, focus-visible, `getRowProps` |
| 7 | No per-row `data-testid`/row props | **Fixed**: `DataTable.getRowProps(row, index)` |
| 8 | No reusable confirm/delete command host | **Fixed**: preset `ConfirmCommandDialog` |
| 9 | Every form host repeats `useCommandForm` + close-on-ok | **Fixed**: preset `CommandDialog` / `CommandDrawer` |
| 10 | `FieldInput<I>` has no hidden/meta field | Remaining; use `defaultValues` for non-rendered inputs |
| 11 | Tabs/env/status URL params need hand-written validators | **Fixed**: `useEnumSearch` / `useTabParam` |
| 12 | Nested nav group cannot also be a destination | Remaining by design: groups are toggles |
| 13 | Breadcrumb link needs internal CSS class each time | Remaining: Router-agnostic `Breadcrumb`; shell wires links |
| 14 | `MetricChart` has no legend/tooltip/y-axis readout | Remaining: sparkline; `chart` slot accepts a full chart |
| 15 | Relative time only rendered Intl short form (`1 hr. ago`) | **Fixed**: `RelativeTime format="long"` (`1 hour ago`) |
| 16 | `StatusBadge` vocabulary is generic | Expected: pass a per-domain `map` |
| 17 | `FormPage.cancel` is a header action vs `FormView` footer cancel | Remaining API inconsistency |
| 18 | Biome shared config can't parse Tailwind directives in demo `src` | Worked around with `apps/demo/theme.css` |

## 5. Core capabilities added because of Dokploy

- `AppShellNavItem.children` + `badge`; recursive `findActiveNavItem()`;
  nested nav auto-open; `sidebarHeader`/`sidebarFooter`/`header`; `collapsible`.
- `Button asChild` across ui-shadcn/ui-plain/test adapter.
- `Menu` adapter primitive (trigger/items/icon/danger/separator).
- `SecretValue` (masked row-level secret with reveal/copy).
- `DataTable` keyboard row activation + `getRowProps`.
- `useEnumSearch` / `useTabParam` URL hooks.
- Preset `CommandDialog` / `CommandDrawer` / `ConfirmCommandDialog`.
- `ThemeProvider` / `useTheme` / `ThemeToggle` / `themeScript` and `Breadcrumb`.
- `RelativeTime format="long"` for date-fns-style wording.
- DateTimeInput and Wizard footer fixes from the prior review pass.

## 6. Remaining gaps (intentional, not silent)

1. **MetricChart is a sparkline** — no hover readout/y-axis; use the `chart`
   slot for full Recharts/other charts until a real chart layer is designed.
2. **ContextMenu** — not exposed; right-click actions need a separate adapter
   primitive if a consumer needs it.
3. **CodeEditor** — env/YAML/Traefik editing uses monospace textarea surfaces;
   CodeMirror integration is a deliberate follow-up.
4. **FileTree / Terminal components** — Traefik/Docker screens compose these
   app-side; the shared surfaces do not yet expose file-tree or xterm contracts.
5. **Permissions gating** — `useCan` exists, but the clone does not model
   Dokploy's full permission matrix.
6. **Breadcrumb Router context** — remains app-wired, not a core Router
   dependency.
7. **Icon-rail collapse** — `AppShell` hides the sidebar in collapsed mode;
   an icon rail needs new chrome API/CSS.
8. **Command palette primitive** — the adapter has Dialog/Input but no
   `Command` compound; the palette is app-composed.
9. **Top-level Monitoring** — the route is an honest placeholder; application
   Monitoring is implemented.
10. **Generic brand marks** — provider icons are inlined Simple Icons; Dokploy's
    own globe/elephant marks are approximated with Lucide glyphs.

## 7. Prioritized core backlog

The remaining gaps above are triaged (P0/P1/P2, proposed API, acceptance) in
[`2026-11-10-dokploy-core-gaps.md`](2026-11-10-dokploy-core-gaps.md).

## 8. Verification

- `pnpm check` green (layer-check / doc-check / typecheck / size-check /
  tests / v3 spikes).
- Unit tests: core 44, react 33, testing 7, surfaces 89, ui-shadcn 29,
  ui-plain 25, preset 34, cli 5, spike 10.
- `pnpm --filter demo build` green (existing >500 kB chunk warning only).
- `pnpm --filter demo e2e` green: 16 tests covering redirect/home/shell,
  command palette, placeholders vs implemented settings, fleet pages, project
  filters/create/action menu/delete, environment switch/create, application
  tabs/env reveal/logs/monitoring/edit, database/compose detail credentials,
  deployments filter/pagination/logs, servers add/remove, SSH/Git/profile,
  Web Server/Users/Notifications.
- `pnpm exec biome check apps/demo/src apps/demo/e2e` pass (only the repo's
  pre-existing Biome config deprecation notice).

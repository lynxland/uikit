# Dokploy strict clone — dogfooding notes

Slice: `apps/demo`, rebuilt as a strict Dokploy UI clone using only the v3
packages (`core`, `react`, `surfaces`, `preset-console`, `ui-shadcn`) plus
`lucide-react`. Visual source of truth: the official interface screenshots at
`/home/qiulin/artifacts/dokploy-ui/*.webp`; reference read for information
architecture and spacing: `/home/qiulin/workspace/paas/dokploy/apps/dokploy`
(no application code copied).

The old demo is gone: widgets, tasks, collections, events, logs, owners,
quickstart, scopes, settings, boom and their libs/features/e2e were deleted.
`/` redirects to `/dashboard/home`; there are no `/dokploy/*` aliases.

## Route map

| Route | Screen |
|---|---|
| `/` | redirect → `/dashboard/home` |
| `/dashboard/home` | Welcome, 4 stat cards, status breakdown, recent deployments |
| `/dashboard/projects` | Compact project cards, URL search/tag/sort, create + delete |
| `/dashboard/project/$projectId/environment/$environmentId` | Project header + environment switcher, one service-card grid, bulk actions, create dialog/page |
| `/dashboard/project/.../services/application/$applicationId` | Application header + 11 URL tabs (General / Environment / Domains / Deployments / Preview / Schedules / Volume Backups / Logs / Patches / Monitoring / Advanced) |
| `/dashboard/project/.../services/postgres/$serviceId` | Postgres header, General credentials, Environment, Logs, Monitoring, Backups, Advanced |
| `/dashboard/project/.../services/redis/$serviceId` | Redis detail with the same tab shell |
| `/dashboard/project/.../services/compose/$serviceId` | Compose detail with compose-file card |
| `/dashboard/project/.../services/application/new` | Route-page application create |
| `/dashboard/deployments` | Global deployment table, URL status filter, pagination, streamed logs drawer |
| `/dashboard/traefik` | File tree, Traefik config editor, warning alert |
| `/dashboard/docker` | Container table with filter + state/status/image columns |
| `/dashboard/requests` | Cleanup schedule, date range, request table empty state |
| `/dashboard/schedules` | Scheduled task cards with cron and actions |
| `/dashboard/settings/servers` | Remote server cards, add + remove |
| `/dashboard/settings/web-server` | Server domain/HTTPS/certificate + web-server actions |
| `/dashboard/settings/ssh-keys` | SSH key rows, add placeholder |
| `/dashboard/settings/git-providers` | Brand provider buttons + connection rows + toggles |
| `/dashboard/settings/users` | Members table + invitations empty state |
| `/dashboard/settings/notifications` | Notification channel rows + add placeholder |
| `/dashboard/settings/profile` | Account/organization/profile form, theme |
| `/dashboard/overview`, `/monitoring`, `/settings/sessions`, `/settings/deployments`, `/settings/audit-logs`, `/settings/ai`, `/settings/tags` | Honest placeholders with EmptyState |

`/dashboard` and `/dashboard/settings` redirect to home/profile respectively.

## Shell

- `AppShell` with `sidebarHeader` / `sidebarFooter` / collapsible toggle and
  one shell-owned breadcrumb. No page passes `breadcrumb` to `PageLayout`.
- Floating 16rem sidebar rail: 8px margin, rounded panel, 4rem main header,
  16px main padding — matching the official geometry.
- Sidebar sections mirror Dokploy: Home (Home, Projects, Deployments,
  Monitoring, Schedules, Traefik File System, Docker, Swarm, Requests),
  Settings (Web Server, Profile, Remote Servers, Deployments, Users, Audit Logs,
  SSH Keys, AI, Tags, Git), Extra (Documentation, Support). The Sessions and
  Notifications routes exist but intentionally stay out of the sidebar so the
  visible list matches the official screenshots.
- Sidebar header: Dokploy logo, organization switcher with Enterprise badge,
  notification bell. Footer: Update Available card, account menu (theme switch
  inside), version line.
- Header: collapse toggle, project/environment/service breadcrumb dropdowns,
  UTC server time. No visible command icon; ⌘K/Ctrl+K opens the palette.
- Command palette is app-level (`src/components/command-palette.tsx`): Dialog +
  Input + filtered nav destinations, arrow keys, Enter, Escape.
- Every main page uses the Dokploy card frame: outer `rounded-xl bg-sidebar
  p-2.5` + inner `rounded-xl bg-background` (`DokployCard`). Settings pages opt
  out of viewport fill and centre at 53rem.
- `--sidebar` is derived in `apps/demo/theme.css` from `background`/`foreground`
  and mapped to Tailwind `bg-sidebar`; no new palette lives in packages.
- Brand marks are inline SVG: Dokploy logo, GitHub/GitLab/Bitbucket/Gitea/Slack.

## Dokploy treatment

- Home: welcome heading, Projects/Services/Deploys 7d/Status cards,
  recent deployments with status dot, project/environment, server, long
  relative time and logs link.
- Projects: folder icon header, filter/search, Tags menu, sort select,
  four-column compact cards (`Created X ago` + `N services`), create dialog,
  action menu and delete confirmation.
- Environment: project name + `/ production` switcher + copy, description,
  Project Environment + Create Service, Select All/Bulk Actions, filter/sort/
  type/server, one card grid with type icon and status dot.
- Application: icon + status dot + name/appName, server badge, edit/delete,
  segmented tab bar; General with Deploy Settings + provider tabs; Environment
  with line-numbered masked editor; Domains as two-column cards; Deployments
  with webhook + rows; Logs toolbar; Monitoring 2×2 cards with heading.
- Database/compose: header, General Deploy Settings + Internal/External
  Credentials (masked password/URL with reveal/copy) or Compose file.
- Deployments: `CollectionPage` + URL status filter/pagination + streamed logs
  drawer.
- Settings: 53rem centred cards for Servers, Web Server, SSH Keys, Git,
  Users, Notifications and Profile; provider brand colours and brand icons.

## Coverage boundary

Implemented and visually checked: Home, Projects, Project Environment,
Application General/Environment/Domains/Deployments/Logs/Monitoring, Postgres
credentials, global Deployments, Traefik, Docker, Requests, Schedules, and
Settings Servers/Web Server/SSH/Git/Users/Notifications/Profile.

Partial or placeholder: Application Preview/Schedules/Volume Backups/Patches,
Application Advanced, database Backups/Advanced, compose Containers/Backups/
Schedules/Volume Backups, Project Environment dialog, mobile shell, bulk delete,
and Settings Sessions/Deployments/Tags. Top-level Monitoring, Swarm, Templates,
Settings AI/Audit Logs/Certificates/Registry/S3/SSO/License/Whitelabeling,
build-log modal, Create Backup and Create Custom Role are not implemented.
The full status and core backlog are in
[`docs/audits/2026-11-10-dokploy-core-gaps.md`](../../docs/audits/2026-11-10-dokploy-core-gaps.md).

## Remaining gaps

1. **Command palette primitive** — the adapter has Dialog/Input but no
   `Command` compound; the palette is app-composed.
2. **Icon-rail collapse** — `AppShell` hides the sidebar in collapsed mode.
3. **Breadcrumb link context** — `Breadcrumb` is Router-agnostic; the shell
   wires `<Link>` per crumb.
4. **MetricChart is a sparkline** — it already has a legend, last values and
   x-axis min/max, but no y-axis ticks/hover readout/area mode/thresholds, and
   series colors are index-based (not stable by `key`); the monitoring tab
   composes cards + `formatValue`.
5. **No ContextMenu / CodeEditor / FileTree / Terminal** adapter primitives;
   Traefik/Docker/compose editing uses app-side monospace textareas.
6. **Permission matrix** — no `useCan` gating; the clone is a single admin.
7. **Form host consistency** — dialog forms close via `onSettled`; the route
   page still uses `FormPage` header cancel.
8. **Top-level Monitoring** — honest placeholder; application monitoring is
   implemented.
9. **Brand marks** — official GitHub/GitLab/Bitbucket/Gitea/Slack marks are
   inlined; Dokploy's own globe/elephant service icons are approximated with
   Lucide glyphs.
10. **Data values** — timestamps, server identities and counts are demo data, so
    absolute numbers differ from the screenshots.

The prioritized core backlog (P0/P1/P2 with proposed APIs and acceptance) is
in [`docs/audits/2026-11-10-dokploy-core-gaps.md`](../../docs/audits/2026-11-10-dokploy-core-gaps.md).

## Verification

- `pnpm check` — pass (layer-check / doc-check / typecheck / size-check /
  tests / v3 spikes).
- `pnpm --filter demo typecheck` — pass.
- `pnpm --filter demo build` — pass (existing >500 kB chunk warning only).
- `pnpm --filter demo e2e` — 16 tests pass: root redirect/home/shell,
  collapse, command palette, placeholders vs Web Server, fleet pages, project
  filters/create/action menu/delete, environment switch/create, application
  tabs/env reveal/logs/monitoring/edit drawer, database/compose detail,
  deployments filter/pagination/logs, remote servers add/remove,
  SSH/Git/profile, Web Server/Users/Notifications.
- `pnpm exec biome check apps/demo/src apps/demo/e2e` — pass.

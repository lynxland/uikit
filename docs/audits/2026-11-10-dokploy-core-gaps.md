# Dokploy clone — friction & core gap backlog

> Date: 2026-11-10
> Evidence: `apps/demo` strict Dokploy clone + official screenshots
> (`/home/qiulin/artifacts/dokploy-ui/*.webp`, live captures in
> `/home/qiulin/artifacts/dokploy-live/`)
> Scope: gaps that survived the clone, with priority for `@lynxland/uikit`
> core/surfaces work. Demo-only workarounds are called out explicitly.

## 1. Friction already resolved in the packages

| Friction | Resolution |
|---|---|
| AppShell could not render nav icons/badges around custom Router links | `AppShell.renderLink` keeps icon/badge; `sidebarHeader`/`sidebarFooter`/`header` slots |
| Nested nav groups could not open on active child | `AppShellNavItem.children` + recursive `findActiveNavItem()` |
| No router-aware Button | `Button asChild` in all adapters |
| No dropdown menu primitive | `Menu` adapter primitive |
| No row-level masked secret | `SecretValue` value primitive |
| DataTable rows were mouse-only / lacked test ids | keyboard Enter/Space + `getRowProps` |
| Tabs/filters needed hand-written URL validators | `useEnumSearch` / `useTabParam` |
| Every form host repeated command-dialog plumbing | preset `CommandDialog` / `CommandDrawer` / `ConfirmCommandDialog` |
| Theme switch/class/localStorage repeated | `ThemeProvider` / `ThemeToggle` / `themeScript` |
| Breadcrumb was app-specific | Router-agnostic `Breadcrumb` |
| Relative time only produced Intl short form (`1 hr. ago`) | `RelativeTime format="long"` → `1 hour ago` |
| Date/time input missing | `DateTimeInput` |

## 2. Friction that should stay app-level

These are deliberate application concerns, not core gaps:

| Concern | Why it stays in the app |
|---|---|
| `DokployCard` page frame | Dokploy-specific chrome; `PageLayout` is already the h1 owner |
| Server clock in the header | Application header slot content |
| Dokploy/provider brand marks | Brand assets and licensing; app can inline Simple Icons |
| Project/environment/service breadcrumb dropdowns | Needs app data + Router navigation |
| Four service-detail routes (application/postgres/redis/compose) | Route shape is TanStack Router/app-specific |
| Permission matrix | Identity model belongs to the consumer; `useCan` exists |
| Top-level Monitoring placeholder | Page composition decision, not a primitive |
| Demo timestamps/servers/names | Fixture data |

## 3. Core backlog (prioritized)

### P0 — blocks parity or repeats on every page

#### 3.1 `CommandPalette` + `Kbd` + `useHotkey`

**Observed:** `src/components/command-palette.tsx` is ~200 lines of Dialog +
Input + filtering + arrow-key navigation. There is no `Command` compound in
the adapter and no reusable global shortcut hook. `⌘K` is hand-wired.

**Proposal:**
- `surfaces` `CommandPalette` control: `items` (label/group/icon/keywords/
  onSelect/disabled), `open`, `onOpenChange`, `placeholder`, `empty`.
- `Kbd` value for shortcut hints.
- `useHotkey`/`usePlatformModifier` hook (window listener, input-safe).
- Keep the preset `CommandDialog` for mutation forms; the palette must be a
  distinct name to avoid the existing collision.

**Acceptance:** demo deletes its palette implementation and opens the same
palette with ⌘K/Ctrl+K, arrows, Enter, Escape.

#### 3.2 `Toast` / `useToast`

**Observed:** every placeholder action uses an inline `role="status"` string or
a persistent message under a card. Dokploy uses transient toasts for
save/deploy/delete feedback. The adapter has no Toast primitive.

**Proposal:** adapter `ToastProvider`/`toast()` contract (`success` / `error` /
`info`, action, duration), surfaces provider at app root, ui-shadcn + ui-plain
implementations.

**Acceptance:** Settings save, deploy, delete and placeholder actions emit
toasts; no inline messages remain on those surfaces.

#### 3.3 `Tooltip`

**Observed:** icon-only buttons (edit/delete/server actions/breadcrumb close)
and collapsed sidebar items rely on `title` or `aria-label`. There is no
Tooltip primitive in the adapter.

**Proposal:** adapter `Tooltip` (trigger/content/side/align/delay); use it for
icon buttons and `AppShell` collapsed items.

**Acceptance:** icon actions show the same labels as their `aria-label` without
layout shift.

#### 3.4 `StatusDot` value

**Observed:** status dot color maps are duplicated in Home, Projects, service
cards, application/database headers and breadcrumbs (`SERVICE_STATUS_DOT`,
`statusDotClass`, `statusBreakdown`).

**Proposal:** `StatusDot` value with `tone` (`success|warning|danger|info|
neutral`), optional label and `aria-label`, using the same status tokens as
`StatusBadge`.

**Acceptance:** all dot sites use `StatusDot`; no app-level color maps.

#### 3.5 `AppShell` shell variants + icon rail + mobile drawer + sidebar token

**Observed:**
- Floating Dokploy rail (16rem, 8px margin, rounded panel) is implemented by
  demo CSS overriding `.ui-app-shell__sidebar`.
- Collapsed mode hides the sidebar entirely; official Dokploy collapses to an
  icon rail with tooltips.
- Below 640px the base CSS shrinks the sidebar to 11rem instead of a mobile
  Sheet/drawer.
- `--sidebar` is derived in `apps/demo/theme.css`; the shared token contract
  has no sidebar surface token.

**Proposal:**
- `AppShell variant="plain" | "floating" | "inset"` and width token
  (`14rem` default, `16rem`/custom).
- `collapsedMode="hide" | "icon"` with icon-rail CSS and tooltip labels.
- Mobile drawer contract (Sheet) for the sidebar.
- `--ui-sidebar` token in `ui-shadcn/tokens.css` + adapter contract.
- Optional `SidebarSection`/`SidebarFooter` sticky behavior documented.

**Acceptance:** demo deletes its shell CSS overrides (except brand styling) and
gets floating/icon-rail/mobile behavior from `AppShell` props.

#### 3.6 `CodeEditor` value

**Observed:** Environment, Traefik config and Compose file use a hand-built
`textarea` + line-number gutter. Masked mode replaces the value with dots, so
editing while hidden is impossible; no syntax highlighting, validation or
selection helpers.

**Proposal:** `CodeEditor` value with `value`, `onChange`, `language`,
`lineNumbers`, `readOnly`, `masked`, `onMaskedChange`, `minHeight`, `gutter`;
adapter can lazily wrap CodeMirror/Monaco, with a textarea fallback.

**Acceptance:** Environment/Traefik/Compose use one component; reveal toggles
without changing the underlying value; line numbers stay aligned.

#### 3.7 `InputGroup` + `SecretInput`

**Observed:** credential rows repeat `Input + reveal Button + CopyButton`;
form fields repeat trailing icon buttons. There is no input group or editable
secret control.

**Proposal:**
- `InputGroup` control (`Input` + leading/trailing addons).
- `SecretInput` (masked value, reveal, copy, optional generate).
- Or extend `SecretValue` with an `editable` mode.

**Acceptance:** Postgres/Redis credentials and env-var secret fields use the
shared control.

#### 3.8 `MetricChart` readout/axes/legend/thresholds

**Observed:** application monitoring needs axes, used/limit readouts, series
legends and units. `MetricChart` is a sparkline; the demo hand-builds legends,
progress bars and used labels.

**Proposal:** props for `showAxis`, `showLegend`, `tooltip`, `unit`,
`domain`, `threshold`, `valueFormatter`, `height`, plus a `series.name/color`.
Keep the sparkline default for compact cards.

**Acceptance:** Monitoring tab uses `MetricChart` legends/readout instead of
bespoke markup; CPU/Memory/Block I/O/Network match the official cards.

#### 3.9 `Tabs variant="segmented"`

**Observed:** Dokploy application tabs are a full-width segmented rail. The
demo uses `.dokploy-tabs` CSS to restyle the pills variant.

**Proposal:** add a first-class `segmented` variant (full-width, muted rail,
filled active tab, tokenized) to the adapter contract and both adapters.

**Acceptance:** demo removes `.dokploy-tabs` and uses `variant="segmented"`.

#### 3.10 `useTabParam` value validation

**Observed:** every tab route repeats:
`tab = serviceTabs(...).some(...) ? tab : "general"`, then casts.
`useTabParam` accepts any string.

**Proposal:** `useTabParam({ from, values, defaultValue })` (same for
`useEnumSearch`); return the validated value and a typed setter.

**Acceptance:** application/service detail route wrappers contain no manual
validation/casts.

### P1 — important, but can follow the P0 batch

#### 3.11 `FileTree` control

Traefik uses an app-side static tree. Proposal: controlled `FileTree` with
`items` (id/label/icon/children), `expanded`, `selected`, `onSelect`,
`onExpandedChange`, keyboard navigation. Acceptance: Traefik screen uses it.

#### 3.12 `ColumnPicker` for DataTable

`DataTable` already supports controlled column visibility, but there is no UI.
Docker/Requests "Columns" buttons are local placeholders. Proposal:
`ColumnPicker` control (`columns`, `visibility`, `onVisibilityChange`) that
pairs with `DataTable`. Acceptance: both fleet tables use it.

#### 3.13 `PageLayout` title size + content width

Different pages need 30/24/20px h1 sizes; the demo repeats arbitrary variants
`[&_.ui-page-layout__title]:text-2xl`. Settings need 53rem, between the
existing `narrow` (48rem) and `wide` (72rem).

**Proposal:** `titleSize="sm" | "md" | "lg"` and `maxWidth` token or
`width="content"`. Acceptance: remove title arbitrary classes and settings
`max-w-[53rem]` wrappers.

#### 3.14 `Menu` checkbox/radio/submenu items

The Tags filter and provider menus use plain `onSelect` toggles. Official menus
use checkbox/radio semantics and nested groups. Proposal: menu item kinds
`item | checkbox | radio | separator | label | submenu`, with `checked` and
`onCheckedChange`. Acceptance: tag filtering exposes checked state to AT.

#### 3.15 `LogViewer` toolbar/renderLine slots

Deployment logs use `LogViewer`; the application Logs tab is hand-rendered to
match Dokploy's container select/filter bar/colored lines. Proposal:
`toolbar` slot and `renderLine(frame, index)` plus `container`/`limit` props.
Acceptance: application Logs tab uses `LogViewer` without losing the toolbar.

#### 3.16 `ContextMenu`

Not hit in the strict screenshots, but Docker/row actions will need right-click
semantics. Proposal: adapter ContextMenu (same item model as Menu). Acceptance:
Docker row menu can be triggered by right-click and keyboard.

#### 3.17 `Terminal` / stream-backed terminal

"Open Terminal" and server terminal actions are placeholders. Proposal:
surface `Terminal` view with an injectable xterm adapter and a `Stream`/command
transport contract. This is the largest item; keep out of the P0 batch.

#### 3.18 `Combobox` / searchable select

Provider/repository/server pickers will outgrow `Select`. Proposal: controlled
`Combobox` (options, query, value, onChange, empty) in the adapter contract.

### P2 — consistency / cleanup

- `FormPage` header cancel vs `FormView` footer cancel inconsistency.
- `FieldInput` hidden/meta field (still use `defaultValues` workaround).
- Card/toolbar composition helpers (`Toolbar`, `CardRail`) if repeated after
  the P0/P1 work.
- Shared clock/now context instead of one timer per `RelativeTime` and the
  root server clock re-rendering the shell every second.
- `Breadcrumb` router context (currently app-wired; design keeps it
  Router-agnostic, so only revisit if another consumer needs it).

## 4. Suggested batches

1. **Shell & feedback:** Tooltip + StatusDot + Kbd/useHotkey + CommandPalette +
   Toast + AppShell variants/icon rail/mobile drawer + `--ui-sidebar`.
2. **Forms & editor:** InputGroup + SecretInput + CodeEditor + useTabParam
   values + FormPage/FieldInput consistency.
3. **Data display:** MetricChart readout + Tabs segmented + ColumnPicker +
   LogViewer slots + PageLayout title size/width.
4. **Heavy surfaces:** FileTree + ContextMenu + Menu submenu/check/radio +
   Combobox + Terminal.

Each batch should land with the demo consuming the new API (no demo-only CSS or
duplicated markup left behind) and with the Dokploy screens in
`apps/demo` as the acceptance fixture.

## 5. Verification baseline

- `pnpm check` green (all packages + spike).
- `pnpm --filter demo build` green.
- `pnpm --filter demo e2e` 16/16 green.
- `pnpm exec biome check apps/demo/src apps/demo/e2e` green.
- Official screenshots and live captures kept outside the repo under
  `/home/qiulin/artifacts/dokploy-{ui,live}/`.

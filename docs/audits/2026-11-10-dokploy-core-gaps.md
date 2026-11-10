# Dokploy clone — friction, coverage, core backlog

> Date: 2026-11-10 (deep pass after the first backlog)
> Evidence: 38 official screenshots (`/home/qiulin/artifacts/dokploy-ui/*.webp`),
> live captures (`/home/qiulin/artifacts/dokploy-live/`), the demo source, and
> the official Dokploy source at `~/workspace/paas/dokploy/apps/dokploy`.
> Scope: what survives as friction after the strict clone; which gaps belong
> to `surfaces`, the UI adapter, `react`, `preset-console`, or the app.

## 1. Corrections to the first backlog

| Previous claim | Correction |
|---|---|
| `MetricChart` has no legend | It already renders a legend with last values and min/max x labels. Missing: y-axis ticks, hover readout, area mode, thresholds, units, `showLegend`, explicit series colors. |
| `MetricChart` colors are stable | Bug: `buildGeometry` sets `colorIndex: index`, so reordering series changes colors despite the `key` comment. Use `series.color` or a stable key hash. |
| `Tabs` only has underline | The adapter already has `underline`, `pills` and `filter`. Missing: a full-width segmented variant and `className`/`fullWidth`; `PageLayout` also hardcodes underline. |
| `DataTable` has no column visibility | The data table already supports controlled `columnVisibility` / `onColumnVisibilityChange`. Missing: a `ColumnPicker` UI. |
| Root server clock re-renders the shell every second | False: `ServerTime` is a leaf component with its own timer. Remove this from the backlog. |
| Mobile sidebar "shrinks" | It is worse: at 390px the 11rem sidebar is still present, the brand overlaps, the header time clips, and `PageLayout` actions squeeze the h1 out of view (`home-mobile.png`). This is a broken shell, not a cosmetic breakpoint. |
| No `Command` primitive in the adapter → add one | The palette and searchable menus can be built in `surfaces` from Dialog/Input/Popover + a headless list-navigation hook. Do not necessarily add a third adapter compound; the data-layer `Command` name is already taken. |
| First backlog listed only the obvious primitives | Also missing: `Alert`, `Progress`, `Avatar`, `Separator`, `DateRange/Calendar`, `InputGroup`, and consistent styling escape hatches on `Popover`/`Select`/`Menu`. |

Two coverage corrections are more serious than the API list:

- Several official screens are **not cloned**: top-level Monitoring, Swarm,
  Templates, Settings AI/Audit Logs/Certificates/Registry/S3/SSO/License/
  Whitelabeling, build-log modal, create-backup/custom-role dialogs.
- Several screens are **partial**: application Preview/Schedules/Volume
  Backups/Patches tabs; database Backups/Advanced; compose Containers/
  Backups/Schedules/Volume Backups; Project Environment dialog; mobile.

## 2. Layer model used below

| Layer | Owns | Examples |
|---|---|---|
| `surfaces` values/controls/chrome | Layout, state contracts, keyboard logic that is not portal/styling-specific | `PageLayout`, `AppShell`, `DataTable`, `MetricChart`, `LogViewer`, `StatusDot` |
| UI adapter (`ui-shadcn` / `ui-plain`) | Portal, focus, positioning, visual primitives | `Tooltip`, `Toast` viewport, `Menu`, `Tabs`, `Select`, `Popover` |
| `react` / `react/router` | Data/URL bindings | `useTabParam`, `useCollection`, `useSearchState` |
| `preset-console` | Opinionated page composition | `SettingsPage`, `CollectionPage`, `CommandDialog` |
| `apps/demo` | Dokploy-specific data, routes, brand, page frame | `DokployCard`, service routes, fixtures |

A new adapter primitive is justified only when it needs portal/positioning/
focus management or is shared by multiple surfaces. Pure display pieces
(`StatusDot`, `Progress`, `Alert`) should stay in `surfaces`, not the adapter.

## 3. Friction already resolved

| Friction | Resolution |
|---|---|
| AppShell could not render nav icons/badges around custom Router links | `AppShell.renderLink` keeps icon/badge; header/footer slots |
| Nested nav groups could not open on active child | `children` + recursive `findActiveNavItem()` |
| No router-aware Button | `Button asChild` in all adapters |
| No dropdown menu | adapter `Menu` |
| No row-level masked secret | `SecretValue` |
| DataTable rows mouse-only / no row test ids | Enter/Space + `getRowProps` |
| Tabs/filters needed hand-written URL validators | `useEnumSearch` / `useTabParam` |
| Repeated command-dialog plumbing | preset `CommandDialog` / `CommandDrawer` / `ConfirmCommandDialog` |
| Theme switch/class/localStorage repeated | `ThemeProvider` / `ThemeToggle` / `themeScript` |
| Breadcrumb was app-specific | Router-agnostic `Breadcrumb` |
| Relative time only short (`1 hr. ago`) | `RelativeTime format="long"` |
| Date/time input missing | `DateTimeInput` |

## 4. Deliberately app-level

| Concern | Why |
|---|---|
| `DokployCard` page rail | Dokploy-specific page frame; `PageLayout` owns the h1 |
| Server clock, Server Time badge | Header slot content |
| Dokploy/provider brand marks | Brand assets/licensing; app inlines Simple Icons |
| Project/environment/service breadcrumb dropdowns | Needs app data + Router |
| Four service detail routes | TanStack Router route shape |
| Permission matrix | Identity model; `useCan` exists |
| Fixtures/timestamps/servers | Demo data |
| Top-level page composition | Preset/app decision, not a primitive |

## 5. Coverage boundary (app fidelity, not core API)

### Implemented and visually checked

Home, Projects, Project Environment (service grid), Application General/
Environment/Domains/Deployments/Logs/Monitoring, Postgres General credentials,
Deployments global, Monitoring (top-level server dashboard), Traefik, Docker,
Requests, Schedules, Settings Servers/Web Server/SSH/Git/Users/Notifications/
Profile/Audit Logs/AI/Certificates/Registry/S3 Destinations/License.

### Partial

| Screen | What is missing |
|---|---|
| Application `Preview Deployments` / `Schedules` / `Volume Backups` / `Patches` | Honest placeholders; official has content |
| Application `Advanced` | Simplified card list; official has Run Command/arguments + Cluster Settings/registry/replicas |
| Database `Backups` | Empty placeholder; official has backup cards and Create/Restore |
| Database `Advanced` | Simple list; official has cluster/registry settings |
| Compose detail | Missing Containers/Backups/Schedules/Volume Backups tabs and provider/compose editor |
| Project Environment dialog | Read-only info; official can manage the environment |
| Bulk actions | Delete selected is disabled; only select/clear works |
| Settings Sessions/Deployments/Tags | Placeholders |

### Not implemented (official screenshots exist)

- Swarm overview/containers.
- Templates / create-from-template dialog.
- Settings SSO, Whitelabeling.
- Build-log modal (different from the deployment log drawer).
- Create Backup and Create Custom Role dialogs.
- Notification add/edit and most server/git/deploy action flows are local
  placeholders.

This matters for planning: the remaining "strict clone" work is not mainly
more core primitives; a large part is page composition and real data/commands.

## 6. Core backlog

### P0 — blocks shell/layout parity or repeats on every page

#### 6.1 AppShell: floating/inset variants, icon rail, mobile drawer, tokens

- **Layer:** surfaces + adapter token/Tooltip integration.
- **Evidence:** demo `theme.css` overrides the sidebar width/margins/border;
  `surfaces.css` hardcodes `14rem`, `3rem` header and shrinks the sidebar to
  `11rem` below 640px; collapsed mode is `display:none`; `home-mobile.png` is
  unusable.
- **Proposal:**
  - `variant="plain" | "floating" | "inset"`, `sidebarWidth`, `headerHeight`.
  - `collapsedMode="hide" | "icon"` with a real rail and tooltip labels.
  - `mobileOpen` / `onMobileOpenChange` + drawer integration.
  - Persist collapsed/mobile state (`storageKey` or controlled by app).
  - `--ui-sidebar`, `--ui-sidebar-fg`, `--ui-sidebar-accent`,
    `--ui-sidebar-border` tokens for light/dark and both adapters.
- **Acceptance:** demo deletes its shell CSS overrides; 390px uses a drawer and
  the h1/actions remain visible; collapsed mode is an icon rail.

#### 6.2 PageLayout contract: title size, divider, tabs variant, width, mobile

- **Layer:** surfaces.
- **Evidence:** official pages have a full-width divider under the header;
  demo uses `PageLayout` without one. Titles need 30/24/20px across pages and
  demo repeats `[&_.ui-page-layout__title]:text-2xl`. Settings need 53rem,
  between `narrow` 48 and `wide` 72. `PageLayout` hardcodes
  `variant="underline"`, so the demo bypasses it with `.dokploy-tabs`.
  At 390px the non-wrapping header lets actions squeeze the h1 out.
- **Proposal:** `titleSize`, `headerDivider`, `tabsVariant`, `maxWidth`/
  `width="content"`, and responsive header stacking (`flex-wrap`; actions move
  below the heading on narrow screens).
- **Acceptance:** no title arbitrary variants, no `.dokploy-tabs`, no settings
  `max-w` wrapper; mobile title visible; dividers match official.

#### 6.3 Command palette + searchable command menu + Kbd/hotkey

- **Layer:** surfaces (composite), not a new adapter compound.
- **Evidence:** `command-palette.tsx` is ~200 lines of Dialog/Input/filter/
  arrows; environment switcher (`environments.webp`) is a popover with a search
  input, checked current item and Esc hint; demo uses a plain `Menu`.
- **Proposal:** one headless list-navigation hook (`query`, `activeIndex`,
  arrow/Home/End/Enter/Escape, scroll-into-view) used by:
  - `CommandPalette` (Dialog wrapper, items/groups/onSelect/footer shortcut);
  - `CommandMenu` (Popover/trigger wrapper for environment/provider pickers);
  - `Kbd` display.
  Keep the data `Command` name untouched; use `CommandPalette` or
  `SearchPalette`, and document the naming distinction from preset
  `CommandDialog`.
- **Acceptance:** palette and environment switcher both use the primitive; no
  custom keyboard code in demo.

#### 6.4 Toast / useToast

- **Layer:** surfaces provider + adapter viewport (ui-shadcn Base UI toast;
  ui-plain accessible fallback).
- **Evidence:** demo uses inline `role="status"` messages under cards; official
  uses `sonner` toasts.
- **Proposal:** `ToastProvider` + imperative `toast.success/error/info` with
  action, duration, dismiss; `aria-live`.
- **Acceptance:** deploy/save/delete/placeholder actions use toasts; no inline
  messages remain; SSR/queue behavior tested.

#### 6.5 Tooltip

- **Layer:** adapter.
- **Evidence:** icon-only buttons and collapsed nav use `title`/`aria-label`;
  official has tooltips.
- **Proposal:** `Tooltip` trigger/content/side/align/delay; use for icon
  buttons and icon rail; never replace `aria-label`.
- **Acceptance:** no `title`-only actions in demo.

#### 6.6 StatusDot

- **Layer:** surfaces value.
- **Evidence:** `SERVICE_STATUS_DOT`, `statusDotClass`, status breakdown and
  header dots repeat tone maps.
- **Proposal:** `StatusDot` with `tone`, `label`, `aria-label`, optional pulse;
  maps via `StatusTone`.
- **Acceptance:** no app-level dot color maps.

#### 6.7 CodeEditor

- **Layer:** surfaces value + optional lazy adapter/editor (CodeMirror).
- **Evidence:** env/Traefik/compose use `textarea` + manual gutter; official
  uses CodeMirror with properties/YAML/compose languages, line numbers and
  `-webkit-text-security` for masked environment editing; compose screenshot
  shows syntax-highlighted YAML.
- **Proposal:** `value`, `onChange`, `language` (`properties|yaml|json|shell|
  compose`), `lineNumbers`, `wrap`, `readOnly`, `masked` (text-security or
  overlay), `minHeight`, `completion`, `onMaskedChange`; textarea fallback.
- **Acceptance:** Environment, Traefik and Compose use one component; masked
  mode keeps line alignment and can reveal without losing the draft.
- **Risk:** CodeMirror is heavy; export under an optional adapter entry or
  lazy-load it; textarea fallback must remain dependency-free.

#### 6.8 MetricChart: axis/readout/area/threshold/stable colors

- **Layer:** surfaces.
- **Evidence/correction:** legend + last values + x min/max already exist.
  Missing y-axis ticks, hover readout, area fill, thresholds, units,
  `showLegend`, per-series colors/formatters. `colorIndex` uses array index,
  so series colors are not stable despite the `key` comment. Official server/
  app monitoring uses progress bars, area charts and a donut.
- **Proposal:** add `showLegend`, `showYAxis`, `area`, `tooltip`, `unit`,
  `domain`, `thresholds`, `series.color/label`, `valueFormatter`; keep the
  dependency-free SVG and `chart` escape hatch for Recharts/donuts.
- **Acceptance:** application monitoring and top-level monitoring use the same
  chart; no index-based color drift; no chart library added to surfaces.

#### 6.9 InputGroup + SecretInput

- **Layer:** surfaces controls; adapter may need a bare/grouped input variant.
- **Evidence:** credential rows repeat Input + reveal + CopyButton; official
  has `InputGroup` and a `Secrets` editor with vault import/toggle.
- **Proposal:** `InputGroup` (inline/block addons, input/textarea, button,
  text), `SecretInput` (masked/reveal/copy/generate, `text-security` or
  type=password); keep `SecretValue` for display cells.
- **Acceptance:** Postgres/Redis credentials and env secret fields use one
  control.

#### 6.10 useTabParam value validation

- **Layer:** `react/router`.
- **Evidence:** each tab route repeats `values.some(...) ? value : "general"`
  and casts; `useEnumSearch` validates but `useTabParam` does not.
- **Proposal:** `useTabParam({ from, values, defaultValue })`, returning a
  typed value; same for a generic `useSearchEnum`.
- **Acceptance:** route wrappers contain no manual validation/casts.

### P1 — shared display/controls; high value after P0

| Gap | Layer | Evidence | Proposal / acceptance |
|---|---|---|---|
| `Alert` | surfaces value | Traefik/Requests warning banners; Advanced info banner in `application-advanced.webp` | Tone (`info|success|warning|danger`), icon, title/description, action, `live` control; replace `WarningAlert`. |
| `Progress` | surfaces value | CPU/Memory bars in app/server monitoring | `value`, `max`, `indeterminate`, tone, label; replace raw bar divs. |
| `Tabs` segmented/full-width | adapter + `PageLayout` | Demo `.dokploy-tabs`; official segmented app tabs | `variant="segmented"`, `fullWidth`, `className`; `PageLayout.tabsVariant`. |
| `Menu` checked/radio/submenu | adapter | Environments selector, tags filter, row actions | `kind: item|checkbox|radio|separator|label|submenu`, `checked`, `onCheckedChange`; AT semantics. |
| `ColumnPicker` | surfaces control | Docker/Requests/Audit Logs "Columns" | Pairs with DataTable visibility state; menu/checkbox list. |
| `LogViewer` toolbar/renderLine | surfaces view | Application Logs custom toolbar; build-log modal | `toolbar` slot, `renderLine(frame,index): ReactNode`, `hideHeader`, `limit`; keep text `formatLine` for simple use. |
| `FileTree` | surfaces control | Traefik file tree | Items (file/dir), expanded/selected, keyboard, folder/item icons; official uses accordion + scroll area. |
| `DateRangePicker` / `Calendar` | adapter + surfaces | Requests date range; Audit Logs date range | Date range value, presets, timezone; single `DateTimeInput` already exists. |
| `Card`/`SectionCard` header divider/footer | adapter/surfaces | Web Server/Users cards; official section headers have dividers | `headerDivider`, `footer`, `bodyClassName`; avoid raw section markup. |
| `Popover`/`Select`/`Menu` styling escapes | adapter | Fixed `w-72` Popover; Select has no className; Menu no width | `className`, `contentClassName`, `width`/`size`, `sideOffset`, `aria-label`; app currently wraps with fixed divs. |
| `Combobox` | adapter/surfaces | environment/provider/repository search | Searchable single/multi select; may share the command-list hook with 6.3. |

### P2 — consistency, lower urgency

| Gap | Layer | Note |
|---|---|---|
| `Avatar` | adapter/surfaces | Account/org/provider logos; initials fallback. |
| `Separator` | surfaces | Header vertical divider and section lines; CSS spans currently. |
| `RelativeTime` approximate wording | surfaces | `format="long"` gives "1 hour ago"; official/date-fns uses "about 1 hour ago". Add `format="distance"`/`approximate` (and document the threshold table) if exact wording matters. |
| `ThemeProvider` system mode | surfaces | Only light/dark; `resolvedTheme` is a placeholder, no `system` mode or OS change listener. Official uses next-themes. Add `theme="light|dark|system"` if needed. |
| `Dialog`/`Drawer` width escape | adapter | `Dialog` max is `lg` (2xl); build-log modal needs ~850px/fullscreen. Add `xl`/`fullscreen`/`className`; same for Drawer. |
| `StatCard` icon/link/action | surfaces | Home hand-builds cards because StatCard lacks link/asChild/icon/footer. |
| `useSelection` (non-table) | react | Project service card bulk selection repeats Set/indeterminate logic; DataTable already has row selection. |
| `FormPage` cancel vs `FormView` footer cancel | preset | Known inconsistency; route-page form affected. |
| `FieldInput` hidden/meta | surfaces | Known gap; use `defaultValues` workaround. |
| `ScrollArea` | adapter | Official file tree uses it; native thin scrollbars are acceptable until then. |
| `Terminal` | surfaces + adapter | Open Terminal placeholders; xterm + stream/command transport; largest item. |
| `ContextMenu` | adapter | Not hit by current screenshots; add when row right-click is needed. |
| `Dropzone` | adapter | Backups/uploads not implemented; defer. |
| `RadioGroup`/`ToggleGroup`/`NumberInput`/`InputOTP` | adapter | Not needed by the current clone; do not grow the contract yet. |
| `Toolbar`/`CardRail` composition | surfaces/preset | Repeated search/filter rows; decide after P0/P1 rather than pre-building. |

## 7. Preset-console gaps

These are **not** core primitives, but they explain why the demo hand-writes
pages:

1. `SettingsPage` only supports `sections[].items` label/control rows. Dokploy
   settings need free-form card sections (form grid, danger zone, invitations,
   provider rows). Add `sections[].content`/children or keep demo pages custom.
2. `CollectionPage` is table-first (`CollectionView` + `DataTable`). Dokploy
   Projects is a card grid; either add a card layout/renderCard slot or keep
   card pages custom.
3. `CommandDialog` (data mutation) collides conceptually with a future
   `CommandPalette`; document names now.
4. `FormPage` header `cancel` vs `FormView` footer cancel remains inconsistent.
5. No preset for a floating/card page frame (`DokployCard`), which is why every
   demo page imports it; decide whether a `PageFrame` preset belongs in
   `preset-console` or stays app-level.

## 8. Documentation and test drift (fix with the next code batch)

- `docs/SKILL.md` still says "demo 不再用 flow 混排"; the clone now uses
  `width="flow"` on every page and centers settings at 53rem inside the card.
  Update the width rule.
- `apps/demo/DOKPLOY_DOGFOOD.md` still lists Sessions/Notifications in the
  Settings nav; they were removed from the sidebar to match the screenshots.
- The audit route table marks application/database/compose screens as complete;
  annotate the four placeholder application tabs, database Backups/Advanced,
  compose Containers/Backups/Schedules/Volume Backups, and Project Environment.
- No mobile e2e, visual regression, or a11y check. The strict clone needs:
  - Playwright mobile viewport (390×844) for shell/nav/settings;
  - screenshot baselines for the official pages (desktop + mobile);
  - axe or Lighthouse checks for dialog/menu/tooltip/command list;
  - adapter contract tests in `ui-plain` for any new primitive.

## 9. Implementation risks / sequencing notes

- **Adapter parity is the hidden cost.** Each new adapter primitive must be
  implemented in `ui-shadcn` and `ui-plain`, plus tests. Keep `Alert`,
  `Progress`, `StatusDot`, `Kbd`, `Avatar`, `Separator` in surfaces; add
  adapter primitives only for portal/focus/styling needs.
- **Heavy dependencies stay optional.** CodeEditor/Terminal/chart libraries
  must be lazy/optional entry points; `surfaces` stays dependency-free.
- **Command naming.** `Command` is the data mutation primitive; do not add an
  adapter `Command` for the palette. Prefer `CommandPalette`/`SearchPalette`
  and `CommandMenu` composition.
- **One list-navigation hook.** Palette, environment menu and Combobox share
  active-index/scroll/keyboard logic; duplicating it three times would recreate
  the current 200-line palette.
- **Mobile is a state machine.** expanded/collapsed/mobile-open must not be
  three independent booleans; AppShell should own the transitions.
- **Tokens before CSS overrides.** Add sidebar/header tokens and define them in
  both themes/adapters before deleting demo overrides.
- **Masked editor portability.** `-webkit-text-security` is not uniformly
  supported; provide an overlay/fallback and keep the underlying value
  unchanged.
- **Visual verification.** Keep official screenshots outside the repo if
  licensing is a concern; use them locally for Playwright screenshot baselines.

## 10. Suggested batches

1. **Shell + layout:** AppShell variants/icon rail/mobile/tokens; PageLayout
   title/divider/tabs/mobile; StatusDot; Tooltip.
2. **Command + feedback:** CommandPalette + CommandMenu + Kbd/useHotkey;
   Toast; Alert; Progress.
3. **Editors + credentials:** CodeEditor; InputGroup; SecretInput; useTabParam
   values; FormPage/FieldInput consistency.
4. **Data display:** MetricChart axes/readout/stable colors; Tabs segmented;
   ColumnPicker; LogViewer slots; FileTree.
5. **Heavy/later:** DateRange/Calendar; Popover/Select styling escapes;
   Combobox; ContextMenu; Terminal; Dropzone.

Acceptance for every batch: the demo consumes the new API, removes the
corresponding CSS/duplicated implementation, and keeps `pnpm check` +
`pnpm --filter demo e2e` green.

## 11. Evidence index

| Evidence | Where |
|---|---|
| Floating sidebar override / 16rem geometry | `apps/demo/theme.css` |
| Fixed sidebar 14rem, mobile 11rem, collapsed display:none | `packages/surfaces/src/surfaces.css` (`ui-app-shell`) |
| Shell slots, active matching, collapsed state | `packages/surfaces/src/chrome/app-shell.tsx` |
| PageLayout header/tabs/width/title CSS | `packages/surfaces/src/chrome/page-layout.tsx`, `surfaces.css` |
| MetricChart legend/axis/color-index implementation | `packages/surfaces/src/values/metric-chart.tsx` |
| Tabs variants | `packages/surfaces/src/controls/tabs.tsx`, `packages/ui-shadcn/src/primitives/tabs.tsx` |
| DataTable column visibility | `packages/surfaces/src/controls/data-table.tsx` |
| LogViewer fixed header / string formatter | `packages/surfaces/src/views/log-viewer.tsx` |
| Adapter contract (no Tooltip/Toast/Alert/Progress/etc.) | `packages/surfaces/src/adapter.ts` |
| SettingsPage fixed label/control rows | `packages/preset-console/src/pages/settings-page.tsx` |
| App-level palette | `apps/demo/src/components/command-palette.tsx` |
| Environment plain Menu | `apps/demo/src/features/dokploy/project-detail.tsx` |
| WarningAlert app component | `apps/demo/src/features/dokploy/fleet.tsx` |
| Credential rows / Input+Copy composition | `apps/demo/src/features/dokploy/service-detail.tsx` |
| Mobile shell capture | `/home/qiulin/artifacts/dokploy-live/home-mobile.png` |
| Official reference screens (38) | `/home/qiulin/artifacts/dokploy-ui/*.webp` |

## 12. Verification baseline

- `pnpm check` green (layer-check / doc-check / typecheck / size-check /
  tests / v3 spikes).
- Unit tests: core 44, react 33, testing 7, surfaces 89, ui-shadcn 29,
  ui-plain 25, preset 34, cli 5, spike 10.
- `pnpm --filter demo build` green (existing >500 kB chunk warning only).
- `pnpm --filter demo e2e` 16/16 green.
- `pnpm exec biome check apps/demo/src apps/demo/e2e` green.
- Desktop captures: `/home/qiulin/artifacts/dokploy-live/*.png`; mobile capture:
  `/home/qiulin/artifacts/dokploy-live/home-mobile.png`.

## 13. P0 batch landed (2026-11-10)

- [x] **6.1 AppShell** — `variant="plain|floating"`, `sidebarWidth`,
  `collapsedMode="hide|icon"` (3.5rem rail + adapter Tooltip), `storageKey`,
  `mobileOpen`/`onMobileOpenChange` with backdrop/Escape/focus-trap drawer;
  `--ui-sidebar*` tokens in `ui-shadcn` + `ui-plain` with surfaces fallbacks;
  demo shell geometry overrides deleted.
- [x] **6.2 PageLayout** — `titleSize` (18/20/24/30), `headerDivider`,
  `tabsVariant`, `width="content"` (53rem) + `maxWidth`, responsive header
  stacking; adapter `Tabs` gains a full-width `segmented` variant in both
  adapters; demo arbitrary title variants / `.dokploy-tabs` / `max-w-[53rem]`
  removed.
- [x] **6.5 Tooltip** — `Tooltip` contract (`trigger`/`content`/`side`/
  `align`/`delay`/`disabled`) implemented with Base UI (portal, positioning,
  focus, Escape) and a dependency-free `ui-plain` fallback; used by the icon
  rail and demo icon-only edit/delete/server/breadcrumb actions.
- [x] **6.6 StatusDot** — `StatusDot` value with `StatusTone`, optional
  screen-reader label, `pulse` and className; demo service/header/home dots
  use it with no app-level colour classes.
- [x] Verification — `pnpm check`, `pnpm --filter demo build`,
  `pnpm --filter demo e2e` (18/18 incl. mobile drawer + icon rail),
  Biome on the touched source trees.

## 14. P0 batch 2 landed (2026-11-10)

- [x] **6.4 Toast** — surfaces `ToastProvider`, `useToast`, imperative
  `toast.success/error/info/dismiss/clear` (module queue + `useSyncExternalStore`);
  `aria-live="polite"` viewport, close button, duration, hover/focus pause,
  action, stack limit; no adapter primitive added. `PresetProvider` installs
  the viewport by default. Demo inline `role="status"` messages in Settings/
  Web Server/Users/Notifications/Profile, fleet schedules and server/service/git
  placeholders now use typed `notify.*` helpers; viewport is
  `data-testid="toast-viewport"`.
- [x] **P1 Alert** — surfaces `Alert` with
  `tone="info|success|warning|danger"`, optional title/description/icon/action,
  `live` (role alert only when requested), status-token CSS. Demo
  `WarningAlert` removed; Traefik/Requests use warning alerts and Application
  Advanced uses an info alert (the current Advanced tab has no Cluster Settings
  section, so the official blue banner is represented there).
- [x] **P1 Progress** — surfaces `Progress` with
  `value/max/tone/indeterminate/label/aria-label/className`; Application
  metric bars and the shared `UsageBar` now use it.
- [x] **6.3 Command** — shared headless `useCommandList` (query filter, active
  index, ArrowUp/Down, Home/End, Enter, Escape, scroll-into-view);
  `CommandPalette` (Dialog) and `CommandMenu` (Popover + checked state);
  `Kbd` (`keys` or `shortcut="mod+k"`); `useHotkey` (mod/ctrl/meta, editable
  guard, enabled). Demo palette uses the surfaces primitive + `useHotkey`/`Kbd`;
  both environment switchers use `CommandMenu` with search/checked/Esc while
  keeping `environment-switcher` and `breadcrumb-environment` ids. Adapter
  `Popover` gained a content-panel `className` in both adapters.
- [x] **6.10 useTabParam values** — generic `useTabParam<T>({ values,
  defaultValue })` validates URL input and returns `EnumSearchHandle<T>`;
  application/postgres/redis/compose wrappers pass tab values and no longer
  hand-validate or cast.
- [x] **Docs** — `docs/SKILL.md` §4.6/§5.1/§5.2/§5.4/§5.6 and
  `docs/design.md` values/controls/adapter/preset notes updated; the
  `CommandPalette` vs preset `CommandDialog` naming distinction is documented.
- [x] **Verification** — `pnpm check` green (core 44, react 34, testing 7,
  surfaces 117, ui-shadcn 31, ui-plain 27, preset 35, cli 5, spike 10);
  `pnpm --filter demo build` green; `pnpm --filter demo e2e` 18/18 green;
  Biome over the touched trees has no errors.
- Remaining risks: the toast viewport is an in-tree fixed region (not portalled,
  so a transformed ancestor could contain it); the default stack limit is 5 and
  the module queue is process-global (fine for one app root, not multi-tenant
  SSR); `CommandMenu.contentClassName` replaces the default popover
  width/padding class rather than layering on top of it.

## 15. P0 batch 3 landed (2026-11-10)

- [x] **6.7 CodeEditor** — `packages/surfaces/src/values/code-editor.tsx`:
  dependency-free textarea + scroll-synced line-number gutter; `value`,
  `onChange`, `language` metadata (`text|properties|yaml|json|shell|compose`),
  `lineNumbers` (default true), `wrap` (default false), `readOnly`, `masked`,
  `onMaskedChange` (renders the built-in reveal action), `minHeight`,
  `placeholder`, `aria-label`, `className` and a `render` escape hatch for
  CodeMirror/Monaco. Masking keeps the real value in the textarea, makes its
  text transparent and paints an aria-hidden dot overlay with the same font,
  padding and scroll offset, so reveal/hide never rewrites the draft and line
  alignment survives. Demo Environment (properties, masked, external
  `env-reveal`), Traefik (YAML, locked/unlocked) and Compose (read-only) all use
  it; the `.dokploy-editor*` CSS is gone. E2E now asserts `data-masked` plus the
  real draft value instead of expecting dot characters in `.value`.
- [x] **6.8 MetricChart** — `showLegend` (default true), `showYAxis`,
  `area`, `tooltip` (pointer guide + readout, default true), `unit`,
  `thresholds`, optional `domain`, `series.color` and `series.formatValue`.
  Colours no longer use `colorIndex`; a deterministic key hash assigns a
  `--ui-chart-*` slot, and keys are sorted with collision probing so two series
  in one chart differ while array reordering never recolours a line. An
  sr-only per-series summary table backs the hover readout; `chart` remains the
  Recharts/donut escape hatch. Demo MetricPanel uses y-axis, area for CPU/
  memory, `unit="%"`, an 80% CPU threshold and 80% memory threshold.
- [x] **6.9 InputGroup + SecretInput** — adapter `InputProps`/`TextareaProps`
  gained `variant="default|bare"` in both `ui-shadcn` and `ui-plain` (bare drops
  border/background/focus ring and padding). `InputGroup` is a semantic
  `<fieldset>` frame with start/end addons, focus-within ring and
  disabled/invalid propagation to the direct control. `SecretInput` composes
  `InputGroup` + masked input + reveal + `CopyButton`; read-only values render
  dots, editable values use `type=password`, and `onChange` always receives the
  real draft. Demo `CredentialField` uses `InputGroup` for every read-only value
  and `SecretInput` for passwords/connection URLs; `internal-password`,
  `Reveal Password` and the masked/reveal e2e behaviour are preserved.
  `SecretValue` remains the display-cell primitive.
- [x] **Docs** — `docs/SKILL.md` §5.1 adapter variant, §5.2
  credential/editor/chart examples; `docs/design.md` §6.1 InputGroup/
  SecretInput + CodeEditor rules and the extended MetricChart/values list.
- [x] **Verification** — `pnpm check` green (core 44, react 34, testing 7,
  surfaces 132, ui-shadcn 33, ui-plain 28, preset 35, cli 5, spike 10);
  `pnpm --filter demo build` green (only the existing >500 kB warning);
  `pnpm --filter demo e2e` 18/18 green; Biome over
  `packages/surfaces/src packages/ui-shadcn/src packages/ui-plain/src
  apps/demo/src apps/demo/e2e` has no errors.
- Remaining risks: the masked editor is a textarea overlay, not a syntax
  highlighter, and `wrap` + line numbers can still misalign wrapped logical
  lines (default is no-wrap); the overlay assumes monospace metrics. Chart
  colours repeat after five implicit series (explicit `series.color` is the
  way out) and the hover readout is pointer-only — keyboard/screen-reader users
  get the sr-only summary table instead. InputGroup uses native `fieldset`
  semantics, which also disable descendant addon buttons when `disabled`.

## 16. P1-A adapter/surfaces API completeness landed (2026-11-10)

- [x] **Menu item model** — `MenuItem.kind` (`item | checkbox | radio |
  separator | label | submenu`), `checked`, `onCheckedChange`, nested `items`;
  `separator: true` stays the v3 “separator before this item” shorthand and can
  combine with any kind (no alias layer). `ui-shadcn` maps to Base UI
  CheckboxItem/RadioGroup+RadioItem/SubmenuRoot+SubmenuTrigger/Separator, so
  keyboard, typeahead and ARIA (`menuitemcheckbox`/`menuitemradio`,
  `aria-expanded` on submenu triggers) come from the library. `ui-plain`
  implements `role="menu"`, `menuitemcheckbox`/`menuitemradio` with
  `aria-checked`, nested `role="menu"`, Escape/ArrowLeft to exit a submenu,
  ArrowRight to open it, ArrowUp/Down/Home/End focus movement, and initial
  focus. Checkbox toggles keep the menu open; radio selection closes it.
- [x] **Demo Tags filter** — Projects “Tags” is a radio menu (`All tags` +
  each tag) bound to the existing single `tag` URL value; the e2e selector
  moved from `menuitem` to `menuitemradio`. The environment switchers already
  use `CommandMenu` checked state, so they were left unchanged.
- [x] **Select styling escapes** — `SelectProps.size` (`sm | md | lg`),
  `className` (trigger; plain wrapper) and `contentClassName` (shadcn popup;
  plain applies it to the native `<select>` because the browser owns the
  popup). Demo removed the `w-40` / `min-w-32` wrappers that only set Select
  width; the outer grid wrappers remain where they own the layout.
- [x] **Card / SectionCard** — `CardProps.headerDivider`, `footer`,
  `bodyClassName` in both adapters (full-width rule under the header, ruled
  optional footer, content-region class). `SectionCard` passes them through.
  Settings Web Server and Invitations raw `<section>` headers replaced with
  `SectionCard headerDivider`; the Web Server body keeps `p-5` via
  `bodyClassName`, Invitations keeps its centred empty state.
- [x] **Dialog / Drawer width escapes** — `DialogSize`
  (`sm | md | lg | xl | fullscreen`) on both adapter primitives, with `xl` at
  64rem and `fullscreen` at near-viewport dimensions; `className` applies to
  the popup/panel only, never the backdrop. Demo deployment log drawer uses
  `size="xl"`.
- [x] **Docs** — `docs/SKILL.md` §5.1/§5.4 and `docs/design.md` adapter table +
  SectionCard notes updated; this checklist added.
- [x] **Verification** — `pnpm check` green (core 44, react 34, testing 7,
  surfaces 133, ui-shadcn 41, ui-plain 38, preset 35, cli 5, spike 10);
  `pnpm --filter demo build` green (existing >500 kB warning only);
  `pnpm --filter demo e2e` 18/18 green; Biome over
  `packages/surfaces/src packages/ui-shadcn/src packages/ui-plain/src
  apps/demo/src apps/demo/e2e` has no errors (only the pre-existing CSS
  descending-specificity warnings).
- Remaining risks: radio grouping is by consecutive radio entries, so a
  label/separator starts a new group; menu keys use declaration order because
  `MenuItem` has no id (static menus only). `ui-plain` Menu is non-portalled
  and has no typeahead/focus trap; a nested submenu can clip inside an
  `overflow: hidden` ancestor. Native Select cannot style its popup, so
  `contentClassName` targets the `<select>` there. `Card`’s footer padding is
  fixed and `SectionCard`’s `bodyClassName` styles the adapter body, not the
  inner `.ui-section-card__body` wrapper. `SectionCard` titles render through
  the adapter’s `Card` heading (`h3`), which is why the demo e2e now asserts
  the heading by name rather than level.

## 17. P1-B data-display controls landed (2026-11-10)

- [x] **ColumnPicker** — `packages/surfaces/src/controls/column-picker.tsx`:
  controlled `columns` (`id`/`label`/`hideable`), `visibility`
  (`Record<string, boolean>`, same shape as `DataTable.columnVisibility`),
  `onVisibilityChange`, `triggerLabel` (default “Columns”), `align`,
  `className`. Reuses adapter `Menu` checkbox items; absent visibility keys are
  visible and `hideable: false` renders checked + disabled. `MenuItem.testId`
  was added (both adapters) so the menu item itself carries
  `data-testid="column-toggle-<id>"`; the trigger is `columns-picker`. Demo
  Docker and Requests tables now conditionally render headers/cells; Docker
  hides Image/State/Status while Name stays fixed, Requests hides Level/Time
  while Message stays fixed.
- [x] **LogViewer slots** — `renderLine(frame, index): ReactNode` renders rich
  content inside the view-owned line wrapper (`data-line` stays on the wrapper);
  `toolbar` is a full-width row between the header and the log body while the
  built-in follow/pause/download/clear controls remain; `hideHeader` hides the
  header + toolbar and leaves pause/follow to the caller. `formatLine`, `limit`
  and download behaviour are unchanged. Demo LogsTab uses `renderLine` for the
  coloured timestamp/level lines and `toolbar` for the container select,
  Native switch, limit/time/log-type chips, search and Copy/AI actions; the
  filtered stream keeps a cached snapshot so `useSyncExternalStore` does not
  loop, and pause/resume/download/clear come from LogViewer. Selectors
  `log-viewer`, `log-toolbar`, `log-status`, `log-pause`, `log-download` remain.
- [x] **FileTree** — controlled `items`
  (`{ id, label, type, icon?, children? }`), `expanded`/`onExpandedChange`,
  `selected`/`onSelect`, `folderIcon`/`fileIcon`, `className`, `aria-label`.
  WAI-ARIA tree keyboard: ArrowUp/Down, Home/End, ArrowRight expand or enter
  first child, ArrowLeft collapse or move to parent, Enter/Space select; emits
  `role="tree"`/`treeitem`/`group`, `aria-level`, `aria-expanded`,
  `aria-selected`, roving tabindex. Demo Traefik replaces the static folder
  markup; selecting `traefik.yml` keeps the editor and path behaviour.
- [x] **DateRangePicker** — controlled date-only `{ start?, end? }` strings
  (`YYYY-MM-DD`), optional `presets` (plain data), trigger label formatting,
  adapter `Popover` + two `Input type="date"` (no calendar dependency), Clear
  action and `date-range-picker`/`date-range-start`/`date-range-end`/
  `date-range-preset-<n>` test ids. Demo Requests replaces the old toggle
  button; “Reset to Last 3 Days” remains and presets update the same state.
- [x] **Docs** — `docs/SKILL.md` §5.1 Menu `testId`, §5.2 ColumnPicker/FileTree/
  DateRangePicker + LogViewer slots; `docs/design.md` §6.1 control contracts,
  stream-view LogViewer rules and source tree listing updated.
- [x] **Verification** — `pnpm check` green (core 44, react 34, testing 7,
  surfaces 144, ui-shadcn 41, ui-plain 38, preset 35, cli 5, spike 10);
  `pnpm --filter demo build` green (existing >500 kB warning only);
  `pnpm --filter demo e2e` 20/20 green; Biome over
  `packages/surfaces/src packages/ui-shadcn/src packages/ui-plain/src
  apps/demo/src apps/demo/e2e` has no errors (only pre-existing CSS
  descending-specificity warnings).
- Remaining risks: `ColumnPicker` relies on the adapter Menu staying open for
  checkbox items (both adapters implement this; a custom adapter must too);
  `FileTree` uses roving tabindex on a div `role="treeitem"` rather than native
  buttons, so adapters must keep the focus ring visible; `LogViewer.toolbar` is
  a full-width row, not a replacement for the built-in controls, and
  `hideHeader` deliberately removes the built-in state readout;
  `DateRangePicker` is date-only (no timezone/time-of-day) and presets are
  static data, not relative-date helpers. No remaining P1 item from §6 is
  unaddressed.

## 18. P2-A lower-risk polish landed (2026-11-11)

- [x] **Avatar** — `packages/surfaces/src/values/avatar.tsx`: `src`, `alt`,
  `fallback` (default initials via `avatarInitials`), `size` (`sm|md|lg` or a
  pixel number), optional `status` dot and `className`; image errors fall back
  without losing the accessible name. Demo account footer/profile avatars use
  it with the existing `AL`/labels intact.
- [x] **Separator** — `packages/surfaces/src/values/separator.tsx`:
  `orientation`, `decorative` (default true → `aria-hidden`), optional
  horizontal `label`, `className`. Demo header divider and the three log-toolbar
  group dividers use it.
- [x] **StatCard** — `icon`, `actions`, `href`, `footer`, `className`,
  `valueClassName` added while keeping `label/value/tone/hint`. `href` renders a
  plain anchor; no Router import. Demo `HomeStat` is now `StatCard`, preserving
  the `Projects`/`Services`/`Deploys / 7d` numbers and the `Go to projects`
  header action; the old bespoke min-height card markup is gone.
- [x] **RelativeTime distance wording** — `format="distance"` returns bounded
  date-fns-style English wording (`less than a minute ago`, `1 minute ago`,
  `about 1 hour ago`, `about X hours ago`, `1 day ago`, `X days ago`,
  `about 1 month ago`, `X months ago`, `about 1 year ago`, `X years ago`, plus
  future `in …`). Existing `long|short|narrow` behaviour is unchanged; demo
  home/project/service/deployment timestamps use `distance`.
- [x] **ThemeProvider system** — `Theme = light | dark | system` and
  `resolvedTheme: ResolvedTheme`; `system` installs a `prefers-color-scheme`
  listener with cleanup, `toggle()` stores the explicit opposite of the
  resolved theme, and `themeScript()` resolves stored `system` through
  `matchMedia`. Demo pre-paint script and account menu gained the system option
  without changing existing test ids.
- [x] **useSelection** — `packages/surfaces/src/controls/use-selection.ts`:
  controlled/uncontrolled generic selection with `selected`, `isSelected`,
  `toggle`, `selectAll`, `clear`, `allSelected`, `someSelected`; `ids` scopes
  select-all/indeterminate to the visible rows. Demo service-card bulk
  selection now uses it (same checkboxes/menu/test ids).
- [x] **FieldInput.hidden** — `FieldInputs` filters hidden fields from render
  but form state/`defaultValues` still submit them; test covers the hidden
  value. The broader per-field `meta` object was deliberately left out.
- [x] **SettingsPage free-form sections** — `SettingsSection.content` renders
  inside `SectionCard` and takes precedence over `items` (now optional).
  `FormPage.onCancel` mirrors the `FormView` footer cancel callback, so the
  header `cancel` slot and footer action can coexist.
- [x] **Docs** — `docs/SKILL.md` (values, theme/system, RelativeTime distance
  thresholds, fields, settings/form API) and `docs/design.md` (controls,
  values, theme, preset notes) updated.
- [x] **Verification** — `pnpm check` green (core 44, react 34, testing 7,
  surfaces 156, ui-shadcn 41, ui-plain 38, preset 36, cli 5, spike 10);
  `pnpm --filter demo build` green (only the pre-existing >500 kB chunk
  warning); `pnpm --filter demo e2e` 20/20 green; Biome over
  `packages/surfaces/src packages/ui-shadcn/src packages/ui-plain/src
  packages/preset-console/src apps/demo/src apps/demo/e2e` has no errors (only
  pre-existing CSS descending-specificity warnings).
- **Deferred (unchanged):** `Terminal`, `ContextMenu`, `Dropzone`.
  `Combobox` is documented as deferred: `CommandMenu` already covers searchable
  single-select with checked state, but a true editable-input/multi-select
  combobox needs a dedicated adapter+surface contract and was not composed in
  this batch. `CollectionPage` card-grid layout remains app/page-template work;
  only `SettingsPage` free-form sections were added. Per-field `FieldInput.meta`
  is also deferred. Remaining risks: distance wording is English-only and uses
  fixed thresholds; `StatCard.valueClassName` may need specificity/`!` when a
  consumer's utility layer conflicts with the default `ui-stat-card__value`
  rule; `useSelection` controlled mode expects the parent to echo
  `onSelectedChange`.

## 19. App coverage batch landed (2026-11-11)

This batch is app-level page composition; no core or adapter API changed.

- [x] **Top-level Monitoring** (`/dashboard/monitoring`) — real page matching
  `server-monitoring.webp`: CPU / Memory / Disk / Docker Disk / Block I/O /
  Network I/O cards, `Progress` for used-vs-limit, `MetricChart` with y-axis,
  area fill, units, domains and thresholds, deterministic local series, and a
  static SVG Docker donut. No metrics API is called. `data-testid=
  "monitoring-page"`, `monitoring-card` (6) and `monitoring-chart` (5) back the
  e2e count assertions.
- [x] **Settings Audit Logs** — 53rem page with user/name text filters, action
  and resource selects, `DateRangePicker`, `ColumnPicker`, and a `DataTable`
  with Date/User/Action/Resource/Name/Role/Metadata, local sorting, static rows
  around Jul 2026, and local date-range filtering.
- [x] **Settings AI** — `AI Settings` page with the OpenRouter
  `google/gemini-3-flash-preview` row; add/delete are local state + toast and
  edit is an honest placeholder.
- [x] **Settings Certificates** — new `/dashboard/settings/certificates` route
  with the warning `Alert`, `EmptyState`, and local Add Certificate placeholder.
- [x] **Settings Registry** — new `/dashboard/settings/registry` route with the
  Docker Registry card, seeded Mauricio/ECR rows, local add/delete and edit
  placeholder.
- [x] **Settings S3 Destinations** — new `/dashboard/settings/s3-destinations`
  route with created dates, local add/delete and edit placeholder.
- [x] **Settings License** — new `/dashboard/settings/license` route with the
  Enabled switch, masked/read-only license input, Deactivate and Validate
  placeholders.
- [x] **Navigation** — the four new routes stay out of the screenshot-visible
  sidebar; `navDestinations` exposes them to the command palette (and the
  breadcrumb label lookup resolves them).
- [x] **Docs** — `apps/demo/DOKPLOY_DOGFOOD.md` route map/coverage updated; this
  section records the remaining coverage.
- [x] **Verification** — `pnpm check` green; `pnpm --filter demo build` green
  (existing >500 kB chunk warning only); `pnpm --filter demo e2e` 24/24 green;
  Biome over `apps/demo/src apps/demo/e2e` clean.
- Remaining coverage (unchanged): Swarm, Templates, SSO, Whitelabeling,
  build-log modal, create-backup/custom-role dialogs, partial application/
  database/compose tabs, Project Environment dialog, bulk delete, and the
  Sessions/Deployments/Tags settings placeholders.

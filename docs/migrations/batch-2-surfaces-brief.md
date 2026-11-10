# Batch 2a surfaces brief（values / controls / fields / adapter）

> 前置：Batch 1 core/react/testing 已绿。目标：`@lynxland/uikit-surfaces` 成为
> UI-library-agnostic 的呈现层；默认 UI adapter 在 Batch 2b 的 `ui-shadcn`。
> 规范：`docs/design.md` §6；迁移映射：`docs/migrations/batch-2-ui-brief.md`。

## 包结构

```
packages/surfaces/src/
  adapter.ts          UiAdapter contract + UiAdapterProvider/useUiAdapter
  values/             StatusBadge/RelativeTime/CopyButton/SecretReveal/DiffView/
                      JsonField/StatCard/MetricChart/FieldValue/states
  controls/           DataTable/FilterBar/Pager/Tabs/AsyncState/Form/FieldInputs/
                      FieldGrid/ReferenceInput
  fields/             FieldView/FieldInput/FilterField/CrudFields 类型 + 纯函数
  surfaces.css        语义结构类 + CSS 变量；不含 Tailwind
  index.ts
```

`views/`、`chrome/` 由 Batch 2a-2 补；`preset-console` 由 Batch 2c 补。

## UiAdapter contract（**先定这个，ui-shadcn 按它实现**）

`adapter.ts` 只依赖 React 类型，不依赖任何具体 UI 库。**所有 surfaces 控件/值/视图
都通过 `useUiAdapter()` 取基元**，不直接写 `<button>`/`<input>`（布局 `div` 可以）。

最小但足够的基元：

```ts
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export interface SelectOption { value: string; label: string; disabled?: boolean }
export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}

export interface CheckboxProps {
  checked: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean | "indeterminate") => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}

export interface SwitchProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}

export interface DateTimeInputProps {
  value?: string; // YYYY-MM-DDTHH:mm (local, same as input[type=datetime-local])
  onChange?: (value: string | undefined) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  min?: string;
  max?: string;
  className?: string;
  "aria-label"?: string;
}

export interface FieldProps {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
}

export interface TabsItem { value: string; label: ReactNode; disabled?: boolean }
export interface TabsProps {
  items: readonly TabsItem[];
  value: string;
  onValueChange: (value: string) => void;
  variant?: "underline" | "pills" | "filter";
  "aria-label"?: string;
}

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  /** width preset; adapter maps to class/style */
  size?: "sm" | "md" | "lg";
}

export interface DrawerProps extends Omit<DialogProps, "size"> {
  side?: "left" | "right";
  size?: "sm" | "md" | "lg";
}

export interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Render as the trigger element (adapter must not nest a button inside a button). */
  trigger: React.ReactElement;
  children: ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
}

export interface MenuItem {
  label: ReactNode;
  onSelect?: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
}

export interface MenuProps {
  trigger: React.ReactElement;
  items: readonly MenuItem[];
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  "aria-label"?: string;
}

export interface BadgeProps {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  variant?: "solid" | "soft" | "outline";
}

export interface CardProps {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export interface TableSlots {
  Root: React.ComponentType<React.TableHTMLAttributes<HTMLTableElement>>;
  Header: React.ComponentType<React.HTMLAttributes<HTMLTableSectionElement>>;
  Body: React.ComponentType<React.HTMLAttributes<HTMLTableSectionElement>>;
  Row: React.ComponentType<React.HTMLAttributes<HTMLTableRowElement>>;
  Head: React.ComponentType<React.ThHTMLAttributes<HTMLTableCellElement>>;
  Cell: React.ComponentType<React.TdHTMLAttributes<HTMLTableCellElement>>;
  Caption: React.ComponentType<React.HTMLAttributes<HTMLTableCaptionElement>>;
}

export interface IconProps extends React.SVGProps<SVGSVGElement> { size?: number }

export interface UiIcons {
  ChevronDown: React.ComponentType<IconProps>;
  ChevronLeft: React.ComponentType<IconProps>;
  ChevronRight: React.ComponentType<IconProps>;
  ChevronUp: React.ComponentType<IconProps>;
  Check: React.ComponentType<IconProps>;
  X: React.ComponentType<IconProps>;
  Search: React.ComponentType<IconProps>;
  Copy: React.ComponentType<IconProps>;
  Eye: React.ComponentType<IconProps>;
  EyeOff: React.ComponentType<IconProps>;
  MoreHorizontal: React.ComponentType<IconProps>;
  Loader: React.ComponentType<IconProps>;
}

export interface UiAdapter {
  Button: React.ComponentType<ButtonProps>;
  Input: React.ComponentType<InputProps>;
  Textarea: React.ComponentType<TextareaProps>;
  Select: React.ComponentType<SelectProps>;
  Checkbox: React.ComponentType<CheckboxProps>;
  DateTimeInput: React.ComponentType<DateTimeInputProps>;
  Switch: React.ComponentType<SwitchProps>;
  Field: React.ComponentType<FieldProps>;
  Popover: React.ComponentType<PopoverProps>;
  Menu: React.ComponentType<MenuProps>;
  Tabs: React.ComponentType<TabsProps>;
  Dialog: React.ComponentType<DialogProps>;
  Drawer: React.ComponentType<DrawerProps>;
  Badge: React.ComponentType<BadgeProps>;
  Card: React.ComponentType<CardProps>;
  Table: TableSlots;
  icons: UiIcons;
  /** optional className merge helper; surfaces never assumes Tailwind */
  cx?: (...values: Array<string | false | null | undefined>) => string;
}

export const UiAdapterContext: React.Context<UiAdapter | null>;
export function UiAdapterProvider(props: { adapter: UiAdapter; children: ReactNode }): ReactNode;
export function useUiAdapter(): UiAdapter; // throws a clear error when no provider
```

- Compound APIs（Base UI `Dialog.Root`/`Tabs.List` 等）**不能**泄漏到 surfaces。
- adapter 只负责视觉/交互基元；布局、数据、URL 归 surfaces/页面。
- `surfaces.css` 用 `ui-*` 语义类（`ui-table`、`ui-filter-bar`、`ui-pager`…），
  颜色/圆角/字体走 CSS 变量（`--ui-*`），ui-shadcn 的 tokens.css 覆盖。
- 不 import Tailwind、不写 utility class、不 import `clsx`/`lucide-react`/Base UI/Radix。

## 控件契约（全部受控）

- `DataTable<Row>`：`rows`、`columns`（公开 `Column<Row>`，TanStack 兼容）、
  `getRowId`、`sorting?`、`onSortingChange?`、`selection?`、`columnVisibility?`、
  `onColumnVisibilityChange?`、`onRowClick?`、`empty?`。不接收 `CollectionHandle`。
- `FilterBar`：`fields: FilterField[]`、`value: FilterValue[]`、`onChange`、
  `text?: { value; onChange }`、`placeholder?`。**无本地完整 Draft**；文本可有瞬态
  draft，但 `value` 变化必须同步。
- `Pager`：`paging`（`CollectionPage["paging"]` 或判别联合）、`onPrev`/`onNext`/
  `onPageSizeChange`、`pageSizeOptions?`。不 import Router、不读 history。
- `Tabs`：受控 `items/value/onChange/variant`；键盘/aria 只在这里实现一次。
- `AsyncState`：`status/error/onRetry/empty/loading?/children`；只做四态切换。
- `Form`：提交壳（submit/error box/footer），不创建表单。
- `FieldInputs`：`fields: FieldInput<I>[]` + `form`（TanStack Form API）；
  不接收 Row 类型。
- `FieldGrid`：`fields: FieldView<Row>[]`、`row`、`columns?`；纯展示。
- `ReferenceInput`：`source: LookupSource` 或 `options` 回调；不内嵌 Entity/Resource。
- `FieldValue`：`field: FieldView<Row>`、`row`；引用字段用 `useLookup` 或回调。

## 值契约

- `StatusBadge`（tone 映射 + `statusTone` 纯函数）、`RelativeTime`（`Intl.RelativeTimeFormat`，
  `dateTime` prop/now 可注入）、`CopyButton`、`SecretReveal`、`DiffView`、
  `JsonField`、`StatCard`、`MetricChart`（recharts 可选？**不要**硬依赖；先做
  SVG/CSS 轻量图或 `chart` slot）、`FieldValue`、`LoadingState`/`EmptyState`/`ErrorState`。
- 值视图只依赖 props/核心类型；不 import 数据绑定/Router。

## 字段类型（fields/）

按 design §6.5 实现 `FieldView<T>`、`FieldInput<I>`、`FilterField`、`CrudFields`、
`crudFields()`。`reference` 只存 source/getLabel/getValue，不执行 fetch。
`FieldInput.input` 的 `form` 类型用 `CommandFormApi<I>` 或结构化最小接口，避免
surfaces → react 的循环依赖？**允许** surfaces import `@lynxland/uikit-react` 的
类型（L4 ← L5 是合法方向），但控件运行时不取数。

## 测试

- `test/adapter.test.tsx`：无 provider 抛错；provider 注入生效。
- `test/controls.test.tsx`：DataTable 静态数组渲染/排序回调/选择；FilterBar 受控
  同步；Pager 三种 paging；Tabs 键盘；AsyncState 四态。
- `test/values.test.tsx`：StatusBadge/RelativeTime/JsonField/FieldValue。
- `test/fields.test.tsx`：FieldView/FieldInput 类型与 crudFields 纯函数。
- 测试 adapter 用简单 HTML 实现，放在 `test/test-adapter.tsx`，不污染公开面。

## 门禁

- `pnpm --filter @lynxland/uikit-surfaces typecheck`
- `pnpm --filter @lynxland/uikit-surfaces test`
- `node scripts/layer-check.mjs`
- `pnpm doc-check`
- 不 import Router/effect/具体 UI 库/Tailwind；公开类型无 `any`。

## 交付顺序

1. `adapter.ts` + `surfaces.css` + `fields/` 类型（其他 agent 依赖）。
2. `values/`。
3. `controls/`。
4. 测试 + index 导出。
5. 报告 adapter contract 的最终形状与任何 design 偏差。

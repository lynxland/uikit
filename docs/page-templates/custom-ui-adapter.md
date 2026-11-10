# Custom UI adapter template

UI adapter 只负责**视觉基元 + token + 受控行为**；surfaces 的控件/视图不 import
具体 UI 库。接自有设计系统时，实现 `UiAdapter` 即可，不需要 fork surfaces/preset。

## 1. 实现契约

```tsx
import type {
  BadgeProps,
  ButtonProps,
  CardProps,
  CheckboxProps,
  DialogProps,
  DrawerProps,
  FieldProps,
  IconProps,
  InputProps,
  PopoverProps,
  SelectProps,
  SwitchProps,
  TableSlots,
  TabsProps,
  TextareaProps,
  UiAdapter,
  UiIcons,
} from "@lynxland/uikit-surfaces/adapter";

const Button = ({ variant = "default", size = "md", loading, ...rest }: ButtonProps) => (
  <button data-variant={variant} data-size={size} aria-busy={loading || undefined} {...rest} />
);

// ...Input/Textarea/Select/Checkbox/Switch/Field/Popover/Tabs/Dialog/Drawer/Badge/Card/Table/icons

export const myAdapter: UiAdapter = {
  Button,
  Input,
  Textarea,
  Select,
  Checkbox,
  Switch,
  Field,
  Popover,
  Tabs,
  Dialog,
  Drawer,
  Badge,
  Card,
  Table,
  icons,
  // 可选：cx 合并 className
  cx: (...values) => values.filter(Boolean).join(" "),
};
```

## 2. 注入

```tsx
import { UiAdapterProvider } from "@lynxland/uikit-surfaces/adapter";
import { myAdapter } from "./my-adapter";

<UiAdapterProvider adapter={myAdapter}>
  <App />
</UiAdapterProvider>
```

或用 preset 的 provider 覆盖默认 adapter：

```tsx
import { PresetProvider } from "@lynxland/uikit-preset-console";
<PresetProvider adapter={myAdapter}>
  <App />
</PresetProvider>
```

## 3. Token

- 推荐使用 shadcn 语义名：`--background` / `--foreground` / `--card` / `--border` /
  `--primary` / `--muted` / `--ring` / `--radius`。
- 状态色：`--status-neutral/success/warning/danger/info`。
- 图表色：`--chart-1..5`。
- `surfaces.css` 的 `--ui-*` 变量都有 fallback；不强制 Tailwind。

```css
:root {
  --background: #fff;
  --foreground: #111;
  --border: #e5e7eb;
  --primary: #2563eb;
  --status-success: #16a34a;
  --status-warning: #d97706;
  --status-danger: #dc2626;
  --status-info: #0ea5e9;
}
```

## 4. 规则

- 不要 import 消费方 `@/components/ui/*` 到 surfaces；adapter 是唯一 UI seam。
- Base UI/Radix 的 compound API 不要泄漏到 `UiAdapter` 类型；adapter 内部用。
- `Dialog`/`Drawer`/`Select`/`Tabs`/`Popover` 的键盘/焦点/portal 归 adapter。
- Adapter 不取数、不 import Router/Query；它只接收受控 props。
- 默认 adapter `@lynxland/uikit-ui-shadcn` 是 npm 依赖，不 eject；
  自定义 adapter 是新包或应用内模块。

## 5. 验证

用 `UiAdapterProvider` + 你的 adapter 跑 surfaces 的控件测试；
`@lynxland/uikit-ui-plain` 是最小参考实现。

## 参考

- `packages/surfaces/src/adapter.ts`
- `packages/ui-shadcn/src/adapter.ts`
- `packages/ui-plain/src/adapter.ts`

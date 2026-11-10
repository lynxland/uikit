/**
 * UiAdapter — the only visual primitive contract surfaces depends on.
 *
 * Controls/values/fields/views never import a concrete UI library. They take
 * their primitives from `useUiAdapter()`. The adapter owns visual styling,
 * focus management, keyboard behaviour and portals; surfaces own layout,
 * data translation and composition. Compound APIs (Base UI `Dialog.Root`,
 * Radix `Tabs.List`, …) must never leak into this contract.
 */
import { createContext, createElement, type ReactNode, useContext } from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  /**
   * Render the single child as the button surface (shadcn `asChild`).
   * Use it for router links: `<ui.Button asChild><Link to="...">Open</Link></ui.Button>`.
   */
  asChild?: boolean;
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

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

/**
 * Controlled local date-time input. The value format is the HTML
 * `datetime-local` shape (`YYYY-MM-DDTHH:mm`) so existing form state and
 * URL/filter values stay unchanged. The adapter owns the picker UI; surfaces
 * never rely on the native browser popup.
 */
export interface DateTimeInputProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  min?: string;
  max?: string;
  className?: string;
  "aria-label"?: string;
}

export interface SwitchProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
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

export interface TabsItem {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

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
  /** Width preset; the adapter maps it to a class/style. */
  size?: "sm" | "md" | "lg";
}

export interface DrawerProps extends Omit<DialogProps, "size"> {
  side?: "left" | "right";
  size?: "sm" | "md" | "lg";
}

export interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rendered as the trigger element; the adapter must not nest a button inside a button. */
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
  /** Render a separator before this item. */
  separator?: boolean;
}

export interface MenuProps {
  /** Trigger element; the adapter must not nest a button inside a button. */
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

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

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
  /** Optional className merge helper; surfaces never assumes Tailwind. */
  cx?: (...values: Array<string | false | null | undefined>) => string;
}

export const UiAdapterContext: React.Context<UiAdapter | null> = createContext<UiAdapter | null>(
  null,
);

export interface UiAdapterProviderProps {
  adapter: UiAdapter;
  children: ReactNode;
}

/**
 * Injects the visual primitive adapter. Exactly one provider is expected near
 * the application root (preset chrome usually supplies it).
 */
export function UiAdapterProvider({ adapter, children }: UiAdapterProviderProps): ReactNode {
  return createElement(UiAdapterContext.Provider, { value: adapter }, children);
}

/** Returns the active adapter; throws a descriptive error when none is mounted. */
export function useUiAdapter(): UiAdapter {
  const adapter = useContext(UiAdapterContext);
  if (adapter === null) {
    throw new Error(
      "@lynxland/uikit-surfaces: no UiAdapter provider found. Wrap the tree in " +
        "<UiAdapterProvider adapter={shadcnAdapter}> (or your own adapter) before rendering " +
        "surfaces values, controls, fields or views.",
    );
  }
  return adapter;
}

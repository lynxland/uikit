import { type UiAdapter, UiAdapterProvider } from "@lynxland/uikit-surfaces/adapter";
import type { ReactNode } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  cx,
  DateTimeInput,
  Dialog,
  Drawer,
  Field,
  Input,
  icons,
  Menu,
  Popover,
  Select,
  Switch,
  Table,
  Tabs,
  Textarea,
  Tooltip,
} from "./primitives";

/**
 * Minimal dependency-free UI adapter: plain HTML, semantic CSS classes and
 * neutral CSS variables. It exists to prove the UiAdapter contract is
 * replaceable without Tailwind/Base UI/Radix; it is not a full design system.
 *
 * Behavioural limits are documented on the individual primitives (native
 * select, non-portalled modal, no focus trap).
 */
export const plainAdapter: UiAdapter = {
  Button,
  Input,
  Textarea,
  Select,
  Checkbox,
  DateTimeInput,
  Switch,
  Field,
  Menu,
  Popover,
  Tooltip,
  Tabs,
  Dialog,
  Drawer,
  Badge,
  Card,
  Table,
  icons,
  cx,
};

export interface PlainUiProviderProps {
  children: ReactNode;
}

/** Convenience wrapper: mount the plain adapter once near the app root. */
export function PlainUiProvider({ children }: PlainUiProviderProps) {
  return UiAdapterProvider({ adapter: plainAdapter, children });
}

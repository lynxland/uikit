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
 * Default UI adapter: Base UI behaviour + shadcn structure/classes + semantic
 * tokens from `@lynxland/uikit-ui-shadcn/tokens.css`.
 *
 * Only the small `UiAdapter` surface is exported; Base UI compound APIs stay
 * inside this package.
 */
export const shadcnAdapter: UiAdapter = {
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

export interface ShadcnUiProviderProps {
  children: ReactNode;
}

/**
 * Convenience wrapper for the common case: mount the shadcn adapter once near
 * the application root.
 */
export function ShadcnUiProvider({ children }: ShadcnUiProviderProps) {
  return UiAdapterProvider({ adapter: shadcnAdapter, children });
}

import { ToastProvider, type UiAdapter, UiAdapterProvider } from "@lynxland/uikit-surfaces";
import { shadcnAdapter } from "@lynxland/uikit-ui-shadcn";
import type { ReactNode } from "react";

/**
 * Preset composition root for the UI adapter and feedback viewport.
 *
 * `PresetProvider` deliberately installs **nothing else**: QueryClient,
 * Router and Scope are application-owned (design.md §6.4 / §7.1). Toasts are
 * surfaces-level feedback (not data), so the preset owns their viewport by
 * default; consumers may still mount their own `ToastProvider` and use the
 * imperative `toast` API without it.
 */
export interface PresetProviderProps {
  children: ReactNode;
  adapter?: UiAdapter;
}

export function PresetProvider({ children, adapter = shadcnAdapter }: PresetProviderProps) {
  return (
    <UiAdapterProvider adapter={adapter}>
      <ToastProvider>{children}</ToastProvider>
    </UiAdapterProvider>
  );
}

/** Re-exported so applications can build a custom provider around it. */
export { shadcnAdapter };

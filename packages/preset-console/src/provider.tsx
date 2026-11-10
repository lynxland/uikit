import { type UiAdapter, UiAdapterProvider } from "@lynxland/uikit-surfaces";
import { shadcnAdapter } from "@lynxland/uikit-ui-shadcn";
import type { ReactNode } from "react";

/**
 * Preset composition root for the UI adapter only.
 *
 * `PresetProvider` deliberately installs **nothing else**: QueryClient,
 * Router and Scope are application-owned (design.md §6.4 / §7.1). The preset
 * pages are ordinary React components that read those providers through the
 * official bindings.
 */
export interface PresetProviderProps {
  children: ReactNode;
  adapter?: UiAdapter;
}

export function PresetProvider({ children, adapter = shadcnAdapter }: PresetProviderProps) {
  return <UiAdapterProvider adapter={adapter}>{children}</UiAdapterProvider>;
}

/** Re-exported so applications can build a custom provider around it. */
export { shadcnAdapter };

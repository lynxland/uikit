import { parseSearch, type Scope, stringifySearch } from "@lynxland/uikit-core";
import { PresetProvider, shadcnAdapter } from "@lynxland/uikit-preset-console";
import { ScopeProvider } from "@lynxland/uikit-react";
import { ThemeProvider } from "@lynxland/uikit-surfaces";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 0, refetchOnWindowFocus: false } },
});

// Repeated-key URL serializer (design.md §4.2 option A): filter=a:eq:1&
// filter=b:in:x,y instead of TanStack's JSON-array default. Unknown keys keep
// scalar JSON behaviour.
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  parseSearch,
  stringifySearch,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

/**
 * Application root. Order is deliberate:
 * QueryClient (engine) → PresetProvider (UI adapter) → ScopeProvider (app scope)
 * → RouterProvider. Preset installs nothing but the adapter; scope/query/router
 * stay application-owned.
 */
function App() {
  // Demo-wide scope: a key no source declares, so it never fragments read keys.
  const demoScope = useMemo<Scope>(() => ({ appId: "demo" }), []);

  return (
    <QueryClientProvider client={queryClient}>
      <PresetProvider adapter={shadcnAdapter}>
        <ThemeProvider storageKey="uikit.demo.theme" defaultTheme="dark">
          <ScopeProvider value={demoScope}>
            <RouterProvider router={router} />
          </ScopeProvider>
        </ThemeProvider>
      </PresetProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

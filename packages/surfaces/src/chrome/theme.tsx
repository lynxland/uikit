import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useUiAdapter } from "../adapter";
import { cx } from "../values/classes";

export type Theme = "light" | "dark";

export interface ThemeContextValue {
  theme: Theme;
  /** Currently identical to `theme`; kept for system-theme extensions. */
  resolvedTheme: Theme;
  setTheme(theme: Theme): void;
  toggle(): void;
}

export interface ThemeProviderProps {
  children: ReactNode;
  /** Default "dark"; persisted choice wins. */
  defaultTheme?: Theme;
  /** localStorage key; align it with the pre-paint inline script. */
  storageKey?: string;
}

export interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/** Inline pre-paint script for SSR/static HTML (prevents a light flash). */
export function themeScript(
  options: { storageKey?: string; defaultTheme?: Theme } = {},
): string {
  const storageKey = options.storageKey ?? "uikit-theme";
  const defaultTheme = options.defaultTheme ?? "dark";
  return `(() => {
  const stored = localStorage.getItem(${JSON.stringify(storageKey)});
  const dark = stored === null ? ${defaultTheme === "dark"} : stored === "dark";
  document.documentElement.classList.toggle("dark", dark);
})();`;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "uikit-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === "undefined") return defaultTheme;
    if (document.documentElement.classList.contains("dark")) return "dark";
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (isTheme(stored)) return stored;
    } catch {
      // localStorage can be unavailable (privacy mode); fall through.
    }
    return defaultTheme;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch {
      // Best effort; the in-memory theme still applies.
    }
  }, [theme, storageKey]);

  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const toggle = useCallback(
    () => setThemeState((current) => (current === "dark" ? "light" : "dark")),
    [],
  );
  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme: theme, setTheme, toggle }),
    [theme, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error(
      "@lynxland/uikit-surfaces: useTheme must be used inside <ThemeProvider> " +
        "(wrap the app root once).",
    );
  }
  return value;
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

/**
 * Optional default toggle for the chrome footer. It reads the ThemeProvider
 * contract and renders through the active UI adapter, so the same component
 * works with ui-shadcn, ui-plain or a custom adapter.
 */
export function ThemeToggle({ className, showLabel = true }: ThemeToggleProps) {
  const ui = useUiAdapter();
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  const merge = ui.cx ?? cx;

  return (
    <ui.Button
      type="button"
      variant="outline"
      size="sm"
      className={merge("ui-theme-toggle", className)}
      aria-label={`Switch to ${next} theme`}
      aria-pressed={theme === "dark"}
      data-testid="theme-toggle"
      onClick={toggle}
    >
      <span className="ui-theme-toggle__icon">{theme === "dark" ? <MoonIcon /> : <SunIcon />}</span>
      {showLabel ? <span className="ui-theme-toggle__label">{theme === "dark" ? "Dark" : "Light"}</span> : null}
      <span className="ui-theme-toggle__hint">theme</span>
    </ui.Button>
  );
}

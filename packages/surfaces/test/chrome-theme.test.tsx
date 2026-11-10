import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import { ThemeProvider, ThemeToggle, themeScript, useTheme } from "../src/chrome";
import { testAdapter } from "./test-adapter";

type MediaListener = (event: MediaQueryListEvent) => void;

let systemDark = false;
const mediaListeners = new Set<MediaListener>();

function setSystemDark(value: boolean) {
  systemDark = value;
  const event = { matches: value, media: "(prefers-color-scheme: dark)" } as MediaQueryListEvent;
  for (const listener of mediaListeners) listener(event);
}

function installMatchMedia() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) =>
      ({
        get matches() {
          return systemDark;
        },
        media: query,
        onchange: null,
        addEventListener: (_type: string, listener: MediaListener) => {
          mediaListeners.add(listener);
        },
        removeEventListener: (_type: string, listener: MediaListener) => {
          mediaListeners.delete(listener);
        },
        addListener: (listener: MediaListener) => mediaListeners.add(listener),
        removeListener: (listener: MediaListener) => mediaListeners.delete(listener),
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });
}

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
  systemDark = false;
  mediaListeners.clear();
  installMatchMedia();
});

function ThemeProbe() {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" onClick={toggle}>
      {theme}
    </button>
  );
}

function ResolvedThemeProbe() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button type="button" onClick={() => setTheme("system")}>
        use system
      </button>
    </>
  );
}

describe("ThemeProvider", () => {
  it("applies and persists the theme class", () => {
    render(
      <ThemeProvider storageKey="test.theme" defaultTheme="dark">
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "dark" }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem("test.theme")).toBe("light");
    expect(screen.getByRole("button", { name: "light" })).toBeTruthy();
  });

  it("throws a clear error outside the provider", () => {
    expect(() => render(<ThemeProbe />)).toThrow(/ThemeProvider/);
  });

  it("exposes a pre-paint script contract", () => {
    const script = themeScript({ storageKey: "test.theme", defaultTheme: "light" });
    expect(script).toContain('localStorage.getItem("test.theme")');
    expect(script).toContain('theme === "system"');
    expect(script).toContain("matchMedia");
    expect(script).toContain('"light"');
  });

  it("resolves system theme and follows OS changes", () => {
    window.localStorage.setItem("test.system", "system");
    render(
      <ThemeProvider storageKey="test.system" defaultTheme="light">
        <ResolvedThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme").textContent).toBe("system");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    act(() => setSystemDark(true));
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("test.system")).toBe("system");

    act(() => setSystemDark(false));
    expect(screen.getByTestId("resolved").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("stores an explicit theme when toggling from system", () => {
    window.localStorage.setItem("test.toggle-system", "system");
    act(() => setSystemDark(true));
    render(
      <ThemeProvider storageKey="test.toggle-system" defaultTheme="light">
        <ThemeProbe />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "system" }));
    expect(screen.getByRole("button", { name: "light" })).toBeTruthy();
    expect(window.localStorage.getItem("test.toggle-system")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("ThemeToggle", () => {
  it("renders through the UI adapter and toggles the provider", () => {
    render(
      <ThemeProvider storageKey="test.toggle" defaultTheme="dark">
        <UiAdapterProvider adapter={testAdapter}>
          <ThemeToggle />
        </UiAdapterProvider>
      </ThemeProvider>,
    );

    const toggle = screen.getByTestId("theme-toggle");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem("test.toggle")).toBe("light");
  });
});

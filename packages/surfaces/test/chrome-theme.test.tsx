import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import { ThemeProvider, themeScript, ThemeToggle, useTheme } from "../src/chrome";
import { testAdapter } from "./test-adapter";

afterEach(cleanup);

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});

function ThemeProbe() {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" onClick={toggle}>
      {theme}
    </button>
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
    expect(script).toContain("false");
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

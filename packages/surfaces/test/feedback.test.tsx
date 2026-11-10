import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import { Alert, Kbd, Progress, shortcutKeys } from "../src/values";
import { testAdapter } from "./test-adapter";

afterEach(cleanup);

function withAdapter(node: ReactNode) {
  return <UiAdapterProvider adapter={testAdapter}>{node}</UiAdapterProvider>;
}

describe("Alert", () => {
  it("renders tone, title, description and action without a live role by default", () => {
    render(
      withAdapter(
        <Alert
          tone="warning"
          title="Heads up"
          description="Invalid config can break Traefik."
          action={<button type="button">Reload</button>}
        />,
      ),
    );

    const alert = screen.getByTestId("alert");
    expect(alert.getAttribute("data-tone")).toBe("warning");
    expect(alert.getAttribute("role")).toBeNull();
    expect(screen.getByText("Heads up")).toBeTruthy();
    expect(screen.getByText("Invalid config can break Traefik.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
  });

  it("uses role=alert only when live and renders children as the description", () => {
    render(
      withAdapter(
        <Alert tone="danger" live>
          Deployment failed.
        </Alert>,
      ),
    );
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("data-tone")).toBe("danger");
    expect(alert.textContent).toContain("Deployment failed.");
  });
});

describe("Progress", () => {
  it("clamps the value and exposes determinate ARIA attributes", () => {
    render(withAdapter(<Progress value={140} max={100} tone="success" aria-label="CPU" />));
    const bar = screen.getByRole("progressbar", { name: "CPU" });
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.getAttribute("data-tone")).toBe("success");
    expect(bar.style.getPropertyValue("--ui-progress-value")).toBe("100%");
  });

  it("renders a visible label and omits the numeric value when indeterminate", () => {
    render(withAdapter(<Progress value={12} indeterminate label="Syncing" aria-label="Sync" />));
    expect(screen.getByText("Syncing")).toBeTruthy();
    const bar = screen.getByRole("progressbar", { name: "Sync" });
    expect(bar.getAttribute("aria-valuenow")).toBeNull();
    expect(bar.className).toContain("ui-progress__track--indeterminate");
  });
});

describe("Kbd", () => {
  it("renders key tokens and a platform shortcut", () => {
    const { container } = render(withAdapter(<Kbd keys={["⌘", "K"]} />));
    const kbd = container.querySelector("kbd");
    expect(kbd?.textContent).toBe("⌘K");

    const shortcut = render(withAdapter(<Kbd shortcut="mod+k" />));
    const text = shortcut.container.querySelector("kbd")?.textContent ?? "";
    expect(text).toMatch(/⌘K|Ctrl K/);
  });

  it("expands named shortcut tokens", () => {
    expect(shortcutKeys("mod+enter", true)).toEqual(["⌘", "↵"]);
    expect(shortcutKeys("ctrl+shift+k", false)).toEqual(["Ctrl", "Shift", "K"]);
    expect(shortcutKeys("esc", true)).toEqual(["Esc"]);
  });
});

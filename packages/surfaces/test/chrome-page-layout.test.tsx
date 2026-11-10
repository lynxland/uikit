import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import { PageLayout } from "../src/chrome";
import { testAdapter } from "./test-adapter";

afterEach(cleanup);

function withAdapter(node: ReactNode) {
  return <UiAdapterProvider adapter={testAdapter}>{node}</UiAdapterProvider>;
}

describe("PageLayout", () => {
  it("renders exactly one h1 and the page header slots", () => {
    const { container } = render(
      withAdapter(
        <PageLayout
          title="Widgets"
          description="All widgets"
          breadcrumb={<a href="/">Home</a>}
          backLink={<a href="/apps">Back</a>}
          actions={<button type="button">New</button>}
          lead={<div data-testid="lead">Firing</div>}
        >
          <h2>Content heading</h2>
        </PageLayout>,
      ),
    );

    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Widgets" })).toBeTruthy();
    expect(screen.getByText("All widgets")).toBeTruthy();
    expect(screen.getByRole("button", { name: "New" })).toBeTruthy();
    expect(screen.getByTestId("lead")).toBeTruthy();
  });

  it("renders controlled tabs and reports changes without touching the Router", () => {
    const onTabChange = vi.fn();
    const result = render(
      withAdapter(
        <PageLayout
          title="Widgets"
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "settings", label: "Settings" },
          ]}
          currentTab="overview"
          onTabChange={onTabChange}
        >
          body
        </PageLayout>,
      ),
    );

    expect(screen.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
    expect(onTabChange).toHaveBeenCalledWith("settings");

    result.rerender(
      withAdapter(
        <PageLayout
          title="Widgets"
          tabs={[
            { value: "overview", label: "Overview" },
            { value: "settings", label: "Settings" },
          ]}
          currentTab="settings"
          onTabChange={onTabChange}
        >
          body
        </PageLayout>,
      ),
    );
    expect(screen.getByRole("tab", { name: "Settings" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("applies the width preset and skips the header without a title", () => {
    const { container } = render(
      withAdapter(
        <PageLayout width="narrow">
          <p>content</p>
        </PageLayout>,
      ),
    );
    expect(container.querySelector(".ui-page-layout--narrow")).toBeTruthy();
    expect(container.querySelector("h1")).toBeNull();
    expect(container.querySelector("header")).toBeNull();
  });

  it("supports title sizes, content width, header divider and tab variants", () => {
    const { container } = render(
      withAdapter(
        <PageLayout
          title="Settings"
          titleSize="lg"
          width="content"
          maxWidth="50rem"
          headerDivider
          tabsVariant="segmented"
          tabs={[
            { value: "general", label: "General" },
            { value: "advanced", label: "Advanced" },
          ]}
          currentTab="general"
        >
          body
        </PageLayout>,
      ),
    );
    const page = screen.getByTestId("page-layout");
    expect(page.className).toContain("ui-page-layout--content");
    expect(page.getAttribute("data-title-size")).toBe("lg");
    expect((page as HTMLElement).style.maxWidth).toBe("50rem");
    expect(container.querySelector(".ui-page-layout__divider")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).getAttribute("data-title-size")).toBe("lg");
    expect(container.querySelector(".ui-page-layout__tabs")?.getAttribute("data-variant")).toBe(
      "segmented",
    );
    expect(screen.getByRole("tablist").getAttribute("data-variant")).toBe("segmented");
  });
});

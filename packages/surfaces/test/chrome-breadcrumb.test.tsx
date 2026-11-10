import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import { Breadcrumb, PageLayout } from "../src/chrome";
import { testAdapter } from "./test-adapter";

afterEach(cleanup);

function renderWithAdapter(node: React.ReactNode) {
  return render(<UiAdapterProvider adapter={testAdapter}>{node}</UiAdapterProvider>);
}

describe("Breadcrumb", () => {
  it("renders plain links and marks the last item as current", () => {
    renderWithAdapter(
      <Breadcrumb
        items={[
          { label: "Widgets", href: "/widgets" },
          { label: "Details" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Widgets" }).getAttribute("href")).toBe("/widgets");
    expect(screen.getByText("Details").getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy();
  });

  it("accepts a custom render element for Router links", () => {
    renderWithAdapter(
      <Breadcrumb
        items={[
          { label: "Widgets", render: <a href="/custom">Widgets custom</a> },
          { label: "Details" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Widgets custom" }).getAttribute("href")).toBe(
      "/custom",
    );
  });

  it("is wired into PageLayout", () => {
    renderWithAdapter(
      <PageLayout
        title="Widget"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: "Widgets", href: "/widgets" },
              { label: "Widget" },
            ]}
          />
        }
      >
        body
      </PageLayout>,
    );
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Widget" })).toBeTruthy();
  });
});

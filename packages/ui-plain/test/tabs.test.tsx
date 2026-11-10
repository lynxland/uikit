import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Tabs } from "../src";
import "./setup";

const items = [
  { value: "overview", label: "Overview" },
  { value: "settings", label: "Settings" },
  { value: "logs", label: "Logs", disabled: true },
] as const;

function TabsHarness({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState("overview");
  return (
    <Tabs
      aria-label="Sections"
      items={items}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("Tabs", () => {
  it("switches the controlled value", () => {
    const onChange = vi.fn();
    render(<TabsHarness onChange={onChange} />);

    const overview = screen.getByRole("tab", { name: "Overview" });
    const settings = screen.getByRole("tab", { name: "Settings" });
    expect(overview.getAttribute("aria-selected")).toBe("true");
    expect(settings.getAttribute("aria-selected")).toBe("false");
    expect(overview.getAttribute("tabindex")).toBe("0");
    expect(settings.getAttribute("tabindex")).toBe("-1");

    fireEvent.click(settings);

    expect(onChange).toHaveBeenCalledWith("settings");
    expect(screen.getByRole("tab", { name: "Settings" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected")).toBe(
      "false",
    );
  });

  it("moves selection with arrow keys and skips disabled tabs", () => {
    const onChange = vi.fn();
    render(<TabsHarness onChange={onChange} />);

    const overview = screen.getByRole("tab", { name: "Overview" });
    fireEvent.keyDown(overview, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("settings");

    // Settings -> next enabled tab wraps past the disabled "Logs" to Overview.
    fireEvent.keyDown(screen.getByRole("tab", { name: "Settings" }), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("overview");
  });

  it("does not activate disabled tabs", () => {
    render(<TabsHarness />);
    const logs = screen.getByRole("tab", { name: "Logs" });
    expect(logs.hasAttribute("data-disabled")).toBe(true);
    fireEvent.click(logs);
    expect(screen.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("renders the three visual variants", () => {
    const { rerender } = render(
      <Tabs aria-label="Sections" items={items} value="overview" onValueChange={() => {}} />,
    );
    expect(screen.getByRole("tablist").className).toContain("ui-plain-tabs--underline");

    rerender(
      <Tabs
        aria-label="Sections"
        items={items}
        value="overview"
        onValueChange={() => {}}
        variant="pills"
      />,
    );
    expect(screen.getByRole("tablist").className).toContain("ui-plain-tabs--pills");

    rerender(
      <Tabs
        aria-label="Sections"
        items={items}
        value="overview"
        onValueChange={() => {}}
        variant="filter"
      />,
    );
    expect(screen.getByRole("tab", { name: "Overview" }).className).toContain(
      "ui-plain-tab--filter",
    );
  });
});

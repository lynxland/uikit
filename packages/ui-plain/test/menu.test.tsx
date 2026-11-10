import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button, Menu } from "../src";
import "./setup";

const trigger = (
  <Button type="button" variant="ghost" aria-label="Actions">
    Actions
  </Button>
);

describe("plain Menu", () => {
  it("opens, focuses the first item and reports selection", async () => {
    const onOpen = vi.fn();
    render(
      <Menu
        aria-label="Project actions"
        trigger={trigger}
        items={[
          { label: "Open", onSelect: onOpen },
          { label: "Delete", danger: true },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    const menu = await screen.findByRole("menu", { name: "Project actions" });
    expect(document.activeElement?.textContent).toContain("Open");

    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));
    expect(onOpen).toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
    expect(menu).toBeTruthy();
  });

  it("supports legacy and explicit separators plus labels", async () => {
    render(
      <Menu
        trigger={trigger}
        items={[
          { kind: "label", label: "Manage" },
          { label: "Open" },
          { label: "Legacy", separator: true },
          { kind: "separator", label: null },
          { label: "Delete", danger: true },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    await screen.findByRole("menu");
    expect(screen.getByText("Manage")).toBeTruthy();
    expect(screen.getAllByRole("separator")).toHaveLength(2);
    expect(screen.getAllByRole("menuitem")).toHaveLength(3);
  });

  it("toggles checkbox items without closing the menu", async () => {
    const onCheckedChange = vi.fn();
    render(
      <Menu
        trigger={trigger}
        items={[
          {
            kind: "checkbox",
            label: "Production",
            checked: false,
            onCheckedChange,
            testId: "toggle-production",
          },
          { kind: "checkbox", label: "Staging", checked: true, onCheckedChange },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    const production = await screen.findByRole("menuitemcheckbox", { name: "Production" });
    expect(production.getAttribute("aria-checked")).toBe("false");
    expect(production.getAttribute("data-testid")).toBe("toggle-production");
    expect(
      screen.getByRole("menuitemcheckbox", { name: "Staging" }).getAttribute("aria-checked"),
    ).toBe("true");

    fireEvent.click(production);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("menu")).toBeTruthy();
  });

  it("selects a radio item and closes the menu", async () => {
    const onPick = vi.fn();
    render(
      <Menu
        trigger={trigger}
        items={[
          { kind: "radio", label: "All tags", checked: true, onCheckedChange: onPick },
          { kind: "radio", label: "frontend", checked: false, onCheckedChange: onPick },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(
      (await screen.findByRole("menuitemradio", { name: "All tags" })).getAttribute("aria-checked"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("menuitemradio", { name: "frontend" }));
    expect(onPick).toHaveBeenCalledWith(true);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("moves focus with ArrowDown/ArrowUp and closes on Escape", async () => {
    render(
      <Menu
        trigger={trigger}
        items={[{ label: "First" }, { label: "Second" }, { label: "Third" }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    const menu = await screen.findByRole("menu");
    expect(document.activeElement?.textContent).toContain("First");

    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(document.activeElement?.textContent).toContain("Second");
    fireEvent.keyDown(menu, { key: "End" });
    expect(document.activeElement?.textContent).toContain("Third");
    fireEvent.keyDown(menu, { key: "ArrowUp" });
    expect(document.activeElement?.textContent).toContain("Second");
    fireEvent.keyDown(menu, { key: "Home" });
    expect(document.activeElement?.textContent).toContain("First");

    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("opens a submenu with ArrowRight and closes it with ArrowLeft", async () => {
    const onNested = vi.fn();
    render(
      <Menu
        trigger={trigger}
        items={[
          { label: "First" },
          {
            kind: "submenu",
            label: "More",
            items: [{ label: "Duplicate", onSelect: onNested }],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    const menu = await screen.findByRole("menu");
    const submenuTrigger = screen.getByRole("menuitem", { name: "More" });
    submenuTrigger.focus();

    fireEvent.keyDown(menu, { key: "ArrowRight" });
    const nested = await screen.findByRole("menuitem", { name: "Duplicate" });
    expect(submenuTrigger.getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement?.textContent).toContain("Duplicate");

    fireEvent.keyDown(nested, { key: "ArrowLeft" });
    await waitFor(() => expect(screen.queryByRole("menuitem", { name: "Duplicate" })).toBeNull());
    expect(document.activeElement?.textContent).toContain("More");

    fireEvent.keyDown(menu, { key: "ArrowRight" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Duplicate" }));
    expect(onNested).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button, Menu } from "../src";
import "./setup";

const trigger = (
  <Button type="button" variant="ghost" aria-label="Actions">
    Actions
  </Button>
);

describe("Menu", () => {
  it("opens from the trigger and reports item selection", async () => {
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    render(
      <Menu
        aria-label="Project actions"
        trigger={trigger}
        items={[
          { label: "Open", onSelect: onOpen },
          { label: "Delete", onSelect: onDelete, danger: true, separator: true },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(await screen.findByRole("menu", { name: "Project actions" })).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));
    expect(onOpen).toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("keeps the legacy separator shorthand and the explicit separator kind", async () => {
    render(
      <Menu
        trigger={trigger}
        items={[
          { label: "Open" },
          { label: "Legacy", separator: true },
          { label: "Explicit section", kind: "separator" },
          { label: "Delete", danger: true },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    await screen.findByRole("menu");
    expect(screen.getAllByRole("separator")).toHaveLength(2);
  });

  it("renders checkbox items with checked state and keeps the menu open", async () => {
    const onCheckedChange = vi.fn();
    const { rerender } = render(
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
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    const item = await screen.findByRole("menuitemcheckbox", { name: "Production" });
    expect(item.getAttribute("aria-checked")).toBe("false");
    expect(item.getAttribute("data-testid")).toBe("toggle-production");

    fireEvent.click(item);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("menu")).toBeTruthy();

    rerender(
      <Menu
        trigger={trigger}
        items={[
          {
            kind: "checkbox",
            label: "Production",
            checked: true,
            onCheckedChange,
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("menuitemcheckbox", { name: "Production" }).getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("groups radio items and reports the selected radio", async () => {
    const onPick = vi.fn();
    render(
      <Menu
        trigger={trigger}
        items={[
          { kind: "radio", label: "All tags", checked: true, onCheckedChange: onPick },
          { kind: "radio", label: "frontend", checked: false, onCheckedChange: onPick },
          { kind: "radio", label: "backend", checked: false, onCheckedChange: onPick },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    const all = await screen.findByRole("menuitemradio", { name: "All tags" });
    expect(all.getAttribute("aria-checked")).toBe("true");
    expect(
      screen.getByRole("menuitemradio", { name: "frontend" }).getAttribute("aria-checked"),
    ).toBe("false");

    fireEvent.click(screen.getByRole("menuitemradio", { name: "frontend" }));
    expect(onPick).toHaveBeenCalledWith(true);
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });

  it("renders labels and opens a nested submenu", async () => {
    const onNested = vi.fn();
    render(
      <Menu
        trigger={trigger}
        items={[
          { kind: "label", label: "Manage" },
          {
            kind: "submenu",
            label: "More",
            items: [
              { label: "Duplicate", onSelect: onNested },
              { kind: "separator", label: null },
              { label: "Archive" },
            ],
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    expect(await screen.findByText("Manage")).toBeTruthy();
    const submenuTrigger = screen.getByRole("menuitem", { name: "More" });
    expect(submenuTrigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(submenuTrigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(submenuTrigger);
    expect(await screen.findByRole("menuitem", { name: "Duplicate" })).toBeTruthy();
    expect(submenuTrigger.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    expect(onNested).toHaveBeenCalled();
  });
});

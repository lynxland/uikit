import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import { type CommandItem, CommandMenu, CommandPalette, filterCommandItems } from "../src/controls";
import { testAdapter } from "./test-adapter";

afterEach(cleanup);

const ITEMS: readonly CommandItem[] = [
  { id: "prod", label: "Production", checked: true },
  { id: "staging", label: "Staging", keywords: ["preview"] },
  { id: "dev", label: "Development", disabled: true },
];

function MenuHarness({ onSelect }: { onSelect?: (item: CommandItem) => void }) {
  const [open, setOpen] = useState(false);
  const items =
    onSelect !== undefined
      ? ITEMS.map((item) => ({ ...item, onSelect: () => onSelect(item) }))
      : ITEMS;
  return (
    <UiAdapterProvider adapter={testAdapter}>
      <CommandMenu
        open={open}
        onOpenChange={setOpen}
        trigger={<button type="button">Environments</button>}
        items={items}
        placeholder="Search environments…"
      />
    </UiAdapterProvider>
  );
}

function PaletteHarness({
  onOpenChange,
  onSelect,
}: {
  onOpenChange: (open: boolean) => void;
  onSelect: (item: CommandItem) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <UiAdapterProvider adapter={testAdapter}>
      <CommandPalette
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange(next);
        }}
        items={ITEMS.map((item) => ({ ...item, onSelect: () => onSelect(item) }))}
      />
    </UiAdapterProvider>
  );
}

describe("filterCommandItems", () => {
  it("matches labels, keywords and groups case-insensitively", () => {
    expect(filterCommandItems(ITEMS, "prev").map((item) => item.id)).toEqual(["staging"]);
    expect(filterCommandItems(ITEMS, "PROD").map((item) => item.id)).toEqual(["prod"]);
    expect(filterCommandItems(ITEMS, "")).toHaveLength(3);
  });
});

describe("CommandMenu", () => {
  it("filters, selects with Enter and shows the checked item", () => {
    const onSelect = vi.fn();
    render(<MenuHarness onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Environments" }));

    const input = screen.getByTestId("command-menu-input");
    expect(screen.getByRole("option", { name: "Production" }).getAttribute("data-checked")).toBe(
      "true",
    );

    fireEvent.change(input, { target: { value: "sta" } });
    expect(screen.queryByRole("option", { name: "Production" })).toBeNull();
    const staging = screen.getByRole("option", { name: "Staging" });
    expect(staging.getAttribute("aria-selected")).toBe("true");

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "staging" }));
    expect(screen.queryByTestId("command-menu")).toBeNull();
  });

  it("moves the active option with arrows, Home/End and skips disabled items", () => {
    const onSelect = vi.fn();
    render(<MenuHarness onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Environments" }));

    const input = screen.getByTestId("command-menu-input");
    expect(screen.getByRole("option", { name: "Production" }).getAttribute("data-active")).toBe(
      "true",
    );

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: "Staging" }).getAttribute("data-active")).toBe(
      "true",
    );

    fireEvent.keyDown(input, { key: "End" });
    expect(screen.getByRole("option", { name: "Staging" }).getAttribute("data-active")).toBe(
      "true",
    );

    fireEvent.keyDown(input, { key: "Home" });
    expect(screen.getByRole("option", { name: "Production" }).getAttribute("data-active")).toBe(
      "true",
    );

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "prod" }));
  });

  it("closes on Escape and reports an empty result", () => {
    render(<MenuHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Environments" }));
    const input = screen.getByTestId("command-menu-input");
    fireEvent.change(input, { target: { value: "nothing" } });
    expect(screen.getByText("No results.")).toBeTruthy();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByTestId("command-menu")).toBeNull();
  });
});

describe("CommandPalette", () => {
  it("filters, selects with Enter and closes", () => {
    const onOpenChange = vi.fn();
    const onSelect = vi.fn();
    render(<PaletteHarness onOpenChange={onOpenChange} onSelect={onSelect} />);

    expect(screen.getByTestId("command-palette")).toBeTruthy();
    const input = screen.getByTestId("command-input");
    fireEvent.change(input, { target: { value: "stag" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "staging" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows Kbd footer hints and closes on Escape", () => {
    const onOpenChange = vi.fn();
    render(<PaletteHarness onOpenChange={onOpenChange} onSelect={() => {}} />);
    expect(screen.getByText("Navigate")).toBeTruthy();
    expect(screen.getByText("Select")).toBeTruthy();
    expect(screen.getByText("Close")).toBeTruthy();

    fireEvent.keyDown(screen.getByTestId("command-input"), { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

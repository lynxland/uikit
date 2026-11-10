import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button, Dialog, Drawer, Popover } from "../src";
import "./setup";

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Create widget"
        description="Widgets are rendered in the console."
        footer={<Button>Save</Button>}
      >
        <p>Dialog body</p>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("opens from a trigger, renders title/footer, and closes", async () => {
    render(<DialogHarness />);

    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Create widget" })).toBeTruthy();
    expect(screen.getByText("Widgets are rendered in the console.")).toBeTruthy();
    expect(screen.getByText("Dialog body")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("honours controlled open state", async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Details" size="sm">
        <p>Controlled body</p>
      </Dialog>,
    );

    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByText("Controlled body")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("Drawer", () => {
  it("renders side, title and footer and reports close", async () => {
    const onOpenChange = vi.fn();
    render(
      <Drawer
        open
        onOpenChange={onOpenChange}
        side="left"
        size="lg"
        title="Filters"
        description="Narrow the collection."
        footer={<Button>Apply</Button>}
      >
        <p>Drawer body</p>
      </Drawer>,
    );

    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Filters" })).toBeTruthy();
    expect(screen.getByText("Narrow the collection.")).toBeTruthy();
    expect(screen.getByText("Drawer body")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Apply" })).toBeTruthy();

    const popup = screen.getByRole("dialog");
    expect(popup.getAttribute("data-side")).toBe("left");
    expect(popup.className).toContain("border-r");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

function PopoverHarness() {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="outline">Filters</Button>}
    >
      <p>Popover body</p>
    </Popover>
  );
}

describe("Popover", () => {
  it("uses the passed element as trigger without nesting buttons", async () => {
    render(<PopoverHarness />);

    const triggers = screen.getAllByRole("button", { name: "Filters" });
    expect(triggers).toHaveLength(1);

    fireEvent.click(triggers[0]!);
    expect(await screen.findByText("Popover body")).toBeTruthy();

    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Popover body")).toBeNull());
  });
});

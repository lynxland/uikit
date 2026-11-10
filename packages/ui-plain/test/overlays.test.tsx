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
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByRole("heading", { name: "Create widget" })).toBeTruthy();
    expect(screen.getByText("Widgets are rendered in the console.")).toBeTruthy();
    expect(screen.getByText("Dialog body")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("closes on Escape and reports the controlled change", async () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Details" size="sm">
        <p>Controlled body</p>
      </Dialog>,
    );

    expect(await screen.findByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("maps xl/fullscreen sizes and applies className to the panel", async () => {
    const { rerender } = render(
      <Dialog open onOpenChange={() => undefined} title="Build log" size="xl" className="dialog-wide">
        <p>Controlled body</p>
      </Dialog>,
    );

    const panel = await screen.findByRole("dialog");
    expect(panel.getAttribute("data-size")).toBe("xl");
    expect(panel.className).toContain("ui-plain-dialog-panel--xl");
    expect(panel.className).toContain("dialog-wide");

    rerender(
      <Dialog open onOpenChange={() => undefined} title="Build log" size="fullscreen">
        <p>Controlled body</p>
      </Dialog>,
    );
    const fullscreen = screen.getByRole("dialog");
    expect(fullscreen.getAttribute("data-size")).toBe("fullscreen");
    expect(fullscreen.className).toContain("ui-plain-dialog-panel--fullscreen");
  });
});

describe("Drawer", () => {
  it("renders side, title and footer, and reports close", async () => {
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

    const drawer = await screen.findByRole("dialog");
    expect(screen.getByRole("heading", { name: "Filters" })).toBeTruthy();
    expect(screen.getByText("Narrow the collection.")).toBeTruthy();
    expect(screen.getByText("Drawer body")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Apply" })).toBeTruthy();
    expect(drawer.getAttribute("data-side")).toBe("left");
    expect(drawer.className).toContain("ui-plain-drawer-panel--left");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("maps xl/fullscreen sizes and applies className to the panel", async () => {
    const { rerender } = render(
      <Drawer
        open
        onOpenChange={() => undefined}
        title="Logs"
        size="xl"
        className="drawer-wide"
      >
        <p>Drawer body</p>
      </Drawer>,
    );

    const panel = await screen.findByRole("dialog");
    expect(panel.getAttribute("data-size")).toBe("xl");
    expect(panel.className).toContain("ui-plain-drawer-panel--xl");
    expect(panel.className).toContain("drawer-wide");

    rerender(
      <Drawer open onOpenChange={() => undefined} title="Logs" size="fullscreen">
        <p>Drawer body</p>
      </Drawer>,
    );
    const fullscreen = screen.getByRole("dialog");
    expect(fullscreen.getAttribute("data-size")).toBe("fullscreen");
    expect(fullscreen.className).toContain("ui-plain-drawer-panel--fullscreen");
  });
});

function PopoverHarness() {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="outline">Filters</Button>}
      className="popover-wide"
    >
      <p>Popover body</p>
    </Popover>
  );
}

describe("Popover", () => {
  it("uses the passed element as trigger and closes on Escape", async () => {
    render(<PopoverHarness />);

    const triggers = screen.getAllByRole("button", { name: "Filters" });
    expect(triggers).toHaveLength(1);
    expect(triggers[0]?.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(triggers[0] as HTMLElement);
    expect(await screen.findByText("Popover body")).toBeTruthy();
    expect(screen.getByText("Popover body").closest(".popover-wide")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Filters" }).getAttribute("aria-expanded")).toBe(
      "true",
    );

    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Popover body")).toBeNull());
  });
});

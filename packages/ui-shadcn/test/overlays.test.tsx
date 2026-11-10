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

  it("maps xl/fullscreen sizes and applies className to the popup", async () => {
    const { rerender } = render(
      <Dialog open onOpenChange={() => undefined} title="Build log" size="xl" className="dialog-wide">
        <p>Log body</p>
      </Dialog>,
    );

    const popup = await screen.findByRole("dialog");
    expect(popup.getAttribute("data-size")).toBe("xl");
    expect(popup.className).toContain("sm:max-w-[64rem]");
    expect(popup.className).toContain("dialog-wide");

    rerender(
      <Dialog open onOpenChange={() => undefined} title="Build log" size="fullscreen">
        <p>Log body</p>
      </Dialog>,
    );
    const fullscreen = screen.getByRole("dialog");
    expect(fullscreen.getAttribute("data-size")).toBe("fullscreen");
    expect(fullscreen.className).toContain("h-[calc(100dvh-1rem)]");
    expect(fullscreen.className).toContain("max-w-none");
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

  it("maps xl/fullscreen sizes and applies className to the panel", async () => {
    const { rerender } = render(
      <Drawer open onOpenChange={() => undefined} title="Logs" size="xl" className="drawer-wide">
        <p>Drawer body</p>
      </Drawer>,
    );

    const popup = await screen.findByRole("dialog");
    expect(popup.getAttribute("data-size")).toBe("xl");
    expect(popup.className).toContain("sm:max-w-[64rem]");
    expect(popup.className).toContain("drawer-wide");

    rerender(
      <Drawer open onOpenChange={() => undefined} title="Logs" size="fullscreen">
        <p>Drawer body</p>
      </Drawer>,
    );
    const fullscreen = screen.getByRole("dialog");
    expect(fullscreen.getAttribute("data-size")).toBe("fullscreen");
    expect(fullscreen.className).toContain("sm:max-w-none");
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
  it("uses the passed element as trigger without nesting buttons", async () => {
    render(<PopoverHarness />);

    const triggers = screen.getAllByRole("button", { name: "Filters" });
    expect(triggers).toHaveLength(1);

    fireEvent.click(triggers[0]!);
    expect(await screen.findByText("Popover body")).toBeTruthy();
    expect(screen.getByText("Popover body").closest(".popover-wide")).toBeTruthy();

    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Popover body")).toBeNull());
  });
});

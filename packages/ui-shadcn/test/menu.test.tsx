import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button, Menu } from "../src";
import "./setup";

describe("Menu", () => {
  it("opens from the trigger and reports item selection", async () => {
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    render(
      <Menu
        aria-label="Project actions"
        trigger={
          <Button type="button" variant="ghost" aria-label="Actions">
            Actions
          </Button>
        }
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
});

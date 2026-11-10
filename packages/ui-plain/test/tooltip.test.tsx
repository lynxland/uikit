import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tooltip } from "../src";
import "./setup";

describe("Tooltip", () => {
  it("describes the trigger on focus and hover", () => {
    render(
      <Tooltip
        content="Edit service"
        trigger={
          <button type="button" aria-label="Edit service">
            edit
          </button>
        }
      />,
    );

    const trigger = screen.getByRole("button", { name: "Edit service" });
    expect(screen.queryByRole("tooltip")).toBeNull();

    fireEvent.focus(trigger);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toBe("Edit service");
    expect(trigger.getAttribute("aria-describedby")).toBe(tooltip.id);

    fireEvent.blur(trigger);
    expect(screen.queryByRole("tooltip")).toBeNull();

    fireEvent.pointerEnter(trigger);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.pointerLeave(trigger);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("closes on Escape and respects disabled", () => {
    const { rerender } = render(
      <Tooltip
        content="Delete service"
        trigger={
          <button type="button" aria-label="Delete service">
            delete
          </button>
        }
      />,
    );
    const trigger = screen.getByRole("button", { name: "Delete service" });
    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();

    rerender(
      <Tooltip
        disabled
        content="Delete service"
        trigger={
          <button type="button" aria-label="Delete service">
            delete
          </button>
        }
      />,
    );
    fireEvent.focus(screen.getByRole("button", { name: "Delete service" }));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});

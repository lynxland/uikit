import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tooltip } from "../src";
import "./setup";

describe("Tooltip", () => {
  it("shows content on keyboard focus without nesting a button", async () => {
    render(
      <Tooltip
        delay={0}
        content="Edit service"
        trigger={
          <button type="button" aria-label="Edit service">
            edit
          </button>
        }
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(1);
    const trigger = screen.getByRole("button", { name: "Edit service" });
    fireEvent.focus(trigger);
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toBe("Edit service");
    expect(trigger.getAttribute("aria-describedby")).toBe(tooltip.id);
  });

  it("closes on Escape and honours disabled", async () => {
    const { rerender } = render(
      <Tooltip
        delay={0}
        content="Delete service"
        trigger={
          <button type="button" aria-label="Delete service">
            delete
          </button>
        }
      />,
    );
    fireEvent.focus(screen.getByRole("button", { name: "Delete service" }));
    expect(await screen.findByRole("tooltip")).toBeTruthy();
    fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());

    rerender(
      <Tooltip
        delay={0}
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

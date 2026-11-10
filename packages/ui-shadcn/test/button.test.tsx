import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../src";
import "./setup";

describe("Button", () => {
  it("renders variants and sizes", () => {
    const { rerender } = render(
      <Button variant="outline" size="sm">
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.className).toContain("border-[var(--input)]");
    expect(button.className).toContain("text-xs");
    expect(button.getAttribute("type")).toBe("button");

    rerender(
      <Button variant="destructive" size="lg">
        Delete
      </Button>,
    );
    const destructive = screen.getByRole("button", { name: "Delete" });
    expect(destructive.className).toContain("bg-[var(--destructive)]");
    expect(destructive.className).toContain("h-10");
  });

  it("renders a single child as the button surface with asChild", () => {
    render(
      <Button asChild variant="outline">
        <a href="/widgets">Open widgets</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Open widgets" });
    expect(link.getAttribute("href")).toBe("/widgets");
    expect(link.className).toContain("border-[var(--input)]");
  });

  it("is disabled while loading and announces busy state", () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.querySelector("svg")).not.toBeNull();
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

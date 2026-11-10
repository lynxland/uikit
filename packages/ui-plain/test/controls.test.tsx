import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button, Field, Input, Textarea } from "../src";
import "./setup";

describe("Button", () => {
  it("renders plain classes, type=button and variants", () => {
    const { rerender } = render(
      <Button variant="outline" size="sm">
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.className).toContain("ui-plain-button");
    expect(button.className).toContain("ui-plain-button--outline");
    expect(button.className).toContain("ui-plain-button--sm");
    expect(button.getAttribute("type")).toBe("button");

    rerender(
      <Button variant="destructive" size="lg">
        Delete
      </Button>,
    );
    const destructive = screen.getByRole("button", { name: "Delete" });
    expect(destructive.className).toContain("ui-plain-button--destructive");
    expect(destructive.className).toContain("ui-plain-button--lg");
  });

  it("renders a child link with asChild", () => {
    render(
      <Button asChild variant="outline">
        <a href="/widgets">Open widgets</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Open widgets" });
    expect(link.getAttribute("href")).toBe("/widgets");
    expect(link.className).toContain("ui-plain-button--outline");
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

describe("Input / Textarea", () => {
  it("forwards native props and merges className", () => {
    render(
      <>
        <Input aria-label="Name" placeholder="Widget" className="custom" />
        <Textarea aria-label="Notes" rows={3} />
      </>,
    );

    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input.className).toContain("ui-plain-input");
    expect(input.className).toContain("custom");
    expect(input.getAttribute("type")).toBe("text");

    const textarea = screen.getByRole("textbox", { name: "Notes" });
    expect(textarea.className).toContain("ui-plain-textarea");
    expect(textarea.getAttribute("rows")).toBe("3");
  });
});

describe("Field", () => {
  it("associates the label with the control and shows description", () => {
    render(
      <Field label="Name" description="Shown in the console." htmlFor="name" required>
        <Input id="name" />
      </Field>,
    );

    expect(screen.getByRole("textbox", { name: "Name" }).id).toBe("name");
    expect(screen.getByText("Shown in the console.")).toBeTruthy();
    expect(screen.getByText("*")).toBeTruthy();
  });

  it("replaces description with an error message", () => {
    render(
      <Field label="Name" description="Hint" error="Name is required." htmlFor="name">
        <Input id="name" aria-invalid="true" />
      </Field>,
    );

    expect(screen.queryByText("Hint")).toBeNull();
    const error = screen.getByRole("alert");
    expect(error.textContent).toBe("Name is required.");
    expect(screen.getByRole("textbox", { name: "Name" }).getAttribute("aria-invalid")).toBe("true");
  });
});

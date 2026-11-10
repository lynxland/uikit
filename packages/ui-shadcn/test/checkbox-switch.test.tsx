import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox, Switch } from "../src";
import "./setup";

type Checked = boolean | "indeterminate";

function CheckboxHarness({ onChange }: { onChange?: (value: Checked) => void }) {
  const [checked, setChecked] = useState<Checked>("indeterminate");
  return (
    <Checkbox
      aria-label="Select all"
      checked={checked}
      onCheckedChange={(next) => {
        setChecked(next);
        onChange?.(next);
      }}
    />
  );
}

function SwitchHarness({ onChange }: { onChange?: (value: boolean) => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <Switch
      aria-label="Enable alerts"
      checked={checked}
      onCheckedChange={(next) => {
        setChecked(next);
        onChange?.(next);
      }}
    />
  );
}

describe("Checkbox", () => {
  it("renders and clears the indeterminate state", () => {
    const onChange = vi.fn();
    render(<CheckboxHarness onChange={onChange} />);

    const checkbox = screen.getByRole("checkbox", { name: "Select all" });
    expect(checkbox.getAttribute("aria-checked")).toBe("mixed");

    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("checkbox", { name: "Select all" }).getAttribute("aria-checked")).toBe(
      "true",
    );
  });

  it("supports disabled", () => {
    render(<Checkbox aria-label="Select all" checked={false} disabled />);
    expect(screen.getByRole("checkbox", { name: "Select all" }).hasAttribute("data-disabled")).toBe(
      true,
    );
  });
});

describe("Switch", () => {
  it("toggles on click", () => {
    const onChange = vi.fn();
    render(<SwitchHarness onChange={onChange} />);

    const control = screen.getByRole("switch", { name: "Enable alerts" });
    expect(control.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(control);

    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("switch", { name: "Enable alerts" }).getAttribute("aria-checked")).toBe(
      "true",
    );
  });
});

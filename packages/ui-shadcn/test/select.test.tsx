import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Select } from "../src";
import "./setup";

const options = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "cherry", label: "Cherry", disabled: true },
] as const;

function SelectHarness({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState("apple");
  return (
    <Select
      aria-label="Fruit"
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      options={options}
    />
  );
}

describe("Select", () => {
  it("opens and selects an option", async () => {
    const onChange = vi.fn();
    render(<SelectHarness onChange={onChange} />);

    const trigger = screen.getByRole("combobox", { name: "Fruit" });
    expect(trigger.textContent).toContain("Apple");

    fireEvent.mouseDown(trigger);
    expect(await screen.findByRole("listbox")).toBeTruthy();

    const banana = screen.getByRole("option", { name: "Banana" });
    fireEvent.pointerDown(banana);
    fireEvent.click(banana);

    await waitFor(() => expect(trigger.textContent).toContain("Banana"));
    expect(onChange).toHaveBeenCalledWith("banana");
  });

  it("renders the placeholder without a value", () => {
    render(<Select aria-label="Fruit" options={options} placeholder="Pick a fruit" />);
    expect(screen.getByRole("combobox", { name: "Fruit" }).textContent).toContain("Pick a fruit");
  });

  it("respects the disabled state", () => {
    render(<Select aria-label="Fruit" options={options} disabled />);
    expect(screen.getByRole("combobox", { name: "Fruit" }).hasAttribute("disabled")).toBe(true);
  });
});

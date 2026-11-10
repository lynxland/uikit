import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { DateTimeInput } from "../src";
import "./setup";

function Harness({ initial, onChange }: { initial?: string; onChange?: (v?: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <DateTimeInput
      aria-label="Maintenance at"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("DateTimeInput", () => {
  it("opens a styled calendar and emits a day selection", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Harness initial="2026-11-08T13:30" onChange={onChange} />,
    );

    fireEvent.click(screen.getByLabelText("Maintenance at"));
    expect(screen.getByTestId("datetime-input-panel")).toBeTruthy();

    const day = container.ownerDocument.querySelector('[data-date="2026-11-15"]');
    expect(day).not.toBeNull();
    fireEvent.click(day as Element);
    expect(onChange).toHaveBeenLastCalledWith("2026-11-15T13:30");
  });

  it("edits the time and clears the value", () => {
    const onChange = vi.fn();
    render(<Harness initial="2026-11-08T13:30" onChange={onChange} />);

    fireEvent.click(screen.getByLabelText("Maintenance at"));
    fireEvent.change(screen.getByLabelText("Hour"), { target: { value: "9" } });
    expect(onChange).toHaveBeenLastCalledWith("2026-11-08T09:30");

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });

  it("navigates months and selects today", () => {
    const onChange = vi.fn();
    render(<Harness initial="2026-11-08T13:30" onChange={onChange} />);

    fireEvent.click(screen.getByLabelText("Maintenance at"));
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(document.querySelector('[data-date="2026-12-01"]')).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Now" }));
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)?.[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});

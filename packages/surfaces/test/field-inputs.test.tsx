import type { CommandFormApi } from "@lynxland/uikit-react";
import { useForm } from "@tanstack/react-form";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, expectTypeOf, it } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import { FieldInputs } from "../src/controls";
import type { FieldFormApi, FieldInput } from "../src/fields";
import { testAdapter } from "./test-adapter";

afterEach(cleanup);

interface Values {
  name: string;
  count: number;
  active: boolean;
  role: string;
  startAt: string;
  ownerId: string;
}

const fields: FieldInput<Values>[] = [
  { name: "name", kind: "text", label: "Name" },
  { name: "count", kind: "number", label: "Count" },
  { name: "active", kind: "boolean", label: "Active" },
  {
    name: "role",
    kind: "enum",
    label: "Role",
    options: [
      { value: "user", label: "User" },
      { value: "admin", label: "Admin" },
    ],
  },
  { name: "startAt", kind: "datetime", label: "Start" },
  { name: "ownerId", kind: "reference", label: "Owner" },
];

const defaultValues: Values = {
  name: "",
  count: 1,
  active: false,
  role: "user",
  startAt: "",
  ownerId: "",
};

function Harness() {
  const form = useForm({ defaultValues });
  return (
    <UiAdapterProvider adapter={testAdapter}>
      <FieldInputs
        form={form}
        fields={fields}
        renderInput={({ field }) => <span>slot:{field.name}</span>}
      />
    </UiAdapterProvider>
  );
}

function RequiredHarness() {
  const form = useForm({ defaultValues: { name: "" } });
  return (
    <UiAdapterProvider adapter={testAdapter}>
      <FieldInputs
        form={form}
        fields={[{ name: "name", kind: "text", label: "Name", required: true }]}
      />
      <button type="button" onClick={() => void form.handleSubmit()}>
        Submit
      </button>
    </UiAdapterProvider>
  );
}

describe("FieldInputs", () => {
  it("accepts the command form API structurally", () => {
    expectTypeOf<CommandFormApi<Values>>().toMatchTypeOf<FieldFormApi<Values>>();
  });

  it("wires built-in kinds to the TanStack Form state", () => {
    render(<Harness />);

    const name = screen.getByLabelText("Name") as HTMLInputElement;
    fireEvent.change(name, { target: { value: "Widget" } });
    expect(name.value).toBe("Widget");

    const count = screen.getByLabelText("Count") as HTMLInputElement;
    fireEvent.change(count, { target: { value: "7" } });
    expect(count.value).toBe("7");

    const active = screen.getByLabelText("Active") as HTMLInputElement;
    fireEvent.click(active);
    expect(active.checked).toBe(true);

    const role = screen.getByLabelText("Role") as HTMLSelectElement;
    fireEvent.change(role, { target: { value: "admin" } });
    expect(role.value).toBe("admin");

    const start = screen.getByLabelText("Start") as HTMLInputElement;
    expect(start.className).toContain("test-datetime-input");
    fireEvent.change(start, { target: { value: "2026-01-01T10:00" } });
    expect(start.value).toBe("2026-01-01T10:00");
  });

  it("uses the renderInput slot for references", () => {
    render(<Harness />);
    expect(screen.getByText("slot:ownerId")).toBeTruthy();
  });

  it("marks required fields and exposes validation errors after submit", async () => {
    render(<RequiredHarness />);
    expect(screen.getByText("Name *")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(await screen.findByText("Required")).toBeTruthy();
  });
});

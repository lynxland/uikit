import type { Command } from "@lynxland/uikit-core";
import { ok, rejected } from "@lynxland/uikit-core";
import { useCommandForm } from "@lynxland/uikit-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UiAdapterProvider } from "../src/adapter";
import type { FieldInput } from "../src/fields";
import { FormView } from "../src/views";
import { testAdapter } from "./test-adapter";

afterEach(cleanup);

interface Values {
  name: string;
}

const fields: FieldInput<Values>[] = [{ name: "name", kind: "text", label: "Name" }];

const client = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function withProviders(node: ReactNode) {
  return (
    <QueryClientProvider client={client}>
      <UiAdapterProvider adapter={testAdapter}>{node}</UiAdapterProvider>
    </QueryClientProvider>
  );
}

interface HarnessProps {
  run: Command<Values, { id: string }>["run"];
  onCancel?: () => void;
}

function Harness({ run, onCancel }: HarnessProps) {
  const form = useCommandForm<Values, { id: string }>(
    { run },
    { fields, defaultValues: { name: "" } },
  );
  return (
    <FormView
      form={form}
      fields={fields}
      submitLabel="Save"
      title="Widget"
      description="Create a widget"
      {...(onCancel !== undefined ? { cancel: onCancel } : {})}
    />
  );
}

describe("FormView", () => {
  it("submits through the command form handle", async () => {
    const run = vi.fn(async () => ok({ id: "1" }));
    render(withProviders(<Harness run={run} />));

    expect(screen.getByRole("heading", { level: 2, name: "Widget" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Alpha" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(run).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Alpha" }),
        expect.anything(),
      ),
    );
  });

  it("shows form-level and field-level errors from a rejected result", async () => {
    const run = vi.fn(async () =>
      rejected("Name already exists", {
        fieldErrors: { name: "Already used", owner: "Owner is missing" },
      }),
    );
    render(withProviders(<Harness run={run} />));

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByTestId("form-error")).toBeTruthy();
    expect((await screen.findByTestId("form-error")).textContent).toContain("Name already exists");
    // Declared fields render their error inline through the form engine.
    expect(screen.getAllByText("Already used")).toHaveLength(1);
    // Undeclared/server-only fields surface in the compact summary.
    expect(await screen.findByTestId("form-field-errors")).toBeTruthy();
    expect(screen.getByTestId("form-field-errors").textContent).toContain("Owner is missing");
  });

  it("invokes the cancel callback", () => {
    const onCancel = vi.fn();
    render(withProviders(<Harness run={async () => ok({ id: "1" })} onCancel={onCancel} />));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

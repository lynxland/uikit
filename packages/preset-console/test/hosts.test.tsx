import { ok, rejected } from "@lynxland/uikit-core";
import { mockCommand, renderWithKit } from "@lynxland/uikit-testing";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  CommandDialog,
  ConfirmCommandDialog,
  PresetProvider,
} from "../src";
import "./setup";

interface Input {
  name: string;
}

interface Output {
  id: string;
}

function DialogHarness({
  command,
  onSuccess,
}: {
  command: ReturnType<typeof mockCommand<Input, Output>>;
  onSuccess?: (payload: Output) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <PresetProvider>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        command={command}
        fields={[{ name: "name", kind: "text", label: "Name" }]}
        defaultValues={{ name: "" }}
        title="Create"
        submitLabel="Create"
        {...(onSuccess !== undefined ? { onSuccess } : {})}
      />
      <span data-testid="open-state">{open ? "open" : "closed"}</span>
    </PresetProvider>
  );
}

function ConfirmHarness({
  command,
}: {
  command: ReturnType<typeof mockCommand<string, unknown>>;
}) {
  const [open, setOpen] = useState(true);
  return (
    <PresetProvider>
      <ConfirmCommandDialog
        open={open}
        onOpenChange={setOpen}
        command={command}
        input="w-1"
        title="Delete widget"
        confirmLabel="Delete"
      />
      <span data-testid="open-state">{open ? "open" : "closed"}</span>
    </PresetProvider>
  );
}

describe("CommandDialog", () => {
  it("closes on ok and reports the payload", async () => {
    const command = mockCommand<Input, Output>((input) => ok({ id: input.name }));
    const onSuccess = vi.fn();
    renderWithKit(<DialogHarness command={command} onSuccess={onSuccess} />, { path: "/" });

    fireEvent.change(await screen.findByLabelText(/Name/), { target: { value: "Alpha" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ id: "Alpha" }));
    expect(screen.getByTestId("open-state").textContent).toBe("closed");
    expect(command.calls).toHaveLength(1);
  });
});

describe("ConfirmCommandDialog", () => {
  it("closes on ok", async () => {
    const command = mockCommand<string, unknown>(() => ok(undefined));
    renderWithKit(<ConfirmHarness command={command} />, { path: "/" });

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.getByTestId("open-state").textContent).toBe("closed"));
    expect(command.calls[0]?.input).toBe("w-1");
  });

  it("stays open and shows a rejected result", async () => {
    const command = mockCommand<string, unknown>(() => rejected("Cannot delete"));
    renderWithKit(<ConfirmHarness command={command} />, { path: "/" });

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Cannot delete")).toBeTruthy();
    expect(screen.getByTestId("open-state").textContent).toBe("open");
  });
});

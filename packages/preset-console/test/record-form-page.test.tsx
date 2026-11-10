import { type Command, conflict, ok, rejected } from "@lynxland/uikit-core";
import type { FieldView } from "@lynxland/uikit-surfaces";
import { mockCommand, mockSource, renderWithKit } from "@lynxland/uikit-testing";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FormPage, PresetProvider, RecordPage, type RecordPageProps } from "../src";
import "./setup";

interface Widget {
  id: string;
  name: string;
  status: string;
}

const widgets: Widget[] = [
  { id: "w-1", name: "Alpha", status: "active" },
  { id: "w-2", name: "Beta", status: "paused" },
];

const viewFields: FieldView<Widget>[] = [
  { name: "name", kind: "text", label: "Name" },
  {
    name: "status",
    kind: "enum",
    label: "Status",
    options: [{ value: "active", label: "Active" }],
  },
];

function renderRecord(overrides: Partial<RecordPageProps<Widget>> = {}) {
  const source = mockSource("widgets", widgets);
  const view = renderWithKit(
    <PresetProvider>
      <RecordPage<Widget> source={source.record} id="w-1" fields={viewFields} {...overrides} />
    </PresetProvider>,
    { path: "/" },
  );
  return { view, source };
}

describe("RecordPage", () => {
  it("is idle/loading and fetches nothing without an id", async () => {
    renderRecord({ id: undefined, fields: viewFields });
    expect((await screen.findByTestId("async-state")).getAttribute("data-status")).toBe("loading");
    expect(screen.queryByTestId("record-hero")).toBeNull();
  });

  it("renders record fields and the hero title", async () => {
    renderRecord({ title: (row) => row.name, fields: viewFields });
    expect(await screen.findByRole("heading", { level: 2, name: "Alpha" })).toBeTruthy();
    expect(screen.getByText("Name")).toBeTruthy();
    expect(await screen.findByText("Active")).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("wires tab changes to the URL with replace", async () => {
    const { view } = renderRecord({
      title: (row) => row.name,
      from: "/",
      tabs: [
        { key: "overview", label: "Overview", render: (row) => <div>Overview {row.name}</div> },
        { key: "activity", label: "Activity", render: (row) => <div>Activity {row.name}</div> },
      ],
    });

    expect(await screen.findByText("Overview Alpha")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Activity" }));

    await waitFor(() => expect(view.getSearch().tab).toBe("activity"));
    expect(await screen.findByText("Activity Alpha")).toBeTruthy();
  });

  it("keeps caller-controlled tabs local", async () => {
    const onTabChange = vi.fn();
    renderRecord({
      activeTab: "overview",
      onTabChange,
      tabs: [
        { key: "overview", label: "Overview", render: () => <div>Overview tab</div> },
        { key: "activity", label: "Activity", render: () => <div>Activity tab</div> },
      ],
    });
    fireEvent.click(await screen.findByRole("tab", { name: "Activity" }));
    expect(onTabChange).toHaveBeenCalledWith("activity");
    expect(screen.getByText("Overview tab")).toBeTruthy();
  });
});

interface NewWidget {
  name: string;
  status: string;
}

const createFields = [
  { name: "name" as const, kind: "text" as const, label: "Name", required: true },
  { name: "status" as const, kind: "enum" as const, label: "Status", options: [] },
];

function renderForm(command: Command<NewWidget, Widget>, onSuccess = vi.fn()) {
  renderWithKit(
    <PresetProvider>
      <FormPage<NewWidget, Widget>
        title="New widget"
        command={command}
        fields={createFields}
        defaultValues={{ status: "active" }}
        onSuccess={onSuccess}
        cancel={<a href="/widgets">Cancel</a>}
      />
    </PresetProvider>,
    { path: "/" },
  );
  return onSuccess;
}

describe("FormPage", () => {
  it("submits values and reveals the success payload", async () => {
    const command = mockCommand<NewWidget, Widget>((input) =>
      ok({ id: "w-9", name: input.name, status: input.status }),
    );
    const onSuccess = renderForm(command);
    expect(await screen.findByRole("heading", { level: 1, name: "New widget" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cancel" })).toBeTruthy();
    expect(screen.getByTestId("page-layout").getAttribute("data-width")).toBe("narrow");

    fireEvent.change(await screen.findByLabelText(/Name/), { target: { value: "Gamma" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith({
        id: "w-9",
        name: "Gamma",
        status: "active",
      }),
    );
    expect(command.calls).toHaveLength(1);
    expect(command.calls[0]?.input).toEqual({ name: "Gamma", status: "active" });
  });

  it("keeps rejected results visible", async () => {
    const command = mockCommand<NewWidget, Widget>(() => rejected("Name is taken"));
    renderForm(command);
    fireEvent.change(await screen.findByLabelText(/Name/), { target: { value: "Alpha" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Name is taken")).toBeTruthy();
  });

  it("keeps conflicts visible", async () => {
    const command = mockCommand<NewWidget, Widget>(() => conflict("Already exists"));
    renderForm(command);
    fireEvent.change(await screen.findByLabelText(/Name/), { target: { value: "Alpha" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Already exists")).toBeTruthy();
  });
});

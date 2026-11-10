import { collectionSearch, ok, rejected } from "@lynxland/uikit-core";
import type { CrudFields, FieldView } from "@lynxland/uikit-surfaces";
import { mockCommand, mockSource, renderWithKit } from "@lynxland/uikit-testing";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CrudPage, type CrudPageProps, PresetProvider } from "../src";
import "./setup";

interface Widget {
  id: string;
  name: string;
  status: string;
}

interface CreateInput {
  name: string;
}

interface UpdateInput {
  name: string;
}

const widgets: Widget[] = [
  { id: "w-1", name: "Alpha", status: "active" },
  { id: "w-2", name: "Beta", status: "paused" },
];

function setup(overrides: Partial<CrudPageProps<Widget, CreateInput, UpdateInput, string>> = {}) {
  const source = mockSource("widgets", widgets);
  const search = collectionSearch({
    text: ["name"],
    defaultSize: 10,
    defaultPage: { kind: "offset", offset: 0 },
  });

  const create = mockCommand<CreateInput, Widget>((input) => {
    const rows = source.handle.rows();
    const row: Widget = { id: `w-${rows.length + 1}`, name: input.name, status: "active" };
    source.handle.replaceRows([...rows, row]);
    return ok(row);
  });
  const update = mockCommand<UpdateInput, Widget>((input) =>
    ok({ ...(widgets[0] as Widget), name: input.name }),
  );
  const remove = mockCommand<string, unknown>((id) => {
    source.handle.replaceRows(source.handle.rows().filter((row) => row.id !== id));
    return ok(undefined);
  });

  const viewFields: FieldView<Widget>[] = [
    { name: "name", kind: "text", label: "Name", list: { sortable: true } },
    { name: "status", kind: "text", label: "Status" },
  ];
  const fields: CrudFields<Widget, CreateInput, UpdateInput> = {
    view: viewFields,
    create: [{ name: "name", kind: "text", label: "Name", required: true }],
    update: [{ name: "name", kind: "text", label: "Name" }],
    toUpdateInput: (row) => ({ name: row.name }),
  };

  const view = renderWithKit(
    <PresetProvider>
      <CrudPage<Widget, CreateInput, UpdateInput, string>
        title="Widgets"
        source={source.collection}
        search={search}
        from="/"
        fields={fields}
        getRowId={(row) => row.id}
        create={{ command: create }}
        update={{ command: update }}
        delete={{ command: remove }}
        {...overrides}
      />
    </PresetProvider>,
    { path: "/", searchSchema: search },
  );
  return { view, source, create, update, remove };
}

describe("CrudPage", () => {
  it("opens the create dialog, submits, closes on ok and invalidates the collection", async () => {
    const { create } = setup();
    await screen.findByText("Alpha");

    fireEvent.click(screen.getByRole("button", { name: "New" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: "Gamma" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    await waitFor(() => expect(create.calls).toHaveLength(1));
    expect(create.calls[0]?.input).toEqual({ name: "Gamma" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByText("Gamma")).toBeTruthy();
  });

  it("keeps the create dialog open for a rejected result", async () => {
    const rejectedCreate = mockCommand<CreateInput, Widget>(() => rejected("Name is taken"));
    setup({ create: { command: rejectedCreate } });
    await screen.findByText("Alpha");

    fireEvent.click(screen.getByRole("button", { name: "New" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: "Alpha" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Name is taken")).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("prefills the edit dialog from the row and submits its input", async () => {
    const { update } = setup();
    await screen.findByText("Alpha");

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0] as HTMLElement);
    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByLabelText(/Name/) as HTMLInputElement;
    expect(input.value).toBe("Alpha");

    fireEvent.change(input, { target: { value: "Alpha II" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(update.calls).toHaveLength(1));
    expect(update.calls[0]?.input).toEqual({ name: "Alpha II" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("confirms deletion with the row id as the default input", async () => {
    const { remove } = setup();
    await screen.findByText("Alpha");

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" })[0] as HTMLElement);
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(remove.calls).toHaveLength(1));
    expect(remove.calls[0]?.input).toBe("w-1");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(screen.queryByText("Alpha")).toBeNull());
  });

  it("hides row actions when no commands are configured", async () => {
    setup({ create: undefined, update: undefined, delete: undefined });
    await screen.findByText("Alpha");
    expect(screen.queryByRole("button", { name: "New" })).toBeNull();
    expect(screen.queryAllByRole("button", { name: "Edit" })).toHaveLength(0);
    expect(screen.queryAllByRole("button", { name: "Delete" })).toHaveLength(0);
  });

  it("delegates page hosts instead of opening dialog/drawer", async () => {
    const first = setup();
    first.view.unmount();
    const onPageHost = vi.fn();
    // Re-render the same harness with page hosts.
    const pageView = setup({
      create: { command: first.create, host: "page" },
      update: { command: first.update, host: "page" },
      onPageHost,
    });
    await screen.findAllByText("Alpha");
    const root = pageView.view.container.querySelector('[data-testid="page-layout"]');
    expect(root).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "New" }));
    expect(onPageHost).toHaveBeenCalledWith({ mode: "create" });
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0] as HTMLElement);
    expect(onPageHost).toHaveBeenCalledWith({ mode: "edit", row: widgets[0] });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

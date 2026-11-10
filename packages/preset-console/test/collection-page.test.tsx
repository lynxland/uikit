import { collectionSearch } from "@lynxland/uikit-core";
import type { FieldView } from "@lynxland/uikit-surfaces";
import { mockSource, renderWithKit } from "@lynxland/uikit-testing";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CollectionPage, type CollectionPageProps, PresetProvider } from "../src";
import "./setup";

interface Widget {
  id: string;
  name: string;
  status: string;
}

const widgets: Widget[] = [
  { id: "w-1", name: "Alpha", status: "active" },
  { id: "w-2", name: "Beta", status: "paused" },
  { id: "w-3", name: "Gamma", status: "active" },
];

const fields: FieldView<Widget>[] = [
  { name: "name", kind: "text", label: "Name", list: { sortable: true, filter: "fuzzy" } },
  {
    name: "status",
    kind: "enum",
    label: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "paused", label: "Paused" },
    ],
    list: { filter: "enum" },
  },
];

function setup(overrides: Partial<CollectionPageProps<Widget>> = {}) {
  const source = mockSource("widgets", widgets);
  const search = collectionSearch({
    text: ["name"],
    filters: [{ field: "status", kind: "enum", options: fields[1]?.options }],
    defaultSize: 2,
    defaultPage: { kind: "offset", offset: 0 },
  });
  const view = renderWithKit(
    <PresetProvider>
      <CollectionPage<Widget>
        title="Widgets"
        description="All widgets"
        source={source.collection}
        search={search}
        from="/"
        fields={fields}
        {...overrides}
      />
    </PresetProvider>,
    { path: "/", searchSchema: search },
  );
  return { view, source, search };
}

describe("CollectionPage", () => {
  it("renders rows with the single page h1", async () => {
    setup();
    expect(await screen.findByText("Alpha")).toBeTruthy();
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Widgets" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByTestId("page-layout").getAttribute("data-width")).toBe("wide");
  });

  it("writes filter text to the URL and narrows the source", async () => {
    const { view } = setup();
    await screen.findByText("Alpha");

    fireEvent.change(screen.getByTestId("filter-search"), { target: { value: "alp" } });

    await waitFor(() => expect(view.getSearch().q).toBe("alp"));
    expect(await screen.findByText("Alpha")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("Beta")).toBeNull());
  });

  it("writes sorting to the URL", async () => {
    const { view } = setup();
    await screen.findByText("Alpha");

    fireEvent.click(screen.getByRole("button", { name: /Name/ }));

    await waitFor(() => expect(view.getSearch().sort).toBe("name:asc"));
  });

  it("uses offset pager from defaultPage and returns to the first page", async () => {
    const { view } = setup();
    await screen.findByText("Alpha");
    expect(screen.getByTestId("pager").getAttribute("data-mode")).toBe("offset");
    expect(screen.getByRole("button", { name: "Previous page" }).hasAttribute("disabled")).toBe(
      true,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => expect(view.getSearch().page).toBe("2"));
    expect(await screen.findByText("Gamma")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    await waitFor(() => expect(view.getSearch().page).toBeUndefined());
    expect(await screen.findByText("Alpha")).toBeTruthy();
  });

  it("forwards row clicks", async () => {
    const onRowClick = vi.fn();
    setup({ onRowClick });
    fireEvent.click(await screen.findByText("Alpha"));
    expect(onRowClick).toHaveBeenCalledWith(widgets[0]);
  });

  it("supports explicit columns and a controlled tab strip", async () => {
    const onTabChange = vi.fn();
    setup({
      fields: undefined,
      columns: [{ id: "name", header: "Name", accessor: (row) => row.name }],
      tabs: [
        { value: "all", label: "All" },
        { value: "archived", label: "Archived" },
      ],
      currentTab: "all",
      onTabChange,
    });
    expect(await screen.findByText("Alpha")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Archived" }));
    expect(onTabChange).toHaveBeenCalledWith("archived");
  });
});

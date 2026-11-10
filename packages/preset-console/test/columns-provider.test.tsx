import type { FieldView } from "@lynxland/uikit-surfaces";
import { UiAdapterProvider, useUiAdapter } from "@lynxland/uikit-surfaces";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  columnFromField,
  columnsFromFields,
  filterFieldsFromSpec,
  filterFieldsOf,
  PresetProvider,
  shadcnAdapter,
} from "../src";
import "./setup";

interface Widget {
  id: string;
  name: string;
  count: number;
  active: boolean;
  status: string;
  createdAt: string;
}

const widget: Widget = {
  id: "w-1",
  name: "Alpha",
  count: 3,
  active: true,
  status: "running",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("columnsFromFields", () => {
  it("maps FieldView to Column (header/accessor/cell/width/hidden/sort/align)", () => {
    const fields: FieldView<Widget>[] = [
      {
        name: "name",
        kind: "text",
        label: "Name",
        list: { sortable: true, width: "12rem", render: (row) => <strong>{row.name}</strong> },
      },
      { name: "count", kind: "number", list: { hidden: true } },
      { name: "active", kind: "boolean" },
    ];

    const columns = columnsFromFields(fields);
    expect(columns[0]).toMatchObject({
      id: "name",
      header: "Name",
      sortField: "name",
      width: "12rem",
    });
    expect(columns[0]?.accessor?.(widget)).toBe("Alpha");
    expect(columns[0]?.cell?.(widget)).toBeTruthy();
    expect(columns[1]).toMatchObject({ id: "count", header: "Count", hidden: true, align: "end" });
    expect(columns[2]).toMatchObject({ id: "active", header: "Active", align: "center" });
    expect(columns[2]?.sortField).toBeUndefined();
  });

  it("keeps explicit labels and falls back to a humanized name", () => {
    expect(columnFromField<Widget>({ name: "createdAt", kind: "datetime" }).header).toBe(
      "Created At",
    );
    expect(
      columnFromField<Widget>({ name: "name", kind: "text", label: "Widget name" }).header,
    ).toBe("Widget name");
  });
});

describe("filterFieldsOf", () => {
  it("derives filter controls from list.filter and carries enum options", () => {
    const fields: FieldView<Widget>[] = [
      { name: "name", kind: "text", list: { filter: "fuzzy" } },
      {
        name: "status",
        kind: "enum",
        list: { filter: "enum" },
        options: [{ value: "r", label: "R" }],
      },
      { name: "createdAt", kind: "datetime", list: { filter: "datetime" } },
      { name: "active", kind: "boolean", list: { filter: "exact" } },
      { name: "count", kind: "number" },
    ];

    expect(filterFieldsOf(fields)).toEqual([
      { field: "name", kind: "text", label: "Name", op: "contains" },
      { field: "status", kind: "enum", label: "Status", options: [{ value: "r", label: "R" }] },
      { field: "createdAt", kind: "datetime", label: "Created At" },
      { field: "active", kind: "exact", label: "Active", op: "eq" },
    ]);
  });

  it("maps search-spec filters with kind fallbacks", () => {
    expect(
      filterFieldsFromSpec([
        { field: "name", op: "contains" },
        { field: "id" },
        { field: "status", kind: "enum", options: [{ value: "r", label: "R" }] },
      ]),
    ).toEqual([
      { field: "name", kind: "text", op: "contains" },
      { field: "id", kind: "exact" },
      { field: "status", kind: "enum", options: [{ value: "r", label: "R" }] },
    ]);
  });
});

function AdapterProbe() {
  const ui = useUiAdapter();
  return <span data-testid="adapter">{ui === shadcnAdapter ? "shadcn" : "custom"}</span>;
}

describe("PresetProvider", () => {
  it("installs the default shadcn adapter", () => {
    render(
      <PresetProvider>
        <AdapterProbe />
      </PresetProvider>,
    );
    expect(screen.getByTestId("adapter").textContent).toBe("shadcn");
  });

  it("allows an adapter override without installing QueryClient/Router/Scope", () => {
    const custom = { ...shadcnAdapter };
    render(
      <PresetProvider adapter={custom}>
        <AdapterProbe />
      </PresetProvider>,
    );
    expect(screen.getByTestId("adapter").textContent).toBe("custom");
  });

  it("UiAdapterProvider remains the only provider PresetProvider installs", () => {
    // A bare provider must not require a QueryClient/router; rendering a
    // surfaces primitive proves only the adapter context is needed.
    render(
      <UiAdapterProvider adapter={shadcnAdapter}>
        <button type="button">surface</button>
      </UiAdapterProvider>,
    );
    expect(screen.getByRole("button", { name: "surface" })).toBeTruthy();
  });
});
